/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback } from 'react'
import { cloneDeep } from 'lodash-es'
import copy from 'clipboard-copy'
import type { Renderer, CellProps } from 'react-table'
import { useParams } from 'react-router-dom'
import { Container, Icon, Layout, Text, NoDataCard, TableV2, useToaster } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { useStrings } from 'framework/strings'
import type { ChangeSourceDTO } from 'services/cv'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import WebhookIcon from '@cv/assets/webhook.svg'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import ContextMenuActions from '@cv/components/ContextMenuActions/ContextMenuActions'
import { getChangeCategory } from '@cv/utils/CommonUtils'
import type { ChangeSourceTableInterface } from './ChangeSourceTable.types'
import { ChangeSourceTypes, CustomChangeSourceList } from '../ChangeSourceDrawer/ChangeSourceDrawer.constants'
import { getIconBySource } from '../ChangeSource.utils'
import css from './ChangeSourceTable.module.scss'

export default function ChangeSourceTable({ value, onSuccess, onEdit }: ChangeSourceTableInterface): JSX.Element {
  const tableData = cloneDeep(value)
  const { getString } = useStrings()

  const { projectIdentifier } = useParams<ProjectPathProps>()

  const deleteChangeSource = useCallback(
    async (selectedRow: ChangeSourceDTO): Promise<void> => {
      const updatedChangeSources = tableData?.filter(changeSource => changeSource.identifier !== selectedRow.identifier)
      await onSuccess(updatedChangeSources as ChangeSourceDTO[])
    },
    [tableData]
  )

  const RenderName: Renderer<CellProps<ChangeSourceDTO>> = ({ row }): JSX.Element => {
    const rowdata = row?.original
    return (
      <Layout.Horizontal spacing={'small'}>
        <Icon
          className={css.sourceTypeIcon}
          name={getIconBySource(rowdata?.type as ChangeSourceDTO['type'])}
          size={22}
        />
        <Text>{rowdata?.name}</Text>
      </Layout.Horizontal>
    )
  }

  const RenderType: Renderer<CellProps<ChangeSourceDTO>> = ({ row }): JSX.Element => {
    const rowdata = row?.original
    return (
      <Layout.Horizontal spacing={'small'}>
        <Text>{getChangeCategory(rowdata?.category, getString)}</Text>
      </Layout.Horizontal>
    )
  }

  const RenderContextMenu = ({ rowdata }: { rowdata: ChangeSourceDTO }): JSX.Element => (
    <Layout.Horizontal flex={{ justifyContent: 'space-between' }}>
      <ContextMenuActions
        titleText={getString('cv.admin.activitySources.dialogDeleteTitle')}
        contentText={getString('cv.changeSource.deleteChangeSourceWarning') + `: ${rowdata.identifier}`}
        onDelete={async () => await deleteChangeSource(rowdata)}
        onEdit={() => {
          onEdit({ isEdit: true, tableData, rowdata, onSuccess })
        }}
        RbacPermissions={{
          edit: {
            permission: PermissionIdentifier.EDIT_MONITORED_SERVICE,
            resource: {
              resourceType: ResourceType.MONITOREDSERVICE,
              resourceIdentifier: projectIdentifier
            }
          },
          delete: {
            permission: PermissionIdentifier.DELETE_MONITORED_SERVICE,
            resource: {
              resourceType: ResourceType.MONITOREDSERVICE,
              resourceIdentifier: projectIdentifier
            }
          }
        }}
      />
    </Layout.Horizontal>
  )

  const RenderWebHookAndContextMenu: Renderer<CellProps<ChangeSourceDTO>> = ({ row }) => {
    const rowdata = row?.original
    const { spec, type } = rowdata
    const { showSuccess } = useToaster()
    const isCustomChangeSource = CustomChangeSourceList.includes(type as ChangeSourceTypes)
    return (
      <Layout.Horizontal flex={{ justifyContent: 'space-between' }}>
        {isCustomChangeSource ? (
          <Layout.Horizontal spacing={'small'} flex={{ justifyContent: 'flex-start', alignItems: 'center' }}>
            <img src={WebhookIcon} />
            <Text
              font={{ variation: FontVariation.SMALL }}
              color={Color.PRIMARY_7}
              tooltip={<Container padding="small">{getString('cv.copyURL')}</Container>}
              onClick={e => {
                e.stopPropagation()
                copy(spec?.webhookUrl)
                showSuccess(getString('cv.urlCopied'), 3000)
              }}
            >
              {getString('triggers.copyAsUrl')}
            </Text>
            <Text
              font={{ variation: FontVariation.SMALL }}
              color={Color.PRIMARY_7}
              tooltip={<Container padding="small">{getString('cv.copycURL')}</Container>}
              onClick={e => {
                e.stopPropagation()
                copy(spec?.webhookCurlCommand)
                showSuccess(getString('cv.cURLCopied'), 3000)
              }}
            >
              {getString('cv.onboarding.changeSourceTypes.Custom.copyCURL')}
            </Text>
          </Layout.Horizontal>
        ) : (
          getString('na')
        )}
        <RenderContextMenu rowdata={rowdata} />
      </Layout.Horizontal>
    )
  }

  return (
    <>
      <Text className={css.tableTitle} tooltipProps={{ dataTooltipId: 'changeSourceTable' }}>
        {getString('cv.navLinks.adminSideNavLinks.activitySources')}
      </Text>
      {tableData?.length ? (
        <TableV2
          className={css.changeSourceTableWrapper}
          sortable={true}
          onRowClick={rowdata => {
            onEdit({ isEdit: true, tableData, rowdata, onSuccess })
          }}
          columns={[
            {
              Header: getString('name'),
              accessor: 'name',
              width: '30%',
              Cell: RenderName
            },
            {
              Header: getString('typeLabel'),
              accessor: 'category',
              width: '27%',
              Cell: RenderType
            },
            {
              Header: 'WebHook',
              width: '43%',
              Cell: RenderWebHookAndContextMenu
            }
          ]}
          data={tableData}
        />
      ) : (
        <Container className={css.noData}>
          <NoDataCard icon={'join-table'} message={getString('cv.changeSource.noChangeSource')} />
        </Container>
      )}
    </>
  )
}
