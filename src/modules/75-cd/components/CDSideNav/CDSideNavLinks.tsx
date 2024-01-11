/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useHistory, useParams, matchPath, useLocation } from 'react-router-dom'
import { Container, Text } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { SideNav } from '@common/navigation/SideNavV2/SideNavV2'
import { Scope } from 'framework/types/types'
import routes from '@common/RouteDefinitionsV2'
import { AccountPathProps, Module } from '@common/interfaces/RouteInterfaces'
import { useStrings } from 'framework/strings'
import { NAV_MODE } from '@common/utils/routeUtils'
import { useGetCommunity } from '@common/utils/utils'
import { useGetPipelines } from '@pipeline/hooks/useGetPipelines'
import { PagePMSPipelineSummaryResponse } from 'services/pipeline-ng'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useGetSelectedScope } from '@common/navigation/SideNavV2/SideNavV2.utils'
import { ModuleLinksProps } from '@modules/ModuleRouteConfig'
import { SIDE_NAV_STATE } from '@modules/10-common/router/RouteWithLayoutV2'
import css from './CDSideNav.module.scss'

const module: Module = 'cd'
const CDSideNavLinks = (mode: NAV_MODE, sideNavProps?: ModuleLinksProps): React.ReactElement => {
  const history = useHistory()
  const { params } = useGetSelectedScope()
  const { projectIdentifier = '', orgIdentifier = '' } = params || {}
  const { accountId } = useParams<AccountPathProps>()
  const { getString } = useStrings()
  const isCommunity = useGetCommunity()
  const { CDS_SERVICE_OVERRIDES_2_0 } = useFeatureFlags()

  const { pathname } = useLocation()

  const isOverviewPage = !!matchPath(pathname, {
    path: routes.toOverview({ accountId, projectIdentifier, orgIdentifier, module })
  })

  const isGetStartedPage = !!matchPath(pathname, {
    path: routes.toGetStartedWithCD({ accountId, projectIdentifier, orgIdentifier, module })
  })

  const {
    data: fetchPipelinesData,
    loading: fetchingPipelines,
    refetch: fetchPipelines
  } = useGetPipelines({
    accountIdentifier: accountId,
    projectIdentifier,
    orgIdentifier,
    lazy: true,
    size: 1
  })

  React.useEffect(() => {
    if (projectIdentifier) {
      fetchPipelines()
    }
  }, [projectIdentifier])

  React.useEffect(() => {
    if (!fetchingPipelines && fetchPipelinesData) {
      const { data, status } = fetchPipelinesData
      const isGettingStartedEnabled =
        status === 'SUCCESS' && (data as PagePMSPipelineSummaryResponse)?.totalElements === 0
      if (isGettingStartedEnabled) {
        isOverviewPage &&
          history.replace(routes.toGetStartedWithCD({ accountId, projectIdentifier, orgIdentifier, module }))
      } else {
        isGetStartedPage &&
          history.replace(routes.toDeployments({ accountId, projectIdentifier, orgIdentifier, module }))
      }
    }
  }, [fetchPipelinesData, fetchingPipelines, history, accountId, orgIdentifier, projectIdentifier])

  const isServiceOverridesEnabled = CDS_SERVICE_OVERRIDES_2_0

  return (
    <SideNav.Main>
      <SideNav.Section>
        <SideNav.Scope scope={Scope.PROJECT}>
          <SideNav.Link
            icon="nav-home"
            label={getString('overview')}
            to={routes.toOverview({ accountId, projectIdentifier, orgIdentifier, module })}
            hidden={isCommunity}
          />
          <SideNav.Link
            icon="get-started"
            label={getString('getStarted')}
            to={routes.toGetStartedWithCD({ accountId, projectIdentifier, orgIdentifier, module })}
          />
          <SideNav.Link
            icon="execution"
            label={getString('executionsText')}
            to={routes.toDeployments({ accountId, projectIdentifier, orgIdentifier, module })}
            hidden={mode === NAV_MODE.ALL}
          />
          <SideNav.Link
            icon="nav-pipeline"
            label={getString('pipelines')}
            to={routes.toPipelines({ accountId, projectIdentifier, orgIdentifier, module })}
            hidden={mode === NAV_MODE.ALL}
          />
          <SideNav.Link
            icon="services"
            label={getString('services')}
            to={routes.toServices({ accountId, projectIdentifier, orgIdentifier, module })}
          />
          <SideNav.Link
            icon="nav-environments"
            label={getString('environments')}
            to={routes.toEnvironment({ accountId, projectIdentifier, orgIdentifier, module })}
          />
          <SideNav.Link
            icon="monitored-service"
            label={getString('common.monitoredServices')}
            to={routes.toMonitoredServices({ accountId, projectIdentifier, orgIdentifier, module })}
          />
          <SideNav.Link
            label={getString('common.overrides')}
            to={routes.toServiceOverrides({ accountId, projectIdentifier, orgIdentifier, module })}
            hidden={!isServiceOverridesEnabled}
            icon="layers-outline"
          />
          <SideNav.Link
            icon="gitops"
            label={getString('cd.gitOps')}
            to={routes.toGitOps({ ...params, module })}
            hidden={isCommunity}
          />
        </SideNav.Scope>
      </SideNav.Section>
      <SideNav.CommonScopeLinks mode={mode} module={module} />
      {sideNavProps?.sideNavState === SIDE_NAV_STATE.EXPANDED && (
        <Container className={css.flex1}>
          <a
            className={css.launchButton}
            onClick={() => {
              window.location.href = `/#/account/${accountId}/dashboard`
            }}
          >
            <Text font={{ variation: FontVariation.BODY }} color={Color.PRIMARY_4}>
              {getString('cd.cdLaunchText')}
            </Text>
          </a>
        </Container>
      )}
    </SideNav.Main>
  )
}

export default CDSideNavLinks
