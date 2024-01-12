/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, getByText, queryByAttribute, waitFor, screen, fireEvent } from '@testing-library/react'
import { noop } from 'lodash-es'

import { listSecretsV2Promise } from 'services/cd-ng'
import { TestWrapper } from '@common/utils/testUtils'
import SecretReference from '../SecretReference'
import mockData from './listSecretsMock.json'

jest.mock('services/cd-ng', () => ({
  listSecretsV2Promise: jest.fn()
}))

describe('Secret Reference', () => {
  test('render with type as SecretText', async () => {
    const listSecretsV2PromiseMock = jest.fn(() =>
      Promise.resolve({
        loading: false,
        error: null,
        data: mockData.data,
        refetch: jest.fn().mockReturnValue(mockData.data)
      })
    )
    ;(listSecretsV2Promise as jest.Mock).mockImplementation(listSecretsV2PromiseMock)

    const { container } = render(
      <TestWrapper>
        <SecretReference type="SecretText" accountIdentifier="testAccount" onSelect={noop} />
      </TestWrapper>
    )

    await waitFor(() => getByText(container, 'entityReference.apply'))

    // Check if correct tabs are getting rendered
    const projectTab = screen.queryByText('projectLabel')
    const orgTab = screen.queryByText('orgLabel')
    const accountTab = screen.getByText('account')
    expect(projectTab).not.toBeInTheDocument()
    expect(orgTab).not.toBeInTheDocument()
    expect(accountTab).toBeInTheDocument()
    // Check if secret from response is appearing on screen
    const secretName = screen.getByText('text1')
    expect(secretName).toBeInTheDocument()
  })

  test('render with type as SecretFile', async () => {
    const listSecretsV2PromiseMock = jest.fn(() =>
      Promise.resolve({
        loading: false,
        error: null,
        data: mockData.data,
        refetch: jest.fn().mockReturnValue(mockData.data)
      })
    )
    ;(listSecretsV2Promise as jest.Mock).mockImplementation(listSecretsV2PromiseMock)

    const { container } = render(
      <TestWrapper>
        <SecretReference type="SecretFile" accountIdentifier="dummy" orgIdentifier="testOrg" onSelect={noop} />
      </TestWrapper>
    )
    await waitFor(() => getByText(container, 'entityReference.apply'))

    // Check if correct tabs are getting rendered
    const projectTab = screen.queryByText('projectLabel')
    const orgTab = screen.getByText('orgLabel')
    const accountTab = screen.getByText('account')
    expect(projectTab).not.toBeInTheDocument()
    expect(orgTab).toBeInTheDocument()
    expect(accountTab).toBeInTheDocument()
    // Check if secret from response is appearing on screen
    const secretName = screen.getByText('text1')
    expect(secretName).toBeInTheDocument()
  })

  test('render with no secret type', async () => {
    const listSecretsV2PromiseMock = jest.fn(() =>
      Promise.resolve({
        loading: false,
        error: null,
        data: mockData.data,
        refetch: jest.fn().mockReturnValue(mockData.data)
      })
    )
    ;(listSecretsV2Promise as jest.Mock).mockImplementation(listSecretsV2PromiseMock)

    const { container } = render(
      <TestWrapper>
        <SecretReference
          accountIdentifier="testAccount"
          orgIdentifier="testOrg"
          projectIdentifier="testProject"
          onSelect={noop}
        />
      </TestWrapper>
    )
    await waitFor(() => getByText(container, 'entityReference.apply'))

    // Check if correct tabs are getting rendered
    const projectTab = screen.getByText('projectLabel')
    const orgTab = screen.getByText('orgLabel')
    const accountTab = screen.getByText('account')
    expect(projectTab).toBeInTheDocument()
    expect(orgTab).toBeInTheDocument()
    expect(accountTab).toBeInTheDocument()
    // Check if secret from response is appearing on screen
    const secretName = screen.getByText('text1')
    expect(secretName).toBeInTheDocument()
  })

  test('render with spinner', async () => {
    const listSecretsV2PromiseMock = jest.fn(() =>
      Promise.resolve({
        loading: true,
        error: null,
        data: null,
        refetch: jest.fn().mockReturnValue(null)
      })
    )
    ;(listSecretsV2Promise as jest.Mock).mockImplementation(listSecretsV2PromiseMock)

    const { container } = render(
      <TestWrapper>
        <SecretReference accountIdentifier="dummy" onSelect={noop} />
      </TestWrapper>
    )
    expect(getByText(container, 'account')).toBeTruthy()
    expect(queryByAttribute('data-icon', container, /spinner/)).toBeInTheDocument()
    const secretName = screen.queryByText('text1')
    expect(secretName).not.toBeInTheDocument()
  })

  test('render with no data', async () => {
    const listSecretsV2PromiseMock = jest.fn(() =>
      Promise.resolve({
        loading: false,
        error: null,
        data: { data: { content: [] } },
        refetch: jest.fn().mockReturnValue(null)
      })
    )
    ;(listSecretsV2Promise as jest.Mock).mockImplementation(listSecretsV2PromiseMock)

    const { container } = render(
      <TestWrapper>
        <SecretReference accountIdentifier="dummy" onSelect={noop} />
      </TestWrapper>
    )
    await waitFor(() => getByText(container, 'entityReference.apply'))
    expect(getByText(container, 'platform.secrets.secret.noSecretsFound')).toBeInTheDocument()
    await waitFor(() => {
      // for SelectTypeDropdown (text/file)
      expect(getByText(container, 'platform.secrets.secret.labelSecretType')).toBeInTheDocument()
    })

    const secretName = screen.queryByText('text1')
    expect(secretName).not.toBeInTheDocument()
  })

  test('it should call secrets v2 api call WITH secretManagerIdentifiers query param when connectorTypeContext is of secret manager type', async () => {
    const listSecretsV2PromiseMock = jest.fn(() =>
      Promise.resolve({
        loading: false,
        error: null,
        data: mockData.data,
        refetch: jest.fn().mockReturnValue(mockData.data)
      })
    )
    ;(listSecretsV2Promise as jest.Mock).mockImplementation(listSecretsV2PromiseMock)

    const { container } = render(
      <TestWrapper defaultFeatureFlagValues={{ DISABLE_SM_CREDENTIALS_CHECK: false }}>
        <SecretReference
          type="SecretText"
          accountIdentifier="testAccount"
          orgIdentifier="testOrg"
          projectIdentifier="testProject"
          onSelect={noop}
          connectorTypeContext="GcpSecretManager"
        />
      </TestWrapper>
    )
    await waitFor(() => getByText(container, 'entityReference.apply'))

    const projectTab = screen.getByText('projectLabel')
    const orgTab = screen.getByText('orgLabel')
    const accountTab = screen.getByText('account')
    expect(projectTab).toBeInTheDocument()
    expect(orgTab).toBeInTheDocument()
    expect(accountTab).toBeInTheDocument()

    const secretName = screen.getByText('text1')
    expect(secretName).toBeInTheDocument()

    // By default, All tab is selected
    await waitFor(() =>
      expect(listSecretsV2PromiseMock).toHaveBeenLastCalledWith({
        queryParamStringifyOptions: {
          arrayFormat: 'repeat'
        },
        queryParams: {
          accountIdentifier: 'testAccount',
          identifiers: undefined,
          includeAllSecretsAccessibleAtScope: true,
          orgIdentifier: 'testOrg',
          pageIndex: 0,
          pageSize: 10,
          projectIdentifier: 'testProject',
          searchTerm: '',
          secretManagerIdentifiers: [
            'harnessSecretManager',
            'org.harnessSecretManager',
            'account.harnessSecretManager'
          ],
          source_category: undefined,
          type: 'SecretText'
        }
      })
    )

    // Move to Organization tab
    fireEvent.click(orgTab)
    await waitFor(() =>
      expect(listSecretsV2PromiseMock).toHaveBeenLastCalledWith({
        queryParamStringifyOptions: {
          arrayFormat: 'repeat'
        },
        queryParams: {
          accountIdentifier: 'testAccount',
          identifiers: undefined,
          includeAllSecretsAccessibleAtScope: false,
          orgIdentifier: 'testOrg',
          pageIndex: 0,
          pageSize: 10,
          searchTerm: '',
          secretManagerIdentifiers: ['org.harnessSecretManager'],
          source_category: undefined,
          type: 'SecretText'
        }
      })
    )

    // Move to Account tab
    fireEvent.click(accountTab)
    await waitFor(() =>
      expect(listSecretsV2PromiseMock).toHaveBeenLastCalledWith({
        queryParamStringifyOptions: {
          arrayFormat: 'repeat'
        },
        queryParams: {
          accountIdentifier: 'testAccount',
          identifiers: undefined,
          orgIdentifier: undefined,
          projectIdentifier: undefined,
          includeAllSecretsAccessibleAtScope: false,
          pageIndex: 0,
          pageSize: 10,
          searchTerm: '',
          secretManagerIdentifiers: ['account.harnessSecretManager'],
          source_category: undefined,
          type: 'SecretText'
        }
      })
    )

    // Move to Project tab
    fireEvent.click(projectTab)
    await waitFor(() =>
      expect(listSecretsV2PromiseMock).toHaveBeenLastCalledWith({
        queryParamStringifyOptions: {
          arrayFormat: 'repeat'
        },
        queryParams: {
          accountIdentifier: 'testAccount',
          identifiers: undefined,
          includeAllSecretsAccessibleAtScope: false,
          orgIdentifier: 'testOrg',
          pageIndex: 0,
          pageSize: 10,
          projectIdentifier: 'testProject',
          searchTerm: '',
          secretManagerIdentifiers: ['harnessSecretManager'],
          source_category: undefined,
          type: 'SecretText'
        }
      })
    )
  })

  test('it should call secrets v2 api call WITHOUT secretManagerIdentifiers query param when DISABLE_SM_CREDENTIALS_CHECK is true', async () => {
    const listSecretsV2PromiseMock = jest.fn(() =>
      Promise.resolve({
        loading: false,
        error: null,
        data: mockData.data,
        refetch: jest.fn().mockReturnValue(mockData.data)
      })
    )
    ;(listSecretsV2Promise as jest.Mock).mockImplementation(listSecretsV2PromiseMock)

    const { container } = render(
      <TestWrapper defaultFeatureFlagValues={{ DISABLE_SM_CREDENTIALS_CHECK: true }}>
        <SecretReference
          type="SecretText"
          accountIdentifier="testAccount"
          orgIdentifier="testOrg"
          projectIdentifier="testProject"
          onSelect={noop}
          connectorTypeContext="GcpSecretManager"
        />
      </TestWrapper>
    )
    await waitFor(() => getByText(container, 'entityReference.apply'))

    const projectTab = screen.getByText('projectLabel')
    expect(projectTab).toBeInTheDocument()

    const secretName = screen.getByText('text1')
    expect(secretName).toBeInTheDocument()

    // By default, All tab is selected
    await waitFor(() =>
      expect(listSecretsV2PromiseMock).toHaveBeenLastCalledWith({
        queryParamStringifyOptions: {
          arrayFormat: 'repeat'
        },
        queryParams: {
          accountIdentifier: 'testAccount',
          identifiers: undefined,
          includeAllSecretsAccessibleAtScope: true,
          orgIdentifier: 'testOrg',
          pageIndex: 0,
          pageSize: 10,
          projectIdentifier: 'testProject',
          searchTerm: '',
          source_category: undefined,
          type: 'SecretText'
        }
      })
    )
  })
})
