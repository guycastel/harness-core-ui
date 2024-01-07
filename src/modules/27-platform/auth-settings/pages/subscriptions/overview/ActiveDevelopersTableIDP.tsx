/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo, useState } from 'react'
import type { CellProps, Column, Renderer } from 'react-table'
import { Text, Layout, Card, NoDataCard, SelectOption, PageSpinner, DropDown } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import moment from 'moment'
import { useStrings } from 'framework/strings'
import type { PageActiveServiceDTO, LicenseUsageDTO } from 'services/cd-ng'
import { IDPActiveDevelopersDTO } from 'services/idp'
import type { SortBy } from './types'
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, tableV2, NameHeader } from './ServiceLicenseTable'
import pageCss from '../SubscriptionsPage.module.scss'

export interface ActiveDevelopersTableIDPProps {
  data: PageActiveServiceDTO
  gotoPage: (pageNumber: number) => void
  setSortBy: (sortBy: string[]) => void
  sortBy: string[]
  updateFilters: (developerId: SelectOption | undefined) => void
  servicesLoading: boolean
}

type CellType = Renderer<CellProps<IDPActiveDevelopersDTO>>

const DeveloperNameCell: CellType = ({ row }) => {
  const data = row.original
  return (
    <Text color={Color.GREY_900} font={{ size: 'small' }} lineClamp={1}>
      {data.name}
    </Text>
  )
}

const LastAccessedCell: CellType = ({ row }) => {
  const data = row.original
  return (
    <Text color={Color.GREY_900} font={{ size: 'small' }} lineClamp={1}>
      {moment(data.lastAccessedAt).format('MM-DD-YYYY')}
    </Text>
  )
}

export function ActiveDevelopersTableIDP({
  data,
  gotoPage,
  sortBy,
  setSortBy,
  updateFilters,
  servicesLoading
}: ActiveDevelopersTableIDPProps): React.ReactElement {
  const { getString } = useStrings()
  const {
    content = [],
    totalElements = 0,
    totalPages = 0,
    number = DEFAULT_PAGE_INDEX,
    size = DEFAULT_PAGE_SIZE
  } = data
  const [currentSort, currentOrder] = sortBy
  const [query, setQuery] = useState<string>()

  const columns: Column<LicenseUsageDTO>[] = useMemo(() => {
    function getServerSortProps(id: string): {
      enableServerSort: boolean
      isServerSorted: boolean
      isServerSortedDesc: boolean
      getSortedColumn: ({ sort }: SortBy) => void
    } {
      return {
        enableServerSort: true,
        isServerSorted: currentSort === id,
        isServerSortedDesc: currentOrder === 'ASC',
        getSortedColumn: ({ sort }: SortBy) => {
          setSortBy([sort, currentOrder === 'ASC' ? 'DESC' : 'ASC'])
        }
      }
    }
    return [
      {
        Header: NameHeader(getString, 'common.purpose.developer'),
        accessor: 'name',
        width: '50%',
        disableSortBy: true,
        Cell: DeveloperNameCell
      },

      {
        Header: NameHeader(getString, 'idp.lastAccessedAt'),
        accessor: 'lastAccessedAt',
        width: '50%',
        Cell: LastAccessedCell,
        serverSortProps: getServerSortProps('common.lastAccessedAt')
      }
    ] as unknown as Column<LicenseUsageDTO>[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder, currentSort])

  const [selectedDeveloper, setSelectedDeveloper] = useState<SelectOption | undefined>()

  return (
    <Card className={pageCss.outterCard}>
      <Layout.Vertical spacing="xxlarge" flex={{ alignItems: 'stretch' }}>
        <Layout.Horizontal
          spacing="small"
          flex={{ justifyContent: 'space-between' }}
          width={'100%'}
        ></Layout.Horizontal>
        <Layout.Horizontal spacing="small" flex={{ justifyContent: 'flex-end' }} width={'100%'}>
          <DropDown
            className={pageCss.orgDropdown}
            buttonTestId="developer-select"
            onChange={developer => {
              setSelectedDeveloper(developer)
            }}
            value={selectedDeveloper?.value as string}
            items={content.map(el => ({ label: el.name, value: el.identifier })) as SelectOption[]}
            usePortal={true}
            addClearBtn={true}
            query={query}
            onQueryChange={setQuery}
            placeholder={getString('common.subscriptions.usage.developers')}
          />
          <Text
            className={pageCss.fetchButton}
            font={{ variation: FontVariation.LEAD }}
            color={Color.PRIMARY_7}
            onClick={() => {
              updateFilters(selectedDeveloper)
            }}
          >
            {getString('update')}
          </Text>
        </Layout.Horizontal>

        {servicesLoading && <PageSpinner />}

        {content.length > 0 ? (
          tableV2(columns, content, totalElements, size, totalPages, number, gotoPage)
        ) : (
          <NoDataCard
            message={getString('common.noActiveDeveloperData')}
            className={pageCss.noDataCard}
            containerClassName={pageCss.noDataCardContainer}
          />
        )}
      </Layout.Vertical>
    </Card>
  )
}
