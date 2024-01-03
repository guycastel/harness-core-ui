import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import * as Formik from 'formik'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '@modules/10-common/utils/testUtils'
import ApplicationIdDropdown from '../ApplicationIdDropdown'

describe('ApplicationIdDropdown', () => {
  test('should not render the dropdown if dropdown options are not passed', () => {
    render(
      <TestWrapper>
        <Formik.Formik initialValues={{}} onSubmit={Promise.resolve}>
          <ApplicationIdDropdown applicationLoading={false} onApplicationChange={() => void 0} />
        </Formik.Formik>
      </TestWrapper>
    )

    expect(screen.queryByTestId(/applicationIdDropdown/)).not.toBeInTheDocument()
  })

  test('should render the dropdown if dropdown options are passed correctly', async () => {
    const useFormikContextMock = jest.spyOn(Formik, 'useFormikContext')

    const setFieldValueMock = jest.fn()
    const onApplicationChangeMock = jest.fn()

    useFormikContextMock.mockReturnValue({
      isValid: true,
      setFieldValue: setFieldValueMock,
      values: {}
    } as unknown as any)

    render(
      <TestWrapper>
        <Formik.Formik initialValues={{}} onSubmit={Promise.resolve}>
          <ApplicationIdDropdown
            applicationOptions={[{ label: 'My app', value: '1222' }]}
            applicationLoading={false}
            onApplicationChange={onApplicationChangeMock}
          />
        </Formik.Formik>
      </TestWrapper>
    )

    const dropdown = screen.getByTestId(/applicationIdDropdown/)

    expect(dropdown).toBeInTheDocument()

    await act(async () => {
      await userEvent.click(dropdown)
    })

    await waitFor(() => expect(screen.getByText(/1222/)).toBeInTheDocument())

    await act(async () => {
      await userEvent.click(screen.getByText(/1222/))
    })

    await waitFor(() => expect(screen.getByTestId(/newRelicApplicationValue/)).toHaveTextContent('1222'))
    await waitFor(() => expect(onApplicationChangeMock).toHaveBeenCalledWith({ appId: '1222', appName: 'My app' }))

    expect(setFieldValueMock).toHaveBeenCalledWith('newRelicApplication', { label: 'My app', value: '1222' })

    setFieldValueMock.mockClear()

    await act(async () => {
      await userEvent.click(screen.getByText(/My app/))
    })

    await waitFor(() => expect(setFieldValueMock).not.toHaveBeenCalled())
  })
})
