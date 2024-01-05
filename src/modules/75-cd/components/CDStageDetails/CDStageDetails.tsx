/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useMemo, useState } from 'react'
import cx from 'classnames'
import { defaultTo, get } from 'lodash-es'
import { Link, useParams } from 'react-router-dom'
import { PopoverInteractionKind, Position } from '@blueprintjs/core'
import { Layout, Popover, Text } from '@harness/uicore'
import { Color } from '@harness/design-system'

import { String as StrTemplate } from 'framework/strings'
import type {
  Application,
  EnvironmentResponseDTO,
  GitOpsExecutionSummary,
  InfrastructureResponseDTO,
  ServiceResponseDTO
} from 'services/cd-ng'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { getScopeFromValue } from '@common/components/EntityReference/EntityReference'
import { getIdentifierFromScopedRef } from '@common/utils/utils'

import { Scope } from '@common/interfaces/SecretsInterface'
import type { ProjectPathProps, ModulePathParams, Module } from '@common/interfaces/RouteInterfaces'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import type { StageDetailProps } from '@pipeline/factories/ExecutionFactory/types'
import { ServicePopoverCard } from '@cd/components/ServicePopoverCard/ServicePopoverCard'
import { fetchServicesMetadata } from '@modules/70-pipeline/components/FormMultiTypeServiceFeild/Utils'
import {
  fetchEnvironmentsMetadata,
  fetchInfrastructuresMetadata
} from '@modules/70-pipeline/components/FormMultiTypeEnvironmentField/Utils'
import { StoreType } from '@modules/10-common/constants/GitSyncTypes'
import { getScopedServiceUrl } from '@modules/70-pipeline/utils/scopedUrlUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { EnvironmentDetailsTab, getRemoteInfrastructureQueryParams } from '../EnvironmentsV2/utils'
import { InfraDefinitionTabs } from '../EnvironmentsV2/EnvironmentDetails/InfrastructureDefinition/InfraDefinitionDetailsDrawer/InfraDefinitionDetailsDrawer'

import serviceCardCSS from '@cd/components/ServicePopoverCard/ServicePopoverCard.module.scss'
import css from './CDStageDetails.module.scss'

const GitopsApplications = ({
  gitOpsApps,
  orgIdentifier,
  projectIdentifier,
  accountId,
  module
}: {
  gitOpsApps: Application[]
  orgIdentifier: string
  projectIdentifier: string
  accountId: string
  module: Module
}): React.ReactElement | null => {
  if (gitOpsApps.length === 0) return null

  const firstApp: Application = gitOpsApps[0]

  return (
    <div data-test-id="GitopsApplications">
      <StrTemplate className={css.title} tagName="div" stringID="applications" />
      <ul className={css.values}>
        <li className={css.gitOpsAppsLi}>
          <Link
            onClick={e => e.stopPropagation()}
            to={routes.toGitOpsApplication({
              orgIdentifier,
              projectIdentifier,
              accountId,
              module,
              applicationId: (firstApp.identifier || firstApp.name) as string,
              agentId: firstApp.agentIdentifier
            })}
          >
            <Text>{firstApp.name}</Text>
          </Link>
          {gitOpsApps.length > 1 ? (
            <Popover
              interactionKind={PopoverInteractionKind.HOVER}
              className={css.serviceWrapper}
              position={Position.BOTTOM_RIGHT}
            >
              <span>,&nbsp;+{Math.abs(gitOpsApps.length - 1)}</span>
              <div className={serviceCardCSS.main}>
                <ul className={css.values}>
                  {gitOpsApps.slice(1).map((app: Application, index: number) => {
                    return (
                      <li key={app.identifier || index}>
                        <Link
                          onClick={e => e.stopPropagation()}
                          to={routes.toGitOpsApplication({
                            orgIdentifier,
                            projectIdentifier,
                            accountId,
                            module,
                            applicationId: (app.identifier || app.name) as string,
                            agentId: app.agentIdentifier
                          })}
                        >
                          <Text>{app.name}</Text>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Popover>
          ) : null}
        </li>
      </ul>
    </div>
  )
}

export function CDStageDetails(props: StageDetailProps): React.ReactElement {
  const { stage } = props
  const gitOpsApps = get(stage, 'moduleInfo.cd.gitOpsAppSummary.applications') || []
  const { orgIdentifier, projectIdentifier, accountId, module } = useParams<ProjectPathProps & ModulePathParams>()
  const { CDS_SERVICE_GITX, CDS_ENV_GITX, CDS_INFRA_GITX } = useFeatureFlags()
  const { isNewNavEnabled = false } = useAppStore()

  const gitOpsEnvironments = Array.isArray(get(stage, 'moduleInfo.cd.gitopsExecutionSummary.environments'))
    ? (get(stage, 'moduleInfo.cd.gitopsExecutionSummary') as Required<GitOpsExecutionSummary>).environments.map(
        envForGitOps =>
          defaultTo({ name: envForGitOps.name, identifier: envForGitOps.identifier }, { name: '', identifier: '' })
      )
    : []
  const infrastructureScope = getScopeFromValue(get(stage, 'moduleInfo.cd.infraExecutionSummary.identifier', ''))

  const getGitopsClusters = (envId: string) => {
    return Array.isArray(get(stage, 'moduleInfo.cd.gitopsExecutionSummary.clusters'))
      ? (get(stage, 'moduleInfo.cd.gitopsExecutionSummary') as Required<GitOpsExecutionSummary>).clusters.filter(
          cluster =>
            cluster.envName === envId &&
            defaultTo({ name: cluster.clusterName, identifier: cluster.clusterId }, { name: '', identifier: '' })
        )
      : []
  }
  const scopedServiceIdentifier = get(stage, 'moduleInfo.cd.serviceInfo.identifier', '')
  const serviceId = getIdentifierFromScopedRef(scopedServiceIdentifier)
  const environmentId = getIdentifierFromScopedRef(get(stage, 'moduleInfo.cd.infraExecutionSummary.identifier', ''))
  const infrastructureId = get(stage, 'moduleInfo.cd.infraExecutionSummary.infrastructureIdentifier', '')
  const [serviceMetadata, setServiceMetadata] = useState<ServiceResponseDTO>({})
  const [environmentMetadata, setEnvironmentMetadata] = useState<EnvironmentResponseDTO>({})
  const [infrastructuretMetadata, setInfrastructureMetadata] = useState<InfrastructureResponseDTO>({})

  useEffect(() => {
    if (CDS_SERVICE_GITX) {
      fetchServicesMetadata({
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        serviceIdentifiers: [serviceId]
      }).then(responseData => {
        responseData?.length && responseData?.[0]?.service && setServiceMetadata(responseData?.[0]?.service)
      })
    }
    if (CDS_ENV_GITX) {
      fetchEnvironmentsMetadata({
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        envIdentifiers: [environmentId]
      }).then(responseData => {
        responseData?.length && responseData?.[0]?.environment && setEnvironmentMetadata(responseData?.[0]?.environment)
      })
    }
    if (CDS_INFRA_GITX) {
      fetchInfrastructuresMetadata({
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        environmentIdentifier: environmentId,
        infraIdentifiers: [infrastructureId]
      }).then(responseData => {
        responseData?.length &&
          responseData?.[0]?.infrastructure &&
          setInfrastructureMetadata(responseData?.[0]?.infrastructure)
      })
    }
  }, [
    CDS_SERVICE_GITX,
    CDS_ENV_GITX,
    CDS_INFRA_GITX,
    accountId,
    orgIdentifier,
    projectIdentifier,
    serviceId,
    environmentId,
    infrastructureId
  ])

  const toServiceStudio = useMemo(
    () =>
      getScopedServiceUrl(
        {
          accountId,
          orgIdentifier,
          projectIdentifier,
          scopedServiceIdentifier,
          module,
          serviceMetadata,
          accountRoutePlacement: 'settings'
        },
        isNewNavEnabled
      ),
    [isNewNavEnabled, accountId, module, orgIdentifier, projectIdentifier, scopedServiceIdentifier, serviceMetadata]
  )

  const toEnvironmentDetails =
    isNewNavEnabled && !module
      ? routesV2.toSettingsEnvironmentDetails({
          accountId,
          ...(infrastructureScope !== Scope.ACCOUNT && { orgIdentifier: orgIdentifier }),
          ...(infrastructureScope === Scope.PROJECT && { projectIdentifier: projectIdentifier }),
          environmentIdentifier: getIdentifierFromScopedRef(
            get(stage, 'moduleInfo.cd.infraExecutionSummary.identifier', '')
          ),
          sectionId: 'INFRASTRUCTURE',
          ...(get(environmentMetadata, 'storeType', '') === StoreType.REMOTE && {
            storeType: get(environmentMetadata, 'storeType', ''),
            connectorRef: get(environmentMetadata, 'connectorRef', ''),
            repoName: get(environmentMetadata, 'entityGitDetails.repoName', '')
          })
        })
      : routes.toEnvironmentDetails({
          accountId,
          ...(infrastructureScope !== Scope.ACCOUNT && { orgIdentifier: orgIdentifier }),
          ...(infrastructureScope === Scope.PROJECT && { projectIdentifier: projectIdentifier }),
          environmentIdentifier: getIdentifierFromScopedRef(
            get(stage, 'moduleInfo.cd.infraExecutionSummary.identifier', '')
          ),
          module,
          sectionId: 'INFRASTRUCTURE',
          accountRoutePlacement: 'settings',
          ...(get(environmentMetadata, 'storeType', '') === StoreType.REMOTE && {
            storeType: get(environmentMetadata, 'storeType', ''),
            connectorRef: get(environmentMetadata, 'connectorRef', ''),
            repoName: get(environmentMetadata, 'entityGitDetails.repoName', '')
          })
        })

  const environmentInfrastructureDefinationQueryParams = {
    accountId,
    orgIdentifier,
    projectIdentifier,
    environmentIdentifier: get(stage, 'moduleInfo.cd.infraExecutionSummary.identifier', ''),
    sectionId: EnvironmentDetailsTab.INFRASTRUCTURE,
    infraDetailsTab: InfraDefinitionTabs.CONFIGURATION,
    infrastructureId: infrastructureId,
    ...getRemoteInfrastructureQueryParams(infrastructuretMetadata)
  }

  const toEnvironmentInfrastructureDefinitionDetails =
    isNewNavEnabled && !module
      ? routesV2.toSettingsEnvironmentDetails(environmentInfrastructureDefinationQueryParams)
      : routes.toEnvironmentDetails({
          module,
          ...environmentInfrastructureDefinationQueryParams
        })

  return (
    <div className={css.container}>
      <div className={cx(css.main, { [css.threeSections]: !!gitOpsApps.length })}>
        <div>
          <StrTemplate className={css.title} tagName="div" stringID="serviceOrServices" />
          <ul className={css.values}>
            <li>
              <Popover
                wrapperTagName="div"
                targetTagName="div"
                interactionKind="hover"
                position={Position.BOTTOM_RIGHT}
                className={css.serviceWrapper}
              >
                <div className={css.serviceName} data-testid={'serviceLink'}>
                  <Link to={toServiceStudio}>
                    <Text className={css.stageItemDetails} lineClamp={1} color={Color.PRIMARY_6}>
                      {get(stage, 'moduleInfo.cd.serviceInfo.displayName', null)}
                    </Text>
                  </Link>
                </div>
                <ServicePopoverCard service={get(stage, 'moduleInfo.cd.serviceInfo')} />
              </Popover>
            </li>
          </ul>
        </div>
        <div>
          <StrTemplate className={css.title} tagName="div" stringID="environmentOrEnvironments" />
          <ul className={css.values} data-testid={'environmentLink'}>
            {gitOpsEnvironments.length ? (
              <>
                {gitOpsEnvironments.map(env => {
                  const gitOpsEnvironmentScope = getScopeFromValue(defaultTo(env.identifier, ''))
                  const gitClusters = getGitopsClusters(env?.name as string)

                  const toGitOpsEnvironmentDetails =
                    isNewNavEnabled && !module
                      ? `${routesV2.toSettingsEnvironmentDetails({
                          accountId,
                          ...(gitOpsEnvironmentScope !== Scope.ACCOUNT && { orgIdentifier: orgIdentifier }),
                          ...(gitOpsEnvironmentScope === Scope.PROJECT && { projectIdentifier: projectIdentifier }),
                          environmentIdentifier: getIdentifierFromScopedRef(defaultTo(env.identifier, ''))
                        })}`
                      : `${routes.toEnvironmentDetails({
                          accountId,
                          ...(gitOpsEnvironmentScope !== Scope.ACCOUNT && { orgIdentifier: orgIdentifier }),
                          ...(gitOpsEnvironmentScope === Scope.PROJECT && { projectIdentifier: projectIdentifier }),
                          environmentIdentifier: getIdentifierFromScopedRef(defaultTo(env.identifier, '')),
                          module,
                          accountRoutePlacement: 'settings'
                        })}`

                  return (
                    <Layout.Horizontal key={env.identifier}>
                      <Link key={env.identifier} to={toGitOpsEnvironmentDetails}>
                        <Text className={css.stageItemDetails} margin={{ right: 'xsmall' }} color={Color.PRIMARY_6}>
                          {env.name}
                        </Text>
                      </Link>
                      {gitClusters?.length ? (
                        <>
                          (
                          <StrTemplate tagName="div" stringID="common.clusters" />:
                          <Text color={Color.PRIMARY_6} style={{ paddingLeft: '5px' }}>
                            {gitClusters[0]?.clusterName}
                          </Text>
                          {gitClusters?.length > 1 ? (
                            <Popover
                              interactionKind={PopoverInteractionKind.HOVER}
                              content={
                                <Layout.Vertical spacing="small" padding="medium" style={{ maxWidth: 500 }}>
                                  {gitClusters.map((cluster: any, index: number) => {
                                    return (
                                      <div key={index}>
                                        <span>{cluster.clusterName}</span>
                                      </div>
                                    )
                                  })}
                                </Layout.Vertical>
                              }
                            >
                              <Text>....{`+ ${gitClusters?.length - 1}`}</Text>
                            </Popover>
                          ) : null}
                          )
                        </>
                      ) : null}
                    </Layout.Horizontal>
                  )
                })}
              </>
            ) : (
              <Layout.Horizontal>
                <Link to={toEnvironmentDetails}>
                  <li>
                    <Text lineClamp={1} className={css.stageItemDetails} color={Color.PRIMARY_6}>
                      {get(stage, 'moduleInfo.cd.infraExecutionSummary.name', null)}
                    </Text>
                  </li>
                </Link>
                (
                <>
                  <StrTemplate stringID="infrastructureText" />:
                  <Link to={toEnvironmentInfrastructureDefinitionDetails}>
                    <Text lineClamp={1} className={css.stageItemDetails} color={Color.PRIMARY_6}>
                      {get(stage, 'moduleInfo.cd.infraExecutionSummary.infrastructureIdentifier', null)}
                    </Text>
                  </Link>
                </>
                )
              </Layout.Horizontal>
            )}
          </ul>
        </div>

        <GitopsApplications
          gitOpsApps={gitOpsApps}
          orgIdentifier={orgIdentifier}
          projectIdentifier={projectIdentifier}
          accountId={accountId}
          module={module}
        />
      </div>
    </div>
  )
}
