/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Layout, Popover, Text, Switch, useConfirmationDialog, Button } from '@harness/uicore'
import ReactTimeago from 'react-timeago'
import { Color, Intent } from '@harness/design-system'
import { GitXWebhookResponse } from '@harnessio/react-ng-manager-client'
import { Classes, Menu, PopoverInteractionKind, Position } from '@blueprintjs/core'
import { defaultTo } from 'lodash-es'
import { useStrings } from 'framework/strings'
import RbacMenuItem from '@rbac/components/MenuItem/MenuItem'
import css from './WebhooksList.module.scss'

interface WebhookRowColumn {
  row: { original: GitXWebhookResponse }
  column: {
    actions: {
      onEdit: (identifier: string) => void
      onDelete: (identifier: string) => void
    }
  }
}

export function withWebhook(Component: any) {
  // eslint-disable-next-line react/display-name
  return (props: WebhookRowColumn) => {
    return <Component {...props.row.original} {...props.column.actions} />
  }
}

export function WebhookName({
  webhook_name: name,
  webhook_identifier: identifier
}: {
  webhook_name: string
  webhook_identifier: string
}): JSX.Element {
  const { getString } = useStrings()

  return (
    <Layout.Vertical>
      <Text color={Color.BLACK} lineClamp={1}>
        {name}
      </Text>
      <Text color={Color.GREY_500} font={{ size: 'small' }} lineClamp={1}>
        {getString('common.ID')}: {identifier}
      </Text>
    </Layout.Vertical>
  )
}

export function GitConnector({ connector_ref: gitConnector }: { connector_ref: string }): JSX.Element {
  return (
    <Text color={Color.BLACK} lineClamp={1}>
      {gitConnector}
    </Text>
  )
}

export function FolderPath({ folder_paths: folderPath }: { folder_paths: string[] }): JSX.Element {
  const popoverDisplayCount = folderPath.length - 2
  const _folderPaths = [...folderPath].slice(2)

  return (
    <Layout.Vertical>
      {folderPath?.[0] && (
        <Text color={Color.BLACK} lineClamp={1} margin={{ bottom: 'small' }}>
          {folderPath[0]}
        </Text>
      )}
      {folderPath?.[1] && (
        <Text color={Color.BLACK} lineClamp={1} margin={{ bottom: 'small' }}>
          {folderPath[1]}
        </Text>
      )}
      <div className={css.folderPathTooltip}>
        {popoverDisplayCount > 0 && (
          <Text
            tooltip={
              <Layout.Vertical padding={'medium'}>
                {_folderPaths.map((path: string) => {
                  return (
                    <Text color={Color.WHITE} lineClamp={1} key={path} className={css.folderPathTooltipContent}>
                      {path}
                    </Text>
                  )
                })}
              </Layout.Vertical>
            }
            tooltipProps={{
              isDark: true,
              interactionKind: PopoverInteractionKind.HOVER,
              position: Position.BOTTOM
            }}
            background={Color.GREY_100}
            color={Color.BLACK}
            inline
            alwaysShowTooltip
            padding={{ left: 'small', top: 'xsmall', right: 'small', bottom: 'xsmall' }}
          >
            {`+ ${popoverDisplayCount}`}
          </Text>
        )}
      </div>
    </Layout.Vertical>
  )
}

export function LastActivity({ lastUpdatedAt }: { lastUpdatedAt: number }): JSX.Element {
  return (
    <Layout.Vertical spacing={'small'}>
      <ReactTimeago date={lastUpdatedAt} />
    </Layout.Vertical>
  )
}

export function Enabled({ is_enabled: enabled }: { is_enabled: boolean }): JSX.Element {
  return (
    <Switch
      label=""
      checked={enabled}
      // disabled={ TODO handle the disable case here }
      onChange={() => {
        // handle the enabled webhook onChange here
      }}
    />
  )
}

export function WebhookMenu({
  webhook_identifier,
  onEdit,
  onDelete
}: {
  webhook_identifier: string
  onEdit: (identifier: string) => void
  onDelete: (identifier: string) => void
}): React.ReactElement {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const { getString } = useStrings()

  const { openDialog } = useConfirmationDialog({
    titleText: getString('cd.webhooks.delete'),
    contentText: getString('cd.webhooks.deleteConfirmation'),
    confirmButtonText: getString('delete'),
    cancelButtonText: getString('cancel'),
    intent: Intent.DANGER,
    buttonIntent: Intent.DANGER,
    onCloseDialog: async (isConfirmed: boolean) => {
      /* istanbul ignore else */
      if (isConfirmed) {
        onDelete(webhook_identifier)
      }
      setMenuOpen(false)
    }
  })

  const handleEdit = (event: React.MouseEvent): void => {
    event.stopPropagation()
    onEdit(defaultTo(webhook_identifier, ''))
    setMenuOpen(false)
  }

  const handleDelete = (event: React.MouseEvent): void => {
    event.stopPropagation()
    openDialog()
    setMenuOpen(false)
  }

  return (
    <Layout.Horizontal style={{ justifyContent: 'flex-end' }}>
      <Popover isOpen={menuOpen} onInteraction={setMenuOpen} className={Classes.DARK} position={Position.LEFT}>
        <Button
          minimal
          style={{
            transform: 'rotate(90deg)'
          }}
          icon="more"
          onClick={e => {
            e.stopPropagation()
            setMenuOpen(true)
          }}
        />
        <Menu style={{ minWidth: 'unset' }}>
          <RbacMenuItem icon="edit" text={getString('edit')} onClick={handleEdit} />
          <RbacMenuItem icon="trash" text={getString('delete')} onClick={handleDelete} />
        </Menu>
      </Popover>
    </Layout.Horizontal>
  )
}