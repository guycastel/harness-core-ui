/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { Redirect } from 'react-router-dom'
import { TestWrapper } from '@common/utils/testUtils'
import { defaultAppStoreValues } from '@common/utils/DefaultAppStoreData'
import routes from '@common/RouteDefinitionsV2'
import { LicenseRedirectProps, LICENSE_STATE_NAMES } from 'framework/LicenseStore/LicenseStoreContext'
import { LICENSE_STATE_VALUES } from 'framework/LicenseStore/licenseStoreUtil'
import { RouteWithContext } from '../RouteWithContext'

jest.mock('services/cd-ng', () => ({
  ...jest.requireActual('services/cd-ng'),
  useUpdateUserSettingValue: jest.fn().mockImplementation(() => ({ mutate: jest.fn }))
}))

const RedirectToModuleTrialHome = (): React.ReactElement => {
  return (
    <Redirect
      to={routes.toModuleTrialHome({
        accountId: '123',
        module: 'ci'
      })}
    />
  )
}

const RedirectToSubscriptions = (): React.ReactElement => {
  return (
    <Redirect
      to={routes.toSubscriptions({
        accountId: '123'
      })}
    />
  )
}

describe('RouteWithContext', () => {
  test('Active license', () => {
    const licenseRedirectData: LicenseRedirectProps = {
      licenseStateName: LICENSE_STATE_NAMES.CI_LICENSE_STATE,
      startTrialRedirect: RedirectToModuleTrialHome,
      expiredTrialRedirect: RedirectToSubscriptions
    }
    const { getByText } = render(
      <TestWrapper
        path="/account/:accountId/projects"
        pathParams={{ accountId: 'dummy' }}
        defaultAppStoreValues={defaultAppStoreValues}
        defaultLicenseStoreValues={{
          CI_LICENSE_STATE: LICENSE_STATE_VALUES.ACTIVE
        }}
      >
        <RouteWithContext path="/account/:accountId/projects" licenseRedirectData={licenseRedirectData}>
          <div>matched-route</div>
        </RouteWithContext>
      </TestWrapper>
    )
    expect(getByText('matched-route')).toBeInTheDocument()
  })

  test('License not started', () => {
    const licenseRedirectData: LicenseRedirectProps = {
      licenseStateName: LICENSE_STATE_NAMES.CI_LICENSE_STATE,
      startTrialRedirect: RedirectToModuleTrialHome,
      expiredTrialRedirect: RedirectToSubscriptions
    }

    const { queryByText, getByTestId } = render(
      <TestWrapper
        path="/account/:accountId/projects"
        pathParams={{ accountId: 'dummy' }}
        defaultAppStoreValues={defaultAppStoreValues}
        defaultFeatureFlagValues={{ PL_AI_SUPPORT_CHATBOT: true, PL_EULA_ENABLED: true }}
        defaultLicenseStoreValues={{
          CI_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED
        }}
      >
        <RouteWithContext path="/account/:accountId/projects" licenseRedirectData={licenseRedirectData}>
          <div>matched-route</div>
        </RouteWithContext>
      </TestWrapper>
    )
    expect(getByTestId('location').textContent).toEqual('/account/123/module/ci/home/trial')
    expect(queryByText('matched-route')).not.toBeInTheDocument()
  })

  test('No license redirect data', () => {
    const { getByText } = render(
      <TestWrapper
        path="/account/:accountId/projects"
        pathParams={{ accountId: 'dummy' }}
        defaultAppStoreValues={defaultAppStoreValues}
      >
        <RouteWithContext path="/account/:accountId/projects">
          <div>matched-route</div>
        </RouteWithContext>
      </TestWrapper>
    )
    expect(getByText('matched-route')).toBeInTheDocument()
  })
})
