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
import { StepViewType, StepFormikRef, ValidateInputSetProps } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { factory, TestStepWidget } from '@pipeline/components/PipelineSteps/Steps/__tests__/StepTestUtil'
import { doConfigureOptionsTesting, queryByNameAttribute } from '@common/utils/testUtils'
import { kubernetesConnectorListResponse } from '@modules/27-platform/connectors/components/ConnectorReferenceField/__tests__/mocks'
import { SscaEnforcementStep } from '../SscaEnforcementStep/SscaEnforcementStep'
import { SscaEnforcementStepData } from '../common/types'
import { ciSpecValues, commonDefaultEnforcementSpecValues } from '../common/utils'

const fetchConnector = jest.fn().mockReturnValue({ data: kubernetesConnectorListResponse.data?.content?.[1] })

jest.mock('services/cd-ng', () => ({
  getConnectorListV2Promise: () => Promise.resolve(kubernetesConnectorListResponse),
  useGetConnector: jest.fn().mockImplementation(() => {
    return {
      data: { data: kubernetesConnectorListResponse.data?.content?.[1] },
      refetch: fetchConnector,
      loading: false
    }
  })
}))

jest.mock('@common/components/YAMLBuilder/YamlBuilder')

const runtimeValues = {
  identifier: 'Ssca_Enforcement_Step',
  name: 'SSCA Enforcement Step',
  timeout: RUNTIME_INPUT_VALUE,
  spec: {
    source: {
      type: 'image',
      spec: {
        connector: RUNTIME_INPUT_VALUE,
        image: RUNTIME_INPUT_VALUE
      }
    },
    verifyAttestation: {
      type: 'cosign',
      spec: {
        publicKey: RUNTIME_INPUT_VALUE
      }
    },
    policy: {
      policySets: RUNTIME_INPUT_VALUE
    },
    resources: {
      limits: {
        cpu: RUNTIME_INPUT_VALUE,
        memory: RUNTIME_INPUT_VALUE
      }
    }
  }
}

const existingFixedValues = {
  identifier: 'Ssca_Enforcement_Step',
  name: 'SSCA Enforcement Step',
  timeout: '10s',
  spec: {
    source: {
      type: 'image',
      spec: {
        connector: 'connector',
        image: 'image'
      }
    },
    verifyAttestation: {
      type: 'cosign',
      spec: {
        publicKey: 'testKey'
      }
    },
    policy: {
      store: {
        type: 'Harness',
        spec: {
          file: 'testFilePath'
        }
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

const emptyInitialValues = {
  identifier: 'Ssca_Enforcement_Step',
  name: 'SSCA Enforcement Step',
  timeout: '10s',
  spec: {
    ...commonDefaultEnforcementSpecValues,
    ...ciSpecValues
  }
}

describe('SBOM Enforcement Step', () => {
  beforeAll(() => {
    factory.registerStep(new SscaEnforcementStep())
  })

  test('new step | OPA policy FF Off', async () => {
    render(
      <TestStepWidget
        initialValues={emptyInitialValues}
        type={StepType.SscaEnforcement}
        stepViewType={StepViewType.Edit}
      />
    )
    expect(await screen.findByTestId('file-store-select')).toBeInTheDocument()
    expect(screen.queryByText('ssca.useOpaPolicy')).not.toBeInTheDocument()
    expect(screen.queryByText('common.policiesSets.addOrModifyPolicySet')).not.toBeInTheDocument()
  })

  test('new step | OPA policy FF On', async () => {
    render(
      <TestStepWidget
        initialValues={emptyInitialValues}
        type={StepType.SscaEnforcement}
        stepViewType={StepViewType.Edit}
        testWrapperProps={{
          defaultFeatureFlagValues: { SSCA_ENFORCEMENT_WITH_BOTH_NATIVE_AND_OPA_POLICIES_ENABLED: true }
        }}
      />
    )
    expect(await screen.findByText('common.policiesSets.addOrModifyPolicySet')).toBeInTheDocument()
  })

  test('existing step | OPA policy FF On', async () => {
    const onUpdate = jest.fn()
    const ref = React.createRef<StepFormikRef<unknown>>()
    render(
      <TestStepWidget
        initialValues={existingFixedValues}
        type={StepType.SscaEnforcement}
        stepViewType={StepViewType.Edit}
        onUpdate={onUpdate}
        ref={ref}
        testWrapperProps={{
          defaultFeatureFlagValues: { SSCA_ENFORCEMENT_WITH_BOTH_NATIVE_AND_OPA_POLICIES_ENABLED: true }
        }}
      />
    )
    // existing filesore in edit mode
    const existingFilestore = await screen.findByTestId('file-store-select')

    expect(existingFilestore).toBeInTheDocument()
    await userEvent.click(screen.getByText('ssca.useOpaPolicy'))
    expect(await screen.findByText('common.policiesSets.addOrModifyPolicySet')).toBeInTheDocument()
    expect(existingFilestore).not.toBeInTheDocument()
    await act(() => ref.current?.submitForm()!)

    expect(await screen.findByText('fieldRequired')).toBeInTheDocument()
  })

  test('runtime values edit view', async () => {
    const onUpdate = jest.fn()
    const ref = React.createRef<StepFormikRef<unknown>>()
    render(
      <TestStepWidget
        initialValues={runtimeValues}
        template={runtimeValues}
        type={StepType.SscaEnforcement}
        stepViewType={StepViewType.Edit}
        onUpdate={onUpdate}
        ref={ref}
        testWrapperProps={{
          defaultFeatureFlagValues: { SSCA_ENFORCEMENT_WITH_BOTH_NATIVE_AND_OPA_POLICIES_ENABLED: true }
        }}
      />
    )
    await act(() => ref.current?.submitForm()!)
    expect(onUpdate).toHaveBeenLastCalledWith(runtimeValues)
  })

  test('input set view', async () => {
    render(
      <TestStepWidget
        initialValues={runtimeValues}
        template={runtimeValues}
        type={StepType.SscaEnforcement}
        stepViewType={StepViewType.InputSet}
        testWrapperProps={{
          defaultFeatureFlagValues: { SSCA_ENFORCEMENT_WITH_BOTH_NATIVE_AND_OPA_POLICIES_ENABLED: true }
        }}
      />
    )
    expect(await screen.findByText('common.policiesSets.policyset')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  test('variable view', async () => {
    render(
      <TestStepWidget
        initialValues={existingFixedValues}
        type={StepType.SscaEnforcement}
        stepViewType={StepViewType.InputVariable}
      />
    )
    expect(screen.queryByText('pipelineSteps.stepNameLabel')).not.toBeInTheDocument()
  })

  test('validates error in inputs set', () => {
    const data = {
      data: {
        type: StepType.SscaEnforcement,
        ...runtimeValues
      },
      template: {
        type: StepType.SscaEnforcement,
        ...runtimeValues
      },
      viewType: StepViewType.DeploymentForm,
      getString: jest.fn().mockImplementation(val => val)
    }
    const response = new SscaEnforcementStep().validateInputSet(
      data as unknown as ValidateInputSetProps<SscaEnforcementStepData>
    )
    expect(response).toEqual({})
    expect(new SscaEnforcementStep().processFormData(runtimeValues)).toEqual(runtimeValues)
  })

  test('configure values should work fine for runtime inputs', async () => {
    const onUpdate = jest.fn()
    const ref = React.createRef<StepFormikRef<unknown>>()
    const { container } = render(
      <TestStepWidget
        initialValues={runtimeValues}
        template={runtimeValues}
        type={StepType.SscaEnforcement}
        stepViewType={StepViewType.Edit}
        onUpdate={onUpdate}
        readonly={false}
        ref={ref}
      />
    )

    const modals = document.getElementsByClassName('bp3-dialog')
    expect(modals.length).toBe(0)

    const publicKey = queryByNameAttribute('spec.verifyAttestation.spec.publicKey', container) as HTMLInputElement
    expect(publicKey).toBeInTheDocument()
    const cogPublicKey = document.getElementById('configureOptions_spec.verifyAttestation.spec.publicKey')
    userEvent.click(cogPublicKey!)
    await waitFor(() => expect(modals.length).toBe(1))
    const publicKeyCogModal = modals[0] as HTMLElement
    await doConfigureOptionsTesting(publicKeyCogModal, publicKey)
  })
})
