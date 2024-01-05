/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo } from 'react'
import type { Column } from 'react-table'
import { Dialog, TableV2, useToaster, Container } from '@harness/uicore'
import { defaultTo } from 'lodash-es'
import cx from 'classnames'
import {
  GitXWebhookResponse,
  ListGitXWebhookResponseResponse,
  ResponseWithPagination,
  UpdateGitXWebhookResponse,
  UpdateGitxWebhookRefProps,
  deleteGitxWebhookRef
} from '@harnessio/react-ng-manager-client'
import { useModalHook } from '@harness/use-modal'
import { useHistory, useParams } from 'react-router-dom'
import { UseMutateFunction } from '@tanstack/react-query'
import { useStrings } from 'framework/strings'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import routesv1 from '@common/RouteDefinitions'
import routesv2 from '@common/RouteDefinitionsV2'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import {
  Enabled,
  FolderPath,
  GitConnector,
  LastActivity,
  WebhookMenu,
  WebhookName,
  WebhookRepo,
  withWebhook
} from './WebhooksListColumns'
import NewWebhookModal from '../NewWebhookModal'
import { processFolderPaths } from '../utils'
import css from '../Webhooks.module.scss'

export default function WebhooksList({
  response,
  refetch,
  updateWebhook
}: {
  response: ResponseWithPagination<ListGitXWebhookResponseResponse> | undefined
  refetch: () => void
  updateWebhook: UseMutateFunction<
    ResponseWithPagination<UpdateGitXWebhookResponse>,
    unknown,
    UpdateGitxWebhookRefProps,
    unknown
  >
}): JSX.Element {
  const { getString } = useStrings()
  const { getRBACErrorMessage } = useRBACError()
  const { showError, showSuccess } = useToaster()
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const [rowData, setRowData] = React.useState<GitXWebhookResponse>()
  const [editable, setEditable] = React.useState(false)
  const history = useHistory()
  const { isNewNavEnabled: newLeftNav } = useAppStore()
  const routes = newLeftNav ? routesv2 : routesv1
  const [showCreateModal, hideCreateModal] = useModalHook(
    /* istanbul ignore next */ () => {
      const onClosehandler = (): void => {
        hideCreateModal()
        setEditable(false)
        refetch()
      }
      return (
        <Dialog
          isOpen={true}
          enforceFocus={false}
          canEscapeKeyClose
          canOutsideClickClose
          onClose={onClosehandler}
          isCloseButtonShown
          className={cx('padded-dialog', css.dialogStylesWebhook)}
        >
          <Container>
            <NewWebhookModal
              isEdit={editable}
              initialData={{
                name: defaultTo(rowData?.webhook_name, ''),
                identifier: defaultTo(rowData?.webhook_identifier, ''),
                connectorRef: defaultTo(rowData?.connector_ref, ''),
                repo: defaultTo(rowData?.repo_name, ''),
                folderPaths: defaultTo(processFolderPaths(defaultTo(rowData?.folder_paths, [])), [])
              }}
              closeModal={onClosehandler}
            />
          </Container>
        </Dialog>
      )
    },
    [orgIdentifier, projectIdentifier, rowData, editable]
  )

  const handleWebhookEdit = (id: string): void => {
    const dataRow = response?.content?.find(temp => {
      return temp?.webhook_identifier === id
    })
    setEditable(true)
    setRowData(dataRow)
    showCreateModal()
  }
  const handleWebhookDelete = async (name: string, identifier: string): Promise<void> => {
    try {
      await deleteGitxWebhookRef({
        pathParams: {
          'gitx-webhook': identifier,
          org: orgIdentifier,
          project: projectIdentifier
        }
      })
      showSuccess(getString('pipeline.webhooks.deleted', { name: name }))
      refetch()
    } catch (e: any) {
      showError(getRBACErrorMessage(e))
    }
  }

  const handleWebhookEnableToggle = (id: string, enabled: boolean, folderPaths: string[]): void => {
    updateWebhook({
      pathParams: {
        org: orgIdentifier,
        project: projectIdentifier,
        'gitx-webhook': id
      },
      body: {
        is_enabled: enabled,
        folder_paths: folderPaths
      }
    })
  }

  type CustomColumn<T extends Record<string, any>> = Column<T>

  const envColumns: CustomColumn<GitXWebhookResponse>[] = useMemo(
    () => [
      {
        Header: getString('name').toUpperCase(),
        id: 'webhook_name',
        width: '16%',
        Cell: withWebhook(WebhookName)
      },
      {
        Header: getString('platform.connectors.title.gitConnector').toUpperCase(),
        id: 'connector_ref',
        width: '20%',
        Cell: withWebhook(GitConnector)
      },
      {
        Header: getString('pipeline.webhooks.gitRepo').toUpperCase(),
        id: 'repo_name',
        width: '16%',
        Cell: withWebhook(WebhookRepo)
      },
      {
        Header: getString('pipeline.webhooks.trackedFolders').toUpperCase(),
        id: 'folder_paths',
        width: '24%',
        Cell: withWebhook(FolderPath)
      },
      {
        Header: getString('lastActivity').toUpperCase(),
        id: 'lastUpdatedBy',
        width: '14%',
        Cell: withWebhook(LastActivity)
      },
      {
        Header: getString('enabledLabel').toUpperCase(),
        id: 'is_enabled',
        width: '6%',
        Cell: withWebhook(Enabled),
        actions: {
          onToggleEnable: handleWebhookEnableToggle
        }
      },
      {
        id: 'modifiedBy',
        width: '4%',
        Cell: withWebhook(WebhookMenu),
        actions: {
          onEdit: handleWebhookEdit,
          onDelete: handleWebhookDelete
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getString]
  )
  return (
    <TableV2<GitXWebhookResponse>
      columns={envColumns}
      data={response?.content as GitXWebhookResponse[]}
      onRowClick={rowDetails => {
        history.push(
          routes.toWebhooksDetails({
            accountId,
            orgIdentifier,
            projectIdentifier,
            module,
            webhookIdentifier: defaultTo(rowDetails.webhook_identifier, '')
          })
        )
      }}
    />
  )
}
