import React, { useState, useCallback, useMemo } from 'react'
import { Layout, Color, Text, Button, SelectOption, Select, Container } from '@wings-software/uicore'
import type { CellProps, Renderer } from 'react-table'
import { useParams, useHistory, Link } from 'react-router-dom'
import styled from '@emotion/styled'
import cx from 'classnames'
import { Page, useToaster } from '@common/exports'
import { PageSpinner, Table } from '@common/components'
import routes from '@common/RouteDefinitions'
import { useStrings } from 'framework/strings'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { NoDataCard } from '@common/components/Page/NoDataCard'
import { getErrorMessage } from '@cv/utils/CommonUtils'
import { DependencyGraph } from '@cv/components/DependencyGraph/DependencyGraph'
import { BGColorWrapper, HorizontalLayout } from '@cv/pages/health-source/common/StyledComponents'
import {
  useListMonitoredService,
  useDeleteMonitoredService,
  useGetMonitoredServiceListEnvironments,
  MonitoredServiceListItemDTO,
  ChangeSummaryDTO,
  useGetServiceDependencyGraph
} from 'services/cv'
import ContextMenuActions from '@cv/components/ContextMenuActions/ContextMenuActions'
import ServiceDependenciesLegend from '@cv/components/ServiceDependenciesLegend/ServiceDependenciesLegend'
import { getDependencyData } from '@cv/components/DependencyGraph/DependencyGraph.utils'
import { MonitoringServicesHeader } from './monitoredService.styled'
import {
  showPageSpinner,
  RenderHealthTrend,
  RenderHealthScore,
  RenderTags,
  getFilterAndEnvironmentValue,
  getEnvironmentOptions,
  calculateChangePercentage
} from './CVMonitoredServiceListingPage.utils'
import { Views } from './CVMonitoredServiceListingPage.constants'
import css from './CVMonitoredServiceListingPage.module.scss'

const ServiceCount = styled(Text)`
  padding-bottom: var(--spacing-xxlarge) !important;
  border-bottom: 1px solid var(--grey-200) !important;
`

const PageBody = styled(Page.Body)`
  margin: var(--spacing-xxxlarge) !important;
`

function CVMonitoredServiceListingPage(): JSX.Element {
  const { getString } = useStrings()
  const history = useHistory()
  const { showError, clear } = useToaster()
  const params = useParams<ProjectPathProps>()
  const [page, setPage] = useState(0)
  const [selectedView, setSelectedView] = useState<Views>(Views.LIST)
  const [environment, setEnvironment] = useState<SelectOption>()
  const { data: environmentDataList, loading: loadingServices } = useGetMonitoredServiceListEnvironments({
    queryParams: {
      accountId: params.accountId,
      projectIdentifier: params.projectIdentifier,
      orgIdentifier: params.orgIdentifier
    }
  })

  const { data, loading, refetch } = useListMonitoredService({
    queryParams: {
      offset: page,
      pageSize: 10,
      orgIdentifier: params.orgIdentifier,
      projectIdentifier: params.projectIdentifier,
      accountId: params.accountId,
      ...getFilterAndEnvironmentValue(environment?.value as string, '')
    },
    debounce: 400
  })

  const { data: serviceDependencyGraphData, loading: serviceDependencyGraphLoading } = useGetServiceDependencyGraph({
    queryParams: {
      accountId: params.accountId,
      projectIdentifier: params.projectIdentifier,
      orgIdentifier: params.orgIdentifier,
      ...getFilterAndEnvironmentValue(environment?.value as string, '')
    }
  })

  const { mutate: deleteMonitoredService, loading: isDeleting } = useDeleteMonitoredService({
    queryParams: {
      accountId: params.accountId,
      projectIdentifier: params.projectIdentifier,
      orgIdentifier: params.orgIdentifier
    }
  })

  const { content = [], pageSize = 0, pageIndex = 0, totalPages = 0, totalItems = 0 } = data?.data ?? ({} as any)

  const onDelete = async (identifier?: string): Promise<void> => {
    try {
      if (identifier) {
        const delPromise = deleteMonitoredService(identifier)
        const refetchPromise = refetch()
        await Promise.all([delPromise, refetchPromise])
      }
      if (pageIndex > 0 && data?.data?.pageItemCount === 1) {
        setPage(page - 1)
      }
    } catch (e) {
      if (e?.data) {
        clear()
        showError(getErrorMessage(e))
      }
    }
  }

  const MonitoredServiceActions: Renderer<CellProps<MonitoredServiceListItemDTO>> = ({ row }) => {
    const rowdata = row?.original
    return (
      <Layout.Horizontal>
        <ContextMenuActions
          titleText={getString('cv.monitoredServices.deleteMonitoredService')}
          contentText={getString('cv.monitoredServices.deleteMonitoredServiceWarning') + `: ${rowdata.identifier}`}
          onDelete={async () => await onDelete(rowdata.identifier)}
          onEdit={() => {
            history.push({
              pathname: routes.toCVMonitoredServiceConfigurations({
                accountId: params.accountId,
                projectIdentifier: params.projectIdentifier,
                orgIdentifier: params.orgIdentifier,
                identifier: rowdata.identifier,
                module: 'cv'
              })
            })
          }}
          onToggleMonitoredServiceData={{
            refetch,
            identifier: rowdata?.identifier as string,
            enabled: !!rowdata?.healthMonitoringEnabled
          }}
        />
      </Layout.Horizontal>
    )
  }

  const RenderServiceName: Renderer<CellProps<MonitoredServiceListItemDTO>> = ({ row }) => {
    const rowData = row?.original
    return (
      <Layout.Vertical>
        <Link
          to={routes.toCVAddMonitoringServicesEdit({
            accountId: params.accountId,
            projectIdentifier: params.projectIdentifier,
            orgIdentifier: params.orgIdentifier,
            identifier: rowData.identifier,
            module: 'cv'
          })}
        >
          <Text color={Color.PRIMARY_7} font={{ align: 'left', size: 'normal' }}>
            {rowData.serviceName}
          </Text>
        </Link>
        <Link
          to={routes.toCVAddMonitoringServicesEdit({
            accountId: params.accountId,
            projectIdentifier: params.projectIdentifier,
            orgIdentifier: params.orgIdentifier,
            identifier: rowData.identifier,
            module: 'cv'
          })}
        >
          <Text color={Color.PRIMARY_7} margin={{ bottom: 'small' }} font={{ align: 'left', size: 'xsmall' }}>
            {rowData.environmentName}
          </Text>
        </Link>
      </Layout.Vertical>
    )
  }

  const dependencyData = useMemo(() => getDependencyData(serviceDependencyGraphData), [serviceDependencyGraphData])

  const RenderServiceChanges: Renderer<CellProps<MonitoredServiceListItemDTO>> = useCallback(({ row }) => {
    const rowData = row?.original
    if (rowData?.changeSummary?.categoryCountMap) {
      const { categoryCountMap } = rowData?.changeSummary as ChangeSummaryDTO
      const {
        Infrastructure: { count: infraCount = 0 },
        Deployment: { count: deploymentCount = 0 },
        Alert: { count: alertCount = 0 }
      } = categoryCountMap as any
      const { color, percentage } = calculateChangePercentage(rowData?.changeSummary)

      return (
        <Layout.Horizontal spacing={'medium'}>
          <Text
            tooltip={getString('deploymentText')}
            inline
            icon={'nav-project'}
            font={{ weight: 'semi-bold' }}
            iconProps={{ size: 16 }}
          >
            {deploymentCount}
          </Text>
          <Text
            tooltip={getString('infrastructureText')}
            inline
            icon="infrastructure"
            font={{ weight: 'semi-bold' }}
            iconProps={{ size: 16 }}
          >
            {infraCount}
          </Text>
          <Text
            tooltip={getString('cv.changeSource.tooltip.incidents')}
            inline
            icon="warning-outline"
            font={{ weight: 'semi-bold' }}
            iconProps={{ size: 16 }}
          >
            {alertCount}
          </Text>
          <Text
            inline
            icon="symbol-triangle-up"
            color={color}
            font={{ size: 'xsmall' }}
            iconProps={{ size: 12, color: color }}
          >
            {percentage}
          </Text>
        </Layout.Horizontal>
      )
    }
    return <></>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderDependencyData = useCallback(() => {
    if (serviceDependencyGraphLoading) {
      return <PageSpinner />
    } else if (dependencyData) {
      return (
        <Container>
          <DependencyGraph dependencyData={dependencyData} options={{ chart: { height: 550 } }} />
          <Container margin={{ top: 'xxxlarge' }}>
            <ServiceDependenciesLegend />
          </Container>
        </Container>
      )
    } else {
      return <></>
    }
  }, [dependencyData, serviceDependencyGraphLoading])

  return (
    <BGColorWrapper>
      <MonitoringServicesHeader height={'80px'}>
        <HorizontalLayout alignItem={'flex-end'}>
          <div>
            <NGBreadcrumbs />
            <p>{getString('cv.monitoredServices.title')}</p>
          </div>
        </HorizontalLayout>
      </MonitoringServicesHeader>
      <MonitoringServicesHeader>
        <HorizontalLayout>
          <Button
            intent="primary"
            icon="plus"
            text={getString('cv.monitoredServices.newMonitoredServices')}
            margin={{ bottom: 'small' }}
            onClick={() => {
              history.push(
                routes.toCVAddMonitoringServicesSetup({
                  orgIdentifier: params.orgIdentifier,
                  projectIdentifier: params.projectIdentifier,
                  accountId: params.accountId
                })
              )
            }}
          />
          <HorizontalLayout alignItem={'baseline'}>
            <Text margin={{ right: 'large' }} font={{ size: 'small', weight: 'bold' }}>
              {getString('cv.monitoredServices.filterlabel')}
            </Text>
            <Select
              name={''}
              value={environment}
              inputProps={{
                leftIcon: 'search'
              }}
              defaultSelectedItem={{ label: getString('all'), value: getString('all') }}
              items={getEnvironmentOptions(environmentDataList, loadingServices, getString)}
              onChange={item => setEnvironment(item)}
            />
            <HorizontalLayout padding={{ left: 'medium' }}>
              <Button
                className={cx(
                  {
                    [css.listUnselected]: selectedView === Views.LIST
                  },
                  css.listButton
                )}
                minimal
                icon="graph"
                intent={selectedView === Views.GRAPH ? 'primary' : undefined}
                onClick={() => {
                  setSelectedView(Views.GRAPH)
                }}
                id="graph-select-button"
              />
              <Button
                className={cx(
                  {
                    [css.listUnselected]: selectedView === Views.GRAPH
                  },
                  css.listButton
                )}
                minimal
                icon="list"
                intent={selectedView === Views.LIST ? 'primary' : undefined}
                onClick={() => {
                  setSelectedView(Views.LIST)
                }}
                id="list-select-button"
              />
            </HorizontalLayout>
          </HorizontalLayout>
        </HorizontalLayout>
      </MonitoringServicesHeader>
      <PageBody>
        {selectedView === Views.GRAPH ? (
          renderDependencyData()
        ) : selectedView === Views.LIST ? (
          <>
            <ServiceCount font={{ size: 'medium' }}>
              {getString('cv.monitoredServices.serviceCount', { serviceCount: content.length })}
            </ServiceCount>

            {showPageSpinner(loading, isDeleting)}
            {content.length > 0 ? (
              <Table
                sortable={true}
                columns={[
                  {
                    Header: getString('cv.monitoredServices.table.serviceName'),
                    width: '20%',
                    Cell: RenderServiceName
                  },
                  {
                    Header: getString('cv.monitoredServices.table.changes'),
                    width: '20%',
                    Cell: RenderServiceChanges
                  },
                  {
                    Header: getString('cv.monitoredServices.table.lastestHealthTrend'),
                    width: '20%',
                    Cell: RenderHealthTrend
                  },
                  {
                    Header: getString('cv.monitoredServices.table.serviceHealthScore'),
                    width: '20%',
                    Cell: RenderHealthScore
                  },
                  {
                    Header: getString('tagLabel'),
                    width: '10%',
                    Cell: RenderTags
                  },
                  {
                    Header: getString('pipeline.triggers.triggerConfigurationPanel.actions'),
                    width: '10%',
                    Cell: MonitoredServiceActions
                  }
                ]}
                data={content}
                pagination={{
                  pageSize,
                  pageIndex,
                  pageCount: totalPages,
                  itemCount: totalItems,
                  gotoPage: setPage
                }}
              />
            ) : (
              <NoDataCard icon={'join-table'} message={getString('cv.monitoredServices.noData')} />
            )}
          </>
        ) : null}
      </PageBody>
    </BGColorWrapper>
  )
}

export default CVMonitoredServiceListingPage
