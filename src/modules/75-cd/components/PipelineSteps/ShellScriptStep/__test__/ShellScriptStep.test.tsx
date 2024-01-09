/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { act, fireEvent, queryByAttribute, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { StepViewType, StepFormikRef } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { factory, TestStepWidget } from '@pipeline/components/PipelineSteps/Steps/__tests__/StepTestUtil'
import { TestWrapper } from '@common/utils/testUtils'
import {
  PipelineContext,
  PipelineContextInterface
} from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import pipelineContextMock from '@pipeline/components/PipelineStudio/PipelineCanvas/__tests__/PipelineCanvasGitSyncTestHelper'
import { StageElementWrapperConfig } from 'services/pipeline-ng'
import { mockDelegateSelectorsResponse } from '@common/components/DelegateSelectors/__tests__/DelegateSelectorsMockData'

import { ShellScriptStep } from '../ShellScriptStep'

jest.mock('@common/components/MonacoEditor/MonacoEditor')
jest.mock('@common/components/YAMLBuilder/YamlBuilder')

const getContextValue = (): PipelineContextInterface => {
  return {
    ...pipelineContextMock,
    state: {
      ...pipelineContextMock.state,
      selectionState: { selectedStageId: 's1' }
    },
    getStageFromPipeline: jest.fn(() => {
      return { stage: (pipelineContextMock.state.pipeline.stages as StageElementWrapperConfig[])[0], parent: undefined }
    })
  } as unknown as PipelineContextInterface
}

jest.mock('services/portal', () => ({
  useGetDelegateSelectorsUpTheHierarchyV2: jest.fn().mockImplementation(() => {
    return mockDelegateSelectorsResponse
  })
}))

describe('Test Shell Script Step', () => {
  beforeEach(() => {
    factory.registerStep(new ShellScriptStep())
  })

  test('should render edit view as new step', () => {
    const { container } = render(
      <TestStepWidget initialValues={{}} type={StepType.SHELLSCRIPT} stepViewType={StepViewType.Edit} />
    )

    expect(container).toMatchSnapshot()
  })

  test('should render edit view as edit step', () => {
    const initialValues = {
      type: 'ShellScript',
      identifier: 'ShellScript',
      name: 'SSH',
      spec: {
        shell: 'Bash',
        executionTarget: {
          host: 'targethost',
          connectorRef: 'connectorRef',
          workingDirectory: './temp'
        },
        environmentVariables: [
          {
            name: 'testInput1',
            type: 'String',
            value: 'Test_A'
          },
          {
            name: 'testInput2',
            type: 'String',
            value: 'Test_B'
          }
        ],
        outputVariables: [
          {
            name: 'testOutput1',
            type: 'String',
            value: 'Test_C'
          },
          {
            name: 'testOutput2',
            type: 'String',
            value: 'Test_D'
          }
        ]
      }
    }
    const { container } = render(
      <TestStepWidget initialValues={initialValues} type={StepType.SHELLSCRIPT} stepViewType={StepViewType.Edit} />
    )

    expect(container).toMatchSnapshot()
  })

  test('should render edit view', () => {
    const initialValues = {
      type: 'ShellScript',
      identifier: 'ShellScript',
      name: 'SSH',
      spec: {
        shell: 'Bash',
        onDelegate: false,
        source: {
          type: 'Inline',
          spec: {
            script: 'test script'
          }
        },
        executionTarget: {
          host: 'targethost',
          connectorRef: 'connectorRef',
          workingDirectory: './temp'
        },
        environmentVariables: [
          {
            name: 'testInput1',
            type: 'String',
            value: 'Test_A'
          },
          {
            name: 'testInput2',
            type: 'String',
            value: 'Test_B'
          }
        ],
        outputVariables: [
          {
            name: 'testOutput1',
            type: 'String',
            value: 'Test_C'
          },
          {
            name: 'testOutput2',
            type: 'String',
            value: 'Test_D'
          }
        ]
      }
    }
    const { container } = render(
      <TestStepWidget initialValues={initialValues} type={StepType.SHELLSCRIPT} stepViewType={StepViewType.Edit} />
    )

    expect(container).toMatchSnapshot()
  })

  test('should render edit view', () => {
    const initialValues = {
      type: 'ShellScript',
      identifier: 'ShellScript',
      name: 'SSH',
      spec: {
        shell: 'Bash',
        onDelegate: 'targethost',
        source: {
          type: 'Inline',
          spec: {
            script: 'test script'
          }
        },
        executionTarget: {
          host: 'targethost',
          connectorRef: 'connectorRef',
          workingDirectory: './temp'
        },
        environmentVariables: [
          {
            name: 'testInput1',
            type: 'String',
            value: 'Test_A'
          },
          {
            name: 'testInput2',
            type: 'String',
            value: 'Test_B'
          }
        ],
        outputVariables: [
          {
            name: 'testOutput1',
            type: 'String',
            value: 'Test_C'
          },
          {
            name: 'testOutput2',
            type: 'String',
            value: 'Test_D'
          }
        ]
      }
    }
    const { container } = render(
      <TestStepWidget initialValues={initialValues} type={StepType.SHELLSCRIPT} stepViewType={StepViewType.Edit} />
    )

    expect(container).toMatchSnapshot()
  })

  test('should render infraSelector for CD - K8s/NativeHelm deployment type', async () => {
    const { container } = render(
      <TestWrapper>
        <PipelineContext.Provider value={getContextValue()}>
          <TestStepWidget initialValues={{}} type={StepType.SHELLSCRIPT} stepViewType={StepViewType.Edit} />
        </PipelineContext.Provider>
      </TestWrapper>
    )
    const includeInfraSelectorsCheckbox = container.querySelector('input[name="spec.includeInfraSelectors"]')
    expect(includeInfraSelectorsCheckbox).not.toHaveAttribute('checked')
  })

  test('form produces correct data for fixed inputs', async () => {
    const onUpdate = jest.fn()
    const ref = React.createRef<StepFormikRef<unknown>>()
    const { container, getByText } = render(
      <TestStepWidget
        initialValues={{}}
        type={StepType.SHELLSCRIPT}
        stepViewType={StepViewType.Edit}
        onUpdate={onUpdate}
        ref={ref}
      />
    )

    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)

    await act(async () => {
      fireEvent.change(queryByNameAttribute('name')!, { target: { value: 'SSH' } })
      fireEvent.change(queryByNameAttribute('spec.shell')!, { target: { value: 'Bash' } })
      fireEvent.change(queryByNameAttribute('timeout')!, { target: { value: '10m' } })
      fireEvent.input(queryByNameAttribute('spec.source.spec.script')!, {
        target: { value: 'script test' },
        bubbles: true
      })

      await fireEvent.click(getByText('common.optionalConfig'))
      await fireEvent.click(getByText('addInputVar'))

      fireEvent.change(queryByNameAttribute('spec.environmentVariables[0].name')!, { target: { value: 'testInput1' } })
      fireEvent.change(queryByNameAttribute('spec.environmentVariables[0].value')!, {
        target: { value: 'testInputValue' }
      })
      fireEvent.change(queryByNameAttribute('spec.environmentVariables[0].type')!, { target: { value: 'String' } })

      await fireEvent.click(getByText('addOutputVar'))
      fireEvent.change(queryByNameAttribute('spec.outputVariables[0].name')!, { target: { value: 'testOutput1' } })
      fireEvent.change(queryByNameAttribute('spec.outputVariables[0].value')!, {
        target: { value: 'response.message' }
      })

      await fireEvent.click(getByText('addOutputVar'))
      fireEvent.change(queryByNameAttribute('spec.outputVariables[1].name')!, { target: { value: 'testOutput2' } })
      fireEvent.change(queryByNameAttribute('spec.outputVariables[1].value')!, {
        target: { value: 'response.message' }
      })

      await ref.current?.submitForm()
    })

    expect(onUpdate).toHaveBeenCalledWith({
      identifier: 'SSH',
      name: 'SSH',
      timeout: '10m',
      type: 'ShellScript',
      spec: {
        shell: 'Bash',
        executionTarget: {},
        delegateSelectors: [],
        source: {
          type: 'Inline',
          spec: {
            script: 'script test'
          }
        },
        environmentVariables: [
          {
            name: 'testInput1',
            type: 'String',
            value: 'testInputValue'
          }
        ],
        outputVariables: [
          {
            name: 'testOutput1',
            type: 'String',
            value: 'response.message'
          },
          {
            name: 'testOutput2',
            type: 'String',
            value: 'response.message'
          }
        ]
      }
    })
  })

  test('form produces correct data for fixed inputs for delegate as false', async () => {
    const onUpdate = jest.fn()
    const ref = React.createRef<StepFormikRef<unknown>>()

    const initialValues = {
      type: 'ShellScript',
      identifier: 'SSH',
      name: 'SSH',
      spec: {
        shell: 'Bash',
        onDelegate: false,
        source: {
          type: 'Inline',
          spec: {
            script: 'test script'
          }
        },
        executionTarget: {
          host: 'targethost',
          connectorRef: 'connectorRef',
          workingDirectory: './temp'
        },
        environmentVariables: [
          {
            name: 'testInput1',
            type: 'String',
            value: 'Test_A'
          },
          {
            name: 'testInput2',
            type: 'String',
            value: 'Test_B'
          }
        ],
        outputVariables: [
          {
            name: 'testOutput1',
            type: 'String',
            value: 'Test_C'
          },
          {
            name: 'testOutput2',
            type: 'String',
            value: 'Test_D'
          }
        ]
      }
    }

    const { container, getByText } = render(
      <TestStepWidget
        initialValues={initialValues}
        type={StepType.SHELLSCRIPT}
        stepViewType={StepViewType.Edit}
        onUpdate={onUpdate}
        ref={ref}
      />
    )

    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)

    await act(async () => {
      fireEvent.change(queryByNameAttribute('name')!, { target: { value: 'SSH' } })
      fireEvent.change(queryByNameAttribute('spec.shell')!, { target: { value: 'Bash' } })
      fireEvent.change(queryByNameAttribute('timeout')!, { target: { value: '10m' } })
      const radioButtonsType = container.querySelectorAll('input[type="radio"]')
      await fireEvent.click(radioButtonsType[1])
      fireEvent.input(queryByNameAttribute('spec.source.spec.script')!, {
        target: { value: 'script test' },
        bubbles: true
      })

      await fireEvent.click(getByText('common.optionalConfig'))

      const radioButtons = container.querySelectorAll('input[type="radio"]')
      await fireEvent.click(radioButtons[2])

      fireEvent.change(queryByNameAttribute('spec.executionTarget.host')!, { target: { value: 'targethost1' } })
      fireEvent.change(queryByNameAttribute('spec.executionTarget.workingDirectory')!, { target: { value: './temp1' } })
      await ref.current?.submitForm()
    })

    expect(onUpdate).toHaveBeenCalledWith({
      identifier: 'SSH',
      name: 'SSH',
      timeout: '10m',
      type: 'ShellScript',
      spec: {
        shell: 'Bash',
        delegateSelectors: [],
        source: {
          type: 'Inline',
          spec: {
            script: 'script test'
          }
        },
        executionTarget: {
          host: 'targethost1',
          connectorRef: 'connectorRef',
          workingDirectory: './temp1'
        },
        environmentVariables: [
          {
            name: 'testInput1',
            type: 'String',
            value: 'Test_A'
          },
          {
            name: 'testInput2',
            type: 'String',
            value: 'Test_B'
          }
        ],
        outputVariables: [
          {
            name: 'testOutput1',
            type: 'String',
            value: 'Test_C'
          },
          {
            name: 'testOutput2',
            type: 'String',
            value: 'Test_D'
          }
        ]
      }
    })
  })

  test('renders empty inputVariables', () => {
    const { container } = render(
      <TestStepWidget
        initialValues={{}}
        type={StepType.SHELLSCRIPT}
        stepViewType={StepViewType.InputVariable}
        customStepProps={{}}
      />
    )
    expect(container).toMatchSnapshot()
  })

  test('should validate for valid number for env variable of type number', async () => {
    const onUpdate = jest.fn()
    const ref = React.createRef<StepFormikRef<unknown>>()

    const initialValues = {
      type: 'ShellScript',
      identifier: 'SSH',
      name: 'SSH',
      spec: {
        shell: 'Bash',
        onDelegate: false,
        source: {
          type: 'Inline',
          spec: {
            script: 'test script'
          }
        },
        executionTarget: {
          host: 'targethost',
          connectorRef: 'connectorRef',
          workingDirectory: './temp'
        },
        environmentVariables: [
          {
            name: 'testInput1',
            type: 'Number',
            value: '123'
          }
        ],
        outputVariables: []
      }
    }

    const { container, getByText, queryByText } = render(
      <TestStepWidget
        initialValues={initialValues}
        type={StepType.SHELLSCRIPT}
        stepViewType={StepViewType.Edit}
        onUpdate={onUpdate}
        ref={ref}
      />
    )

    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)
    expect(getByText('common.optionalConfig')).toBeInTheDocument()
    await userEvent.click(getByText('common.optionalConfig'))

    const valueInput = queryByNameAttribute('spec.environmentVariables[0].value') as HTMLInputElement
    expect(valueInput).toBeInTheDocument()
    expect(valueInput.value).toBe('123')
    fireEvent.change(valueInput, { target: { value: 'test' } })
    expect(valueInput.value).toBe('test')

    act(() => {
      ref.current?.submitForm()
    })
    await waitFor(() => expect(onUpdate).not.toBeCalled())
    expect(getByText('common.validation.valueMustBeANumber')).toBeInTheDocument()

    fireEvent.change(valueInput, { target: { value: '1234' } })
    expect(valueInput.value).toBe('1234')

    act(() => {
      ref.current?.submitForm()
    })
    await waitFor(() => expect(onUpdate).toBeCalled())
    expect(queryByText('common.validation.valueMustBeANumber')).not.toBeInTheDocument()
  })
})
