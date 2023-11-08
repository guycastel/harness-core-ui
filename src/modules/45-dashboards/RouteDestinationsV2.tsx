/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Redirect, Route, useParams, Switch } from 'react-router-dom'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import routes from '@common/RouteDefinitionsV2'
import { accountPathProps, dashboardFolderPathProps, dashboardEmbedPathProps, NAV_MODE } from '@common/utils/routeUtils'
import { DashboardEmbedPathProps } from '@common/interfaces/RouteInterfaces'
import DashboardResourceModalBody from '@dashboards/components/DashboardResourceModalBody/DashboardResourceModalBody'
import DashboardResourceRenderer from '@dashboards/components/DashboardResourceRenderer/DashboardResourceRenderer'
import RbacFactory from '@rbac/factories/RbacFactory'
import CommonRouteDestinations from '@user-profile/CommonRouteDestinations'
import { ResourceType, ResourceCategory } from '@rbac/interfaces/ResourceType'
import { RouteWithContext } from '@common/router/RouteWithContext/RouteWithContext'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { String } from 'framework/strings'
import ChildAppMounter from 'microfrontends/ChildAppMounter'
import DashboardsPage from './pages/DashboardsPage'
import HomePage from './pages/home/HomePage'
import FoldersPage from './pages/folders/FoldersPage'
import DashboardViewPage from './pages/dashboardView/DashboardViewPage'

RbacFactory.registerResourceTypeHandler(ResourceType.DASHBOARDS, {
  icon: 'support-account',
  label: 'common.dashboards',
  labelSingular: 'dashboardLabel',
  labelOverride: 'common.folders',
  category: ResourceCategory.SHARED_RESOURCES,
  permissionLabels: {
    [PermissionIdentifier.VIEW_DASHBOARD]: <String stringID="rbac.permissionLabels.view" />,
    [PermissionIdentifier.EDIT_DASHBOARD]: <String stringID="rbac.permissionLabels.manage" />
  },
  // eslint-disable-next-line react/display-name
  addResourceModalBody: props => <DashboardResourceModalBody {...props} />,
  // eslint-disable-next-line react/display-name
  staticResourceRenderer: props => <DashboardResourceRenderer {...props} />
})

// eslint-disable-next-line import/no-unresolved
const CdbMicroFrontendPath = React.lazy(() => import('cdbui/MicroFrontendApp'))

const RouteDestinations = (): React.ReactElement => {
  const { CDB_MFE_ENABLED } = useFeatureFlags()
  const { accountId, folderId } = useParams<DashboardEmbedPathProps>()
  const mode = NAV_MODE.DASHBOARDS
  return (
    <>
      {!CDB_MFE_ENABLED && (
        <Switch>
          <Route exact path={routes.toMode({ ...accountPathProps, mode })}>
            <Redirect to={routes.toDashboardsFolder({ accountId, folderId })} />
          </Route>
          <Route exact path={routes.toDashboardsOverview({ ...accountPathProps, mode })}>
            <Redirect to={routes.toDashboardsFolder({ accountId, folderId })} />
          </Route>
          <RouteWithContext exact path={routes.toDashboardsFolder({ ...dashboardFolderPathProps })}>
            <DashboardsPage>
              <HomePage />
            </DashboardsPage>
          </RouteWithContext>
          <RouteWithContext exact path={routes.toDashboardsFoldersPage({ ...accountPathProps })}>
            <DashboardsPage>
              <FoldersPage />
            </DashboardsPage>
          </RouteWithContext>
          <RouteWithContext exact path={routes.toDashboardsEmbedPage({ ...dashboardEmbedPathProps })}>
            <DashboardViewPage />
          </RouteWithContext>
          {CommonRouteDestinations({ mode: NAV_MODE.DASHBOARDS }).props.children}
        </Switch>
      )}
      {CDB_MFE_ENABLED && (
        <RouteWithContext path={[routes.toMode({ ...accountPathProps, mode })]}>
          <ChildAppMounter ChildApp={CdbMicroFrontendPath} />
        </RouteWithContext>
      )}
    </>
  )
}

export default RouteDestinations
