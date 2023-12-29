/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import { Link, useHistory, useParams } from 'react-router-dom'
import type { CellProps, Renderer } from 'react-table'
import ReactTimeago from 'react-timeago'
import {
  Button,
  Layout,
  Popover,
  TagsPopover,
  Text,
  useConfirmationDialog,
  useToaster,
  Icon,
  getErrorInfoFromErrorObject,
  ModalDialog
} from '@harness/uicore'
import { Color, FontVariation, Intent } from '@harness/design-system'
import { Classes, Menu, Position } from '@blueprintjs/core'
import { defaultTo, pick } from 'lodash-es'
import type { TableProps } from '@harness/uicore'
import { useModalHook } from '@harness/use-modal'
import routes from '@common/RouteDefinitions'
import type {
  ExecutionPathProps,
  ModulePathParams,
  PipelinePathProps,
  PipelineType,
  ProjectPathProps
} from '@common/interfaces/RouteInterfaces'
import useRBACError, { RBACError } from '@rbac/utils/useRBACError/useRBACError'
import { DashboardList } from '@cd/components/DashboardList/DashboardList'
import type { DashboardListProps } from '@cd/components/DashboardList/DashboardList'
import type { ChangeValue } from '@cd/components/Services/DeploymentsWidget/DeploymentsWidget'
import { useStrings } from 'framework/strings'
import { Ticker } from '@common/components/Ticker/Ticker'
import { SortOption } from '@common/components/SortOption/SortOption'
import { PieChart, PieChartProps } from '@cd/components/PieChart/PieChart'
import { getFixed, INVALID_CHANGE_RATE } from '@cd/components/Services/common'
import { numberFormatter } from '@common/utils/utils'
import { SettingType } from '@common/constants/Utils'
import { ChangeRate, IconDTO, ServiceDetailsDTOV2, useDeleteServiceV2, useGetSettingValue } from 'services/cd-ng'
import { DeploymentTypeIcons } from '@cd/components/DeploymentTypeIcons/DeploymentTypeIcons'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { ResourceType as GitResourceType } from '@common/interfaces/GitSyncInterface'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import RbacMenuItem from '@rbac/components/MenuItem/MenuItem'
import { useFeatureFlag, useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { NewEditServiceModal } from '@cd/components/PipelineSteps/DeployServiceStep/NewEditServiceModal'
import { isExecutionIgnoreFailed, isExecutionNotStarted } from '@pipeline/utils/statusHelpers'
import ExecutionStatusLabel from '@pipeline/components/ExecutionStatusLabel/ExecutionStatusLabel'
import { mapToExecutionStatus } from '@pipeline/components/Dashboards/shared'
import { getWindowLocationUrl } from 'framework/utils/WindowLocation'
import { RateTrend, TrendPopover } from '@cd/pages/dashboard/dashboardUtils'
import { useEntityDeleteErrorHandlerDialog } from '@common/hooks/EntityDeleteErrorHandlerDialog/useEntityDeleteErrorHandlerDialog'
import type { Sort, SortFields } from '@common/utils/listUtils'
import { StoreType } from '@modules/10-common/constants/GitSyncTypes'
import useMigrateResource from '@modules/70-pipeline/components/MigrateResource/useMigrateResource'
import { MigrationType } from '@modules/70-pipeline/components/MigrateResource/MigrateUtils'
import { ServiceTabs, getRemoteServiceQueryParams } from '../utils/ServiceUtils'
import { ServiceCodeSourceCell } from '../ServicesListColumns/ServicesListColumns'
import css from '@cd/components/Services/ServicesList/ServiceList.module.scss'

export enum DeploymentStatus {
  SUCCESS = 'success',
  FAILED = 'failed'
}

export interface ServiceListItem {
  name: string
  identifier: string
  tags?: {
    [key: string]: string
  }
  storeType: ServiceDetailsDTOV2['storeType']
  connectorRef: ServiceDetailsDTOV2['connectorRef']
  entityGitDetails: ServiceDetailsDTOV2['entityGitDetails']
  deploymentTypeList: string[]
  deploymentIconList: IconDTO[]
  serviceInstances: {
    count: number
    prodCount: number
    nonProdCount: number
  }
  deployments: ChangeValue
  failureRate: ChangeValue
  frequency: ChangeValue
  lastDeployment: {
    name: string
    id: string
    timestamp: number
    status: string
    serviceId: string
    executionId: string
    planExecutionId?: string
  }
}

export interface ServicesListProps {
  loading: boolean
  error: boolean
  data: ServiceDetailsDTOV2[]
  refetch: () => void
  setSavedSortOption: (value: [SortFields, Sort]) => void
  setSort: React.Dispatch<React.SetStateAction<[SortFields, Sort]>>
  sort: string[]
}

const transformServiceDetailsData = (data: ServiceDetailsDTOV2[]): ServiceListItem[] => {
  return data.map((item: ServiceDetailsDTOV2) => ({
    name: defaultTo(item.serviceName, ''),
    identifier: defaultTo(item.serviceIdentifier, ''),
    description: defaultTo(item.description, ''),
    tags: defaultTo(item.tags, {}),
    storeType: item.storeType,
    connectorRef: item.connectorRef,
    entityGitDetails: item.entityGitDetails,
    deploymentTypeList: defaultTo(item.deploymentTypeList, []),
    deploymentIconList: defaultTo(item.deploymentIconList, []),
    serviceInstances: {
      count: defaultTo(item.instanceCountDetails?.totalInstances, 0),
      prodCount: defaultTo(item.instanceCountDetails?.prodInstances, 0),
      nonProdCount: defaultTo(item.instanceCountDetails?.nonProdInstances, 0)
    },
    deployments: {
      value: numberFormatter(item.totalDeployments),
      change: defaultTo((item.totalDeploymentChangeRate as ChangeRate)?.percentChange, 0),
      trend: (item.totalDeploymentChangeRate as ChangeRate)?.trend as RateTrend
    },
    failureRate: {
      value: numberFormatter(item.failureRate),
      change: defaultTo((item.failureRateChangeRate as ChangeRate)?.percentChange, 0),
      trend: (item.failureRateChangeRate as ChangeRate)?.trend as RateTrend
    },
    frequency: {
      value: numberFormatter(item.frequency),
      change: defaultTo((item.frequencyChangeRate as ChangeRate)?.percentChange, 0),
      trend: (item.frequencyChangeRate as ChangeRate)?.trend as RateTrend
    },
    lastDeployment: {
      name: defaultTo(item.lastPipelineExecuted?.name, ''),
      id: defaultTo(item.lastPipelineExecuted?.pipelineExecutionId, ''),
      timestamp: defaultTo(item.lastPipelineExecuted?.lastExecutedAt, 0),
      status: defaultTo(item.lastPipelineExecuted?.status, ''),
      executionId: defaultTo(item.lastPipelineExecuted?.identifier, ''),
      serviceId: defaultTo(item.serviceIdentifier, ''),
      planExecutionId: defaultTo(item.lastPipelineExecuted?.planExecutionId, '')
    }
  }))
}

const RenderServiceName: Renderer<CellProps<ServiceListItem>> = ({ row }) => {
  const { name, identifier, tags } = row.original
  const { getString } = useStrings()
  const idLabel = getString('idLabel', { id: identifier })
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const [isHover, setIsHover] = React.useState<boolean>()
  return (
    <Layout.Vertical>
      <Layout.Horizontal spacing="small" className={css.serviceHorizontalItems}>
        {
          <Link
            className={css.renderServiceName}
            target="_blank"
            to={`${routes.toServiceStudio({
              accountId,
              orgIdentifier,
              projectIdentifier,
              serviceId: row.original.identifier,
              module
            })}?${getRemoteServiceQueryParams(row.original, false)}`}
            onClick={e => e.stopPropagation()}
          >
            <Text
              font={{ variation: FontVariation.LEAD }}
              color={Color.PRIMARY_7}
              margin={{ bottom: 'xsmall' }}
              className={css.serviceMaxWidth}
              lineClamp={1}
              onMouseEnter={() => setIsHover(true)}
              onMouseLeave={() => setIsHover(false)}
            >
              {name}
            </Text>
            {isHover && <Icon className={css.openNewTabFromList} color={Color.PRIMARY_7} size={15} name="launch" />}
          </Link>
        }
        {tags && Object.keys(tags).length ? <TagsPopover tags={tags} /> : null}
      </Layout.Horizontal>

      <Text font={{ size: 'small' }} color={Color.GREY_500} lineClamp={1}>
        {idLabel}
      </Text>
    </Layout.Vertical>
  )
}

const RenderType: Renderer<CellProps<ServiceListItem>> = ({ row }) => {
  const { deploymentTypeList, deploymentIconList } = row.original
  return <DeploymentTypeIcons deploymentTypes={deploymentTypeList} size={20} deploymentIconList={deploymentIconList} />
}

const TickerCard: React.FC<{ item: ChangeValue & { name: string } }> = props => {
  const { item } = props
  const value = Number(item.value)
  const isBoostMode = item.change === INVALID_CHANGE_RATE || item.trend === RateTrend.INVALID
  const color = (() => {
    if (item.name !== 'failureRate') {
      return !isBoostMode && item.trend === RateTrend.DOWN ? Color.RED_500 : Color.GREEN_500
    } else {
      return isBoostMode || item.trend === RateTrend.DOWN ? Color.GREEN_500 : Color.RED_500
    }
  })()
  return (
    <Layout.Vertical padding={'small'} key={item.name} width={'fit-content'} className={css.tickerContainer}>
      <Ticker
        value={
          isBoostMode ? (
            <></>
          ) : (
            <Text color={color} font={{ size: 'small' }}>{`${Math.abs(getFixed(item.change))}%`}</Text>
          )
        }
        decreaseMode={!isBoostMode && item.trend === RateTrend.DOWN}
        boost={isBoostMode}
        color={color}
        tickerContainerStyles={css.tickerContainerStyles}
        size={isBoostMode ? 10 : 6}
      >
        <Text color={Color.BLACK} font={{ weight: 'semi-bold', size: 'medium' }} margin={{ right: 'xsmall' }}>
          {isNaN(value) ? item.value : numberFormatter(value)}
        </Text>
      </Ticker>
    </Layout.Vertical>
  )
}

const getRenderTickerCard: (tickerCardKey: keyof ServiceListItem) => Renderer<CellProps<ServiceListItem>> =
  tickerCardKey =>
  ({ row }) => {
    const value = row.original[tickerCardKey] as ChangeValue
    return (
      <TrendPopover trend={value.trend}>
        <TickerCard item={{ ...value, name: tickerCardKey }} />
      </TrendPopover>
    )
  }

const RenderServiceInstances: Renderer<CellProps<ServiceListItem>> = ({ row }) => {
  const { serviceInstances } = row.original
  const { getString } = useStrings()
  const pieChartProps: PieChartProps = {
    items: [
      {
        label: getString('cd.serviceDashboard.nonProd'),
        value: serviceInstances.nonProdCount,
        formattedValue: numberFormatter(serviceInstances.nonProdCount),
        color: 'var(--primary-2)'
      },
      {
        label: getString('cd.serviceDashboard.prod'),
        value: serviceInstances.prodCount,
        formattedValue: numberFormatter(serviceInstances.prodCount),
        color: 'var(--primary-7)'
      }
    ],
    size: 24,
    labelContainerStyles: css.pieChartLabelContainerStyles,
    labelStyles: css.pieChartLabelStyles,
    options: {
      tooltip: {
        enabled: false
      }
    }
  }
  return (
    <Layout.Horizontal flex={{ align: 'center-center', justifyContent: 'flex-start' }}>
      <Text
        color={Color.BLACK}
        font={{ weight: 'semi-bold', size: 'medium' }}
        margin={{ right: 'xsmall' }}
        padding={{ left: 'medium', top: 'medium', right: 'medium', bottom: 'medium' }}
        className={css.tickerContainer}
      >
        {serviceInstances.count}
      </Text>
      {serviceInstances.count ? <PieChart {...pieChartProps} /> : <></>}
    </Layout.Horizontal>
  )
}

const RenderLastDeployment: Renderer<CellProps<ServiceListItem>> = ({ row }) => {
  const {
    lastDeployment: { id, name, timestamp, executionId, planExecutionId, status }
  } = row.original
  const { getString } = useStrings()
  const { showError } = useToaster()

  const { orgIdentifier, projectIdentifier, accountId, module, pipelineIdentifier } =
    useParams<PipelineType<PipelinePathProps>>()
  const source: ExecutionPathProps['source'] = pipelineIdentifier ? 'executions' : 'deployments'

  const disabled = isExecutionNotStarted(status)

  function handleClick(): void {
    if (!disabled && id && planExecutionId) {
      const route = routes.toExecutionPipelineView({
        orgIdentifier,
        pipelineIdentifier: executionId,
        executionIdentifier: planExecutionId,
        projectIdentifier,
        accountId,
        module,
        source
      })

      const baseUrl = getWindowLocationUrl()
      window.open(`${baseUrl}${route}`)
    } else {
      showError(getString('cd.serviceDashboard.noLastDeployment'))
    }
  }

  if (!id) {
    return <></>
  }
  return (
    <Layout.Horizontal className={css.lastDeployment}>
      <Layout.Vertical margin={{ right: 'large' }} flex={{ alignItems: 'flex-start' }}>
        <Layout.Horizontal
          margin={{ bottom: 'xsmall' }}
          flex={{ alignItems: 'center', justifyContent: 'flex-start' }}
          width="100%"
        >
          <Text
            data-testid={id}
            font={{ variation: FontVariation.BODY2 }}
            color={Color.PRIMARY_7}
            margin={{ right: 'xsmall' }}
            className={css.lastDeploymentText}
            lineClamp={1}
            onClick={e => {
              e.stopPropagation()
              handleClick()
            }}
          >
            {name}
          </Text>
        </Layout.Horizontal>
        {timestamp && (
          <ReactTimeago
            date={timestamp}
            component={val => (
              <Text font={{ size: 'small' }} color={Color.GREY_500}>
                {' '}
                {val.children}{' '}
              </Text>
            )}
          />
        )}
      </Layout.Vertical>
      <Layout.Horizontal flex>
        <ExecutionStatusLabel status={mapToExecutionStatus(status.toUpperCase())} />
        {isExecutionIgnoreFailed(mapToExecutionStatus(status.toUpperCase())) ? (
          <Text
            icon={'ignoreFailed'}
            intent={Intent.WARNING}
            tooltip={getString('pipeline.execution.ignoreFailedWarningText')}
            tooltipProps={{ position: Position.LEFT }}
          />
        ) : null}
      </Layout.Horizontal>
    </Layout.Horizontal>
  )
}

const RenderColumnMenu: Renderer<CellProps<any>> = ({ row, column }) => {
  const data = row.original
  const [menuOpen, setMenuOpen] = useState(false)
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const { showSuccess, showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const { getString } = useStrings()
  const history = useHistory()
  const { NG_SVC_ENV_REDESIGN, CDS_SERVICE_GITX } = useFeatureFlags()
  const [hideReferencedByButton, setHideReferencedByButton] = useState(false)
  const [customErrorMessage, setCustomErrorMessage] = useState<string | undefined>()
  const [showOverlay, setShowOverlay] = useState(false)

  const { mutate: deleteService } = useDeleteServiceV2({})

  const [showModal, hideModal] = useModalHook(
    () => (
      <ModalDialog
        isOpen={true}
        enforceFocus={false}
        canEscapeKeyClose
        canOutsideClickClose
        onClose={hideModal}
        title={getString('editService')}
        isCloseButtonShown
        width={800}
        showOverlay={showOverlay}
      >
        <NewEditServiceModal
          data={{ ...pick(data, ['name', 'identifier', 'description', 'tags']) } || { name: '', identifier: '' }}
          isEdit={true}
          isGitXEnforced={false}
          isService={false}
          onCreateOrUpdate={() => {
            ;(column as any).reload?.()
            hideModal()
          }}
          closeModal={hideModal}
          setShowOverlay={setShowOverlay}
        />
      </ModalDialog>
    ),
    [data, orgIdentifier, projectIdentifier]
  )

  const deleteHandler = async (forceDelete?: boolean): Promise<void> => {
    try {
      const response = await deleteService(data.identifier, {
        headers: { 'content-type': 'application/json' },
        queryParams: {
          accountIdentifier: accountId,
          orgIdentifier: orgIdentifier,
          projectIdentifier: projectIdentifier,
          forceDelete
        }
      })
      if (response.status === 'SUCCESS') {
        showSuccess(getString('common.deleteServiceMessage'))
        ;(column as any).reload?.()
      }
    } catch (err: any) {
      if ((column as any).isForceDeleteEnabled) {
        if (err?.data?.code === 'ENTITY_REFERENCE_EXCEPTION') {
          setCustomErrorMessage(undefined)
          openReferenceErrorDialog()
        } else if (err?.data?.code === 'ACTIVE_SERVICE_INSTANCES_PRESENT_EXCEPTION') {
          setCustomErrorMessage(getErrorInfoFromErrorObject(err))
          setHideReferencedByButton(true)
          openReferenceErrorDialog()
        }
      } else {
        showError(getRBACErrorMessage(err as RBACError))
      }
    }
  }

  const { openDialog } = useConfirmationDialog({
    titleText: getString('common.deleteService'),
    contentText: getString('common.deleteServiceConfirmation', { name: data.name }),
    cancelButtonText: getString('cancel'),
    confirmButtonText: getString('confirm'),
    intent: Intent.DANGER,
    onCloseDialog: async isConfirmed => {
      if (isConfirmed && data.identifier) {
        deleteHandler(false)
      }
    }
  })

  const redirectToReferencedBy = (): void => {
    history.push({
      pathname: routes.toServiceStudio({
        accountId,
        orgIdentifier,
        projectIdentifier,
        serviceId: data.identifier,
        module
      }),
      search: `tab=${ServiceTabs.REFERENCED_BY}${getRemoteServiceQueryParams(data, true)}`
    })
  }

  const { openDialog: openReferenceErrorDialog } = useEntityDeleteErrorHandlerDialog({
    entity: {
      type: ResourceType.SERVICE,
      name: defaultTo(data?.name, '')
    },
    redirectToReferencedBy,
    hideReferencedByButton,
    forceDeleteCallback: () => deleteHandler(true),
    customErrorMessage
  })

  const handleEdit = (e: React.MouseEvent<HTMLElement, MouseEvent>): void => {
    e.stopPropagation()
    setMenuOpen(false)
    if (NG_SVC_ENV_REDESIGN) {
      history.push({
        pathname: routes.toServiceStudio({
          accountId,
          orgIdentifier,
          projectIdentifier,
          serviceId: data.identifier,
          module
        }),
        search: `tab=${ServiceTabs.Configuration}${getRemoteServiceQueryParams(data, true)}`
      })
    } else {
      showModal()
    }
  }

  const handleDelete = (e: React.MouseEvent<HTMLElement, MouseEvent>): void => {
    e.stopPropagation()
    setMenuOpen(false)
    openDialog()
  }

  const { showMigrateResourceModal: showMoveResourceModal } = useMigrateResource({
    resourceType: GitResourceType.SERVICE,
    modalTitle: getString('common.moveEntitytoGit', { resourceType: getString('service') }),
    migrationType: MigrationType.INLINE_TO_REMOTE,
    extraQueryParams: { name: data?.name, identifier: data?.identifier },
    onSuccess: () => (column as any).reload?.()
  })

  const openInNewTab = `${routes.toServiceStudio({
    accountId,
    orgIdentifier,
    projectIdentifier,
    serviceId: data.identifier,
    module
  })}?${getRemoteServiceQueryParams(data, false)}`

  return (
    <Layout.Horizontal>
      <Popover
        isOpen={menuOpen}
        onInteraction={nextOpenState => {
          setMenuOpen(nextOpenState)
        }}
        className={Classes.DARK}
        position={Position.RIGHT_TOP}
      >
        <Button
          minimal
          icon="Options"
          onClick={e => {
            e.stopPropagation()
            setMenuOpen(true)
          }}
        />
        <Menu style={{ minWidth: 'unset' }}>
          <Link
            className={cx('bp3-menu-item', css.openNewTabStyle)}
            target="_blank"
            to={openInNewTab}
            onClick={e => e.stopPropagation()}
          >
            <Icon name="launch" style={{ marginRight: '5px' }} />
            {getString('common.openInNewTab')}
          </Link>
          <RbacMenuItem
            icon="edit"
            text={getString('edit')}
            onClick={handleEdit}
            permission={{
              resource: {
                resourceType: ResourceType.SERVICE,
                resourceIdentifier: defaultTo(data.identifier, '')
              },
              permission: PermissionIdentifier.EDIT_SERVICE
            }}
          />
          {NG_SVC_ENV_REDESIGN && CDS_SERVICE_GITX && data?.storeType !== StoreType.REMOTE ? (
            <RbacMenuItem
              icon="git-merge"
              text={getString('common.moveToGit')}
              permission={{
                resource: {
                  resourceType: ResourceType.SERVICE,
                  resourceIdentifier: defaultTo(data.identifier, '')
                },
                permission: PermissionIdentifier.EDIT_SERVICE
              }}
              onClick={e => {
                e.stopPropagation()
                setMenuOpen(false)
                showMoveResourceModal()
              }}
              data-testid="moveConfigToRemote"
            />
          ) : null}
          <RbacMenuItem
            icon="trash"
            text={getString('delete')}
            onClick={handleDelete}
            permission={{
              resource: {
                resourceType: ResourceType.SERVICE,
                resourceIdentifier: defaultTo(data.identifier, '')
              },
              permission: PermissionIdentifier.DELETE_SERVICE
            }}
          />
        </Menu>
      </Popover>
    </Layout.Horizontal>
  )
}

function ServiceListHeaderCustomPrimary(headerProps: { total?: number }): JSX.Element {
  const { getString } = useStrings()
  return (
    <Text
      font={{ variation: FontVariation.LEAD }}
      color={Color.GREY_700}
      tooltipProps={{ dataTooltipId: 'serviceDashboardTotalServices' }}
    >
      {getString('cd.serviceDashboard.totalServices', {
        total: defaultTo(headerProps.total, 0)
      })}
    </Text>
  )
}

export const ServicesList: React.FC<ServicesListProps> = props => {
  const { loading, data, error, refetch, setSavedSortOption, setSort, sort } = props
  const isGitXEnabledForServices = useFeatureFlag(FeatureFlag.CDS_SERVICE_GITX)
  const { getString } = useStrings()
  const { getRBACErrorMessage } = useRBACError()
  const { showError } = useToaster()
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const history = useHistory()

  const { data: forceDeleteSettings, error: forceDeleteSettingsError } = useGetSettingValue({
    identifier: SettingType.ENABLE_FORCE_DELETE,
    queryParams: {
      accountIdentifier: accountId
    },
    lazy: false
  })

  React.useEffect(() => {
    if (forceDeleteSettingsError) {
      showError(getRBACErrorMessage(forceDeleteSettingsError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceDeleteSettingsError])

  const columns: TableProps<ServiceListItem>['columns'] = useMemo(
    () => {
      return [
        {
          Header: getString('service').toLocaleUpperCase(),
          id: 'service',
          width: isGitXEnabledForServices ? '15%' : '20%',
          Cell: RenderServiceName
        },
        ...(isGitXEnabledForServices
          ? [
              {
                Header: getString('pipeline.codeSource'),
                id: 'storeType',
                width: '10%',
                Cell: ServiceCodeSourceCell
              }
            ]
          : []),
        {
          Header: getString('typeLabel').toLocaleUpperCase(),
          id: 'type',
          width: '7%',
          Cell: RenderType
        },
        {
          Header: getString('cd.serviceDashboard.activeInstanceCount').toLocaleUpperCase(),
          id: 'serviceInstances',
          width: isGitXEnabledForServices ? '9%' : '14%',
          Cell: RenderServiceInstances
        },
        {
          Header: getString('deploymentsText').toLocaleUpperCase(),
          id: 'deployments',
          width: '10%',
          Cell: getRenderTickerCard('deployments')
        },
        {
          Header: getString('common.failureRate').toLocaleUpperCase(),
          id: 'failureRate',
          width: '10%',
          Cell: getRenderTickerCard('failureRate')
        },
        {
          Header: getString('cd.serviceDashboard.frequency').toLocaleUpperCase(),
          id: 'frequency',
          width: '11%',
          Cell: getRenderTickerCard('frequency')
        },
        {
          Header: getString('cd.serviceDashboard.lastPipelineExecution').toLocaleUpperCase(),
          id: 'lastDeployment',
          width: '25%',
          Cell: RenderLastDeployment
        },
        {
          Header: '',
          width: '3%',
          id: 'action',
          Cell: RenderColumnMenu,
          reload: refetch,
          disableSortBy: true,
          isForceDeleteEnabled: forceDeleteSettings?.data?.value === 'true'
        }
      ]
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forceDeleteSettings?.data?.value]
  )

  const goToServiceDetails = useCallback(
    (selectedService: ServiceListItem): void => {
      history.push({
        pathname: routes.toServiceStudio({
          accountId,
          orgIdentifier,
          projectIdentifier,
          serviceId: selectedService?.identifier,
          module
        }),
        search: `${getRemoteServiceQueryParams(selectedService, false)}`
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountId, orgIdentifier, projectIdentifier, module]
  )

  const dashboardListProps: DashboardListProps<ServiceListItem> = {
    columns,
    loading,
    error,
    data: transformServiceDetailsData(data),
    refetch,
    HeaderCustomPrimary: ServiceListHeaderCustomPrimary,
    onRowClick: goToServiceDetails,
    sortList: <SortOption setSavedSortOption={setSavedSortOption} setSort={setSort} sort={sort} />
  }
  return <DashboardList<ServiceListItem> {...dashboardListProps} />
}
