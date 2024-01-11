/* eslint-disable react/function-component-definition */
/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Classes, Menu, PopoverInteractionKind, Position } from '@blueprintjs/core'
import { Color, FontVariation } from '@harness/design-system'
import {
  Button,
  Icon,
  Layout,
  Popover,
  Text,
  Container,
  TagsPopover,
  ButtonVariation,
  ButtonSize
} from '@harness/uicore'
import { defaultTo, isEmpty } from 'lodash-es'
import { useParams, Link, useHistory } from 'react-router-dom'
import type { Cell, CellValue, ColumnInstance, Renderer, Row, TableInstance } from 'react-table'
import ReactTimeago from 'react-timeago'
import React, { ReactNode } from 'react'
import cx from 'classnames'
import { StoreType } from '@common/constants/GitSyncTypes'
import routes from '@common/RouteDefinitions'
import { useRunPipelineModal } from '@pipeline/components/RunPipelineModal/useRunPipelineModal'
import { StatusHeatMap } from '@pipeline/components/StatusHeatMap/StatusHeatMap'
import useDeleteConfirmationDialog from '@pipeline/pages/utils/DeleteConfirmDialog'
import { getFeaturePropsForRunPipelineButton } from '@pipeline/utils/runPipelineUtils'
import RbacMenuItem from '@rbac/components/MenuItem/MenuItem'
import { usePermission } from '@rbac/hooks/usePermission'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { useStrings } from 'framework/strings'
import { Badge } from '@pipeline/pages/utils/Badge/Badge'
import { getReadableDateTime } from '@common/utils/dateUtils'
import { ResourceType as GitResourceType } from '@common/interfaces/GitSyncInterface'
import type { PipelineStageInfo, PMSPipelineSummaryResponse, RecentExecutionInfoDTO } from 'services/pipeline-ng'
import ExecutionStatusLabel from '@pipeline/components/ExecutionStatusLabel/ExecutionStatusLabel'
import { ExecutionStatus, ExecutionStatusEnum } from '@pipeline/utils/statusHelpers'
import type { GitQueryParams, PipelineType, Module } from '@common/interfaces/RouteInterfaces'
import { mapTriggerTypeToStringID } from '@pipeline/utils/triggerUtils'
import { AUTO_TRIGGERS } from '@pipeline/utils/constants'
import { killEvent } from '@common/utils/eventUtils'
import RbacButton from '@rbac/components/Button/Button'
import useMigrateResource from '@pipeline/components/MigrateResource/useMigrateResource'
import { MigrationType } from '@pipeline/components/MigrateResource/MigrateUtils'
import { useRunPipelineModalV1 } from '@pipeline/v1/components/RunPipelineModalV1/useRunPipelineModalV1'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useQueryParams } from '@common/hooks/useQueryParams'
import { isSimplifiedYAMLEnabled } from '@common/utils/utils'
import useEditGitMetadata from '@pipeline/components/MigrateResource/useEditGitMetadata'
import { YamlVersionBadge } from '@pipeline/common/components/YamlVersionBadge/YamlVersionBadge'
import { getRouteProps } from '../PipelineListUtils'
import type { PipelineListPagePathParams } from '../types'
import type { PipelineListColumnActions } from './PipelineListTable'
import { getChildExecutionPipelineViewLink } from '../../execution-list/ExecutionListTable/executionListUtils'
import css from './PipelineListTable.module.scss'

export const LabeValue = ({ label, value }: { label: string; value: ReactNode }): JSX.Element => {
  return (
    <Layout.Horizontal spacing="xsmall">
      <Text color={Color.GREY_200} font={{ variation: FontVariation.SMALL_SEMI }} lineClamp={1}>
        {label}:
      </Text>
      <Text color={Color.WHITE} font={{ variation: FontVariation.SMALL }} lineClamp={1}>
        {value}
      </Text>
    </Layout.Horizontal>
  )
}

type CellTypeWithActions<D extends Record<string, any>, V = any> = TableInstance<D> & {
  column: ColumnInstance<D> & PipelineListColumnActions
  row: Row<D>
  cell: Cell<D, V>
  value: CellValue<V>
}

type CellType = Renderer<CellTypeWithActions<PMSPipelineSummaryResponse>>

export const PipelineNameCell: CellType = ({ row }) => {
  const data = row.original
  const { getString } = useStrings()
  const pathParams = useParams<PipelineListPagePathParams>()

  return (
    <Layout.Horizontal flex={{ alignItems: 'center', justifyContent: 'start' }}>
      <div data-testid={data.identifier}>
        <Layout.Horizontal spacing="xsmall" flex={{ alignItems: 'center' }} margin={{ bottom: 'small' }}>
          <Link to={routes.toPipelineStudio(getRouteProps(pathParams, data))} onClick={e => e.stopPropagation()}>
            <Text
              font={{ variation: FontVariation.LEAD }}
              color={Color.PRIMARY_7}
              tooltipProps={{ isDark: true }}
              tooltip={
                <Layout.Vertical spacing="medium" padding="large" style={{ maxWidth: 400 }}>
                  <LabeValue label={getString('name')} value={data.name} />
                  <LabeValue label={getString('common.ID')} value={data.identifier} />
                  {data.description && <LabeValue label={getString('description')} value={data.description} />}
                </Layout.Vertical>
              }
              lineClamp={1}
            >
              {data.name}
            </Text>
          </Link>
          {data.tags && Object.keys(data.tags || {}).length ? (
            <TagsPopover tags={data.tags} iconProps={{ size: 12, color: Color.GREY_600 }} className={css.tags} />
          ) : null}
        </Layout.Horizontal>
        <Text color={Color.GREY_600} font="xsmall" lineClamp={1}>
          {getString('idLabel', { id: data.identifier })}
        </Text>
      </div>
      {data?.entityValidityDetails?.valid === false && (
        <Container margin={{ left: 'large' }}>
          <Badge
            text={'common.invalid'}
            iconName="error-outline"
            showTooltip={true}
            entityName={data.name}
            entityType={'Pipeline'}
          />
        </Container>
      )}

      {data.isDraft && (
        <div className={css.draft}>
          <Text font={{ variation: FontVariation.SMALL_SEMI }} color={Color.GREY_400}>
            {getString('pipeline.draft')}
          </Text>
        </div>
      )}
    </Layout.Horizontal>
  )
}

export const YamlVersionCell: CellType = ({ cell }) => {
  return <YamlVersionBadge version={cell.value} minimal />
}

export const CodeSourceCell: CellType = ({ row }) => {
  const { gitDetails } = row.original
  const { getString } = useStrings()
  const data = row.original
  const { isGitSyncEnabled: isGitSyncEnabledForProject, gitSyncEnabledOnlyForFF } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const isRemote = data.storeType === StoreType.REMOTE || isGitSyncEnabled

  return (
    <div className={css.storeTypeColumnContainer}>
      <Popover
        disabled={!isRemote}
        position={Position.TOP}
        interactionKind={PopoverInteractionKind.HOVER}
        className={Classes.DARK}
        content={
          <Layout.Vertical spacing="small" padding="large" style={{ maxWidth: 400 }}>
            <Layout.Horizontal spacing="small" flex={{ alignItems: 'center', justifyContent: 'start' }}>
              {isEmpty(data.connectorRef) ? (
                <Icon name="code" size={17} />
              ) : (
                <Icon name="github" size={14} color={Color.GREY_200} />
              )}
              <Text color={Color.WHITE} font={{ variation: FontVariation.SMALL }} lineClamp={1}>
                {gitDetails?.repoName || gitDetails?.repoIdentifier}
              </Text>
            </Layout.Horizontal>
            <Layout.Horizontal spacing="small" flex={{ alignItems: 'center', justifyContent: 'start' }}>
              <Icon name="remotefile" size={14} color={Color.GREY_200} />
              <Text color={Color.WHITE} font={{ variation: FontVariation.SMALL }} lineClamp={1}>
                {gitDetails?.filePath}
              </Text>
            </Layout.Horizontal>
          </Layout.Vertical>
        }
      >
        <div className={css.storeTypeColumn}>
          <Icon name={isRemote ? 'remote-setup' : 'repository'} size={isRemote ? 12 : 10} color={Color.GREY_600} />
          <Text margin={{ left: 'xsmall' }} font={{ variation: FontVariation.TINY_SEMI }} color={Color.GREY_600}>
            {isRemote ? getString('repository') : getString('inline')}
          </Text>
        </div>
      </Popover>
    </div>
  )
}

export const LastExecutionCell: CellType = ({ row }) => {
  const { getString } = useStrings()
  const pathParams = useParams<PipelineType<PipelineListPagePathParams>>()
  const queryParams = useQueryParams<GitQueryParams>()
  const data = row.original
  const recentExecution: RecentExecutionInfoDTO = data.recentExecutionsInfo?.[0] || {}
  const { startTs, executorInfo, parentStageInfo } = recentExecution
  const executor = executorInfo?.email || executorInfo?.username
  const isAutoTrigger = AUTO_TRIGGERS.includes(executorInfo?.triggerType)
  const { hasparentpipeline = false, identifier: pipelineIdentifier } = defaultTo(
    parentStageInfo,
    {} as PipelineStageInfo
  )
  const toChildExecutionPipelineView = getChildExecutionPipelineViewLink<PMSPipelineSummaryResponse>(
    data,
    pathParams,
    queryParams
  )

  return (
    <Layout.Horizontal spacing="small" style={{ alignItems: 'center' }}>
      <div>
        <div className={cx(css.avatar, executor || hasparentpipeline ? css.trigger : css.neverRan)} onClick={killEvent}>
          {hasparentpipeline ? (
            <Link to={toChildExecutionPipelineView}>
              <Icon size={12} name={'chained-pipeline'} className={css.icon} />
            </Link>
          ) : executor ? (
            isAutoTrigger ? (
              <Link
                to={routes.toTriggersDetailPage({
                  ...getRouteProps(pathParams, data),
                  triggerIdentifier: executorInfo?.username || ''
                })}
              >
                <Icon
                  size={12}
                  name={executorInfo?.triggerType === 'SCHEDULER_CRON' ? 'stopwatch' : 'trigger-execution'}
                  aria-label="trigger"
                  className={css.icon}
                />
              </Link>
            ) : (
              executor?.charAt(0)
            )
          ) : (
            <Icon size={12} name="ci-build-pipeline" aria-label="trigger" color={Color.GREY_400} />
          )}
        </div>
      </div>

      {hasparentpipeline && startTs ? (
        <div>
          <Layout.Horizontal>
            <Link to={toChildExecutionPipelineView} onClick={killEvent}>
              <Text
                font={{ variation: FontVariation.SMALL_SEMI }}
                color={Color.PRIMARY_7}
                lineClamp={1}
                style={{ maxWidth: '150px' }}
                margin={{ right: 'xsmall' }}
              >
                {`${pipelineIdentifier}`}
              </Text>
            </Link>
            <Text color={Color.GREY_900} font={{ variation: FontVariation.SMALL }} lineClamp={1}>
              | {getString('common.pipeline')}
            </Text>
          </Layout.Horizontal>
          <Text color={Color.GREY_600} font={{ variation: FontVariation.TINY }} className={css.timeAgo}>
            <ReactTimeago date={startTs} />
          </Text>
        </div>
      ) : executor && startTs ? (
        <div>
          <Text color={Color.GREY_900} font={{ variation: FontVariation.SMALL }} lineClamp={1}>
            {executor}
          </Text>
          <Text color={Color.GREY_600} font={{ variation: FontVariation.TINY }} className={css.timeAgo}>
            <ReactTimeago date={startTs} />
          </Text>
        </div>
      ) : (
        <Text color={Color.GREY_400} font={{ variation: FontVariation.SMALL }}>
          {getString('pipeline.neverRan')}
        </Text>
      )}
    </Layout.Horizontal>
  )
}

export const LastModifiedCell: CellType = ({ row }) => {
  const data = row.original
  return (
    <Text color={Color.GREY_900} font={{ size: 'small' }}>
      {getReadableDateTime(data.lastUpdatedAt)}
    </Text>
  )
}

export const RunPipelineCell: CellType = ({ row }) => {
  const data = row.original
  const isPipelineInvalid = data?.entityValidityDetails?.valid === false
  const { getString } = useStrings()
  const pathParams = useParams<PipelineListPagePathParams>()
  const history = useHistory()
  return (
    <Layout.Horizontal flex={{ justifyContent: 'end' }} onClick={killEvent}>
      <RbacButton
        icon="run-pipeline"
        disabled={isPipelineInvalid}
        tooltip={isPipelineInvalid ? getString('pipeline.cannotRunInvalidPipeline') : getString('runPipeline')}
        intent="success"
        minimal
        size={ButtonSize.SMALL}
        onClick={() => history.push(routes.toPipelineStudio({ ...getRouteProps(pathParams, data), runPipeline: true }))}
        permission={{
          resource: {
            resourceType: ResourceType.PIPELINE,
            resourceIdentifier: data.identifier
          },
          permission: PermissionIdentifier.EXECUTE_PIPELINE
        }}
      />
    </Layout.Horizontal>
  )
}

export const MenuCell: CellType = ({ row, column }) => {
  const data = row.original
  const pathParams = useParams<PipelineListPagePathParams>()
  const { getString } = useStrings()
  const { projectIdentifier, orgIdentifier, accountId, module } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
    module: Module
  }>()

  const { confirmDelete } = useDeleteConfirmationDialog(data, 'pipeline', commitMsg =>
    column.onDeletePipeline!(commitMsg, data)
  )
  const { isGitSyncEnabled: isGitSyncEnabledForProject, gitSyncEnabledOnlyForFF } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const [canDelete, canRun, canEdit] = usePermission(
    {
      resourceScope: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier
      },
      resource: {
        resourceType: ResourceType.PIPELINE,
        resourceIdentifier: data.identifier as string
      },
      permissions: [
        PermissionIdentifier.DELETE_PIPELINE,
        PermissionIdentifier.EXECUTE_PIPELINE,
        PermissionIdentifier.EDIT_PIPELINE
      ]
    },
    [data.identifier]
  )

  const { CI_YAML_VERSIONING } = useFeatureFlags()
  const runPipeline = (): void => {
    isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING) ? openRunPipelineModalV1() : openRunPipelineModal()
  }
  const { openRunPipelineModal } = useRunPipelineModal({
    pipelineIdentifier: (data.identifier || '') as string,
    repoIdentifier: isGitSyncEnabled ? data.gitDetails?.repoIdentifier : data.gitDetails?.repoName,
    branch: data.gitDetails?.branch,
    connectorRef: data.connectorRef,
    storeType: data.storeType as StoreType
  })

  const { openRunPipelineModalV1 } = useRunPipelineModalV1({
    pipelineIdentifier: (data.identifier || '') as string,
    repoIdentifier: isGitSyncEnabled ? data.gitDetails?.repoIdentifier : data.gitDetails?.repoName,
    branch: data.gitDetails?.branch,
    connectorRef: data.connectorRef,
    storeType: data.storeType as StoreType
  })

  const { showMigrateResourceModal: showMoveResourceModal } = useMigrateResource({
    resourceType: GitResourceType.PIPELINES,
    modalTitle: getString('common.moveEntitytoGit', { resourceType: getString('common.pipeline') }),
    migrationType: MigrationType.INLINE_TO_REMOTE,
    extraQueryParams: { pipelineIdentifier: data.identifier, name: data?.name },
    onSuccess: () => column.refetchList?.()
  })

  const { showEditGitMetadataModal: showEditGitMetadataModal } = useEditGitMetadata({
    resourceType: GitResourceType.PIPELINES,
    identifier: data.identifier || '',
    metadata: {
      connectorRef: data?.connectorRef,
      repo: data?.gitDetails?.repoName,
      filePath: data?.gitDetails?.filePath
    },
    modalTitle: getString('pipeline.editGitDetailsTitle', {
      entity: `${getString('common.pipeline')}[${data.identifier}]`
    }),
    onSuccess: () => column.refetchList?.()
  })

  return (
    <Layout.Horizontal style={{ justifyContent: 'flex-end' }} onClick={killEvent}>
      <Popover className={Classes.DARK} position={Position.LEFT}>
        <Button variation={ButtonVariation.ICON} icon="Options" aria-label="pipeline menu actions" />
        <Menu style={{ backgroundColor: 'unset' }}>
          <RbacMenuItem
            icon="play"
            text={getString('runPipelineText')}
            disabled={!canRun || data?.entityValidityDetails?.valid === false}
            onClick={runPipeline}
            featuresProps={getFeaturePropsForRunPipelineButton({ modules: data.modules, getString })}
          />
          <Link className={css.link} to={routes.toPipelineStudio(getRouteProps(pathParams, data))}>
            <Menu.Item tagName="div" icon="cog" text={getString('pipeline.viewPipeline')} />
          </Link>
          <Link className={css.link} to={routes.toPipelineDeploymentList(getRouteProps(pathParams, data))}>
            <Menu.Item tagName="div" icon="list-detail-view" text={getString('viewExecutions')} />
          </Link>
          <Menu.Divider />
          <Menu.Item
            icon="duplicate"
            text={getString('projectCard.clone')}
            disabled={isGitSyncEnabled}
            onClick={() => {
              column.onClonePipeline!(data)
            }}
          />
          {data?.storeType === StoreType.INLINE || (!isGitSyncEnabled && !data?.storeType) ? (
            <RbacMenuItem
              icon="git-merge"
              text={getString('common.moveToGit')}
              disabled={!canEdit}
              onClick={() => {
                showMoveResourceModal()
              }}
              data-testid="moveConfigToRemote"
            />
          ) : null}
          <Menu.Item
            icon="trash"
            text={getString('delete')}
            disabled={!canDelete}
            onClick={() => {
              confirmDelete()
            }}
          />
          {data?.storeType === StoreType.REMOTE ? (
            <RbacMenuItem
              icon="edit"
              text={getString('pipeline.editGitDetails')}
              disabled={!canEdit}
              onClick={() => {
                showEditGitMetadataModal()
              }}
              data-testid="editGitMetadata"
            />
          ) : null}
        </Menu>
      </Popover>
    </Layout.Horizontal>
  )
}

export const RecentExecutionsCell: CellType = ({ row }) => {
  const { getString } = useStrings()
  const data = row.original
  let recentExecutions = data.recentExecutionsInfo || []
  const pathParams = useParams<PipelineType<PipelineListPagePathParams>>()
  const queryParams = useQueryParams<GitQueryParams>()
  const { projectIdentifier, orgIdentifier, accountId, module, source } = pathParams

  // Fill the size to adopt UX that always displays 10 items
  if (recentExecutions.length < 10) {
    const fillExecutions = Array(10 - recentExecutions.length).fill({ status: ExecutionStatusEnum.NotStarted })
    recentExecutions = [...recentExecutions, ...fillExecutions]
  }

  const getLinkProps = (executionIdentifier: string) => ({
    to: routes.toExecutionPipelineView({
      orgIdentifier,
      pipelineIdentifier: data.identifier || '',
      projectIdentifier,
      executionIdentifier,
      accountId,
      module,
      source: source || 'deployments',
      connectorRef: data.connectorRef,
      repoName: defaultTo(data.gitDetails?.repoName, data.gitDetails?.repoIdentifier),
      branch: data.gitDetails?.branch,
      storeType: data.storeType
    }),
    'aria-label': `Execution ${executionIdentifier}`
  })

  return (
    <div onClick={killEvent}>
      <StatusHeatMap
        className={css.recentExecutions}
        data={recentExecutions}
        getId={(i, index) => defaultTo(i.planExecutionId, index)}
        getStatus={i => i.status as ExecutionStatus}
        getLinkProps={i => (i.planExecutionId ? getLinkProps(i.planExecutionId) : undefined)}
        getPopoverProps={i => ({
          position: Position.TOP,
          interactionKind: PopoverInteractionKind.HOVER,
          content: (
            <Layout.Vertical padding="large" spacing="medium">
              <div className={css.statusLabel}>
                <ExecutionStatusLabel status={i.status as ExecutionStatus} />
              </div>
              {i.startTs && (
                <>
                  <LabeValue label={getString('pipeline.executionId')} value={i.runSequence || i.planExecutionId} />
                  <LabeValue
                    label={getString('common.executedBy')}
                    value={
                      <Layout.Horizontal spacing="xsmall" color={Color.WHITE} font="normal">
                        {i.parentStageInfo?.hasparentpipeline ? (
                          <Link
                            to={getChildExecutionPipelineViewLink<PMSPipelineSummaryResponse>(
                              { ...data, parentStageInfo: i.parentStageInfo } as PMSPipelineSummaryResponse,
                              pathParams,
                              queryParams
                            )}
                            onClick={killEvent}
                          >
                            <Text
                              font={{ variation: FontVariation.SMALL_SEMI }}
                              color={Color.PRIMARY_7}
                              lineClamp={1}
                              style={{ maxWidth: '250px' }}
                            >
                              {`${i.parentStageInfo?.identifier}`}
                            </Text>
                          </Link>
                        ) : (
                          <span>{i.executorInfo?.email || i.executorInfo?.username}</span>
                        )}
                        <span>|</span>
                        <ReactTimeago date={i.startTs} />
                      </Layout.Horizontal>
                    }
                  />
                  <LabeValue
                    label={getString('common.triggerName')}
                    value={getString(mapTriggerTypeToStringID(i.executorInfo?.triggerType))}
                  />
                </>
              )}
            </Layout.Vertical>
          ),
          className: Classes.DARK
        })}
      />
    </div>
  )
}
