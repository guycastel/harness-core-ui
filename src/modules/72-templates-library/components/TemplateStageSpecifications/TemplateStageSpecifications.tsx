/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useContext } from 'react'
import { debounce, defaultTo, isEmpty, isEqual, isNil, noop, set } from 'lodash-es'
import { Card, Container, Formik, FormikForm, Heading, Layout, PageError } from '@harness/uicore'
import * as Yup from 'yup'
import { Color } from '@harness/design-system'
import { useParams } from 'react-router-dom'
import type { FormikErrors, FormikProps } from 'formik'
import { produce } from 'immer'
import {
  PipelineContextType,
  usePipelineContext
} from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import type { Error, StageElementConfig } from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import { IdentifierSchema, NameSchema } from '@common/utils/Validation'
import { PageSpinner } from '@common/components'
import {
  getIdentifierFromValue,
  getScopeBasedProjectPathParams,
  getScopeFromValue
} from '@common/components/EntityReference/EntityReference'
import type { ProjectPathProps, GitQueryParams } from '@common/interfaces/RouteInterfaces'
import { NameId } from '@common/components/NameIdDescriptionTags/NameIdDescriptionTags'
import {
  getsMergedTemplateInputYamlPromise,
  useGetResolvedTemplate,
  useGetTemplateInputSetYaml
} from 'services/template-ng'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StageForm } from '@pipeline/components/PipelineInputSetForm/PipelineInputSetForm'
import { StageErrorContext } from '@pipeline/context/StageErrorContext'
import { TemplateTabs } from '@templates-library/components/TemplateStageSetupShell/TemplateStageSetupShellUtils'
import { validateStage } from '@pipeline/components/PipelineStudio/StepUtil'
import { useGlobalEventListener, useMutateAsGet, useQueryParams } from '@common/hooks'
import ErrorsStripBinded from '@pipeline/components/ErrorsStrip/ErrorsStripBinded'
import { useStageTemplateActions } from '@pipeline/utils/useStageTemplateActions'
import { TemplateBar } from '@pipeline/components/PipelineStudio/TemplateBar/TemplateBar'
import { getTemplateErrorMessage, TEMPLATE_INPUT_PATH } from '@pipeline/utils/templateUtils'
import { parse, stringify } from '@common/utils/YamlHelperMethods'
import { getGitQueryParamsWithParentScope } from '@common/utils/gitSyncUtils'
import { PipelineUpdateRequiredWarning } from '@pipeline/components/PipelineUpdateRequiredWarning/PipelineUpdateRequiredWarning'
import { PipelineRequiredActionType } from '@pipeline/components/PipelineUpdateRequiredWarning/PipelineUpdateRequiredWarningHelper'
import { useCheckStageTemplateChange } from './useCheckStageTemplateChange'
import css from './TemplateStageSpecifications.module.scss'

declare global {
  interface WindowEventMap {
    SAVE_PIPELINE_CLICKED: CustomEvent<string>
  }
}

export const TemplateStageSpecifications = (): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId = '' },
      storeMetadata,
      isUpdated
    },
    allowableTypes,
    updateStage,
    isReadonly,
    getStageFromPipeline,
    setIntermittentLoading,
    contextType
  } = usePipelineContext()
  const { stage } = getStageFromPipeline(selectedStageId)
  const queryParams = useParams<ProjectPathProps>()
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()
  const templateRef = getIdentifierFromValue(defaultTo(stage?.stage?.template?.templateRef, ''))
  const templateVersionLabel = getIdentifierFromValue(defaultTo(stage?.stage?.template?.versionLabel, ''))
  const templateGitBranch = stage?.stage?.template?.gitBranch
    ? getIdentifierFromValue(defaultTo(stage?.stage?.template?.gitBranch, ''))
    : branch
  const templateScope = getScopeFromValue(defaultTo(stage?.stage?.template?.templateRef, ''))
  const [formValues, setFormValues] = React.useState<StageElementConfig | undefined>(
    defaultTo(stage?.stage, stage?.stage?.template?.templateInputs as StageElementConfig)
  )
  const [allValues, setAllValues] = React.useState<StageElementConfig>()
  const [templateInputs, setTemplateInputs] = React.useState<StageElementConfig>()
  const { subscribeForm, unSubscribeForm } = React.useContext(StageErrorContext)
  const formikRef = React.useRef<FormikProps<unknown> | null>(null)
  const { submitFormsForTab } = useContext(StageErrorContext)
  const { getString } = useStrings()
  const [loadingMergedTemplateInputs, setLoadingMergedTemplateInputs] = React.useState<boolean>(false)

  const { addOrUpdateTemplate, removeTemplate, switchTemplateVersion, isTemplateUpdated, setIsTemplateUpdated } =
    useStageTemplateActions()
  const { checkStageTemplateChange, requiredAction, disableForm } = useCheckStageTemplateChange()

  const onChange = React.useCallback(
    debounce(async (values: StageElementConfig): Promise<void> => {
      await updateStage({ ...stage?.stage, ...values })
    }, 300),
    [stage?.stage, updateStage]
  )

  const {
    data: resolvedTemplateData,
    error: resolvedTemplateError,
    refetch: refetchResolvedTemplate,
    loading: loadingResolvedTemplate
  } = useMutateAsGet(useGetResolvedTemplate, {
    body: { templatesResolvedYaml: true },
    templateIdentifier: templateRef,
    queryParams: {
      ...getScopeBasedProjectPathParams(queryParams, templateScope),
      versionLabel: templateVersionLabel,
      ...getGitQueryParamsWithParentScope({
        storeMetadata,
        params: queryParams,
        repoIdentifier,
        branch: templateGitBranch,
        sendParentEntityDetails: stage?.stage?.template?.gitBranch ? false : true
      })
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
  })

  React.useEffect(() => {
    setAllValues({
      ...parse<{ template: { spec: StageElementConfig } }>(
        // Use mergedYaml if it is available in templateResponse otherwise fallback to yaml
        defaultTo(defaultTo(resolvedTemplateData?.data?.mergedYaml, resolvedTemplateData?.data?.yaml), '')
      )?.template.spec,
      identifier: defaultTo(stage?.stage?.identifier, '')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTemplateData?.data?.mergedYaml, resolvedTemplateData?.data?.yaml])

  const {
    data: templateInputSetYaml,
    error: templateInputSetError,
    refetch: refetchTemplateInputSet,
    loading: templateInputSetLoading
  } = useGetTemplateInputSetYaml({
    templateIdentifier: templateRef,
    queryParams: {
      ...getScopeBasedProjectPathParams(queryParams, templateScope),
      versionLabel: defaultTo(stage?.stage?.template?.versionLabel, ''),
      ...getGitQueryParamsWithParentScope({
        storeMetadata,
        params: queryParams,
        repoIdentifier,
        branch: templateGitBranch,
        sendParentEntityDetails: stage?.stage?.template?.gitBranch ? false : true
      })
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
  })

  const updateFormValues = (newTemplateInputs?: StageElementConfig): void => {
    const updatedStage = produce(stage?.stage as StageElementConfig, draft => {
      set(draft, 'template.templateInputs', !isEmpty(newTemplateInputs) ? newTemplateInputs : undefined)
    })
    setFormValues(updatedStage)
    updateStage(updatedStage)
  }

  const retainInputsAndUpdateFormValues = (newTemplateInputs?: StageElementConfig): void => {
    if (isEmpty(newTemplateInputs)) {
      updateFormValues(newTemplateInputs)
    } else {
      setLoadingMergedTemplateInputs(true)
      try {
        getsMergedTemplateInputYamlPromise({
          body: {
            oldTemplateInputs: stringify(defaultTo(stage?.stage?.template?.templateInputs, '')),
            newTemplateInputs: stringify(newTemplateInputs)
          },
          queryParams: {
            accountIdentifier: queryParams.accountId
          }
        }).then(response => {
          if (response && response.status === 'SUCCESS') {
            setLoadingMergedTemplateInputs(false)
            updateFormValues(parse<StageElementConfig>(defaultTo(response.data?.mergedTemplateInputs, '')))
          } else {
            throw response
          }
        })
      } catch (error) {
        setLoadingMergedTemplateInputs(false)
        updateFormValues(newTemplateInputs)
      }
    }

    setIsTemplateUpdated(false)
  }

  React.useEffect(() => {
    // NOTE: check diff only if context is PipelineContextType.Pipeline (remove after CDS-75090)
    if (contextType === PipelineContextType.Pipeline && disableForm && isUpdated && templateInputSetYaml?.data) {
      const newTemplateInputs = parse<StageElementConfig>(defaultTo(templateInputSetYaml?.data, ''))
      checkStageTemplateChange(newTemplateInputs, stage ?? {}, false)
    }
  }, [isUpdated, stage, disableForm])

  React.useEffect(() => {
    if (templateInputSetLoading) {
      setTemplateInputs(undefined)
      setAllValues(undefined)
    } else {
      const newTemplateInputs = parse<StageElementConfig>(defaultTo(templateInputSetYaml?.data, ''))
      // NOTE: check diff only if context is PipelineContextType.Pipeline (remove after CDS-75090)
      if (contextType === PipelineContextType.Pipeline && !isTemplateUpdated) {
        checkStageTemplateChange(newTemplateInputs, stage ?? {})
      }

      setTemplateInputs(newTemplateInputs)

      // istanbul ignore else
      if (isTemplateUpdated) {
        retainInputsAndUpdateFormValues(newTemplateInputs)
      } else if (isNil(formValues?.template?.templateInputs) && !isNil(newTemplateInputs)) {
        // The above condition is required when a stage template is first linked
        const updatedStage = produce(stage?.stage as StageElementConfig, draft => {
          set(draft, 'template.templateInputs', newTemplateInputs)
        })
        setFormValues(updatedStage)
        updateStage(updatedStage)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateInputSetLoading])

  React.useEffect(() => {
    subscribeForm({ tab: TemplateTabs.OVERVIEW, form: formikRef })
    return () => unSubscribeForm({ tab: TemplateTabs.OVERVIEW, form: formikRef })
  }, [subscribeForm, unSubscribeForm, formikRef])

  useGlobalEventListener('SAVE_PIPELINE_CLICKED', _event => {
    submitFormsForTab(TemplateTabs.OVERVIEW)
  })

  const validateForm = (values: StageElementConfig): FormikErrors<StageElementConfig> => {
    if (
      isEqual(values.template?.templateRef, stage?.stage?.template?.templateRef) &&
      isEqual(values.template?.versionLabel, stage?.stage?.template?.versionLabel)
    ) {
      onChange?.(values)
      const errorsResponse = validateStage({
        stage: values.template?.templateInputs as StageElementConfig,
        template: templateInputs,
        originalStage: stage?.stage?.template?.templateInputs as StageElementConfig,
        getString,
        viewType: StepViewType.DeploymentForm
      })
      return set({}, TEMPLATE_INPUT_PATH, errorsResponse)
    } else {
      return {}
    }
  }

  const refetch = (): void => {
    refetchResolvedTemplate()
    refetchTemplateInputSet()
  }

  const formRefDom = React.useRef<HTMLElement | undefined>()

  const isLoading = loadingResolvedTemplate || templateInputSetLoading || loadingMergedTemplateInputs

  const error = defaultTo(templateInputSetError, resolvedTemplateError)

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
    <Container className={css.serviceOverrides} height={'100%'} background={Color.FORM_BG}>
      <ErrorsStripBinded domRef={formRefDom} />
      {requiredAction && (
        <PipelineUpdateRequiredWarning
          requiredAction={requiredAction}
          type={PipelineRequiredActionType.STAGE}
          onUpdate={() => {
            const newTemplateInputs = parse<StageElementConfig>(defaultTo(templateInputSetYaml?.data, '{}'))
            retainInputsAndUpdateFormValues(newTemplateInputs)
          }}
        />
      )}
      <Layout.Vertical
        spacing={'xlarge'}
        className={css.contentSection}
        ref={ref => {
          formRefDom.current = ref as HTMLElement
        }}
      >
        {stage?.stage?.template && (
          <TemplateBar
            templateLinkConfig={stage?.stage.template}
            onRemoveTemplate={removeTemplate}
            onOpenTemplateSelector={addOrUpdateTemplate}
            switchTemplateVersion={switchTemplateVersion}
            className={css.templateBar}
            isReadonly={isReadonly}
            storeMetadata={storeMetadata}
            supportVersionChange={true}
          />
        )}
        <Formik<StageElementConfig>
          initialValues={formValues as StageElementConfig}
          formName="templateStageOverview"
          onSubmit={noop}
          validate={validateForm}
          validationSchema={Yup.object().shape({
            name: NameSchema(getString, {
              requiredErrorMsg: getString('pipelineSteps.build.create.stageNameRequiredError')
            }),
            identifier: IdentifierSchema(getString)
          })}
          enableReinitialize={true}
        >
          {(formik: FormikProps<StageElementConfig>) => {
            window.dispatchEvent(new CustomEvent('UPDATE_ERRORS_STRIP', { detail: TemplateTabs.OVERVIEW }))
            formikRef.current = formik as FormikProps<unknown> | null
            return (
              <FormikForm>
                <Card className={css.sectionCard}>
                  <NameId
                    identifierProps={{
                      inputLabel: getString('stageNameLabel'),
                      isIdentifierEditable: false,
                      inputGroupProps: { disabled: isReadonly }
                    }}
                    inputGroupProps={{ placeholder: getString('common.namePlaceholder') }}
                  />
                </Card>
                <Container className={css.inputsContainer}>
                  {isLoading && <PageSpinner />}
                  {!isLoading && error && (
                    <Container height={isEmpty((error?.data as Error)?.responseMessages) ? 300 : 500}>
                      <PageError message={getTemplateErrorMessage(error, css.errorHandler)} onClick={() => refetch()} />
                    </Container>
                  )}
                  {!isLoading && !error && templateInputs && allValues && (
                    <Layout.Vertical
                      margin={{ top: 'medium' }}
                      padding={{ top: 'large', bottom: 'large' }}
                      spacing={'large'}
                    >
                      <Heading level={5} color={Color.BLACK}>
                        {getString('pipeline.templateInputs')}
                      </Heading>
                      <StageForm
                        template={{ stage: templateInputs }}
                        allValues={{ stage: allValues }}
                        path={TEMPLATE_INPUT_PATH}
                        readonly={isReadonly || disableForm}
                        viewType={StepViewType.TemplateUsage}
                        hideTitle={true}
                        stageClassName={css.stageCard}
                        allowableTypes={allowableTypes}
                      />
                    </Layout.Vertical>
                  )}
                </Container>
              </FormikForm>
            )
          }}
        </Formik>
      </Layout.Vertical>
    </Container>
  )
}
