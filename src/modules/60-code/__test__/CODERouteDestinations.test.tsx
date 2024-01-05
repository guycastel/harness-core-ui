/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { NAV_MODE } from '@modules/10-common/utils/routeUtils'
import mockImport from 'framework/utils/mockImport'
import type { StringsMap } from 'stringTypes'
import CODERouteDestinations, { buildCODERoutePaths } from '../CODERouteDestinations'

// eslint-disable-next-line jest-no-mock
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: jest.fn()
  }),
  useRouteMatch: () => ({ params: { accountId: '1234', orgIdentifier: 'abc', projectIdentifier: 'xyz' } }),
  Switch: ({ children }: { children: JSX.Element }) => <>{children}</>,
  Redirect: () => <></>,
  useParams: () => ({ accountId: '1234' }),
  useLocation: () => ({ search: 'test' })
}))

jest.mock('@common/hooks', () => ({
  ...(jest.requireActual('@common/hooks') as any),
  useQueryParams: jest.fn().mockImplementation(() => ({ returnUrl: '/testing' }))
}))

jest.mock('@common/router/RouteWithContext/RouteWithContext', () => ({
  RouteWithContext: ({ children, path }: { children: JSX.Element; path: string }) => (
    <>
      {path}/{children}
    </>
  )
}))

jest.mock('framework/strings', () => ({
  useStrings: () => ({
    getString: (key: keyof StringsMap, _vars?: Record<string, any> | undefined) => key
  })
}))

jest.mock('@common/hooks/useTelemetry', () => ({
  useTelemetry: () => ({ identifyUser: jest.fn(), trackEvent: jest.fn() })
}))

jest.mock('@common/navigation/SideNavV2/SideNavV2.utils', () => ({
  useGetSelectedScope: () => ({
    scope: NAV_MODE.MODULE,
    params: { accountId: '1234', orgIdentifier: 'abc', projectIdentifier: 'xyz' }
  })
}))

jest.mock('framework/AppStore/AppStoreContext', () => ({
  useAppStore: () => ({ selectedProject: {} })
}))

jest.mock('../CodeApp', () => ({
  Branches: () => <div>code/Branches</div>,
  Commit: () => <div>code/Commit</div>,
  Commits: () => <div>code/Commits</div>,
  Compare: () => <div>code/Compare</div>,
  FileEdit: () => <div>code/FileEdit</div>,
  PullRequest: () => <div>code/PullRequest</div>,
  PullRequests: () => <div>code/PullRequests</div>,
  Repositories: () => <div>code/Repositories</div>,
  Repository: () => <div>code/Repository</div>,
  Search: () => <div>code/Search</div>,
  Settings: () => <div>code/Settings</div>,
  Tags: () => <div>code/Tags</div>,
  WebhookDetails: () => <div>code/WebhookDetails</div>,
  WebhookNew: () => <div>code/WebhookNew</div>,
  Webhooks: () => <div>code/Webhooks</div>
}))

mockImport('@common/hooks/useFeatureFlag', {
  useFeatureFlags: () => ({ CI_YAML_VERSIONING: true }),
  useFeatureFlag: () => false
})

describe('CODERouteDestinations Tests', () => {
  test('buildCODERoutePaths should render correct route paths for Module mode', async () => {
    const routePaths = buildCODERoutePaths(NAV_MODE.MODULE)

    expect(routePaths).toEqual({
      toCODEHome: '/account/:accountId/module/code/home',
      toCODEHomeTrial: '/account/:accountId/module/code/home/trial',
      toCODERepositories: '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos',
      toCODERepository: [
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/files/:gitRef*/~/:resourcePath*',
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/files/:gitRef*',
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName'
      ],
      toCODEFileEdit:
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/edit/:gitRef*/~/:resourcePath*',
      toCODECommits:
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/commits/:commitRef*',
      toCODECommit:
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/commit/:commitRef*',
      toCODEBranches:
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/branches',
      toCODETags:
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/tags',
      toCODECompare:
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/pulls/compare/:diffRefs*',
      toCODEPullRequests:
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/pulls',
      toCODEPullRequest: [
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/pulls/:pullRequestId/:pullRequestSection/:commitSHA',
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/pulls/:pullRequestId/:pullRequestSection',
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/pulls/:pullRequestId'
      ],
      toCODEWebhooks:
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/webhooks',
      toCODEWebhookNew:
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/webhooks/new',
      toCODEWebhookDetails:
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/webhooks/:webhookId',
      toCODESearch: [
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/search',
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/search'
      ],
      toCODESettings: [
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/settings',
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/settings/:settingSection/:ruleId/:settingSectionMode',
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/settings/:settingSection/:settingSectionMode',
        '/account/:accountId/module/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/settings/:settingSection'
      ]
    })
  })

  test('buildCODERoutePaths should render correct route paths for All mode', async () => {
    const routePaths = buildCODERoutePaths(NAV_MODE.ALL)

    expect(routePaths).toEqual({
      toCODEHome: '/account/:accountId/all/code/home',
      toCODEHomeTrial: '/account/:accountId/all/code/home/trial',
      toCODERepositories: '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos',
      toCODERepository: [
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/files/:gitRef*/~/:resourcePath*',
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/files/:gitRef*',
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName'
      ],
      toCODEFileEdit:
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/edit/:gitRef*/~/:resourcePath*',
      toCODECommits:
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/commits/:commitRef*',
      toCODECommit:
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/commit/:commitRef*',
      toCODEBranches:
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/branches',
      toCODETags: '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/tags',
      toCODECompare:
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/pulls/compare/:diffRefs*',
      toCODEPullRequests:
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/pulls',
      toCODEPullRequest: [
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/pulls/:pullRequestId/:pullRequestSection/:commitSHA',
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/pulls/:pullRequestId/:pullRequestSection',
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/pulls/:pullRequestId'
      ],
      toCODEWebhooks:
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/webhooks',
      toCODEWebhookNew:
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/webhooks/new',
      toCODEWebhookDetails:
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/webhooks/:webhookId',
      toCODESearch: [
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/search',
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/search'
      ],
      toCODESettings: [
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/settings',
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/settings/:settingSection/:ruleId/:settingSectionMode',
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/settings/:settingSection/:settingSectionMode',
        '/account/:accountId/all/code/orgs/:orgIdentifier/projects/:projectIdentifier/repos/:repoName/settings/:settingSection'
      ]
    })
  })

  test('CODERouteDestinations should render correct routes', async () => {
    const { container } = render(<>{CODERouteDestinations()}</>)
    await waitFor(() => {
      expect(container).toMatchSnapshot()
    })
  })
})
