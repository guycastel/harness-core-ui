/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect } from 'react'
import { get, isEmpty, merge, map, omit } from 'lodash-es'
import {
  // AllowedTypes,
  // AllowedTypesWithRunTime,
  IconName,
  // MultiTypeInputType,
  VisualYamlSelectedView as SelectedView
} from '@harness/uicore'
import {
  createPipeline as createPipelinePromise,
  PipelineUpdateRequestBody,
  updatePipeline as updatePipelinePromise
} from '@harnessio/react-pipeline-service-client'
import type { PermissionCheck } from 'services/rbac'
import type { YamlBuilderHandlerBinding } from '@common/interfaces/YAMLBuilderProps'
import {
  PipelineInfoConfig,
  StageElementConfig,
  // StageElementWrapperConfig,
  CreatePipelineQueryParams,
  EntityGitDetails,
  EntityValidityDetails,
  Failure,
  PutPipelineQueryParams,
  GetPipelineQueryParams
} from 'services/pipeline-ng'
import { useReconcile, UseReconcileReturnType } from '@pipeline/hooks/useReconcile'
import { useGlobalEventListener, useLocalStorage } from '@common/hooks'
import { usePermission } from '@rbac/hooks/usePermission'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { yamlStringify } from '@common/utils/YamlHelperMethods'
import type { PipelineStageWrapper } from '@pipeline/utils/pipelineTypes'
// import { getScopeFromDTO } from '@common/components/EntityReference/EntityReference'
// import { Scope } from '@common/interfaces/SecretsInterface'
// import { useDeleteStage, useDeleteStageReturnType } from '@pipeline/hooks/useDeleteStage'
import {
  extractGitBranchUsingTemplateRef,
  getResolvedCustomDeploymentDetailsByRef,
  getTemplateTypesByRef
  // TemplateServiceDataType
} from '@pipeline/utils/templateUtils'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
// import type { TemplateIcons } from '@pipeline/utils/types'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { GitQueryParams } from '@common/interfaces/RouteInterfaces'
import { useIDBContext } from '@modules/10-common/components/IDBContext/IDBContext'
import { usePipelineLoaderContext } from '@pipeline/common/components/PipelineStudio/PipelineLoaderContext/PipelineLoaderContext'
import { useThunkReducer } from '@modules/10-common/hooks/useThunkReducer'
import {
  PipelineSelectionState,
  usePipelineQuestParamState
} from '@pipeline/components/PipelineStudio/PipelineQueryParamState/usePipelineQueryParam'
import { AbstractStepFactory } from '@pipeline/components/AbstractSteps/AbstractStepFactory'
import { PipelineStagesProps } from '@pipeline/components/PipelineStages/PipelineStages'
import { useDeleteStageReturnType } from '@pipeline/hooks/useDeleteStage'
import { PipelinePayload } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineAsyncActions'
import {
  initialState,
  PipelineContextActionsY1,
  PipelineMetadata,
  PipelineReducer,
  PipelineReducerStateY1,
  PipelineViewDataY1,
  SelectionStateY1
} from './PipelineActionsY1'

import {
  getStageFromPipeline as _getStageFromPipeline
  // getStagePathFromPipeline as _getStagePathFromPipeline
} from './helpersY1'
import {
  deletePipelineCacheAction,
  fetchPipelineAction,
  FetchPipelineProps,
  findAllByKey,
  pipelineMetadataKeys,
  PipelinePayloadY1,
  processPipelineFromAPIAction,
  processPipelineFromCache,
  softFetchPipelineAction,
  updateEntityValidityDetailsAction,
  updateGitDetailsAction,
  updatePipelineAction,
  updatePipelineStoreMetadataAction
} from './PipelineAsyncActionsY1'

export enum PipelineContextType {
  Pipeline = 'Pipeline',
  StageTemplate = 'StageTemplate',
  PipelineTemplate = 'PipelineTemplate',
  Standalone = 'Standalone',
  StepGroupTemplate = 'StepGroupTemplate'
}

export interface PipelineContextInterfaceY1 {
  state: PipelineReducerStateY1
  /** return latest state from store. can we used after sync or async method call.
   * This should be used only if really needed. e.g. when current state is needed right after method call.
   *
   * ```
   * await updatePipeline()
   * const { pipeline } = getLatestState() // << pipeline  latest state
   * ```
   */
  getLatestState: () => PipelineReducerStateY1
  //stagesMap: StagesMap
  stepsFactory: AbstractStepFactory
  view: string
  //contextType: string
  // allowableTypes: AllowedTypes
  isReadonly: boolean
  //scope: Scope
  setSchemaErrorView: (flag: boolean) => void
  setView: (view: SelectedView) => void
  renderPipelineStage: (args: Omit<PipelineStagesProps, 'children'>) => React.ReactElement<PipelineStagesProps>
  fetchPipeline: (args?: FetchPipelineProps) => void
  setYamlHandler: (yamlHandler: YamlBuilderHandlerBinding) => void
  // setTemplateTypes: (data: { [key: string]: string }) => void
  // setTemplateIcons: (data: TemplateIcons) => void
  // setTemplateServiceData: (data: TemplateServiceDataType) => void
  updatePipeline: (pipeline: PipelineInfoConfig, viewType?: SelectedView) => Promise<void>
  updatePipelineStoreMetadata: (
    storeMetadata: StoreMetadata,
    gitDetails: EntityGitDetails,
    latestPipeline?: PipelineInfoConfig
  ) => Promise<void>
  updateGitDetails: (gitDetails: EntityGitDetails, latestPipeline?: PipelineInfoConfig) => Promise<void>
  updateEntityValidityDetails: (entityValidityDetails: EntityValidityDetails) => Promise<void>
  updatePipelineView: (data: PipelineViewDataY1) => void
  deletePipelineCache: (gitDetails?: EntityGitDetails) => Promise<void>
  // getStageFromPipeline<T extends StageElementConfig = StageElementConfig>(
  //   stageId: string,
  //   pipeline?: PipelineInfoConfig | StageElementWrapperConfig
  // ): PipelineStageWrapper<T>
  //runPipeline: (identifier: string) => void
  //updateStage: (stage: StageElementConfig) => Promise<void>
  /** @deprecated use `setSelection` */
  // setSelectedStageId: (selectedStageId: string | undefined) => void
  // /** @deprecated use `setSelection` */
  // setSelectedStepId: (selectedStepId: string | undefined) => void
  // /** @deprecated use `setSelection` */
  // setSelectedSectionId: (selectedSectionId: string | undefined) => void
  setSelection: (selectionState: PipelineSelectionState) => void
  //getStagePathFromPipeline(stageId: string, prefix?: string, pipeline?: PipelineInfoConfig): string
  /** Useful for setting any intermittent loading state. Eg. any API call loading, any custom loading, etc */
  //setIntermittentLoading: (isIntermittentLoading: boolean) => void
  //setValidationUuid: (uuid: string) => void
  deleteStage?: useDeleteStageReturnType['deleteStage']
  reconcile: UseReconcileReturnType
}

export const PipelineContextY1 = React.createContext<PipelineContextInterfaceY1>({
  state: initialState,
  getLatestState: () => ({} as PipelineReducerStateY1),
  stepsFactory: {} as AbstractStepFactory,
  //stagesMap: {},
  setSchemaErrorView: () => undefined,
  isReadonly: false,
  //scope: Scope.PROJECT,
  view: SelectedView.VISUAL,
  //contextType: PipelineContextType.Pipeline,
  // allowableTypes: [],
  updatePipelineStoreMetadata: () => new Promise<void>(() => undefined),
  updateGitDetails: () => new Promise<void>(() => undefined),
  updateEntityValidityDetails: () => new Promise<void>(() => undefined),
  setView: () => void 0,
  //runPipeline: () => undefined,
  // eslint-disable-next-line react/display-name
  renderPipelineStage: () => <div />,
  fetchPipeline: () => new Promise<void>(() => undefined),
  updatePipelineView: () => undefined,
  //updateStage: () => new Promise<void>(() => undefined),
  //getStageFromPipeline: () => ({ stage: undefined, parent: undefined }),
  setYamlHandler: () => undefined,
  //setTemplateTypes: () => undefined,
  //setTemplateIcons: () => undefined,
  //setTemplateServiceData: () => undefined,
  updatePipeline: () => new Promise<void>(() => undefined),
  deletePipelineCache: () => new Promise<void>(() => undefined),
  //setSelectedStageId: (_selectedStageId: string | undefined) => undefined,
  //setSelectedStepId: (_selectedStepId: string | undefined) => undefined,
  //setSelectedSectionId: (_selectedSectionId: string | undefined) => undefined,
  setSelection: (_selectedState: PipelineSelectionState | undefined) => undefined,
  //getStagePathFromPipeline: () => '',
  //setIntermittentLoading: () => undefined,
  //setValidationUuid: () => undefined,
  deleteStage: (_stageId: string) => undefined,
  reconcile: {} as UseReconcileReturnType
})

export interface PipelineProviderProps {
  queryParams: GetPipelineQueryParams & GitQueryParams
  pipelineIdentifier: string
  stepsFactory: AbstractStepFactory
  stagesMap: StagesMap
  runPipeline: (identifier: string) => void
  renderPipelineStage: PipelineContextInterfaceY1['renderPipelineStage']
}

export function PipelineProviderY1({
  queryParams,
  pipelineIdentifier,
  children,
  renderPipelineStage,
  stepsFactory
}: // stagesMap,
// runPipeline
React.PropsWithChildren<PipelineProviderProps>): React.ReactElement {
  const { idb } = useIDBContext<PipelinePayloadY1>()
  const { apiData, pipelineFromDB } = usePipelineLoaderContext()

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
      PipelineContextActionsY1.setRouteStateParams({
        routeState: { ...queryParams, pipelineIdentifier }
      })
    )
  }, [queryParams, pipelineIdentifier, dispatch])

  const { supportingTemplatesGitx } = useAppStore()

  const [view, setView] = useLocalStorage<SelectedView>(
    'pipeline_studio_view',
    state.entityValidityDetails.valid === false ? SelectedView.YAML : SelectedView.VISUAL
  )

  const fetchPipeline = useCallback(
    (params: FetchPipelineProps = {}) => {
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
  // const scope = getScopeFromDTO(state.routeState)

  const isReadonly = !isEdit

  // const deletePipelineCache = useCallback(
  //   async (gitDetails?: EntityGitDetails): Promise<void> => {
  //     return dispatch(deletePipelineCacheAction({ gitDetails, idb, idbDelete }))
  //   },
  //   [dispatch]
  // )

  const deletePipelineCache = useCallback(
    async (gitDetails?: EntityGitDetails): Promise<void> => {
      return dispatch(deletePipelineCacheAction({ gitDetails, idb }))
    },
    [dispatch, idb]
  )

  const setYamlHandler = React.useCallback(
    (yamlHandler: YamlBuilderHandlerBinding) => {
      dispatch(PipelineContextActionsY1.setYamlHandler({ yamlHandler }))
    },
    [dispatch]
  )

  const updatePipelineView = React.useCallback(
    (data: PipelineViewDataY1) => {
      dispatch(PipelineContextActionsY1.updatePipelineView({ pipelineView: data }))
    },
    [dispatch]
  )

  // stage/step selection
  const queryParamStateSelection = usePipelineQuestParamState()
  const setSelection = (selectedState: PipelineSelectionState): void => {
    queryParamStateSelection.setPipelineQuestParamState(selectedState)
  }
  // /** @deprecated use `setSelection` */
  // const setSelectedStageId = (selectedStageId: string | undefined): void => {
  //   queryParamStateSelection.setPipelineQuestParamState({ stageId: selectedStageId })
  // }
  // /** @deprecated use `setSelection` */
  // const setSelectedStepId = (selectedStepId: string | undefined): void => {
  //   queryParamStateSelection.setPipelineQuestParamState({ stepId: selectedStepId })
  // }
  // /** @deprecated use `setSelection` */
  // const setSelectedSectionId = (selectedSectionId: string | undefined): void => {
  //   queryParamStateSelection.setPipelineQuestParamState({ sectionId: selectedSectionId })
  // }

  const updateSelectionState = React.useCallback(
    (data: SelectionStateY1) => {
      dispatch(PipelineContextActionsY1.updateSelectionState({ selectionState: data }))
    },
    [dispatch]
  )

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
    const getBranchForSelectedStage = (): string | undefined => {
      return templateGitBranch ? templateGitBranch : state?.gitDetails?.branch
    }

    const templateRefs = findAllByKey('templateRef', state.pipeline).filter(templateRef =>
      isEmpty(get(state.templateTypes, templateRef))
    )
    const templateGitBranches = extractGitBranchUsingTemplateRef(state.pipeline, '')
    getTemplateTypesByRef(
      {
        ...state.routeState,
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

  // const getStagePathFromPipeline = React.useCallback(
  //   (stageId: string, prefix = '', pipeline?: PipelineInfoConfig) => {
  //     const localPipeline = pipeline || state.pipeline
  //     return _getStagePathFromPipeline(stageId, prefix, localPipeline)
  //   },
  //   [state.pipeline, state.pipeline?.stages]
  // )

  const setTemplateTypes = React.useCallback(
    templateTypes => {
      dispatch(PipelineContextActionsY1.setTemplateTypes({ templateTypes }))
    },
    [dispatch]
  )

  const setTemplateIcons = React.useCallback(
    templateIcons => {
      dispatch(PipelineContextActionsY1.setTemplateIcons({ templateIcons }))
    },
    [dispatch]
  )

  const setTemplateServiceData = React.useCallback(
    templateServiceData => {
      dispatch(PipelineContextActionsY1.setTemplateServiceData({ templateServiceData }))
    },
    [dispatch]
  )

  const setResolvedCustomDeploymentDetailsByRef = React.useCallback(
    resolvedCustomDeploymentDetailsByRef => {
      dispatch(
        PipelineContextActionsY1.setResolvedCustomDeploymentDetailsByRef({ resolvedCustomDeploymentDetailsByRef })
      )
    },
    [dispatch]
  )

  const setSchemaErrorView = React.useCallback(
    flag => {
      dispatch(PipelineContextActionsY1.updateSchemaErrorsFlag({ schemaErrors: flag }))
    },
    [dispatch]
  )

  // const setIntermittentLoading = React.useCallback((isIntermittentLoading: boolean) => {
  //   dispatch(PipelineContextActionsY1.setIntermittentLoading({ isIntermittentLoading }))
  // }, [])

  // const setValidationUuid = React.useCallback((uuid: string) => {
  //   dispatch(PipelineContextActionsY1.setValidationUuid({ validationUuid: uuid }))
  // }, [])

  // const updateStage = React.useCallback(
  //   async (newStage: StageElementConfig) => {
  //     function _updateStages(stages: StageElementWrapperConfig[]): StageElementWrapperConfig[] {
  //       return stages.map(node => {
  //         if (node.stage?.identifier === newStage.identifier) {
  //           // This omitBy condition is required to remove any pseudo fields used in the stage
  //           return { stage: newStage }
  //         } else if (node.parallel) {
  //           return {
  //             parallel: _updateStages(node.parallel)
  //           }
  //         }

  //         return node
  //       })
  //     }

  //     return updatePipeline(originalPipeline => ({
  //       ...originalPipeline,
  //       stages: _updateStages(originalPipeline.stages || [])
  //     }))
  //   },
  //   [updatePipeline]
  // )

  //const { deleteStage } = useDeleteStage(state.pipeline, getStageFromPipeline, updatePipeline)

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
  }, [dispatch, pipelineFromDB])

  return (
    <PipelineContextY1.Provider
      value={{
        state,
        getLatestState,
        view,
        //contextType,
        // allowableTypes,
        setView,
        //runPipeline,
        stepsFactory,
        setSchemaErrorView,
        //stagesMap,
        //getStageFromPipeline,
        renderPipelineStage,
        fetchPipeline,
        updatePipelineStoreMetadata,
        updateGitDetails,
        updateEntityValidityDetails,
        updatePipeline,
        // updateStage,
        updatePipelineView,
        deletePipelineCache,
        isReadonly,
        //scope,
        setYamlHandler,
        //setSelectedStageId,
        //setSelectedStepId,
        //setSelectedSectionId,
        setSelection,
        // getStagePathFromPipeline,
        // setTemplateTypes,
        // setTemplateIcons,
        // setTemplateServiceData,
        // setIntermittentLoading,
        // setValidationUuid,
        // deleteStage,
        reconcile: useReconcile({ storeMetadata: state.storeMetadata })
      }}
    >
      {children}
    </PipelineContextY1.Provider>
  )
}

export function usePipelineContextY1(): PipelineContextInterfaceY1 {
  // disabling this because this the definition of usePipelineContext
  // eslint-disable-next-line no-restricted-syntax
  return React.useContext(PipelineContextY1)
}

export const savePipeline = (
  params: CreatePipelineQueryParams & PutPipelineQueryParams,
  pipeline: PipelineInfoConfig,
  pipelineMetadata: PipelineMetadata,
  pipelineIdentifier: string,
  isEdit = false
): Promise<Failure | undefined> => {
  const git_details: PipelineUpdateRequestBody['git_details'] = {
    base_branch: params.baseBranch,
    branch_name: params.branch,
    commit_message: params.commitMsg,
    connector_ref: params.connectorRef,
    last_commit_id: params.lastCommitId,
    last_object_id: params.lastObjectId,
    repo_name: params.repoName,
    store_type: params.storeType,
    file_path: params.filePath
  } as PipelineUpdateRequestBody['git_details']

  const body: PipelineUpdateRequestBody = {
    identifier: pipelineMetadata?.identifier,
    name: pipelineMetadata?.name,
    tags: pipelineMetadata?.tags,
    description: pipelineMetadata?.description,
    pipeline_yaml: yamlStringify(omit(pipeline, ...pipelineMetadataKeys)),
    git_details
  }

  return isEdit
    ? updatePipelinePromise({
        body: body,
        org: params.orgIdentifier,
        pipeline: pipelineIdentifier,
        project: params.projectIdentifier
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
    : createPipelinePromise({
        org: params.orgIdentifier,
        project: params.projectIdentifier,
        body: body
      })
        .then((response: unknown) => {
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
