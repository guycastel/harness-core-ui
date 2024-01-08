/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo } from 'react'
import type { Column, Renderer, CellProps } from 'react-table'
import { Text, Layout, Icon, TableV2 } from '@harness/uicore'
import { Color } from '@harness/design-system'
import cx from 'classnames'
import moment from 'moment'
import { useGetEntityMetadata } from '@common/hooks/useGetEntityMetadata'
import type {
  EntityDetail,
  EntityReference,
  EntitySetupUsageDTO,
  ResponsePageEntitySetupUsageDTO,
  SetupUsageDetail
} from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import ResourceDetailFactory from '@common/factories/ResourceDetailFactory'
import { EntityType } from '@common/pages/entityUsage/EntityConstants'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { getScopeLabelfromScope } from '@common/components/EntityReference/EntityReference'
import type { StringKeys } from 'framework/strings'
import { getWindowLocationUrl } from 'framework/utils/WindowLocation'
import { getScopeFromDTO } from '@common/components/MultiSelectEntityReference/MultiSelectEntityReference'
import { Scope } from '@common/interfaces/SecretsInterface'
import css from './EntityUsageList.module.scss'

interface EntityUsageListProps {
  entityData: ResponsePageEntitySetupUsageDTO | null
  gotoPage: (pageNumber: number) => void
  withNoSpaceAroundTable?: boolean
  hidePageNumbers?: boolean
}

interface ReferredByEntity extends EntityDetail {
  entityRef?: EntityReference & { versionLabel?: string }
}
export interface EntitySetupUsageDTOColumnData extends EntitySetupUsageDTO {
  getString?: (key: StringKeys, vars?: Record<string, any>) => string
  enableURLLinkToScope?: boolean
  history?: any
  detail?: SetupUsageDetail
}

const getReferredByEntityName = (referredByEntity?: ReferredByEntity) => {
  if (!referredByEntity) {
    return ''
  }

  if (referredByEntity.type === EntityType.Template && referredByEntity.entityRef?.versionLabel) {
    return `${referredByEntity.name} (${referredByEntity.entityRef.versionLabel})`
  }

  return referredByEntity.name
}
const getReferredByEntityScopeId = (scope: Scope, referredByEntity?: ReferredByEntity) => {
  switch (scope) {
    case Scope.PROJECT:
      return referredByEntity?.entityRef?.projectIdentifier
    case Scope.ORG:
      return referredByEntity?.entityRef?.orgIdentifier
    default:
      return ''
  }
}
const RenderColumnEntity: Renderer<CellProps<EntitySetupUsageDTOColumnData>> = ({ row, column }) => {
  const { isNewNavEnabled } = useAppStore()
  const data = row.original
  const checkReferredByEntityTypeHandler = ResourceDetailFactory.getReferredByEntityTypeHandler(
    data.referredByEntity.type
  )

  const entityData = useGetEntityMetadata({
    detail: data?.detail,
    entityInfo: data.referredByEntity,
    isNewNav: !!isNewNavEnabled
  })

  if (checkReferredByEntityTypeHandler)
    return checkReferredByEntityTypeHandler.getResourceDetailViewAndAction({ referredByEntity: data.referredByEntity })
  else
    return (
      <Layout.Vertical>
        <Text color={Color.BLACK} lineClamp={1} className={css.overflow}>
          <a
            rel="noreferrer"
            className={css.link}
            onClick={async e => {
              e.preventDefault()
              e.stopPropagation()
              const targetUrl = await entityData.getEntityURL()
              window.open(`${getWindowLocationUrl()}${targetUrl}`, '_blank')
            }}
          >
            {getReferredByEntityName(data.referredByEntity)}
          </a>
        </Text>
        <Text color={Color.GREY_400} lineClamp={1} className={css.overflow}>
          {`${(column as any).getString('typeLabel')}: ${data.referredByEntity?.type}`}
        </Text>
      </Layout.Vertical>
    )
}
const RenderColumnDetail: Renderer<CellProps<EntitySetupUsageDTO>> = ({ row }) => {
  const data = row.original
  const chkReferredEntityDetailHandler = ResourceDetailFactory.getReferredEntityUsageDetailTypeHandler(
    data.detail?.type
  )
  if (chkReferredEntityDetailHandler)
    return chkReferredEntityDetailHandler.getResourceDetailViewAndAction({
      referredEntity: data.referredEntity,
      referredByEntity: data.referredByEntity,
      detail: data.detail
    })
  else if (
    data.referredByEntity?.type === (EntityType.Infrastructure as EntityDetail['type']) &&
    data.referredEntity?.type === EntityType.Connectors &&
    data.detail?.environmentName
  )
    return (
      <Text color={Color.GREY_400} lineClamp={1} className={css.overflow}>
        {data.detail.environmentName}
      </Text>
    )
  else return null
}

const RenderColumnActivity: Renderer<CellProps<EntitySetupUsageDTO>> = ({ row }) => {
  const data = row.original
  return (
    <Layout.Horizontal spacing="small">
      {data.createdAt ? moment(data.createdAt).format('MMM DD, YYYY hh:mm a') : null}
    </Layout.Horizontal>
  )
}

export const RenderScope: Renderer<CellProps<EntitySetupUsageDTOColumnData>> = ({ row, column }) => {
  const { isNewNavEnabled } = useAppStore()
  const data = row.original
  const { accountIdentifier, orgIdentifier, projectIdentifier } = data.referredByEntity?.entityRef || {
    accountIdentifier: '',
    orgIdentifier: '',
    projectIdentifier: ''
  }

  const entityData = useGetEntityMetadata({
    entityInfo: data.referredByEntity,
    isNewNav: !!isNewNavEnabled
  })

  const scope = getScopeFromDTO({ accountIdentifier, orgIdentifier, projectIdentifier, identifier: '' })
  const scopeName = getScopeLabelfromScope(scope, (column as any).getString)

  const scopeId = getReferredByEntityScopeId(scope, data.referredByEntity)
  return (
    <Layout.Vertical>
      <Text color={Color.BLACK} lineClamp={1} className={css.overflow}>
        {(column as any).enableURLLinkToScope ? (
          <a
            className={css.link}
            rel="noreferrer"
            onClick={async e => {
              e.preventDefault()
              e.stopPropagation()
              const targetUrl = await entityData.getEntityURL()
              window.open(`${getWindowLocationUrl()}${targetUrl}`, '_blank')
            }}
          >
            {scopeId || scopeName}
          </a>
        ) : (
          <> {scopeId || scopeName}</>
        )}
      </Text>
      {scopeId && (
        <Text color={Color.GREY_400} lineClamp={1} className={css.overflow}>
          {`${(column as any).getString('typeLabel')}: ${scopeName}`}
        </Text>
      )}
    </Layout.Vertical>
  )
}
export const RenderGitDetails: Renderer<CellProps<EntitySetupUsageDTO>> = ({ row }) => {
  const data = row.original

  return data.referredByEntity.entityRef?.branch && data.referredByEntity.entityRef?.repoIdentifier ? (
    <Layout.Horizontal spacing="small">
      <Icon inline name="repository" color={Color.GREY_600}></Icon>
      <Text className={css.gitText} margin={{ right: 'medium' }}>
        {data.referredByEntity.entityRef?.repoIdentifier}
      </Text>

      <Icon inline name="git-new-branch" size={14} color={Color.GREY_600}></Icon>
      <Text className={css.gitText}>{data.referredByEntity.entityRef?.branch}</Text>
    </Layout.Horizontal>
  ) : null
}

const EntityUsageList: React.FC<EntityUsageListProps> = ({
  entityData,
  gotoPage,
  withNoSpaceAroundTable = false,
  hidePageNumbers = false
}) => {
  const data: EntitySetupUsageDTO[] = entityData?.data?.content || []
  const { getString } = useStrings()

  const { isGitSyncEnabled: isGitSyncEnabledForProject, gitSyncEnabledOnlyForFF } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const columns: Column<EntitySetupUsageDTOColumnData>[] = useMemo(
    () => [
      {
        Header: getString('entity'),
        accessor: 'referredByEntity',
        width: isGitSyncEnabled ? '25%' : '30%',
        Cell: RenderColumnEntity,
        getString: getString
      },
      {
        Header: getString('common.gitSync.repoDetails').toUpperCase(),
        accessor: row => row.referredByEntity?.entityRef?.repoIdentifier,
        width: '30%',
        Cell: RenderGitDetails
      },
      {
        Header: getString('details'),
        accessor: 'detail',
        width: isGitSyncEnabled ? '20%' : '30%',
        Cell: RenderColumnDetail
      },
      {
        Header: getString('created'),
        accessor: 'createdAt',
        width: isGitSyncEnabled ? '15%' : '20%',
        Cell: RenderColumnActivity
      },
      {
        Header: getString('common.scopeLabel'),
        width: isGitSyncEnabled ? '10%' : '20%',
        Cell: RenderScope,
        getString: getString,
        enableURLLinkToScope: true
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, isGitSyncEnabled]
  )

  if (!isGitSyncEnabled) {
    columns.splice(1, 1)
  }

  return (
    <TableV2<EntitySetupUsageDTOColumnData>
      className={cx(css.table, withNoSpaceAroundTable ? css.tableWithNoSpace : css.tableWithSpace)}
      columns={columns}
      data={data}
      pagination={{
        itemCount: entityData?.data?.totalItems || 0,
        pageSize: entityData?.data?.pageSize || 10,
        pageCount: entityData?.data?.totalPages || 0,
        pageIndex: entityData?.data?.pageIndex || 0,
        hidePageNumbers: hidePageNumbers,
        gotoPage
      }}
    />
  )
}

export default EntityUsageList
