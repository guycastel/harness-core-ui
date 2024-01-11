/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { getByText, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import * as cdNgServices from 'services/cd-ng'

import routes from '@common/RouteDefinitions'
import { modulePathProps, projectPathProps } from '@common/utils/routeUtils'
import { TestWrapper, findPopoverContainer, queryByNameAttribute } from '@common/utils/testUtils'

import ServiceOverrides from '../../ServiceOverrides'

const showError = jest.fn()

jest.mock('@harness/uicore', () => ({
  ...jest.requireActual('@harness/uicore'),
  useToaster: () => ({
    showSuccess: jest.fn(),
    showError,
    clear: jest.fn()
  })
}))

jest.mock('services/cd-ng-rq', () => ({
  useGetServiceAccessListQuery: jest.fn(() => ({
    data: {
      data: [
        {
          service: {
            name: 'Svc 1',
            identifier: 'Svc_1',
            projectIdentifier: 'dummyProject',
            orgIdentifier: 'dummyOrg',
            accountIdentifier: 'dummyAcc'
          }
        }
      ]
    },
    isInitialLoading: false
  }))
}))

jest.mock('@common/hooks', () => ({
  ...(jest.requireActual('@common/hooks') as any),
  useMutateAsGet: jest.fn().mockImplementation(fn => {
    return fn()
  })
}))

const serviceOverrideListMock1 = {
  data: {
    data: {}
  },
  refetch: jest.fn()
}

const serviceOverrideListMock2 = {
  loading: false,
  error: undefined,
  data: {
    data: {
      content: [
        {
          identifier: 'Env_1_Infra_1_Svc_1',
          environmentRef: 'Env_1',
          infraIdentifier: 'Infra_1',
          serviceRef: 'Svc_1',
          orgIdentifier: 'dummyOrg',
          projectIdentifier: 'dummyProject',
          spec: { variables: [{ name: 'var1', type: 'String', value: 'varValue1' }] }
        }
      ]
    }
  }
}

const environmentMock = {
  loading: false,
  error: undefined,
  data: {
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
  }
}

describe('InfrastructureServiceSpecificOverrides Create test', () => {
  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('create new override', async () => {
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
    jest.spyOn(cdNgServices, 'useGetServiceOverrideListV3').mockImplementation(() => serviceOverrideListMock1 as any)

    jest.spyOn(cdNgServices, 'useGetEnvironmentAccessListV2').mockImplementation(() => environmentMock as any)

    const refetchInfra = jest.fn()
    const upsertServiceOverride = jest.fn()

    jest.spyOn(cdNgServices, 'useGetInfrastructureList').mockImplementation(
      () =>
        ({
          loading: false,
          error: undefined,
          data: null,
          refetch: refetchInfra
        } as any)
    )

    jest.spyOn(cdNgServices, 'useUpsertServiceOverrideV2').mockImplementation(
      () =>
        ({
          loading: false,
          error: undefined,
          mutate: upsertServiceOverride.mockResolvedValue({
            data: {
              environmentRef: 'Env_1',
              infraIdentifier: 'Infra_1',
              serviceRef: 'Svc_1',
              orgIdentifier: 'dummyOrg',
              projectIdentifier: 'dummyProject',
              spec: { variables: [{ name: 'var1', type: 'String', value: 'varValue1' }] }
            }
          })
        } as any)
    )

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
          serviceOverrideType: 'INFRA_SERVICE_OVERRIDE'
        }}
      >
        <ServiceOverrides />
      </TestWrapper>
    )

    await waitFor(() =>
      expect(screen.getByText('common.serviceOverrides.noOverrides.infrastructureServiceSpecific')).toBeInTheDocument()
    )

    const createNewOverrideButton = screen.getAllByRole('button', {
      name: 'common.serviceOverrides.newOverride'
    })[0]

    await userEvent.click(createNewOverrideButton)

    await waitFor(() => expect(screen.getByText('ENVIRONMENT')).toBeInTheDocument())
    expect(screen.getByText('SERVICE')).toBeInTheDocument()
    expect(screen.getByText('INFRASTRUCTURETEXT')).toBeInTheDocument()
    expect(screen.getByText('COMMON.SERVICEOVERRIDES.OVERRIDETYPE')).toBeInTheDocument()

    // Submit and check for error

    const submitButton = screen.getByRole('button', { name: 'tick' })
    await userEvent.click(submitButton)

    await waitFor(() => expect(showError).toHaveBeenCalled())

    // Select Environment

    const environmentSelect = screen.getByTestId('scoped-select-popover-field_environmentRef')

    await userEvent.click(environmentSelect)

    await waitFor(() => expect(findPopoverContainer()).toBeInTheDocument())
    const environmentPopoverContainer = findPopoverContainer()

    getByText(environmentPopoverContainer!, 'Env 1').click()

    await waitFor(() => expect(refetchInfra).toHaveBeenCalled())

    jest.spyOn(cdNgServices, 'useGetInfrastructureList').mockImplementationOnce(
      () =>
        ({
          loading: false,
          error: undefined,
          data: {
            data: {
              content: [
                {
                  infrastructure: {
                    name: 'Infra 1',
                    identifier: 'Infra_1',
                    projectIdentifier: 'dummyProject',
                    orgIdentifier: 'dummyOrg',
                    accountIdentifier: 'dummyAcc'
                  }
                }
              ]
            }
          },
          refetch: refetchInfra
        } as any)
    )

    await waitFor(() => expect(findPopoverContainer()).not.toBeInTheDocument())

    // Submit and check for error

    await userEvent.click(submitButton)

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(2))

    // Select Infrastructure

    const infrastructureSelect = queryByNameAttribute('infraIdentifier', container)
    await userEvent.click(infrastructureSelect!)

    await waitFor(() => expect(findPopoverContainer()).toBeInTheDocument())
    const infraPopoverContainer = findPopoverContainer()

    await waitFor(() => expect(getByText(infraPopoverContainer!, 'Infra 1')).toBeInTheDocument())
    getByText(infraPopoverContainer!, 'Infra 1').click()

    await waitFor(() => expect(findPopoverContainer()).not.toBeInTheDocument())

    // Submit and check for error

    await userEvent.click(submitButton)

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(3))

    // Select Service

    const serviceSelect = screen.getByTestId('scoped-select-popover-field_serviceRef')

    await userEvent.click(serviceSelect)

    await waitFor(() => expect(findPopoverContainer()).toBeInTheDocument())
    const servicePopoverContainer = findPopoverContainer()

    getByText(servicePopoverContainer!, 'Svc 1').click()

    await waitFor(() => expect(findPopoverContainer()).not.toBeInTheDocument())

    // Submit and check for error

    await userEvent.click(submitButton)

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(4))

    // Select Override Type

    const typeSelect = queryByNameAttribute('overrideType', container)
    await userEvent.click(typeSelect!)

    await waitFor(() => expect(findPopoverContainer()).toBeInTheDocument())
    const popoverContainer2 = findPopoverContainer()

    getByText(popoverContainer2!, 'variableLabel').click()

    await waitFor(() => expect(findPopoverContainer()).not.toBeInTheDocument())

    // Submit and check for error

    await userEvent.click(submitButton)

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(5))

    // Enter Variable Name

    const nameInput = queryByNameAttribute('variables.0.name', container)

    await waitFor(() => expect(nameInput).toBeInTheDocument())

    await userEvent.type(nameInput!, 'var1')

    // Submit and check for error

    await userEvent.click(submitButton)

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(6))

    // Select Variable Type

    const variableTypeInput = queryByNameAttribute('variables.0.type', container)

    await userEvent.click(variableTypeInput!)

    await waitFor(() => expect(findPopoverContainer()).toBeInTheDocument())
    const popoverContainer3 = findPopoverContainer()

    getByText(popoverContainer3!, 'string').click()

    await waitFor(() => expect(findPopoverContainer()).not.toBeInTheDocument())

    // Submit and check for error

    await userEvent.click(submitButton)

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(7))

    // Enter Variable Value

    const valueInput = queryByNameAttribute('variables.0.value', container)

    await waitFor(() => expect(valueInput).toBeInTheDocument())

    await userEvent.type(valueInput!, 'varValue1')

    jest.spyOn(cdNgServices, 'useGetServiceOverrideListV3').mockImplementation(() => serviceOverrideListMock2 as any)

    // Create Override

    await userEvent.click(submitButton)

    expect(upsertServiceOverride).toBeCalledWith({
      environmentRef: 'Env_1',
      infraIdentifier: 'Infra_1',
      orgIdentifier: 'dummyOrg',
      projectIdentifier: 'dummyProject',
      serviceRef: 'Svc_1',
      spec: { variables: [{ name: 'var1', type: 'String', value: 'varValue1' }] },
      type: 'INFRA_SERVICE_OVERRIDE'
    })

    await waitFor(() => expect(screen.getByText('Env_1')).toBeInTheDocument())
    expect(screen.getByText('Infra_1')).toBeInTheDocument()
    expect(screen.getByText('Svc_1')).toBeInTheDocument()
  })
})
