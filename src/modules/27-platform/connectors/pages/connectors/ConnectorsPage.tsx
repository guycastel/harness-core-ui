/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Layout,
  SelectOption,
  FormInput,
  MultiSelectOption,
  ExpandingSearchInput,
  Container,
  ButtonVariation,
  PageError,
  shouldShowError,
  SortMethod,
  Checkbox,
  Icon,
  CheckboxVariant
} from '@harness/uicore'
import { Color } from '@harness/design-system'
import { useModalHook } from '@harness/use-modal'
import { useParams, useHistory } from 'react-router-dom'
import type { GetDataError } from 'restful-react'
import { pick } from 'lodash-es'
import type { FormikErrors } from 'formik'
import {
  useGetConnectorListV2,
  ResponsePageConnectorResponse,
  ResponseConnectorCatalogueResponse,
  useGetConnectorStatistics,
  useGetFilterList,
  FilterDTO,
  usePostFilter,
  useUpdateFilter,
  PageConnectorResponse,
  useDeleteFilter,
  ResponsePageFilterDTO,
  ResponseConnectorStatistics,
  GetConnectorListV2QueryParams,
  Failure,
  ConnectorInfoDTO,
  useGetSettingValue
} from 'services/cd-ng'
import type { ConnectorFilterProperties } from 'services/cd-ng'
import type { UseGetMockData } from '@common/utils/testUtils'
import { Page, useToaster, StringUtils } from '@common/exports'
import { AddDrawer, PageSpinner } from '@common/components'
import { DrawerContext, ItemInterface } from '@common/components/AddDrawer/AddDrawer'
import routes from '@common/RouteDefinitions'
import useCreateConnectorModal from '@platform/connectors/modals/ConnectorModal/useCreateConnectorModal'
import { Filter, FilterRef } from '@common/components/Filter/Filter'
import {
  removeNullAndEmpty,
  isObjectEmpty,
  UNSAVED_FILTER,
  flattenObject
} from '@common/components/Filter/utils/FilterUtils'
import { useStrings } from 'framework/strings'
import type { FilterInterface, FilterDataInterface } from '@common/components/Filter/Constants'
import type { CrudOperation } from '@common/components/Filter/FilterCRUD/FilterCRUD'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import FilterSelector from '@common/components/Filter/FilterSelector/FilterSelector'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import RbacButton from '@rbac/components/Button/Button'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'

import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import GitFilters, { GitFilterScope } from '@common/components/GitFilters/GitFilters'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { Scope } from '@common/interfaces/SecretsInterface'
import ScopedTitle from '@common/components/Title/ScopedTitle'
import { getLinkForAccountResources } from '@common/utils/BreadcrumbUtils'
import { Connectors } from '@platform/connectors/constants'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { CE_CONNECTOR_CLICK, CONNECTORS_PAGE } from '@platform/connectors/trackingConstants'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { resourceAttributeMap } from '@rbac/pages/ResourceGroupDetails/utils'
import { SettingType } from '@common/constants/Utils'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { PAGE_NAME } from '@common/pages/pageContext/PageName'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import { CDActions, Category } from '@common/constants/TrackingConstants'
import ConnectorsListView from './views/ConnectorsListView'
import {
  createRequestBodyPayload,
  ConnectorFormType,
  getValidFilterArguments,
  renderItemByType,
  ConnectorStatCategories,
  getOptionsForMultiSelect,
  validateForm
} from './utils/RequestUtils'
import ConnectorsEmptyState from './images/connectors-empty-state.png'
import { useGetConnectorsListHook } from './hooks/useGetConnectorsListHook/useGetConectorsListHook'
import {
  CONNECTORS_PAGE_INDEX,
  ConnectorsQueryParams,
  useConnectorsQueryParamOptions
} from './utils/ConnectorListViewUtils'
import css from './ConnectorsPage.module.scss'

interface ConnectorsListProps {
  mockData?: UseGetMockData<ResponsePageConnectorResponse>
  catalogueMockData?: UseGetMockData<ResponseConnectorCatalogueResponse>
  statisticsMockData?: UseGetMockData<ResponseConnectorStatistics>
  filtersMockData?: UseGetMockData<ResponsePageFilterDTO>
}

const ConnectorsPage: React.FC<ConnectorsListProps> = ({ catalogueMockData, statisticsMockData, filtersMockData }) => {
  const { getString } = useStrings()
  const { getRBACErrorMessage } = useRBACError()
  const { isGitSyncEnabled: isGitSyncEnabledForProject, gitSyncEnabledOnlyForFF } = useAppStore()
  const { accountId, projectIdentifier, orgIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const queryParamOptions = useConnectorsQueryParamOptions()
  const { page, size, searchTerm, favorite } = useQueryParams(queryParamOptions)
  const { updateQueryParams } = useUpdateQueryParams<ConnectorsQueryParams>()
  const [appliedFilter, setAppliedFilter] = useState<FilterDTO | null>()
  const { showError } = useToaster()
  const [connectors, setConnectors] = useState<PageConnectorResponse | undefined>()
  const [loading, setLoading] = useState<boolean>(false)
  const [connectorFetchError, setConnectorFetchError] = useState<GetDataError<Failure | Error>>()
  const [isRefreshingFilters, setIsRefreshingFilters] = useState<boolean>(false)
  const filterRef = React.useRef<FilterRef<FilterDTO> | null>(null)
  const [gitFilter, setGitFilter] = useState<GitFilterScope>({ repo: '', branch: '' })
  const { preference: sortPreference = SortMethod.LastModifiedDesc, setPreference: setSortPreference } =
    usePreferenceStore<SortMethod>(PreferenceScope.USER, `sort-${PAGE_NAME.ConnectorsPage}`)
  const shouldApplyGitFilters = Boolean(isGitSyncEnabled && gitFilter.repo && gitFilter.branch)

  const history = useHistory()
  useDocumentTitle(getString('connectorsLabel'))
  const { trackEvent } = useTelemetry()
  const { PL_FAVORITES } = useFeatureFlags()
  const { isNewNavEnabled } = useAppStore()
  const { data: forceDeleteSettings, error: forceDeleteSettingsError } = useGetSettingValue({
    identifier: SettingType.ENABLE_FORCE_DELETE,
    queryParams: { accountIdentifier: accountId },
    lazy: false
  })

  useEffect(() => {
    if (forceDeleteSettingsError) {
      showError(getRBACErrorMessage(forceDeleteSettingsError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceDeleteSettingsError])

  /* #region Connector CRUD section */

  // params are passed when calling fetchConnectors
  const { mutate: fetchConnectors } = useGetConnectorListV2({
    queryParams: {
      sortOrders: [sortPreference],
      ...(PL_FAVORITES ? { onlyFavorites: favorite } : undefined)
    },
    queryParamStringifyOptions: { arrayFormat: 'repeat' }
  })

  const refetchConnectorList = React.useCallback(
    async (
      params?: GetConnectorListV2QueryParams,
      filter?: ConnectorFilterProperties,
      needsRefinement = true
    ): Promise<void> => {
      setLoading(true)
      const { connectorNames, connectorIdentifiers, description, types, connectivityStatuses, tags } = filter || {}

      const requestBodyPayload = Object.assign(
        filter
          ? {
              connectorNames: typeof connectorNames === 'string' ? [connectorNames] : connectorNames,
              connectorIdentifiers:
                typeof connectorIdentifiers === 'string' ? [connectorIdentifiers] : connectorIdentifiers,
              description,
              types: needsRefinement ? types?.map(type => type?.toString()) : types,
              connectivityStatuses: needsRefinement
                ? connectivityStatuses?.map(status => status?.toString())
                : connectivityStatuses,
              tags
            }
          : {},
        {
          filterType: 'Connector'
        }
      ) as ConnectorFilterProperties
      const sanitizedFilterRequest = removeNullAndEmpty(requestBodyPayload)
      try {
        const { status, data } = await fetchConnectors(sanitizedFilterRequest, { queryParams: params })
        /* istanbul ignore else */ if (status === 'SUCCESS') {
          setConnectors(data)
          setConnectorFetchError(undefined)
        }
      } /* istanbul ignore next */ catch (e) {
        if (shouldShowError(e)) {
          showError(getRBACErrorMessage(e))
        }
        setConnectorFetchError(e)
      }
      setLoading(false)
    },
    [fetchConnectors]
  )

  const connectorListQueryParams = useMemo<GetConnectorListV2QueryParams>(
    () => ({
      pageIndex: page,
      pageSize: size,
      projectIdentifier,
      orgIdentifier,
      accountIdentifier: accountId,
      ...(searchTerm?.trim() && { searchTerm: searchTerm.trim() }),
      ...(shouldApplyGitFilters && { repoIdentifier: gitFilter.repo, branch: gitFilter.branch })
    }),
    [
      accountId,
      gitFilter.branch,
      gitFilter.repo,
      orgIdentifier,
      page,
      projectIdentifier,
      searchTerm,
      shouldApplyGitFilters,
      size
    ]
  )

  useEffect(() => {
    refetchConnectorList(connectorListQueryParams, appliedFilter?.filterProperties)
  }, [connectorListQueryParams, appliedFilter?.filterProperties, refetchConnectorList])

  /* Clearing filter from Connector Filter Panel */
  const reset = (): void => {
    setAppliedFilter(undefined)
    setConnectorFetchError(undefined)
  }

  /* #endregion */

  /* #region Create Connector Catalogue section */

  const {
    connectorsList: catalogueData,
    loading: loadingCatalogue,
    categoriesMap,
    connectorCatalogueOrder
  } = useGetConnectorsListHook(catalogueMockData)

  const {
    loading: isFetchingStats,
    data: metaData,
    refetch: fetchConnectorStats
  } = useGetConnectorStatistics({
    queryParams: {
      projectIdentifier,
      orgIdentifier,
      accountIdentifier: accountId,
      ...(shouldApplyGitFilters && { repoIdentifier: gitFilter.repo, branch: gitFilter.branch })
    },
    mock: statisticsMockData
  })

  const refetchAllConnectorsWithStats = async (): Promise<void> => {
    refetchConnectorList(connectorListQueryParams, appliedFilter?.filterProperties)
    fetchConnectorStats()
  }

  const { openConnectorModal } = useCreateConnectorModal({
    onSuccess: refetchAllConnectorsWithStats,
    onClose: refetchAllConnectorsWithStats
  })

  const rerouteBasedOnContext = (): void => {
    history.push(routes.toCreateConnectorFromYaml({ accountId, projectIdentifier, orgIdentifier, module }))
  }

  const [openDrawer, hideDrawer] = useModalHook(() => {
    const onSelect = (val: ItemInterface): void => {
      if (
        [Connectors.CE_AZURE, Connectors.CE_KUBERNETES, Connectors.CE_GCP, Connectors.CEAWS].includes(val.value as any)
      ) {
        trackEvent(CE_CONNECTOR_CLICK, {
          connectorType: val.value,
          page: CONNECTORS_PAGE
        })
      }
      openConnectorModal(false, val?.value as ConnectorInfoDTO['type'], undefined)
      hideDrawer()
    }

    return loadingCatalogue ? (
      <PageSpinner />
    ) : (
      <AddDrawer
        addDrawerMap={categoriesMap}
        onSelect={onSelect}
        onClose={hideDrawer}
        drawerContext={DrawerContext.PAGE}
        showRecentlyUsed={false}
      />
    )
  }, [catalogueData])

  /* #endregion */

  /* #region Connector Filter CRUD Section */

  const ConnectorForm = (): React.ReactElement => {
    return (
      <>
        <FormInput.MultiSelect
          items={getOptionsForMultiSelect(ConnectorStatCategories.TYPE, metaData || {})}
          name="types"
          label={getString('typeLabel')}
          key="types"
          multiSelectProps={{
            allowCreatingNewItems: false
          }}
        />
        <FormInput.KVTagInput name="tags" label={getString('tagsLabel')} key="tags" />
        <FormInput.MultiSelect
          items={getOptionsForMultiSelect(ConnectorStatCategories.STATUS, metaData || {})}
          name="connectivityStatuses"
          label={getString('connectivityStatus')}
          key="connectivityStatuses"
          multiSelectProps={{
            allowCreatingNewItems: false
          }}
        />
        <FormInput.Text name={'connectorNames'} label={getString('platform.connectors.name')} key={'connectorNames'} />
        <FormInput.Text name={'connectorIdentifiers'} label={getString('identifier')} key={'connectorIdentifiers'} />
        <FormInput.Text name={'description'} label={getString('description')} key={'description'} />
      </>
    )
  }

  const {
    loading: isFetchingFilters,
    data: fetchedFilterResponse,
    refetch: refetchFilterList
  } = useGetFilterList({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      type: 'Connector'
    },
    mock: filtersMockData
  })

  const filters = fetchedFilterResponse?.data?.content ?? []

  useEffect(() => {
    setIsRefreshingFilters(isFetchingFilters)
  }, [isFetchingFilters])

  const { mutate: createFilter } = usePostFilter({
    queryParams: {
      accountIdentifier: accountId
    }
  })

  const { mutate: updateFilter } = useUpdateFilter({
    queryParams: {
      accountIdentifier: accountId
    }
  })

  const { mutate: deleteFilter } = useDeleteFilter({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      type: 'Connector'
    }
  })

  const getFilterByIdentifier = (identifier: string): FilterDTO | undefined =>
    /* istanbul ignore if */
    filters?.find((filter: FilterDTO) => filter.identifier?.toLowerCase() === identifier.toLowerCase())

  const getMultiSelectFormOptions = (values?: any[]): SelectOption[] | undefined => {
    /* istanbul ignore if */
    return values?.map(item => {
      return { label: item, value: item }
    })
  }

  const handleSaveOrUpdate = async (
    isUpdate: boolean,
    data: FilterDataInterface<ConnectorFormType, FilterInterface>
  ): Promise<void> => {
    setIsRefreshingFilters(true)
    const requestBodyPayload = createRequestBodyPayload({ isUpdate, data, projectIdentifier, orgIdentifier })
    const saveOrUpdateHandler = filterRef.current?.saveOrUpdateFilterHandler
    if (saveOrUpdateHandler && typeof saveOrUpdateHandler === 'function') {
      const updatedFilter = await saveOrUpdateHandler(isUpdate, requestBodyPayload)
      setAppliedFilter(updatedFilter)
      updateQueryParams({ page: CONNECTORS_PAGE_INDEX })
    }
    trackEvent(CDActions.ApplyAdvancedFilter, {
      category: Category.CONNECTOR
    })
    await refetchFilterList()
    setIsRefreshingFilters(false)
  }

  const handleDelete = async (identifier: string): Promise<void> => {
    setIsRefreshingFilters(true)
    const deleteHandler = filterRef.current?.deleteFilterHandler
    if (deleteHandler && typeof deleteFilter === 'function') {
      await deleteHandler(identifier)
    }
    if (identifier === appliedFilter?.identifier) {
      reset()
    }
    await refetchFilterList()
    setIsRefreshingFilters(false)
  }

  const unsavedFilter = {
    name: UNSAVED_FILTER,
    identifier: StringUtils.getIdentifierFromName(UNSAVED_FILTER)
  }

  const handleFilterClick = (identifier: string): void => {
    if (identifier !== unsavedFilter.identifier) {
      setAppliedFilter(getFilterByIdentifier(identifier))
      updateQueryParams({ page: CONNECTORS_PAGE_INDEX })
    }
  }

  const typeMultiSelectValues = getOptionsForMultiSelect(ConnectorStatCategories.TYPE, metaData || {})?.map(
    option => option.value
  ) as string[]
  const connectivityStatusMultiValues = getOptionsForMultiSelect(ConnectorStatCategories.STATUS, metaData || {})?.map(
    option => option.value
  ) as string[]

  const [openFilterDrawer, hideFilterDrawer] = useModalHook(() => {
    const onFilterApply = (formData: Record<string, any>): void => {
      if (!isObjectEmpty(formData)) {
        const filterFromFormData = getValidFilterArguments({ ...formData })
        setAppliedFilter({ ...unsavedFilter, filterProperties: filterFromFormData })
        updateQueryParams({ page: CONNECTORS_PAGE_INDEX })
        hideFilterDrawer()
        trackEvent(CDActions.ApplyAdvancedFilter, {
          category: Category.CONNECTOR
        })
      } else {
        showError(getString('filters.invalidCriteria'))
      }
    }

    const { connectorNames, connectorIdentifiers, description, types, connectivityStatuses, tags } =
      (appliedFilter?.filterProperties as ConnectorFilterProperties) || {}
    const { name = '', filterVisibility } = appliedFilter || {}
    return isFetchingStats ? (
      <PageSpinner />
    ) : (
      <Filter<ConnectorFormType, FilterDTO>
        onApply={onFilterApply}
        onClose={() => {
          hideFilterDrawer()
          refetchFilterList()
        }}
        filters={filters}
        initialFilter={{
          formValues: {
            connectorNames,
            connectorIdentifiers,
            description,
            types: getMultiSelectFormOptions(types),
            connectivityStatuses: getMultiSelectFormOptions(connectivityStatuses),
            tags
          },
          metadata: {
            name,
            filterVisibility: filterVisibility,
            identifier: appliedFilter?.identifier || '',
            filterProperties: {}
          }
        }}
        onSaveOrUpdate={handleSaveOrUpdate}
        onDelete={handleDelete}
        onFilterSelect={handleFilterClick}
        isRefreshingFilters={isRefreshingFilters || isFetchingStats}
        formFields={<ConnectorForm />}
        onValidate={(values: Partial<ConnectorFormType>): FormikErrors<Partial<ConnectorFormType>> => {
          const errors: FormikErrors<{ types?: MultiSelectOption[]; connectivityStatuses?: MultiSelectOption[] }> = {}
          const { typeErrors, connectivityStatusErrors } = validateForm(
            values,
            typeMultiSelectValues,
            connectivityStatusMultiValues,
            metaData || {}
          )
          if (typeErrors?.size > 0) {
            errors.types = getString('filters.invalidSelection') + ': ' + renderItemByType(Array.from(typeErrors))
          }
          if (connectivityStatusErrors?.size > 0) {
            errors.connectivityStatuses =
              getString('filters.invalidSelection') + ': ' + renderItemByType(Array.from(connectivityStatusErrors))
          }
          return errors
        }}
        dataSvcConfig={
          new Map<CrudOperation, (...rest: any[]) => Promise<any>>([
            ['ADD', createFilter],
            ['UPDATE', updateFilter],
            ['DELETE', deleteFilter]
          ])
        }
        onSuccessfulCrudOperation={refetchFilterList}
        ref={filterRef}
        onClear={reset}
      />
    )
  }, [filters, appliedFilter, isFetchingStats, isRefreshingFilters, metaData])

  const handleFilterSelection = (
    option: SelectOption,
    event?: React.SyntheticEvent<HTMLElement, Event> | undefined
  ): void => {
    event?.stopPropagation()
    event?.preventDefault()
    /* istanbul ignore else */
    if (option.value) {
      const selectedFilter = getFilterByIdentifier(option.value?.toString())
      setAppliedFilter(selectedFilter)
      updateQueryParams({ page: CONNECTORS_PAGE_INDEX })
      trackEvent(CDActions.ApplyAdvancedFilter, {
        category: Category.CONNECTOR
      })
    } else {
      reset()
    }
  }

  const fieldToLabelMapping = useMemo(
    () =>
      new Map([
        ['connectorNames', getString('platform.connectors.name')],
        ['connectorIdentifiers', getString('identifier')],
        ['description', getString('description')],
        ['types', getString('typeLabel')],
        ['tags', getString('tagsLabel')],
        ['connectivityStatuses', getString('connectivityStatus')]
      ]),
    [getString]
  )

  const attributeFilterName = resourceAttributeMap.get(ResourceType.CONNECTOR)
  const filterProperties = appliedFilter?.filterProperties || {}
  /* #endregion */

  return (
    <>
      <Page.Header
        title={
          <ScopedTitle
            title={{
              [Scope.PROJECT]: getString('connectorsLabel'),
              [Scope.ORG]: getString('platform.connectors.connectorsTitle'),
              [Scope.ACCOUNT]: getString('platform.connectors.connectorsTitle')
            }}
          />
        }
        breadcrumbs={
          isNewNavEnabled ? (
            <NGBreadcrumbs />
          ) : (
            <NGBreadcrumbs
              links={getLinkForAccountResources({ accountId, orgIdentifier, projectIdentifier, getString })}
            />
          )
        }
      />
      <Layout.Vertical className={css.listPage}>
        {connectors?.content?.length || isGitSyncEnabled || searchTerm || loading || appliedFilter || favorite ? (
          <Layout.Horizontal flex className={css.header}>
            <Layout.Horizontal spacing="small">
              <RbacButton
                variation={ButtonVariation.PRIMARY}
                text={getString('newConnector')}
                icon="plus"
                permission={{
                  permission: PermissionIdentifier.UPDATE_CONNECTOR,
                  resource: {
                    resourceType: ResourceType.CONNECTOR
                  },
                  attributeFilter: {
                    attributeName: attributeFilterName ?? ('' as string),
                    attributeValues: connectorCatalogueOrder as string[]
                  }
                }}
                onClick={openDrawer}
                id="newConnectorBtn"
                data-test="newConnectorButton"
              />
              <RbacButton
                margin={{ left: 'small' }}
                text={getString('createViaYaml')}
                permission={{
                  permission: PermissionIdentifier.UPDATE_CONNECTOR,
                  resource: {
                    resourceType: ResourceType.CONNECTOR
                  },
                  resourceScope: {
                    accountIdentifier: accountId,
                    orgIdentifier,
                    projectIdentifier
                  }
                }}
                onClick={rerouteBasedOnContext}
                id="newYamlConnectorBtn"
                data-test="createViaYamlButton"
                variation={ButtonVariation.SECONDARY}
              />
              {PL_FAVORITES && (
                <Checkbox
                  variant={CheckboxVariant.BOXED}
                  checked={favorite}
                  labelElement={<Icon name="star" color={Color.YELLOW_900} size={14} />}
                  onChange={e => {
                    updateQueryParams({ favorite: e.currentTarget.checked })
                  }}
                />
              )}

              {isGitSyncEnabled && (
                <GitSyncStoreProvider>
                  <GitFilters
                    onChange={filter => {
                      setGitFilter(filter)
                      updateQueryParams({ page: CONNECTORS_PAGE_INDEX })
                    }}
                    className={css.gitFilter}
                  />
                </GitSyncStoreProvider>
              )}
            </Layout.Horizontal>

            <Layout.Horizontal margin={{ left: 'small' }}>
              <Container data-name="connectorSeachContainer">
                <ExpandingSearchInput
                  alwaysExpanded
                  width={200}
                  className={css.expandSearch}
                  placeholder={getString('search')}
                  throttle={200}
                  defaultValue={searchTerm}
                  onChange={(query: string) => {
                    updateQueryParams({ searchTerm: query || undefined, page: CONNECTORS_PAGE_INDEX })
                  }}
                />
              </Container>
              <FilterSelector<FilterDTO>
                appliedFilter={appliedFilter}
                filters={filters}
                onFilterBtnClick={openFilterDrawer}
                onFilterSelect={handleFilterSelection}
                fieldToLabelMapping={fieldToLabelMapping}
                filterWithValidFields={removeNullAndEmpty(
                  pick(
                    flattenObject({
                      ...filterProperties,
                      tags: Object.keys(filterProperties?.tags || {})
                    }),
                    ...fieldToLabelMapping.keys()
                  )
                )}
              />
            </Layout.Horizontal>
          </Layout.Horizontal>
        ) : null}

        <Page.Body className={css.listBody}>
          {loading ? (
            <div style={{ position: 'relative', height: 'calc(100vh - 128px)' }}>
              <PageSpinner />
            </div>
          ) : /* istanbul ignore next */ connectorFetchError && shouldShowError(connectorFetchError) ? (
            <div style={{ paddingTop: '200px' }}>
              <PageError
                message={(connectorFetchError?.data as Error)?.message || connectorFetchError?.message}
                onClick={(e: React.MouseEvent<Element, MouseEvent>) => {
                  e.preventDefault()
                  e.stopPropagation()
                  reset()
                }}
              />
            </div>
          ) : connectors?.content?.length ? (
            <ConnectorsListView
              data={connectors}
              reload={refetchAllConnectorsWithStats}
              openConnectorModal={openConnectorModal}
              forceDeleteSupported={forceDeleteSettings?.data?.value === 'true'}
              selectedSort={sortPreference}
              onSortMethodChange={option => {
                setSortPreference(option.value as SortMethod)
              }}
            />
          ) : (
            <Page.NoDataCard
              onClick={openDrawer}
              imageClassName={css.connectorEmptyStateImg}
              buttonText={!searchTerm ? getString('platform.connectors.createConnector') : undefined}
              image={ConnectorsEmptyState}
              message={
                searchTerm || favorite
                  ? getString('noConnectorFound')
                  : getString('platform.connectors.connectorEmptyState')
              }
            />
          )}
        </Page.Body>
      </Layout.Vertical>
    </>
  )
}

export default ConnectorsPage
