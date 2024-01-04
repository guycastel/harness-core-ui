/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { cloneDeep, isEqual, noop } from 'lodash-es'
import { AllowedTypesWithRunTime, MultiTypeInputType, VisualYamlSelectedView as SelectedView } from '@harness/uicore'
import {
  findAllByKey,
  PipelineContext,
  PipelineContextInterface,
  PipelineContextType
} from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { extractGitBranchUsingTemplateRef, getTemplateTypesByRef } from '@pipeline/utils/templateUtils'
import {
  DefaultPipeline,
  initialState,
  PipelineContextActions,
  PipelineReducer,
  PipelineReducerState,
  PipelineViewData
} from '@pipeline/components/PipelineStudio/PipelineContext/PipelineActions'
import { useLocalStorage } from '@common/hooks'
import factory from '@pipeline/components/PipelineSteps/PipelineStepFactory'
import { stagesCollection } from '@pipeline/components/PipelineStudio/Stages/StagesCollection'
import { useStrings } from 'framework/strings'
import type { PipelineStageWrapper } from '@pipeline/utils/pipelineTypes'
import {
  getStageFromPipeline as _getStageFromPipeline,
  getStagePathFromPipeline as _getStagePathFromPipeline
} from '@pipeline/components/PipelineStudio/PipelineContext/helpers'
import type {
  PipelineInfoConfig,
  StageElementConfig,
  StageElementWrapperConfig,
  GetPipelineQueryParams
} from 'services/pipeline-ng'
import type { PipelineSelectionState } from '@pipeline/components/PipelineStudio/PipelineQueryParamState/usePipelineQueryParam'
import { getScopeFromDTO } from '@common/components/EntityReference/EntityReference'
import type { EntityGitDetails } from 'services/template-ng'
import type { StoreMetadata } from '@common/constants/GitSyncTypes'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { RefetchReturnType } from '@pipeline/hooks/useReconcile'

export interface TemplatePipelineProviderProps {
  queryParams: GetPipelineQueryParams
  initialValue: PipelineInfoConfig
  gitDetails: EntityGitDetails
  storeMetadata?: StoreMetadata
  onUpdatePipeline: (pipeline: PipelineInfoConfig) => void
  contextType: PipelineContextType
  isReadOnly: boolean
  renderPipelineStage?: PipelineContextInterface['renderPipelineStage']
  setIntermittentLoading: PipelineContextInterface['setIntermittentLoading']
}

export function TemplatePipelineProvider({
  queryParams,
  initialValue,
  gitDetails,
  storeMetadata,
  onUpdatePipeline,
  isReadOnly,
  contextType,
  renderPipelineStage,
  children,
  setIntermittentLoading: setTemplateIntermittentLoading
}: React.PropsWithChildren<TemplatePipelineProviderProps>): React.ReactElement {
  const allowableTypes: AllowedTypesWithRunTime[] = [
    MultiTypeInputType.FIXED,
    MultiTypeInputType.RUNTIME,
    MultiTypeInputType.EXPRESSION
  ]
  const { getString } = useStrings()
  const [state, dispatch] = React.useReducer(PipelineReducer, initialState)
  const [view, setView] = useLocalStorage<SelectedView>('pipeline_studio_view', SelectedView.VISUAL)
  const setSchemaErrorView = React.useCallback(flag => {
    dispatch(PipelineContextActions.updateSchemaErrorsFlag({ schemaErrors: flag }))
  }, [])
  const { supportingTemplatesGitx } = useAppStore()
  const getStageFromPipeline = React.useCallback(
    <T extends StageElementConfig = StageElementConfig>(
      stageId: string,
      pipeline?: PipelineInfoConfig
    ): PipelineStageWrapper<T> => {
      return _getStageFromPipeline(stageId, pipeline || state.pipeline)
    },
    [state.pipeline, state.pipeline?.stages]
  )

  const updatePipeline = async (pipelineArg: PipelineInfoConfig | ((p: PipelineInfoConfig) => PipelineInfoConfig)) => {
    let pipeline = pipelineArg
    if (typeof pipelineArg === 'function') {
      if (state.pipeline) {
        pipeline = pipelineArg(state.pipeline)
      } else {
        pipeline = {} as PipelineInfoConfig
      }
    }
    const isUpdated = !isEqual(state.originalPipeline, pipeline)
    await dispatch(PipelineContextActions.success({ error: '', pipeline: pipeline as PipelineInfoConfig, isUpdated }))
    onUpdatePipeline?.(pipeline as PipelineInfoConfig)
  }

  const updateStage = React.useCallback(
    async (newStage: StageElementConfig) => {
      function _updateStages(stages: StageElementWrapperConfig[]): StageElementWrapperConfig[] {
        return stages.map(node => {
          if (node.stage?.identifier === newStage.identifier) {
            return { stage: newStage }
          } else if (node.parallel) {
            return {
              parallel: _updateStages(node.parallel)
            }
          }

          return node
        })
      }

      return updatePipeline(originalPipeline => ({
        ...originalPipeline,
        stages: _updateStages(originalPipeline.stages || [])
      }))
    },
    [updatePipeline]
  )

  const updatePipelineView = React.useCallback((data: PipelineViewData) => {
    dispatch(PipelineContextActions.updatePipelineView({ pipelineView: data }))
  }, [])

  const fetchPipeline = async (): Promise<void> => {
    const originalPipeline = isEqual(state.originalPipeline, DefaultPipeline)
      ? cloneDeep(initialValue)
      : state.originalPipeline
    dispatch(
      PipelineContextActions.success({
        error: '',
        pipeline: initialValue,
        originalPipeline,
        isBEPipelineUpdated: false,
        isUpdated: !isEqual(originalPipeline, initialValue),
        gitDetails,
        storeMetadata
      })
    )

    const getBranchForSelectedStage = () => {
      return getStageFromPipeline(state.selectionState?.selectedStageId as string)?.stage?.stage?.template?.gitBranch
        ? getStageFromPipeline(state.selectionState?.selectedStageId as string)?.stage?.stage?.template?.gitBranch
        : state?.gitDetails?.branch
    }

    const templateRefs = findAllByKey('templateRef', initialValue)
    const templateGitBranches = extractGitBranchUsingTemplateRef(initialValue, '')
    if (templateRefs.length > 0) {
      const { templateTypes, templateServiceData, templateIcons } = await getTemplateTypesByRef(
        {
          accountIdentifier: queryParams.accountIdentifier,
          orgIdentifier: queryParams.orgIdentifier,
          projectIdentifier: queryParams.projectIdentifier,
          templateListType: 'Stable',
          repoIdentifier: gitDetails?.repoIdentifier,
          branch: getBranchForSelectedStage(),
          getDefaultFromOtherRepo: true
        },
        templateRefs,
        storeMetadata,
        supportingTemplatesGitx,
        true,
        templateGitBranches
      )
      dispatch(
        PipelineContextActions.setTemplateTypes({
          templateTypes
        })
      )
      dispatch(
        PipelineContextActions.setTemplateServiceData({
          templateServiceData
        })
      )
      dispatch(
        PipelineContextActions.setTemplateIcons({
          templateIcons
        })
      )
    }
    dispatch(PipelineContextActions.initialized())
  }

  const setSelection = (selectedState: PipelineSelectionState) => {
    dispatch(
      PipelineContextActions.updateSelectionState({
        selectionState: {
          selectedStageId: selectedState.stageId as string,
          selectedStepId: selectedState.stepId as string,
          selectedSectionId: selectedState.sectionId as string
        }
      })
    )
  }

  const setIntermittentLoading = React.useCallback(
    isIntermittentLoading => {
      setTemplateIntermittentLoading(isIntermittentLoading)
      dispatch(PipelineContextActions.setIntermittentLoading({ isIntermittentLoading }))
    },
    [setTemplateIntermittentLoading]
  )

  const getStagePathFromPipeline = React.useCallback(
    (stageId: string, prefix = '', pipeline?: PipelineInfoConfig) => {
      const localPipeline = pipeline || state.pipeline
      return _getStagePathFromPipeline(stageId, prefix, localPipeline)
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.pipeline, state.pipeline?.stages]
  )

  const scope = getScopeFromDTO(queryParams)

  React.useEffect(() => {
    fetchPipeline()
  }, [initialValue, gitDetails])

  return (
    <PipelineContext.Provider
      value={{
        state,
        view,
        contextType,
        allowableTypes,
        setView,
        scope,
        runPipeline: noop,
        stepsFactory: factory,
        setSchemaErrorView,
        stagesMap: stagesCollection.getAllStagesAttributes(getString),
        getStageFromPipeline,
        renderPipelineStage: renderPipelineStage || (() => <></>),
        fetchPipeline: Promise.resolve,
        updateGitDetails: Promise.resolve,
        updatePipelineStoreMetadata: Promise.resolve,
        updateEntityValidityDetails: Promise.resolve,
        updatePipeline,
        updatePipelineMetadata: () => Promise.resolve(),
        updateStage,
        updatePipelineView,
        deletePipelineCache: Promise.resolve,
        isReadonly: isReadOnly,
        setYamlHandler: noop,
        setSelectedStageId: noop,
        setSelectedStepId: noop,
        setSelectedSectionId: noop,
        setSelection,
        getStagePathFromPipeline,
        setTemplateTypes: noop,
        setTemplateIcons: noop,
        setTemplateServiceData: noop,
        setIntermittentLoading,
        setValidationUuid: noop,
        setPublicAccessResponse: noop,
        reconcile: {
          isFetchingReconcileData: false,
          outOfSync: false,
          reconcileData: undefined,
          reconcileError: null,
          setOutOfSync: noop,
          reconcilePipeline: (_showToast?: boolean) => Promise.resolve({}) as RefetchReturnType
        },
        getLatestState: () => ({} as PipelineReducerState)
      }}
    >
      {children}
    </PipelineContext.Provider>
  )
}
