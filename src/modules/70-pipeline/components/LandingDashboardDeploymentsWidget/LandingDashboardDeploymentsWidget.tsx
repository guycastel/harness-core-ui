/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo, useState, useEffect } from 'react'
import cx from 'classnames'
import {
  Card,
  Container,
  Icon,
  Layout,
  Select,
  SelectOption,
  Text,
  StackedSummaryInterface,
  StackedSummaryTable,
  handleZeroOrInfinityTrend,
  renderTrend,
  IconName,
  Popover
} from '@harness/uicore'
import { useParams } from 'react-router-dom'
import { FontVariation, Color } from '@harness/design-system'
import { defaultTo, isEqual } from 'lodash-es'
import moment from 'moment'
import type { TooltipFormatterContextObject } from 'highcharts'
import type { GetDataError } from 'restful-react'
import qs from 'qs'
import { HTMLTable } from '@blueprintjs/core'
import type { Error, Failure } from 'services/template-ng'
import {
  useLandingDashboardContext,
  TimeRangeToDays,
  DashboardTimeRange
} from '@common/factories/LandingDashboardContext'
import { String, StringKeys, useStrings } from 'framework/strings'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import {
  ChartType,
  OverviewChartsWithToggle
} from '@common/components/OverviewChartsWithToggle/OverviewChartsWithToggle'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import {
  DeploymentsOverview,
  useGetDeploymentStatsOverview,
  TimeBasedStats,
  GetDeploymentStatsOverviewQueryParams,
  DeploymentsStatsOverview,
  ActiveServiceInfo,
  PipelineExecutionInfo
} from 'services/dashboard-service'
import { useErrorHandler } from '@pipeline/components/Dashboards/shared'
import DashboardAPIErrorWidget from '@projects-orgs/components/DashboardAPIErrorWidget/DashboardAPIErrorWidget'
import DashboardNoDataWidget from '@projects-orgs/components/DashboardNoDataWidget/DashboardNoDataWidget'
import { getWindowLocationUrl } from 'framework/utils/WindowLocation'

import { renderTooltipContent } from '@pipeline/utils/DashboardUtils'
import { NAV_MODE } from '@modules/10-common/utils/routeUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import css from './LandingDashboardDeploymentsWidget.module.scss'

export enum TimeRangeGroupByMapping {
  '30Days' = 'DAY',
  '60Days' = 'WEEK',
  '90Days' = 'WEEK',
  '1Year' = 'MONTH'
}

const sortByOptions: SelectOption[] = [
  { label: 'By Deployments', value: 'DEPLOYMENTS' },
  { label: 'By Instances', value: 'INSTANCES' }
]

const getTooltip = (currPoint: TooltipFormatterContextObject): string => {
  const custom = currPoint?.series?.userOptions?.custom
  const point: TimeBasedStats = custom?.[currPoint.key]
  const time = point && point?.time ? moment(new Date(point?.time).getTime()).utc().format('MMM D') : currPoint.x
  let failureRate: string | number = 'N/A'
  if (point?.countWithSuccessFailureDetails?.failureCount && point.countWithSuccessFailureDetails?.count) {
    failureRate =
      ((point.countWithSuccessFailureDetails.failureCount / point.countWithSuccessFailureDetails.count) * 100).toFixed(
        1
      ) + '%'
  }
  if (point?.countWithSuccessFailureDetails?.failureCount === 0) {
    failureRate = '0'
  }
  return renderTooltipContent({
    time,
    failureRate,
    count: defaultTo(point?.countWithSuccessFailureDetails?.count, 0),
    successCount: defaultTo(point?.countWithSuccessFailureDetails?.successCount, 0),
    failureCount: defaultTo(point?.countWithSuccessFailureDetails?.failureCount, 0)
  })
}

interface SummaryCardData {
  title: string
  count: string
  trend: string
}

function EmptyCard({ children }: { children: React.ReactElement }): JSX.Element {
  return (
    <Layout.Horizontal className={css.loaderContainer}>
      <Card className={css.loaderCard}>{children}</Card>
    </Layout.Horizontal>
  )
}

const FailedStatus = ['Failed', 'Aborted', 'Expired', 'Errored', 'ApprovalRejected']

const makeKey = (item: PipelineExecutionInfo) => {
  const accountInfo = item.accountInfo?.accountIdentifier
  const orgInfo = item.orgInfo?.orgIdentifier
  const projectInfo = item.projectInfo?.projectIdentifier
  return `${accountInfo}-${orgInfo}-${projectInfo}`
}

function DeployOverviewPopover({
  overview,
  status,
  startTime,
  endTime
}: {
  overview: PipelineExecutionInfo[]
  status: string[]
  startTime: number
  endTime: number
}): JSX.Element {
  const { getString } = useStrings()

  const projectOrgCount = new Map()
  const projectOrgMap = new Map()

  overview.forEach(item => projectOrgCount.set(makeKey(item), (projectOrgCount.get(makeKey(item)) || 0) + 1))
  overview.forEach(item => projectOrgMap.set(makeKey(item), item))

  function toDeployment(item: PipelineExecutionInfo): void {
    const projectIdentifier = defaultTo(item.projectInfo?.projectIdentifier, '')
    const orgIdentifier = defaultTo(item.orgInfo?.orgIdentifier, '')
    const accountId = defaultTo(item.accountInfo?.accountIdentifier, '')
    const route = routes.toDeployments({ projectIdentifier, orgIdentifier, accountId, module: 'cd' })
    const filterQuery = isEqual(status, FailedStatus)
      ? {
          status,
          timeRange: {
            startTime: Date.now() - 24 * 60 * 60000,
            endTime: Date.now()
          }
        }
      : {
          status,
          timeRange: {
            startTime,
            endTime
          }
        }
    const search = qs.stringify({ filters: { ...filterQuery } })
    const baseUrl = getWindowLocationUrl()
    window.open(`${baseUrl}${route + '?' + search}`)
  }

  const keyList = Array.from(projectOrgCount.keys())
  return (
    <HTMLTable small className={css.popoverTable}>
      <thead>
        <tr>
          <th>{getString('projectsText').toLocaleUpperCase()}</th>
          <th>{getString('deploymentsText').toLocaleUpperCase()}</th>
        </tr>
      </thead>
      <tbody>
        {keyList.map(i => (
          <tr key={i}>
            <td>
              <Layout.Vertical>
                <Text color={Color.GREY_1000} lineClamp={1} style={{ maxWidth: 200 }}>
                  {(projectOrgMap.get(i) as PipelineExecutionInfo).projectInfo?.projectName}
                </Text>
                {(projectOrgMap.get(i) as PipelineExecutionInfo).orgInfo?.orgIdentifier !== 'default' && (
                  <div className={css.orgStyle}>
                    <Icon name="nav-organization" size={12} />
                    <Text color={Color.GREY_450} font={{ size: 'xsmall' }}>
                      {` Orgs: ${(projectOrgMap.get(i) as PipelineExecutionInfo).orgInfo?.orgName}`}
                    </Text>
                  </div>
                )}
              </Layout.Vertical>
            </td>
            <td>
              <Text
                onClick={() => toDeployment(projectOrgMap.get(i))}
                color={Color.PRIMARY_7}
                className={css.executionCount}
              >
                {projectOrgCount.get(i)}
              </Text>
            </td>
          </tr>
        ))}
      </tbody>
    </HTMLTable>
  )
}

const showBadgesCard = (deploymentsOverview: DeploymentsOverview): boolean => {
  const deploymentsOverviewKeys = Object.keys(deploymentsOverview)
  if (Object.keys(deploymentsOverviewKeys).length === 0) {
    return false
  }
  const nonZeroDeploymentsOverviewKeys = deploymentsOverviewKeys.filter(
    key => (deploymentsOverview as any)[key].length > 0
  )
  return nonZeroDeploymentsOverviewKeys.length > 0
}

const getBadge = (
  type: string,
  deployStat: PipelineExecutionInfo[],
  startTime: number,
  endTime: number
): JSX.Element | null => {
  const stat = deployStat.length
  if (stat <= 0) {
    return null
  }
  switch (type) {
    case 'pendingManualInterventionExecutions':
      return (
        <Popover interactionKind="hover" popoverClassName={css.popoverStyle} autoFocus={false}>
          <div className={css.badge} key={type}>
            <Icon name="status-pending" size={16} color={Color.ORANGE_700} />
            <Text className={css.badgeText}>
              {`${stat} `}
              {stat > 1 ? (
                <String stringID={'pipeline.dashboardDeploymentsWidget.pendingManualIntervention.plural'} />
              ) : (
                <String stringID={'pipeline.dashboardDeploymentsWidget.pendingManualIntervention.singular'} />
              )}
            </Text>
          </div>
          <DeployOverviewPopover
            overview={deployStat}
            status={['InterventionWaiting']}
            startTime={startTime}
            endTime={endTime}
          />
        </Popover>
      )
    case 'pendingApprovalExecutions':
      return (
        <Popover interactionKind="hover" popoverClassName={css.popoverStyle} autoFocus={false}>
          <div className={css.badge} key={type}>
            <Icon name="status-pending" size={16} color={Color.ORANGE_700} />
            <Text className={css.badgeText}>
              {`${stat} `}
              {stat > 1 ? (
                <String stringID={'pipeline.dashboardDeploymentsWidget.pendingApproval.plural'} />
              ) : (
                <String stringID={'pipeline.dashboardDeploymentsWidget.pendingApproval.singular'} />
              )}
            </Text>
          </div>
          <DeployOverviewPopover
            overview={deployStat}
            status={['ApprovalWaiting']}
            startTime={startTime}
            endTime={endTime}
          />
        </Popover>
      )
    case 'failed24HrsExecutions':
      return (
        <Popover interactionKind="hover" popoverClassName={css.popoverStyle} autoFocus={false}>
          <div className={cx(css.badge, css.failed24HrsExecutionsBadge)} key={type}>
            <Icon name="warning-sign" size={12} color={Color.RED_600} />
            <Text className={css.badgeText}>
              {`${stat} `}
              {stat > 1 ? (
                <String stringID={'pipeline.dashboardDeploymentsWidget.failed24Hrs.plural'} />
              ) : (
                <String stringID={'pipeline.dashboardDeploymentsWidget.failed24Hrs.singular'} />
              )}
            </Text>
          </div>
          <DeployOverviewPopover overview={deployStat} status={FailedStatus} startTime={startTime} endTime={endTime} />
        </Popover>
      )
    case 'runningExecutions':
      return (
        <Popover interactionKind="hover" popoverClassName={css.popoverStyle} autoFocus={false}>
          <div className={cx(css.badge, css.runningExecutions)} key={type}>
            <Icon name="status-running" size={16} color={Color.PRIMARY_7} />
            <Text className={css.badgeText}>
              {`${stat} `}
              {stat > 1 ? (
                <String stringID={'pipeline.dashboardDeploymentsWidget.activePipeline.plural'} />
              ) : (
                <String stringID={'pipeline.dashboardDeploymentsWidget.activePipeline.singular'} />
              )}
            </Text>
          </div>
          <DeployOverviewPopover
            overview={deployStat}
            status={['Running', 'TaskWaiting', 'Paused', 'AsyncWaiting', 'TimedWaiting', 'Pausing']}
            startTime={startTime}
            endTime={endTime}
          />
        </Popover>
      )
    default:
      return null
  }
}

const getFormattedNumber = (givenNumber?: number | string): string => {
  if (givenNumber) {
    if (givenNumber === 'Infinity') {
      return givenNumber
    } else if ((givenNumber as number) > 1000) {
      return Math.round(Number(givenNumber) / 1000) + 'K'
    } else if ((givenNumber as number) > 1000000) {
      return Math.round(Number(givenNumber) / 1000000) + 'M'
    }
    return Math.round(Number(givenNumber)).toString()
  }
  return '0'
}

const summaryCardRenderer = (cardData: SummaryCardData, groupByValue: string): JSX.Element => {
  let color = cardData.trend.includes('-') ? Color.RED_500 : Color.GREEN_500
  // Failure should be in Red
  if (cardData.title === 'Failure Rate') {
    color = cardData.trend.includes('-') ? Color.GREEN_500 : Color.RED_500
  }
  return (
    <Container className={css.summaryCard} key={cardData.title}>
      <Text font={{ size: 'medium' }} color={Color.GREY_700} className={css.cardTitle}>
        {cardData.title}
      </Text>
      <Layout.Horizontal>
        <Layout.Horizontal className={css.frequencyContainer}>
          <Text color={Color.BLACK} font={{ size: 'large', weight: 'bold' }} className={css.frequencyCount}>
            {cardData.count}
          </Text>
          {cardData.title === 'Deployment Frequency' && (
            <Text color={Color.GREY_700} font={{ size: 'small', weight: 'semi-bold' }} className={css.groupByValue}>
              {`/ ${groupByValue.toLocaleLowerCase()}`}
            </Text>
          )}
        </Layout.Horizontal>
        <Container className={css.trendContainer} flex>
          {isNaN(parseInt(cardData.trend)) ? (
            handleZeroOrInfinityTrend(cardData.trend, color)
          ) : (
            <Container flex>{renderTrend(cardData.trend, color)}</Container>
          )}
        </Container>
      </Layout.Horizontal>
    </Container>
  )
}

const getSummaryCardRenderers = (summaryCardsData: SummaryCardData[], groupByValue: string): JSX.Element => {
  return (
    <Container className={css.summaryCardsContainer}>
      {summaryCardsData?.map(currData => summaryCardRenderer(currData, groupByValue))}
    </Container>
  )
}

interface LandingDashboardDeploymentsNoContentWidgetProps {
  loading: boolean
  response: DeploymentsStatsOverview | undefined
  error: GetDataError<Failure | Error> | null
  count: number | undefined
  accountId: string
  projectIdentifier: string
  orgIdentifier: string
  refetch: any
}
function LandingDashboardDeploymentsNoContentWidget(
  props: LandingDashboardDeploymentsNoContentWidgetProps
): JSX.Element {
  const { loading, response, error, count, accountId, refetch, projectIdentifier, orgIdentifier } = props
  const { isNewNavEnabled } = useAppStore()
  if (loading) {
    return (
      <EmptyCard>
        <Icon name="spinner" size={24} color={Color.PRIMARY_7} />
      </EmptyCard>
    )
  }

  if (!response || error) {
    return (
      <EmptyCard>
        <DashboardAPIErrorWidget className={css.apiErrorWidget} callback={refetch} iconProps={{ size: 90 }} />
      </EmptyCard>
    )
  }

  if (!count) {
    return (
      <EmptyCard>
        <DashboardNoDataWidget
          label={
            <Text color={Color.GREY_400} style={{ fontSize: '14px' }} margin="medium">
              {'No Deployments'}
            </Text>
          }
          getStartedLink={
            isNewNavEnabled
              ? routesV2.toMode({
                  projectIdentifier,
                  orgIdentifier,
                  accountId,
                  module: 'cd',
                  mode: 'module'
                })
              : routes.toCDHome({ accountId })
          }
        />
      </EmptyCard>
    )
  }
  return <></>
}

const renderServiceTooltipRow = (iconName: IconName, label: StringKeys, value?: string) => {
  if (!value) {
    return <></>
  }
  return (
    <Layout.Horizontal padding={{ top: 'small' }} flex={{ alignItems: 'center', justifyContent: 'flex-start' }}>
      <Icon name={iconName} size={13} color={Color.GREY_300} margin={{ right: 'xsmall' }} />
      <Layout.Horizontal className={css.serviceTooltipRowLabel}>
        <Text inline color={Color.GREY_300} font={{ variation: FontVariation.SMALL_SEMI }}>
          <String stringID={label} />
        </Text>
        <Text color={Color.GREY_300} margin={{ right: 'xsmall' }} font={{ variation: FontVariation.SMALL_SEMI }}>
          :
        </Text>
      </Layout.Horizontal>

      <Text color={Color.WHITE} font={{ variation: FontVariation.SMALL_SEMI }}>
        {value}
      </Text>
    </Layout.Horizontal>
  )
}

const renderTooltipForServiceLabel = (service: ActiveServiceInfo): JSX.Element => {
  return (
    <Layout.Vertical padding="medium" spacing="small">
      <Text color={Color.WHITE}>{service?.serviceInfo?.serviceName ?? ''}</Text>
      {renderServiceTooltipRow('nav-project', 'projectLabel', service?.projectInfo?.projectName)}
      {renderServiceTooltipRow('nav-organization', 'common.org', service?.orgInfo?.orgName)}
    </Layout.Vertical>
  )
}

function LandingDashboardDeploymentsWidget(): React.ReactElement {
  const { getString } = useStrings()
  const { selectedTimeRange } = useLandingDashboardContext()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const [range, setRange] = useState([0, 0])
  const [groupByValue, setGroupByValues] = useState(TimeRangeGroupByMapping[selectedTimeRange])
  const [sortByValue, setSortByValue] = useState<GetDeploymentStatsOverviewQueryParams['sortBy']>('DEPLOYMENTS')
  const [selectedView, setSelectedView] = useState<ChartType>(ChartType.BAR)
  const { isNewNavEnabled } = useAppStore()

  const getServiceDetailsLink = (service: ActiveServiceInfo): string => {
    const serviceId = service.serviceInfo?.serviceIdentifier || ''
    if (isNewNavEnabled) {
      return routesV2.toServiceStudio({
        accountId,
        orgIdentifier: service.orgInfo?.orgIdentifier || '',
        projectIdentifier: service.projectInfo?.projectIdentifier || '',
        serviceId,
        module: 'cd',
        mode: NAV_MODE.MODULE
      })
    }
    return routes.toServiceStudio({
      accountId,
      orgIdentifier: service.orgInfo?.orgIdentifier || '',
      projectIdentifier: service.projectInfo?.projectIdentifier || '',
      serviceId,
      module: 'cd'
    })
  }

  const { data, error, refetch, loading } = useGetDeploymentStatsOverview({
    queryParams: {
      accountIdentifier: accountId,
      startTime: range[0],
      endTime: range[1],
      groupBy: groupByValue,
      sortBy: sortByValue,
      projectIdentifier,
      orgIdentifier
    },
    lazy: true
  })

  const response = data?.data?.response

  useEffect(() => {
    setRange([Date.now() - TimeRangeToDays[selectedTimeRange] * 24 * 60 * 60000, Date.now()])
    setGroupByValues(TimeRangeGroupByMapping[selectedTimeRange])
  }, [selectedTimeRange])

  useEffect(() => {
    if (!range[0]) {
      return
    }
    refetch()
  }, [refetch, range, groupByValue, sortByValue])

  useErrorHandler(error as GetDataError<Failure | Error> | null)

  const deploymentStatsData = useMemo(() => {
    const successData: number[] = []
    const failureData: number[] = []
    const custom: TimeBasedStats[] = []
    if (response?.deploymentsStatsSummary?.deploymentStats?.length) {
      response.deploymentsStatsSummary.deploymentStats.forEach(val => {
        successData.push(defaultTo(val.countWithSuccessFailureDetails?.successCount, 0))
        failureData.push(defaultTo(val.countWithSuccessFailureDetails?.failureCount, 0))
        custom.push(val)
      })
    }
    const successCount = successData.reduce((sum, i) => sum + i, 0)
    const failureCount = failureData.reduce((sum, i) => sum + i, 0)
    const successArr = {
      name: `Success (${successCount})`,
      data: successData,
      color: 'var(--green-500)',
      custom
    }
    const failureArr = {
      name: `Failed (${failureCount})`,
      data: failureData,
      color: 'var(--red-500)',
      custom
    }
    return selectedView === ChartType.BAR ? [failureArr, successArr] : [successArr, failureArr]
  }, [response?.deploymentsStatsSummary?.deploymentStats, selectedView])

  const summaryCardsData: SummaryCardData[] = useMemo(() => {
    return [
      {
        title: getString('common.pipelineExecution'),
        count: getFormattedNumber(response?.deploymentsStatsSummary?.countAndChangeRate?.count),
        trend:
          getFormattedNumber(
            response?.deploymentsStatsSummary?.countAndChangeRate?.countChangeAndCountChangeRateInfo?.countChangeRate
          ) + '%'
      },
      {
        title: getString('common.failureRate'),
        count:
          getFormattedNumber(defaultTo(response?.deploymentsStatsSummary?.failureRateAndChangeRate?.rate, 0)) + '%',
        trend: getFormattedNumber(response?.deploymentsStatsSummary?.failureRateAndChangeRate?.rateChangeRate) + '%'
      },
      {
        title: getString('pipeline.executionFrequency'),
        count: getFormattedNumber(defaultTo(response?.deploymentsStatsSummary?.deploymentRateAndChangeRate?.rate, 0)),
        trend: getFormattedNumber(response?.deploymentsStatsSummary?.deploymentRateAndChangeRate?.rateChangeRate) + '%'
      }
    ]
  }, [response, getString])

  const mostActiveServicesData = useMemo(() => {
    const servicesData: StackedSummaryInterface[] | undefined = response?.mostActiveServicesList?.activeServices?.map(
      service => {
        return {
          label: defaultTo(defaultTo(service.serviceInfo?.serviceName, service.serviceInfo?.serviceIdentifier), ''),
          labelTooltip: renderTooltipForServiceLabel(service),
          labelLink: getServiceDetailsLink(service),
          tooltipProps: {
            isDark: true,
            fill: false,
            position: 'bottom'
          },
          barSectionsData:
            sortByValue === 'INSTANCES'
              ? [
                  {
                    count: defaultTo(service.countWithSuccessFailureDetails?.count, 0),
                    color: Color.GREEN_500
                  }
                ]
              : [
                  {
                    count: defaultTo(service.countWithSuccessFailureDetails?.successCount, 0),
                    color: Color.GREEN_500
                  },
                  {
                    count: defaultTo(service.countWithSuccessFailureDetails?.failureCount, 0),
                    color: Color.RED_500
                  }
                ],
          trend: `${
            Math.round(
              (service.countWithSuccessFailureDetails?.countChangeAndCountChangeRateInfo?.countChangeRate ?? 0) * 100
            ) / 100
          }%`
        }
      }
    )
    if (sortByValue === 'INSTANCES') {
      return servicesData?.sort((a, b) => {
        return b.barSectionsData[0].count - a.barSectionsData[0].count
      })
    }
    return servicesData?.sort((a, b) => {
      return (
        b.barSectionsData[0].count +
        b.barSectionsData[1].count -
        (a.barSectionsData[0].count + a.barSectionsData[1].count)
      )
    })
  }, [response])

  const deploymentsStatsSummaryCount = response?.deploymentsStatsSummary?.countAndChangeRate?.count
  if (loading || !response || error || !deploymentsStatsSummaryCount) {
    return (
      <LandingDashboardDeploymentsNoContentWidget
        loading={loading}
        response={response}
        error={error as GetDataError<Failure | Error> | null}
        count={deploymentsStatsSummaryCount}
        refetch={refetch}
        accountId={accountId}
        projectIdentifier={projectIdentifier}
        orgIdentifier={orgIdentifier}
      />
    )
  }

  const noDataRenderer = () => {
    const TIME_RANGE_TO_LABEL_STRING = {
      [DashboardTimeRange['30Days']]: getString('projectsOrgs.landingDashboard.last30Days'),
      [DashboardTimeRange['60Days']]: getString('projectsOrgs.landingDashboard.last60Days'),
      [DashboardTimeRange['90Days']]: getString('projectsOrgs.landingDashboard.last90Days'),
      [DashboardTimeRange['1Year']]: getString('projectsOrgs.landingDashboard.last1Year')
    }
    if (sortByValue === 'INSTANCES') {
      return (
        <div className={css.noDataContainer}>
          <Icon name="no-instances" size={55} className={css.noDataIcon} />
          No Service Instances in {TIME_RANGE_TO_LABEL_STRING[selectedTimeRange]}
        </div>
      )
    }
    return <div className={css.noDataContainer}>No Deployments in {TIME_RANGE_TO_LABEL_STRING[selectedTimeRange]}</div>
  }

  return (
    <div className={css.main}>
      {response?.deploymentsOverview && showBadgesCard(response?.deploymentsOverview) && (
        <Card className={css.badgesContainer}>
          {response?.deploymentsOverview &&
            Object.keys(response?.deploymentsOverview).map(key =>
              // eslint-disable-next-line
              getBadge(key, (response?.deploymentsOverview as any)[key], range[0], range[1])
            )}
        </Card>
      )}
      <div className={css.chartCardsContainer}>
        <Card style={{ width: '65%' }} className={css.deploymentsChartContainer}>
          <OverviewChartsWithToggle
            data={defaultTo(deploymentStatsData, [])}
            summaryCards={getSummaryCardRenderers(summaryCardsData, groupByValue)}
            updateSelectedView={setSelectedView}
            customChartOptions={{
              chart: {
                height: 225
              },
              tooltip: {
                stickOnContact: true,
                useHTML: true,
                formatter: function () {
                  return getTooltip(this)
                },
                backgroundColor: Color.BLACK,
                outside: true,
                borderColor: 'black'
              },
              xAxis: {
                title: {
                  text: getString('dateLabel')
                },
                labels: {
                  formatter: function (this) {
                    let time = new Date().getTime()
                    if (response?.deploymentsStatsSummary?.deploymentStats?.length) {
                      const val = response.deploymentsStatsSummary.deploymentStats[this.pos].time
                      time = val ? new Date(val).getTime() : time
                    }
                    return moment(time).utc().format('MMM D')
                  }
                }
              },
              yAxis: {
                title: {
                  text: getString('pipeline.dashboards.executionsLabel')
                }
              }
            }}
          />
        </Card>
        <Card className={css.mostActiveServicesContainer}>
          <Layout.Horizontal
            flex
            border={{ bottom: true }}
            height={54}
            className={css.mostActiveServicesHeaderContainer}
          >
            <Text font={{ variation: FontVariation.CARD_TITLE }} className={css.activeServicesTitle}>
              {getString('common.mostActiveServices')}
            </Text>
            <Select
              onChange={item => setSortByValue(item.value as GetDeploymentStatsOverviewQueryParams['sortBy'])}
              items={sortByOptions}
              className={css.servicesByDropdown}
              value={sortByOptions.find(option => option.value === sortByValue)}
            />
          </Layout.Horizontal>
          <div className={css.mostActiveServicesChartContainer}>
            <StackedSummaryTable
              // barLength={185}
              columnHeaders={['SERVICES', sortByValue]}
              summaryData={defaultTo(mostActiveServicesData, [])}
              noDataRenderer={noDataRenderer}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}

export default LandingDashboardDeploymentsWidget
