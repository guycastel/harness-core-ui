/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  ButtonSize,
  ButtonVariation,
  Container,
  ModalDialog,
  Page,
  useToggleOpen,
  Pagination,
  Layout,
  ExpandingSearchInput
} from '@harness/uicore'
import { find, get, isEmpty, defaultTo } from 'lodash-es'
import { useStrings } from 'framework/strings'

import { InfrastructureResponse, useGetInfrastructure, useGetInfrastructureList } from 'services/cd-ng'

import type { EnvironmentPathProps, ProjectPathProps, EnvironmentQueryParams } from '@common/interfaces/RouteInterfaces'
import { ContainerSpinner } from '@common/components/ContainerSpinner/ContainerSpinner'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import RbacButton from '@rbac/components/Button/Button'
import { InfraDefinitionDetailsDrawer } from '@cd/components/EnvironmentsV2/EnvironmentDetails/InfrastructureDefinition/InfraDefinitionDetailsDrawer/InfraDefinitionDetailsDrawer'
import { useInfrastructureUnsavedChanges } from '@cd/hooks/useInfrastructureUnsavedChanges'
import { useTemplateSelector } from 'framework/Templates/TemplateSelectorContext/useTemplateSelector'
import { getScopeFromDTO } from '@common/components/EntityReference/EntityReference.types'
import { useDefaultPaginationProps } from '@common/hooks/useDefaultPaginationProps'
import { PageQueryParams, PAGE_TEMPLATE_DEFAULT_PAGE_INDEX } from '@common/constants/Pagination'
import { DEFAULT_PAGE_INDEX } from '@pipeline/utils/constants'
import { useRbacQueryParamOptions } from '@rbac/utils/utils'
import InfrastructureList from './InfrastructureList/InfrastructureList'
import InfrastructureModal from './InfrastructureModal'

import css from './InfrastructureDefinition.module.scss'

// TODO: To be removed once pagination and search support is available for Infrastructure Definitions
// Ticket - https://harness.atlassian.net/browse/CDS-86868
// const DEFAULT_PAGE_SIZE_FOR_INFRASTRUCTURES = 1000

export default function InfrastructureDefinition({ isEnvPage }: { isEnvPage: boolean }): JSX.Element {
  const { accountId, orgIdentifier, projectIdentifier, environmentIdentifier } = useParams<
    ProjectPathProps & EnvironmentPathProps
  >()
  const { getString } = useStrings()
  const { getRBACErrorMessage } = useRBACError()
  const [selectedInfrastructure, setSelectedInfrastructure] = useState<string>('')

  const { isInfraUpdated, updatedInfrastructure, handleInfrastructureUpdate, openUnsavedChangesDiffModal } =
    useInfrastructureUnsavedChanges({ selectedInfrastructure })
  const queryParamOptions = useRbacQueryParamOptions()
  const { page: page, size: size } = useQueryParams(queryParamOptions)
  const { updateQueryParams } = useUpdateQueryParams<Partial<PageQueryParams>>()

  const [infraSaveInProgress, setInfraSaveInProgress] = useState<boolean>(false)
  const {
    isOpen: isInfraDefinitionDetailsOpen,
    close: closeInfraDefinitionDetails,
    open: openInfraDefinitionDetails
  } = useToggleOpen(false)

  const {
    infrastructureId,
    infraStoreType,
    infraConnectorRef,
    infraRepoName,
    infraBranch = ''
  } = useQueryParams<EnvironmentQueryParams>()
  const [searchTerm, setSearchTerm] = useState<string>('')

  const { data, loading, error, refetch } = useGetInfrastructureList({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      environmentIdentifier,
      page: page ? page - 1 : DEFAULT_PAGE_INDEX,
      size,
      searchTerm
    }
  })
  const scopeFromDTO = getScopeFromDTO({ accountId, orgIdentifier, projectIdentifier })

  const { getTemplate } = useTemplateSelector()
  const onClose = (): void => {
    setSelectedInfrastructure('')
    closeInfraDefinitionDetails()
  }

  const gitQueryParams =
    infraStoreType === 'REMOTE'
      ? {
          connectorRef: infraConnectorRef,
          repoName: infraRepoName,
          ...(infraBranch ? { branch: infraBranch } : { loadFromFallbackBranch: true })
        }
      : {}

  const infrastructureFetchDetails = useGetInfrastructure({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      environmentIdentifier,
      ...gitQueryParams
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } },
    infraIdentifier: infrastructureId as string,
    lazy: isEmpty(infrastructureId) || infraStoreType === 'INLINE'
  })

  useEffect(() => {
    let preSelectedInfrastructureYaml
    if (
      infraStoreType === 'REMOTE' &&
      infrastructureFetchDetails?.data?.data?.infrastructure?.identifier === infrastructureId
    ) {
      preSelectedInfrastructureYaml = infrastructureFetchDetails?.data?.data?.infrastructure?.yaml
    } else {
      preSelectedInfrastructureYaml = get(
        find(
          data?.data?.content,
          (infraDetails: InfrastructureResponse) => infraDetails.infrastructure?.identifier === infrastructureId
        ),
        'infrastructure.yaml'
      )
    }

    if (preSelectedInfrastructureYaml) {
      setSelectedInfrastructure(preSelectedInfrastructureYaml)
    }
  }, [data?.data?.content, infrastructureId, infrastructureFetchDetails?.data?.data?.infrastructure])

  useEffect(() => {
    if (selectedInfrastructure) {
      openInfraDefinitionDetails()
    }
  }, [selectedInfrastructure, openInfraDefinitionDetails, handleInfrastructureUpdate])

  const handlePageIndexChange = /* istanbul ignore next */ (index: number): void =>
    updateQueryParams({ page: index + 1 })

  const paginationProps = useDefaultPaginationProps({
    itemCount: defaultTo(data?.data?.totalItems, 0),
    pageSize: defaultTo(data?.data?.pageSize, 0),
    pageCount: defaultTo(data?.data?.totalPages, 0),
    pageIndex: defaultTo(data?.data?.pageIndex, 0),
    gotoPage: handlePageIndexChange,
    onPageSizeChange: newSize => updateQueryParams({ page: PAGE_TEMPLATE_DEFAULT_PAGE_INDEX, size: newSize })
  })

  return (
    <>
      <Container padding={{ left: 'medium', right: 'medium' }}>
        {loading ? (
          <ContainerSpinner />
        ) : error ? (
          <Page.Error>{getRBACErrorMessage(error)}</Page.Error>
        ) : (
          <>
            <Layout.Horizontal flex={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <RbacButton
                text={getString('pipelineSteps.deploy.infrastructure.infraDefinition')}
                font={{ weight: 'bold' }}
                icon="plus"
                onClick={openInfraDefinitionDetails}
                size={ButtonSize.SMALL}
                variation={ButtonVariation.LINK}
                permission={{
                  resource: {
                    resourceType: ResourceType.ENVIRONMENT,
                    resourceIdentifier: environmentIdentifier
                  },
                  resourceScope: {
                    accountIdentifier: accountId,
                    orgIdentifier,
                    projectIdentifier
                  },
                  permission: PermissionIdentifier.EDIT_ENVIRONMENT
                }}
              />
              <ExpandingSearchInput
                alwaysExpanded
                width={200}
                placeholder={getString('search')}
                onChange={
                  /* istanbul ignore next */ text => {
                    setSearchTerm(text?.trim())
                    updateQueryParams({ page: 0 })
                  }
                }
                defaultValue={searchTerm}
              />
            </Layout.Horizontal>
            <InfrastructureList
              list={data?.data?.content}
              showModal={openInfraDefinitionDetails}
              refetch={refetch}
              setSelectedInfrastructure={setSelectedInfrastructure}
            />
            <Pagination {...paginationProps} />
          </>
        )}
        {selectedInfrastructure ? (
          <InfraDefinitionDetailsDrawer
            isDrawerOpened={isInfraDefinitionDetailsOpen}
            onCloseDrawer={onClose}
            selectedInfrastructure={selectedInfrastructure}
            scope={scopeFromDTO}
            environmentIdentifier={environmentIdentifier}
            refetch={refetch}
            getTemplate={getTemplate}
            setInfraSaveInProgress={setInfraSaveInProgress}
            infraSaveInProgress={infraSaveInProgress}
            isInfraUpdated={isInfraUpdated}
            openUnsavedChangesDiffModal={openUnsavedChangesDiffModal}
            handleInfrastructureUpdate={handleInfrastructureUpdate}
            updatedInfra={updatedInfrastructure}
            infrastructureFetchDetails={infraStoreType === 'REMOTE' ? infrastructureFetchDetails : undefined}
            isSingleEnv
          />
        ) : (
          <ModalDialog
            isOpen={isInfraDefinitionDetailsOpen}
            isCloseButtonShown
            canEscapeKeyClose
            canOutsideClickClose
            enforceFocus={false}
            onClose={onClose}
            title={getString('cd.infrastructure.createNew')}
            width={1128}
            height={840}
            className={css.dialogStyles}
          >
            <InfrastructureModal
              hideModal={onClose}
              refetch={refetch}
              environmentIdentifier={environmentIdentifier}
              selectedInfrastructure={selectedInfrastructure}
              getTemplate={getTemplate}
              scope={scopeFromDTO}
              isSingleEnv={isEnvPage}
            />
          </ModalDialog>
        )}
      </Container>
    </>
  )
}
