/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { fireEvent, queryByAttribute, render } from '@testing-library/react'
import { noop } from 'lodash-es'
import React from 'react'
import { act } from 'react-dom/test-utils'
import { TestWrapper } from '@common/utils/testUtils'
import StepAuthentication from '@secrets/modals/CreateWinRmCredModal/views/StepAuthentication'
import { clickSubmit } from '@common/utils/JestFormHelper'
import { usePutSecret, usePostSecret, WinRmAuthDTO } from 'services/cd-ng'

jest.mock('services/cd-ng')

const usePostSecretMock = usePostSecret as jest.MockedFunction<any>
const usePutSecretMock = usePutSecret as jest.MockedFunction<any>

usePutSecretMock.mockImplementation(() => {
  return {
    mutate: jest.fn()
  }
})

usePostSecretMock.mockImplementation(() => {
  return {
    mutate: jest.fn(() => Promise.resolve({ data: { governanceMetadata: {} } })),
    cancel: jest.fn(),
    loading: false
  }
})

const prevStepData: any = {
  detailsData: {
    name: '',
    identifier: ''
  },
  authData: {
    domain: '',
    authScheme: 'NTLM' as WinRmAuthDTO['type'],
    tgtGenerationMethod: 'None',
    username: '',
    port: 22,
    principal: '',
    realm: '',
    password: {
      name: '',
      identifier: '',
      referenceString: ''
    },
    keyPath: '',
    useSSL: false,
    skipCertChecks: false,
    useNoProfile: false
  }
}

describe('Create WinRm Cred Wizard Step Authentication', () => {
  test('should render form NTLM', async () => {
    const { container } = render(
      <TestWrapper path="/account/:accountId/resources/secrets" pathParams={{ accountId: 'dummy' }}>
        <StepAuthentication
          onSuccess={noop}
          prevStepData={{
            ...prevStepData,
            isEdit: false
          }}
        />
      </TestWrapper>
    )

    await act(async () => {
      clickSubmit(container)
    })

    expect(container).toMatchSnapshot()
  })

  test('should render form Kerberos', async () => {
    const { container } = render(
      <TestWrapper path="/account/:accountId/resources/secrets" pathParams={{ accountId: 'dummy' }}>
        <StepAuthentication
          onSuccess={noop}
          prevStepData={{
            ...prevStepData,
            authData: {
              ...prevStepData.authData,
              authScheme: 'Kerberos' as WinRmAuthDTO['type'],
              tgtGenerationMethod: 'KeyTabFilePath'
            },
            isEdit: false
          }}
        />
      </TestWrapper>
    )

    await act(async () => {
      clickSubmit(container)
    })

    expect(container).toMatchSnapshot()
  })

  test('Test for adding required fields and save', async () => {
    const handleSuccess = jest.fn()
    const previousStep = jest.fn()
    const nextStep = jest.fn()

    const { container } = render(
      <TestWrapper>
        <StepAuthentication
          prevStepData={{
            ...prevStepData,
            isEdit: false
          }}
          previousStep={previousStep}
          onSuccess={handleSuccess}
          nextStep={nextStep}
        />
      </TestWrapper>
    )
    const usernameInput = queryByAttribute('name', container, 'username')
    expect(usernameInput).toBeTruthy()
    if (usernameInput) fireEvent.change(usernameInput, { target: { value: 'dummy name' } })

    const domainInput = queryByAttribute('name', container, 'domain')
    expect(domainInput).toBeTruthy()
    if (domainInput) fireEvent.change(domainInput, { target: { value: 'dummy domain' } })

    await act(async () => {
      clickSubmit(container)
    })
    expect(container).toMatchSnapshot()
  })

  test('Test for adding required fields and save edit mode', async () => {
    const handleSuccess = jest.fn()
    const previousStep = jest.fn()
    const nextStep = jest.fn()

    const { container } = render(
      <TestWrapper>
        <StepAuthentication
          prevStepData={{
            ...prevStepData,
            isEdit: true
          }}
          previousStep={previousStep}
          onSuccess={handleSuccess}
          nextStep={nextStep}
        />
      </TestWrapper>
    )
    const usernameInput = queryByAttribute('name', container, 'username')
    expect(usernameInput).toBeTruthy()
    if (usernameInput) fireEvent.change(usernameInput, { target: { value: 'dummy name' } })

    const domainInput = queryByAttribute('name', container, 'domain')
    expect(domainInput).toBeTruthy()
    if (domainInput) fireEvent.change(domainInput, { target: { value: 'dummy domain' } })

    await act(async () => {
      clickSubmit(container)
    })

    expect(handleSuccess).toBeCalledTimes(1)
    expect(container).toMatchSnapshot()
  })

  test('Test for adding required fields and back button', async () => {
    const handleSuccess = jest.fn()
    const previousStep = jest.fn()
    const nextStep = jest.fn()

    const { container, getByText } = render(
      <TestWrapper>
        <StepAuthentication
          prevStepData={{
            ...prevStepData,
            isEdit: true
          }}
          previousStep={previousStep}
          onSuccess={handleSuccess}
          nextStep={nextStep}
        />
      </TestWrapper>
    )
    const usernameInput = queryByAttribute('name', container, 'username')
    expect(usernameInput).toBeTruthy()
    if (usernameInput) fireEvent.change(usernameInput, { target: { value: 'dummy name' } })

    const domainInput = queryByAttribute('name', container, 'domain')
    expect(domainInput).toBeTruthy()
    if (domainInput) fireEvent.change(domainInput, { target: { value: 'dummy domain' } })

    expect(getByText('back')).toBeTruthy()
    await act(async () => {
      fireEvent.click(getByText('back'))
    })

    expect(container).toMatchSnapshot()
  })

  test('Test for adding required fields and save with feature flag disabled', async () => {
    const handleSuccess = jest.fn()
    const previousStep = jest.fn()
    const nextStep = jest.fn()

    const { container } = render(
      <TestWrapper>
        <StepAuthentication
          prevStepData={{
            ...prevStepData,
            isEdit: false
          }}
          previousStep={previousStep}
          onSuccess={handleSuccess}
          nextStep={nextStep}
        />
      </TestWrapper>
    )
    const usernameInput = queryByAttribute('name', container, 'username')
    expect(usernameInput).toBeTruthy()
    if (usernameInput) fireEvent.change(usernameInput, { target: { value: 'dummy name' } })

    const domainInput = queryByAttribute('name', container, 'domain')
    expect(domainInput).toBeTruthy()
    if (domainInput) fireEvent.change(domainInput, { target: { value: 'dummy domain' } })

    await act(async () => {
      clickSubmit(container)
    })
    expect(container).toMatchSnapshot()
  })

  test('Test for adding required fields and save with error secret post', async () => {
    const handleSuccess = jest.fn()
    const previousStep = jest.fn()
    const nextStep = jest.fn()

    jest.mock('@common/hooks/useFeatureFlag', () => ({
      useFeatureFlag: jest.fn(() => true)
    }))

    usePostSecretMock.mockImplementation(() => {
      return { mutate: jest.fn(() => Promise.reject({})), cancel: jest.fn(), loading: false }
    })

    const { container } = render(
      <TestWrapper>
        <StepAuthentication
          prevStepData={{
            ...prevStepData,
            isEdit: false
          }}
          previousStep={previousStep}
          onSuccess={handleSuccess}
          nextStep={nextStep}
        />
      </TestWrapper>
    )
    const usernameInput = queryByAttribute('name', container, 'username')
    expect(usernameInput).toBeTruthy()
    if (usernameInput) fireEvent.change(usernameInput, { target: { value: 'dummy name' } })

    const domainInput = queryByAttribute('name', container, 'domain')
    expect(domainInput).toBeTruthy()
    if (domainInput) fireEvent.change(domainInput, { target: { value: 'dummy domain' } })

    await act(async () => {
      clickSubmit(container)
    })
    expect(container).toMatchSnapshot()
  })
})
