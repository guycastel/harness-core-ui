/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { HarnessDocTooltip, Icon, Tabs } from '@harness/uicore'
import { Switch } from '@blueprintjs/core'
import { NavLink, useParams, useLocation, matchPath } from 'react-router-dom'

import routesV1 from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { accountPathProps, executionPathProps, pipelineModuleParams } from '@common/utils/routeUtils'
import { useAnyEnterpriseLicense } from '@common/hooks/useModuleLicenses'
import type { ExecutionPathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import type { CIWebhookInfoDTO } from 'services/ci'
import type { ExecutionQueryParams } from '@pipeline/utils/executionUtils'
import { useExecutionContext } from '@pipeline/context/ExecutionContext'
import { useStrings } from 'framework/strings'
import { useFeatureFlag, useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { isFreePlan, useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { LICENSE_STATE_VALUES } from 'framework/LicenseStore/licenseStoreUtil'
import { ModuleName } from 'framework/types/ModuleName'
import { useIsPrivateAccess } from 'framework/hooks/usePublicAccess'
import { SavedExecutionViewTypes } from '@pipeline/components/LogsContent/LogsContent'
import { isSimplifiedYAMLEnabled } from '@common/utils/utils'
import type { ExecutionGraph } from 'services/pipeline-ng'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import css from './ExecutionTabs.module.scss'

const TAB_ID_MAP = {
  PIPELINE: 'pipeline_view',
  INPUTS: 'inputs_view',
  ARTIFACTS: 'artifacts_view',
  COMMITS: 'commits_view',
  TESTS: 'tests_view',
  POLICY_EVALUATIONS: 'policy_evaluations',
  STO_SECURITY: 'sto_security',
  ERROR_TRACKING: 'error_tracking',
  RESILIENCE: 'resilience',
  IACM: 'iacm',
  IACM_COST_ESTIMATION: 'iacm_cost_estimation'
}

interface ExecutionTabsProps {
  children?: React.ReactChild
  savedExecutionView: string | undefined
  setSavedExecutionView: (data: string) => void
}

function isChaosStepInPipeline(data: ExecutionGraph | undefined): boolean {
  return Object.values(data?.nodeMap ?? {}).some(entry => {
    if (entry.stepType === 'Chaos') return true
    return false
  })
}

export default function ExecutionTabs(props: ExecutionTabsProps): React.ReactElement {
  const { module } = useParams<PipelineType<ExecutionPathProps>>()
  const [selectedTabId, setSelectedTabId] = React.useState('')
  const { children, savedExecutionView, setSavedExecutionView } = props
  const { getString } = useStrings()
  const { pipelineExecutionDetail, isPipelineInvalid } = useExecutionContext()
  const { CI_YAML_VERSIONING } = useFeatureFlags()
  const { isNewNavEnabled } = useAppStore()
  const initialSelectedView = isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING)
    ? SavedExecutionViewTypes.LOG
    : savedExecutionView || SavedExecutionViewTypes.GRAPH
  const params = useParams<PipelineType<ExecutionPathProps>>()
  const location = useLocation()
  const { view } = useQueryParams<ExecutionQueryParams>()
  const { updateQueryParams } = useUpdateQueryParams<ExecutionQueryParams>()
  const { licenseInformation } = useLicenseStore()
  const isSecurityEnabled =
    licenseInformation['STO']?.status === LICENSE_STATE_VALUES.ACTIVE ||
    (licenseInformation['CI']?.status === LICENSE_STATE_VALUES.ACTIVE && isFreePlan(licenseInformation, ModuleName.CI))
  const isErrorTrackingEnabled = licenseInformation['CET']?.status === 'ACTIVE'
  const isIACMEnabled = useFeatureFlag(FeatureFlag.IACM_ENABLED)
  const isIACMCostEstimationEnabled = useFeatureFlag(FeatureFlag.IACM_COST_ESTIMATION)
  const isSSCAEnabled = useFeatureFlag(FeatureFlag.SSCA_ENABLED)
  const isCetCdIntegrationEnabled = useFeatureFlag(FeatureFlag.CET_CD_INTEGRATION)
  const canUsePolicyEngine = useAnyEnterpriseLicense()
  const isPrivateAccess = useIsPrivateAccess()

  const routes = isNewNavEnabled ? routesV2 : routesV1

  const routeParams = { ...accountPathProps, ...executionPathProps, ...pipelineModuleParams }
  const isLogView =
    view === SavedExecutionViewTypes.LOG || (!view && initialSelectedView === SavedExecutionViewTypes.LOG)
  const isCI = params.module === 'ci'
  const isCD = params.module === 'cd'
  const isFF = params.module === 'cf'
  const isCIInPipeline = pipelineExecutionDetail?.pipelineExecutionSummary?.moduleInfo?.ci
  const isSTOInPipeline = pipelineExecutionDetail?.pipelineExecutionSummary?.moduleInfo?.sto
  const isCDInPipeline = pipelineExecutionDetail?.pipelineExecutionSummary?.moduleInfo?.cd
  const isIACMInPipeline = pipelineExecutionDetail?.pipelineExecutionSummary?.moduleInfo?.iacm

  const ciData = pipelineExecutionDetail?.pipelineExecutionSummary?.moduleInfo?.ci
    ?.ciExecutionInfoDTO as CIWebhookInfoDTO
  // NOTE: hide commits tab if there are no commits
  // by default we are showing Commits tab > 'isEmpty(pipelineExecutionDetail)'
  const ciShowCommitsTab = !!ciData?.branch?.commits?.length || !!ciData?.pullRequest?.commits?.length

  function handleLogViewChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const { checked } = e.target as HTMLInputElement

    updateQueryParams({
      view: checked ? SavedExecutionViewTypes.LOG : SavedExecutionViewTypes.GRAPH,
      filterAnomalous: 'false'
    })
    setSavedExecutionView(checked ? SavedExecutionViewTypes.LOG : SavedExecutionViewTypes.GRAPH)
  }

  React.useEffect(() => {
    const isPipeLineView = !!matchPath(location.pathname, {
      path: [
        routes.toExecutionPipelineView(routeParams),
        routes.toExecutionPipelineView({ ...routeParams, module: undefined }) // in all modules mode - module will be undefined
      ]
    })
    if (isPipeLineView) {
      return setSelectedTabId(TAB_ID_MAP.PIPELINE)
    }
    const isInputsView = !!matchPath(location.pathname, {
      path: [
        routes.toExecutionInputsView(routeParams),
        routes.toExecutionInputsView({ ...routeParams, module: undefined })
      ]
    })
    if (isInputsView) {
      return setSelectedTabId(TAB_ID_MAP.INPUTS)
    }
    const isArtifactsView = !!matchPath(location.pathname, {
      path: [
        routes.toExecutionArtifactsView(routeParams),
        routes.toExecutionArtifactsView({ ...routeParams, module: undefined })
      ]
    })
    if (isArtifactsView) {
      return setSelectedTabId(TAB_ID_MAP.ARTIFACTS)
    }
    const isCommitsView = !!matchPath(location.pathname, {
      path: [
        routes.toExecutionCommitsView(routeParams),
        routes.toExecutionCommitsView({ ...routeParams, module: undefined })
      ]
    })
    if (isCommitsView) {
      return setSelectedTabId(TAB_ID_MAP.COMMITS)
    }
    const isTestsView = !!matchPath(location.pathname, {
      path: [
        routes.toExecutionTestsView(routeParams),
        routes.toExecutionTestsView({ ...routeParams, module: undefined })
      ]
    })
    if (isTestsView) {
      return setSelectedTabId(TAB_ID_MAP.TESTS)
    }
    const isPolicyEvaluationsView = !!matchPath(location.pathname, {
      path: [
        routes.toExecutionPolicyEvaluationsView(routeParams),
        routes.toExecutionPolicyEvaluationsView({ ...routeParams, module: undefined })
      ]
    })
    if (isPolicyEvaluationsView) {
      return setSelectedTabId(TAB_ID_MAP.POLICY_EVALUATIONS)
    }
    const isSecurityView = !!matchPath(location.pathname, {
      path: [
        routes.toExecutionSecurityView(routeParams),
        routes.toExecutionSecurityView({ ...routeParams, module: undefined })
      ]
    })
    if (isSecurityView) {
      return setSelectedTabId(TAB_ID_MAP.STO_SECURITY)
    }
    const isErrorTrackingView = !!matchPath(location.pathname, {
      path: [
        routes.toExecutionErrorTrackingView(routeParams),
        routes.toExecutionErrorTrackingView({ ...routeParams, module: undefined })
      ]
    })
    if (isErrorTrackingView) {
      return setSelectedTabId(TAB_ID_MAP.ERROR_TRACKING)
    }
    const isResilienceView = !!matchPath(location.pathname, {
      path: [routes.toResilienceView(routeParams), routes.toResilienceView({ ...routeParams, module: undefined })]
    })
    if (isResilienceView) {
      return setSelectedTabId(TAB_ID_MAP.RESILIENCE)
    }
    const isIACMView = !!matchPath(location.pathname, {
      path: [
        routes.toIACMPipelineResources(routeParams),
        routes.toIACMPipelineResources({ ...routeParams, module: undefined })
      ]
    })
    if (isIACMView) {
      return setSelectedTabId(TAB_ID_MAP.IACM)
    }
    const isIACMCostsView = !!matchPath(location.pathname, {
      path: [
        routes.toIACMPipelineCostEstimation(routeParams),
        routes.toIACMPipelineCostEstimation({ ...routeParams, module: undefined })
      ]
    })
    if (isIACMCostsView) {
      return setSelectedTabId(TAB_ID_MAP.IACM_COST_ESTIMATION)
    }
    // Defaults to Pipelines Tab
    return setSelectedTabId(TAB_ID_MAP.PIPELINE)
  }, [location.pathname])

  const tabList = [
    {
      id: TAB_ID_MAP.PIPELINE,
      title: (
        <NavLink
          to={routes.toExecutionPipelineView(params) + location.search}
          className={css.tabLink}
          activeClassName={css.activeLink}
        >
          <Icon name="alignment-vertical-center" size={16} />
          <span>{getString('common.pipeline')}</span>
        </NavLink>
      )
    }
  ]

  if (isPrivateAccess && !isPipelineInvalid) {
    tabList.push({
      id: TAB_ID_MAP.INPUTS,
      title: (
        <NavLink
          to={routes.toExecutionInputsView(params) + location.search}
          className={css.tabLink}
          activeClassName={css.activeLink}
        >
          <Icon name="manually-entered-data" size={16} />
          <span>{getString('inputs')}</span>
        </NavLink>
      )
    })
  }

  if (isPrivateAccess && canUsePolicyEngine) {
    tabList.push({
      id: TAB_ID_MAP.POLICY_EVALUATIONS,
      title: (
        <NavLink
          to={routes.toExecutionPolicyEvaluationsView(params) + location.search}
          className={css.tabLink}
          activeClassName={css.activeLink}
        >
          <Icon name="governance" size={16} />
          <span>{getString('pipeline.policyEvaluations.title')}</span>
        </NavLink>
      )
    })
  }

  if (isPrivateAccess && (isCI || isCIInPipeline || (isSSCAEnabled && (isCD || isCDInPipeline)))) {
    tabList.push({
      id: TAB_ID_MAP.ARTIFACTS,
      title: (
        <NavLink
          to={routes.toExecutionArtifactsView(params) + location.search}
          className={css.tabLink}
          activeClassName={css.activeLink}
        >
          <Icon name="add-to-artifact" size={16} />
          <span>{getString('artifacts')}</span>
        </NavLink>
      )
    })
    if (isPrivateAccess && ciShowCommitsTab) {
      tabList.push({
        id: TAB_ID_MAP.COMMITS,
        title: (
          <NavLink
            to={routes.toExecutionCommitsView(params) + location.search}
            className={css.tabLink}
            activeClassName={css.activeLink}
          >
            <Icon name="git-commit" size={16} />
            <span>{getString('commits')}</span>
          </NavLink>
        )
      })
    }
  }

  if (isPrivateAccess && (isCI || isCIInPipeline)) {
    tabList.push({
      id: TAB_ID_MAP.TESTS,
      title: (
        <NavLink
          to={routes.toExecutionTestsView(params) + location.search}
          className={css.tabLink}
          activeClassName={css.activeLink}
        >
          <Icon name="lab-test" size={16} />
          <span>{getString('tests')}</span>
        </NavLink>
      )
    })
  }

  if (isPrivateAccess && (isCIInPipeline || isSTOInPipeline) && isSecurityEnabled) {
    tabList.push({
      id: TAB_ID_MAP.STO_SECURITY,
      title: (
        <NavLink
          to={routes.toExecutionSecurityView(params) + location.search}
          className={css.tabLink}
          activeClassName={css.activeLink}
        >
          <Icon name="sto-grey" size={16} />
          <span>{getString('common.purpose.sto.continuous')}</span>
        </NavLink>
      )
    })
  }

  if (
    isPrivateAccess &&
    (isCI || isCIInPipeline || ((isCD || isCDInPipeline) && isCetCdIntegrationEnabled)) &&
    isErrorTrackingEnabled
  ) {
    tabList.push({
      id: TAB_ID_MAP.ERROR_TRACKING,
      title: (
        <NavLink
          to={routes.toExecutionErrorTrackingView(params) + '/executionViewEvents' + location.search}
          className={css.tabLink}
          activeClassName={css.activeLink}
        >
          <Icon name="cet-grey" size={16} />
          <span>{getString('common.purpose.errorTracking.title')}</span>
        </NavLink>
      )
    })
  }

  if (isPrivateAccess && (isCD || isFF || isChaosStepInPipeline(pipelineExecutionDetail?.executionGraph))) {
    tabList.push({
      id: TAB_ID_MAP.RESILIENCE,
      title: (
        <NavLink
          to={routes.toResilienceView(params) + location.search}
          className={css.tabLink}
          activeClassName={css.activeLink}
        >
          <Icon name="chaos-main" size={16} />
          <span>{getString('pipeline.resilienceTab.title')}</span>
        </NavLink>
      )
    })
  }

  if (isPrivateAccess && isIACMEnabled && isIACMInPipeline) {
    tabList.push({
      id: TAB_ID_MAP.IACM,
      title: (
        <NavLink
          to={routes.toIACMPipelineResources(params) + location.search}
          className={css.tabLink}
          activeClassName={css.activeLink}
        >
          <Icon name="iacm" size={16} />
          <span>{getString('resources')}</span>
        </NavLink>
      )
    })
    if (isIACMCostEstimationEnabled) {
      tabList.push({
        id: TAB_ID_MAP.IACM_COST_ESTIMATION,
        title: (
          <NavLink
            to={routes.toIACMPipelineCostEstimation(params) + location.search}
            className={css.tabLink}
            activeClassName={css.activeLink}
          >
            <Icon name="cost-change" size={16} />
            <span>{getString('pipeline.costChange')}</span>
          </NavLink>
        )
      })
    }
  }

  return (
    <div className={css.main}>
      <div>
        <Tabs id="execution-tabs" selectedTabId={selectedTabId} renderAllTabPanels={false} tabList={tabList} />
      </div>
      <div className={css.children}>{children}</div>
      {selectedTabId === TAB_ID_MAP.PIPELINE ? (
        <div className={css.viewToggle}>
          <span data-tooltip-id="consoleViewToggle">{getString('consoleView')}</span>
          <Switch checked={isLogView} name="console-view-toggle" onChange={handleLogViewChange} />
          <HarnessDocTooltip tooltipId="consoleViewToggle" useStandAlone={true} />
        </div>
      ) : null}
    </div>
  )
}
