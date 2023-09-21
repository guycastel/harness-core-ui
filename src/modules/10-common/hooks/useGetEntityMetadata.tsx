/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { useParams } from 'react-router-dom'
import { defaultTo } from 'lodash-es'
import { StoreType } from '@common/constants/GitSyncTypes'
import type { Module, ModulePathParams } from '@common/interfaces/RouteInterfaces'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import type { EntityDetail, NGTemplateReference } from 'services/cd-ng'
import { getPipelineSummaryPromise, ResponsePMSPipelineSummaryResponse } from 'services/pipeline-ng'
import { getTemplateMetadataListPromise, TemplateMetadataSummaryResponse } from 'services/template-ng'
import { getScopeBasedProjectPathParams } from '@common/components/EntityReference/EntityReference'
import { Scope } from '@common/interfaces/SecretsInterface'

export interface EntityScope {
  accountIdentifier?: string
  orgIdentifier?: string
  projectIdentifier?: string
  branch?: string
  versionLabel?: string
  entityScope?: NGTemplateReference['scope']
}

export interface UseGetEntityUrlProp {
  entityInfo?: EntityDetail & {
    entityRef?: NGTemplateReference & { envIdentifier?: string; pipelineIdentifier?: string }
  }
  isNewNav: boolean
}

export const getPipelineMetadataByIdentifier = (
  scope: EntityScope,
  identifier: string,
  signal?: AbortSignal
): Promise<ResponsePMSPipelineSummaryResponse> => {
  return getPipelineSummaryPromise(
    {
      pipelineIdentifier: identifier,
      queryParams: {
        accountIdentifier: scope.accountIdentifier || '',
        orgIdentifier: scope.orgIdentifier || '',
        projectIdentifier: scope.projectIdentifier || '',
        getMetadataOnly: true
      },
      requestOptions: {
        headers: {
          'content-type': 'application/json'
        }
      }
    },
    signal
  ).then((response: ResponsePMSPipelineSummaryResponse) => {
    return response
  })
}

export const getTemplateMetadataByIdentifier = (
  scope: EntityScope,
  identifier: string,
  signal?: AbortSignal
): Promise<TemplateMetadataSummaryResponse> => {
  return getTemplateMetadataListPromise(
    {
      queryParams: {
        ...getScopeBasedProjectPathParams(
          {
            accountId: defaultTo(scope.accountIdentifier, ''),
            projectIdentifier: defaultTo(scope.projectIdentifier, ''),
            orgIdentifier: defaultTo(scope.orgIdentifier, '')
          },
          scope?.entityScope as Scope
        ),
        templateListType: 'All'
      },
      body: {
        filterType: 'Template',
        templateIdentifiers: [identifier]
      }
    },
    signal
  )
    .then(response => {
      if (response.status === 'SUCCESS' && response.data?.content) {
        return response.data?.content[0]
      }
      throw new Error()
    })
    .catch(error => {
      throw new Error(error)
    })
}

export const getPipelineUrl = async (scope: EntityScope, identifier: string, isNewNav: boolean): Promise<string> => {
  const { accountIdentifier = '', orgIdentifier = '', projectIdentifier = '', branch = '' } = scope
  const pipelineMetadataResponse = await getPipelineMetadataByIdentifier(scope, identifier)
  const pipelineMetadata = pipelineMetadataResponse?.data
  const inlinePipelineUrl = isNewNav
    ? `${routesV2.toPipelineStudio({
        accountId: accountIdentifier,
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier: identifier,
        storeType: StoreType.INLINE,
        mode: 'all'
      })}`
    : `${routes.toPipelineStudio({
        accountId: accountIdentifier,
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier: identifier,
        storeType: StoreType.INLINE
      })}`

  const pipelineListUrl = isNewNav
    ? routesV2.toPipelines({ orgIdentifier, projectIdentifier, accountId: accountIdentifier, mode: 'all' })
    : routes.toPipelines({ orgIdentifier, projectIdentifier, accountId: accountIdentifier })

  if (pipelineMetadataResponse?.status !== 'SUCCESS') {
    // Without metadata can not open pipelineStudio so redirecting to list
    return Promise.resolve(pipelineListUrl)
  } else if (pipelineMetadata?.storeType === StoreType.REMOTE) {
    return Promise.resolve(
      isNewNav
        ? routesV2.toPipelineStudio({
            accountId: accountIdentifier,
            orgIdentifier,
            projectIdentifier,
            pipelineIdentifier: identifier,
            storeType: pipelineMetadata?.storeType,
            connectorRef: pipelineMetadata?.connectorRef,
            repoName: pipelineMetadata?.gitDetails?.repoName,
            mode: 'all',
            ...(branch ? { branch } : {})
          })
        : routes.toPipelineStudio({
            accountId: accountIdentifier,
            orgIdentifier,
            projectIdentifier,
            pipelineIdentifier: identifier,
            storeType: pipelineMetadata?.storeType,
            connectorRef: pipelineMetadata?.connectorRef,
            repoName: pipelineMetadata?.gitDetails?.repoName,
            ...(branch ? { branch } : {})
          })
    )
  } else if (pipelineMetadata?.storeType === StoreType.INLINE) {
    return Promise.resolve(inlinePipelineUrl)
  } else {
    // Handling oldGitsync and old DB pipelines which do not have StoreType
    return Promise.resolve(pipelineListUrl)
  }
}

const getTriggerUrl = async (
  scope: EntityScope & { pipelineIdentifier?: string; module?: Module },
  triggerIdentifier: string,
  isNewNav: boolean
): Promise<string> => {
  const {
    accountIdentifier = '',
    orgIdentifier = '',
    projectIdentifier = '',
    branch = '',
    pipelineIdentifier = '',
    module
  } = scope
  const pipelineMetadataResponse = await getPipelineMetadataByIdentifier(scope, pipelineIdentifier)
  const pipelineMetadata = pipelineMetadataResponse?.data
  const inlineTriggerUrl = isNewNav
    ? `${routesV2.toTriggersDetailPage({
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier,
        triggerIdentifier,
        accountId: accountIdentifier,
        module,
        storeType: StoreType.INLINE
      })}`
    : `${routes.toTriggersDetailPage({
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier,
        triggerIdentifier,
        accountId: accountIdentifier,
        module,
        storeType: StoreType.INLINE
      })}`

  const triggerListUrl = isNewNav
    ? routesV2.toTriggersPage({
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier,
        accountId: accountIdentifier,
        module
      })
    : routes.toTriggersPage({
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier,
        accountId: accountIdentifier,
        module
      })

  if (pipelineMetadataResponse?.status !== 'SUCCESS') {
    // Without metadata can not open triggers page so redirecting to triggers list
    return Promise.resolve(triggerListUrl)
  } else if (pipelineMetadata?.storeType === StoreType.REMOTE) {
    return Promise.resolve(
      isNewNav
        ? routesV2.toTriggersDetailPage({
            orgIdentifier,
            projectIdentifier,
            pipelineIdentifier,
            triggerIdentifier: triggerIdentifier,
            accountId: accountIdentifier,
            module,
            storeType: pipelineMetadata?.storeType,
            connectorRef: pipelineMetadata?.connectorRef,
            repoName: pipelineMetadata?.gitDetails?.repoName,
            ...(branch ? { branch } : {})
          })
        : routes.toTriggersDetailPage({
            orgIdentifier,
            projectIdentifier,
            pipelineIdentifier,
            triggerIdentifier: triggerIdentifier,
            accountId: accountIdentifier,
            module,
            storeType: pipelineMetadata?.storeType,
            connectorRef: pipelineMetadata?.connectorRef,
            repoName: pipelineMetadata?.gitDetails?.repoName,
            ...(branch ? { branch } : {})
          })
    )
  } else if (pipelineMetadata?.storeType === StoreType.INLINE) {
    return Promise.resolve(inlineTriggerUrl)
  } else {
    // Handling oldGitsync and old DB pipelines which do not have StoreType
    return Promise.resolve(triggerListUrl)
  }
}

const getTemplateUrl = async (scope: EntityScope, identifier: string, isNewNav: boolean): Promise<string> => {
  const { accountIdentifier = '', orgIdentifier = '', projectIdentifier = '', versionLabel = '', branch = '' } = scope

  const templateListUrl = `${routes.toTemplates({
    accountId: accountIdentifier,
    orgIdentifier,
    projectIdentifier
  })}`

  return getTemplateMetadataByIdentifier(scope, identifier)
    .then(templateMetadata => {
      if (templateMetadata?.storeType) {
        return Promise.resolve(
          isNewNav
            ? `${routesV2.toSettingsTemplateStudioNew({
                accountId: accountIdentifier,
                orgIdentifier,
                projectIdentifier,
                templateIdentifier: identifier,
                templateType: templateMetadata?.templateEntityType,
                versionLabel: versionLabel,
                branch: branch,
                mode: 'all'
              })}`
            : `${routes.toTemplateStudioNew({
                accountId: accountIdentifier,
                orgIdentifier,
                projectIdentifier,
                templateIdentifier: identifier,
                templateType: templateMetadata?.templateEntityType,
                versionLabel: versionLabel,
                branch: branch
              })}`
        )
      } else {
        return Promise.resolve(templateListUrl)
      }
    })
    .catch(() => {
      return Promise.resolve(templateListUrl)
    })
}

export const useGetEntityMetadata = (
  prop: UseGetEntityUrlProp
): {
  getEntityURL: () => Promise<string>
  overrideEntityInfo: (overrideEntityProp: UseGetEntityUrlProp) => Promise<string>
} => {
  const { entityInfo, isNewNav } = prop
  const { module } = useParams<ModulePathParams>()

  const getEntityURL = async (overrideEntityProp?: UseGetEntityUrlProp): Promise<string> => {
    let entityUrl: string
    const overrideEntityData = overrideEntityProp?.entityInfo
    const {
      accountIdentifier = '',
      orgIdentifier = '',
      projectIdentifier = '',
      identifier = '',
      pipelineIdentifier,
      branch
    } = overrideEntityData?.entityRef || entityInfo?.entityRef || {}
    const entityType = overrideEntityData?.type || entityInfo?.type

    switch (entityType) {
      case 'Connectors':
        entityUrl = isNewNav
          ? routesV2.toConnectorDetails({
              accountId: accountIdentifier,
              connectorId: identifier,
              orgIdentifier,
              projectIdentifier,
              mode: 'all'
            })
          : routes.toConnectorDetails({
              accountId: accountIdentifier,
              connectorId: identifier,
              orgIdentifier,
              projectIdentifier
            })
        break
      case 'Service':
        entityUrl = isNewNav
          ? `${routesV2.toServiceStudio({
              accountId: accountIdentifier,
              serviceId: identifier,
              orgIdentifier,
              projectIdentifier,
              module
            })}?tab=configuration`
          : `${routes.toServiceStudio({
              accountId: accountIdentifier,
              serviceId: identifier,
              orgIdentifier,
              projectIdentifier,
              module
            })}?tab=configuration`
        break
      case 'Template':
        {
          entityUrl = await getTemplateUrl(
            {
              accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              branch,
              versionLabel: entityInfo?.entityRef?.versionLabel,
              entityScope: entityInfo?.entityRef?.scope
            },
            identifier,
            isNewNav
          )
        }

        break
      case 'Pipelines':
        {
          entityUrl = await getPipelineUrl(
            {
              accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              branch
            },
            identifier,
            isNewNav
          )
        }
        break
      case 'Secrets':
        entityUrl = isNewNav
          ? `${routesV2.toSecretDetailsOverview({
              accountId: accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              secretId: identifier,
              mode: 'all'
            })}`
          : `${routes.toSecretDetailsOverview({
              accountId: accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              secretId: identifier
            })}`
        break
      case 'Environment':
        entityUrl = isNewNav
          ? `${routesV2.toEnvironmentDetails({
              accountId: accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              environmentIdentifier: identifier,
              module
            })}`
          : `${routes.toEnvironmentDetails({
              accountId: accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              environmentIdentifier: identifier,
              module
            })}`
        break
      case 'EnvironmentGroup':
        entityUrl = isNewNav
          ? `${routesV2.toEnvironmentGroupDetails({
              accountId: accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              environmentGroupIdentifier: identifier,
              module
            })}`
          : `${routes.toEnvironmentGroupDetails({
              accountId: accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              environmentGroupIdentifier: identifier,
              module
            })}`
        break
      case 'Infrastructure':
        entityUrl = isNewNav
          ? `${routesV2.toEnvironmentDetails({
              accountId: accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              environmentIdentifier: defaultTo(entityInfo?.entityRef?.envIdentifier, ''),
              module
            })}?sectionId=INFRASTRUCTURE&infrastructureId=${identifier}`
          : `${routes.toEnvironmentDetails({
              accountId: accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              environmentIdentifier: defaultTo(entityInfo?.entityRef?.envIdentifier, ''),
              module
            })}?sectionId=INFRASTRUCTURE&infrastructureId=${identifier}`
        break
      case 'MonitoredService':
        entityUrl = isNewNav
          ? routesV2.toCVAddMonitoringServicesEdit({
              accountId: accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              identifier,
              module: 'cv'
            })
          : routes.toCVAddMonitoringServicesEdit({
              accountId: accountIdentifier,
              orgIdentifier,
              projectIdentifier,
              identifier,
              module: 'cv'
            })
        break
      case 'Triggers':
        entityUrl = await getTriggerUrl(
          {
            orgIdentifier,
            projectIdentifier,
            pipelineIdentifier,
            accountIdentifier,
            module,
            branch
          },
          identifier,
          isNewNav
        )
        break
      default:
        entityUrl = isNewNav
          ? routesV2.toLandingDashboard({ accountId: accountIdentifier })
          : routes.toLandingDashboard({ accountId: accountIdentifier })
    }

    return Promise.resolve(entityUrl)
  }

  const overrideEntityInfo = async (overrideEntityProp: UseGetEntityUrlProp): Promise<string> => {
    return await getEntityURL(overrideEntityProp)
  }

  return {
    getEntityURL,
    overrideEntityInfo
  }
}
