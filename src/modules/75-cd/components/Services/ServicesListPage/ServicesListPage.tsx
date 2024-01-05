/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Layout,
  Views,
  VisualYamlSelectedView as SelectedView,
  Container,
  GridListToggle,
  useToaster,
  Heading,
  ButtonVariation,
  ExpandingSearchInput,
  ExpandingSearchInputHandle,
  ModalDialog
} from '@harness/uicore'
import { useHistory, useParams } from 'react-router-dom'
import { useModalHook } from '@harness/use-modal'
import { defaultTo, isEmpty } from 'lodash-es'
import { useServiceStore } from '@cd/components/Services/common'
import { useStrings } from 'framework/strings'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import RepoFilter from '@common/components/RepoFilter/RepoFilter'
import { Page } from '@common/exports'
import RbacButton from '@rbac/components/Button/Button'
import {
  ServiceResponseDTO,
  useGetServiceList,
  ServiceResponse,
  useGetSettingValue,
  useGetRepositoryList,
  useGetSettingsList
} from 'services/cd-ng'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import routes from '@common/RouteDefinitions'
import { useGetCommunity, useGetFreeOrCommunityCD } from '@common/utils/utils'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { SettingType } from '@common/constants/Utils'
import { NewEditServiceModal } from '@cd/components/PipelineSteps/DeployServiceStep/NewEditServiceModal'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import { SortOption } from '@common/components/SortOption/SortOption'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import serviceEmptyStateSvg from '@cd/icons/ServiceDetailsEmptyState.svg'
import GetStartedWithCDButton from '@pipeline/components/GetStartedWithCDButton/GetStartedWithCDButton'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import type { Sort, SortFields } from '@common/utils/listUtils'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import routesV2 from '@common/RouteDefinitionsV2'
import { getDefaultStoreTypeFromSettings, getSettingValue } from '@modules/27-platform/default-settings/utils/utils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import ServicesGridView from '../ServicesGridView/ServicesGridView'
import ServicesListView from '../ServicesListView/ServicesListView'
import {
  ServicesQueryParams,
  SERVICES_DEFAULT_PAGE_INDEX,
  ServiceTabs,
  useServicesQueryParamOptions,
  getRemoteServiceQueryParams
} from '../utils/ServiceUtils'
import css from './ServicesListPage.module.scss'

interface ServicesListPageProps {
  setShowBanner?: (status: boolean) => void
  calledFromSettingsPage?: boolean
}

export const ServicesListPage = ({
  setShowBanner,
  calledFromSettingsPage = false
}: ServicesListPageProps): React.ReactElement => {
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const isCommunity = useGetCommunity()
  const { NG_SVC_ENV_REDESIGN: isSvcEnvEntityEnabled, CDS_SERVICE_GITX: isGitXEnabled } = useFeatureFlags()
  const { isNewNavEnabled: newLeftNav } = useAppStore()

  const { getString } = useStrings()
  const { showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const { fetchDeploymentList } = useServiceStore()
  const history = useHistory()
  const isFreeOrCommunityCD = useGetFreeOrCommunityCD()

  const { preference: savedSortOption, setPreference: setSavedSortOption } = usePreferenceStore<
    [SortFields, Sort] | undefined
  >(PreferenceScope.USER, 'sortOptionManageService')
  const { preference: servicesViewType = Views.LIST, setPreference: setServicesViewType } = usePreferenceStore<
    Views | undefined
  >(PreferenceScope.MACHINE, 'servicesViewType')

  const queryParamOptions = useServicesQueryParamOptions()
  const queryParams = useQueryParams(queryParamOptions)
  const { updateQueryParams } = useUpdateQueryParams<ServicesQueryParams>()
  const { page, size, searchTerm, repoName } = queryParams

  const [sort, setSort] = useState<[SortFields, Sort]>(savedSortOption ?? queryParams.sort)
  const [mode, setMode] = useState<SelectedView>(SelectedView.VISUAL)
  const [isEdit, setIsEdit] = useState(false)
  const searchRef = useRef<ExpandingSearchInputHandle>()
  const [serviceDetails, setServiceDetails] = useState({
    name: '',
    identifier: '',
    orgIdentifier,
    projectIdentifier,
    description: '',
    tags: {}
  })
  const [showOverlay, setShowOverlay] = useState(false)

  useDocumentTitle(getString('services'))

  useEffect(() => {
    if (isEdit) {
      showModal()
    }
  }, [isEdit])

  const { data: forceDeleteSettings, error: forceDeleteSettingsError } = useGetSettingValue({
    identifier: SettingType.ENABLE_FORCE_DELETE,
    queryParams: {
      accountIdentifier: accountId
    },
    lazy: false
  })

  const repoListQuery = useGetRepositoryList({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    },
    lazy: !isGitXEnabled
  })

  const {
    data: gitXSetting,
    error: gitXSettingError,
    loading: loadingSetting
  } = useGetSettingsList({
    queryParams: {
      category: 'GIT_EXPERIENCE',
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    },
    lazy: !isGitXEnabled
  })

  React.useEffect(() => {
    if (!loadingSetting && gitXSettingError) {
      showError(getRBACErrorMessage(gitXSettingError))
    }
  }, [gitXSettingError, showError, loadingSetting])

  useEffect(() => {
    if (forceDeleteSettingsError) {
      showError(getRBACErrorMessage(forceDeleteSettingsError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceDeleteSettingsError])

  const handleSearchTermChange = (query: string): void => {
    if (query) {
      updateQueryParams({ searchTerm: query, page: SERVICES_DEFAULT_PAGE_INDEX })
    } else {
      updateQueryParams({ searchTerm: undefined })
    }
  }

  const onChangeRepo = (selectedRepoFilter: string): void => {
    updateQueryParams({ repoName: (selectedRepoFilter || []) as string, page: SERVICES_DEFAULT_PAGE_INDEX })
  }

  const goToServiceDetails = useCallback(
    (selectedService: ServiceResponseDTO): void => {
      if (isCommunity) {
        const newServiceData = {
          name: defaultTo(selectedService.name, ''),
          identifier: defaultTo(selectedService.identifier, ''),
          orgIdentifier,
          projectIdentifier,
          description: defaultTo(selectedService.description, ''),
          tags: defaultTo(selectedService.tags, {})
        }
        setServiceDetails({ ...newServiceData })
        setIsEdit(true)
        return
      }
      if (selectedService?.identifier) {
        const remoteQueryParams = getRemoteServiceQueryParams(selectedService, true)
        const serviceDetailRoute =
          newLeftNav && calledFromSettingsPage
            ? routesV2.toSettingsServiceDetails({
                accountId,
                orgIdentifier,
                projectIdentifier,
                serviceId: selectedService?.identifier,
                module
              })
            : routes.toServiceStudio({
                accountId,
                orgIdentifier,
                projectIdentifier,
                serviceId: selectedService?.identifier,
                module
              })
        history.push({
          pathname: serviceDetailRoute,
          search: isSvcEnvEntityEnabled
            ? `tab=${ServiceTabs.Configuration}${remoteQueryParams}`
            : projectIdentifier
            ? `tab=${ServiceTabs.SUMMARY}${remoteQueryParams}`
            : `tab=${ServiceTabs.REFERENCED_BY}${remoteQueryParams}`
        })
      } else {
        showError(getString('cd.serviceList.noIdentifier'))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountId, orgIdentifier, projectIdentifier, module]
  )

  const onServiceCreate = useCallback(
    (values: ServiceResponseDTO): void => {
      if (isSvcEnvEntityEnabled) {
        goToServiceDetails(values)
      } else {
        ;(fetchDeploymentList.current as () => void)?.()
        hideModal()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [showModal, hideModal] = useModalHook(
    () => (
      <ModalDialog
        isOpen={true}
        enforceFocus={false}
        canEscapeKeyClose
        canOutsideClickClose
        onClose={() => {
          hideModal()
          setIsEdit(false)
        }}
        title={isEdit ? getString('editService') : getString('cd.addService')}
        isCloseButtonShown
        width={800}
        showOverlay={showOverlay}
      >
        <Container>
          <NewEditServiceModal
            data={
              isEdit
                ? serviceDetails
                : {
                    name: '',
                    identifier: '',
                    orgIdentifier,
                    projectIdentifier,
                    ...(isGitXEnabled ? { storeType: getDefaultStoreTypeFromSettings(gitXSetting) } : {})
                  }
            }
            isEdit={isEdit}
            isGitXEnforced={getSettingValue(gitXSetting, SettingType.ENFORCE_GIT_EXPERIENCE) === 'true'}
            isService={!isEdit}
            onCreateOrUpdate={values => {
              onServiceCreate(values)
              setIsEdit(false)
            }}
            closeModal={() => {
              hideModal()
              setIsEdit(false)
            }}
            setShowOverlay={setShowOverlay}
          />
        </Container>
      </ModalDialog>
    ),
    [fetchDeploymentList, orgIdentifier, projectIdentifier, mode, isEdit, serviceDetails, gitXSetting]
  )

  const {
    loading,
    data: serviceList,
    refetch,
    error
  } = useGetServiceList({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      size,
      page,
      sort,
      searchTerm,
      repoName,
      includeVersionInfo: true
    },
    queryParamStringifyOptions: { arrayFormat: 'comma' }
  })

  useEffect(() => {
    if (serviceList?.data?.content?.length) {
      const existV1Service = !!serviceList?.data?.content.find(({ service }: ServiceResponse) => !service?.v2Service)
      if (existV1Service && setShowBanner) {
        setShowBanner(true)
      }
    }
  }, [serviceList])

  useEffect(() => {
    fetchDeploymentList.current = refetch
  }, [fetchDeploymentList, refetch])

  const isForceDeleteEnabled = useMemo(
    () => forceDeleteSettings?.data?.value === 'true',
    [forceDeleteSettings?.data?.value]
  )

  return (
    <Page.Body className={css.pageBody} error={error ? getRBACErrorMessage(error) : ''} retryOnError={() => refetch()}>
      <>
        <Layout.Horizontal
          padding={{ left: 'xlarge', right: 'xlarge', top: 'medium' }}
          flex={{ distribution: 'space-between' }}
        >
          <Layout.Horizontal spacing={'medium'}>
            <RbacButton
              intent="primary"
              data-testid="add-service"
              icon="plus"
              iconProps={{ size: 10 }}
              text={getString('newService')}
              permission={{
                permission: PermissionIdentifier.EDIT_SERVICE,
                resource: {
                  resourceType: ResourceType.SERVICE
                }
              }}
              onClick={() => {
                showModal()
                setMode(SelectedView.VISUAL)
              }}
            />
            {isGitXEnabled && (
              <RepoFilter
                onChange={onChangeRepo}
                value={repoName}
                repositories={repoListQuery.data?.data?.repositories}
                isError={!isEmpty(repoListQuery.error)}
                isLoadingRepos={repoListQuery.loading}
                onRefetch={repoListQuery.refetch}
              />
            )}
          </Layout.Horizontal>

          <Layout.Horizontal className={css.sortClass}>
            <ExpandingSearchInput
              placeholder={getString('search')}
              throttle={200}
              onChange={handleSearchTermChange}
              ref={searchRef}
              alwaysExpanded={true}
            />
            <SortOption
              setSort={setSort}
              sort={sort}
              setSavedSortOption={newSort => {
                setSavedSortOption(newSort)
                updateQueryParams({ sort: newSort })
              }}
            />
            <GridListToggle initialSelectedView={servicesViewType} onViewToggle={setServicesViewType} />
          </Layout.Horizontal>
        </Layout.Horizontal>

        <Layout.Vertical
          margin={{ left: 'xlarge', right: 'xlarge', top: 'large', bottom: 'large' }}
          className={css.container}
        >
          {(serviceList && serviceList.data?.content?.length) || loading ? (
            servicesViewType === Views.GRID ? (
              <ServicesGridView
                data={serviceList}
                loading={loading}
                onRefresh={() => refetch()}
                onServiceSelect={async service => goToServiceDetails(service)}
                isForceDeleteEnabled={isForceDeleteEnabled}
                calledFromSettingsPage={calledFromSettingsPage}
              />
            ) : (
              <ServicesListView
                data={serviceList}
                loading={loading}
                onRefresh={() => refetch()}
                onServiceSelect={async service => goToServiceDetails(service)}
                isForceDeleteEnabled={isForceDeleteEnabled}
                calledFromSettingsPage={calledFromSettingsPage}
              />
            )
          ) : (
            <Container flex={{ align: 'center-center' }} height="80vh">
              <Layout.Vertical flex={{ alignItems: 'center' }}>
                <img src={serviceEmptyStateSvg} width={300} height={150} />
                <Heading level={2} padding={{ top: 'xxlarge' }} margin={{ bottom: 'large' }}>
                  {getString('cd.noService')}
                </Heading>
                {isFreeOrCommunityCD && <GetStartedWithCDButton />}
                <RbacButton
                  {...(isFreeOrCommunityCD ? { variation: ButtonVariation.LINK } : { intent: 'primary' })}
                  data-testid="add-service"
                  icon="plus"
                  iconProps={{ size: 10 }}
                  text={getString('newService')}
                  permission={{
                    permission: PermissionIdentifier.EDIT_SERVICE,
                    resource: {
                      resourceType: ResourceType.SERVICE
                    }
                  }}
                  onClick={() => {
                    showModal()
                    setMode(SelectedView.VISUAL)
                  }}
                />
              </Layout.Vertical>
            </Container>
          )}
        </Layout.Vertical>
      </>
    </Page.Body>
  )
}
