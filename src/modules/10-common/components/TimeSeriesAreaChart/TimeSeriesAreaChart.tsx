import React from 'react'
import { merge } from 'lodash-es'

import HighchartsReact from 'highcharts-react-official'
import Highcharts, { SeriesAreaOptions } from 'highcharts'

const getDefaultChartOptions = (seriesData: SeriesAreaOptions['data']) => {
  return {
    chart: {
      type: 'area',
      spacing: [25, 25, 25, 25]
    },
    title: false,
    xAxis: {
      type: 'datetime'
    },
    credits: false,
    legend: {
      maxHeight: 80,
      itemStyle: {
        color: 'var(--grey-500)',
        cursor: 'pointer',
        fontSize: 'var(--font-size-small)',
        fontWeight: 'normal',
        textOverflow: 'ellipsis'
      }
    },
    yAxis: {
      min: 0,
      gridLineWidth: 1,
      gridLineColor: 'var(--grey-200)',
      title: false,
      labels: {
        style: {
          fontSize: 'var(--font-size-small)',
          color: 'var(--grey-400)'
        }
      },
      stackLabels: {
        enabled: false,
        style: {
          fontWeight: 'bold'
        }
      }
    },
    tooltip: {
      pointFormat: '<b>{series.name}&nbsp;:&nbsp;{point.y}</b><br/>{Highcharts.dateFormat("%e %b, %H:%M", point.x)}'
    },
    plotOptions: {
      area: {
        stacking: 'normal',
        connectNulls: true,
        fillOpacity: 0.85,
        lineWidth: 1,
        point: {
          // events: {
          //   // TODO integrate this later if on-click behaviour is needed
          //   click: () => {}
          // }
        }
      }
    },
    series: seriesData
  }
}

export interface TimeSeriesAreaChartProps {
  customChartOptions?: Highcharts.Options
  seriesData?: SeriesAreaOptions['data']
}

export const TimeSeriesAreaChart: React.FC<TimeSeriesAreaChartProps> = ({
  customChartOptions = {},
  seriesData = []
}) => {
  const defaultChartOptions = React.useMemo(() => getDefaultChartOptions(seriesData), [seriesData])
  const finalChartOptions = React.useMemo(() => merge(defaultChartOptions, customChartOptions), [
    defaultChartOptions,
    customChartOptions
  ])
  return <HighchartsReact highcharts={Highcharts} options={finalChartOptions} />
}
