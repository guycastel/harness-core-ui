/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import type { Column } from 'react-table'
import { defaultTo, get } from 'lodash-es'
import { ButtonVariation, Container, Heading, Layout, TableV2, useToaster } from '@harness/uicore'
import {
  InfrastructureResponse,
  InfrastructureResponseDTO,
  useDeleteInfrastructure,
  useGetSettingValue
} from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import { useEntityDeleteErrorHandlerDialog } from '@common/hooks/EntityDeleteErrorHandlerDialog/useEntityDeleteErrorHandlerDialog'
import type {
  EnvironmentPathProps,
  ProjectPathProps,
  EnvironmentQueryParams,
  ModulePathParams
} from '@common/interfaces/RouteInterfaces'
import { InfraDefinitionTabs } from '@cd/components/EnvironmentsV2/EnvironmentDetails/InfrastructureDefinition/InfraDefinitionDetailsDrawer/InfraDefinitionDetailsDrawer'
import { useUpdateQueryParams } from '@common/hooks'
import { SettingType } from '@common/constants/Utils'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import RbacButton from '@rbac/components/Button/Button'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import {
  CodeSourceCell,
  InfraDetails,
  InfrastructureMenu,
  InfrastructureName,
  LastUpdatedBy,
  withInfrastructure
} from './InfrastructureListColumns'
import EmptyInfrastructure from '../images/EmptyInfrastructure.svg'

export default function InfrastructureList({
  list,
  showModal,
  refetch,
  setSelectedInfrastructure
}: {
  list?: InfrastructureResponse[]
  showModal: () => void
  refetch: () => void
  setSelectedInfrastructure: (infrastructureYaml: string) => void
}): React.ReactElement {
  const { accountId, orgIdentifier, projectIdentifier, environmentIdentifier } = useParams<
    ProjectPathProps & EnvironmentPathProps & ModulePathParams
  >()
  const { CDS_INFRA_GITX: isGitXEnabledForInfras } = useFeatureFlags()
  const { getString } = useStrings()
  const { showSuccess, showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const { updateQueryParams } = useUpdateQueryParams<EnvironmentQueryParams>()
  const [infraDetailsToBeDeleted, setInfraDetailsToBeDeleted] = React.useState<InfraDetails>()

  const { data: forceDeleteSettings, error: forceDeleteSettingsError } = useGetSettingValue({
    identifier: SettingType.ENABLE_FORCE_DELETE,
    queryParams: {
      accountIdentifier: accountId
    },
    lazy: false
  })

  React.useEffect(() => {
    if (forceDeleteSettingsError) {
      showError(getRBACErrorMessage(forceDeleteSettingsError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceDeleteSettingsError])

  const redirectToReferencedBy = (): void => {
    closeReferenceErrorDialog()
    updateQueryParams({
      infrastructureId: infraDetailsToBeDeleted?.identifier,
      infraDetailsTab: InfraDefinitionTabs.REFERENCEDBY
    })
  }

  const { openDialog: openReferenceErrorDialog, closeDialog: closeReferenceErrorDialog } =
    useEntityDeleteErrorHandlerDialog({
      entity: {
        type: ResourceType.INFRASTRUCTURE,
        name: defaultTo(infraDetailsToBeDeleted?.name, '')
      },
      redirectToReferencedBy,
      forceDeleteCallback: () => deleteHandler(infraDetailsToBeDeleted!, true)
    })

  const { mutate: deleteInfrastructure } = useDeleteInfrastructure({})

  const onEdit = (yaml: string, row?: InfrastructureResponseDTO): void => {
    updateQueryParams({
      infrastructureId: get(infraDetailsToBeDeleted, 'identifier', ''),
      infraDetailsTab: InfraDefinitionTabs.CONFIGURATION,
      infraStoreType: get(row, 'storeType'),
      ...(get(row, 'storeType', '') === 'REMOTE' && {
        infraConnectorRef: get(row, 'connectorRef'),
        infraRepoName: get(row, 'entityGitDetails.repoName')
      })
    })

    setSelectedInfrastructure(yaml)
  }

  const deleteHandler = async (infraDetails: InfraDetails, forceDelete?: boolean): Promise<void> => {
    setInfraDetailsToBeDeleted(infraDetails)
    try {
      const infraIdentifier = defaultTo(infraDetails?.identifier, '')
      const response = await deleteInfrastructure(infraIdentifier, {
        headers: { 'content-type': 'application/json' },
        queryParams: {
          accountIdentifier: accountId,
          projectIdentifier,
          orgIdentifier,
          environmentIdentifier,
          forceDelete
        }
      })
      if (response.status === 'SUCCESS') {
        showSuccess(getString('cd.infrastructure.deleted', { identifier: infraIdentifier }))
        refetch()
        setInfraDetailsToBeDeleted(undefined)
      }
    } catch (error) {
      if (forceDeleteSettings?.data?.value === 'true' && error?.data?.code === 'ENTITY_REFERENCE_EXCEPTION') {
        openReferenceErrorDialog()
      } else {
        showError(getRBACErrorMessage(error))
        setInfraDetailsToBeDeleted(undefined)
      }
    }
  }

  type CustomColumn<T extends Record<string, any>> = Column<T>
  const infrastructureColumns: CustomColumn<InfrastructureResponse>[] = useMemo(
    () => [
      {
        Header: getString('infrastructureText').toUpperCase(),
        id: 'name',
        width: isGitXEnabledForInfras ? '40%' : '50%',
        Cell: withInfrastructure(InfrastructureName)
      },
      ...(isGitXEnabledForInfras
        ? [
            {
              Header: getString('pipeline.codeSource'),
              id: 'storeType',
              width: '25%',
              Cell: withInfrastructure(CodeSourceCell)
            }
          ]
        : []),
      {
        Header: getString('lastUpdated').toUpperCase(),
        id: 'lastUpdatedBy',
        width: isGitXEnabledForInfras ? '25%' : '40%',
        Cell: withInfrastructure(LastUpdatedBy)
      },
      {
        id: 'editOrDelete',
        width: '10%',
        Cell: withInfrastructure(InfrastructureMenu),
        actions: {
          onEdit,
          onDelete: deleteHandler,
          reload: refetch
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getString]
  )

  const hasInfrastructure = Boolean(list?.length)
  const emptyEnvironment = Boolean(list?.length === 0)

  return (
    <>
      {hasInfrastructure && (
        <Container padding={{ top: 'small' }} margin={{ top: 'medium' }} border={{ top: true }}>
          <TableV2<InfrastructureResponse>
            columns={infrastructureColumns}
            data={defaultTo(list, [])}
            sortable
            onRowClick={rowItem => onEdit(defaultTo(rowItem.infrastructure?.yaml, '{}'), rowItem?.infrastructure)}
          />
        </Container>
      )}
      {emptyEnvironment && (
        <Layout.Vertical flex={{ align: 'center-center' }} height={'70vh'}>
          <img src={EmptyInfrastructure} alt={getString('cd.infrastructure.noInfrastructureInEnvironment')} />
          <Heading level={2} padding={{ top: 'xxlarge' }} margin={{ bottom: 'large' }}>
            {getString('cd.infrastructure.noInfrastructureInEnvironment')}
          </Heading>
          <RbacButton
            text={getString('pipelineSteps.deploy.infrastructure.infraDefinition')}
            icon="plus"
            onClick={showModal}
            variation={ButtonVariation.PRIMARY}
            permission={{
              resource: {
                resourceType: ResourceType.ENVIRONMENT,
                resourceIdentifier: environmentIdentifier
              },
              resourceScope: {
                accountIdentifier: accountId,
                orgIdentifier,
                projectIdentifier
              },
              permission: PermissionIdentifier.EDIT_ENVIRONMENT
            }}
          />
        </Layout.Vertical>
      )}
    </>
  )
}
