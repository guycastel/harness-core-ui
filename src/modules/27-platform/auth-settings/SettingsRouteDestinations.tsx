/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Redirect, useParams } from 'react-router-dom'
import { createClient, Provider, dedupExchange, cacheExchange, fetchExchange } from 'urql'
import { requestPolicyExchange } from '@urql/exchange-request-policy'
import routes from '@common/RouteDefinitionsV2'
import { RouteWithContext } from '@common/router/RouteWithContext/RouteWithContext'
import { NAV_MODE, pathArrayForAllScopes } from '@common/utils/routeUtils'
import { PAGE_NAME } from '@common/pages/pageContext/PageName'
import { AccountPathProps, ModulePathParams } from '@modules/10-common/interfaces/RouteInterfaces'
import SubscriptionsPage from './pages/subscriptions/SubscriptionsPage'
import Billing from './pages/Billing/BillingPage'
import Configuration from './pages/Configuration/Configuration'
import AccountOverview from './pages/AccountOverview/AccountOverview'

const RedirectToConfiguration = ({ mode }: { mode: NAV_MODE }): React.ReactElement => {
  const { module, ...rest } = useParams<AccountPathProps & ModulePathParams>()
  return <Redirect to={routes.toAccountConfiguration({ ...rest, module, mode })} />
}

function AuthSettingsRouteDestinations({ mode }: { mode: NAV_MODE }): React.ReactElement {
  const urqlClient = React.useCallback(() => {
    const url = 'https://cms.harness.io/graphql'
    return createClient({
      url,
      exchanges: [dedupExchange, requestPolicyExchange({}), cacheExchange, fetchExchange],
      requestPolicy: 'cache-first'
    })
  }, [])
  return (
    <>
      <RouteWithContext
        exact
        path={pathArrayForAllScopes(routes.toAuthenticationSettings, mode)}
        pageName={PAGE_NAME.AccountConfiguration}
      >
        <RedirectToConfiguration mode={mode} />
      </RouteWithContext>
      <RouteWithContext exact path={pathArrayForAllScopes(routes.toAccountSettingsOverview, mode)}>
        <Provider value={urqlClient()}>
          <AccountOverview />
        </Provider>
      </RouteWithContext>
      <RouteWithContext
        exact
        path={pathArrayForAllScopes(routes.toAccountConfiguration, mode)}
        pageName={PAGE_NAME.AccountConfiguration}
      >
        <Provider value={urqlClient()}>
          <Configuration />
        </Provider>
      </RouteWithContext>
      <RouteWithContext
        exact
        path={pathArrayForAllScopes(routes.toBillingSettings, mode)}
        pageName={PAGE_NAME.BillingPage}
      >
        <Provider value={urqlClient()}>
          <Billing />
        </Provider>
      </RouteWithContext>
      <RouteWithContext
        exact
        path={pathArrayForAllScopes(routes.toSubscriptions, mode)}
        pageName={PAGE_NAME.SubscriptionsPage}
      >
        <Provider value={urqlClient()}>
          <SubscriptionsPage />
        </Provider>
      </RouteWithContext>
      <RouteWithContext exact path={pathArrayForAllScopes(routes.toPlans, mode)} pageName={PAGE_NAME.PlanPage}>
        <Provider value={urqlClient()}>
          <SubscriptionsPage />
        </Provider>
      </RouteWithContext>
    </>
  )
}

export default AuthSettingsRouteDestinations
