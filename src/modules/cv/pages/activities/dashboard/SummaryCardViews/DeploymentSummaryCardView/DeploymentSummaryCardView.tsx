import React from 'react'
import { Color, Container, Icon, Text } from '@wings-software/uikit'
import {
  DeploymentProgressAndNodes,
  DeploymentProgressAndNodesProps
} from 'modules/cv/components/DeploymentProgressAndNodes/DeploymentProgressAndNodes'
import { InstancePhase } from 'modules/cv/pages/dashboard/deployment-drilldown/DeploymentDrilldownSideNav'
import type { Activity } from '../../ActivityTimeline/ActivityTrack/ActivityTrackUtils'
import css from './DeploymentSummaryCardView.module.scss'

export interface DeploymentSummaryCardViewProps {
  selectedActivity: Activity
}

const DeploymentMockData: DeploymentProgressAndNodesProps = {
  deploymentSummary: {
    additionalInfo: {
      canary: [
        {
          hostName: 'harness-test-appd-deployment-68977b7dbf-shkq6',
          riskScore: 'LOW_RISK',
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'harness-test-appd-deployment-68977b7dbf-27znb',
          riskScore: 'LOW_RISK',
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        }
      ],
      primary: [
        {
          hostName: 'manager-b6b7c4d9b-s228g',
          riskScore: 'NO_DATA',
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'manager-b6b7c4d9b-p2qlw',
          riskScore: 'HIGH_RISK',
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'manager-58d9c944df-ghqpv',
          riskScore: null,
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'manager-58d9c944df-9sv75',
          riskScore: null,
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'manager-58d9c944df-czh8b',
          riskScore: 'NO_DATA',
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'manager-58d9c944df-pg5wb',
          riskScore: null,
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'manager-58d9c944df-6bkpw',
          riskScore: null,
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'manager-b6b7c4d9b-7cp2g',
          riskScore: 'HIGH_RISK',
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'manager-b6b7c4d9b-s6zzs',
          riskScore: 'HIGH_RISK',
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'harness-test-appd-deployment-68977b7dbf-shkq6',
          riskScore: null,
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'manager-b6b7c4d9b-c8gzk',
          riskScore: 'HIGH_RISK',
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        },
        {
          hostName: 'harness-test-appd-deployment-68977b7dbf-27znb',
          riskScore: null,
          anomalousMetricsCount: 0,
          anomalousLogClustersCount: 0
        }
      ],
      trafficSplitPercentage: null,
      type: 'CANARY'
    } as any,
    durationMs: 600000,
    environmentName: 'prod',
    jobName: 'canary',
    progressPercentage: 58,
    startTime: 1602599760000,
    status: 'ERROR',
    verificationJobInstanceId: 'kuFEp5yRRDaGgK0i5fiGdg'
  },
  instancePhase: InstancePhase.PRODUCTION
}

export function DeploymentSummaryCardView(props: DeploymentSummaryCardViewProps): JSX.Element {
  const { selectedActivity } = props
  return (
    <Container className={css.main}>
      <Container className={css.header}>
        <Icon name="nav-cd" size={28} className={css.activityTypeIcon} />
        <Text color={Color.BLACK} font={{ size: 'medium' }} className={css.activityName}>
          {selectedActivity.activityName}
        </Text>
      </Container>
      <DeploymentProgressAndNodes className={css.progressCard} {...DeploymentMockData} />
    </Container>
  )
}
