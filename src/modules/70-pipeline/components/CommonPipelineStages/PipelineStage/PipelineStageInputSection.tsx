/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react'
import cx from 'classnames'
import {
  Formik,
  Layout,
  PageSpinner,
  FormikForm,
  Container,
  Text,
  getMultiTypeFromValue,
  MultiTypeInputType
} from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { isEmpty, defaultTo, get, set, debounce, noop, memoize, isUndefined, isNil } from 'lodash-es'
import type { FormikErrors, FormikProps } from 'formik'
import { useParams } from 'react-router-dom'
import produce from 'immer'
import {
  InputSetSummaryResponse,
  PipelineConfig,
  PipelineInfoConfig,
  useGetPipeline,
  useGetTemplateFromPipeline,
  useGetMergeInputSetFromPipelineTemplateWithListInput
} from 'services/pipeline-ng'
import type { GitQueryParams, PipelineType, RunPipelineQueryParams } from '@common/interfaces/RouteInterfaces'
import { useStrings } from 'framework/strings'
import { mergeTemplateWithInputSetData } from '@pipeline/utils/runPipelineUtils'
import { stringify, yamlParse, parse } from '@common/utils/YamlHelperMethods'
import type { InputSetDTO, Pipeline } from '@pipeline/utils/types'
import { useDeepCompareEffect } from '@common/hooks/useDeepCompareEffect'
import type { StoreMetadata } from '@common/constants/GitSyncTypes'
import { InputSetSelector } from '@pipeline/components/InputSetSelector/InputSetSelector'
import type { ExistingProvide } from '@pipeline/components/RunPipelineModal/type'
import { PipelineInputSetFormInternal } from '@pipeline/components/PipelineInputSetForm/PipelineInputSetForm'
import SelectExistingInputsOrProvideNew from '@pipeline/components/RunPipelineModal/SelectExistingOrProvide'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { validatePipeline } from '@pipeline/components/PipelineStudio/StepUtil'
import { usePipelineVariables } from '@pipeline/components/PipelineVariablesContext/PipelineVariablesContext'
import type { InputSetSelectorProps } from '@pipeline/components/InputSetSelector/InputSetSelector'
import { useQueryParams } from '@common/hooks'
import type { InputSetValue } from '@pipeline/components/InputSetSelector/utils'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import type { PipelineStageElementConfig, StageElementWrapper } from '@pipeline/utils/pipelineTypes'
import { getInputSetReference } from '@pipeline/components/OverlayInputSetForm/OverlayInputSetUtils'
import { getsMergedTemplateInputYamlPromise } from 'services/template-ng'
import { useMutateAsGet } from '@common/hooks/useMutateAsGet'
import ErrorsStripBinded from '@pipeline/components/ErrorsStrip/ErrorsStripBinded'
import { StageErrorContext } from '@pipeline/context/StageErrorContext'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import type { AcceptableValue } from '@pipeline/components/PipelineInputSetForm/CICodebaseInputSetForm'
import { PipelineStageTabs } from './utils'
import css from './PipelineStageAdvancedSpecifications.module.scss'

const memoizedParse = memoize(parse)

function PipelineInputSetFormBasic(): React.ReactElement {
  const { accountId } = useParams<
    PipelineType<{
      orgIdentifier: string
      projectIdentifier: string
      pipelineIdentifier: string
      accountId: string
    }>
  >()
  const { connectorRef, repoIdentifier: _repoId, repoName, branch } = useQueryParams<GitQueryParams>()
  const {
    state: {
      selectionState: { selectedStageId = '' }
    },
    allowableTypes,
    updateStage,
    getStageFromPipeline
  } = usePipelineContext()
  const { isGitSyncEnabled: isGitSyncEnabledForProject, gitSyncEnabledOnlyForFF } = useAppStore()

  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const repoIdentifier = isGitSyncEnabled ? _repoId : repoName
  const selectedStage = getStageFromPipeline<PipelineStageElementConfig>(selectedStageId).stage
  const pipelineIdentifier = get(selectedStage?.stage as PipelineStageElementConfig, 'spec.pipeline', '')
  const projectIdentifier = get(selectedStage?.stage as PipelineStageElementConfig, 'spec.project', '')
  const orgIdentifier = get(selectedStage?.stage as PipelineStageElementConfig, 'spec.org', '')

  const { inputSetType, inputSetValue, inputSetLabel, inputSetRepoIdentifier, inputSetBranch } = useQueryParams<
    GitQueryParams & RunPipelineQueryParams
  >()

  const inputSetSelected = useMemo((): InputSetValue[] => {
    if (inputSetType) {
      const inputSetsSelected: InputSetValue[] = [
        {
          type: inputSetType as InputSetSummaryResponse['inputSetType'],
          value: inputSetValue ?? '',
          label: inputSetLabel ?? '',
          gitDetails: {
            repoIdentifier: inputSetRepoIdentifier,
            branch: inputSetBranch
          }
        }
      ]
      return inputSetsSelected
    }
    return []
  }, [inputSetType, inputSetValue, inputSetLabel, inputSetRepoIdentifier, inputSetBranch])

  const [formErrors, setFormErrors] = useState<FormikErrors<InputSetDTO>>({})
  const formikRef = useRef<FormikProps<PipelineInfoConfig>>()
  const isChildPipBuildRuntime = useRef<boolean>(true)
  const { getString } = useStrings()
  const { selectedInputSetsContext } = usePipelineVariables()

  const [existingProvide, setExistingProvide] = useState<ExistingProvide>('existing')
  const [inputTabFormValues, setInputTabFormValues] = React.useState<PipelineInfoConfig | undefined>(
    {} as PipelineInfoConfig
  )
  const [loadingMergedTemplateInputs, setLoadingMergedTemplateInputs] = React.useState<boolean>(false)
  const tempPipelineInputs = useRef<PipelineInfoConfig | undefined>(undefined)
  const [selectedInputSets, setSelectedInputSets] = useState<InputSetSelectorProps['value']>(selectedInputSetsContext)
  const [invalidInputSetReferences, setInvalidInputSetReferences] = useState<Array<string>>([])
  const { subscribeForm, unSubscribeForm } = useContext(StageErrorContext)
  const pipelineInputsFromYaml = get(selectedStage?.stage as PipelineStageElementConfig, 'spec.inputs')
  const inputSetReferencesFromYaml = get(selectedStage?.stage as PipelineStageElementConfig, 'spec.inputSetReferences')

  const { data: pipelineResponse, loading: loadingPipeline } = useGetPipeline({
    pipelineIdentifier,
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      repoIdentifier,
      branch,
      getTemplatesResolvedPipeline: true,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoIdentifier
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
  })

  const pipeline: PipelineInfoConfig | undefined = useMemo(
    () => yamlParse<PipelineConfig>(defaultTo(pipelineResponse?.data?.yamlPipeline, ''))?.pipeline,
    [pipelineResponse?.data?.yamlPipeline]
  )

  const resolvedPipeline: PipelineInfoConfig | undefined = useMemo(
    () => yamlParse<PipelineConfig>(defaultTo(pipelineResponse?.data?.resolvedTemplatesPipelineYaml, ''))?.pipeline,
    [pipelineResponse?.data?.resolvedTemplatesPipelineYaml]
  )

  const { data: inputSetYamlResponse, loading: loadingTemplate } = useMutateAsGet(useGetTemplateFromPipeline, {
    body: {
      stageIdentifiers: []
    },
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      branch,
      repoIdentifier,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoIdentifier
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
  })

  const { data: inputSetData, loading: loadingInputSetsData } = useMutateAsGet(
    useGetMergeInputSetFromPipelineTemplateWithListInput,
    {
      body: {
        inputSetReferences: selectedInputSets?.map(row => row.value),
        stageIdentifiers: []
      },
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier,
        pipelineRepoID: repoIdentifier,
        pipelineBranch: branch,
        repoIdentifier,
        branch,
        getDefaultFromOtherRepo: true,
        parentEntityConnectorRef: connectorRef,
        parentEntityRepoName: repoName
      },
      requestOptions: { headers: { 'Load-From-Cache': 'true' } }
    }
  )

  useEffect(() => {
    if (inputSetData?.data?.errorResponse) {
      setSelectedInputSets([])
    }
    setInvalidInputSetReferences(get(inputSetData?.data, 'inputSetErrorWrapper.invalidInputSetReferences', []))
  }, [inputSetData?.data, inputSetData?.data?.errorResponse])

  const onReconcile = (identifier: string): void => {
    setInvalidInputSetReferences(invalidInputSetReferences.filter(id => id !== identifier))
  }

  const inputSetTemplate = useMemo((): Pipeline => {
    if (inputSetYamlResponse?.data?.inputSetTemplateYaml) {
      const parsedRunPipelineYaml = memoizedParse<Pipeline>(inputSetYamlResponse.data.inputSetTemplateYaml).pipeline
      return { pipeline: parsedRunPipelineYaml }
    }
    return {} as Pipeline
  }, [inputSetYamlResponse?.data?.inputSetTemplateYaml])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceUpdateStage = useCallback(
    debounce(
      (changedStage?: PipelineStageElementConfig) =>
        changedStage ? updateStage(changedStage) : /* istanbul ignore next */ Promise.resolve(),
      300
    ),
    [updateStage]
  )

  useEffect(() => {
    if (!!inputSetYamlResponse?.data?.hasInputSets && !pipelineInputsFromYaml) {
      setExistingProvide('existing')
    } else setExistingProvide('provide')
  }, [inputSetYamlResponse?.data?.hasInputSets])

  const hasInputSets = !!inputSetYamlResponse?.data?.hasInputSets
  const loadingInputSets = loadingTemplate || loadingInputSetsData || loadingMergedTemplateInputs
  const hasRuntimeInputs = !!inputSetYamlResponse?.data?.inputSetTemplateYaml

  useEffect(() => {
    subscribeForm({
      tab: PipelineStageTabs.INPUTS,
      form: formikRef as React.MutableRefObject<FormikProps<unknown> | null>
    })
    return () =>
      unSubscribeForm({
        tab: PipelineStageTabs.INPUTS,
        form: formikRef as React.MutableRefObject<FormikProps<unknown> | null>
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setSelectedInputSets(inputSetSelected)
  }, [inputSetSelected])

  const selectedInputSetReferences: string[] | undefined = React.useMemo(() => {
    return selectedInputSets?.map(getInputSetReference)
  }, [selectedInputSets])

  const updateInputTabFormValues = (newFormValues?: PipelineInfoConfig): void => {
    const updatedStage = produce(selectedStage?.stage as PipelineStageElementConfig, draft => {
      if (!hasInputSets || pipelineInputsFromYaml) {
        set(draft, 'spec.inputs', newFormValues)
        delete draft?.spec?.inputSetReferences
      } else {
        let _inputSetReferences = selectedInputSetReferences
        if (isEmpty(_inputSetReferences) || isNil(_inputSetReferences)) _inputSetReferences = inputSetReferencesFromYaml
        set(draft, 'spec.inputSetReferences', defaultTo(_inputSetReferences, []))
        delete draft?.spec?.inputs
      }
    })
    setInputTabFormValues(newFormValues as PipelineInfoConfig)
    debounceUpdateStage(updatedStage)
  }

  const getFormErrors = async (
    latestPipeline: { pipeline: PipelineInfoConfig },
    latestYamlTemplate: PipelineInfoConfig,
    orgPipeline: PipelineInfoConfig | undefined
  ): Promise<FormikErrors<InputSetDTO>> => {
    let errors = formErrors
    function validateErrors(): Promise<FormikErrors<InputSetDTO>> {
      return new Promise(resolve => {
        const validatedErrors =
          (validatePipeline({
            pipeline: latestPipeline.pipeline,
            template: latestYamlTemplate,
            originalPipeline: orgPipeline,
            resolvedPipeline,
            getString,
            viewType: StepViewType.DeploymentForm,
            viewTypeMetadata: { isInputSet: true }
          }) as any) || formErrors
        resolve(validatedErrors)
      })
    }
    if (latestPipeline?.pipeline && latestYamlTemplate && orgPipeline) {
      errors = await validateErrors()
      setFormErrors({ ...errors })
    }
    return errors
  }

  useEffect(() => {
    if (
      hasRuntimeInputs &&
      !isUndefined(selectedInputSets) &&
      selectedInputSets.length > 0 &&
      inputSetData?.data?.pipelineYaml
    ) {
      const parsedInputSets = memoizedParse<Pipeline>(inputSetData.data.pipelineYaml).pipeline
      const mergeTemplateInputSetData = mergeTemplateWithInputSetData({
        templatePipeline: { pipeline: inputSetTemplate.pipeline },
        inputSetPortion: { pipeline: parsedInputSets },
        allValues: { pipeline: defaultTo(resolvedPipeline, {} as PipelineInfoConfig) },
        shouldUseDefaultValues: true
      })
      updateInputTabFormValues(mergeTemplateInputSetData?.pipeline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInputSets, inputSetData?.data])

  useDeepCompareEffect(() => {
    //  Special handling ->
    //  when build value is not runtime in child pipeline
    //  -> possible when trying to use child pipeline input-sets & build field is configured.
    if (
      getMultiTypeFromValue(
        formikRef.current?.values?.properties?.ci?.codebase?.build as unknown as AcceptableValue
      ) !== MultiTypeInputType.RUNTIME
    ) {
      isChildPipBuildRuntime.current = false
    } else if (!isChildPipBuildRuntime.current) isChildPipBuildRuntime.current = true
  }, [formikRef.current?.values?.properties?.ci?.codebase])

  const handleValidation = async (values: Pipeline | PipelineInfoConfig): Promise<FormikErrors<InputSetDTO>> => {
    let tempPipeline: PipelineInfoConfig

    if ((values as Pipeline)?.pipeline) {
      tempPipeline = (values as Pipeline).pipeline
    } else {
      tempPipeline = values as PipelineInfoConfig
    }

    const inputTabFormErrors = await getFormErrors(
      { pipeline: tempPipeline } as Required<Pipeline>,
      defaultTo(inputSetTemplate?.pipeline, {} as PipelineInfoConfig),
      pipeline
    )
    const stageData = produce(selectedStage, (draft: StageElementWrapper<PipelineStageElementConfig>) => {
      set(draft, 'stage.spec.inputs', tempPipeline)
    })
    if (existingProvide === 'provide') debounceUpdateStage(stageData?.stage)

    return inputTabFormErrors
  }

  useDeepCompareEffect(() => {
    if (!isEmpty(inputSetTemplate.pipeline)) {
      setLoadingMergedTemplateInputs(true)
      try {
        getsMergedTemplateInputYamlPromise({
          body: {
            oldTemplateInputs: stringify(defaultTo(selectedStage?.stage?.spec?.inputs, '')),
            newTemplateInputs: stringify(inputSetTemplate.pipeline)
          },
          queryParams: {
            accountIdentifier: accountId
          },
          requestOptions: { headers: { 'Load-From-Cache': 'true' } }
        }).then(response => {
          if (response && response.status === 'SUCCESS') {
            setLoadingMergedTemplateInputs(false)
            updateInputTabFormValues(parse(get(response, 'data.mergedTemplateInputs', '')))
          } else {
            throw response
          }
        })
      } catch (error) {
        setLoadingMergedTemplateInputs(false)
        updateInputTabFormValues(inputSetTemplate.pipeline)
      }
    }
  }, [inputSetTemplate])

  if (loadingPipeline || loadingTemplate || loadingMergedTemplateInputs) {
    return <PageSpinner />
  }

  const showInputSetSelector = (): boolean => {
    return !!(pipeline && hasRuntimeInputs && existingProvide === 'existing' && hasInputSets)
  }

  const showVoidPipelineInputSetForm = (): boolean => {
    return !!(existingProvide === 'existing' && selectedInputSets?.length)
  }

  const handleExistingProvideRadioChange = (ev: FormEvent<HTMLInputElement>): void => {
    const existingProvideValue = ev.currentTarget.checked ? 'existing' : 'provide'
    setExistingProvide(existingProvideValue)
    let stageData = undefined
    switch (existingProvideValue) {
      case 'existing': {
        stageData = produce(selectedStage, (draft: StageElementWrapper<PipelineStageElementConfig>) => {
          set(draft, 'stage.spec.inputSetReferences', selectedInputSetReferences)
          tempPipelineInputs.current = draft?.stage?.spec?.inputs as PipelineInfoConfig
          delete draft?.stage?.spec?.inputs
        })
        break
      }
      case 'provide': {
        stageData = produce(selectedStage, (draft: StageElementWrapper<PipelineStageElementConfig>) => {
          set(draft, 'stage.spec.inputs', defaultTo(tempPipelineInputs.current, inputTabFormValues))
          delete draft?.stage?.spec?.inputSetReferences
        })
        break
      }
    }
    debounceUpdateStage(stageData?.stage)
  }

  const noRuntimeInputs =
    resolvedPipeline && !hasRuntimeInputs ? getString('runPipelineForm.noRuntimeInput') : undefined

  return (
    <Container>
      <Formik<PipelineInfoConfig>
        initialValues={inputTabFormValues as PipelineInfoConfig}
        formName="inputTabPipelineStageForm"
        validate={handleValidation}
        enableReinitialize={true}
        onSubmit={noop}
      >
        {(formik: FormikProps<PipelineInfoConfig>) => {
          const { values } = formik
          formikRef.current = formik
          window.dispatchEvent(new CustomEvent('UPDATE_ERRORS_STRIP', { detail: PipelineStageTabs.INPUTS }))

          if (hasRuntimeInputs && isEmpty(values)) {
            return <PageSpinner />
          }

          const showPipelineInputSetForm = (): boolean => {
            return (
              !!((existingProvide === 'provide' || selectedInputSets?.length) && resolvedPipeline) &&
              !isEmpty(values) &&
              hasRuntimeInputs &&
              !loadingInputSets
            )
          }

          return (
            <FormikForm>
              {noRuntimeInputs ? (
                <Layout.Horizontal margin={{ left: 'medium', bottom: 'medium' }}>
                  <Text font={{ variation: FontVariation.H6, weight: 'light' }}>{noRuntimeInputs}</Text>
                </Layout.Horizontal>
              ) : (
                <>
                  <Layout.Vertical>
                    <SelectExistingInputsOrProvideNew
                      existingProvide={existingProvide}
                      onExistingProvideRadioChange={handleExistingProvideRadioChange}
                      hasInputSets={hasInputSets}
                    />
                    {showInputSetSelector() ? (
                      <GitSyncStoreProvider>
                        <InputSetSelector
                          pipelineIdentifier={pipelineIdentifier}
                          onChange={inputsets => {
                            setSelectedInputSets(inputsets)
                          }}
                          value={selectedInputSets}
                          pipelineGitDetails={get(pipelineResponse, 'data.gitDetails')}
                          invalidInputSetReferences={invalidInputSetReferences}
                          loadingMergeInputSets={loadingInputSets}
                          onReconcile={onReconcile}
                          reRunInputSetYaml={''}
                          childPipelineProps={{
                            childOrgIdentifier: orgIdentifier,
                            childProjectIdentifier: projectIdentifier,
                            inputSetReferences: inputSetReferencesFromYaml
                          }}
                        />
                      </GitSyncStoreProvider>
                    ) : null}
                  </Layout.Vertical>

                  {showPipelineInputSetForm() ? (
                    <>
                      <div className={css.divider} />
                      <PipelineInputSetFormInternal
                        originalPipeline={resolvedPipeline as PipelineInfoConfig}
                        template={defaultTo(inputSetTemplate?.pipeline, {} as PipelineInfoConfig)}
                        readonly={existingProvide === 'existing'}
                        path=""
                        viewType={StepViewType.TemplateUsage}
                        allowableTypes={allowableTypes}
                        viewTypeMetadata={isChildPipBuildRuntime.current ? { isTemplateBuilder: true } : undefined}
                      />
                    </>
                  ) : null}
                  {showVoidPipelineInputSetForm() ? <div className={css.noPipelineInputSetForm} /> : null}
                </>
              )}
            </FormikForm>
          )
        }}
      </Formik>
    </Container>
  )
}

export function PipelineStageInputSection({
  children
}: React.PropsWithChildren<{
  storeMetadata?: StoreMetadata
}>): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  return (
    <div className={cx(css.stageSection, css.editStageGrid)}>
      <ErrorsStripBinded domRef={scrollRef as React.MutableRefObject<HTMLElement | undefined>} />
      <div className={css.contentSection} ref={scrollRef}>
        <PipelineInputSetFormBasic />
        <Container margin={{ top: 'xxlarge' }} className={css.navigationButtons}>
          {children}
        </Container>
      </div>
    </div>
  )
}
