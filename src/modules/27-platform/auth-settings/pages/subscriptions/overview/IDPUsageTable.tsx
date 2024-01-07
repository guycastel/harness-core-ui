/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { SelectOption } from '@harness/uicore'
import type { ModuleLicenseDTO } from 'services/cd-ng'
import { useUpdateQueryParams, useQueryParams, useMutateAsGet } from '@common/hooks'
import { usePreferenceStore, PreferenceScope } from 'framework/PreferenceStore/PreferenceStoreContext'
import type { AccountPathProps } from '@common/interfaces/RouteInterfaces'
import { queryParamDecodeAll } from '@common/hooks/useQueryParams'
import type { ModuleName } from 'framework/types/ModuleName'
import { ListIDPActiveDevelopersQueryParams, useListIDPActiveDevelopers } from 'services/idp'
import { ActiveDevelopersTableIDP } from './ActiveDevelopersTableIDP'

interface IDPUsageTableProps {
  module: ModuleName
  licenseData?: ModuleLicenseDTO
  licenseType?: 'SERVICES' | 'SERVICE_INSTANCES'
}
const DEFAULT_ACTIVE_SERVICE_LIST_TABLE_SORT = ['lastAccessedAt', 'DESC']
const DEFAULT_PAGE_INDEX = 0
const DEFAULT_PAGE_SIZE = 10
type ProcessedCIUsageServiceListPageQueryParams = RequiredPick<
  ListIDPActiveDevelopersQueryParams,
  'page' | 'size' | 'sort'
>
const queryParamOptions = {
  parseArrays: true,
  decoder: queryParamDecodeAll(),
  processQueryParams(params: ListIDPActiveDevelopersQueryParams): ProcessedCIUsageServiceListPageQueryParams {
    return {
      ...params,
      page: params.page ?? DEFAULT_PAGE_INDEX,
      size: params.size ?? DEFAULT_PAGE_SIZE,
      sort: params.sort ?? DEFAULT_ACTIVE_SERVICE_LIST_TABLE_SORT
    }
  }
}

const IDPUsageTable: React.FC<IDPUsageTableProps> = () => {
  const { updateQueryParams } = useUpdateQueryParams<Partial<ListIDPActiveDevelopersQueryParams>>()
  const { accountId } = useParams<AccountPathProps>()
  const { preference: sortingPreference, setPreference: setSortingPreference } = usePreferenceStore<string | undefined>(
    PreferenceScope.USER,
    'IDPUsageTableSortPreference'
  )
  const queryParams = useQueryParams<ListIDPActiveDevelopersQueryParams>(queryParamOptions)
  const { page, size } = queryParams

  const [userIdentifier, setUserIdentifier] = useState<string>('')
  const sort = useMemo(
    () => (sortingPreference ? JSON.parse(sortingPreference) : queryParams.sort),
    [queryParams.sort, sortingPreference]
  )
  const { data: activeDevelopersList, loading } = useMutateAsGet(useListIDPActiveDevelopers, {
    queryParams: {
      accountIdentifier: accountId,
      page,
      sort,
      size
    },
    body: {
      userIdentifier: userIdentifier
    },
    queryParamStringifyOptions: { arrayFormat: 'comma' }
  })

  function updateFilters(developerId: SelectOption | undefined): void {
    setUserIdentifier(developerId?.value as string)
  }

  return (
    <ActiveDevelopersTableIDP
      gotoPage={pageNumber => updateQueryParams({ page: pageNumber })}
      data={activeDevelopersList?.data || {}}
      setSortBy={sortArray => {
        setSortingPreference(JSON.stringify(sortArray))
        updateQueryParams({ sort: sortArray })
      }}
      sortBy={sort}
      updateFilters={updateFilters}
      servicesLoading={loading}
    />
  )
}

export default IDPUsageTable
