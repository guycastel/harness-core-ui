/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import userEvent from '@testing-library/user-event'
import { findByText, render, screen, waitFor, within } from '@testing-library/react'
import { RUNTIME_INPUT_VALUE } from '@harness/uicore'

import type { AwsSamInfrastructure } from 'services/cd-ng'
import routes from '@common/RouteDefinitions'
import type { CompletionItemInterface } from '@common/interfaces/YAMLBuilderProps'
import type { ModulePathParams, PipelinePathProps } from '@common/interfaces/RouteInterfaces'
import { modulePathProps, pipelinePathProps, projectPathProps } from '@common/utils/routeUtils'
import { queryByNameAttribute, testConnectorRefChange } from '@common/utils/testUtils'
import { awsConnectorListResponse } from '@platform/connectors/components/ConnectorReferenceField/__tests__/mocks'
import { TestStepWidget, factory } from '@pipeline/components/PipelineSteps/Steps/__tests__/StepTestUtil'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { StepFormikRef, StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { getYaml, invalidYaml, awsRegions } from './helper'
import { AwsSamInfraSpec } from '../AwsSamInfraSpec'

const fetchConnector = jest.fn().mockReturnValue({ data: awsConnectorListResponse.data?.content?.[1] })

jest.mock('services/cd-ng', () => ({
  getConnectorListV2Promise: () => Promise.resolve(awsConnectorListResponse),
  useGetConnector: jest.fn().mockImplementation(() => {
    return { data: { data: awsConnectorListResponse.data?.content?.[1] }, refetch: fetchConnector, loading: false }
  })
}))

jest.mock('services/portal', () => ({
  useListAwsRegions: jest.fn().mockImplementation(() => {
    return { data: awsRegions, loading: false }
  })
}))

const existingInitialValues = {
  infrastructureDefinition: {
    spec: {
      connectorRef: 'Aws_Connector_1',
      region: 'US East (N. Virginia)'
    }
  }
}

const emptyInitialValues = {
  connectorRef: '',
  region: ''
}

const TEST_PATH = routes.toPipelineStudio({ ...projectPathProps, ...modulePathProps, ...pipelinePathProps })

const TEST_PATH_PARAMS: ModulePathParams & PipelinePathProps = {
  accountId: 'testAccountId',
  orgIdentifier: 'testOrg',
  projectIdentifier: 'testProject',
  pipelineIdentifier: 'Pipeline_1',
  module: 'cd'
}

const onUpdate = jest.fn()
const onChange = jest.fn()
factory.registerStep(new AwsSamInfraSpec())

describe('AwsSamInfraSpec tests', () => {
  test('check infra tab for empty initial values', async () => {
    const ref = React.createRef<StepFormikRef<AwsSamInfrastructure>>()

    const { getByTestId, container } = render(
      <TestStepWidget
        testWrapperProps={{
          path: TEST_PATH,
          pathParams: TEST_PATH_PARAMS as unknown as Record<string, string>
        }}
        initialValues={emptyInitialValues}
        allValues={emptyInitialValues}
        readonly={false}
        onUpdate={onUpdate}
        type={StepType.AwsSamInfra}
        stepViewType={StepViewType.Edit}
        ref={ref}
      />
    )

    const allDropDownIcons = container.querySelectorAll('[data-icon="chevron-down"]')
    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs.length).toBe(0)

    const mapDynamicallyProvisionedInfraCheckboxLabel = screen.getByText(
      'cd.steps.pdcStep.dynamicProvision'
    ).parentElement
    const mapDynamicallyProvisionedInfraCheckbox = within(mapDynamicallyProvisionedInfraCheckboxLabel!).getByRole(
      'checkbox'
    )
    expect(mapDynamicallyProvisionedInfraCheckbox).toBeInTheDocument()
    expect(mapDynamicallyProvisionedInfraCheckbox).not.toBeChecked()
    await userEvent.click(mapDynamicallyProvisionedInfraCheckbox)
    await waitFor(() => expect(mapDynamicallyProvisionedInfraCheckbox).toBeChecked())
    const provisionerInput = queryByNameAttribute('provisioner', container) as HTMLInputElement
    await waitFor(() => expect(provisionerInput).toBeInTheDocument())
    expect(provisionerInput.value).toBe(RUNTIME_INPUT_VALUE)

    // Choose connectorRef
    const connnectorRefInput = getByTestId(/connectorRef/)
    expect(connnectorRefInput).toBeTruthy()
    await userEvent.click(connnectorRefInput!)
    await testConnectorRefChange('Aws Connector 1', 'Aws Connector 2', 'Aws Connector 2')

    // Choose region
    const regionDropdownIcon = allDropDownIcons[1]
    await userEvent.click(regionDropdownIcon!)
    expect(portalDivs.length).toBe(2)
    const regionDropdownPortalDiv = portalDivs[1]
    const regionSelectListMenu = regionDropdownPortalDiv.querySelector('.bp3-menu')
    const usEastNVirginiaOption = await findByText(regionSelectListMenu as HTMLElement, 'US East (N. Virginia)')
    expect(usEastNVirginiaOption).not.toBeNull()
    await userEvent.click(usEastNVirginiaOption)

    // check Allow simultaneous deployments on the same infrastructure checkbox
    const allowSimultaneousDeploymentsCheckbox = queryByNameAttribute('allowSimultaneousDeployments', container)
    await userEvent.click(allowSimultaneousDeploymentsCheckbox!)
    expect(allowSimultaneousDeploymentsCheckbox).toBeChecked()
    // submit form and verify
    ref.current?.submitForm()
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith({
        connectorRef: 'Aws_Connector_1',
        region: 'us-east-1',
        allowSimultaneousDeployments: true,
        provisioner: RUNTIME_INPUT_VALUE
      })
    )
  })

  test('Variables view renders fine', async () => {
    const { getByText } = render(
      <TestStepWidget
        initialValues={existingInitialValues}
        type={StepType.AwsSamInfra}
        onUpdate={onUpdate}
        onChange={onChange}
        stepViewType={StepViewType.InputVariable}
        isNewStep={true}
        customStepProps={{
          stageIdentifier: 'qaStage',
          variablesData: existingInitialValues,
          metadataMap: {
            Aws_Connector_1: {
              yamlProperties: {
                fqn: 'pipeline.stages.qaStage.infrastructure.infrastructureDefinition.spec.AwsSamInfra.connectorRef',
                localName: 'spec.AwsSamInfra.connectorRef'
              }
            },
            'US East (N. Virginia)': {
              yamlProperties: {
                fqn: 'pipeline.stages.qaStage.infrastructure.infrastructureDefinition.spec.AwsSamInfra.region',
                localName: 'spec.AwsSamInfra.region'
              }
            }
          }
        }}
      />
    )

    expect(getByText('connectorRef')).toBeVisible()
    expect(getByText('Aws_Connector_1')).toBeVisible()
    expect(getByText('region')).toBeVisible()
    expect(getByText('US East (N. Virginia)')).toBeVisible()
  })

  test('Variables view should not render fine if variablesData is not sent properly', async () => {
    const wrongInitialValues = {
      connectorRef: 'Aws_Connector_1',
      region: 'US East (N. Virginia)',
      cluster: 'aws-cluster-1'
    }
    const { queryByText } = render(
      <TestStepWidget
        initialValues={wrongInitialValues}
        type={StepType.AwsSamInfra}
        onUpdate={onUpdate}
        onChange={onChange}
        stepViewType={StepViewType.InputVariable}
        isNewStep={true}
        customStepProps={{
          stageIdentifier: 'qaStage',
          variablesData: wrongInitialValues,
          metadataMap: {
            Aws_Connector_1: {
              yamlProperties: {
                fqn: 'pipeline.stages.qaStage.infrastructure.infrastructureDefinition.spec.AwsSamInfra.connectorRef',
                localName: 'spec.AwsSamInfra.connectorRef'
              }
            },
            'US East (N. Virginia)': {
              yamlProperties: {
                fqn: 'pipeline.stages.qaStage.infrastructure.infrastructureDefinition.spec.AwsSamInfra.region',
                localName: 'spec.AwsSamInfra.region'
              }
            }
          }
        }}
      />
    )

    expect(queryByText('connectorRef')).toBeNull()
    expect(queryByText('Aws_Connector_1')).toBeNull()
    expect(queryByText('region')).toBeNull()
    expect(queryByText('US East (N. Virginia)')).toBeNull()
  })
})

const connectorRefPath = 'pipeline.stages.0.stage.spec.infrastructure.infrastructureDefinition.spec.connectorRef'

const params = (): PipelinePathProps & ModulePathParams => ({
  accountId: 'accountId',
  module: 'cd',
  orgIdentifier: 'default',
  pipelineIdentifier: '-1',
  projectIdentifier: 'projectIdentifier'
})

describe('getConnectorsListForYaml test', () => {
  test('when connectorRefPath and yaml both are valid', async () => {
    const step = new AwsSamInfraSpec() as any
    const list: CompletionItemInterface[] = await step.getConnectorsListForYaml(connectorRefPath, getYaml(), params)
    expect(list).toHaveLength(2)
    expect(list[1].insertText).toBe('Aws_Connector_2')
  })

  test('when connectorRefPath is invalid and yaml is valid valid', async () => {
    const step = new AwsSamInfraSpec() as any
    const list: CompletionItemInterface[] = await step.getConnectorsListForYaml('invalid path', getYaml(), params)
    expect(list).toHaveLength(0)
  })

  test('when connectorRefPath is valid and yaml is invalid valid', async () => {
    const step = new AwsSamInfraSpec() as any
    const list: CompletionItemInterface[] = await step.getConnectorsListForYaml('invalid path', invalidYaml(), params)
    expect(list).toHaveLength(0)
  })
})
