/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ButtonVariation,
  Layout,
  ExpandingSearchInput,
  Button,
  ListHeader,
  sortByCreated,
  sortByLastModified,
  sortByName,
  SortMethod
} from '@harness/uicore'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'

import RbacButton from '@rbac/components/Button/Button'
import { useStrings } from 'framework/strings'

import { Page } from '@common/exports'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { getLinkForAccountResources } from '@common/utils/BreadcrumbUtils'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import type { CommonPaginationQueryParams } from '@common/hooks/useDefaultPaginationProps'
import ScopedTitle from '@common/components/Title/ScopedTitle'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { COMMON_DEFAULT_PAGE_SIZE } from '@common/constants/Pagination'
import { Scope } from '@common/interfaces/SecretsInterface'
import useCreateEditVariableModal from '@variables/modals/CreateEditVariableModal/useCreateEditVariableModal'
import { VARIABLES_DEFAULT_PAGE_INDEX, VARIABLES_DEFAULT_PAGE_SIZE } from '@variables/utils/VariablesUtils'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { useGetVariablesList } from 'services/cd-ng'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import { PAGE_NAME } from '@common/pages/pageContext/PageName'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import VariableListView from './views/VariableListView'
import css from './VariablesPage.module.scss'

const VariablesPage: React.FC = () => {
  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps & ModulePathParams>()
  const { getString } = useStrings()
  const variableLabel = getString('common.variables')
  const [searchTerm, setSearchTerm] = useState<string | undefined>()
  const { PL_NEW_PAGE_SIZE } = useFeatureFlags()
  const { isNewNavEnabled } = useAppStore()
  const { preference: sortPreference = SortMethod.LastModifiedDesc, setPreference: setSortPreference } =
    usePreferenceStore<SortMethod>(PreferenceScope.USER, `sort-${PAGE_NAME.VariablesPage}`)
  const {
    page: pageIndex = VARIABLES_DEFAULT_PAGE_INDEX,
    size: pageSize = PL_NEW_PAGE_SIZE ? COMMON_DEFAULT_PAGE_SIZE : VARIABLES_DEFAULT_PAGE_SIZE
  } = useQueryParams<CommonPaginationQueryParams>()
  const { updateQueryParams } = useUpdateQueryParams<CommonPaginationQueryParams>()

  useDocumentTitle(variableLabel)

  const {
    data: variableResponse,
    loading,
    error,
    refetch
  } = useGetVariablesList({
    queryParams: {
      pageIndex,
      pageSize,
      projectIdentifier,
      orgIdentifier,
      accountIdentifier: accountId,
      searchTerm,
      sortOrders: [sortPreference]
    },
    queryParamStringifyOptions: { arrayFormat: 'repeat' }
  })

  const { openCreateUpdateVariableModal } = useCreateEditVariableModal({
    onSuccess: refetch
  })

  return (
    <>
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
              [Scope.PROJECT]: variableLabel,
              [Scope.ORG]: variableLabel,
              [Scope.ACCOUNT]: variableLabel
            }}
          />
        }
      />

      {variableResponse?.data?.content?.length || searchTerm || loading || error ? (
        <Layout.Horizontal flex className={css.header}>
          <Layout.Horizontal spacing="small">
            <RbacButton
              variation={ButtonVariation.PRIMARY}
              text={getString('platform.variables.newVariable')}
              icon="plus"
              id="newVariableBtn"
              data-test="newVariableButton"
              onClick={() => openCreateUpdateVariableModal()}
              permission={{
                permission: PermissionIdentifier.EDIT_VARIABLE,
                resource: {
                  resourceType: ResourceType.VARIABLE
                }
              }}
            />
          </Layout.Horizontal>
          <ExpandingSearchInput
            alwaysExpanded
            onChange={text => {
              setSearchTerm(text.trim())
              updateQueryParams({ page: 0 })
            }}
            width={250}
          />
        </Layout.Horizontal>
      ) : null}

      <Page.Body
        className={css.listBody}
        loading={loading}
        retryOnError={() => refetch()}
        error={(error?.data as Error)?.message || error?.message}
        noData={{
          when: () => !variableResponse?.data?.content?.length,
          message: !searchTerm
            ? getString('platform.variables.noVariableExist', {
                resourceName: projectIdentifier ? 'project' : orgIdentifier ? 'organization' : 'account'
              })
            : getString('platform.variables.noVariableFound'),
          button: !searchTerm ? (
            <Button
              icon="plus"
              text={getString('platform.variables.newVariable')}
              variation={ButtonVariation.PRIMARY}
              onClick={() => openCreateUpdateVariableModal()}
            />
          ) : undefined
        }}
      >
        <ListHeader
          selectedSortMethod={sortPreference}
          sortOptions={[...sortByLastModified, ...sortByCreated, ...sortByName]}
          onSortMethodChange={option => {
            setSortPreference(option.value as SortMethod)
          }}
          totalCount={variableResponse?.data?.totalItems}
        />
        <VariableListView
          variables={variableResponse?.data}
          refetch={refetch}
          openCreateUpdateVariableModal={openCreateUpdateVariableModal}
        />
      </Page.Body>
    </>
  )
}

export default VariablesPage
