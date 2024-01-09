/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Redirect, Route, useLocation, useParams } from 'react-router-dom'
import { useGetStatusInfoTypeV2Query } from '@harnessio/react-idp-service-client'
import { isEmpty } from 'lodash-es'
import routes from '@common/RouteDefinitions'
import { RouteWithLayout } from '@common/router'
import { accountPathProps, orgPathProps, projectPathProps } from '@common/utils/routeUtils'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import ChildAppMounter from 'microfrontends/ChildAppMounter'
import { useGetUserGroupAggregateList } from 'services/cd-ng'
import { MinimalLayout } from '@common/layouts'
import { PAGE_NAME } from '@common/pages/pageContext/PageName'
import { ConnectorReferenceField } from '@platform/connectors/components/ConnectorReferenceField/ConnectorReferenceField'
import { MultiTypeSecretInput } from '@secrets/components/MutiTypeSecretInput/MultiTypeSecretInput'
import { MultiTypeDelegateSelector } from '@common/components/MultiTypeDelegateSelector/MultiTypeDelegateSelector'
import type { SidebarContext } from '@common/navigation/SidebarProvider'
import { ResourceCategory, ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { String } from 'framework/strings'
import RbacFactory from '@rbac/factories/RbacFactory'
import type { AccountPathProps, ModulePathParams } from '@common/interfaces/RouteInterfaces'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { PipelineRouteDestinations } from '@pipeline/RouteDestinations'
import PipelineStudio from '@modules/70-pipeline/components/PipelineStudio/PipelineStudio'
import { PipelineDeploymentList } from '@modules/70-pipeline/pages/pipeline-deployment-list/PipelineDeploymentList'
import { TriggersRouteDestinations } from '@triggers/RouteDestinations'
import IDPAdminSideNav from './components/IDPAdminSideNav/IDPAdminSideNav'
import type { IDPCustomMicroFrontendProps } from './interfaces/IDPCustomMicroFrontendProps.types'
import { registerIDPPipelineStage } from './components/IDPStage'
import IDPPipelinesOverview from './components/IDPPipelinesOverview/IDPPipelinesOverview'
import { registerIDPPipelineStep } from './components/PipelineSteps'
import './idp.module.scss'

// eslint-disable-next-line import/no-unresolved
const IDPMicroFrontend = React.lazy(() => import('idp/MicroFrontendApp'))

// eslint-disable-next-line import/no-unresolved
const IDPAdminMicroFrontend = React.lazy(() => import('idpadmin/MicroFrontendApp'))

const IDPAdminSideNavProps: SidebarContext = {
  navComponent: IDPAdminSideNav,
  subtitle: 'Internal Developer',
  title: 'Portal',
  icon: 'idp'
}

registerIDPPipelineStage()
registerIDPPipelineStep()

function RedirectToIDPDefaultPath(): React.ReactElement {
  const params = useParams<AccountPathProps>()
  const location = useLocation()

  const { data } = useGetStatusInfoTypeV2Query(
    { type: 'onboarding' },
    {
      enabled: location.pathname.includes('/idp-default'),
      staleTime: 15 * 60 * 1000
    }
  )
  const onboardingStatus = data?.content?.onboarding?.current_status

  if (!isEmpty(onboardingStatus)) {
    if (onboardingStatus === 'COMPLETED') {
      return <Redirect to={routes.toIDP(params)} />
    }
    return <Redirect to={routes.toGetStartedWithIDP(params)} />
  }
  return <></>
}

function IDPRoutes(): React.ReactElement {
  const isIDPEnabled = useFeatureFlag(FeatureFlag.IDP_ENABLED)

  if (isIDPEnabled) {
    RbacFactory.registerResourceCategory(ResourceCategory.IDP, {
      icon: 'idp',
      label: 'common.purpose.idp.name'
    })

    RbacFactory.registerResourceTypeHandler(ResourceType.IDP_SETTINGS, {
      icon: 'idp',
      label: 'idp.idpManage',
      category: ResourceCategory.IDP,
      permissionLabels: {
        [PermissionIdentifier.IDP_SETTINGS_MANAGE]: <String stringID="rbac.permissionLabels.manage" />
      }
    })
    RbacFactory.registerResourceTypeHandler(ResourceType.IDP_PLUGIN, {
      icon: 'idp-nav-plugins',
      label: 'common.plugins',
      category: ResourceCategory.IDP,
      permissionLabels: {
        [PermissionIdentifier.IDP_PLUGINS_VIEW]: <String stringID="rbac.permissionLabels.view" />,
        [PermissionIdentifier.IDP_PLUGINS_EDIT]: <String stringID="rbac.permissionLabels.createEdit" />,
        [PermissionIdentifier.IDP_PLUGINS_TOGGLE]: <String stringID="rbac.permissionLabels.toggle" />,
        [PermissionIdentifier.IDP_PLUGINS_DELETE]: <String stringID="rbac.permissionLabels.delete" />
      }
    })
    RbacFactory.registerResourceTypeHandler(ResourceType.IDP_INTEGRATION, {
      icon: 'idp-nav-oauth',
      label: 'common.purpose.ci.integration',
      category: ResourceCategory.IDP,
      permissionLabels: {
        [PermissionIdentifier.IDP_INTEGRATION_VIEW]: <String stringID="rbac.permissionLabels.view" />,
        [PermissionIdentifier.IDP_INTEGRATION_CREATE]: <String stringID="rbac.permissionLabels.create" />,
        [PermissionIdentifier.IDP_INTEGRATION_EDIT]: <String stringID="rbac.permissionLabels.edit" />,
        [PermissionIdentifier.IDP_INTEGRATION_DELETE]: <String stringID="rbac.permissionLabels.delete" />
      }
    })
    RbacFactory.registerResourceTypeHandler(ResourceType.IDP_SCORECARD, {
      icon: 'idp-nav-scorecards',
      label: 'idp.scorecards',
      category: ResourceCategory.IDP,
      permissionLabels: {
        [PermissionIdentifier.IDP_SCORECARD_VIEW]: <String stringID="rbac.permissionLabels.view" />,
        [PermissionIdentifier.IDP_SCORECARD_EDIT]: <String stringID="rbac.permissionLabels.createEdit" />,
        [PermissionIdentifier.IDP_SCORECARD_DELETE]: <String stringID="rbac.permissionLabels.delete" />
      }
    })
    RbacFactory.registerResourceTypeHandler(ResourceType.IDP_LAYOUT, {
      icon: 'idp-nav-layout',
      label: 'idp.layouts',
      category: ResourceCategory.IDP,
      permissionLabels: {
        [PermissionIdentifier.IDP_LAYOUT_VIEW]: <String stringID="rbac.permissionLabels.view" />,
        [PermissionIdentifier.IDP_LAYOUT_EDIT]: <String stringID="rbac.permissionLabels.createEdit" />
      }
    })
    RbacFactory.registerResourceTypeHandler(ResourceType.IDP_CATALOG_ACCESS_POLICY, {
      icon: 'user',
      label: 'idp.catalogAccessPolicy',
      category: ResourceCategory.IDP,
      permissionLabels: {
        [PermissionIdentifier.IDP_CATALOGACCESSPOLICY_VIEW]: <String stringID="rbac.permissionLabels.view" />,
        [PermissionIdentifier.IDP_CATALOGACCESSPOLICY_CREATE]: <String stringID="rbac.permissionLabels.create" />,
        [PermissionIdentifier.IDP_CATALOGACCESSPOLICY_EDIT]: <String stringID="rbac.permissionLabels.edit" />,
        [PermissionIdentifier.IDP_CATALOGACCESSPOLICY_DELETE]: <String stringID="rbac.permissionLabels.delete" />
      }
    })
    RbacFactory.registerResourceTypeHandler(ResourceType.IDP_ADVANCED_CONFIGURATION, {
      icon: 'idp-nav-pluginconfig',
      label: 'pipeline.advancedConfiguration',
      category: ResourceCategory.IDP,
      permissionLabels: {
        [PermissionIdentifier.IDP_ADVANCEDCONFIG_VIEW]: <String stringID="rbac.permissionLabels.view" />,
        [PermissionIdentifier.IDP_ADVANCEDCONFIG_EDIT]: <String stringID="rbac.permissionLabels.createEdit" />,
        [PermissionIdentifier.IDP_ADVANCEDCONFIG_DELETE]: <String stringID="rbac.permissionLabels.delete" />
      }
    })
  }

  const moduleParams: ModulePathParams = {
    module: ':module(idp-admin)'
  }

  const mfePaths = [
    routes.toIDPAdmin({ ...accountPathProps }),
    routes.toGetStartedWithIDP({ ...accountPathProps }),
    routes.toAdminHome({ ...accountPathProps }),
    routes.toPluginsPage({ ...accountPathProps }),
    routes.toConfigurations({ ...accountPathProps }),
    routes.toLayoutConfig({ ...accountPathProps }),
    routes.toIDPAccessControl({ ...accountPathProps }),
    routes.toConnectorsPage({ ...accountPathProps }),
    routes.toIDPOAuthConfig({ ...accountPathProps }),
    routes.toIDPAllowListURL({ ...accountPathProps }),
    routes.toScorecards({ ...accountPathProps })
  ]

  return (
    <>
      <RouteWithLayout path={routes.toIDPDefaultPath({ ...accountPathProps })} layout={MinimalLayout}>
        <RedirectToIDPDefaultPath />
      </RouteWithLayout>

      <RouteWithLayout path={routes.toIDP({ ...accountPathProps })} layout={MinimalLayout}>
        <ChildAppMounter ChildApp={IDPMicroFrontend} />
      </RouteWithLayout>

      <Route
        sidebarProps={IDPAdminSideNavProps}
        path={[
          routes.toIDPPipelines({ ...projectPathProps, ...accountPathProps, ...orgPathProps }),
          routes.toIDPDeployments({ ...projectPathProps, ...accountPathProps, ...orgPathProps })
        ]}
      >
        <PipelineRouteDestinations
          moduleParams={moduleParams}
          sidebarProps={IDPAdminSideNavProps}
          pipelineStudioComponent={PipelineStudio}
          pipelineDeploymentListComponent={PipelineDeploymentList}
        />
        <TriggersRouteDestinations moduleParams={moduleParams} sidebarProps={IDPAdminSideNavProps} />
      </Route>

      <RouteWithLayout sidebarProps={IDPAdminSideNavProps} path={routes.toIDPProjectSetup({ ...accountPathProps })}>
        <IDPPipelinesOverview />
      </RouteWithLayout>

      <RouteWithLayout path={[...mfePaths]} pageName={PAGE_NAME.IDPAdminPage} sidebarProps={IDPAdminSideNavProps}>
        <ChildAppMounter<IDPCustomMicroFrontendProps>
          ChildApp={IDPAdminMicroFrontend}
          customComponents={{ ConnectorReferenceField, MultiTypeSecretInput, MultiTypeDelegateSelector }}
          customHooks={{ useQueryParams, useUpdateQueryParams }}
          idpServices={{ useGetUserGroupAggregateList }}
        />
      </RouteWithLayout>
    </>
  )
}

export default IDPRoutes
