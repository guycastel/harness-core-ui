/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'

import { Tab, Tabs, Text } from '@harness/uicore'
import { useStrings } from 'framework/strings'

import routesv1 from '@common/RouteDefinitions'
import routesv2 from '@common/RouteDefinitionsV2'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { WebhookTabIds } from './utils'

interface WebhooksTabsProps {
  defaultTabId: WebhookTabIds
}

export default function WebhooksTabs(props: WebhooksTabsProps): React.ReactElement {
  const { defaultTabId } = props
  const [selectedTabId, setSelectedTabId] = useState<WebhookTabIds>(defaultTabId)
  const { getString } = useStrings()
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const { isNewNavEnabled: newLeftNav } = useAppStore()
  const routes = newLeftNav ? routesv2 : routesv1
  const history = useHistory()

  return (
    <Tabs
      id="webhookTabs"
      selectedTabId={selectedTabId}
      onChange={newTabId => {
        if (newTabId === WebhookTabIds.ListTab) {
          history.push(routes.toWebhooks({ accountId, orgIdentifier, projectIdentifier, module }))
        } else {
          history.push(routes.toWebhooksEvents({ accountId, orgIdentifier, projectIdentifier, module }))
        }
        setSelectedTabId(newTabId as WebhookTabIds)
      }}
    >
      <Tab id={WebhookTabIds.ListTab} title={<Text>{getString('pipeline.webhooks.webhooksListing')}</Text>} />
      <Tab id={WebhookTabIds.EventsTab} title={<Text>{getString('events')}</Text>} />
    </Tabs>
  )
}
