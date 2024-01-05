/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo, useState } from 'react'
import type { Column, Renderer, CellProps } from 'react-table'
import {
  Text,
  Layout,
  TableV2,
  MultiSelectDropDown,
  Container,
  Pagination,
  NoDataCard,
  MultiSelectOption,
  ExpandingSearchInput
} from '@harness/uicore'
import { defaultTo, get, isEmpty, isEqual } from 'lodash-es'
import { useParams } from 'react-router-dom'
import { Color } from '@harness/design-system'
import cx from 'classnames'
import moment from 'moment'
import { EntityType } from '@common/pages/entityUsage/EntityConstants'
import { useGetEntityMetadata } from '@common/hooks/useGetEntityMetadata'
import {
  EntityDetail,
  EntityReference,
  Activity,
  ResponsePageActivity,
  useGetUniqueReferredByEntities,
  ResponsePageEntitySetupUsageDTO
} from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import { getScopeLabelfromScope } from '@common/components/EntityReference/EntityReference'
import type { StringKeys } from 'framework/strings'
import { getScopeFromDTO } from '@common/components/MultiSelectEntityReference/MultiSelectEntityReference'
import { Scope } from '@common/interfaces/SecretsInterface'
import { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useDefaultPaginationProps } from '@common/hooks/useDefaultPaginationProps'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import {
  useGetSecretRuntimeUsageQueryParams,
  getScopeSelectOptions,
  getOnlyValueTypeArray,
  pageSize,
  routeToEntityUrl,
  filterData,
  usageTypeToLabelMap
} from '../../utils'
import css from '../EntityUsageListView/EntityUsageList.module.scss'

interface RuntimeUsageListProps {
  entityData: ResponsePageActivity | null
  gotoPage: (pageNumber: number) => void
  withNoSpaceAroundTable?: boolean
  setSearchTerm(searchValue: string): void
  setPage(page: number): void
  apiReturnProps: {
    data?: ResponsePageEntitySetupUsageDTO | ResponsePageActivity | null
    loading: boolean
    error: unknown
    /* eslint-disable @typescript-eslint/no-explicit-any */
    refetch: any
  }
}

interface ReferredByEntity extends EntityDetail {
  entityRef?: EntityReference & { versionLabel?: string }
}
export interface RuntimeSetupUsageDTOColumnData extends Activity {
  getString?: (key: StringKeys) => string
  enableURLLinkToScope?: boolean
}
const getReferredByEntityName = (referredByEntity?: ReferredByEntity): string | undefined => {
  if (!referredByEntity) {
    return ''
  }

  return referredByEntity?.name || referredByEntity?.entityRef?.identifier || referredByEntity?.type
}
const getReferredByEntityScopeId = (scope: Scope, referredByEntity?: ReferredByEntity): string | undefined => {
  switch (scope) {
    case Scope.PROJECT:
      return referredByEntity?.entityRef?.projectIdentifier
    case Scope.ORG:
      return referredByEntity?.entityRef?.orgIdentifier
    default:
      return ''
  }
}
const RenderColumnEntity: Renderer<CellProps<RuntimeSetupUsageDTOColumnData>> = ({ row }) => {
  const { getString } = useStrings()

  const { isNewNavEnabled } = useAppStore()
  const data = row.original.detail

  const entityData = useGetEntityMetadata({
    entityInfo: data?.referredByEntity,
    isNewNav: !!isNewNavEnabled
  })
  const entityName = get(data, 'referredByEntity', '')
  const entityType = get(data, 'referredByEntity.type', '')
  return (
    <Layout.Vertical>
      <Text color={Color.BLACK} lineClamp={1}>
        <a
          rel="noreferrer noopener"
          className={css.link}
          onClick={async e => {
            e.preventDefault()
            e.stopPropagation()
            const targetUrl = await entityData.getEntityURL()
            routeToEntityUrl(targetUrl)
          }}
        >
          {getReferredByEntityName(entityName)}
        </a>
      </Text>
      <Text color={Color.GREY_400} lineClamp={1} className={css.overflow}>
        {`${getString('typeLabel')}: ${entityType}`}
      </Text>
    </Layout.Vertical>
  )
}

const RenderColumnEvent: Renderer<CellProps<Activity>> = ({ row }) => {
  const data = row.original.detail
  const usageDetail = get(data, 'usageDetail', {})
  return usageTypeToLabelMap(usageDetail)
}

const RenderColumnActivity: Renderer<CellProps<Activity>> = ({ row }) => {
  const data = row.original
  return (
    <Layout.Horizontal spacing="small">
      {data?.activityTime ? moment(data?.activityTime).format('MMM DD, YYYY hh:mm a') : null}
    </Layout.Horizontal>
  )
}

export const RenderScope: Renderer<CellProps<RuntimeSetupUsageDTOColumnData>> = ({ row }) => {
  const { getString } = useStrings()

  const { isNewNavEnabled } = useAppStore()
  const data = row.original.detail
  const { accountIdentifier, orgIdentifier, projectIdentifier } = data?.referredByEntity?.entityRef || {
    accountIdentifier: '',
    orgIdentifier: '',
    projectIdentifier: ''
  }

  const entityData = useGetEntityMetadata({
    entityInfo: data?.referredByEntity,
    isNewNav: !!isNewNavEnabled
  })

  const scope = getScopeFromDTO({ accountIdentifier, orgIdentifier, projectIdentifier, identifier: '' })
  const scopeName = getScopeLabelfromScope(scope, getString)
  const scopeId = getReferredByEntityScopeId(scope, data?.referredByEntity)
  return (
    <Layout.Vertical>
      <Text color={Color.BLACK} lineClamp={1} className={css.overflow}>
        <a
          className={css.link}
          rel="noreferrer noopener"
          onClick={async e => {
            e.preventDefault()
            e.stopPropagation()
            const targetUrl = await entityData.getEntityURL()
            routeToEntityUrl(targetUrl)
          }}
        >
          {scopeId || scopeName}
        </a>
      </Text>
      {scopeId && (
        <Text color={Color.GREY_400} lineClamp={1} className={css.overflow}>
          {`${getString('typeLabel')}: ${scopeName}`}
        </Text>
      )}
    </Layout.Vertical>
  )
}

const RuntimeUsageList: React.FC<RuntimeUsageListProps> = ({
  entityData,
  withNoSpaceAroundTable = false,
  apiReturnProps: { refetch, loading: runtimeUsageLoading }
}) => {
  const { accountId } = useParams<ProjectPathProps>()
  const [searchTerm, setSearchTerm] = useState<string | undefined>()
  const [page, setPage] = useState(0)
  const [pageContentSize, setPageContentSize] = useState(pageSize)

  const paginationProps = useDefaultPaginationProps({
    itemCount: entityData?.data?.totalElements || 0,
    pageSize: pageContentSize,
    pageCount: entityData?.data?.totalPages || 1,
    pageIndex: page
  })

  const {
    data: entityListData,
    loading,
    error
  } = useGetUniqueReferredByEntities({
    queryParams: {
      referredEntityType: EntityType.Secrets,
      accountIdentifier: accountId,
      activityTypes: ['ENTITY_USAGE']
    },
    queryParamStringifyOptions: {
      arrayFormat: 'repeat'
    }
  })

  const [entityFilterItemsValue, setEntityFiterItemsValue] = useState<Array<MultiSelectOption>>([])
  const [entityFilterItemsParam, setEntityFiterItemsParam] = useState<Array<string>>([])
  const [scopeFilterValue, setScopeFilterValue] = useState<Array<MultiSelectOption>>([])
  const [scopeFilterParam, setScopeFilterParam] = useState<Array<string>>([])

  const listActivityQueryParams = {
    ...useGetSecretRuntimeUsageQueryParams(page, searchTerm, pageContentSize),
    scopeFilter: [...scopeFilterParam],
    referredByEntityType: [...entityFilterItemsParam]
  }

  const handleFilterChange = (
    entityParams: string[],
    entityValue: MultiSelectOption[],
    items: MultiSelectOption[],
    filterType: 'scope' | 'entity'
  ): void => {
    const entityValueFieldItemsWithOnlyValueType = getOnlyValueTypeArray(entityValue)
    if (!isEqual(entityParams, entityValueFieldItemsWithOnlyValueType)) {
      // istanbul ignore else
      if (filterType === 'entity') {
        setEntityFiterItemsParam(entityValueFieldItemsWithOnlyValueType)
      }
      if (filterType === 'scope') {
        setScopeFilterParam(entityValueFieldItemsWithOnlyValueType)
      }

      refetch({
        queryParams: {
          ...listActivityQueryParams,
          ...filterData(filterType, items)
        },
        queryParamStringifyOptions: {
          arrayFormat: 'repeat'
        }
      })
    }
  }

  const entityFilterListItems: MultiSelectOption[] | undefined = useMemo(() => {
    if (!loading && !isEmpty(entityListData?.data?.entityTypeList)) {
      return entityListData?.data?.entityTypeList?.map(item => ({ label: item, value: item }))
    } else return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, entityListData?.data?.entityTypeList])

  const data: RuntimeSetupUsageDTOColumnData[] = defaultTo(entityData?.data?.content, [])
  const { getString } = useStrings()

  const columns: Column<RuntimeSetupUsageDTOColumnData>[] = useMemo(
    () => [
      { Header: getString('common.secret.event'), width: '30%', Cell: RenderColumnEvent },
      {
        Header: getString('entity'),
        width: '30%',
        Cell: RenderColumnEntity
      },
      {
        Header: getString('common.scopeLabel'),
        width: '20%',
        Cell: RenderScope
      },
      {
        Header: getString('common.secret.timestamp'),
        width: '20%',
        Cell: RenderColumnActivity
      }
    ],
    [getString]
  )
  return (
    <>
      <Layout.Horizontal className={css.secretRuntimeUsageHeader}>
        <Layout.Horizontal>
          <MultiSelectDropDown
            value={entityFilterItemsValue}
            placeholder={getString('entity')}
            items={defaultTo(entityFilterListItems, [])}
            onChange={val => {
              setEntityFiterItemsValue(val)
            }}
            usePortal
            onPopoverClose={
              /* istanbul ignore next */ items => {
                handleFilterChange(entityFilterItemsParam, entityFilterItemsValue, items, 'entity')
              }
            }
          />
          <MultiSelectDropDown
            disabled={runtimeUsageLoading}
            className={css.scopeDropdown}
            placeholder={getString('common.scopeLabel')}
            value={scopeFilterValue}
            items={getScopeSelectOptions(getString)}
            onChange={item => {
              setScopeFilterValue(item)
            }}
            onPopoverClose={
              /* istanbul ignore next */ items => {
                handleFilterChange(scopeFilterParam, scopeFilterValue, items, 'scope')
              }
            }
            usePortal
          />
        </Layout.Horizontal>
        <Layout.Horizontal>
          <ExpandingSearchInput
            alwaysExpanded
            onChange={text => {
              setPage(0)
              setSearchTerm(text.trim())
              refetch({
                queryParams: {
                  ...listActivityQueryParams,
                  searchTerm: text.trim()
                }
              })
            }}
            width={350}
          />
        </Layout.Horizontal>
      </Layout.Horizontal>
      {data && !loading && !error && (
        <Layout.Vertical>
          <TableV2<RuntimeSetupUsageDTOColumnData>
            className={cx(css.table, withNoSpaceAroundTable ? css.tableWithNoSpace : css.tableWithSpace)}
            columns={columns}
            data={data}
          />
          {data.length > 0 && (
            <Container className={css.dataContainer}>
              <Pagination
                {...paginationProps}
                onPageSizeChange={size => {
                  setPageContentSize(size)
                  refetch({ queryParams: { ...listActivityQueryParams, pageSize: size, pageIndex: 0 } })
                }}
                gotoPage={(index: number) => {
                  setPage(index)
                  refetch({ queryParams: { ...listActivityQueryParams, pageIndex: index, pageSize: pageContentSize } })
                }}
              />
            </Container>
          )}
        </Layout.Vertical>
      )}
      {isEmpty(data) && !loading && !error && searchTerm && (
        <NoDataCard message={getString('common.secret.noSecretRuntimeUsageOnQuery')} />
      )}
      {isEmpty(data) && !loading && !error && !searchTerm && (
        <NoDataCard message={getString('common.secret.noSecretRuntimeUsageData')} />
      )}
    </>
  )
}

export default RuntimeUsageList
