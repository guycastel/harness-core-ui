/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { TestWrapper } from '@common/utils/testUtils'
import * as useGetAuthSettings from 'framework/hooks/useGetAuthSettings'
import Configuration from '@auth-settings/pages/Configuration/Configuration'
import routes from '@common/RouteDefinitions'
import { accountPathProps } from '@common/utils/routeUtils'
import { mockAuthSettingsResponse, mockResponse } from '@auth-settings/pages/Configuration/__test__/mock'
import { RestResponseAuthenticationSettingsResponse } from 'services/cd-ng'

const syncLdapGroupsMock = jest.fn()
jest.mock('services/cd-ng', () => ({
  useGetAuthenticationSettings: jest.fn().mockImplementation(() => {
    return { data: mockAuthSettingsResponse, refetch: Promise.resolve(mockAuthSettingsResponse) }
  }),
  useGetAuthenticationSettingsV2: jest.fn().mockImplementation(() => {
    return { data: mockAuthSettingsResponse, refetch: Promise.resolve(mockAuthSettingsResponse) }
  }),
  useUpdateAuthMechanism: jest.fn().mockImplementation(() => {
    return { mutate: () => Promise.resolve(mockResponse) }
  }),
  usePutLoginSettings: jest.fn().mockImplementation(() => {
    return { mutate: () => Promise.resolve(mockResponse) }
  }),
  useSetTwoFactorAuthAtAccountLevel: jest.fn().mockImplementation(() => {
    return { mutate: () => Promise.resolve(mockResponse) }
  }),
  useUpdateOauthProviders: jest.fn().mockImplementation(() => {
    return { mutate: () => Promise.resolve(mockResponse) }
  }),
  useGetSamlLoginTest: jest.fn().mockImplementation(() => {
    return { mutate: () => Promise.resolve(mockResponse) }
  }),
  usePostLdapAuthenticationTest: jest.fn().mockImplementation(() => {
    return { mutate: () => Promise.resolve(mockResponse) }
  }),
  useUpdateWhitelistedDomains: jest.fn().mockImplementation(() => {
    return { mutate: () => Promise.resolve(mockResponse) }
  }),
  useRemoveOauthMechanism: jest.fn().mockImplementation(() => {
    return { mutate: () => Promise.resolve(mockResponse) }
  }),
  useDeleteSamlMetaData: jest.fn().mockImplementation(() => {
    return { mutate: () => Promise.resolve(mockResponse) }
  }),
  useDeleteLdapSettings: jest.fn().mockImplementation(() => {
    return { mutate: () => Promise.resolve(mockResponse) }
  }),
  syncLdapGroupsPromise: jest.fn().mockImplementation(() => {
    return syncLdapGroupsMock()
  }),
  useSetSessionTimeoutAtAccountLevel: jest.fn().mockReturnValue({ mutate: jest.fn() })
}))
const useGetAuthSettingsMock = {
  authSettings: mockAuthSettingsResponse as RestResponseAuthenticationSettingsResponse,
  fetchingAuthSettings: false,
  errorWhileFetchingAuthSettings: null,
  fetchChartVersions: jest.fn(),
  refetchAuthSettings: jest.fn()
}
jest.spyOn(useGetAuthSettings, 'useGetAuthSettings').mockReturnValue(useGetAuthSettingsMock)

describe('Configuration', () => {
  test('Configuration page', () => {
    const { getByText, getAllByText } = render(
      <TestWrapper
        path={routes.toAuthenticationSettings({ ...accountPathProps })}
        pathParams={{ accountId: 'testAcc' }}
        defaultFeatureFlagValues={{ PL_IP_ALLOWLIST_NG: true, PL_ALLOW_TO_SET_PUBLIC_ACCESS: true }}
      >
        <Configuration />
      </TestWrapper>
    )

    // assertions ensure different auth mechanisms are properly visible
    expect(getByText('platform.authSettings.accountOrOAuthLogin')).toBeInTheDocument()
    expect(getByText('platform.authSettings.loginViaSAML')).toBeInTheDocument()
    expect(getByText('platform.authSettings.loginViaLDAP')).toBeInTheDocument()
    expect(getByText('platform.authSettings.restrictUsersToEmailDomains')).toBeInTheDocument()

    // 2 labels for SessionInactivityTimeout and AbsoluteSessionTimeout
    expect(getAllByText('platform.authSettings.sessionTimeoutLabel').length).toBe(2)
  })
})
