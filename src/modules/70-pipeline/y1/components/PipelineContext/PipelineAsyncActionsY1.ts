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
  ResponsePMSPipelineSummaryResponse
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
import { getId, getRepoIdentifierName } from '@pipeline/components/PipelineStudio/PipelineContext/utils'
import { deletePipelineFromIDB } from '@modules/70-pipeline/common/components/PipelineStudio/PipelineLoaderContext/utils'
import {
  ActionReturnTypeY1,
  DefaultPipeline,
  DrawerTypesY1,
  PipelineContextActionsY1,
  PipelineMetadata,
  PipelineReducerStateY1
} from './PipelineActionsY1'
import { comparePipelines, getStageFromPipeline as _getStageFromPipeline } from './helpersY1'

// TODO: DUPLICATED
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

export const pipelineMetadataKeys = [
  'repo',
  'branch',
  'name',
  'identifier',
  'tags',
  'description',
  'projectIdentifier',
  'orgIdentifier'
]

const remoteFetchErrorGitDetails = (remoteFetchError: ResponsePMSPipelineResponseDTO): Partial<EntityGitDetails> => {
  const branch = remoteFetchError?.metaData?.branch
  return branch ? { branch } : {}
}

export interface PipelinePayloadY1 extends IDBPayload {
  pipeline: PipelineInfoConfig | undefined
  originalPipeline?: PipelineInfoConfig
  isUpdated: boolean
  modules?: string[]
  storeMetadata?: StoreMetadata
  gitDetails: EntityGitDetails
  entityValidityDetails?: EntityValidityDetails
  templateInputsErrorNodeSummary?: ErrorNodeSummary
  yamlSchemaErrorWrapper?: YamlSchemaErrorWrapperDTO
  cacheResponse?: CacheResponseMetadata
  validationUuid?: string
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
  data: PipelinePayloadY1
  //fetchPipelineParams: FetchPipelineParams,
  //props: { supportingTemplatesGitx: boolean; idbGet: IDBContextInterface['get']; idbPut: IDBContextInterface['put'] }
): ((
  dispatch: DispatchFunc<PipelineReducerStateY1, ActionReturnTypeY1>,
  getState: () => PipelineReducerStateY1
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { routeState } = getState()

    dispatch(
      PipelineContextActionsY1.success({
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
        isUpdated: true,
        modules: data?.modules,
        isBEPipelineUpdated: false,
        gitDetails: defaultTo(data?.gitDetails, {}),
        entityValidityDetails: defaultTo(data?.entityValidityDetails, {}),
        yamlSchemaErrorWrapper: defaultTo(data?.yamlSchemaErrorWrapper, {}),
        cacheResponse: data?.cacheResponse,
        validationUuid: data?.validationUuid
      })
    )
    dispatch(PipelineContextActionsY1.initialized())
  }
}
export const processPipelineFromAPIAction = (
  pipelineById: PipelineInfoConfigWithGitDetails | FetchError,
  pipelineMetaData: ResponsePMSPipelineSummaryResponse,
  fetchPipelineParams: FetchPipelineParams,
  props: { supportingTemplatesGitx: boolean; idb: IDB<PipelinePayloadY1>; initialLoading: boolean }
): ((
  dispatch: DispatchFunc<PipelineReducerStateY1, ActionReturnTypeY1>,
  getState: () => PipelineReducerStateY1
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
      dispatch(PipelineContextActionsY1.error({ templateError: pipelineById.templateError }))
      return
    }

    if (pipelineById?.remoteFetchError) {
      dispatch(
        PipelineContextActionsY1.error({
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

    const pipelineWithGitDetails = pipelineById as PipelineInfoConfigWithGitDetails & { modules?: string[] }

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
    const payload: PipelinePayloadY1 = {
      identifier: id,
      pipeline,
      originalPipeline: cloneDeep(pipeline),
      isUpdated: false,
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

    const updatedPipelineMetadata = {
      name: pipelineMetaData?.data?.name ?? '',
      identifier: pipelineId,
      tags: pipelineMetaData?.data?.tags,
      description: pipelineMetaData?.data?.description
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
      dispatch(
        PipelineContextActionsY1.success({
          pipelineIdentifier: pipelineId,
          error: '',
          remoteFetchError: undefined,
          pipeline: data.pipeline,
          pipelineMetadata: updatedPipelineMetadata,
          originalPipeline: cloneDeep(pipeline),
          isBEPipelineUpdated: comparePipelines(pipeline, data.originalPipeline),
          isUpdated: comparePipelines(pipeline, data.pipeline),
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
        PipelineContextActionsY1.success({
          pipelineIdentifier: pipelineId,
          error: '',
          remoteFetchError: undefined,
          pipeline,
          pipelineMetadata: updatedPipelineMetadata,
          originalPipeline: cloneDeep(pipeline),
          isBEPipelineUpdated: false,
          isUpdated: false,
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
    dispatch(PipelineContextActionsY1.initialized())
  }
}

export const fetchPipelineAction = (
  params: FetchPipelineProps,
  props: { supportingTemplatesGitx: boolean; idb: IDB<PipelinePayloadY1> }
): ((
  dispatch: DispatchFunc<PipelineReducerStateY1, ActionReturnTypeY1>,
  getState: () => PipelineReducerStateY1
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { branch, loadFromCache, newPipelineId, repoIdentifier, signal } = params
    const { routeState, pipelineIdentifier } = getState()

    dispatch(PipelineContextActionsY1.setLoading(true))

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
  idb: IDB<PipelinePayloadY1>
}): ((
  dispatch: DispatchFunc<PipelineReducerStateY1, ActionReturnTypeY1>,
  getState: () => PipelineReducerStateY1
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
      const data = (await idb.get(id)) as PipelinePayloadY1 | undefined
      if (data?.pipeline && !isEqual(data.pipeline, pipeline)) {
        const isUpdated = comparePipelines(originalPipeline, data.pipeline)
        if (!isEmpty(selectionState.selectedStageId) && selectionState.selectedStageId) {
          const stage = _getStageFromPipeline(selectionState.selectedStageId, data.pipeline).stage
          if (isNil(stage)) {
            dispatch(
              PipelineContextActionsY1.success({
                error: '',
                pipeline: data.pipeline,
                isUpdated,
                pipelineView: {
                  ...pipelineView,
                  isSplitViewOpen: false,
                  isDrawerOpened: false,
                  drawerData: { type: DrawerTypesY1.StepConfig },
                  splitViewData: {}
                }
              })
            )
          } else {
            dispatch(PipelineContextActionsY1.success({ error: '', pipeline: data.pipeline, isUpdated }))
          }
        } else {
          dispatch(PipelineContextActionsY1.success({ error: '', pipeline: data.pipeline, isUpdated }))
        }
      }
    } else {
      dispatch(PipelineContextActionsY1.success({ error: 'DB is not initialized' }))
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
  idb: IDB<PipelinePayloadY1>
}): ((
  dispatch: DispatchFunc<PipelineReducerStateY1, ActionReturnTypeY1>,
  getState: () => PipelineReducerStateY1
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

    // In pipeline studio, storeMetadata only contains 2 properties - connectorRef and storeType.
    // We need all 5 properties in storeMetadata for use in templates, Other 3 are coming from gitDetails
    const newStoreMetadata: StoreMetadata = {
      ...storeMetadata,
      ...(storeMetadata.storeType === StoreType.REMOTE
        ? pick(gitDetails, 'repoName', 'branch', 'filePath')
        : { connectorRef: undefined })
    }

    if (idb.idb) {
      const payload: PipelinePayloadY1 = {
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
      PipelineContextActionsY1.success({
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
  idb: IDB<PipelinePayloadY1>
}): ((
  dispatch: DispatchFunc<PipelineReducerStateY1, ActionReturnTypeY1>,
  getState: () => PipelineReducerStateY1
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
      const payload: PipelinePayloadY1 = {
        identifier: id,
        pipeline,
        originalPipeline,
        isUpdated,
        gitDetails
      }
      await idb.put(payload)
    }
    dispatch(PipelineContextActionsY1.success({ error: '', pipeline, isUpdated, gitDetails }))
  }
}

export const updateEntityValidityDetailsAction = ({
  entityValidityDetails,
  idb
}: {
  entityValidityDetails: EntityValidityDetails
  idb: IDB<PipelinePayloadY1>
}): ((
  dispatch: DispatchFunc<PipelineReducerStateY1, ActionReturnTypeY1>,
  getState: () => PipelineReducerStateY1
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { routeState, pipelineIdentifier, originalPipeline, pipeline, gitDetails } = getState()

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
      const payload: PipelinePayloadY1 = {
        identifier: id,
        pipeline,
        originalPipeline,
        isUpdated: false,
        gitDetails,
        entityValidityDetails
      }
      await idb.put(payload)
    }
    dispatch(PipelineContextActionsY1.success({ error: '', pipeline, entityValidityDetails }))
  }
}

export const updatePipelineAction = ({
  pipelineArg,
  idb
}: {
  pipelineArg: PipelineInfoConfig | ((p: PipelineInfoConfig) => PipelineInfoConfig)
  idb: IDB<PipelinePayloadY1>
}): ((
  dispatch: DispatchFunc<PipelineReducerStateY1, ActionReturnTypeY1>,
  getState: () => PipelineReducerStateY1
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const state = getState()
    const { pipelineMetadata } = state
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

    const updatedPipelineMetadata = {
      name: pipeline.name || pipelineMetadata.name,
      identifier: pipeline?.identifier || pipelineMetadata.identifier,
      tags: pipeline?.tags || pipelineMetadata?.tags || {},
      description: pipeline?.description || pipelineMetadata.description || '',
      projectIdentifier: pipeline?.projectIdentifier || pipelineMetadata.projectIdentifier,
      orgIdentifier: pipeline?.orgIdentifier || pipelineMetadata.orgIdentifier
    }

    // lodash.isEqual() gives wrong output some times, hence using fast-json-stable-stringify
    const isUpdated = comparePipelines(omit(state.originalPipeline, 'repo', 'branch'), pipeline as PipelineInfoConfig)
    const payload: PipelinePayloadY1 = {
      identifier: id,
      pipeline: pipeline as PipelineInfoConfig,
      originalPipeline: state.originalPipeline,
      isUpdated,
      gitDetails: { repoIdentifier: state.routeState.repoIdentifier, repoName: state.routeState.repoName }
    }

    await idb.put(payload)

    dispatch(
      PipelineContextActionsY1.success({
        error: '',
        pipeline,
        isUpdated,
        ...(pipelineMetadata && { pipelineMetadata: updatedPipelineMetadata as PipelineMetadata })
      })
    )
  }
}

export const deletePipelineCacheAction = ({
  gitDetails,
  idb
}: {
  gitDetails?: EntityGitDetails
  idb: IDB<PipelinePayloadY1>
}): ((
  dispatch: DispatchFunc<PipelineReducerStateY1, ActionReturnTypeY1>,
  getState: () => PipelineReducerStateY1
) => Promise<void>) => {
  return async (_dispatch, getState) => {
    const { routeState } = getState()
    await deletePipelineFromIDB({ routeState, identifier: routeState.pipelineIdentifier ?? '', gitDetails, idb })
  }
}
