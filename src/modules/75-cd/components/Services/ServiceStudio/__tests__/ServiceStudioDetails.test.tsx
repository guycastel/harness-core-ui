/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { TestWrapper } from '@common/utils/testUtils'
import {
  PipelineContext,
  PipelineContextInterface
} from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { ServiceContext, ServiceContextValues } from '@cd/context/ServiceContext'
import * as cdngServices from 'services/cd-ng'
import ServiceStudioDetails from '../ServiceStudioDetails'
import {
  ServiceStudioDetailsProps,
  pipelineContext,
  mockStageReturnWithoutManifestData,
  serviceContext,
  updateResponse
} from './ServiceStudioDetailsHelper'
import { serviceSchemaMock } from '../ServiceConfiguration/__tests__/ServiceConfigHelper'

jest.spyOn(cdngServices, 'useCreateServiceV2').mockImplementation(() => {
  return { ...updateResponse } as any
})

jest.spyOn(cdngServices, 'useUpdateServiceV2').mockImplementation(() => {
  return {
    mutate: () => updateResponse
  } as any
})
jest.spyOn(cdngServices, 'useGetEntityYamlSchema').mockImplementation(() => {
  return { serviceSchemaMock } as any
})

jest.mock('@common/hooks/useCache', () => {
  const originalModule = jest.requireActual('@common/hooks/useCache')

  return {
    ...originalModule,
    setCache: jest.fn(() => undefined)
  }
})

const getContextValue = (mockData: any): PipelineContextInterface => {
  return {
    ...pipelineContext,
    getStageFromPipeline: jest.fn(() => mockData),
    updateStage: jest.fn(() => {
      undefined
    }),
    updatePipeline: jest.fn(() => undefined),
    updatePipelineView: jest.fn(() => undefined),
    fetchPipeline: jest.fn(() => undefined)
  } as any
}

const getServiceContextValue = (): ServiceContextValues => {
  return {
    ...serviceContext,
    onServiceCreate: jest.fn(() => undefined),
    onCloseModal: jest.fn(() => undefined)
  } as any
}

const ServiceStudioDetailsPropsData = () => {
  return {
    ...ServiceStudioDetailsProps,
    refercedByPanel: (<div></div>) as JSX.Element,
    summaryPanel: (<div></div>) as JSX.Element
  }
}

const servicePropsData = ServiceStudioDetailsPropsData()

const pipelineMockData = getContextValue(mockStageReturnWithoutManifestData)
const serviceMockData = getServiceContextValue()

describe('ServiceStudioDetails', () => {
  test('renders correctly', () => {
    const { container } = render(
      <TestWrapper
        path="account/:accountId/cd/orgs/:orgIdentifier/projects/:projectIdentifier/services/:serviceIdentifier"
        pathParams={{
          accountId: 'dummy',
          orgIdentifier: 'dummy',
          projectIdentifier: 'dummy',
          serviceIdentifier: 'dummy'
        }}
        queryParams={{
          tab: 'summary'
        }}
        defaultAppStoreValues={{
          featureFlags: { CDS_SERVICE_GITX: false, NG_SVC_ENV_REDESIGN: true, CDC_SERVICE_DASHBOARD_REVAMP_NG: true }
        }}
      >
        <ServiceContext.Provider value={serviceMockData as ServiceContextValues}>
          <PipelineContext.Provider value={pipelineMockData}>
            <ServiceStudioDetails {...(servicePropsData as any)} />
          </PipelineContext.Provider>
        </ServiceContext.Provider>
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
  })
  test('discard button functionality after update event', async () => {
    pipelineMockData.state.isUpdated = true
    const { getByText } = render(
      <TestWrapper
        path="account/:accountId/cd/orgs/:orgIdentifier/projects/:projectIdentifier/services/:serviceIdentifier"
        pathParams={{
          accountId: 'dummy',
          orgIdentifier: 'dummy',
          projectIdentifier: 'dummy',
          serviceIdentifier: 'dummy'
        }}
        queryParams={{
          tab: 'configuration'
        }}
        defaultAppStoreValues={{
          featureFlags: { CDS_SERVICE_GITX: false, NG_SVC_ENV_REDESIGN: true, CDC_SERVICE_DASHBOARD_REVAMP_NG: true }
        }}
      >
        <ServiceContext.Provider value={serviceMockData as ServiceContextValues}>
          <PipelineContext.Provider value={pipelineMockData}>
            <ServiceStudioDetails {...(servicePropsData as any)} />
          </PipelineContext.Provider>
        </ServiceContext.Provider>
      </TestWrapper>
    )

    const saveButton = getByText('pipeline.discard')
    fireEvent.click(saveButton)
    await waitFor(() => expect(pipelineMockData.fetchPipeline).toHaveBeenCalled(), { timeout: 3000 })
    await waitFor(() => expect(pipelineMockData.updatePipelineView).toHaveBeenCalled(), { timeout: 3000 })
  })
  test('save and publish functionality', async () => {
    pipelineMockData.state.isUpdated = true
    const { getByText } = render(
      <TestWrapper
        path="account/:accountId/cd/orgs/:orgIdentifier/projects/:projectIdentifier/services/:serviceIdentifier"
        pathParams={{
          accountId: 'dummy',
          orgIdentifier: 'dummy',
          projectIdentifier: 'dummy',
          serviceIdentifier: 'dummy'
        }}
        queryParams={{
          tab: 'configuration'
        }}
        defaultAppStoreValues={{
          featureFlags: { CDS_SERVICE_GITX: false, NG_SVC_ENV_REDESIGN: true, CDC_SERVICE_DASHBOARD_REVAMP_NG: true }
        }}
      >
        <ServiceContext.Provider value={serviceMockData as ServiceContextValues}>
          <PipelineContext.Provider value={pipelineMockData}>
            <ServiceStudioDetails {...(servicePropsData as any)} />
          </PipelineContext.Provider>
        </ServiceContext.Provider>
      </TestWrapper>
    )

    const saveButton = getByText('save')
    fireEvent.click(saveButton)
    await waitFor(() => expect(pipelineMockData.fetchPipeline).toHaveBeenCalled(), { timeout: 3000 })
  })
  test('Service Entity Modal View check', async () => {
    pipelineMockData.state.isUpdated = true
    serviceMockData.isServiceEntityModalView = true
    serviceMockData.serviceCacheKey = 'testingKey'
    serviceMockData.isDeploymentTypeDisabled = true
    const { container, getByText } = render(
      <TestWrapper
        path="account/:accountId/cd/orgs/:orgIdentifier/projects/:projectIdentifier/services/:serviceIdentifier"
        pathParams={{
          accountId: 'dummy',
          orgIdentifier: 'dummy',
          projectIdentifier: 'dummy',
          serviceIdentifier: 'dummy'
        }}
        queryParams={{
          tab: 'configuration'
        }}
        defaultAppStoreValues={{
          featureFlags: { CDS_SERVICE_GITX: false, NG_SVC_ENV_REDESIGN: true, CDC_SERVICE_DASHBOARD_REVAMP_NG: true }
        }}
      >
        <ServiceContext.Provider value={serviceMockData as ServiceContextValues}>
          <PipelineContext.Provider value={pipelineMockData}>
            <ServiceStudioDetails {...(servicePropsData as any)} />
          </PipelineContext.Provider>
        </ServiceContext.Provider>
      </TestWrapper>
    )

    expect(container).toMatchSnapshot()
    const saveButton = getByText('save')
    fireEvent.click(saveButton)
    await waitFor(() => expect(serviceMockData.onServiceCreate).toHaveBeenCalled(), { timeout: 3000 })
  })

  test('handleTabChange functionality', () => {
    pipelineMockData.state.isUpdated = false
    serviceMockData.isServiceEntityModalView = false
    const { getByText, getByTestId } = render(
      <TestWrapper
        path="account/:accountId/cd/orgs/:orgIdentifier/projects/:projectIdentifier/services/:serviceIdentifier"
        pathParams={{
          accountId: 'dummy',
          orgIdentifier: 'dummy',
          projectIdentifier: 'dummy',
          serviceIdentifier: 'dummy'
        }}
        queryParams={{
          tab: 'summary'
        }}
        defaultAppStoreValues={{
          featureFlags: { CDS_SERVICE_GITX: false, NG_SVC_ENV_REDESIGN: true, CDC_SERVICE_DASHBOARD_REVAMP_NG: true }
        }}
      >
        <ServiceContext.Provider value={serviceMockData as ServiceContextValues}>
          <PipelineContext.Provider value={pipelineMockData}>
            <ServiceStudioDetails {...(servicePropsData as any)} />
          </PipelineContext.Provider>
        </ServiceContext.Provider>
      </TestWrapper>
    )
    const referencedByElement = getByText('referencedBy') as HTMLElement
    fireEvent.click(referencedByElement)
    expect(
      getByTestId('location').innerHTML.endsWith(
        'account/dummy/cd/orgs/dummy/projects/dummy/services/dummy?tab=referencedByTab'
      )
    ).toBeTruthy()
  })
  test('renders loading spinner correctly', () => {
    pipelineMockData.state.isLoading = true
    const { container } = render(
      <TestWrapper
        path="account/:accountId/cd/orgs/:orgIdentifier/projects/:projectIdentifier/services/:serviceIdentifier?tab=configuration"
        pathParams={{
          accountId: 'dummy',
          orgIdentifier: 'dummy',
          projectIdentifier: 'dummy',
          serviceIdentifier: 'dummy'
        }}
      >
        <ServiceContext.Provider value={serviceMockData as ServiceContextValues}>
          <PipelineContext.Provider value={pipelineMockData}>
            <ServiceStudioDetails {...(servicePropsData as any)} />
          </PipelineContext.Provider>
        </ServiceContext.Provider>
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
  })
  test('check for unsaved changes to be present', () => {
    pipelineMockData.state.isUpdated = true
    pipelineMockData.state.isLoading = false
    const { getByText } = render(
      <TestWrapper
        path="account/:accountId/cd/orgs/:orgIdentifier/projects/:projectIdentifier/services/:serviceIdentifier"
        pathParams={{
          accountId: 'dummy',
          orgIdentifier: 'dummy',
          projectIdentifier: 'dummy',
          serviceIdentifier: 'dummy'
        }}
        queryParams={{
          tab: 'configuration'
        }}
        defaultAppStoreValues={{
          featureFlags: { CDS_SERVICE_GITX: false, NG_SVC_ENV_REDESIGN: true, CDC_SERVICE_DASHBOARD_REVAMP_NG: true }
        }}
      >
        <ServiceContext.Provider value={serviceMockData as ServiceContextValues}>
          <PipelineContext.Provider value={pipelineMockData}>
            <ServiceStudioDetails {...(servicePropsData as any)} />
          </PipelineContext.Provider>
        </ServiceContext.Provider>
      </TestWrapper>
    )
    const unsavedChangesBtn = getByText('unsavedChanges')
    expect(unsavedChangesBtn).toBeInTheDocument()
  })
})
