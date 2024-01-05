/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useParams } from 'react-router-dom'

import { TabNavigation } from '@harness/uicore'
import { useStrings } from 'framework/strings'

import routesV1 from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'

export default function EnvironmentTabs({
  calledFromSettingsPage
}: {
  calledFromSettingsPage?: boolean
}): React.ReactElement {
  const { getString } = useStrings()
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const { isNewNavEnabled } = useAppStore()
  const newLeftNavRoute = isNewNavEnabled && calledFromSettingsPage
  const routes = isNewNavEnabled ? routesV2 : routesV1

  const queryParams = {
    accountId,
    orgIdentifier,
    projectIdentifier,
    module
  }

  return (
    <TabNavigation
      size={'small'}
      links={[
        {
          label: getString('environment'),
          to: newLeftNavRoute ? routesV2.toSettingsEnvironments(queryParams) : routes.toEnvironment(queryParams),
          exact: true
        },
        {
          label: getString('common.environmentGroups.label'),
          to: newLeftNavRoute
            ? routesV2.toSettingsEnvironmentGroups(queryParams)
            : routes.toEnvironmentGroups(queryParams)
        }
      ]}
    />
  )
}
