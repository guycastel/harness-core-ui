/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, waitFor, screen, RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper, findDrawerContainer, findPopoverContainer } from '@common/utils/testUtils'
import { SIDE_NAV_STATE } from '@common/router/RouteWithLayoutV2'
import SideNavFooter from '../SideNavFooter'
import SideNavFooterPublic from '../SideNavFooterPublic'

const mockHistoryPush = jest.fn()
// eslint-disable-next-line jest-no-mock
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn(() => ({
    push: mockHistoryPush
  }))
}))

const mockLogout = jest.fn()
jest.mock('services/portal', () => ({
  useLogout1: jest.fn().mockImplementation(() => ({ mutate: mockLogout }))
}))

jest.mock('services/cd-ng', () => ({
  ...jest.requireActual('services/cd-ng'),
  useUpdateUserSettingValue: jest.fn().mockImplementation(() => ({ mutate: jest.fn }))
}))

const zendeskCreate = {
  loading: false,
  error: null,
  data: {
    status: 'SUCCESS',
    data: {
      code: 201,
      message: 'ticket created'
    }
  }
}
jest.mock('services/cd-ng')
jest.mock('services/resourcegroups', () => ({
  useGetCoveoToken: jest.fn(() =>
    Promise.resolve({
      data: {
        code: 201,
        token: 'dummyToken'
      }
    })
  ),
  useCreateZendeskTicket: jest.fn(() => Promise.resolve(zendeskCreate))
}))
jest.mock('refiner-js', () => {
  return jest.fn().mockImplementation((param, callback) => {
    if (param === 'onComplete') {
      callback()
    }
  })
})

const renderComponent = (): RenderResult =>
  render(
    <TestWrapper
      defaultAppStoreValues={{
        currentUserInfo: { name: 'Dev Name', email: 'mail@harness.io', uuid: '123' },
        isNewNavEnabled: true
      }}
      path="/account/:accountId/orgs/:orgIdentifier/projects/:projectIdentifier"
      pathParams={{ accountId: 'abcd', orgIdentifier: 'abcd', projectIdentifier: 'abcd' }}
    >
      <SideNavFooter />
    </TestWrapper>
  )

const renderComponentPublic = (sideNavState: SIDE_NAV_STATE = SIDE_NAV_STATE.EXPANDED): RenderResult =>
  render(
    <TestWrapper
      path="/account/:accountId/orgs/:orgIdentifier/projects/:projectIdentifier"
      pathParams={{ accountId: 'abcd', orgIdentifier: 'abcd', projectIdentifier: 'abcd' }}
      defaultAppStoreValues={{
        isCurrentSessionPublic: true
      }}
      defaultLayoutValue={{ sideNavState, setSideNavState: jest.fn() }}
    >
      <SideNavFooterPublic />
    </TestWrapper>
  )

describe('SideNav Footer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  test('should render side nav footer', () => {
    const { queryByText } = renderComponent()
    expect(queryByText('common.help')).toBeInTheDocument()
    expect(queryByText('Dev Name')).toBeInTheDocument()
  })

  test('should open profile popover on hover', async () => {
    const { queryByText } = renderComponent()
    const user = userEvent.setup()
    await user.hover(queryByText('Dev Name') as HTMLElement)
    await waitFor(() => {
      const popover = findPopoverContainer() as HTMLElement
      expect(popover).toBeInTheDocument()
    })
    expect(screen.getByText('mail@harness.io')).toBeInTheDocument()
    expect(screen.getByText('common.profileOverview')).toBeInTheDocument()
    expect(screen.getByText('signOut')).toBeInTheDocument()
  })

  test('should open profile overview page', async () => {
    const { queryByText } = renderComponent()
    const user = userEvent.setup()
    await user.hover(queryByText('Dev Name') as HTMLElement)
    await waitFor(() => {
      const popover = findPopoverContainer() as HTMLElement
      expect(popover).toBeInTheDocument()
    })
    await user.click(screen.getByText('common.profileOverview'))
    expect(screen.getByTestId('location')).toHaveTextContent('/user/profile')
  })

  test('should open resource center drawer', async () => {
    const { queryByText } = renderComponent()
    expect(queryByText('common.help')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(queryByText('common.help') as HTMLElement)
    const drawer = findDrawerContainer() as HTMLElement
    expect(drawer).toBeInTheDocument()
  })

  test('should open profile overview page on clicking footer link', async () => {
    const { queryByText } = renderComponent()
    const user = userEvent.setup()
    await user.click(queryByText('Dev Name') as HTMLElement)
    expect(mockHistoryPush).toHaveBeenCalledWith('/user/profile')
  })

  test('should signout', async () => {
    const { queryByText } = renderComponent()
    const user = userEvent.setup()
    await user.hover(queryByText('Dev Name') as HTMLElement)
    await waitFor(() => {
      const popover = findPopoverContainer() as HTMLElement
      expect(popover).toBeInTheDocument()
    })
    await user.click(screen.getByText('signOut'))
    expect(mockHistoryPush).toHaveBeenCalledWith({
      pathname: '/redirect',
      search: '?returnUrl=%2F%23%2Flogin%3Faction%3Dsignout'
    })
  })

  test('Render SideNavFooterPublic with EXPANDED STATE', async () => {
    const { getByText } = renderComponentPublic(SIDE_NAV_STATE.EXPANDED)

    // SignIn button should be visible in EXPANDED state (even without any hover)
    const signInBtn = getByText('signUp.signIn')
    expect(signInBtn).toBeInTheDocument()

    // Clicking on SignIn button should call history.push()
    await userEvent.click(signInBtn)
    expect(mockHistoryPush).toHaveBeenCalledWith({
      pathname: '/redirect',
      search: '?returnUrl=%2F%23%2Flogin%3Faction%3Dsignout'
    })
  })

  test('Render SideNavFooterPublic with COLLAPSED STATE', async () => {
    const { container } = renderComponentPublic(SIDE_NAV_STATE.COLLAPSED)
    const user = userEvent.setup()
    const loginIcon = container.querySelector('span[icon="log-in"]')
    expect(loginIcon).toBeInTheDocument()

    // SignIn button not visible BEFORE hover
    expect(screen.queryByText('signUp.signIn')).not.toBeInTheDocument()

    // hover action
    await user.hover(loginIcon!)
    await waitFor(() => {
      const popover = findPopoverContainer() as HTMLElement
      expect(popover).toBeInTheDocument()
    })

    // SignIn button should be visible AFTER hover
    const signInBtn = screen.queryByText('signUp.signIn')
    expect(signInBtn).toBeInTheDocument()

    // Clicking on SignIn button should call history.push()
    await userEvent.click(signInBtn!)
    expect(mockHistoryPush).toHaveBeenCalledWith({
      pathname: '/redirect',
      search: '?returnUrl=%2F%23%2Flogin%3Faction%3Dsignout'
    })
  })
})
