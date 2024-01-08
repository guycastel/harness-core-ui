/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { defaultTo } from 'lodash-es'
import { Container, ExpandingSearchInput, Layout, PageBody, PageHeader } from '@harness/uicore'
import type { Error, ResponsePageActivity, ResponsePageEntitySetupUsageDTO } from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import EntityUsageList from './views/EntityUsageListView/EntityUsageList'
import RuntimeUsageList from './views/RuntimeUsageView/RuntimeUsageList'
import css from './EntityUsage.module.scss'

export enum UsageType {
  RUNTIME = 'RUNTIME'
}

export interface EntityUsageListingPageProps {
  withSearchBarInPageHeader: boolean
  hidePageNumbers?: boolean
  pageHeaderClassName?: string
  pageBodyClassName?: string
  searchTerm?: string
  setSearchTerm(searchValue: string): void
  setPage(page: number): void
  usageType?: UsageType
  apiReturnProps: {
    data: ResponsePageEntitySetupUsageDTO | ResponsePageActivity | null
    loading: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    refetch: any
  }
}

export default function EntityUsageListingPage({
  withSearchBarInPageHeader,
  hidePageNumbers = false,
  pageHeaderClassName,
  pageBodyClassName,
  searchTerm,
  setSearchTerm,
  setPage,
  apiReturnProps: { data, loading, error, refetch },
  usageType
}: EntityUsageListingPageProps): React.ReactElement {
  const { getString } = useStrings()
  const isUsageRuntime: boolean = usageType === UsageType.RUNTIME
  // For Secret Runtime Usage we are using RuntimeUsageList component so the default component added in PageBody should render only Non - Secret Runtime Usage
  const shouldDisplayNonUsageRuntimeData: boolean = !data?.data?.content?.length && !isUsageRuntime

  return (
    <>
      {withSearchBarInPageHeader && (
        <PageHeader
          className={cx(css.secondHeader, defaultTo(pageHeaderClassName, ''))}
          size="standard"
          title={undefined}
          toolbar={
            <Container>
              <Layout.Horizontal>
                <ExpandingSearchInput
                  alwaysExpanded
                  onChange={text => {
                    setPage(0)
                    setSearchTerm(text.trim())
                  }}
                  className={css.search}
                  width={350}
                />
              </Layout.Horizontal>
            </Container>
          }
        />
      )}
      <PageBody
        loading={loading}
        retryOnError={() => refetch()}
        className={pageBodyClassName}
        error={(error?.data as Error)?.message || error?.message}
        noData={
          !searchTerm
            ? {
                when: () => shouldDisplayNonUsageRuntimeData,
                icon: 'nav-project',
                message: getString('common.noRefData')
              }
            : {
                when: () => shouldDisplayNonUsageRuntimeData,
                icon: 'nav-project',
                message: getString('entityReference.noRecordFound')
              }
        }
      >
        {withSearchBarInPageHeader ? (
          isUsageRuntime ? (
            <RuntimeUsageList
              apiReturnProps={{ data, loading, error, refetch }}
              setPage={setPage}
              setSearchTerm={setSearchTerm}
              entityData={data as ResponsePageActivity}
              gotoPage={setPage}
            />
          ) : (
            <EntityUsageList
              entityData={data as ResponsePageEntitySetupUsageDTO}
              gotoPage={pageNumber => setPage(pageNumber)}
              hidePageNumbers={hidePageNumbers}
            />
          )
        ) : (
          <Layout.Vertical>
            {!isUsageRuntime ? (
              <ExpandingSearchInput
                alwaysExpanded
                onChange={text => {
                  setPage(0)
                  setSearchTerm(text.trim())
                }}
                className={css.searchNotinHeader}
                width={350}
              />
            ) : null}
            {isUsageRuntime ? (
              <RuntimeUsageList
                apiReturnProps={{ data, loading, error, refetch }}
                setPage={setPage}
                setSearchTerm={setSearchTerm}
                entityData={data as ResponsePageActivity}
                gotoPage={setPage}
                withNoSpaceAroundTable={!withSearchBarInPageHeader}
              />
            ) : (
              <EntityUsageList
                entityData={data as ResponsePageEntitySetupUsageDTO}
                gotoPage={pageNumber => setPage(pageNumber)}
                withNoSpaceAroundTable={!withSearchBarInPageHeader}
                hidePageNumbers={hidePageNumbers}
              />
            )}
          </Layout.Vertical>
        )}
      </PageBody>
    </>
  )
}
