import React from 'react'
import { render, act, fireEvent, waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TestWrapper } from '@common/utils/testUtils'
import { formatMinutesToHigherDimensions } from '@auth-settings/utils'
import { useSetSessionTimeoutAtAccountLevel } from 'services/cd-ng'
import SessionTimeOut from '../SessionTimeOut'

let showSuccessCalled = false
let showErrorCalled = false

jest.mock('@harness/uicore', () => ({
  ...jest.requireActual('@harness/uicore'),

  useToaster: jest.fn().mockImplementation(() => {
    return {
      showSuccess: jest.fn().mockImplementation(() => {
        showSuccessCalled = true
      }),
      showError: jest.fn().mockImplementation(() => {
        showErrorCalled = true
      })
    }
  })
}))
jest.mock('services/cd-ng', () => ({
  useSetSessionTimeoutAtAccountLevel: jest.fn().mockReturnValue({ mutate: jest.fn() })
}))

describe('Session time out settings', () => {
  test('formatMinutesToHigherDimensions', () => {
    expect(formatMinutesToHigherDimensions(undefined)).toBe('Invalid input')
    expect(formatMinutesToHigherDimensions(-5)).toBe('Invalid input')
    expect(formatMinutesToHigherDimensions(150)).toBe('2 hours 30 minutes')
    expect(formatMinutesToHigherDimensions(4320)).toBe('3 days')
    expect(formatMinutesToHigherDimensions(45000)).toBe('1 month 1 day 6 hours')
  })

  test('set session timeout', async () => {
    const { container } = render(
      <TestWrapper pathParams={{ accountId: 'testAcc' }}>
        <SessionTimeOut sessionInactivityTimeout={30} />
      </TestWrapper>
    )

    const inputBox = container.getElementsByClassName('bp3-input')[0]
    await waitFor(() => {
      expect(inputBox.getAttribute('value')).toBe('30')
    })
    expect(inputBox.getAttribute('value')).toBe('30')
  })

  test('save timeout', async () => {
    let updateSessionTimeout = false
    ;(useSetSessionTimeoutAtAccountLevel as jest.Mock).mockImplementation().mockReturnValue({
      error: false,
      mutate: jest.fn().mockImplementation(() => {
        updateSessionTimeout = true
        return Promise.resolve({ metaData: {}, resource: true, responseMessages: [] })
      })
    })

    const { container, getByText } = render(
      <TestWrapper pathParams={{ accountId: 'testAcc' }}>
        <SessionTimeOut sessionInactivityTimeout={630} absoluteSessionTimeout={10} />
      </TestWrapper>
    )

    const inputBoxes = container.getElementsByClassName('bp3-input')
    expect(inputBoxes.length).toBe(2)

    const inactivityTimeoutInputBox = inputBoxes[0]
    const absoluteTimeoutInputBox = inputBoxes[1]
    await waitFor(() => {
      expect(inactivityTimeoutInputBox.getAttribute('value')).toBe('630')
      expect(absoluteTimeoutInputBox.getAttribute('value')).toBe('10')
    })
    expect(inactivityTimeoutInputBox.getAttribute('value')).toBe('630')
    await act(async () => {
      fireEvent.click(getByText('save'))
    })
    await waitFor(() => {
      expect(updateSessionTimeout).toBeTruthy()
    })
    expect(updateSessionTimeout).toBeTruthy()
    await waitFor(() => {
      expect(showSuccessCalled).toBeTruthy()
    })
    expect(showSuccessCalled).toBeTruthy()
  })

  test('error on save timeout', async () => {
    const saveSessionTimeoutMock = jest.fn().mockImplementation(() => {
      return Promise.resolve({ metaData: {}, resource: false, responseMessages: [] })
    })
    ;(useSetSessionTimeoutAtAccountLevel as jest.Mock).mockImplementation().mockReturnValue({
      error: true,
      mutate: saveSessionTimeoutMock
    })

    const { container, getByText } = render(
      <TestWrapper pathParams={{ accountId: 'testAcc' }}>
        <SessionTimeOut sessionInactivityTimeout={630} absoluteSessionTimeout={15} />
      </TestWrapper>
    )

    const inputBoxes = container.getElementsByClassName('bp3-input')
    expect(inputBoxes.length).toBe(2)

    const inactivityTimeoutInputBox = inputBoxes[0]
    const absoluteTimeoutInputBox = inputBoxes[1]
    await waitFor(() => {
      expect(inactivityTimeoutInputBox.getAttribute('value')).toBe('630')
    })
    expect(inactivityTimeoutInputBox.getAttribute('value')).toBe('630')

    await userEvent.clear(inactivityTimeoutInputBox)
    await userEvent.type(inactivityTimeoutInputBox, '50')

    const errorText = 'platform.authSettings.sessionTimeOutErrorMaxMessage'

    // Clear original value and type a value that is larger than MAX allowed value, errorText should be visible

    await userEvent.clear(absoluteTimeoutInputBox)
    await userEvent.type(absoluteTimeoutInputBox, '9999')
    await waitFor(() => expect(screen.queryByText(errorText)).toBeInTheDocument())

    // Clear, and re-type a value that is in range. "errorText" should go away.
    await userEvent.clear(absoluteTimeoutInputBox)
    await userEvent.type(absoluteTimeoutInputBox, '10')
    await waitFor(() => expect(screen.queryByText(errorText)).not.toBeInTheDocument())

    // Click on "Save" button
    await act(async () => {
      fireEvent.click(getByText('save'))
    })

    // After save click, API should be called
    expect(saveSessionTimeoutMock).toHaveBeenCalledWith({
      absoluteSessionTimeOutInMinutes: '10',
      sessionTimeOutInMinutes: '50'
    })

    await waitFor(() => {
      expect(showErrorCalled).toBeTruthy()
    })
    expect(showErrorCalled).toBeTruthy()
  })

  test('saving state on save timeout', async () => {
    ;(useSetSessionTimeoutAtAccountLevel as jest.Mock).mockImplementation().mockReturnValue({
      error: false,
      loading: true,
      mutate: jest.fn().mockImplementation(() => {
        return Promise.resolve({ metaData: {}, resource: false, responseMessages: [] })
      })
    })

    const { container, getByText } = render(
      <TestWrapper pathParams={{ accountId: 'testAcc' }}>
        <SessionTimeOut sessionInactivityTimeout={630} />
      </TestWrapper>
    )

    const inputBox = container.getElementsByClassName('bp3-input')[0]
    await waitFor(() => {
      expect(inputBox.getAttribute('value')).toBe('630')
    })
    expect(inputBox.getAttribute('value')).toBe('630')

    await act(async () => {
      fireEvent.click(getByText('save'))
    })
    await waitFor(() => {
      expect(getByText('common.saving')).toBeDefined()
    })
    expect(getByText('common.saving')).toBeDefined()
  })
})
