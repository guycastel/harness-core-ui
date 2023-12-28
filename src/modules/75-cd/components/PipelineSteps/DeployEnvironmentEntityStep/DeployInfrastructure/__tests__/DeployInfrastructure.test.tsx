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
  render,
  screen,
  waitFor
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Formik } from 'formik'
import { MultiTypeInputType } from '@harness/uicore'

import { useGetInfrastructureList } from 'services/cd-ng'
import routes from '@modules/10-common/RouteDefinitionsV2'
import { TestWrapper, testConnectorRefChange } from '@modules/10-common/utils/testUtils'
import { awsConnectorListResponse } from '@modules/27-platform/connectors/components/ConnectorReferenceField/__tests__/mocks'
import { ServiceDeploymentType } from '@modules/70-pipeline/utils/stageHelpers'
import { PipelineContext } from '@modules/70-pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { pipelineContextAwsSam } from '@modules/70-pipeline/components/PipelineStudio/PipelineContext/__tests__/helper'
import factory from '@modules/70-pipeline/components/PipelineSteps/PipelineStepFactory'
import { updatedInfra } from '@modules/75-cd/pages/get-started-with-cd/DeployProvisioningWizard/__tests__/mocks'
import mockData from '@modules/75-cd/components/EnvironmentsV2/EnvironmentDetails/InfrastructureDefinition/__tests__/__mocks__/serviceMockData.json'
import infrastructureMetadata from '@modules/70-pipeline/components/PipelineInputSetForm/EnvironmentsInputSetForm/__tests__/SingleEnvironmentInputSetForm/__mocks__/responses/infrastructureYamlMetadataList.json'
import DeployInfrastructure from '../DeployInfrastructure'
import { DeployEnvironmentEntityFormState } from '../../types'
import { getInfraListAPIResponseMock } from './mock'
import { AwsSamInfraSpec } from '../../../AwsSam/AwsSamInfraSpec/AwsSamInfraSpec'
import { awsRegions } from '../../../Common/mocks/aws'

const refetchInfrastructureList = jest.fn().mockReturnValue(getInfraListAPIResponseMock)
const fetchConnector = jest.fn().mockReturnValue({ data: awsConnectorListResponse.data?.content?.[1] })
const createInfra = jest.fn()

jest.mock('services/cd-ng', () => ({
  useGetYamlSchema: jest.fn(() => ({ data: null })),
  useGetInfrastructureList: jest.fn().mockImplementation(() => {
    return { data: getInfraListAPIResponseMock, error: null, loading: false, refetch: refetchInfrastructureList }
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
  getServiceAccessListPromise: jest.fn().mockImplementation(() => Promise.resolve(mockData)),
  useGetInfrastructureYamlAndRuntimeInputs: jest.fn().mockImplementation(() => ({
    mutate: jest.fn().mockResolvedValue(infrastructureMetadata),
    loading: false,
    error: null,
    refetch: jest.fn()
  })),
  useGetInfrastructureYamlAndRuntimeInputsV2: jest.fn().mockImplementation(() => ({
    mutate: jest.fn().mockResolvedValue({}),
    loading: false,
    error: null,
    refetch: jest.fn()
  }))
}))

jest.mock('services/pipeline-ng', () => ({
  useCreateVariablesV2: jest.fn(() => ({ refetch: jest.fn().mockResolvedValue({ data: null }) }))
}))

const mockGetCallFunction = jest.fn()
jest.mock('services/template-ng', () => ({
  useGetTemplateList: jest.fn().mockImplementation(args => {
    mockGetCallFunction(args)
    return {
      mutate: jest.fn(() =>
        Promise.resolve({
          status: 'SUCCESS',
          data: {
            content: []
          }
        })
      ),
      cancel: jest.fn(),
      loading: false
    }
  }),
  useGetYamlWithTemplateRefsResolved: jest.fn().mockReturnValue({
    mutate: jest.fn()
  }),
  useGetTemplate: jest.fn().mockImplementation(() => ({}))
}))

jest.mock('services/portal', () => ({
  useListAwsRegions: jest.fn().mockImplementation(() => {
    return { data: awsRegions, loading: false }
  })
}))

const PATH = routes.toEnvironmentDetails({
  accountId: ':accountId',
  orgIdentifier: ':orgIdentifier',
  projectIdentifier: ':projectIdentifier',
  module: 'cd',
  environmentIdentifier: 'env1'
})

const PATH_PARAMS = {
  accountId: 'testAccount',
  orgIdentifier: 'testOrg',
  projectIdentifier: 'testProject',
  module: 'cd',
  environmentIdentifier: 'env1'
}

const awsSamStep = new AwsSamInfraSpec()

describe('DeployInfrastructure tests', () => {
  beforeAll(() => {
    factory.registerStep(awsSamStep)
  })

  afterAll(() => {
    factory.deregisterStep(awsSamStep.getType())
  })

  test('it should pass serviceIdentifiers as a query params to infra list api when CDS_SCOPE_INFRA_TO_SERVICES is true', async () => {
    render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <PipelineContext.Provider value={pipelineContextAwsSam}>
          <Formik<DeployEnvironmentEntityFormState> initialValues={{ category: 'single' }} onSubmit={jest.fn()}>
            {() => (
              <DeployInfrastructure
                deploymentType={ServiceDeploymentType.AwsSam}
                initialValues={{ environment: 'env1', infrastructure: 'infra1' }}
                readonly={false}
                allowableTypes={[MultiTypeInputType.EXPRESSION, MultiTypeInputType.RUNTIME, MultiTypeInputType.FIXED]}
                environmentIdentifier="env1"
                serviceIdentifiers={['service1', 'service2']}
                customDeploymentRef={{ templateRef: '' }}
              />
            )}
          </Formik>
        </PipelineContext.Provider>
      </TestWrapper>
    )

    await waitFor(() => expect(useGetInfrastructureList).toHaveBeenCalled())
    expect(useGetInfrastructureList).toBeCalledWith({
      queryParams: {
        accountIdentifier: 'testAccount',
        deploymentType: ServiceDeploymentType.AwsSam,
        environmentIdentifier: 'env1',
        orgIdentifier: 'testOrg',
        projectIdentifier: 'testProject',
        serviceRefs: ['service1', 'service2']
      },
      queryParamStringifyOptions: {
        arrayFormat: 'repeat'
      }
    })

    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs).toHaveLength(0)

    const newInfraBtn = screen.getByText('common.plusNewName')
    expect(newInfraBtn).toBeInTheDocument()
    await userEvent.click(newInfraBtn)
    await waitFor(() => expect(portalDivs).toHaveLength(1))
    const infraCreationModal = portalDivs[0] as HTMLElement
    expect(infraCreationModal).toBeInTheDocument()
    await waitFor(() => expect(getByText(infraCreationModal!, 'common.newName')).toBeInTheDocument())

    const queryByNameAttribute = (name: string): HTMLElement | null =>
      queryByAttribute('name', infraCreationModal, name)
    const queryAllByValueAttribute = (value: string): HTMLElement[] =>
      queryAllByAttribute('value', infraCreationModal, value)

    const editIcons = queryAllByAttribute('data-icon', infraCreationModal, 'Edit')
    expect(editIcons).toHaveLength(4)

    const nameInput = queryByNameAttribute('name') as HTMLInputElement
    expect(nameInput).toBeInTheDocument()
    expect(nameInput.value).toBe('')
    await userEvent.type(nameInput, 'Test Infra')
    await waitFor(() => expect(nameInput.value).toBe('Test Infra'))

    let scopeToSpecificServicesCheckbox = queryByNameAttribute('scopeToSpecificServices')
    expect(scopeToSpecificServicesCheckbox).toBeInTheDocument()
    let scopedServicesInput = await screen.queryByText('cd.pipelineSteps.serviceTab.selectServices')
    await waitFor(() => expect(scopedServicesInput).not.toBeInTheDocument())

    const awsSamDeploymentTypeLabel = await screen.findByText('pipeline.serviceDeploymentTypes.awsSAM')
    expect(awsSamDeploymentTypeLabel).toBeInTheDocument()

    const awsSamDeploymentTypeInfraTypeCheckboxes = queryAllByValueAttribute(ServiceDeploymentType.AwsSam)
    expect(awsSamDeploymentTypeInfraTypeCheckboxes).toHaveLength(2)

    const awsSamDeploymentTypeCheckbox = awsSamDeploymentTypeInfraTypeCheckboxes[0]
    expect(awsSamDeploymentTypeCheckbox).toBeInTheDocument()
    expect(awsSamDeploymentTypeCheckbox).toBeChecked()

    const awsSamInfraTypeCheckbox = awsSamDeploymentTypeInfraTypeCheckboxes[1]
    expect(awsSamInfraTypeCheckbox).toBeInTheDocument()
    fireEvent.click(awsSamInfraTypeCheckbox)
    await waitFor(() => expect(awsSamInfraTypeCheckbox).toBeChecked())

    const allDropDownIcons = infraCreationModal.querySelectorAll('[data-icon="chevron-down"]')
    await waitFor(() => expect(allDropDownIcons).toHaveLength(2))

    const connnectorRefInput = screen.getByTestId(/connectorRef/)
    expect(connnectorRefInput).toBeTruthy()
    await userEvent.click(connnectorRefInput!)
    await testConnectorRefChange('Aws Connector 1', 'Aws Connector 2', 'Aws Connector 2', 1)

    // Choose region
    const regionSelect = queryByNameAttribute('region') as HTMLInputElement
    const regionDropdownIcon = allDropDownIcons[1]
    await userEvent.click(regionDropdownIcon!)
    expect(portalDivs.length).toBe(3)
    const regionDropdownPortalDiv = portalDivs[2]
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
    await waitFor(() => expect(portalDivs.length).toBe(4))
    const serviceSelectPortalDiv = portalDivs[3] as HTMLElement

    const service1Option = await findByText(serviceSelectPortalDiv, 'Service 1')
    await waitFor(() => expect(service1Option).toBeInTheDocument())
    await userEvent.click(service1Option)
    const applyBtn = screen.getByText('entityReference.apply')
    expect(applyBtn).toBeInTheDocument()
    expect(applyBtn).not.toBeDisabled()
    await userEvent.click(applyBtn)

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
      type: ServiceDeploymentType.AwsSam,
      yaml: `infrastructureDefinition:
  name: Test Infra
  identifier: Test_Infra
  orgIdentifier: testOrg
  projectIdentifier: testProject
  environmentRef: env1
  deploymentType: AWS_SAM
  type: AWS_SAM
  scopedServices:
    - Service_1
  spec:
    connectorRef: Aws_Connector_1
  allowSimultaneousDeployments: false
`
    })
  })

  test('it should NOT pass serviceIdentifiers as a query params to infra list api when CDS_SCOPE_INFRA_TO_SERVICES is false', async () => {
    render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: false, NG_SVC_ENV_REDESIGN: true }}
      >
        <PipelineContext.Provider value={pipelineContextAwsSam}>
          <Formik<DeployEnvironmentEntityFormState> initialValues={{ category: 'single' }} onSubmit={jest.fn()}>
            {() => (
              <DeployInfrastructure
                deploymentType={ServiceDeploymentType.AwsSam}
                initialValues={{ environment: 'env1', infrastructure: 'infra1' }}
                readonly={false}
                allowableTypes={[MultiTypeInputType.EXPRESSION, MultiTypeInputType.RUNTIME, MultiTypeInputType.FIXED]}
                environmentIdentifier="env1"
                serviceIdentifiers={['service1', 'service2']}
                customDeploymentRef={{ templateRef: '' }}
              />
            )}
          </Formik>
        </PipelineContext.Provider>
      </TestWrapper>
    )

    await waitFor(() => expect(useGetInfrastructureList).toHaveBeenCalled())
    expect(useGetInfrastructureList).toBeCalledWith({
      queryParams: {
        accountIdentifier: 'testAccount',
        deploymentType: ServiceDeploymentType.AwsSam,
        environmentIdentifier: 'env1',
        orgIdentifier: 'testOrg',
        projectIdentifier: 'testProject'
      },
      queryParamStringifyOptions: {
        arrayFormat: 'repeat'
      }
    })
  })
})
