/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Card, Heading, Layout, Text } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { Tabs } from '@blueprintjs/core'
import { useStrings } from 'framework/strings'
import { ModuleName } from 'framework/types/ModuleName'
import type { ModuleLicenseDTO } from 'services/cd-ng'
import SubscriptionUsageView from './SubscriptionUsageView'
import SubscriptionGraphView from './SubscriptionGraphVIew'
import pageCss from '../SubscriptionsPage.module.scss'
interface SubscriptionTabPageProps {
  module: ModuleName
  licenseData?: ModuleLicenseDTO
  accountId: string
  licenseType: 'SERVICES' | 'SERVICE_INSTANCES' | undefined
}

enum SubscriptionDataTab {
  BREAKDOWN = 'BREAKDOWN',
  TREND = 'TREND'
}
const supportedModules = [ModuleName.CI, ModuleName.CD, ModuleName.SRM, ModuleName.IDP]

function SubscriptionTabPage(props: SubscriptionTabPageProps): React.ReactElement | null {
  const { getString } = useStrings()
  const [activeTab, setActiveTab] = React.useState(SubscriptionDataTab.BREAKDOWN)

  if (!supportedModules.includes(props.module)) {
    return null
  }

  const renderHeading = () => {
    switch (props.module) {
      case ModuleName.CD:
        return (
          <Layout.Vertical className={pageCss.headerMargin}>
            <Heading color={Color.BLACK} font={{ size: 'medium' }}>
              {getString('common.subscriptions.usage.services')}
            </Heading>
            <div className={pageCss.tooltip}>
              <Text
                color={Color.PRIMARY_7}
                tooltip={getString('common.subscriptions.usage.cdServiceTooltip')}
                font={{ size: 'xsmall' }}
              >
                {getString('common.whatIsActiveService')}
              </Text>
            </div>
          </Layout.Vertical>
        )
      case ModuleName.CI:
      case ModuleName.IDP:
        return (
          <Heading color={Color.BLACK} font={{ size: 'medium' }} className={pageCss.headerMargin}>
            {getString('common.subscriptions.usage.activeDevelopers')}
          </Heading>
        )
      case ModuleName.SRM:
        return (
          <Layout.Vertical className={pageCss.headerMargin}>
            <Heading color={Color.BLACK} font={{ size: 'medium' }}>
              {getString('common.subscriptions.usage.services')}
            </Heading>
            <div className={pageCss.tooltip}>
              <Text
                color={Color.PRIMARY_7}
                tooltip={getString('common.subscriptions.usage.cdServiceTooltip')}
                font={{ size: 'xsmall' }}
              >
                {getString('common.whatIsActiveService')}
              </Text>
            </div>
          </Layout.Vertical>
        )
    }
  }

  return (
    <Card>
      {renderHeading()}

      <Tabs
        id="subscription-data"
        className={pageCss.tabs}
        selectedTabId={activeTab}
        onChange={newTab => {
          setActiveTab(newTab as SubscriptionDataTab)
        }}
      >
        <Tabs.Tab
          id={SubscriptionDataTab.BREAKDOWN}
          title={getString('common.subscriptions.tabs.breakdown')}
          panel={<SubscriptionUsageView {...props} />}
        />

        {props.module !== ModuleName.SRM ? (
          <Tabs.Tab
            id={SubscriptionDataTab.TREND}
            title={getString('common.subscriptions.tabs.trend')}
            panel={<SubscriptionGraphView {...props} />}
          />
        ) : null}
      </Tabs>
    </Card>
  )
}

export default SubscriptionTabPage
