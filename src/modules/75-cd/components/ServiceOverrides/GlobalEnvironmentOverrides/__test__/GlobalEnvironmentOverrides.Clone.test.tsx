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

jest.mock('@common/hooks', () => ({
  ...(jest.requireActual('@common/hooks') as any),
  useMutateAsGet: jest.fn().mockImplementation(fn => {
    return fn()
  })
}))

const refetchOverrideList = jest.fn()

const overrideListMock1 = {
  data: {
    data: {
      content: [
        {
          identifier: 'Env_1',
          environmentRef: 'Env_1',
          infraIdentifier: undefined,
          serviceRef: undefined,
          orgIdentifier: 'dummyOrg',
          projectIdentifier: 'dummyProject',
          spec: { variables: [{ name: 'var1', type: 'String', value: 'varValue1' }] }
        }
      ]
    }
  },
  refetch: refetchOverrideList
}

const overrideListMock2 = {
  loading: false,
  data: {
    data: {
      content: [
        {
          identifier: 'Env_1',
          environmentRef: 'Env_1',
          infraIdentifier: undefined,
          serviceRef: undefined,
          orgIdentifier: 'dummyOrg',
          projectIdentifier: 'dummyProject',
          spec: {
            variables: [
              { name: 'var1', type: 'String', value: 'varValue1' },
              { name: 'var2', type: 'String', value: 'varValue2' }
            ]
          }
        }
      ]
    }
  },
  refetch: jest.fn()
}

describe('EnvironmentServiceSpecificOverrides Edit test', () => {
  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('edit existing new override', async () => {
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

    const user = userEvent.setup()

    jest.spyOn(cdNgServices, 'useGetServiceOverrideListV3').mockImplementation(() => overrideListMock1 as any)

    jest.spyOn(cdNgServices, 'useGetEnvironmentAccessListV2').mockImplementation(
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

    const upsertServiceOverride = jest.fn()

    jest.spyOn(cdNgServices, 'useUpsertServiceOverrideV2').mockImplementation(
      () =>
        ({
          loading: false,
          error: undefined,
          mutate: upsertServiceOverride.mockResolvedValue({
            data: {
              identifier: 'Env_1',
              environmentRef: 'Env_1',
              infraIdentifier: undefined,
              serviceRef: undefined,
              orgIdentifier: 'dummyOrg',
              projectIdentifier: 'dummyProject',
              spec: { variables: [{ name: 'var2', type: 'String', value: 'varValue2' }] }
            }
          })
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
          serviceOverrideType: 'ENV_GLOBAL_OVERRIDE'
        }}
      >
        <ServiceOverrides />
      </TestWrapper>
    )

    await waitFor(() => expect(screen.getByText('ENVIRONMENT')).toBeInTheDocument())
    expect(screen.queryByText('SERVICE')).not.toBeInTheDocument()
    expect(screen.queryByText('INFRASTRUCTURETEXT')).not.toBeInTheDocument()
    expect(screen.getByText('COMMON.SERVICEOVERRIDES.OVERRIDETYPE')).toBeInTheDocument()

    const editButton = screen.getAllByRole('button')[2]
    await user.click(editButton)

    await waitFor(() => expect(screen.getByTestId('scoped-select-popover-field_environmentRef')).toBeInTheDocument())

    // Edit Variable Value

    const nameInput = screen.getByPlaceholderText('name')

    await waitFor(() => expect(nameInput).toBeInTheDocument())

    await user.clear(nameInput!)
    await user.type(nameInput!, 'var2')

    const valueInput = screen.getByPlaceholderText('valueLabel')

    await waitFor(() => expect(valueInput).toBeInTheDocument())

    await user.clear(valueInput!)
    await user.type(valueInput!, 'varValue2')

    jest.spyOn(cdNgServices, 'useGetServiceOverrideListV3').mockImplementation(() => overrideListMock2 as any)

    // Submit Override
    const submitButton = screen.getByRole('button', { name: 'tick' })

    await user.click(submitButton)

    expect(upsertServiceOverride).toHaveBeenCalledWith({
      environmentRef: 'Env_1',
      infraIdentifier: undefined,
      serviceRef: undefined,
      orgIdentifier: 'dummyOrg',
      projectIdentifier: 'dummyProject',
      spec: {
        variables: [{ name: 'var2', type: 'String', value: 'varValue2' }]
      },
      type: 'ENV_GLOBAL_OVERRIDE'
    })

    await waitFor(() => expect(refetchOverrideList).toHaveBeenCalled)
    expect(screen.getAllByText('CD.OVERRIDEVALUE')).toHaveLength(2)
    expect(screen.getByText('varValue1')).toBeInTheDocument()
    expect(screen.getByText('varValue2')).toBeInTheDocument()
  })
})
