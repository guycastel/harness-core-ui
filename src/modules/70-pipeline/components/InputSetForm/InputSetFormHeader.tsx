/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import {
  Container,
  Layout,
  PageHeader,
  Text,
  VisualYamlToggle,
  VisualYamlSelectedView as SelectedView,
  Button,
  ButtonVariation,
  Popover
} from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { flushSync } from 'react-dom'
import { defaultTo, isEmpty } from 'lodash-es'
import { useHistory, useParams } from 'react-router-dom'
import { Classes, Menu, Position } from '@blueprintjs/core'
import routes from '@common/RouteDefinitions'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import { useStrings } from 'framework/strings'
import { hasStoreTypeMismatch } from '@modules/70-pipeline/utils/inputSetUtils'
import RbacMenuItem from '@modules/20-rbac/components/MenuItem/MenuItem'
import { PermissionIdentifier } from '@modules/20-rbac/interfaces/PermissionIdentifier'
import { NGBreadcrumbs } from '@modules/10-common/components/NGBreadcrumbs/NGBreadcrumbs'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { CacheResponseMetadata, EntityGitDetails, InputSetResponse } from 'services/pipeline-ng'
import GitRemoteDetails from '@modules/10-common/components/GitRemoteDetails/GitRemoteDetails'
import { StoreType } from '@modules/10-common/constants/GitSyncTypes'
import { useQueryParams, useUpdateQueryParams } from '@modules/10-common/hooks'
import { GitQueryParams, InputSetPathProps, PipelineType } from '@modules/10-common/interfaces/RouteInterfaces'
import { YamlVersionBadge } from '@modules/70-pipeline/common/components/YamlVersionBadge/YamlVersionBadge'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { YamlVersion } from '@modules/70-pipeline/common/hooks/useYamlVersion'
import { getGitProviderCards } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect'
import GitPopover from '../GitPopover/GitPopover'
import { OutOfSyncErrorStrip } from '../InputSetErrorHandling/OutOfSyncErrorStrip/OutOfSyncErrorStrip'
import {
  EntityCachedCopy,
  EntityCachedCopyHandle
} from '../PipelineStudio/PipelineCanvas/EntityCachedCopy/EntityCachedCopy'
import css from './InputSetForm.module.scss'

export interface InputSetFormHeaderProps {
  isEdit: boolean
  inputSet: {
    name?: string
    cacheResponse?: CacheResponseMetadata
    gitDetails?: EntityGitDetails
    storeType?: 'INLINE' | 'REMOTE' | undefined
    connectorRef?: string
    identifier?: string
    pipelineIdentifier?: string
  }
  selectedView: SelectedView
  handleModeSwitch(mode: SelectedView): void
  isGitSyncEnabled?: boolean
  loading: boolean
  onBranchChange?: (branch?: string) => void
  handleReloadFromCache: (loadFromCache?: boolean) => void
  disableVisualView: boolean
  isFormDirty: boolean
  openDiffModal: () => void
  isEditable: boolean
  handleSaveInputSetForm: () => void
  onCancel?: () => void
  inputSetUpdateResponseHandler?: (responseData: InputSetResponse) => void
  pipelineGitDetails?: EntityGitDetails
  pipelineName: string
  yamlVersion?: YamlVersion
  manageInputsActive?: boolean
}

export function InputSetFormHeader(props: InputSetFormHeaderProps): React.ReactElement {
  const {
    isEdit,
    isGitSyncEnabled,
    inputSet = {},
    selectedView,
    handleModeSwitch,
    loading,
    onBranchChange,
    handleReloadFromCache,
    disableVisualView,
    isFormDirty,
    openDiffModal,
    isEditable,
    handleSaveInputSetForm,
    onCancel,
    inputSetUpdateResponseHandler,
    pipelineGitDetails,
    pipelineName,
    yamlVersion,
    manageInputsActive
  } = props
  const { projectIdentifier, orgIdentifier, accountId, module, pipelineIdentifier } = useParams<
    PipelineType<InputSetPathProps> & { accountId: string }
  >()
  const { connectorRef, repoIdentifier, repoName, branch, storeType } = useQueryParams<GitQueryParams>()
  const [menuOpen, setMenuOpen] = React.useState(false)

  const { updateQueryParams } = useUpdateQueryParams()
  const { getString } = useStrings()
  const history = useHistory()
  const { CDS_YAML_SIMPLIFICATION } = useFeatureFlags()

  const inputCachedCopyRef = React.useRef<EntityCachedCopyHandle | null>(null)

  function showReloadFromGitOption(): boolean {
    return Boolean(inputSet.storeType === StoreType.REMOTE) && !inputSet.cacheResponse?.isSyncEnabled
  }

  function handleReloadFromGitClick(): void {
    inputCachedCopyRef.current?.showConfirmationModal()
  }

  return (
    <GitSyncStoreProvider>
      <PageHeader
        className={css.pageHeaderStyles}
        title={
          <Layout.Horizontal width="42%">
            <Layout.Horizontal flex={{ justifyContent: 'left', alignItems: 'center' }}>
              {CDS_YAML_SIMPLIFICATION && typeof yamlVersion !== 'undefined' && (
                <YamlVersionBadge version={yamlVersion} minimal border className={css.yamlVersionBadge} />
              )}
              <Text
                lineClamp={1}
                color={Color.GREY_800}
                font={{ weight: 'bold', variation: FontVariation.H4 }}
                margin={{ right: 'medium' }}
                className={cx(isEdit && storeType === StoreType.REMOTE ? css.editTitle : '')}
              >
                {isEdit
                  ? getString('inputSets.editTitle', { name: inputSet.name })
                  : getString('inputSets.newInputSetLabel')}
              </Text>
            </Layout.Horizontal>
            {isGitSyncEnabled && isEdit && (
              <GitPopover
                data={defaultTo(inputSet.gitDetails, {})}
                iconProps={{ margin: { left: 'small', top: 'xsmall' } }}
              />
            )}
            {isEdit && inputSet.storeType === StoreType.REMOTE && (
              <Container className={cx(css.gitRemoteDetails, inputSet.cacheResponse ? '' : css.noCacheDetails)}>
                <GitRemoteDetails
                  gitProviderType={
                    isEmpty(inputSet.connectorRef)
                      ? getGitProviderCards(getString)[0].type
                      : getGitProviderCards(getString)[1].type
                  }
                  connectorRef={inputSet.connectorRef}
                  repoName={inputSet.gitDetails?.repoName}
                  branch={inputSet.gitDetails?.branch}
                  flags={{ borderless: true, showRepo: false, normalInputStyle: true }}
                  onBranchChange={item => {
                    flushSync(() => {
                      updateQueryParams({ inputSetBranch: item?.branch })
                    })
                    onBranchChange?.(item?.branch)
                  }}
                />

                {!loading && (
                  <EntityCachedCopy
                    ref={inputCachedCopyRef}
                    reloadContent={getString('inputSets.inputSetLabel')}
                    cacheResponse={inputSet.cacheResponse}
                    reloadFromCache={handleReloadFromCache}
                    repo={inputSet.gitDetails?.repoName}
                    filePath={inputSet.gitDetails?.filePath}
                  />
                )}
              </Container>
            )}
            <div className={css.optionBtns}>
              <VisualYamlToggle
                selectedView={selectedView}
                onChange={nextMode => {
                  handleModeSwitch(nextMode)
                }}
                disableToggle={disableVisualView}
                disableToggleReasonIcon={'danger-icon'}
                showDisableToggleReason={!hasStoreTypeMismatch(storeType, inputSet.storeType, isEdit)}
              />
            </div>

            <div className={css.reconcileMenu}>
              {isFormDirty ? (
                <>
                  <Button
                    variation={ButtonVariation.LINK}
                    padding={'small'}
                    className={css.unsavedChanges}
                    onClick={openDiffModal}
                  >
                    {getString('unsavedChanges')}
                  </Button>
                </>
              ) : null}
              <Button
                variation={ButtonVariation.PRIMARY}
                type="submit"
                disabled={!isEditable || manageInputsActive}
                text={getString('save')}
                tooltip={manageInputsActive ? getString('pipeline.inputSets.manageInputsInProgress') : undefined}
                onClick={async e => {
                  e.preventDefault()
                  handleSaveInputSetForm()
                }}
              />
              <Button
                variation={ButtonVariation.TERTIARY}
                onClick={onCancel || history.goBack}
                text={getString('cancel')}
                style={{ marginLeft: '10px' }}
              />

              <Popover
                className={cx(Classes.DARK)}
                position={Position.LEFT}
                isOpen={menuOpen}
                onInteraction={nextOpenState => {
                  setMenuOpen(nextOpenState)
                }}
              >
                <Button
                  variation={ButtonVariation.ICON}
                  icon="Options"
                  aria-label="input set menu actions"
                  onClick={() => setMenuOpen(true)}
                />
                <Menu style={{ backgroundColor: 'unset' }}>
                  <OutOfSyncErrorStrip
                    inputSet={inputSet}
                    pipelineGitDetails={pipelineGitDetails}
                    fromInputSetForm
                    inputSetUpdateResponseHandler={inputSetUpdateResponseHandler}
                    closeReconcileMenu={() => setMenuOpen(false)}
                  />

                  {showReloadFromGitOption() ? (
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
                          resourceIdentifier: inputSet.identifier
                        },
                        permission: PermissionIdentifier.VIEW_PIPELINE
                      }}
                    />
                  ) : null}
                </Menu>
              </Popover>
            </div>
          </Layout.Horizontal>
        }
        breadcrumbs={
          <NGBreadcrumbs
            links={[
              {
                url: routes.toPipelines({ orgIdentifier, projectIdentifier, accountId, module }),
                label: getString('pipelines')
              },
              {
                url: routes.toInputSetList({
                  orgIdentifier,
                  projectIdentifier,
                  accountId,
                  pipelineIdentifier,
                  module,
                  connectorRef,
                  repoIdentifier: isGitSyncEnabled ? pipelineGitDetails?.repoIdentifier : repoIdentifier,
                  repoName,
                  branch: isGitSyncEnabled ? pipelineGitDetails?.branch : branch,
                  storeType
                }),
                label: pipelineName
              }
            ]}
          />
        }
      />
    </GitSyncStoreProvider>
  )
}
