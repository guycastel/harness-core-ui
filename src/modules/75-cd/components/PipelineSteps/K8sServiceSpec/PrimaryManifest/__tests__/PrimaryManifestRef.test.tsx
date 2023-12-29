import React from 'react'
import { MultiTypeInputType, Formik } from '@harness/uicore'
import { FormikContextType } from 'formik'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getPrimaryManifestsRef } from '@harnessio/react-ng-manager-client'
import { TestWrapper, queryByNameAttribute, findPopoverContainer } from '@common/utils/testUtils'
import { KubernetesServiceSpec } from 'services/cd-ng'

import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import PrimaryManifestRef from '../PrimaryManifestRef'
import type { K8SDirectServiceStep } from '../../K8sServiceSpecInterface'
import {
  templatewithRuntime,
  initialValuesWithRuntime,
  inputSetFormikInitialValues,
  serviceMetadata,
  services
} from './mocks'

jest.fn().mockImplementation(() => {
  return { data: {}, refetch: jest.fn(), error: null, loading: false }
})
jest.mock('services/cd-ng', () => ({
  //
}))

// eslint-disable-next-line jest-no-mock
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({ inputSetIdentifier: '-1' })
}))

jest.mock('services/cd-ng-rq', () => ({
  useGetServiceAccessListQuery: jest.fn(() => ({
    data: { data: services },
    isInitialLoading: false
  })),

  useGetServicesYamlAndRuntimeInputsV2Query: jest.fn(() => ({
    data: { data: serviceMetadata }
  })),
  useGetServicesYamlAndRuntimeInputsQuery: jest.fn(() => ({ data: { data: serviceMetadata }, isInitialLoading: false }))
}))

jest.mock('@harnessio/react-ng-manager-client', () => ({
  getPrimaryManifestsRef: jest.fn(() =>
    Promise.resolve({
      loading: false,
      content: {
        identifiers: ['a1', 'a2', 'a3']
      }
    })
  )
}))

describe('Primary Manifest ref tests', () => {
  test('should render correctly', async () => {
    const { container, getAllByRole } = render(
      <TestWrapper>
        <Formik initialValues={inputSetFormikInitialValues} onSubmit={() => undefined} formName="TestWrapper">
          {formik => (
            <PrimaryManifestRef
              serviceIdentifier="helmmanifest"
              stepViewType={StepViewType.DeploymentForm}
              path="stages[0].stage.spec.service.serviceInputs.serviceDefinition.spec"
              template={templatewithRuntime as KubernetesServiceSpec}
              initialValues={initialValuesWithRuntime as K8SDirectServiceStep}
              readonly={false}
              allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]}
              formik={formik as FormikContextType<unknown>}
            />
          )}
        </Formik>
      </TestWrapper>
    )
    const portals = document.querySelectorAll('.bp3-portal')
    expect(portals).toHaveLength(0)
    const manifestInput = queryByNameAttribute(
      'stages[0].stage.spec.service.serviceInputs.serviceDefinition.spec.manifestConfigurations.primaryManifestRef',
      container
    ) as HTMLInputElement
    expect(manifestInput).toBeInTheDocument()
    await userEvent.click(manifestInput)
    const popover = findPopoverContainer() as HTMLElement
    const options = popover.querySelectorAll('.Select--menuItem')
    expect(options).toHaveLength(3)
    await userEvent.click(options[2])
    expect(manifestInput.value).toBe('a3')
    const btn = container.querySelector('.MultiTypeInput--btn')!
    expect(btn).toBeInTheDocument()
    await userEvent.click(btn)
    expect(portals).toHaveLength(0)

    const runtimeOption = popover.querySelectorAll('li')
    expect(runtimeOption).toHaveLength(3)
    await userEvent.click(runtimeOption[2])
    expect(portals).toHaveLength(0)
    const multiTypeBtn = getAllByRole('button')[0]

    await userEvent.click(multiTypeBtn!)

    await waitFor(() => expect(screen.getByText('Runtime input')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Runtime input'))
  })
  test('should render correctly runtime', async () => {
    ;(getPrimaryManifestsRef as jest.Mock).mockImplementation(() => Promise.reject())
    const { container } = render(
      <TestWrapper>
        <Formik initialValues={inputSetFormikInitialValues} onSubmit={() => undefined} formName="TestWrapper">
          {formik => (
            <PrimaryManifestRef
              serviceIdentifier="helmmanifest"
              stepViewType={StepViewType.DeploymentForm}
              path="stages[0].stage.spec.service.serviceInputs.serviceDefinition.spec"
              template={templatewithRuntime as KubernetesServiceSpec}
              initialValues={initialValuesWithRuntime as K8SDirectServiceStep}
              readonly={false}
              allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]}
              formik={formik as FormikContextType<unknown>}
            />
          )}
        </Formik>
      </TestWrapper>
    )

    const manifestInput = queryByNameAttribute(
      'stages[0].stage.spec.service.serviceInputs.serviceDefinition.spec.manifestConfigurations.primaryManifestRef',
      container
    ) as HTMLInputElement
    expect(manifestInput).toBeInTheDocument()
  })
})
