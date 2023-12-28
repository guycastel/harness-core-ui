/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import {
  findByText,
  fireEvent,
  getByText,
  queryAllByAttribute,
  queryByAttribute,
  queryByText,
  render,
  screen,
  waitFor
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Scope } from '@modules/10-common/interfaces/SecretsInterface'
import { TestWrapper, testConnectorRefChange } from '@modules/10-common/utils/testUtils'
import routes from '@modules/10-common/RouteDefinitions'
import {
  accountPathProps,
  environmentPathProps,
  orgPathProps,
  projectPathProps
} from '@modules/10-common/utils/routeUtils'
import { awsConnectorListResponse } from '@modules/27-platform/connectors/components/ConnectorReferenceField/__tests__/mocks'
import { ServiceDeploymentType } from '@modules/70-pipeline/utils/stageHelpers'
import { PipelineContext } from '@modules/70-pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { pipelineContextAwsSam } from '@modules/70-pipeline/components/PipelineStudio/PipelineContext/__tests__/helper'
import factory from '@modules/70-pipeline/components/PipelineSteps/PipelineStepFactory'
import { StageErrorContext } from '@modules/70-pipeline/context/StageErrorContext'
import { awsRegions } from '@modules/75-cd/components/PipelineSteps/Common/mocks/aws'
import { updatedInfra } from '@modules/75-cd/pages/get-started-with-cd/DeployProvisioningWizard/__tests__/mocks'
import { AwsSamInfraSpec } from '@modules/75-cd/components/PipelineSteps/AwsSam/AwsSamInfraSpec/AwsSamInfraSpec'
import mockInfrastructureList from './__mocks__/mockInfrastructureList.json'
import { BootstrapDeployInfraDefinitionWithRef } from '../BootstrapDeployInfraDefinition'
import { InfraDefinitionWrapperRef } from '../BootstrapDeployInfraDefinitionWrapper'
import mockData from './__mocks__/serviceMockData.json'

const refetchInfrastructureList = jest.fn().mockReturnValue(mockInfrastructureList)
const fetchConnector = jest.fn().mockReturnValue({ data: awsConnectorListResponse.data?.content?.[1] })
const createInfra = jest.fn()

jest.mock('services/cd-ng', () => ({
  useGetYamlSchema: jest.fn(() => ({ data: null })),
  useGetInfrastructureList: jest.fn().mockImplementation(() => {
    return { data: mockInfrastructureList, error: null, loading: false, refetch: refetchInfrastructureList }
  }),
  useUpdateInfrastructure: jest.fn().mockImplementation(() => {
    return { loading: false, mutate: updatedInfra, cancel: jest.fn(), error: null }
  }),
  useCreateInfrastructure: jest.fn().mockImplementation(() => ({ loading: false, error: null, mutate: createInfra })),
  useCreatePR: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  useCreatePRV2: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  useGetFileContent: jest.fn().mockImplementation(() => ({ refetch: jest.fn() })),
  useGetFileByBranch: jest.fn().mockImplementation(() => ({ refetch: jest.fn() })),
  getConnectorListV2Promise: () => Promise.resolve(awsConnectorListResponse),
  useGetConnector: jest.fn().mockImplementation(() => {
    return { data: { data: awsConnectorListResponse.data?.content?.[1] }, refetch: fetchConnector, loading: false }
  }),
  useGetService: jest.fn().mockImplementation(() => ({ loading: false, data: mockData.data[0], refetch: jest.fn() })),
  getServiceAccessListPromise: jest.fn().mockImplementation(() => Promise.resolve(mockData))
}))

jest.mock('services/portal', () => ({
  useListAwsRegions: jest.fn().mockImplementation(() => {
    return { data: awsRegions, loading: false }
  })
}))

const handleInfrastructureUpdate = jest.fn()

const TEST_PARAMS = {
  accountId: 'testAcc',
  orgIdentifier: 'testOrg',
  projectIdentifier: 'testProject'
}

const TEST_PATH = routes.toPipelineDetail({
  ...accountPathProps,
  ...orgPathProps,
  ...projectPathProps,
  pipelineIdentifier: 'pipeline1'
})

factory.registerStep(new AwsSamInfraSpec())

describe('BootstrapDeployInfraDefinition tests', () => {
  test('it should render infra creation visual view WITH scope service field when CDS_SCOPE_INFRA_TO_SERVICES is true', async () => {
    const ref = React.createRef<InfraDefinitionWrapperRef>()

    const { container } = render(
      <TestWrapper
        path={TEST_PATH}
        pathParams={TEST_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <PipelineContext.Provider value={pipelineContextAwsSam}>
          <StageErrorContext.Provider
            value={{
              state: {
                forms: {},
                errors: {}
              },
              subscribeForm: jest.fn(),
              unSubscribeForm: jest.fn(),
              checkErrorsForTab: jest.fn(),
              submitFormsForTab: jest.fn()
            }}
          >
            <BootstrapDeployInfraDefinitionWithRef
              closeInfraDefinitionDetails={jest.fn()}
              refetch={refetchInfrastructureList}
              environmentIdentifier={'env1'}
              isReadOnly={false}
              scope={Scope.PROJECT}
              handleInfrastructureUpdate={handleInfrastructureUpdate}
              isInfraUpdated={false}
              isSingleEnv={true}
              ref={ref}
            />
          </StageErrorContext.Provider>
        </PipelineContext.Provider>
      </TestWrapper>
    )

    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)
    const queryAllByValueAttribute = (value: string): HTMLElement[] => queryAllByAttribute('value', container, value)

    const identifierEditIcons = queryAllByAttribute('data-icon', container, 'Edit')
    expect(identifierEditIcons).toHaveLength(3)

    const nameInput = queryByNameAttribute('name') as HTMLInputElement
    expect(nameInput).toBeInTheDocument()
    expect(nameInput.value).toBe('')
    await userEvent.type(nameInput, 'Test Infra')
    await waitFor(() => expect(nameInput.value).toBe('Test Infra'))

    let scopeToSpecificServicesCheckbox = queryByNameAttribute('scopeToSpecificServices')
    expect(scopeToSpecificServicesCheckbox).not.toBeInTheDocument()
    let scopedServicesInput = await screen.queryByText('cd.pipelineSteps.serviceTab.selectServices')
    await waitFor(() => expect(scopedServicesInput).not.toBeInTheDocument())

    const awsSamDeploymentTypeLabel = await screen.findByText('pipeline.serviceDeploymentTypes.awsSAM')
    expect(awsSamDeploymentTypeLabel).toBeInTheDocument()
    await userEvent.click(awsSamDeploymentTypeLabel)

    const awsSamDeploymentTypeInfraTypeCheckboxes = queryAllByValueAttribute(ServiceDeploymentType.AwsSam)
    await waitFor(() => expect(awsSamDeploymentTypeInfraTypeCheckboxes).toHaveLength(2))

    const awsSamDeploymentTypeCheckbox = awsSamDeploymentTypeInfraTypeCheckboxes[0]
    expect(awsSamDeploymentTypeCheckbox).toBeInTheDocument()
    expect(awsSamDeploymentTypeCheckbox).toBeChecked()

    const awsSamInfraTypeCheckbox = awsSamDeploymentTypeInfraTypeCheckboxes[1]
    expect(awsSamInfraTypeCheckbox).toBeInTheDocument()
    expect(awsSamInfraTypeCheckbox).toBeChecked()

    const allDropDownIcons = container.querySelectorAll('[data-icon="chevron-down"]')
    await waitFor(() => expect(allDropDownIcons).toHaveLength(2))
    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs.length).toBe(0)

    const connnectorRefInput = screen.getByTestId(/connectorRef/)
    expect(connnectorRefInput).toBeTruthy()
    await userEvent.click(connnectorRefInput!)
    await testConnectorRefChange('Aws Connector 1', 'Aws Connector 2', 'Aws Connector 2')

    // Choose region
    const regionSelect = queryByNameAttribute('region') as HTMLInputElement
    const regionDropdownIcon = allDropDownIcons[1]
    await userEvent.click(regionDropdownIcon!)
    expect(portalDivs.length).toBe(2)
    const regionDropdownPortalDiv = portalDivs[1]
    const regionSelectListMenu = regionDropdownPortalDiv.querySelector('.bp3-menu')
    const usEastNVirginiaOption = await findByText(regionSelectListMenu as HTMLElement, 'US East (N. Virginia)')
    expect(usEastNVirginiaOption).not.toBeNull()
    await userEvent.click(usEastNVirginiaOption)
    await waitFor(() => expect(regionSelect.value).toBe('US East (N. Virginia)'))

    // check Allow simultaneous deployments on the same infrastructure checkbox
    const allowSimultaneousDeploymentsCheckbox = queryByNameAttribute('allowSimultaneousDeployments')
    await userEvent.click(allowSimultaneousDeploymentsCheckbox!)
    expect(allowSimultaneousDeploymentsCheckbox).toBeChecked()

    scopeToSpecificServicesCheckbox = queryByNameAttribute('scopeToSpecificServices')
    expect(scopeToSpecificServicesCheckbox).toBeInTheDocument()
    expect(scopeToSpecificServicesCheckbox).not.toBeChecked()
    await userEvent.click(scopeToSpecificServicesCheckbox!)
    await waitFor(() => expect(scopeToSpecificServicesCheckbox).toBeChecked())

    scopedServicesInput = await screen.findByText('cd.pipelineSteps.serviceTab.selectServices')
    await waitFor(() => expect(scopedServicesInput).toBeInTheDocument())
    await userEvent.click(scopedServicesInput!)
    await waitFor(() => expect(portalDivs.length).toBe(3))
    const serviceSelectPortalDiv = portalDivs[2] as HTMLElement

    const service1Option = await findByText(serviceSelectPortalDiv, 'Service 1')
    await waitFor(() => expect(service1Option).toBeInTheDocument())
    await userEvent.click(service1Option)
    const applyBtn = screen.getByText('entityReference.apply')
    expect(applyBtn).toBeInTheDocument()
    expect(applyBtn).not.toBeDisabled()
    await userEvent.click(applyBtn)

    await waitFor(() => expect(handleInfrastructureUpdate).toHaveBeenCalled())
    await waitFor(() =>
      expect(handleInfrastructureUpdate).toHaveBeenLastCalledWith({
        infrastructureDefinition: {
          allowSimultaneousDeployments: undefined,
          deploymentType: ServiceDeploymentType.AwsSam,
          environmentRef: 'env1',
          orgIdentifier: 'testOrg',
          projectIdentifier: 'testProject',
          scopedServices: ['Service_1'],
          spec: undefined,
          type: undefined
        }
      })
    )

    const saveBtn = screen.getByText('save')
    expect(saveBtn).toBeInTheDocument()
    expect(saveBtn).not.toBeDisabled()
    fireEvent.click(saveBtn)
    await waitFor(() => expect(createInfra).toHaveBeenCalled())
    expect(createInfra).toHaveBeenCalledWith({
      deploymentType: 'AWS_SAM',
      description: undefined,
      environmentRef: 'env1',
      identifier: 'Test_Infra',
      name: 'Test Infra',
      orgIdentifier: 'testOrg',
      projectIdentifier: 'testProject',
      scopedServices: ['Service_1'],
      tags: undefined,
      type: undefined,
      yaml: `infrastructureDefinition:
  name: Test Infra
  identifier: Test_Infra
  orgIdentifier: testOrg
  projectIdentifier: testProject
  environmentRef: env1
  deploymentType: AWS_SAM
  scopedServices:
    - Service_1
`
    })
  })

  test('it should render infra creation visual view WITHOUT scope service field when CDS_SCOPE_INFRA_TO_SERVICES is false', async () => {
    const ref = React.createRef<InfraDefinitionWrapperRef>()

    const { container } = render(
      <TestWrapper
        path={TEST_PATH}
        pathParams={TEST_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: false, NG_SVC_ENV_REDESIGN: true }}
      >
        <PipelineContext.Provider value={pipelineContextAwsSam}>
          <BootstrapDeployInfraDefinitionWithRef
            closeInfraDefinitionDetails={jest.fn()}
            refetch={refetchInfrastructureList}
            environmentIdentifier={'env1'}
            isReadOnly={false}
            scope={Scope.PROJECT}
            handleInfrastructureUpdate={handleInfrastructureUpdate}
            isInfraUpdated={false}
            isSingleEnv={true}
            ref={ref}
          />
        </PipelineContext.Provider>
      </TestWrapper>
    )

    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)
    const queryAllByValueAttribute = (value: string): HTMLElement[] => queryAllByAttribute('value', container, value)

    const nameInput = queryByNameAttribute('name') as HTMLInputElement
    expect(nameInput).toBeInTheDocument()

    const awsSamDeploymentTypeLabel = await screen.findByText('pipeline.serviceDeploymentTypes.awsSAM')
    expect(awsSamDeploymentTypeLabel).toBeInTheDocument()
    await userEvent.click(awsSamDeploymentTypeLabel)

    const awsSamDeploymentTypeInfraTypeCheckboxes = queryAllByValueAttribute(ServiceDeploymentType.AwsSam)
    await waitFor(() => expect(awsSamDeploymentTypeInfraTypeCheckboxes).toHaveLength(2))

    const awsSamDeploymentTypeCheckbox = awsSamDeploymentTypeInfraTypeCheckboxes[0]
    expect(awsSamDeploymentTypeCheckbox).toBeInTheDocument()
    expect(awsSamDeploymentTypeCheckbox).toBeChecked()

    const awsSamInfraTypeCheckbox = awsSamDeploymentTypeInfraTypeCheckboxes[1]
    expect(awsSamInfraTypeCheckbox).toBeInTheDocument()
    expect(awsSamInfraTypeCheckbox).toBeChecked()

    const scopeToSpecificServicesCheckbox = queryByNameAttribute('scopeToSpecificServices')
    expect(scopeToSpecificServicesCheckbox).not.toBeInTheDocument()
    const scopedServicesInput = await screen.queryByText('cd.pipelineSteps.serviceTab.selectServices')
    await waitFor(() => expect(scopedServicesInput).not.toBeInTheDocument())
  })

  test('it should allow only account level services for scoping if account level infra is selected', async () => {
    const ref = React.createRef<InfraDefinitionWrapperRef>()

    const { container } = render(
      <TestWrapper
        path={routes.toEnvironmentDetails({ ...accountPathProps, ...environmentPathProps })}
        pathParams={{
          accountId: 'testAcc',
          environmentIdentifier: 'testEnv'
        }}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <BootstrapDeployInfraDefinitionWithRef
          closeInfraDefinitionDetails={jest.fn()}
          refetch={refetchInfrastructureList}
          environmentIdentifier={'env1'}
          isReadOnly={false}
          scope={Scope.ACCOUNT}
          handleInfrastructureUpdate={handleInfrastructureUpdate}
          isInfraUpdated={false}
          isSingleEnv={true}
          ref={ref}
          selectedInfrastructure="abc"
          infrastructureDefinition={{
            identifier: 'abc',
            name: 'Account Level Infra',
            deploymentType: ServiceDeploymentType.AwsSam,
            type: 'AWS_SAM',
            spec: {
              connectorRef: '',
              region: ''
            }
          }}
        />
      </TestWrapper>
    )

    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)

    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs.length).toBe(0)

    const scopeToSpecificServicesCheckbox = queryByNameAttribute('scopeToSpecificServices')
    expect(scopeToSpecificServicesCheckbox).toBeInTheDocument()
    await userEvent.click(scopeToSpecificServicesCheckbox!)
    await waitFor(() => expect(scopeToSpecificServicesCheckbox).toBeChecked())

    const scopedServicesInput = await screen.findByText('cd.pipelineSteps.serviceTab.selectServices')
    await waitFor(() => expect(scopedServicesInput).toBeInTheDocument())
    await userEvent.click(scopedServicesInput!)
    await waitFor(() => expect(portalDivs.length).toBe(1))
    const serviceSelectPortalDiv = portalDivs[0] as HTMLElement

    expect(getByText(serviceSelectPortalDiv, 'account')).toBeInTheDocument()
    expect(queryByText(serviceSelectPortalDiv, 'orgLabel')).not.toBeInTheDocument()
    expect(queryByText(serviceSelectPortalDiv, 'projectLabel')).not.toBeInTheDocument()
  })

  test('it should allow only account and org level services for scoping if org level infra is selected', async () => {
    const ref = React.createRef<InfraDefinitionWrapperRef>()

    const { container } = render(
      <TestWrapper
        path={routes.toEnvironmentDetails({ ...accountPathProps, ...orgPathProps, ...environmentPathProps })}
        pathParams={{
          accountId: 'testAcc',
          orgIdentifier: 'testOrg',
          environmentIdentifier: 'testEnv'
        }}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <BootstrapDeployInfraDefinitionWithRef
          closeInfraDefinitionDetails={jest.fn()}
          refetch={refetchInfrastructureList}
          environmentIdentifier={'env1'}
          isReadOnly={false}
          scope={Scope.ORG}
          handleInfrastructureUpdate={handleInfrastructureUpdate}
          isInfraUpdated={false}
          isSingleEnv={true}
          ref={ref}
          selectedInfrastructure="abc"
          infrastructureDefinition={{
            identifier: 'abc',
            orgIdentifier: 'testOrg',
            name: 'Account Level Infra',
            deploymentType: ServiceDeploymentType.AwsSam,
            type: 'AWS_SAM',
            spec: {
              connectorRef: '',
              region: ''
            }
          }}
        />
      </TestWrapper>
    )

    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)

    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs.length).toBe(0)

    const scopeToSpecificServicesCheckbox = queryByNameAttribute('scopeToSpecificServices')
    expect(scopeToSpecificServicesCheckbox).toBeInTheDocument()
    await userEvent.click(scopeToSpecificServicesCheckbox!)
    await waitFor(() => expect(scopeToSpecificServicesCheckbox).toBeChecked())

    const scopedServicesInput = await screen.findByText('cd.pipelineSteps.serviceTab.selectServices')
    await waitFor(() => expect(scopedServicesInput).toBeInTheDocument())
    await userEvent.click(scopedServicesInput!)
    await waitFor(() => expect(portalDivs.length).toBe(1))
    const serviceSelectPortalDiv = portalDivs[0] as HTMLElement

    expect(queryByText(serviceSelectPortalDiv, 'account')).toBeInTheDocument()
    expect(queryByText(serviceSelectPortalDiv, 'orgLabel')).toBeInTheDocument()
    expect(queryByText(serviceSelectPortalDiv, 'projectLabel')).not.toBeInTheDocument()
  })

  test('it should allow services from all scopes for scoping if project level infra is selected', async () => {
    const ref = React.createRef<InfraDefinitionWrapperRef>()

    const { container } = render(
      <TestWrapper
        path={routes.toEnvironmentDetails({
          ...accountPathProps,
          ...orgPathProps,
          ...projectPathProps,
          ...environmentPathProps
        })}
        pathParams={{
          accountId: 'testAcc',
          orgIdentifier: 'testOrg',
          projectIdentifier: 'testProject',
          environmentIdentifier: 'testEnv'
        }}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <BootstrapDeployInfraDefinitionWithRef
          closeInfraDefinitionDetails={jest.fn()}
          refetch={refetchInfrastructureList}
          environmentIdentifier={'env1'}
          isReadOnly={false}
          scope={Scope.PROJECT}
          handleInfrastructureUpdate={handleInfrastructureUpdate}
          isInfraUpdated={false}
          isSingleEnv={true}
          ref={ref}
          selectedInfrastructure="abc"
          infrastructureDefinition={{
            identifier: 'abc',
            orgIdentifier: 'testOrg',
            projectIdentifier: 'testProject',
            name: 'Project Level Infra',
            deploymentType: ServiceDeploymentType.AwsSam,
            type: 'AWS_SAM',
            spec: {
              connectorRef: '',
              region: ''
            }
          }}
        />
      </TestWrapper>
    )

    const queryByNameAttribute = (name: string): HTMLElement | null => queryByAttribute('name', container, name)

    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs.length).toBe(0)

    const scopeToSpecificServicesCheckbox = queryByNameAttribute('scopeToSpecificServices')
    expect(scopeToSpecificServicesCheckbox).toBeInTheDocument()
    await userEvent.click(scopeToSpecificServicesCheckbox!)
    await waitFor(() => expect(scopeToSpecificServicesCheckbox).toBeChecked())

    const scopedServicesInput = await screen.findByText('cd.pipelineSteps.serviceTab.selectServices')
    await waitFor(() => expect(scopedServicesInput).toBeInTheDocument())
    await userEvent.click(scopedServicesInput!)
    await waitFor(() => expect(portalDivs.length).toBe(1))
    const serviceSelectPortalDiv = portalDivs[0] as HTMLElement

    expect(queryByText(serviceSelectPortalDiv, 'account')).toBeInTheDocument()
    expect(queryByText(serviceSelectPortalDiv, 'orgLabel')).toBeInTheDocument()
    expect(queryByText(serviceSelectPortalDiv, 'projectLabel')).toBeInTheDocument()
  })
})
