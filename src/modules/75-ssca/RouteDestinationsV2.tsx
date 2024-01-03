/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { lazy } from 'react'
import { Redirect, Switch, useParams } from 'react-router-dom'
import routes from '@common/RouteDefinitionsV2'
import { Duration, TimeAgoPopover } from '@common/components'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { useQueryParamsOptions } from '@common/hooks/useQueryParams'
import { AccountPathProps, Module } from '@common/interfaces/RouteInterfaces'
import { RouteWithContext } from '@common/router/RouteWithContext/RouteWithContext'
import {
  useMetadataGetProject,
  useMetadataListPriorities,
  useMetadataListProjects
} from 'services/ticket-service/ticketServiceComponents'
import { NAV_MODE, accountPathProps, orgPathProps, projectPathProps } from '@common/utils/routeUtils'
import PipelineRouteDestinations from '@pipeline/PipelineRouteDestinations'
import { Scope } from 'framework/types/types'
import ChildAppMounter from 'microfrontends/ChildAppMounter'
import { useGetSelectedScope } from '@common/navigation/SideNavV2/SideNavV2.utils'
import { PolicyViolationsDrawer } from '@modules/70-pipeline/pages/execution/ExecutionArtifactsView/PolicyViolations/PolicyViolationsDrawer'
import { SLSAVerification } from '@modules/70-pipeline/pages/execution/ExecutionArtifactsView/ArtifactsTable/ArtifactTableCells'
import { SSCACustomMicroFrontendProps } from './interfaces/SSCACustomMicroFrontendProps.types'

const module: Module = 'ssca'

const SSCARedirect: React.FC = () => {
  const { scope, params } = useGetSelectedScope()
  const { accountId } = useParams<AccountPathProps>()

  if (scope === Scope.ACCOUNT) {
    // redirect to settings page
    return <Redirect to={routes.toSettings({ module })} />
  }

  if (scope === Scope.ORGANIZATION) {
    // redirect to settings page
    return <Redirect to={routes.toSettings({ orgIdentifier: params?.orgIdentifier, module })} />
  }

  if (scope === Scope.PROJECT) {
    return (
      <Redirect
        to={routes.toOverview({
          projectIdentifier: params?.projectIdentifier,
          orgIdentifier: params?.orgIdentifier,
          accountId,
          module
        })}
      />
    )
  }

  return <Redirect to={routes.toSettings({ module })} />
}

// eslint-disable-next-line import/no-unresolved
const RemoteSSCAApp = lazy(() => import('ssca/MicroFrontendApp'))

const SSCARouteDestinations = (mode = NAV_MODE.MODULE): React.ReactElement => {
  return (
    <Switch>
      <RouteWithContext
        exact
        path={[
          routes.toMode({ ...projectPathProps, module, mode }),
          routes.toMode({ ...orgPathProps, module, mode }),
          routes.toMode({ ...accountPathProps, module, mode })
        ]}
      >
        <SSCARedirect />
      </RouteWithContext>

      <RouteWithContext
        exact
        path={[
          routes.toSSCA({ ...projectPathProps, module, mode }),
          routes.toOverview({ ...projectPathProps, module, mode })
        ]}
      >
        <ChildAppMounter<SSCACustomMicroFrontendProps>
          ChildApp={RemoteSSCAApp}
          customComponents={{ Duration, PolicyViolationsDrawer, SLSAVerification, TimeAgoPopover }}
          customHooks={{
            useQueryParams,
            useUpdateQueryParams,
            useQueryParamsOptions
          }}
          customServices={{
            useMetadataGetProject,
            useMetadataListPriorities,
            useMetadataListProjects
          }}
        />
      </RouteWithContext>

      <RouteWithContext
        path={[
          routes.toSSCAArtifacts({ ...projectPathProps, module, mode }),
          routes.toRemediationTracker({ ...projectPathProps, module, mode })
        ]}
      >
        <ChildAppMounter<SSCACustomMicroFrontendProps>
          ChildApp={RemoteSSCAApp}
          customComponents={{ Duration, PolicyViolationsDrawer, SLSAVerification, TimeAgoPopover }}
          customHooks={{
            useQueryParams,
            useUpdateQueryParams,
            useQueryParamsOptions
          }}
          customServices={{
            useMetadataGetProject,
            useMetadataListPriorities,
            useMetadataListProjects
          }}
        />
      </RouteWithContext>

      {PipelineRouteDestinations({ mode }).props.children}
    </Switch>
  )
}

export default SSCARouteDestinations
