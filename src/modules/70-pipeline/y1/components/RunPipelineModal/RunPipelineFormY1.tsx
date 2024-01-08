/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
// import { Dialog, Classes } from '@blueprintjs/core'
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
// import { useModalHook } from '@harness/use-modal'
import cx from 'classnames'
import { useHistory } from 'react-router-dom'
import { isEmpty, defaultTo, keyBy } from 'lodash-es'
import type { FormikErrors, FormikProps } from 'formik'
// import type { GetDataError } from 'restful-react'
import { useExecutePipelineMutation, useGetInputsSchemaDetailsQuery } from '@harnessio/react-pipeline-service-client'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import {
  PipelineInfoConfig,
  ResponseJsonNode,
  useGetPipeline, // OK
  // usePostPipelineExecuteWithInputSetYaml,
  // useRePostPipelineExecuteWithInputSetYaml,
  StageExecutionResponse,
  // useRunStagesWithRuntimeInputYaml,
  //useRerunStagesWithRuntimeInputYaml,
  useGetStagesExecutionList,
  //useDebugPipelineExecuteWithInputSetYaml,
  Error,
  GitErrorMetadataDTO,
  ResponseMessage,
  //useRetryPipeline,
  useGetRetryStages,
  useGetTemplateFromPipeline,
  GetTemplateFromPipelineQueryParams
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
  // ALL_STAGE_VALUE,
  //clearRuntimeInput,
  getAllStageData,
  getAllStageItem,
  getFeaturePropsForRunPipelineButton,
  getStageIdentifierFromStageData,
  SelectedStageData,
  StageSelectionData
} from '@pipeline/utils/runPipelineUtils'
import { useMutateAsGet, useQueryParams } from '@common/hooks'
import { yamlParse, memoizedParse, yamlStringify } from '@common/utils/YamlHelperMethods'
import { PipelineActions } from '@common/constants/TrackingConstants'
import { useTelemetry } from '@common/hooks/useTelemetry'
import type { InputSetDTO, Pipeline } from '@pipeline/utils/types'
// import {
//   // isCloneCodebaseEnabledAtLeastOneStage,
//   isCodebaseFieldsRuntimeInputs,
//   getPipelineWithoutCodebaseInputs
// } from '@pipeline/utils/CIUtils'
// import { useDeepCompareEffect } from '@common/hooks/useDeepCompareEffect'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { YamlBuilderMemo } from '@common/components/YAMLBuilder/YamlBuilder'
import { getErrorsList } from '@pipeline/utils/errorUtils'
import { useShouldDisableDeployment } from 'services/cd-ng'
// import { useGetResolvedChildPipeline } from '@pipeline/hooks/useGetResolvedChildPipeline'
import type { GitFilterScope } from '@common/components/GitFilters/GitFilters'
import type { IRemoteFetchError } from '@pipeline/pages/utils/NoEntityFound/NoEntityFound'
import { ErrorHandler } from '@common/components/ErrorHandler/ErrorHandler'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { usePrevious } from '@common/hooks/usePrevious'
// TODO start
import { InputSetSelectorProps } from '@pipeline/components/InputSetSelector/InputSetSelector'
import {
  KVPair,
  LexicalContext,
  PipelineVariablesContextProvider,
  usePipelineVariables
} from '@pipeline/components/PipelineVariablesContext/PipelineVariablesContext'
import { SelectStageToRetryState } from '@pipeline/components/RunPipelineModal/SelectStageToRetryNew'
// import { useInputSets } from '@pipeline/components/RunPipelineModal/useInputSets'
// import { PreFlightCheckModal } from '@pipeline/components/PreFlightCheckModal/PreFlightCheckModal'
// import { validatePipeline } from '@pipeline/components/PipelineStudio/StepUtil'
// import { StepViewType } from '@pipeline/components/AbstractSteps/Step'

import {
  PipelineInvalidRequestContent,
  PipelineInvalidRequestContentProps
} from '@pipeline/components/RunPipelineModal/PipelineInvalidRequestContent'
import {
  ApprovalStageInfo,
  ExpressionsInfo,
  RequiredStagesInfo
} from '@pipeline/components/RunPipelineModal/RunStageInfoComponents'
import ReplacedExpressionInputForm from '@pipeline/components/RunPipelineModal/ReplacedExpressionInputForm'
import CheckBoxActions from '@pipeline/components/RunPipelineModal/CheckBoxActions'
import { ActiveFreezeWarning } from '@pipeline/components/RunPipelineModal/ActiveFreezeWarning'
import factory from '@pipeline/components/PipelineSteps/PipelineStepFactory'
//import SaveAsInputSet from '@pipeline/components/RunPipelineModal/SaveAsInputSet'
// TODO end
//import SaveAsInputSetY1 from './SaveAsNewInputSet/SaveAsInputSetY1'
import RunModalHeader from './RunModalHeaderY1'
import VisualViewY1 from './VisualViewY1'
import { PipelineMetadata } from '../PipelineContext/PipelineActionsY1'
import { UIInputs } from '../InputsForm/types'
import { generateInputsFromMetadataResponse } from '../InputsForm/utils'
import css from './RunPipelineFormY1.module.scss'

export interface InputsKVPair {
  [key: string]: unknown
}

export interface RunPipelineFormProps extends PipelineType<PipelinePathProps & GitQueryParams> {
  inputSetSelected?: InputSetSelectorProps['value']
  inputSetYAML?: string
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
  executionIdentifier,
  isDebugMode,
  pipelineMetadata,
  isRetryFromStage = false,
  preSelectLastStage = false
}: RunPipelineFormProps & InputSetGitQueryParams): React.ReactElement {
  const [skipPreFlightCheck, setSkipPreFlightCheck] = useState<boolean>(true) //TODO: false default
  const [selectedView, setSelectedView] = useState<SelectedView>(SelectedView.VISUAL)
  const [notifyOnlyMe, setNotifyOnlyMe] = useState<boolean>(false)
  const [selectedInputSets, setSelectedInputSets] = useState<InputSetSelectorProps['value']>(inputSetSelected)
  const [formErrors, setFormErrors] = useState<FormikErrors<InputsKVPair>>({})
  const { trackEvent } = useTelemetry()
  const { showError, showSuccess, showWarning } = useToaster()
  const formikRef = React.useRef<FormikProps<InputsKVPair>>()
  const history = useHistory()
  const { getString } = useStrings()
  const { getRBACErrorMessage } = useRBACError()
  const {
    // isGitSyncEnabled: isGitSyncEnabledForProject,
    // gitSyncEnabledOnlyForFF,
    supportingGitSimplification
  } = useAppStore()
  //const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const [runClicked, setRunClicked] = useState(false)
  const [expressionFormState, setExpressionFormState] = useState<KVPair>({})
  const [selectedStageData, setSelectedStageData] = useState<StageSelectionData>({
    allStagesSelected: true,
    selectedStages: [getAllStageData(getString)],
    selectedStageItems: [getAllStageItem(getString)]
  })
  const { /*setPipeline: updatePipelineInVariablesContext,*/ setSelectedInputSetsContext } = usePipelineVariables()
  const [existingProvide, setExistingProvide] = useState<'existing' | 'provide'>('existing')
  const [yamlHandler, setYamlHandler] = useState<YamlBuilderHandlerBinding | undefined>()
  // TODO
  // const [_currentPipeline, setCurrentPipeline] = useState<InputsKVPair | undefined>()
  // const [_resolvedPipeline, setResolvedPipeline] = useState<InputsKVPair | undefined>()
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

  // const stageIdentifiers = useMemo((): string[] => {
  //   let stageIds: string[] = []

  //   if (stagesExecuted?.length) {
  //     stageIds = stagesExecuted
  //   } else if (selectedStageData.allStagesSelected) {
  //     // do nothing
  //   } else {
  //     stageIds = selectedStageData.selectedStageItems.map(stageData => stageData.value) as string[]
  //   }

  //   if (stageIds.includes(ALL_STAGE_VALUE)) {
  //     stageIds = []
  //   }
  //   return stageIds
  // }, [stagesExecuted, selectedStageData])

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

  // TODO
  // useEffect(() => {
  //   setResolvedPipeline(
  //     yamlParse<PipelineConfig>(defaultTo(pipelineResponse?.data?.resolvedTemplatesPipelineYaml, ''))?.pipeline
  //   )
  // }, [pipelineResponse?.data?.resolvedTemplatesPipelineYaml])

  // const { loadingResolvedChildPipeline, resolvedMergedPipeline } = useGetResolvedChildPipeline(
  //   { accountId, repoIdentifier, branch, connectorRef },
  //   pipeline,
  //   resolvedPipeline
  // )

  // TODO replacement for useInputSets >>>>
  const defaultQueryParams: GetTemplateFromPipelineQueryParams = {
    accountIdentifier: accountId,
    orgIdentifier,
    projectIdentifier,
    pipelineIdentifier,
    branch,
    repoIdentifier,
    parentEntityConnectorRef: connectorRef,
    parentEntityRepoName: repoIdentifier
  }
  const {
    data: inputSetYamlResponse,
    loading: loadingInputSets,
    error: inputSetsError,
    refetch: getTemplateFromPipeline
  } = useMutateAsGet(useGetTemplateFromPipeline, {
    body: {
      // TODO: old: //getStageIdentifierFromStageData(selectedStageData)
      stageIdentifiers: getStageIdentifierFromStageData({
        allStagesSelected: true,
        selectedStageItems: [],
        selectedStages: []
      })
    },
    queryParams: defaultQueryParams,
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
    //TODO: lazy: executionInputSetTemplateYaml || executionView || !selectedStageData.selectedStageItems.length
  })

  const hasInputSets = !!inputSetYamlResponse?.data?.hasInputSets

  const [inputSetTemplate, setInputSetTemplate] = useState({} as Pipeline)
  const [hasRuntimeInputs, setHasRuntimeInputs] = useState(false)
  useEffect(() => {
    let newInputSetTemplate = {} as Pipeline

    if (inputSetYamlResponse?.data?.inputSetTemplateYaml) {
      const parsedRunPipelineYaml = memoizedParse<Pipeline>(inputSetYamlResponse.data.inputSetTemplateYaml).pipeline
      newInputSetTemplate = { pipeline: parsedRunPipelineYaml }
    }

    setInputSetTemplate(newInputSetTemplate)

    const doRuntimeValuesExist = !isEmpty(newInputSetTemplate)
    setHasRuntimeInputs(doRuntimeValuesExist)
  }, [inputSetYamlResponse?.data])
  // TODO replacement for useInputSets <<<

  // const { mutate: runPipeline, loading: runPipelineLoading } = usePostPipelineExecuteWithInputSetYaml({
  //   queryParams: {
  //     accountIdentifier: accountId,
  //     projectIdentifier,
  //     orgIdentifier,
  //     moduleType: module || '',
  //     repoIdentifier,
  //     branch: getPipelineBranch(),
  //     notifyOnlyUser: notifyOnlyMe,
  //     parentEntityConnectorRef: connectorRef,
  //     parentEntityRepoName: repoIdentifier
  //   },
  //   identifier: pipelineIdentifier,
  //   requestOptions: {
  //     headers: {
  //       'content-type': 'application/yaml'
  //     }
  //   }
  // })

  // const { mutate: runStage, loading: runStagesLoading } = useRunStagesWithRuntimeInputYaml({
  //   queryParams: {
  //     accountIdentifier: accountId,
  //     projectIdentifier,
  //     orgIdentifier,
  //     moduleType: module || '',
  //     repoIdentifier,
  //     branch,
  //     parentEntityConnectorRef: connectorRef,
  //     parentEntityRepoName: repoIdentifier
  //   },
  //   identifier: pipelineIdentifier
  // })
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

  // const { mutate: reRunPipeline, loading: reRunPipelineLoading } = useRePostPipelineExecuteWithInputSetYaml({
  //   queryParams: {
  //     accountIdentifier: accountId,
  //     projectIdentifier,
  //     orgIdentifier,
  //     moduleType: module || '',
  //     repoIdentifier,
  //     branch,
  //     parentEntityConnectorRef: connectorRef,
  //     parentEntityRepoName: repoIdentifier
  //   },
  //   identifier: pipelineIdentifier,
  //   originalExecutionId: defaultTo(pipelineExecutionId, ''),
  //   requestOptions: {
  //     headers: {
  //       'content-type': 'application/yaml'
  //     }
  //   }
  // })

  // const { mutate: reRunStages, loading: reRunStagesLoading } = useRerunStagesWithRuntimeInputYaml({
  //   queryParams: {
  //     accountIdentifier: accountId,
  //     projectIdentifier,
  //     orgIdentifier,
  //     moduleType: module || '',
  //     repoIdentifier,
  //     branch,
  //     parentEntityConnectorRef: connectorRef,
  //     parentEntityRepoName: repoIdentifier
  //   },
  //   identifier: pipelineIdentifier,
  //   originalExecutionId: defaultTo(pipelineExecutionId, '')
  // })

  // const {
  //   mutate: retryPipeline,
  //   loading: retryPipelineLoading,
  //   error: retryPipelineError
  // } = useRetryPipeline({
  //   queryParams: {
  //     accountIdentifier: accountId,
  //     projectIdentifier,
  //     orgIdentifier,
  //     moduleType: module || '',
  //     planExecutionId: pipelineExecutionId ?? '',
  //     retryStages: (!stageToRetryState?.isParallelStage
  //       ? [stageToRetryState?.selectedStage?.value]
  //       : (stageToRetryState?.selectedStage?.value as string)?.split(' | ')) as string[],
  //     runAllStages: stageToRetryState?.isAllStage
  //   },
  //   queryParamStringifyOptions: {
  //     arrayFormat: 'repeat'
  //   },
  //   identifier: pipelineIdentifier,
  //   requestOptions: {
  //     headers: {
  //       'content-type': 'application/yaml'
  //     }
  //   }
  // })

  // useEffect(() => {
  //   if (retryPipelineError) {
  //     showError(getRBACErrorMessage(retryPipelineError))
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [retryPipelineError])

  // const { mutate: runPipelineInDebugMode, loading: reRunDebugModeLoading } = useDebugPipelineExecuteWithInputSetYaml({
  //   queryParams: {
  //     accountIdentifier: accountId,
  //     projectIdentifier,
  //     orgIdentifier,
  //     moduleType: module || '',
  //     repoIdentifier,
  //     branch,
  //     parentEntityConnectorRef: connectorRef,
  //     parentEntityRepoName: repoIdentifier
  //   },
  //   identifier: pipelineIdentifier,
  //   originalExecutionId: defaultTo(pipelineExecutionId, ''),
  //   requestOptions: {
  //     headers: {
  //       'content-type': 'application/yaml'
  //     }
  //   }
  // })

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
    setSelectedInputSets(inputSetSelected)
    setSelectedInputSetsContext?.(inputSetSelected)
  }, [inputSetSelected])

  useEffect(() => {
    if (inputSetYAML) {
      setExistingProvide('provide')
    } else {
      setExistingProvide(hasInputSets ? 'existing' : 'provide')
    }
  }, [inputSetYAML, hasInputSets])

  useEffect(() => {
    if (inputSetsError) {
      showError(getRBACErrorMessage(inputSetsError, true))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputSetsError])

  const valuesPipelineRef = useRef<InputsKVPair>()

  // useDeepCompareEffect(() => {
  //   if (resolvedMergedPipeline) {
  //     updatePipelineInVariablesContext(resolvedMergedPipeline)
  //   }
  // }, [resolvedMergedPipeline])

  // useEffect(() => {
  //   // only applied for CI, Not cloned codebase
  //   if (
  //     formikRef?.current?.values?.template?.templateInputs &&
  //     isCodebaseFieldsRuntimeInputs(formikRef.current.values.template.templateInputs as PipelineInfoConfig) //&&
  //     // resolvedMergedPipeline &&
  //     // !isCloneCodebaseEnabledAtLeastOneStage(resolvedMergedPipeline)
  //   ) {
  //     const newPipeline = getPipelineWithoutCodebaseInputs(formikRef.current.values)
  //     formikRef.current.setValues({ ...formikRef.current.values, ...newPipeline })
  //   }
  // }, [formikRef?.current?.values?.template?.templateInputs]) // resolvedMergedPipeline

  useEffect(() => {
    // TODO:: default set skipPreflightCheck to true
    setSkipPreFlightCheck(true || defaultTo(supportingGitSimplification && storeType === StoreType.REMOTE, false))
  }, [supportingGitSimplification, storeType])

  // const [showPreflightCheckModal, hidePreflightCheckModal] = useModalHook(() => {
  //   return (
  //     <Dialog
  //       className={cx(css.preFlightCheckModal, Classes.DIALOG)}
  //       enforceFocus={false}
  //       isOpen
  //       onClose={hidePreflightCheckModal}
  //     >
  //       <PreFlightCheckModal
  //         pipeline={valuesPipelineRef.current} // TODO
  //         module={module}
  //         accountId={accountId}
  //         orgIdentifier={orgIdentifier}
  //         projectIdentifier={projectIdentifier}
  //         pipelineIdentifier={pipelineIdentifier}
  //         branch={branch}
  //         repoIdentifier={repoIdentifier}
  //         onCloseButtonClick={hidePreflightCheckModal}
  //         onContinuePipelineClick={() => {
  //           hidePreflightCheckModal()
  //           handleRunPipeline(valuesPipelineRef.current, true)
  //         }}
  //       />
  //     </Dialog>
  //   )
  // }, [notifyOnlyMe, selectedStageData, stageIdentifiers, formErrors])

  const { mutateAsync: executePipeline, isLoading: isExecutingPipeline } = useExecutePipelineMutation()

  // const isExecutingPipeline =
  //   runPipelineLoading ||
  //   reRunPipelineLoading ||
  //   runStagesLoading ||
  //   reRunStagesLoading ||
  //   reRunDebugModeLoading ||
  //   retryPipelineLoading

  const handleRunPipeline = async (valuesPipeline: InputsKVPair, forceSkipFlightCheck = false): Promise<void> => {
    const errors = await validateFormRef.current?.(valuesPipeline)
    if (errors && Object.keys(errors).length) {
      return
    }

    valuesPipelineRef.current = valuesPipeline
    if (!skipPreFlightCheck && !forceSkipFlightCheck) {
      // Not skipping pre-flight check - open the new modal
      // TODO
      // showPreflightCheckModal()
      return
    }

    const expressionValues: KVPair = {}
    Object.entries(expressionFormState).forEach(([key, value]: string[]) => {
      expressionValues[key] = value
    })

    try {
      //let response
      // const finalYaml = isEmpty(valuesPipelineRef.current)
      //   ? ''
      //   : yamlStringify({
      //       pipeline: omit(
      //         omitBy(valuesPipelineRef.current, (_val, key) => key.startsWith('_')),
      //         ...pipelineMetadataKeys
      //       )
      //     })

      // if (isDebugMode) {
      //   response = await runPipelineInDebugMode(finalYaml as any)
      // } else if (isRetryFromStage) {
      //   response = await retryPipeline(finalYaml as any)
      // } else if (isRerunPipeline) {
      //   response = selectedStageData.allStagesSelected
      //     ? await reRunPipeline(finalYaml as any)
      //     : await reRunStages({
      //         runtimeInputYaml: finalYaml as any,
      //         stageIdentifiers: stageIdentifiers,
      //         expressionValues
      //       })
      // } else {

      // NOTE: type for runPipeline is wrong
      // TODO:: once selectedStage is supported update the new openAPI endpoint
      // const response = selectedStageData.allStagesSelected
      // ? await runPipeline(finalYaml as unknown as void)
      // : await runStage({
      //     runtimeInputYaml: finalYaml,
      //     stageIdentifiers: stageIdentifiers,
      //     expressionValues
      //   })

      const response = await executePipeline({
        org: orgIdentifier,
        pipeline: pipelineMetadata?.identifier as string,
        project: projectIdentifier,
        body: { inputs_yaml: yamlStringify({ inputs: valuesPipeline }) },
        queryParams: {}
      })
      const data = response?.content
      // TODO:: governanceMetadata not yet added
      // const governanceMetadata = data?.planExecution?.governanceMetadata

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
              // TODO: any will not be needed with latest build of pipeline service
              executionIdentifier: defaultTo((response?.content as any)?.execution_details?.execution_id, ''),
              accountId,
              module,
              source
            }),
            search:
              supportingGitSimplification && storeType === StoreType.REMOTE
                ? `connectorRef=${connectorRef}&repoName=${repoIdentifier}&branch=${getPipelineBranch()}&storeType=${storeType}`
                : undefined,
            state: {
              // shouldShowGovernanceEvaluations:
              //   governanceMetadata?.status === 'error' || governanceMetadata?.status === 'warning',
              // governanceMetadata
            }
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

      // Previous values are used again to prevent removing the inputs if they are removed in the yaml editor
      formikRef.current.setValues(prevValues => ({ ...prevValues, ...parsedYaml }))
      formikRef.current.validateForm(parsedYaml)
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

    // setting up the current pipeline to pass to input sets for merge API call to retain the existing values
    // TODO !isEmpty(formikRef?.current?.values) && setCurrentPipeline(formikRef?.current?.values)
  }

  // TODO
  // useEffect(() => {
  //   if (shouldValidateForm) {
  //     formikRef.current?.validateForm(inputSet.pipeline)
  //     setShouldValidateForm?.(false)
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [shouldValidateForm, inputSet])

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
      if (!formErrors[keyName] && isEmpty(exprValue)) {
        formErrorsUpdated[keyName] = getString('pipeline.expressionRequired')
      } else if (formErrors[keyName] && !isEmpty(exprValue)) {
        delete formErrorsUpdated[keyName]
      }

      setFormErrors(formErrorsUpdated)
    }
  }

  // const getFormErrors = async (
  //   latestPipeline: { pipeline: PipelineInfoConfig },
  //   latestYamlTemplate: PipelineInfoConfig,
  //   orgPipeline: PipelineInfoConfig | undefined,
  //   selectedStages: StageSelectionData | undefined
  // ): Promise<FormikErrors<InputSetDTO>> => {
  //   let errors = formErrors
  //   function validateErrors(): Promise<FormikErrors<InputSetDTO>> {
  //     return new Promise(resolve => {
  //       const validatedErrors =
  //         (validatePipeline({
  //           pipeline: { ...clearRuntimeInput(latestPipeline.pipeline) },
  //           template: latestYamlTemplate,
  //           originalPipeline: orgPipeline,
  //           //resolvedPipeline: resolvedMergedPipeline,
  //           getString,
  //           viewType: StepViewType.DeploymentForm,
  //           selectedStageData: selectedStages
  //         }) as any) || formErrors
  //       resolve(validatedErrors)
  //     })
  //   }
  //   if (latestPipeline?.pipeline && latestYamlTemplate && orgPipeline) {
  //     errors = await validateErrors()
  //     const expressionErrors: KVPair = {}

  //     // vaidate replacedExpressions
  //     if (inputSetYamlResponse?.data?.replacedExpressions?.length) {
  //       inputSetYamlResponse.data.replacedExpressions.forEach((value: string) => {
  //         const currValue = defaultTo(expressionFormState[value], '')
  //         if (currValue.trim() === '') expressionErrors[value] = getString('pipeline.expressionRequired')
  //       })
  //     }
  //     setFormErrors({ ...errors, ...expressionErrors })
  //   }
  //   return errors
  // }

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

  //TODO
  const invalidInputSetReferences = React.useMemo(() => [], [])

  const shouldShowPageSpinner = (): boolean => {
    return loadingPipeline || loadingInputSets //|| loadingResolvedChildPipeline
  }

  const formRefDom = React.useRef<HTMLElement | undefined>()
  const handleValidation = async (_values: InputsKVPair): Promise<FormikErrors<InputSetDTO>> => {
    if (submitCount === 0) {
      return Promise.resolve({})
    }
    //let pl: PipelineInfoConfig | undefined

    // if ((values as Pipeline)?.pipeline) {
    //   pl = (values as Pipeline)?.pipeline
    // } else {
    //   pl = values as PipelineInfoConfig
    // }

    const runPipelineFormErrors = {}
    //  await getFormErrors(
    //   { pipeline: pl } as Required<Pipeline>,
    //   defaultTo(inputSetTemplate?.pipeline, {} as PipelineInfoConfig),
    //   pipeline,
    //   selectedStageData
    // )

    // https://github.com/formium/formik/issues/1392
    return runPipelineFormErrors
  }

  const {
    data: inputsSchema,
    isLoading: inputsSchemaLoading,
    failureReason: inputsSchemaError
  } = useGetInputsSchemaDetailsQuery(
    {
      org: orgIdentifier,
      pipeline: pipelineMetadata?.identifier as string,
      project: projectIdentifier,
      queryParams: {}
    },
    {
      cacheTime: 0
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

  if (shouldShowPageSpinner()) {
    return <PageSpinner />
  }

  // function handleInputSetSave(newId?: string): void {
  //   if (newId) {
  //     setSelectedInputSets([{ label: newId, value: newId, type: 'INPUT_SET' }])
  //   }
  //   getTemplateFromPipeline()
  // }

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
              //template={inputSetYamlResponse} TODO do we need this
              formRefDom={formRefDom}
              formErrors={formErrors}
              stageExecutionData={stageExecutionData}
              //stageExecutionError={stageExecutionError} TODO
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
        <Formik<InputsKVPair>
          initialValues={runtimeInputsInitialValues}
          enableReinitialize
          formName="runPipeline"
          onSubmit={values => {
            // DO NOT return from here, causing the Formik form to handle loading state inconsistently
            setSubmitCount(submitCount + 1)
            handleRunPipeline(values, false)
          }}
          validate={handleValidation}
        >
          {formik => {
            const { submitForm, values, setFormikState, validateForm } = formik
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
                    //template={inputSetYamlResponse}
                    formRefDom={formRefDom}
                    formErrors={formErrors}
                    stageExecutionData={stageExecutionData}
                    //stageExecutionError={stageExecutionError}
                    executionStageList={executionStageList}
                    runModalHeaderTitle={formTitleText}
                    selectedBranch={selectedBranch}
                    onGitBranchChange={onGitBranchChange}
                    refetchPipeline={refetchPipeline}
                    refetchTemplate={getTemplateFromPipeline}
                    isRetryFromStage={isRetryFromStage}
                    isRerunPipeline={isRerunPipeline}
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
                    <VisualViewY1
                      runtimeInputs={runtimeInputs}
                      inputsSchemaLoading={inputsSchemaLoading}
                      executionView={executionView}
                      selectedInputSets={selectedInputSets}
                      setSelectedInputSets={setSelectedInputSets}
                      existingProvide={existingProvide}
                      setExistingProvide={setExistingProvide}
                      hasRuntimeInputs={hasRuntimeInputs}
                      pipelineIdentifier={pipelineIdentifier}
                      executionIdentifier={pipelineExecutionId}
                      template={defaultTo(inputSetTemplate?.pipeline, {} as PipelineInfoConfig)}
                      pipeline={pipeline}
                      currentPipeline={values}
                      getTemplateError={inputSetsError}
                      //resolvedPipeline={resolvedMergedPipeline}
                      submitForm={submitForm}
                      setRunClicked={setRunClicked}
                      hasInputSets={hasInputSets}
                      //templateError={executionInputSetTemplateYamlError}
                      selectedStageData={selectedStageData}
                      pipelineResponse={pipelineResponse}
                      invalidInputSetReferences={invalidInputSetReferences}
                      loadingInputSets={loadingInputSets}
                      onReconcile={() => undefined /*onReconcile*/}
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
                          existingJSON={values}
                          bind={setYamlHandler}
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
                            submitForm()
                          }}
                          featuresProps={getFeaturePropsForRunPipelineButton({
                            modules: inputSetYamlResponse?.data?.modules,
                            getString
                          })}
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
                      {/* TODO {!isRerunPipeline && (
                        <SaveAsInputSetY1
                          key="saveasinput"
                          pipelineIdentifier={pipeline?.identifier}
                          pipeline={pipeline}
                          currentPipeline={{ values }}
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
                      )} */}
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
