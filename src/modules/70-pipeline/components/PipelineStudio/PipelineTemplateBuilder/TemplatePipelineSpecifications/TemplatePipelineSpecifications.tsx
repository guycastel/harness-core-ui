/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { debounce, defaultTo, isEmpty, isEqual, isNil, noop, omit, pick, set } from 'lodash-es'
import { useParams } from 'react-router-dom'
import { Container, Formik, FormikForm, Heading, Layout, PageError } from '@harness/uicore'
import { Color } from '@harness/design-system'
import type { FormikProps, FormikErrors } from 'formik'
import { produce } from 'immer'
import { getTemplateErrorMessage, TEMPLATE_INPUT_PATH } from '@pipeline/utils/templateUtils'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import {
  getsMergedTemplateInputYamlPromise,
  useGetTemplateInputSetYaml,
  useGetYamlWithTemplateRefsResolved
} from 'services/template-ng'
import {
  getIdentifierFromValue,
  getScopeBasedProjectPathParams,
  getScopeFromDTO,
  getScopeFromValue
} from '@common/components/EntityReference/EntityReference'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { PageSpinner } from '@common/components'
import { PipelineInputSetFormInternal } from '@pipeline/components/PipelineInputSetForm/PipelineInputSetForm'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import type { PipelineInfoConfig } from 'services/pipeline-ng'
import { useStrings } from 'framework/strings'
import { validatePipeline } from '@pipeline/components/PipelineStudio/StepUtil'
import { ErrorsStrip } from '@pipeline/components/ErrorsStrip/ErrorsStrip'
import { useMutateAsGet } from '@common/hooks'
import { parse, stringify, yamlStringify } from '@common/utils/YamlHelperMethods'
import type { Pipeline } from '@pipeline/utils/types'
import { getGitQueryParamsWithParentScope } from '@common/utils/gitSyncUtils'
import { PipelineUpdateRequiredWarning } from '@pipeline/components/PipelineUpdateRequiredWarning/PipelineUpdateRequiredWarning'
import { PipelineRequiredActionType } from '@pipeline/components/PipelineUpdateRequiredWarning/PipelineUpdateRequiredWarningHelper'
import { useCheckTemplateChange } from './useCheckPipelineTemplateChange'
import css from './TemplatePipelineSpecifications.module.scss'

interface TemplatePipelineSpecificationsProps {
  isTemplateUpdated?: boolean
  setIsTemplateUpdated?(isTemplateUpdated: boolean): void
}

export function TemplatePipelineSpecifications({
  isTemplateUpdated,
  setIsTemplateUpdated
}: TemplatePipelineSpecificationsProps): JSX.Element {
  const {
    state: { pipeline, schemaErrors, gitDetails, storeMetadata, isUpdated },
    allowableTypes,
    updatePipeline,
    isReadonly,
    setIntermittentLoading
  } = usePipelineContext()
  const queryParams = useParams<ProjectPathProps>()
  const templateRef = getIdentifierFromValue(defaultTo(pipeline.template?.templateRef, ''))
  const templateVersionLabel = getIdentifierFromValue(defaultTo(pipeline.template?.versionLabel, ''))
  const templateScope = getScopeFromValue(defaultTo(pipeline.template?.templateRef, ''))
  const pipelineScope = getScopeFromDTO(pipeline)
  const [formValues, setFormValues] = React.useState<PipelineInfoConfig | undefined>(pipeline)
  const [allValues, setAllValues] = React.useState<PipelineInfoConfig>()
  const [templateInputs, setTemplateInputs] = React.useState<PipelineInfoConfig | undefined>()
  const { getString } = useStrings()
  const formikRef = React.useRef<FormikProps<unknown> | null>(null)
  const formRefDom = React.useRef<HTMLElement | undefined>()
  const [formikErrors, setFormikErrors] = React.useState<FormikErrors<PipelineInfoConfig>>()
  const [showFormError, setShowFormError] = React.useState<boolean>()
  const viewTypeMetadata = { isTemplateBuilder: true }
  const [loadingMergedTemplateInputs, setLoadingMergedTemplateInputs] = React.useState<boolean>(false)
  // originalEntityYaml is the reference to fetch the latest mergedResolvedPipeline
  const [originalEntityYaml, setOriginalEntityYaml] = React.useState<string>('')
  const { checkPipelineTemplateChange, requiredAction, disableForm } = useCheckTemplateChange()

  const onChange = React.useCallback(
    debounce(async (values: PipelineInfoConfig): Promise<void> => {
      await updatePipeline({ ...pipeline, ...values })
    }, 300),
    [pipeline, updatePipeline]
  )

  const {
    data: templateInputSetYaml,
    error: templateInputSetError,
    refetch: refetchTemplateInputSet,
    loading: templateInputSetLoading
  } = useGetTemplateInputSetYaml({
    templateIdentifier: templateRef,
    queryParams: {
      ...getScopeBasedProjectPathParams(queryParams, templateScope),
      versionLabel: templateVersionLabel,
      ...getGitQueryParamsWithParentScope({
        storeMetadata,
        params: queryParams,
        repoIdentifier: gitDetails.repoIdentifier,
        branch: defaultTo(pipeline.template?.gitBranch, gitDetails.branch),
        sendParentEntityDetails: pipeline.template?.gitBranch ? false : true
      })
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
  })

  const {
    data: pipelineResponse,
    error: pipelineError,
    refetch: refetchPipeline,
    loading: pipelineLoading
  } = useMutateAsGet(useGetYamlWithTemplateRefsResolved, {
    queryParams: {
      ...getScopeBasedProjectPathParams(queryParams, pipelineScope),
      pipelineIdentifier: pipeline.identifier,
      ...getGitQueryParamsWithParentScope({
        storeMetadata,
        params: queryParams,
        repoIdentifier: gitDetails.repoIdentifier,
        branch: gitDetails.branch
      })
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } },
    body: { originalEntityYaml },
    lazy: true
  })

  // All values need to be updated when pipelineResponse changes, even if mergedPipelineYaml is the same - this can happen when
  // version of linked pipeline template is changed. This ensures all values is updated after reset due to version change.
  React.useEffect(() => {
    if (!pipelineLoading) {
      setAllValues(parse<Pipeline>(defaultTo(pipelineResponse?.data?.mergedPipelineYaml, ''))?.pipeline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineResponse?.data?.mergedPipelineYaml, pipelineLoading])

  /**
   * This function is used to set the original entity yaml with the newly updated template inputs
   * @param newTemplateInputs - this is the newly updated templates
   * @param updateFormValue - this indicates if form values should be updated
   */
  const setOriginalEntityYamlWithNewInputs = (
    newTemplateInputs: PipelineInfoConfig,
    updateFormValue?: boolean
  ): void => {
    if (isEmpty(newTemplateInputs)) {
      setFormValues(undefined)
    } else {
      const updatedPipelineWithOriginalInputs = produce(pipeline, draft => {
        set(draft, 'template.templateInputs', newTemplateInputs)
      })

      setOriginalEntityYaml(yamlStringify({ pipeline: updatedPipelineWithOriginalInputs }))

      if (updateFormValue) {
        setFormValues(updatedPipelineWithOriginalInputs)
        updatePipeline(updatedPipelineWithOriginalInputs)
      }
    }
  }

  const updateFormValues = (newTemplateInputs: PipelineInfoConfig): void => {
    const updatedPipeline = produce(pipeline, draft => {
      set(draft, 'template.templateInputs', !isEmpty(newTemplateInputs) ? newTemplateInputs : undefined)
    })

    setFormValues(updatedPipeline)
    setOriginalEntityYamlWithNewInputs(newTemplateInputs)
    updatePipeline(updatedPipeline)
  }

  const retainInputsAndUpdateFormValues = (newTemplateInputs: PipelineInfoConfig): void => {
    if (isEmpty(newTemplateInputs)) {
      updateFormValues(newTemplateInputs)
    } else {
      setLoadingMergedTemplateInputs(true)
      try {
        getsMergedTemplateInputYamlPromise({
          body: {
            oldTemplateInputs: stringify(defaultTo(pipeline?.template?.templateInputs, '')),
            newTemplateInputs: stringify(newTemplateInputs)
          },
          queryParams: {
            accountIdentifier: queryParams.accountId
          }
        }).then(response => {
          if (response && response.status === 'SUCCESS') {
            setLoadingMergedTemplateInputs(false)
            updateFormValues(parse<PipelineInfoConfig>(defaultTo(response.data?.mergedTemplateInputs, '')))
          } else {
            throw response
          }
        })
      } catch (error) {
        setLoadingMergedTemplateInputs(false)
        updateFormValues(newTemplateInputs)
      }
    }

    setIsTemplateUpdated?.(false)
  }

  React.useEffect(() => {
    if (disableForm && isUpdated && templateInputSetYaml?.data) {
      const newTemplateInputs = parse<PipelineInfoConfig>(defaultTo(templateInputSetYaml?.data, ''))
      checkPipelineTemplateChange(newTemplateInputs, pipeline, false)
    }
  }, [isUpdated, pipeline, disableForm])

  React.useEffect(() => {
    if (templateInputSetLoading) {
      setTemplateInputs(undefined)
      setFormikErrors({})
      setAllValues(undefined)
    } else {
      const newTemplateInputs = parse<PipelineInfoConfig>(defaultTo(templateInputSetYaml?.data, '{}'))
      if (!isTemplateUpdated) {
        checkPipelineTemplateChange(newTemplateInputs, pipeline)
      }

      setTemplateInputs(newTemplateInputs)

      // retain the inputs and update form values accordingly iff template has been updated
      if (isTemplateUpdated) {
        retainInputsAndUpdateFormValues(newTemplateInputs)
      } else {
        // else set original entity yaml
        // We also need to set form values and update the pipeline when a template is first linked to a pipeline
        setOriginalEntityYamlWithNewInputs(newTemplateInputs, isNil(formValues?.template?.templateInputs))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateInputSetLoading])

  React.useEffect(() => {
    if (!isEmpty(formValues) && !allValues && !isEmpty(originalEntityYaml)) {
      refetchPipeline()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalEntityYaml])

  React.useEffect(() => {
    if (schemaErrors) {
      formikRef.current?.submitForm()
      setShowFormError(true)
    }
  }, [schemaErrors])

  const validateForm = (values: PipelineInfoConfig): FormikErrors<PipelineInfoConfig> => {
    if (
      isEqual(values.template?.templateRef, pipeline.template?.templateRef) &&
      isEqual(values.template?.versionLabel, pipeline.template?.versionLabel) &&
      templateInputs
    ) {
      onChange?.({
        // This pick omit logic is required to only update the pipeline with the pipeline template form values
        // and not update the pipeline data if there has been a change outside the template form values
        ...omit(pipeline, 'template'),
        ...pick(values, 'template')
      })
      const errorsResponse = validatePipeline({
        pipeline: values.template?.templateInputs as PipelineInfoConfig,
        template: templateInputs,
        originalPipeline: allValues,
        getString,
        viewType: StepViewType.DeploymentForm,
        viewTypeMetadata
      })
      const newFormikErrors = set({}, TEMPLATE_INPUT_PATH, errorsResponse)
      setFormikErrors(newFormikErrors)
      return newFormikErrors
    } else {
      setFormikErrors({})
      return {}
    }
  }

  const refetch = (): void => {
    refetchPipeline()
    refetchTemplateInputSet()
  }

  const isLoading = pipelineLoading || templateInputSetLoading || loadingMergedTemplateInputs

  const error = defaultTo(templateInputSetError, pipelineError)

  /**
   * This effect disables/enables Save button on Pipeline and Template Studio
   * For gitx, template resolution takes a long time
   * If user clicks on Save button before resolution, template exception occurs
   */
  React.useEffect(() => {
    setIntermittentLoading(isLoading)

    // cleanup
    return () => {
      setIntermittentLoading(false)
    }
  }, [isLoading, setIntermittentLoading])

  return (
    <Container className={css.contentSection} height={'100%'} background={Color.FORM_BG}>
      {isLoading && <PageSpinner />}
      {!isLoading && error && (
        <PageError message={getTemplateErrorMessage(error, css.errorHandler)} onClick={() => refetch()} />
      )}
      {!isLoading && !error && templateInputs && allValues && formValues && (
        <>
          {showFormError && formikErrors && <ErrorsStrip formErrors={formikErrors} domRef={formRefDom} />}
          {requiredAction && (
            <PipelineUpdateRequiredWarning
              requiredAction={requiredAction}
              type={PipelineRequiredActionType.PIPELINE}
              onUpdate={() => {
                const newTemplateInputs = parse<PipelineInfoConfig>(defaultTo(templateInputSetYaml?.data, '{}'))
                retainInputsAndUpdateFormValues(newTemplateInputs)
              }}
            />
          )}
          <Formik<PipelineInfoConfig>
            initialValues={formValues}
            formName="templateStageOverview"
            onSubmit={noop}
            validate={validateForm}
          >
            {(formik: FormikProps<PipelineInfoConfig>) => {
              formikRef.current = formik as FormikProps<unknown> | null
              return (
                <FormikForm>
                  <Container
                    className={css.inputsContainer}
                    ref={ref => {
                      formRefDom.current = ref as HTMLElement
                    }}
                  >
                    <Layout.Vertical padding={{ bottom: 'large' }} spacing={'xlarge'}>
                      <Heading level={5} color={Color.BLACK}>
                        {getString('pipeline.templateInputs')}
                      </Heading>
                      <Container>
                        <PipelineInputSetFormInternal
                          template={templateInputs}
                          originalPipeline={allValues}
                          path={TEMPLATE_INPUT_PATH}
                          readonly={isReadonly || disableForm}
                          viewType={StepViewType.TemplateUsage}
                          allowableTypes={allowableTypes}
                          viewTypeMetadata={viewTypeMetadata}
                        />
                      </Container>
                    </Layout.Vertical>
                  </Container>
                </FormikForm>
              )
            }}
          </Formik>
        </>
      )}
    </Container>
  )
}
