/* eslint-disable @typescript-eslint/no-empty-function */
/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, act, screen } from '@testing-library/react'
import { RUNTIME_INPUT_VALUE } from '@harness/uicore'
import userEvent from '@testing-library/user-event'
import { StepViewType, StepFormikRef } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { factory, TestStepWidget } from '@pipeline/components/PipelineSteps/Steps/__tests__/StepTestUtil'
import { catalogueData } from '@modules/27-platform/connectors/pages/connectors/__tests__/mockData'
import { queryByNameAttribute } from '@modules/10-common/utils/testUtils'
import { SLSAVerificationStep } from '../SLSAVerification/SLSAVerificationStep'

jest.mock('@common/components/YAMLBuilder/YamlBuilder')
jest.mock('services/cd-ng', () => ({
  useGetConnector: jest.fn().mockImplementation(() => ({ data: {}, refetch: () => {} })),
  useGetConnectorCatalogue: jest.fn().mockImplementation(() => {
    return { data: catalogueData, loading: false, refetch: () => {} }
  }),
  useGetSettingValue: jest.fn().mockImplementation(() => ({ data: { value: 'false' } }))
}))
jest.mock('@connectors/pages/connectors/hooks/useGetConnectorsListHook/useGetConectorsListHook', () => ({
  useGetConnectorsListHook: jest.fn().mockReturnValue({
    loading: true,
    categoriesMap: {},
    refetch: () => {}
  })
}))

const runtimeValues = {
  identifier: 'SLSAVerification_1',
  name: 'SLSA Verification',
  timeout: RUNTIME_INPUT_VALUE,
  spec: {
    source: {
      type: 'Docker',
      spec: {
        connector: RUNTIME_INPUT_VALUE,
        image_path: RUNTIME_INPUT_VALUE,
        tag: RUNTIME_INPUT_VALUE
      }
    },
    verify_attestation: {
      type: 'cosign',
      spec: {
        public_key: RUNTIME_INPUT_VALUE
      }
    }
  }
}

const fixedValues = {
  identifier: 'Ssca_Enforcement_Step',
  name: 'SSCA Enforcement Step',
  timeout: '10s',
  spec: {
    source: {
      type: 'Docker',
      spec: {
        connector: 'deepgcr',
        image_path: 'image_path',
        tag: 'tag'
      }
    },
    verify_attestation: {
      type: 'cosign',
      spec: {
        public_key: 'cosign_pub_key'
      }
    }
  }
}

describe('SLSA Verification Step', () => {
  beforeAll(() => {
    factory.registerStep(new SLSAVerificationStep())
  })

  test('edit view as new step', () => {
    render(<TestStepWidget initialValues={{}} type={StepType.SLSAVerification} stepViewType={StepViewType.Edit} />)
    expect(screen.getByText('pipelineSteps.stepNameLabel')).toBeInTheDocument()
  })

  test('edit view renders with runtime inputs', async () => {
    const onUpdate = jest.fn()
    const ref = React.createRef<StepFormikRef<unknown>>()
    render(
      <TestStepWidget
        initialValues={runtimeValues}
        template={runtimeValues}
        type={StepType.SLSAVerification}
        stepViewType={StepViewType.Edit}
        onUpdate={onUpdate}
        ref={ref}
      />
    )

    await act(() => ref.current?.submitForm()!)
    expect(onUpdate).toBeCalledWith(runtimeValues)
  })

  test('input set view', async () => {
    render(<TestStepWidget initialValues={{}} type={StepType.SLSAVerification} stepViewType={StepViewType.InputSet} />)
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  test('input set view validation for timeout', () => {
    const response = new SLSAVerificationStep().validateInputSet({
      data: {
        name: 'SLSAVerification',
        identifier: 'SLSAVerification',
        timeout: '1s',
        type: 'SLSAVerification',
        spec: {}
      } as any,
      template: {
        timeout: RUNTIME_INPUT_VALUE,
        spec: {}
      } as any,
      getString: jest.fn().mockImplementation(val => val),
      viewType: StepViewType.TriggerForm
    })
    expect(response.timeout).toBe('Value must be greater than or equal to "10s"')
  })

  test('variable view', async () => {
    render(
      <TestStepWidget
        initialValues={fixedValues}
        type={StepType.SLSAVerification}
        stepViewType={StepViewType.InputVariable}
      />
    )
    expect(screen.queryByText('pipelineSteps.stepNameLabel')).not.toBeInTheDocument()
  })

  test('gcr connector type', async () => {
    const { container } = render(
      <TestStepWidget initialValues={fixedValues} type={StepType.SLSAVerification} stepViewType={StepViewType.Edit} />
    )

    expect(screen.getByText('pipelineSteps.stepNameLabel')).toBeInTheDocument()
    const registryType = queryByNameAttribute('spec.source.type', container) as HTMLElement

    userEvent.click(registryType)
    userEvent.click(await screen.findByText('Gcr'))
    expect(await screen.findByText('common.hostLabel')).toBeInTheDocument()
    expect(screen.getByText('pipelineSteps.projectIDLabel')).toBeInTheDocument()
  })
})
