/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Formik, FormikForm, MultiTypeInputType, RUNTIME_INPUT_VALUE } from '@harness/uicore'
import { TestWrapper } from '@common/utils/testUtils'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { selectedStageMock } from '../../AzureSlotDeployment/__tests__/mock'

import AzureWebAppSwapSlotInputStep from '../AzureWebAppSwapSlotInputStep'

const initialValues = {
  type: StepType.AzureSwapSlot,
  name: 'test name',
  identifier: 'test_identifier',
  timeout: '10m',
  spec: {
    targetSlot: 'targetSlot'
  }
}

const renderComponent = (data: any) => {
  return render(
    <TestWrapper
      path="/account/:accountId/cd/orgs/:orgIdentifier/projects/:projectIdentifier"
      pathParams={{ accountId: 'account', orgIdentifier: 'org', projectIdentifier: 'project' }}
    >
      <Formik initialValues={{}} onSubmit={() => undefined} formName="wrapperComponentTestForm">
        <FormikForm>
          <AzureWebAppSwapSlotInputStep
            initialValues={initialValues as any}
            stepType={StepType.AzureSwapSlot}
            stepViewType={StepViewType.InputSet}
            inputSetData={{
              template: data
            }}
            selectedStage={selectedStageMock}
            path="test"
            allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION]}
          />
        </FormikForm>
      </Formik>
    </TestWrapper>
  )
}

describe('Test Azure Web App Swap Slot input set', () => {
  test('should render all input variables components', () => {
    const data = {
      type: StepType.AzureSwapSlot,
      name: 'test name',
      identifier: 'test_identifier',
      timeout: '10m',
      spec: {
        targetSlot: 'test_targetSlot'
      }
    }
    const { getByText } = renderComponent(data)
    expect(getByText('cd.steps.azureWebAppInfra.targetSlotTitle')).toBeInTheDocument()
    expect(getByText('cd.configFilePlaceHolder')).toBeInTheDocument()
  })

  test('timeout should be updated', async () => {
    const data = {
      type: StepType.AzureSwapSlot,
      name: 'test name',
      identifier: 'test_identifier',
      timeout: RUNTIME_INPUT_VALUE,
      spec: {}
    }
    const { getByText, getByPlaceholderText } = renderComponent(data)

    expect(getByText('pipelineSteps.timeoutLabel')).toBeInTheDocument()
    await userEvent.type(getByPlaceholderText('Enter w/d/h/m/s/ms'), '20m')
    expect(getByPlaceholderText('Enter w/d/h/m/s/ms')).toHaveDisplayValue('20m')
    expect(getByText('cd.steps.azureWebAppInfra.targetSlotTitle')).toBeInTheDocument()
    expect(getByText('cd.configFilePlaceHolder')).toBeInTheDocument()
  })
})
