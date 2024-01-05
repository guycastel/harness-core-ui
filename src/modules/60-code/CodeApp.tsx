/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
/* istanbul ignore file */
import React, { Suspense, lazy, useMemo, useState } from 'react'
import { useHistory, useRouteMatch } from 'react-router-dom'
import { ButtonProps, Container } from '@harness/uicore'
import { omit, isEmpty } from 'lodash-es'
import { GetDataError } from 'restful-react'
import AppErrorBoundary from 'framework/utils/AppErrorBoundary/AppErrorBoundary'
import { useStrings } from 'framework/strings'
import SessionToken from 'framework/utils/SessionToken'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { global401HandlerUtils } from '@common/utils/global401HandlerUtils'
import { PermissionsRequest, usePermission } from '@rbac/hooks/usePermission'
import { useCreateToken } from 'services/cd-ng'
import type { ResponseString } from 'services/cd-ng'
import { Failure, ResponsePipelineExecutionDetail, useGetExecutionDetailV2 } from 'services/pipeline-ng'
import { useDeepCompareEffect } from '@common/hooks'
import commonRoutes from '@common/RouteDefinitions'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import routes, { routesV2 } from './RouteDefinitions'
import { useLogsContentHook } from './hooks/useLogsContentHook'

export interface CodeExecutionDataResponse {
  data: ResponsePipelineExecutionDetail | null
  refetch: () => Promise<void>
  loading: boolean
  error: GetDataError<Failure | Error> | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RemoteViewProps = Record<string, any>

// eslint-disable-next-line import/no-unresolved
const RemoteCodeApp = lazy(() => import('code/App'))

// eslint-disable-next-line import/no-unresolved
const RemoteRepositories = lazy(() => import('code/Repositories'))

// eslint-disable-next-line import/no-unresolved
const RemoteRepository = lazy(() => import('code/Repository'))

// eslint-disable-next-line import/no-unresolved
const RemoteFileEdit = lazy(() => import('code/FileEdit'))

// eslint-disable-next-line import/no-unresolved
const RemoteCommits = lazy(() => import('code/Commits'))

// eslint-disable-next-line import/no-unresolved
const RemoteCommit = lazy(() => import('code/Commit'))

// eslint-disable-next-line import/no-unresolved
const RemoteBranches = lazy(() => import('code/Branches'))

// eslint-disable-next-line import/no-unresolved
const RemoteTags = lazy(() => import('code/Tags'))

// eslint-disable-next-line import/no-unresolved
const RemoteWebhooks = lazy(() => import('code/Webhooks'))

// eslint-disable-next-line import/no-unresolved
const RemoteWebhookNew = lazy(() => import('code/WebhookNew'))

// eslint-disable-next-line import/no-unresolved
const RemoteWebhookDetails = lazy(() => import('code/WebhookDetails'))

// eslint-disable-next-line import/no-unresolved
const RemoteSettings = lazy(() => import('code/Settings'))

// eslint-disable-next-line import/no-unresolved
const RemotePullRequests = lazy(() => import('code/PullRequests'))

// eslint-disable-next-line import/no-unresolved
const RemotePullRequest = lazy(() => import('code/PullRequest'))

// eslint-disable-next-line import/no-unresolved
const RemoteCompare = lazy(() => import('code/Compare'))

// eslint-disable-next-line import/no-unresolved
const RemoteSearch = lazy(() => import('code/Search'))

// eslint-disable-next-line import/no-unresolved
const RemoteNewRepoModalButton = lazy(() => import('code/NewRepoModalButton'))

const CODERemoteComponentMounter: React.FC<{
  component: JSX.Element
}> = ({ component }) => {
  const { isNewNavEnabled } = useAppStore()
  const { getString } = useStrings()
  const { params } = useRouteMatch<ProjectPathProps>()
  const space = useMemo(
    () => `${params.accountId}/${params.orgIdentifier}/${params.projectIdentifier}`,
    [params.accountId, params.orgIdentifier, params.projectIdentifier]
  )
  const history = useHistory()
  const { getToken: useGetToken } = SessionToken

  return (
    <Suspense fallback={<Container padding="large">{getString('loading')}</Container>}>
      <AppErrorBoundary>
        <RemoteCodeApp
          space={space}
          on401={() => {
            global401HandlerUtils(history)
          }}
          routes={omit(isNewNavEnabled ? routesV2 : routes, ['toCODE', 'toCODEHome'])}
          hooks={{
            useGetToken,
            usePermissionTranslate,
            useGenerateToken,
            useExecutionDataHook,
            useLogsContentHook
          }}
          currentUserProfileURL={commonRoutes.toUserProfile({ accountId: params.accountId })}
        >
          {component}
        </RemoteCodeApp>
      </AppErrorBoundary>
    </Suspense>
  )
}

export function useGenerateToken(hash?: string, parentId?: string, deps?: any[]): ResponseString | undefined {
  const { params } = useRouteMatch<ProjectPathProps>()
  const { mutate: createToken } = useCreateToken({
    queryParams: { accountIdentifier: params.accountId }
  })
  const [token, setToken] = useState<ResponseString>()
  useDeepCompareEffect(() => {
    if (deps) {
      const apiKeyName = `code_api_key`
      const tokenName = `code_token_${hash}`
      const apiKeyType = 'USER'

      createToken({
        accountIdentifier: params.accountId,
        apiKeyIdentifier: apiKeyName,
        apiKeyType: apiKeyType,
        identifier: tokenName,
        name: tokenName,
        parentIdentifier: parentId || ''
      })
        .then(res => {
          setToken(res)
          return res
        })
        .catch(err => {
          setToken(err)
        })
    }
  }, [deps])
  return token
}

export function useExecutionDataHook(
  executionIdentifier: string,
  selectedStageId: string,
  selectedStageExecutionId?: string,
  selectedChildStageId?: string
): CodeExecutionDataResponse | undefined {
  const { params } = useRouteMatch<ProjectPathProps>()
  const { data, refetch, loading, error } = useGetExecutionDetailV2({
    planExecutionId: executionIdentifier,
    queryParams: {
      orgIdentifier: params.orgIdentifier,
      projectIdentifier: params.projectIdentifier,
      accountIdentifier: params.accountId,
      stageNodeId: selectedStageId || undefined,
      ...(selectedStageId !== selectedStageExecutionId &&
        !isEmpty(selectedStageExecutionId) && {
          stageNodeExecutionId: selectedStageExecutionId
        }),
      ...(!isEmpty(selectedChildStageId) && {
        childStageNodeId: selectedChildStageId
      })
    },
    debounce: 500
  })

  return { data, refetch, loading, error }
}

// return tooltip from here and can be more specific or generic
export function usePermissionTranslate(
  usePermissionResult?: PermissionsRequest | undefined,
  deps?: any[],
  tooltip?: JSX.Element | string
): { disabled: boolean; tooltip: JSX.Element | string } | undefined {
  const res = usePermission(usePermissionResult, deps)
  const { getString } = useStrings()
  if (!res[0]) {
    return { disabled: !res[0], tooltip: tooltip ? tooltip : getString('code.missingPermission') }
  }
  return undefined
}

export const Repositories: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteRepositories {...props} />} />
)

export const Repository: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteRepository {...props} />} />
)

export const FileEdit: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteFileEdit {...props} />} />
)

export const Commits: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteCommits {...props} />} />
)

export const Commit: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteCommit {...props} />} />
)

export const Branches: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteBranches {...props} />} />
)

export const Tags: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteTags {...props} />} />
)

export const PullRequests: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemotePullRequests {...props} />} />
)

export const PullRequest: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemotePullRequest {...props} />} />
)

export const Compare: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteCompare {...props} />} />
)

export const Webhooks: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteWebhooks {...props} />} />
)

export const WebhookNew: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteWebhookNew {...props} />} />
)

export const WebhookDetails: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteWebhookDetails {...props} />} />
)

export const Settings: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteSettings {...props} />} />
)

export const Search: React.FC<RemoteViewProps> = props => (
  <CODERemoteComponentMounter component={<RemoteSearch {...props} />} />
)

interface TypesRepository {
  created?: number
  created_by?: number
  default_branch?: string
  description?: string
  fork_id?: number
  git_url?: string
  id?: number
  is_public?: boolean
  num_closed_pulls?: number
  num_forks?: number
  num_merged_pulls?: number
  num_open_pulls?: number
  num_pulls?: number
  parent_id?: number
  path?: string
  uid?: string
  updated?: number
}

interface NewRepoModalButtonProps extends Omit<ButtonProps, 'onClick' | 'onSubmit'> {
  space: string
  modalTitle: string
  submitButtonTitle?: string
  cancelButtonTitle?: string
  onSubmit: (data: TypesRepository) => void
}

export const NewRepoModalButton: React.FC<NewRepoModalButtonProps> = props => (
  <CODERemoteComponentMounter component={<RemoteNewRepoModalButton {...props} />} />
)
