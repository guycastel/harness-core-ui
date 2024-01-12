/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, fireEvent, findByText, act, queryByText, waitFor, screen } from '@testing-library/react'

import { TestWrapper } from '@common/utils/testUtils'

import * as serviceCDNG from 'services/cd-ng'
import CreateUpdateSecret from '../CreateUpdateSecret'

import mockData from './listSecretManagersMock.json'
import connectorMockData from './getConnectorMock.json'
import secretDetailsMock from './secretDetailsMock.json'
import secretMockData from './secretMockData.json'

const mockUpdateTextSecret = jest.fn()
jest.mock('services/cd-ng', () => ({
  usePutSecret: jest.fn().mockImplementation(() => ({ mutate: mockUpdateTextSecret })),
  usePostSecret: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  usePostSecretFileV2: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),

  getConnectorListV2Promise: jest.fn().mockImplementation(() => {
    return Promise.resolve(mockData)
  }),
  usePutSecretFileV2: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  useGetGcpRegions: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  useGetSecretV2: jest.fn().mockImplementation(() => {
    return {
      refetch: jest.fn().mockImplementation(() => {
        return secretMockData
      }),
      loading: false,
      data: null
    }
  }),

  useGetConnectorList: () => {
    return {
      data: mockData,
      loading: false,
      refetch: jest.fn().mockImplementation(() => {
        return mockData
      })
    }
  },
  useGetConnector: jest.fn().mockImplementation(() => {
    return {
      data: connectorMockData,
      loading: false,
      refetch: jest.fn().mockImplementation(() => {
        return null
      })
    }
  })
}))

describe('CreateUpdateSecret', () => {
  test('Create Text Secret', async () => {
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/secrets" pathParams={{ accountId: 'dummy' }}>
        <CreateUpdateSecret type={'SecretText'} />
      </TestWrapper>
    )
    await waitFor(() => expect(getByText('platform.secrets.labelSecretName')).toBeTruthy())

    await waitFor(() => expect(getByText('platform.secrets.labelValue')).toBeTruthy())

    const secretManagerField = screen.getByTestId(/secretManagerIdentifier/)
    expect(secretManagerField).toBeInTheDocument()
    expect(secretManagerField).not.toBeDisabled()

    expect(container).toMatchSnapshot()
  })

  test('it should disable secret manager field when connectorTypeContext is of secret manager type and secret type is of text or file type', async () => {
    const { getByText } = render(
      <TestWrapper path="/account/:accountId/resources/secrets" pathParams={{ accountId: 'dummy' }}>
        <CreateUpdateSecret type={'SecretText'} connectorTypeContext="GcpSecretManager" />
      </TestWrapper>
    )
    await waitFor(() => expect(getByText('platform.secrets.labelValue')).toBeInTheDocument())
    expect(getByText('platform.secrets.labelSecretName')).toBeInTheDocument()
    const secretManagerField = screen.getByTestId(/secretManagerIdentifier/)
    expect(secretManagerField).toBeInTheDocument()
    expect(secretManagerField).toBeDisabled()
  })

  test('it should NOT disable secret manager field when secret type is of SSHKey type', async () => {
    render(
      <TestWrapper
        path="/account/:accountId/resources/secrets"
        pathParams={{ accountId: 'dummy' }}
        defaultFeatureFlagValues={{ DISABLE_SM_CREDENTIALS_CHECK: false }}
      >
        <CreateUpdateSecret type={'SSHKey'} connectorTypeContext="GcpSecretManager" />
      </TestWrapper>
    )
    const secretManagerField = await screen.findByTestId(/secretManagerIdentifier/)
    expect(secretManagerField).toBeInTheDocument()
    expect(secretManagerField).not.toBeDisabled()
  })

  test('it should NOT disable secret manager field when DISABLE_SM_CREDENTIALS_CHECK is true', async () => {
    render(
      <TestWrapper
        path="/account/:accountId/resources/secrets"
        pathParams={{ accountId: 'dummy' }}
        defaultFeatureFlagValues={{ DISABLE_SM_CREDENTIALS_CHECK: true }}
      >
        <CreateUpdateSecret type={'SSHKey'} connectorTypeContext="GcpSecretManager" />
      </TestWrapper>
    )
    const secretManagerField = await screen.findByTestId(/secretManagerIdentifier/)
    expect(secretManagerField).toBeInTheDocument()
    expect(secretManagerField).not.toBeDisabled()
  })

  test('Create File Secret', async () => {
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/secrets" pathParams={{ accountId: 'dummy' }}>
        <CreateUpdateSecret type={'SecretFile'} />
      </TestWrapper>
    )
    await waitFor(() => expect(getByText('platform.secrets.labelSecretName')).toBeTruthy())
    await waitFor(() => expect(getByText('platform.secrets.secret.labelSecretFile')).toBeTruthy())
    const secretManagerField = screen.getByTestId(/secretManagerIdentifier/)
    expect(secretManagerField).toBeInTheDocument()
    expect(secretManagerField).not.toBeDisabled()
    expect(container).toMatchSnapshot()
  })

  test('Create Secret with radio button', async () => {
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/secrets" pathParams={{ accountId: 'dummy' }}>
        <CreateUpdateSecret />
      </TestWrapper>
    )
    await waitFor(() => expect(getByText('platform.secrets.secret.labelSecretType')).toBeTruthy())
    expect(getByText('platform.secrets.secret.labelSecretType')).toBeDefined()
    expect(getByText('platform.secrets.labelValue')).toBeDefined()
    const secretManagerField = screen.getByTestId(/secretManagerIdentifier/)
    expect(secretManagerField).toBeInTheDocument()
    expect(secretManagerField).not.toBeDisabled()
    expect(container).toMatchSnapshot()
  })

  test('Create Secret with radio button and switch radio from text to file', async () => {
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/secrets" pathParams={{ accountId: 'dummy' }}>
        <CreateUpdateSecret />
      </TestWrapper>
    )
    await waitFor(() => expect(getByText('platform.secrets.secret.labelFile')).toBeTruthy())
    expect(getByText('platform.secrets.labelValue')).toBeDefined()
    fireEvent.click(getByText('platform.secrets.secret.labelFile'))
    expect(getByText('platform.secrets.secret.labelSecretFile')).toBeDefined()
    expect(queryByText(container, 'platform.secrets.labelValue')).toBeNull()
    expect(container).toMatchSnapshot()
  })

  test('Create Secret with radio button and switch radio from text to file and back', async () => {
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/secrets" pathParams={{ accountId: 'dummy' }}>
        <CreateUpdateSecret />
      </TestWrapper>
    )
    await waitFor(() => expect(getByText('platform.secrets.secret.labelFile')).toBeTruthy())

    expect(getByText('platform.secrets.labelValue')).toBeDefined()
    fireEvent.click(getByText('platform.secrets.secret.labelFile'))
    expect(getByText('platform.secrets.secret.labelSecretFile')).toBeDefined()
    expect(queryByText(container, 'platform.secrets.labelValue')).toBeNull()
    fireEvent.click(getByText('platform.secrets.secret.labelText'))
    expect(queryByText(container, 'platform.secrets.secret.labelSecretFile')).toBeNull()
    expect(getByText('platform.secrets.labelValue')).toBeDefined()
    expect(container).toMatchSnapshot()
  })

  test('Update Text Secret', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    jest.spyOn(serviceCDNG, 'useGetSecretV2').mockImplementation(() => {
      return {
        refetch: jest.fn().mockImplementation(() => {
          return secretMockData
        }),
        loading: false,
        data: secretMockData
      }
    })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    jest.spyOn(serviceCDNG, 'useGetConnector').mockImplementation(() => {
      return {
        data: connectorMockData,
        loading: false,
        refetch: jest.fn().mockImplementation(() => {
          return connectorMockData
        })
      }
    })
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/secrets" pathParams={{ accountId: 'dummy' }}>
        <CreateUpdateSecret secret={secretDetailsMock as any} type={'SecretText'} />
      </TestWrapper>
    )

    await waitFor(() => expect(getByText('platform.secrets.secret.inlineSecret')).toBeTruthy())
    expect(container).toMatchSnapshot()

    await act(async () => {
      fireEvent.change(container.querySelector("textarea[name='description']")!, { target: { value: 'new desc' } })
      const submitBtn = await findByText(container, 'save')
      fireEvent.click(submitBtn)
    })

    expect(mockUpdateTextSecret).toHaveBeenCalledWith({
      secret: {
        type: 'SecretText',
        name: 'text1',
        identifier: 'text1',
        description: 'new desc',
        tags: {},
        orgIdentifier: undefined,
        projectIdentifier: undefined,
        spec: { secretManagerIdentifier: 'vault1', valueType: 'Inline' }
      }
    })
  })
})
