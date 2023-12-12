/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { lazy } from 'react'
import { Redirect, Route, useParams } from 'react-router-dom'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import type { SidebarContext } from '@common/navigation/SidebarProvider'
import routes from '@common/RouteDefinitions'
import { RouteWithLayout } from '@common/router'
import { accountPathProps, projectPathProps } from '@common/utils/routeUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import PipelineStudio from '@pipeline/components/PipelineStudio/PipelineStudio'
import { PipelineDeploymentList } from '@pipeline/pages/pipeline-deployment-list/PipelineDeploymentList'
import { PipelineRouteDestinations } from '@pipeline/RouteDestinations'
import './components/PipelineSteps'
import { Duration, TimeAgoPopover } from '@common/exports'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import ChildAppMounter from 'microfrontends/ChildAppMounter'
import { ConnectorRouteDestinations } from '@platform/connectors/RouteDestinations'
import { DefaultSettingsRouteDestinations } from '@platform/default-settings/RouteDestinations'
import { SecretRouteDestinations } from '@platform/secrets/RouteDestinations'
import { AccessControlRouteDestinations } from '@rbac/RouteDestinations'
import { DelegateRouteDestinations } from '@platform/delegates/RouteDestinations'
import { VariableRouteDestinations } from '@platform/variables/RouteDestinations'
import { useQueryParamsOptions } from '@common/hooks/useQueryParams'
import { PolicyViolationsDrawer } from '@modules/70-pipeline/pages/execution/ExecutionArtifactsView/PolicyViolations/PolicyViolationsDrawer'
import { SLSAVerification } from '@modules/70-pipeline/pages/execution/ExecutionArtifactsView/ArtifactsTable/ArtifactTableCells'
import { SSCACustomMicroFrontendProps } from './interfaces/SSCACustomMicroFrontendProps.types'
import SSCASideNav from './components/SSCASideNav'

// eslint-disable-next-line import/no-unresolved
const RemoteSSCAApp = lazy(() => import('ssca/MicroFrontendApp'))

const SSCASideNavProps: SidebarContext = {
  navComponent: SSCASideNav,
  title: 'Software Supply Chain Assurance',
  icon: 'ssca-main'
}

const moduleParams: ModulePathParams = {
  module: ':module(ssca)'
}

const RedirectToProjectOverviewPage = (): React.ReactElement => {
  const { accountId } = useParams<ProjectPathProps>()
  const { selectedProject } = useAppStore()

  if (selectedProject) {
    return (
      <Redirect
        to={routes.toProjectOverview({
          accountId,
          orgIdentifier: selectedProject.orgIdentifier || 'default',
          projectIdentifier: selectedProject.identifier,
          module: 'ssca'
        })}
      />
    )
  } else {
    return <Redirect to={routes.toSSCAOverview({ accountId })} />
  }
}

export default (
  <>
    <RouteWithLayout exact path={routes.toSSCA({ ...accountPathProps })}>
      <RedirectToProjectOverviewPage />
    </RouteWithLayout>
    <RouteWithLayout
      sidebarProps={SSCASideNavProps}
      exact
      path={[
        routes.toSSCAOverview({ ...accountPathProps }),
        routes.toProjectOverview({ ...projectPathProps, ...moduleParams })
      ]}
    >
      <ChildAppMounter<SSCACustomMicroFrontendProps>
        ChildApp={RemoteSSCAApp}
        customHooks={{ useQueryParams, useUpdateQueryParams, useQueryParamsOptions }}
        customComponents={{ Duration, PolicyViolationsDrawer, SLSAVerification, TimeAgoPopover }}
      />
    </RouteWithLayout>

    {/* no exact, to match any sublevel of artifacts which can be defined within MFE
    also not that wildcard pattern of /account/:accountId/:module(ssca) is matched for pipeline routes */}
    <RouteWithLayout
      sidebarProps={SSCASideNavProps}
      path={[
        routes.toSSCAArtifacts({ ...projectPathProps, ...moduleParams }),
        routes.toRemediationTracker({ ...projectPathProps, ...moduleParams })
      ]}
    >
      <ChildAppMounter<SSCACustomMicroFrontendProps>
        ChildApp={RemoteSSCAApp}
        customHooks={{ useQueryParams, useUpdateQueryParams, useQueryParamsOptions }}
        customComponents={{ Duration, PolicyViolationsDrawer, SLSAVerification, TimeAgoPopover }}
      />
    </RouteWithLayout>

    <Route path="/account/:accountId/:module(ssca)">
      <PipelineRouteDestinations
        moduleParams={moduleParams}
        sidebarProps={SSCASideNavProps}
        pipelineStudioComponent={PipelineStudio}
        pipelineDeploymentListComponent={PipelineDeploymentList}
      />

      <ConnectorRouteDestinations moduleParams={moduleParams} sidebarProps={SSCASideNavProps} />
      <SecretRouteDestinations moduleParams={moduleParams} sidebarProps={SSCASideNavProps} />
      <VariableRouteDestinations moduleParams={moduleParams} sidebarProps={SSCASideNavProps} />
      <AccessControlRouteDestinations moduleParams={moduleParams} sidebarProps={SSCASideNavProps} />
      <DelegateRouteDestinations moduleParams={moduleParams} sidebarProps={SSCASideNavProps} />
      <DefaultSettingsRouteDestinations moduleParams={moduleParams} sidebarProps={SSCASideNavProps} />
    </Route>
  </>
)
