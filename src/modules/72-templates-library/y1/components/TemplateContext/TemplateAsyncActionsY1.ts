/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { cloneDeep, defaultTo, isEqual, maxBy } from 'lodash-es'
import { parse } from 'yaml'
import { TemplateMetadataSummaryResponse, TemplateResponse, TemplateSummaryResponse } from 'services/template-ng'
import { TemplateListType } from '@templates-library/pages/TemplatesPage/TemplatesPageUtils'
import { DefaultNewTemplateId, DefaultNewVersionLabel } from 'framework/Templates/templates'
import type { EntityGitDetails, Error, GetTemplateQueryParams } from 'services/template-ng'

import { loggerFor } from 'framework/logging/logging'
import { ModuleName } from 'framework/types/ModuleName'
import { StoreMetadata } from '@common/constants/GitSyncTypes'
import {
  getTemplateMetadata,
  getTemplateYaml,
  getTemplatesByIdentifier
} from '@templates-library/common/components/TemplateStudio/TemplateLoaderContext/helpers'
import {
  DefaultTemplateMetadataY1,
  DefaultTemplateY1,
  getId
} from '@templates-library/common/components/TemplateStudio/TemplateLoaderContext/utils'
import { isNewTemplate } from '@templates-library/components/TemplateStudio/TemplateStudioUtils'
import { IDB } from '@modules/10-common/components/IDBContext/IDBContext'
import { DispatchFunc } from '@modules/10-common/hooks/useThunkReducer'
import { NGTemplateInfoConfigY1_Tmp, TemplateMetadata_Tmp, TemplatePayloadY1 } from './types'
import { ActionReturnTypeY1, TemplateContextActionsY1, compareTemplates } from './TemplateActionsY1'
import { TemplateReducerStateY1 } from './TemplateReducerY1'

const logger = loggerFor(ModuleName.TEMPLATES)

export interface FetchTemplateUnboundProps {
  forceFetch?: boolean
  forceUpdate?: boolean
  signal?: AbortSignal
  repoIdentifier?: string
  repoName?: string
  branch?: string
  loadFromCache?: boolean
}

export interface FetchTemplateBoundProps {
  queryParams: GetTemplateQueryParams
  templateIdentifier: string
  versionLabel?: string
  gitDetails: EntityGitDetails
  templateType: string
  isGitCacheEnabled?: boolean
  isDBInitializationFailed?: boolean
}

export const fetchTemplateV1Action = (
  args: FetchTemplateBoundProps,
  fetchProps: FetchTemplateUnboundProps,
  { idb }: { idb: IDB<TemplatePayloadY1> }
): ((
  dispatch: DispatchFunc<TemplateReducerStateY1, ActionReturnTypeY1>,
  getState: () => TemplateReducerStateY1
) => Promise<void>) => {
  return async (dispatch, _getState) => {
    const { queryParams, templateIdentifier, versionLabel = '', gitDetails, templateType } = args
    const { forceFetch = false, forceUpdate = false, signal, repoIdentifier, branch } = fetchProps

    let id = getId(
      queryParams.accountIdentifier,
      defaultTo(queryParams.orgIdentifier, ''),
      defaultTo(queryParams.projectIdentifier, ''),
      templateIdentifier,
      versionLabel,
      defaultTo(gitDetails.repoIdentifier, ''),
      defaultTo(gitDetails.branch, '')
    )
    if (idb.idb) {
      dispatch(TemplateContextActionsY1.fetching())

      let data = await idb.get(id)

      if ((!data || forceFetch) && !isNewTemplate(templateIdentifier)) {
        try {
          const templatesList: TemplateSummaryResponse[] = await getTemplatesByIdentifier(
            {
              ...queryParams,
              templateListType: TemplateListType.All,
              ...(repoIdentifier && branch ? { repoIdentifier, branch } : {})
            },
            templateIdentifier,
            signal
          )

          const versions: string[] = templatesList.map(item => defaultTo(item.versionLabel, ''))
          const defaultVersion = defaultTo(templatesList.find(item => item.stableTemplate)?.versionLabel, '')
          const selectedVersion = versions.includes(versionLabel) ? versionLabel : defaultVersion
          const stableVersion = templatesList.find(item => item.stableTemplate)?.versionLabel
          const lastPublishedVersion = maxBy(templatesList, 'createdAt')?.versionLabel
          const templateWithGitDetails = templatesList.find(item => item.versionLabel === selectedVersion)
          id = getId(
            queryParams.accountIdentifier,
            defaultTo(queryParams.orgIdentifier, ''),
            defaultTo(queryParams.projectIdentifier, ''),
            templateIdentifier,
            versionLabel,
            defaultTo(gitDetails.repoIdentifier, templateWithGitDetails?.gitDetails?.repoIdentifier ?? ''),
            defaultTo(gitDetails.branch, templateWithGitDetails?.gitDetails?.branch ?? '')
          )

          data = await idb.get(id)

          let template: NGTemplateInfoConfigY1_Tmp
          let templateMetadata: TemplateMetadata_Tmp

          const templateYamlStr = defaultTo(templateWithGitDetails?.yaml, '')
          try {
            template = defaultTo(parse(templateYamlStr), {})
            templateMetadata = {
              name: defaultTo(templateWithGitDetails?.name, ''),
              identifier: defaultTo(templateWithGitDetails?.identifier, ''),
              versionLabel: defaultTo(templateWithGitDetails?.versionLabel, '')
            }
          } catch (e) {
            // It is assumed that execution will come here, if there are only syntatical errors in yaml string
            /* istanbul ignore next */
            template = {
              ...DefaultTemplateY1,
              spec: { type: defaultTo(templateWithGitDetails?.childType, 'Step') as 'Step' | 'Stage' }
            }
            templateMetadata = { ...DefaultTemplateMetadataY1 }
          }

          dispatchTemplateSuccess({
            dispatch,
            data,
            forceUpdate,
            id,
            stableVersion,
            lastPublishedVersion,
            template,
            templateMetadata,
            templateWithGitDetails,
            templateYamlStr,
            versions,
            idb
          })
        } catch (_) {
          logger.info('Failed to fetch template list')
        }
      } else {
        dispatch(
          TemplateContextActionsY1.success({
            error: '',
            template: defaultTo(data?.template, {
              ...DefaultTemplateY1,
              spec: { type: templateType as NGTemplateInfoConfigY1_Tmp['spec']['type'] }
            }),
            originalTemplate: defaultTo(
              cloneDeep(data?.template),
              cloneDeep({
                ...DefaultTemplateY1,
                spec: { type: templateType as NGTemplateInfoConfigY1_Tmp['spec']['type'] }
              })
            ),
            templateMetadata: {
              ...DefaultTemplateMetadataY1
            },
            isUpdated: true,
            isBETemplateUpdated: false,
            versions: [DefaultNewVersionLabel],
            stableVersion: DefaultNewVersionLabel,
            gitDetails: defaultTo(data?.gitDetails, {}),
            entityValidityDetails: defaultTo(data?.entityValidityDetails, {}),
            cacheResponseMetadata: data?.cacheResponseMetadata,
            templateYaml: defaultTo(data?.templateYaml, '')
          })
        )
        dispatch(TemplateContextActionsY1.initialized())
      }
    } else {
      dispatch(TemplateContextActionsY1.success({ error: 'DB is not initialized' }))
    }
  }
}

export const fetchTemplateV2Action = (
  args: FetchTemplateBoundProps,
  fetchProps: FetchTemplateUnboundProps,
  { idb }: { idb: IDB<TemplatePayloadY1> }
): ((
  dispatch: DispatchFunc<TemplateReducerStateY1, ActionReturnTypeY1>,
  getState: () => TemplateReducerStateY1
) => Promise<void>) => {
  return async (dispatch, _getState) => {
    const { queryParams, templateIdentifier, versionLabel = '', gitDetails, templateType, isGitCacheEnabled } = args
    const { forceFetch = false, forceUpdate = false, signal, repoName, branch, loadFromCache = true } = fetchProps

    let id = getId(
      queryParams.accountIdentifier,
      defaultTo(queryParams.orgIdentifier, ''),
      defaultTo(queryParams.projectIdentifier, ''),
      templateIdentifier,
      versionLabel,
      defaultTo(repoName, ''),
      defaultTo(gitDetails.branch, '')
    )
    if (idb.idb) {
      dispatch(TemplateContextActionsY1.fetching())

      let data = await idb.get(id)

      let templateMetadataSummary: TemplateMetadataSummaryResponse[] = []
      if ((!data || forceFetch) && !isNewTemplate(templateIdentifier)) {
        try {
          templateMetadataSummary = await getTemplateMetadata(
            {
              ...queryParams,
              templateListType: TemplateListType.All,
              size: 100,
              ...(repoName && branch ? { repoName, branch } : {})
            },
            templateIdentifier,
            signal
          )

          const versions: string[] = templateMetadataSummary.map(item => defaultTo(item.versionLabel, ''))
          const stableVersion = templateMetadataSummary.find(item => item.stableTemplate)?.versionLabel
          const lastPublishedVersion = maxBy(templateMetadataSummary, 'createdAt')?.versionLabel
          const storeType = templateMetadataSummary.at(0)?.storeType
          const loadFromFallbackBranch = !branch && !queryParams.branch && storeType === 'REMOTE'

          const templateWithGitDetails = await getTemplateYaml(
            {
              ...queryParams,
              versionLabel,
              ...(repoName && branch ? { repoName, branch } : {}),
              ...(loadFromFallbackBranch && { loadFromFallbackBranch: true })
            },
            templateIdentifier,
            !!isGitCacheEnabled,
            loadFromCache,
            signal
          )

          id = getId(
            queryParams.accountIdentifier,
            defaultTo(queryParams.orgIdentifier, ''),
            defaultTo(queryParams.projectIdentifier, ''),
            templateIdentifier,
            versionLabel,
            defaultTo(repoName, templateWithGitDetails?.gitDetails?.repoName ?? ''),
            defaultTo(gitDetails.branch, templateWithGitDetails?.gitDetails?.branch ?? '')
          )

          data = await idb.get(id)

          let template: NGTemplateInfoConfigY1_Tmp
          let templateMetadata: TemplateMetadata_Tmp

          const templateYamlStr = defaultTo(templateWithGitDetails?.yaml, '')
          try {
            template = defaultTo(parse(templateYamlStr), {})
            templateMetadata = {
              name: defaultTo(templateWithGitDetails?.name, ''),
              identifier: defaultTo(templateWithGitDetails?.identifier, ''),
              versionLabel: defaultTo(templateWithGitDetails?.versionLabel, ''),
              projectIdentifier: templateWithGitDetails?.projectIdentifier,
              orgIdentifier: templateWithGitDetails?.orgIdentifier
            }
          } catch (e) {
            // It is assumed that execution will come here, if there are only syntatical errors in yaml string
            /* istanbul ignore next */
            template = {
              ...DefaultTemplateY1,
              spec: { type: defaultTo(templateWithGitDetails?.childType, 'Step') as 'Step' | 'Stage' }
            }
            templateMetadata = { ...DefaultTemplateMetadataY1 }
          }

          dispatchTemplateSuccess({
            dispatch,
            data,
            forceUpdate: forceUpdate || !!templateWithGitDetails.cacheResponseMetadata?.isSyncEnabled,
            id,
            stableVersion,
            lastPublishedVersion,
            template,
            templateMetadata,
            templateWithGitDetails,
            templateYamlStr,
            versions,
            idb
          })
        } catch (error) {
          if (
            (error as Error).code === 'INVALID_REQUEST' ||
            (error as Error).code === 'HINT' ||
            (error as Error).code === 'EXPLANATION' ||
            (error as Error).code === 'SCM_BAD_REQUEST'
          ) {
            const template = templateMetadataSummary.find(item => item.versionLabel === versionLabel)
            const versions: string[] = templateMetadataSummary.map(item => defaultTo(item.versionLabel, ''))
            const stableVersion = templateMetadataSummary.find(item => item.stableTemplate)?.versionLabel
            const lastPublishedVersion = maxBy(templateMetadataSummary, 'createdAt')?.versionLabel
            const storeMetadata = {
              connectorRef: (template as TemplateResponse)?.connectorRef,
              storeType: (template as TemplateResponse)?.storeType,
              repoName: template?.gitDetails?.repoName,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              branch: (error as any)?.metadata?.branch ?? gitDetails?.branch,
              filePath: template?.gitDetails?.filePath
            }

            if (template?.templateEntityType)
              dispatch(
                TemplateContextActionsY1.error({
                  template: {
                    ...(template as NGTemplateInfoConfigY1_Tmp),
                    spec: { ...(template as NGTemplateInfoConfigY1_Tmp).spec, type: template?.templateEntityType }
                  },
                  stableVersion,
                  lastPublishedVersion,
                  storeMetadata,
                  gitDetails: {
                    repoName: storeMetadata.repoName,
                    filePath: storeMetadata.filePath,
                    branch: storeMetadata.branch,
                    fileUrl: template.gitDetails?.fileUrl
                  },
                  versions,
                  templateYamlError: error as Error,
                  cacheResponseMetadata: undefined
                })
              )
          }
          dispatch(TemplateContextActionsY1.initialized())
          logger.info('Failed to fetch template')
        }
      } else {
        dispatch(
          TemplateContextActionsY1.success({
            error: '',
            // template: defaultTo(data?.template, {
            //   ...DefaultTemplate,
            //   type: templateType as NGTemplateInfoConfig['type'],
            //   projectIdentifier: queryParams.projectIdentifier,
            //   orgIdentifier: queryParams.orgIdentifier
            // }),
            // originalTemplate: defaultTo(
            //   cloneDeep(data?.template),
            //   cloneDeep({
            //     ...DefaultTemplate,
            //     type: templateType as NGTemplateInfoConfig['type'],
            //     projectIdentifier: queryParams.projectIdentifier,
            //     orgIdentifier: queryParams.orgIdentifier
            //   })
            // ),
            template: defaultTo(data?.template, {
              ...DefaultTemplateY1,
              spec: { type: templateType as NGTemplateInfoConfigY1_Tmp['spec']['type'] }
            }),
            originalTemplate: defaultTo(
              cloneDeep(data?.template),
              cloneDeep({
                ...DefaultTemplateY1,
                spec: { type: templateType as NGTemplateInfoConfigY1_Tmp['spec']['type'] }
              })
            ),
            templateMetadata: {
              ...DefaultTemplateMetadataY1
            },
            isUpdated: true,
            isBETemplateUpdated: false,
            versions: [DefaultNewVersionLabel],
            stableVersion: DefaultNewVersionLabel,
            gitDetails: defaultTo(data?.gitDetails, {}),
            storeMetadata: {
              connectorRef: data?.connectorRef,
              storeType: data?.storeType,
              repoName: data?.gitDetails?.repoName,
              branch: data?.gitDetails?.branch,
              filePath: data?.gitDetails?.filePath
            },
            entityValidityDetails: defaultTo(data?.entityValidityDetails, {}),
            cacheResponseMetadata: data?.cacheResponseMetadata,
            templateYaml: defaultTo(data?.templateYaml, '')
          })
        )
        dispatch(TemplateContextActionsY1.initialized())
      }
    } else {
      dispatch(TemplateContextActionsY1.success({ error: 'DB is not initialized' }))
    }
  }
}

interface UpdateTemplateArgs {
  queryParams: GetTemplateQueryParams
  identifier: string
  versionLabel?: string
}

type UpdateTemplateMetadataArgs = UpdateTemplateArgs

export const updateTemplateMetadataAction = ({
  templateMetadata,
  params,
  utils: { idb }
}: {
  templateMetadata: TemplateMetadata_Tmp
  params: UpdateTemplateMetadataArgs
  utils: { idb: IDB<TemplatePayloadY1> }
}): ((
  dispatch: DispatchFunc<TemplateReducerStateY1, ActionReturnTypeY1>,
  getState: () => TemplateReducerStateY1
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { queryParams, identifier, versionLabel = '' } = params
    const {
      originalTemplate,
      versions,
      stableVersion,
      gitDetails,
      template,
      isUpdated,
      templateMetadata: latestTemplateMetadata
    } = getState()

    const isUpdatedMetadata = !isEqual(templateMetadata, latestTemplateMetadata)

    const id = getId(
      queryParams.accountIdentifier,
      queryParams.orgIdentifier || '',
      queryParams.projectIdentifier || '',
      identifier,
      versionLabel,
      defaultTo(gitDetails?.repoName, gitDetails?.repoIdentifier ?? ''),
      defaultTo(gitDetails?.branch, '')
    )
    const payload: TemplatePayloadY1 = {
      identifier: id,
      template,
      templateMetadata,
      originalTemplate,
      versions,
      stableVersion,
      isUpdated,
      isUpdatedMetadata,
      gitDetails
    }
    await idb.put(payload)

    dispatch(TemplateContextActionsY1.success({ error: '', templateMetadata, isUpdatedMetadata }))
  }
}

export const updateTemplateAction = ({
  templateArg,
  params,
  utils: { idb }
}: {
  templateArg: NGTemplateInfoConfigY1_Tmp | ((p: NGTemplateInfoConfigY1_Tmp) => NGTemplateInfoConfigY1_Tmp)
  params: UpdateTemplateArgs
  utils: { idb: IDB<TemplatePayloadY1> }
}): ((
  dispatch: DispatchFunc<TemplateReducerStateY1, ActionReturnTypeY1>,
  getState: () => TemplateReducerStateY1
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { queryParams, identifier, versionLabel = '' } = params
    const {
      originalTemplate,
      versions,
      stableVersion,
      gitDetails,
      template: latestTemplate,
      templateMetadata,
      isUpdatedMetadata
    } = getState()

    const id = getId(
      queryParams.accountIdentifier,
      queryParams.orgIdentifier || '',
      queryParams.projectIdentifier || '',
      identifier,
      versionLabel,
      defaultTo(gitDetails?.repoName, gitDetails?.repoIdentifier ?? ''),
      defaultTo(gitDetails?.branch, '')
    )

    let template = templateArg

    if (typeof templateArg === 'function') {
      const dbTemplate = await idb.get(id)
      if (dbTemplate?.template) {
        template = templateArg(dbTemplate.template)
      } else {
        // Template does not exist in the db
        template = templateArg(latestTemplate)
      }
    }

    const isUpdated = compareTemplates(originalTemplate, template as NGTemplateInfoConfigY1_Tmp)
    const payload: TemplatePayloadY1 = {
      identifier: id,
      template: template as NGTemplateInfoConfigY1_Tmp,
      originalTemplate,
      templateMetadata,
      versions,
      stableVersion,
      isUpdated,
      isUpdatedMetadata,
      gitDetails
    }
    await idb.put(payload)

    dispatch(
      TemplateContextActionsY1.success({ error: '', template: template as NGTemplateInfoConfigY1_Tmp, isUpdated })
    )
  }
}

// const updateGitDetails = _updateGitDetails.bind(null, {
//   dispatch,
//   queryParams,
//   identifier: templateIdentifier,
//   versionLabel: versionLabel,
//   originalTemplate: state.originalTemplate,
//   template: state.template,
//   versions: state.versions,
//   stableVersion: state.stableVersion
// })

interface UpdateTemplateArgs {
  queryParams: GetTemplateQueryParams
  identifier: string
  versionLabel?: string
}

interface UpdateGitDetailsArgs {
  queryParams: GetTemplateQueryParams
  identifier: string
  versionLabel?: string
}

export const updateGitDetailsAction = ({
  gitDetails,
  params,
  utils: { idb }
}: {
  gitDetails: EntityGitDetails
  params: UpdateGitDetailsArgs
  utils: { idb: IDB<TemplatePayloadY1> }
}): ((
  dispatch: DispatchFunc<TemplateReducerStateY1, ActionReturnTypeY1>,
  getState: () => TemplateReducerStateY1
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { queryParams, identifier, versionLabel } = params
    const { originalTemplate, template, isUpdatedMetadata } = getState()

    await deleteTemplateCache({ queryParams, identifier, versionLabel, utils: { idb } })

    const id = getId(
      queryParams.accountIdentifier,
      defaultTo(queryParams.orgIdentifier, ''),
      defaultTo(queryParams.projectIdentifier, ''),
      identifier,
      defaultTo(versionLabel, ''),
      defaultTo(gitDetails.repoIdentifier, ''),
      defaultTo(gitDetails.branch, '')
    )

    const isUpdated = compareTemplates(originalTemplate, template)

    const payload: TemplatePayloadY1 = {
      identifier: id,
      template,
      originalTemplate,
      isUpdated,
      isUpdatedMetadata,
      gitDetails
    }
    await idb.put(payload)

    dispatch(TemplateContextActionsY1.success({ error: '', template, isUpdated, gitDetails }))
  }
}

interface UpdateGitDetailsArgs {
  queryParams: GetTemplateQueryParams
  identifier: string
  versionLabel?: string
}

export const updateStoreMetadataAction = ({
  args,
  storeMetadata,
  gitDetails,
  utils: { idb }
}: {
  args: UpdateGitDetailsArgs
  storeMetadata: StoreMetadata
  gitDetails?: EntityGitDetails
  utils: { idb: IDB<TemplatePayloadY1> }
}): ((
  dispatch: DispatchFunc<TemplateReducerStateY1, ActionReturnTypeY1>,
  getState: () => TemplateReducerStateY1
) => Promise<void>) => {
  return async (dispatch, getState) => {
    const { queryParams, identifier, versionLabel } = args
    const { originalTemplate, template, isUpdatedMetadata } = getState()

    await deleteTemplateCache({ queryParams, identifier, versionLabel, utils: { idb } })

    const id = getId(
      queryParams.accountIdentifier,
      defaultTo(queryParams.orgIdentifier, ''),
      defaultTo(queryParams.projectIdentifier, ''),
      identifier,
      defaultTo(versionLabel, ''),
      defaultTo(gitDetails?.repoName, ''),
      defaultTo(gitDetails?.branch, '')
    )
    const isUpdated = compareTemplates(originalTemplate, template)

    const payload: TemplatePayloadY1 = {
      identifier: id,
      template,
      originalTemplate,
      isUpdated,
      isUpdatedMetadata,
      storeMetadata,
      gitDetails
    }
    await idb.put(payload)

    dispatch(TemplateContextActionsY1.success({ error: '', template, isUpdated, storeMetadata, gitDetails }))
  }
}

export const deleteTemplateCacheAction = ({
  queryParams,
  identifier,
  versionLabel,
  utils: { idb }
}: {
  queryParams: GetTemplateQueryParams
  identifier: string
  versionLabel?: string
  utils: { idb: IDB<TemplatePayloadY1> }
}): ((
  dispatch: DispatchFunc<TemplateReducerStateY1, ActionReturnTypeY1>,
  getState: () => TemplateReducerStateY1
) => Promise<void>) => {
  return async (_dispatch, getState) => {
    const { gitDetails } = getState()

    await deleteTemplateCache({ queryParams, identifier, versionLabel, gitDetails, utils: { idb } })

    // if (IdbTemplate) {
    //   const id = getId(
    //     queryParams.accountIdentifier,
    //     queryParams.orgIdentifier || /* istanbul ignore next */ '',
    //     queryParams.projectIdentifier || /* istanbul ignore next */ '',
    //     identifier,
    //     defaultTo(versionLabel, ''),
    //     defaultTo(gitDetails?.repoName, gitDetails?.repoIdentifier ?? ''),
    //     defaultTo(gitDetails?.branch, '')
    //   )
    //   await IdbTemplate.delete(IdbTemplateStoreName, id)
    // }

    // // due to async operation, IdbPipeline may be undefined
    // if (IdbTemplate) {
    //   const defaultId = getId(
    //     queryParams.accountIdentifier,
    //     queryParams.orgIdentifier || /* istanbul ignore next */ '',
    //     queryParams.projectIdentifier || /* istanbul ignore next */ '',
    //     DefaultNewTemplateId,
    //     DefaultNewVersionLabel,
    //     defaultTo(gitDetails?.repoName, gitDetails?.repoIdentifier ?? ''),
    //     defaultTo(gitDetails?.branch, '')
    //   )
    //   await IdbTemplate.delete(IdbTemplateStoreName, defaultId)
    // }
  }
}

const deleteTemplateCache = async ({
  queryParams,
  identifier,
  versionLabel,
  gitDetails = {},
  utils: { idb }
}: {
  queryParams: GetTemplateQueryParams
  identifier: string
  versionLabel?: string
  gitDetails?: EntityGitDetails
  utils: { idb: IDB<TemplatePayloadY1> }
}): Promise<void> => {
  const id = getId(
    queryParams.accountIdentifier,
    queryParams.orgIdentifier || /* istanbul ignore next */ '',
    queryParams.projectIdentifier || /* istanbul ignore next */ '',
    identifier,
    defaultTo(versionLabel, ''),
    defaultTo(gitDetails?.repoName, gitDetails?.repoIdentifier ?? ''),
    defaultTo(gitDetails?.branch, '')
  )
  await idb.del(id)

  const defaultId = getId(
    queryParams.accountIdentifier,
    queryParams.orgIdentifier || /* istanbul ignore next */ '',
    queryParams.projectIdentifier || /* istanbul ignore next */ '',
    DefaultNewTemplateId,
    DefaultNewVersionLabel,
    defaultTo(gitDetails?.repoName, gitDetails?.repoIdentifier ?? ''),
    defaultTo(gitDetails?.branch, '')
  )
  await idb.del(defaultId)
}

interface DispatchTemplateSuccessArgs {
  dispatch: React.Dispatch<ActionReturnTypeY1>
  data: TemplatePayloadY1 | undefined
  forceUpdate: boolean
  template: NGTemplateInfoConfigY1_Tmp
  templateMetadata: TemplateMetadata_Tmp
  templateYamlStr: string
  versions: string[]
  templateWithGitDetails: TemplateSummaryResponse | TemplateResponse | undefined
  id: string
  stableVersion: string | undefined
  lastPublishedVersion: string | undefined
  idb: IDB<TemplatePayloadY1>
}
export const dispatchTemplateSuccess = async (args: DispatchTemplateSuccessArgs): Promise<void> => {
  const {
    dispatch,
    data,
    forceUpdate,
    template,
    templateMetadata,
    templateYamlStr,
    versions,
    templateWithGitDetails,
    id,
    stableVersion,
    lastPublishedVersion,
    idb
  } = args
  const storeMetadata = {
    connectorRef: (templateWithGitDetails as TemplateResponse)?.connectorRef,
    storeType: (templateWithGitDetails as TemplateResponse)?.storeType,
    repoName: templateWithGitDetails?.gitDetails?.repoName,
    branch: templateWithGitDetails?.gitDetails?.branch,
    filePath: templateWithGitDetails?.gitDetails?.filePath
  }
  if (data && !forceUpdate) {
    dispatch(
      TemplateContextActionsY1.success({
        error: '',
        template: data.template,
        templateMetadata,
        originalTemplate: cloneDeep(template),
        isBETemplateUpdated: data.cacheResponseMetadata?.isSyncEnabled
          ? false
          : compareTemplates(template, data.originalTemplate),
        isUpdated: compareTemplates(template, data.template),
        versions: versions,
        lastPublishedVersion,
        stableVersion: data.stableVersion,
        gitDetails: templateWithGitDetails?.gitDetails ?? defaultTo(data?.gitDetails, {}),
        entityValidityDetails: defaultTo(
          templateWithGitDetails?.entityValidityDetails,
          defaultTo(data?.entityValidityDetails, {})
        ),
        cacheResponseMetadata: (templateWithGitDetails as TemplateResponse)?.cacheResponseMetadata,
        storeMetadata,
        templateYaml: data?.templateYaml,
        templateYamlError: undefined
      })
    )
    dispatch(TemplateContextActionsY1.initialized())
  } else if (idb.idb) {
    const payload: TemplatePayloadY1 = {
      identifier: id,
      template: template,
      templateMetadata,
      originalTemplate: cloneDeep(template),
      isUpdated: false,
      isUpdatedMetadata: false,
      versions: versions,
      lastPublishedVersion,
      stableVersion: stableVersion,
      gitDetails: templateWithGitDetails?.gitDetails ?? defaultTo(data?.gitDetails, {}),
      storeMetadata,
      entityValidityDetails: defaultTo(
        templateWithGitDetails?.entityValidityDetails,
        defaultTo(data?.entityValidityDetails, {})
      ),
      cacheResponseMetadata: (templateWithGitDetails as TemplateResponse)?.cacheResponseMetadata,
      templateYaml: templateYamlStr
    }
    await idb.put(payload)
    dispatch(
      TemplateContextActionsY1.success({
        error: '',
        template: template,
        templateMetadata,
        originalTemplate: cloneDeep(template),
        isBETemplateUpdated: false,
        isUpdated: false,
        versions: versions,
        lastPublishedVersion,
        stableVersion: stableVersion,
        gitDetails: payload.gitDetails,
        storeMetadata: payload.storeMetadata,
        entityValidityDetails: payload.entityValidityDetails,
        cacheResponseMetadata: payload.cacheResponseMetadata,
        templateYaml: payload.templateYaml,
        templateYamlError: undefined
      })
    )
    dispatch(TemplateContextActionsY1.initialized())
  } else {
    dispatch(
      TemplateContextActionsY1.success({
        error: '',
        template: template,
        templateMetadata,
        originalTemplate: cloneDeep(template),
        isBETemplateUpdated: false,
        isUpdated: false,
        versions: versions,
        lastPublishedVersion,
        stableVersion: stableVersion,
        gitDetails: templateWithGitDetails?.gitDetails ?? {},
        storeMetadata,
        entityValidityDetails: defaultTo(templateWithGitDetails?.entityValidityDetails, {}),
        cacheResponseMetadata: (templateWithGitDetails as TemplateResponse)?.cacheResponseMetadata,
        templateYaml: templateYamlStr,
        templateYamlError: undefined
      })
    )
    dispatch(TemplateContextActionsY1.initialized())
  }
}
