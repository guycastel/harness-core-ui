/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import { Layout } from '@harness/uicore'
import { useHistory, useParams } from 'react-router-dom'
import { useGetStatusInfoTypeV2Query } from '@harnessio/react-idp-service-client'
import { isEmpty } from 'lodash-es'
import { SidebarLink } from '@common/navigation/SideNav/SideNav'
import { useStrings } from 'framework/strings'
import routes from '@common/RouteDefinitions'
import type { AccountPathProps, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { ProjectSelector } from '@modules/45-projects-orgs/components/ProjectSelector/ProjectSelector'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import css from './IDPAdminSideNav.module.scss'

export default function IDPAdminSideNav(): React.ReactElement {
  const { getString } = useStrings()
  const { accountId } = useParams<AccountPathProps>()
  const params = useParams<ProjectPathProps>()
  const { updateAppStore, selectedProject } = useAppStore()
  const history = useHistory()

  const { data } = useGetStatusInfoTypeV2Query(
    { type: 'onboarding' },
    {
      staleTime: 15 * 60 * 1000
    }
  )
  const onboardingStatus = data?.content?.onboarding?.current_status
  const [showGetStarted, setShowGetStarted] = useState(false)

  useEffect(() => {
    if (!isEmpty(onboardingStatus)) {
      setShowGetStarted(onboardingStatus !== 'COMPLETED')
    }
  }, [onboardingStatus])

  return (
    <Layout.Vertical spacing="small">
      {showGetStarted ? (
        <SidebarLink label={getString('getStarted')} to={routes.toGetStartedWithIDP({ accountId })} />
      ) : (
        <>
          <SidebarLink
            label={getString('back')}
            to={routes.toIDP(params)}
            className={css.backBtn}
            icon="main-chevron-left"
          />
          <SidebarLink label={getString('common.plugins')} to={routes.toPluginsPage(params)} />
          <SidebarLink label={getString('common.configurations')} to={routes.toConfigurations(params)} />
          <SidebarLink label={getString('idp.oAuthConfig')} to={routes.toIDPOAuthConfig(params)} />
          <SidebarLink label={getString('idp.scorecards')} to={routes.toScorecards(params)} />
          <SidebarLink label={getString('idp.layout')} to={routes.toLayoutConfig(params)} />
          <SidebarLink label={getString('accessControl')} to={routes.toIDPAccessControl(params)} />
          <SidebarLink label={getString('connectorsLabel')} to={routes.toConnectorsPage(params)} />
          <SidebarLink label={getString('idp.urlAllowList')} to={routes.toIDPAllowListURL(params)} />

          <div className={css.projectScopeItems} />
          <ProjectSelector
            onSelect={selected => {
              updateAppStore({ selectedProject: selected })
              history.push(
                routes.toIDPPipelines({
                  ...params,
                  projectIdentifier: selected?.identifier,
                  orgIdentifier: selected?.orgIdentifier
                })
              )
            }}
          />
          <SidebarLink
            label={getString('pipelines')}
            to={
              selectedProject
                ? routes.toIDPPipelines({
                    ...params,
                    projectIdentifier: selectedProject?.identifier,
                    orgIdentifier: selectedProject?.orgIdentifier
                  })
                : routes.toIDPProjectSetup(params)
            }
          />
          {selectedProject && (
            <SidebarLink
              label={getString('common.pipelineExecution')}
              to={routes.toIDPDeployments({
                ...params,
                projectIdentifier: selectedProject?.identifier,
                orgIdentifier: selectedProject?.orgIdentifier
              })}
            />
          )}
        </>
      )}
    </Layout.Vertical>
  )
}
