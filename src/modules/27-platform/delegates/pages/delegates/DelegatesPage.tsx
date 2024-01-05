/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { Button, ButtonSize, ButtonVariation, Layout, TabNavigation, Text } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { Callout } from '@blueprintjs/core'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { Page } from '@common/exports'
import ScopedTitle from '@common/components/Title/ScopedTitle'
import { Scope } from '@common/interfaces/SecretsInterface'
import routesv1 from '@common/RouteDefinitions'
import routesv2 from '@common/RouteDefinitionsV2'
import type { ProjectPathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import { getLinkForAccountResources } from '@common/utils/BreadcrumbUtils'
import type { GetDelegateGroupsNGV2WithFilterQueryParams } from 'services/portal'
import { useListDelegateConfigsNgV2WithFilter } from 'services/cd-ng'
import type { DelegateProfileDetailsNg } from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useLocalStorage } from '@common/hooks'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import css from './DelegatesPage.module.scss'

const DelegatesPage: React.FC = ({ children }) => {
  const params = useParams<PipelineType<ProjectPathProps>>()
  const { accountId, orgIdentifier, projectIdentifier, module } = params
  const { getString } = useStrings()
  const { pathname } = useLocation()
  const [profiles, setProfiles] = useState<DelegateProfileDetailsNg[]>([])
  const { PL_HELM2_DELEGATE_BANNER } = useFeatureFlags()
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesv2 : routesv1
  const [isBannerDismissed, setIsBannerDismissed] = useLocalStorage<boolean | undefined>(
    'helmv2_deprecation_banner_dismissed',
    !PL_HELM2_DELEGATE_BANNER,
    window.sessionStorage
  )
  const isDelTokensPage =
    pathname.indexOf(
      routes.toDelegateTokens({ accountId: params.accountId, orgIdentifier, projectIdentifier, module })
    ) !== -1

  const { mutate: getDelegateProfiles } = useListDelegateConfigsNgV2WithFilter({
    accountId,
    queryParams: { orgId: orgIdentifier, projectId: projectIdentifier }
  })
  const getDelegates = async (): Promise<void> => {
    const delProfilesResponse = await getDelegateProfiles(
      {
        filterType: 'DelegateProfile'
      },
      {
        queryParams: {
          accountId,
          module,
          pageSize: 10,
          searchTerm: ''
        } as GetDelegateGroupsNGV2WithFilterQueryParams
      }
    )
    const resource = delProfilesResponse?.resource as any
    setProfiles(resource?.response || [])
  }

  useEffect(() => {
    getDelegates()
  }, [getDelegateProfiles])

  const links = [
    {
      label: getString('delegate.delegates'),
      to: routes.toDelegateList({ accountId, orgIdentifier, projectIdentifier, module })
    }
  ]
  if (profiles.length > 0) {
    links.push({
      label: getString('delegate.delegateConfigurations'),
      to: routes.toDelegateConfigs({ accountId, orgIdentifier, projectIdentifier, module })
    })
  }
  links.push({
    label: getString('common.tokens'),
    to: routes.toDelegateTokens({ accountId, orgIdentifier, projectIdentifier, module })
  })

  return (
    <div className={css.delegateMain}>
      {!isBannerDismissed && (
        <Callout className={css.callout} intent="warning" icon={null}>
          <Layout.Horizontal flex={{ justifyContent: 'flex-start' }}>
            <Text color={Color.BLACK}>
              Harness will be removing the Kustomize binary 3.5.4 from the delegate on September 30, 2023. We will be
              leveraging the kubectl client to handle Kustomize deployments. For more details please see the&nbsp;
              <a href="https://developer.harness.io" target="_blank" rel="noreferrer">
                docs
              </a>
            </Text>
          </Layout.Horizontal>
          <Button
            aria-label={getString('close')}
            variation={ButtonVariation.ICON}
            size={ButtonSize.LARGE}
            icon="cross"
            onClick={() => setIsBannerDismissed(true)}
          />
        </Callout>
      )}
      <Page.Header
        breadcrumbs={
          isNewNavEnabled ? (
            <NGBreadcrumbs />
          ) : (
            <NGBreadcrumbs
              links={getLinkForAccountResources({ accountId, orgIdentifier, projectIdentifier, getString })}
            />
          )
        }
        title={
          <ScopedTitle
            title={{
              [Scope.PROJECT]: isDelTokensPage
                ? getString('platform.delegates.tokens.delegateTokens')
                : getString('delegate.delegates'),
              [Scope.ORG]: isDelTokensPage
                ? getString('platform.delegates.tokens.delegateTokensTitle')
                : getString('platform.delegates.delegatesTitle'),
              [Scope.ACCOUNT]: isDelTokensPage
                ? getString('platform.delegates.tokens.delegateTokensTitle')
                : getString('platform.delegates.delegatesTitle')
            }}
          />
        }
        toolbar={<TabNavigation size={'small'} links={links} />}
      />
      <Page.Body>{children}</Page.Body>
    </div>
  )
}

export default DelegatesPage
