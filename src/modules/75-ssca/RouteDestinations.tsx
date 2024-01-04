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
import {
  useMetadataGetProject,
  useMetadataListPriorities,
  useMetadataListProjects
} from 'services/ticket-service/ticketServiceComponents'
import { SecretRouteDestinations } from '@platform/secrets/RouteDestinations'
import { AccessControlRouteDestinations } from '@rbac/RouteDestinations'
import { DelegateRouteDestinations } from '@platform/delegates/RouteDestinations'
import { VariableRouteDestinations } from '@platform/variables/RouteDestinations'
import { FileStoreRouteDestinations } from '@modules/27-platform/filestore/RouteDestinations'
import { GovernanceRouteDestinations } from '@modules/25-governance/RouteDestinations'
import { useQueryParamsOptions } from '@common/hooks/useQueryParams'
import { PolicyViolationsDrawer } from '@modules/70-pipeline/pages/execution/ExecutionArtifactsView/PolicyViolations/PolicyViolationsDrawer'
import { SLSAVerification } from '@modules/70-pipeline/pages/execution/ExecutionArtifactsView/ArtifactsTable/ArtifactTableCells'
import { ResourceCategory, ResourceType } from '@modules/20-rbac/interfaces/ResourceType'
import RbacFactory from '@modules/20-rbac/factories/RbacFactory'
import { PermissionIdentifier } from '@modules/20-rbac/interfaces/PermissionIdentifier'
import { String } from 'framework/strings'
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

RbacFactory.registerResourceCategory(ResourceCategory.SSCA, {
  icon: 'ssca-main',
  label: 'common.ssca'
})

RbacFactory.registerResourceTypeHandler(ResourceType.SSCA_REMEDIATION_TRACKER, {
  icon: 'ssca-remediation',
  label: 'ssca.remediationTracker',
  labelSingular: 'ssca.remediationTracker',
  category: ResourceCategory.SSCA,
  permissionLabels: {
    [PermissionIdentifier.SSCA_REMEDIATIONTRACKER_VIEW]: <String stringID="rbac.permissionLabels.view" />,
    [PermissionIdentifier.SSCA_REMEDIATIONTRACKER_EDIT]: <String stringID="rbac.permissionLabels.createEdit" />,
    [PermissionIdentifier.SSCA_REMEDIATIONTRACKER_CLOSE]: <String stringID="close" />
  }
})

RbacFactory.registerResourceTypeHandler(ResourceType.SSCA_ENFORCEMENT_EXEMPTION, {
  icon: 'ssca-enforce',
  label: 'sto.exemptions',
  labelSingular: 'sto.exemptions',
  category: ResourceCategory.SSCA,
  permissionLabels: {
    [PermissionIdentifier.SSCA_ENFORCEMENTEXEMPTION_VIEW]: <String stringID="rbac.permissionLabels.view" />,
    [PermissionIdentifier.SSCA_ENFORCEMENTEXEMPTION_EDIT]: <String stringID="rbac.permissionLabels.createEdit" />,
    [PermissionIdentifier.SSCA_ENFORCEMENTEXEMPTION_DELETE]: <String stringID="delete" />,
    [PermissionIdentifier.SSCA_ENFORCEMENTEXEMPTION_REVIEW]: <String stringID="review" />
  }
})

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
        customHooks={{
          useQueryParams,
          useUpdateQueryParams,
          useQueryParamsOptions
        }}
        customComponents={{ Duration, PolicyViolationsDrawer, SLSAVerification, TimeAgoPopover }}
        customServices={{
          useMetadataGetProject,
          useMetadataListPriorities,
          useMetadataListProjects
        }}
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
        customHooks={{
          useQueryParams,
          useUpdateQueryParams,
          useQueryParamsOptions
        }}
        customComponents={{ Duration, PolicyViolationsDrawer, SLSAVerification, TimeAgoPopover }}
        customServices={{
          useMetadataGetProject,
          useMetadataListPriorities,
          useMetadataListProjects
        }}
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
      <FileStoreRouteDestinations moduleParams={moduleParams} sidebarProps={SSCASideNavProps} />
      <GovernanceRouteDestinations
        sidebarProps={SSCASideNavProps}
        pathProps={{ ...accountPathProps, ...projectPathProps, ...moduleParams }}
      />
    </Route>
  </>
)
