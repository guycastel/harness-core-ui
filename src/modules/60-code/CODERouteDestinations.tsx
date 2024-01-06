/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Redirect, Switch } from 'react-router-dom'
import commonRoutes from '@common/RouteDefinitionsV2'
import { routesV2 as routes } from '@modules/60-code/RouteDefinitions'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { Scope } from 'framework/types/types'
import { RouteWithContext } from '@common/router/RouteWithContext/RouteWithContext'
// import { RedirectToModuleTrialHomeFactory, RedirectToSubscriptionsFactory } from '@common/Redirects'
// import { LICENSE_STATE_NAMES, LicenseRedirectProps } from 'framework/LicenseStore/LicenseStoreContext'
import { accountPathProps, projectPathProps, NAV_MODE, orgPathProps } from '@common/utils/routeUtils'
import { ModuleName } from 'framework/types/ModuleName'
import { PAGE_NAME } from '@common/pages/pageContext/PageName'
import { useGetSelectedScope } from '@common/navigation/SideNavV2/SideNavV2.utils'
import {
  Branches,
  Commit,
  Commits,
  Compare,
  FileEdit,
  PullRequest,
  PullRequests,
  Repositories,
  Repository,
  Search,
  Settings,
  Tags,
  WebhookDetails,
  WebhookNew,
  Webhooks
} from './CodeApp'
import { codePathProps } from './RouteDestinations'
import CODEHomePage from './pages/home/CODEHomePage'
import CODETrialHomePage from './pages/home/CODETrialHomePage'

export default function CODERouteDestinations(mode = NAV_MODE.MODULE): React.ReactElement {
  const routePaths = buildCODERoutePaths(mode)
  // const licenseRedirectData: LicenseRedirectProps = {
  //   licenseStateName: LICENSE_STATE_NAMES.CODE_LICENSE_STATE,
  //   startTrialRedirect: RedirectToModuleTrialHomeFactory(ModuleName.CODE),
  //   expiredTrialRedirect: RedirectToSubscriptionsFactory(ModuleName.CODE)
  // }
  return (
    <Switch>
      <RouteWithContext
        exact
        path={[
          commonRoutes.toMode({ ...projectPathProps, module: CODE, mode }),
          commonRoutes.toMode({ ...orgPathProps, module: CODE, mode }),
          commonRoutes.toMode({ ...accountPathProps, module: CODE, mode })
        ]}
      >
        <CODERedirect />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODEHomeTrial} pageName={PAGE_NAME.CODETrialHomePage}>
        <CODETrialHomePage />
      </RouteWithContext>

      <RouteWithContext
        // licenseRedirectData={licenseRedirectData}
        exact
        path={routePaths.toCODEHome}
        pageName={PAGE_NAME.CODEHomePage}
      >
        <CODEHomePage />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODECompare} pageName={PAGE_NAME.CODEPullRequestsCompare}>
        <Compare />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODEPullRequest} pageName={PAGE_NAME.CODEPullRequests} exact>
        <PullRequest />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODEPullRequests} pageName={PAGE_NAME.CODEPullRequests} exact>
        <PullRequests />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODEWebhookNew} pageName={PAGE_NAME.CODEWebhookNew} exact>
        <WebhookNew />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODESearch} pageName={PAGE_NAME.CODERepository} exact>
        <Search />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODEWebhookDetails} pageName={PAGE_NAME.CODEWebhookDetails}>
        <WebhookDetails />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODEWebhooks} pageName={PAGE_NAME.CODEWebhooks} exact>
        <Webhooks />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODESettings} pageName={PAGE_NAME.CODESettings} exact>
        <Settings />
      </RouteWithContext>

      <RouteWithContext
        // licenseRedirectData={licenseRedirectData}
        path={routePaths.toCODERepositories}
        pageName={PAGE_NAME.CODERepositories}
        exact
      >
        <Repositories />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODECommits} pageName={PAGE_NAME.CODECommits}>
        <Commits />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODECommit} pageName={PAGE_NAME.CODECommits}>
        <Commit />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODEBranches} pageName={PAGE_NAME.CODEBranches} exact>
        <Branches />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODETags} pageName={PAGE_NAME.CODETags} exact>
        <Tags />
      </RouteWithContext>

      <RouteWithContext path={routePaths.toCODEFileEdit} pageName={PAGE_NAME.CODEFileEdit}>
        <FileEdit />
      </RouteWithContext>

      <RouteWithContext
        // licenseRedirectData={licenseRedirectData}
        path={routePaths.toCODERepository}
        pageName={PAGE_NAME.CODERepository}
      >
        <Repository />
      </RouteWithContext>
    </Switch>
  )
}

export const buildCODERoutePaths = (mode: NAV_MODE): Record<string, string | string[]> => {
  const repoPath = [
    codePathProps.accountId,
    codePathProps.orgIdentifier,
    codePathProps.projectIdentifier,
    codePathProps.repoName
  ].join('/')

  return {
    toCODERepositories: routes.toCODERepositories({
      space: [codePathProps.accountId, codePathProps.orgIdentifier, codePathProps.projectIdentifier].join('/'),
      mode
    }),
    toCODEHome: routes.toCODEHome({
      space: [codePathProps.accountId].join('/'),
      mode
    }),
    toCODEHomeTrial: routes.toCODEHomeTrial({
      space: [codePathProps.accountId].join('/'),
      mode
    }),
    toCODERepository: [
      routes.toCODERepository({
        repoPath,
        gitRef: codePathProps.gitRef,
        resourcePath: codePathProps.resourcePath,
        mode
      }),
      routes.toCODERepository({
        repoPath,
        gitRef: codePathProps.gitRef,
        mode
      }),
      routes.toCODERepository({ repoPath, mode })
    ],
    toCODEFileEdit: routes.toCODEFileEdit({
      repoPath,
      gitRef: codePathProps.gitRef,
      resourcePath: codePathProps.resourcePath,
      mode
    }),
    toCODECommits: routes.toCODECommits({
      repoPath,
      commitRef: codePathProps.commitRef,
      mode
    }),
    toCODECommit: routes.toCODECommit({
      repoPath,
      commitRef: codePathProps.commitRef,
      mode
    }),
    toCODEBranches: routes.toCODEBranches({ repoPath, mode }),
    toCODETags: routes.toCODETags({ repoPath, mode }),
    toCODECompare: routes.toCODECompare({
      repoPath,
      diffRefs: codePathProps.diffRefs,
      mode
    }),
    toCODEPullRequests: routes.toCODEPullRequests({ repoPath, mode }),
    toCODEPullRequest: [
      routes.toCODEPullRequest({
        repoPath,
        pullRequestId: codePathProps.pullRequestId,
        pullRequestSection: codePathProps.pullRequestSection,
        commitSHA: codePathProps.commitSHA,
        mode
      }),
      routes.toCODEPullRequest({
        repoPath,
        pullRequestId: codePathProps.pullRequestId,
        pullRequestSection: codePathProps.pullRequestSection,
        mode
      }),
      routes.toCODEPullRequest({
        repoPath,
        pullRequestId: codePathProps.pullRequestId,
        mode
      })
    ],
    toCODEWebhooks: routes.toCODEWebhooks({ repoPath, mode }),
    toCODEWebhookNew: routes.toCODEWebhookNew({ repoPath, mode }),
    toCODEWebhookDetails: routes.toCODEWebhookDetails({
      repoPath,
      webhookId: codePathProps.webhookId,
      mode
    }),
    toCODESearch: [
      routes.toCODEProjectSearch({
        mode,
        space: [codePathProps.accountId, codePathProps.orgIdentifier, codePathProps.projectIdentifier].join('/')
      }),
      routes.toCODERepositorySearch({ repoPath, mode })
    ],
    toCODESettings: [
      routes.toCODESettings({ repoPath, mode }),
      routes.toCODESettings({
        repoPath,
        settingSection: codePathProps.settingSection,
        settingSectionMode: codePathProps.settingSectionMode,
        ruleId: codePathProps.ruleId,
        mode
      }),
      routes.toCODESettings({
        repoPath,
        settingSection: codePathProps.settingSection,
        settingSectionMode: codePathProps.settingSectionMode,
        mode
      }),

      routes.toCODESettings({ repoPath, settingSection: codePathProps.settingSection, mode })
    ]
  }
}

const CODERedirect: React.FC = () => {
  const { scope, params } = useGetSelectedScope()
  const { selectedProject } = useAppStore()

  if (scope === Scope.PROJECT) {
    if (selectedProject?.modules?.includes(ModuleName.CODE)) {
      return (
        <Redirect
          to={routes.toCODERepositories({
            space: [params?.accountId, params?.orgIdentifier, params?.projectIdentifier].join('/')
          })}
        />
      )
    }
  }
  if (scope === Scope.ORGANIZATION) {
    return <Redirect to={commonRoutes.toSettings({ orgIdentifier: params?.orgIdentifier, module: CODE })} />
  }

  return <Redirect to={commonRoutes.toCODEHome({ accountId: params?.accountId, module: CODE })} />
}

const CODE = 'code'
