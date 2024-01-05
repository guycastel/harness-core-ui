/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
import React, { useContext, useMemo, useState } from 'react'
import {
  Container,
  ExpandingSearchInput,
  Icon,
  IconName,
  Layout,
  PageError,
  PageSpinner,
  TableV2,
  Text,
  FormInput,
  SelectOption
} from '@harness/uicore'
import { useHistory } from 'react-router-dom'
import type { CellProps, Column, Renderer } from 'react-table'
import { Color } from '@harness/design-system'
import ReactTimeago from 'react-timeago'
import { FileStoreContext } from '@filestore/components/FileStoreContext/FileStoreContext'
import { useStrings } from 'framework/strings'
import { EntityDetail, EntitySetupUsageDTO, Error, useGetReferencedBy } from 'services/cd-ng'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import {
  EntitySetupUsageDTOColumnData,
  RenderScope
} from '@common/pages/entityUsage/views/EntityUsageListView/EntityUsageList'
import { useGetEntityMetadata } from '@common/hooks/useGetEntityMetadata'
import css from './ReferencedBy.module.scss'

export const getIconByType = (type: EntityDetail['type'] | undefined): IconName => {
  switch (type) {
    case 'Pipelines':
      return 'pipeline-ng'
    case 'Connectors':
      return 'connectors-blue'
    case 'Template':
      return 'templates-blue'
    default:
      return 'cog'
  }
}

export default function ReferencedBy(): React.ReactElement {
  const { currentNode, queryParams } = useContext(FileStoreContext)
  const [searchTerm, setSearchTerm] = useState<string | undefined>()
  const [page, setPage] = useState(0)

  const { isNewNavEnabled } = useAppStore()

  const history = useHistory()

  const {
    data: referencesResponse,
    loading,
    error,
    refetch
  } = useGetReferencedBy({
    identifier: currentNode.identifier,
    queryParams: {
      ...queryParams,
      searchTerm,
      pageIndex: page,
      pageSize: 10
    },
    debounce: 300
  })

  const data: EntitySetupUsageDTO[] = useMemo(
    () => referencesResponse?.data?.content || [],
    [referencesResponse?.data?.content]
  )
  const { getString } = useStrings()
  const optionItems: SelectOption[] = [{ label: getString('entity'), value: 'Entity' }]
  const [filter, setFilter] = useState<SelectOption>({
    label: getString('entity'),
    value: 'Entity'
  })
  const RenderColumnEntity: Renderer<CellProps<EntitySetupUsageDTO>> = ({ row }) => {
    const entity = row.original.referredByEntity

    return (
      <Layout.Horizontal>
        {entity?.type && (
          <Icon name={getIconByType(entity?.type)} size={28} margin={{ top: 'xsmall', right: 'small' }} />
        )}
        <Layout.Vertical>
          <Layout.Horizontal spacing="small" width={230}>
            <Text color={Color.BLACK} lineClamp={1}>
              {entity?.name || ''}
            </Text>
          </Layout.Horizontal>
          <Text color={Color.GREY_600} font={{ size: 'small' }} width={230} lineClamp={2}>
            ({entity?.type})
          </Text>
        </Layout.Vertical>
      </Layout.Horizontal>
    )
  }

  const RenderColumnActivity: Renderer<CellProps<EntitySetupUsageDTO>> = ({ row }) => {
    const createdAt = row.original.createdAt
    return createdAt ? (
      <Layout.Horizontal spacing="small" color={Color.GREY_600}>
        <ReactTimeago date={createdAt} />
      </Layout.Horizontal>
    ) : null
  }

  const columns: Column<EntitySetupUsageDTOColumnData>[] = useMemo(
    () => [
      {
        Header: getString('entity'),
        accessor: row => row.referredByEntity?.name,
        id: 'entity',
        width: '40%',
        Cell: RenderColumnEntity
      },
      {
        Header: getString('lastActivity'),
        accessor: row => row.createdAt,
        id: 'activity',
        width: '40%',
        Cell: RenderColumnActivity
      },
      {
        Header: getString('common.scopeLabel'),
        width: '20%',
        Cell: RenderScope,
        getString: getString
      }
    ],
    [getString]
  )

  const { overrideEntityInfo } = useGetEntityMetadata({
    entityInfo: {},
    isNewNav: !!isNewNavEnabled
  })

  return (
    <>
      <Layout.Horizontal flex className={css.header}>
        <Container className={css.referenceByFilter}>
          <FormInput.Select
            value={filter}
            items={optionItems}
            name="filter"
            onChange={e => {
              setFilter(e)
            }}
          />
        </Container>

        <ExpandingSearchInput
          alwaysExpanded
          onChange={text => {
            setSearchTerm(text.trim())
            setPage(0)
          }}
          width={250}
        />
      </Layout.Horizontal>

      {loading ? (
        <div style={{ position: 'relative', height: 'calc(100vh - 128px)' }}>
          <PageSpinner />
        </div>
      ) : error ? (
        <div style={{ paddingTop: '200px' }}>
          <PageError
            message={(error.data as Error)?.message || error.message}
            onClick={/* istanbul ignore next */ () => refetch()}
          />
        </div>
      ) : !referencesResponse?.data?.empty ? (
        <TableV2<EntitySetupUsageDTOColumnData>
          className={css.table}
          columns={columns}
          data={data}
          name="ReferenceByView"
          onRowClick={async node => {
            if (node?.referredByEntity?.entityRef?.identifier) {
              const targetUrl = await overrideEntityInfo({
                entityInfo: node.referredByEntity,
                isNewNav: !!isNewNavEnabled
              })
              if (targetUrl) {
                history.push(targetUrl)
              }
            }
          }}
          pagination={{
            itemCount: referencesResponse?.data?.totalItems || 0,
            pageSize: referencesResponse?.data?.pageSize || 10,
            pageCount: referencesResponse?.data?.totalPages || -1,
            pageIndex: referencesResponse?.data?.pageIndex || 0,
            gotoPage: setPage
          }}
        />
      ) : (
        <Container flex={{ align: 'center-center' }} padding="xxlarge">
          No Data
        </Container>
      )}
    </>
  )
}
