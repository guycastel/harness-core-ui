/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useParams } from 'react-router-dom'

import { Container, TabNavigation } from '@harness/uicore'

import { useStrings } from 'framework/strings'

import { useQueryParams } from '@common/hooks'
import type { GitQueryParams, ModulePathParams, PipelinePathProps } from '@common/interfaces/RouteInterfaces'
import routesv1 from '@common/RouteDefinitions'
import routesv2 from '@common/RouteDefinitionsV2'
import { useAppStore } from 'framework/AppStore/AppStoreContext'

export default function TriggerToolbar(): JSX.Element {
  const { orgIdentifier, projectIdentifier, pipelineIdentifier, accountId, module } = useParams<
    PipelinePathProps & ModulePathParams
  >()

  const { repoIdentifier, branch, connectorRef, repoName, storeType } = useQueryParams<GitQueryParams>()
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesv2 : routesv1

  const { getString } = useStrings()

  const routeParams = {
    orgIdentifier,
    projectIdentifier,
    pipelineIdentifier,
    accountId,
    module,
    repoIdentifier,
    branch,
    connectorRef,
    repoName,
    storeType
  }

  return (
    <Container>
      <TabNavigation
        size={'small'}
        links={[
          {
            label: getString('pipelineStudio'),
            to: routes.toPipelineStudio(routeParams)
          },
          {
            label: getString('inputSetsText'),
            to: routes.toInputSetList(routeParams)
          },
          {
            label: getString('common.triggersLabel'),
            to: routes.toTriggersPage(routeParams)
          },
          {
            label: getString('executionHeaderText'),
            to: routes.toPipelineDeploymentList(routeParams)
          }
        ]}
      />
    </Container>
  )
}
