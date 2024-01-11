/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Redirect, Route, useParams } from 'react-router-dom'
import { defaultTo } from 'lodash-es'
import type {
  ExecutionPathProps,
  Module,
  ModulePathParams,
  PipelinePathProps,
  PipelineType,
  TriggerQueryParams
} from '@common/interfaces/RouteInterfaces'
import { EmptyLayout, MinimalLayout } from '@common/layouts'
import type { SidebarContext } from '@common/navigation/SidebarProvider'
import { PAGE_NAME } from '@common/pages/pageContext/PageName'
import { RouteWithLayout } from '@common/router'
import {
  NAV_MODE,
  accountPathProps,
  executionPathProps,
  inputSetFormPathProps,
  pipelinePathProps,
  projectPathProps
} from '@common/utils/routeUtils'
import { EnhancedInputSetFormForRoute } from '@modules/70-pipeline/components/InputSetForm/EnhancedInputSetForm'
import { InputSetFormV1ForRoute } from '@pipeline/v1/components/InputSetFormV1/InputSetFormV1'
import ExecutionArtifactsView from '@pipeline/pages/execution/ExecutionArtifactsView/ExecutionArtifactsView'
import ExecutionInputsView from '@pipeline/pages/execution/ExecutionInputsView/ExecutionInputsView'
import ExecutionLandingPage from '@pipeline/pages/execution/ExecutionLandingPage/ExecutionLandingPage'
import ExecutionPipelineView from '@pipeline/pages/execution/ExecutionPipelineView/ExecutionPipelineView'
import ExecutionPolicyEvaluationsView from '@pipeline/pages/execution/ExecutionPolicyEvaluationsView/ExecutionPolicyEvaluationsView'
import ExecutionSecurityView from '@pipeline/pages/execution/ExecutionSecurityView/ExecutionSecurityView'
import BuildTestsApp from '@pipeline/pages/execution/ExecutionTestView/BuildTestsApp'
import ResilienceView from '@pipeline/pages/execution/ResilienceView/ResilienceView'
import FullPageLogView from '@pipeline/pages/full-page-log-view/FullPageLogView'
import InputSetList from '@pipeline/pages/inputSet-list/InputSetList'
import PipelineDetails from '@pipeline/pages/pipeline-details/PipelineDetails'
import { PipelineListPage } from '@pipeline/pages/pipeline-list/PipelineListPage'
import type { LicenseRedirectProps } from 'framework/LicenseStore/LicenseStoreContext'
import '@pipeline/components/CommonPipelineStages/ApprovalStage'
import '@pipeline/components/CommonPipelineStages/CustomStage'
import '@pipeline/components/CommonPipelineStages/PipelineStage'

import RbacFactory from '@rbac/factories/RbacFactory'
import ExecFactory from '@pipeline/factories/ExecutionFactory'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { String } from 'framework/strings'
import LandingDashboardFactory from '@common/factories/LandingDashboardFactory'
import LandingDashboardDeploymentsWidget from '@pipeline/components/LandingDashboardDeploymentsWidget/LandingDashboardDeploymentsWidget'

import PipelineResourceModal from '@pipeline/components/RbacResourceModals/PipelineResourceModal/PipelineResourceModal'
import ServiceResourceModal from '@pipeline/components/RbacResourceModals/ServiceResourceModal/ServiceResourceModal'
import EnvironmentResourceModal from '@pipeline/components/RbacResourceModals/EnvironmentResourceModal/EnvironmentResourceModal'
import EnvironmentAttributeModal from '@pipeline/components/RbacResourceModals/EnvironmentAttributeModal/EnvironmentAttributeModal'
import EnvironmentGroupsResourceModal from '@pipeline/components/RbacResourceModals/EnvironmentGroupsResourceModal/EnvironmentGroupsResourceModal'
import { HarnessApprovalView } from '@pipeline/components/execution/StepDetails/views/HarnessApprovalView/HarnessApprovalView'
import { HarnessApprovalLogsView } from '@pipeline/components/execution/StepDetails/views/HarnessApprovalView/HarnessApprovalLogsView'
import { JiraApprovalView } from '@pipeline/components/execution/StepDetails/views/JiraApprovalView/JiraApprovalView'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { ServiceNowApprovalView } from '@pipeline/components/execution/StepDetails/views/ServiceNowApprovalView/ServiceNowApprovalView'
import { WaitStepView } from '@pipeline/components/execution/StepDetails/views/WaitStepView/WaitStepView'
import { CustomApprovalView } from '@pipeline/components/execution/StepDetails/views/CustomApprovalView/CustomApprovalView'
import { PolicyEvaluationView } from '@pipeline/components/execution/StepDetails/views/PolicyEvaluationView/PolicyEvaluationView'
import { QueueStepView } from '@pipeline/components/execution/StepDetails/views/QueueStepView/QueueStepView'
import type { AuditEventData, ResourceDTO } from 'services/audit'
import AuditTrailFactory, { ResourceScope } from 'framework/AuditTrail/AuditTrailFactory'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { ServiceNowCreateUpdateView } from '@pipeline/components/execution/StepDetails/views/ServiceNowCreateUpdateView/ServiceNowCreateUpdateView'
import { ModuleName } from 'framework/types/ModuleName'
import { ServiceNowImportSetView } from '@pipeline/components/execution/StepDetails/views/ServiceNowImportSetView/ServiceNowImportSetView'
import { ProjectDetailsSideNavProps } from '@projects-orgs/RouteDestinations'
import ExecutionIACMResourcesView from '@pipeline/pages/execution/ExecutionIACMResourcesView/ExecutionIACMResourcesView'
import PipelineResourceRenderer from './components/RbacResourceModals/PipelineResourceRenderer/PipelineResourceRenderer'
import { JiraCreateUpdateView } from './components/execution/StepDetails/views/JiraCreateUpdateView/JiraCreateUpdateView'
import ExecutionErrorTrackingView from './pages/execution/ExecutionErrorTrackingView/ExecutionErrorTrackingView'
import { ExecutionListPage } from './pages/execution-list-page/ExecutionListPage'
import EnvironmentResourceRenderer from './components/RbacResourceTables/EnvironmentAttributeRenderer/EnvironmentResourceRenderer'
import EnvironmentAttributeRenderer from './components/RbacResourceTables/EnvironmentAttributeRenderer/EnvironmentAttributeRenderer'
import { BuildCommits } from './pages/execution/ExecutionLandingPage/Commits/BuildCommits'
import { getPipelineExecutionEventAdditionalDetails } from './utils/auditTrailUtils'
import ExecutionIACMCostsEstimationView from './pages/execution/ExecutionIACMCostsEstimationView'
/**
 * Register RBAC resources
 */
RbacFactory.registerResourceTypeHandler(ResourceType.PIPELINE, {
  icon: 'pipeline-deployment',
  label: 'pipelines',
  labelSingular: 'common.pipeline',
  permissionLabels: {
    [PermissionIdentifier.VIEW_PIPELINE]: <String stringID="rbac.permissionLabels.view" />,
    [PermissionIdentifier.EDIT_PIPELINE]: <String stringID="rbac.permissionLabels.createEdit" />,
    [PermissionIdentifier.DELETE_PIPELINE]: <String stringID="rbac.permissionLabels.delete" />,
    [PermissionIdentifier.EXECUTE_PIPELINE]: <String stringID="rbac.permissionLabels.execute" />
  },
  resourceModalSortingEnabled: true,
  // eslint-disable-next-line react/display-name
  addResourceModalBody: props => <PipelineResourceModal {...props} />,
  // eslint-disable-next-line react/display-name
  staticResourceRenderer: props => <PipelineResourceRenderer {...props} />
})

RbacFactory.registerResourceTypeHandler(ResourceType.SERVICE, {
  icon: 'service-deployment',
  label: 'services',
  labelSingular: 'service',
  permissionLabels: {
    [PermissionIdentifier.VIEW_SERVICE]: <String stringID="rbac.permissionLabels.view" />,
    [PermissionIdentifier.EDIT_SERVICE]: <String stringID="rbac.permissionLabels.createEdit" />,
    [PermissionIdentifier.DELETE_SERVICE]: <String stringID="rbac.permissionLabels.delete" />,
    [PermissionIdentifier.RUNTIMEACCESS_SERVICE]: <String stringID="rbac.permissionLabels.access" />
  },
  resourceModalSortingEnabled: true,
  // eslint-disable-next-line react/display-name
  addResourceModalBody: props => <ServiceResourceModal {...props} />
})

RbacFactory.registerResourceTypeHandler(ResourceType.ENVIRONMENT, {
  icon: 'environment',
  label: 'environments',
  labelSingular: 'environment',
  permissionLabels: {
    [PermissionIdentifier.VIEW_ENVIRONMENT]: <String stringID="rbac.permissionLabels.view" />,
    [PermissionIdentifier.EDIT_ENVIRONMENT]: <String stringID="rbac.permissionLabels.createEdit" />,
    [PermissionIdentifier.DELETE_ENVIRONMENT]: <String stringID="rbac.permissionLabels.delete" />,
    [PermissionIdentifier.RUNTIMEACCESS_ENVIRONMENT]: <String stringID="rbac.permissionLabels.access" />,

    // these are required for the FF module to restrict flag toggling and editing based on permissions
    // against specific environments
    [PermissionIdentifier.TOGGLE_FF_FEATUREFLAG]: <String stringID="rbac.permissionLabels.toggleFlag" />,
    [PermissionIdentifier.EDIT_FF_FEATUREFLAG]: <String stringID="rbac.permissionLabels.edit" />,
    [PermissionIdentifier.CREATE_FF_SDK_KEY]: <String stringID="rbac.permissionLabels.createFFSDKKey" />,
    [PermissionIdentifier.DELETE_FF_SDK_KEY]: <String stringID="rbac.permissionLabels.deleteFFSDKKey" />
  },
  resourceModalSortingEnabled: true,
  // eslint-disable-next-line react/display-name
  addResourceModalBody: props => <EnvironmentResourceModal {...props} />,
  addAttributeModalBody: props => <EnvironmentAttributeModal {...props} />,
  staticResourceRenderer: props => <EnvironmentResourceRenderer {...props} />,
  attributeRenderer: props => <EnvironmentAttributeRenderer {...props} />
})

RbacFactory.registerResourceTypeHandler(ResourceType.ENVIRONMENT_GROUP, {
  icon: 'environment-group',
  label: 'common.environmentGroups.label',
  labelSingular: 'common.environmentGroup.label',
  permissionLabels: {
    [PermissionIdentifier.VIEW_ENVIRONMENT_GROUP]: <String stringID="rbac.permissionLabels.view" />,
    [PermissionIdentifier.EDIT_ENVIRONMENT_GROUP]: <String stringID="rbac.permissionLabels.createEdit" />,
    [PermissionIdentifier.DELETE_ENVIRONMENT_GROUP]: <String stringID="rbac.permissionLabels.delete" />,
    [PermissionIdentifier.RUNTIMEACCESS_ENVIRONMENT_GROUP]: <String stringID="rbac.permissionLabels.access" />
  },
  addResourceModalBody: props => <EnvironmentGroupsResourceModal {...props} />
})

/**
 * Register execution step detail views
 */
ExecFactory.registerStepDetails(StepType.HarnessApproval, {
  component: HarnessApprovalView
})

ExecFactory.registerConsoleViewStepDetails(StepType.HarnessApproval, {
  component: HarnessApprovalLogsView
})

ExecFactory.registerStepDetails(StepType.JiraCreate, {
  component: JiraCreateUpdateView
})

ExecFactory.registerStepDetails(StepType.JiraUpdate, {
  component: JiraCreateUpdateView
})

ExecFactory.registerStepDetails(StepType.JiraApproval, {
  component: JiraApprovalView
})

ExecFactory.registerStepDetails(StepType.Wait, {
  component: WaitStepView
})

ExecFactory.registerStepDetails(StepType.ServiceNowApproval, {
  component: ServiceNowApprovalView
})

ExecFactory.registerStepDetails(StepType.CustomApproval, {
  component: CustomApprovalView
})

ExecFactory.registerStepDetails(StepType.ServiceNowCreate, {
  component: ServiceNowCreateUpdateView
})
ExecFactory.registerStepDetails(StepType.ServiceNowUpdate, {
  component: ServiceNowCreateUpdateView
})

ExecFactory.registerStepDetails(StepType.ServiceNowImportSet, {
  component: ServiceNowImportSetView
})

ExecFactory.registerStepDetails(StepType.Policy, {
  component: PolicyEvaluationView
})

ExecFactory.registerStepDetails(StepType.Queue, {
  component: QueueStepView
})

/**
 * Register for Landing Page
 * */
LandingDashboardFactory.registerModuleDashboardHandler(ModuleName.CD, {
  label: 'deploymentsText',
  icon: 'cd-main',
  iconProps: { size: 20 },
  // eslint-disable-next-line react/display-name
  moduleDashboardRenderer: () => <LandingDashboardDeploymentsWidget />
})

/**
 * Register for Audit Trail
 * */
const cdLabel = 'common.purpose.cd.continuous'
AuditTrailFactory.registerResourceHandler('PIPELINE', {
  moduleIcon: {
    name: 'cd-main'
  },
  moduleLabel: cdLabel,
  resourceLabel: 'common.pipeline',
  resourceUrl: (
    pipeline: ResourceDTO,
    resourceScope: ResourceScope,
    module?: Module,
    auditEventData?: AuditEventData,
    isNewNav?: boolean
  ) => {
    const { accountIdentifier, orgIdentifier, projectIdentifier } = resourceScope
    const pipelineIdentifier = pipeline.identifier
    const { planExecutionId } = defaultTo(auditEventData, {}) as any

    if (pipelineIdentifier && orgIdentifier && projectIdentifier) {
      if (planExecutionId)
        return isNewNav
          ? routesV2.toExecutionPipelineView({
              module,
              orgIdentifier,
              projectIdentifier,
              accountId: accountIdentifier,
              pipelineIdentifier: pipelineIdentifier,
              source: 'executions',
              executionIdentifier: planExecutionId,
              mode: NAV_MODE.ALL
            })
          : routes.toExecutionPipelineView({
              module,
              orgIdentifier,
              projectIdentifier,
              accountId: accountIdentifier,
              pipelineIdentifier: pipelineIdentifier,
              source: 'executions',
              executionIdentifier: planExecutionId
            })
      return isNewNav
        ? routesV2.toPipelineStudio({
            module,
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            pipelineIdentifier: pipelineIdentifier,
            mode: NAV_MODE.ALL
          })
        : routes.toPipelineStudio({
            module,
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            pipelineIdentifier: pipelineIdentifier
          })
    }
    return undefined
  },
  additionalDetails: getPipelineExecutionEventAdditionalDetails
})

AuditTrailFactory.registerResourceHandler('INPUT_SET', {
  moduleIcon: {
    name: 'cd-main'
  },
  moduleLabel: cdLabel,
  resourceLabel: 'inputSetsText',
  resourceUrl: (
    inputSet: ResourceDTO,
    resourceScope: ResourceScope,
    module?: Module,
    _auditEventData?: AuditEventData,
    isNewNav?: boolean
  ) => {
    const { accountIdentifier, orgIdentifier, projectIdentifier } = resourceScope
    if (inputSet.identifier && inputSet.labels?.pipelineIdentifier && orgIdentifier && projectIdentifier) {
      return isNewNav
        ? routesV2.toInputSetForm({
            module,
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            inputSetIdentifier: inputSet.identifier,
            pipelineIdentifier: inputSet.labels.pipelineIdentifier,
            mode: NAV_MODE.ALL
          })
        : routes.toInputSetForm({
            module,
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            inputSetIdentifier: inputSet.identifier,
            pipelineIdentifier: inputSet.labels.pipelineIdentifier
          })
    }
    return undefined
  }
})

AuditTrailFactory.registerResourceHandler('SERVICE', {
  moduleIcon: {
    name: 'cd-main'
  },
  moduleLabel: cdLabel,
  resourceLabel: 'service',
  resourceUrl: (
    service: ResourceDTO,
    resourceScope: ResourceScope,
    module?: Module,
    _auditEventData?: AuditEventData,
    isNewNav?: boolean
  ) => {
    const { accountIdentifier, orgIdentifier, projectIdentifier } = resourceScope
    if (service.identifier && orgIdentifier && projectIdentifier) {
      return isNewNav
        ? routesV2.toSettingsServiceDetails({
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            serviceId: service.identifier
          })
        : routes.toServiceStudio({
            module,
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            serviceId: service.identifier
          })
    } else if (service.identifier) {
      return isNewNav
        ? routesV2.toSettingsServiceDetails({
            accountId: accountIdentifier,
            serviceId: service.identifier
          })
        : routes.toServiceStudio({
            module,
            accountId: accountIdentifier,
            serviceId: service.identifier
          })
    }
    return undefined
  }
})

AuditTrailFactory.registerResourceHandler('ENVIRONMENT_GROUP', {
  moduleIcon: {
    name: 'cd-main'
  },
  moduleLabel: cdLabel,
  resourceLabel: 'common.environmentGroup.label',
  resourceUrl: (
    environmentGroup: ResourceDTO,
    resourceScope: ResourceScope,
    module?: Module,
    _auditEventData?: AuditEventData,
    isNewNav?: boolean
  ) => {
    const { accountIdentifier, orgIdentifier, projectIdentifier } = resourceScope
    if (environmentGroup.identifier && orgIdentifier && projectIdentifier) {
      return isNewNav
        ? routesV2.toSettingsEnvironmentGroupDetails({
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            environmentGroupIdentifier: environmentGroup.identifier
          })
        : routes.toEnvironmentGroupDetails({
            module,
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            environmentGroupIdentifier: environmentGroup.identifier
          })
    }
    return undefined
  }
})

AuditTrailFactory.registerResourceHandler('ENVIRONMENT', {
  moduleIcon: {
    name: 'cd-main'
  },
  moduleLabel: cdLabel,
  resourceLabel: 'environment',
  resourceUrl: (
    environment: ResourceDTO,
    resourceScope: ResourceScope,
    module?: Module,
    _auditEventData?: AuditEventData,
    isNewNav?: boolean
  ) => {
    const { accountIdentifier, orgIdentifier, projectIdentifier } = resourceScope
    if (environment.identifier && orgIdentifier && projectIdentifier) {
      return isNewNav
        ? routesV2.toSettingsEnvironmentDetails({
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            environmentIdentifier: environment.identifier
          })
        : routes.toEnvironmentDetails({
            module,
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            environmentIdentifier: environment.identifier
          })
    } else if (environment.identifier) {
      return isNewNav
        ? routesV2.toSettingsEnvironmentDetails({
            accountId: accountIdentifier,
            environmentIdentifier: environment.identifier
          })
        : routes.toEnvironmentDetails({
            module,
            accountId: accountIdentifier,
            environmentIdentifier: environment.identifier
          })
    }
    return undefined
  }
})

AuditTrailFactory.registerResourceHandler('TRIGGER', {
  moduleIcon: {
    name: 'pipeline'
  },
  moduleLabel: 'common.pipeline',
  resourceLabel: 'common.triggerLabel',
  resourceUrl: (
    trigger: ResourceDTO,
    resourceScope: ResourceScope,
    module?: Module,
    _auditEventData?: AuditEventData,
    isNewNav?: boolean
  ) => {
    const { accountIdentifier, orgIdentifier, projectIdentifier } = resourceScope
    if (
      trigger.identifier &&
      trigger.labels?.pipelineIdentifier &&
      trigger.labels?.triggerType &&
      orgIdentifier &&
      projectIdentifier
    ) {
      return isNewNav
        ? routesV2.toTriggersDetailPage({
            module,
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            triggerIdentifier: trigger.identifier,
            triggerType: trigger.labels.triggerType as TriggerQueryParams['triggerType'],
            pipelineIdentifier: trigger.labels.pipelineIdentifier,
            mode: NAV_MODE.ALL
          })
        : routes.toTriggersDetailPage({
            module,
            orgIdentifier,
            projectIdentifier,
            accountId: accountIdentifier,
            triggerIdentifier: trigger.identifier,
            triggerType: trigger.labels.triggerType as TriggerQueryParams['triggerType'],
            pipelineIdentifier: trigger.labels.pipelineIdentifier
          })
    }
    return undefined
  }
})

export function RedirectToPipelineDetailHome(): React.ReactElement {
  const params = useParams<PipelineType<PipelinePathProps>>()

  return <Redirect to={routes.toPipelineStudio(params)} />
}

export function RedirectToExecutionPipeline(): React.ReactElement {
  const params = useParams<PipelineType<ExecutionPathProps>>()

  return <Redirect to={routes.toExecutionPipelineView(params)} />
}

interface PipelineRouteDestinationsProps {
  pipelineStudioComponent: React.FC
  pipelineStudioPageName?: PAGE_NAME
  pipelineDeploymentListComponent: React.FC
  pipelineDeploymentListPageName?: PAGE_NAME
  moduleParams: ModulePathParams
  licenseRedirectData?: LicenseRedirectProps
  sidebarProps?: SidebarContext
  pipelineStudioComponentV1?: React.FC
}

export function PipelineRouteDestinations({
  pipelineStudioComponent: PipelineStudio,
  pipelineStudioPageName,
  pipelineDeploymentListComponent: PipelineDeploymentList,
  pipelineDeploymentListPageName,
  moduleParams,
  licenseRedirectData,
  sidebarProps,
  pipelineStudioComponentV1: PipelineStudioV1
}: PipelineRouteDestinationsProps): JSX.Element {
  return (
    <>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        path={routes.toPipelineStudio({ ...accountPathProps, ...pipelinePathProps, ...moduleParams })}
        pageName={pipelineStudioPageName}
      >
        <PipelineDetails>
          <PipelineStudio />
        </PipelineDetails>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        path={routes.toPipelineStudioV1({ ...accountPathProps, ...pipelinePathProps, ...moduleParams })}
        pageName={pipelineStudioPageName}
      >
        <PipelineDetails>{PipelineStudioV1 ? <PipelineStudioV1 /> : <></>}</PipelineDetails>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        path={routes.toPipelineStudio({ ...accountPathProps, ...pipelinePathProps })}
        pageName={pipelineStudioPageName}
      >
        <PipelineDetails>
          <PipelineStudio />
        </PipelineDetails>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        layout={EmptyLayout}
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        path={routes.toPipelineLogs({
          ...accountPathProps,
          ...executionPathProps,
          ...moduleParams,
          stageIdentifier: ':stageIdentifier',
          stepIndentifier: ':stepIndentifier'
        })}
        pageName={PAGE_NAME.FullPageLogView}
      >
        <FullPageLogView />
      </RouteWithLayout>
      <RouteWithLayout
        exact
        layout={EmptyLayout}
        sidebarProps={ProjectDetailsSideNavProps}
        path={routes.toPipelineLogs({
          ...accountPathProps,
          ...executionPathProps,
          stageIdentifier: ':stageIdentifier',
          stepIndentifier: ':stepIndentifier'
        })}
        pageName={PAGE_NAME.FullPageLogView}
      >
        <FullPageLogView />
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        path={routes.toPipelines({ ...accountPathProps, ...projectPathProps, ...moduleParams })}
        pageName={PAGE_NAME.PipelineListPage}
      >
        <PipelineListPage />
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        path={routes.toPipelines({ ...accountPathProps, ...projectPathProps })}
        pageName={PAGE_NAME.PipelineListPage}
      >
        <PipelineListPage />
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        path={routes.toDeployments({ ...accountPathProps, ...projectPathProps, ...moduleParams })}
        pageName={PAGE_NAME.DeploymentsList}
      >
        <ExecutionListPage />
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        path={routes.toDeployments({ ...accountPathProps, ...projectPathProps })}
        pageName={PAGE_NAME.DeploymentsList}
      >
        <ExecutionListPage />
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        path={routes.toInputSetList({ ...accountPathProps, ...pipelinePathProps, ...moduleParams })}
        pageName={PAGE_NAME.InputSetList}
      >
        <PipelineDetails>
          <InputSetList />
        </PipelineDetails>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        path={routes.toInputSetList({ ...accountPathProps, ...pipelinePathProps })}
        pageName={PAGE_NAME.InputSetList}
      >
        <PipelineDetails>
          <InputSetList />
        </PipelineDetails>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        path={routes.toInputSetForm({ ...accountPathProps, ...inputSetFormPathProps, ...moduleParams })}
        pageName={PAGE_NAME.EnhancedInputSetForm}
      >
        <EnhancedInputSetFormForRoute />
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        path={routes.toInputSetForm({ ...accountPathProps, ...inputSetFormPathProps })}
        pageName={PAGE_NAME.EnhancedInputSetForm}
      >
        <EnhancedInputSetFormForRoute />
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        path={routes.toInputSetFormV1({ ...accountPathProps, ...inputSetFormPathProps, ...moduleParams })}
        pageName={PAGE_NAME.InputSetFormV1}
      >
        <InputSetFormV1ForRoute />
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        path={routes.toInputSetFormV1({ ...accountPathProps, ...inputSetFormPathProps })}
        pageName={PAGE_NAME.InputSetFormV1}
      >
        <InputSetFormV1ForRoute />
      </RouteWithLayout>
      <Route
        exact
        licenseStateName={licenseRedirectData?.licenseStateName}
        sidebarProps={sidebarProps}
        path={routes.toExecution({ ...accountPathProps, ...executionPathProps, ...moduleParams })}
      >
        <RedirectToExecutionPipeline />
      </Route>
      <Route
        exact
        licenseStateName={licenseRedirectData?.licenseStateName}
        sidebarProps={ProjectDetailsSideNavProps}
        path={routes.toExecution({ ...accountPathProps, ...executionPathProps })}
      >
        <RedirectToExecutionPipeline />
      </Route>
      <RouteWithLayout
        public
        publicViewProps={{ hideSidebar: true }}
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        layout={MinimalLayout}
        path={routes.toExecutionPipelineView({ ...accountPathProps, ...executionPathProps, ...moduleParams })}
        pageName={PAGE_NAME.ExecutionPipelineView}
      >
        <ExecutionLandingPage>
          <ExecutionPipelineView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        public
        publicViewProps={{ hideSidebar: true }}
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        layout={MinimalLayout}
        path={routes.toExecutionPipelineView({ ...accountPathProps, ...executionPathProps })}
        pageName={PAGE_NAME.ExecutionPipelineView}
      >
        <ExecutionLandingPage>
          <ExecutionPipelineView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        layout={MinimalLayout}
        path={routes.toExecutionPolicyEvaluationsView({
          ...accountPathProps,
          ...executionPathProps,
          ...moduleParams
        })}
        pageName={PAGE_NAME.ExecutionPolicyEvaluationsView}
      >
        <ExecutionLandingPage>
          <ExecutionPolicyEvaluationsView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        layout={MinimalLayout}
        path={routes.toExecutionPolicyEvaluationsView({
          ...accountPathProps,
          ...executionPathProps
        })}
        pageName={PAGE_NAME.ExecutionPolicyEvaluationsView}
      >
        <ExecutionLandingPage>
          <ExecutionPolicyEvaluationsView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        layout={MinimalLayout}
        path={routes.toExecutionSecurityView({
          ...accountPathProps,
          ...executionPathProps,
          ...moduleParams
        })}
        pageName={PAGE_NAME.ExecutionSecurityView}
      >
        <ExecutionLandingPage>
          <ExecutionSecurityView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        layout={MinimalLayout}
        path={routes.toExecutionSecurityView({
          ...accountPathProps,
          ...executionPathProps
        })}
        pageName={PAGE_NAME.ExecutionSecurityView}
      >
        <ExecutionLandingPage>
          <ExecutionSecurityView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        layout={MinimalLayout}
        path={routes.toExecutionErrorTrackingView({
          ...accountPathProps,
          ...executionPathProps,
          ...moduleParams
        })}
        pageName={PAGE_NAME.ErrorTrackingListPage}
      >
        <ExecutionLandingPage>
          <ExecutionErrorTrackingView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        sidebarProps={ProjectDetailsSideNavProps}
        layout={MinimalLayout}
        path={routes.toExecutionErrorTrackingView({
          ...accountPathProps,
          ...executionPathProps
        })}
        pageName={PAGE_NAME.ErrorTrackingListPage}
      >
        <ExecutionLandingPage>
          <ExecutionErrorTrackingView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        layout={MinimalLayout}
        path={routes.toExecutionInputsView({ ...accountPathProps, ...executionPathProps, ...moduleParams })}
        pageName={PAGE_NAME.ExecutionInputsView}
      >
        <ExecutionLandingPage>
          <ExecutionInputsView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        layout={MinimalLayout}
        path={routes.toExecutionInputsView({ ...accountPathProps, ...executionPathProps })}
        pageName={PAGE_NAME.ExecutionInputsView}
      >
        <ExecutionLandingPage>
          <ExecutionInputsView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        layout={MinimalLayout}
        path={routes.toExecutionArtifactsView({
          ...accountPathProps,
          ...executionPathProps,
          ...moduleParams
        })}
        pageName={PAGE_NAME.ExecutionArtifactsView}
      >
        <ExecutionLandingPage>
          <ExecutionArtifactsView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        layout={MinimalLayout}
        path={routes.toExecutionArtifactsView({
          ...accountPathProps,
          ...executionPathProps
        })}
        pageName={PAGE_NAME.ExecutionArtifactsView}
      >
        <ExecutionLandingPage>
          <ExecutionArtifactsView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        layout={MinimalLayout}
        path={routes.toExecutionTestsView({
          ...accountPathProps,
          ...executionPathProps,
          ...moduleParams
        })}
        pageName={PAGE_NAME.BuildTests}
      >
        <ExecutionLandingPage>
          <BuildTestsApp />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        layout={MinimalLayout}
        path={routes.toExecutionTestsView({
          ...accountPathProps,
          ...executionPathProps
        })}
        pageName={PAGE_NAME.BuildTests}
      >
        <ExecutionLandingPage>
          <BuildTestsApp />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        layout={MinimalLayout}
        path={routes.toExecutionCommitsView({
          ...accountPathProps,
          ...executionPathProps
        })}
        pageName={PAGE_NAME.BuildCommits}
      >
        <ExecutionLandingPage>
          <BuildCommits />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        layout={MinimalLayout}
        path={routes.toExecutionCommitsView({
          ...accountPathProps,
          ...executionPathProps,
          ...moduleParams
        })}
        pageName={PAGE_NAME.BuildCommits}
      >
        <ExecutionLandingPage>
          <BuildCommits />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        layout={MinimalLayout}
        path={routes.toResilienceView({
          ...accountPathProps,
          ...executionPathProps,
          ...moduleParams
        })}
        pageName={PAGE_NAME.ExecutionResilienceView}
      >
        <ExecutionLandingPage>
          <ResilienceView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        layout={MinimalLayout}
        path={routes.toResilienceView({
          ...accountPathProps,
          ...executionPathProps
        })}
        pageName={PAGE_NAME.ExecutionResilienceView}
      >
        <ExecutionLandingPage>
          <ResilienceView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        path={routes.toPipelineDeploymentList({
          ...accountPathProps,
          ...pipelinePathProps,
          ...moduleParams
        })}
        pageName={pipelineDeploymentListPageName}
      >
        <PipelineDetails>
          <PipelineDeploymentList />
        </PipelineDetails>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        sidebarProps={ProjectDetailsSideNavProps}
        path={routes.toPipelineDeploymentList({
          ...accountPathProps,
          ...pipelinePathProps
        })}
        pageName={pipelineDeploymentListPageName}
      >
        <PipelineDetails>
          <PipelineDeploymentList />
        </PipelineDetails>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        path={routes.toPipelineDetail({ ...accountPathProps, ...pipelinePathProps, ...moduleParams })}
      >
        <RedirectToPipelineDetailHome />
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        layout={MinimalLayout}
        path={routes.toIACMPipelineResources({
          ...accountPathProps,
          ...executionPathProps,
          ...moduleParams
        })}
        pageName={PAGE_NAME.ExecutionIACMPipelineResources}
      >
        <ExecutionLandingPage>
          <ExecutionIACMResourcesView />
        </ExecutionLandingPage>
      </RouteWithLayout>
      <RouteWithLayout
        exact
        licenseRedirectData={licenseRedirectData}
        sidebarProps={sidebarProps}
        layout={MinimalLayout}
        path={routes.toIACMPipelineCostEstimation({
          ...accountPathProps,
          ...executionPathProps,
          ...moduleParams
        })}
        pageName={PAGE_NAME.IACMCostEstimation}
      >
        <ExecutionLandingPage>
          <ExecutionIACMCostsEstimationView />
        </ExecutionLandingPage>
      </RouteWithLayout>
    </>
  )
}
