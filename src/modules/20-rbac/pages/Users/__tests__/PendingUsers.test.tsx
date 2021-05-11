import React from 'react'
import { act, fireEvent, getByText, queryByText, render, RenderResult, waitFor } from '@testing-library/react'

import { findDialogContainer, findPopoverContainer, TestWrapper } from '@common/utils/testUtils'
import type { ResponseBoolean } from 'services/cd-ng'
import routes from '@common/RouteDefinitions'
import { accountPathProps } from '@common/utils/routeUtils'
import { mockResponse, pendingUserMock, resourceGroupsMockData, roleMockData, usersMockData } from './mock'
import UsersPage from '../UsersPage'

jest.useFakeTimers()

const deletePendingUser = jest.fn()
const deletePendingUserMock = (): ResponseBoolean => {
  deletePendingUser()
  return mockResponse
}

const createUser = jest.fn()
const createUserMock = (): ResponseBoolean => {
  createUser()
  return mockResponse
}

const createRole = jest.fn()
const createRoleMock = (): ResponseBoolean => {
  createRole()
  return mockResponse
}

jest.mock('@common/hooks', () => ({
  ...(jest.requireActual('@common/hooks') as any),
  useQueryParams: jest.fn().mockImplementation(() => ({ view: 'PENDING' })),
  useMutateAsGet: jest.fn().mockImplementation(() => {
    return { data: pendingUserMock, refetch: jest.fn(), error: null }
  })
}))

jest.mock('services/rbac', () => ({
  useGetRoleList: jest.fn().mockImplementation(() => {
    return { data: roleMockData, refetch: jest.fn(), error: null, loading: false }
  }),
  useCreateRoleAssignments: jest.fn().mockImplementation(() => ({ mutate: createRoleMock })),
  useDeleteRoleAssignment: jest.fn().mockImplementation(() => ({ mutate: mockResponse }))
}))

jest.mock('services/resourcegroups', () => ({
  useGetResourceGroupList: jest.fn().mockImplementation(() => {
    return { data: resourceGroupsMockData, refetch: jest.fn(), error: null }
  })
}))

jest.mock('services/cd-ng', () => ({
  useDeleteInvite: jest.fn().mockImplementation(() => ({ mutate: deletePendingUserMock })),
  useSendInvite: jest.fn().mockImplementation(() => ({ mutate: createUserMock })),
  useGetCurrentGenUsers: jest.fn().mockImplementation(() => {
    return { data: usersMockData, refetch: jest.fn(), error: null }
  })
}))

jest.useFakeTimers()

describe('UsersPage Test', () => {
  let container: HTMLElement
  let getAllByText: RenderResult['getAllByText']

  beforeEach(async () => {
    const renderObj = render(
      <TestWrapper path={routes.toUsers(accountPathProps)} pathParams={{ accountId: 'testAcc' }}>
        <UsersPage />
      </TestWrapper>
    )
    container = renderObj.container
    getAllByText = renderObj.getAllByText
    await waitFor(() => getAllByText('newUser'))
  })
  test('Switch to Pending Users', async () => {
    expect(container).toMatchSnapshot()
  }),
    test('Delete Pending User', async () => {
      deletePendingUser.mockReset()
      const menu = container.querySelector(`[data-testid="menu-${pendingUserMock.data?.content?.[0].id}"]`)
      fireEvent.click(menu!)
      const popover = findPopoverContainer()
      const deleteMenu = getByText(popover as HTMLElement, 'delete')
      await act(async () => {
        fireEvent.click(deleteMenu!)
        await waitFor(() => getByText(document.body, 'rbac.usersPage.deleteTitle'))
        const form = findDialogContainer()
        expect(form).toBeTruthy()
        const deleteBtn = queryByText(form as HTMLElement, 'delete')
        fireEvent.click(deleteBtn!)
        expect(deletePendingUser).toBeCalled()
      })
    })
})
