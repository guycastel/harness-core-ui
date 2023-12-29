/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import {
  render,
  waitFor,
  findByText as findByTextGlobal,
  queryByAttribute,
  getByText,
  screen
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AllowedTypesWithRunTime, MultiTypeInputType } from '@harness/uicore'
import mockServiceList from '@cd/components/EnvironmentsV2/EnvironmentDetails/ServiceOverrides/__test__/__mocks__/mockServicesListForOverrides.json'

import { TestWrapper, findDialogContainer } from '@common/utils/testUtils'
import DeployServiceEntityWidget from '../DeployServiceEntityWidget'
import services from './services.json'
import metadata from './servicesMetadata.json'
import { setupMode } from '../../PipelineStepsUtil'

const allowableTypes: AllowedTypesWithRunTime[] = [
  MultiTypeInputType.FIXED,
  MultiTypeInputType.EXPRESSION,
  MultiTypeInputType.RUNTIME
]

const defaultFeatureFlagValues = { NG_SVC_ENV_REDESIGN: true }
const initialValues = {
  services: { values: [{ serviceRef: 'svc_1' }, { serviceRef: 'svc_2' }] }
}

jest.mock('services/cd-ng', () => ({
  useGetSettingsList: jest.fn().mockResolvedValue({}),
  useCreateServiceV2: jest.fn().mockReturnValue({
    mutate: jest
      .fn()
      .mockResolvedValue({ status: 'SUCCESS', data: { service: { identifier: 'svc_4', name: 'Service 4' } } })
  }),
  useUpdateServiceV2: jest.fn().mockReturnValue({ mutate: jest.fn().mockResolvedValue({ status: 'SUCCESS' }) }),
  useGetEntityYamlSchema: jest.fn().mockReturnValue({ data: { data: {} } }),
  getServiceAccessListPromise: jest.fn().mockImplementation(() => Promise.resolve(mockServiceList))
}))

jest.mock('services/cd-ng-rq', () => ({
  useGetServiceAccessListQuery: jest.fn(() => ({
    data: { data: services }
  })),
  useGetServicesYamlAndRuntimeInputsV2Query: jest.fn(() => ({
    data: { data: services }
  })),
  useGetServicesYamlAndRuntimeInputsQuery: jest.fn(() => ({ data: { data: metadata } }))
}))

describe('DeployServiceEntityWidget - multi services tests', () => {
  test('user can select multiple services', async () => {
    const onUpdate = jest.fn()
    const { container } = render(
      <TestWrapper defaultFeatureFlagValues={defaultFeatureFlagValues}>
        <DeployServiceEntityWidget
          initialValues={{}}
          allowableTypes={allowableTypes}
          readonly={false}
          stageIdentifier=""
          onUpdate={onUpdate}
          setupModeType={setupMode.DIFFERENT}
        />
      </TestWrapper>
    )

    await waitFor(() => expect(container.querySelector('.bp3-spinner')).not.toBeInTheDocument())

    expect(container).toMatchSnapshot()

    const toggle = container.querySelector('.Toggle--input')!

    await userEvent.click(toggle)

    await userEvent.click(container.querySelector('[class="StyledProps--font StyledProps--main pointer"]')!)

    const serviceText1 = screen.getByText('custom test')
    const serviceText2 = screen.getByText('dwdasd')

    expect(serviceText1).toBeInTheDocument()
    expect(serviceText2).toBeInTheDocument()

    await userEvent.click(serviceText1)
    await userEvent.click(serviceText2)
    await userEvent.click(screen.getByText('entityReference.apply')!)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenLastCalledWith({
        services: {
          metadata: {
            parallel: true
          },
          values: [
            {
              serviceInputs: undefined,
              serviceRef: 'account.custom_test'
            },
            {
              serviceInputs: undefined,
              serviceRef: 'account.dwdasd'
            }
          ]
        }
      })
    })
  })

  test('user can delete selected service', async () => {
    const onUpdate = jest.fn()
    const { container, findByTestId } = render(
      <TestWrapper defaultFeatureFlagValues={defaultFeatureFlagValues}>
        <DeployServiceEntityWidget
          initialValues={initialValues}
          allowableTypes={allowableTypes}
          readonly={false}
          stageIdentifier=""
          onUpdate={onUpdate}
          setupModeType={setupMode.DIFFERENT}
        />
      </TestWrapper>
    )

    await waitFor(() => expect(container.querySelector('.bp3-spinner')).not.toBeInTheDocument())

    const delBtn = await findByTestId('delete-service-svc_1')

    expect(container).toMatchSnapshot()
    await userEvent.click(delBtn)

    const confirmationModal1 = await findByTextGlobal(
      document.body,
      'cd.pipelineSteps.serviceTab.deleteServiceFromListTitleText'
    )

    const cancel = await findByTextGlobal(confirmationModal1.parentElement!.parentElement!, 'cancel')

    await userEvent.click(cancel)

    await userEvent.click(delBtn)

    const confirmationModal2 = await findByTextGlobal(
      document.body,
      'cd.pipelineSteps.serviceTab.deleteServiceFromListTitleText'
    )

    const apply = await findByTextGlobal(confirmationModal2.parentElement!.parentElement!, 'applyChanges')
    await userEvent.click(apply)

    expect(onUpdate).toHaveBeenLastCalledWith({
      services: {
        metadata: {
          parallel: true
        },
        values: [{ serviceRef: 'svc_2' }]
      }
    })

    await waitFor(() => expect(container.querySelector('.bp3-spinner')).not.toBeInTheDocument())
  })

  test('user can uncheck deploy in parallel', async () => {
    const onUpdate = jest.fn()
    const { container } = render(
      <TestWrapper defaultFeatureFlagValues={defaultFeatureFlagValues}>
        <DeployServiceEntityWidget
          initialValues={initialValues}
          allowableTypes={allowableTypes}
          readonly={false}
          stageIdentifier=""
          onUpdate={onUpdate}
          setupModeType={setupMode.DIFFERENT}
        />
      </TestWrapper>
    )

    await waitFor(() => expect(container.querySelector('.bp3-spinner')).not.toBeInTheDocument())

    const apply = queryByAttribute('name', container, 'parallel')!
    await userEvent.click(apply)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenLastCalledWith({
        services: {
          values: [
            {
              serviceRef: 'svc_1',
              serviceInputs: {
                serviceDefinition: {
                  spec: {
                    artifacts: {
                      primary: {
                        spec: { connectorRef: '<+input>', imagePath: '<+input>', tag: '<+input>' },
                        type: 'DockerRegistry'
                      }
                    }
                  },
                  type: 'Kubernetes'
                }
              }
            },
            { serviceRef: 'svc_2' }
          ],
          metadata: { parallel: false }
        }
      })
    })

    await waitFor(() => expect(container.querySelector('.bp3-spinner')).not.toBeInTheDocument())
  })

  test('user can make service as runtime input', async () => {
    const onUpdate = jest.fn()
    const { container } = render(
      <TestWrapper defaultFeatureFlagValues={defaultFeatureFlagValues}>
        <DeployServiceEntityWidget
          initialValues={{}}
          allowableTypes={allowableTypes}
          readonly={false}
          stageIdentifier=""
          onUpdate={onUpdate}
          setupModeType={setupMode.DIFFERENT}
        />
      </TestWrapper>
    )

    await waitFor(() => expect(container.querySelector('.bp3-spinner')).not.toBeInTheDocument())

    const toggle = container.querySelector('.Toggle--input')!

    await userEvent.click(toggle)

    const fixedIcon = container.querySelector('.MultiTypeInput--btn')!
    await userEvent.click(fixedIcon)

    const runtimeMenu = await findByTextGlobal(document.body, 'Runtime input')
    await userEvent.click(runtimeMenu)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenLastCalledWith({ services: { values: '<+input>', metadata: { parallel: true } } })
    })
  })

  test('user can switch back and forth between multi service & single service', async () => {
    const onUpdate = jest.fn()
    const { container } = render(
      <TestWrapper defaultFeatureFlagValues={defaultFeatureFlagValues}>
        <DeployServiceEntityWidget
          initialValues={{
            services: {
              metadata: {
                parallel: false
              },
              values: [
                {
                  serviceRef: 'svc_2'
                }
              ]
            }
          }}
          allowableTypes={allowableTypes}
          readonly={false}
          stageIdentifier=""
          onUpdate={onUpdate}
          setupModeType={setupMode.DIFFERENT}
        />
      </TestWrapper>
    )

    await waitFor(() => expect(container.querySelector('.bp3-spinner')).not.toBeInTheDocument())

    const toggle = container.querySelector('.Toggle--input')!

    await userEvent.click(toggle)

    const confirmationDialog = findDialogContainer() as HTMLElement
    await waitFor(() => expect(confirmationDialog).toBeTruthy())

    expect(getByText(confirmationDialog, 'applyChanges')).toBeInTheDocument()
    userEvent.click(getByText(confirmationDialog, 'applyChanges') as HTMLButtonElement)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenLastCalledWith({
        service: {
          serviceRef: ''
        }
      })
    })

    userEvent.click(toggle)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenLastCalledWith({
        services: {
          metadata: {
            parallel: false
          },
          values: []
        }
      })
    })
  })
})
