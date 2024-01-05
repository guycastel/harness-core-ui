/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { flushSync } from 'react-dom'
import {
  DropDown,
  ExpandingSearchInput,
  ExpandingSearchInputHandle,
  GridListToggle,
  HarnessDocTooltip,
  Layout,
  sortByCreated,
  sortByLastUpdated,
  sortByName,
  SortMethod,
  ListHeader,
  Views
} from '@harness/uicore'
import { useModalHook } from '@harness/use-modal'
import { useHistory, useParams } from 'react-router-dom'
import { Dialog } from '@blueprintjs/core'
import { defaultTo, isEmpty } from 'lodash-es'
import { TemplateSettingsModal } from '@templates-library/components/TemplateSettingsModal/TemplateSettingsModal'
import { Page } from '@common/exports'
import { useStrings } from 'framework/strings'
import {
  TemplateListType,
  TemplatesQueryParams,
  TEMPLATES_PAGE_INDEX,
  useTemplatesQueryParamOptions
} from '@templates-library/pages/TemplatesPage/TemplatesPageUtils'
import { TemplateDetailsDrawer } from '@templates-library/components/TemplateDetailDrawer/TemplateDetailDrawer'
import {
  TemplateSummaryResponse,
  useGetRepositoryList,
  useGetTemplateList,
  useGetTemplateMetadataList,
  FilterDTO,
  TemplateFilterProperties
} from 'services/template-ng'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { NewTemplatePopover } from '@templates-library/pages/TemplatesPage/views/NewTemplatePopover/NewTemplatePopover'
import { DeleteTemplateModal } from '@templates-library/components/DeleteTemplateModal/DeleteTemplateModal'
import routes from '@common/RouteDefinitions'
import { useMutateAsGet, useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { MigrationType } from '@pipeline/components/MigrateResource/MigrateUtils'

import NoResultsView from '@templates-library/pages/TemplatesPage/views/NoResultsView/NoResultsView'
import TemplatesView from '@templates-library/pages/TemplatesPage/views/TemplatesView/TemplatesView'
import useMigrateTemplateResource from '@templates-library/components/MigrateTemplateResource/useMigrateTemplateSource'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import GitFilters, { GitFilterScope } from '@common/components/GitFilters/GitFilters'
import { getScopeFromDTO } from '@common/components/EntityReference/EntityReference'
import {
  getAllowedTemplateTypes,
  TemplateType,
  prepareTemplateFiltersPayload
} from '@templates-library/utils/templatesUtils'
import { getLinkForAccountResources } from '@common/utils/BreadcrumbUtils'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useFeature } from '@common/hooks/useFeatures'
import { FeatureIdentifier } from 'framework/featureStore/FeatureIdentifier'
import FeatureWarningBanner from '@common/components/FeatureWarning/FeatureWarningBanner'
import useMigrateResource from '@pipeline/components/MigrateResource/useMigrateResource'
import { ResourceType } from '@common/interfaces/GitSyncInterface'
import RepoFilter from '@common/components/RepoFilter/RepoFilter'
import { TemplateListFilter } from '@templates-library/components/TemplateFilter/TemplateFilter'
import { getIsSavedFilterApplied } from '@pipeline/pages/execution-list/utils/executionListUtil'
import { getFilterByIdentifier } from '@pipeline/utils/PipelineExecutionFilterRequestUtils'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'

import css from './TemplatesPage.module.scss'

export default function TemplatesPage(): React.ReactElement {
  const { getString } = useStrings()
  const history = useHistory()
  const queryParamOptions = useTemplatesQueryParamOptions()
  const { templateType, repoName, page, size, sort, searchTerm, filterIdentifier, filters } =
    useQueryParams(queryParamOptions)
  const { preference: view = Views.GRID, setPreference: setView } = usePreferenceStore<Views | undefined>(
    PreferenceScope.MACHINE,
    'templatesViewType'
  )
  const { updateQueryParams, replaceQueryParams } = useUpdateQueryParams<TemplatesQueryParams>()
  const isSavedFilterApplied = getIsSavedFilterApplied(filterIdentifier)
  const [filterList, setFilterList] = useState<FilterDTO[] | undefined>()
  const [templateToDelete, setTemplateToDelete] = React.useState<TemplateSummaryResponse>({})
  const [templateIdentifierToSettings, setTemplateIdentifierToSettings] = React.useState<string>()
  const [selectedTemplate, setSelectedTemplate] = React.useState<TemplateSummaryResponse | undefined>()
  const [gitFilter, setGitFilter] = useState<GitFilterScope | null>(null)
  const searchRef = React.useRef<ExpandingSearchInputHandle>({} as ExpandingSearchInputHandle)
  const { projectIdentifier, orgIdentifier, accountId, module } = useParams<ProjectPathProps & ModulePathParams>()
  const {
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF,
    supportingTemplatesGitx,
    isNewNavEnabled
  } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const scope = getScopeFromDTO({ projectIdentifier, orgIdentifier, accountIdentifier: accountId })
  const { CVNG_TEMPLATE_MONITORED_SERVICE, NG_SVC_ENV_REDESIGN } = useFeatureFlags()
  const { enabled: templateFeatureEnabled } = useFeature({
    featureRequest: {
      featureName: FeatureIdentifier.TEMPLATE_SERVICE
    }
  })

  const allowedTemplateTypes = getAllowedTemplateTypes(scope, {
    [TemplateType.MonitoredService]: !!CVNG_TEMPLATE_MONITORED_SERVICE,
    [TemplateType.CustomDeployment]: !!NG_SVC_ENV_REDESIGN
  }).filter(item => !item.disabled)

  useDocumentTitle([getString('common.templates')])

  const {
    data: templateData,
    refetch: reloadTemplates,
    loading,
    error
  } = useMutateAsGet(supportingTemplatesGitx ? useGetTemplateMetadataList : useGetTemplateList, {
    body: {
      filterType: 'Template',
      ...(!isSavedFilterApplied && filters && prepareTemplateFiltersPayload(filters as TemplateFilterProperties)),
      ...(isSavedFilterApplied && getFilterByIdentifier(filterIdentifier!, filterList)?.filterProperties),
      repoName,
      ...(templateType && { templateEntityTypes: [templateType] })
    },
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      templateListType: TemplateListType.LastUpdated,
      searchTerm,
      page,
      sort: [sort],
      size,
      ...(gitFilter?.repo &&
        gitFilter.branch && {
          repoIdentifier: gitFilter.repo,
          branch: gitFilter.branch
        })
    },
    queryParamStringifyOptions: { arrayFormat: 'comma' },
    lazy: !templateFeatureEnabled
  })

  const {
    data: repoListData,
    error: errorOfRepoForTemplates,
    loading: isLoadingRepos,
    refetch
  } = useGetRepositoryList({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    },
    lazy: isGitSyncEnabled
  })

  const repositories = repoListData?.data?.repositories

  const onRefetch = React.useCallback((): void => {
    refetch()
  }, [refetch])

  const reset = React.useCallback((): void => {
    flushSync(() => searchRef.current.clear())
    replaceQueryParams({})
    setGitFilter(null)
  }, [replaceQueryParams])

  const { showMigrateTemplateResourceModal, moveDataLoading } = useMigrateTemplateResource({
    resourceType: ResourceType.TEMPLATE,
    modalTitle: getString('common.moveEntitytoGit', { resourceType: getString('common.template.label') }),
    migrationType: MigrationType.INLINE_TO_REMOTE,
    isGitSyncEnabled,
    supportingTemplatesGitx,
    onSuccess: () => {
      reloadTemplates()
    }
  })

  const [showDeleteTemplatesModal, hideDeleteTemplatesModal] = useModalHook(() => {
    const content = (
      <DeleteTemplateModal
        template={templateToDelete}
        onClose={hideDeleteTemplatesModal}
        onSuccess={() => {
          hideDeleteTemplatesModal()
          reloadTemplates()
        }}
      />
    )
    return (
      <Dialog enforceFocus={false} isOpen={true} className={css.deleteTemplateDialog}>
        {isGitSyncEnabled ? <GitSyncStoreProvider>{content}</GitSyncStoreProvider> : content}
      </Dialog>
    )
  }, [templateToDelete, reloadTemplates, isGitSyncEnabled])

  const [showTemplateSettingsModal, hideTemplateSettingsModal] = useModalHook(
    () => (
      <Dialog enforceFocus={false} isOpen={true} className={css.updateTemplateSettingsDialog}>
        <TemplateSettingsModal
          templateIdentifier={templateIdentifierToSettings || ''}
          onClose={hideTemplateSettingsModal}
          onSuccess={() => {
            hideTemplateSettingsModal()
            reloadTemplates()
          }}
        />
      </Dialog>
    ),
    [templateIdentifierToSettings, reloadTemplates]
  )

  const { showMigrateResourceModal: showImportResourceModal } = useMigrateResource({
    resourceType: ResourceType.TEMPLATE,
    modalTitle: getString('common.importEntityFromGit', { resourceType: getString('common.template.label') }),
    onSuccess: reloadTemplates
  })

  const goToTemplateStudio = (template: TemplateSummaryResponse): void => {
    history.push(
      routes.toTemplateStudioNew({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module,
        templateType: template.templateEntityType,
        templateIdentifier: template.identifier || '',
        versionLabel: template.versionLabel,
        repoIdentifier: template.gitDetails?.repoIdentifier,
        branch: template.gitDetails?.branch
      })
    )
  }

  const onRetry = React.useCallback(() => {
    reloadTemplates()
  }, [reloadTemplates])

  const onChangeRepo = (selectedRepoName: string): void => {
    updateQueryParams({ repoName: selectedRepoName || undefined, page: TEMPLATES_PAGE_INDEX })
  }

  return (
    <>
      <Page.Header
        title={
          <div className="ng-tooltip-native">
            <h2 data-tooltip-id="templatesPageHeading"> {getString('common.templates')}</h2>
            <HarnessDocTooltip tooltipId="templatePageHeading" useStandAlone={true} />
          </div>
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
        className={css.templatesPageHeader}
      />
      <Page.SubHeader className={css.templatesPageSubHeader}>
        <Layout.Horizontal spacing={'medium'}>
          <NewTemplatePopover onImportTemplateClick={showImportResourceModal} />
          <DropDown
            onChange={item => {
              updateQueryParams({ templateType: (item.value as TemplateType) || undefined, page: TEMPLATES_PAGE_INDEX })
            }}
            value={templateType}
            filterable={false}
            addClearBtn={true}
            items={allowedTemplateTypes}
            placeholder={getString('all')}
            popoverClassName={css.dropdownPopover}
          />
          {isGitSyncEnabled ? (
            <GitSyncStoreProvider>
              <GitFilters
                onChange={filter => {
                  setGitFilter(filter)
                  updateQueryParams({ page: TEMPLATES_PAGE_INDEX })
                }}
                className={css.gitFilter}
                defaultValue={gitFilter || undefined}
              />
            </GitSyncStoreProvider>
          ) : (
            <RepoFilter
              onChange={onChangeRepo}
              value={repoName}
              repositories={repositories}
              isError={!isEmpty(errorOfRepoForTemplates)}
              onRefetch={onRefetch}
              isLoadingRepos={isLoadingRepos}
            />
          )}
        </Layout.Horizontal>

        <Layout.Horizontal spacing="small" style={{ alignItems: 'center' }}>
          <ExpandingSearchInput
            alwaysExpanded
            width={200}
            placeholder={getString('search')}
            onChange={(text: string) => {
              updateQueryParams({
                page: TEMPLATES_PAGE_INDEX,
                searchTerm: text || undefined
              })
            }}
            ref={searchRef}
            defaultValue={defaultTo(searchTerm, '')}
            className={css.expandSearch}
          />
          <TemplateListFilter onFilterListUpdate={setFilterList} />
          <GridListToggle initialSelectedView={view} onViewToggle={setView} />
        </Layout.Horizontal>
      </Page.SubHeader>
      <Page.Body
        loading={loading || moveDataLoading}
        error={(error?.data as Error)?.message || error?.message}
        className={css.templatesPageBody}
        retryOnError={onRetry}
      >
        {!templateFeatureEnabled ? (
          <FeatureWarningBanner featureName={FeatureIdentifier.TEMPLATE_SERVICE} className={css.featureWarningBanner} />
        ) : (
          !loading &&
          (!templateData?.data?.content?.length ? (
            <NoResultsView
              hasSearchParam={!!searchTerm || !!templateType}
              onReset={reset}
              text={getString('templatesLibrary.templatesPage.noTemplates', { scope })}
            />
          ) : (
            <React.Fragment>
              <ListHeader
                className={css.listHeader}
                selectedSortMethod={sort}
                totalCount={templateData.data.totalElements}
                onSortMethodChange={option => {
                  updateQueryParams({ sort: option.value as SortMethod })
                }}
                sortOptions={[...sortByLastUpdated, ...sortByCreated, ...sortByName]}
              />
              <TemplatesView
                data={templateData?.data}
                onSelect={setSelectedTemplate}
                selectedTemplate={selectedTemplate}
                onPreview={setSelectedTemplate}
                onOpenEdit={goToTemplateStudio}
                onOpenSettings={identifier => {
                  setTemplateIdentifierToSettings(identifier)
                  showTemplateSettingsModal()
                }}
                onDelete={template => {
                  setTemplateToDelete(template)
                  showDeleteTemplatesModal()
                }}
                onOpenMoveResource={template => {
                  showMigrateTemplateResourceModal(template)
                }}
                reloadTemplates={() => reloadTemplates()}
                view={view}
                useQueryParamsForPagination
              />
            </React.Fragment>
          ))
        )}
      </Page.Body>
      {selectedTemplate && (
        <TemplateDetailsDrawer
          template={selectedTemplate}
          onClose={() => {
            setSelectedTemplate(undefined)
          }}
        />
      )}
    </>
  )
}
