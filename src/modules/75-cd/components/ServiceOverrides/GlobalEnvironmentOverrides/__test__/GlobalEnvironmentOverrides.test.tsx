/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { fireEvent, queryByText, render, screen, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import userEvent from '@testing-library/user-event'
import routes from '@common/RouteDefinitions'
import { modulePathProps, projectPathProps } from '@common/utils/routeUtils'
import { TestWrapper } from '@common/utils/testUtils'

import ServiceOverrides from '../../ServiceOverrides'
import globalEnvironmentListData from './__mocks__/globalEnvironmentListData.json'

jest.mock('@common/hooks', () => ({
  ...(jest.requireActual('@common/hooks') as any),
  useMutateAsGet: jest.fn().mockImplementation(fn => {
    return fn()
  })
}))

export const serviceAccessListData = {
  status: 'SUCCESS',
  data: [
    {
      service: {
        accountId: 'AQ8xhfNCRtGIUjq5bSM8Fg',
        identifier: 'login4',
        orgIdentifier: 'default',
        projectIdentifier: 'asdsaff',
        name: 'login4',
        description: null,
        deleted: false,
        tags: {},
        version: 0
      },
      createdAt: 1624079631940,
      lastModifiedAt: 1624079631940
    }
  ],
  metaData: null,
  correlationId: 'f92a681d-e852-4685-8584-efbeded5d7bf'
}

const infraListMock = [
  {
    infrastructure: {
      accountId: 'px7xd_BFRCi-pfWPYXVjvw',
      identifier: 'env_as_runtime_and_infra_as_expression_3',
      orgIdentifier: 'default',
      projectIdentifier: 'KanikaTest',
      environmentRef: 'env_for_infra_expression',
      name: 'env as runtime and infra as expression 3',
      tags: {},
      type: 'KubernetesDirect',
      deploymentType: 'Kubernetes',
      yaml: 'infrastructureDefinition:\n  name: env as runtime and infra as expression 3\n  identifier: env_as_runtime_and_infra_as_expression_3\n  orgIdentifier: default\n  projectIdentifier: KanikaTest\n  environmentRef: env_for_infra_expression\n  deploymentType: Kubernetes\n  type: KubernetesDirect\n  spec:\n    connectorRef: account.anup_conn\n    namespace: somename\n    releaseName: release-<+INFRA_KEY_SHORT_ID>\n  allowSimultaneousDeployments: false\n',
      storeType: 'INLINE'
    },
    createdAt: 1701430600838,
    lastModifiedAt: 1701430600838
  }
]

jest.mock('services/cd-ng', () => ({
  ...(jest.requireActual('services/cd-ng') as any),
  useGetServiceAccessList: jest.fn().mockImplementation(
    () =>
      ({
        loading: false,
        data: serviceAccessListData,
        refetch: jest.fn()
      } as any)
  ),
  useGetServiceOverrideListV3: jest.fn().mockImplementation(
    () =>
      ({
        data: {
          data: { content: globalEnvironmentListData }
        },
        refetch: jest.fn()
      } as any)
  ),
  useGetInfrastructureAccessList: jest.fn().mockImplementation(
    () =>
      ({
        loading: false,
        data: {
          status: 'SUCCESS',
          data: infraListMock
        },
        refetch: jest.fn()
      } as any)
  ),
  useGetEnvironmentAccessListV2: jest.fn().mockImplementation(
    () =>
      ({
        loading: false,
        error: undefined,
        mutate: jest.fn().mockResolvedValue({
          data: [
            {
              environment: {
                name: 'Env 1',
                identifier: 'Env_1',
                projectIdentifier: 'dummyProject',
                orgIdentifier: 'dummyOrg',
                accountIdentifier: 'dummyAcc'
              }
            }
          ]
        })
      } as any)
  )
}))

describe('GlobalEnvironmentOverrides test', () => {
  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('should render list of global environment overrides', async () => {
    const { container } = render(
      <TestWrapper
        path={routes.toServiceOverrides({
          ...projectPathProps,
          ...modulePathProps
        })}
        pathParams={{
          accountId: 'dummyAcc',
          orgIdentifier: 'dummyOrg',
          projectIdentifier: 'dummyProject',
          module: 'cd'
        }}
        queryParams={{
          serviceOverrideType: 'ENV_GLOBAL_OVERRIDE'
        }}
      >
        <ServiceOverrides />
      </TestWrapper>
    )

    await waitFor(() => expect(screen.getAllByText('Env_1')).toHaveLength(4))
    expect(screen.getByText('/path/to/application/settings')).toBeInTheDocument()
    expect(screen.getAllByText('Env_2')).toHaveLength(2)
    expect(screen.getByText('GCP')).toBeInTheDocument()

    const filterBtn = container.querySelector('[id="ngfilterbtn"]') as HTMLButtonElement
    fireEvent.click(filterBtn!)

    const envFilterInput = screen.getByPlaceholderText('- pipeline.filters.environmentPlaceholder -')
    const svcFilterInput = screen.getByPlaceholderText('- pipeline.filters.servicePlaceholder -')
    const infraFilterInput = screen.getByPlaceholderText('- cd.serviceOverrides.searchOrSelectInfrastructure -')

    expect(envFilterInput).toBeInTheDocument()
    expect(svcFilterInput).toBeInTheDocument()
    expect(infraFilterInput).toBeInTheDocument()

    const resetBtn = queryByText(document.body, 'filters.clearAll')
    act(() => {
      fireEvent.click(resetBtn!)
    })

    await userEvent.click(svcFilterInput)
    await userEvent.click(screen.queryByText('login4') as HTMLElement)

    await userEvent.click(infraFilterInput)
    await userEvent.click(screen.queryByText('env_as_runtime_and_infra_as_expression_3') as HTMLElement)
    const applyBtn = queryByText(document.body, 'filters.apply')
    act(() => {
      fireEvent.click(applyBtn!)
    })
  })
})
