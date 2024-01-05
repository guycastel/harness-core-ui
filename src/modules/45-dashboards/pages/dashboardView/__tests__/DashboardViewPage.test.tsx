/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, RenderResult, screen } from '@testing-library/react'
import { TestWrapper } from '@common/utils/testUtils'
import * as customDashboardServices from 'services/custom-dashboards'
import * as useLicenseStore from 'framework/LicenseStore/LicenseStoreContext'
import { LICENSE_STATE_VALUES } from 'framework/LicenseStore/licenseStoreUtil'
import { Editions } from '@common/constants/SubscriptionTypes'
import DashboardsPage from '../DashboardViewPage'

const defaultLicenseObj: useLicenseStore.LicenseStoreContextProps = {
  versionMap: {},
  CI_LICENSE_STATE: LICENSE_STATE_VALUES.EXPIRED,
  FF_LICENSE_STATE: LICENSE_STATE_VALUES.EXPIRED,
  CCM_LICENSE_STATE: LICENSE_STATE_VALUES.EXPIRED,
  CD_LICENSE_STATE: LICENSE_STATE_VALUES.EXPIRED,
  CHAOS_LICENSE_STATE: LICENSE_STATE_VALUES.EXPIRED,
  STO_LICENSE_STATE: LICENSE_STATE_VALUES.EXPIRED,
  CV_LICENSE_STATE: LICENSE_STATE_VALUES.EXPIRED,
  CET_LICENSE_STATE: LICENSE_STATE_VALUES.EXPIRED,
  SEI_LICENSE_STATE: LICENSE_STATE_VALUES.EXPIRED,
  CODE_LICENSE_STATE: LICENSE_STATE_VALUES.EXPIRED,
  updateLicenseStore: jest.fn(),
  licenseInformation: {}
}

const renderComponent = ({ children }: React.PropsWithChildren<unknown> = {}): RenderResult =>
  render(
    <TestWrapper>
      <DashboardsPage>{children}</DashboardsPage>
    </TestWrapper>
  )

const generateMockSignedUrl = (mockUrl = ''): Promise<customDashboardServices.SignedUrlResponse> => {
  return Promise.resolve({ resource: mockUrl })
}

const aidaMock = {
  loading: false,
  data: {
    data: {
      valueType: 'Boolean',
      value: 'true'
    }
  }
}

jest.mock('services/cd-ng', () => ({
  useGetSettingValue: jest.fn().mockImplementation(() => aidaMock)
}))

describe('DashboardsPage', () => {
  const useLicenseStoreMock = jest.spyOn(useLicenseStore, 'useLicenseStore')
  const useCreateSignedUrlMock = jest.spyOn(customDashboardServices, 'useCreateSignedUrl')
  const useGetDashboardDetailMock = jest.spyOn(customDashboardServices, 'useGetDashboardDetail')
  const useGetFolderDetailMock = jest.spyOn(customDashboardServices, 'useDeprecatedGetFolder')

  const fetchFolderDetailMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(customDashboardServices, 'useSearchFolders').mockReturnValue({ data: {} } as any)
    jest.spyOn(customDashboardServices, 'useGetModelTags').mockReturnValue({ data: { resource: [] } } as any)
    useGetFolderDetailMock.mockReturnValue({ data: { resource: 'folder name' }, refetch: fetchFolderDetailMock } as any)
    useGetDashboardDetailMock.mockReturnValue({ resource: true, title: 'dashboard name' } as any)
    useCreateSignedUrlMock.mockReturnValue({
      mutate: generateMockSignedUrl,
      loading: true,
      error: null
    } as any)
  })

  test('it should show dashboards loading animation', async () => {
    const licenseObj: useLicenseStore.LicenseStoreContextProps = {
      ...defaultLicenseObj,
      licenseInformation: {
        CD: {
          status: LICENSE_STATE_VALUES.ACTIVE,
          edition: Editions.ENTERPRISE
        },
        CE: {
          status: LICENSE_STATE_VALUES.DELETED,
          edition: Editions.ENTERPRISE
        },
        CF: {
          status: LICENSE_STATE_VALUES.EXPIRED,
          edition: Editions.ENTERPRISE
        }
      }
    }
    useLicenseStoreMock.mockReturnValue(licenseObj)

    renderComponent()

    expect(screen.queryByText('dashboards.upgrade')).not.toBeInTheDocument()

    expect(await screen.findByText('common.loading')).toBeInTheDocument()
  })
})
