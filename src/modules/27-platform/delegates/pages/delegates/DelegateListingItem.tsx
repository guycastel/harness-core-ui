/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo, useState } from 'react'
import ReactTimeago from 'react-timeago'
import { defaultTo, set } from 'lodash-es'
import { useParams, useHistory } from 'react-router-dom'
import {
  Button,
  Text,
  Layout,
  Popover,
  useToaster,
  useConfirmationDialog,
  ButtonVariation,
  HarnessDocTooltip
} from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { Menu, MenuItem, Classes, Position, Dialog } from '@blueprintjs/core'
import type { CellProps, Renderer, UseExpandedRowProps } from 'react-table'
import { useStrings } from 'framework/strings'
import { useDeleteDelegateGroupByIdentifier, DelegateGroupDetails } from 'services/portal'
import routes from '@common/RouteDefinitions'
import { delegateTypeToIcon } from '@common/utils/delegateUtils'
import RbacMenuItem from '@rbac/components/MenuItem/MenuItem'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { usePermission } from '@rbac/hooks/usePermission'
import DelegateInstallationError from '@delegates/components/CreateDelegate/components/DelegateInstallationError/DelegateInstallationError'
import { Table } from '@common/components'
import TagsRenderer from '@common/components/TagsRenderer/TagsRenderer'
import { killEvent } from '@common/utils/eventUtils'
import { DelegateInstanceList } from './DelegateInstanceList'
import { getAutoUpgradeTextColor, getInstanceStatus } from './utils/DelegateHelper'
import DelegateConnectivityStatus from './DelegateConnectivityStatus'
import css from './DelegatesPage.module.scss'

interface DelegateProps {
  data: DelegateGroupDetails[]
}

const ToggleAccordionCell: Renderer<{ row: UseExpandedRowProps<DelegateGroupDetails> }> = ({ row }) => {
  return (
    <Layout.Horizontal onClick={killEvent}>
      <Button
        {...row.getToggleRowExpandedProps()}
        color={Color.GREY_600}
        icon={row.isExpanded ? 'chevron-down' : 'chevron-right'}
        variation={ButtonVariation.ICON}
        iconProps={{ size: 19 }}
        className={css.toggleAccordion}
      />
    </Layout.Horizontal>
  )
}

const RenderDelegateIcon: Renderer<CellProps<DelegateGroupDetails>> = ({ row }) => {
  return (
    <div className={css.delegateItemIcon}>
      <Text icon={delegateTypeToIcon(row.original?.delegateType as string)} iconProps={{ size: 24 }} />
    </div>
  )
}

const RenderDelegateName: Renderer<CellProps<DelegateGroupDetails>> = ({ row }) => {
  return (
    <>
      <Layout.Vertical margin={{ right: 'large' }}>
        <Text color={Color.BLACK} font={{ variation: FontVariation.BODY2 }} lineClamp={1}>
          {row.original?.groupName}
        </Text>
        <Text color={Color.GREY_600} font={{ variation: FontVariation.SMALL }} lineClamp={1}>
          {row.original.delegateGroupIdentifier}
        </Text>
      </Layout.Vertical>
    </>
  )
}

const RenderTags: Renderer<CellProps<DelegateGroupDetails>> = ({ row }) => {
  const delegate = row.original
  const allSelectors = Object.keys(delegate.groupImplicitSelectors || {}).concat(delegate.groupCustomSelectors || [])
  // TagsRenderer component accepts object { [key: string]: string } so converting the received array into acceptable format
  const delegateTags = {} as { [key: string]: string }
  allSelectors.forEach(item => (delegateTags[item] = ''))
  return Object.keys(delegateTags).length > 0 ? (
    <>
      <Text lineClamp={1} margin={{ right: 'medium' }}>
        <TagsRenderer tags={delegateTags} length={1} width={200} />
      </Text>
    </>
  ) : null
}

const RenderVersion: Renderer<CellProps<DelegateGroupDetails>> = ({ row }) => {
  return <Text>{row.original?.groupVersion}</Text>
}

const RenderInstanceStatus: Renderer<CellProps<DelegateGroupDetails>> = ({ row }) => {
  const delegate = row.original
  return <Text>{getInstanceStatus(delegate)}</Text>
}

const RenderHeartbeat: Renderer<CellProps<DelegateGroupDetails>> = ({ row }) => {
  const { getString } = useStrings()
  return row.original?.lastHeartBeat ? <ReactTimeago date={row.original?.lastHeartBeat} live /> : getString('na')
}

const RenderConnectivityStatus: Renderer<CellProps<DelegateGroupDetails>> = ({ row }) => {
  const delegate = row.original
  return <DelegateConnectivityStatus delegate={delegate} />
}

const RenderAutoUpgradeColumn: Renderer<CellProps<DelegateGroupDetails>> = ({ row }) => {
  const [autoUpgradeColor, autoUpgradeText] = !row.original?.activelyConnected
    ? []
    : getAutoUpgradeTextColor(row.original?.autoUpgrade)

  return (
    <Text
      background={autoUpgradeColor}
      color={Color.WHITE}
      font={{ variation: FontVariation.TINY_SEMI }}
      className={css.statusText}
      margin={{ right: 'medium' }}
    >
      {autoUpgradeText}
    </Text>
  )
}

const RenderColumnMenu: Renderer<CellProps<DelegateGroupDetails>> = ({ row }) => {
  const delegate = row.original
  const { getString } = useStrings()

  const [menuOpen, setMenuOpen] = useState(false)
  const { showSuccess, showError } = useToaster()
  const { accountId, orgIdentifier, projectIdentifier } = useParams<Record<string, string>>()
  const [troubleshoterOpen, setOpenTroubleshoter] = useState<{ isConnected: boolean | undefined }>()

  const { mutate: forceDeleteDelegate } = useDeleteDelegateGroupByIdentifier({
    queryParams: { accountId: accountId, orgId: orgIdentifier, projectId: projectIdentifier }
  })

  const deleteDelegateDialogContent = (
    <div className={css.breakWord}>
      <Text font={{ variation: FontVariation.BODY }} margin={{ bottom: 'medium' }}>
        {getString('platform.delegates.infoForDeleteDelegate')}
      </Text>
      <Text font={{ variation: FontVariation.BODY }}>
        {getString('platform.delegates.questionForceDeleteDelegate', {
          name: delegate?.groupName
        })}
      </Text>
    </div>
  )

  const forceDeleteDialog = useConfirmationDialog({
    contentText: deleteDelegateDialogContent,
    titleText: getString('delegate.deleteDelegate'),
    confirmButtonText: getString('delete'),
    cancelButtonText: getString('cancel'),
    onCloseDialog: async (isConfirmed: boolean) => {
      /*istanbul ignore next */
      if (isConfirmed) {
        try {
          if (delegate?.delegateGroupIdentifier) {
            const deleted = await forceDeleteDelegate(delegate?.delegateGroupIdentifier)

            if (deleted) {
              /*istanbul ignore next */
              showSuccess(getString('platform.delegates.delegateDeleted', { name: delegate?.groupName }))
            }
          }
        } catch (error) {
          showError(error.data?.responseMessages?.[0].message || error.message)
        }
      }
    }
  })

  const handleForceDelete = (e: React.MouseEvent<HTMLElement, MouseEvent>): void => {
    e.stopPropagation()
    setMenuOpen(false)
    forceDeleteDialog.openDialog()
  }

  return (
    <Layout.Horizontal className={css.itemActionContainer}>
      <Dialog
        isOpen={!!troubleshoterOpen}
        enforceFocus={false}
        style={{ width: '680px', height: '100%' }}
        onClose={() => setOpenTroubleshoter(undefined)}
      >
        <DelegateInstallationError showDelegateInstalledMessage={false} delegateType={delegate?.delegateType} />
      </Dialog>
      <Popover
        isOpen={menuOpen}
        onInteraction={nextOpenState => {
          setMenuOpen(nextOpenState)
        }}
        className={Classes.DARK}
        position={Position.RIGHT_TOP}
      >
        <Button
          variation={ButtonVariation.ICON}
          icon="Options"
          onClick={e => {
            e.stopPropagation()
            setMenuOpen(true)
          }}
          aria-label="delegate menu options"
        />
        <Menu style={{ minWidth: 'unset' }}>
          <RbacMenuItem
            permission={{
              resourceScope: {
                accountIdentifier: accountId,
                orgIdentifier,
                projectIdentifier
              },
              resource: {
                resourceType: ResourceType.DELEGATE,
                resourceIdentifier: delegate.delegateGroupIdentifier
              },
              permission: PermissionIdentifier.VIEW_DELEGATE
            }}
            icon="info-sign"
            text={getString('details')}
          />
          <RbacMenuItem
            permission={{
              resourceScope: {
                accountIdentifier: accountId,
                orgIdentifier,
                projectIdentifier
              },
              resource: {
                resourceType: ResourceType.DELEGATE,
                resourceIdentifier: delegate.delegateGroupIdentifier
              },
              permission: PermissionIdentifier.DELETE_DELEGATE
            }}
            icon="trash"
            text={getString('delete')}
            onClick={handleForceDelete}
          />
          {delegate.delegateType === 'KUBERNETES' && (
            <MenuItem
              text={getString('platform.delegates.openTroubleshooter')}
              onClick={(e: React.MouseEvent) => {
                /*istanbul ignore next */
                e.stopPropagation()
                setOpenTroubleshoter({ isConnected: delegate.activelyConnected })
              }}
              icon="book"
            />
          )}
        </Menu>
      </Popover>
    </Layout.Horizontal>
  )
}

export const DelegateListingItem: React.FC<DelegateProps> = props => {
  const { getString } = useStrings()
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<Record<string, string>>()
  const history = useHistory()

  const [canAccessDelegate] = usePermission(
    {
      resourceScope: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier
      },
      resource: {
        resourceType: ResourceType.DELEGATE
      },
      permissions: [PermissionIdentifier.VIEW_DELEGATE]
    },
    []
  )

  const onDelegateClick = (delegateId: string): void => {
    if (canAccessDelegate) {
      const params = {
        accountId,
        delegateIdentifier: delegateId as string
      }
      if (orgIdentifier) {
        set(params, 'orgIdentifier', orgIdentifier)
      }
      if (projectIdentifier) {
        set(params, 'projectIdentifier', projectIdentifier)
      }
      if (module) {
        set(params, 'module', module)
      }
      history.push(routes.toDelegatesDetails(params))
    }
  }

  const columns = useMemo(() => {
    return [
      {
        Header: '',
        id: 'rowSelectOrExpander',
        width: '3%',
        Cell: ToggleAccordionCell
      },
      {
        Header: '',
        id: 'delegateIcon',
        width: '2%',
        Cell: RenderDelegateIcon
      },
      {
        Header: getString('delegate.DelegateName'),
        id: 'delegateName',
        width: '15%',
        Cell: RenderDelegateName
      },
      {
        Header: getString('connectivityStatus'),
        id: 'connectivityStatus',
        width: '12%',
        Cell: RenderConnectivityStatus
      },
      {
        Header: getString('tagsLabel'),
        id: 'tags',
        width: '20%',
        Cell: RenderTags
      },
      {
        Header: getString('version'),
        id: 'version',
        width: '11%',
        Cell: RenderVersion
      },
      {
        Header: (
          <>
            {getString('platform.delegates.instanceStatus')}{' '}
            <HarnessDocTooltip useStandAlone tooltipId="delegateInstanceStatus" />
          </>
        ),
        id: 'instanceStatus',
        width: '15%',
        Cell: RenderInstanceStatus
      },
      {
        Header: getString('delegate.LastHeartBeat'),
        id: 'heartbeat',
        width: '9%',
        Cell: RenderHeartbeat
      },
      {
        Header: 'Auto Upgrade',
        id: 'autoUpgrade',
        width: '11%',
        Cell: RenderAutoUpgradeColumn
      },
      {
        Header: '',
        id: 'actions',
        width: '2%',
        Cell: RenderColumnMenu
      }
    ]
  }, [])

  const renderRowSubComponent = React.useCallback(
    ({ row }) => (
      <>
        <Layout.Horizontal className={css.podDetailsSeparator}></Layout.Horizontal>
        <DelegateInstanceList row={row}></DelegateInstanceList>
      </>
    ),
    []
  )

  return (
    <Layout.Horizontal width={'100%'}>
      <Table<DelegateGroupDetails>
        columns={columns}
        className={css.instanceTable}
        data={props?.data}
        onRowClick={(row: DelegateGroupDetails) => {
          onDelegateClick(defaultTo(row.delegateGroupIdentifier, ''))
        }}
        renderRowSubComponent={renderRowSubComponent}
        autoResetExpanded={false}
      />
    </Layout.Horizontal>
  )
}
export default DelegateListingItem
