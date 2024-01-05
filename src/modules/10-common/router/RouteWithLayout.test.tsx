/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { Redirect } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

import { TestWrapper } from '@common/utils/testUtils'
import { MinimalLayout, EmptyLayout } from '@common/layouts'
import { defaultAppStoreValues } from '@common/utils/DefaultAppStoreData'
import routes from '@common/RouteDefinitions'
import { LicenseRedirectProps, LICENSE_STATE_NAMES } from 'framework/LicenseStore/LicenseStoreContext'
import { LICENSE_STATE_VALUES } from 'framework/LicenseStore/licenseStoreUtil'
import { RouteWithLayout } from './RouteWithLayout'

jest.mock('@common/navigation/MainNav', () => {
  return () => {
    return <div>Main nav</div>
  }
})

jest.mock('@common/hooks/useGetUsageAndLimit', () => {
  return {
    useGetUsageAndLimit: () => {
      return useGetUsageAndLimitReturnMock
    }
  }
})
const useGetUsageAndLimitReturnMock = {
  limitData: {
    limit: {}
  },
  usageData: {
    usage: {}
  }
}
jest.mock('services/cd-ng', () => ({
  ...jest.requireActual('services/cd-ng'),
  useUpdateUserSettingValue: jest.fn().mockImplementation(() => ({ mutate: jest.fn }))
}))

beforeEach(() => {
  window.deploymentType = 'SAAS'
})

describe('RouteWithLayout', () => {
  test('empty', () => {
    const { container, getByText } = render(
      <TestWrapper
        path="/account/:accountId/projects"
        pathParams={{ accountId: 'dummy' }}
        defaultAppStoreValues={defaultAppStoreValues}
      >
        <RouteWithLayout layout={EmptyLayout} path="/account/:accountId/projects">
          <div>matched-route</div>
        </RouteWithLayout>
      </TestWrapper>
    )

    expect(container).toMatchSnapshot()
    expect(getByText('matched-route')).toBeTruthy()
  })

  test('minimal', () => {
    const { container, getByText } = render(
      <TestWrapper
        path="/account/:accountId/projects"
        pathParams={{ accountId: 'dummy' }}
        defaultAppStoreValues={defaultAppStoreValues}
      >
        <RouteWithLayout layout={MinimalLayout} path="/account/:accountId/projects">
          <div>matched-route</div>
        </RouteWithLayout>
      </TestWrapper>
    )

    expect(container).toMatchSnapshot()
    expect(getByText('matched-route')).toBeTruthy()
  })

  test('basic', () => {
    const SideNav = () => <div>sidenav</div>

    const { container, getByText } = render(
      <TestWrapper
        path="/account/:accountId/projects"
        pathParams={{ accountId: 'dummy' }}
        defaultAppStoreValues={defaultAppStoreValues}
      >
        <RouteWithLayout
          sidebarProps={{ navComponent: SideNav, title: 'TITLE', subtitle: 'SUBTITLE' }}
          path="/account/:accountId/projects"
        >
          <div>matched-route</div>
        </RouteWithLayout>
      </TestWrapper>
    )

    expect(container).toMatchSnapshot()
    expect(getByText('matched-route')).toBeTruthy()
    expect(getByText('sidenav')).toBeTruthy()
    expect(getByText('TITLE')).toBeTruthy()
    expect(getByText('SUBTITLE')).toBeTruthy()
  })

  test('that the license store will route to the CI trial page if the license has not started', () => {
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

    const licenseRedirectData: LicenseRedirectProps = {
      licenseStateName: LICENSE_STATE_NAMES.CI_LICENSE_STATE,
      startTrialRedirect: RedirectToModuleTrialHome,
      expiredTrialRedirect: RedirectToSubscriptions
    }

    const { container, getByText, queryByText } = render(
      <TestWrapper
        path="/account/:accountId/projects"
        pathParams={{ accountId: 'dummy' }}
        defaultAppStoreValues={defaultAppStoreValues}
        defaultLicenseStoreValues={{
          CI_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED
        }}
      >
        <RouteWithLayout path="/account/:accountId/projects" licenseRedirectData={licenseRedirectData}>
          <div>matched-route</div>
        </RouteWithLayout>
      </TestWrapper>
    )

    expect(container).toMatchSnapshot()
    expect(getByText('/account/123/ci/home/trial')).toBeTruthy()
    expect(queryByText('matched-route')).not.toBeInTheDocument()
  })

  test('that the license store will route to the CF trial page if the license has not started', () => {
    const RedirectToModuleTrialHome = (): React.ReactElement => {
      return (
        <Redirect
          to={routes.toModuleTrialHome({
            accountId: '123',
            module: 'cf'
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

    const licenseRedirectData: LicenseRedirectProps = {
      licenseStateName: LICENSE_STATE_NAMES.FF_LICENSE_STATE,
      startTrialRedirect: RedirectToModuleTrialHome,
      expiredTrialRedirect: RedirectToSubscriptions
    }

    const { container, getByText, queryByText } = render(
      <TestWrapper
        path="/account/:accountId/projects"
        pathParams={{ accountId: 'dummy' }}
        defaultAppStoreValues={defaultAppStoreValues}
        defaultLicenseStoreValues={{
          FF_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED
        }}
      >
        <RouteWithLayout path="/account/:accountId/projects" licenseRedirectData={licenseRedirectData}>
          <div>matched-route</div>
        </RouteWithLayout>
      </TestWrapper>
    )

    expect(container).toMatchSnapshot()
    expect(getByText('/account/123/cf/home/trial')).toBeTruthy()
    expect(queryByText('matched-route')).not.toBeInTheDocument()
  })

  test('that the license store will route to the subscriptions page if the trial is expired', () => {
    const RedirectToModuleTrialHome = (): React.ReactElement => {
      return (
        <Redirect
          to={routes.toModuleTrialHome({
            accountId: '123',
            module: 'cf'
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

    const licenseRedirectData: LicenseRedirectProps = {
      licenseStateName: LICENSE_STATE_NAMES.FF_LICENSE_STATE,
      startTrialRedirect: RedirectToModuleTrialHome,
      expiredTrialRedirect: RedirectToSubscriptions
    }

    const { container, getByText } = render(
      <TestWrapper
        path="/account/:accountId/projects"
        pathParams={{ accountId: 'dummy' }}
        defaultAppStoreValues={defaultAppStoreValues}
        defaultLicenseStoreValues={{
          FF_LICENSE_STATE: LICENSE_STATE_VALUES.EXPIRED
        }}
      >
        <RouteWithLayout path="/account/:accountId/projects" licenseRedirectData={licenseRedirectData}>
          <div>matched-route</div>
        </RouteWithLayout>
      </TestWrapper>
    )

    expect(container).toMatchSnapshot()
    // expect(getByText('/account/123/home/setup/subscriptions')).toBeTruthy()
    expect(getByText('matched-route')).toBeTruthy()
  })

  test('that the license store will render the child if the license value is not present', () => {
    const SideNav = () => <div>sidenav</div>

    const licenseRedirectData: LicenseRedirectProps = {
      licenseStateName: LICENSE_STATE_NAMES.FF_LICENSE_STATE,
      // eslint-disable-next-line react/display-name
      startTrialRedirect: () => <div />,
      // eslint-disable-next-line react/display-name
      expiredTrialRedirect: () => <div />
    }

    const { container, getByText } = render(
      <TestWrapper
        path="/account/:accountId/projects"
        pathParams={{ accountId: 'dummy' }}
        defaultAppStoreValues={defaultAppStoreValues}
        defaultLicenseStoreValues={{}}
      >
        <RouteWithLayout
          path="/account/:accountId/projects"
          licenseRedirectData={licenseRedirectData}
          sidebarProps={{ navComponent: SideNav, title: 'TITLE', subtitle: 'SUBTITLE' }}
        >
          <div>matched-route</div>
        </RouteWithLayout>
      </TestWrapper>
    )

    expect(container).toMatchSnapshot()
    expect(getByText('matched-route')).toBeTruthy()
    expect(getByText('sidenav')).toBeTruthy()
    expect(getByText('TITLE')).toBeTruthy()
    expect(getByText('SUBTITLE')).toBeTruthy()
  })

  test('that PageNotPublic component renders when isCurrentSessionPublic but route is not public', async () => {
    const { queryByText, getByRole } = render(
      <TestWrapper
        path="/account/:accountId/projects"
        pathParams={{ accountId: 'dummy' }}
        defaultAppStoreValues={{ ...defaultAppStoreValues, isCurrentSessionPublic: true }}
      >
        <RouteWithLayout public={false} layout={EmptyLayout} path="/account/:accountId/projects">
          <div>matched-route</div>
        </RouteWithLayout>
      </TestWrapper>
    )

    expect(queryByText('matched-route')).not.toBeTruthy()
    // 'common.publicAccess.oopsPageNotPublic' is used inside PageNotPublic.tsx
    expect(queryByText('common.publicAccess.oopsPageNotPublic')).toBeTruthy()
    const signInBtn = getByRole('button', { name: 'signUp.signIn' })
    await userEvent.click(signInBtn!)
    expect(queryByText('common.publicAccess.oopsPageNotPublic')).not.toBeTruthy()
  })
})
