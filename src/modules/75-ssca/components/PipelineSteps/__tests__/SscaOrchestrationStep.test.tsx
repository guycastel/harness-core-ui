/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, act, screen, waitFor } from '@testing-library/react'
import { RUNTIME_INPUT_VALUE } from '@harness/uicore'
import userEvent from '@testing-library/user-event'
import { StepViewType, StepFormikRef } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { factory, TestStepWidget } from '@pipeline/components/PipelineSteps/Steps/__tests__/StepTestUtil'
import { queryByNameAttribute, doConfigureOptionsTesting } from '@common/utils/testUtils'
import { SscaOrchestrationStep } from '../SscaOrchestrationStep/SscaOrchestrationStep'

jest.mock('@common/components/YAMLBuilder/YamlBuilder')

const runtimeValues = {
  identifier: 'Ssca_Orchestration_Step',
  name: 'SSCA Orchestration Step',
  timeout: RUNTIME_INPUT_VALUE,
  spec: {
    mode: 'generation',
    tool: {
      type: 'Syft',
      spec: {
        format: 'cyclonedx-json'
      }
    },
    source: {
      type: 'image',
      spec: {
        connector: RUNTIME_INPUT_VALUE,
        image: RUNTIME_INPUT_VALUE
      }
    },
    attestation: {
      type: 'cosign',
      spec: {
        privateKey: RUNTIME_INPUT_VALUE,
        password: RUNTIME_INPUT_VALUE
      }
    },
    resources: {
      limits: {
        cpu: RUNTIME_INPUT_VALUE,
        memory: RUNTIME_INPUT_VALUE
      }
    }
  }
}

const fixedValues = {
  identifier: 'Ssca_Orchestration_Step',
  name: 'SSCA Orchestration Step',
  timeout: '10s',
  spec: {
    tool: {
      type: 'Syft',
      spec: {
        format: 'spdx-json'
      }
    },
    source: {
      type: 'image'
    },
    attestation: {
      type: 'cosign',
      spec: {
        privateKey: 'testKey',
        password: 'testPassword'
      }
    },
    resources: {
      limits: {
        cpu: '0.5',
        memory: '500Mi'
      }
    }
  }
}

describe('SBOM Orchestration Step', () => {
  beforeAll(() => {
    factory.registerStep(new SscaOrchestrationStep())
  })

  test('new step | SBOM Drift FF ON', async () => {
    render(
      <TestStepWidget
        initialValues={{}}
        type={StepType.SscaOrchestration}
        stepViewType={StepViewType.Edit}
        isNewStep={true}
        testWrapperProps={{
          defaultFeatureFlagValues: { SSCA_SBOM_DRIFT: true }
        }}
      />
    )

    expect(await screen.findByRole('checkbox', { name: 'ssca.orchestrationStep.detectSbomDrift' })).toBeChecked()
    expect(screen.getByLabelText('ssca.orchestrationStep.detectDriftFrom.lastExecution')).toBeChecked()
  })

  test('existing step', () => {
    render(<TestStepWidget initialValues={{}} type={StepType.SscaOrchestration} stepViewType={StepViewType.Edit} />)
    expect(screen.getByText('pipelineSteps.stepNameLabel')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'ssca.orchestrationStep.detectSbomDrift' })).not.toBeInTheDocument()
  })

  test('edit view renders with runtime inputs', async () => {
    const onUpdate = jest.fn()
    const ref = React.createRef<StepFormikRef<unknown>>()
    render(
      <TestStepWidget
        initialValues={runtimeValues}
        template={runtimeValues}
        type={StepType.SscaOrchestration}
        stepViewType={StepViewType.Edit}
        onUpdate={onUpdate}
        ref={ref}
      />
    )

    await act(() => ref.current?.submitForm()!)
    expect(onUpdate).toHaveBeenCalledWith(runtimeValues)
  })

  test('input set view', async () => {
    render(<TestStepWidget initialValues={{}} type={StepType.SscaOrchestration} stepViewType={StepViewType.InputSet} />)
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  test('variable view', async () => {
    render(
      <TestStepWidget
        initialValues={fixedValues}
        type={StepType.SscaOrchestration}
        stepViewType={StepViewType.InputVariable}
      />
    )
    expect(screen.queryByText('pipelineSteps.stepNameLabel')).not.toBeInTheDocument()
  })

  test('configure values should work fine for runtime inputs', async () => {
    const onUpdate = jest.fn()
    const ref = React.createRef<StepFormikRef<unknown>>()
    const { container } = render(
      <TestStepWidget
        initialValues={runtimeValues}
        template={runtimeValues}
        type={StepType.SscaOrchestration}
        stepViewType={StepViewType.Edit}
        onUpdate={onUpdate}
        readonly={false}
        ref={ref}
      />
    )

    const modals = document.getElementsByClassName('bp3-dialog')
    expect(modals.length).toBe(0)

    const privateKey = queryByNameAttribute('spec.attestation.spec.privateKey', container) as HTMLInputElement
    expect(privateKey).toBeInTheDocument()
    const cogPrivateKey = document.getElementById('configureOptions_spec.attestation.spec.privateKey')
    userEvent.click(cogPrivateKey!)
    await waitFor(() => expect(modals.length).toBe(1))
    const privateKeyCogModal = modals[0] as HTMLElement
    await doConfigureOptionsTesting(privateKeyCogModal, privateKey)
  })
})
