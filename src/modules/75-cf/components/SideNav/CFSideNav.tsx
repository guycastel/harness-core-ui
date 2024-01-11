/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useParams } from 'react-router-dom'
import { SideNav } from '@common/navigation/SideNavV2/SideNavV2'
import { Scope } from 'framework/types/types'
import { AccountPathProps, Module } from '@common/interfaces/RouteInterfaces'
import { useStrings } from 'framework/strings'
import routes from '@common/RouteDefinitionsV2'
import { useGetSelectedScope } from '@common/navigation/SideNavV2/SideNavV2.utils'
import { NAV_MODE } from '@common/utils/routeUtils'

const module: Module = 'cf'
const CFSideNavLinks = (mode: NAV_MODE): React.ReactElement => {
  const { getString } = useStrings()
  const { accountId } = useParams<AccountPathProps>()
  const { params } = useGetSelectedScope()
  const { projectIdentifier, orgIdentifier } = params || {}

  return (
    <SideNav.Main>
      <SideNav.Section>
        <SideNav.Scope scope={Scope.PROJECT}>
          <SideNav.Link
            icon="cf-nav-featureFlags"
            label={getString('featureFlagsText')}
            to={routes.toCFFeatureFlags({
              accountId,
              projectIdentifier: projectIdentifier as string,
              orgIdentifier: orgIdentifier as string,
              module
            })}
          />
          <SideNav.Link
            icon="target-management"
            label={getString('cf.shared.targets')}
            to={routes.toCFTargetManagement({
              accountId,
              projectIdentifier: projectIdentifier as string,
              orgIdentifier: orgIdentifier as string,
              module
            })}
          />
          <SideNav.Link
            icon="infrastructure"
            label={getString('environments')}
            to={routes.toCFEnvironments({
              accountId,
              projectIdentifier: projectIdentifier as string,
              orgIdentifier: orgIdentifier as string,
              module
            })}
          />
          <SideNav.Link
            icon="nav-pipeline"
            label={getString('pipelines')}
            to={routes.toPipelines({ accountId, projectIdentifier, orgIdentifier, module })}
            hidden={mode === NAV_MODE.ALL}
          />
          <SideNav.Link
            icon="get-started"
            label={getString('cf.shared.getStarted')}
            to={routes.toCFOnboarding({
              accountId,
              projectIdentifier: projectIdentifier as string,
              orgIdentifier: orgIdentifier as string,
              module
            })}
          />
        </SideNav.Scope>
      </SideNav.Section>
      <SideNav.CommonScopeLinks mode={mode} module={module} />
    </SideNav.Main>
  )
}

export default CFSideNavLinks
