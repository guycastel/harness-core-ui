/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import cx from 'classnames'
import { Container, Text, Icon, Layout, Card } from '@harness/uicore'
import { FontVariation, Color } from '@harness/design-system'
import moment from 'moment'
import HighchartsReact from 'highcharts-react-official'
import Highcharts from 'highcharts'
import { defaultTo, isNumber, merge } from 'lodash-es'
import { Duration, UserLabel } from '@common/exports'
import { String, useStrings } from 'framework/strings'
import type { ChangeRate } from 'services/cd-ng'
import {
  ActiveStatus,
  diffStartAndEndTime,
  FailedStatus,
  mapToExecutionStatus,
  roundNumber
} from '@pipeline/components/Dashboards/shared'
import { ExecutionStatusEnum } from '@pipeline/utils/statusHelpers'
import { defaultChartOptions } from '@pipeline/components/Dashboards/BuildCards/RepositoryCard'
import { mapTriggerTypeToStringID } from '@pipeline/utils/triggerUtils'
import type { ExecutorInfoDTO } from 'services/pipeline-ng'
import { INVALID_CHANGE_RATE } from '@cd/components/Services/common'
import { TimePopoverWithLocal } from '@pipeline/components/ExecutionCard/TimePopoverWithLocal'
import { calcTrendCaret, calcTrendColor, RateTrend, TrendPopover } from '../dashboardUtils'

import styles from './CardWithChart.module.scss'

interface BuildCount {
  count?: number
}
interface BuildInfo {
  builds?: BuildCount
  time?: number
}

export interface ServiceCardWithChartProps {
  title: string
  message?: ExecutorInfoDTO['triggerType']
  username?: string
  startTime?: number
  endTime?: number
  count: number
  successRate: number
  successRateDiff: number | ChangeRate
  countLabel?: string
  seriesName?: string
  countList?: BuildInfo[]
  onClick?: () => void
  className?: string
  lastExecutionStatus?: string
  profileUrl?: string
}

function mapStatusToColor(status?: string): string {
  const mappedStatus = mapToExecutionStatus(status)
  if (mappedStatus === ExecutionStatusEnum.Success) {
    return 'var(--green-500)'
  } else if (Object.prototype.hasOwnProperty.call(FailedStatus, mappedStatus!)) {
    return 'var(--red-500)'
  } else if (Object.prototype.hasOwnProperty.call(ActiveStatus, mappedStatus!)) {
    return 'var(--orange-400)'
  }
  return 'var(--grey-0)'
}

export default function ServiceCardWithChart({
  title,
  message,
  username,
  startTime,
  endTime,
  count,
  successRate,
  successRateDiff: successRateDelta,
  countLabel = 'builds',
  seriesName = 'Builds',
  countList,
  onClick,
  className,
  lastExecutionStatus,
  profileUrl
}: ServiceCardWithChartProps): JSX.Element {
  const { getString } = useStrings()
  const [chartOptions, setChartOptions] = useState(defaultChartOptions)
  const duration = diffStartAndEndTime(startTime, endTime)
  const mapTime = (value: BuildInfo) => (value?.time ? moment(value.time).format('YYYY-MM-DD') : '')
  const successRateDiff: number | undefined = (successRateDelta as ChangeRate)?.percentChange

  const successRateTrend = (successRateDelta as ChangeRate)?.trend as RateTrend

  useEffect(() => {
    if (countList?.length) {
      setChartOptions(
        merge({}, defaultChartOptions, {
          tooltip: {
            enabled: true
          },
          xAxis: {
            categories: countList.map(mapTime)
          },
          series: [
            {
              name: seriesName,
              type: 'line',
              color: 'var(--ci-color-blue-500)',
              data: countList.map(val => val?.builds?.count)
            }
          ]
        })
      )
    }
  }, [countList])

  const rateColor = calcTrendColor(successRateTrend)
  return (
    <Card
      className={cx(styles.cardStyle, styles.lastExecutionStatus, className)}
      onClick={onClick}
      style={{ borderLeftColor: mapStatusToColor(lastExecutionStatus) }}
    >
      <div className={styles.content}>
        <Text className={styles.title} lineClamp={1}>
          {title}
        </Text>
        <Container className={styles.mainContent}>
          <Container>
            <Container className={styles.cardStats}>
              <Text className={styles.statHeader}>{countLabel}</Text>
              <Text className={styles.statHeader}>{getString('pipeline.dashboards.successRate')}</Text>
              <Text className={styles.statContent}>{count}</Text>
              <Layout.Horizontal flex={{ alignItems: 'flex-end' }}>
                <Text className={cx(styles.statContent, styles.statWrap)}>{roundNumber(successRate)}%</Text>
                <TrendPopover trend={successRateTrend}>
                  <Layout.Horizontal className={styles.statWrap}>
                    <Icon
                      size={14}
                      name={calcTrendCaret(successRateTrend)}
                      style={{
                        color: rateColor
                      }}
                    />
                    <Text
                      className={styles.rateDiffValue}
                      style={{
                        color: rateColor
                      }}
                    >
                      {isNumber(successRateDiff) && successRateDiff !== INVALID_CHANGE_RATE
                        ? `${Math.abs(defaultTo(roundNumber(successRateDiff), 0))}%`
                        : null}
                    </Text>
                  </Layout.Horizontal>
                </TrendPopover>
              </Layout.Horizontal>
            </Container>
          </Container>
          <Container className={styles.chartWrapper} height={40} margin={{ left: 'medium' }}>
            <HighchartsReact highcharts={Highcharts} options={chartOptions} />
          </Container>
        </Container>
      </div>
      <Layout.Horizontal className={styles.cardFooter} spacing="small">
        <Layout.Horizontal className={styles.avatarWrapper} spacing="small">
          {username && (
            <UserLabel
              name={username}
              profilePictureUrl={profileUrl}
              textProps={{
                lineClamp: 1,
                font: { variation: FontVariation.TINY },
                alwaysShowTooltip: false
              }}
              iconProps={{ color: Color.GREY_900 }}
              className={styles.userLabel}
            />
          )}
          {message && (
            <Text font={{ variation: FontVariation.TINY }}>
              <String className={styles.message} stringID={mapTriggerTypeToStringID(message)} />
            </Text>
          )}
        </Layout.Horizontal>
        <Layout.Horizontal flex={{ justifyContent: 'end' }} className={styles.times} spacing="xsmall">
          {startTime ? (
            <TimePopoverWithLocal
              iconProps={{
                size: 10,
                color: Color.GREY_900
              }}
              icon="calendar"
              time={defaultTo(startTime, 0)}
              inline={false}
              className={styles.timeAgo}
              font={{ variation: FontVariation.TINY }}
            />
          ) : null}
          {duration ? (
            <Duration
              icon="time"
              className={styles.duration}
              iconProps={{
                size: 10,
                color: Color.GREY_900
              }}
              startTime={startTime}
              endTime={endTime}
              durationText={' '}
              font={{ variation: FontVariation.TINY }}
            />
          ) : null}
        </Layout.Horizontal>
      </Layout.Horizontal>
    </Card>
  )
}
