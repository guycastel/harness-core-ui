/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import {
  AccountPathProps,
  AccountRoutePlacement,
  ModulePathParams,
  ProjectPathProps
} from '@modules/10-common/interfaces/RouteInterfaces'
import { getRemoteServiceQueryParams } from '@modules/75-cd/components/Services/utils/ServiceUtils'
import { Scope } from '@modules/10-common/interfaces/SecretsInterface'
import { ServiceResponseDTO } from 'services/cd-ng'
import {
  getIdentifierFromValue,
  getScopeFromValue
} from '@modules/10-common/components/EntityReference/EntityReference'
import { NAV_MODE } from '@modules/10-common/utils/routeUtils'

export const getScopedServiceUrl = (
  {
    accountId,
    orgIdentifier,
    projectIdentifier,
    scopedServiceIdentifier,
    module,
    accountRoutePlacement,
    serviceMetadata
  }: AccountPathProps &
    Partial<ProjectPathProps & ModulePathParams & { accountRoutePlacement?: AccountRoutePlacement }> & {
      serviceMetadata: ServiceResponseDTO
      scopedServiceIdentifier: string
    },
  isNewNavEnabled: boolean
): string => {
  const serviceScope = getScopeFromValue(scopedServiceIdentifier)
  const serviceId = getIdentifierFromValue(scopedServiceIdentifier)
  const serviceStudioUrl = isNewNavEnabled
    ? routesV2.toSettingsServiceDetails({
        accountId,
        ...(serviceScope !== Scope.ACCOUNT && { orgIdentifier }),
        ...(serviceScope === Scope.PROJECT && { projectIdentifier }),
        serviceId,
        module,
        mode: NAV_MODE.MODULE
      })
    : routes.toServiceStudio({
        accountId,
        ...(serviceScope !== Scope.ACCOUNT && { orgIdentifier }),
        ...(serviceScope === Scope.PROJECT && { projectIdentifier }),
        serviceId,
        module,
        accountRoutePlacement
      })
  const queryParams = getRemoteServiceQueryParams(serviceMetadata, false)

  return queryParams ? `${serviceStudioUrl}?${queryParams}` : serviceStudioUrl
}
