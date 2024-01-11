import React from 'react'
import { useParams } from 'react-router-dom'
import RbacButton, { ButtonProps } from '@modules/20-rbac/components/Button/Button'
import { useStrings } from 'framework/strings'
import { PipelinePathProps } from '@modules/10-common/interfaces/RouteInterfaces'
import { PermissionIdentifier } from '@modules/20-rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@modules/20-rbac/interfaces/ResourceType'
import { useServiceOverridesContext } from '../../context/ServiceOverrideContext'
import { ServiceOverridesTab } from '../../ServiceOverridesUtils'

export default function NewServiceOverrideButton(): React.ReactElement {
  const { getString } = useStrings()
  const { handleNewOverrideSection, serviceOverrideType } = useServiceOverridesContext()
  const { accountId, orgIdentifier, projectIdentifier } = useParams<PipelinePathProps>()

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
          resourceIdentifier: ''
        }
      }
    return {
      permission: PermissionIdentifier.EDIT_SERVICE,
      resource: {
        resourceType: ResourceType.SERVICE,
        resourceIdentifier: ''
      }
    }
  }

  const buttonPermission: ButtonProps['permission'] = {
    resourceScope: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    },
    ...getPermissionAndResource()
  }

  return (
    <RbacButton
      intent="primary"
      icon="plus"
      text={getString('common.serviceOverrides.newOverride')}
      data-testid="add-service-override"
      permission={buttonPermission}
      onClick={handleNewOverrideSection}
    />
  )
}
