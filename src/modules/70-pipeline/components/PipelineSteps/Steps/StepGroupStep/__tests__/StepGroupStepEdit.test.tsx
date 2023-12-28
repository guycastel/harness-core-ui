/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { createRef } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { queryByNameAttribute, TestWrapper } from '@common/utils/testUtils'
import { awsConnectorListResponse } from '@platform/connectors/components/ConnectorReferenceField/__tests__/mocks'
import { StepFormikRef, StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StageType } from '@pipeline/utils/stageHelpers'
import type { StepGroupElementConfig } from 'services/pipeline-ng'
import { StepGroupStepEditRef } from '../StepGroupStepEdit'
import { containerStepGroupInitialValues } from './helper'
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

describe('StepGroupStepEdit tests', () => {
  test('renders as expected in edit view when stepGroupInfra is NOT present', async () => {
    render(
      <TestWrapper>
        <StepGroupStepEditRef
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
      </TestWrapper>
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

  test('renders as expected in EDIT view when stepGroupInfra IS present and state type is Deployment', async () => {
    const onUpdate = jest.fn()
    const ref = createRef<StepFormikRef<StepGroupElementConfig>>()

    const { container } = render(
      <TestWrapper>
        <StepGroupStepEditRef
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
      </TestWrapper>
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
    fireEvent.click(optionalConfigAccordionTitle)

    // Shared Paths
    const firstSharedPathInput = queryByName('sharedPaths[0].value') as HTMLInputElement
    await waitFor(() => expect(firstSharedPathInput).toBeInTheDocument())
    expect(firstSharedPathInput.value).toBe('sp1')
    const secondSharedPathInput = queryByName('sharedPaths[1].value') as HTMLInputElement
    await waitFor(() => expect(secondSharedPathInput).toBeInTheDocument())
    expect(secondSharedPathInput.value).toBe('sp2')

    // Volumes
    const mountPathInput = queryByName('volumes.0.mountPath') as HTMLInputElement
    await waitFor(() => expect(mountPathInput).toBeInTheDocument())
    expect(mountPathInput.value).toBe('mp')
    const typeInput = queryByName('volumes.0.type') as HTMLInputElement
    await waitFor(() => expect(typeInput).toBeInTheDocument())
    expect(typeInput.value).toBe('pipeline.buildInfra.emptyDirectory')
    const mediumInput = queryByName('volumes.0.spec.medium') as HTMLInputElement
    await waitFor(() => expect(mediumInput).toBeInTheDocument())
    expect(mediumInput.value).toBe('m1')
    const sizeInput = queryByName('volumes.0.spec.size') as HTMLInputElement
    await waitFor(() => expect(sizeInput).toBeInTheDocument())
    expect(sizeInput.value).toBe('1Gi')

    // Service Account Name
    const serviceAccountNameInput = queryByName('serviceAccountName') as HTMLInputElement
    expect(serviceAccountNameInput).toBeInTheDocument()
    expect(serviceAccountNameInput.value).toBe('testServiceAccountName')

    // Automount Service Account Token
    const automountServiceAccountToken = await screen.findByText('pipeline.buildInfra.automountServiceAccountToken')
    expect(automountServiceAccountToken).toBeInTheDocument()
    const automountServiceAccountTokenCheckbox = within(automountServiceAccountToken).getByRole('checkbox')
    expect(automountServiceAccountTokenCheckbox).toBeChecked()

    // Labels
    const labelKeyInput = queryByName('labels[0].key') as HTMLInputElement
    await waitFor(() => expect(labelKeyInput).toBeInTheDocument())
    expect(labelKeyInput.value).toBe('k1')
    const labelValueInput = queryByName('labels[0].value') as HTMLInputElement
    await waitFor(() => expect(labelValueInput).toBeInTheDocument())
    expect(labelValueInput.value).toBe('v1')

    // Annotations
    const annotationsKeyInput = queryByName('annotations[0].key') as HTMLInputElement
    await waitFor(() => expect(annotationsKeyInput).toBeInTheDocument())
    expect(annotationsKeyInput.value).toBe('aKey1')
    const annotationsValueInput = queryByName('annotations[0].value') as HTMLInputElement
    await waitFor(() => expect(annotationsValueInput).toBeInTheDocument())
    expect(annotationsValueInput.value).toBe('aValue1')

    // Container Security Context
    const containerSecurityContextTitle = screen.getByText('pipeline.buildInfra.containerSecurityContext')
    expect(containerSecurityContextTitle).toBeInTheDocument()

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
    const firstAddCapabilitiesInput = queryByName('addCapabilities[0].value') as HTMLInputElement
    expect(firstAddCapabilitiesInput).toBeInTheDocument()
    expect(firstAddCapabilitiesInput.value).toBe('c1')

    // Drop Capabilities
    const firstDropCapabilitiesInput = queryByName('dropCapabilities[0].value') as HTMLInputElement
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
    const runAsUserInput = queryByName('runAsUser') as HTMLInputElement
    expect(runAsUserInput).toBeInTheDocument()
    expect(runAsUserInput.value).toBe('2000')

    // Priority Class
    const priorityClassNameInput = queryByName('priorityClassName') as HTMLInputElement
    expect(priorityClassNameInput).toBeInTheDocument()
    expect(priorityClassNameInput.value).toBe('pc1')

    // Node Selector
    const firstNodeSelectorKeyInput = queryByName('nodeSelector[0].key') as HTMLInputElement
    expect(firstNodeSelectorKeyInput).toBeInTheDocument()
    expect(firstNodeSelectorKeyInput.value).toBe('nsKey1')
    const firstNodeSelectorValueInput = queryByName('nodeSelector[0].value') as HTMLInputElement
    expect(firstNodeSelectorValueInput).toBeInTheDocument()
    expect(firstNodeSelectorValueInput.value).toBe('nsValue1')

    // Tolerations
    const effectInput = queryByName('tolerations[0][effect]') as HTMLInputElement
    await waitFor(() => expect(effectInput).toBeInTheDocument())
    expect(effectInput.value).toBe('e1')
    const keyInput = queryByName('tolerations[0][key]') as HTMLInputElement
    await waitFor(() => expect(keyInput).toBeInTheDocument())
    expect(keyInput.value).toBe('k1')
    const operatorInput = queryByName('tolerations[0][operator]') as HTMLInputElement
    await waitFor(() => expect(operatorInput).toBeInTheDocument())
    expect(operatorInput.value).toBe('o1')
    const valueInput = queryByName('tolerations[0][value]') as HTMLInputElement
    await waitFor(() => expect(valueInput).toBeInTheDocument())
    expect(valueInput.value).toBe('v1')

    // Host Names
    const firstHostNamesInput = queryByName('hostNames[0].value') as HTMLInputElement
    expect(firstHostNamesInput).toBeInTheDocument()
    expect(firstHostNamesInput.value).toBe('h1')

    // Init Timeout
    const initTimeoutInput = queryByName('initTimeout') as HTMLInputElement
    expect(initTimeoutInput).toBeInTheDocument()
    expect(initTimeoutInput.value).toBe('20s')

    // Override Image Connector
    const harnessImageConnectorRefLabel = screen.getByText(
      'platform.connectors.title.harnessImageConnectorRef common.optionalLabel'
    )
    expect(harnessImageConnectorRefLabel).toBeInTheDocument()
    // Kubernetes Cluster & Override Image Connector
    const connectorRefInputs = screen.getAllByText('Aws Connector 2')
    expect(connectorRefInputs).toHaveLength(2)

    await act(async () => ref.current?.submitForm())
    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
  })

  test('renders as expected in EDIT view when stepGroupInfra IS present and state type is Build', async () => {
    const onUpdate = jest.fn()
    const ref = createRef<StepFormikRef<StepGroupElementConfig>>()

    const { container } = render(
      <TestWrapper>
        <StepGroupStepEditRef
          initialValues={{
            identifier: 'container_step_group_1',
            name: 'Container Step Group 1',
            steps: []
          }}
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
                type: StageType.BUILD
              }
            }
          }}
        />
      </TestWrapper>
    )

    const queryByName = (nameValue: string): HTMLElement | null => queryByNameAttribute(nameValue, container)

    // Name
    const nameInput = queryByName('name') as HTMLInputElement
    expect(nameInput).toBeInTheDocument()
    expect(nameInput.value).toBe('Container Step Group 1')

    // Enable container based execution switch should be ON
    const enableContainerBasedExecutionSwitch = screen.queryByText('pipeline.enableContainerBasedExecution')
    expect(enableContainerBasedExecutionSwitch).not.toBeInTheDocument()

    // Namespace
    const namespaceInput = queryByName('namespace') as HTMLInputElement
    expect(namespaceInput).not.toBeInTheDocument()

    // Open Optional Configurations
    const optionalConfigAccordionTitle = screen.queryByText('common.optionalConfig')
    expect(optionalConfigAccordionTitle).not.toBeInTheDocument()

    await act(async () => ref.current?.submitForm())
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith({
        identifier: 'container_step_group_1',
        name: 'Container Step Group 1',
        steps: []
      })
    )
  })
})
