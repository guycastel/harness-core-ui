/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, Classes } from '@blueprintjs/core'
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
import { useModalHook } from '@harness/use-modal'
import cx from 'classnames'
import { useHistory } from 'react-router-dom'
import { isEmpty, defaultTo, keyBy, omitBy } from 'lodash-es'
import type { FormikErrors, FormikProps } from 'formik'
import type { GetDataError } from 'restful-react'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import {
  PipelineConfig,
  PipelineInfoConfig,
  ResponseJsonNode,
  useGetPipeline,
  usePostPipelineExecuteWithInputSetYaml,
  useRePostPipelineExecuteWithInputSetYaml,
  StageExecutionResponse,
  useRunStagesWithRuntimeInputYaml,
  useRerunStagesWithRuntimeInputYaml,
  useGetStagesExecutionList,
  useDebugPipelineExecuteWithInputSetYaml,
  Failure,
  Error,
  GitErrorMetadataDTO,
  ResponseMessage,
  useRetryPipeline,
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
  ALL_STAGE_VALUE,
  clearRuntimeInput,
  getAllStageData,
  getAllStageItem,
  getFeaturePropsForRunPipelineButton,
  replaceEmptyStringsWithRuntimeInput,
  SelectedStageData,
  StageSelectionData
} from '@pipeline/utils/runPipelineUtils'
import { useQueryParams } from '@common/hooks'
import { yamlStringify, yamlParse } from '@common/utils/YamlHelperMethods'
import { PipelineActions } from '@common/constants/TrackingConstants'
import { useTelemetry } from '@common/hooks/useTelemetry'
import type { InputSetDTO, Pipeline } from '@pipeline/utils/types'
import {
  isCloneCodebaseEnabledAtLeastOneStage,
  isCodebaseFieldsRuntimeInputs,
  getPipelineWithoutCodebaseInputs
} from '@pipeline/utils/CIUtils'
import { useDeepCompareEffect } from '@common/hooks/useDeepCompareEffect'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { YamlBuilderMemo } from '@common/components/YAMLBuilder/YamlBuilder'
import { getErrorsList } from '@pipeline/utils/errorUtils'
import { useShouldDisableDeployment } from 'services/cd-ng'
import { useGetResolvedChildPipeline } from '@pipeline/hooks/useGetResolvedChildPipeline'
import type { GitFilterScope } from '@common/components/GitFilters/GitFilters'
import type { IRemoteFetchError } from '@pipeline/pages/utils/NoEntityFound/NoEntityFound'
import { ErrorHandler } from '@common/components/ErrorHandler/ErrorHandler'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { usePrevious } from '@common/hooks/usePrevious'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import { validatePipeline } from '../PipelineStudio/StepUtil'
import { PreFlightCheckModal } from '../PreFlightCheckModal/PreFlightCheckModal'

import factory from '../PipelineSteps/PipelineStepFactory'
import { StepViewType } from '../AbstractSteps/Step'
import SaveAsInputSet from './SaveAsInputSet'
import ReplacedExpressionInputForm from './ReplacedExpressionInputForm'
import {
  KVPair,
  LexicalContext,
  PipelineVariablesContextProvider,
  usePipelineVariables
} from '../PipelineVariablesContext/PipelineVariablesContext'
import type { InputSetSelectorProps } from '../InputSetSelector/InputSetSelector'
import { ApprovalStageInfo, ExpressionsInfo, RequiredStagesInfo } from './RunStageInfoComponents'
import { PipelineInvalidRequestContent, PipelineInvalidRequestContentProps } from './PipelineInvalidRequestContent'
import RunModalHeader from './RunModalHeader'
import CheckBoxActions from './CheckBoxActions'
import VisualView from './VisualView'
import { useInputSets } from './useInputSets'
import { ActiveFreezeWarning } from './ActiveFreezeWarning'
import { SelectStageToRetryState } from './SelectStageToRetryNew'
import PipelineOutOfSync from './PipelineOutOfSync'
import { ExistingProvide } from './type'
import css from './RunPipelineForm.module.scss'

export interface RunPipelineFormProps extends PipelineType<PipelinePathProps & GitQueryParams> {
  inputSetSelected?: InputSetSelectorProps['value']
  inputSetYAML?: string
  onClose?: () => void
  executionView?: boolean
  mockData?: ResponseJsonNode
  stagesExecuted?: string[]
  executionIdentifier?: string
  source: ExecutionPathProps['source']
  executionInputSetTemplateYaml?: string
  executionInputSetTemplateYamlError?: GetDataError<Failure | Error> | null
  storeMetadata?: StoreMetadata
  isDebugMode?: boolean
  isRetryFromStage?: boolean
  preSelectLastStage?: boolean
}

const yamlBuilderReadOnlyModeProps: YamlBuilderProps = {
  fileName: `run-pipeline.yaml`,
  entityType: 'Pipelines',
  yamlSanityConfig: {
    removeEmptyString: false,
    removeEmptyObject: false,
    removeEmptyArray: false
  }
}

function RunPipelineFormBasic({
  pipelineIdentifier,
  accountId,
  orgIdentifier,
  projectIdentifier,
  onClose,
  inputSetSelected,
  inputSetYAML,
  module,
  executionView,
  branch,
  source,
  repoIdentifier,
  connectorRef,
  storeType,
  stagesExecuted,
  executionInputSetTemplateYaml = '',
  executionInputSetTemplateYamlError,
  executionIdentifier,
  isDebugMode,
  isRetryFromStage = false,
  preSelectLastStage = false,
  storeMetadata
}: RunPipelineFormProps & InputSetGitQueryParams): React.ReactElement {
  const { preference: useInputSetSelected } = usePreferenceStore<ExistingProvide>(
    PreferenceScope.USER,
    'useInputSetsSelected'
  )

  const [skipPreFlightCheck, setSkipPreFlightCheck] = useState<boolean>(false)
  const [selectedView, setSelectedView] = useState<SelectedView>(SelectedView.VISUAL)
  const [notifyOnlyMe, setNotifyOnlyMe] = useState<boolean>(false)
  const [selectedInputSets, setSelectedInputSets] = useState<InputSetSelectorProps['value']>(inputSetSelected)
  const [formErrors, setFormErrors] = useState<FormikErrors<InputSetDTO>>({})
  const { trackEvent } = useTelemetry()
  const { showError, showSuccess, showWarning } = useToaster()
  const formikRef = React.useRef<FormikProps<PipelineInfoConfig>>()
  const history = useHistory()
  const { getString } = useStrings()
  const { getRBACErrorMessage } = useRBACError()
  const {
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF,
    supportingGitSimplification
  } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const [runClicked, setRunClicked] = useState(false)
  const [expressionFormState, setExpressionFormState] = useState<KVPair>({})
  const [selectedStageData, setSelectedStageData] = useState<StageSelectionData>({
    allStagesSelected: true,
    selectedStages: [getAllStageData(getString)],
    selectedStageItems: [getAllStageItem(getString)]
  })
  const { setPipeline: updatePipelineInVariablesContext, setSelectedInputSetsContext } = usePipelineVariables()
  const [existingProvide, setExistingProvide] = useState<ExistingProvide>(useInputSetSelected ?? 'existing')

  const [yamlHandler, setYamlHandler] = useState<YamlBuilderHandlerBinding | undefined>()
  const [currentPipeline, setCurrentPipeline] = useState<PipelineInfoConfig | undefined>()
  const [resolvedPipeline, setResolvedPipeline] = useState<PipelineInfoConfig | undefined>()
  const [submitCount, setSubmitCount] = useState<number>(0)
  const [runPipelineError, setRunPipelineError] = useState<Error>({})
  const isErrorEnhancementFFEnabled = useFeatureFlag(FeatureFlag.PIE_ERROR_ENHANCEMENTS)
  const loadFromCache = useFeatureFlag(FeatureFlag.CDS_ENABLE_LOAD_FROM_CACHE_FOR_RETRY_FORM).toString()
  const isTasBgValidationEnabled = useFeatureFlag(FeatureFlag.CDS_PCF_SUPPORT_BG_WITH_2_APPS_NG)
  const isAsgBgTrafficShiftValidationEnabled = useFeatureFlag(FeatureFlag.CDS_ASG_SHIFT_TRAFFIC_STEP_NG)

  const validateFormRef = useRef<(values?: PipelineInfoConfig) => Promise<FormikErrors<PipelineInfoConfig>>>()
  const [stageToRetryState, setStageToRetryState] = useState<SelectStageToRetryState | null>(null)

  const [canSaveInputSet, canEditYaml] = usePermission(
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

  const stageIdentifiers = useMemo((): string[] => {
    let stageIds: string[] = []

    if (stagesExecuted?.length) {
      stageIds = stagesExecuted
    } else if (selectedStageData.allStagesSelected) {
      // do nothing
    } else {
      stageIds = selectedStageData.selectedStageItems.map(stageData => stageData.value) as string[]
    }

    if (stageIds.includes(ALL_STAGE_VALUE)) {
      stageIds = []
    }
    return stageIds
  }, [stagesExecuted, selectedStageData])

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
    () => yamlParse<PipelineConfig>(defaultTo(pipelineResponse?.data?.yamlPipeline, ''))?.pipeline,
    [pipelineResponse?.data?.yamlPipeline]
  )

  const getPipelineBranch = (): string | undefined => branch || pipelineResponse?.data?.gitDetails?.branch
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(getPipelineBranch())
  const previousSelectedBranch = usePrevious(selectedBranch)

  useEffect(() => {
    setResolvedPipeline(
      yamlParse<PipelineConfig>(defaultTo(pipelineResponse?.data?.resolvedTemplatesPipelineYaml, ''))?.pipeline
    )
  }, [pipelineResponse?.data?.resolvedTemplatesPipelineYaml])

  const { loadingResolvedChildPipeline, resolvedMergedPipeline } = useGetResolvedChildPipeline(
    { accountId, repoIdentifier, branch, connectorRef },
    pipeline,
    resolvedPipeline
  )

  const {
    inputSet,
    inputSetTemplate,
    inputSetYamlResponse,
    hasInputSets,
    loading: loadingInputSets,
    error: inputSetsError,
    refetch: getTemplateFromPipeline,
    hasRuntimeInputs,
    invalidInputSetReferences,
    onReconcile,
    shouldValidateForm,
    setShouldValidateForm
  } = useInputSets({
    accountId,
    projectIdentifier,
    orgIdentifier,
    pipelineIdentifier,
    selectedStageData,
    rerunInputSetYaml: inputSetYAML,
    branch: selectedBranch ?? branch,
    repoIdentifier,
    connectorRef,
    executionIdentifier,
    inputSetSelected: selectedInputSets,
    executionInputSetTemplateYaml,
    executionView,
    resolvedPipeline: resolvedMergedPipeline,
    setSelectedInputSets,
    currentYAML: currentPipeline
  })

  const { mutate: runPipeline, loading: runPipelineLoading } = usePostPipelineExecuteWithInputSetYaml({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      moduleType: module || '',
      repoIdentifier,
      branch: selectedBranch ?? getPipelineBranch(),
      notifyOnlyUser: notifyOnlyMe,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoIdentifier
    },
    identifier: pipelineIdentifier,
    requestOptions: {
      headers: {
        'content-type': 'application/yaml'
      }
    }
  })

  const { mutate: runStage, loading: runStagesLoading } = useRunStagesWithRuntimeInputYaml({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      moduleType: module || '',
      repoIdentifier,
      branch: selectedBranch ?? branch,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoIdentifier
    },
    identifier: pipelineIdentifier
  })
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

  const { mutate: reRunPipeline, loading: reRunPipelineLoading } = useRePostPipelineExecuteWithInputSetYaml({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      moduleType: module || '',
      repoIdentifier,
      branch,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoIdentifier
    },
    identifier: pipelineIdentifier,
    originalExecutionId: defaultTo(pipelineExecutionId, ''),
    requestOptions: {
      headers: {
        'content-type': 'application/yaml'
      }
    }
  })
  const { mutate: reRunStages, loading: reRunStagesLoading } = useRerunStagesWithRuntimeInputYaml({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      moduleType: module || '',
      repoIdentifier,
      branch,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoIdentifier
    },
    identifier: pipelineIdentifier,
    originalExecutionId: defaultTo(pipelineExecutionId, '')
  })

  const {
    mutate: retryPipeline,
    loading: retryPipelineLoading,
    error: retryPipelineError
  } = useRetryPipeline({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      moduleType: module || '',
      planExecutionId: pipelineExecutionId ?? '',
      retryStages: (!stageToRetryState?.isParallelStage
        ? [stageToRetryState?.selectedStage?.value]
        : (stageToRetryState?.selectedStage?.value as string)?.split(' | ')) as string[],
      runAllStages: !preSelectLastStage
      // PreselectedStage will be present if user want to run "Last failed stage", so we should not run all stages
      // While running specific stage(s), preSelectLastStage will be false
    },

    queryParamStringifyOptions: {
      arrayFormat: 'repeat'
    },
    identifier: pipelineIdentifier,
    requestOptions: {
      headers: {
        'content-type': 'application/yaml'
      }
    }
  })

  useEffect(() => {
    if (retryPipelineError) {
      showError(getRBACErrorMessage(retryPipelineError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryPipelineError])

  const { mutate: runPipelineInDebugMode, loading: reRunDebugModeLoading } = useDebugPipelineExecuteWithInputSetYaml({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      moduleType: module || '',
      repoIdentifier,
      branch,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoIdentifier
    },
    identifier: pipelineIdentifier,
    originalExecutionId: defaultTo(pipelineExecutionId, ''),
    requestOptions: {
      headers: {
        'content-type': 'application/yaml'
      }
    }
  })

  const { data: stageExecutionData, error: stageExecutionError } = useGetStagesExecutionList({
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
    setSelectedInputSets(inputSetSelected)
    setSelectedInputSetsContext?.(inputSetSelected)
  }, [inputSetSelected])

  useEffect(() => {
    if (inputSetYAML) {
      setExistingProvide('provide')
    } else {
      setExistingProvide(hasInputSets ? useInputSetSelected ?? 'existing' : 'provide')
    }
  }, [inputSetYAML, hasInputSets, useInputSetSelected])

  useEffect(() => {
    if (inputSetsError) {
      showError(getRBACErrorMessage(inputSetsError, true))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputSetsError])

  const valuesPipelineRef = useRef<PipelineInfoConfig>()

  useDeepCompareEffect(() => {
    if (resolvedMergedPipeline) {
      updatePipelineInVariablesContext(resolvedMergedPipeline)
    }
  }, [resolvedMergedPipeline])

  useEffect(() => {
    // only applied for CI, Not cloned codebase
    if (
      formikRef?.current?.values?.template?.templateInputs &&
      isCodebaseFieldsRuntimeInputs(formikRef.current.values.template.templateInputs as PipelineInfoConfig) &&
      resolvedMergedPipeline &&
      !isCloneCodebaseEnabledAtLeastOneStage(resolvedMergedPipeline)
    ) {
      const newPipeline = getPipelineWithoutCodebaseInputs(formikRef.current.values)
      formikRef.current.setValues({ ...formikRef.current.values, ...newPipeline })
    }
  }, [formikRef?.current?.values?.template?.templateInputs, resolvedMergedPipeline])

  useEffect(() => {
    setSkipPreFlightCheck(defaultTo(supportingGitSimplification && storeType === StoreType.REMOTE, false))
  }, [supportingGitSimplification, storeType])

  const [showPreflightCheckModal, hidePreflightCheckModal] = useModalHook(() => {
    return (
      <Dialog
        className={cx(css.preFlightCheckModal, Classes.DIALOG)}
        enforceFocus={false}
        isOpen
        onClose={hidePreflightCheckModal}
      >
        <PreFlightCheckModal
          pipeline={valuesPipelineRef.current}
          module={module}
          accountId={accountId}
          orgIdentifier={orgIdentifier}
          projectIdentifier={projectIdentifier}
          pipelineIdentifier={pipelineIdentifier}
          branch={branch}
          repoIdentifier={repoIdentifier}
          onCloseButtonClick={hidePreflightCheckModal}
          onContinuePipelineClick={() => {
            hidePreflightCheckModal()
            handleRunPipeline(valuesPipelineRef.current, true)
          }}
          selectedInputSets={selectedInputSets}
        />
      </Dialog>
    )
  }, [notifyOnlyMe, selectedStageData, stageIdentifiers, formErrors])

  const isExecutingPipeline =
    runPipelineLoading ||
    reRunPipelineLoading ||
    runStagesLoading ||
    reRunStagesLoading ||
    reRunDebugModeLoading ||
    retryPipelineLoading

  const handleRunPipeline = useCallback(
    async (valuesPipeline?: PipelineInfoConfig, forceSkipFlightCheck = false) => {
      const errors = await validateFormRef.current?.(valuesPipeline)
      if (errors && Object.keys(errors).length) {
        return
      }

      valuesPipelineRef.current = valuesPipeline
      if (!skipPreFlightCheck && !forceSkipFlightCheck) {
        // Not skipping pre-flight check - open the new modal
        showPreflightCheckModal()
        return
      }

      const expressionValues: KVPair = {}
      Object.entries(expressionFormState).forEach(([key, value]: string[]) => {
        expressionValues[key] = value
      })

      try {
        let response
        const sanitizedYAML = omitBy(valuesPipelineRef.current, (_val, key) => key.startsWith('_'))
        const finalYaml = isEmpty(valuesPipelineRef.current)
          ? ''
          : selectedInputSets && selectedInputSets?.length > 0
          ? // RPF with IP selected - '' converted to <+input> in the payload
            yamlStringify({
              pipeline: replaceEmptyStringsWithRuntimeInput(sanitizedYAML)
            })
          : yamlStringify({ pipeline: sanitizedYAML })

        if (isDebugMode) {
          response = await runPipelineInDebugMode(finalYaml as any)
        } else if (isRetryFromStage) {
          response = await retryPipeline(finalYaml as any)
        } else if (isRerunPipeline) {
          response = selectedStageData.allStagesSelected
            ? await reRunPipeline(finalYaml as any)
            : await reRunStages({
                runtimeInputYaml: hasRuntimeInputs ? finalYaml : undefined,
                stageIdentifiers: stageIdentifiers,
                expressionValues
              })
        } else {
          response = selectedStageData.allStagesSelected
            ? await runPipeline(finalYaml as any)
            : await runStage({
                runtimeInputYaml: hasRuntimeInputs ? finalYaml : undefined,
                stageIdentifiers: stageIdentifiers,
                expressionValues
              })
        }
        const data = response.data
        const governanceMetadata = data?.planExecution?.governanceMetadata

        if (response.status === 'SUCCESS') {
          setRunPipelineError({})
          onClose?.()
          if (response.data) {
            showSuccess(getString('runPipelineForm.pipelineRunSuccessFully'))
            history.push({
              pathname: routes.toExecutionPipelineView({
                orgIdentifier,
                pipelineIdentifier,
                projectIdentifier,
                executionIdentifier: defaultTo(data?.planExecution?.uuid, ''),
                accountId,
                module,
                source
              }),
              search:
                supportingGitSimplification && storeType === StoreType.REMOTE
                  ? `connectorRef=${connectorRef}&repoName=${repoIdentifier}&branch=${
                      selectedBranch ?? getPipelineBranch()
                    }&storeType=${storeType}`
                  : undefined,
              state: {
                shouldShowGovernanceEvaluations:
                  governanceMetadata?.status === 'error' || governanceMetadata?.status === 'warning',
                governanceMetadata
              }
            })
            trackEvent(PipelineActions.StartedExecution, { module })
          }
        }
      } catch (error: any) {
        setRunPipelineError(error?.data as Error)
        if (!isErrorEnhancementFFEnabled)
          showWarning(defaultTo(getRBACErrorMessage(error, true), getString('runPipelineForm.runPipelineFailed')))
      }

      return valuesPipeline as PipelineInfoConfig
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      runPipeline,
      runStage,
      retryPipeline,
      showWarning,
      showSuccess,
      pipelineIdentifier,
      history,
      orgIdentifier,
      module,
      projectIdentifier,
      onClose,
      accountId,
      skipPreFlightCheck,
      formErrors,
      selectedStageData,
      notifyOnlyMe,
      hasRuntimeInputs
    ]
  )

  function formikUpdateWithLatestYaml(): void {
    if (yamlHandler && formikRef.current) {
      const parsedYaml = yamlParse<PipelineConfig>(defaultTo(yamlHandler.getLatestYaml(), ''))

      if (parsedYaml.pipeline) {
        formikRef.current.setValues(parsedYaml.pipeline)
        formikRef.current.validateForm(parsedYaml.pipeline)
      }
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

    // setting up the current pipeline to pass to input sets for merge API call to retain the existing values
    !isEmpty(formikRef?.current?.values) && setCurrentPipeline(formikRef?.current?.values)
  }

  useEffect(() => {
    if (shouldValidateForm) {
      formikRef.current?.validateForm(inputSet.pipeline)
      setShouldValidateForm?.(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldValidateForm, inputSet])

  const updateExpressionValue = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!e.target) {
      return
    }

    const keyName: string = e.target.name
    const exprValue: string = defaultTo(e.target.value, '').trim()
    setExpressionFormState(
      (oldState: KVPair): KVPair => ({
        ...oldState,
        [keyName]: exprValue
      })
    )
    if (formErrors) {
      const formErrorsUpdated = { ...formErrors }
      if (!(formErrors as any)[keyName] && isEmpty(exprValue)) {
        ;(formErrorsUpdated as any)[keyName] = getString('pipeline.expressionRequired')
      } else if ((formErrors as any)[keyName] && !isEmpty(exprValue)) {
        delete (formErrorsUpdated as any)[keyName]
      }

      setFormErrors(formErrorsUpdated)
    }
  }

  const getFormErrors = async (
    latestPipeline: { pipeline: PipelineInfoConfig },
    latestYamlTemplate: PipelineInfoConfig,
    orgPipeline: PipelineInfoConfig | undefined,
    selectedStages: StageSelectionData | undefined
  ): Promise<FormikErrors<InputSetDTO>> => {
    let errors = formErrors
    function validateErrors(): Promise<FormikErrors<InputSetDTO>> {
      return new Promise(resolve => {
        const validatedErrors =
          (validatePipeline({
            pipeline: { ...clearRuntimeInput(latestPipeline.pipeline) },
            template: latestYamlTemplate,
            originalPipeline: orgPipeline,
            resolvedPipeline: resolvedMergedPipeline,
            getString,
            viewType: StepViewType.DeploymentForm,
            selectedStageData: selectedStages,
            featureFlagValues: {
              [FeatureFlag.CDS_PCF_SUPPORT_BG_WITH_2_APPS_NG]: isTasBgValidationEnabled,
              [FeatureFlag.CDS_ASG_SHIFT_TRAFFIC_STEP_NG]: isAsgBgTrafficShiftValidationEnabled
            }
          }) as any) || formErrors
        resolve(validatedErrors)
      })
    }
    if (latestPipeline?.pipeline && latestYamlTemplate && orgPipeline) {
      errors = await validateErrors()
      const expressionErrors: KVPair = {}

      // vaidate replacedExpressions
      if (inputSetYamlResponse?.data?.replacedExpressions?.length) {
        inputSetYamlResponse.data.replacedExpressions.forEach((value: string) => {
          const currValue = defaultTo(expressionFormState[value], '')
          if (currValue.trim() === '') expressionErrors[value] = getString('pipeline.expressionRequired')
        })
      }
      setFormErrors({ ...errors, ...expressionErrors })
    }
    return errors
  }

  const onGitBranchChange = (selectedFilter: GitFilterScope, defaultSelected?: boolean): void => {
    const pipelineBranch = selectedFilter?.branch
    setSelectedBranch(pipelineBranch)

    // Removing duplicate API calls on selecting the same branch again
    if (previousSelectedBranch !== pipelineBranch) {
      setSelectedInputSets([])
      if (!defaultSelected) {
        refetchPipeline({
          queryParams: {
            ...pipelineDefaultQueryParam,
            branch: pipelineBranch
          },
          requestOptions: { headers: { 'Load-From-Cache': isRetryFromStage ? loadFromCache : 'true' } }
        })
        getTemplateFromPipeline({ branch: pipelineBranch })
      }
    }
  }

  const shouldShowPageSpinner = (): boolean => {
    return loadingPipeline || loadingResolvedChildPipeline || loadingInputSets
  }

  const formRefDom = React.useRef<HTMLElement | undefined>()
  const handleValidation = async (values: Pipeline | PipelineInfoConfig): Promise<FormikErrors<InputSetDTO>> => {
    if (submitCount === 0) {
      return Promise.resolve({})
    }
    let pl: PipelineInfoConfig | undefined

    if ((values as Pipeline)?.pipeline) {
      pl = (values as Pipeline)?.pipeline
    } else {
      pl = values as PipelineInfoConfig
    }

    const runPipelineFormErrors = await getFormErrors(
      { pipeline: pl } as Required<Pipeline>,
      defaultTo(inputSetTemplate?.pipeline, {} as PipelineInfoConfig),
      pipeline,
      selectedStageData
    )
    // https://github.com/formium/formik/issues/1392
    return runPipelineFormErrors
  }

  if (shouldShowPageSpinner()) {
    return <PageSpinner />
  }

  function handleInputSetSave(newId?: string): void {
    if (newId) {
      setSelectedInputSets([{ label: newId, value: newId, type: 'INPUT_SET' }])
    }
    getTemplateFromPipeline()
  }

  const getRunPipelineFormDisabledState = (): boolean => {
    return (
      (isRetryFromStage && !stageToRetryState?.selectedStage) ||
      blockedStagesSelected ||
      (getErrorsList(formErrors).errorCount > 0 && runClicked) ||
      loadingShouldDisableDeployment ||
      loadingInputSets ||
      // useExistingInputSets option is enabled and no input-set is chosen (with runtime inputs)
      ((!selectedInputSets || selectedInputSets.length === 0) && existingProvide === 'existing' && hasRuntimeInputs)
    )
  }

  let runPipelineFormContent: React.ReactElement | null = null
  const remoteFetchError = pipelineError?.data as Error
  const getRemoteBranchFromError = (error: IRemoteFetchError): string | undefined =>
    (error?.metadata as GitErrorMetadataDTO)?.branch
  const isNoEntityFoundError =
    remoteFetchError?.status === 'ERROR' && getRemoteBranchFromError(remoteFetchError as IRemoteFetchError)
  if (inputSetsError?.message) {
    runPipelineFormContent = (
      <>
        {isNoEntityFoundError ? (
          <>
            <RunModalHeader
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
              template={inputSetYamlResponse}
              formRefDom={formRefDom}
              formErrors={formErrors}
              stageExecutionData={stageExecutionData}
              stageExecutionError={stageExecutionError}
              executionStageList={executionStageList}
              runModalHeaderTitle={formTitleText}
              selectedBranch={selectedBranch}
              onGitBranchChange={onGitBranchChange}
              refetchPipeline={refetchPipeline}
              refetchTemplate={getTemplateFromPipeline}
              remoteFetchError={pipelineError}
              isRerunPipeline={isRerunPipeline}
            />
          </>
        ) : null}
        <PipelineInvalidRequestContent
          onClose={onClose}
          getTemplateError={
            isNoEntityFoundError
              ? (pipelineError as PipelineInvalidRequestContentProps['getTemplateError'])
              : inputSetsError
          }
          code={'ENTITY_NOT_FOUND'}
          branch={branch}
          repoName={repoIdentifier}
        />
      </>
    )
  } else {
    runPipelineFormContent = (
      <>
        <Formik<PipelineInfoConfig>
          initialValues={defaultTo(inputSet.pipeline, {} as PipelineInfoConfig)}
          formName="runPipeline"
          onSubmit={values => {
            // DO NOT return from here, causing the Formik form to handle loading state inconsistently
            setSubmitCount(submitCount + 1)
            handleRunPipeline(values, false)
          }}
          validate={handleValidation}
        >
          {formik => {
            const { submitForm, values, setValues, setFormikState, validateForm } = formik
            formikRef.current = formik
            valuesPipelineRef.current = values
            validateFormRef.current = validateForm

            return (
              <OverlaySpinner show={isExecutingPipeline}>
                <Layout.Vertical
                  ref={ref => {
                    formRefDom.current = ref as HTMLElement
                  }}
                >
                  <RunModalHeader
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
                    template={inputSetYamlResponse}
                    formRefDom={formRefDom}
                    formErrors={formErrors}
                    stageExecutionData={stageExecutionData}
                    stageExecutionError={stageExecutionError}
                    executionStageList={executionStageList}
                    runModalHeaderTitle={formTitleText}
                    selectedBranch={selectedBranch}
                    onGitBranchChange={onGitBranchChange}
                    refetchPipeline={refetchPipeline}
                    refetchTemplate={getTemplateFromPipeline}
                    isRetryFromStage={isRetryFromStage}
                    isRerunPipeline={isRerunPipeline}
                  />
                  <PipelineOutOfSync
                    storeMetadata={storeMetadata}
                    accountId={accountId}
                    orgIdentifier={orgIdentifier}
                    projectIdentifier={projectIdentifier}
                    pipelineIdentifier={pipelineIdentifier}
                    selectedBranch={pipelineResponse?.data?.gitDetails?.branch}
                  />
                  <RequiredStagesInfo
                    selectedStageData={selectedStageData}
                    blockedStagesSelected={blockedStagesSelected}
                    getString={getString}
                  />
                  <ApprovalStageInfo pipeline={pipeline} selectedStageData={selectedStageData} />
                  <ExpressionsInfo template={inputSetYamlResponse} getString={getString} />
                  <ReplacedExpressionInputForm
                    updateExpressionValue={updateExpressionValue}
                    expressions={inputSetYamlResponse?.data?.replacedExpressions}
                  />
                  {selectedView === SelectedView.VISUAL ? (
                    <VisualView
                      executionView={executionView}
                      selectedInputSets={selectedInputSets}
                      existingProvide={existingProvide}
                      setExistingProvide={setExistingProvide}
                      hasRuntimeInputs={hasRuntimeInputs}
                      pipelineIdentifier={pipelineIdentifier}
                      executionIdentifier={pipelineExecutionId}
                      template={defaultTo(inputSetTemplate?.pipeline, {} as PipelineInfoConfig)}
                      pipeline={pipeline}
                      currentPipeline={{ pipeline: values }}
                      getTemplateError={inputSetsError}
                      resolvedMergedPipeline={resolvedMergedPipeline}
                      resolvedPipeline={resolvedPipeline}
                      submitForm={submitForm}
                      setRunClicked={setRunClicked}
                      hasInputSets={hasInputSets}
                      templateError={executionInputSetTemplateYamlError}
                      setSelectedInputSets={setSelectedInputSets}
                      selectedStageData={selectedStageData}
                      pipelineResponse={pipelineResponse}
                      invalidInputSetReferences={invalidInputSetReferences}
                      loadingInputSets={loadingInputSets}
                      onReconcile={onReconcile}
                      reRunInputSetYaml={inputSetYAML}
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
                    <div className={css.editor}>
                      <Layout.Vertical className={css.content} padding="xlarge">
                        <YamlBuilderMemo
                          {...yamlBuilderReadOnlyModeProps}
                          existingJSON={{ pipeline: values }}
                          bind={setYamlHandler}
                          schema={{}}
                          invocationMap={factory.getInvocationMap()}
                          height="55vh"
                          width="100%"
                          isEditModeSupported={canEditYaml}
                          comparableYaml={inputSetYamlResponse?.data?.inputSetTemplateYaml}
                          onChange={formikUpdateWithLatestYaml}
                        />
                      </Layout.Vertical>
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
                            if (selectedView === SelectedView.YAML) {
                              const parsedYaml = yamlParse<PipelineConfig>(defaultTo(yamlHandler?.getLatestYaml(), ''))
                              if (parsedYaml.pipeline) {
                                setValues(parsedYaml.pipeline)
                                setTimeout(() => {
                                  submitForm()
                                }, 0)
                              }
                            } else {
                              submitForm()
                            }
                          }}
                          featuresProps={getFeaturePropsForRunPipelineButton({
                            modules: inputSetYamlResponse?.data?.modules,
                            getString
                          })}
                          permission={{
                            resource: {
                              resourceIdentifier: pipeline?.identifier as string,
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
                      {!isRerunPipeline && (
                        <SaveAsInputSet
                          key="saveasinput"
                          pipeline={pipeline}
                          currentPipeline={{ pipeline: values }}
                          values={values}
                          template={inputSetYamlResponse?.data?.inputSetTemplateYaml}
                          canEdit={canSaveInputSet}
                          accountId={accountId}
                          projectIdentifier={projectIdentifier}
                          orgIdentifier={orgIdentifier}
                          connectorRef={connectorRef}
                          repoIdentifier={repoIdentifier || pipelineResponse?.data?.gitDetails?.repoName}
                          branch={getPipelineBranch()}
                          storeType={storeType}
                          isGitSyncEnabled={isGitSyncEnabled}
                          supportingGitSimplification={supportingGitSimplification}
                          setFormErrors={setFormErrors}
                          refetchParentData={handleInputSetSave}
                        />
                      )}
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
    <RunPipelineFormWrapper
      accountId={accountId}
      orgIdentifier={orgIdentifier}
      pipelineIdentifier={pipelineIdentifier}
      projectIdentifier={projectIdentifier}
      module={module}
      pipeline={pipeline}
    >
      {runPipelineFormContent}
    </RunPipelineFormWrapper>
  )
}

export interface RunPipelineFormWrapperProps extends PipelineType<PipelinePathProps> {
  children: React.ReactNode
  pipeline?: PipelineInfoConfig
}

export function RunPipelineFormWrapper(props: RunPipelineFormWrapperProps): React.ReactElement {
  const { children } = props

  return (
    <React.Fragment>
      <div className={css.runForm}>{children}</div>
    </React.Fragment>
  )
}

export function RunPipelineForm(props: RunPipelineFormProps & InputSetGitQueryParams): React.ReactElement {
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
