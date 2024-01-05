/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import {
  Button,
  Container,
  Layout,
  TagsPopover,
  Text,
  useToaster,
  getErrorInfoFromErrorObject,
  Icon,
  ModalDialog
} from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { useHistory, useParams } from 'react-router-dom'
import { defaultTo, get, isEmpty, pick } from 'lodash-es'
import { Classes, Menu, Popover, PopoverInteractionKind, Position } from '@blueprintjs/core'
import { useModalHook } from '@harness/use-modal'
import routes from '@common/RouteDefinitions'
import { StoreType } from '@common/constants/GitSyncTypes'
import { ResourceType as GitResourceType } from '@common/interfaces/GitSyncInterface'
import routesV2 from '@common/RouteDefinitionsV2'
import { useEntityDeleteErrorHandlerDialog } from '@common/hooks/EntityDeleteErrorHandlerDialog/useEntityDeleteErrorHandlerDialog'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useStrings } from 'framework/strings'
import { useDeleteServiceV2 } from 'services/cd-ng'

import RbacMenuItem from '@rbac/components/MenuItem/MenuItem'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { NewEditServiceModal } from '@cd/components/PipelineSteps/DeployServiceStep/NewEditServiceModal'
import { CodeSourceWrapper } from '@pipeline/components/CommonPipelineStages/PipelineStage/utils'
import useMigrateResource from '@modules/70-pipeline/components/MigrateResource/useMigrateResource'
import { MigrationType } from '@modules/70-pipeline/components/MigrateResource/MigrateUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { ServiceTabs, getRemoteServiceQueryParams } from '../utils/ServiceUtils'
import ServiceDeleteMenuItem from './ServiceDeleteMenuItem'
import css from './ServicesListColumns.module.scss'

interface ServiceRow {
  row: { original: any }
}
interface ServiceItemProps {
  data: any
  onRefresh?: () => Promise<void>
  isForceDeleteEnabled: boolean
  calledFromSettingsPage?: boolean
}

export enum DeploymentStatus {
  SUCCESS = 'success',
  FAILED = 'failed'
}

const ServiceMenu = (props: ServiceItemProps): React.ReactElement => {
  const { data: service, onRefresh, isForceDeleteEnabled, calledFromSettingsPage } = props
  const [menuOpen, setMenuOpen] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const { showSuccess, showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const { getString } = useStrings()
  const history = useHistory()
  const isSvcEnvEntityEnabled = useFeatureFlag(FeatureFlag.NG_SVC_ENV_REDESIGN)
  const { isNewNavEnabled: newLeftNav } = useAppStore()
  const gitXEnabled = useFeatureFlag(FeatureFlag.CDS_SERVICE_GITX)
  const [hideReferencedByButton, setHideReferencedByButton] = useState(false)
  const [customErrorMessage, setCustomErrorMessage] = useState<string | undefined>()
  const remoteQueryParams = getRemoteServiceQueryParams(service, true)
  const serviceDetailRoute =
    newLeftNav && calledFromSettingsPage
      ? routesV2.toSettingsServiceDetails({
          accountId,
          orgIdentifier,
          projectIdentifier,
          serviceId: service?.identifier,
          module
        })
      : routes.toServiceStudio({
          accountId,
          orgIdentifier,
          projectIdentifier,
          serviceId: service?.identifier,
          module
        })

  const { mutate: deleteService } = useDeleteServiceV2({})

  const [showModal, hideModal] = useModalHook(
    () => (
      <ModalDialog
        isOpen={true}
        enforceFocus={false}
        canEscapeKeyClose
        canOutsideClickClose
        onClose={hideModal}
        title={getString('editService')}
        isCloseButtonShown
        width={800}
        showOverlay={showOverlay}
      >
        <Container>
          <NewEditServiceModal
            data={
              {
                ...pick(service, ['name', 'identifier', 'orgIdentifier', 'projectIdentifier', 'description', 'tags'])
              } || { name: '', identifier: '' }
            }
            isEdit={true}
            isGitXEnforced={false}
            isService={false}
            onCreateOrUpdate={() => {
              hideModal()
              onRefresh && onRefresh()
            }}
            closeModal={hideModal}
            setShowOverlay={setShowOverlay}
          />
        </Container>
      </ModalDialog>
    ),
    [service, orgIdentifier, projectIdentifier]
  )

  const deleteHandler = async (forceDelete?: boolean): Promise<void> => {
    try {
      const response = await deleteService(service?.identifier, {
        headers: { 'content-type': 'application/json' },
        queryParams: {
          accountIdentifier: accountId,
          orgIdentifier,
          projectIdentifier,
          forceDelete
        }
      })
      if (response.status === 'SUCCESS') {
        showSuccess(getString('common.deleteServiceMessage'))
        onRefresh?.()
      }
    } catch (err: any) {
      if (isForceDeleteEnabled) {
        if (err?.data?.code === 'ENTITY_REFERENCE_EXCEPTION') {
          setCustomErrorMessage(undefined)
          openReferenceErrorDialog()
        } else if (err?.data?.code === 'ACTIVE_SERVICE_INSTANCES_PRESENT_EXCEPTION') {
          setCustomErrorMessage(getErrorInfoFromErrorObject(err))
          setHideReferencedByButton(true)
          openReferenceErrorDialog()
        }
      } else {
        showError(getRBACErrorMessage(err))
      }
    }
  }

  const redirectToReferencedBy = (): void => {
    history.push({
      pathname: serviceDetailRoute,
      search: `tab=${ServiceTabs.REFERENCED_BY}${remoteQueryParams}`
    })
  }

  const { openDialog: openReferenceErrorDialog } = useEntityDeleteErrorHandlerDialog({
    entity: {
      type: ResourceType.SERVICE,
      name: defaultTo(service?.name, '')
    },
    hideReferencedByButton,
    customErrorMessage,
    redirectToReferencedBy,
    forceDeleteCallback: () => deleteHandler(true)
  })

  const handleEdit = (e: React.MouseEvent<HTMLElement, MouseEvent>): void => {
    e.stopPropagation()
    setMenuOpen(false)
    if (isSvcEnvEntityEnabled) {
      history.push({
        pathname: serviceDetailRoute,
        search: `tab=${ServiceTabs.Configuration}${remoteQueryParams}`
      })
    } else {
      showModal()
    }
  }

  const { showMigrateResourceModal: showMoveResourceModal } = useMigrateResource({
    resourceType: GitResourceType.SERVICE,
    modalTitle: getString('common.moveEntitytoGit', { resourceType: getString('service') }),
    migrationType: MigrationType.INLINE_TO_REMOTE,
    extraQueryParams: { name: service?.name, identifier: service?.identifier },
    onSuccess: () => onRefresh?.()
  })

  return (
    <Layout.Horizontal>
      <Popover
        isOpen={menuOpen}
        onInteraction={nextOpenState => {
          setMenuOpen(nextOpenState)
        }}
        className={Classes.DARK}
        position={Position.RIGHT_TOP}
      >
        <Button
          minimal
          icon="Options"
          onClick={e => {
            e.stopPropagation()
            setMenuOpen(true)
          }}
        />
        <Menu style={{ minWidth: 'unset' }}>
          <RbacMenuItem
            icon="edit"
            text={getString('edit')}
            onClick={handleEdit}
            permission={{
              resource: {
                resourceType: ResourceType.SERVICE,
                resourceIdentifier: defaultTo(service?.identifier, '')
              },
              permission: PermissionIdentifier.EDIT_SERVICE
            }}
          />
          {isSvcEnvEntityEnabled && gitXEnabled && service?.storeType !== StoreType.REMOTE ? (
            <RbacMenuItem
              icon="git-merge"
              text={getString('common.moveToGit')}
              permission={{
                resource: {
                  resourceType: ResourceType.SERVICE,
                  resourceIdentifier: defaultTo(service.identifier, '')
                },
                permission: PermissionIdentifier.EDIT_SERVICE
              }}
              onClick={e => {
                e.stopPropagation()
                setMenuOpen(false)
                showMoveResourceModal()
              }}
              data-testid="moveConfigToRemote"
            />
          ) : null}
          <ServiceDeleteMenuItem
            identifier={service?.identifier}
            name={service?.name}
            remoteQueryParams={remoteQueryParams}
            isForceDeleteEnabled={isForceDeleteEnabled}
            onDeleteModalClose={() => {
              setMenuOpen(false)
            }}
            onServiceDeleteSuccess={() => {
              onRefresh?.()
            }}
          />
        </Menu>
      </Popover>
    </Layout.Horizontal>
  )
}

const ServiceName = ({ row }: ServiceRow): React.ReactElement => {
  const service = row.original

  return (
    <div className={css.serviceName}>
      <Layout.Vertical>
        <Text color={Color.BLACK}>{service?.name}</Text>

        <Layout.Horizontal flex>
          <Text
            margin={{ top: 'xsmall', right: 'medium' }}
            color={Color.GREY_500}
            style={{
              fontSize: '12px',
              lineHeight: '24px',
              wordBreak: 'break-word'
            }}
          >
            Id: {service?.identifier}
          </Text>

          {!isEmpty(service?.tags) && (
            <div className={css.serviceTags}>
              <TagsPopover
                className={css.serviceTagsPopover}
                iconProps={{ size: 14, color: Color.GREY_600 }}
                tags={defaultTo(service?.tags, {})}
              />
            </div>
          )}
        </Layout.Horizontal>
      </Layout.Vertical>
    </div>
  )
}

const ServiceCodeSourceCell = ({ row }: ServiceRow): React.ReactElement => {
  const { entityGitDetails: gitDetails } = row.original
  const { getString } = useStrings()
  const data = row.original
  const isRemote = data.storeType === StoreType.REMOTE
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
    <div className={css.codeSourceColumnContainer}>
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
        <div className={css.codeSourceColumn}>
          <Icon
            name={isRemote ? remoteWrapper.iconName : inlineWrapper.iconName}
            size={isRemote ? remoteWrapper.size : inlineWrapper.size}
            color={Color.GREY_600}
          />
          <Text margin={{ left: 'xsmall' }} font={{ variation: FontVariation.TINY_SEMI }} color={Color.GREY_600}>
            {isRemote ? remoteWrapper.textName : inlineWrapper.textName}
          </Text>
        </div>
      </Popover>
    </div>
  )
}

const ServiceDescription = ({ row }: ServiceRow): React.ReactElement => {
  const service = row.original
  return (
    <Layout.Vertical className={css.serviceDescriptionWrapper}>
      <div className={css.serviceDescription}>
        <Text lineClamp={1}>{service?.description}</Text>
      </div>
    </Layout.Vertical>
  )
}

export { ServiceName, ServiceCodeSourceCell, ServiceDescription, ServiceMenu }
