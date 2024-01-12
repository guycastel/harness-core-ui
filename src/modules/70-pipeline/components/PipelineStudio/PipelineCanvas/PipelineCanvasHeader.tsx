/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import {
  Button,
  ButtonVariation,
  Container,
  Icon,
  Layout,
  Popover,
  Text,
  useToaster,
  VisualYamlSelectedView as SelectedView,
  VisualYamlToggle
} from '@harness/uicore'
import { defaultTo, isEmpty, omit } from 'lodash-es'
import { useParams } from 'react-router-dom'
import { Classes, Menu, Position } from '@blueprintjs/core'

import { useGetCommunity } from '@common/utils/utils'
import { parse, stringify } from '@common/utils/YamlHelperMethods'
import useDiffDialog from '@common/hooks/useDiffDialog'
import RbacButton from '@rbac/components/Button/Button'
import { TagsPopover } from '@common/components'
import {
  SavePipelineHandle,
  SavePipelinePopoverWithRef
} from '@pipeline/components/PipelineStudio/SavePipelinePopover/SavePipelinePopover'
import GitRemoteDetails from '@common/components/GitRemoteDetails/GitRemoteDetails'
import { getFeaturePropsForRunPipelineButton } from '@pipeline/utils/runPipelineUtils'
import DescriptionPopover from '@common/components/DescriptionPopover.tsx/DescriptionPopover'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PipelineOutOfSyncErrorStrip } from '@pipeline/components/TemplateLibraryErrorHandling/PipelineOutOfSyncErrorStrip/PipelineOutOfSyncErrorStrip'
import { useStrings } from 'framework/strings'
import type {
  GitQueryParams,
  PathFn,
  PipelinePathProps,
  PipelineStudioQueryParams,
  PipelineType,
  RunPipelineQueryParams
} from '@common/interfaces/RouteInterfaces'
import type { GitFilterScope } from '@common/components/GitFilters/GitFilters'
import type { Pipeline } from '@pipeline/utils/types'
import type { Error } from 'services/pipeline-ng'
import RbacMenuItem from '@rbac/components/MenuItem/MenuItem'
import { useQueryParams } from '@common/hooks'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { YamlVersionBadge } from '@pipeline/common/components/YamlVersionBadge/YamlVersionBadge'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useYamlVersion } from '@pipeline/common/hooks/useYamlVersion'
import { getProvider } from '@common/components/GitProviderSelect/GitProviderSelect.utils'
import StudioGitPopover from '../StudioGitPopover'
import { usePipelineContext } from '../PipelineContext/PipelineContext'
import { DefaultNewPipelineId, DrawerTypes } from '../PipelineContext/PipelineActions'
import { EntityCachedCopy, EntityCachedCopyHandle } from './EntityCachedCopy/EntityCachedCopy'
import { getDuplicateIdentifiers } from './PipelineCanvasUtils'
import { ValidationBadge } from '../AsyncValidation/ValidationBadge'
import css from './PipelineCanvas.module.scss'

export interface PipelineCanvasHeaderProps {
  isPipelineRemote: boolean
  isGitSyncEnabled: boolean
  disableVisualView: boolean
  onGitBranchChange(selectedFilter: GitFilterScope, defaultSelected?: boolean): void
  setModalMode(mode: 'edit' | 'create'): void
  setYamlError(mode: boolean): void
  showModal(): void
  openRunPipelineModal(): void
  toPipelineStudio: PathFn<PipelineType<PipelinePathProps> & PipelineStudioQueryParams>
}

function getStudioSelectedView(isYaml: boolean, disableVisualView: boolean): SelectedView {
  return isYaml || disableVisualView ? SelectedView.YAML : SelectedView.VISUAL
}

export function PipelineCanvasHeader(props: PipelineCanvasHeaderProps): React.ReactElement {
  const {
    isPipelineRemote,
    isGitSyncEnabled,
    onGitBranchChange,
    setModalMode,
    setYamlError,
    showModal,
    disableVisualView,
    toPipelineStudio,
    openRunPipelineModal
  } = props
  const { getString } = useStrings()
  const {
    state,
    updatePipelineView,
    isReadonly,
    view,
    setView,
    updatePipeline,
    fetchPipeline,
    setSelectedStageId,
    setSelectedSectionId,
    reconcile: { reconcileData, reconcilePipeline, isFetchingReconcileData, outOfSync, setOutOfSync }
  } = usePipelineContext()
  const { showError, showSuccess, clear } = useToaster()
  const {
    pipeline,
    originalPipeline,
    gitDetails,
    cacheResponse: pipelineCacheResponse,
    pipelineView,
    yamlHandler,
    remoteFetchError,
    isUpdated,
    isMetadataUpdated,
    entityValidityDetails,
    modules
  } = state
  const params = useParams<PipelineType<PipelinePathProps> & GitQueryParams>()
  const { yamlVersion } = useYamlVersion()
  const { branch, repoName, connectorRef } = useQueryParams<GitQueryParams & RunPipelineQueryParams>()
  const { accountId, projectIdentifier, orgIdentifier, pipelineIdentifier } = params
  const { isYamlEditable } = pipelineView
  const { getRBACErrorMessage } = useRBACError()
  const savePipelineHandleRef = React.useRef<SavePipelineHandle | null>(null)
  const pipelineCachedCopyRef = React.useRef<EntityCachedCopyHandle | null>(null)
  const isCommunity = useGetCommunity()
  const { CDS_YAML_SIMPLIFICATION } = useFeatureFlags()

  const updateEntity = React.useCallback(async (entityYaml: string) => {
    await savePipelineHandleRef.current?.updatePipeline(entityYaml)
    setOutOfSync(false)
  }, [])

  const onRefreshEntity = React.useCallback(() => {
    fetchPipeline()
    setOutOfSync(false)
  }, [fetchPipeline])

  const isValidYaml = function (): boolean {
    if (yamlHandler) {
      try {
        const parsedYaml = parse<Pipeline>(yamlHandler.getLatestYaml())
        if (!parsedYaml) {
          clear()
          showError(getString('invalidYamlText'))
          return false
        }
        if (yamlHandler.getYAMLValidationErrorMap()?.size > 0) {
          clear()
          setYamlError(true)
          showError(getString('invalidYamlText'))
          return false
        }
        updatePipeline(parsedYaml.pipeline)
      } catch (e) {
        clear()
        setYamlError(true)
        showError(defaultTo(getRBACErrorMessage(e), getString('invalidYamlText')))
        return false
      }
    }
    return true
  }

  function handleViewChange(newView: SelectedView): boolean {
    if (newView === view) return false
    if (newView === SelectedView.VISUAL) {
      const duplicateStepIdentifiersList = pipeline?.stages ? getDuplicateIdentifiers(pipeline.stages) : []
      if (duplicateStepIdentifiersList.length) {
        clear()
        showError(
          getString('pipeline.duplicateStepIdentifiers', {
            duplicateIdString: duplicateStepIdentifiersList.join(', ')
          }),
          5000
        )
        return false
      }
      if (yamlHandler && isYamlEditable) {
        if (!isValidYaml()) return false
      }
    }
    setView(newView)
    updatePipelineView({
      splitViewData: {},
      isDrawerOpened: false,
      isYamlEditable: false,
      isSplitViewOpen: false,
      drawerData: { type: DrawerTypes.AddStep }
    })
    setSelectedStageId(undefined)
    setSelectedSectionId(undefined)
    return true
  }

  const { open: openDiffModal } = useDiffDialog({
    originalYaml: stringify({ pipeline: omit(originalPipeline, 'repo', 'branch') }),
    updatedYaml: stringify({ pipeline: omit(pipeline, 'repo', 'branch') }),
    title: getString('pipeline.piplineDiffTitle')
  })

  const isYaml = view === SelectedView.YAML

  function handleEditClick(): void {
    setModalMode('edit')
    showModal()
  }

  function handleDiscardClick(): void {
    updatePipelineView({ ...pipelineView, isYamlEditable: false })
    fetchPipeline()
  }

  function handleRunClick(e: React.SyntheticEvent): void {
    e.stopPropagation()
    openRunPipelineModal()
  }

  let runTooltip = ''

  if (entityValidityDetails?.valid === false) {
    runTooltip = getString('pipeline.cannotRunInvalidPipeline')
  } else if (isUpdated) {
    runTooltip = getString('pipeline.cannotRunUnsavedPipeline')
  }

  function handleReconcile(showToast: boolean): void {
    reconcilePipeline()
    showToast && showSuccess(getString('pipeline.outOfSyncErrorStrip.reconcileStarted'))
  }

  function handleReloadFromGitClick(): void {
    pipelineCachedCopyRef.current?.showConfirmationModal()
  }

  function handleReloadFromCache(): void {
    updatePipelineView({ ...pipelineView, isYamlEditable: false })
    fetchPipeline({ loadFromCache: false })
  }

  const isNewPipeline = pipelineIdentifier === DefaultNewPipelineId

  function renderDiscardUnsavedChangeButton(): JSX.Element | null {
    return !isNewPipeline && !isReadonly ? (
      <Button
        disabled={!isUpdated}
        onClick={handleDiscardClick}
        className={css.discardBtn}
        variation={ButtonVariation.SECONDARY}
        text={getString('pipeline.discard')}
      />
    ) : null
  }

  function renderPipelineMenuActions(): JSX.Element | null {
    return isNewPipeline ? null : (
      <Popover className={Classes.DARK} position={Position.LEFT}>
        <Button variation={ButtonVariation.ICON} icon="Options" aria-label="pipeline menu actions" />
        <Menu style={{ backgroundColor: 'unset' }}>
          {isPipelineRemote && !pipelineCacheResponse?.isSyncEnabled ? (
            <RbacMenuItem
              icon="repeat"
              text={getString('common.reloadFromGit')}
              onClick={handleReloadFromGitClick}
              permission={{
                resourceScope: {
                  accountIdentifier: accountId,
                  orgIdentifier,
                  projectIdentifier
                },
                resource: {
                  resourceType: ResourceType.PIPELINE,
                  resourceIdentifier: pipeline?.identifier
                },
                permission: PermissionIdentifier.VIEW_PIPELINE
              }}
            />
          ) : null}
          <RbacMenuItem
            icon="refresh"
            text={getString('pipeline.outOfSyncErrorStrip.reconcile')}
            disabled={isCommunity}
            onClick={() => handleReconcile(true)}
            permission={{
              resourceScope: {
                accountIdentifier: accountId,
                orgIdentifier,
                projectIdentifier
              },
              resource: {
                resourceType: ResourceType.PIPELINE,
                resourceIdentifier: pipeline?.identifier
              },
              permission: PermissionIdentifier.EDIT_PIPELINE
            }}
          />
        </Menu>
      </Popover>
    )
  }

  return (
    <React.Fragment>
      {(remoteFetchError as Error)?.code === 'ENTITY_NOT_FOUND' ? null : (
        <div className={css.titleBar}>
          <div className={css.titleSubheader}>
            <div
              className={cx(css.breadcrumbsMenu, {
                [css.remotePipelineName]: isPipelineRemote
              })}
            >
              <div className={css.pipelineMetadataContainer}>
                <Layout.Horizontal className={css.pipelineNameContainer}>
                  {CDS_YAML_SIMPLIFICATION && (
                    <YamlVersionBadge version={yamlVersion} minimal border className={css.yamlVersionBadge} />
                  )}
                  <Icon className={css.pipelineIcon} padding={{ right: 'small' }} name="pipeline" size={32} />
                  <Text className={css.pipelineName} lineClamp={1}>
                    {pipeline?.name}
                  </Text>
                  {!isEmpty(pipeline?.tags) && pipeline.tags && (
                    <Container className={css.tagsContainer}>
                      <TagsPopover tags={pipeline.tags} />
                    </Container>
                  )}
                  {pipeline.description && (
                    <Container className={cx({ [css.tagsContainer]: isGitSyncEnabled })}>
                      <DescriptionPopover text={pipeline.description} />
                    </Container>
                  )}
                  {isGitSyncEnabled && (
                    <StudioGitPopover
                      gitDetails={gitDetails}
                      identifier={pipelineIdentifier}
                      isReadonly={isReadonly}
                      entityData={{ ...pipeline, versionLabel: '', type: 'Step' }} // Just to avoid type issues
                      onGitBranchChange={onGitBranchChange}
                      entityType={'Pipeline'}
                    />
                  )}
                  {isYaml ? null : (
                    <Button
                      variation={ButtonVariation.ICON}
                      icon="Edit"
                      onClick={handleEditClick}
                      aria-label={getString('editPipeline')}
                    />
                  )}
                </Layout.Horizontal>
              </div>
            </div>
            {isPipelineRemote && (
              <div className={css.gitRemoteDetailsWrapper}>
                <GitRemoteDetails
                  gitProviderType={getProvider(getString, connectorRef).type}
                  connectorRef={connectorRef}
                  repoName={defaultTo(
                    defaultTo(defaultTo(repoName, gitDetails.repoName), gitDetails.repoIdentifier),
                    ''
                  )}
                  filePath={defaultTo(gitDetails.filePath, '')}
                  fileUrl={defaultTo(gitDetails.fileUrl, '')}
                  branch={defaultTo(defaultTo(branch, gitDetails.branch), '')}
                  onBranchChange={onGitBranchChange}
                  flags={{
                    readOnly: pipelineIdentifier === DefaultNewPipelineId
                  }}
                />
                {!remoteFetchError && (
                  <EntityCachedCopy
                    ref={pipelineCachedCopyRef}
                    reloadContent={getString('common.pipeline')}
                    cacheResponse={pipelineCacheResponse}
                    reloadFromCache={handleReloadFromCache}
                    repo={defaultTo(defaultTo(defaultTo(repoName, gitDetails.repoName), gitDetails.repoIdentifier), '')}
                    filePath={defaultTo(gitDetails.filePath, '')}
                  />
                )}
              </div>
            )}
          </div>
          {remoteFetchError ? null : (
            <>
              <VisualYamlToggle
                className={css.visualYamlToggle}
                selectedView={getStudioSelectedView(isYaml, disableVisualView)}
                disableToggle={disableVisualView}
                onChange={handleViewChange}
                showDisableToggleReason={true}
              />
              <div className={css.savePublishContainer}>
                {isUpdated && !isReadonly && (
                  <Button
                    variation={ButtonVariation.LINK}
                    padding={'small'}
                    className={css.unsavedChanges}
                    onClick={openDiffModal}
                  >
                    {getString('unsavedChanges')}
                  </Button>
                )}
                {!isNewPipeline && (
                  <ValidationBadge className={css.validationContainer} onReconcile={() => handleReconcile(false)} />
                )}
                <SavePipelinePopoverWithRef toPipelineStudio={toPipelineStudio} ref={savePipelineHandleRef} />
                {renderDiscardUnsavedChangeButton()}
                <RbacButton
                  data-testid="card-run-pipeline"
                  variation={ButtonVariation.PRIMARY}
                  icon="run-pipeline"
                  intent="success"
                  disabled={isUpdated || entityValidityDetails?.valid === false || isMetadataUpdated}
                  className={css.runPipelineBtn}
                  text={getString('runPipelineText')}
                  tooltip={runTooltip}
                  onClick={handleRunClick}
                  featuresProps={getFeaturePropsForRunPipelineButton({
                    modules,
                    getString
                  })}
                  permission={{
                    resourceScope: {
                      accountIdentifier: accountId,
                      orgIdentifier,
                      projectIdentifier
                    },
                    resource: {
                      resourceType: ResourceType.PIPELINE,
                      resourceIdentifier: pipeline?.identifier
                    },
                    permission: PermissionIdentifier.EXECUTE_PIPELINE
                  }}
                />
                {renderPipelineMenuActions()}
              </div>
            </>
          )}
        </div>
      )}
      {outOfSync && !isFetchingReconcileData ? (
        <PipelineOutOfSyncErrorStrip
          updateRootEntity={updateEntity}
          errorData={reconcileData}
          onRefreshEntity={onRefreshEntity}
        />
      ) : null}
    </React.Fragment>
  )
}
