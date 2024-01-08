/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render } from '@testing-library/react'
import routes from '@common/RouteDefinitionsV2'
import * as cdngServices from 'services/cd-ng'
import { TestWrapper } from '@common/utils/testUtils'
import { ProjectSettingsPage } from '@projects-orgs/components/SettingsPageComponent/ProjectSettingsPage'
import * as Licenses from '@common/hooks/useModuleLicenses'
import { LICENSE_STATE_VALUES } from 'framework/LicenseStore/licenseStoreUtil'
import { NAV_MODE, modulePathProps, projectPathProps } from '@common/utils/routeUtils'
import mockImport from 'framework/utils/mockImport'
import { Editions } from '@modules/10-common/constants/SubscriptionTypes'

const testPath = routes.toSettings({ ...projectPathProps, ...modulePathProps, mode: NAV_MODE.MODULE })

mockImport('framework/LicenseStore/LicenseStoreContext', {
  useLicenseStore: jest.fn().mockImplementation(() => ({
    licenseInformation: {
      CD: {
        edition: Editions.ENTERPRISE
      }
    },
    CI_LICENSE_STATE: LICENSE_STATE_VALUES.ACTIVE,
    CV_LICENSE_STATE: LICENSE_STATE_VALUES.ACTIVE,
    CHAOS_LICENSE_STATE: LICENSE_STATE_VALUES.ACTIVE,
    STO_LICENSE_STATE: LICENSE_STATE_VALUES.ACTIVE,
    CD_LICENSE_STATE: LICENSE_STATE_VALUES.ACTIVE
  }))
})

mockImport('framework/AppStore/AppStoreContext', {
  useAppStore: jest.fn().mockImplementation(() => ({
    currentModule: 'cd',
    isGitSimplificationEnabled: true,
    isGitSyncEnabled: true,
    gitSyncEnabledOnlyForFF: false
  }))
})

describe('Project Settings Page', () => {
  test('should render project settings page', async () => {
    jest
      .spyOn(cdngServices, 'useGetSettingValue')
      .mockImplementation(() => ({ data: { data: { value: 'true' } } } as any))
    jest.spyOn(Licenses, 'useAnyEnterpriseLicense').mockReturnValue(true)
    const { getAllByText, queryByText } = render(
      <TestWrapper
        path={testPath}
        pathParams={{ accountId: 'abcd', module: 'cd', orgIdentifier: 'efgh', projectIdentifier: 'svsdv' }}
        defaultFeatureFlagValues={{
          CDS_SERVICE_OVERRIDES_2_0: true,
          STO_JIRA_INTEGRATION: true,
          PL_DISCOVERY_ENABLE: true,
          USE_OLD_GIT_SYNC: true,
          CVNG_TEMPLATE_MONITORED_SERVICE: true
        }}
      >
        <ProjectSettingsPage />
      </TestWrapper>
    )
    expect(queryByText('common.settingsPage.title.projectSettingsTitle')).toBeInTheDocument()
    expect(getAllByText('common.settingsPage.title.projectLevelResources')).toHaveLength(2)
    expect(getAllByText('common.settingCategory.general')).toHaveLength(2)
    expect(getAllByText('accessControl')).toHaveLength(2)
    expect(getAllByText('common.settingsPage.title.securityGovernance')).toHaveLength(2)
    expect(getAllByText('common.tickets.externalTickets')).toHaveLength(3)

    expect(queryByText('services')).toBeInTheDocument()
    expect(queryByText('environments')).toBeInTheDocument()
    expect(queryByText('connectorsLabel')).toBeInTheDocument()
    expect(queryByText('delegate.delegates')).toBeInTheDocument()
    expect(queryByText('common.secrets')).toBeInTheDocument()
    expect(queryByText('resourcePage.fileStore')).toBeInTheDocument()
    expect(queryByText('common.templates')).toBeInTheDocument()
    expect(queryByText('common.variables')).toBeInTheDocument()
    expect(queryByText('common.sloDowntimeLabel')).toBeInTheDocument()
    expect(queryByText('gitManagement')).toBeInTheDocument()
    expect(queryByText('common.discovery')).toBeInTheDocument()
    expect(queryByText('common.monitoredServices')).toBeInTheDocument()
    expect(queryByText('common.overrides')).toBeInTheDocument()
    expect(queryByText('common.defaultSettings')).toBeInTheDocument()
    expect(queryByText('users')).toBeInTheDocument()
    expect(queryByText('common.userGroups')).toBeInTheDocument()
    expect(queryByText('common.serviceAccounts')).toBeInTheDocument()
    expect(queryByText('resourceGroups')).toBeInTheDocument()
    expect(queryByText('roles')).toBeInTheDocument()
    expect(queryByText('common.governance')).toBeInTheDocument()
    expect(queryByText('common.freezeWindows')).toBeInTheDocument()
  })
})
