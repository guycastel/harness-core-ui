/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { act, queryByAttribute, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RUNTIME_INPUT_VALUE } from '@harness/uicore'

import { queryByNameAttribute } from '@common/utils/testUtils'
import { TestStepWidget, factory } from '@pipeline/components/PipelineSteps/Steps/__tests__/StepTestUtil'
import { StepFormikRef, StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { InstanceUnit } from '@pipeline/utils/types'
import { ECSUpgradeContainerStep } from '../ECSUpgradeContainerStep'

factory.registerStep(new ECSUpgradeContainerStep())

const existingInitialValues = {
  identifier: 'Step_1',
  name: 'Step 1',
  timeout: '20m',
  type: StepType.EcsUpgradeContainer,
  spec: {
    newServiceInstanceCount: 50,
    newServiceInstanceUnit: InstanceUnit.Count,
    downsizeOldServiceInstanceCount: 50,
    downsizeOldServiceInstanceUnit: InstanceUnit.Percentage
  }
}
const onUpdate = jest.fn()
const onChange = jest.fn()

describe('ECSUpgradeContainerStep tests', () => {
  beforeEach(() => {
    onUpdate.mockReset()
    onChange.mockReset()
  })
  test('it should render Edit view for new step', async () => {
    const ref = React.createRef<StepFormikRef<unknown>>()
    const { container, getByText, findByText } = render(
      <TestStepWidget
        initialValues={{}}
        type={StepType.EcsUpgradeContainer}
        onUpdate={onUpdate}
        onChange={onChange}
        ref={ref}
        stepViewType={StepViewType.Edit}
        isNewStep={true}
      />
    )

    const nameInput = queryByNameAttribute('name', container)
    await userEvent.type(nameInput!, 'Step 1')
    await waitFor(() => expect(nameInput).toHaveDisplayValue('Step 1'))
    expect(getByText('Step_1')).toBeInTheDocument()

    const timeoutInput = queryByNameAttribute('timeout', container)
    await userEvent.clear(timeoutInput!)
    await userEvent.type(timeoutInput!, '30m')
    await waitFor(() => expect(timeoutInput).toHaveDisplayValue('30m'))

    const newServiceInstanceCountInput = queryByNameAttribute(
      'spec.newServiceInstanceCount',
      container
    ) as HTMLInputElement
    expect(newServiceInstanceCountInput).toBeInTheDocument()
    expect(newServiceInstanceCountInput.value).toBe('100')
    await userEvent.clear(newServiceInstanceCountInput!)
    await userEvent.type(newServiceInstanceCountInput!, '50')

    const dropdownIcons = container.querySelectorAll('[data-icon="main-chevron-down"]')
    expect(dropdownIcons.length).toBe(2)
    const serviceInstanceUnitSelectFields = screen.getAllByTestId('dropdown-button')
    expect(serviceInstanceUnitSelectFields).toHaveLength(2)

    const newServiceInstanceUnitSelect = serviceInstanceUnitSelectFields[0]
    expect(newServiceInstanceUnitSelect).toBeInTheDocument()
    expect(within(newServiceInstanceUnitSelect).getByText('instanceFieldOptions.percentage')).toBeInTheDocument()
    const newServiceInstanceUnitDropdownIcon = dropdownIcons[0].parentElement
    await userEvent.click(newServiceInstanceUnitDropdownIcon!)
    const newServiceInstanceUnitSecondOption = await findByText('instanceFieldOptions.instanceHolder')
    expect(newServiceInstanceUnitSecondOption).toBeInTheDocument()
    await userEvent.click(newServiceInstanceUnitSecondOption)
    await waitFor(() =>
      expect(within(newServiceInstanceUnitSelect).getByText('instanceFieldOptions.instanceHolder')).toBeInTheDocument()
    )

    const downsizeOldServiceInstanceCountInput = queryByNameAttribute(
      'spec.downsizeOldServiceInstanceCount',
      container
    ) as HTMLInputElement
    expect(downsizeOldServiceInstanceCountInput).toBeInTheDocument()
    await userEvent.type(downsizeOldServiceInstanceCountInput!, '60')

    const downsizeOldServiceInstanceUnitSelect = serviceInstanceUnitSelectFields[1]
    expect(downsizeOldServiceInstanceUnitSelect).toBeInTheDocument()
    expect(within(downsizeOldServiceInstanceUnitSelect).getByText('common.entityPlaceholderText')).toBeInTheDocument()
    const resizeStrategyDropdownIcon = dropdownIcons[1].parentElement
    await userEvent.click(resizeStrategyDropdownIcon!)
    const downsizeOldServiceInstanceUnitFirstOption = await findByText('instanceFieldOptions.percentage')
    expect(downsizeOldServiceInstanceUnitFirstOption).toBeInTheDocument()
    await userEvent.click(downsizeOldServiceInstanceUnitFirstOption)
    await waitFor(() =>
      expect(
        within(downsizeOldServiceInstanceUnitSelect).getByText('instanceFieldOptions.percentage')
      ).toBeInTheDocument()
    )

    act(() => {
      ref.current?.submitForm()
    })
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith({
        identifier: 'Step_1',
        name: 'Step 1',
        timeout: '30m',
        spec: {
          newServiceInstanceCount: 50,
          newServiceInstanceUnit: InstanceUnit.Count,
          downsizeOldServiceInstanceCount: 60,
          downsizeOldServiceInstanceUnit: InstanceUnit.Percentage
        },
        type: StepType.EcsUpgradeContainer
      })
    )
  })

  test('it should allow user to clear optional field values', async () => {
    const ref = React.createRef<StepFormikRef<unknown>>()
    const { container } = render(
      <TestStepWidget
        initialValues={existingInitialValues}
        type={StepType.EcsUpgradeContainer}
        onUpdate={onUpdate}
        onChange={onChange}
        ref={ref}
        stepViewType={StepViewType.Edit}
        isNewStep={false}
      />
    )

    const identifierEditIcon = queryByAttribute('data-icon', container, 'Edit')
    expect(identifierEditIcon).not.toBeInTheDocument()

    const downsizeOldServiceInstanceCountInput = queryByNameAttribute(
      'spec.downsizeOldServiceInstanceCount',
      container
    ) as HTMLInputElement
    expect(downsizeOldServiceInstanceCountInput).toBeInTheDocument()
    expect(downsizeOldServiceInstanceCountInput.value).toBe('50')
    userEvent.clear(downsizeOldServiceInstanceCountInput)
    expect(downsizeOldServiceInstanceCountInput.value).toBe('')

    const serviceInstanceUnitSelectFields = screen.getAllByTestId('dropdown-button')
    expect(serviceInstanceUnitSelectFields).toHaveLength(2)

    const clearIcon = container.querySelector('[data-icon="main-delete"]') // Clear icon of downsizeOldServiceInstanceUnit
    expect(clearIcon).toBeInTheDocument()
    const downsizeOldServiceInstanceUnitSelect = serviceInstanceUnitSelectFields[1]
    expect(downsizeOldServiceInstanceUnitSelect).toBeInTheDocument()
    expect(
      within(downsizeOldServiceInstanceUnitSelect).getByText('instanceFieldOptions.percentage')
    ).toBeInTheDocument()
    userEvent.click(clearIcon!)
    await waitFor(() =>
      expect(within(downsizeOldServiceInstanceUnitSelect).getByText('common.entityPlaceholderText')).toBeInTheDocument()
    )

    act(() => {
      ref.current?.submitForm()
    })

    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith({
        identifier: 'Step_1',
        name: 'Step 1',
        timeout: '20m',
        type: StepType.EcsUpgradeContainer,
        spec: {
          newServiceInstanceCount: 50,
          newServiceInstanceUnit: InstanceUnit.Count
        }
      })
    )
  })

  test('InputSet view renders fine', async () => {
    const { container, getByText } = render(
      <TestStepWidget
        initialValues={{
          identifier: 'Step_1',
          name: 'Step 1',
          timeout: '',
          spec: {},
          type: StepType.EcsUpgradeContainer
        }}
        template={{
          identifier: 'Step_1',
          name: 'Step 1',
          timeout: RUNTIME_INPUT_VALUE,
          spec: {
            newServiceInstanceCount: RUNTIME_INPUT_VALUE,
            downsizeOldServiceInstanceCount: RUNTIME_INPUT_VALUE
          },
          type: StepType.EcsUpgradeContainer
        }}
        type={StepType.EcsUpgradeContainer}
        stepViewType={StepViewType.InputSet}
        onUpdate={onUpdate}
      />
    )

    const submitBtn = getByText('Submit')
    const timeoutInput = queryByNameAttribute('timeout', container)
    expect(timeoutInput).toBeVisible()
    await userEvent.type(timeoutInput!, '20m')

    const newServiceInstanceCountInput = queryByNameAttribute(
      'spec.newServiceInstanceCount',
      container
    ) as HTMLInputElement
    expect(newServiceInstanceCountInput).toBeInTheDocument()
    await userEvent.type(newServiceInstanceCountInput!, '50')

    const downsizeOldServiceInstanceCountInput = queryByNameAttribute(
      'spec.downsizeOldServiceInstanceCount',
      container
    ) as HTMLInputElement
    expect(downsizeOldServiceInstanceCountInput).toBeInTheDocument()
    await userEvent.type(downsizeOldServiceInstanceCountInput!, '60')

    await userEvent.click(submitBtn)
    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    expect(onUpdate).toHaveBeenCalledWith({
      identifier: 'Step_1',
      name: 'Step 1',
      timeout: '20m',
      type: StepType.EcsUpgradeContainer,
      spec: {
        newServiceInstanceCount: 50,
        downsizeOldServiceInstanceCount: 60
      }
    })
  })

  test('Variables view renders fine', async () => {
    const { getByText } = render(
      <TestStepWidget
        initialValues={existingInitialValues}
        type={StepType.EcsUpgradeContainer}
        onUpdate={onUpdate}
        onChange={onChange}
        stepViewType={StepViewType.InputVariable}
        isNewStep={true}
        customStepProps={{
          stageIdentifier: 'qaStage',
          variablesData: existingInitialValues,
          metadataMap: {
            'Step 1': {
              yamlProperties: {
                fqn: 'pipeline.stages.qaStage.execution.steps.EcsUpgradeContainer.name',
                localName: 'step.EcsUpgradeContainer.name'
              }
            },
            '20m': {
              yamlProperties: {
                fqn: 'pipeline.stages.qaStage.execution.steps.EcsUpgradeContainer.timeout',
                localName: 'step.EcsUpgradeContainer.timeout'
              }
            }
          }
        }}
      />
    )

    expect(getByText('name')).toBeVisible()
    expect(getByText('timeout')).toBeVisible()
    expect(getByText('Step 1')).toBeVisible()
    expect(getByText('20m')).toBeVisible()
  })
})
