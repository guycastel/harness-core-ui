/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { ReactNode } from 'react'
import { TabNavigation } from '@harness/uicore'
import { useParams } from 'react-router-dom'
import { Page } from '@common/exports'
import { useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import routesv1 from '@common/RouteDefinitions'
import routesv2 from '@common/RouteDefinitionsV2'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import type { ProjectPathProps, ModulePathParams } from '@common/interfaces/RouteInterfaces'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import DeprecatedCallout from '@gitsync/components/DeprecatedCallout/DeprecatedCallout'
import NewUserView from './newUser/NewUserView'

interface GitSyncPageProps {
  children: ReactNode
}

export const GitSyncLandingView: React.FC<GitSyncPageProps> = ({ children }) => {
  const { accountId, projectIdentifier, orgIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const { isGitSyncEnabled, gitSyncEnabledOnlyForFF } = useAppStore()
  const showDeprecatedCallout = isGitSyncEnabled && !gitSyncEnabledOnlyForFF
  const { getString } = useStrings()
  useDocumentTitle(getString('gitManagement'))
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesv2 : routesv1

  return (
    <>
      {showDeprecatedCallout && <DeprecatedCallout />}
      <Page.Header
        size="medium"
        breadcrumbs={<NGBreadcrumbs />}
        title={getString('gitManagement')}
        toolbar={
          isGitSyncEnabled ? (
            <TabNavigation
              links={[
                {
                  label: getString('repositories'),
                  to: routes.toGitSyncReposAdmin({ projectIdentifier, orgIdentifier, accountId, module })
                },
                {
                  label: getString('entities'),
                  to: routes.toGitSyncEntitiesAdmin({ projectIdentifier, orgIdentifier, accountId, module })
                },
                {
                  label: getString('errors'),
                  to: routes.toGitSyncErrors({ projectIdentifier, orgIdentifier, accountId, module })
                },
                {
                  label: getString('common.config'),
                  to: routes.toGitSyncConfig({ projectIdentifier, orgIdentifier, accountId, module })
                }
              ]}
            />
          ) : null
        }
      />
      <Page.Body>{isGitSyncEnabled ? children : <NewUserView />}</Page.Body>
    </>
  )
}

const GitSyncPage: React.FC<GitSyncPageProps> = ({ children }) => {
  return (
    <GitSyncStoreProvider>
      <GitSyncLandingView>{children}</GitSyncLandingView>
    </GitSyncStoreProvider>
  )
}

export default GitSyncPage
