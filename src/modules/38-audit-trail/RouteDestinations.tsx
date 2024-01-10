/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'

import { RouteWithLayout } from '@common/router'
import { AccountSideNavProps } from '@common/RouteDestinations'
import routes from '@common/RouteDefinitions'
import { accountPathProps } from '@common/utils/routeUtils'
import RbacFactory from '@rbac/factories/RbacFactory'
import { ResourceType, ResourceCategory } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { String } from 'framework/strings'
import AuditTrailsPage from './pages/AuditTrails/AuditTrailsPage'

RbacFactory.registerResourceTypeHandler(ResourceType.STREAMING_DESTINATION, {
  icon: 'audit-log-created',
  label: 'auditTrail.streamingDestination',
  labelSingular: 'auditTrail.streamingDestination',
  category: ResourceCategory.ADMINSTRATIVE_FUNCTIONS,
  permissionLabels: {
    [PermissionIdentifier.VIEW_STREAMING_DESTINATION]: <String stringID="rbac.permissionLabels.view" />,
    [PermissionIdentifier.CREATE_OR_EDIT_STREAMING_DESTINATION]: <String stringID="rbac.permissionLabels.createEdit" />,
    [PermissionIdentifier.DELETE_STREAMING_DESTINATION]: <String stringID="rbac.permissionLabels.delete" />
  }
})

RbacFactory.registerResourceTypeHandler(ResourceType.AUDIT, {
  icon: 'audit-log-created',
  label: 'auditTrail.auditLogs',
  labelSingular: 'auditTrail.auditLogs',
  category: ResourceCategory.ADMINSTRATIVE_FUNCTIONS,
  permissionLabels: {
    [PermissionIdentifier.VIEW_AUDIT]: <String stringID="rbac.permissionLabels.view" />
  }
})

export default (
  <>
    <RouteWithLayout sidebarProps={AccountSideNavProps} path={routes.toAuditTrail({ ...accountPathProps })} exact>
      <AuditTrailsPage />
    </RouteWithLayout>
  </>
)
