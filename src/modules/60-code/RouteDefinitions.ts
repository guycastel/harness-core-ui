/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { AccountPathProps, ProjectPathProps, RequiredField } from '@common/interfaces/RouteInterfaces'
import routes from '@common/RouteDefinitions'
import { withModeModuleAndScopePrefix } from '@common/RouteDefinitionsV2'
import { NAV_MODE } from '@modules/10-common/utils/routeUtils'

export interface CODEProps {
  space?: string
  repoPath?: string
  repoName?: string
  gitRef?: string
  resourcePath?: string
  commitRef?: string
  branch?: string
  tag?: string
  diffRefs?: string // comparing diff refs, i.e: main...v1.0.1
  pullRequestId?: string
  pullRequestSection?: string // commits | diffs | checks ...
  webhookId?: string
  commitSHA?: string
  settingSection?: string
  ruleId?: string
  settingSectionMode?: string
}

export type CODEPathProps = RequiredField<
  Partial<Pick<ProjectPathProps, 'accountId' | 'orgIdentifier' | 'projectIdentifier'>>,
  'accountId' | 'orgIdentifier' | 'projectIdentifier'
> &
  Omit<CODEProps, 'space' | 'repoPath'>

type NavMode = {
  mode?: NAV_MODE
}

const REPOS_PREFIX = '/repos'
const CODE = 'code'

export const routesV2 = {
  toCODEHome: ({ space, mode }: Required<Pick<CODEProps, 'space'>> & NavMode) => {
    const [accountId] = space.split('/')
    return withModeModuleAndScopePrefix<AccountPathProps>(() => '/home')({
      module: CODE,
      accountId,
      ...(mode ? { mode } : undefined)
    })
  },
  toCODEHomeTrial: ({ space, mode }: Required<Pick<CODEProps, 'space'>> & NavMode) => {
    const [accountId] = space.split('/')
    return withModeModuleAndScopePrefix<AccountPathProps>(() => '/home/trial')({
      module: CODE,
      accountId,
      ...(mode ? { mode } : undefined)
    })
  },
  toCODERepositories: ({ space, mode }: Required<Pick<CODEProps, 'space'>> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier] = space.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(() => REPOS_PREFIX)({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODERepository: ({
    repoPath,
    gitRef,
    resourcePath,
    mode
  }: RequiredField<Pick<CODEProps, 'repoPath' | 'gitRef' | 'resourcePath'>, 'repoPath'> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(
      () => `${REPOS_PREFIX}/${repoName}${gitRef ? '/files/' + gitRef : ''}${resourcePath ? '/~/' + resourcePath : ''}`
    )({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODEFileEdit: ({
    repoPath,
    gitRef,
    resourcePath,
    mode
  }: RequiredField<Pick<CODEProps, 'repoPath' | 'gitRef' | 'resourcePath'>, 'repoPath' | 'gitRef'> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(
      () => `${REPOS_PREFIX}/${repoName}/edit/${gitRef}/~/${resourcePath || ''}`
    )({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODECommits: ({
    repoPath,
    commitRef,
    mode
  }: RequiredField<Pick<CODEProps, 'repoPath' | 'commitRef'>, 'repoPath'> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(
      () => `${REPOS_PREFIX}/${repoName}/commits${commitRef ? '/' + commitRef : ''}`
    )({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODECommit: ({
    repoPath,
    commitRef,
    mode
  }: RequiredField<Pick<CODEProps, 'repoPath' | 'commitRef'>, 'repoPath'> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(
      () => `${REPOS_PREFIX}/${repoName}/commit${commitRef ? '/' + commitRef : ''}`
    )({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODEBranches: ({ repoPath, mode }: Required<Pick<CODEProps, 'repoPath'>> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(() => `${REPOS_PREFIX}/${repoName}/branches`)({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODETags: ({ repoPath, mode }: Required<Pick<CODEProps, 'repoPath'>> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(() => `${REPOS_PREFIX}/${repoName}/tags`)({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODEPullRequests: ({ repoPath, mode }: Required<Pick<CODEProps, 'repoPath'>> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(() => `${REPOS_PREFIX}/${repoName}/pulls`)({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODEPullRequest: ({
    repoPath,
    pullRequestId,
    pullRequestSection,
    commitSHA,
    mode
  }: RequiredField<
    Pick<CODEProps, 'repoPath' | 'pullRequestId' | 'pullRequestSection' | 'commitSHA'>,
    'repoPath' | 'pullRequestId'
  > &
    NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(
      () =>
        `${REPOS_PREFIX}/${repoName}/pulls/${pullRequestId}${pullRequestSection ? '/' + pullRequestSection : ''}${
          commitSHA ? '/' + commitSHA : ''
        }`
    )({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODECompare: ({ repoPath, diffRefs, mode }: Required<Pick<CODEProps, 'repoPath' | 'diffRefs'>> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(
      () => `${REPOS_PREFIX}/${repoName}/pulls/compare/${diffRefs}`
    )({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODESettings: ({
    repoPath,
    mode,
    settingSection,
    settingSectionMode,
    ruleId
  }: RequiredField<Pick<CODEProps, 'repoPath' | 'ruleId' | 'settingSection' | 'settingSectionMode'>, 'repoPath'> &
    NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(
      () =>
        `${REPOS_PREFIX}/${repoName}/settings${settingSection ? '/' + settingSection : ''}${
          ruleId ? '/' + ruleId : ''
        }${settingSectionMode ? '/' + settingSectionMode : ''}`
    )({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODEWebhooks: ({ repoPath, mode }: Required<Pick<CODEProps, 'repoPath'>> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(() => `${REPOS_PREFIX}/${repoName}/webhooks`)({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODEWebhookNew: ({ repoPath, mode }: Required<Pick<CODEProps, 'repoPath'>> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(() => `${REPOS_PREFIX}/${repoName}/webhooks/new`)({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODEWebhookDetails: ({
    repoPath,
    webhookId,
    mode
  }: Required<Pick<CODEProps, 'repoPath' | 'webhookId'>> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(() => `${REPOS_PREFIX}/${repoName}/webhooks/${webhookId}`)({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODEProjectSearch: ({ space, mode }: Required<Pick<CODEProps, 'space'>> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier] = space.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(() => '/search')({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  },

  toCODERepositorySearch: ({ repoPath, mode }: Required<Pick<CODEProps, 'repoPath'>> & NavMode) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return withModeModuleAndScopePrefix<ProjectPathProps>(() => `${REPOS_PREFIX}/${repoName}/search`)({
      module: CODE,
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...(mode ? { mode } : undefined)
    })
  }
}

export default {
  toCODE: routes.toCODE,
  toCODEHome: routes.toCODEHome,
  toCODEHomeTrial: routes.toCODEHomeTrial,
  toCODERepositories: ({ space }: Required<Pick<CODEProps, 'space'>>) => {
    const [accountId, orgIdentifier, projectIdentifier] = space.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}`
  },
  toCODERepository: ({
    repoPath,
    gitRef,
    resourcePath
  }: RequiredField<Pick<CODEProps, 'repoPath' | 'gitRef' | 'resourcePath'>, 'repoPath'>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}${
      gitRef ? '/files/' + gitRef : ''
    }${resourcePath ? '/~/' + resourcePath : ''}`
  },
  toCODEFileEdit: ({
    repoPath,
    gitRef,
    resourcePath
  }: RequiredField<Pick<CODEProps, 'repoPath' | 'gitRef' | 'resourcePath'>, 'repoPath' | 'gitRef'>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/edit/${gitRef}/~/${
      resourcePath || ''
    }`
  },
  toCODECommits: ({ repoPath, commitRef }: RequiredField<Pick<CODEProps, 'repoPath' | 'commitRef'>, 'repoPath'>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/commits${
      commitRef ? '/' + commitRef : ''
    }`
  },
  toCODECommit: ({ repoPath, commitRef }: RequiredField<Pick<CODEProps, 'repoPath' | 'commitRef'>, 'repoPath'>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/commit${
      commitRef ? '/' + commitRef : ''
    }`
  },
  toCODEBranches: ({ repoPath }: Required<Pick<CODEProps, 'repoPath'>>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/branches`
  },
  toCODETags: ({ repoPath }: Required<Pick<CODEProps, 'repoPath'>>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/tags`
  },
  toCODEPullRequests: ({ repoPath }: Required<Pick<CODEProps, 'repoPath'>>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/pulls`
  },
  toCODEPullRequest: ({
    repoPath,
    pullRequestId,
    pullRequestSection,
    commitSHA
  }: RequiredField<
    Pick<CODEProps, 'repoPath' | 'pullRequestId' | 'pullRequestSection' | 'commitSHA'>,
    'repoPath' | 'pullRequestId'
  >) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/pulls/${pullRequestId}${
      pullRequestSection ? '/' + pullRequestSection : ''
    }${commitSHA ? '/' + commitSHA : ''}`
  },
  toCODECompare: ({ repoPath, diffRefs }: Required<Pick<CODEProps, 'repoPath' | 'diffRefs'>>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/pulls/compare/${diffRefs}`
  },
  toCODESettings: ({
    repoPath,
    settingSection,
    settingSectionMode,
    ruleId
  }: RequiredField<Pick<CODEProps, 'repoPath' | 'ruleId' | 'settingSection' | 'settingSectionMode'>, 'repoPath'>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/settings${
      settingSection ? '/' + settingSection : ''
    }${ruleId ? '/' + ruleId : ''}${settingSectionMode ? '/' + settingSectionMode : ''}`
  },
  toCODEWebhooks: ({ repoPath }: Required<Pick<CODEProps, 'repoPath'>>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/webhooks`
  },
  toCODEWebhookNew: ({ repoPath }: Required<Pick<CODEProps, 'repoPath'>>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/webhooks/new`
  },
  toCODEWebhookDetails: ({ repoPath, webhookId }: Required<Pick<CODEProps, 'repoPath' | 'webhookId'>>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/webhooks/${webhookId}`
  },
  toCODEProjectSearch: ({ space }: Required<Pick<CODEProps, 'space'>>) => {
    const [accountId, orgIdentifier, projectIdentifier] = space.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/search`
  },
  toCODERepositorySearch: ({ repoPath }: Required<Pick<CODEProps, 'repoPath'>>) => {
    const [accountId, orgIdentifier, projectIdentifier, repoName] = repoPath.split('/')
    return `/account/${accountId}/code/${orgIdentifier}/${projectIdentifier}/${repoName}/search`
  }
}
