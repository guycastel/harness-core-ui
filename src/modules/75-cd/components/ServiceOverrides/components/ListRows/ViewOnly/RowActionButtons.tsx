import React from 'react'
import { useParams } from 'react-router-dom'
import { ButtonVariation, Layout } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'

import { Scope } from '@common/interfaces/SecretsInterface'
import { getIdentifierFromScopedRef } from '@common/utils/utils'
import type { PipelinePathProps } from '@common/interfaces/RouteInterfaces'

import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import RbacButton, { ButtonProps } from '@rbac/components/Button/Button'

import { useServiceOverridesContext } from '@cd/components/ServiceOverrides/context/ServiceOverrideContext'
import { getScopeFromValue } from '@common/components/EntityReference/EntityReference'
import { ServiceOverridesTab } from '../../../ServiceOverridesUtils'

export default function RowActionButtons({
  rowIndex,
  environmentRef,
  serviceRef
}: {
  rowIndex: number
  environmentRef: string
  serviceRef: string
}): React.ReactElement {
  const { accountId, projectIdentifier, orgIdentifier } = useParams<PipelinePathProps>()

  const { onEdit, onDelete, onClone, serviceOverrideType } = useServiceOverridesContext()

  const getScope = () => {
    if (
      [ServiceOverridesTab.INFRA_GLOBAL_OVERRIDE, ServiceOverridesTab.ENV_GLOBAL_OVERRIDE].includes(
        serviceOverrideType as ServiceOverridesTab
      )
    )
      return getScopeFromValue(environmentRef)
    return getScopeFromValue(serviceRef)
  }
  const environmentIdentifier = getIdentifierFromScopedRef(environmentRef)
  const serviceIdentifier = getIdentifierFromScopedRef(serviceRef)

  const getPermissionAndResource = () => {
    if (
      [ServiceOverridesTab.INFRA_GLOBAL_OVERRIDE, ServiceOverridesTab.ENV_GLOBAL_OVERRIDE].includes(
        serviceOverrideType as ServiceOverridesTab
      )
    )
      return {
        permission: PermissionIdentifier.EDIT_ENVIRONMENT,
        resource: {
          resourceType: ResourceType.ENVIRONMENT,
          resourceIdentifier: environmentIdentifier
        }
      }
    return {
      permission: PermissionIdentifier.EDIT_SERVICE,
      resource: {
        resourceType: ResourceType.SERVICE,
        resourceIdentifier: serviceIdentifier
      }
    }
  }

  const buttonPermission: ButtonProps['permission'] = {
    resourceScope: {
      accountIdentifier: accountId,
      ...(getScope() !== Scope.ACCOUNT && { orgIdentifier }),
      ...(getScope() === Scope.PROJECT && { projectIdentifier })
    },
    ...getPermissionAndResource()
  }

  return (
    <Layout.Horizontal spacing={'small'} width={110}>
      <RbacButton
        icon="duplicate"
        variation={ButtonVariation.ICON}
        font={{ variation: FontVariation.BODY1 }}
        onClick={() => onClone(rowIndex)}
        permission={buttonPermission}
      />
      <RbacButton
        icon="Edit"
        variation={ButtonVariation.ICON}
        font={{ variation: FontVariation.BODY1 }}
        onClick={() => onEdit(rowIndex)}
        permission={buttonPermission}
      />
      <RbacButton
        icon="main-trash"
        variation={ButtonVariation.ICON}
        font={{ variation: FontVariation.BODY1 }}
        onClick={() => onDelete(rowIndex)}
        permission={buttonPermission}
      />
    </Layout.Horizontal>
  )
}
