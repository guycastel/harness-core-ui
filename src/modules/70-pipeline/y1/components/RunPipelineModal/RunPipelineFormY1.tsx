/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Formik,
  Layout,
  NestedAccordionProvider,
  ButtonVariation,
  PageSpinner,
  VisualYamlSelectedView as SelectedView,
  SelectOption,
  OverlaySpinner,
  Dialog as ErrorHandlerDialog
} from '@harness/uicore'
import { Color } from '@harness/design-system'
import cx from 'classnames'
import { useHistory } from 'react-router-dom'
import { isEmpty, defaultTo, keyBy } from 'lodash-es'
import type { FormikErrors, FormikProps } from 'formik'
import {
  useExecutePipelineMutation,
  useGetInputsSchemaDetailsQuery,
  useMergedInputSetsMutation
} from '@harnessio/react-pipeline-service-client'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import {
  PipelineInfoConfig,
  ResponseJsonNode,
  useGetPipeline,
  StageExecutionResponse,
  useGetStagesExecutionList,
  Error,
  GitErrorMetadataDTO,
  ResponseMessage,
  useGetRetryStages
} from 'services/pipeline-ng'
import { useToaster } from '@common/exports'
import routes from '@common/RouteDefinitions'
import type { YamlBuilderHandlerBinding, YamlBuilderProps } from '@common/interfaces/YAMLBuilderProps'
import { usePermission } from '@rbac/hooks/usePermission'
import type {
  ExecutionPathProps,
  GitQueryParams,
  InputSetGitQueryParams,
  PipelinePathProps,
  PipelineType
} from '@common/interfaces/RouteInterfaces'
import { useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import RbacButton from '@rbac/components/Button/Button'
import {
  getAllStageData,
  getAllStageItem,
  SelectedStageData,
  StageSelectionData
} from '@pipeline/utils/runPipelineUtils'
import { useQueryParams } from '@common/hooks'
import { yamlParse, yamlStringify } from '@common/utils/YamlHelperMethods'
import { PipelineActions } from '@common/constants/TrackingConstants'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { YamlBuilderMemo } from '@common/components/YAMLBuilder/YamlBuilder'
import { useShouldDisableDeployment } from 'services/cd-ng'
import type { GitFilterScope } from '@common/components/GitFilters/GitFilters'
import type { IRemoteFetchError } from '@pipeline/pages/utils/NoEntityFound/NoEntityFound'
import { ErrorHandler } from '@common/components/ErrorHandler/ErrorHandler'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { usePrevious } from '@common/hooks/usePrevious'
import {
  LexicalContext,
  PipelineVariablesContextProvider
} from '@pipeline/components/PipelineVariablesContext/PipelineVariablesContext'
import { SelectStageToRetryState } from '@pipeline/components/RunPipelineModal/SelectStageToRetryNew'
import {
  PipelineInvalidRequestContent,
  PipelineInvalidRequestContentProps
} from '@pipeline/components/RunPipelineModal/PipelineInvalidRequestContent'
import { ApprovalStageInfo, RequiredStagesInfo } from '@pipeline/components/RunPipelineModal/RunStageInfoComponents'
import CheckBoxActions from '@pipeline/components/RunPipelineModal/CheckBoxActions'
import { ActiveFreezeWarning } from '@pipeline/components/RunPipelineModal/ActiveFreezeWarning'
import factory from '@pipeline/components/PipelineSteps/PipelineStepFactory'

import { InputSetItem, InputSetKVPairs } from '@modules/70-pipeline/components/InputSetFormY1/types'
import RunModalHeader from './RunModalHeaderY1'
import VisualViewY1 from './VisualViewY1'
import { PipelineMetadata } from '../PipelineContext/PipelineActionsY1'
import { UIInputs } from '../InputsForm/types'
import { generateInputsFromMetadataResponse } from '../InputsForm/utils'
import { replaceEmptyStringsWithNull, unwrapEmptyStrings, wrapEmptyStrings } from '../utils'
import css from './RunPipelineFormY1.module.scss'

export interface InputsKVPair {
  [key: string]: unknown
}

export interface RunPipelineFormProps extends PipelineType<PipelinePathProps & GitQueryParams> {
  // inputSetSelected?: InputSetSelectorProps['value']
  onClose?: () => void
  executionView?: boolean
  mockData?: ResponseJsonNode
  stagesExecuted?: string[]
  executionIdentifier?: string
  source: ExecutionPathProps['source']
  storeMetadata?: StoreMetadata
  isDebugMode?: boolean
  isRetryFromStage?: boolean
  preSelectLastStage?: boolean
  pipelineMetadata?: PipelineMetadata
}

const yamlBuilderReadOnlyModeProps: YamlBuilderProps = {
  fileName: `run-pipeline.yaml`,
  entityType: 'Pipelines',
  yamlSanityConfig: {
    removeEmptyString: false,
    removeEmptyObject: false,
    removeEmptyArray: false,
    removeNull: false
  }
}

function RunPipelineFormBasic({
  pipelineIdentifier,
  accountId,
  orgIdentifier,
  projectIdentifier,
  onClose,
  module,
  executionView,
  branch,
  source,
  repoIdentifier,
  connectorRef,
  storeType,
  stagesExecuted,
  executionIdentifier,
  isDebugMode,
  pipelineMetadata,
  isRetryFromStage = false,
  preSelectLastStage = false
}: RunPipelineFormProps & InputSetGitQueryParams): React.ReactElement {
  const [skipPreFlightCheck, setSkipPreFlightCheck] = useState<boolean>(true) //TODO: false default
  const [selectedView, setSelectedView] = useState<SelectedView>(SelectedView.VISUAL)
  const [notifyOnlyMe, setNotifyOnlyMe] = useState<boolean>(false)
  const [selectedInputSetItems, setSelectedInputSetItems] = useState<InputSetItem[]>([])
  const { trackEvent } = useTelemetry()
  const { showError, showSuccess, showWarning } = useToaster()
  const formikRef = React.useRef<FormikProps<InputsKVPair>>()
  const history = useHistory()
  const { getString } = useStrings()
  const { getRBACErrorMessage } = useRBACError()
  const { supportingGitSimplification } = useAppStore()
  const [runClicked, setRunClicked] = useState(false)
  const [selectedStageData, setSelectedStageData] = useState<StageSelectionData>({
    allStagesSelected: true,
    selectedStages: [getAllStageData(getString)],
    selectedStageItems: [getAllStageItem(getString)]
  })
  const [yamlHandler, setYamlHandler] = useState<YamlBuilderHandlerBinding | undefined>()
  const [submitCount, setSubmitCount] = useState<number>(0)
  const [runPipelineError, setRunPipelineError] = useState<Error>({})
  const isErrorEnhancementFFEnabled = useFeatureFlag(FeatureFlag.PIE_ERROR_ENHANCEMENTS)
  const loadFromCache = useFeatureFlag(FeatureFlag.CDS_ENABLE_LOAD_FROM_CACHE_FOR_RETRY_FORM).toString()
  const validateFormRef = useRef<(values?: InputsKVPair) => Promise<FormikErrors<InputsKVPair>>>()
  const [stageToRetryState, setStageToRetryState] = useState<SelectStageToRetryState | null>(null)

  const [, /*canSaveInputSet*/ canEditYaml] = usePermission(
    {
      resourceScope: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier
      },
      resource: {
        resourceType: ResourceType.PIPELINE,
        resourceIdentifier: pipelineIdentifier
      },
      permissions: [PermissionIdentifier.EDIT_PIPELINE, PermissionIdentifier.EXECUTE_PIPELINE]
    },
    [accountId, orgIdentifier, projectIdentifier, pipelineIdentifier]
  )

  const { data: shouldDisableDeploymentData, loading: loadingShouldDisableDeployment } = useShouldDisableDeployment({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier
    }
  })

  const pipelineDefaultQueryParam = {
    accountIdentifier: accountId,
    orgIdentifier,
    projectIdentifier,
    repoIdentifier,
    branch,
    getTemplatesResolvedPipeline: true,
    parentEntityConnectorRef: connectorRef,
    parentEntityRepoName: repoIdentifier
  }

  const {
    data: pipelineResponse,
    loading: loadingPipeline,
    refetch: refetchPipeline,
    error: pipelineError
  } = useGetPipeline({
    pipelineIdentifier,
    queryParams: pipelineDefaultQueryParam,
    requestOptions: { headers: { 'Load-From-Cache': isRetryFromStage ? loadFromCache : 'true' } }
  })

  const pipeline: PipelineInfoConfig | undefined = React.useMemo(
    () => yamlParse<PipelineInfoConfig>(defaultTo(pipelineResponse?.data?.yamlPipeline, '')),
    [pipelineResponse?.data?.yamlPipeline]
  )

  const getPipelineBranch = (): string | undefined => branch || pipelineResponse?.data?.gitDetails?.branch
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(getPipelineBranch())
  const previousSelectedBranch = usePrevious(selectedBranch)

  const { executionId } = useQueryParams<{ executionId?: string }>()

  const pipelineExecutionId = executionIdentifier ?? executionId
  const isRerunPipeline = !isEmpty(pipelineExecutionId)
  const formTitleText = isDebugMode
    ? getString('pipeline.execution.actions.reRunInDebugMode')
    : isRetryFromStage && preSelectLastStage
    ? getString('pipeline.execution.actions.reRunLastFailedStageTitle')
    : isRetryFromStage
    ? getString('pipeline.execution.actions.reRunSpecificStageTitle')
    : isRerunPipeline
    ? getString('pipeline.execution.actions.rerunPipeline')
    : getString('runPipeline')

  const runButtonLabel = isDebugMode
    ? getString('pipeline.execution.actions.reRunInDebugMode')
    : isRetryFromStage
    ? getString('pipeline.execution.actions.reRun')
    : isRerunPipeline
    ? getString('pipeline.execution.actions.rerunPipeline')
    : getString('runPipeline')

  const { data: stageExecutionData /* error: stageExecutionError*/ } = useGetStagesExecutionList({
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
    lazy: executionView,
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
  })

  const {
    data: retryStagesResponse,
    loading: retryStagesLoading,
    error: getRetryStagesError
  } = useGetRetryStages({
    planExecutionId: pipelineExecutionId ?? '',
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      repoIdentifier,
      branch,
      getDefaultFromOtherRepo: true,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoIdentifier
    },
    requestOptions: { headers: { 'Load-From-Cache': loadFromCache } },
    lazy: !isRetryFromStage
  })

  const retryStagesResponseData = retryStagesResponse?.data

  useEffect(() => {
    if (getRetryStagesError) {
      showError(getRBACErrorMessage(getRetryStagesError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getRetryStagesError])

  const executionStageList = useMemo((): SelectOption[] => {
    const executionStages: SelectOption[] =
      stageExecutionData?.data?.map((execStage: StageExecutionResponse) => {
        return {
          label: defaultTo(execStage?.stageName, ''),
          value: defaultTo(execStage?.stageIdentifier, '')
        }
      }) || []
    executionStages.unshift(getAllStageItem(getString))

    if (stagesExecuted?.length) {
      const updatedSelectedStageList: SelectedStageData[] = []
      const updatedSelectedItems: SelectOption[] = []
      stagesExecuted.forEach(stageExecuted => {
        const selectedStage = stageExecutionData?.data?.find(stageData => stageData.stageIdentifier === stageExecuted)
        selectedStage && updatedSelectedStageList.push(selectedStage)
        selectedStage &&
          updatedSelectedItems.push({
            label: selectedStage?.stageName as string,
            value: selectedStage?.stageIdentifier as string
          })
      })

      setSelectedStageData({
        selectedStages: updatedSelectedStageList,
        selectedStageItems: updatedSelectedItems,
        allStagesSelected: false
      })
      setSkipPreFlightCheck(true)
    } else {
      setSelectedStageData({
        selectedStages: [getAllStageData(getString)],
        selectedStageItems: [getAllStageItem(getString)],
        allStagesSelected: true
      })
    }
    return executionStages
  }, [stageExecutionData?.data])

  useEffect(() => {
    // TODO:: default set skipPreflightCheck to true
    setSkipPreFlightCheck(true || defaultTo(supportingGitSimplification && storeType === StoreType.REMOTE, false))
  }, [supportingGitSimplification, storeType])

  const { mutateAsync: executePipeline, isLoading: isExecutingPipeline } = useExecutePipelineMutation()

  // const isExecutingPipeline =
  //   runPipelineLoading ||
  //   reRunPipelineLoading ||
  //   runStagesLoading ||
  //   reRunStagesLoading ||
  //   reRunDebugModeLoading ||
  //   retryPipelineLoading

  const handleRunPipeline = async (valuesPipeline: InputsKVPair): Promise<void> => {
    const errors = await validateFormRef.current?.(valuesPipeline)
    if (errors && Object.keys(errors).length) {
      return
    }

    try {
      const response = await executePipeline({
        org: orgIdentifier,
        pipeline: pipelineMetadata?.identifier as string,
        project: projectIdentifier,
        body: { inputs_yaml: yamlStringify({ inputs: valuesPipeline }) },
        queryParams: {
          connector_ref: connectorRef,
          repo_name: repoIdentifier,
          branch_name: selectedBranch,
          notify_only_user: notifyOnlyMe,
          module
        }
      })
      const data = response?.content

      if ((response as any)?.status === 'SUCCESS' || !isEmpty(data)) {
        setRunPipelineError({})
        onClose?.()
        if (response?.content) {
          showSuccess(getString('runPipelineForm.pipelineRunSuccessFully'))
          history.push({
            pathname: routes.toExecutionPipelineView({
              orgIdentifier,
              pipelineIdentifier,
              projectIdentifier,
              executionIdentifier: response?.content?.execution_details?.execution_id ?? '',
              accountId,
              module,
              source
            }),
            search:
              supportingGitSimplification && storeType === StoreType.REMOTE
                ? `connectorRef=${connectorRef}&repoName=${repoIdentifier}&branch=${getPipelineBranch()}&storeType=${storeType}`
                : undefined
          })
          trackEvent(PipelineActions.StartedExecution, { module })
        }
      }
    } catch (error) {
      setRunPipelineError(error?.data as Error)
      if (!isErrorEnhancementFFEnabled)
        showWarning(defaultTo(getRBACErrorMessage(error, true), getString('runPipelineForm.runPipelineFailed')))
    }
  }

  function formikUpdateWithLatestYaml(): void {
    if (!yamlHandler || !formikRef.current) return

    try {
      const parsedYaml = yamlParse<InputsKVPair>(defaultTo(yamlHandler.getLatestYaml(), ''))

      if (!parsedYaml) return

      // Previous values are used for adding inputs that are removed in the yaml editor
      formikRef.current.setValues(prevValues => wrapEmptyStrings({ ...prevValues, ...parsedYaml }), true)
    } catch {
      //
    }
  }

  function handleModeSwitch(view: SelectedView): void {
    if (view === SelectedView.VISUAL) {
      formikUpdateWithLatestYaml()
    }
    setSelectedView(view)
  }

  const blockedStagesSelected = useMemo(() => {
    let areDependentStagesSelected = false
    if (selectedStageData.allStagesSelected) {
      return areDependentStagesSelected
    }

    const allRequiredStagesUpdated: string[] = []
    const stagesSelectedMap: { [key: string]: SelectedStageData } = keyBy(
      selectedStageData.selectedStages,
      'stageIdentifier'
    )
    selectedStageData.selectedStages.forEach((stage: StageExecutionResponse) => {
      if (stage.toBeBlocked) {
        allRequiredStagesUpdated.push(...(stage.stagesRequired || []))
      }
    })

    allRequiredStagesUpdated.forEach((stageId: string) => {
      if (!stagesSelectedMap[stageId]) {
        areDependentStagesSelected = true
      }
    })

    return areDependentStagesSelected
  }, [selectedStageData])

  const selectedStagesHandler = (selectedStages: StageSelectionData): void => {
    setSelectedStageData(selectedStages)
  }

  const onGitBranchChange = (selectedFilter: GitFilterScope, defaultSelected?: boolean): void => {
    const pipelineBranch = selectedFilter?.branch
    setSelectedBranch(pipelineBranch)

    // Removing duplicate API calls on selecting the same branch again
    if (previousSelectedBranch !== pipelineBranch) {
      setSelectedInputSetItems([])
      if (!defaultSelected) {
        refetchPipeline({
          queryParams: {
            ...pipelineDefaultQueryParam,
            branch: pipelineBranch
          },
          requestOptions: { headers: { 'Load-From-Cache': isRetryFromStage ? loadFromCache : 'true' } }
        })
      }
    }
  }

  //TODO
  const invalidInputSetReferences = React.useMemo(() => [], [])

  const formRefDom = React.useRef<HTMLElement | undefined>()

  const {
    data: inputsSchema,
    isLoading: inputsSchemaLoading,
    failureReason: inputsSchemaError
  } = useGetInputsSchemaDetailsQuery(
    {
      org: orgIdentifier,
      pipeline: pipelineMetadata?.identifier as string,
      project: projectIdentifier,
      queryParams: {
        branch_name: selectedBranch,
        connector_ref: connectorRef,
        repo_name: repoIdentifier
      }
    },
    {
      cacheTime: 0,
      retry: false
    }
  )

  useEffect(() => {
    if (inputsSchemaError) {
      showError((inputsSchemaError as { message: string })?.message)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsSchemaError])

  const runtimeInputs: UIInputs = useMemo(
    () => generateInputsFromMetadataResponse(inputsSchema?.content),
    [inputsSchema?.content]
  )

  const runtimeInputsInitialValues = useMemo(() => {
    return Object.fromEntries(
      runtimeInputs.inputs.map(runtimeInput => [runtimeInput.name, runtimeInput.default ?? null])
    )
  }, [runtimeInputs])

  const { mutateAsync: mergeInputSets, isLoading: isMergingInputSets } = useMergedInputSetsMutation({
    retry: false,
    cacheTime: 0
  })

  // effect to merge input sets and update form values
  useEffect(() => {
    ;(async () => {
      try {
        if (!selectedInputSetItems.length) return

        const mergeInputSetsResponse = await mergeInputSets({
          queryParams: {
            pipeline: pipelineIdentifier,
            pipeline_repo_id: repoIdentifier,
            parent_entity_connector_ref: connectorRef,
            pipeline_branch: selectedBranch,
            branch_name: selectedBranch,
            parent_entity_repo_name: repoIdentifier
          },
          body: {
            input_set_references: selectedInputSetItems.map(item => item.value as string)
          },
          org: orgIdentifier,
          project: projectIdentifier
        })

        try {
          const mergedYaml = mergeInputSetsResponse.content.inputs_yaml_merged
          const parsed = yamlParse<InputSetKVPairs>(mergedYaml ?? '{}')

          formikRef.current?.setValues(prev => ({
            ...prev,
            ...parsed
          }))
        } catch {
          // ignore
        }
      } catch (error) {
        showError(getRBACErrorMessage(error))
      }
    })()
  }, [
    selectedInputSetItems,
    pipelineIdentifier,
    orgIdentifier,
    projectIdentifier,
    mergeInputSets,
    repoIdentifier,
    connectorRef,
    selectedBranch,
    showError,
    getRBACErrorMessage
  ])

  const shouldShowPageSpinner = (): boolean => {
    return loadingPipeline || inputsSchemaLoading // || loadingResolvedChildPipeline
  }

  if (shouldShowPageSpinner()) {
    return <PageSpinner />
  }

  const getRunPipelineFormDisabledState = (): boolean => {
    return (
      (isRetryFromStage && !stageToRetryState?.selectedStage) ||
      blockedStagesSelected ||
      loadingShouldDisableDeployment ||
      loadingPipeline ||
      inputsSchemaLoading ||
      isMergingInputSets
    )
  }

  let runPipelineFormContent: React.ReactElement | null = null
  const remoteFetchError = pipelineError?.data as Error
  const getRemoteBranchFromError = (error: IRemoteFetchError): string | undefined =>
    (error?.metadata as GitErrorMetadataDTO)?.branch
  const isNoEntityFoundError =
    remoteFetchError?.status === 'ERROR' && getRemoteBranchFromError(remoteFetchError as IRemoteFetchError)

  if (isNoEntityFoundError) {
    runPipelineFormContent = (
      <>
        <RunModalHeader
          hasRuntimeInputs={runtimeInputs.hasInputs}
          pipelineExecutionId={pipelineExecutionId}
          selectedStageData={selectedStageData}
          setSelectedStageData={selectedStagesHandler}
          setSkipPreFlightCheck={setSkipPreFlightCheck}
          handleModeSwitch={handleModeSwitch}
          runClicked={runClicked}
          selectedView={selectedView}
          executionView={executionView}
          connectorRef={connectorRef}
          pipelineResponse={{
            data: {
              gitDetails: {
                branch: getRemoteBranchFromError(pipelineError?.data as IRemoteFetchError),
                repoName: repoIdentifier
              }
            }
          }}
          formRefDom={formRefDom}
          formErrors={{}}
          stageExecutionData={stageExecutionData}
          executionStageList={executionStageList}
          runModalHeaderTitle={formTitleText}
          selectedBranch={selectedBranch}
          onGitBranchChange={onGitBranchChange}
          refetchPipeline={refetchPipeline}
          remoteFetchError={pipelineError}
          isRerunPipeline={isRerunPipeline}
        />
        <PipelineInvalidRequestContent
          onClose={onClose}
          getTemplateError={pipelineError as PipelineInvalidRequestContentProps['getTemplateError']}
          code={'ENTITY_NOT_FOUND'}
          branch={branch}
          repoName={repoIdentifier}
        />
      </>
    )
  } else {
    runPipelineFormContent = (
      <>
        <Formik<InputsKVPair>
          initialValues={runtimeInputsInitialValues}
          enableReinitialize
          formName="runPipeline"
          onSubmit={values => {
            // DO NOT return from here, causing the Formik form to handle loading state inconsistently
            setSubmitCount(submitCount + 1)
            handleRunPipeline(values)
          }}
          validate={values => {
            const [isReplaced, replacedValues] = replaceEmptyStringsWithNull(values)

            if (isReplaced) {
              formikRef.current?.setValues(replacedValues)
            }
          }}
        >
          {formik => {
            const { submitForm, values, setFormikState, validateForm } = formik
            formikRef.current = formik
            validateFormRef.current = validateForm

            return (
              <OverlaySpinner show={isExecutingPipeline}>
                <Layout.Vertical
                  ref={ref => {
                    formRefDom.current = ref as HTMLElement
                  }}
                >
                  <RunModalHeader
                    hasRuntimeInputs={runtimeInputs.hasInputs}
                    pipelineExecutionId={pipelineExecutionId}
                    selectedStageData={selectedStageData}
                    setSelectedStageData={selectedStagesHandler}
                    setSkipPreFlightCheck={setSkipPreFlightCheck}
                    handleModeSwitch={handleModeSwitch}
                    runClicked={runClicked}
                    selectedView={selectedView}
                    executionView={executionView}
                    connectorRef={connectorRef}
                    pipelineResponse={pipelineResponse}
                    formRefDom={formRefDom}
                    formErrors={{}}
                    stageExecutionData={stageExecutionData}
                    executionStageList={executionStageList}
                    runModalHeaderTitle={formTitleText}
                    selectedBranch={selectedBranch}
                    onGitBranchChange={onGitBranchChange}
                    refetchPipeline={refetchPipeline}
                    isRetryFromStage={isRetryFromStage}
                    isRerunPipeline={isRerunPipeline}
                  />
                  <RequiredStagesInfo
                    selectedStageData={selectedStageData}
                    blockedStagesSelected={blockedStagesSelected}
                    getString={getString}
                  />
                  <ApprovalStageInfo pipeline={pipeline} selectedStageData={selectedStageData} />
                  {selectedView === SelectedView.VISUAL ? (
                    <VisualViewY1
                      runtimeInputs={runtimeInputs}
                      isMergingInputSets={isMergingInputSets}
                      inputsSchemaLoading={inputsSchemaLoading}
                      executionView={executionView}
                      selectedInputSetItems={selectedInputSetItems}
                      setSelectedInputSetItems={setSelectedInputSetItems}
                      hasRuntimeInputs={runtimeInputs.hasInputs}
                      pipelineIdentifier={pipelineIdentifier}
                      executionIdentifier={pipelineExecutionId}
                      pipeline={pipeline}
                      currentPipeline={values}
                      submitForm={submitForm}
                      setRunClicked={setRunClicked}
                      selectedStageData={selectedStageData}
                      pipelineResponse={pipelineResponse}
                      invalidInputSetReferences={invalidInputSetReferences}
                      loadingInputSets={false}
                      onReconcile={() => undefined /*onReconcile*/}
                      selectedBranch={selectedBranch}
                      isRetryFromStage={isRetryFromStage}
                      preSelectLastStage={preSelectLastStage}
                      accountId={accountId}
                      projectIdentifier={projectIdentifier}
                      orgIdentifier={orgIdentifier}
                      repoIdentifier={repoIdentifier}
                      branch={branch}
                      connectorRef={connectorRef}
                      onStageToRetryChange={state => setStageToRetryState({ ...state })}
                      stageToRetryState={stageToRetryState}
                      retryStagesResponseData={retryStagesResponseData}
                      retryStagesLoading={retryStagesLoading}
                    />
                  ) : (
                    <div className={css.editorContainer}>
                      <YamlBuilderMemo
                        {...yamlBuilderReadOnlyModeProps}
                        existingJSON={unwrapEmptyStrings(values)}
                        bind={setYamlHandler}
                        invocationMap={factory.getInvocationMap()}
                        height="450px"
                        width="100%"
                        isEditModeSupported={canEditYaml}
                        onChange={formikUpdateWithLatestYaml}
                      />
                    </div>
                  )}
                  <CheckBoxActions
                    executionView={executionView}
                    notifyOnlyMe={notifyOnlyMe}
                    skipPreFlightCheck={skipPreFlightCheck}
                    setSkipPreFlightCheck={setSkipPreFlightCheck}
                    setNotifyOnlyMe={setNotifyOnlyMe}
                    storeType={storeType as StoreType}
                  />
                  <ActiveFreezeWarning data={shouldDisableDeploymentData?.data} />
                  {executionView ? null : (
                    <Layout.Horizontal
                      padding={{ left: 'xlarge', right: 'xlarge', top: 'large', bottom: 'large' }}
                      flex={{ justifyContent: 'space-between', alignItems: 'center' }}
                      className={css.footer}
                    >
                      <Layout.Horizontal className={cx(css.actionButtons)}>
                        <RbacButton
                          variation={ButtonVariation.PRIMARY}
                          intent="success"
                          type="submit"
                          text={runButtonLabel}
                          onClick={event => {
                            event.stopPropagation()
                            setRunClicked(true)
                            // _formSubmitCount is custom state var used to track submitCount.
                            // enableReinitialize prop resets the submitCount, so error checks fail.
                            setFormikState(prevState => ({ ...prevState, _formSubmitCount: 1 }))
                            submitForm()
                          }}
                          permission={{
                            resource: {
                              resourceIdentifier: (pipelineMetadata?.identifier || pipeline?.identifier) as string,
                              resourceType: ResourceType.PIPELINE
                            },
                            permission: PermissionIdentifier.EXECUTE_PIPELINE
                          }}
                          disabled={getRunPipelineFormDisabledState()}
                        />
                        <div className={css.secondaryButton}>
                          <Button
                            variation={ButtonVariation.TERTIARY}
                            id="cancel-runpipeline"
                            text={getString('cancel')}
                            margin={{ left: 'medium' }}
                            background={Color.GREY_50}
                            onClick={() => {
                              if (onClose) {
                                onClose()
                              }
                            }}
                          />
                        </div>
                      </Layout.Horizontal>
                    </Layout.Horizontal>
                  )}
                </Layout.Vertical>
              </OverlaySpinner>
            )
          }}
        </Formik>
        <ErrorHandlerDialog
          isOpen={isErrorEnhancementFFEnabled && !isEmpty(runPipelineError)}
          enforceFocus={false}
          onClose={() => setRunPipelineError({})}
          className={css.errorHandlerDialog}
        >
          <ErrorHandler responseMessages={runPipelineError?.responseMessages as ResponseMessage[]} />
        </ErrorHandlerDialog>
      </>
    )
  }

  return executionView ? (
    <div className={css.runFormExecutionView}>{runPipelineFormContent}</div>
  ) : (
    <RunPipelineFormWrapperY1
      accountId={accountId}
      orgIdentifier={orgIdentifier}
      pipelineIdentifier={pipelineIdentifier}
      projectIdentifier={projectIdentifier}
      module={module}
      pipeline={pipeline}
    >
      {runPipelineFormContent}
    </RunPipelineFormWrapperY1>
  )
}

export interface RunPipelineFormWrapperProps extends PipelineType<PipelinePathProps> {
  children: React.ReactNode
  pipeline?: PipelineInfoConfig
}

function RunPipelineFormWrapperY1(props: RunPipelineFormWrapperProps): React.ReactElement {
  const { children } = props

  return (
    <React.Fragment>
      <div className={css.runForm}>{children}</div>
    </React.Fragment>
  )
}

export function RunPipelineFormY1(props: RunPipelineFormProps & InputSetGitQueryParams): React.ReactElement {
  return (
    <NestedAccordionProvider>
      {props.executionView ? (
        <RunPipelineFormBasic {...props} />
      ) : (
        <PipelineVariablesContextProvider
          storeMetadata={props.storeMetadata}
          lexicalContext={LexicalContext.RunPipelineForm}
        >
          <RunPipelineFormBasic {...props} />
        </PipelineVariablesContextProvider>
      )}
    </NestedAccordionProvider>
  )
}
