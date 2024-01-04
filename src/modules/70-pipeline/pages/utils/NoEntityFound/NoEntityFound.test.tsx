/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { noop } from 'lodash-es'
import type { Error, Failure } from 'services/pipeline-ng'
import { GitSyncTestWrapper } from '@common/utils/gitSyncTestUtils'
import { StoreType } from '@common/constants/GitSyncTypes'
import routes from '@common/RouteDefinitions'
import { accountPathProps, pipelineModuleParams, pipelinePathProps } from '@common/utils/routeUtils'
import { TestWrapper } from '@common/utils/testUtils'
import NoEntityFound from './NoEntityFound'

const mockBranches = {
  status: 'SUCCESS',
  data: {
    branches: [{ name: 'main' }, { name: 'main-demo' }, { name: 'main-patch' }, { name: 'main-patch2' }],
    defaultBranch: { name: 'main' }
  },
  metaData: null,
  correlationId: 'correlationId'
}

const errorObjMock: Error = {
  status: 'ERROR',
  code: 'HINT',
  message: 'Please check the requested file path / branch / Github repo name if they exist or not.',
  correlationId: 'cf6bd38a-7eb7-4c2d-8e67-64c57ddb1d1d',
  responseMessages: [
    {
      code: 'HINT',
      level: 'INFO',
      message: 'Please check the requested file path / branch / Github repo name if they exist or not.',
      failureTypes: []
    },
    {
      code: 'EXPLANATION',
      level: 'INFO',
      message:
        "The requested file path doesn't exist in git. Possible reasons can be:\n1. The requested file path doesn't exist for given branch and repo\n2. The given branch or repo is invalid",
      failureTypes: []
    },
    { code: 'SCM_BAD_REQUEST', level: 'ERROR', message: 'File not found', failureTypes: [] }
  ]
}

const failureObj: Failure = {
  status: 'ERROR',
  code: 'HINT',
  message: 'Please check the requested file path / branch / Github repo name if they exist or not.',
  correlationId: 'cf6bd38a-7eb7-4c2d-8e67-64c57ddb1d1d'
}

const handleRemoteBranchChangMock = jest.fn((selectedBranch?: string) => branchChangeHandler(selectedBranch))
const branchChangeHandler = jest.fn().mockImplementation((selectedBranch?: string) => noop(selectedBranch))
const refetchBranches = jest.fn(() => Promise.resolve(mockBranches))
jest.mock('services/cd-ng', () => ({
  useGetListOfBranchesByRefConnectorV2: jest.fn().mockImplementation(() => {
    return { data: mockBranches, refetch: refetchBranches, error: null, loading: false }
  }),
  useGetListOfBranchesWithStatus: jest.fn().mockImplementation(() => {
    return { data: [], refetch: jest.fn(), error: null, loading: false }
  })
}))

const TEST_PATH = routes.toPipelineStudio({ ...accountPathProps, ...pipelinePathProps, ...pipelineModuleParams })

const renderComponent = (errorObj?: Failure | Error) =>
  render(
    <GitSyncTestWrapper
      path={TEST_PATH}
      pathParams={{
        accountId: 'testAcc',
        orgIdentifier: 'default',
        projectIdentifier: 'testProject',
        pipelineIdentifier: 'abc',
        module: 'cd'
      }}
      queryParams={{
        repoName: 'identifier',
        branch: 'feature',
        connectorRef: 'connectorRef',
        storeType: StoreType.REMOTE
      }}
      defaultAppStoreValues={{ supportingGitSimplification: true }}
    >
      <NoEntityFound entityType="pipeline" identifier="abc" errorObj={errorObj} />
    </GitSyncTestWrapper>
  )

describe('NoEntityFound tests', () => {
  beforeEach(() => {
    refetchBranches.mockReset()
  })

  test('when errorObj is not passed in props', () => {
    const { container } = renderComponent()
    expect(container).toMatchSnapshot()
  })

  test('when errorObj is passed but it does not have responseMessages', () => {
    const { container } = renderComponent(failureObj)
    expect(container).toMatchSnapshot()
  })

  test('when errorObj is passed and it has responseMessages', () => {
    const { container } = renderComponent(errorObjMock)
    expect(container).toMatchSnapshot()
  })

  test('NoEntityFound test for remote Overlay InputSet', async () => {
    const { getByText } = render(
      <TestWrapper
        path={TEST_PATH}
        pathParams={{
          accountId: 'testAcc',
          orgIdentifier: 'default',
          projectIdentifier: 'testProject',
          pipelineIdentifier: 'abc',
          module: 'cd'
        }}
        queryParams={{
          repoName: 'identifier',
          branch: 'feature',
          connectorRef: 'connectorRef',
          storeType: StoreType.REMOTE
        }}
        defaultAppStoreValues={{ supportingGitSimplification: true }}
      >
        <NoEntityFound
          identifier={'o_is'}
          entityType={'overlayInputSet'}
          entityConnectorRef={'connectorRef'}
          gitDetails={{
            repoName: 'isRepoName',
            branch: 'is_branch'
          }}
          errorObj={errorObjMock}
          onBranchChange={handleRemoteBranchChangMock}
        />
      </TestWrapper>
    )
    expect(getByText('pipeline.gitExperience.noEntityFound')).toBeInTheDocument()
    const branchSelect = await screen.findByPlaceholderText('- common.git.selectBranchPlaceholder -')
    expect(branchChangeHandler).toHaveBeenCalledTimes(0)
    expect(branchSelect).toHaveValue('is_branch')
    expect(refetchBranches).toHaveBeenCalledTimes(1)
  })

  test('NoEntityFound test for entities stored in harness code repos (w/o connectorRef)', async () => {
    const { getByText } = render(
      <TestWrapper
        path={TEST_PATH}
        pathParams={{
          accountId: 'testAcc',
          orgIdentifier: 'default',
          projectIdentifier: 'testProject',
          pipelineIdentifier: 'abc',
          module: 'cd'
        }}
        queryParams={{
          repoName: 'identifier',
          branch: 'feature',
          storeType: StoreType.REMOTE
        }}
        defaultAppStoreValues={{ supportingGitSimplification: true }}
      >
        <NoEntityFound
          identifier={'anc'}
          entityType={'pipeline'}
          gitDetails={{
            repoName: 'isRepoName',
            branch: 'is_branch'
          }}
          errorObj={errorObjMock}
          onBranchChange={handleRemoteBranchChangMock}
        />
      </TestWrapper>
    )
    expect(getByText('pipeline.gitExperience.noEntityFound')).toBeInTheDocument()
    const branchSelect = await screen.findByPlaceholderText('- common.git.selectBranchPlaceholder -')
    expect(branchSelect).toHaveValue('is_branch')
    expect(refetchBranches).toHaveBeenCalledTimes(1)
  })

  test('when isGitSyncEnabled is true', () => {
    const { container } = render(
      <GitSyncTestWrapper
        path={TEST_PATH}
        pathParams={{
          accountId: 'testAcc',
          orgIdentifier: 'default',
          projectIdentifier: 'testProject',
          pipelineIdentifier: 'abc',
          module: 'cd'
        }}
        queryParams={{
          repoIdentifier: 'identifier',
          branch: 'feature'
        }}
        defaultAppStoreValues={{ isGitSyncEnabled: true }}
      >
        <NoEntityFound entityType="pipeline" identifier="abc" errorObj={errorObjMock} />
      </GitSyncTestWrapper>
    )
    expect(container).toMatchSnapshot()
  })
})
