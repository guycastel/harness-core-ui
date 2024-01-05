/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Classes, Intent, Menu, MenuItem, Position } from '@blueprintjs/core'
import {
  Avatar,
  Button,
  ButtonVariation,
  ConfirmationDialog,
  Container,
  ExpandingSearchInput,
  Icon,
  Layout,
  Page,
  Popover,
  TableV2,
  Text,
  useToaster,
  useToggleOpen
} from '@harness/uicore'
import React, { useState } from 'react'
import { Color } from '@harness/design-system'
import type { CellProps, Column, Renderer } from 'react-table'
import { useHistory, useParams } from 'react-router-dom'
import { getTimeAgo } from '@pipeline/utils/CIUtils'
import type { DiscoveryPathProps, ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { DatabaseNetworkMapCollection, useDeleteNetworkMap, useListNetworkMap } from 'services/servicediscovery'
import routesV1 from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { useQueryParams } from '@common/hooks'
import { CommonPaginationQueryParams, useDefaultPaginationProps } from '@common/hooks/useDefaultPaginationProps'
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE } from '@discovery/interface/filters'
import { useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import EmptyStateNetworkMap from './EmptyStateNetworkMap'
import css from './NetworkMapTable.module.scss'

interface NetworkMapTableProps {
  agentName: string | undefined
  connectorID: string | undefined
}

const NetworkMapTable: React.FC<NetworkMapTableProps> = ({ agentName, connectorID }) => {
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesV2 : routesV1
  const { dAgentId, accountId, orgIdentifier, projectIdentifier, module } = useParams<
    ProjectPathProps & ModulePathParams & DiscoveryPathProps
  >()
  const history = useHistory()
  const { getString } = useStrings()
  const { showError, showSuccess } = useToaster()
  const [search, setSearch] = useState('')

  //States for pagination
  const { page, size } = useQueryParams<CommonPaginationQueryParams>()

  const {
    data: networkMapList,
    loading: networkMapListLoading,
    refetch: refetchListNetwork
  } = useListNetworkMap({
    agentIdentity: dAgentId,
    queryParams: {
      accountIdentifier: accountId,
      organizationIdentifier: orgIdentifier,
      projectIdentifier: projectIdentifier,
      page: page ?? DEFAULT_PAGE_INDEX,
      limit: size ?? DEFAULT_PAGE_SIZE,
      all: false,
      search: search
    }
  })

  const paginationProps = useDefaultPaginationProps({
    itemCount: networkMapList?.page?.totalItems ?? 1,
    pageCount: networkMapList?.page?.totalPages ?? 1,
    pageIndex: networkMapList?.page?.index ?? DEFAULT_PAGE_INDEX,
    pageSize: networkMapList?.page?.limit ?? DEFAULT_PAGE_SIZE
  })

  const Name: Renderer<CellProps<DatabaseNetworkMapCollection>> = ({ row }) => (
    <Text
      className={css.nameCell}
      font={{ size: 'normal', weight: 'semi-bold' }}
      margin={{ left: 'medium' }}
      color={Color.PRIMARY_7}
      onClick={() =>
        history.push(
          routes.toCreateNetworkMap({
            accountId,
            orgIdentifier,
            projectIdentifier,
            module,
            dAgentId,
            networkMapId: row.original.identity
          })
        )
      }
    >
      {row.original.name}
    </Text>
  )

  const DAgentName: Renderer<CellProps<DatabaseNetworkMapCollection>> = () => (
    <Layout.Horizontal spacing="small" flex={{ justifyContent: 'flex-start', alignItems: 'center' }}>
      <Icon name="app-kubernetes" size={24} margin={{ right: 'small' }} />
      <Layout.Vertical spacing={'xsmall'}>
        <Text font={{ size: 'small', weight: 'semi-bold' }} color={Color.GREY_900} lineClamp={1}>
          {agentName}
        </Text>
        <Text font={{ size: 'small' }} color={Color.PRIMARY_7} lineClamp={1}>
          {connectorID}
        </Text>
      </Layout.Vertical>
    </Layout.Horizontal>
  )

  const ServiceCount: Renderer<CellProps<DatabaseNetworkMapCollection>> = ({ row }) => (
    <Layout.Vertical width={50} height={40} className={css.totalServiceContainer}>
      <Text font={{ size: 'medium', weight: 'semi-bold' }} color={Color.GREY_500}>
        {row.original.resources?.length}
      </Text>
    </Layout.Vertical>
  )

  const LastUpdatedBy: Renderer<CellProps<DatabaseNetworkMapCollection>> = ({ row }) => {
    return (
      <Layout.Horizontal flex={{ align: 'center-center', justifyContent: 'flex-start' }}>
        <Avatar hoverCard={false} name={row.original.updatedBy} size="normal" />
        <Layout.Vertical spacing={'xsmall'}>
          <Text font={{ size: 'small', weight: 'semi-bold' }} color={Color.GREY_900} lineClamp={1}>
            {row.original.updatedBy}
          </Text>
          <Text font={{ size: 'xsmall' }} color={Color.GREY_500} lineClamp={1}>
            {row.original.updatedAt ? getTimeAgo(new Date(row.original.updatedAt).getTime()) : getString('na')}
          </Text>
        </Layout.Vertical>
      </Layout.Horizontal>
    )
  }

  const ThreeDotMenu: Renderer<CellProps<DatabaseNetworkMapCollection>> = ({ row }) => {
    const { mutate: deleteNetworkMap } = useDeleteNetworkMap({
      queryParams: {
        accountIdentifier: accountId,
        organizationIdentifier: orgIdentifier,
        projectIdentifier: projectIdentifier
      },
      agentIdentity: dAgentId
    })
    const [menuOpen, setMenuOpen] = useState(false)
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
        <Layout.Horizontal style={{ justifyContent: 'flex-end', marginRight: '10px' }}>
          <Popover
            isOpen={menuOpen}
            className={Classes.DARK}
            onInteraction={nextOpenState => {
              setMenuOpen(nextOpenState)
            }}
            position={Position.LEFT}
          >
            <Button
              onClick={e => {
                e.stopPropagation()
                setMenuOpen(true)
              }}
              variation={ButtonVariation.ICON}
              icon="Options"
            />
            <Menu data-testid="options" style={{ backgroundColor: 'unset' }}>
              <MenuItem
                icon="edit"
                text={getString('edit')}
                onClick={() =>
                  history.push(
                    routes.toCreateNetworkMap({
                      accountId,
                      orgIdentifier,
                      projectIdentifier,
                      module,
                      dAgentId,
                      networkMapId: row.original.identity
                    })
                  )
                }
                className={css.menuItem}
              />
              <MenuItem icon="trash" text={getString('delete')} className={css.menuItem} onClick={handleDelete} />
            </Menu>
          </Popover>
        </Layout.Horizontal>
        <ConfirmationDialog
          isOpen={isDeleteConfirmationOpen}
          titleText={getString('discovery.permissions.confirmDeleteTitleNetworkMap')}
          contentText={`${getString('discovery.permissions.confirmDeleteNetworkMap', { name: row.original.name })}`}
          confirmButtonText={getString('delete')}
          cancelButtonText={getString('cancel')}
          onClose={async (isConfirmed: boolean) => {
            if (isConfirmed) {
              try {
                const deleted = await deleteNetworkMap(row.original.identity || '')
                if (deleted)
                  showSuccess(getString('discovery.permissions.deletedMessageNetworkMap', { name: row.original.name }))
                refetchListNetwork()
              } catch (err) {
                /* istanbul ignore next */ showError(err?.data?.message || err?.message)
              }
            } else closeDeleteConfirmation()
          }}
          intent={Intent.DANGER}
          buttonIntent={Intent.DANGER}
        />
      </>
    )
  }

  const networkMapListData: DatabaseNetworkMapCollection[] = React.useMemo(
    () => networkMapList?.items || [],
    [networkMapList?.items]
  )

  const columns: Column<DatabaseNetworkMapCollection>[] = React.useMemo(
    () => [
      {
        Header: getString('common.networkMap'),
        width: '25%',
        Cell: Name
      },
      {
        Header: getString('discovery.discoveryDetails.settings.agentName'),
        width: '25%',
        Cell: DAgentName
      },
      {
        Header: getString('discovery.networkMapTable.noOfService'),
        width: '20%',
        Cell: ServiceCount
      },
      {
        Header: getString('lastUpdatedBy'),
        width: '20%',
        Cell: LastUpdatedBy
      },
      {
        Header: '',
        id: 'threeDotMenu',
        width: '10%',
        Cell: ThreeDotMenu
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [networkMapList, refetchListNetwork]
  )

  if (networkMapListLoading) {
    return (
      <Page.Body>
        <Page.Spinner />
      </Page.Body>
    )
  }

  return (
    <Container>
      {networkMapList?.items && networkMapList.items.length !== 0 ? (
        <>
          <Page.SubHeader>
            <Layout.Horizontal width="100%" flex={{ justifyContent: 'space-between' }}>
              <Button
                text={getString('discovery.newNetworkMap')}
                icon="plus"
                variation={ButtonVariation.PRIMARY}
                onClick={() => {
                  history.push(
                    routes.toCreateNetworkMap({
                      accountId,
                      orgIdentifier,
                      projectIdentifier,
                      module,
                      dAgentId
                    })
                  )
                }}
              />
              <ExpandingSearchInput
                alwaysExpanded
                width={232}
                placeholder={getString('discovery.searchNetworkMap')}
                throttle={500}
                defaultValue={search}
                onChange={value => setSearch(value)}
              />
            </Layout.Horizontal>
          </Page.SubHeader>
          <Page.Body>
            <Container className={css.tableBody}>
              <TableV2<DatabaseNetworkMapCollection>
                sortable={true}
                columns={columns}
                data={networkMapListData}
                pagination={paginationProps}
              />
            </Container>
          </Page.Body>
        </>
      ) : (
        <EmptyStateNetworkMap />
      )}
    </Container>
  )
}

export default NetworkMapTable
