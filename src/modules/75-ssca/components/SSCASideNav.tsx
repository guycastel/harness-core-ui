/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

/* istanbul ignore file - no sidenavs are tested in Unit tests rather test in integration tests, currently other sidenav do a just snapshot which is not correct way to do*/

import React from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Layout } from '@harness/uicore'
import routes from '@common/RouteDefinitions'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { SidebarLink } from '@common/navigation/SideNav/SideNav'
import { ProjectSelector } from '@projects-orgs/components/ProjectSelector/ProjectSelector'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { useStrings } from 'framework/strings'
import ProjectSetupMenu from '@common/navigation/ProjectSetupMenu/ProjectSetupMenu'
import { useFeatureFlag } from '@modules/10-common/hooks/useFeatureFlag'
import { FeatureFlag } from '@modules/10-common/featureFlags'

const module = 'ssca'

export default function SSCASideNav(): React.ReactElement {
  const { getString } = useStrings()
  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()
  const { updateAppStore } = useAppStore()
  const history = useHistory()

  const showLinks = projectIdentifier && orgIdentifier
  const showRemediationTracker = useFeatureFlag(FeatureFlag.SSCA_REMEDIATION_TRACKER)
  const params: ProjectPathProps & ModulePathParams = {
    accountId,
    projectIdentifier,
    orgIdentifier,
    module
  }

  return (
    <Layout.Vertical spacing="small">
      <ProjectSelector
        onSelect={selectedProject => {
          updateAppStore({ selectedProject: selectedProject })
          history.push(
            routes.toProjectOverview({
              accountId,
              projectIdentifier: selectedProject.identifier,
              orgIdentifier: selectedProject.orgIdentifier || /* istanbul ignore next */ '',
              module
            })
          )
        }}
      />
      {showLinks && (
        <>
          <SidebarLink label={getString('overview')} to={routes.toProjectOverview(params)} />
          <SidebarLink label={getString('artifacts')} to={routes.toSSCAArtifacts(params)} />
          <SidebarLink label={getString('pipelines')} to={routes.toPipelines(params)} />
          {showRemediationTracker && (
            <SidebarLink label={getString('ssca.remediationTracker')} to={routes.toRemediationTracker(params)} />
          )}
          <ProjectSetupMenu module={module} />
        </>
      )}
    </Layout.Vertical>
  )
}
