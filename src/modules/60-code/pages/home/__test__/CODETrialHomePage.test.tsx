/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { findByText, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as FeatureFlagMock from '@common/hooks/useFeatureFlag'
import { TestWrapper, findDialogContainer } from '@common/utils/testUtils'
import { useStartTrialLicense, useStartFreeLicense } from 'services/cd-ng'
import { ModuleLicenseType } from '@modules/10-common/constants/SubscriptionTypes'
import CODETrialHomePage from '../CODETrialHomePage'

jest.mock('services/cd-ng')
const useStartTrialMock = useStartTrialLicense as jest.MockedFunction<any>
const useStartFreeLicenseMock = useStartFreeLicense as jest.MockedFunction<any>

describe('CODETrialHomePage snapshot test', () => {
  beforeEach(() => {
    window.deploymentType = 'SAAS'
    useStartTrialMock.mockImplementation(() => {
      return {
        cancel: jest.fn(),
        loading: false,
        mutate: jest.fn().mockImplementationOnce(() => {
          return {
            status: 'SUCCESS',
            data: {
              licenseType: 'TRIAL'
            }
          }
        })
      }
    }),
      useStartFreeLicenseMock.mockImplementation(() => {
        return {
          cancel: jest.fn(),
          loading: false,
          mutate: jest.fn().mockImplementationOnce(() => {
            return {
              status: 'SUCCESS',
              data: {
                licenseType: 'FREE'
              }
            }
          })
        }
      })
  })

  test('it should render properly', async () => {
    window.deploymentType = 'ON_PREM'
    const container = render(
      <TestWrapper>
        <CODETrialHomePage />
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
  })

  test('it should render start free plan cta when deployment type is not on prem', () => {
    const { getByText } = render(
      <TestWrapper>
        <CODETrialHomePage />
      </TestWrapper>
    )
    expect(getByText('common.startFreePlan')).toBeDefined()
  })

  test('it should render contact sale when on prem', () => {
    window.deploymentType = 'ON_PREM'
    const { getByText } = render(
      <TestWrapper>
        <CODETrialHomePage />
      </TestWrapper>
    )
    expect(getByText('common.requestFreeTrial')).toBeDefined()
  })

  test('it should open modal on starting the plan', async () => {
    const { container } = render(
      <TestWrapper>
        <CODETrialHomePage />
      </TestWrapper>
    )

    userEvent.click(await findByText(container, 'common.startFreePlan'))

    expect(findDialogContainer()).toBeDefined()
  })

  test('it should redirect to CODEHome screen if mfe is enabled', async () => {
    jest.spyOn(FeatureFlagMock, 'useFeatureFlag').mockReturnValue(true)
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <CODETrialHomePage />
      </TestWrapper>
    )

    await waitFor(() => userEvent.click(getByText('common.startFreePlan')))

    expect(getByTestId('location').innerHTML).toContain('/account/undefined/code/default/default_project')
  })

  test('it should redirect to CODEHome screen if mfe is enabled', async () => {
    jest.spyOn(FeatureFlagMock, 'useFeatureFlag').mockReturnValue(false)
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <CODETrialHomePage />
      </TestWrapper>
    )

    await waitFor(() => userEvent.click(getByText('common.startFreePlan')))

    expect(getByTestId('location').innerHTML).toContain('/code/home')
  })

  test('it should redirect to CODEHome screen if experience query param is present', async () => {
    const { getByTestId } = render(
      <TestWrapper queryParams={{ experience: ModuleLicenseType.FREE }}>
        <CODETrialHomePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByTestId('location').innerHTML).toContain('/code/home')
    })
  })

  test('it should redirect to CODEHome screen if experience query param is present', async () => {
    const { getByTestId } = render(
      <TestWrapper queryParams={{ experience: ModuleLicenseType.TRIAL }}>
        <CODETrialHomePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(getByTestId('location').innerHTML).toContain('/code/home')
    })
  })
})
