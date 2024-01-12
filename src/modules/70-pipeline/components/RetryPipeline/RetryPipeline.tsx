/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Text,
  ButtonVariation,
  Formik,
  FormikForm,
  Heading,
  Layout,
  SelectOption,
  Checkbox,
  PageSpinner,
  VisualYamlSelectedView as SelectedView,
  VisualYamlToggle
} from '@harness/uicore'
import { useModalHook } from '@harness/use-modal'
import { Color } from '@harness/design-system'
import { useHistory, useParams } from 'react-router-dom'
import cx from 'classnames'
import { defaultTo, get, isEmpty, pick, remove, isEqual } from 'lodash-es'
import type { FormikErrors, FormikProps } from 'formik'
import { Classes, Dialog, Tooltip } from '@blueprintjs/core'
import { useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import {
  PipelineInfoConfig,
  useGetTemplateFromPipeline,
  getInputSetForPipelinePromise,
  InputSetSummaryResponse,
  useGetInputSetsListForPipeline,
  useGetInputsetYamlV2,
  useGetMergeInputSetFromPipelineTemplateWithListInput,
  useGetPipeline,
  useGetRetryStages,
  useRetryPipeline
} from 'services/pipeline-ng'

import type {
  ExecutionPathProps,
  GitQueryParams,
  PipelineType,
  RunPipelineQueryParams
} from '@common/interfaces/RouteInterfaces'
import { useExecutionContext } from '@pipeline/context/ExecutionContext'
import type { YamlBuilderHandlerBinding, YamlBuilderProps } from '@common/interfaces/YAMLBuilderProps'

import RbacButton from '@rbac/components/Button/Button'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { usePermission } from '@rbac/hooks/usePermission'
import { parse, yamlParse, yamlStringify } from '@common/utils/YamlHelperMethods'
import { useToaster } from '@common/exports'
import routes from '@common/RouteDefinitions'
import { useMutateAsGet, useQueryParams } from '@common/hooks'
import { StoreType } from '@common/constants/GitSyncTypes'
import {
  clearRuntimeInput,
  getFeaturePropsForRunPipelineButton,
  mergeTemplateWithInputSetData
} from '@pipeline/utils/runPipelineUtils'
import type { InputSet, InputSetDTO, Pipeline } from '@pipeline/utils/types'
import { YamlBuilderMemo } from '@common/components/YAMLBuilder/YamlBuilder'
import GitRemoteDetails from '@common/components/GitRemoteDetails/GitRemoteDetails'
import { getErrorsList } from '@pipeline/utils/errorUtils'
import { isInputSetInvalid } from '@pipeline/utils/inputSetUtils'
import { useGetResolvedChildPipeline } from '@pipeline/hooks/useGetResolvedChildPipeline'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { isExecutionFailed } from '@pipeline/utils/statusHelpers'
import { ErrorsStrip } from '../ErrorsStrip/ErrorsStrip'
import GitPopover from '../GitPopover/GitPopover'
import SelectStagetoRetry from './SelectStagetoRetry'
import factory from '../PipelineSteps/PipelineStepFactory'

import { PipelineInputSetForm } from '../PipelineInputSetForm/PipelineInputSetForm'
import { StepViewType } from '../AbstractSteps/Step'
import { validatePipeline } from '../PipelineStudio/StepUtil'
import SaveAsInputSet from '../RunPipelineModal/SaveAsInputSet'
import { InputSetSelector, InputSetSelectorProps } from '../InputSetSelector/InputSetSelector'
import SelectExistingInputsOrProvideNew from '../RunPipelineModal/SelectExistingOrProvide'
import { PreFlightCheckModal } from '../PreFlightCheckModal/PreFlightCheckModal'
import type { InputSetValue } from '../InputSetSelector/utils'
import css from './RetryPipeline.module.scss'

export interface ParallelStageOption extends SelectOption {
  isLastIndex: number
}
interface RetryPipelineProps {
  executionIdentifier: string
  pipelineIdentifier: string
  modules?: string[]
  onClose: () => void
  params: PipelineType<{
    orgIdentifier: string
    projectIdentifier: string
    pipelineIdentifier: string
    executionIdentifier: string
    accountId: string
    stagesExecuted?: string[]
  }> &
    GitQueryParams
  preSelectLastStage?: boolean
}

function RetryPipeline({
  executionIdentifier: executionId,
  pipelineIdentifier: pipelineIdf,
  modules,
  onClose,
  params,
  preSelectLastStage = false
}: RetryPipelineProps): React.ReactElement {
  const {
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF,
    supportingGitSimplification
  } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const { getString } = useStrings()
  const { showSuccess, showWarning, showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const history = useHistory()
  const loadFromCache = useFeatureFlag(FeatureFlag.CDS_ENABLE_LOAD_FROM_CACHE_FOR_RETRY_FORM).toString()

  const {
    projectIdentifier,
    orgIdentifier,
    pipelineIdentifier,
    accountId,
    executionIdentifier,
    module,
    source = 'executions'
  } = useParams<PipelineType<ExecutionPathProps>>()

  const { pipelineExecutionDetail } = useExecutionContext()

  const { connectorRef, repoIdentifier: _repoId, repoName, branch, storeType } = params
  const repoIdentifier = isGitSyncEnabled ? _repoId : repoName
  const isPipelineRemote = supportingGitSimplification && storeType === StoreType.REMOTE
  const { inputSetType, inputSetValue, inputSetLabel, inputSetRepoIdentifier, inputSetBranch } = useQueryParams<
    GitQueryParams & RunPipelineQueryParams
  >()
  const planExecutionIdentifier = executionIdentifier ?? executionId
  const pipelineId = pipelineIdf ? pipelineIdf : pipelineIdentifier

  const getInputSetSelected = (): InputSetValue[] => {
    if (inputSetType) {
      return [
        {
          type: inputSetType as InputSetSummaryResponse['inputSetType'],
          value: defaultTo(inputSetValue, ''),
          label: defaultTo(inputSetLabel, ''),
          gitDetails: {
            repoIdentifier: inputSetRepoIdentifier,
            branch: inputSetBranch
          }
        }
      ]
    }
    return []
  }

  const [selectedView, setSelectedView] = useState<SelectedView>(SelectedView.VISUAL)
  const [yamlHandler, setYamlHandler] = useState<YamlBuilderHandlerBinding | undefined>()
  const [inputSetYaml, setInputSetYaml] = useState('')
  const [currentPipeline, setCurrentPipeline] = useState<{ pipeline?: PipelineInfoConfig } | undefined>(
    inputSetYaml ? parse(inputSetYaml) : undefined
  )
  const [existingProvide, setExistingProvide] = useState('existing')
  const [formErrors, setFormErrors] = useState<FormikErrors<InputSetDTO>>({})
  const [retryClicked, setRetryClicked] = useState(false)
  const [selectedStage, setSelectedStage] = useState<ParallelStageOption | null>(null)
  const [selectedInputSets, setSelectedInputSets] = useState<InputSetSelectorProps['value']>(getInputSetSelected())
  const [isParallelStage, setIsParallelStage] = useState(false)
  const [inputSetTemplateYaml, setInputSetTemplateYaml] = useState('')
  const [skipPreFlightCheck, setSkipPreFlightCheck] = useState(isPipelineRemote)
  const [notifyOnlyMe, setNotifyOnlyMe] = useState(false)
  const [triggerValidation, setTriggerValidation] = useState(false)
  const [listOfSelectedStages, setListOfSelectedStages] = useState<Array<string>>([])
  const [resolvedPipeline, setResolvedPipeline] = React.useState<PipelineInfoConfig>()
  const [invalidInputSetIds, setInvalidInputSetIds] = useState<Array<string>>([])
  const [loadingSingleInputSet, setLoadingSingleInputSet] = useState<boolean>(false)
  const formikRef = useRef<FormikProps<PipelineInfoConfig>>()

  const yamlTemplate = React.useMemo(() => {
    return parse<Pipeline>(inputSetTemplateYaml || '')?.pipeline
  }, [inputSetTemplateYaml])

  /*------------------------------------------------API Calls------------------------------*/

  const {
    data: pipelineResponse,
    loading: loadingPipeline,
    error: getPipelineError
  } = useGetPipeline({
    pipelineIdentifier: pipelineId,
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
    requestOptions: { headers: { 'Load-From-Cache': loadFromCache } }
  })

  const {
    data: inputSetData,
    loading: loadingTemplate,
    error: getTemplateError
  } = useGetInputsetYamlV2({
    planExecutionId: planExecutionIdentifier,
    queryParams: {
      orgIdentifier,
      projectIdentifier,
      accountIdentifier: accountId,
      resolveExpressionsType: 'RESOLVE_TRIGGER_EXPRESSIONS'
    },
    requestOptions: {
      headers: {
        'content-type': 'application/yaml'
      }
    }
  })
  const {
    data: inputSetYamlResponse,
    loading: loadingInputSetTemplate,
    error: getTemplateFromPipelineError
  } = useMutateAsGet(useGetTemplateFromPipeline, {
    body: {
      stageIdentifiers: params.stagesExecuted
    },
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier: pipelineId,
      branch,
      repoIdentifier,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoIdentifier
    }
  })

  const {
    mutate: retryPipeline,
    loading: loadingRetry,
    error: getRetryPipelineError
  } = useRetryPipeline({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      moduleType: module || '',
      planExecutionId: planExecutionIdentifier,
      retryStages: (!isParallelStage
        ? [selectedStage?.value]
        : (selectedStage?.value as string)?.split(' | ')) as string[],
      runAllStages: !preSelectLastStage // Alligning as in RunPipelineFormBasic
    },
    queryParamStringifyOptions: {
      arrayFormat: 'repeat'
    },
    identifier: pipelineId,
    requestOptions: {
      headers: {
        'content-type': 'application/yaml'
      }
    }
  })

  const {
    refetch: getInputSetsList,
    data: inputSetResponse,
    loading: inputSetLoading,
    error: getInputSetError
  } = useGetInputSetsListForPipeline({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier: pipelineId,
      ...(!isEmpty(repoIdentifier) && !isEmpty(branch)
        ? {
            repoIdentifier,
            branch,
            getDefaultFromOtherRepo: true
          }
        : {})
    },
    lazy: true
  })

  const {
    mutate: mergeInputSet,
    loading: loadingUpdate,
    error: mergeInputSetError
  } = useGetMergeInputSetFromPipelineTemplateWithListInput({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      pipelineIdentifier: pipelineId,
      ...(!isEmpty(repoIdentifier) && !isEmpty(branch)
        ? {
            pipelineRepoID: repoIdentifier,
            pipelineBranch: branch,
            repoIdentifier,
            branch,
            getDefaultFromOtherRepo: true,
            parentEntityConnectorRef: connectorRef,
            parentEntityRepoName: repoIdentifier
          }
        : {})
    }
  })
  const {
    data: stageResponse,
    loading: retryStageLoading,
    error: getRetryStagesError
  } = useGetRetryStages({
    planExecutionId: planExecutionIdentifier,
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier: pipelineId,
      repoIdentifier,
      branch,
      getDefaultFromOtherRepo: true,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoIdentifier
    },
    requestOptions: { headers: { 'Load-From-Cache': loadFromCache } }
  })
  /*------------------------------------------------API Calls------------------------------*/

  const pipeline: PipelineInfoConfig | undefined = React.useMemo(
    () => yamlParse<Pipeline>(defaultTo(pipelineResponse?.data?.yamlPipeline, ''))?.pipeline,
    [pipelineResponse?.data?.yamlPipeline]
  )

  const valuesPipelineRef = useRef<PipelineInfoConfig>()
  const yamlBuilderReadOnlyModeProps: YamlBuilderProps = {
    fileName: `retry-pipeline.yaml`,
    entityType: 'Pipelines',
    yamlSanityConfig: {
      removeEmptyString: false,
      removeEmptyObject: false,
      removeEmptyArray: false
    }
  }
  const [canEdit] = usePermission(
    {
      resourceScope: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier
      },
      resource: {
        resourceType: ResourceType.PIPELINE,
        resourceIdentifier: pipelineId
      },
      permissions: [PermissionIdentifier.EDIT_PIPELINE]
    },
    [accountId, orgIdentifier, projectIdentifier, pipelineId]
  )
  const inputSets = inputSetResponse?.data?.content

  const onReconcile = (inpSetId: string): void => {
    remove(invalidInputSetIds, id => id === inpSetId)
    setInvalidInputSetIds(invalidInputSetIds)
  }

  React.useEffect(() => {
    const mergedPipelineYaml = pipelineResponse?.data?.resolvedTemplatesPipelineYaml
    if (mergedPipelineYaml) {
      setResolvedPipeline(parse<Pipeline>(mergedPipelineYaml)?.pipeline)
    }
  }, [pipelineResponse?.data?.resolvedTemplatesPipelineYaml])

  const { loadingResolvedChildPipeline, resolvedMergedPipeline } = useGetResolvedChildPipeline(
    { accountId, repoIdentifier, branch, connectorRef },
    pipeline,
    resolvedPipeline
  )

  const lastFailedStageIdx = useMemo(() => {
    let _lastFailedStageIdx = -1
    if (stageResponse?.data?.groups?.length) {
      _lastFailedStageIdx = stageResponse.data.groups.length - 1
      stageResponse.data.groups.forEach((stageGroup, idx) => {
        stageGroup.info?.forEach(stageName => {
          if (isExecutionFailed(stageName?.status)) _lastFailedStageIdx = idx
        })
      })
    }
    return _lastFailedStageIdx
  }, [stageResponse?.data?.groups])

  useEffect(() => {
    // Won't actually render out RunPipelineForm
    /* istanbul ignore else */ if (inputSetData?.data?.inputSetYaml) {
      setInputSetYaml(inputSetData.data?.inputSetYaml)
    }
    /* istanbul ignore else */ if (inputSetYamlResponse?.data?.inputSetTemplateYaml) {
      setInputSetTemplateYaml(get(inputSetYamlResponse, 'data.inputSetTemplateYaml'))
    }
  }, [inputSetData, inputSetYamlResponse])

  useEffect(() => {
    if (!inputSets?.length) {
      setExistingProvide('provide')
    }
  }, [inputSets])

  useEffect(() => {
    if (inputSetYaml) {
      const parsedYAML = parse<Pipeline>(inputSetYaml)
      setExistingProvide('provide')
      setCurrentPipeline(parsedYAML)
    }
  }, [inputSetYaml])

  useEffect(() => {
    getInputSetsList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setTriggerValidation(true)
  }, [currentPipeline])

  useEffect(() => {
    /* istanbul ignore next */
    if (inputSetTemplateYaml) {
      const parsedTemplate = parse(inputSetTemplateYaml) as { pipeline: PipelineInfoConfig }
      if ((selectedInputSets && selectedInputSets.length > 1) || selectedInputSets?.[0]?.type === 'OVERLAY_INPUT_SET') {
        const fetchData = async (): Promise<void> => {
          try {
            const data = await mergeInputSet({
              inputSetReferences: selectedInputSets.map(item => item.value as string)
            })
            if (!get(data, 'data.errorResponse') && get(data, 'data.pipelineYaml')) {
              const inputSetPortion = parse(get(data, 'data.pipelineYaml')) as {
                pipeline: PipelineInfoConfig
              }
              const toBeUpdated = mergeTemplateWithInputSetData({
                templatePipeline: parsedTemplate,
                inputSetPortion,
                allValues: { pipeline: {} } as Pipeline,
                shouldUseDefaultValues: false
              })
              setCurrentPipeline(toBeUpdated)
            } else if (get(data, 'data.errorResponse')) {
              setSelectedInputSets([])
            }
            setInvalidInputSetIds(get(data, 'data.inputSetErrorWrapper.invalidInputSetReferences', []))
          } catch (e) {
            showError(getRBACErrorMessage(e), undefined, 'pipeline.feth.inputSetTemplateYaml.error')
          }
        }
        fetchData()
      } else if (selectedInputSets && selectedInputSets.length === 1) {
        const fetchData = async (): Promise<void> => {
          const data = await getInputSetForPipelinePromise({
            inputSetIdentifier: selectedInputSets[0].value as string,
            queryParams: {
              accountIdentifier: accountId,
              projectIdentifier,
              orgIdentifier,
              pipelineIdentifier: pipelineId,
              repoIdentifier: selectedInputSets[0]?.gitDetails?.repoIdentifier,
              branch: selectedInputSets[0]?.gitDetails?.branch
            }
          })
          if (data?.data && !isInputSetInvalid(data?.data) && get(data, 'data.inputSetYaml')) {
            if (selectedInputSets[0].type === 'INPUT_SET') {
              const inputSetPortion = pick(parse<InputSet>(get(data, 'data.inputSetYaml'))?.inputSet, 'pipeline') as {
                pipeline: PipelineInfoConfig
              }
              const toBeUpdated = mergeTemplateWithInputSetData({
                templatePipeline: parsedTemplate,
                inputSetPortion,
                allValues: { pipeline: {} } as Pipeline,
                shouldUseDefaultValues: false
              })
              setCurrentPipeline(toBeUpdated)
            }
            setInvalidInputSetIds([])
          } else if (data?.data && isInputSetInvalid(data?.data)) {
            const invalidId: string = get(data, 'data.identifier', '')
            setSelectedInputSets([])
            setInvalidInputSetIds(isEmpty(invalidId) ? [] : [invalidId])
          }
        }
        setLoadingSingleInputSet(true)
        try {
          fetchData()
            .then(() => setLoadingSingleInputSet(false))
            .catch(() => setLoadingSingleInputSet(false))
        } catch (e) {
          setLoadingSingleInputSet(false)
        }
      } else if (!selectedInputSets?.length && !inputSetYaml?.length) {
        setCurrentPipeline(parsedTemplate)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputSetTemplateYaml, selectedInputSets, accountId, projectIdentifier, orgIdentifier, pipelineId])

  useEffect(() => {
    let errors: FormikErrors<InputSetDTO> = formErrors

    if (
      triggerValidation &&
      currentPipeline?.pipeline &&
      inputSetTemplateYaml &&
      yamlTemplate &&
      pipeline &&
      retryClicked
    ) {
      errors = validatePipeline({
        pipeline: { ...clearRuntimeInput(currentPipeline.pipeline) },
        template: parse<Pipeline>(inputSetTemplateYaml || '')?.pipeline,
        originalPipeline: currentPipeline.pipeline,
        getString,
        viewType: StepViewType.DeploymentForm
      }) as any
      setFormErrors(errors)
      // triggerValidation should be true every time 'currentPipeline' changes
      // and it needs to be set as false here so that we do not trigger it indefinitely
      setTriggerValidation(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPipeline, pipeline, inputSetTemplateYaml, yamlTemplate, selectedInputSets, existingProvide])

  const handleRetryPipeline = useCallback(
    async (valuesPipeline?: PipelineInfoConfig, forceSkipFlightCheck = false) => {
      if (Object.keys(formErrors).length) {
        return
      }
      valuesPipelineRef.current = valuesPipeline
      if (!skipPreFlightCheck && !forceSkipFlightCheck) {
        // Not skipping pre-flight check - open the new modal
        showPreflightCheckModal()
        return
      }
      /* istanbul ignore next */
      try {
        const response = await retryPipeline(
          !isEmpty(valuesPipelineRef.current) ? (yamlStringify({ pipeline: valuesPipelineRef.current }) as any) : ''
        )
        const retryPipelineData = response.data
        if (response.status === 'SUCCESS') {
          onClose()
          if (retryPipelineData && retryPipelineData.planExecution?.uuid) {
            showSuccess(getString('runPipelineForm.pipelineRunSuccessFully'))
            history.push(
              routes.toExecutionPipelineView({
                orgIdentifier,
                pipelineIdentifier: pipelineId,
                projectIdentifier,
                executionIdentifier: retryPipelineData?.planExecution?.uuid || '',
                accountId,
                module,
                source,
                connectorRef,
                repoName: repoIdentifier,
                branch,
                storeType
              })
            )
          }
        }
      } catch (error) {
        showWarning(getRBACErrorMessage(error) || getString('runPipelineForm.runPipelineFailed'))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      retryPipeline,
      showWarning,
      showSuccess,
      pipelineId,
      history,
      orgIdentifier,
      module,
      projectIdentifier,
      onClose,
      accountId,
      skipPreFlightCheck,
      formErrors,
      isParallelStage,
      selectedStage,
      connectorRef,
      repoIdentifier,
      branch,
      storeType
    ]
  )

  useEffect(() => {
    if (getPipelineError) {
      showError(getRBACErrorMessage(getPipelineError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getPipelineError])

  useEffect(() => {
    if (getInputSetError) {
      showError(getRBACErrorMessage(getInputSetError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getInputSetError])

  useEffect(() => {
    if (getTemplateError) {
      showError(getRBACErrorMessage(getTemplateError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTemplateError])

  useEffect(() => {
    if (getTemplateFromPipelineError) {
      showError(getRBACErrorMessage(getTemplateFromPipelineError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTemplateFromPipelineError])

  useEffect(() => {
    if (getRetryPipelineError) {
      showError(getRBACErrorMessage(getRetryPipelineError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getRetryPipelineError])

  useEffect(() => {
    if (mergeInputSetError) {
      showError(getRBACErrorMessage(mergeInputSetError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeInputSetError])

  useEffect(() => {
    if (getRetryStagesError) {
      showError(getRBACErrorMessage(getRetryStagesError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getRetryStagesError])

  const checkIfRuntimeInputsNotPresent = (): string | undefined => {
    if (pipeline && !inputSetTemplateYaml) {
      return getString('pipeline.inputSets.noRuntimeInputsWhileExecution')
    }
  }

  const handleModeSwitch = useCallback(
    (view: SelectedView) => {
      if (view === SelectedView.VISUAL) {
        const presentPipeline = parse(yamlHandler?.getLatestYaml() || '') as { pipeline: PipelineInfoConfig }
        setCurrentPipeline(presentPipeline)
      }
      setSelectedView(view)
    },
    [yamlHandler?.getLatestYaml]
  )

  const selectListOfSelectedStages = (value: ParallelStageOption): void => {
    const stagesList = stageResponse?.data?.groups?.filter((_, stageIdx) => stageIdx < value.isLastIndex)
    const listOfIds: string[] = []

    stagesList?.forEach(stageData => {
      stageData?.info?.forEach(stageInfo => {
        listOfIds.push(stageInfo.identifier as string)
      })
    })
    setListOfSelectedStages(listOfIds)
  }

  useEffect(() => {
    if (stageResponse?.data?.groups?.length && preSelectLastStage && lastFailedStageIdx !== -1) {
      let value: ParallelStageOption
      for (const [idx, stageGroup] of stageResponse.data.groups.entries()) {
        if (lastFailedStageIdx < idx) break
        const [{ name, identifier }] = stageGroup.info || []
        if (stageGroup.info?.length === 1) {
          value = { label: name as string, value: identifier as string, isLastIndex: idx }
          setSelectedStage(value)
          selectListOfSelectedStages(value)
        } else {
          const parallelStagesLabel = stageGroup.info?.map(stageName => stageName.name).join(' | ')
          const parallelStagesValue = stageGroup.info?.map(stageName => stageName.identifier).join(' | ')
          value = {
            label: parallelStagesLabel as string,
            value: parallelStagesValue as string,
            isLastIndex: idx
          }
          setIsParallelStage(true)
          setSelectedStage(value)
          selectListOfSelectedStages(value)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageResponse?.data, preSelectLastStage, lastFailedStageIdx])

  const handleStageChange = (value: ParallelStageOption): void => {
    if (value.label.includes('|')) {
      setIsParallelStage(true)
    } else {
      setIsParallelStage(false)
    }
    selectListOfSelectedStages(value)
    setSelectedStage(value)
  }

  const onExistingProvideRadioChange = (ev: FormEvent<HTMLInputElement>): void => {
    const existingProvideValue = ev.currentTarget.checked ? 'existing' : 'provide'
    setExistingProvide(existingProvideValue)
  }
  const getRetryPipelineDisabledState = (): boolean => {
    return (
      getErrorsList(formErrors).errorCount > 0 ||
      !selectedStage ||
      ((!selectedInputSets || selectedInputSets.length === 0) &&
        existingProvide === 'existing' &&
        !!inputSetTemplateYaml)
    )
  }

  const currentPipelineValues = currentPipeline?.pipeline
    ? clearRuntimeInput(currentPipeline.pipeline)
    : ({} as PipelineInfoConfig)

  useEffect(() => {
    if (
      !isEqual(formikRef.current?.values, {
        ...currentPipelineValues
      })
    )
      formikRef.current?.setValues({
        ...currentPipelineValues
      })
  }, [currentPipeline?.pipeline])

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
          pipelineIdentifier={pipelineId}
          branch={branch}
          repoIdentifier={repoIdentifier}
          onCloseButtonClick={hidePreflightCheckModal}
          onContinuePipelineClick={() => {
            hidePreflightCheckModal()
            handleRetryPipeline(valuesPipelineRef.current, true)
          }}
        />
      </Dialog>
    )
  }, [isParallelStage, selectedStage])

  const showInputSetSelector = (): boolean => {
    return !!(
      pipeline &&
      currentPipeline &&
      inputSetTemplateYaml &&
      existingProvide === 'existing' &&
      !!inputSets?.length
    )
  }

  const renderPipelineInputSetForm = (): React.ReactElement | undefined => {
    if (loadingUpdate || loadingSingleInputSet) {
      return (
        <PageSpinner
          className={css.inputSetsUpdatingSpinner}
          message={
            loadingSingleInputSet
              ? getString('pipeline.inputSets.applyingInputSet')
              : getString('pipeline.inputSets.applyingInputSets')
          }
        />
      )
    }
    const templateSource = inputSetTemplateYaml
    if (currentPipeline?.pipeline && resolvedMergedPipeline && templateSource) {
      return (
        <>
          <div className={css.dividerWrapper}>
            <div className={css.divider} />
          </div>
          <PipelineInputSetForm
            originalPipeline={resolvedMergedPipeline}
            template={parse<Pipeline>(templateSource)?.pipeline}
            readonly={false}
            path=""
            viewType={StepViewType.DeploymentForm}
            isRunPipelineForm
            maybeContainerClass={css.inputSetFormRunPipeline}
            listOfSelectedStages={listOfSelectedStages}
            isRetryFormStageSelected={selectedStage !== null}
            disableRuntimeInputConfigureOptions
          />
        </>
      )
    }
  }

  const formRefDom = React.useRef<HTMLElement | undefined>()

  if (
    loadingPipeline ||
    loadingTemplate ||
    inputSetLoading ||
    loadingRetry ||
    loadingInputSetTemplate ||
    loadingResolvedChildPipeline
  ) {
    return <PageSpinner />
  }

  return (
    <Formik<PipelineInfoConfig>
      initialValues={currentPipelineValues}
      formName="retryPipeline"
      onSubmit={values => {
        handleRetryPipeline(values, false)
      }}
      validate={async values => {
        let errors: FormikErrors<InputSetDTO> = formErrors

        setCurrentPipeline({ ...currentPipeline, pipeline: values as PipelineInfoConfig })

        function validateErrors(): Promise<FormikErrors<InputSetDTO>> {
          return new Promise(resolve => {
            setTimeout(() => {
              const validatedErrors =
                (validatePipeline({
                  pipeline: values as PipelineInfoConfig,
                  template: parse<Pipeline>(inputSetTemplateYaml || '')?.pipeline,
                  originalPipeline: pipeline,
                  getString,
                  viewType: StepViewType.DeploymentForm
                }) as any) || formErrors
              resolve(validatedErrors)
            }, 300)
          })
        }

        errors = await validateErrors()

        if (typeof errors !== undefined && retryClicked) {
          setFormErrors(errors)
        }
        return errors
      }}
    >
      {formik => {
        const { submitForm, values } = formik
        formikRef.current = formik
        const noRuntimeInputs = checkIfRuntimeInputsNotPresent()

        return (
          <Layout.Vertical>
            <>
              <div className={css.runModalHeader}>
                <Heading
                  level={2}
                  font={{ weight: 'bold' }}
                  color={Color.BLACK_100}
                  className={css.runModalHeaderTitle}
                >
                  {preSelectLastStage
                    ? getString('pipeline.execution.actions.reRunLastFailedStageTitle')
                    : getString('pipeline.execution.actions.reRunSpecificStageTitle')}
                </Heading>
                {isGitSyncEnabled && (
                  <GitSyncStoreProvider>
                    <GitPopover
                      data={pipelineResponse?.data?.gitDetails ?? {}}
                      iconProps={{ margin: { left: 'small', top: 'xsmall' } }}
                    />
                  </GitSyncStoreProvider>
                )}
                <div className={css.optionBtns}>
                  <VisualYamlToggle
                    selectedView={selectedView}
                    onChange={nextMode => {
                      handleModeSwitch(nextMode)
                    }}
                    disableToggle={!inputSetTemplateYaml}
                  />
                </div>
              </div>
              {isPipelineRemote && (
                <div className={css.gitRemoteDetailsWrapper}>
                  <GitRemoteDetails
                    repoName={repoIdentifier}
                    branch={branch}
                    filePath={pipelineExecutionDetail?.pipelineExecutionSummary?.gitDetails?.filePath}
                    fileUrl={pipelineExecutionDetail?.pipelineExecutionSummary?.gitDetails?.fileUrl}
                    flags={{ readOnly: true }}
                  />
                </div>
              )}
              <ErrorsStrip formErrors={formErrors} domRef={formRefDom} />
            </>
            {selectedView === SelectedView.VISUAL ? (
              <div
                className={css.runModalFormContent}
                ref={ref => {
                  formRefDom.current = ref as HTMLElement
                }}
              >
                <FormikForm>
                  {!retryStageLoading && stageResponse?.data && (
                    <SelectStagetoRetry
                      handleStageChange={handleStageChange}
                      selectedStage={selectedStage}
                      stageResponse={stageResponse?.data}
                      preSelectLastStage={preSelectLastStage}
                    />
                  )}
                  {noRuntimeInputs ? (
                    <Layout.Horizontal padding="medium" margin="medium">
                      <Text>{noRuntimeInputs}</Text>
                    </Layout.Horizontal>
                  ) : (
                    <Layout.Vertical
                      className={css.pipelineHeader}
                      padding={{ top: 'xlarge', left: 'xlarge', right: 'xlarge' }}
                    >
                      <SelectExistingInputsOrProvideNew
                        existingProvide={existingProvide}
                        onExistingProvideRadioChange={onExistingProvideRadioChange}
                        hasInputSets={!!inputSets?.length}
                      />
                      {showInputSetSelector() && (
                        <GitSyncStoreProvider>
                          <InputSetSelector
                            pipelineIdentifier={pipelineId}
                            onChange={inputsets => {
                              setSelectedInputSets(inputsets)
                            }}
                            value={selectedInputSets}
                            pipelineGitDetails={get(pipelineResponse, 'data.gitDetails')}
                            invalidInputSetReferences={invalidInputSetIds}
                            loadingMergeInputSets={loadingUpdate || loadingSingleInputSet}
                            isRetryPipelineForm={true}
                            onReconcile={onReconcile}
                          />
                        </GitSyncStoreProvider>
                      )}
                    </Layout.Vertical>
                  )}
                  {renderPipelineInputSetForm()}
                  {existingProvide === 'existing' && selectedInputSets && selectedInputSets?.length > 0 && (
                    <div className={css.noPipelineInputSetForm} />
                  )}
                </FormikForm>
              </div>
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
                    isEditModeSupported={canEdit}
                  />
                </Layout.Vertical>
              </div>
            )}

            <Layout.Horizontal
              margin={{ left: 'xlarge', right: 'xlarge', top: 'medium', bottom: 'medium' }}
              className={css.footerContainer}
            >
              <Checkbox
                label={getString('pre-flight-check.skipCheckBtn')}
                background={Color.GREY_100}
                color={skipPreFlightCheck ? Color.PRIMARY_8 : Color.BLACK}
                className={css.footerCheckbox}
                checked={skipPreFlightCheck}
                onChange={e => setSkipPreFlightCheck(e.currentTarget.checked)}
                disabled={isPipelineRemote}
              />
              <Tooltip position="top" content={getString('featureNA')}>
                <Checkbox
                  background={notifyOnlyMe ? Color.PRIMARY_2 : Color.GREY_100}
                  color={notifyOnlyMe ? Color.PRIMARY_7 : Color.BLACK}
                  className={css.footerCheckbox}
                  margin={{ left: 'medium' }}
                  disabled
                  label={getString('pipeline.runPipelineForm.notifyOnlyMe')}
                  checked={notifyOnlyMe}
                  onChange={e => setNotifyOnlyMe(e.currentTarget.checked)}
                />
              </Tooltip>
            </Layout.Horizontal>

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
                  text={getString('pipeline.execution.actions.reRun')}
                  onClick={event => {
                    event.stopPropagation()
                    setRetryClicked(true)
                    submitForm()
                  }}
                  featuresProps={getFeaturePropsForRunPipelineButton({ modules, getString })}
                  permission={{
                    resource: {
                      resourceIdentifier: pipeline?.identifier as string,
                      resourceType: ResourceType.PIPELINE
                    },
                    permission: PermissionIdentifier.EXECUTE_PIPELINE
                  }}
                  disabled={getRetryPipelineDisabledState()}
                  data-testid="retry-failed-pipeline"
                />
                <div className={css.secondaryButton}>
                  <Button
                    variation={ButtonVariation.SECONDARY}
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
              <SaveAsInputSet
                pipeline={pipeline}
                currentPipeline={currentPipeline}
                values={values}
                template={inputSetTemplateYaml}
                canEdit={canEdit}
                accountId={accountId}
                projectIdentifier={projectIdentifier}
                orgIdentifier={orgIdentifier}
                connectorRef={connectorRef}
                repoIdentifier={repoIdentifier || pipelineResponse?.data?.gitDetails?.repoName}
                branch={branch || pipelineResponse?.data?.gitDetails?.branch}
                storeType={storeType}
                isGitSyncEnabled={isGitSyncEnabled}
                supportingGitSimplification={supportingGitSimplification}
                setFormErrors={setFormErrors}
                refetchParentData={() => getInputSetsList()}
              />
            </Layout.Horizontal>
          </Layout.Vertical>
        )
      }}
    </Formik>
  )
}
export default RetryPipeline
