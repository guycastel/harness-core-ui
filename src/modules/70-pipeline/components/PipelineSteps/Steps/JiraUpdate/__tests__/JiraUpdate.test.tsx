/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Free Trial 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/05/PolyForm-Free-Trial-1.0.0.txt.
 */

import React from 'react'
import { render, act, fireEvent, queryByAttribute, waitFor } from '@testing-library/react'
import { RUNTIME_INPUT_VALUE } from '@harness/uicore'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { StepFormikRef, StepViewType } from '@pipeline/components/AbstractSteps/Step'
import * as ngServices from 'services/cd-ng'
import * as hooks from '@common/hooks/useFeatureFlag'
import { TestStepWidget, factory } from '../../__tests__/StepTestUtil'
import { JiraUpdate } from '../JiraUpdate'
import {
  getJiraUpdateDeploymentModeProps,
  getJiraUpdateEditModeProps,
  getJiraUpdateEditModePropsWithConnectorId,
  getJiraUpdateEditModePropsWithValues,
  getJiraUpdateInputVariableModeProps,
  mockConnectorResponse,
  mockStatusResponse,
  mockStatusErrorResponse,
  mockFieldsMetadataResponse,
  mockStatus,
  mockTransitionResponse,
  mockTransition,
  getJiraUpdateEditModePropsWithCustomIssueKeyValue
} from './JiraUpdateTestHelper'
import type { JiraUpdateData } from '../types'
import { processFormData } from '../helper'
import { mockProjectMetadataResponse, mockProjectsResponse } from '../../JiraCreate/__tests__/JiraCreateTestHelper'

jest.mock('@common/components/YAMLBuilder/YamlBuilder')

jest.mock('services/cd-ng', () => ({
  useGetConnector: () => mockConnectorResponse,
  useGetJiraIssueUpdateMetadata: jest.fn(),
  useGetJiraIssueCreateMetadata: () => mockProjectMetadataResponse,
  useGetJiraProjects: () => mockProjectsResponse,
  useGetIssueTransitions: jest.fn(),
  useGetJiraStatuses: jest.fn()
}))

describe('Jira Update fetch status', () => {
  beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    jest.spyOn(ngServices, 'useGetJiraIssueUpdateMetadata').mockReturnValue(mockFieldsMetadataResponse),
      jest.spyOn(ngServices, 'useGetJiraStatuses').mockReturnValue(mockStatusErrorResponse as any),
      jest.spyOn(ngServices, 'useGetIssueTransitions').mockReturnValue(mockTransitionResponse as any)
  })
  beforeEach(() => {
    factory.registerStep(new JiraUpdate())
  })

  test('show error if failed to fetch status', () => {
    const ref = React.createRef<StepFormikRef<unknown>>()
    const props = getJiraUpdateEditModePropsWithConnectorId()
    const { container, getByText } = render(
      <TestStepWidget
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.Edit}
        ref={ref}
      />
    )
    fireEvent.click(getByText('common.optionalConfig'))
    expect(container).toBeTruthy()
  })
})

describe('Jira Update tests', () => {
  beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    jest.spyOn(ngServices, 'useGetJiraIssueUpdateMetadata').mockReturnValue(mockFieldsMetadataResponse)
    jest.spyOn(ngServices, 'useGetJiraStatuses').mockReturnValue(mockStatusResponse as any)
    jest.spyOn(ngServices, 'useGetIssueTransitions').mockReturnValue(mockTransitionResponse as any)
  })
  beforeEach(() => {
    factory.registerStep(new JiraUpdate())
  })

  test('Basic snapshot - inputset mode', async () => {
    const props = getJiraUpdateDeploymentModeProps()
    const { container, getByText, queryByText } = render(
      <TestStepWidget
        template={props.inputSetData?.template}
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.InputSet}
        inputSetData={props.inputSetData}
      />
    )
    fireEvent.click(getByText('Submit'))
    await waitFor(() => queryByText('Errors'))
    expect(container).toMatchSnapshot('input set with errors')
  })

  test('Basic snapshot - deploymentform mode', async () => {
    const props = getJiraUpdateDeploymentModeProps()
    const { container } = render(
      <TestStepWidget
        template={props.inputSetData?.template}
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.DeploymentForm}
        inputSetData={props.inputSetData}
      />
    )

    expect(container).toMatchSnapshot('jira-update-deploymentform')
  })

  test('deploymentform readonly mode', async () => {
    const props = getJiraUpdateDeploymentModeProps()
    const { container } = render(
      <TestStepWidget
        template={props.inputSetData?.template}
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.DeploymentForm}
        inputSetData={{ ...props.inputSetData, path: props.inputSetData?.path || '', readonly: true }}
      />
    )

    expect(container).toMatchSnapshot('jira-update-deploymentform-readonly')
  })

  test('edit stage form with transition API FF on - Status API call onFocus only', async () => {
    const refetchStatus = jest.fn()
    const refetchTransition = jest.fn()
    const useFeatureFlags = jest.spyOn(hooks, 'useFeatureFlags')
    useFeatureFlags.mockReturnValue({ CDS_JIRA_TRANSITION_LIST: true })
    jest
      .spyOn(ngServices, 'useGetJiraStatuses')
      .mockReturnValue({ data: mockStatus, refetch: refetchStatus, cancel: jest.fn() } as any)
    jest
      .spyOn(ngServices, 'useGetIssueTransitions')
      .mockReturnValue({ data: mockTransition, refetch: refetchTransition, cancel: jest.fn() } as any)
    const props = getJiraUpdateEditModePropsWithValues()
    const ref = React.createRef<StepFormikRef<unknown>>()
    const { container, getByText } = render(
      <TestStepWidget
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.Edit}
        ref={ref}
        testWrapperProps={{
          pathParams: {
            accountId: 'accountId',
            orgIdentifier: 'orgIdentifier',
            projectIdentifier: 'projectIdentifier',
            pipelineIdentifier: 'pipelineIdentifier',
            executionIdentifier: 'executionIdentifier'
          }
        }}
      />
    )
    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)
    fireEvent.click(getByText('common.optionalConfig'))
    expect(queryByNameAttribute('spec.transitionTo.status')).toBeTruthy()
    queryByNameAttribute('spec.transitionTo.status')?.focus()
    expect(container).toMatchSnapshot()
    expect(refetchStatus).toHaveBeenCalledWith({
      queryParams: {
        connectorRef: 'c1d1',
        issueKey: 'tji-8097'
      }
    })

    queryByNameAttribute('spec.transitionTo.transitionName')?.focus()
    expect(refetchTransition).toHaveBeenCalledWith({
      queryParams: {
        connectorRef: 'c1d1',
        issueKey: 'tji-8097'
      }
    })
  })

  test('edit stage form with transition API FF off - Status API called without issueKey', async () => {
    const refetch = jest.fn()
    const useFeatureFlags = jest.spyOn(hooks, 'useFeatureFlags')
    useFeatureFlags.mockReturnValue({ CDS_JIRA_TRANSITION_LIST: false })
    jest
      .spyOn(ngServices, 'useGetJiraStatuses')
      .mockReturnValue({ data: mockStatus, refetch, cancel: jest.fn() } as any)
    const props = getJiraUpdateEditModePropsWithValues()
    const ref = React.createRef<StepFormikRef<unknown>>()
    const { container, getByText } = render(
      <TestStepWidget
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.Edit}
        ref={ref}
      />
    )
    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)
    fireEvent.click(getByText('common.optionalConfig'))
    expect(queryByNameAttribute('spec.transitionTo.status')).toBeTruthy()
    queryByNameAttribute('spec.transitionTo.status')?.focus()
    expect(container).toMatchSnapshot()
    expect(refetch).not.toHaveBeenCalledWith({
      queryParams: {
        connectorRef: 'c1d1',
        issueKey: 'tji-8097'
      }
    })
    expect(refetch).toHaveBeenCalledWith({
      queryParams: {
        connectorRef: 'c1d1'
      }
    })
  })

  test('Basic snapshot - inputset mode but no runtime values', async () => {
    const props = getJiraUpdateDeploymentModeProps()
    const { container } = render(
      <TestStepWidget
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        template={{ spec: { transitionTo: {} } }}
        stepViewType={StepViewType.InputSet}
        inputSetData={props.inputSetData}
      />
    )
    expect(container).toMatchSnapshot('jira-update-inputset-noruntime')
  })

  test('Basic snapshot - input variable view', () => {
    const props = getJiraUpdateInputVariableModeProps()
    const { container } = render(
      <TestStepWidget
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        template={{ spec: {} }}
        stepViewType={StepViewType.InputVariable}
        customStepProps={props.customStepProps}
      />
    )

    expect(container).toMatchSnapshot('jira-update-input variable view')
  })

  // eslint-disable-next-line jest/no-disabled-tests
  test('Basic functions - edit stage view validations', async () => {
    const ref = React.createRef<StepFormikRef<unknown>>()
    const props = getJiraUpdateEditModeProps()
    const { container, queryByText, getByText } = render(
      <TestStepWidget
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.Edit}
        ref={ref}
      />
    )

    // Submit with empty form
    act(() => ref.current?.submitForm()!)
    await waitFor(() => expect(queryByText('pipelineSteps.stepNameRequired')).toBeTruthy())

    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)

    fireEvent.change(queryByNameAttribute('name')!, { target: { value: 'jira update step' } })

    act(() => {
      fireEvent.click(getByText('pipelineSteps.timeoutLabel'))
    })
    fireEvent.change(queryByNameAttribute('timeout')!, { target: { value: '' } })

    act(() => ref.current?.submitForm()!)
    await waitFor(() => expect(queryByText('validation.timeout10SecMinimum')).toBeTruthy())
    await waitFor(() => expect(queryByText('pipeline.jiraApprovalStep.validations.issueKey')).toBeTruthy())
  })

  test('Edit stage - readony view', async () => {
    const ref = React.createRef<StepFormikRef<unknown>>()
    const props = getJiraUpdateEditModeProps()
    const { container } = render(
      <TestStepWidget
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.Edit}
        ref={ref}
        readonly={true}
      />
    )

    expect(container).toMatchSnapshot('editstage-readonly')
  })

  test('Open a saved step - edit stage view', async () => {
    const ref = React.createRef<StepFormikRef<unknown>>()
    const props = { ...getJiraUpdateEditModePropsWithValues() }
    const {
      container,
      getByText,
      queryByPlaceholderText,
      queryAllByPlaceholderText,
      queryByDisplayValue,
      getByTestId
    } = render(
      <TestStepWidget
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.Edit}
        ref={ref}
        onUpdate={props.onUpdate}
      />
    )

    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)
    fireEvent.change(queryByNameAttribute('name')!, { target: { value: 'jira update step' } })
    expect(queryByDisplayValue('1d')).toBeTruthy()
    expect(queryByDisplayValue('tji-8097')).toBeTruthy()

    fireEvent.click(getByText('common.optionalConfig'))
    expect(queryByNameAttribute('spec.transitionTo.status')).toBeTruthy()
    expect(queryByDisplayValue('value1')).toBeTruthy()
    expect(queryByDisplayValue('2233')).toBeTruthy()
    expect(queryByDisplayValue('23-march')).toBeTruthy()

    act(() => {
      fireEvent.click(getByText('pipeline.jiraCreateStep.fieldSelectorAdd'))
    })

    const dialogContainer = document.body.querySelector('.bp3-portal')

    expect(document.querySelector('.bp3-dialog input[name="issueKey"]')).toBeInTheDocument()

    fireEvent.click(getByText('f1'))

    const button = dialogContainer?.querySelector('.bp3-button-text')
    fireEvent.click(button!)

    // The selected field is now added to the main form
    expect(queryByPlaceholderText('f1')).toBeTruthy()

    act(() => {
      fireEvent.click(getByText('pipeline.jiraCreateStep.fieldSelectorAdd'))
    })
    const provideFieldListElement = getByText('pipeline.jiraCreateStep.provideFieldList')
    fireEvent.click(provideFieldListElement)

    const dialogContainerPostUpdate = document.body.querySelector('.bp3-portal')
    act(() => {
      fireEvent.click(getByTestId('add-fieldList'))
    })

    const key0Input = dialogContainerPostUpdate?.querySelector('input[name="fieldList[0].name"]')
    const value0Input = dialogContainerPostUpdate?.querySelector('input[name="fieldList[0].value"]')
    fireEvent.change(key0Input!, { target: { value: 'issueKey1' } })
    fireEvent.change(value0Input!, { target: { value: 'issueKey1Value' } })
    const addButton = dialogContainerPostUpdate?.querySelector('.bp3-button-text')
    fireEvent.click(addButton!)

    expect(queryByDisplayValue('issueKey1')).toBeTruthy()
    expect(queryByDisplayValue('issueKey1Value')).toBeTruthy()
    expect(queryAllByPlaceholderText('f1').length).toBe(1)
    await act(() => ref.current?.submitForm()!)

    expect(props.onUpdate).toBeCalledWith({
      identifier: 'jira_update_step',
      timeout: '1d',
      type: 'JiraUpdate',
      spec: {
        connectorRef: 'c1d1',
        issueKey: 'tji-8097',
        delegateSelectors: undefined,
        transitionTo: { transitionName: '', status: 'Done' },
        fields: [
          { name: 'f2', value: 2233 },
          { name: 'f21', value: 'value1' },
          { name: 'date', value: '23-march' }
        ]
      },
      name: 'jira update step'
    })
  })

  test('Open a saved step - edit stage view and issueKey as runtime val', async () => {
    const refetch = jest.fn()
    jest
      .spyOn(ngServices, 'useGetJiraIssueUpdateMetadata')
      .mockReturnValue({ data: {}, refetch, cancel: jest.fn() } as any)
    const ref = React.createRef<StepFormikRef<unknown>>()
    const props = { ...getJiraUpdateEditModePropsWithCustomIssueKeyValue(RUNTIME_INPUT_VALUE) }
    render(
      <TestStepWidget
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.Edit}
        ref={ref}
        onUpdate={props.onUpdate}
      />
    )

    expect(refetch).not.toHaveBeenCalled()
  })

  test('Open a saved step - edit stage view and issueKey as expression val', async () => {
    const refetch = jest.fn()
    jest
      .spyOn(ngServices, 'useGetJiraIssueUpdateMetadata')
      .mockReturnValue({ data: {}, refetch, cancel: jest.fn() } as any)
    const ref = React.createRef<StepFormikRef<unknown>>()
    const props = { ...getJiraUpdateEditModePropsWithCustomIssueKeyValue('<+test.expression>') }
    render(
      <TestStepWidget
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.Edit}
        ref={ref}
        onUpdate={props.onUpdate}
      />
    )

    expect(refetch).not.toHaveBeenCalled()
  })

  test('Open a saved step - edit stage view and issueKey as fixed val', async () => {
    const refetch = jest.fn()
    jest
      .spyOn(ngServices, 'useGetJiraIssueUpdateMetadata')
      .mockReturnValue({ data: {}, refetch, cancel: jest.fn() } as any)
    const ref = React.createRef<StepFormikRef<unknown>>()
    const props = { ...getJiraUpdateEditModePropsWithCustomIssueKeyValue('fixed') }
    render(
      <TestStepWidget
        initialValues={props.initialValues}
        type={StepType.JiraUpdate}
        stepViewType={StepViewType.Edit}
        ref={ref}
        onUpdate={props.onUpdate}
      />
    )

    expect(refetch).toHaveBeenCalled()
  })

  test('Minimum time cannot be less than 10s', () => {
    const response = new JiraUpdate().validateInputSet({
      data: {
        name: 'Test A',
        identifier: 'Test A',
        timeout: '1s',
        type: 'JiraUpdate',
        spec: {
          connectorRef: '',
          issueKey: '',
          fields: []
        }
      },
      template: {
        name: 'Test A',
        identifier: 'Test A',
        timeout: '<+input>',
        type: 'JiraUpdate',
        spec: {
          connectorRef: '',
          issueKey: '',
          fields: []
        }
      },
      viewType: StepViewType.TriggerForm
    })
    expect(response).toMatchSnapshot('Value must be greater than or equal to "10s"')
  })
})

describe('Jira Update process form data tests', () => {
  test('if duplicate fields are not sent', () => {
    const formValues: JiraUpdateData = {
      name: 'jiraUpdate',
      identifier: 'jup',
      timeout: '10m',
      type: 'JiraUpdate',
      spec: {
        connectorRef: { label: 'conn', value: 'conn' },
        issueKey: 'id1',
        transitionTo: {
          status: 'progress',
          transitionName: ''
        },
        fields: [
          {
            name: 'f1',
            value: 'v1'
          },
          {
            name: 'f2',
            value: { label: 'vb2', value: 'vb2' }
          }
        ],
        selectedOptionalFields: [
          {
            name: 'f2',
            value: { label: 'vb2', value: 'vb2' },
            key: 'f2',
            allowedValues: [],
            schema: {
              typeStr: '',
              type: 'string'
            }
          },
          {
            name: 'f3',
            value: [
              { label: 'v3', value: 'v3' },
              { label: 'v32', value: 'v32' }
            ],
            key: 'f3',
            allowedValues: [],
            schema: {
              typeStr: '',
              type: 'string'
            }
          }
        ]
      }
    }

    const returned = processFormData(formValues)
    expect(returned).toStrictEqual({
      name: 'jiraUpdate',
      identifier: 'jup',
      timeout: '10m',
      type: 'JiraUpdate',
      spec: {
        connectorRef: {
          label: 'conn',
          value: 'conn'
        },
        delegateSelectors: undefined,
        issueKey: 'id1',
        transitionTo: {
          status: 'progress',
          transitionName: ''
        },
        fields: [
          {
            name: 'f2',
            value: 'vb2'
          },
          {
            name: 'f3',
            value: 'v3,v32'
          },
          {
            name: 'f1',
            value: 'v1'
          }
        ]
      }
    })
  })

  test('if runtime values work', () => {
    const formValues: JiraUpdateData = {
      name: 'jiraUpdate',
      identifier: 'jup',
      timeout: '10m',
      type: 'JiraUpdate',
      spec: {
        connectorRef: '<+input>',
        delegateSelectors: undefined,
        issueKey: '<+input>',
        transitionTo: {
          status: '<+input>',
          transitionName: ''
        },
        fields: [
          {
            name: 'f1',
            value: '<+a.b>'
          }
        ],
        selectedOptionalFields: [
          {
            name: 'f2',
            value: '<+x.y>',
            key: 'f2',
            allowedValues: [],
            schema: {
              typeStr: '',
              type: 'string'
            }
          }
        ]
      }
    }

    const returned = processFormData(formValues)
    expect(returned).toStrictEqual({
      name: 'jiraUpdate',
      identifier: 'jup',
      timeout: '10m',
      type: 'JiraUpdate',
      spec: {
        connectorRef: '<+input>',
        delegateSelectors: undefined,
        issueKey: '<+input>',
        transitionTo: {
          status: '<+input>',
          transitionName: ''
        },
        fields: [
          {
            name: 'f2',
            value: '<+x.y>'
          },
          {
            name: 'f1',
            value: '<+a.b>'
          }
        ]
      }
    })
  })
})
