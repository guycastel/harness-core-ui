/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { noop } from 'lodash-es'
import userEvent from '@testing-library/user-event'
import { render, fireEvent, queryByText, queryByAttribute, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { TestWrapper } from '@common/utils/testUtils'
import { ConnectivityModeType } from '@common/components/ConnectivityMode/ConnectivityMode'
import routes from '@common/RouteDefinitions'
import {
  mockResponse,
  mockSecret,
  mockConnector,
  awsWithDelegate,
  hostedMockConnector,
  mockOIDCConnector
} from './mock'
import CreateAWSConnector from '../CreateAWSConnector'
import { backButtonTest } from '../../commonTest'

const testPath = routes.toConnectors({ accountId: ':accountId' })
const testPathParams = { accountId: 'dummy' }

const commonProps = {
  accountId: 'dummy',
  orgIdentifier: '',
  projectIdentifier: '',
  setIsEditMode: noop,
  onClose: noop,
  onSuccess: noop
}

const createConnector = jest.fn()
const updateConnector = jest.fn()
const getDelegateSelectors = jest.fn()

jest.mock('services/cd-ng', () => ({
  validateTheIdentifierIsUniquePromise: jest.fn().mockImplementation(() => Promise.resolve(mockResponse)),
  useCreateConnector: jest.fn().mockImplementation(() => ({ mutate: createConnector })),
  useUpdateConnector: jest.fn().mockImplementation(() => ({ mutate: updateConnector })),
  getSecretV2Promise: jest.fn().mockImplementation(() => Promise.resolve(mockSecret)),
  useGetFileContent: jest.fn().mockImplementation(() => ({ refetch: jest.fn() })),
  useGetFileByBranch: jest.fn().mockImplementation(() => ({ refetch: jest.fn() })),
  useCreatePR: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  useCreatePRV2: jest.fn().mockImplementation(() => ({ mutate: jest.fn() }))
}))

jest.mock('services/portal', () => ({
  useGetDelegateSelectorsUpTheHierarchy: jest.fn().mockImplementation(() => ({ mutate: getDelegateSelectors })),
  useGetDelegatesUpTheHierarchy: jest.fn().mockImplementation(() => ({ mutate: jest.fn() }))
}))

describe('Create AWS connector Wizard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('Should render form', async () => {
    const { container } = render(
      <TestWrapper path={testPath} pathParams={testPathParams}>
        <CreateAWSConnector {...commonProps} isEditMode={false} connectorInfo={undefined} />
      </TestWrapper>
    )

    // fill step 1
    await act(async () => {
      fireEvent.change(container.querySelector('input[name="name"]')!, {
        target: { value: 'dummy name' }
      })
    })
    // match step 1
    expect(container).toMatchSnapshot()

    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    // match step 2
    expect(container).toMatchSnapshot()
  })
  test('Should render form for edit', async () => {
    const { container, getByText } = render(
      <TestWrapper path={testPath} pathParams={testPathParams}>
        <CreateAWSConnector
          {...commonProps}
          isEditMode={true}
          connectorInfo={mockConnector.data.connector as any}
          mock={mockResponse}
          connectivityMode={ConnectivityModeType.Delegate}
        />
      </TestWrapper>
    )
    // editing connector name
    const updatedName = 'dummy name'
    await act(async () => {
      fireEvent.change(container.querySelector('input[name="name"]')!, {
        target: { value: 'dummy name' }
      })
    })
    expect(container).toMatchSnapshot()
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })
    // step 2
    expect(queryByText(container, 'AWS Access Key')).toBeDefined()
    expect(container).toMatchSnapshot()

    //connectivity mode step
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    //backoff strategy step
    expect(getByText('platform.connectors.aws.fixedDelay')).toBeDefined()
    expect(getByText('platform.connectors.aws.equalJitter')).toBeDefined()
    expect(getByText('platform.connectors.aws.fullJitter')).toBeDefined()
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    // delegate selector step
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })
    const delegateSelector = container.querySelector('[data-name="DelegateSelectors"]')
    expect(delegateSelector).toBeTruthy()

    // test connection
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    expect(updateConnector).toBeCalledTimes(1)

    expect(updateConnector).toBeCalledWith(
      {
        connector: {
          ...mockConnector.data.connector,
          name: updatedName
        }
      },
      { queryParams: {} }
    )
  })

  test('Should render form for edit for hosted', async () => {
    const { container } = render(
      <TestWrapper path={testPath} pathParams={testPathParams}>
        <CreateAWSConnector
          {...commonProps}
          isEditMode={true}
          connectorInfo={hostedMockConnector.data.connector as any}
          mock={mockResponse}
          connectivityMode={ConnectivityModeType.Manager}
        />
      </TestWrapper>
    )
    // editing connector name
    const updatedName = 'dummy name'
    await act(async () => {
      fireEvent.change(container.querySelector('input[name="name"]')!, {
        target: { value: updatedName }
      })
    })
    expect(container).toMatchSnapshot()
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })
    // step 2
    expect(queryByText(container, 'AWS Access Key')).toBeDefined()
    expect(container).toMatchSnapshot()

    // backoff strategy step
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    //connectivity mode step
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    // test connection
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    expect(updateConnector).toBeCalledTimes(1)

    expect(updateConnector).toBeCalledWith(
      {
        connector: {
          ...hostedMockConnector.data.connector,
          name: updatedName
        }
      },
      { queryParams: {} }
    )
  })

  backButtonTest({
    Element: (
      <TestWrapper path={testPath} pathParams={testPathParams}>
        <CreateAWSConnector
          {...commonProps}
          isEditMode={true}
          connectorInfo={mockConnector.data.connector as any}
          mock={mockResponse}
        />
      </TestWrapper>
    ),
    backButtonSelector: '[data-name="awsBackButton"]',
    mock: mockConnector.data.connector as any
  })

  test('Should edit a connector with delegates', async () => {
    const { container } = render(
      <TestWrapper path={testPath} pathParams={testPathParams}>
        <CreateAWSConnector
          {...commonProps}
          isEditMode={true}
          connectorInfo={awsWithDelegate.data.connector as any}
          mock={mockResponse}
          connectivityMode={ConnectivityModeType.Delegate}
        />
      </TestWrapper>
    )
    // editing connector name
    const updatedName = 'connector with delegate'
    await act(async () => {
      fireEvent.change(container.querySelector('input[name="name"]')!, {
        target: { value: updatedName }
      })
    })
    expect(container).toMatchSnapshot()
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    // backoff strategy step
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    //connectivity mode step
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    // delegate selector step
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })
    const tagElm = queryByText(container, 'dummyDelegateSelector')
    expect(tagElm).toBeTruthy()

    // test connection
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    expect(updateConnector).toBeCalledTimes(1)

    expect(updateConnector).toBeCalledWith(
      {
        connector: {
          ...awsWithDelegate.data.connector,
          name: updatedName
        }
      },
      { queryParams: {} }
    )
  })

  test('Should reset connectivity mode of HarnessPlatform when switching from Access Key to IRSA ', async () => {
    const { container, getByText } = render(
      <TestWrapper path={testPath} pathParams={testPathParams}>
        <CreateAWSConnector
          {...commonProps}
          isEditMode={true}
          connectorInfo={hostedMockConnector.data.connector as any}
          mock={mockResponse}
          connectivityMode={ConnectivityModeType.Manager}
        />
      </TestWrapper>
    )
    // editing connector name
    const updatedName = 'connector with IRSA'
    await act(async () => {
      fireEvent.change(container.querySelector('input[name="name"]')!, {
        target: { value: updatedName }
      })
    })
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    // step 2
    fireEvent.click(queryByText(container, 'platform.connectors.aws.useIRSA')!)

    //connectivity mode step
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    //backoff strategy step
    expect(getByText('platform.connectors.aws.fixedDelay')).toBeDefined()
    expect(getByText('platform.connectors.aws.equalJitter')).toBeDefined()
    expect(getByText('platform.connectors.aws.fullJitter')).toBeDefined()
    const fixedDelayCard = getByText('platform.connectors.aws.fixedDelay')

    await act(async () => {
      fireEvent.click(fixedDelayCard)
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    // Step 3
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!)
    })

    // Validation for reset connectivityMode and harness platform option not being visible
    expect(getByText('platform.connectors.connectivityMode.validation')).toBeInTheDocument()
    expect(container.querySelector('.FormError--error')).toBeInTheDocument()
    expect(queryByText(container, 'common.connectThroughPlatform')!).not.toBeInTheDocument()
    expect(queryByText(container, 'common.connectThroughPlatformInfo')!).not.toBeInTheDocument()
    fireEvent.click(getByText('common.connectThroughDelegate')!)
  })

  test('Should render aws connector create form without any issue and test for OIDC credential type', async () => {
    const { container, getByText } = render(
      <TestWrapper
        defaultFeatureFlagValues={{
          CDS_AWS_OIDC_AUTHENTICATION: true
        }}
        path={testPath}
        pathParams={testPathParams}
      >
        <CreateAWSConnector {...commonProps} isEditMode={false} connectorInfo={undefined} />
      </TestWrapper>
    )
    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)

    // step 1: Overview
    const nameField = queryByNameAttribute('name') as HTMLInputElement
    expect(nameField).toBeInTheDocument()
    expect(nameField.value).toBe('')
    fireEvent.change(nameField, { target: { value: 'OIDC Connector' } })
    expect(nameField.value).toBe('OIDC Connector')

    const continueBtn = container.querySelector('button[type="submit"]')
    expect(continueBtn).toBeInTheDocument()
    await userEvent.click(continueBtn!)

    // step 2: Credentials
    const OIDCConnectorRadioBtn = getByText('platform.connectors.aws.useOIDC')
    expect(OIDCConnectorRadioBtn).toBeInTheDocument()
    await userEvent.click(OIDCConnectorRadioBtn)

    const iamRoleInput = queryByNameAttribute('iamRoleArn') as HTMLInputElement
    expect(iamRoleInput).toBeInTheDocument()
    expect(iamRoleInput.value).toBe('')
    // submit without any value
    await userEvent.click(container.querySelector('button[type="submit"]')!)
    // should show validation error
    expect(getByText('platform.connectors.aws.validation.iamRoleArn')).toBeInTheDocument()
    // provide some input
    fireEvent.change(iamRoleInput, { target: { value: 'IAM_ROLE' } })
    expect(iamRoleInput.value).toBe('IAM_ROLE')

    const testRegionInput = queryByNameAttribute('region') as HTMLInputElement
    expect(testRegionInput).toBeInTheDocument()
    expect(testRegionInput.value).toBe('')
    await userEvent.click(testRegionInput)
    const popoverList = document.getElementsByClassName('bp3-popover')
    await waitFor(() => {
      expect(popoverList.length).toBe(1)
    })
    const popover = popoverList[0] as HTMLElement
    const firstOption = queryByText(popover, 'AWS GovCloud (US)')
    expect(firstOption).toBeInTheDocument()
    await userEvent.click(firstOption!)
    expect(testRegionInput.value).toBe('AWS GovCloud (US)')

    await userEvent.click(container.querySelector('button[type="submit"]')!)

    // step 3: AWS Backoff Strategy
    await waitFor(() => {
      expect(getByText('platform.connectors.aws.selectBackOffStrategyTypeLabel')).toBeInTheDocument()
    })
    const fixedDelayCard = getByText('platform.connectors.aws.fixedDelay')
    expect(fixedDelayCard).toBeInTheDocument()
    await userEvent.click(fixedDelayCard)

    const fixedBackOffInput = queryByNameAttribute('fixedBackoff') as HTMLInputElement
    expect(fixedBackOffInput).toBeInTheDocument()
    expect(fixedBackOffInput.value).toBe('0')

    const retryCountInput = queryByNameAttribute('retryCount') as HTMLInputElement
    expect(retryCountInput).toBeInTheDocument()
    expect(retryCountInput.value).toBe('0')

    await userEvent.click(container.querySelector('button[type="submit"]')!)

    // step 4: Select Connectivity Mode
    expect(getByText('platform.connectors.connectivityMode.connectToProvider')).toBeInTheDocument()

    const connectThroughPlatformCard = getByText('common.connectThroughPlatform')
    expect(connectThroughPlatformCard).toBeInTheDocument()
    await userEvent.click(connectThroughPlatformCard)

    await userEvent.click(container.querySelector('button[type="submit"]')!)
    expect(createConnector).toBeCalledWith(mockOIDCConnector.data, expect.anything())
  })

  test('Should render aws connector edit form without any issue and test for OIDC credential type', async () => {
    const { container, getByText } = render(
      <TestWrapper
        defaultFeatureFlagValues={{
          CDS_AWS_OIDC_AUTHENTICATION: true
        }}
        path={testPath}
        pathParams={testPathParams}
      >
        <CreateAWSConnector
          {...commonProps}
          isEditMode={true}
          connectorInfo={mockOIDCConnector.data.connector as any}
          mock={mockResponse}
        />
      </TestWrapper>
    )

    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)
    const connector = mockOIDCConnector.data.connector
    // step 1: overview
    const nameInput = queryByNameAttribute('name') as HTMLInputElement
    expect(nameInput).toBeInTheDocument()
    expect(nameInput.value).toBe(connector.name)
    fireEvent.change(nameInput, { target: { value: 'OIDC Connector Updated' } })
    expect(nameInput.value).toBe('OIDC Connector Updated')
    await userEvent.click(container.querySelector('button[type="submit"]')!)

    // step 2: credentials
    const OIDCConnectorRadioBtn = getByText('platform.connectors.aws.useOIDC')
    expect(OIDCConnectorRadioBtn).toBeInTheDocument()

    const iamRoleInput = queryByNameAttribute('iamRoleArn') as HTMLInputElement
    expect(iamRoleInput).toBeInTheDocument()
    expect(iamRoleInput.value).toBe(connector.spec.credential.spec.iamRoleArn)
    fireEvent.change(iamRoleInput, { target: { value: 'IAM_ROLE_UPDATED' } })
    expect(iamRoleInput.value).toBe('IAM_ROLE_UPDATED')

    const testRegionInput = queryByNameAttribute('region') as HTMLInputElement
    expect(testRegionInput).toBeInTheDocument()
    expect(testRegionInput.value).toBe('AWS GovCloud (US)')

    await userEvent.click(container.querySelector('button[type="submit"]')!)

    // step 3: AWS Backoff Strategy
    const fixedDelayCard = getByText('platform.connectors.aws.fixedDelay')
    expect(fixedDelayCard).toBeInTheDocument()

    const fixedBackOffInput = queryByNameAttribute('fixedBackoff') as HTMLInputElement
    expect(fixedBackOffInput).toBeInTheDocument()
    expect(fixedBackOffInput.value).toBe(
      connector.spec.awsSdkClientBackOffStrategyOverride.spec.fixedBackoff.toString()
    )

    const retryCountInput = queryByNameAttribute('retryCount') as HTMLInputElement
    expect(retryCountInput).toBeInTheDocument()
    expect(retryCountInput.value).toBe(connector.spec.awsSdkClientBackOffStrategyOverride.spec.fixedBackoff.toString())

    await userEvent.click(container.querySelector('button[type="submit"]')!)

    // step 4: Select Connectivity Mode
    const connectThroughPlatformCard = getByText('common.connectThroughPlatform')
    expect(connectThroughPlatformCard).toBeInTheDocument()
    await userEvent.click(container.querySelector('button[type="submit"]')!)
    expect(updateConnector).toBeCalledWith(
      {
        connector: {
          description: '',
          identifier: 'OIDC_Connector',
          name: 'OIDC Connector Updated',
          orgIdentifier: undefined,
          projectIdentifier: undefined,
          spec: {
            awsSdkClientBackOffStrategyOverride: {
              spec: { fixedBackoff: 0, retryCount: 0 },
              type: 'FixedDelayBackoffStrategy'
            },
            credential: {
              crossAccountAccess: null,
              region: 'us-gov-west-1',
              spec: { iamRoleArn: 'IAM_ROLE_UPDATED' },
              type: 'OidcAuthentication'
            },
            executeOnDelegate: false,
            proxy: undefined
          },
          tags: {},
          type: 'Aws'
        }
      },
      expect.anything()
    )
  })
})
