/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import type { Column } from 'react-table'
import { defaultTo, get } from 'lodash-es'

import { TableV2, useToaster } from '@harness/uicore'
import {
  EnvironmentResponse,
  EnvironmentResponseDTO,
  PageEnvironmentResponse,
  useDeleteEnvironmentV2
} from 'services/cd-ng'
import { useStrings } from 'framework/strings'

import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'

import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { useEntityDeleteErrorHandlerDialog } from '@common/hooks/EntityDeleteErrorHandlerDialog/useEntityDeleteErrorHandlerDialog'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { StoreType } from '@modules/10-common/constants/GitSyncTypes'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import {
  EnvironmentMenu,
  EnvironmentName,
  EnvironmentTypes,
  withEnvironment,
  LastUpdatedBy,
  CodeSourceCell
} from './EnvironmentsListColumns'
import { EnvironmentDetailsTab } from '../utils'

export default function EnvironmentsList({
  response,
  refetch,
  isForceDeleteEnabled,
  calledFromSettingsPage
}: {
  response: PageEnvironmentResponse
  refetch: () => void
  isForceDeleteEnabled: boolean
  calledFromSettingsPage?: boolean
}): JSX.Element {
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const { showSuccess, showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const { getString } = useStrings()
  const history = useHistory()
  const [environmentToDelete, setEnvironmentToDelete] = useState<EnvironmentResponseDTO>({})
  const { isNewNavEnabled: newLeftNav } = useAppStore()
  const { CDS_ENV_GITX } = useFeatureFlags()

  const { mutate: deleteItem } = useDeleteEnvironmentV2({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier
    }
  })

  const handleEnvEdit = (id: string, environment: EnvironmentResponseDTO): void => {
    const envParams = {
      accountId,
      orgIdentifier,
      projectIdentifier,
      module,
      environmentIdentifier: defaultTo(id, ''),
      sectionId: EnvironmentDetailsTab.CONFIGURATION,
      ...(get(environment, 'storeType', '') === StoreType.REMOTE && {
        storeType: get(environment, 'storeType', ''),
        connectorRef: get(environment, 'connectorRef', ''),
        repoName: get(environment, 'entityGitDetails.repoName', '')
      })
    }
    history.push(
      newLeftNav && calledFromSettingsPage
        ? routesV2.toSettingsEnvironmentDetails({ ...envParams })
        : routes.toEnvironmentDetails({ ...envParams })
    )
  }

  const handleEnvDelete = async (
    environment: Required<EnvironmentResponseDTO>,
    forceDelete?: boolean
  ): Promise<void> => {
    try {
      await deleteItem(environment.identifier, {
        headers: { 'content-type': 'application/json' },
        queryParams: { accountIdentifier: accountId, projectIdentifier, orgIdentifier, forceDelete }
      })
      showSuccess(getString('cd.environment.deleted'))
      refetch()
    } catch (e: any) {
      if (isForceDeleteEnabled && e?.data?.code === 'ENTITY_REFERENCE_EXCEPTION') {
        setEnvironmentToDelete(environment)
        openReferenceErrorDialog()
      } else {
        showError(getRBACErrorMessage(e))
      }
    }
  }

  const redirectToReferencedBy = (): void => {
    history.push(
      routes.toEnvironmentDetails({
        accountId,
        orgIdentifier,
        projectIdentifier,
        environmentIdentifier: environmentToDelete.identifier as string,
        module,
        sectionId: EnvironmentDetailsTab.REFERENCED_BY
      })
    )
  }

  const { openDialog: openReferenceErrorDialog } = useEntityDeleteErrorHandlerDialog({
    entity: {
      type: ResourceType.ENVIRONMENT,
      name: environmentToDelete.name as string
    },
    redirectToReferencedBy,
    forceDeleteCallback: () => handleEnvDelete(environmentToDelete as Required<EnvironmentResponseDTO>, true)
  })

  type CustomColumn<T extends Record<string, any>> = Column<T>

  const envColumns: CustomColumn<EnvironmentResponse>[] = useMemo(
    () => [
      {
        Header: getString('environment').toUpperCase(),
        id: 'name',
        width: CDS_ENV_GITX ? '30%' : '50%',
        Cell: withEnvironment(EnvironmentName)
      },
      ...(CDS_ENV_GITX
        ? [
            {
              Header: getString('pipeline.codeSource'),
              id: 'codeSource',
              width: '25%',
              Cell: withEnvironment(CodeSourceCell)
            }
          ]
        : []),
      {
        Header: getString('typeLabel').toUpperCase(),
        id: 'type',
        width: '15%',
        Cell: withEnvironment(EnvironmentTypes)
      },
      {
        Header: getString('lastUpdated').toUpperCase(),
        id: 'lastUpdatedBy',
        width: CDS_ENV_GITX ? '20%' : '25%',
        Cell: withEnvironment(LastUpdatedBy)
      },
      {
        id: 'modifiedBy',
        width: '10%',
        Cell: withEnvironment(EnvironmentMenu),
        actions: {
          onEdit: handleEnvEdit,
          onDelete: handleEnvDelete,
          reload: refetch
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getString]
  )
  return (
    <TableV2<EnvironmentResponse>
      columns={envColumns}
      data={response.content as EnvironmentResponse[]}
      onRowClick={(row: EnvironmentResponse) => {
        const envParams = {
          accountId,
          orgIdentifier,
          projectIdentifier,
          module,
          environmentIdentifier: get(row, 'environment.identifier', ''),
          sectionId: projectIdentifier ? EnvironmentDetailsTab.SUMMARY : EnvironmentDetailsTab.CONFIGURATION,
          ...(get(row, 'environment.storeType', '') === StoreType.REMOTE && {
            storeType: get(row, 'environment.storeType', ''),
            connectorRef: get(row, 'environment.connectorRef', ''),
            repoName: get(row, 'environment.entityGitDetails.repoName', '')
          })
        }
        history.push(
          newLeftNav && calledFromSettingsPage
            ? routesV2.toSettingsEnvironmentDetails({ ...envParams })
            : routes.toEnvironmentDetails({ ...envParams })
        )
      }}
    />
  )
}
