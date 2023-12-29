/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useParams } from 'react-router-dom'
import ReactTimeago from 'react-timeago'
import { defaultTo, get, isEmpty, pick } from 'lodash-es'
import { Classes, Menu, PopoverInteractionKind, Position } from '@blueprintjs/core'
import { Layout, TagsPopover, Text, useConfirmationDialog, Popover, Button, Icon } from '@harness/uicore'
import { Intent, Color, FontVariation } from '@harness/design-system'
import { ResourceType as GitResourceType } from '@common/interfaces/GitSyncInterface'
import { useStrings } from 'framework/strings'
import type { InfrastructureResponse, InfrastructureResponseDTO } from 'services/cd-ng'

import type { EnvironmentPathProps, ProjectPathProps } from '@common/interfaces/RouteInterfaces'

import RbacMenuItem from '@rbac/components/MenuItem/MenuItem'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import type { PermissionRequest } from '@rbac/hooks/usePermission'

import { CodeSourceWrapper } from '@modules/70-pipeline/components/CommonPipelineStages/PipelineStage/utils'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import useMigrateResource from '@modules/70-pipeline/components/MigrateResource/useMigrateResource'
import { MigrationType } from '@modules/70-pipeline/components/MigrateResource/MigrateUtils'
import { StoreType } from '@modules/10-common/constants/GitSyncTypes'
import css from '../InfrastructureDefinition.module.scss'

interface InfrastructureRowColumn {
  row: { original: InfrastructureResponse }
  column: {
    actions: {
      onEdit: (identifier: string) => void
      onDelete: (identifier: string) => void
    }
  }
}

export function withInfrastructure(Component: any) {
  return (props: InfrastructureRowColumn) => {
    return <Component {...props.row.original} {...props.column.actions} />
  }
}

export function InfrastructureName({
  infrastructure
}: {
  infrastructure: InfrastructureResponseDTO
}): React.ReactElement {
  const { getString } = useStrings()

  const { name, tags, identifier } = infrastructure

  return (
    <Layout.Vertical>
      <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} spacing="small" margin={{ bottom: 'small' }}>
        <Text color={Color.BLACK} lineClamp={1}>
          {name}
        </Text>
        {!isEmpty(tags) && (
          <TagsPopover
            className={css.tagsPopover}
            iconProps={{ size: 14, color: Color.GREY_600 }}
            tags={defaultTo(tags, {})}
          />
        )}
      </Layout.Horizontal>

      <Text color={Color.GREY_500} font={{ size: 'small' }} lineClamp={1}>
        {getString('common.ID')}: {identifier}
      </Text>
    </Layout.Vertical>
  )
}

export function LastUpdatedBy({ lastModifiedAt }: InfrastructureResponse): React.ReactElement {
  return (
    <Layout.Vertical spacing={'small'}>
      <ReactTimeago date={defaultTo(lastModifiedAt, 0)} />
    </Layout.Vertical>
  )
}

export type InfraDetails = { name?: string; identifier?: string }

export function InfrastructureMenu({
  infrastructure,
  onEdit,
  onDelete,
  reload
}: {
  infrastructure: InfrastructureResponseDTO
  onEdit: (identifier: string, infrastructure?: InfrastructureResponseDTO) => void
  onDelete: (infrastructureDetails: InfraDetails) => void
  reload: () => void
}): React.ReactElement {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const { getString } = useStrings()
  const { accountId, projectIdentifier, orgIdentifier, environmentIdentifier } = useParams<
    ProjectPathProps & EnvironmentPathProps
  >()
  const { yaml } = infrastructure
  const { CDS_INFRA_GITX } = useFeatureFlags()
  const { openDialog } = useConfirmationDialog({
    titleText: getString('cd.infrastructure.delete'),
    contentText: getString('cd.infrastructure.deleteConfirmation'),
    confirmButtonText: getString('delete'),
    cancelButtonText: getString('cancel'),
    intent: Intent.DANGER,
    buttonIntent: Intent.DANGER,
    onCloseDialog: async (isConfirmed: boolean) => {
      /* istanbul ignore else */
      if (isConfirmed) {
        setMenuOpen(false)
        await onDelete(pick(infrastructure, ['name', 'identifier']))
      }
    }
  })

  const { showMigrateResourceModal: showMoveResourceModal } = useMigrateResource({
    resourceType: GitResourceType.INFRASTRUCTURE,
    modalTitle: getString('common.moveEntitytoGit', { resourceType: getString('infrastructureText') }),
    migrationType: MigrationType.INLINE_TO_REMOTE,
    extraQueryParams: { name: infrastructure.name, identifier: infrastructure.identifier, environmentIdentifier },
    onSuccess: () => reload()
  })

  const handleEdit = (event: React.MouseEvent): void => {
    event.stopPropagation()
    onEdit(defaultTo(yaml, ''), infrastructure)
    setMenuOpen(false)
  }

  const handleDelete = (event: React.MouseEvent): void => {
    event.stopPropagation()
    openDialog()
  }

  const handleMoveInlineToRemote = (event: React.MouseEvent): void => {
    event.stopPropagation()
    showMoveResourceModal()
    setMenuOpen(false)
  }

  const resourceAndScope: Pick<PermissionRequest, 'resource' | 'resourceScope'> = {
    resource: {
      resourceType: ResourceType.ENVIRONMENT,
      resourceIdentifier: environmentIdentifier
    },
    resourceScope: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    }
  }

  return (
    <Layout.Horizontal style={{ justifyContent: 'flex-end' }}>
      <Popover isOpen={menuOpen} onInteraction={setMenuOpen} className={Classes.DARK} position={Position.LEFT}>
        <Button
          minimal
          style={{
            transform: 'rotate(90deg)'
          }}
          icon="more"
          onClick={e => {
            e.stopPropagation()
            setMenuOpen(true)
          }}
          data-testid={`${infrastructure?.identifier}-more-button`}
        />
        <Menu style={{ minWidth: 'unset' }}>
          <RbacMenuItem
            icon="edit"
            text={getString('edit')}
            onClick={handleEdit}
            permission={{
              ...resourceAndScope,
              permission: PermissionIdentifier.EDIT_ENVIRONMENT
            }}
            data-testid={`${infrastructure?.identifier}-edit-button`}
          />
          <RbacMenuItem
            icon="trash"
            text={getString('delete')}
            onClick={handleDelete}
            permission={{
              ...resourceAndScope,
              permission: PermissionIdentifier.EDIT_ENVIRONMENT
            }}
          />
          {CDS_INFRA_GITX && infrastructure.storeType !== StoreType.REMOTE && (
            <RbacMenuItem
              icon="git-merge"
              text={getString('common.moveToGit')}
              onClick={handleMoveInlineToRemote}
              permission={{
                ...resourceAndScope,
                permission: PermissionIdentifier.EDIT_ENVIRONMENT
              }}
            />
          )}
        </Menu>
      </Popover>
    </Layout.Horizontal>
  )
}

export function CodeSourceCell({ infrastructure }: { infrastructure: InfrastructureResponseDTO }): React.ReactElement {
  const { entityGitDetails: gitDetails, storeType } = infrastructure
  const { getString } = useStrings()
  const isRemote = storeType === 'REMOTE'
  const inlineWrapper: CodeSourceWrapper = {
    textName: getString('inline'),
    iconName: 'repository',
    size: 10
  }
  const remoteWrapper: CodeSourceWrapper = {
    textName: getString('repository'),
    iconName: 'remote-setup',
    size: 12
  }

  return (
    <Layout.Horizontal flex>
      <Popover
        disabled={!isRemote}
        position={Position.TOP}
        interactionKind={PopoverInteractionKind.HOVER}
        className={Classes.DARK}
        content={
          <Layout.Vertical spacing="small" padding="large" className={css.contentWrapper}>
            <Layout.Horizontal spacing="small" flex={{ alignItems: 'center', justifyContent: 'start' }}>
              <Icon name="github" size={14} color={Color.GREY_200} />
              <Text color={Color.WHITE} font={{ variation: FontVariation.SMALL }}>
                {get(gitDetails, 'repoName', get(gitDetails, 'repoIdentifier'))}
              </Text>
            </Layout.Horizontal>
            {gitDetails?.filePath && (
              <Layout.Horizontal spacing="small" flex={{ alignItems: 'center', justifyContent: 'start' }}>
                <Icon name="remotefile" size={14} color={Color.GREY_200} />
                <Text color={Color.WHITE} font={{ variation: FontVariation.SMALL }}>
                  {gitDetails.filePath}
                </Text>
              </Layout.Horizontal>
            )}
          </Layout.Vertical>
        }
      >
        <Layout.Horizontal
          flex={{ justifyContent: 'center' }}
          spacing="small"
          padding="small"
          border={{ radius: 3 }}
          background={Color.GREY_100}
        >
          <Icon
            name={isRemote ? remoteWrapper.iconName : inlineWrapper.iconName}
            size={isRemote ? remoteWrapper.size : inlineWrapper.size}
            color={Color.GREY_600}
          />
          <Text margin={{ left: 'xsmall' }} font={{ variation: FontVariation.TINY_SEMI }} color={Color.GREY_600}>
            {isRemote ? remoteWrapper.textName : inlineWrapper.textName}
          </Text>
        </Layout.Horizontal>
      </Popover>
    </Layout.Horizontal>
  )
}
