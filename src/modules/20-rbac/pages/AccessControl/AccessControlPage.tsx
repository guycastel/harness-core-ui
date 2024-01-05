/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { TabNavigation } from '@harness/uicore'
import { useParams, useLocation, matchPath } from 'react-router-dom'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { Page } from '@common/exports'
import { useStrings } from 'framework/strings'
import routesv1 from '@common/RouteDefinitions'
import routesv2 from '@common/RouteDefinitionsV2'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import type { ProjectPathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import ScopedTitle from '@common/components/Title/ScopedTitle'

interface AccessControlLink {
  label: string
  to: string
  title: string
}

const AccessControlPage: React.FC = ({ children }) => {
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<PipelineType<ProjectPathProps>>()
  const { getString } = useStrings()
  const { pathname } = useLocation()
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesv2 : routesv1

  const accessControlLinks: AccessControlLink[] = [
    {
      label: getString('users'),
      to: routes.toUsers({ accountId, orgIdentifier, projectIdentifier, module }),
      title: getString('rbac.accessControlTitle.users')
    },
    {
      label: getString('common.userGroups'),
      to: routes.toUserGroups({ accountId, orgIdentifier, projectIdentifier, module }),
      title: getString('rbac.accessControlTitle.userGroups')
    },
    {
      label: getString('rbac.serviceAccounts.label'),
      to: routes.toServiceAccounts({ accountId, orgIdentifier, projectIdentifier, module }),
      title: getString('rbac.accessControlTitle.serviceAccounts')
    },
    {
      label: getString('resourceGroups'),
      to: routes.toResourceGroups({ accountId, orgIdentifier, projectIdentifier, module }),
      title: getString('rbac.accessControlTitle.resourceGroups')
    },
    {
      label: getString('roles'),
      to: routes.toRoles({ accountId, orgIdentifier, projectIdentifier, module }),
      title: getString('rbac.accessControlTitle.roles')
    }
  ]

  const getScopedTitle = (): string => {
    return accessControlLinks.find(nav => matchPath(pathname, nav.to))?.title || getString('accessControl')
  }

  return (
    <>
      <Page.Header
        breadcrumbs={<NGBreadcrumbs />}
        title={<ScopedTitle title={getScopedTitle()} />}
        toolbar={
          <TabNavigation size={'small'} links={accessControlLinks.map(link => ({ label: link.label, to: link.to }))} />
        }
      />
      <Page.Body>{children}</Page.Body>
    </>
  )
}

export default AccessControlPage
