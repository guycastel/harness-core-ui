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
import SideNavFooter from '../SideNavFooter'

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
      defaultAppStoreValues={{ currentUserInfo: { name: 'Dev Name', email: 'mail@harness.io', uuid: '123' } }}
      path="/account/:accountId/orgs/:orgIdentifier/projects/:projectIdentifier"
      pathParams={{ accountId: 'abcd', orgIdentifier: 'abcd', projectIdentifier: 'abcd' }}
    >
      <SideNavFooter />
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
})