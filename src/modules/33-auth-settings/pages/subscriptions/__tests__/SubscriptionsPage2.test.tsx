/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import moment from 'moment'
import { render } from '@testing-library/react'
import { TestWrapper } from '@common/utils/testUtils'
import {
  useGetAccountNG,
  useGetModuleLicensesByAccountAndModuleType,
  useExtendTrialLicense,
  useSaveFeedback,
  useGetOrganizationList,
  useGetProjectList
} from 'services/cd-ng'
import { Editions } from '@common/constants/SubscriptionTypes'
import SubscriptionsPage from '../SubscriptionsPage'
import orgMockData from './mocks/orgMockData.json'
import projMockData from './mocks/projMockData.json'
jest.mock('services/cd-ng')
const useGetModuleLicenseInfoMock = useGetModuleLicensesByAccountAndModuleType as jest.MockedFunction<any>
const useGetAccountMock = useGetAccountNG as jest.MockedFunction<any>
const useExtendTrialLicenseMock = useExtendTrialLicense as jest.MockedFunction<any>
useExtendTrialLicenseMock.mockImplementation(() => {
  return {
    mutate: jest.fn()
  }
})
const useGetOrganizationListMock = useGetOrganizationList as jest.MockedFunction<any>
useGetOrganizationListMock.mockImplementation(() => {
  return { ...orgMockData, refetch: jest.fn(), error: null }
})
const useGetProjectListMock = useGetProjectList as jest.MockedFunction<any>
useGetProjectListMock.mockImplementation(() => {
  return { ...projMockData, refetch: jest.fn(), error: null }
})
const useSaveFeedbackMock = useSaveFeedback as jest.MockedFunction<any>
useSaveFeedbackMock.mockImplementation(() => {
  return {
    mutate: jest.fn()
  }
})
jest.mock('@common/hooks', () => ({
  ...(jest.requireActual('@common/hooks') as any),
  useMutateAsGet: jest.fn().mockImplementation(() => {
    return { data: {}, refetch: jest.fn(), error: null, loading: false }
  })
}))
moment.now = jest.fn(() => 1482363367071)

const featureFlags = {
  CDNG_ENABLED: true,
  CVNG_ENABLED: true,
  CING_ENABLED: true,
  CENG_ENABLED: true,
  CFNG_ENABLED: true
}

describe('Subscriptions Page', () => {
  test('it renders the subscriptions page with no data service table', async () => {
    useGetModuleLicenseInfoMock.mockImplementation(() => {
      return {
        data: {
          data: [
            {
              edition: Editions.ENTERPRISE
            }
          ],
          status: 'SUCCESS'
        },
        refetch: jest.fn()
      }
    })

    useGetAccountMock.mockImplementation(() => {
      return {
        data: {
          data: {
            accountId: '123'
          },
          status: 'SUCCESS'
        },
        refetch: jest.fn()
      }
    })

    const { container, getByText } = render(
      <TestWrapper defaultAppStoreValues={{ featureFlags }}>
        <SubscriptionsPage />
      </TestWrapper>
    )
    expect(getByText('common.subscriptions.title')).toBeTruthy()
    expect(getByText('common.subscriptions.expiryCountdown')).toBeTruthy()
    expect(getByText('common.subscriptions.trial')).toBeTruthy()
    expect(container).toMatchSnapshot()
  })
})