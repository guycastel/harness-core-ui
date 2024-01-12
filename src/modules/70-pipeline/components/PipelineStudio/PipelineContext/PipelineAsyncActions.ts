/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { cloneDeep, defaultTo, isEmpty, isEqual, isNil, omit, pick, map, uniq } from 'lodash-es'
import {
  PipelineInfoConfig,
  EntityGitDetails,
  ErrorNodeSummary,
  EntityValidityDetails,
  GetPipelineQueryParams,
  ResponsePMSPipelineResponseDTO,
  YamlSchemaErrorWrapperDTO,
  CacheResponseMetadata,
  ResponsePMSPipelineSummaryResponse,
  PublicAccessResponse
} from 'services/pipeline-ng'
import {
  extractGitBranchUsingTemplateRef,
  getResolvedCustomDeploymentDetailsByRef,
  getTemplateTypesByRef
} from '@pipeline/utils/templateUtils'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { IDB, IDBPayload } from '@modules/10-common/components/IDBContext/IDBContext'
import { FetchPipelineParams } from '@pipeline/common/components/PipelineStudio/PipelineLoaderContext/PipelineLoaderContext'
import {
  FetchError,
  PipelineInfoConfigWithGitDetails,
  fetchPipelineYamlAndMetadata
} from '@pipeline/common/components/PipelineStudio/PipelineLoaderContext/helpers'
import { DispatchFunc } from '@modules/10-common/hooks/useThunkReducer'
import { deletePipelineFromIDB } from '@modules/70-pipeline/common/components/PipelineStudio/PipelineLoaderContext/utils'
import {
  ActionReturnType,
  DefaultPipeline,
  DrawerTypes,
  PipelineContextActions,
  PipelineMetaDataConfig,
  PipelineReducerState
} from './PipelineActions'
import { comparePipelines, getStageFromPipeline as _getStageFromPipeline } from './helpers'
import { getId, getRepoIdentifierName } from './utils'
import { UpdatePipelineMetaData } from './PipelineContext'

// TODO: DUPLICATED
function findAllByKey<T>(keyToFind: string, obj?: T): string[] {
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

const remoteFetchErrorGitDetails = (remoteFetchError: ResponsePMSPipelineResponseDTO): Partial<EntityGitDetails> => {
  const branch = remoteFetchError?.metaData?.branch
  return branch ? { branch } : {}
}

export interface PipelinePayload extends IDBPayload {
  yamlVersion?: '0' | '1'
  pipeline: PipelineInfoConfig | undefined
  originalPipeline?: PipelineInfoConfig
  isUpdated: boolean
  isMetadataUpdated?: boolean
  modules?: string[]
  storeMetadata?: StoreMetadata
  gitDetails: EntityGitDetails
  entityValidityDetails?: EntityValidityDetails
  templateInputsErrorNodeSummary?: ErrorNodeSummary
  yamlSchemaErrorWrapper?: YamlSchemaErrorWrapperDTO
  cacheResponse?: CacheResponseMetadata
  validationUuid?: string
  pipelineMetadataConfig?: PipelineMetaDataConfig
}

export interface FetchPipelineProps {
  newPipelineId?: string
  signal?: AbortSignal
  repoIdentifier?: string
  branch?: string
  loadFromCache?: boolean
}

const getResolvedCustomDeploymentDetailsMap = (
  pipeline: PipelineInfoConfig,
  queryParams: GetPipelineQueryParams
): ReturnType<typeof getResolvedCustomDeploymentDetailsByRef> => {
  const templateRefs = uniq(map(findAllByKey('customDeploymentRef', pipeline), 'templateRef'))
  return getResolvedCustomDeploymentDetailsByRef(
    {
      accountIdentifier: queryParams.accountIdentifier,
      orgIdentifier: queryParams.orgIdentifier,
      projectIdentifier: queryParams.projectIdentifier,
      templateListType: 'Stable',
      repoIdentifier: queryParams.repoIdentifier,
      branch: queryParams.branch,
      getDefaultFromOtherRepo: true
    },
    templateRefs
  )
}

const getTemplateType = (
  pipeline: PipelineInfoConfig,
  queryParams: GetPipelineQueryParams,
  storeMetadata?: StoreMetadata,
  supportingTemplatesGitx?: boolean,
  loadFromCache?: boolean
): ReturnType<typeof getTemplateTypesByRef> => {
  const templateRefs = uniq(findAllByKey('templateRef', pipeline))
  const templateGitBranches = extractGitBranchUsingTemplateRef(pipeline, '')
  return getTemplateTypesByRef(
    {
      accountIdentifier: queryParams.accountIdentifier,
      orgIdentifier: queryParams.orgIdentifier,
      projectIdentifier: queryParams.projectIdentifier,
      templateListType: 'Stable',
      repoIdentifier: queryParams.repoIdentifier,
      branch: queryParams.branch,
      getDefaultFromOtherRepo: true
    },
    templateRefs,
    storeMetadata,
    supportingTemplatesGitx,
    loadFromCache,
    templateGitBranches
  )
}

export const processPipelineFromCache = (
  data: PipelinePayload
): ((
  dispatch: DispatchFunc<PipelineReducerState, ActionReturnType>,
  getState: () => PipelineReducerState
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { routeState } = getState()

    dispatch(
      PipelineContextActions.success({
        error: '',
        remoteFetchError: undefined,
        pipeline: defaultTo(data?.pipeline, {
          ...DefaultPipeline,
          projectIdentifier: routeState.projectIdentifier,
          orgIdentifier: routeState.orgIdentifier
        }),
        originalPipeline: defaultTo(
          cloneDeep(data?.originalPipeline),
          cloneDeep({
            ...DefaultPipeline,
            projectIdentifier: routeState.projectIdentifier,
            orgIdentifier: routeState.orgIdentifier
          })
        ),
        pipelineMetadataConfig: {
          modifiedMetadata: {
            publicAccessResponse: data?.pipelineMetadataConfig?.modifiedMetadata?.publicAccessResponse || {
              public: false
            }
          },
          originalMetadata: {
            publicAccessResponse: data?.pipelineMetadataConfig?.originalMetadata?.publicAccessResponse || {
              public: false
            }
          }
        },
        isUpdated: true,
        isMetadataUpdated: true,
        modules: data?.modules,
        isBEPipelineUpdated: false,
        gitDetails: defaultTo(data?.gitDetails, {}),
        entityValidityDetails: defaultTo(data?.entityValidityDetails, {}),
        yamlSchemaErrorWrapper: defaultTo(data?.yamlSchemaErrorWrapper, {}),
        cacheResponse: data?.cacheResponse,
        validationUuid: data?.validationUuid
      })
    )
    dispatch(PipelineContextActions.initialized())
  }
}
export const processPipelineFromAPIAction = (
  pipelineById: PipelineInfoConfigWithGitDetails | FetchError,
  pipelineMetaData: ResponsePMSPipelineSummaryResponse,
  fetchPipelineParams: FetchPipelineParams,
  props: { supportingTemplatesGitx: boolean; idb: IDB<PipelinePayload>; initialLoading: boolean }
): ((
  dispatch: DispatchFunc<PipelineReducerState, ActionReturnType>,
  getState: () => PipelineReducerState
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { idb, initialLoading, supportingTemplatesGitx } = props
    const { routeState, storeMetadata } = getState()
    const { newPipelineId, loadFromCache = true } = fetchPipelineParams
    const pipelineId = newPipelineId ?? routeState.pipelineIdentifier ?? ''
    let id = getId(
      routeState.accountIdentifier ?? '',
      routeState.orgIdentifier ?? '',
      routeState.projectIdentifier ?? '',
      pipelineId,
      getRepoIdentifierName({
        repoIdentifier: routeState.repoIdentifier,
        repoName: routeState.repoName
      }),
      routeState.branch ?? ''
    )

    // For aborted request, we have to ignore else Abort error will be set as pipeline in IDB
    // Adding check for stack trace too to ignore other unexpected error
    if (
      (pipelineById as { stack: unknown })?.stack ||
      (pipelineById as { name: string })?.name === 'AbortError' ||
      (pipelineMetaData as { stack: unknown })?.stack ||
      (pipelineMetaData as { name: string })?.name === 'AbortError'
    ) {
      return
    }

    if (pipelineById?.templateError) {
      dispatch(PipelineContextActions.error({ templateError: pipelineById.templateError }))
      return
    }

    if (pipelineById?.remoteFetchError) {
      dispatch(
        PipelineContextActions.error({
          remoteFetchError: pipelineById.remoteFetchError,
          pipeline: {
            ...pick(pipelineMetaData?.data, ['name', 'identifier', 'description', 'tags'])
          } as PipelineInfoConfig,
          gitDetails: {
            ...pipelineMetaData?.data?.gitDetails,
            ...remoteFetchErrorGitDetails(pipelineById.remoteFetchError as ResponsePMSPipelineResponseDTO)
          }
        })
      )
      return
    }

    const pipelineWithGitDetails = pipelineById as PipelineInfoConfigWithGitDetails & {
      modules?: string[]
      publicAccessResponse: PublicAccessResponse
    }

    id = getId(
      routeState.accountIdentifier,
      defaultTo(routeState.orgIdentifier, ''),
      defaultTo(routeState.projectIdentifier, ''),
      pipelineId,
      defaultTo(getRepoIdentifierName(pipelineWithGitDetails?.gitDetails), routeState.repoIdentifier),
      defaultTo(pipelineWithGitDetails?.gitDetails?.branch, defaultTo(routeState.branch, ''))
    )

    const data = await idb.get(id)

    const pipeline = omit(
      pipelineWithGitDetails,
      'gitDetails',
      'entityValidityDetails',
      'repo',
      'branch',
      'connectorRef',
      'filePath',
      'yamlSchemaErrorWrapper',
      'modules',
      'cacheResponse',
      'validationUuid',
      'publicAccessResponse'
    ) as PipelineInfoConfig

    const payload: PipelinePayload = {
      identifier: id,
      pipeline,
      originalPipeline: cloneDeep(pipeline),
      isUpdated: false,
      isMetadataUpdated: false,
      modules: pipelineWithGitDetails?.modules,
      gitDetails:
        pipelineWithGitDetails?.gitDetails?.objectId || pipelineWithGitDetails?.gitDetails?.commitId
          ? pipelineWithGitDetails.gitDetails
          : data?.gitDetails ?? {},
      entityValidityDetails: defaultTo(
        pipelineWithGitDetails?.entityValidityDetails,
        defaultTo(data?.entityValidityDetails, {})
      ),
      yamlSchemaErrorWrapper: defaultTo(
        pipelineWithGitDetails?.yamlSchemaErrorWrapper,
        defaultTo(data?.yamlSchemaErrorWrapper, {})
      ),
      pipelineMetadataConfig: {
        originalMetadata: {
          publicAccessResponse: pipelineWithGitDetails?.publicAccessResponse
        },
        modifiedMetadata: {
          publicAccessResponse: pipelineWithGitDetails?.publicAccessResponse
        }
      },
      cacheResponse: defaultTo(pipelineWithGitDetails?.cacheResponse, data?.cacheResponse),
      validationUuid: defaultTo(pipelineWithGitDetails?.validationUuid, data?.validationUuid)
    }
    const templateQueryParams = {
      ...routeState,
      repoIdentifier: defaultTo(
        routeState.repoIdentifier,
        defaultTo(pipelineWithGitDetails?.gitDetails?.repoIdentifier, '')
      ),
      branch: defaultTo(routeState.branch, defaultTo(pipelineWithGitDetails?.gitDetails?.branch, ''))
    }

    const pipelineMetadataConfig: PipelineMetaDataConfig = {
      originalMetadata: {
        publicAccessResponse: pipelineWithGitDetails.publicAccessResponse
      },
      modifiedMetadata: {
        publicAccessResponse:
          pipelineWithGitDetails.publicAccessResponse ||
          data?.pipelineMetadataConfig?.modifiedMetadata?.publicAccessResponse
      }
    }

    if (data && initialLoading) {
      const { templateTypes, templateServiceData, templateIcons } = data.pipeline
        ? await getTemplateType(
            data.pipeline,
            templateQueryParams,
            storeMetadata,
            supportingTemplatesGitx,
            loadFromCache
          )
        : { templateTypes: {}, templateServiceData: {}, templateIcons: {} }

      const { resolvedCustomDeploymentDetailsByRef } = data.pipeline
        ? await getResolvedCustomDeploymentDetailsMap(data.pipeline, templateQueryParams)
        : { resolvedCustomDeploymentDetailsByRef: {} }

      const isLocalChangesPresent = comparePipelines(data.originalPipeline, data.pipeline)

      /**
       * this is added for the case when other user makes the changes and the current user
       * refreshes the tab then the new saved changes should automatically be saved without
       * pop-up
       */
      if (!isLocalChangesPresent) {
        await idb.put(payload)
      }
      dispatch(
        PipelineContextActions.success({
          pipelineIdentifier: pipelineId,
          error: '',
          remoteFetchError: undefined,
          pipeline: isLocalChangesPresent ? data.pipeline : cloneDeep(pipeline),
          originalPipeline: cloneDeep(pipeline),
          isBEPipelineUpdated: isLocalChangesPresent ? comparePipelines(pipeline, data.originalPipeline) : false,
          isUpdated: isLocalChangesPresent ? comparePipelines(pipeline, data.pipeline) : false,
          isMetadataUpdated: !isEqual(
            pipelineMetadataConfig?.originalMetadata,
            pipelineMetadataConfig?.modifiedMetadata
          ),
          pipelineMetadataConfig,
          modules: defaultTo(pipelineWithGitDetails?.modules, data.modules),
          gitDetails:
            pipelineWithGitDetails?.gitDetails?.objectId || pipelineWithGitDetails?.gitDetails?.commitId
              ? pipelineWithGitDetails.gitDetails
              : defaultTo(data?.gitDetails, {}),
          storeMetadata: {
            ...storeMetadata,
            storeType: pipelineMetaData?.data?.storeType,
            connectorRef: pipelineMetaData?.data?.connectorRef
          },
          templateTypes,
          templateIcons,
          templateServiceData,
          resolvedCustomDeploymentDetailsByRef,
          entityValidityDetails: defaultTo(
            pipelineWithGitDetails?.entityValidityDetails,
            defaultTo(data?.entityValidityDetails, {})
          ),
          yamlSchemaErrorWrapper: defaultTo(
            pipelineWithGitDetails?.yamlSchemaErrorWrapper,
            defaultTo(data?.yamlSchemaErrorWrapper, {})
          ),
          cacheResponse: defaultTo(pipelineWithGitDetails?.cacheResponse, data?.cacheResponse),
          validationUuid: defaultTo(pipelineWithGitDetails?.validationUuid, data?.validationUuid)
        })
      )
    } else {
      await idb.put(payload)

      const { templateTypes, templateServiceData, templateIcons } = await getTemplateType(
        pipeline,
        templateQueryParams,
        storeMetadata,
        supportingTemplatesGitx,
        loadFromCache
      )
      const { resolvedCustomDeploymentDetailsByRef } = await getResolvedCustomDeploymentDetailsMap(
        pipeline,
        templateQueryParams
      )
      dispatch(
        PipelineContextActions.success({
          pipelineIdentifier: pipelineId,
          error: '',
          remoteFetchError: undefined,
          pipeline,
          pipelineMetadataConfig,
          originalPipeline: cloneDeep(pipeline),
          isBEPipelineUpdated: false,
          isUpdated: false,
          isMetadataUpdated: false,
          modules: payload.modules,
          gitDetails: payload.gitDetails,
          entityValidityDetails: payload.entityValidityDetails,
          cacheResponse: payload.cacheResponse,
          templateTypes,
          templateIcons,
          templateServiceData,
          resolvedCustomDeploymentDetailsByRef,
          yamlSchemaErrorWrapper: payload?.yamlSchemaErrorWrapper,
          validationUuid: payload.validationUuid
        })
      )
    }
    dispatch(PipelineContextActions.initialized())
  }
}

export const fetchPipelineAction = (
  params: FetchPipelineProps,
  props: { supportingTemplatesGitx: boolean; idb: IDB<PipelinePayload> }
): ((
  dispatch: DispatchFunc<PipelineReducerState, ActionReturnType>,
  getState: () => PipelineReducerState
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { branch, loadFromCache, newPipelineId, repoIdentifier, signal } = params
    const { routeState, pipelineIdentifier } = getState()

    dispatch(PipelineContextActions.setLoading(true))

    const { pipelineById, pipelineMetaDataById } = await fetchPipelineYamlAndMetadata({
      queryParams: routeState,
      pipelineId: newPipelineId ?? pipelineIdentifier,
      signal,
      repoIdentifier,
      branch,
      loadFromCache
    })

    await dispatch(
      processPipelineFromAPIAction(pipelineById, pipelineMetaDataById, params, { ...props, initialLoading: false })
    )
  }
}

export const softFetchPipelineAction = ({
  idb
}: {
  idb: IDB<PipelinePayload>
}): ((
  dispatch: DispatchFunc<PipelineReducerState, ActionReturnType>,
  getState: () => PipelineReducerState
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { routeState, pipelineIdentifier, originalPipeline, pipeline, pipelineView, selectionState, gitDetails } =
      getState()

    const id = getId(
      routeState.accountIdentifier,
      routeState.orgIdentifier || '',
      routeState.projectIdentifier || '',
      pipelineIdentifier,
      getRepoIdentifierName(gitDetails),
      gitDetails?.branch || ''
    )
    if (idb.idb) {
      const data = await idb.get(id)
      if (data?.pipeline && !isEqual(data.pipeline, pipeline)) {
        const isUpdated = comparePipelines(originalPipeline, data.pipeline)
        if (!isEmpty(selectionState.selectedStageId) && selectionState.selectedStageId) {
          const stage = _getStageFromPipeline(selectionState.selectedStageId, data.pipeline).stage
          if (isNil(stage)) {
            dispatch(
              PipelineContextActions.success({
                error: '',
                pipeline: data.pipeline,
                isUpdated,
                pipelineMetadataConfig: data.pipelineMetadataConfig,
                isMetadataUpdated: !!data.isMetadataUpdated,
                pipelineView: {
                  ...pipelineView,
                  isSplitViewOpen: false,
                  isDrawerOpened: false,
                  drawerData: { type: DrawerTypes.StepConfig },
                  splitViewData: {}
                }
              })
            )
          } else {
            dispatch(
              PipelineContextActions.success({
                error: '',
                pipeline: data.pipeline,
                isUpdated,
                pipelineMetadataConfig: data.pipelineMetadataConfig,
                isMetadataUpdated: !!data.isMetadataUpdated
              })
            )
          }
        } else {
          dispatch(
            PipelineContextActions.success({
              error: '',
              pipeline: data.pipeline,
              isUpdated,
              pipelineMetadataConfig: data.pipelineMetadataConfig,
              isMetadataUpdated: !!data.isMetadataUpdated
            })
          )
        }
      }
    } else {
      dispatch(PipelineContextActions.success({ error: 'DB is not initialized' }))
    }
  }
}

export const updatePipelineStoreMetadataAction = ({
  storeMetadata,
  gitDetails,
  latestPipeline,
  idb
}: {
  storeMetadata: StoreMetadata
  gitDetails: EntityGitDetails
  latestPipeline?: PipelineInfoConfig
  idb: IDB<PipelinePayload>
}): ((
  dispatch: DispatchFunc<PipelineReducerState, ActionReturnType>,
  getState: () => PipelineReducerState
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { routeState, pipelineIdentifier, originalPipeline, pipeline } = getState()

    await deletePipelineFromIDB({ routeState, identifier: pipelineIdentifier, gitDetails: {}, idb })

    const id = getId(
      routeState.accountIdentifier,
      routeState.orgIdentifier || '',
      routeState.projectIdentifier || '',
      pipelineIdentifier,
      getRepoIdentifierName(gitDetails),
      gitDetails?.branch || ''
    )
    const updatedPipeline = latestPipeline || pipeline
    const isUpdated = comparePipelines(originalPipeline, updatedPipeline)

    // In pipeline studio, storeMetadata only contains 3 properties - provider, connectorRef and storeType.
    // We need all 6 properties in storeMetadata for use in templates, Other 3 are coming from gitDetails
    const newStoreMetadata: StoreMetadata = {
      ...storeMetadata,
      ...(storeMetadata.storeType === StoreType.REMOTE
        ? pick(gitDetails, 'repoName', 'branch', 'filePath')
        : { connectorRef: undefined })
    }

    if (idb.idb) {
      const payload: PipelinePayload = {
        identifier: id,
        pipeline: updatedPipeline,
        originalPipeline,
        isUpdated,
        storeMetadata,
        gitDetails
      }
      await idb.put(payload)
    }
    dispatch(
      PipelineContextActions.success({
        error: '',
        pipeline: updatedPipeline,
        isUpdated,
        storeMetadata: newStoreMetadata,
        gitDetails
      })
    )
  }
}

export const updateGitDetailsAction = ({
  gitDetails,
  idb
}: {
  gitDetails: EntityGitDetails
  idb: IDB<PipelinePayload>
}): ((
  dispatch: DispatchFunc<PipelineReducerState, ActionReturnType>,
  getState: () => PipelineReducerState
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { routeState, pipelineIdentifier, originalPipeline, pipeline } = getState()

    await deletePipelineFromIDB({ routeState, identifier: pipelineIdentifier, gitDetails: {}, idb })

    const id = getId(
      routeState.accountIdentifier,
      routeState.orgIdentifier || '',
      routeState.projectIdentifier || '',
      pipelineIdentifier,
      getRepoIdentifierName(gitDetails),
      gitDetails?.branch || ''
    )
    const isUpdated = comparePipelines(originalPipeline, pipeline)
    if (idb.idb) {
      const payload: PipelinePayload = {
        identifier: id,
        pipeline,
        originalPipeline,
        isUpdated,
        gitDetails
      }
      await idb.put(payload)
    }
    dispatch(PipelineContextActions.success({ error: '', pipeline, isUpdated, gitDetails }))
  }
}

export const updateEntityValidityDetailsAction = ({
  entityValidityDetails,
  idb
}: {
  entityValidityDetails: EntityValidityDetails
  idb: IDB<PipelinePayload>
}): ((
  dispatch: DispatchFunc<PipelineReducerState, ActionReturnType>,
  getState: () => PipelineReducerState
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const {
      routeState,
      pipelineIdentifier,
      originalPipeline,
      pipeline,
      gitDetails,
      isMetadataUpdated,
      pipelineMetadataConfig
    } = getState()

    await deletePipelineFromIDB({
      routeState,
      identifier: routeState.pipelineIdentifier ?? '',
      gitDetails: {},
      idb
    })

    const id = getId(
      routeState.accountIdentifier,
      routeState.orgIdentifier || '',
      routeState.projectIdentifier || '',
      pipelineIdentifier,
      getRepoIdentifierName(gitDetails),
      gitDetails?.branch || ''
    )
    if (idb.idb) {
      const payload: PipelinePayload = {
        identifier: id,
        pipeline,
        originalPipeline,
        isUpdated: false,
        isMetadataUpdated,
        gitDetails,
        entityValidityDetails,
        pipelineMetadataConfig
      }
      await idb.put(payload)
    }
    dispatch(PipelineContextActions.success({ error: '', pipeline, entityValidityDetails }))
  }
}

export const updatePipelineAction = ({
  pipelineArg,
  idb
}: {
  pipelineArg: PipelineInfoConfig | ((p: PipelineInfoConfig) => PipelineInfoConfig)
  idb: IDB<PipelinePayload>
}): ((
  dispatch: DispatchFunc<PipelineReducerState, ActionReturnType>,
  getState: () => PipelineReducerState
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const state = getState()

    const id = getId(
      state.routeState.accountIdentifier ?? '',
      state.routeState.orgIdentifier ?? '',
      state.routeState.projectIdentifier ?? '',
      state.routeState.pipelineIdentifier ?? '',
      getRepoIdentifierName({
        repoIdentifier: state.routeState.repoIdentifier,
        repoName: state.routeState.repoName
      }),
      state.routeState.branch ?? ''
    )

    let pipeline: PipelineInfoConfig = {} as PipelineInfoConfig
    if (typeof pipelineArg === 'function') {
      const dbPipeline = await idb.get(id)
      if (dbPipeline?.pipeline) {
        pipeline = pipelineArg(dbPipeline.pipeline)
      } else {
        // Pipeline does not exist in the db
        pipeline = pipelineArg(state.pipeline)
      }
    } else {
      pipeline = pipelineArg
    }

    // lodash.isEqual() gives wrong output some times, hence using fast-json-stable-stringify
    const isUpdated = comparePipelines(omit(state.originalPipeline, 'repo', 'branch'), pipeline as PipelineInfoConfig)
    const payload: PipelinePayload = {
      identifier: id,
      pipeline: pipeline as PipelineInfoConfig,
      originalPipeline: state.originalPipeline,
      isUpdated,
      isMetadataUpdated: state.isMetadataUpdated,
      gitDetails: { repoIdentifier: state.routeState.repoIdentifier, repoName: state.routeState.repoName },
      pipelineMetadataConfig: state?.pipelineMetadataConfig
    }
    await idb.put(payload)

    dispatch(PipelineContextActions.success({ error: '', pipeline, isUpdated }))
  }
}

export const updatePipelineMetadataAction = ({
  pipelineMetadata,
  idb
}: {
  pipelineMetadata?: UpdatePipelineMetaData
  idb: IDB<PipelinePayload>
}): ((
  dispatch: DispatchFunc<PipelineReducerState, ActionReturnType>,
  getState: () => PipelineReducerState
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const state = getState()
    const { routeState, pipelineMetadataConfig, pipeline, originalPipeline, isUpdated } = state

    const id = getId(
      routeState.accountIdentifier ?? '',
      routeState.orgIdentifier ?? '',
      routeState.projectIdentifier ?? '',
      routeState.pipelineIdentifier ?? '',
      getRepoIdentifierName({
        repoIdentifier: routeState.repoIdentifier,
        repoName: routeState.repoName
      }),
      routeState.branch ?? ''
    )

    const modifiedMetadata = {
      ...pipelineMetadataConfig?.modifiedMetadata,
      ...(pipelineMetadata && { publicAccessResponse: pipelineMetadata?.publicAccess })
    }

    const isMetadataUpdated = !isEqual(pipelineMetadataConfig?.originalMetadata, modifiedMetadata)
    const pipelineMetadataConfigUpdated = {
      ...pipelineMetadataConfig,
      modifiedMetadata: modifiedMetadata
    }
    const payload: PipelinePayload = {
      identifier: id,
      pipeline,
      originalPipeline,
      isUpdated,
      isMetadataUpdated,
      gitDetails: { repoIdentifier: routeState.repoIdentifier, repoName: routeState.repoName },
      pipelineMetadataConfig: pipelineMetadataConfigUpdated
    }
    await idb.put(payload)

    dispatch(
      PipelineContextActions.success({
        error: '',
        pipeline,
        isUpdated,
        pipelineMetadataConfig: pipelineMetadataConfigUpdated,
        isMetadataUpdated
      })
    )
  }
}

export const deletePipelineCacheAction = ({
  gitDetails,
  idb
}: {
  gitDetails?: EntityGitDetails
  idb: IDB<PipelinePayload>
}): ((
  dispatch: DispatchFunc<PipelineReducerState, ActionReturnType>,
  getState: () => PipelineReducerState
) => Promise<void>) => {
  return async (_dispatch, getState) => {
    const { routeState } = getState()
    await deletePipelineFromIDB({ routeState, identifier: routeState.pipelineIdentifier ?? '', gitDetails, idb })
  }
}
