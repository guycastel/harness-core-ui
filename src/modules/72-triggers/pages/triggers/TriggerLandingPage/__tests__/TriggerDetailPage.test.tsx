/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom'
import { PipelineResponse } from '@pipeline/pages/pipeline-details/__tests__/PipelineDetailsMocks'
import { accountPathProps, pipelineModuleParams, triggerPathProps } from '@common/utils/routeUtils'
import routes from '@common/RouteDefinitions'
import { TestWrapper } from '@common/utils/testUtils'
import { defaultAppStoreValues } from '@common/utils/DefaultAppStoreData'
import { GetTriggerResponse } from '@triggers/pages/trigger-details/TriggerDetailsMock'
import * as pipelineServices from 'services/pipeline-ng'
import * as cdNg from 'services/cd-ng'
import * as usePermission from '@rbac/hooks/usePermission'
import { GetTriggerDetailsResponse } from '../../__tests__/TriggerDetailPageMock'
import TriggerLandingPage from '../TriggerLandingPage'
import TriggerDetailPage from '../TriggerDetailPage/TriggerDetailPage'
jest.mock('@common/components/YAMLBuilder/YamlBuilder')

const mockUpdateTrigger = jest.fn().mockReturnValue(Promise.resolve({ data: {}, status: {} }))

jest.mock('@harness/uicore', () => ({
  ...jest.requireActual('@harness/uicore'),
  useToaster: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn()
  })
}))
jest.mock('services/pipeline-ng', () => ({
  useGetTrigger: jest.fn(() => GetTriggerResponse),
  useGetPipelineSummary: jest.fn(() => PipelineResponse),
  useGetTriggerDetails: jest.fn(() => GetTriggerDetailsResponse),
  useUpdateTrigger: jest.fn().mockImplementation(() => ({ mutate: mockUpdateTrigger })),
  useGetSchemaYaml: jest.fn(() => ({}))
}))
const TEST_PATH = routes.toTriggersDetailPage({ ...accountPathProps, ...triggerPathProps, ...pipelineModuleParams })

function TestComponent(): React.ReactElement {
  const history = createMemoryHistory()
  return (
    <Router history={history}>
      <TestWrapper
        path={TEST_PATH}
        pathParams={{
          accountId: 'testAcc',
          orgIdentifier: 'testOrg',
          projectIdentifier: 'test',
          pipelineIdentifier: 'pipeline',
          triggerIdentifier: 'triggerIdentifier',
          module: 'cd'
        }}
        defaultAppStoreValues={defaultAppStoreValues}
      >
        <TriggerLandingPage>
          <TriggerDetailPage />
        </TriggerLandingPage>
      </TestWrapper>
    </Router>
  )
}

jest.mock('@harnessio/react-pipeline-service-client', () => ({
  useGetIndividualStaticSchemaQuery: jest.fn(() => ({}))
}))

describe('Test Trigger Detail Page Test', () => {
  test('should test snapshot view', async () => {
    jest.spyOn(usePermission, 'usePermission').mockImplementation(() => [true, true])
    jest.spyOn(cdNg, 'useGetSettingValue').mockImplementation((): any => {
      return { data: { data: { value: 'true' } } }
    })
    const datespy = jest.spyOn(Date.prototype, 'toLocaleDateString')
    const timespy = jest.spyOn(Date.prototype, 'toLocaleTimeString')

    datespy.mockImplementation(() => 'MOCK_DATE')
    timespy.mockImplementation(() => 'MOCK_TIME')

    const { container } = render(<TestComponent />)
    expect(container).toMatchSnapshot()
    const enableTriggerToggle = await screen.findByRole('checkbox', {
      name: /enabled/i
    })
    expect(enableTriggerToggle).toBeChecked()
    await userEvent.click(enableTriggerToggle)
    expect(mockUpdateTrigger).toHaveBeenCalledTimes(1)

    datespy.mockRestore()
    timespy.mockRestore()
  })

  test('Show page spinner if detail card is loading', () => {
    jest.spyOn(pipelineServices, 'useGetTriggerDetails').mockImplementation((): any => {
      return {
        data: [],
        refetch: jest.fn(),
        error: null,
        loading: true
      }
    })
    jest.spyOn(usePermission, 'usePermission').mockImplementation(() => [true, true])
    jest.spyOn(cdNg, 'useGetSettingValue').mockImplementation((): any => {
      return { data: { data: { value: 'true' } } }
    })
    const { container, getAllByText } = render(<TestComponent />)
    //loading icon and text should be visible
    expect(container.querySelector('[data-icon="steps-spinner"]')).toBeDefined()
    expect(getAllByText('Loading, please wait...')).toBeDefined()
  })

  describe('Test with MANDATE_PIPELINE_CREATE_EDIT_PERMISSION_TO_CREATE_EDIT_TRIGGERS: true', () => {
    beforeEach(() => {
      jest.spyOn(cdNg, 'useGetSettingValue').mockImplementation((): any => {
        return { data: { data: { value: 'true' } } }
      })
    })

    test('EXECUTE_PIPELINE: false, EDIT_PIPELINE: true', () => {
      jest.spyOn(usePermission, 'usePermission').mockImplementation(() => [false, true])

      const { container } = render(<TestComponent />)
      expect(container.querySelector('[aria-label="edit"]')).toBeDisabled()
    })

    test('EXECUTE_PIPELINE: true, EDIT_PIPELINE: false', () => {
      jest.spyOn(usePermission, 'usePermission').mockImplementation(() => [true, false])

      const { container } = render(<TestComponent />)
      expect(container.querySelector('[aria-label="edit"]')).toBeDisabled()
    })

    test('EXECUTE_PIPELINE: false, EDIT_PIPELINE: false', () => {
      jest.spyOn(usePermission, 'usePermission').mockImplementation(() => [false, false])

      const { container } = render(<TestComponent />)
      expect(container.querySelector('[aria-label="edit"]')).toBeDisabled()
    })

    test('EXECUTE_PIPELINE: true, EDIT_PIPELINE: true', () => {
      jest.spyOn(usePermission, 'usePermission').mockImplementation(() => [true, true])

      const { container } = render(<TestComponent />)
      expect(container.querySelector('[aria-label="edit"]')).not.toBeDisabled()
    })
  })

  describe('Test with MANDATE_PIPELINE_CREATE_EDIT_PERMISSION_TO_CREATE_EDIT_TRIGGERS: false', () => {
    beforeEach(() => {
      jest.spyOn(cdNg, 'useGetSettingValue').mockImplementation((): any => {
        return { data: { data: { value: 'false' } } }
      })
    })

    test('EXECUTE_PIPELINE: false, EDIT_PIPELINE: true', () => {
      jest.spyOn(usePermission, 'usePermission').mockImplementation(() => [false, true])

      const { container } = render(<TestComponent />)
      expect(container.querySelector('[aria-label="edit"]')).toBeDisabled()
    })

    test('EXECUTE_PIPELINE: true, EDIT_PIPELINE: false', () => {
      jest.spyOn(usePermission, 'usePermission').mockImplementation(() => [true, false])

      const { container } = render(<TestComponent />)
      expect(container.querySelector('[aria-label="edit"]')).not.toBeDisabled()
    })

    test('EXECUTE_PIPELINE: false, EDIT_PIPELINE: false', () => {
      jest.spyOn(usePermission, 'usePermission').mockImplementation(() => [false, false])

      const { container } = render(<TestComponent />)
      expect(container.querySelector('[aria-label="edit"]')).toBeDisabled()
    })

    test('EXECUTE_PIPELINE: true, EDIT_PIPELINE: true', () => {
      jest.spyOn(usePermission, 'usePermission').mockImplementation(() => [true, true])

      const { container } = render(<TestComponent />)
      expect(container.querySelector('[aria-label="edit"]')).not.toBeDisabled()
    })
  })
})
