/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Route, useParams, Redirect, Switch } from 'react-router-dom'
import { createClient, Provider, dedupExchange, cacheExchange, fetchExchange } from 'urql'
import { requestPolicyExchange } from '@urql/exchange-request-policy'
import Configuration from '@auth-settings/pages/Configuration/Configuration'
import AccountOverview from '@auth-settings/pages/AccountOverview/AccountOverview'
import NotFoundPage from '@common/pages/404/NotFoundPage'
import SubscriptionsPage from '@auth-settings/pages/subscriptions/SubscriptionsPage'
import { RouteWithLayout } from '@common/router'
import routesV1 from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { accountPathProps } from '@common/utils/routeUtils'

import type { AccountPathProps, Module } from '@common/interfaces/RouteInterfaces'
import RbacFactory from '@rbac/factories/RbacFactory'
import { ResourceType, ResourceCategory } from '@rbac/interfaces/ResourceType'
import AuditTrailFactory, { ResourceScope } from 'framework/AuditTrail/AuditTrailFactory'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'

import type { AuditEventData, ResourceDTO } from 'services/audit'
import { String } from 'framework/strings'
import { AccountSideNavProps } from '@common/RouteDestinations'
import { PAGE_NAME } from '@common/pages/pageContext/PageName'
import Billing from './pages/Billing/BillingPage'

AuditTrailFactory.registerResourceHandler('NG_LOGIN_SETTINGS', {
  moduleIcon: {
    name: 'nav-settings'
  },
  moduleLabel: 'authentication',
  resourceLabel: 'authentication',
  resourceUrl: (
    _resource_: ResourceDTO,
    resourceScope: ResourceScope,
    _module?: Module,
    _auditEventData?: AuditEventData,
    isNewNav?: boolean
  ) => {
    const { accountIdentifier } = resourceScope
    const routes = isNewNav ? routesV2 : routesV1
    return routes.toAuthenticationSettings({
      accountId: accountIdentifier
    })
  }
})

AuditTrailFactory.registerResourceHandler('IP_ALLOWLIST_CONFIG', {
  moduleIcon: {
    name: 'nav-settings'
  },
  moduleLabel: 'common.resourceCenter.ticketmenu.platform',
  resourceLabel: 'platform.authSettings.ipAllowlist'
})

RbacFactory.registerResourceTypeHandler(ResourceType.ACCOUNT, {
  icon: 'nav-settings',
  label: 'common.accountSettings',
  labelSingular: 'common.singularLabels.accountSetting',
  category: ResourceCategory.ADMINSTRATIVE_FUNCTIONS,
  permissionLabels: {
    [PermissionIdentifier.VIEW_ACCOUNT]: <String stringID="rbac.permissionLabels.view" />,
    [PermissionIdentifier.EDIT_ACCOUNT]: <String stringID="edit" />
  }
})

RbacFactory.registerResourceTypeHandler(ResourceType.AUTHSETTING, {
  icon: 'nav-settings',
  label: 'platform.authSettings.authenticationSettings',
  labelSingular: 'common.singularLabels.authenticationSetting',
  category: ResourceCategory.ADMINSTRATIVE_FUNCTIONS,
  permissionLabels: {
    [PermissionIdentifier.VIEW_AUTHSETTING]: <String stringID="rbac.permissionLabels.view" />,
    [PermissionIdentifier.EDIT_AUTHSETTING]: <String stringID="rbac.permissionLabels.createEdit" />,
    [PermissionIdentifier.DELETE_AUTHSETTING]: <String stringID="rbac.permissionLabels.delete" />
  }
})

const RedirectToConfiguration = (): React.ReactElement => {
  const params = useParams<AccountPathProps>()
  return <Redirect to={routesV1.toAccountConfiguration(params)} />
}

const RedirectToOverview = (): React.ReactElement => {
  const params = useParams<AccountPathProps>()
  return <Redirect to={routesV1.toAccountSettingsOverview(params)} />
}

const AuthSettingsRoutes: React.FC = () => {
  const urqlClient = React.useCallback(() => {
    const url = 'https://cms.harness.io/graphql'
    return createClient({
      url,
      exchanges: [dedupExchange, requestPolicyExchange({}), cacheExchange, fetchExchange],
      requestPolicy: 'cache-first'
    })
  }, [])

  return (
    <Provider value={urqlClient()}>
      <Switch>
        <RouteWithLayout
          sidebarProps={AccountSideNavProps}
          path={routesV1.toAccountSettings({ ...accountPathProps })}
          exact
          pageName={PAGE_NAME.AccountOverview}
        >
          <RedirectToOverview />
        </RouteWithLayout>
        <Route
          sidebarProps={AccountSideNavProps}
          path={routesV1.toAuthenticationSettings({ ...accountPathProps })}
          exact
        >
          <RedirectToConfiguration />
        </Route>
        <RouteWithLayout
          sidebarProps={AccountSideNavProps}
          path={routesV1.toAccountConfiguration({ ...accountPathProps })}
          exact
          pageName={PAGE_NAME.AccountConfiguration}
        >
          <Configuration />
        </RouteWithLayout>
        <RouteWithLayout
          sidebarProps={AccountSideNavProps}
          path={routesV1.toAccountSettingsOverview({ ...accountPathProps })}
          exact
          pageName={PAGE_NAME.AccountOverview}
        >
          <AccountOverview />
        </RouteWithLayout>
        <RouteWithLayout
          sidebarProps={AccountSideNavProps}
          path={routesV1.toBilling({ ...accountPathProps })}
          exact
          pageName={PAGE_NAME.BillingPage}
        >
          <Billing />
        </RouteWithLayout>
        <RouteWithLayout
          sidebarProps={AccountSideNavProps}
          path={routesV1.toPlans({ ...accountPathProps })}
          exact
          pageName={PAGE_NAME.PlanPage}
        >
          <SubscriptionsPage />
        </RouteWithLayout>
        <RouteWithLayout
          sidebarProps={AccountSideNavProps}
          path={routesV1.toSubscriptions({ ...accountPathProps })}
          exact
          pageName={PAGE_NAME.SubscriptionsPage}
        >
          <SubscriptionsPage />
        </RouteWithLayout>
        <Route path="*">
          <NotFoundPage />
        </Route>
      </Switch>
    </Provider>
  )
}

export default AuthSettingsRoutes
