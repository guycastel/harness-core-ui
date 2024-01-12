/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect } from 'react'
import { get, isEmpty, pick, merge, map, isEqual, omit } from 'lodash-es'
import {
  AllowedTypes,
  AllowedTypesWithRunTime,
  IconName,
  MultiTypeInputType,
  VisualYamlSelectedView as SelectedView
} from '@harness/uicore'
import type { PermissionCheck } from 'services/rbac'
import type { YamlBuilderHandlerBinding } from '@common/interfaces/YAMLBuilderProps'
import {
  PipelineInfoConfig,
  StageElementConfig,
  StageElementWrapperConfig,
  CreatePipelineQueryParams,
  createPipelineV2Promise,
  EntityGitDetails,
  EntityValidityDetails,
  Failure,
  PutPipelineQueryParams,
  putPipelineV2Promise,
  GetPipelineQueryParams
} from 'services/pipeline-ng'
import { useReconcile, UseReconcileReturnType } from '@pipeline/hooks/useReconcile'
import { useGlobalEventListener, useLocalStorage } from '@common/hooks'
import { usePermission } from '@rbac/hooks/usePermission'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { yamlStringify } from '@common/utils/YamlHelperMethods'
import type { PipelineStageWrapper } from '@pipeline/utils/pipelineTypes'
import { getScopeFromDTO } from '@common/components/EntityReference/EntityReference'
import { Scope } from '@common/interfaces/SecretsInterface'
import { useDeleteStage, useDeleteStageReturnType } from '@pipeline/hooks/useDeleteStage'
import {
  extractGitBranchUsingTemplateRef,
  getResolvedCustomDeploymentDetailsByRef,
  getTemplateTypesByRef,
  TemplateServiceDataType
} from '@pipeline/utils/templateUtils'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import type { TemplateIcons } from '@pipeline/utils/types'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { GitQueryParams } from '@common/interfaces/RouteInterfaces'
import { useIDBContext } from '@modules/10-common/components/IDBContext/IDBContext'
import { useThunkReducer } from '@modules/10-common/hooks/useThunkReducer'
import { usePipelineLoaderContext } from '@pipeline/common/components/PipelineStudio/PipelineLoaderContext/PipelineLoaderContext'
import {
  initialState,
  PipelineContextActions,
  PipelineReducer,
  PipelineReducerState,
  PipelineViewData,
  PublicAccessResponseType,
  SelectionState
} from './PipelineActions'
import type { AbstractStepFactory } from '../../AbstractSteps/AbstractStepFactory'
import type { PipelineStagesProps } from '../../PipelineStages/PipelineStages'
import { PipelineSelectionState, usePipelineQuestParamState } from '../PipelineQueryParamState/usePipelineQueryParam'
import {
  getStageFromPipeline as _getStageFromPipeline,
  getStagePathFromPipeline as _getStagePathFromPipeline
} from './helpers'
import {
  deletePipelineCacheAction,
  fetchPipelineAction,
  FetchPipelineProps,
  processPipelineFromAPIAction,
  processPipelineFromCache,
  softFetchPipelineAction,
  updateEntityValidityDetailsAction,
  updateGitDetailsAction,
  updatePipelineAction,
  updatePipelineStoreMetadataAction,
  PipelinePayload,
  updatePipelineMetadataAction
} from './PipelineAsyncActions'

// TODO DUPLICATED
export function findAllByKey<T>(keyToFind: string, obj?: T): string[] {
  return obj
    ? Object.entries(obj).reduce(
        (acc: string[], [key, value]) =>
          key === keyToFind
            ? acc.concat(value as string)
            : typeof value === 'object'
            ? acc.concat(findAllByKey(keyToFind, value))
            : acc,
        []
      )
    : []
}

export enum PipelineContextType {
  Pipeline = 'Pipeline',
  StageTemplate = 'StageTemplate',
  PipelineTemplate = 'PipelineTemplate',
  Standalone = 'Standalone',
  StepGroupTemplate = 'StepGroupTemplate'
}

export interface UpdatePipelineMetaData {
  viewType?: SelectedView
  publicAccess?: PublicAccessResponseType
}
export interface PipelineContextInterface {
  state: PipelineReducerState
  /** return latest state from store. can we used after sync or async method call.
   * This should be used only if really needed. e.g. when current state is needed right after method call.
   *
   * ```
   * await updatePipeline()
   * const { pipeline } = getLatestState() // << pipeline  latest state
   * ```
   */
  getLatestState: () => PipelineReducerState
  stagesMap: StagesMap
  stepsFactory: AbstractStepFactory
  view: string
  contextType: string
  allowableTypes: AllowedTypes
  isReadonly: boolean
  scope: Scope
  setSchemaErrorView: (flag: boolean) => void
  setView: (view: SelectedView) => void
  renderPipelineStage: (args: Omit<PipelineStagesProps, 'children'>) => React.ReactElement<PipelineStagesProps>
  fetchPipeline: (args?: FetchPipelineProps) => Promise<void>
  setYamlHandler: (yamlHandler: YamlBuilderHandlerBinding) => void
  setTemplateTypes: (data: { [key: string]: string }) => void
  setTemplateIcons: (data: TemplateIcons) => void
  setTemplateServiceData: (data: TemplateServiceDataType) => void
  updatePipeline: (pipeline: PipelineInfoConfig, metadata?: UpdatePipelineMetaData) => Promise<void>
  updatePipelineMetadata: (metadata?: UpdatePipelineMetaData) => Promise<void>
  updatePipelineStoreMetadata: (
    storeMetadata: StoreMetadata,
    gitDetails: EntityGitDetails,
    latestPipeline?: PipelineInfoConfig
  ) => Promise<void>
  updateGitDetails: (gitDetails: EntityGitDetails, latestPipeline?: PipelineInfoConfig) => Promise<void>
  updateEntityValidityDetails: (entityValidityDetails: EntityValidityDetails) => Promise<void>
  updatePipelineView: (data: PipelineViewData) => void
  deletePipelineCache: (gitDetails?: EntityGitDetails) => Promise<void>
  getStageFromPipeline<T extends StageElementConfig = StageElementConfig>(
    stageId: string,
    pipeline?: PipelineInfoConfig | StageElementWrapperConfig
  ): PipelineStageWrapper<T>
  runPipeline: (identifier: string) => void
  updateStage: (stage: StageElementConfig) => Promise<void>
  /** @deprecated use `setSelection` */
  setSelectedStageId: (selectedStageId: string | undefined) => void
  /** @deprecated use `setSelection` */
  setSelectedStepId: (selectedStepId: string | undefined) => void
  /** @deprecated use `setSelection` */
  setSelectedSectionId: (selectedSectionId: string | undefined, replaceHistory?: boolean) => void
  setSelection: (selectionState: PipelineSelectionState) => void
  getStagePathFromPipeline(stageId: string, prefix?: string, pipeline?: PipelineInfoConfig): string
  /** Useful for setting any intermittent loading state. Eg. any API call loading, any custom loading, etc */
  setIntermittentLoading: (isIntermittentLoading: boolean) => void
  setValidationUuid: (uuid: string) => void
  setPublicAccessResponse: (publicAccessResponse: PublicAccessResponseType) => void
  deleteStage?: useDeleteStageReturnType['deleteStage']
  reconcile: UseReconcileReturnType
}

export const PipelineContext = React.createContext<PipelineContextInterface>({
  state: initialState,
  getLatestState: () => ({} as PipelineReducerState),
  stepsFactory: {} as AbstractStepFactory,
  stagesMap: {},
  setSchemaErrorView: () => undefined,
  isReadonly: false,
  scope: Scope.PROJECT,
  view: SelectedView.VISUAL,
  contextType: PipelineContextType.Pipeline,
  allowableTypes: [],
  updatePipelineStoreMetadata: () => new Promise<void>(() => undefined),
  updateGitDetails: () => new Promise<void>(() => undefined),
  updateEntityValidityDetails: () => new Promise<void>(() => undefined),
  setView: () => void 0,
  runPipeline: () => undefined,
  // eslint-disable-next-line react/display-name
  renderPipelineStage: () => <div />,
  fetchPipeline: () => Promise.resolve(undefined),
  updatePipelineView: () => undefined,
  updateStage: () => new Promise<void>(() => undefined),
  getStageFromPipeline: () => ({ stage: undefined, parent: undefined }),
  setYamlHandler: () => undefined,
  setTemplateTypes: () => undefined,
  setTemplateIcons: () => undefined,
  setTemplateServiceData: () => undefined,
  updatePipeline: () => new Promise<void>(() => undefined),
  updatePipelineMetadata: () => new Promise<void>(() => undefined),
  deletePipelineCache: () => new Promise<void>(() => undefined),
  setSelectedStageId: (_selectedStageId: string | undefined) => undefined,
  setSelectedStepId: (_selectedStepId: string | undefined) => undefined,
  setSelectedSectionId: (_selectedSectionId: string | undefined) => undefined,
  setSelection: (_selectedState: PipelineSelectionState | undefined) => undefined,
  getStagePathFromPipeline: () => '',
  setIntermittentLoading: () => undefined,
  setValidationUuid: () => undefined,
  setPublicAccessResponse: () => undefined,
  deleteStage: (_stageId: string) => undefined,
  reconcile: {} as UseReconcileReturnType
})

export interface PipelineProviderProps {
  queryParams: GetPipelineQueryParams & GitQueryParams
  pipelineIdentifier: string
  stepsFactory: AbstractStepFactory
  stagesMap: StagesMap
  runPipeline: (identifier: string) => void
  renderPipelineStage: PipelineContextInterface['renderPipelineStage']
}

export function PipelineProvider({
  queryParams,
  pipelineIdentifier,
  children,
  renderPipelineStage,
  stepsFactory,
  stagesMap,
  runPipeline
}: React.PropsWithChildren<PipelineProviderProps>): React.ReactElement {
  const { idb } = useIDBContext<PipelinePayload>()
  const { apiData, pipelineFromDB, fetchingPipeline } = usePipelineLoaderContext()

  const [state, dispatch, getLatestState] = useThunkReducer(
    PipelineReducer,
    merge(
      {
        pipeline: {
          projectIdentifier: queryParams.projectIdentifier,
          orgIdentifier: queryParams.orgIdentifier
        },
        originalPipeline: {
          projectIdentifier: queryParams.projectIdentifier,
          orgIdentifier: queryParams.orgIdentifier
        }
      },
      { ...initialState, pipeline: { ...initialState.pipeline, identifier: pipelineIdentifier } }
    )
  )

  // make query params available in pipeline store
  useEffect(() => {
    dispatch(
      PipelineContextActions.setRouteStateParams({
        routeState: { ...queryParams, pipelineIdentifier },
        pipelineIdentifier: pipelineIdentifier
      })
    )
  }, [queryParams, pipelineIdentifier, dispatch])

  const contextType = PipelineContextType.Pipeline

  const allowableTypes: AllowedTypesWithRunTime[] = [
    MultiTypeInputType.FIXED,
    MultiTypeInputType.RUNTIME,
    MultiTypeInputType.EXPRESSION
  ]

  const { supportingTemplatesGitx } = useAppStore()

  const [view, setView] = useLocalStorage<SelectedView>(
    'pipeline_studio_view',
    state.entityValidityDetails.valid === false ? SelectedView.YAML : SelectedView.VISUAL
  )

  const fetchPipeline = useCallback(
    async (params: FetchPipelineProps = {}) => {
      return dispatch(
        fetchPipelineAction(params, {
          supportingTemplatesGitx: supportingTemplatesGitx ?? false,
          idb
        })
      )
    },
    [dispatch, supportingTemplatesGitx, idb]
  )

  const updatePipelineStoreMetadata = useCallback(
    async (storeMetadata: StoreMetadata, gitDetails: EntityGitDetails) => {
      return dispatch(updatePipelineStoreMetadataAction({ storeMetadata, gitDetails, idb }))
    },
    [dispatch, idb]
  )

  const updateGitDetails = useCallback(
    async (gitDetails: EntityGitDetails) => {
      return dispatch(updateGitDetailsAction({ gitDetails, idb }))
    },
    [dispatch, idb]
  )

  const updateEntityValidityDetails = useCallback(
    async (entityValidityDetails: EntityValidityDetails) => {
      return dispatch(updateEntityValidityDetailsAction({ entityValidityDetails, idb }))
    },
    [dispatch, idb]
  )

  const updatePipeline = useCallback(
    async (pipelineArg: PipelineInfoConfig | ((p: PipelineInfoConfig) => PipelineInfoConfig)) => {
      return dispatch(updatePipelineAction({ pipelineArg, idb }))
    },
    [dispatch, idb]
  )

  const updatePipelineMetadata = useCallback(
    async (pipelineMetadata?: UpdatePipelineMetaData) => {
      return dispatch(updatePipelineMetadataAction({ pipelineMetadata, idb }))
    },
    [dispatch, idb]
  )

  const [isEdit] = usePermission(
    {
      resourceScope: {
        accountIdentifier: state.routeState.accountIdentifier,
        orgIdentifier: state.routeState.orgIdentifier,
        projectIdentifier: state.routeState.projectIdentifier
      },
      resource: {
        resourceType: ResourceType.PIPELINE,
        resourceIdentifier: pipelineIdentifier
      },
      permissions: [PermissionIdentifier.EDIT_PIPELINE],
      options: {
        skipCache: true,
        skipCondition: (permissionCheck: PermissionCheck) => {
          return permissionCheck.resourceIdentifier === '-1'
        }
      }
    },
    [
      state.routeState.accountIdentifier,
      state.routeState.orgIdentifier,
      state.routeState.projectIdentifier,
      pipelineIdentifier
    ]
  )
  const scope = getScopeFromDTO(state.routeState)

  const isReadonly = !isEdit

  const deletePipelineCache = useCallback(
    async (gitDetails?: EntityGitDetails): Promise<void> => {
      return dispatch(deletePipelineCacheAction({ gitDetails, idb }))
    },
    [dispatch, idb]
  )

  const setYamlHandler = React.useCallback((yamlHandler: YamlBuilderHandlerBinding) => {
    dispatch(PipelineContextActions.setYamlHandler({ yamlHandler }))
  }, [])

  const updatePipelineView = React.useCallback((data: PipelineViewData) => {
    dispatch(PipelineContextActions.updatePipelineView({ pipelineView: data }))
  }, [])

  // stage/step selection
  const queryParamStateSelection = usePipelineQuestParamState()
  const setSelection = (selectedState: PipelineSelectionState): void => {
    queryParamStateSelection.setPipelineQuestParamState(selectedState)
  }
  /** @deprecated use `setSelection` */
  const setSelectedStageId = (selectedStageId: string | undefined): void => {
    queryParamStateSelection.setPipelineQuestParamState({ stageId: selectedStageId })
  }
  /** @deprecated use `setSelection` */
  const setSelectedStepId = (selectedStepId: string | undefined): void => {
    queryParamStateSelection.setPipelineQuestParamState({ stepId: selectedStepId })
  }
  /** @deprecated use `setSelection` */
  const setSelectedSectionId = (selectedSectionId: string | undefined, replaceHistory?: boolean): void => {
    queryParamStateSelection.setPipelineQuestParamState({ sectionId: selectedSectionId }, replaceHistory)
  }

  const updateSelectionState = React.useCallback((data: SelectionState) => {
    dispatch(PipelineContextActions.updateSelectionState({ selectionState: data }))
  }, [])

  React.useEffect(() => {
    updateSelectionState({
      selectedStageId: queryParamStateSelection.stageId as string,
      selectedStepId: queryParamStateSelection.stepId as string,
      selectedSectionId: queryParamStateSelection.sectionId as string
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParamStateSelection.stepId, queryParamStateSelection.stageId, queryParamStateSelection.sectionId])

  React.useEffect(() => {
    if (state.storeMetadata?.storeType === StoreType.REMOTE && isEmpty(state.storeMetadata?.connectorRef)) {
      return
    }

    const templateGitBranch = getStageFromPipeline(state.selectionState?.selectedStageId as string)?.stage?.stage
      ?.template?.gitBranch
    const getBranchForSelectedStage = () => {
      return templateGitBranch ? templateGitBranch : state?.gitDetails?.branch
    }

    const templateRefs = findAllByKey('templateRef', state.pipeline).filter(templateRef =>
      isEmpty(get(state.templateTypes, templateRef))
    )
    const templateGitBranches = extractGitBranchUsingTemplateRef(state.pipeline, '')
    getTemplateTypesByRef(
      {
        // pipelineIdentifier is not needed to get template as templates are independent entity
        // pipelineIdentifier is not there in params: GetTemplateListQueryParams | GetTemplateQueryParams,
        ...omit(state.routeState, 'pipelineIdentifier'),
        templateListType: 'Stable',
        repoIdentifier: state.gitDetails?.repoIdentifier,
        branch: getBranchForSelectedStage(),
        getDefaultFromOtherRepo: true
      },
      templateRefs,
      state.storeMetadata,
      supportingTemplatesGitx,
      true,
      templateGitBranches
    ).then(({ templateTypes, templateServiceData, templateIcons }) => {
      setTemplateTypes(merge(state.templateTypes, templateTypes))
      setTemplateIcons({ ...merge(state.templateIcons, templateIcons) })
      setTemplateServiceData(merge(state.templateServiceData, templateServiceData))
    })

    const unresolvedCustomDeploymentRefs = map(
      findAllByKey('customDeploymentRef', state.pipeline),
      'templateRef'
    )?.filter(customDeploymentRef => isEmpty(get(state.resolvedCustomDeploymentDetailsByRef, customDeploymentRef)))

    getResolvedCustomDeploymentDetailsByRef(
      {
        ...state.routeState,
        templateListType: 'Stable',
        repoIdentifier: state.gitDetails?.repoIdentifier,
        branch: state.gitDetails?.branch,
        getDefaultFromOtherRepo: true
      },
      unresolvedCustomDeploymentRefs
    ).then(({ resolvedCustomDeploymentDetailsByRef }) => {
      setResolvedCustomDeploymentDetailsByRef(
        merge(state.resolvedCustomDeploymentDetailsByRef, resolvedCustomDeploymentDetailsByRef)
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pipeline, state.storeMetadata])

  const getStageFromPipeline = React.useCallback(
    <T extends StageElementConfig = StageElementConfig>(
      stageId: string,
      pipeline?: PipelineInfoConfig
    ): PipelineStageWrapper<T> => {
      const localPipeline = pipeline || state.pipeline
      return _getStageFromPipeline(stageId, localPipeline)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.pipeline, state.pipeline?.stages]
  )

  const getStagePathFromPipeline = React.useCallback(
    (stageId: string, prefix = '', pipeline?: PipelineInfoConfig) => {
      const localPipeline = pipeline || state.pipeline
      return _getStagePathFromPipeline(stageId, prefix, localPipeline)
    },
    [state.pipeline, state.pipeline?.stages]
  )

  const setTemplateTypes = React.useCallback(templateTypes => {
    dispatch(PipelineContextActions.setTemplateTypes({ templateTypes }))
  }, [])

  const setTemplateIcons = React.useCallback(templateIcons => {
    dispatch(PipelineContextActions.setTemplateIcons({ templateIcons }))
  }, [])

  const setTemplateServiceData = React.useCallback(templateServiceData => {
    dispatch(PipelineContextActions.setTemplateServiceData({ templateServiceData }))
  }, [])

  const setResolvedCustomDeploymentDetailsByRef = React.useCallback(resolvedCustomDeploymentDetailsByRef => {
    dispatch(PipelineContextActions.setResolvedCustomDeploymentDetailsByRef({ resolvedCustomDeploymentDetailsByRef }))
  }, [])

  const setSchemaErrorView = React.useCallback(flag => {
    dispatch(PipelineContextActions.updateSchemaErrorsFlag({ schemaErrors: flag }))
  }, [])

  const setIntermittentLoading = React.useCallback((isIntermittentLoading: boolean) => {
    dispatch(PipelineContextActions.setIntermittentLoading({ isIntermittentLoading }))
  }, [])

  const setValidationUuid = React.useCallback((uuid: string) => {
    dispatch(PipelineContextActions.setValidationUuid({ validationUuid: uuid }))
  }, [])

  const setPublicAccessResponse = React.useCallback(
    (publicAccessResponse: PublicAccessResponseType) => {
      const isMetadataUpdated = !isEqual(
        state.pipelineMetadataConfig?.originalMetadata?.publicAccessResponse,
        publicAccessResponse
      )
      dispatch(
        PipelineContextActions.setPublicAccessResponse({
          publicAccessResponse,
          isMetadataUpdated
        })
      )
    },
    [state.pipelineMetadataConfig?.originalMetadata?.publicAccessResponse]
  )

  const updateStage = React.useCallback(
    async (newStage: StageElementConfig) => {
      function _updateStages(stages: StageElementWrapperConfig[]): StageElementWrapperConfig[] {
        return stages.map(node => {
          if (node.stage?.identifier === newStage.identifier) {
            // This omitBy condition is required to remove any pseudo fields used in the stage
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

  const { deleteStage } = useDeleteStage(state.pipeline, getStageFromPipeline, updatePipeline)

  const softFetchPipeline = useCallback(async (): Promise<void> => {
    return dispatch(softFetchPipelineAction({ idb }))
  }, [dispatch, idb])

  useGlobalEventListener('focus', () => {
    softFetchPipeline()
  })

  React.useEffect(() => {
    if (apiData && apiData.pipeline && apiData.pipelineMetadata) {
      dispatch(
        processPipelineFromAPIAction(
          apiData.pipeline,
          apiData.pipelineMetadata,
          {},
          {
            supportingTemplatesGitx: supportingTemplatesGitx ?? false,
            idb,
            initialLoading: true
          }
        )
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiData])

  React.useEffect(() => {
    if (pipelineFromDB) {
      dispatch(processPipelineFromCache(pipelineFromDB as PipelinePayload))
    }
  }, [pipelineFromDB, dispatch])

  React.useEffect(() => {
    if (fetchingPipeline === true) {
      dispatch(PipelineContextActions.fetching())
    }
  }, [fetchingPipeline, dispatch])

  return (
    <PipelineContext.Provider
      value={{
        state,
        getLatestState,
        view,
        contextType,
        allowableTypes,
        setView,
        runPipeline,
        stepsFactory,
        setSchemaErrorView,
        stagesMap,
        getStageFromPipeline,
        renderPipelineStage,
        fetchPipeline,
        updatePipelineStoreMetadata,
        updateGitDetails,
        updateEntityValidityDetails,
        updatePipeline,
        updatePipelineMetadata,
        updateStage,
        updatePipelineView,
        deletePipelineCache,
        isReadonly,
        scope,
        setYamlHandler,
        setSelectedStageId,
        setSelectedStepId,
        setSelectedSectionId,
        setSelection,
        getStagePathFromPipeline,
        setTemplateTypes,
        setTemplateIcons,
        setTemplateServiceData,
        setIntermittentLoading,
        setValidationUuid,
        setPublicAccessResponse,
        deleteStage,
        reconcile: useReconcile({ storeMetadata: state.storeMetadata })
      }}
    >
      {children}
    </PipelineContext.Provider>
  )
}

export function usePipelineContext(): PipelineContextInterface {
  // disabling this because this the definition of usePipelineContext
  // eslint-disable-next-line no-restricted-syntax
  return React.useContext(PipelineContext)
}

export const savePipeline = (
  params: CreatePipelineQueryParams & PutPipelineQueryParams & { public?: boolean },
  pipeline: PipelineInfoConfig,
  pipelineIdentifier: string,
  isEdit = false
): Promise<Failure | undefined> => {
  const body = yamlStringify({
    pipeline: { ...pipeline, ...pick(params, 'projectIdentifier', 'orgIdentifier') }
  })

  return isEdit
    ? putPipelineV2Promise({
        pipelineIdentifier,
        queryParams: {
          ...params
        },
        body: body as any,
        requestOptions: { headers: { 'Content-Type': 'application/yaml' } }
      })
        .then((response: unknown) => {
          if (typeof response === 'string') {
            return JSON.parse(response) as Failure
          } else {
            return response
          }
        })
        .catch(err => {
          return err
        })
    : createPipelineV2Promise({
        body: body as any,
        queryParams: {
          ...params
        },
        requestOptions: { headers: { 'Content-Type': 'application/yaml' } }
      })
        .then(async (response: unknown) => {
          if (typeof response === 'string') {
            return JSON.parse(response as unknown as string) as Failure
          } else {
            return response as unknown as Failure
          }
        })
        .catch(err => {
          return err
        })
}

export interface StageAttributes {
  name: string
  type: string
  icon: IconName
  iconColor: string
  isApproval: boolean
  openExecutionStrategy: boolean
}

export interface StagesMap {
  [key: string]: StageAttributes
}
