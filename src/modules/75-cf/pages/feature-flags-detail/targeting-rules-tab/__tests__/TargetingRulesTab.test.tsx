/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { render, RenderResult, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import * as uuid from 'uuid'
import { cloneDeep } from 'lodash-es'
import { TestWrapper } from '@common/utils/testUtils'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import * as cfServicesMock from 'services/cf'
import type { TargetingRulesTabProps } from '../TargetingRulesTab'
import TargetingRulesTab from '../TargetingRulesTab'
import * as usePatchFeatureFlagMock from '../hooks/usePatchFeatureFlag'
import mockSegment from './data/mockSegments'
import mockTargets from './data/mockTargets'
import mockFeature from './data/mockFeature'

jest.mock('uuid')

const renderComponent = (
  props: Partial<TargetingRulesTabProps> = {},
  permissions: Map<string, boolean> = new Map()
): RenderResult =>
  render(
    <TestWrapper
      path="/account/:accountId/cf/orgs/:orgIdentifier/projects/:projectIdentifier/feature-flags"
      pathParams={{ accountId: 'dummy', orgIdentifier: 'dummy', projectIdentifier: 'dummy' }}
      defaultPermissionValues={{
        permissions,
        checkPermission: ({ permission }) =>
          permissions.has(permission as string) ? (permissions.get(permission as string) as boolean) : true
      }}
    >
      <TargetingRulesTab featureFlagData={mockFeature} refetchFlag={jest.fn()} refetchFlagLoading={false} {...props} />
    </TestWrapper>
  )

describe('TargetingRulesTab', () => {
  jest.spyOn(cfServicesMock, 'useGetAllTargetAttributes').mockReturnValue({
    data: [],
    loading: false,
    refetch: jest.fn(),
    error: null
  } as any)

  beforeAll(() => {
    jest.spyOn(uuid, 'v4').mockReturnValue('UUID')
  })

  beforeEach(() => {
    jest.spyOn(cfServicesMock, 'useGetAllSegments').mockReturnValue({
      data: { segments: mockSegment },
      loading: false,
      refetch: jest.fn()
    } as any)

    jest.spyOn(cfServicesMock, 'useGetAllTargets').mockReturnValue({
      data: { targets: mockTargets },
      loading: false,
      refetch: jest.fn()
    } as any)

    jest.clearAllMocks()
  })

  test('it should disable this section if the selected flag is archived', async () => {
    const archivedMockFeature = cloneDeep(mockFeature)
    archivedMockFeature.archived = true

    renderComponent({
      featureFlagData: {
        ...archivedMockFeature,
        envProperties: {
          pipelineConfigured: false,
          pipelineDetails: undefined,
          defaultServe: { variation: 'false' },
          environment: 'qatest',
          modifiedAt: 1635333973373,
          offVariation: 'false',
          rules: [],
          state: 'off',
          variationMap: [],
          version: 56
        }
      }
    })

    expect(screen.getByText('CF.SHARED.ARCHIVED')).toBeInTheDocument()

    // flag variations dropdowns
    const textboxes = screen.getAllByRole('textbox')
    expect(textboxes[0]).toBeDisabled()
    expect(textboxes[1]).toBeDisabled()

    // Add Targeting Button
    expect(screen.getByRole('button', { name: 'cf.featureFlags.rules.addTargeting' })).toHaveAttribute('disabled')

    // Flag toggle
    expect(screen.getByRole('checkbox', { name: 'cf.featureFlags.flagOff' })).toBeDisabled()
  })

  describe('Flag State', () => {
    test('it should toggle flag state correctly', async () => {
      renderComponent()

      const flagToggle = screen.getByTestId('flag-status-switch')
      expect(flagToggle).toBeChecked()

      await userEvent.click(flagToggle)

      expect(flagToggle).not.toBeChecked()
      expect(screen.getByText('cf.featureFlags.flagWillTurnOff')).toBeInTheDocument()
    })

    test('it should toggle flag state from OFF to ON correctly', async () => {
      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      const flagToggle = screen.getByTestId('flag-status-switch')
      await waitFor(() => expect(flagToggle).not.toBeChecked())

      await userEvent.click(flagToggle)

      expect(flagToggle).toBeChecked()
      expect(screen.getByText('cf.featureFlags.flagWillTurnOn')).toBeInTheDocument()

      expect(screen.queryByTestId('targeting-rules-footer')).toBeInTheDocument()
    })
  })

  describe('Default Variation', () => {
    test('it should render and update default onVariation correctly', async () => {
      renderComponent()

      const onVariationDropdown = document.querySelector('input[name="onVariation"]') as HTMLSelectElement
      expect(onVariationDropdown).toHaveValue('True')
      await userEvent.click(onVariationDropdown)

      const onVariationDropdownOptions = document.querySelectorAll('li')
      expect(onVariationDropdownOptions).toHaveLength(2)

      await userEvent.click(onVariationDropdownOptions[1])
      expect(onVariationDropdown).toHaveValue('False')
    })

    test('it should show the confirm modal when trying to save an altered default rule, that affects the current flag state', async () => {
      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      const offVariationDropdown = document.querySelector('input[name="offVariation"]') as HTMLSelectElement
      expect(offVariationDropdown).toBeInTheDocument()
      await userEvent.click(offVariationDropdown)
      const trueVariationOption = document.querySelector('li') as HTMLElement
      await userEvent.click(trueVariationOption)
      expect(offVariationDropdown).toHaveValue('True')

      await userEvent.click(screen.getByRole('button', { name: 'save' }))

      expect(screen.getByText('cf.featureFlags.rules.ruleChangeModalTitle')).toBeInTheDocument()
      expect(screen.getByText('cf.featureFlags.rules.ruleChangeModalDescriptionDisabled')).toBeInTheDocument()
    })

    test('it should use default onVariation if environment variation does not exist', async () => {
      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: undefined
        }
      })

      expect(document.querySelector('input[name="onVariation"]') as HTMLSelectElement).toHaveValue('True')
    })
  })

  describe('Variation Target/Target Groups', () => {
    test('it should render target groups tags/dropdown correctly', async () => {
      renderComponent()

      // assert correct target groups are pre-populated
      const targetGroupTagInputValue = screen
        .getByTestId('false_target_groups')
        .querySelectorAll('span[data-tag-index]')

      expect(targetGroupTagInputValue[0]).toHaveTextContent('target_group_4')
      expect(targetGroupTagInputValue[1]).toHaveTextContent('target_group_5')

      // assert available target groups list appear on click
      const targetGroupTagInput = screen.getByTestId('false_target_groups').querySelector('input') as HTMLInputElement
      await userEvent.type(targetGroupTagInput, 'target')
      const targetGroupInputList = document.querySelector('ul')
      await waitFor(() => expect(targetGroupInputList).toBeInTheDocument())
      expect(document.querySelectorAll('li')[0]).toHaveTextContent(/target_group_2/)
      expect(document.querySelectorAll('li')[1]).toHaveTextContent(/target_group_3/)
      expect(document.querySelectorAll('li')[2]).toHaveTextContent(/target_group_6/)
    })

    test('it should render target tags/dropdown correctly', async () => {
      renderComponent()

      // assert correct target are pre-populated
      expect(screen.getByTestId('false_targets')).toHaveTextContent('target_1')

      // assert available targets appear on click
      await userEvent.type(screen.getByTestId('false_targets').querySelector('input') as HTMLInputElement, 'target')

      const targetsInputList = screen.getAllByRole('listitem')
      expect(targetsInputList[0]).toHaveTextContent(/target_4/)
      expect(targetsInputList[1]).toHaveTextContent(/target_3/)
      expect(targetsInputList[2]).toHaveTextContent(/target_2/)
    })

    test('it should update Target Groups for a variation correctly', async () => {
      renderComponent()

      let targetGroupTagInputValues = screen.getByTestId('false_target_groups').querySelectorAll('span[data-tag-index]')

      expect(targetGroupTagInputValues[0]).toHaveTextContent(/target_group_4/)
      expect(targetGroupTagInputValues[1]).toHaveTextContent(/target_group_5/)

      const targetGroup = document.querySelector('input[name="targetingRuleItems[0].targetGroups"]') as HTMLElement
      await userEvent.click(targetGroup)

      await waitFor(() => expect(screen.getByText('target_group_2')).toBeInTheDocument())
      await userEvent.click(screen.getByText('target_group_2'))

      targetGroupTagInputValues = screen.getByTestId('false_target_groups').querySelectorAll('span[data-tag-index]')
      expect(targetGroupTagInputValues).toHaveLength(3)
      expect(targetGroupTagInputValues[0]).toHaveTextContent(/target_group_4/)
      expect(targetGroupTagInputValues[1]).toHaveTextContent(/target_group_5/)
      expect(targetGroupTagInputValues[2]).toHaveTextContent(/target_group_2/)
    })

    test('it should update Targets for a variation correctly', async () => {
      renderComponent()

      let targetTagInputValues = screen.getByTestId('false_targets').querySelectorAll('span[data-tag-index]')

      expect(targetTagInputValues[0]).toHaveTextContent(/target_1/)

      await userEvent.click(document.querySelector('input[name="targetingRuleItems[0].targets"]') as HTMLInputElement)

      await waitFor(() => expect(screen.getByText('target_4')).toBeInTheDocument())
      await userEvent.click(screen.getByText('target_4'))

      targetTagInputValues = screen.getByTestId('false_targets').querySelectorAll('span[data-tag-index]')
      expect(targetTagInputValues).toHaveLength(2)
      expect(targetTagInputValues[0]).toHaveTextContent(/target_1/)
      expect(targetTagInputValues[1]).toHaveTextContent(/target_4/)
    })

    test('it should render variation item correctly when Target Groups are empty but Targets exist', async () => {
      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [],
            state: 'off',
            variationMap: [{ targets: [{ identifier: 'target1', name: 'target_1' }], variation: 'false' }],
            version: 56
          }
        }
      })

      expect(screen.getByTestId('false_target_groups').querySelectorAll('span[data-tag-index]')).toHaveLength(0)
    })

    test('it should render variation item correctly when Targets are empty but Target Groups exist', async () => {
      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            pipelineConfigured: false,
            pipelineDetails: undefined,
            rules: [
              {
                clauses: [
                  {
                    attribute: '',
                    id: 'd36b6624-c514-4b94-94c7-9f558324badf',
                    negate: false,
                    op: 'segmentMatch',
                    values: ['randomID']
                  }
                ],
                priority: 100,
                ruleId: '9dec5abb-002e-45b3-b241-963ac5d9acde',
                serve: { variation: 'false' }
              }
            ],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      expect(screen.getByTestId('false_targets').querySelectorAll('span[data-tag-index]')).toHaveLength(0)
    })

    test('it should render empty target groups input when variation segments undefined', async () => {
      jest.spyOn(cfServicesMock, 'useGetAllSegments').mockReturnValue({
        data: undefined
      } as any)
      renderComponent()

      const targetGroupTagInputValue = screen
        .getByTestId('false_target_groups')
        .querySelector('span[data-tag-index="0"]')

      expect(targetGroupTagInputValue).not.toBeInTheDocument()
    })

    test('it should show "Add Targeting" button when more targets available', async () => {
      renderComponent()
      expect(screen.getByText('cf.featureFlags.rules.addTargeting')).toBeInTheDocument()
    })

    test('it should add variation when "Add Targeting" option selected', async () => {
      renderComponent()
      const addTargetingButton = screen.getByText('cf.featureFlags.rules.addTargeting')
      expect(addTargetingButton).toBeInTheDocument()
      await userEvent.click(addTargetingButton)

      const variationOptionTrue = screen.getByTestId('variation_option_true')
      expect(variationOptionTrue).toBeInTheDocument()
      await userEvent.click(variationOptionTrue)

      expect(screen.getByTestId('true_target_groups')).toBeInTheDocument()
      expect(screen.getByTestId('true_targets')).toBeInTheDocument()
    })

    test('it should show validation errors if form is submitted without selected targets or target groups and not save the changes', async () => {
      const saveChangesMock = jest.fn()

      jest.spyOn(usePatchFeatureFlagMock, 'default').mockReturnValue({ saveChanges: saveChangesMock, loading: false })

      renderComponent()

      const addTargetingButton = screen.getByText('cf.featureFlags.rules.addTargeting')

      await userEvent.click(addTargetingButton)
      await userEvent.click(screen.getByTestId('variation_option_true'))

      await userEvent.click(screen.getByRole('button', { name: 'save' }))

      await waitFor(() => {
        expect(screen.getByText('cf.featureFlags.rules.validation.selectTarget')).toBeInTheDocument()
        expect(screen.getByText('cf.featureFlags.rules.validation.selectTargetGroup')).toBeInTheDocument()
        expect(saveChangesMock).not.toBeCalled()
      })
    })

    test('it should remove variation when "trash" icon/button clicked', async () => {
      renderComponent()
      await userEvent.click(screen.getByText('cf.featureFlags.rules.addTargeting'))

      expect(screen.getByTestId('remove_variation_false')).toBeInTheDocument()
      await userEvent.click(screen.getByTestId('remove_variation_false'))

      expect(screen.queryByTestId('false_target_groups')).not.toBeInTheDocument()
      expect(screen.queryByTestId('false_targets')).not.toBeInTheDocument()
    })
  })

  describe('Percentage Rollout', () => {
    test('it should render percentage rollout correctly when present', async () => {
      renderComponent()

      expect(screen.getByText('cf.featureFlags.percentageRollout')).toBeInTheDocument()
      const targetGroup = document.querySelector('input[name="targetingRuleItems[1].clauses[0].values[0]"]')
      expect(targetGroup).toHaveValue('target_group_1')
      const trueWeight = document.querySelector('input[name="targetingRuleItems[1].variations[0].weight"]')
      expect(trueWeight).toHaveValue(45)
      const falseWeight = document.querySelector('input[name="targetingRuleItems[1].variations[1].weight"]')
      expect(falseWeight).toHaveValue(55)
    })

    test('it should render percentage rollout correctly when added via button click', async () => {
      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [
              {
                clauses: [
                  {
                    attribute: '',
                    id: 'd36b6624-c514-4b94-94c7-9f558324badf',
                    negate: false,
                    op: 'segmentMatch',
                    values: ['randomID']
                  }
                ],
                priority: 100,
                ruleId: '9dec5abb-002e-45b3-b241-963ac5d9acde',
                serve: { variation: 'false' }
              }
            ],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })
      expect(screen.queryByText('cf.featureFlags.percentageRollout')).not.toBeInTheDocument()

      await userEvent.click(screen.getByText('cf.featureFlags.rules.addTargeting'))
      const percentageRolloutOption = screen.getByTestId('variation_option_percentage_rollout')
      await waitFor(() => expect(percentageRolloutOption).toBeInTheDocument())
      await userEvent.click(percentageRolloutOption)

      expect(screen.getByTestId('percentage_rollout_item_1')).toBeInTheDocument()
    })

    test('it should render percentage rollout correctly when not present', () => {
      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [
              {
                clauses: [
                  {
                    attribute: '',
                    id: 'd36b6624-c514-4b94-94c7-9f558324badf',
                    negate: false,
                    op: 'segmentMatch',
                    values: ['randomID']
                  }
                ],
                priority: 100,
                ruleId: '9dec5abb-002e-45b3-b241-963ac5d9acde',
                serve: { variation: 'false' }
              }
            ],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      expect(screen.queryByText('cf.featureFlags.percentageRollout')).not.toBeInTheDocument()
    })

    test('it should remove percentage rollout correctly', async () => {
      renderComponent()

      await userEvent.click(screen.getByTestId('remove_percentage_rollout_1'))

      expect(screen.queryByText('cf.featureFlags.percentageRollout')).not.toBeInTheDocument()
    })

    test('it should not submit form if percentage rollout added but fields incorrect', async () => {
      const saveChangesMock = jest.fn()
      const mockFeatureWith3Variations = cloneDeep(mockFeature)
      mockFeatureWith3Variations.variations.push({ identifier: 'option3', value: 'option3', name: 'option3' })

      jest.spyOn(usePatchFeatureFlagMock, 'default').mockReturnValue({ saveChanges: saveChangesMock, loading: false })
      renderComponent({
        featureFlagData: {
          ...mockFeatureWith3Variations,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [
              {
                clauses: [
                  {
                    attribute: '',
                    id: 'd36b6624-c514-4b94-94c7-9f558324badf',
                    negate: false,
                    op: 'segmentMatch',
                    values: ['randomID']
                  }
                ],
                priority: 100,
                ruleId: '9dec5abb-002e-45b3-b241-963ac5d9acde',
                serve: { variation: 'false' }
              }
            ],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      await userEvent.click(screen.getByText('cf.featureFlags.rules.addTargeting'))
      const percentageRolloutOption = screen.getByTestId('variation_option_percentage_rollout')
      await waitFor(() => expect(percentageRolloutOption).toBeInTheDocument())
      await userEvent.click(percentageRolloutOption)
      expect(screen.getByTestId('percentage_rollout_item_1')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'save' }))

      await waitFor(() => {
        expect(screen.getByText('100cf.percentageRollout.assignToVariation')).toBeInTheDocument()
        expect(screen.getByText('cf.featureFlags.rules.validation.selectTargetGroup')).toBeInTheDocument()
        expect(saveChangesMock).not.toBeCalled()
      })
    })
  })

  describe('Integration', () => {
    test('it should call saveChanges when flag is toggled and saved', async () => {
      const saveChangesMock = jest.fn()

      jest.spyOn(usePatchFeatureFlagMock, 'default').mockReturnValue({ saveChanges: saveChangesMock, loading: false })

      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      const flagToggle = screen.getByTestId('flag-status-switch')
      await userEvent.click(flagToggle)
      expect(flagToggle).toBeChecked()

      await userEvent.click(screen.getByRole('button', { name: 'save' }))

      await waitFor(() => expect(saveChangesMock).toBeCalled())
    })

    test('it should call saveChanges when default on variation is updated and saved', async () => {
      const saveChangesMock = jest.fn()

      jest.spyOn(usePatchFeatureFlagMock, 'default').mockReturnValue({ saveChanges: saveChangesMock, loading: false })

      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      const onVariationDropdown = document.querySelector('input[name="onVariation"]') as HTMLSelectElement
      expect(onVariationDropdown).toBeInTheDocument()
      await userEvent.click(onVariationDropdown)
      const trueVariationOption = document.querySelector('li') as HTMLElement
      await userEvent.click(trueVariationOption)
      expect(onVariationDropdown).toHaveValue('True')

      await userEvent.click(screen.getByRole('button', { name: 'save' }))

      await waitFor(() => expect(saveChangesMock).toBeCalled())
    })

    test('it should call saveChanges when default off variation is updated and saved', async () => {
      const saveChangesMock = jest.fn()

      jest.spyOn(usePatchFeatureFlagMock, 'default').mockReturnValue({ saveChanges: saveChangesMock, loading: false })

      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      const offVariationDropdown = document.querySelector('input[name="offVariation"]') as HTMLSelectElement
      expect(offVariationDropdown).toBeInTheDocument()
      await userEvent.click(offVariationDropdown)
      const trueVariationOption = document.querySelector('li') as HTMLElement
      await userEvent.click(trueVariationOption)
      expect(offVariationDropdown).toHaveValue('True')

      await userEvent.click(screen.getByRole('button', { name: 'save' }))

      await userEvent.click(screen.getByRole('button', { name: 'confirm' }))

      await waitFor(() => expect(saveChangesMock).toBeCalled())
    })

    test('it should call saveChanges when true variation with targets is updated and saved', async () => {
      const saveChangesMock = jest.fn()

      jest.spyOn(usePatchFeatureFlagMock, 'default').mockReturnValue({ saveChanges: saveChangesMock, loading: false })

      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      await userEvent.click(screen.getByText('cf.featureFlags.rules.addTargeting'))
      await userEvent.click(screen.getByTestId('variation_option_true'))

      const trueTargetsDropdown = document.querySelector('input[name="targetingRuleItems[0].targets"]') as HTMLElement
      await waitFor(() => expect(trueTargetsDropdown).toBeInTheDocument())

      await userEvent.click(document.querySelector('input[name="targetingRuleItems[0].targets"]') as HTMLElement)
      await waitFor(() => screen.getByText('target_2'))
      await userEvent.click(screen.getByText('target_2'))

      await userEvent.click(screen.getByRole('button', { name: 'save' }))

      await waitFor(() => expect(saveChangesMock).toBeCalled())
    })

    test('it should call saveChanges when false variation with targets is updated and saved', async () => {
      const saveChangesMock = jest.fn()

      jest.spyOn(usePatchFeatureFlagMock, 'default').mockReturnValue({ saveChanges: saveChangesMock, loading: false })

      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      await userEvent.click(screen.getByText('cf.featureFlags.rules.addTargeting'))
      await userEvent.click(screen.getByTestId('variation_option_false'))

      const trueTargetsDropdown = document.querySelector('input[name="targetingRuleItems[0].targets"]') as HTMLElement
      await waitFor(() => expect(trueTargetsDropdown).toBeInTheDocument())

      await userEvent.click(document.querySelector('input[name="targetingRuleItems[0].targets"]') as HTMLElement)
      await waitFor(() => screen.getByText('target_2'))
      await userEvent.click(screen.getByText('target_2'))

      await userEvent.click(screen.getByRole('button', { name: 'save' }))

      await waitFor(() => expect(saveChangesMock).toBeCalled())
    })

    test('it should call saveChanges when true variation with target groups is updated and saved', async () => {
      const saveChangesMock = jest.fn()

      jest.spyOn(usePatchFeatureFlagMock, 'default').mockReturnValue({ saveChanges: saveChangesMock, loading: false })

      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      await userEvent.click(screen.getByText('cf.featureFlags.rules.addTargeting'))
      await userEvent.click(screen.getByTestId('variation_option_true'))

      const trueTargetGroupsDropdown = document.querySelector(
        'input[name="targetingRuleItems[0].targetGroups"]'
      ) as HTMLElement

      await waitFor(() => expect(trueTargetGroupsDropdown).toBeInTheDocument())
      await userEvent.click(trueTargetGroupsDropdown)

      await waitFor(() => expect(screen.getByText('target_group_2')).toBeInTheDocument())
      await userEvent.click(screen.getByText('target_group_2'))

      await userEvent.click(screen.getByRole('button', { name: 'save' }))

      await waitFor(() => expect(saveChangesMock).toBeCalled())
    })

    test('it should call saveChanges when false variation with target groups is updated and saved', async () => {
      const saveChangesMock = jest.fn()

      jest.spyOn(usePatchFeatureFlagMock, 'default').mockReturnValue({ saveChanges: saveChangesMock, loading: false })

      renderComponent({
        featureFlagData: {
          ...mockFeature,
          envProperties: {
            pipelineConfigured: false,
            pipelineDetails: undefined,
            defaultServe: { variation: 'false' },
            environment: 'qatest',
            modifiedAt: 1635333973373,
            offVariation: 'false',
            rules: [],
            state: 'off',
            variationMap: [],
            version: 56
          }
        }
      })

      await userEvent.click(screen.getByText('cf.featureFlags.rules.addTargeting'))
      await userEvent.click(screen.getByTestId('variation_option_false'))

      const trueTargetGroupsDropdown = document.querySelector(
        'input[name="targetingRuleItems[0].targetGroups"]'
      ) as HTMLElement

      await waitFor(() => expect(trueTargetGroupsDropdown).toBeInTheDocument())
      await userEvent.click(trueTargetGroupsDropdown)

      await waitFor(() => expect(screen.getByText('target_group_2')).toBeInTheDocument())
      await userEvent.click(screen.getByText('target_group_2'))

      await userEvent.click(screen.getByRole('button', { name: 'save' }))

      await waitFor(() => expect(saveChangesMock).toBeCalled())
    })

    test('it should reset form correctly when cancel button clicked', async () => {
      renderComponent()

      const flagToggle = screen.getByTestId('flag-status-switch')
      expect(flagToggle).toBeChecked()
      await userEvent.click(flagToggle)
      expect(flagToggle).not.toBeChecked()

      const cancelButton = screen.getByText('cancel')
      expect(cancelButton).toBeInTheDocument()

      await userEvent.click(cancelButton)
      expect(flagToggle).toBeChecked()
    })
  })

  describe('rbac', () => {
    const getPermissionMap = (canEdit: boolean, canToggle: boolean): Map<string, boolean> => {
      const permissionMap = new Map()
      permissionMap.set(PermissionIdentifier.EDIT_FF_FEATUREFLAG, canEdit)
      permissionMap.set(PermissionIdentifier.TOGGLE_FF_FEATUREFLAG, canToggle)

      return permissionMap
    }

    test('it should disable the toggle when TOGGLE_FF_FEATUREFLAG is false', async () => {
      renderComponent({}, getPermissionMap(true, false))

      expect(screen.getByTestId('flag-status-switch')).toBeDisabled()
    })

    test('it should enable the toggle when TOGGLE_FF_FEATUREFLAG is true', async () => {
      renderComponent({}, getPermissionMap(true, true))

      expect(screen.getByTestId('flag-status-switch')).toBeEnabled()
    })

    test('it should disable non-toggle inputs when EDIT_FF_FEATUREFLAG is false', async () => {
      renderComponent({}, getPermissionMap(false, true))

      document
        .querySelectorAll('input:not([data-testid="flag-status-switch"])')
        .forEach(input => expect(input).toBeDisabled())
    })

    test('it should enable non-toggle inputs when EDIT_FF_FEATUREFLAG is true', async () => {
      renderComponent({}, getPermissionMap(true, true))

      document
        .querySelectorAll('input:not([data-testid="flag-status-switch"])')
        .forEach(input => expect(input).toBeEnabled())
    })
  })
})
