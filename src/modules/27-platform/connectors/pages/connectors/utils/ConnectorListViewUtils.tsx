/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Text } from '@harness/uicore'
import classNames from 'classnames'
import { Color } from '@harness/design-system'
import { defaultTo } from 'lodash-es'
import { Connectors } from '@platform/connectors/constants'
import type { ConnectorInfoDTO } from 'services/cd-ng'
import { String, StringKeys } from 'framework/strings'
import { CredTypeValues } from '@platform/connectors/interfaces/ConnectorInterface'
import { DelegateTypes } from '@common/components/ConnectivityMode/ConnectivityMode'
import type { CommonPaginationQueryParams } from '@common/hooks/useDefaultPaginationProps'
import { UseQueryParamsOptions, useQueryParamsOptions } from '@common/hooks/useQueryParams'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { COMMON_DEFAULT_PAGE_SIZE } from '@common/constants/Pagination'
import css from '../views/ConnectorsListView.module.scss'

const textRenderer = (value: string): JSX.Element => {
  if (!value) {
    return <></>
  }
  return (
    <Text inline margin={{ left: 'xsmall' }} color={Color.BLACK}>
      {value}
    </Text>
  )
}

const stringRenderer = (titleStringId: StringKeys): JSX.Element | string => {
  if (!titleStringId) return ''
  return (
    <div className={classNames(css.name, css.flex)}>
      <Text inline color={Color.BLACK}>
        <String stringID={titleStringId} />
      </Text>
    </div>
  )
}

const getAWSDisplaySummary = (connector: ConnectorInfoDTO): JSX.Element | string => {
  switch (connector?.spec?.credential?.type) {
    case DelegateTypes.DELEGATE_IN_CLUSTER:
    case DelegateTypes.DELEGATE_IN_CLUSTER_IRSA:
      return displayDelegatesTagsSummary(connector.spec.delegateSelectors)
    case DelegateTypes.DELEGATE_OIDC:
      return stringRenderer('platform.connectors.aws.OIDC')
    default:
      return getConnectorDisplaySummaryLabel(
        'platform.connectors.aws.accessKey',
        textRenderer(connector?.spec?.credential?.spec?.accessKeyRef || connector?.spec?.credential?.spec?.accessKey)
      )
  }
}

const linkAsTextRenderer = (value: string): JSX.Element => {
  if (!value) {
    return <></>
  }
  return (
    <Text margin={{ left: 'xsmall' }} lineClamp={1}>
      {value}
    </Text>
  )
}

const getGCPDisplaySummary = (connector: ConnectorInfoDTO): JSX.Element | string => {
  if (connector?.spec?.credential?.type === DelegateTypes.DELEGATE_IN_CLUSTER) {
    return displayDelegatesTagsSummary(connector.spec.delegateSelectors)
  }
  if (connector?.spec?.credential?.type === DelegateTypes.DELEGATE_OIDC) {
    return getConnectorDisplaySummaryLabel(
      'platform.connectors.GCP.workloadPoolId',
      textRenderer(connector?.spec?.credential?.spec?.workloadPoolId)
    )
  }

  return getConnectorDisplaySummaryLabel(
    'encryptedKeyLabel',
    textRenderer(connector?.spec?.credential?.spec?.secretKeyRef)
  )
}

const getConnectorDisplaySummaryLabel = (titleStringId: StringKeys, Element: JSX.Element): JSX.Element | string => {
  return (
    <div className={classNames(css.name, css.flex)}>
      {titleStringId ? (
        <Text inline color={Color.BLACK}>
          <String stringID={titleStringId} />:
        </Text>
      ) : null}
      {Element}
    </div>
  )
}

const displayDelegatesTagsSummary = (delegateSelectors: []): JSX.Element => {
  return (
    <div className={classNames(css.name, css.flex)}>
      <Text inline color={Color.BLACK}>
        <String stringID={'delegate.delegateTags'} />:
      </Text>
      <Text inline margin={{ left: 'xsmall' }} lineClamp={1} color={Color.GREY_400}>
        {delegateSelectors?.join?.(', ')}
      </Text>
    </div>
  )
}

const getK8DisplaySummary = (connector: ConnectorInfoDTO): JSX.Element | string => {
  if (connector?.spec?.credential?.type === DelegateTypes.DELEGATE_IN_CLUSTER) {
    return displayDelegatesTagsSummary(connector.spec.delegateSelectors)
  }
  return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.credential?.spec?.masterUrl))
}

const getAWSSecretManagerSummary = (connector: ConnectorInfoDTO): JSX.Element | string => {
  if (connector?.spec?.credential?.type !== CredTypeValues.ManualConfig) {
    return displayDelegatesTagsSummary(connector.spec.delegateSelectors)
  }
  return getConnectorDisplaySummaryLabel(
    'platform.connectors.aws.accessKey',
    textRenderer(connector?.spec?.credential?.spec?.accessKey)
  )
}

export const getConnectorDisplaySummary = (connector: ConnectorInfoDTO): JSX.Element | string => {
  switch (connector?.type) {
    case Connectors.KUBERNETES_CLUSTER:
      return getK8DisplaySummary(connector)
    case Connectors.HttpHelmRepo:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.helmRepoUrl))
    case Connectors.OciHelmRepo:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.helmRepoUrl))
    case Connectors.Jira:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.jiraUrl))
    case Connectors.SERVICE_NOW:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.serviceNowUrl))
    case Connectors.GIT:
    case Connectors.GITHUB:
    case Connectors.GITLAB:
    case Connectors.BITBUCKET:
    case Connectors.AZURE_REPO:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.url))
    case Connectors.DOCKER:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.dockerRegistryUrl))
    case Connectors.JENKINS:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.jenkinsUrl))
    case Connectors.AZURE_ARTIFACTS:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.azureArtifactsUrl))
    case Connectors.NEXUS:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.nexusServerUrl))
    case Connectors.ARTIFACTORY:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.artifactoryServerUrl))
    case Connectors.Bamboo:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.bambooUrl))
    case Connectors.AWS:
      return getAWSDisplaySummary(connector)
    case Connectors.GCP:
      return getGCPDisplaySummary(connector)
    case Connectors.GcpSecretManager: {
      if (connector?.spec?.credentialsRef) {
        return getConnectorDisplaySummaryLabel(
          'platform.connectors.gcpSecretManager.gcpCredentialsFile',
          linkAsTextRenderer(connector?.spec?.credentialsRef)
        )
      } else if (connector?.spec?.assumeCredentialsOnDelegate) {
        return getConnectorDisplaySummaryLabel('connectionMode', linkAsTextRenderer(DelegateTypes.DELEGATE_IN_CLUSTER))
      } else {
        return ''
      }
    }
    case Connectors.NEW_RELIC:
    case Connectors.DATADOG:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.url))
    case Connectors.APP_DYNAMICS:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.controllerUrl))
    case Connectors.SPLUNK:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.splunkUrl))
    case Connectors.AWS_SECRET_MANAGER:
      return getAWSSecretManagerSummary(connector)
    case Connectors.DYNATRACE:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.url))
    case Connectors.CUSTOM_SECRET_MANAGER:
      return getConnectorDisplaySummaryLabel(
        'common.template.label',
        textRenderer(`${connector?.spec?.template?.templateRef}(${connector?.spec?.template?.versionLabel})`)
      )
    case Connectors.SPOT:
      return getConnectorDisplaySummaryLabel(
        'platform.connectors.spotAccountId',
        textRenderer(
          defaultTo(
            connector?.spec?.credential?.spec?.spotAccountId,
            connector?.spec?.credential?.spec?.spotAccountIdRef
          )
        )
      )
    case Connectors.TAS:
      return getConnectorDisplaySummaryLabel(
        'UrlLabel',
        linkAsTextRenderer(connector?.spec?.credential?.spec?.endpointUrl)
      )
    case Connectors.TERRAFORM_CLOUD:
      return getConnectorDisplaySummaryLabel('UrlLabel', linkAsTextRenderer(connector?.spec?.terraformCloudUrl))
    case Connectors.Rancher:
      return getConnectorDisplaySummaryLabel(
        'UrlLabel',
        linkAsTextRenderer(connector?.spec?.credential?.spec?.rancherUrl)
      )
    default:
      return ''
  }
}

export type ConnectorsQueryParams = {
  searchTerm?: string
  favorite?: boolean
} & CommonPaginationQueryParams
export type ConnectorsQueryParamsWithDefaults = RequiredPick<
  ConnectorsQueryParams,
  'page' | 'size' | 'searchTerm' | 'favorite'
>

export const CONNECTORS_PAGE_INDEX = 0
export const CONNECTORS_PAGE_SIZE = 10

export const useConnectorsQueryParamOptions = (): UseQueryParamsOptions<ConnectorsQueryParamsWithDefaults> => {
  const { PL_NEW_PAGE_SIZE } = useFeatureFlags()

  return useQueryParamsOptions({
    page: CONNECTORS_PAGE_INDEX,
    size: PL_NEW_PAGE_SIZE ? COMMON_DEFAULT_PAGE_SIZE : CONNECTORS_PAGE_SIZE,
    searchTerm: '',
    favorite: false
  })
}
