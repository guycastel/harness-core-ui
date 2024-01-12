/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, act, findByText, getByText as getElementByText, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RUNTIME_INPUT_VALUE } from '@harness/uicore'

import routes from '@common/RouteDefinitions'
import { queryByNameAttribute } from '@common/utils/testUtils'
import { accountPathProps, inputSetFormPathProps, pipelineModuleParams } from '@common/utils/routeUtils'
import type { InputSetPathProps, ModulePathParams, PipelinePathProps } from '@common/interfaces/RouteInterfaces'
import { awsConnectorListResponse } from '@platform/connectors/components/ConnectorReferenceField/__tests__/mocks'
import { TestStepWidget, factory } from '@pipeline/components/PipelineSteps/Steps/__tests__/StepTestUtil'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { awsRegions } from './helper'
import { AwsSamInfraSpec } from '../AwsSamInfraSpec'

const fetchConnector = jest.fn().mockReturnValue({ data: awsConnectorListResponse.data?.content?.[1] })

jest.mock('services/cd-ng', () => ({
  getConnectorListV2Promise: jest.fn().mockImplementation(() => Promise.resolve(awsConnectorListResponse)),
  useGetConnector: jest.fn().mockImplementation(() => {
    return { data: awsConnectorListResponse.data?.content?.[1], refetch: fetchConnector, loading: false }
  })
}))

jest.mock('services/portal', () => ({
  useListAwsRegions: jest.fn().mockImplementation(() => {
    return { data: awsRegions, loading: false }
  })
}))

const existingInitialValues = {
  connectorRef: 'Aws_Connector_2',
  region: 'us-gov-east-1',
  provisioner: 'Terraform_1'
}

const template = {
  connectorRef: RUNTIME_INPUT_VALUE,
  region: RUNTIME_INPUT_VALUE,
  provisioner: RUNTIME_INPUT_VALUE
}

const TEST_PATH = routes.toInputSetForm({ ...accountPathProps, ...inputSetFormPathProps, ...pipelineModuleParams })

const TEST_PATH_PARAMS: ModulePathParams & PipelinePathProps & InputSetPathProps = {
  accountId: 'testAccountId',
  orgIdentifier: 'testOrg',
  projectIdentifier: 'testProject',
  pipelineIdentifier: 'Pipeline_1',
  module: 'cd',
  inputSetIdentifier: 'testInputSet'
}

const onUpdate = jest.fn()
factory.registerStep(new AwsSamInfraSpec())

describe('AwsSamInfraSpecInputForm tests', () => {
  beforeEach(() => {
    onUpdate.mockReset()
  })

  test('use existing values to render infra fields and change values', async () => {
    const { getByTestId, container, getByText } = render(
      <TestStepWidget
        testWrapperProps={{
          path: TEST_PATH,
          pathParams: TEST_PATH_PARAMS as unknown as Record<string, string>
        }}
        initialValues={existingInitialValues}
        allValues={existingInitialValues}
        readonly={false}
        onUpdate={onUpdate}
        type={StepType.AwsSamInfra}
        stepViewType={StepViewType.InputSet}
        template={template}
        customStepProps={{
          environmentRef: 'Env_1',
          infrastructureRef: 'Infra_Def_1',
          provisioner: [
            {
              step: {
                identifier: 'Terraform_1',
                name: 'Terraform 1',
                type: StepType.TerraformApply,
                spec: {}
              }
            },
            {
              step: {
                identifier: 'Terraform_2',
                name: 'Terraform 2',
                type: StepType.TerraformApply,
                spec: {}
              }
            }
          ]
        }}
      />
    )

    const submitBtn = getByText('Submit')
    const allDropDownIcons = container.querySelectorAll('[data-icon="chevron-down"]')
    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs.length).toBe(0)

    // Check initial existing values
    const regionInput = queryByNameAttribute('region', container) as HTMLInputElement
    expect(regionInput.value).toBe('GovCloud (US-East)')
    const privisionerInput = queryByNameAttribute('provisioner', container) as HTMLInputElement
    expect(privisionerInput.value).toBe('Terraform 1')

    // Provisioner field
    const privisionerDropdownIcon = allDropDownIcons[0]
    await userEvent.click(privisionerDropdownIcon!)
    expect(portalDivs.length).toBe(1)
    const privisionerDropdownPortalDiv = portalDivs[0]
    const privisionerSelectListMenu = privisionerDropdownPortalDiv.querySelector('.bp3-menu')
    const secondOption = await findByText(privisionerSelectListMenu as HTMLElement, 'Terraform 2')
    expect(secondOption).not.toBeNull()
    userEvent.click(secondOption)

    // Choose connectorRef
    const connnectorRefInput = getByTestId(/connectorRef/)
    expect(connnectorRefInput).toBeTruthy()
    act(() => {
      userEvent.click(connnectorRefInput!)
    })
    const dialogs = document.getElementsByClassName('bp3-dialog')
    await waitFor(() => expect(dialogs).toHaveLength(1))
    const connectorSelectorDialog = dialogs[0] as HTMLElement
    const awsConnector1 = await findByText(connectorSelectorDialog, 'Aws Connector 1')
    await waitFor(() => expect(awsConnector1).toBeInTheDocument())
    const awsConnector2 = await findByText(connectorSelectorDialog, 'Aws Connector 2')
    expect(awsConnector2).toBeTruthy()
    userEvent.click(awsConnector1)
    const applySelected = getElementByText(connectorSelectorDialog, 'entityReference.apply')
    userEvent.click(applySelected)

    await waitFor(() => expect(document.getElementsByClassName('bp3-dialog')).toHaveLength(0))

    // Choose region
    const regionDropdownIcon = allDropDownIcons[2]
    await userEvent.click(regionDropdownIcon!)
    expect(portalDivs.length).toBe(3)
    const regionDropdownPortalDiv = portalDivs[2]
    const regionSelectListMenu = regionDropdownPortalDiv.querySelector('.bp3-menu')
    const usEastNVirginiaOption = await findByText(regionSelectListMenu as HTMLElement, 'US East (N. Virginia)')
    expect(usEastNVirginiaOption).not.toBeNull()
    userEvent.click(usEastNVirginiaOption)

    // submit form and verify
    userEvent.click(submitBtn)
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith({
        connectorRef: 'Aws_Connector_1',
        region: 'us-east-1',
        provisioner: 'Terraform_2'
      })
    )
  })

  test('when path prop is passed', async () => {
    const { container } = render(
      <TestStepWidget
        testWrapperProps={{
          path: TEST_PATH,
          pathParams: TEST_PATH_PARAMS as unknown as Record<string, string>
        }}
        initialValues={existingInitialValues}
        allValues={existingInitialValues}
        readonly={false}
        onUpdate={onUpdate}
        type={StepType.AwsSamInfra}
        stepViewType={StepViewType.InputSet}
        template={template}
        path={'stage.spec.infrastructure.infraDefinition.spec'}
        customStepProps={{
          environmentRef: 'Env_1',
          infrastructureRef: 'Infra_Def_1'
        }}
      />
    )

    const regionInput = queryByNameAttribute('stage.spec.infrastructure.infraDefinition.spec.region', container)
    expect(regionInput).toBeInTheDocument()
  })

  test('click on submit without filling values and check if errors appear under each field', async () => {
    const initialValues = {
      connectorRef: '',
      region: ''
    }
    const { container, getByText, getAllByText } = render(
      <TestStepWidget
        testWrapperProps={{
          path: TEST_PATH,
          pathParams: TEST_PATH_PARAMS as unknown as Record<string, string>
        }}
        initialValues={initialValues}
        allValues={initialValues}
        readonly={false}
        onUpdate={onUpdate}
        type={StepType.AwsSamInfra}
        stepViewType={StepViewType.InputSet}
        template={template}
        customStepProps={{
          environmentRef: 'Env_1',
          infrastructureRef: 'Infra_Def_1'
        }}
      />
    )

    const submitBtn = getByText('Submit')

    const regionInput = queryByNameAttribute('region', container)
    expect(regionInput).toBeInTheDocument()
    userEvent.click(submitBtn)
    await waitFor(() => expect(getAllByText('common.validation.fieldIsRequired')).toHaveLength(1))
  })

  test('when template prop is not passed, no fields should be rendered and no errors should appear on Submit', async () => {
    const initialValues = {
      connectorRef: '',
      region: ''
    }
    const { container, getByText, queryByText } = render(
      <TestStepWidget
        testWrapperProps={{
          path: TEST_PATH,
          pathParams: TEST_PATH_PARAMS as unknown as Record<string, string>
        }}
        initialValues={initialValues}
        allValues={initialValues}
        readonly={false}
        onUpdate={onUpdate}
        type={StepType.AwsSamInfra}
        stepViewType={StepViewType.InputSet}
        customStepProps={{
          environmentRef: 'Env_1',
          infrastructureRef: 'Infra_Def_1'
        }}
      />
    )

    const submitBtn = getByText('Submit')

    const regionInput = queryByNameAttribute('region', container)
    expect(regionInput).not.toBeInTheDocument()
    userEvent.click(submitBtn)

    expect(queryByText('fieldRequired')).toBeNull()
    expect(queryByText('common.validation.fieldIsRequired')).toBeNull()
  })
})
