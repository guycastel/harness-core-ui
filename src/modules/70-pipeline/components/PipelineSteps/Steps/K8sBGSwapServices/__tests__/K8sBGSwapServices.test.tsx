import React from 'react'
import { render } from '@testing-library/react'
import { RUNTIME_INPUT_VALUE } from '@wings-software/uicore'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { factory, TestStepWidget } from '../../__tests__/StepTestUtil'
import { K8sBGSwapServices } from '../K8sBGSwapServices'

describe('Test K8sBlueGreenDeployStep', () => {
  beforeEach(() => {
    factory.registerStep(new K8sBGSwapServices())
  })
  test('should render edit view as new step', () => {
    const { container } = render(
      <TestStepWidget initialValues={{}} type={StepType.K8sBGSwapServices} stepViewType={StepViewType.Edit} />
    )
    expect(container).toMatchSnapshot()
  })
  test('should render edit view ', () => {
    const { container } = render(
      <TestStepWidget
        initialValues={{
          type: 'K8sBGSwapServices',
          name: 'Test A',
          timeout: RUNTIME_INPUT_VALUE
        }}
        type={StepType.K8sBGSwapServices}
        stepViewType={StepViewType.Edit}
      />
    )
    expect(container).toMatchSnapshot()
  })

  test('should render edit view for inputset', () => {
    const { container } = render(
      <TestStepWidget
        initialValues={{ type: 'K8sBGSwapServices', name: 'Test A', timeout: RUNTIME_INPUT_VALUE }}
        template={{ type: 'K8sBGSwapServices', name: 'Test A', timeout: RUNTIME_INPUT_VALUE }}
        allValues={{
          type: 'K8sBGSwapServices',
          name: 'Test A',
          timeout: RUNTIME_INPUT_VALUE
        }}
        type={StepType.K8sBGSwapServices}
        stepViewType={StepViewType.InputSet}
      />
    )
    expect(container).toMatchSnapshot()
  })
})
