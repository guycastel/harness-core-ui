/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { createRef } from 'react'
import {
  act,
  findAllByText,
  fireEvent,
  queryByAttribute,
  render,
  screen,
  waitFor,
  within,
  getByText as getByTextGlobal
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RUNTIME_INPUT_VALUE } from '@harness/uicore'

import type { StringsMap } from 'stringTypes'
import { findDialogContainer, queryByNameAttribute, TestWrapper } from '@common/utils/testUtils'
import { awsConnectorListResponse } from '@platform/connectors/components/ConnectorReferenceField/__tests__/mocks'
import { factory, TestStepWidget } from '@pipeline/components/PipelineSteps/Steps/__tests__/StepTestUtil'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { StepFormikRef, StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StageType } from '@pipeline/utils/stageHelpers'
import type { StepGroupElementConfig } from 'services/pipeline-ng'
import { StepGroupStep } from '../StepGroupStep'
import { StepGroupStepEditRef } from '../StepGroupStepEdit'
import {
  containerStepGroupInitialValues,
  containerStepGroupTemplate,
  stepGroupWithBasicVariablesInitialValues,
  stepGroupWithVariablesInitialValues,
  stepGroupWithVariablesTemplate
} from './helper'
import { awsRegions } from './mocks'
import type { K8sDirectInfraStepGroupElementConfig } from '../StepGroupUtil'
import { CustomVariables } from '../../CustomVariables/CustomVariables'

const fetchConnector = jest.fn().mockReturnValue({ data: awsConnectorListResponse.data?.content?.[1] })
jest.mock('services/cd-ng', () => ({
  getConnectorListV2Promise: jest.fn().mockImplementation(() => Promise.resolve(awsConnectorListResponse)),
  useGetConnector: jest.fn().mockImplementation(() => {
    return { data: { data: awsConnectorListResponse.data?.content?.[1] }, refetch: fetchConnector, loading: false }
  })
}))

jest.mock('services/portal', () => ({
  useListAwsRegions: jest.fn().mockImplementation(() => {
    return { data: awsRegions, loading: false }
  })
}))

const getString = (str: keyof StringsMap, vars?: Record<string, any> | undefined): string => {
  return vars?.stringToAppend ? `${str}_${vars.stringToAppend}` : str
}

describe('StepGroupStep tests', () => {
  const stepGroupStep = new StepGroupStep()
  const customVariableStep = new CustomVariables()
  beforeAll(() => {
    factory.registerStep(stepGroupStep)
    factory.registerStep(customVariableStep)
  })
  afterAll(() => {
    factory.deregisterStep(stepGroupStep.getType())
    factory.deregisterStep(customVariableStep.getType())
  })

  test('renders as expected in edit view when stepGroupInfra is NOT present', async () => {
    render(
      <TestStepWidget
        type={StepType.StepGroup}
        initialValues={{
          name: 'Step Group 1',
          identifier: 'Step Group 1 step_group_1',
          steps: [
            {
              step: {
                type: 'Wait',
                name: 'Wait_1',
                identifier: 'Wait_1',
                spec: {
                  duration: '10m'
                }
              }
            }
          ]
        }}
        isNewStep={false}
        stepViewType={StepViewType.Edit}
        customStepProps={{
          stageIdentifier: 'stage_1',
          selectedStage: {
            stage: {
              identifier: 'stage_1',
              name: 'Stage 1',
              type: StageType.DEPLOY
            }
          }
        }}
      />
    )

    expect(await screen.findByDisplayValue('Step Group 1')).toBeInTheDocument()
  })

  test('should validate name and call onUpdate with expected values when stepGroupInfra is NOT present', async () => {
    const onUpdate = jest.fn()
    const ref = createRef<StepFormikRef<StepGroupElementConfig>>()
    const { baseElement } = render(
      <TestWrapper>
        <StepGroupStepEditRef
          ref={ref}
          onUpdate={onUpdate}
          initialValues={{
            steps: [],
            identifier: '',
            name: ''
          }}
          stepViewType={StepViewType.Edit}
          customStepProps={{
            stageIdentifier: 'stage_1',
            selectedStage: {
              stage: {
                identifier: 'stage_1',
                name: 'Stage 1',
                type: StageType.DEPLOY
              }
            }
          }}
        />
      </TestWrapper>
    )

    await waitFor(() => expect(baseElement.querySelector('[name="name"]')).toHaveValue(''))
    await act(async () => ref.current?.submitForm())
    expect(await screen.findByText('pipelineSteps.stepNameRequired')).toBeInTheDocument()

    userEvent.type(baseElement.querySelector('[name="name"]') as HTMLInputElement, 'stepgroup')

    expect(await screen.findByDisplayValue('stepgroup')).toBeInTheDocument()
    await act(async () => ref.current?.submitForm())
    await waitFor(() =>
      expect(onUpdate).toBeCalledWith({
        identifier: 'stepgroup',
        name: 'stepgroup',
        steps: []
      })
    )
  })

  test('renders as expected in EDIT view when stepGroupInfra IS present', async () => {
    const onUpdate = jest.fn()
    const ref = createRef<StepFormikRef<StepGroupElementConfig>>()

    const { container } = render(
      <TestStepWidget
        type={StepType.StepGroup}
        initialValues={containerStepGroupInitialValues}
        isNewStep={false}
        stepViewType={StepViewType.Edit}
        ref={ref}
        onUpdate={onUpdate}
        customStepProps={{
          stageIdentifier: 'stage_1',
          selectedStage: {
            stage: {
              identifier: 'stage_1',
              name: 'Stage 1',
              type: StageType.DEPLOY
            }
          }
        }}
      />
    )

    const queryByName = (nameValue: string): HTMLElement | null => queryByNameAttribute(nameValue, container)

    // Name
    const nameInput = queryByName('name') as HTMLInputElement
    expect(nameInput).toBeInTheDocument()
    expect(nameInput.value).toBe('Container Step Group 1')

    // Enable container based execution switch should be ON
    const enableContainerBasedExecutionSwitch = await screen.findByText('pipeline.enableContainerBasedExecution')
    expect(enableContainerBasedExecutionSwitch).toBeInTheDocument()
    const enableContainerBasedExecutionSwitchCheckboxInput = within(enableContainerBasedExecutionSwitch).getByRole(
      'checkbox'
    )
    expect(enableContainerBasedExecutionSwitchCheckboxInput).toBeInTheDocument()
    await waitFor(() => expect(enableContainerBasedExecutionSwitchCheckboxInput).toBeChecked())

    // Kubernetes Cluster
    const connectorRefInput = screen.getByText('Aws Connector 2')
    expect(connectorRefInput).toBeInTheDocument()

    // Namespace
    const namespaceInput = queryByName('namespace') as HTMLInputElement
    expect(namespaceInput).toBeInTheDocument()
    expect(namespaceInput.value).toBe('default')

    // Open Optional Configurations
    const optionalConfigAccordionTitle = screen.getByText('common.optionalConfig')
    expect(optionalConfigAccordionTitle).toBeInTheDocument()

    await act(async () => ref.current?.submitForm())
    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
  })

  test('renders as expected in RUNTIME view when stepGroupInfra IS present', async () => {
    const { container } = render(
      <TestStepWidget
        type={StepType.StepGroup}
        initialValues={containerStepGroupInitialValues}
        template={containerStepGroupTemplate}
        isNewStep={false}
        stepViewType={StepViewType.InputSet}
      />
    )

    const queryByName = (nameValue: string): HTMLElement | null => queryByNameAttribute(nameValue, container)

    // Kubernetes Cluster & Override Image Connector
    const connectorRefInputs = screen.getAllByText('Aws Connector 2')
    expect(connectorRefInputs).toHaveLength(2)

    // Namespace
    const namespaceInput = queryByName('stepGroupInfra.spec.namespace') as HTMLInputElement
    expect(namespaceInput).toBeInTheDocument()
    expect(namespaceInput.value).toBe('default')
  })

  test('errors should be displayed for required container step group fields in runtime view', async () => {
    const initialValues: K8sDirectInfraStepGroupElementConfig = {
      name: 'Container Step Group 1',
      identifier: 'container_step_group_1',
      sharedPaths: ['sp1', 'sp2'] as any,
      stepGroupInfra: {
        type: 'KubernetesDirect',
        spec: {
          connectorRef: '',
          namespace: ''
        }
      }
    }

    const step = new StepGroupStep() as any
    step.renderStep({
      initialValues,
      inputSetData: {
        template: containerStepGroupTemplate
      }
    })
    const errors = await step.validateInputSet({
      data: initialValues,
      template: containerStepGroupTemplate,
      getString,
      viewType: StepViewType.DeploymentForm
    })

    expect(errors.stepGroupInfra.spec.connectorRef).toBe('common.validation.fieldIsRequired')
    expect(errors.stepGroupInfra.spec.namespace).toBe('common.validation.fieldIsRequired')
  })

  test('errors should be displayed for required container step group fields in trigger view', async () => {
    const initialValues: K8sDirectInfraStepGroupElementConfig = {
      name: 'Container Step Group 1',
      identifier: 'container_step_group_1',
      sharedPaths: ['sp1', 'sp2'] as any,
      stepGroupInfra: {
        type: 'KubernetesDirect',
        spec: {
          connectorRef: '',
          namespace: ''
        }
      }
    }

    const step = new StepGroupStep() as any
    step.renderStep({
      initialValues,
      inputSetData: {
        template: containerStepGroupTemplate
      }
    })
    const errors = await step.validateInputSet({
      data: initialValues,
      template: containerStepGroupTemplate,
      getString,
      viewType: StepViewType.TriggerForm
    })

    expect(errors.stepGroupInfra.spec.connectorRef).toBe('common.validation.fieldIsRequired')
    expect(errors.stepGroupInfra.spec.namespace).toBe('common.validation.fieldIsRequired')
  })

  test('should not display container step group related fields when Enable container based execution is turned OFF', async () => {
    const onUpdate = jest.fn()
    const ref = createRef<StepFormikRef<StepGroupElementConfig>>()

    const { container } = render(
      <TestStepWidget
        type={StepType.StepGroup}
        initialValues={containerStepGroupInitialValues}
        isNewStep={false}
        stepViewType={StepViewType.Edit}
        ref={ref}
        onUpdate={onUpdate}
        customStepProps={{
          stageIdentifier: 'stage_1',
          selectedStage: {
            stage: {
              identifier: 'stage_1',
              name: 'Stage 1',
              type: StageType.DEPLOY
            }
          }
        }}
      />
    )

    const queryByName = (nameValue: string): HTMLElement | null => queryByNameAttribute(nameValue, container)

    // Name
    const nameInput = queryByName('name') as HTMLInputElement
    expect(nameInput).toBeInTheDocument()
    expect(nameInput.value).toBe('Container Step Group 1')

    // Enable container based execution switch should be ON
    const enableContainerBasedExecutionSwitch = await screen.findByText('pipeline.enableContainerBasedExecution')
    expect(enableContainerBasedExecutionSwitch).toBeInTheDocument()
    const enableContainerBasedExecutionSwitchCheckboxInput = within(enableContainerBasedExecutionSwitch).getByRole(
      'checkbox'
    )
    expect(enableContainerBasedExecutionSwitchCheckboxInput).toBeInTheDocument()
    await waitFor(() => expect(enableContainerBasedExecutionSwitchCheckboxInput).toBeChecked())

    // Kubernetes Cluster
    const connectorRefInput = screen.queryByText('Aws Connector 2')
    expect(connectorRefInput).toBeInTheDocument()

    // Namespace
    const namespaceInput = queryByName('namespace') as HTMLInputElement
    expect(namespaceInput).toBeInTheDocument()
    expect(namespaceInput.value).toBe('default')

    fireEvent.click(enableContainerBasedExecutionSwitch)

    await waitFor(() => expect(connectorRefInput).not.toBeInTheDocument())
    expect(namespaceInput).not.toBeInTheDocument()

    await act(async () => ref.current?.submitForm())
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith({
        identifier: 'container_step_group_1',
        name: 'Container Step Group 1',
        steps: [
          {
            step: {
              identifier: 'Wait_1',
              name: 'Wait_1',
              spec: {
                duration: '10m'
              },
              type: 'Wait'
            }
          }
        ]
      })
    )
  })

  test('should make relevant fields as Runtime input while submitting container based step group fields are runtime inputs', async () => {
    const onUpdate = jest.fn()
    const ref = createRef<StepFormikRef<StepGroupElementConfig>>()

    const { container } = render(
      <TestStepWidget
        type={StepType.StepGroup}
        initialValues={containerStepGroupTemplate}
        isNewStep={false}
        stepViewType={StepViewType.Edit}
        ref={ref}
        onUpdate={onUpdate}
        customStepProps={{
          stageIdentifier: 'stage_1',
          selectedStage: {
            stage: {
              identifier: 'stage_1',
              name: 'Stage 1',
              type: StageType.DEPLOY
            }
          }
        }}
      />
    )

    const queryByName = (nameValue: string): HTMLElement | null => queryByNameAttribute(nameValue, container)

    // Name
    const nameInput = queryByName('name') as HTMLInputElement
    expect(nameInput).toBeInTheDocument()
    expect(nameInput.value).toBe('Container Step Group 1')

    // Enable container based execution switch should be ON
    const enableContainerBasedExecutionSwitch = await screen.findByText('pipeline.enableContainerBasedExecution')
    expect(enableContainerBasedExecutionSwitch).toBeInTheDocument()
    const enableContainerBasedExecutionSwitchCheckboxInput = within(enableContainerBasedExecutionSwitch).getByRole(
      'checkbox'
    )
    expect(enableContainerBasedExecutionSwitchCheckboxInput).toBeInTheDocument()
    await waitFor(() => expect(enableContainerBasedExecutionSwitchCheckboxInput).toBeChecked())

    // Namespace
    const namespaceInput = queryByName('namespace') as HTMLInputElement
    expect(namespaceInput).toBeInTheDocument()
    expect(namespaceInput.value).toBe(RUNTIME_INPUT_VALUE)

    await act(async () => ref.current?.submitForm())
    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
  })

  test('renders variables in edit view ', async () => {
    const onChange = jest.fn()
    const onUpdate = jest.fn()
    const { container, getByText, findByText, getAllByText } = render(
      <TestStepWidget
        type={StepType.StepGroup}
        initialValues={stepGroupWithVariablesInitialValues}
        isNewStep={false}
        stepViewType={StepViewType.Edit}
        onChange={onChange}
        onUpdate={onUpdate}
        customStepProps={{
          stageIdentifier: 'stage_1',
          selectedStage: {
            stage: {
              identifier: 'stage_1',
              name: 'Stage 1',
              type: StageType.DEPLOY
            }
          }
        }}
      />
    )
    expect(() => getByText('common.variables')).toBeDefined()
    const requiredPropertyIcon = getAllByText('pipeline.requiredFieldDuringRuntime')
    expect(requiredPropertyIcon.length).toBe(2)
    const descriptionIcon = container.querySelectorAll('[data-icon="description"]')
    expect(descriptionIcon.length).toBe(3)

    expect(container.querySelector('input[name="variables[0].name"]')).toHaveValue('sg1StringVar')
    expect(container.querySelector('input[name="variables[0].value"]')).toHaveValue('stringValue')
    expect(container.querySelector('input[name="variables[1].name"]')).toHaveValue('sg1SecretVar')
    expect(getByText('account.secretVariable')).toBeDefined()
    expect(container.querySelector('input[name="variables[2].name"]')).toHaveValue('sg1NumberVar')
    expect(container.querySelector('input[name="variables[2].value"]')).toHaveValue(33)
    expect(container.querySelector('input[name="variables[3].name"]')).toHaveValue('runtimeRequiredVariable')
    expect(container.querySelector('input[name="variables[3].value"]')).toHaveValue('<+input>')

    // Addition of new variable flow
    const add = await findByText('platform.variables.newVariable')
    act(() => {
      fireEvent.click(add)
    })
    const dialog = findDialogContainer() as HTMLElement
    await waitFor(() => findAllByText(dialog, 'platform.variables.newVariable'))
    const nameField = queryByAttribute('name', dialog, 'name')
    const valueField = queryByAttribute('name', dialog, 'value')
    act(() => {
      fireEvent.change(nameField!, { target: { value: 'stringNewVariable' } })
      fireEvent.change(valueField!, { target: { value: 'stringNewVariableValue' } })
    })
    const submitBtn = getByTextGlobal(dialog, 'save')
    await act(async () => {
      fireEvent.click(submitBtn!)
    })
    // Validate new variable
    expect(container.querySelector('input[name="variables[4].name"]')).toHaveValue('stringNewVariable')
    expect(container.querySelector('input[name="variables[4].value"]')).toHaveValue('stringNewVariableValue')
  })

  test('renders variables section in RUNTIME view', async () => {
    const onUpdate = jest.fn()
    const { container, getByText, queryByText } = render(
      <TestStepWidget
        type={StepType.StepGroup}
        initialValues={stepGroupWithBasicVariablesInitialValues}
        template={stepGroupWithVariablesTemplate}
        allValues={{
          variables: [
            {
              name: 'runtimeRequiredVariable',
              type: 'String',
              description: 'Runtime Required Variable Description',
              required: true,
              value: '<+input>'
            }
          ]
        }}
        onUpdate={onUpdate}
        isNewStep={false}
        stepViewType={StepViewType.InputSet}
      />
    )

    expect(() => getByText('common.variables')).toBeDefined()
    expect(queryByText('common.optionalLabel')).not.toBeInTheDocument()
    expect(getByText('runtimeRequiredVariable')).toBeDefined()

    const valueField = queryByAttribute('name', container, 'variables[0].value')
    act(() => {
      fireEvent.change(valueField!, { target: { value: 'stringNewVariableValue' } })
    })

    expect(container.querySelector('input[name="variables[0].value"]')).toHaveValue('stringNewVariableValue')
  })
})
