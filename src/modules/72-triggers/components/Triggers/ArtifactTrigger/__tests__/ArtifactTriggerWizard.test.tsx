/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import {
  render,
  act,
  fireEvent,
  waitFor,
  getByText as getByTextBody,
  getByPlaceholderText as getByPlaceholderTextBody,
  getByTestId
} from '@testing-library/react'
import { defaultAppStoreValues } from '@common/utils/DefaultAppStoreData'
import { TestWrapper, findDialogContainer, findPopoverContainer } from '@common/utils/testUtils'
import * as FeatureFlag from '@common/hooks/useFeatureFlag'

import {
  GetPipelineResponse,
  GetTemplateFromPipelineResponse,
  GetMergeInputSetFromPipelineTemplateWithListInputResponse,
  ConnectorListV2
} from '@modules/72-triggers/pages/triggers/__tests__/sharedMockResponses'

import TriggerFactory from '@triggers/factory/TriggerFactory'
import { PipelineResponse } from '@modules/72-triggers/pages/triggers/__tests__/PipelineDetailsMocks'

jest.mock('services/pipeline-ng', () => ({
  useGetPipeline: jest.fn(() => GetPipelineResponse),
  useGetPipelineSummary: jest.fn(() => PipelineResponse),
  useGetTemplateFromPipeline: jest.fn(() => GetTemplateFromPipelineResponse),
  useCreateTrigger: jest.fn(() => ({
    mutate: jest.fn()
  })),
  useUpdateTrigger: jest.fn(() => ({
    mutate: jest.fn()
  })),
  useGetMergeInputSetFromPipelineTemplateWithListInput: jest.fn(() => ({
    mutate: jest.fn(() => GetMergeInputSetFromPipelineTemplateWithListInputResponse)
  })),
  useGetTrigger: jest.fn(() => ({})),
  useGetSchemaYaml: jest.fn(() => ({})),
  useGetStagesExecutionList: jest.fn(() => ({}))
}))

jest.mock('services/cd-ng', () => ({
  getConnectorListV2Promise: jest.fn(() => Promise.resolve(ConnectorListV2)),
  useGetConnector: jest.fn(() => ({})),
  useListGitSync: jest.fn(() => ({})),
  useGetImagesListForEcr: jest.fn(() => ({})),
  useGetSettingValue: jest.fn(() => ({ data: { data: { value: 'true' } } }))
}))

jest.mock('@harnessio/react-pipeline-service-client', () => ({
  useGetIndividualStaticSchemaQuery: jest.fn(() => ({}))
}))

const params = {
  accountId: 'testAcc',
  orgIdentifier: 'testOrg',
  projectIdentifier: 'test',
  pipelineIdentifier: 'pipeline',
  triggerIdentifier: 'triggerIdentifier',
  module: 'cd'
}

function WrapperComponent(): JSX.Element {
  const trigger = TriggerFactory.getTrigger('Gcr')
  const values = trigger.getDefaultValues({})

  return (
    <TestWrapper
      pathParams={params}
      defaultAppStoreValues={defaultAppStoreValues}
      queryParams={{ triggerType: 'Artifact', artifactType: 'Gcr' }}
    >
      <div>
        {trigger.renderTrigger({
          type: 'Gcr',
          baseType: 'Artifact',
          initialValues: values,
          isNewTrigger: true
        })}
      </div>
    </TestWrapper>
  )
}

describe('ArtifactTriggerWizard Triggers tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('Create new GCR trigger', async () => {
    jest.spyOn(FeatureFlag, 'useFeatureFlags').mockReturnValue({
      CI_YAML_VERSIONING: false,
      NG_SVC_ENV_REDESIGN: true,
      CD_TRIGGERS_REFACTOR: true
    })

    const { getByText, getByPlaceholderText, getByLabelText } = render(<WrapperComponent />)

    await waitFor(() => {
      expect(getByText('pipeline.artifactTriggerConfigPanel.listenOnNewArtifact')).toBeInTheDocument()
    })

    act(() => {
      fireEvent.change(getByPlaceholderText('common.namePlaceholder'), { target: { value: 'test gcr' } })
    })

    act(() => {
      fireEvent.click(getByLabelText('pipeline.artifactTriggerConfigPanel.defineArtifactSource'))
    })

    // GCP Connector
    const dialog = findDialogContainer() as HTMLElement
    await waitFor(() => getByTextBody(dialog, 'platform.connectors.artifactRepository'))
    act(() => {
      fireEvent.click(getByTestId(dialog, 'cr-field-connectorId'))
    })
    const connectorDialog = document.querySelectorAll('.bp3-dialog')[1] as HTMLElement
    await waitFor(() => getByTextBody(connectorDialog, 'common.entityReferenceTitle'))
    act(() => {
      fireEvent.click(getByTextBody(connectorDialog, 'Test_GCP_Connector'))
    })
    act(() => {
      fireEvent.click(getByTextBody(connectorDialog, 'entityReference.apply'))
    })
    act(() => {
      fireEvent.click(getByTextBody(dialog, 'continue'))
    })

    // Artifact Details
    await waitFor(() => getByTextBody(dialog, 'pipeline.artifactsSelection.artifactDetails'))
    const carets = dialog.querySelectorAll('[data-icon="chevron-down"]')
    act(() => {
      fireEvent.click(carets[0])
    })
    const popover = findPopoverContainer() as HTMLElement
    await waitFor(() => getByTextBody(popover, 'gcr.io'))
    act(() => {
      fireEvent.click(getByTextBody(popover, 'gcr.io'))
    })
    act(() => {
      fireEvent.change(
        getByPlaceholderTextBody(dialog, 'pipeline.artifactsSelection.existingDocker.imageNamePlaceholder'),
        { target: { value: '/test' } }
      )
    })
    act(() => {
      fireEvent.click(getByTextBody(dialog, 'submit'))
    })

    // Check for the Artifact data
    // await waitFor(() => getByText('Test_GCP_Connector'))

    // Move to condition tab
    act(() => {
      fireEvent.click(getByLabelText('continue'))
    })

    // await waitFor(() => getByText('triggers.conditionsPanel.metadataConditions'))
  })
})
