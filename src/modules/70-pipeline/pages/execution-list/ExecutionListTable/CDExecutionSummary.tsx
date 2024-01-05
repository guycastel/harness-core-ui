/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon, Layout } from '@harness/uicore'

import routes from '@common/RouteDefinitions'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'

import { getScopeFromValue } from '@common/components/EntityReference/EntityReference'
import { Scope } from '@common/interfaces/SecretsInterface'
import { getIdentifierFromScopedRef } from '@common/utils/utils'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { EnvironmentResponseDTO, ServiceResponseDTO } from 'services/cd-ng'
import { fetchServicesMetadata } from '@modules/70-pipeline/components/FormMultiTypeServiceFeild/Utils'
import { fetchEnvironmentsMetadata } from '@modules/70-pipeline/components/FormMultiTypeEnvironmentField/Utils'
import { getRemoteEnvironmentQueryParams } from '@modules/75-cd/components/EnvironmentsV2/utils'
import { getScopedServiceUrl } from '@modules/70-pipeline/utils/scopedUrlUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import css from './ExecutionListTable.module.scss'

export interface CDExecutionSummaryProps {
  stageInfo: Record<string, any>
}

export function CDExecutionSummary(props: CDExecutionSummaryProps): React.ReactElement | null {
  const { stageInfo } = props
  const serviceDisplayName = stageInfo.serviceInfo?.displayName
  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()
  const { isNewNavEnabled = false } = useAppStore()
  const { CDS_SERVICE_GITX, CDS_ENV_GITX } = useFeatureFlags()

  const [serviceMetadata, setServiceMetadata] = useState<ServiceResponseDTO>({})
  const [environmentMetadata, setEnvironmentMetadata] = useState<EnvironmentResponseDTO>({})

  const gitOpsEnvironments = stageInfo.gitopsExecutionSummary?.environments || []
  const environment = gitOpsEnvironments.length
    ? null
    : stageInfo.infraExecutionSummary?.name || stageInfo.infraExecutionSummary?.identifier
  const infra =
    stageInfo.infraExecutionSummary?.infrastructureName || stageInfo.infraExecutionSummary?.infrastructureIdentifier
  const { tag } = stageInfo.serviceInfo?.artifacts?.primary || {}

  const infrastructureScope = getScopeFromValue(stageInfo.infraExecutionSummary?.identifier)

  const chartVersion = stageInfo.serviceInfo?.manifestInfo?.chartVersion
  const serviceId = getIdentifierFromScopedRef(stageInfo.serviceInfo?.identifier || '')
  const environmentId = getIdentifierFromScopedRef(stageInfo.infraExecutionSummary?.identifier || '')

  React.useEffect(() => {
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
  }, [CDS_SERVICE_GITX, CDS_ENV_GITX, accountId, orgIdentifier, projectIdentifier, serviceId, environmentId])

  return serviceDisplayName || environment ? (
    <Layout.Horizontal spacing="medium" className={css.cdExecutionSummary}>
      {serviceDisplayName ? (
        <Layout.Horizontal spacing="xsmall" style={{ alignItems: 'center', flexShrink: 'unset' }}>
          <Icon name="services" size={14} />
          <Link
            to={getScopedServiceUrl(
              {
                accountId,
                orgIdentifier,
                projectIdentifier,
                scopedServiceIdentifier: stageInfo.serviceInfo?.identifier,
                module: 'cd',
                accountRoutePlacement: 'settings',
                serviceMetadata
              },
              isNewNavEnabled
            )}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span>{serviceDisplayName}</span>
            {tag ? <span>&nbsp;({tag})</span> : null}
          </Link>
        </Layout.Horizontal>
      ) : null}

      {environment ? (
        <Layout.Horizontal
          spacing="xsmall"
          style={{ alignItems: 'center', flexShrink: 'unset' }}
          className={css.environment}
        >
          <Icon name="environments" size={12} />
          <Link
            to={routes.toEnvironmentDetails({
              module: 'cd',
              accountId,
              ...(infrastructureScope !== Scope.ACCOUNT && { orgIdentifier: orgIdentifier }),
              ...(infrastructureScope === Scope.PROJECT && { projectIdentifier: projectIdentifier }),
              environmentIdentifier: environmentId,
              sectionId: 'INFRASTRUCTURE',
              accountRoutePlacement: 'settings',
              ...getRemoteEnvironmentQueryParams(environmentMetadata)
            })}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span>{environment}</span>
            {infra ? <span>&nbsp;({infra})</span> : null}
          </Link>
        </Layout.Horizontal>
      ) : null}
      {chartVersion ? (
        <Layout.Horizontal
          spacing="xsmall"
          style={{ alignItems: 'center', flexShrink: 'unset' }}
          className={css.environment}
        >
          <Icon name="service-helm" size={12} />

          <span>{chartVersion}</span>
        </Layout.Horizontal>
      ) : null}
    </Layout.Horizontal>
  ) : null
}
