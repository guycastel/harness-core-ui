/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { noop } from 'lodash-es'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { TestWrapper } from '@common/utils/testUtils'
import { clickSubmit } from '@common/utils/JestFormHelper'
import * as templateServices from 'services/template-ng'
import { mockResponse } from '../../__test__/commonMock'
import CustomSMConfigStep from '../views/CustomSMConfigStep'
import {
  CustomSMConnector,
  getTemplateMockWithDelegateFalse,
  inputSet,
  inputSetEmpty,
  inputSetWithExecutionTarget,
  smConfigStepDataToSubmit
} from './mock'

const commonProps = {
  accountId: 'dummy',
  orgIdentifier: '',
  projectIdentifier: '',
  setIsEditMode: noop,
  hideModal: noop
}
const updateConnector = jest.fn()
const createConnector = jest.fn()
jest.mock('services/portal', () => ({
  useGetDelegateTags: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  useGetDelegatesStatus: jest.fn().mockImplementation(() => {
    return { data: {}, refetch: jest.fn(), error: null, loading: false }
  }),
  useGetDelegateFromId: jest.fn().mockImplementation(() => jest.fn()),
  useGetDelegateSelectorsUpTheHierarchy: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  useGetDelegatesUpTheHierarchy: jest.fn().mockImplementation(() => ({ mutate: jest.fn() }))
}))

jest.mock('services/cd-ng', () => ({
  validateTheIdentifierIsUniquePromise: jest.fn().mockImplementation(() => Promise.resolve(mockResponse)),
  useCreateConnector: jest.fn().mockImplementation(() => ({ mutate: createConnector })),
  useUpdateConnector: jest.fn().mockImplementation(() => ({ mutate: updateConnector })),
  useGetTestConnectionResult: jest.fn().mockImplementation(() => jest.fn()),
  useGetFileContent: jest.fn().mockImplementation(() => ({ refetch: jest.fn() })),
  useGetFileByBranch: jest.fn().mockImplementation(() => ({ refetch: jest.fn() })),
  useCreatePR: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  useCreatePRV2: jest.fn().mockImplementation(() => ({ mutate: jest.fn() }))
}))

const getTemplateMock = () =>
  Promise.resolve({
    template: getTemplateMockWithDelegateFalse
  })

describe('CustomSMConfigStep', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  test('CustomSMConfigStep when onDelegate is false in selected template', async () => {
    jest
      .spyOn(templateServices, 'getTemplateInputSetYamlPromise')
      .mockImplementation(() => Promise.resolve(inputSet) as any)
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/connectors" pathParams={{ accountId: 'dummy' }}>
        <CustomSMConfigStep
          {...commonProps}
          isEditMode={false}
          connectorInfo={undefined}
          getTemplate={getTemplateMock as any}
        />
      </TestWrapper>
    )

    await waitFor(() => getByText('Shell Script'))
    // step 2 validation check
    act(() => {
      clickSubmit(container)
    })

    await waitFor(() => getByText('platform.connectors.customSM.validation.template'))
    const selectTemplateBtn = getByText('platform.connectors.customSM.selectTemplate')
    act(() => {
      fireEvent.click(selectTemplateBtn)
    })

    await waitFor(() => getByText('targetHost'))
    expect(getByText('workingDirectory')).toBeDefined()
    expect(getByText('account.sds')).toBeDefined()

    expect(container.querySelector('input[value="hjgjj"]')).toBeDefined()
    expect(container.querySelector('input[value="host"]')).toBeDefined()
  })

  test('CustomSMConfigStep when onDelegate is false in selected template and execution target as runtimeinput', async () => {
    jest
      .spyOn(templateServices, 'getTemplateInputSetYamlPromise')
      .mockImplementation(() => Promise.resolve(inputSetWithExecutionTarget) as any)
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/connectors" pathParams={{ accountId: 'dummy' }}>
        <CustomSMConfigStep
          {...commonProps}
          isEditMode={false}
          connectorInfo={undefined}
          getTemplate={getTemplateMock as any}
        />
      </TestWrapper>
    )

    await waitFor(() => getByText('Shell Script'))
    // step 2 validation check
    act(() => {
      clickSubmit(container)
    })

    await waitFor(() => getByText('platform.connectors.customSM.validation.template'))
    const selectTemplateBtn = getByText('platform.connectors.customSM.selectTemplate')
    act(() => {
      fireEvent.click(selectTemplateBtn)
    })

    await waitFor(() => getByText('targetHost'))
    expect(getByText('workingDirectory')).toBeDefined()
    expect(getByText('account.sds')).toBeDefined()

    expect(container.querySelector('input[value="hjgjj"]')).toBeDefined()
    expect(container.querySelector('input[value="host"]')).toBeNull()
  })

  test('CustomSMConfigStep in Edit mode', async () => {
    jest
      .spyOn(templateServices, 'getTemplateInputSetYamlPromise')
      .mockImplementation(() => Promise.resolve(inputSetWithExecutionTarget) as any)
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/connectors" pathParams={{ accountId: 'dummy' }}>
        <CustomSMConfigStep
          {...commonProps}
          isEditMode={true}
          connectorInfo={CustomSMConnector as any}
          getTemplate={getTemplateMock as any}
        />
      </TestWrapper>
    )

    await waitFor(() => getByText('Shell Script'))

    await waitFor(() => getByText('targetHost'))
    expect(getByText('workingDirectory')).toBeDefined()
    expect(getByText('account.sds')).toBeDefined()

    expect(container.querySelector('input[value="hjgjj"]')).toBeDefined()
    expect(container.querySelector('input[value="host"]')).toBeNull()
  })
  test('CustomSMConfigStep in Edit mode - submit data', async () => {
    const nextStepMock = jest.fn()
    jest
      .spyOn(templateServices, 'getTemplateInputSetYamlPromise')
      .mockImplementation(() => Promise.resolve(inputSetWithExecutionTarget) as any)
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/connectors" pathParams={{ accountId: 'dummy' }}>
        <CustomSMConfigStep
          {...commonProps}
          isEditMode={true}
          connectorInfo={CustomSMConnector as any}
          getTemplate={getTemplateMock as any}
          nextStep={nextStepMock}
        />
      </TestWrapper>
    )

    await waitFor(() => getByText('Shell Script'))

    await waitFor(() => getByText('targetHost'))
    expect(getByText('workingDirectory')).toBeDefined()
    expect(getByText('account.sds')).toBeDefined()

    expect(container.querySelector('input[value="hjgjj"]')).toBeDefined()
    expect(container.querySelector('input[value="host"]')).toBeNull()
    const inputElement = container.querySelector('[name="timeout"]') as HTMLInputElement

    expect(inputElement).toBeInTheDocument()
    act(() => {
      clickSubmit(container)
    })
    fireEvent.change(inputElement, { target: { value: 22 } })

    await waitFor(() => expect(nextStepMock).toHaveBeenCalled())
    expect(nextStepMock).toHaveBeenCalledWith(smConfigStepDataToSubmit)
  })

  test('CustomSMConfigStep in Edit mode - when coming back from next step', async () => {
    const nextStepMock = jest.fn()
    jest
      .spyOn(templateServices, 'getTemplateInputSetYamlPromise')
      .mockImplementation(() => Promise.resolve(inputSetWithExecutionTarget) as any)
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/connectors" pathParams={{ accountId: 'dummy' }}>
        <CustomSMConfigStep
          {...commonProps}
          isEditMode={true}
          connectorInfo={CustomSMConnector as any}
          getTemplate={getTemplateMock as any}
          nextStep={nextStepMock}
          prevStepData={
            {
              templateInputs: {
                executionTarget: { host: '' },
                environmentVariables: [
                  { name: 'key', type: 'String', value: 'dsf' },
                  { name: 'url', type: 'String', value: 'dsf' },
                  { name: 'namespace', type: 'String', value: 'namespace' }
                ]
              }
            } as any
          }
        />
      </TestWrapper>
    )

    await waitFor(() => getByText('Shell Script'))
    await waitFor(() => getByText('common.inputVariables'))
    // value of namespace in previousStepData
    expect(container.querySelector('input[value="namespace"]')).toBeDefined()
    // value of namespace in connectorInfo
    expect(container.querySelector('input[value="dfsd"]')).toBeNull()
  })

  test('CustomSMConfigStep - input sets are empty', async () => {
    jest
      .spyOn(templateServices, 'getTemplateInputSetYamlPromise')
      .mockImplementation(() => Promise.resolve(inputSetEmpty) as any)
    const { getByText } = render(
      <TestWrapper path="/account/:accountId/resources/connectors" pathParams={{ accountId: 'dummy' }}>
        <CustomSMConfigStep
          {...commonProps}
          isEditMode={false}
          connectorInfo={undefined}
          getTemplate={getTemplateMock as any}
        />
      </TestWrapper>
    )

    await waitFor(() => getByText('Shell Script'))
    const selectTemplateBtn = getByText('platform.connectors.customSM.selectTemplate')
    act(() => {
      fireEvent.click(selectTemplateBtn)
    })

    await waitFor(() => expect(getByText('targetHost')).toBeInTheDocument())
  })
})
