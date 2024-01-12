/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useFormikContext } from 'formik'
import { getAllByRole, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AllowedTypes, MultiTypeInputType } from '@harness/uicore'
import {
  PipelineContext,
  PipelineContextInterface
} from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import pipelineContextMock from '@pipeline/components/PipelineStudio/PipelineCanvas/__tests__/PipelineCanvasGitSyncTestHelper'
import { StageElementWrapperConfig } from 'services/pipeline-ng'
import * as allUtils from '@common/utils/utils'

import { findDialogContainer, TestWrapper } from '@common/utils/testUtils'

import DeployEnvironmentEntityWidget from '../DeployEnvironmentEntityWidget'
import { mockPipelineData } from './mocks'

/**
 * Areas to cover
 * 1. Rendering and checking toggle states
 *  a. single
 *  b. multi env
 *  c. env group
 *  d. with & without gitops
 *  e. with env group FF enabled
 *  f. disabled/readonly state
 *  g. confirmation dialog when form contains data
 * 2. Abstract out the functions to utils if possible. Maybe return promises and handle things
 */

const allowableTypes = [
  MultiTypeInputType.FIXED,
  MultiTypeInputType.RUNTIME,
  MultiTypeInputType.EXPRESSION
] as AllowedTypes

jest.mock('../DeployEnvironment/DeployEnvironment', () => ({
  __esModule: true,
  default: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const formik = useFormikContext()
    return <div data-testid="mock-deploy-environment">{JSON.stringify(formik.values)}</div>
  }
}))

jest.mock('@pipeline/components/AbstractSteps/StepWidget', () => ({
  ...(jest.requireActual('@pipeline/components/AbstractSteps/StepWidget') as any),
  StepWidget: () => {
    const formik = useFormikContext()
    return <div className="step-widget-mock">{JSON.stringify(formik.values)}</div>
  }
}))

const customStageMock = {
  stage: {
    name: 's123',
    identifier: 's123',
    description: '',
    type: 'Custom',
    spec: {
      execution: {
        steps: []
      }
    }
  }
}

const getContextValue = (): PipelineContextInterface => {
  return {
    ...pipelineContextMock,
    state: {
      ...pipelineContextMock.state,
      selectionState: { selectedStageId: 's2' },
      pipeline: mockPipelineData
    },
    getStageFromPipeline: jest.fn(() => {
      return { stage: (pipelineContextMock.state.pipeline.stages as StageElementWrapperConfig[])[0], parent: undefined }
    })
  } as unknown as PipelineContextInterface
}

describe('deploy environment entity widget', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  test('renders single environment and can toggle empty state to multi environment', async () => {
    render(
      <TestWrapper>
        <DeployEnvironmentEntityWidget
          initialValues={{ environment: '', category: 'single' }}
          allowableTypes={allowableTypes}
          stageIdentifier="dummy_stage"
          readonly={false}
          gitOpsEnabled={true}
          serviceIdentifiers={[]}
          deploymentType={'Kubernetes'}
          customDeploymentRef={{
            templateRef: 'test'
          }}
        />
      </TestWrapper>
    )

    const multiEnvToggle = screen.getByRole('checkbox')
    await waitFor(() => expect(multiEnvToggle).not.toBeChecked())

    await userEvent.click(multiEnvToggle)

    await waitFor(() => expect(multiEnvToggle).toBeChecked())
    await waitFor(() =>
      expect(
        screen.getByText('{"category":"multi","parallel":true,"environments":[],"environmentFilters":{}}')
      ).toBeVisible()
    )
  })

  test('renders single environment and can toggle with state to multi environment', async () => {
    jest.spyOn(allUtils, 'isMultiTypeExpression').mockImplementation((): any => {
      return false
    })
    const { getByText } = render(
      <TestWrapper>
        <DeployEnvironmentEntityWidget
          initialValues={{ environment: 'Env_1', category: 'single' }}
          allowableTypes={allowableTypes}
          stageIdentifier="dummy_stage"
          readonly={false}
          gitOpsEnabled={true}
          serviceIdentifiers={[]}
          deploymentType={'Kubernetes'}
          customDeploymentRef={{
            templateRef: 'test'
          }}
        />
      </TestWrapper>
    )

    const multiEnvToggle = screen.getByRole('checkbox')
    await waitFor(() => expect(multiEnvToggle).not.toBeChecked())

    await userEvent.click(multiEnvToggle)

    const buttonsInDialog = getAllByRole(findDialogContainer()!, 'button')
    await userEvent.click(buttonsInDialog[1])

    await waitFor(() => expect(multiEnvToggle).not.toBeChecked())

    await userEvent.click(multiEnvToggle)
    await userEvent.click(buttonsInDialog[0])

    await waitFor(() => expect(multiEnvToggle).toBeChecked())
    await waitFor(() =>
      expect(
        screen.getByText(
          '{"category":"multi","parallel":true,"environments":[{"label":"Env_1","value":"Env_1"}],"environmentFilters":{},"clusters":{"Env_1":[]}}'
        )
      ).toBeInTheDocument()
    )

    await userEvent.click(multiEnvToggle)

    const confirmationDialogs = document.querySelectorAll('.bp3-dialog')

    const buttonsInDialog2 = getAllByRole(confirmationDialogs[1] as HTMLElement, 'button')

    await userEvent.click(buttonsInDialog2[0])

    expect(getByText('cd.pipelineSteps.environmentTab.singleEnvironmentDialogTitleText')).toBeVisible()
    expect(getByText('cd.pipelineSteps.environmentTab.singleEnvironmentConfirmationText')).toBeVisible()
  })

  test('renders single environment and can toggle with state to environment group', async () => {
    jest.spyOn(allUtils, 'isMultiTypeExpression').mockImplementation((): any => {
      return false
    })
    const { getByText } = render(
      <TestWrapper>
        <DeployEnvironmentEntityWidget
          initialValues={{ environment: 'Env_1', category: 'single' }}
          allowableTypes={allowableTypes}
          stageIdentifier="dummy_stage"
          readonly={false}
          gitOpsEnabled={false}
          serviceIdentifiers={[]}
          deploymentType={'Kubernetes'}
          customDeploymentRef={{
            templateRef: 'test'
          }}
        />
      </TestWrapper>
    )

    const multiEnvToggle = screen.getByRole('checkbox')
    await waitFor(() => expect(multiEnvToggle).not.toBeChecked())

    await userEvent.click(multiEnvToggle)

    const buttonsInDialog = getAllByRole(findDialogContainer()!, 'button')

    await userEvent.click(buttonsInDialog[0])

    await waitFor(() => expect(multiEnvToggle).toBeChecked())
    await waitFor(() =>
      expect(
        screen.getByText(
          '{"category":"multi","parallel":true,"environments":[{"label":"Env_1","value":"Env_1"}],"environmentFilters":{},"infrastructures":{}}'
        )
      ).toBeInTheDocument()
    )

    await waitFor(async () => {
      const envGroupInput = screen.queryByText('common.environmentGroup.label') as Element
      expect(envGroupInput).toBeInTheDocument()

      await userEvent.click(envGroupInput)
    })

    const confirmationDialogs = document.querySelectorAll('.bp3-dialog')

    const buttonsInDialog2 = getAllByRole(confirmationDialogs[1] as HTMLElement, 'button')

    await userEvent.click(buttonsInDialog2[0])

    expect(getByText('cd.pipelineSteps.environmentTab.environmentGroupDialogTitleText')).toBeVisible()
    expect(getByText('cd.pipelineSteps.environmentTab.environmentGroupConfirmationText')).toBeVisible()
  })

  test('renders single environment as expression and can toggle with state to multi environment', async () => {
    jest.spyOn(allUtils, 'isMultiTypeExpression').mockImplementation((): any => {
      return true
    })
    const { getByText } = render(
      <TestWrapper>
        <DeployEnvironmentEntityWidget
          initialValues={{ environment: '<+pipeline.name>', category: 'single' }}
          allowableTypes={allowableTypes}
          stageIdentifier="dummy_stage"
          readonly={false}
          gitOpsEnabled={true}
          serviceIdentifiers={[]}
          deploymentType={'Kubernetes'}
          customDeploymentRef={{
            templateRef: 'test'
          }}
        />
      </TestWrapper>
    )

    const multiEnvToggle = screen.getByRole('checkbox')
    await waitFor(() => expect(multiEnvToggle).not.toBeChecked())

    await userEvent.click(multiEnvToggle)

    await waitFor(() => {
      expect(getByText('cd.pipelineSteps.environmentTab.multiEnvironmentsDialogTitleText')).toBeVisible()
      expect(getByText('cd.pipelineSteps.environmentTab.multiEnvironmentsClearConfirmationText')).toBeVisible()
    })

    const buttonsInDialog = getAllByRole(findDialogContainer()!, 'button')
    await userEvent.click(buttonsInDialog[0])

    await waitFor(() => expect(multiEnvToggle).toBeChecked())
  })

  test('environment propagation should be available', async () => {
    const customStageMockContextValue = {
      ...getContextValue(),
      getStageFromPipeline: jest.fn(() => {
        return { stage: customStageMock as StageElementWrapperConfig, parent: undefined }
      })
    } as unknown as PipelineContextInterface
    const { rerender } = render(
      <TestWrapper>
        <PipelineContext.Provider value={customStageMockContextValue}>
          <DeployEnvironmentEntityWidget
            initialValues={{ environment: '<+input>', category: 'single' }}
            allowableTypes={allowableTypes}
            stageIdentifier="s123"
            readonly={false}
            gitOpsEnabled={false}
            serviceIdentifiers={[]}
            deploymentType={'Kubernetes'}
            customDeploymentRef={{
              templateRef: ''
            }}
          />
        </PipelineContext.Provider>
      </TestWrapper>
    )

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('cd.pipelineSteps.environmentTab.propagateEnvironmentFrom')).not.toBeInTheDocument()
      expect(screen.queryByText('cd.pipelineSteps.environmentTab.deployToDifferentEnvironment')).not.toBeInTheDocument()
    })

    rerender(
      <TestWrapper>
        <PipelineContext.Provider value={getContextValue()}>
          <DeployEnvironmentEntityWidget
            initialValues={{ environment: '<+input>', category: 'single' }}
            allowableTypes={allowableTypes}
            stageIdentifier="s2"
            readonly={false}
            gitOpsEnabled={false}
            serviceIdentifiers={[]}
            deploymentType={'Kubernetes'}
            customDeploymentRef={{
              templateRef: ''
            }}
          />
        </PipelineContext.Provider>
      </TestWrapper>
    )

    const multiEnvToggle = screen.getByRole('checkbox')
    await waitFor(() => expect(multiEnvToggle).not.toBeChecked())

    await waitFor(() => {
      expect(screen.getByText('cd.pipelineSteps.environmentTab.propagateEnvironmentFrom')).toBeVisible()
      expect(screen.getByText('cd.pipelineSteps.environmentTab.deployToDifferentEnvironment')).toBeVisible()
    })
  })
})
