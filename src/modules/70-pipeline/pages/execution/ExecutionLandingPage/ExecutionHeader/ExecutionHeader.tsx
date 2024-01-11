/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { concat, defaultTo, isEmpty, noop } from 'lodash-es'
import { Button, ButtonSize, ButtonVariation, Icon, IconName, Layout, Popover, Text } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { Menu, MenuItem, PopoverInteractionKind, Position } from '@blueprintjs/core'
import routes from '@common/RouteDefinitions'
import { Duration } from '@common/components/Duration/Duration'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import ExecutionStatusLabel from '@pipeline/components/ExecutionStatusLabel/ExecutionStatusLabel'
import ExecutionActions, { getValidExecutionActions } from '@pipeline/components/ExecutionActions/ExecutionActions'
import { formatDatetoLocale } from '@common/utils/dateUtils'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import GitPopover from '@pipeline/components/GitPopover/GitPopover'
import { String, useStrings } from 'framework/strings'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import { IfPrivateAccess } from 'framework/components/PublicAccess/PublicAccess'
import { usePermission } from '@rbac/hooks/usePermission'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import type { ExecutionPathProps, GitQueryParams, PipelineType } from '@common/interfaces/RouteInterfaces'
import { StoreType } from '@common/constants/GitSyncTypes'
import { ExecutionStatus, isRetryPipelineAllowed } from '@pipeline/utils/statusHelpers'
import { useExecutionContext } from '@pipeline/context/ExecutionContext'
import { TagsPopover } from '@common/components'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useDocumentFavicon } from '@common/hooks/useDocumentFavicon'
import { hasCIStage } from '@pipeline/utils/stageHelpers'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import RetryHistory from '@pipeline/components/RetryPipeline/RetryHistory/RetryHistory'
import { useRunPipelineModal } from '@pipeline/components/RunPipelineModal/useRunPipelineModal'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import GitRemoteDetails from '@common/components/GitRemoteDetails/GitRemoteDetails'
import { ExecutionCompiledYaml } from '@pipeline/components/ExecutionCompiledYaml/ExecutionCompiledYaml'
import { getFavIconDetailsFromPipelineExecutionStatus } from '@pipeline/utils/executionUtils'
import { PipelineExecutionSummary, ResponsePMSPipelineSummaryResponse } from 'services/pipeline-ng'
import { useQueryParams } from '@common/hooks'
import { isSimplifiedYAMLEnabled } from '@common/utils/utils'
import { useRunPipelineModalV1 } from '@pipeline/v1/components/RunPipelineModalV1/useRunPipelineModalV1'
import { ModuleName } from 'framework/types/ModuleName'
import { useOpenRetryPipelineModal } from '@pipeline/components/ExecutionActions/useOpenRetryPipelineModal'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { PipelineExecutionActions } from '@common/constants/TrackingConstants'
import { getFeaturePropsForRunPipelineButton } from '@pipeline/utils/runPipelineUtils'
import RbacButton from '@rbac/components/Button/Button'
import { YamlVersion, isYamlV1 } from '@modules/70-pipeline/common/hooks/useYamlVersion'
import { useNotesModal } from './NotesModal/useNotesModal'
import css from './ExecutionHeader.module.scss'

export interface ExecutionHeaderProps {
  pipelineMetadata?: ResponsePMSPipelineSummaryResponse | null
}

interface TooltipContentProps {
  pipelineExecutionSummary: PipelineExecutionSummary
}

const MemoizedTooltipContent = React.memo(({ pipelineExecutionSummary }: TooltipContentProps) => {
  const { getString } = useStrings()
  return (
    <Layout.Vertical padding="medium">
      <Duration
        className={css.duration}
        startTime={pipelineExecutionSummary.startTs}
        endTime={pipelineExecutionSummary.endTs}
        color={Color.WHITE}
      />
      {pipelineExecutionSummary.startTs && (
        <Text inline color={Color.WHITE} className={css.startTime}>
          {`${getString('pipeline.startTime')}: ${formatDatetoLocale(pipelineExecutionSummary.startTs)}`}
        </Text>
      )}
    </Layout.Vertical>
  )
})

MemoizedTooltipContent.displayName = 'MemoizedTooltipContent'

export function ExecutionHeader({ pipelineMetadata }: ExecutionHeaderProps): React.ReactElement {
  const { orgIdentifier, projectIdentifier, executionIdentifier, accountId, pipelineIdentifier, module, source } =
    useParams<PipelineType<ExecutionPathProps>>()
  const {
    branch: branchQueryParam,
    repoIdentifier: repoIdentifierQueryParam,
    repoName: repoNameQueryParam,
    connectorRef: connectorRefQueryParam
  } = useQueryParams<GitQueryParams>()
  const { refetch, pipelineExecutionDetail, isPipelineInvalid } = useExecutionContext()
  const {
    supportingGitSimplification,
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF
  } = useAppStore()
  const { getString } = useStrings()
  const { pipelineExecutionSummary = {} } = pipelineExecutionDetail || {}
  const { CI_REMOTE_DEBUG, CDS_MERGED_RUN_AND_RETRY_PIPELINE_COMPONENT } = useFeatureFlags()
  const { trackEvent } = useTelemetry()

  const [canView, canEdit, canExecute] = usePermission(
    {
      resourceScope: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier
      },
      resource: {
        resourceType: ResourceType.PIPELINE,
        resourceIdentifier: pipelineIdentifier as string
      },
      permissions: [
        PermissionIdentifier.VIEW_PIPELINE,
        PermissionIdentifier.EDIT_PIPELINE,
        PermissionIdentifier.EXECUTE_PIPELINE
      ]
    },
    [orgIdentifier, projectIdentifier, accountId, pipelineIdentifier]
  )
  const hasCI = hasCIStage(pipelineExecutionSummary)
  const [viewCompiledYaml, setViewCompiledYaml] = React.useState<PipelineExecutionSummary | undefined>(undefined)

  useDocumentTitle([
    `${pipelineExecutionSummary?.status ? pipelineExecutionSummary?.status + ' | ' : ''} ${
      pipelineExecutionSummary.name || getString('pipelines')
    } ${getString(
      module === 'cd' ? 'execution.pipelineIdentifierTextCD' : 'execution.pipelineIdentifierTextCI',
      pipelineExecutionSummary
    )}`
  ])

  const favIconDetails = React.useMemo(
    () => getFavIconDetailsFromPipelineExecutionStatus(pipelineExecutionSummary?.status),
    [pipelineExecutionSummary?.status]
  )

  useDocumentFavicon(favIconDetails)

  const repoName = pipelineExecutionSummary?.gitDetails?.repoName ?? repoNameQueryParam
  const repoIdentifier = defaultTo(
    pipelineExecutionSummary?.gitDetails?.repoIdentifier ?? repoIdentifierQueryParam,
    repoName
  )
  const connectorRef = pipelineExecutionSummary?.connectorRef ?? connectorRefQueryParam
  const branch = pipelineExecutionSummary?.gitDetails?.branch ?? branchQueryParam
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const { openRunPipelineModal } = useRunPipelineModal({
    pipelineIdentifier,
    executionId: executionIdentifier,
    repoIdentifier: isGitSyncEnabled ? repoIdentifier : repoName,
    branch,
    connectorRef,
    storeType: pipelineMetadata?.data?.storeType,
    stagesExecuted: pipelineExecutionSummary?.stagesExecuted
  })
  const { CI_YAML_VERSIONING } = useFeatureFlags()

  const pipelineStudioRoutingProps = {
    orgIdentifier,
    projectIdentifier,
    pipelineIdentifier,
    accountId,
    module,
    repoIdentifier,
    connectorRef,
    repoName,
    branch,
    storeType: pipelineMetadata?.data?.storeType
  }

  const { openRunPipelineModalV1 } = useRunPipelineModalV1({
    pipelineIdentifier,
    executionId: executionIdentifier,
    repoIdentifier: isGitSyncEnabled ? repoIdentifier : repoName,
    branch,
    connectorRef,
    storeType: pipelineMetadata?.data?.storeType
  })

  const { status, canRetry, modules, stagesExecuted, name } = pipelineExecutionSummary
  const params = {
    orgIdentifier,
    pipelineIdentifier,
    projectIdentifier,
    accountId,
    executionIdentifier,
    module,
    repoIdentifier,
    connectorRef,
    repoName,
    branch,
    storeType: pipelineMetadata?.data?.storeType,
    stagesExecuted,
    runSequence: pipelineExecutionDetail?.pipelineExecutionSummary?.runSequence,
    name
  }
  const { canRerun } = getValidExecutionActions(canExecute, status as ExecutionStatus)
  const showRetryPipelineOption = isRetryPipelineAllowed(status as ExecutionStatus) && canRetry
  const { openRetryPipelineModal } = useOpenRetryPipelineModal({ modules, params })
  const reRunPipeline = (): void => {
    trackEvent(PipelineExecutionActions.ReRunPipeline, { triggered_from: 'button' })
    isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING) ? openRunPipelineModalV1() : openRunPipelineModal()
  }

  const notesModal = useNotesModal({ planExecutionId: executionIdentifier, pipelineExecutionSummary })
  const isNotesPresent = pipelineExecutionSummary?.notesExistForPlanExecutionId || !isEmpty(notesModal.notes)
  const retryPipeline = (fromLastFailedStage?: boolean): void => {
    trackEvent(PipelineExecutionActions.RetryPipeline, {
      triggered_from: 'button',
      type: fromLastFailedStage ? 'last_failed_stage' : 'selected_stage'
    })

    if (CDS_MERGED_RUN_AND_RETRY_PIPELINE_COMPONENT) {
      openRunPipelineModal({ isRetryFromStage: true, preSelectLastStage: fromLastFailedStage })
    } else {
      openRetryPipelineModal(fromLastFailedStage)
    }
  }

  const tagsAndExecutionLabels = React.useMemo(() => {
    return concat(defaultTo(pipelineExecutionSummary?.tags, []), defaultTo(pipelineExecutionSummary?.labels, []))
  }, [pipelineExecutionSummary])

  const commonReRunProps = {
    variation: ButtonVariation.SECONDARY,
    dataTestid: 'retry-pipeline',
    icon: 'repeat' as IconName,
    text: getString('pipeline.execution.actions.reRun'),
    minimal: true,
    size: ButtonSize.SMALL,
    iconProps: { size: 12 },
    onClick: reRunPipeline,
    tooltipProps: {
      dataTooltipId: 'retry-pipeline'
    },
    disabled: !canExecute || isPipelineInvalid
  }

  let moduleLabel = getString('common.pipelineExecution')
  if (module) {
    switch (module.toUpperCase() as ModuleName) {
      case ModuleName.CD:
        moduleLabel = getString('deploymentsText')
        break
      case ModuleName.CI:
        moduleLabel = getString('buildsText')
        break
      case ModuleName.STO:
        moduleLabel = getString('common.purpose.sto.continuous')
        break
    }
  }

  const ReRunPipelineButtonPopover = (
    <Popover
      minimal
      content={
        <Menu>
          <MenuItem
            data-test-id="retry-failed-pipeline"
            onClick={() => retryPipeline(true)}
            text={getString('pipeline.execution.actions.reRunLastFailedStage')}
            disabled={isPipelineInvalid}
          />
          <MenuItem
            data-test-id="retry-failed-pipeline-specific-stage"
            onClick={() => retryPipeline()}
            text={getString('pipeline.execution.actions.reRunSelectedStage')}
            disabled={isPipelineInvalid}
          />
          <MenuItem
            data-test-id="rerun-pipeline"
            onClick={reRunPipeline}
            text={getString('common.pipeline')}
            disabled={isPipelineInvalid}
          />
        </Menu>
      }
      position={Position.BOTTOM_RIGHT}
      disabled={!canExecute || isPipelineInvalid}
    >
      <RbacButton
        {...commonReRunProps}
        rightIcon="caret-down"
        onClick={noop}
        featuresProps={getFeaturePropsForRunPipelineButton({ modules, getString })}
      />
    </Popover>
  )

  return (
    <header className={css.header}>
      <div className={css.headerTopRow}>
        <IfPrivateAccess>
          <NGBreadcrumbs
            links={
              source === 'deployments'
                ? [
                    {
                      url: routes.toDeployments({ orgIdentifier, projectIdentifier, accountId, module }),
                      label: moduleLabel
                    }
                  ]
                : [
                    {
                      url: routes.toPipelines({ orgIdentifier, projectIdentifier, accountId, module }),
                      label: getString('pipelines')
                    },
                    {
                      url: routes.toPipelineDeploymentList({
                        orgIdentifier,
                        projectIdentifier,
                        pipelineIdentifier,
                        accountId,
                        module,
                        repoIdentifier,
                        connectorRef,
                        repoName,
                        branch,
                        storeType: pipelineMetadata?.data?.storeType
                      }),
                      label: pipelineExecutionSummary.name || getString('common.pipeline')
                    }
                  ]
            }
          />
        </IfPrivateAccess>
        <div className={css.actionsBar}>
          {pipelineExecutionSummary.status ? (
            <ExecutionStatusLabel status={pipelineExecutionSummary.status as ExecutionStatus} />
          ) : null}
          <Duration
            className={css.duration}
            startTime={pipelineExecutionSummary.startTs}
            endTime={pipelineExecutionSummary.endTs}
            icon="time"
            iconProps={{ size: 12 }}
            durationText={' '}
            tooltip={<MemoizedTooltipContent pipelineExecutionSummary={pipelineExecutionSummary} />}
            tooltipProps={{
              isDark: true,
              interactionKind: PopoverInteractionKind.HOVER
            }}
          />
          <IfPrivateAccess>
            {pipelineExecutionSummary.showRetryHistory && (
              <RetryHistory
                canView={canView}
                showRetryHistory={pipelineExecutionSummary.showRetryHistory}
                canRetry={pipelineExecutionSummary.canRetry || false}
              />
            )}
            <Link
              className={css.view}
              to={
                isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING)
                  ? routes.toPipelineStudioV1(pipelineStudioRoutingProps)
                  : routes.toPipelineStudio(pipelineStudioRoutingProps)
              }
            >
              <Icon name="Edit" size={12} />
              <String stringID="editPipeline" />
            </Link>
            {canRerun &&
              (showRetryPipelineOption ? (
                ReRunPipelineButtonPopover
              ) : (
                <RbacButton
                  {...commonReRunProps}
                  text={getString('pipeline.execution.actions.rerunPipeline')}
                  featuresProps={getFeaturePropsForRunPipelineButton({ modules, getString })}
                />
              ))}
            <ExecutionActions
              executionStatus={pipelineExecutionSummary.status as ExecutionStatus}
              refetch={refetch}
              source={source}
              params={params}
              isPipelineInvalid={isPipelineInvalid}
              canEdit={canEdit}
              showEditButton={true}
              canExecute={canExecute}
              canRetry={pipelineExecutionSummary.canRetry}
              modules={pipelineExecutionSummary.modules}
              onReRunInDebugMode={
                hasCI && CI_REMOTE_DEBUG
                  ? isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING)
                    ? () => openRunPipelineModalV1(true)
                    : () => openRunPipelineModal({ debugMode: true })
                  : undefined
              }
              onViewCompiledYaml={/* istanbul ignore next */ () => setViewCompiledYaml(pipelineExecutionSummary)}
              hideRetryOption={true}
              shouldUseSimplifiedKey={pipelineExecutionSummary?.shouldUseSimplifiedKey}
            />
          </IfPrivateAccess>
        </div>
      </div>
      <div className={css.titleContainer}>
        <div className={css.title}>{pipelineExecutionSummary.name}</div>
        <String
          tagName="div"
          className={css.pipelineId}
          stringID={module === 'cd' ? 'execution.pipelineIdentifierTextCD' : 'execution.pipelineIdentifierTextCI'}
          vars={pipelineExecutionSummary}
        />
        <IfPrivateAccess>
          <Button
            minimal
            small
            icon={isNotesPresent ? 'code-chat' : 'Edit'}
            iconProps={{ size: isNotesPresent ? 14 : 12, className: css.chatButton }}
            withoutCurrentColor
            intent="primary"
            onClick={() => notesModal.onClick(true)}
            text={
              isNotesPresent
                ? getString('pipeline.executionNotes.viewNote')
                : getString('pipeline.executionNotes.addNote')
            }
            data-testid="addViewNotes"
            className={css.notesButton}
          />
        </IfPrivateAccess>
        {!isEmpty(tagsAndExecutionLabels) ? (
          <TagsPopover
            iconProps={{ size: 14 }}
            className={css.tags}
            popoverProps={{ wrapperTagName: 'div', targetTagName: 'div' }}
            {...(isYamlV1(pipelineExecutionSummary?.yamlVersion as YamlVersion) && {
              tagsTitle: getString('pipeline.tagsAndExecutionLabels')
            })}
            tags={(tagsAndExecutionLabels || []).reduce((val, tag) => {
              return Object.assign(val, { [defaultTo(tag.key, '')]: defaultTo(tag.value, '') })
            }, {} as { [key: string]: string })}
          />
        ) : null}
        {pipelineExecutionSummary.gitDetails ? (
          supportingGitSimplification && pipelineExecutionSummary?.storeType === StoreType.REMOTE ? (
            <div className={css.gitRemoteDetailsWrapper}>
              <GitRemoteDetails
                repoName={pipelineExecutionSummary.gitDetails.repoName}
                branch={pipelineExecutionSummary.gitDetails.branch}
                filePath={pipelineExecutionSummary.gitDetails.filePath}
                fileUrl={pipelineExecutionSummary.gitDetails.fileUrl}
                flags={{ readOnly: true }}
              />
            </div>
          ) : (
            <GitSyncStoreProvider>
              <GitPopover
                data={pipelineExecutionSummary.gitDetails}
                popoverProps={{ targetTagName: 'div', wrapperTagName: 'div', className: css.git }}
              />
            </GitSyncStoreProvider>
          )
        ) : null}
        <ExecutionCompiledYaml
          onClose={/* istanbul ignore next */ () => setViewCompiledYaml(undefined)}
          executionSummary={viewCompiledYaml}
        />
      </div>
    </header>
  )
}
