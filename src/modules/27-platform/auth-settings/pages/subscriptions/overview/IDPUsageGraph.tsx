/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { Layout, Card, PageSpinner, Select, SelectOption } from '@harness/uicore'
import classNames from 'classnames'
import { defaultTo } from 'lodash-es'
import { useStrings } from 'framework/strings'
import { StackedColumnChart } from '@common/components/StackedColumnChart/StackedColumnChart'
import { useMutateAsGet } from '@common/hooks'
import type { IDPModuleLicenseDTO } from 'services/cd-ng'
import { ActiveDevelopersTrendCountDTO, useListIDPActiveDevelopersHistory } from 'services/idp'
import { SummaryCardData, getSummaryCardRenderers, getYAxis, getPlotOptions, getSeries } from './ServiceLicenseGraphs'
import pageCss from '../SubscriptionsPage.module.scss'

interface IDPUsageGraphProps {
  accountId: string
  licenseType: 'SERVICES' | 'SERVICE_INSTANCES' | 'DEVELOPERS' | undefined
  licenseData?: IDPModuleLicenseDTO
}

const monthNameToNumber: Record<string, string> = {
  January: '01',
  February: '02',
  March: '03',
  April: '04',
  May: '05',
  June: '06',
  July: '07',
  August: '08',
  September: '09',
  October: '10',
  November: '11',
  December: '12'
}

function IDPUsageGraph(props: IDPUsageGraphProps): React.ReactElement {
  const { getString } = useStrings()

  const licenseDataInfo = props.licenseData
  const [reportType, setReportType] = useState<string>('DAILY')
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<SelectOption>(getLastSixMonths()[0])

  function getToDate(): string {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    const todayDate = currentDate.getDate() - 1
    const todayDateString = todayDate < 10 ? `0${todayDate}` : todayDate.toString()

    let formatMonth = false
    if (currentMonth !== 10 && currentMonth !== 11 && currentMonth !== 12) {
      formatMonth = true
    }
    return formatMonth
      ? `${currentYear}-0${currentMonth}-${todayDateString}`
      : `${currentYear}-${currentMonth}-${todayDateString}`
  }

  function getFromDate(): string {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    let formatMonth = false
    if (currentMonth !== 10 && currentMonth !== 11 && currentMonth !== 12) {
      formatMonth = true
    }
    return formatMonth ? `${currentYear}-0${currentMonth}-01` : `${currentYear}-${currentMonth}-01`
  }

  const [toDate, setToDate] = useState<string>(getToDate())
  const [fromDate, setFromDate] = useState<string>(getFromDate())

  const { data, loading } = useMutateAsGet(useListIDPActiveDevelopersHistory, {
    queryParams: {
      accountIdentifier: props.accountId
    },
    body: {
      reportType,
      fromDate,
      toDate
    }
  })

  const activeDeveloperHistoryData = data?.data

  const subscriptions = licenseDataInfo?.numberOfDevelopers || 0
  const valuesArray = defaultTo(
    activeDeveloperHistoryData?.map(item => item.count),
    []
  )
  const maxValue = valuesArray.length > 0 ? Math.max(...(valuesArray as number[])) : 0
  const formattedSubscriptions = subscriptions.toLocaleString('en-US')

  const summaryCardsData: SummaryCardData[] = [
    {
      title: getString(reportType === 'MONTHLY' ? 'common.yearlyPeak' : 'common.monthlyPeak'),
      count: maxValue,
      className: pageCss.peakClass
    },
    {
      title: getString('common.plans.subscription'),
      count: subscriptions === -1 ? getString('common.unlimited') : formattedSubscriptions,
      className: classNames({ [pageCss.subClass]: subscriptions !== -1 })
    },
    {
      title: getString('common.OverUse'),
      count: subscriptions === -1 ? 0 : subscriptions - maxValue < 0 ? Math.abs(subscriptions - maxValue) : 0,
      className: pageCss.overUseClass
    }
  ]

  function sortedValue(): number[] {
    const sortedData = (activeDeveloperHistoryData as ActiveDevelopersTrendCountDTO[])?.sort((a, b) => {
      const formattedValueA = new Date(a.date as string).getTime()
      const formattedValueB = new Date(b.date as string).getTime()
      return formattedValueA - formattedValueB
    })
    return sortedData?.map(el => defaultTo(el.count, 0))
  }

  /* istanbul ignore next */
  const customChartOptions: Highcharts.Options = {
    chart: {
      type: 'column'
    },
    tooltip: {
      formatter: function () {
        const thisPoint = this.point,
          allSeries = this.series.chart.series,
          thisIndex = thisPoint.index
        let returnString = ''

        allSeries.forEach(function (ser) {
          if (ser.options.stack === thisPoint.series.options.stack) {
            returnString += ser.points[thisIndex].y
          }
        })

        return returnString
      }
    },
    xAxis: {
      labels: {
        formatter: function (this) {
          const dataKeys = activeDeveloperHistoryData?.map(item => defaultTo(item.date, ''))
          // sorting data according to date
          const dataKeysSorted = dataKeys?.sort((a, b) => (a > b ? 1 : -1))
          return dataKeysSorted?.[this.pos] as string
        }
      }
    },
    yAxis: getYAxis(maxValue, subscriptions, getString('common.subscriptions.usage.developers')),
    plotOptions: getPlotOptions(),
    series: getSeries(sortedValue(), subscriptions)
  }

  function getLastSixMonths(): SelectOption[] {
    const today = new Date()
    const lastSixMonths = []

    for (let i = 0; i < 6; i++) {
      let month = today.getMonth() - i
      let year = today.getFullYear()
      if (month < 0) {
        switch (month) {
          case -1:
            month = 11
            break
          case -2:
            month = 10
            break
          case -3:
            month = 9
            break
          case -4:
            month = 8
            break
          case -5:
            month = 7
            break
          case -6:
            month = 6
            break
        }
        year = year - 1
      }
      lastSixMonths.push(Object.keys(monthNameToNumber)[month] + ' ' + year)
    }
    lastSixMonths.push('Last 12 Months')
    return lastSixMonths.map(val => ({ label: val, value: val }))
  }

  function onFilterChange(selected: SelectOption): void {
    setSelectedTimePeriod(selected)

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    const previousYear = currentDate.getFullYear() - 1
    const isDoubleDigitMonth = [10, 11, 12].includes(currentMonth)

    if (selected.value === 'Last 12 Months') {
      setReportType('MONTHLY')
      setFromDate(isDoubleDigitMonth ? `${previousYear}-${currentMonth}-01` : `${previousYear}-0${currentMonth}-01`)
      setToDate(isDoubleDigitMonth ? `${currentYear}-${currentMonth}-01` : `${currentYear}-0${currentMonth}-01`)
    } else {
      setReportType('DAILY')

      const filterPosition = getLastSixMonths().findIndex(item => item['value'] === selected.value)
      const selectedMonthYear = (selected.value as string).split(' ')
      const yearPassed = selectedMonthYear[1]
      const monthPassed = monthNameToNumber[selectedMonthYear[0]]
      const todayDate = currentDate.getDate() - 1
      const todayDateString = todayDate < 10 ? `0${todayDate}` : todayDate.toString()

      setFromDate(`${yearPassed}-${monthPassed}-01`)
      if (filterPosition === 0) {
        setToDate(`${yearPassed}-${monthPassed}-${todayDateString}`)
      } else {
        setToDate(`${yearPassed}-${monthPassed}-31`)
      }
    }
  }

  return (
    <Card className={pageCss.outterCard}>
      <Layout.Vertical spacing="xxlarge" flex={{ alignItems: 'stretch' }}>
        <Layout.Horizontal spacing="small" flex={{ justifyContent: 'center' }} width={'100%'}>
          <Layout.Vertical className={pageCss.badgesContainer}>
            <div>{getSummaryCardRenderers(summaryCardsData)}</div>
          </Layout.Vertical>

          <Layout.Horizontal spacing="small" flex={{ justifyContent: 'flex-end' }}>
            <Select items={getLastSixMonths()} value={selectedTimePeriod} onChange={onFilterChange} />
          </Layout.Horizontal>
        </Layout.Horizontal>
        {loading && <PageSpinner />}
        <StackedColumnChart options={customChartOptions} data={[]}></StackedColumnChart>
      </Layout.Vertical>
    </Card>
  )
}

export default IDPUsageGraph
