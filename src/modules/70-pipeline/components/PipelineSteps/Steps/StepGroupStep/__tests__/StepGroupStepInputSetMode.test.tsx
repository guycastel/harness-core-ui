/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'

import { queryByNameAttribute } from '@common/utils/testUtils'
import { awsConnectorListResponse } from '@platform/connectors/components/ConnectorReferenceField/__tests__/mocks'
import { factory, TestStepWidget } from '@pipeline/components/PipelineSteps/Steps/__tests__/StepTestUtil'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { StepGroupStep } from '../StepGroupStep'
import { containerStepGroupInitialValues, containerStepGroupTemplate } from './helper'
import { awsRegions } from './mocks'

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

describe('StepGroupStepInputSetMode tests', () => {
  const stepGroupStep = new StepGroupStep()
  beforeAll(() => {
    factory.registerStep(stepGroupStep)
  })
  afterAll(() => {
    factory.deregisterStep(stepGroupStep.getType())
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

    // Shared Paths
    const firstSharedPathInput = queryByName('sharedPaths[0].value') as HTMLInputElement
    await waitFor(() => expect(firstSharedPathInput).toBeInTheDocument())
    expect(firstSharedPathInput.value).toBe('sp1')
    const secondSharedPathInput = queryByName('sharedPaths[1].value') as HTMLInputElement
    await waitFor(() => expect(secondSharedPathInput).toBeInTheDocument())
    expect(secondSharedPathInput.value).toBe('sp2')

    // Volumes
    const mountPathInput = queryByName('stepGroupInfra.spec.volumes.0.mountPath') as HTMLInputElement
    await waitFor(() => expect(mountPathInput).toBeInTheDocument())
    expect(mountPathInput.value).toBe('mp')
    const typeInput = queryByName('stepGroupInfra.spec.volumes.0.type') as HTMLInputElement
    await waitFor(() => expect(typeInput).toBeInTheDocument())
    expect(typeInput.value).toBe('pipeline.buildInfra.emptyDirectory')
    const mediumInput = queryByName('stepGroupInfra.spec.volumes.0.spec.medium') as HTMLInputElement
    await waitFor(() => expect(mediumInput).toBeInTheDocument())
    expect(mediumInput.value).toBe('m1')
    const sizeInput = queryByName('stepGroupInfra.spec.volumes.0.spec.size') as HTMLInputElement
    await waitFor(() => expect(sizeInput).toBeInTheDocument())
    expect(sizeInput.value).toBe('1Gi')

    // Service Account Name
    const serviceAccountNameInput = queryByName('stepGroupInfra.spec.serviceAccountName') as HTMLInputElement
    expect(serviceAccountNameInput).toBeInTheDocument()
    expect(serviceAccountNameInput.value).toBe('testServiceAccountName')

    // Automount Service Account Token
    const automountServiceAccountToken = await screen.findByText('pipeline.buildInfra.automountServiceAccountToken')
    expect(automountServiceAccountToken).toBeInTheDocument()
    const automountServiceAccountTokenCheckbox = within(automountServiceAccountToken).getByRole('checkbox')
    expect(automountServiceAccountTokenCheckbox).toBeChecked()

    // Privileged
    const previleged = await screen.findByText('pipeline.buildInfra.privileged')
    expect(previleged).toBeInTheDocument()
    const previlegedCheckbox = within(previleged).getByRole('checkbox')
    expect(previlegedCheckbox).toBeChecked()

    // Allow Privilege Escalation
    const allowPrivilegeEscalation = await screen.findByText('pipeline.buildInfra.allowPrivilegeEscalation')
    expect(allowPrivilegeEscalation).toBeInTheDocument()
    const allowPrivilegeEscalationCheckbox = within(allowPrivilegeEscalation).getByRole('checkbox')
    expect(allowPrivilegeEscalationCheckbox).toBeChecked()

    // Add Capabilities
    const firstAddCapabilitiesInput = queryByName(
      'stepGroupInfra.spec.containerSecurityContext.capabilities.add[0].value'
    ) as HTMLInputElement
    expect(firstAddCapabilitiesInput).toBeInTheDocument()
    expect(firstAddCapabilitiesInput.value).toBe('c1')

    // Drop Capabilities
    const firstDropCapabilitiesInput = queryByName(
      'stepGroupInfra.spec.containerSecurityContext.capabilities.drop[0].value'
    ) as HTMLInputElement
    expect(firstDropCapabilitiesInput).toBeInTheDocument()
    expect(firstDropCapabilitiesInput.value).toBe('c2')

    // Run as Non Root
    const runAsNonRoot = await screen.findByText('pipeline.buildInfra.runAsNonRoot')
    expect(previleged).toBeInTheDocument()
    const runAsNonRootCheckbox = within(runAsNonRoot).getByRole('checkbox')
    expect(runAsNonRootCheckbox).toBeChecked()

    // Read-only Root Filesystem
    const readOnlyRootFilesystem = await screen.findByText('pipeline.buildInfra.readOnlyRootFilesystem')
    expect(readOnlyRootFilesystem).toBeInTheDocument()
    const readOnlyRootFilesystemCheckbox = within(readOnlyRootFilesystem).getByRole('checkbox')
    expect(readOnlyRootFilesystemCheckbox).toBeChecked()

    // Run as User
    const runAsUserInput = queryByName('stepGroupInfra.spec.containerSecurityContext.runAsUser') as HTMLInputElement
    expect(runAsUserInput).toBeInTheDocument()
    expect(runAsUserInput.value).toBe('2000')

    // Priority Class
    const priorityClassNameInput = queryByName('stepGroupInfra.spec.priorityClassName') as HTMLInputElement
    expect(priorityClassNameInput).toBeInTheDocument()
    expect(priorityClassNameInput.value).toBe('pc1')

    // Tolerations
    const effectInput = queryByName('stepGroupInfra.spec.tolerations[0][effect]') as HTMLInputElement
    await waitFor(() => expect(effectInput).toBeInTheDocument())
    expect(effectInput.value).toBe('e1')
    const keyInput = queryByName('stepGroupInfra.spec.tolerations[0][key]') as HTMLInputElement
    await waitFor(() => expect(keyInput).toBeInTheDocument())
    expect(keyInput.value).toBe('k1')
    const operatorInput = queryByName('stepGroupInfra.spec.tolerations[0][operator]') as HTMLInputElement
    await waitFor(() => expect(operatorInput).toBeInTheDocument())
    expect(operatorInput.value).toBe('o1')
    const valueInput = queryByName('stepGroupInfra.spec.tolerations[0][value]') as HTMLInputElement
    await waitFor(() => expect(valueInput).toBeInTheDocument())
    expect(valueInput.value).toBe('v1')

    // Host Names
    const firstHostNamesInput = queryByName('stepGroupInfra.spec.hostNames[0].value') as HTMLInputElement
    expect(firstHostNamesInput).toBeInTheDocument()
    expect(firstHostNamesInput.value).toBe('h1')

    // Init Timeout
    const initTimeoutInput = queryByName('stepGroupInfra.spec.initTimeout') as HTMLInputElement
    expect(initTimeoutInput).toBeInTheDocument()
    expect(initTimeoutInput.value).toBe('20s')

    // Override Image Connector
    const harnessImageConnectorRefLabel = screen.getByText(
      'platform.connectors.title.harnessImageConnectorRef common.optionalLabel'
    )
    expect(harnessImageConnectorRefLabel).toBeInTheDocument()
  })
})
