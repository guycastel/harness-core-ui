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
import CDUsageTable from './CDUsageTable'
import CIUsageTable from './CIUsageTable'
import SRMUsageTable from './SRMUsageTable'
import IDPUsageTable from './IDPUsageTable'

interface SubscriptionUsageViewProps {
  module: ModuleName
  licenseData?: ModuleLicenseDTO
}

const getModuleUsagesTable = (props: SubscriptionUsageViewProps): React.ReactElement | undefined => {
  switch (props.module) {
    case ModuleName.CI:
      return <CIUsageTable {...props} />
    case ModuleName.CD:
      return <CDUsageTable {...props} />
    case ModuleName.SRM:
      return <SRMUsageTable {...props} />
    case ModuleName.IDP:
      return <IDPUsageTable {...props} />
    default:
      return undefined
  }
}

const SubscriptionUsageView: React.FC<SubscriptionUsageViewProps> = props => {
  const usageModuleTable = getModuleUsagesTable(props)
  return usageModuleTable ? (
    <Layout.Vertical spacing="xxlarge" flex={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
      {usageModuleTable}
    </Layout.Vertical>
  ) : (
    <></>
  )
}

export default SubscriptionUsageView
