/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Classes, Intent, Menu, MenuDivider, MenuItem, Position } from '@blueprintjs/core'
import {
  Avatar,
  Button,
  ButtonVariation,
  ConfirmationDialog,
  Layout,
  Popover,
  TableV2,
  Text,
  useToaster,
  useToggleOpen
} from '@harness/uicore'
import React, { useState } from 'react'
import { Color } from '@harness/design-system'
import type { CellProps, Column, Renderer, Row } from 'react-table'
import moment from 'moment'
import { Link, useParams } from 'react-router-dom'
import cronstrue from 'cronstrue'
import { killEvent } from '@common/utils/eventUtils'
import { getTimeAgo } from '@pipeline/utils/CIUtils'
import { ApiGetAgentResponse, useDeleteAgent } from 'services/servicediscovery'
import routesV1 from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import type { DiscoveryPathProps, ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import type { PaginationPropsWithDefaults } from '@common/hooks/useDefaultPaginationProps'
import { useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { DiscoveryAgentStatus } from '../DelegateAgentStatus/DelegateAgentStatus'
import css from './DiscoveryAgentTable.module.scss'

interface DiscoveryAgentTableProps {
  listData: ApiGetAgentResponse[]
  pagination: PaginationPropsWithDefaults
  refetch: () => Promise<void>
}

const Name: Renderer<CellProps<ApiGetAgentResponse>> = /* istanbul ignore next */ ({ row }) => {
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesV2 : routesV1
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<
    ProjectPathProps & ModulePathParams & DiscoveryPathProps
  >()
  const { getString } = useStrings()
  return (
    <>
      <Link
        to={routes.toDiscoveredResource({
          accountId,
          orgIdentifier,
          projectIdentifier,
          dAgentId: row.original.identity,
          module
        })}
      >
        <Text font={{ size: 'normal', weight: 'bold' }} color={Color.PRIMARY_7} style={{ cursor: 'pointer' }}>
          {row.original.name}
        </Text>
      </Link>
      <Layout.Horizontal flex={{ alignItems: 'center', justifyContent: 'start' }} margin={{ top: 'xsmall' }}>
        <Text font={{ size: 'small', weight: 'light' }} color={Color.GREY_500}>
          {getString('common.ID')}:
        </Text>
        <Text
          font={{ size: 'small', weight: 'light' }}
          lineClamp={1}
          className={css.idPill}
          style={{ background: '#F3F3FA', borderRadius: '5px' }}
        >
          {row?.original?.identity}
        </Text>
      </Layout.Horizontal>
    </>
  )
}

const NetworkCount: Renderer<CellProps<ApiGetAgentResponse>> = /* istanbul ignore next */ ({ row }) => (
  <Layout.Vertical width={50} height={40} className={css.totalServiceContainer}>
    <Text font={{ size: 'medium', weight: 'semi-bold' }} color={Color.GREY_500}>
      {row.original.networkMapCount ?? '--'}
    </Text>
  </Layout.Vertical>
)

const ServiceCount: Renderer<CellProps<ApiGetAgentResponse>> = /* istanbul ignore next */ ({ row }) => (
  <Layout.Vertical width={60} height={50} className={css.totalServiceContainer}>
    <Text font={{ size: 'medium', weight: 'semi-bold' }} color={Color.GREY_500}>
      {row.original.serviceCount ?? '--'}
    </Text>
  </Layout.Vertical>
)

const DiscoverySchedule: Renderer<CellProps<ApiGetAgentResponse>> = /* istanbul ignore next */ ({ row }) => {
  const { getString } = useStrings()
  return (
    <div>
      {row.original.config?.data?.cron?.expression ? (
        <Text font={{ size: 'small' }} color={Color.BLACK}>
          {cronstrue.toString(row.original.config?.data?.cron?.expression ?? '')}{' '}
        </Text>
      ) : (
        <Text font={{ size: 'small' }} color={Color.GREY_400}>
          {getString('pipeline.notAvailable')}
        </Text>
      )}
    </div>
  )
}

const LastServiceDiscovery: Renderer<CellProps<ApiGetAgentResponse>> = /* istanbul ignore next */ ({ row }) => {
  const { getString } = useStrings()
  const date = moment(row.original.installationDetails?.createdAt).format('MMM DD, YYYY hh:mm A')
  const status = row.original.installationDetails?.delegateTaskStatus
  return (
    <Layout.Horizontal flex={{ align: 'center-center', justifyContent: 'flex-start' }}>
      {!row.original.installationDetails ? (
        <Text font={{ size: 'small', weight: 'semi-bold' }} color={Color.GREY_400} lineClamp={1}>
          {getString('discovery.noDiscoveryData')}
        </Text>
      ) : (
        <Layout.Vertical spacing={'small'}>
          <Text font={{ size: 'small' }} color={Color.GREY_900} lineClamp={1}>
            {date}
          </Text>
          <DiscoveryAgentStatus status={status} />
        </Layout.Vertical>
      )}
    </Layout.Horizontal>
  )
}

const LastModified: Renderer<CellProps<ApiGetAgentResponse>> = /* istanbul ignore next */ ({ row }) => {
  const { getString } = useStrings()
  return (
    <Layout.Horizontal flex={{ align: 'center-center', justifyContent: 'flex-start' }} spacing={'small'}>
      <Text font={{ size: 'xsmall' }} color={Color.GREY_500} lineClamp={1}>
        {row?.original.updatedAt ? getTimeAgo(new Date(row.original.updatedAt).getTime()) : getString('na')}
      </Text>
      <Avatar hoverCard={true} name={row?.original.updatedBy} size="normal" />
    </Layout.Horizontal>
  )
}

const ThreeDotMenu = /* istanbul ignore next */ ({
  row,
  refetch
}: {
  row: Row<ApiGetAgentResponse>
  refetch: () => Promise<void>
}): JSX.Element => {
  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps & ModulePathParams>()
  const { mutate: deleteDiscoveryAgent } = useDeleteAgent({
    queryParams: { accountIdentifier: accountId, projectIdentifier, organizationIdentifier: orgIdentifier }
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const { getString } = useStrings()
  const { showSuccess, showError } = useToaster()
  const {
    isOpen: isDeleteConfirmationOpen,
    open: openDeleteConfirmation,
    close: closeDeleteConfirmation
  } = useToggleOpen()

  const handleDelete = (e: React.MouseEvent<HTMLElement, MouseEvent>): void => {
    e.stopPropagation()
    setMenuOpen(false)
    openDeleteConfirmation()
  }

  return (
    <>
      <Layout.Horizontal style={{ justifyContent: 'flex-end', marginRight: '10px' }} onClick={killEvent}>
        <Popover
          isOpen={menuOpen}
          className={Classes.DARK}
          onInteraction={nextOpenState => {
            setMenuOpen(nextOpenState)
          }}
          position={Position.LEFT}
        >
          <Button
            variation={ButtonVariation.ICON}
            onClick={e => {
              e.stopPropagation()
              setMenuOpen(true)
            }}
            icon="Options"
          />
          <Menu style={{ backgroundColor: 'unset' }}>
            <MenuItem icon="edit" text={'Edit'} disabled onClick={() => void 0} className={css.menuItem} />
            <MenuDivider />
            <MenuItem icon="trash" text={getString('delete')} className={css.deleteMenuItem} onClick={handleDelete} />
          </Menu>
        </Popover>
      </Layout.Horizontal>

      <ConfirmationDialog
        isOpen={isDeleteConfirmationOpen}
        titleText={getString('discovery.permissions.confirmDeleteTitleDAgent')}
        contentText={`${getString('discovery.permissions.confirmDeleteDAgent', { name: row.original.name })}`}
        confirmButtonText={getString('delete')}
        cancelButtonText={getString('cancel')}
        onClose={async (isConfirmed: boolean) => {
          if (isConfirmed) {
            try {
              const deleted = await deleteDiscoveryAgent(row.original.identity || '')
              if (deleted)
                showSuccess(getString('discovery.permissions.deletedMessageDAgent', { name: row.original.name }))
              refetch()
            } catch (err) {
              showError(err?.data?.message || err?.message)
            }
          } else closeDeleteConfirmation()
        }}
        intent={Intent.DANGER}
        buttonIntent={Intent.DANGER}
      />
    </>
  )
}

const DiscoveryAgentTable: React.FC<DiscoveryAgentTableProps> = ({ listData, pagination, refetch }) => {
  const columns: Column<ApiGetAgentResponse>[] = React.useMemo(
    () => [
      {
        Header: 'Discovery Agent',
        width: '20%',
        Cell: Name
      },
      {
        Header: 'Last Discovery',
        width: '20%',
        Cell: LastServiceDiscovery
      },
      {
        Header: 'Discovery Schedule',
        width: '15%',
        Cell: DiscoverySchedule
      },
      {
        Header: 'Services Discovered',
        width: '15%',
        Cell: ServiceCount
      },
      {
        Header: 'Network Maps',
        width: '15%',
        Cell: NetworkCount
      },
      {
        Header: 'Last Edited',
        width: '15%',
        Cell: LastModified
      },
      {
        id: 'threeDotMenu',
        width: '5%',
        Cell: ({ row }: { row: Row<ApiGetAgentResponse> }) => <ThreeDotMenu row={row} refetch={refetch} />
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listData]
  )

  return <TableV2<ApiGetAgentResponse> sortable={true} columns={columns} data={listData} pagination={pagination} />
}

export default DiscoveryAgentTable
