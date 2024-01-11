import { ButtonProps } from '@rbac/components/Button/Button'
import { ServiceOverridesTab } from '@cd/components/ServiceOverrides/ServiceOverridesUtils'
import { getScopeFromValue } from '@common/components/EntityReference/EntityReference'
import { getIdentifierFromScopedRef } from '@common/utils/utils'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { Scope } from '@common/interfaces/SecretsInterface'
import { PermissionsRequest } from '@modules/20-rbac/hooks/usePermission'

export interface BtnPermissionProps {
  serviceOverrideType: ServiceOverridesTab
  accountId: string
  orgIdentifier: string
  projectIdentifier: string
  environmentRef: string
  serviceRef: string
}

export function useServiceOverridesButtonPermission(props: BtnPermissionProps): ButtonProps['permission'] {
  const { serviceOverrideType, accountId, orgIdentifier, projectIdentifier, serviceRef, environmentRef } = props

  const getScope = (): Scope => {
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

  const getPermissionAndResource = ():
    | Omit<PermissionsRequest, 'permissions'> & {
        permission: PermissionIdentifier
      } => {
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

  return buttonPermission
}
