/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Tabs, Tab, NoDataCard, Layout, FlexExpander, Button, ButtonVariation, Text } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { useStrings } from 'framework/strings'
import { useDeepCompareEffect, useQueryParams } from '@common/hooks'
import type { ExecutionNode } from 'services/pipeline-ng'
import { useLogContentHook } from '@cv/hooks/useLogContentHook/useLogContentHook'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { LogTypes } from '@cv/hooks/useLogContentHook/useLogContentHook.types'
import {
  AnalysedDeploymentNode,
  useGetVerificationOverviewForVerifyStepExecutionId,
  useGetHealthSourcesForVerifyStepExecutionId
} from 'services/cv'
import { DeploymentMetrics } from './components/DeploymentMetrics/DeploymentMetrics'
import { ExecutionVerificationSummary } from './components/ExecutionVerificationSummary/ExecutionVerificationSummary'
import LogAnalysisContainer from './components/LogAnalysisContainer/LogAnalysisView.container'
import { getActivityId, getCanEnableTabByType, getDefaultTabId } from './ExecutionVerificationView.utils'
import { ManualInterventionVerifyStep } from './components/ManualInterventionVerifyStep/ManualInterventionVerifyStep'
import InterruptedHistory from './components/InterruptedHistory/InterruptedHistory'
import { LogsProviderType, LogsQueryParamName, MetricsProviderType } from './ExecutionVerificationView.constants'
import AbortVerificationBanner from './components/ExecutionVerificationSummary/components/AbortVerificationBanner/AbortVerificationBanner'
import css from './ExecutionVerificationView.module.scss'

interface ExecutionVerificationViewProps {
  step: ExecutionNode
}

export function ExecutionVerificationView(props: ExecutionVerificationViewProps): JSX.Element {
  const { step } = props
  const { getString } = useStrings()
  const [selectedNode, setSelectedNode] = useState<AnalysedDeploymentNode | undefined>()
  const activityId = useMemo(() => getActivityId(step), [step])
  const { type } = useQueryParams<{ type?: string }>()

  const { openLogContentHook } = useLogContentHook({ verifyStepExecutionId: activityId })

  const { accountId: accountIdentifier, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()

  const { data, error, refetch, loading } = useGetVerificationOverviewForVerifyStepExecutionId({
    accountIdentifier,
    orgIdentifier,
    projectIdentifier,
    verifyStepExecutionId: activityId,
    lazy: true
  })

  const {
    data: healthSourcesData,
    error: healthSourcesError,
    loading: healthSourcesLoading,
    refetch: fetchHealthSources
  } = useGetHealthSourcesForVerifyStepExecutionId({
    accountIdentifier,
    orgIdentifier,
    projectIdentifier,
    verifyStepExecutionId: activityId,
    lazy: type !== LogsQueryParamName
  })

  const canEnableMetricsTab = getCanEnableTabByType(healthSourcesData, MetricsProviderType)
  const canEnableLogsTab = getCanEnableTabByType(healthSourcesData, LogsProviderType)

  useDeepCompareEffect(() => {
    fetchHealthSources()
    const newTabId = getDefaultTabId({ getString, tabName: type, canEnableMetricsTab, canEnableLogsTab })

    setSelectedTab(newTabId)
  }, [step?.setupId])

  const [selectedTab, setSelectedTab] = useState(() =>
    getDefaultTabId({ getString, tabName: type, canEnableMetricsTab, canEnableLogsTab })
  )

  useEffect(() => {
    setSelectedTab(getDefaultTabId({ getString, tabName: type, canEnableMetricsTab, canEnableLogsTab }))
  }, [canEnableLogsTab, canEnableMetricsTab, type])

  const handleTabChange = useCallback(nextTabId => {
    setSelectedNode(undefined)
    setSelectedTab(nextTabId)
  }, [])

  const content = activityId ? (
    <>
      <AbortVerificationBanner verificationStatus={data?.verificationStatus} step={step} />
      <ManualInterventionVerifyStep step={step} verificationStatus={data?.verificationStatus} />
      <InterruptedHistory interruptedHistories={step?.interruptHistories} />
      <Tabs id="AnalysisTypeTabs" selectedTabId={selectedTab} onChange={handleTabChange}>
        <Tab
          id={getString('pipeline.verification.analysisTab.metrics')}
          title={getString('pipeline.verification.analysisTab.metrics')}
          panelClassName={css.mainTabPanel}
          disabled={!canEnableMetricsTab}
          panel={
            <Layout.Horizontal style={{ height: '100%' }}>
              <ExecutionVerificationSummary
                displayAnalysisCount={false}
                step={step}
                className={css.executionSummary}
                onSelectNode={setSelectedNode}
                refetchOverview={refetch}
                overviewError={error}
                overviewData={data}
                isConsoleView
              />
              <DeploymentMetrics
                step={step}
                selectedNode={selectedNode}
                activityId={activityId}
                overviewData={data}
                overviewLoading={loading}
                healthSourceDetails={{
                  healthSourcesData,
                  healthSourcesError,
                  healthSourcesLoading,
                  fetchHealthSources
                }}
              />
            </Layout.Horizontal>
          }
        />
        <Tab
          id={getString('pipeline.verification.analysisTab.logs')}
          title={getString('pipeline.verification.analysisTab.logs')}
          disabled={!canEnableLogsTab}
          panel={
            <Layout.Horizontal style={{ height: '100%' }}>
              <ExecutionVerificationSummary
                displayAnalysisCount={false}
                step={step}
                className={css.executionSummary}
                onSelectNode={setSelectedNode}
                isConsoleView
                refetchOverview={refetch}
                overviewError={error}
                overviewData={data}
              />
              <LogAnalysisContainer
                step={step}
                hostName={selectedNode?.nodeIdentifier}
                overviewLoading={loading}
                overviewData={data}
              />
            </Layout.Horizontal>
          }
          panelClassName={css.mainTabPanelLogs}
        />

        <FlexExpander />
        <Layout.Horizontal>
          <Button
            icon="api-docs"
            withoutCurrentColor
            iconProps={{ color: Color.BLACK, size: 20 }}
            text={getString('cv.externalAPICalls')}
            variation={ButtonVariation.LINK}
            onClick={() => openLogContentHook(LogTypes.ApiCallLog)}
          />
          <Button
            icon="audit-trail"
            withoutCurrentColor
            iconProps={{ size: 20 }}
            text={getString('cv.executionLogs')}
            variation={ButtonVariation.LINK}
            onClick={() => openLogContentHook(LogTypes.ExecutionLog)}
          />
        </Layout.Horizontal>
      </Tabs>
    </>
  ) : (
    <Container className={css.noAnalysis}>
      {step.failureInfo?.message && (
        <Text
          font={{ size: 'small', weight: 'bold' }}
          className={css.failureMessage}
          lineClamp={4}
          color={Color.RED_500}
        >
          {step.failureInfo.message}
        </Text>
      )}
      <NoDataCard message={getString('pipeline.verification.logs.noAnalysis')} icon="warning-sign" />
    </Container>
  )
  return <Container className={css.main}>{content}</Container>
}
