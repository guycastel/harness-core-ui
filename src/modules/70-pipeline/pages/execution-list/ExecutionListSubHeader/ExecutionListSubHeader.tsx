/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useParams } from 'react-router-dom'
import {
  ButtonVariation,
  Checkbox,
  ExpandingSearchInput,
  ExpandingSearchInputHandle,
  SelectOption
} from '@harness/uicore'
import { Color } from '@harness/design-system'
import cx from 'classnames'
import { isEmpty } from 'lodash-es'
import BranchFilter from '@common/components/BranchFilter/BranchFilter'
import { useStrings } from 'framework/strings'
import type {
  GitQueryParams,
  PipelinePathProps,
  PipelineType,
  ProjectPathProps
} from '@common/interfaces/RouteInterfaces'
import StatusSelect from '@pipeline/components/StatusSelect/StatusSelect'
import NewPipelineSelect from '@pipeline/components/NewPipelineSelect/NewPipelineSelect'
import { getFeaturePropsForRunPipelineButton, getRbacButtonModules } from '@pipeline/utils/runPipelineUtils'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { Page } from '@common/exports'
import type { ExecutionStatus } from '@pipeline/utils/statusHelpers'
import { GetListOfExecutionsQueryParams, useGetExecutionRepositoriesList } from 'services/pipeline-ng'
import RbacButton from '@rbac/components/Button/Button'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { useExecutionCompareContext } from '@pipeline/components/ExecutionCompareYaml/ExecutionCompareContext'
import { DEFAULT_PAGE_INDEX } from '@pipeline/utils/constants'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { StoreType } from '@common/constants/GitSyncTypes'
import RepoFilter from '@common/components/RepoFilter/RepoFilter'
import { ExecutionCompareYamlHeader } from '@pipeline/components/ExecutionCompareYaml/ExecutionCompareYamlHeader'
import { Width } from '@common/constants/Utils'
import { ExecutionListFilter } from '../ExecutionListFilter/ExecutionListFilter'
import type { ExecutionListProps } from '../ExecutionList'
import { useExecutionListQueryParams } from '../utils/executionListUtil'
import css from './ExecutionListSubHeader.module.scss'

export interface FilterQueryParams {
  query?: string
  pipeline?: string
  status?: ExecutionStatus | null
}

interface ExecutionListSubHeaderProps {
  borderless: boolean
  onBranchChange: (branch: string) => void
  selectedBranch: string | undefined
  showRepoBranchFilter?: boolean
  onChangeRepo?: (repoName: string) => void
  repoName?: string
}

const ExecutionListFilterMemo = React.memo(ExecutionListFilter)

function _ExecutionListSubHeader(
  props: Pick<ExecutionListProps, 'isPipelineInvalid' | 'onRunPipeline' | 'showBranchFilter' | 'isExecutionPage'> &
    ExecutionListSubHeaderProps,
  ref: React.ForwardedRef<ExpandingSearchInputHandle>
): React.ReactElement {
  const { module, pipelineIdentifier } = useParams<Partial<PipelineType<PipelinePathProps>>>()
  const queryParams = useExecutionListQueryParams()
  const { updateQueryParams } = useUpdateQueryParams<Partial<GetListOfExecutionsQueryParams>>()
  const { storeType } = useQueryParams<GitQueryParams>()
  const rbacButtonModules = getRbacButtonModules(module)
  const { getString } = useStrings()
  const { isCompareMode } = useExecutionCompareContext()
  const {
    supportingGitSimplification,
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF
  } = useAppStore()
  const { borderless = true, onBranchChange, selectedBranch } = props
  const isPipelineRemote = supportingGitSimplification && storeType === StoreType.REMOTE
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF

  const changeQueryParam = <T extends keyof GetListOfExecutionsQueryParams>(
    key: T,
    value: GetListOfExecutionsQueryParams[T]
  ): void => {
    updateQueryParams({ [key]: value || undefined, page: DEFAULT_PAGE_INDEX })
  }

  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()

  const {
    data: repoListData,
    error,
    loading,
    refetch
  } = useGetExecutionRepositoriesList({
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

  return (
    <Page.SubHeader className={css.main}>
      {isCompareMode ? (
        <ExecutionCompareYamlHeader />
      ) : (
        <div className={css.subHeaderItems}>
          {props.isExecutionPage && (
            <RbacButton
              variation={ButtonVariation.PRIMARY}
              className={css.runButton}
              onClick={props.onRunPipeline}
              disabled={props.isPipelineInvalid}
              tooltip={props.isPipelineInvalid ? getString('pipeline.cannotRunInvalidPipeline') : ''}
              permission={{
                resource: {
                  resourceType: ResourceType.PIPELINE,
                  resourceIdentifier: pipelineIdentifier || queryParams.pipelineIdentifier
                },
                permission: PermissionIdentifier.EXECUTE_PIPELINE,
                options: {
                  skipCondition: ({ resourceIdentifier }) => !resourceIdentifier
                }
              }}
              featuresProps={getFeaturePropsForRunPipelineButton({ modules: rbacButtonModules, getString })}
            >
              {getString('runPipelineText')}
            </RbacButton>
          )}

          <Checkbox
            font={{ size: 'small', weight: 'semi-bold' }}
            color={Color.GREY_800}
            label={getString(
              (() => {
                switch (module) {
                  case 'ci':
                    return 'pipeline.myBuildsText'
                  case 'cd':
                    return 'pipeline.myDeploymentsText'
                  case 'sto':
                    return 'pipeline.mySecurityTestsText'
                  default:
                    return 'pipeline.myExecutionsText'
                }
              })()
            )}
            checked={queryParams.myDeployments}
            onChange={e => changeQueryParam('myDeployments', e.currentTarget.checked)}
            className={cx(css.myDeploymentsCheckbox, { [css.selected]: queryParams.myDeployments })}
          />

          {props.showBranchFilter && isPipelineRemote && !isGitSyncEnabled ? (
            <BranchFilter
              min-width={200}
              name="remoteBranch"
              repoName={props.repoName}
              onChange={(selected: SelectOption) => {
                onBranchChange(selected.value as string)
              }}
              selectedBranch={selectedBranch}
              branchSelectorClassName={cx(css.branchSelector, { [css.transparent]: borderless })}
              selectProps={{ borderless }}
            />
          ) : null}

          <StatusSelect
            value={queryParams.status as ExecutionStatus[]}
            onSelect={value => changeQueryParam('status', value as GetListOfExecutionsQueryParams['status'])}
          />
          {pipelineIdentifier ? null : (
            <NewPipelineSelect
              selectedPipeline={queryParams.pipelineIdentifier}
              onPipelineSelect={value => changeQueryParam('pipelineIdentifier', value)}
            />
          )}

          {props.showRepoBranchFilter && !isGitSyncEnabled && (
            <RepoFilter
              repositories={repositories}
              onChange={props.onChangeRepo}
              value={props.repoName}
              showBranchFilter={props.showRepoBranchFilter}
              onBranchChange={(selected: SelectOption) => {
                onBranchChange(selected.value as string)
              }}
              selectedBranch={selectedBranch}
              isError={!isEmpty(error)}
              isLoadingRepos={loading}
              onRefetch={onRefetch}
            />
          )}
          <div className={css.flexExpand} />
          <ExpandingSearchInput
            defaultValue={queryParams.searchTerm}
            alwaysExpanded
            onChange={value => changeQueryParam('searchTerm', value)}
            width={Width.LARGE}
            ref={ref}
            key={[accountId, orgIdentifier, projectIdentifier].join()}
          />
          <ExecutionListFilterMemo />
        </div>
      )}
    </Page.SubHeader>
  )
}

export const ExecutionListSubHeader = React.forwardRef(_ExecutionListSubHeader)
