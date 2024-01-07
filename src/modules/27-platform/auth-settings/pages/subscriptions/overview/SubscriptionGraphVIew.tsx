/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Layout } from '@harness/uicore'
import { ModuleName } from 'framework/types/ModuleName'
import type { ModuleLicenseDTO } from 'services/cd-ng'
import CIUsageGraph from './CIUsageGraph'
import { ServiceLicenseGraphs } from './ServiceLicenseGraphs'
import IDPUsageGraph from './IDPUsageGraph'

interface SubscriptionGraphViewProps {
  accountId: string
  licenseType: 'SERVICES' | 'SERVICE_INSTANCES' | 'DEVELOPERS' | undefined
  licenseData?: ModuleLicenseDTO
  module: ModuleName
}

const getModuleUsagesGraph = (props: SubscriptionGraphViewProps): React.ReactElement | undefined => {
  switch (props.module) {
    case ModuleName.CI:
      return <CIUsageGraph {...props} />
    case ModuleName.CD:
      return <ServiceLicenseGraphs {...props} />
    case ModuleName.IDP:
      return <IDPUsageGraph {...props} />
    default:
      return undefined
  }
}

const SubscriptionGraphView: React.FC<SubscriptionGraphViewProps> = props => {
  const usageModuleTable = getModuleUsagesGraph(props)
  return usageModuleTable ? (
    <Layout.Vertical spacing="xxlarge" flex={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
      {usageModuleTable}
    </Layout.Vertical>
  ) : (
    <></>
  )
}

export default SubscriptionGraphView
