/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, fireEvent, waitFor, queryByAttribute } from '@testing-library/react'
import mockImport from 'framework/utils/mockImport'

import { TestWrapper, findDialogContainer } from '@common/utils/testUtils'
import { serviceListResponse, serviceListResponseWithoutIdentifier } from '@cd/mock'
import routes from '@common/RouteDefinitions'
import { accountPathProps } from '@common/utils/routeUtils'
import { ServicesListPage } from '../ServicesListPage/ServicesListPage'

const mockRepositories = ['test-repo', 'gitX-repo']

jest.mock('services/cd-ng', () => {
  return {
    useGetServiceList: jest.fn(() => ({
      data: serviceListResponse,
      loading: false,
      refetch: jest.fn()
    })),
    useGetYamlSchema: jest.fn(() => ({ data: null })),
    useCreateServiceV2: jest.fn(() => ({ mutate: jest.fn() })),
    useUpsertServiceV2: jest.fn(() => ({ mutate: jest.fn() })),
    useDeleteServiceV2: jest.fn(() => ({ mutate: jest.fn() })),
    useGetSettingsList: jest.fn().mockResolvedValue({}),
    useGetSettingValue: jest.fn().mockResolvedValue({}),
    useGetRepositoryList: jest.fn().mockImplementation(() => {
      return { data: { data: { repositories: mockRepositories } }, loading: false }
    }),
    useCreatePR: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
    useCreatePRV2: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
    useGetFileContent: jest.fn().mockImplementation(() => ({ refetch: jest.fn() })),
    useGetFileByBranch: jest.fn().mockImplementation(() => ({ refetch: jest.fn() }))
  }
})

describe('ServicesListPage', () => {
  test('ServicesListPage should render data correctly', async () => {
    const { container } = render(
      <TestWrapper
        path="/account/:accountId/cd/orgs/:orgIdentifier/projects/:projectIdentifier/services"
        pathParams={{ accountId: 'dummy', orgIdentifier: 'dummy', projectIdentifier: 'dummy' }}
      >
        <ServicesListPage />
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
  })

  test('Service row click should redirect to service details page when identifier is present', async () => {
    const { getByTestId, container } = render(
      <TestWrapper
        path="/account/:accountId/:module/orgs/:orgIdentifier/projects/:projectIdentifier/services"
        pathParams={{ accountId: 'dummy', orgIdentifier: 'dummy', projectIdentifier: 'dummy', module: 'cd' }}
      >
        <ServicesListPage />
      </TestWrapper>
    )

    const row = container.getElementsByClassName('TableV2--row TableV2--card TableV2--clickable')[0]
    fireEvent.click(row!)
    await waitFor(() => getByTestId('location'))

    expect(getByTestId('location')).toHaveTextContent('/account/dummy/cd/orgs/dummy/projects/dummy/services/dfg')
  })

  test('Service row click should show error when identifier is not present', async () => {
    mockImport('services/cd-ng', {
      useGetServiceList: () => ({
        data: serviceListResponseWithoutIdentifier,
        loading: false,
        refetch: jest.fn()
      })
    })

    const { getByText, container } = render(
      <TestWrapper
        path="/account/:accountId/:module/orgs/:orgIdentifier/projects/:projectIdentifier/services"
        pathParams={{ accountId: 'dummy', orgIdentifier: 'dummy', projectIdentifier: 'dummy', module: 'cd' }}
      >
        <ServicesListPage />
      </TestWrapper>
    )

    const row = container.getElementsByClassName('TableV2--row TableV2--card TableV2--clickable')[0]
    fireEvent.click(row!)
    await waitFor(() => expect(getByText('cd.serviceList.noIdentifier')).toBeInTheDocument())
  })

  test('Should open Add-ServiceModal, grid and list view on click', async () => {
    mockImport('services/cd-ng', {
      useGetServiceList: () => ({
        data: serviceListResponse,
        loading: false,
        refetch: jest.fn()
      })
    })
    const { container } = render(
      <TestWrapper
        path="/account/:accountId/cd/orgs/:orgIdentifier/projects/:projectIdentifier/services"
        pathParams={{ accountId: 'dummy', orgIdentifier: 'dummy', projectIdentifier: 'dummy' }}
      >
        <ServicesListPage />
      </TestWrapper>
    )
    fireEvent.click(container.querySelector('[data-testid="add-service"]') as HTMLElement)
    const form = findDialogContainer()
    expect(form).toBeTruthy()
    expect(form).toMatchSnapshot()
    fireEvent.click(container.querySelector('[icon="grid-view"]') as HTMLElement)
    fireEvent.click(container.querySelector('[icon="list"]') as HTMLElement)
    expect(container).toMatchSnapshot()
  })

  test('ServicesListPage should show loader while API call is loading', async () => {
    mockImport('services/cd-ng', {
      useGetServiceList: () => ({
        data: {},
        loading: true,
        refetch: jest.fn()
      })
    })
    const { getByText } = render(
      <TestWrapper
        path="/account/:accountId/cd/orgs/:orgIdentifier/projects/:projectIdentifier/services"
        pathParams={{ accountId: 'dummy', orgIdentifier: 'dummy', projectIdentifier: 'dummy' }}
      >
        <ServicesListPage />
      </TestWrapper>
    )
    expect(getByText('Loading, please wait...')).toBeInTheDocument()
  })

  test('Repo Filter for remote service', async () => {
    mockImport('services/cd-ng', {
      useGetServiceList: () => ({
        data: serviceListResponse,
        loading: false,
        refetch: jest.fn()
      })
    })
    const { getByText } = render(
      <TestWrapper
        path={routes.toServices({ ...accountPathProps, accountRoutePlacement: 'settings' })}
        pathParams={{ accountId: 'dummy', orgIdentifier: 'dummy', projectIdentifier: 'dummy' }}
        defaultFeatureFlagValues={{ CDS_SERVICE_GITX: true }}
      >
        <ServicesListPage />
      </TestWrapper>
    )

    expect(getByText('common.selectRepository')).toBeInTheDocument()
    fireEvent.click(getByText('common.selectRepository'))
    expect(getByText(mockRepositories[0])).toBeInTheDocument()
    expect(getByText(mockRepositories[1])).toBeInTheDocument()
    fireEvent.click(getByText(mockRepositories[0]))
    expect(queryByAttribute('data-testid', document.body, 'repo-filter')).toHaveTextContent(mockRepositories[0])
  })
})
