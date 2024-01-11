/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Redirect, Switch, useParams } from 'react-router-dom'
import routes from '@common/RouteDefinitionsV2'
import { RouteWithContext } from '@common/router/RouteWithContext/RouteWithContext'
import { NAV_MODE, accountPathProps, orgPathProps, projectPathProps } from '@common/utils/routeUtils'
import ChildAppMounter from 'microfrontends/ChildAppMounter'
import { useGetSelectedScope } from '@common/navigation/SideNavV2/SideNavV2.utils'
import { Scope } from 'framework/types/types'
import { EmptyLayout } from '@common/layouts'
import { ProjectSelector } from '@projects-orgs/components/ProjectSelector/ProjectSelector'
import SideNav from '@common/navigation/SideNav'
import NavExpandable from '@common/navigation/NavExpandable/NavExpandable'
import { HomePageTemplate } from '@projects-orgs/pages/HomePageTemplate/HomePageTemplate'
import { useGetLicensesAndSummary } from 'services/cd-ng'
import { NameSchema } from '@common/utils/Validation'
import { useFeatureFlag, useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { SidebarLink } from '@common/navigation/SideNav/SideNav'
import { AccessControlRouteDestinations } from '@rbac/RouteDestinations'
import { AccountPathProps } from '@modules/10-common/interfaces/RouteInterfaces'
import { LICENSE_STATE_NAMES, LicenseRedirectProps } from 'framework/LicenseStore/LicenseStoreContext'
import { RedirectToSubscriptionsFactory } from '@modules/10-common/Redirects'
import { ModuleName } from 'framework/types/ModuleName'
import { SEICustomMicroFrontendProps } from './SEICustomMicroFrontendProps.types'
import SEITrialPage from './pages/SEITrialPage/SEITrialPage'
import { NO_SCOPE, module } from './constants'

// eslint-disable-next-line import/no-unresolved
const SEIMicroFrontend = React.lazy(() => import('sei/MicroFrontendApp'))

const SEIRedirect: React.FC = () => {
  const { scope, params } = useGetSelectedScope()

  if (scope === Scope.ORGANIZATION) {
    return <Redirect to={routes.toSettings({ orgIdentifier: params?.orgIdentifier, module })} />
  }
  if (scope === Scope.PROJECT) {
    if (params?.projectIdentifier) return <Redirect to={routes.toSEIInsights({ ...params, module })} />
    return <Redirect to={routes.toSEIHome({ ...params, module })} />
  }
  if (scope === Scope.ACCOUNT) {
    return <Redirect to={routes.toSEIIntegrations({ ...params, module })} />
  }
  return <Redirect to={`${routes.toSEIHome({ ...params, module })}${NO_SCOPE}`} />
}

const TrialRedirect: React.FC = () => {
  const { accountId } = useParams<AccountPathProps>()
  return (
    <Redirect
      to={routes.toModuleTrialHome({
        accountId,
        module
      })}
    />
  )
}

const licenseRedirectData: LicenseRedirectProps = {
  licenseStateName: LICENSE_STATE_NAMES.SEI_LICENSE_STATE,
  startTrialRedirect: () => <TrialRedirect />,
  expiredTrialRedirect: RedirectToSubscriptionsFactory(ModuleName.SEI)
}

const SEIRouteDestinations = (mode = NAV_MODE.MODULE): React.ReactElement => {
  return (
    <Switch>
      <RouteWithContext
        path={[
          routes.toMode({ ...orgPathProps, module, mode }),
          routes.toMode({ ...projectPathProps, module, mode }),
          routes.toMode({ ...accountPathProps, module, mode })
        ]}
        licenseRedirectData={licenseRedirectData}
        exact
      >
        <SEIRedirect />
      </RouteWithContext>
      <RouteWithContext path={routes.toModuleTrialHome({ ...accountPathProps, module, mode })} exact>
        <SEITrialPage />
      </RouteWithContext>
      <RouteWithContext
        path={[
          routes.toSEI({ module, ...projectPathProps, mode }),
          routes.toSEI({ module, ...accountPathProps, mode })
        ]}
        licenseRedirectData={licenseRedirectData}
      >
        <ChildAppMounter<SEICustomMicroFrontendProps>
          ChildApp={SEIMicroFrontend}
          customComponents={{
            ProjectSelector,
            NavExpandable,
            HarnessSideNav: SideNav,
            HomePageTemplate,
            SidebarLink,
            AccessControlRouteDestinations,
            EmptyLayout
          }}
          cdServices={{
            useGetLicensesAndSummary
          }}
          customRoutes={routes}
          customUtils={{ NameSchema }}
          customHooks={{
            useFeatureFlag,
            useFeatureFlags
          }}
        />
      </RouteWithContext>
    </Switch>
  )
}

export default SEIRouteDestinations
