/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as pipelineNg from 'services/pipeline-ng'
import { mockRepos, mockBranches, gitConnectorMock } from '@gitsync/components/GitSyncForm/__tests__/mockdata'
import { ResourceType } from '@common/interfaces/GitSyncInterface'
import routes from '@common/RouteDefinitions'
import { accountPathProps, orgPathProps, pipelineModuleParams, projectPathProps } from '@common/utils/routeUtils'
import { TestWrapper } from '@common/utils/testUtils'
import ImportResource from '../ImportResource'

jest.mock('services/pipeline-ng', () => ({
  importPipelineWithoutIdPromise: jest.fn().mockImplementation(() => Promise.resolve({ status: 'SUCCESS' }))
}))

const getGitConnector = jest.fn(() => Promise.resolve(gitConnectorMock))
const fetchRepos = jest.fn(() => Promise.resolve(mockRepos))
const fetchBranches = jest.fn(() => Promise.resolve(mockBranches))

jest.mock('services/cd-ng', () => ({
  getConnectorListV2Promise: jest.fn(() => Promise.resolve(gitConnectorMock)),
  useGetConnector: jest.fn().mockImplementation(() => {
    return { data: gitConnectorMock.data.content[0], refetch: getGitConnector, loading: false }
  }),
  useGetListOfReposByRefConnector: jest.fn().mockImplementation(() => {
    return { data: mockRepos, refetch: fetchRepos, loading: false }
  }),
  useGetListOfBranchesByRefConnectorV2: jest.fn().mockImplementation(() => {
    return { data: mockBranches, refetch: fetchBranches }
  }),
  useGetSettingsList: jest.fn().mockImplementation(() => {
    return { data: { data: [] } }
  })
}))

const TEST_PIPELINES_PATH = routes.toPipelines({
  ...accountPathProps,
  ...orgPathProps,
  ...projectPathProps,
  ...pipelineModuleParams
})

const TEST_PATH_PARAMS = {
  accountId: 'testAcc',
  orgIdentifier: 'testOrg',
  projectIdentifier: 'test',
  module: 'cd'
}

const onSuccess = jest.fn()
const onFailure = jest.fn()
const onCancelClick = jest.fn()

const initialValues = {
  identifier: 'Github_Pipeline',
  name: 'Github Pipeline',
  description: 'importing pipeline',
  connectorRef: 'testConnectorRef',
  repoName: 'testRepo',
  branch: 'testBranch',
  filePath: '.harness/Github_Pipeline.yaml'
}

describe('ImportResource - Pipeline', () => {
  beforeEach(() => {
    onSuccess.mockReset()
    onFailure.mockReset()
    onCancelClick.mockReset()
    jest.clearAllMocks()
  })

  test('when onSuccess prop is not passed - provide required values and click on import button', async () => {
    const { container } = render(
      <TestWrapper path={TEST_PIPELINES_PATH} pathParams={TEST_PATH_PARAMS}>
        <ImportResource
          resourceType={ResourceType.PIPELINES}
          onCancelClick={onCancelClick}
          initialValues={initialValues}
        />
      </TestWrapper>
    )

    const importButton = screen.getByText('common.import')
    expect(container).toMatchSnapshot()
    await act(async () => {
      fireEvent.click(importButton)
    })

    await waitFor(async () => expect(await screen.findByText('pipeline.importSuccessMessage')).toBeInTheDocument())

    await waitFor(() => expect(onSuccess).not.toHaveBeenCalled())
    expect(onSuccess).toHaveBeenCalledTimes(0)
  })

  test('snapshot testing', () => {
    const { container } = render(
      <TestWrapper path={TEST_PIPELINES_PATH} pathParams={TEST_PATH_PARAMS}>
        <ImportResource resourceType={ResourceType.PIPELINES} />
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
  })

  test('clicking on cancel button should call onCancelClick prop function', async () => {
    const { getByText } = render(
      <TestWrapper path={TEST_PIPELINES_PATH} pathParams={TEST_PATH_PARAMS}>
        <ImportResource resourceType={ResourceType.PIPELINES} onCancelClick={onCancelClick} />
      </TestWrapper>
    )

    const cancelButton = getByText('cancel')
    await userEvent.click(cancelButton)
    expect(onCancelClick).toHaveBeenCalled()
    expect(onCancelClick).toHaveBeenCalledTimes(1)
  })

  test('when onCancelClick prop is not passed - clicking on cancel button should call onCancelClick prop function', async () => {
    const { getByText } = render(
      <TestWrapper path={TEST_PIPELINES_PATH} pathParams={TEST_PATH_PARAMS}>
        <ImportResource resourceType={ResourceType.PIPELINES} />
      </TestWrapper>
    )

    const cancelButton = getByText('cancel')
    await userEvent.click(cancelButton)
    expect(onCancelClick).not.toHaveBeenCalled()
    expect(onCancelClick).toHaveBeenCalledTimes(0)
  })

  test('provide required values and click on import button', async () => {
    const { container } = render(
      <TestWrapper path={TEST_PIPELINES_PATH} pathParams={TEST_PATH_PARAMS}>
        <ImportResource
          resourceType={ResourceType.PIPELINES}
          onCancelClick={onCancelClick}
          onSuccess={onSuccess}
          initialValues={initialValues}
        />
      </TestWrapper>
    )

    const importButton = screen.getByText('common.import')
    expect(container).toMatchSnapshot()
    await act(async () => {
      fireEvent.click(importButton)
    })

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  test('when import throws error WITHOUT responseMessages', async () => {
    jest.spyOn(pipelineNg, 'importPipelineWithoutIdPromise').mockImplementation((): any => {
      return Promise.reject({
        status: 'ERROR',
        code: 'INVALID_REQUEST',
        message: 'Invalid Request: Error while importing pipeline'
      })
    })

    const { container, getByText } = render(
      <TestWrapper path={TEST_PIPELINES_PATH} pathParams={TEST_PATH_PARAMS}>
        <ImportResource
          resourceType={ResourceType.PIPELINES}
          onCancelClick={onCancelClick}
          onSuccess={onSuccess}
          onFailure={onFailure}
          initialValues={initialValues}
        />
      </TestWrapper>
    )

    const importButton = getByText('common.import')
    expect(container).toMatchSnapshot()
    await userEvent.click(importButton)

    await waitFor(() => expect(getByText('Invalid Request: Error while importing pipeline')).toBeDefined())
    await waitFor(() => expect(onFailure).toHaveBeenCalled())
    expect(onFailure).toHaveBeenCalledTimes(1)
  })

  test('when import throws error WITHOUT message and responseMessages', async () => {
    jest.spyOn(pipelineNg, 'importPipelineWithoutIdPromise').mockImplementation((): any => {
      return Promise.reject({
        status: 'ERROR'
      })
    })

    const { container, getByText } = render(
      <TestWrapper path={TEST_PIPELINES_PATH} pathParams={TEST_PATH_PARAMS}>
        <ImportResource
          resourceType={ResourceType.PIPELINES}
          onCancelClick={onCancelClick}
          onSuccess={onSuccess}
          initialValues={initialValues}
        />
      </TestWrapper>
    )

    const importButton = getByText('common.import')
    expect(container).toMatchSnapshot()
    await userEvent.click(importButton)

    await waitFor(() => expect(getByText('somethingWentWrong')).toBeDefined())
    await waitFor(() => expect(onFailure).not.toHaveBeenCalled())
    expect(onFailure).toHaveBeenCalledTimes(0)
  })

  test('when import throws error WITH responseMessages', async () => {
    jest.spyOn(pipelineNg, 'importPipelineWithoutIdPromise').mockImplementation((): any => {
      return Promise.reject({
        status: 'ERROR',
        code: 'INVALID_REQUEST',
        message: 'Invalid Request: Error while importing pipeline',
        responseMessages: [
          {
            code: 'HINT',
            level: 'INFO',
            message: 'Please check if pipeline you are trying to import exist in Github'
          },
          {
            code: 'EXPLANATION',
            level: 'INFO',
            message: 'Either file you are trying to import does not exist or it was deleted'
          },
          {
            code: 'SCM_CONFLICT_ERROR_V2',
            level: 'ERROR',
            message: 'Error while importing pipeline because file does not exist'
          }
        ]
      })
    })

    const { getByText } = render(
      <TestWrapper path={TEST_PIPELINES_PATH} pathParams={TEST_PATH_PARAMS}>
        <ImportResource
          resourceType={ResourceType.PIPELINES}
          onCancelClick={onCancelClick}
          onSuccess={onSuccess}
          onFailure={onFailure}
          initialValues={initialValues}
        />
      </TestWrapper>
    )

    const importButton = getByText('common.import')
    await userEvent.click(importButton)
    await waitFor(() => expect(getByText('Error while importing pipeline because file does not exist')).toBeDefined())
    expect(getByText('common.errorHandler.issueCouldBe')).toBeDefined()
    expect(getByText('- Either file you are trying to import does not exist or it was deleted')).toBeDefined()
    expect(getByText('common.errorHandler.tryTheseSuggestions')).toBeDefined()
    expect(getByText('- Please check if pipeline you are trying to import exist in Github')).toBeDefined()
    await waitFor(() => expect(onFailure).toHaveBeenCalled())
    expect(onFailure).toHaveBeenCalledTimes(1)
  })

  test('when import succeeds with error WITHOUT responseMessages', async () => {
    jest.spyOn(pipelineNg, 'importPipelineWithoutIdPromise').mockImplementation((): any => {
      return Promise.resolve({
        status: 'ERROR',
        code: 'INVALID_REQUEST',
        message: 'Invalid Request: Error while importing pipeline'
      })
    })

    const { getByText } = render(
      <TestWrapper path={TEST_PIPELINES_PATH} pathParams={TEST_PATH_PARAMS}>
        <ImportResource
          resourceType={ResourceType.PIPELINES}
          onCancelClick={onCancelClick}
          onSuccess={onSuccess}
          onFailure={onFailure}
          initialValues={initialValues}
        />
      </TestWrapper>
    )

    const importButton = getByText('common.import')
    await userEvent.click(importButton)

    await waitFor(() => expect(getByText('Invalid Request: Error while importing pipeline')).toBeDefined())
    await waitFor(() => expect(onFailure).toHaveBeenCalled())
    expect(onFailure).toHaveBeenCalledTimes(1)
  })

  test('when import succeeds with error WITHOUT message and responseMessages', async () => {
    jest.spyOn(pipelineNg, 'importPipelineWithoutIdPromise').mockImplementation((): any => {
      return Promise.resolve({
        status: 'ERROR'
      })
    })

    const { getByText } = render(
      <TestWrapper path={TEST_PIPELINES_PATH} pathParams={TEST_PATH_PARAMS}>
        <ImportResource
          resourceType={ResourceType.PIPELINES}
          onCancelClick={onCancelClick}
          onSuccess={onSuccess}
          initialValues={initialValues}
        />
      </TestWrapper>
    )

    const importButton = getByText('common.import')
    await userEvent.click(importButton)
    await waitFor(() => expect(getByText('somethingWentWrong')).toBeDefined())
    await waitFor(() => expect(onFailure).not.toHaveBeenCalled())
    expect(onFailure).toHaveBeenCalledTimes(0)
  })

  test('when import succeeds with error WITH responseMessages', async () => {
    jest.spyOn(pipelineNg, 'importPipelineWithoutIdPromise').mockImplementation((): any => {
      return Promise.resolve({
        status: 'ERROR',
        code: 'INVALID_REQUEST',
        message: 'Invalid Request: Error while importing pipeline',
        responseMessages: [
          {
            code: 'HINT',
            level: 'INFO',
            message: 'Please check if pipeline you are trying to import exist in Github'
          },
          {
            code: 'EXPLANATION',
            level: 'INFO',
            message: 'Either file you are trying to import does not exist or it was deleted'
          },
          {
            code: 'SCM_CONFLICT_ERROR_V2',
            level: 'ERROR',
            message: 'Error while importing pipeline because file does not exist'
          }
        ]
      })
    })

    const { getByText } = render(
      <TestWrapper path={TEST_PIPELINES_PATH} pathParams={TEST_PATH_PARAMS}>
        <ImportResource
          resourceType={ResourceType.PIPELINES}
          onCancelClick={onCancelClick}
          onSuccess={onSuccess}
          onFailure={onFailure}
          initialValues={initialValues}
        />
      </TestWrapper>
    )

    const importButton = getByText('common.import')
    await userEvent.click(importButton)
    await waitFor(() => expect(getByText('Error while importing pipeline because file does not exist')).toBeDefined())
    expect(getByText('common.errorHandler.issueCouldBe')).toBeDefined()
    expect(getByText('- Either file you are trying to import does not exist or it was deleted')).toBeDefined()
    expect(getByText('common.errorHandler.tryTheseSuggestions')).toBeDefined()
    expect(getByText('- Please check if pipeline you are trying to import exist in Github')).toBeDefined()
    await waitFor(() => expect(onFailure).toHaveBeenCalled())
    expect(onFailure).toHaveBeenCalledTimes(1)
  })
})
