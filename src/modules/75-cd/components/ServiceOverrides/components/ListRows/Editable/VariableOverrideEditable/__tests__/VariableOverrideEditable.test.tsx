/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Formik } from '@harness/uicore'

import { TestWrapper, queryByNameAttribute } from '@modules/10-common/utils/testUtils'
import { ServiceOverridesProvider } from '@modules/75-cd/components/ServiceOverrides/context/ServiceOverrideContext'
import { VariableOverrideEditable } from '../VariableOverrideEditable'
import { serviceOverrideListV2ResponseDataMock } from './mock'

jest.mock('@common/hooks', () => ({
  ...(jest.requireActual('@common/hooks') as any),
  useMutateAsGet: jest.fn().mockImplementation(fn => {
    return fn()
  })
}))

jest.mock('services/cd-ng', () => ({
  useGetServiceOverrideListV3: jest.fn().mockImplementation(() => ({
    data: serviceOverrideListV2ResponseDataMock,
    refetch: jest.fn(),
    loading: false,
    error: null
  })),
  useUpsertServiceOverrideV2: jest.fn().mockImplementation(() => ({ mutate: jest.fn(), loading: false, error: null })),
  useUpdateServiceOverrideV2: jest.fn().mockImplementation(() => ({ mutate: jest.fn(), loading: false, error: null })),
  useDeleteServiceOverrideV2: jest.fn().mockImplementation(() => ({ mutate: jest.fn(), loading: false, error: null }))
}))

const RenderComponent = (): React.ReactElement => {
  return (
    <Formik
      formName="variableOverrideEditTest"
      initialValues={[
        {
          variables: [
            {
              name: 'var1',
              type: 'String',
              value: '<+infrastructure.name>'
            }
          ]
        }
      ]}
      onSubmit={jest.fn()}
    >
      {() => <VariableOverrideEditable overrideDetailIndex={0} />}
    </Formik>
  )
}

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('VariableOverrideEditable tests', () => {
  test('should render normal expression input for an override if NG_EXPRESSIONS_NEW_INPUT_ELEMENT is false', async () => {
    const { container } = render(
      <TestWrapper defaultFeatureFlagValues={{ NG_EXPRESSIONS_NEW_INPUT_ELEMENT: false }}>
        <ServiceOverridesProvider serviceOverrideType={'ENV_GLOBAL_OVERRIDE'}>
          <RenderComponent />
        </ServiceOverridesProvider>
      </TestWrapper>
    )

    const variableNameInput = queryByNameAttribute('variables.0.name', container) as HTMLInputElement
    expect(variableNameInput).toBeInTheDocument()
    expect(variableNameInput.value).toBe('var1')

    const variableTypeInput = queryByNameAttribute('variables.0.type', container) as HTMLInputElement
    expect(variableTypeInput).toBeInTheDocument()
    expect(variableTypeInput.value).toBe('string')

    const variableValueInput = queryByNameAttribute('variables.0.value', container) as HTMLInputElement
    expect(variableValueInput).toBeInTheDocument()
    expect(variableValueInput.value).toBe('<+infrastructure.name>')

    const variableOverrideValueMultiTypeButton = screen.getByTestId('multi-type-button')
    await userEvent.click(variableOverrideValueMultiTypeButton)
    await waitFor(() => expect(screen.getByText('Fixed value')).toBeInTheDocument())
    expect(screen.getByText('Runtime input')).toBeInTheDocument()
    expect(screen.getByText('Expression')).toBeInTheDocument()
  })

  test('should render new expression builder component for an override if NG_EXPRESSIONS_NEW_INPUT_ELEMENT is true', async () => {
    const { container } = render(
      <TestWrapper defaultFeatureFlagValues={{ NG_EXPRESSIONS_NEW_INPUT_ELEMENT: true }}>
        <ServiceOverridesProvider serviceOverrideType={'INFRA_GLOBAL_OVERRIDE'}>
          <RenderComponent />
        </ServiceOverridesProvider>
      </TestWrapper>
    )

    const variableNameInput = queryByNameAttribute('variables.0.name', container) as HTMLInputElement
    expect(variableNameInput).toBeInTheDocument()
    expect(variableNameInput.value).toBe('var1')

    const variableTypeInput = queryByNameAttribute('variables.0.type', container) as HTMLInputElement
    expect(variableTypeInput).toBeInTheDocument()
    expect(variableTypeInput.value).toBe('string')

    const variableValueInput = queryByNameAttribute('variables.0.value', container) as HTMLInputElement
    expect(variableValueInput).toBeInTheDocument()
    expect(variableValueInput).toHaveAttribute('contenteditable')
    expect(within(variableValueInput).getByText('<+infrastructure.name>')).toBeInTheDocument()

    const variableOverrideValueMultiTypeButton = screen.getByTestId('multi-type-button')
    await userEvent.click(variableOverrideValueMultiTypeButton)
    await waitFor(() => expect(screen.getByText('Fixed value')).toBeInTheDocument())
    expect(screen.queryByText('Runtime input')).not.toBeInTheDocument()
    expect(screen.getByText('Expression')).toBeInTheDocument()
  })
})
