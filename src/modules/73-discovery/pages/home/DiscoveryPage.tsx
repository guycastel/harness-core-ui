/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, ButtonVariation, Container, ExpandingSearchInput, Layout } from '@harness/uicore'
import { Drawer, Position } from '@blueprintjs/core'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { useStrings } from 'framework/strings'
import { Page } from '@common/exports'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { getLinkForAccountResources } from '@common/utils/BreadcrumbUtils'
import { Scope } from '@common/interfaces/SecretsInterface'
import ScopedTitle from '@common/components/Title/ScopedTitle'
import { ApiGetAgentResponse, useListAgent } from 'services/servicediscovery'
import RbacButton from '@rbac/components/Button/Button'
import DiscoveryAgentTable from '@discovery/components/DiscoveryAgentTable/DiscoveryAgentTable'
import { useQueryParams } from '@common/hooks'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { CommonPaginationQueryParams, useDefaultPaginationProps } from '@common/hooks/useDefaultPaginationProps'
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE } from '@discovery/interface/filters'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import EmptyStateDiscoveryAgent from './views/empty-state/EmptyStateDiscoveryAgent'
import CreateDAgent from './views/create-discovery-agent/CreateDAgent'
import css from './DiscoveryPage.module.scss'

const DiscoveryPage: React.FC = () => {
  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()
  const { getString } = useStrings()
  const discoveryLabel = getString('common.discovery')
  const [search, setSearch] = useState('')
  const [isOpen, setDrawerOpen] = useState(false)
  useDocumentTitle(discoveryLabel)

  //States for pagination
  const { page, size } = useQueryParams<CommonPaginationQueryParams>()
  const { isNewNavEnabled } = useAppStore()

  const {
    data: discoveryAgentList,
    loading: discoveryAgentListLoading,
    refetch: refetchListAgent
  } = useListAgent({
    queryParams: {
      accountIdentifier: accountId,
      organizationIdentifier: orgIdentifier,
      projectIdentifier: projectIdentifier,
      search: search,
      all: false,
      page: page ?? 0,
      limit: size ?? DEFAULT_PAGE_SIZE
    }
  })

  const paginationProps = useDefaultPaginationProps({
    itemCount: discoveryAgentList?.page?.totalItems ?? 0,
    pageCount: discoveryAgentList?.page?.totalPages ?? 1,
    pageIndex: discoveryAgentList?.page?.index ?? DEFAULT_PAGE_INDEX,
    pageSize: discoveryAgentList?.page?.limit ?? DEFAULT_PAGE_SIZE
  })

  const discoveryAgentListData: ApiGetAgentResponse[] = React.useMemo(
    () => discoveryAgentList?.items || [],
    [discoveryAgentList?.items]
  )

  return (
    <Container>
      <Page.Header
        breadcrumbs={
          isNewNavEnabled ? (
            <NGBreadcrumbs />
          ) : (
            <NGBreadcrumbs
              links={getLinkForAccountResources({ accountId, orgIdentifier, projectIdentifier, getString })}
            />
          )
        }
        title={
          <ScopedTitle
            title={{
              [Scope.PROJECT]: discoveryLabel,
              [Scope.ORG]: discoveryLabel,
              [Scope.ACCOUNT]: discoveryLabel
            }}
          />
        }
      />

      <Page.Body loading={discoveryAgentListLoading}>
        {discoveryAgentList && discoveryAgentList.items && discoveryAgentList?.items?.length > 0 ? (
          <>
            <Page.SubHeader>
              <Layout.Horizontal flex={{ justifyContent: 'space-between' }} width={'100%'}>
                <Layout.Horizontal>
                  <RbacButton
                    text={getString('discovery.homepage.newDiscoveryAgentBtn')}
                    variation={ButtonVariation.PRIMARY}
                    icon="plus"
                    onClick={() => setDrawerOpen(true)}
                    permission={{
                      resourceScope: {
                        accountIdentifier: accountId,
                        orgIdentifier,
                        projectIdentifier
                      },
                      resource: {
                        resourceType: ResourceType.NETWORK_MAP
                      },
                      permission: PermissionIdentifier.CREATE_NETWORK_MAP
                    }}
                  />
                </Layout.Horizontal>
                <Container data-name="monitoredServiceSeachContainer">
                  <ExpandingSearchInput
                    width={250}
                    alwaysExpanded
                    throttle={500}
                    defaultValue={search}
                    onChange={value => setSearch(value)}
                    placeholder={getString('discovery.homepage.searchDiscoveryAgent')}
                  />
                </Container>
              </Layout.Horizontal>
            </Page.SubHeader>
            <Page.Body className={css.discoveryAgentTable}>
              <DiscoveryAgentTable
                listData={discoveryAgentListData}
                pagination={paginationProps}
                refetch={refetchListAgent}
              />
            </Page.Body>
          </>
        ) : (
          <EmptyStateDiscoveryAgent setDrawerOpen={setDrawerOpen} />
        )}
      </Page.Body>
      <Drawer position={Position.RIGHT} isOpen={isOpen} isCloseButtonShown={true} size={'86%'}>
        <Button
          minimal
          className={css.almostFullScreenCloseBtn}
          icon="cross"
          withoutBoxShadow
          onClick={() => setDrawerOpen(false)}
        />
        <CreateDAgent setDrawerOpen={setDrawerOpen} refetchDAgent={refetchListAgent} />
      </Drawer>
    </Container>
  )
}

export default DiscoveryPage
