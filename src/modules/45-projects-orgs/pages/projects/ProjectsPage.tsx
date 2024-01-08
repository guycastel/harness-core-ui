/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Layout,
  ExpandingSearchInput,
  Container,
  GridListToggle,
  Views,
  ButtonVariation,
  Page,
  ButtonSize,
  ListHeader,
  sortByCreated,
  sortByLastModified,
  sortByName,
  SortMethod,
  Checkbox,
  CheckboxVariant,
  Icon
} from '@harness/uicore'
import { Color } from '@harness/design-system'
import { isUndefined } from 'lodash-es'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { useGetProjectAggregateDTOList } from 'services/cd-ng'
import type { Project, ProjectAggregateDTO } from 'services/cd-ng'
import { useProjectModal } from '@projects-orgs/modals/ProjectModal/useProjectModal'
import { useCollaboratorModal } from '@projects-orgs/modals/ProjectModal/useCollaboratorModal'
import { useStrings } from 'framework/strings'
import { useToaster } from '@common/components'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import type { AccountPathProps, OrgPathProps } from '@common/interfaces/RouteInterfaces'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import RbacButton from '@rbac/components/Button/Button'
import { FeatureIdentifier } from 'framework/featureStore/FeatureIdentifier'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import { projectsPageQueryParamOptions, ProjectsPageQueryParams } from '@projects-orgs/utils/utils'
import OrgDropdown from '@common/OrgDropdown/OrgDropdown'
import { PAGE_NAME } from '@common/pages/pageContext/PageName'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import ProjectsListView from './views/ProjectListView/ProjectListView'
import ProjectsGridView from './views/ProjectGridView/ProjectGridView'
import ProjectsEmptyState from './projects-empty-state.png'

import css from './ProjectsPage.module.scss'

interface ProjectsListPageProps {
  onProjectClick?: (project: ProjectAggregateDTO) => void
}

const ProjectsListPage: React.FC<ProjectsListPageProps> = ({ onProjectClick }) => {
  const { getString } = useStrings()
  const { PL_FAVORITES } = useFeatureFlags()

  useDocumentTitle(getString('projectsText'))
  const { preference: sortPreference = SortMethod.Newest, setPreference: setSortPreference } =
    usePreferenceStore<SortMethod>(PreferenceScope.USER, `sort-${PAGE_NAME.ProjectListing}`)

  const { accountId, orgIdentifier: orgFromPath } = useParams<AccountPathProps & OrgPathProps>()
  const {
    verify,
    orgIdentifier: orgIdentifierQuery,
    page: pageIndex,
    size: pageSize,
    favorite
  } = useQueryParams<ProjectsPageQueryParams>(projectsPageQueryParamOptions)

  const {
    preference: orgFilterPreference,
    setPreference: setOrgFilterPreference,
    clearPreference: clearOrgFilterPreference
  } = usePreferenceStore<string>(PreferenceScope.USER, 'orgFilterOnProjectListing')
  const { preference: view = Views.GRID, setPreference: setView } = usePreferenceStore<Views | undefined>(
    PreferenceScope.MACHINE,
    'projectsViewType'
  )
  const [searchParam, setSearchParam] = useState<string>()
  const { updateQueryParams } = useUpdateQueryParams<ProjectsPageQueryParams>()
  const orgFilter = orgFromPath || orgIdentifierQuery || orgFilterPreference

  const { showSuccess } = useToaster()

  useEffect(
    () => {
      if (verify) {
        showSuccess(getString('common.banners.trial.success'))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [verify]
  )
  const { data, loading, refetch, error } = useGetProjectAggregateDTOList({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier: orgFilter,
      searchTerm: searchParam,
      pageIndex,
      pageSize,
      sortOrders: [sortPreference],
      onlyFavorites: favorite
    },
    queryParamStringifyOptions: { arrayFormat: 'repeat' },
    debounce: 300
  })

  const projectCreateSuccessHandler = (): void => {
    refetch()
  }

  const { openProjectModal, closeProjectModal } = useProjectModal({
    onSuccess: projectCreateSuccessHandler,
    onWizardComplete: () => {
      closeProjectModal()
      projectCreateSuccessHandler()
    }
  })

  const showEditProject = (project: Project): void => {
    openProjectModal(project)
  }

  const { openCollaboratorModal } = useCollaboratorModal()

  const showCollaborators = (project: Project): void => {
    openCollaboratorModal({ projectIdentifier: project.identifier, orgIdentifier: project.orgIdentifier || 'default' })
  }

  return (
    <Container className={css.projectsPage} height="inherit">
      <Page.Header breadcrumbs={<NGBreadcrumbs />} title={getString('projectsText')} />
      {data?.data?.totalItems || searchParam || loading || error || orgFilter || favorite ? (
        <Layout.Horizontal spacing="large" className={css.header}>
          <RbacButton
            featuresProps={{
              featuresRequest: {
                featureNames: [FeatureIdentifier.MULTIPLE_PROJECTS]
              }
            }}
            variation={ButtonVariation.PRIMARY}
            text={getString('projectsOrgs.newProject')}
            icon="plus"
            onClick={() => openProjectModal()}
          />
          <OrgDropdown
            value={{ value: orgFilter, label: orgFilter }}
            onChange={item => {
              if (isUndefined(item.value)) {
                return
              }
              if (item.value === '') {
                clearOrgFilterPreference()
              } else {
                setOrgFilterPreference(item.value as string)
              }
              updateQueryParams({ orgIdentifier: item.value.toString() })
            }}
            disabled={!!orgFromPath}
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
          <div style={{ flex: 1 }}></div>
          <ExpandingSearchInput
            alwaysExpanded
            onChange={text => {
              setSearchParam(text.trim())
              updateQueryParams({ page: 0 })
            }}
            width={300}
            className={css.expandSearch}
          />
          <GridListToggle initialSelectedView={view} onViewToggle={setView} />
        </Layout.Horizontal>
      ) : null}
      <Page.Body
        loading={loading}
        retryOnError={() => refetch()}
        error={(error?.data as Error)?.message || error?.message}
        noData={
          !searchParam && !favorite && openProjectModal
            ? {
                when: () => !data?.data?.content?.length,
                image: ProjectsEmptyState,
                imageClassName: css.imageClassName,
                messageTitle: getString('projectsOrgs.youHaveNoProjects'),
                message: getString('projectDescription'),
                button: (
                  <RbacButton
                    featuresProps={{
                      featuresRequest: {
                        featureNames: [FeatureIdentifier.MULTIPLE_PROJECTS]
                      }
                    }}
                    size={ButtonSize.LARGE}
                    variation={ButtonVariation.PRIMARY}
                    text={getString('projectsOrgs.createAProject')}
                    onClick={() => openProjectModal?.()}
                  />
                )
              }
            : {
                when: () => !data?.data?.content?.length,
                image: ProjectsEmptyState,
                imageClassName: css.imageClassName,
                messageTitle: getString('noProjects')
              }
        }
      >
        <ListHeader
          selectedSortMethod={sortPreference}
          sortOptions={[...sortByName, ...sortByCreated, ...sortByLastModified]}
          onSortMethodChange={option => {
            setSortPreference(option.value as SortMethod)
          }}
          totalCount={data?.data?.totalItems}
          className={css.listHeader}
        />
        {view === Views.GRID ? (
          <ProjectsGridView
            data={data}
            showEditProject={showEditProject}
            collaborators={showCollaborators}
            reloadPage={refetch}
            onProjectClick={onProjectClick}
          />
        ) : null}
        {view === Views.LIST ? (
          <ProjectsListView
            data={data}
            showEditProject={showEditProject}
            collaborators={showCollaborators}
            reloadPage={refetch}
            onProjectClick={onProjectClick}
          />
        ) : null}
      </Page.Body>
    </Container>
  )
}

export default ProjectsListPage
