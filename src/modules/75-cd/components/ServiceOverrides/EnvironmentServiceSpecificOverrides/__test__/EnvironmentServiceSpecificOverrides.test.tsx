/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import * as cdNgServices from 'services/cd-ng'

import routes from '@common/RouteDefinitions'
import { modulePathProps, projectPathProps } from '@common/utils/routeUtils'
import { TestWrapper } from '@common/utils/testUtils'

import ServiceOverrides from '../../ServiceOverrides'
import environmentServiceSpecificListData from './__mocks__/environmentServiceSpecificListData.json'

jest.mock('@common/hooks', () => ({
  ...(jest.requireActual('@common/hooks') as any),
  useMutateAsGet: jest.fn().mockImplementation(fn => {
    return fn()
  })
}))

describe('EnvironmentServiceSpecificOverrides test', () => {
  test('should render list of environment service specific overrides', async () => {
    jest.spyOn(cdNgServices, 'useGetServiceAccessList').mockImplementation(
      () =>
        ({
          loading: false,
          data: {
            status: 'SUCCESS',
            data: []
          } as any,
          refetch: jest.fn()
        } as any)
    )

    jest.spyOn(cdNgServices, 'useGetInfrastructureAccessList').mockImplementation(
      () =>
        ({
          loading: false,
          data: {
            status: 'SUCCESS',
            data: []
          } as any,
          refetch: jest.fn()
        } as any)
    )
    jest.spyOn(cdNgServices, 'useGetServiceOverrideListV3').mockImplementation(
      () =>
        ({
          data: {
            data: {}
          },
          refetch: jest.fn()
        } as any)
    )
    render(
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
          serviceOverrideType: 'ENVIRONMENT_SERVICE_SPECIFIC'
        }}
      >
        <ServiceOverrides />
      </TestWrapper>
    )

    const environmentServiceSpecificTab = screen.getByText('common.serviceOverrides.environmentServiceSpecific')

    jest.spyOn(cdNgServices, 'useGetServiceOverrideListV3').mockImplementation(
      () =>
        ({
          data: {
            data: {
              content: environmentServiceSpecificListData
            }
          },
          refetch: jest.fn()
        } as any)
    )

    userEvent.click(environmentServiceSpecificTab)

    await waitFor(() => expect(screen.getAllByText('Env_1')).toHaveLength(1))
    expect(screen.getAllByText('Svc_1')).toHaveLength(1)
    expect(screen.getAllByText('Env_2')).toHaveLength(1)
    expect(screen.getAllByText('Svc_2')).toHaveLength(1)
  })
})
