/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { TableV2, PaginationProps } from '@harness/uicore'
import { defaultTo } from 'lodash-es'
import { Column } from 'react-table'
import { useServiceOverridesContext } from '@cd/components/ServiceOverrides/context/ServiceOverrideContext'
import { useUpdateQueryParams } from '@common/hooks'
import { useDefaultPaginationProps } from '@common/hooks/useDefaultPaginationProps'
import { PageQueryParams } from '@common/constants/Pagination'
import { PageServiceOverridesResponseDTOV2, ResponseServiceOverridesResponseDTOV2 } from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import type { StringsMap } from 'stringTypes'
import { ServiceOverrideSectionProps, ServiceOverridesTab } from '@cd/components/ServiceOverrides/ServiceOverridesUtils'
import { OverrideBaseEntityCell } from '@cd/components/ServiceOverrides/components/OverridesCollapsibleTable/OverrideBaseEntityCell'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { ToggleAccordionCell } from './ToggleAccordionCell'
import { SectionActionsCell } from './SectionActionsCell'
import { OverrideSpecDetailsSection } from './OverrideSpecDetailsSection'
import { OverridesCodeSourceCell } from './OverridesCodeSourceCell'
import css from './OverridesCollapsibleTable.module.scss'

const SVC_OVERRIDES_DEFAULT_PAGE_INDEX = 0

interface RowConfig {
  value: string
  accessor: string
}

export const serviceOverridesTableHeaderConfig: Record<ServiceOverridesTab, RowConfig[]> = {
  ENV_GLOBAL_OVERRIDE: [
    {
      value: 'environment',
      accessor: 'environmentRef'
    }
  ],
  ENV_SERVICE_OVERRIDE: [
    {
      value: 'environment',
      accessor: 'environmentRef'
    },
    {
      value: 'service',
      accessor: 'serviceRef'
    }
  ],
  INFRA_GLOBAL_OVERRIDE: [
    {
      value: 'environment',
      accessor: 'environmentRef'
    },
    {
      value: 'infrastructureText',
      accessor: 'infraIdentifier'
    }
  ],
  INFRA_SERVICE_OVERRIDE: [
    {
      value: 'environment',
      accessor: 'environmentRef'
    },
    {
      value: 'infrastructureText',
      accessor: 'infraIdentifier'
    },
    {
      value: 'service',
      accessor: 'serviceRef'
    }
  ]
}

export interface RemoteOverrideMetadata {
  isLoading?: boolean
  remoteOverrideResponse?: ResponseServiceOverridesResponseDTOV2
}

export function OverridesCollapsibleTable(): React.ReactElement {
  const { serviceOverrideResponse, serviceOverrideType, listSectionItems, expandedRows, setExpandedRows } =
    useServiceOverridesContext()
  const { totalItems, pageSize, totalPages, pageIndex } = serviceOverrideResponse as PageServiceOverridesResponseDTOV2
  const { updateQueryParams } = useUpdateQueryParams<Partial<PageQueryParams>>()
  const { CDS_OVERRIDES_GITX: isGitXEnabledForOverrides } = useFeatureFlags()
  const [remoteOverrideMetadataMap, setRemoteOverrideMetadataMap] = React.useState<Map<string, RemoteOverrideMetadata>>(
    new Map<string, RemoteOverrideMetadata>()
  )

  const handlePageIndexChange = (index: number): void => updateQueryParams({ page: index })

  const paginationProps = useDefaultPaginationProps({
    itemCount: defaultTo(totalItems, 0),
    pageSize: defaultTo(pageSize, 0),
    pageCount: defaultTo(totalPages, 0),
    pageIndex: defaultTo(pageIndex, 0),
    gotoPage: handlePageIndexChange,
    onPageSizeChange: newSize => updateQueryParams({ page: SVC_OVERRIDES_DEFAULT_PAGE_INDEX, size: newSize })
  }) as PaginationProps

  const { getString } = useStrings()

  const tableHeaderConfig = serviceOverridesTableHeaderConfig[serviceOverrideType] as RowConfig[]

  const processedHeaderConfigList = React.useMemo(
    () =>
      tableHeaderConfig.map((headerConfig: RowConfig) => ({
        Header: getString(headerConfig.value as keyof StringsMap).toUpperCase(),
        accessor: headerConfig.accessor,
        Cell: OverrideBaseEntityCell,
        width: '300px',
        headerConfigAccessKey: headerConfig.accessor
      })),
    [tableHeaderConfig]
  )

  const columns = React.useMemo(() => {
    return [
      {
        Header: '',
        id: 'rowSelectOrExpander',
        Cell: ToggleAccordionCell,
        width: '5%',
        disableSortBy: true,
        expandedRows,
        setExpandedRows,
        setRemoteOverrideMetadataMap
      },
      ...processedHeaderConfigList,
      ...(isGitXEnabledForOverrides
        ? [
            {
              Header: getString('pipeline.codeSource'),
              accessor: 'storeType',
              disableSortBy: true,
              Cell: OverridesCodeSourceCell,
              width: '10%',
              setExpandedRows,
              remoteOverrideMetadataMap,
              setRemoteOverrideMetadataMap
            }
          ]
        : []),
      {
        Header: '',
        id: 'sectionActions',
        Cell: SectionActionsCell,
        width: '20%',
        disableSortBy: true
      }
    ]
  }, [expandedRows, processedHeaderConfigList, isGitXEnabledForOverrides, getString])

  const renderRowSubComponent = React.useCallback(
    ({ row }) => <OverrideSpecDetailsSection row={row} remoteOverrideMetadataMap={remoteOverrideMetadataMap} />,
    [remoteOverrideMetadataMap]
  )

  return (
    <TableV2<ServiceOverrideSectionProps>
      className={css.overridesCollapsibleTable}
      columns={columns as Column<ServiceOverrideSectionProps>[]}
      data={listSectionItems}
      pagination={paginationProps}
      renderRowSubComponent={renderRowSubComponent}
      autoResetExpanded={false}
      getRowClassName={row => (row.original.isNew || row.original.isEdit ? css.newOrEditableRow : '')}
    />
  )
}
