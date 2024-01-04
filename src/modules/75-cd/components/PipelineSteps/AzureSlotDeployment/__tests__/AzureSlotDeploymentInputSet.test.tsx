/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render } from '@testing-library/react'

import { Formik, FormikForm, MultiTypeInputType, RUNTIME_INPUT_VALUE } from '@harness/uicore'
import { TestWrapper } from '@common/utils/testUtils'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { selectedStageMock } from './mock'

import AzureSlotDeploymentInputSet from '../AzureSlotDeploymentInputSet'
jest.mock('@common/components/YAMLBuilder/YamlBuilder')

const initialValues = {
  timeout: '10m',
  spec: {
    webApp: 'webApp',
    deploymentSlot: 'deploymentSlot'
  }
}

const template: any = {
  timeout: RUNTIME_INPUT_VALUE,
  spec: {
    webApp: RUNTIME_INPUT_VALUE,
    deploymentSlot: RUNTIME_INPUT_VALUE
  }
}

describe('Test Azure Slot Deployment input set', () => {
  test('Should render edit view as new step', () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <Formik initialValues={{}} onSubmit={() => undefined} formName="wrapperComponentTestForm">
          <FormikForm>
            <AzureSlotDeploymentInputSet
              initialValues={initialValues as any}
              stepType={StepType.AzureSlotDeployment}
              stepViewType={StepViewType.InputSet}
              inputSetData={{
                template
              }}
              path="test"
              selectedStage={selectedStageMock}
              allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION, MultiTypeInputType.RUNTIME]}
            />
          </FormikForm>
        </Formik>
      </TestWrapper>
    )
    expect(getByText('cd.serviceDashboard.webApp')).toBeInTheDocument()
    expect(getByPlaceholderText('cd.steps.azureWebAppInfra.webAppPlaceholder')).toHaveValue('')
    expect(getByText('cd.serviceDashboard.deploymentSlotTitle')).toBeInTheDocument()
    expect(getByPlaceholderText('cd.steps.azureWebAppInfra.deploymentSlotPlaceHolder')).toHaveValue('')
    expect(getByText('pipelineSteps.timeoutLabel')).toBeInTheDocument()
    expect(getByPlaceholderText('Enter w/d/h/m/s/ms')).toHaveValue('')
  })
})
