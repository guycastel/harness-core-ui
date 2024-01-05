/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { ExpandingSearchInput, Layout, Container, ButtonVariation, Pagination } from '@harness/uicore'
import { Page } from '@common/exports'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { OrganizationAggregateDTO, useGetOrganizationAggregateDTOList, Error } from 'services/cd-ng'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { DEFAULT_PAGE_SIZE_OPTION } from '@modules/10-common/constants/Pagination'
import { useOrganizationModal } from '@projects-orgs/modals/OrganizationModal/useOrganizationModal'
import { OrganizationCard } from '@projects-orgs/components/OrganizationCard/OrganizationCard'
import { useCollaboratorModal } from '@projects-orgs/modals/ProjectModal/useCollaboratorModal'
import { useStrings } from 'framework/strings'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import type { AccountPathProps } from '@common/interfaces/RouteInterfaces'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import RbacButton from '@rbac/components/Button/Button'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { FeatureIdentifier } from 'framework/featureStore/FeatureIdentifier'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import css from './OrganizationsPage.module.scss'

interface OrganizationsPageProps {
  onOrgClick?: (org: OrganizationAggregateDTO) => void
}

const OrganizationsPage: React.FC<OrganizationsPageProps> = ({ onOrgClick }) => {
  const { accountId } = useParams<AccountPathProps>()
  const [searchParam, setSearchParam] = useState<string>()
  const [page, setPage] = useState(0)
  const { isNewNavEnabled } = useAppStore()
  const history = useHistory()
  const { getString } = useStrings()
  useDocumentTitle(getString('orgsText'))
  const { loading, data, refetch, error } = useGetOrganizationAggregateDTOList({
    queryParams: {
      accountIdentifier: accountId,
      searchTerm: searchParam,
      pageIndex: page,
      pageSize: DEFAULT_PAGE_SIZE_OPTION
    },
    debounce: 300
  })
  const { openOrganizationModal } = useOrganizationModal({
    onSuccess: () => refetch()
  })
  const { openCollaboratorModal } = useCollaboratorModal()

  React.useEffect(() => {
    setPage(0)
  }, [searchParam])

  const newOrgButton = (): JSX.Element => (
    <RbacButton
      variation={ButtonVariation.PRIMARY}
      icon="plus"
      text={getString('projectsOrgs.newOrganization')}
      onClick={() => openOrganizationModal()}
      permission={{
        permission: PermissionIdentifier.CREATE_ORG,
        resource: {
          resourceType: ResourceType.ORGANIZATION
        }
      }}
      featuresProps={{
        featuresRequest: {
          featureNames: [FeatureIdentifier.MULTIPLE_ORGANIZATIONS]
        }
      }}
    />
  )

  return (
    <>
      <Page.Header breadcrumbs={<NGBreadcrumbs />} title={getString('orgsText')} />
      <Page.Header
        title={<Layout.Horizontal padding="small">{newOrgButton()}</Layout.Horizontal>}
        toolbar={
          <ExpandingSearchInput
            alwaysExpanded
            placeholder={getString('projectsOrgs.searchPlaceHolder')}
            onChange={text => {
              setSearchParam(text.trim())
            }}
            className={css.search}
            width={320}
          />
        }
      />
      <Page.Body
        loading={loading}
        error={(error?.data as Error)?.message || error?.message}
        retryOnError={() => refetch()}
        noData={
          !searchParam
            ? {
                when: () => !data?.data?.content?.length,
                icon: 'nav-dashboard',
                message: getString('projectsOrgs.noDataMessage'),
                button: newOrgButton()
              }
            : {
                when: () => !data?.data?.content?.length,
                icon: 'nav-dashboard',
                message: getString('projectsOrgs.noOrganizations')
              }
        }
      >
        <Container className={css.masonry}>
          <Layout.Masonry
            center
            gutter={20}
            items={data?.data?.content || []}
            renderItem={(org: OrganizationAggregateDTO) => (
              <OrganizationCard
                data={org}
                editOrg={() => openOrganizationModal(org.organizationResponse.organization)}
                inviteCollab={() =>
                  openCollaboratorModal({ orgIdentifier: org.organizationResponse.organization.identifier })
                }
                reloadOrgs={() => refetch()}
                onClick={() => {
                  if (onOrgClick) {
                    onOrgClick(org)
                  } else {
                    history.push(
                      isNewNavEnabled
                        ? routesV2.toProjects({ orgIdentifier: org.organizationResponse.organization.identifier })
                        : routes.toOrganizationDetails({
                            orgIdentifier: org.organizationResponse.organization.identifier as string,
                            accountId
                          })
                    )
                  }
                }}
              />
            )}
            keyOf={(org: OrganizationAggregateDTO) => org.organizationResponse.organization.identifier as string}
          />
        </Container>
        <Container className={css.pagination}>
          <Pagination
            itemCount={data?.data?.totalItems || 0}
            pageSize={data?.data?.pageSize || 10}
            pageCount={data?.data?.totalPages || 0}
            pageIndex={data?.data?.pageIndex || 0}
            gotoPage={(pageNumber: number) => setPage(pageNumber)}
          />
        </Container>
      </Page.Body>
    </>
  )
}

export default OrganizationsPage
