/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, fireEvent, act, waitFor, screen } from '@testing-library/react'

import userEvent from '@testing-library/user-event'
import * as GitSyncStoreContext from 'framework/GitRepoStore/GitSyncStoreContext'
import { queryByNameAttribute, TestWrapper } from '@common/utils/testUtils'
import { StoreType } from '@common/constants/GitSyncTypes'
import { gitConfigs, sourceCodeManagers, branchStatusMock } from '@platform/connectors/mocks/mock'
import { gitHubMock } from '@gitsync/components/gitSyncRepoForm/__tests__/mockData'
import routes from '@common/RouteDefinitions'
import { modulePathProps, pipelinePathProps, projectPathProps } from '@common/utils/routeUtils'
import { getGitProviderCards } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect'
import PipelineCreate from '../CreateModal/PipelineCreate'
import type { PipelineCreateProps } from '../CreateModal/PipelineCreate'
import { DefaultNewPipelineId } from '../PipelineContext/PipelineActions'

const getString = (key: any): any => {
  return key
}

const afterSave = jest.fn()
const closeModal = jest.fn()

const getListOfBranchesWithStatus = jest.fn(() => Promise.resolve(branchStatusMock))
const getListGitSync = jest.fn(() => Promise.resolve(gitConfigs))

const mockRepos = {
  status: 'SUCCESS',
  data: [{ name: 'repo1' }, { name: 'repo2' }, { name: 'repo3' }, { name: 'repotest1' }, { name: 'repotest2' }],
  metaData: null,
  correlationId: 'correlationId'
}
const branches = { data: ['master', 'devBranch'], status: 'SUCCESS' }
const fetchBranches = jest.fn(() => Promise.resolve(branches))
const getGitConnector = jest.fn(() => Promise.resolve({}))
const fetchRepos = jest.fn(() => Promise.resolve(mockRepos))

jest.mock('services/cd-ng', () => ({
  useGetListOfBranchesWithStatus: jest.fn().mockImplementation(() => {
    return { data: branchStatusMock, refetch: getListOfBranchesWithStatus, loading: false }
  }),
  useListGitSync: jest.fn().mockImplementation(() => {
    return { data: gitConfigs, refetch: getListGitSync }
  }),
  useGetConnector: jest.fn().mockImplementation(() => ({ data: gitHubMock, refetch: getGitConnector })),
  getConnectorListV2Promise: jest.fn().mockImplementation(() => Promise.resolve(gitHubMock)),
  useGetListOfBranchesByConnector: jest.fn().mockImplementation(() => ({ data: branches, refetch: fetchBranches })),
  useGetListOfReposByRefConnector: jest.fn().mockImplementation(() => {
    return { data: mockRepos, refetch: fetchRepos }
  }),
  useGetListOfBranchesByRefConnectorV2: jest.fn().mockImplementation(() => {
    return { data: branches, refetch: fetchBranches, error: null, loading: false }
  }),
  useGetSettingsList: jest.fn().mockImplementation(() => {
    return { data: { data: [] } }
  })
}))

jest.mock('services/cd-ng-rq', () => ({
  useGetSourceCodeManagersQuery: jest.fn().mockImplementation(() => {
    return { data: sourceCodeManagers, refetch: jest.fn() }
  })
}))

jest.spyOn(GitSyncStoreContext, 'useGitSyncStore').mockImplementation((): GitSyncStoreContext.GitSyncStoreProps => {
  return {
    loadingRepos: false,
    gitSyncRepos: gitConfigs,
    codeManagers: sourceCodeManagers.data || [],
    loadingCodeManagers: false,
    updateStore: jest.fn(),
    refreshStore: jest.fn()
  }
})

const getEditProps = (
  identifier = 'test',
  description = 'desc',
  name = 'pipeline',
  repo = '',
  branch = ''
): PipelineCreateProps => ({
  afterSave,
  initialValues: { identifier, description, name, repo, branch, stages: [] },
  closeModal,
  primaryButtonText: 'continue',
  isReadonly: false
})

const remoteTestPath = routes.toPipelineStudio({
  ...projectPathProps,
  ...pipelinePathProps,
  ...modulePathProps
})

const pathParams = {
  accountId: 'dummy',
  orgIdentifier: 'default',
  projectIdentifier: 'dummyProject',
  module: 'cd',
  pipelineIdentifier: '-1'
}

const remoteQueryParams = {
  storeType: 'REMOTE',
  connectorRef: 'testConnector',
  repoName: 'sunnykesh-gitSync',
  branch: 'master'
}

const getEditPropsForRemotePipeline = (
  identifier = 'test',
  description = 'desc',
  name = 'pipeline',
  repo = 'sunnykesh-gitSync',
  branch = 'master'
): PipelineCreateProps => ({
  afterSave,
  initialValues: {
    identifier,
    description,
    name,
    repo,
    branch,
    connectorRef: 'testConnector',
    filePath: './test.yaml',
    storeType: 'REMOTE',
    stages: []
  },
  gitDetails: {
    branch: 'master',
    filePath: './test.yaml',
    remoteFetchFailed: false,
    repoName: 'sunnykesh-gitSync',
    getDefaultFromOtherRepo: false
  },
  closeModal,
  primaryButtonText: 'continue',
  isReadonly: false
})

describe('PipelineCreate test', () => {
  afterEach(() => {
    afterSave.mockReset()
    closeModal.mockReset()
  })
  test('initializes ok for CI module', async () => {
    const { container } = render(
      <TestWrapper
        path="/account/:accountId/ci/dashboard/:pipelineIdentifier/"
        pathParams={{
          accountId: 'dummy',
          pipelineIdentifier: -1
        }}
      >
        <PipelineCreate primaryButtonText="start" isReadonly={false} />
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
    const nameInput = container.querySelector('[name="name"]')
    expect(nameInput).not.toBeNull()
    const collpase = container.querySelector('.Collapse--main')?.querySelector('.CollapseHeader--leftSection')
    expect(collpase).not.toBeNull()
    const submit = container.getElementsByTagName('button')[0]
    await act(async () => {
      fireEvent.change(nameInput as Element, 'Sample Pipeline')
      fireEvent.click(submit)
    })
    await waitFor(() => nameInput?.getAttribute('value') === 'Sample Pipeline')
    if (collpase) {
      await act(async () => {
        fireEvent.click(collpase)
      })

      expect(container.querySelector('.Collapse--main')).not.toBeNull()
    }
  })
  test('initializes ok for CD module', async () => {
    const { container } = render(
      <TestWrapper
        path="/account/:accountId/cd/dashboard/:pipelineIdentifier/"
        pathParams={{
          accountId: 'dummy',
          pipelineIdentifier: -1
        }}
      >
        <PipelineCreate primaryButtonText="start" isReadonly={false} />
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
    const nameInput = container.querySelector('[name="name"]')
    expect(nameInput).not.toBeNull()
    const collpase = container.querySelector('.Collapse--main')?.querySelector('.CollapseHeader--leftSection')
    expect(collpase).not.toBeNull()
    const submit = container.getElementsByTagName('button')[0]
    await act(async () => {
      fireEvent.change(nameInput as Element, 'Sample Pipeline')
      fireEvent.click(submit)
    })
    await waitFor(() => nameInput?.getAttribute('value') === 'Sample Pipeline')
    if (collpase) {
      await act(async () => {
        fireEvent.click(collpase)
      })

      expect(container.querySelector('.Collapse--main')).not.toBeNull()
    }
  })
  test('initializes ok edit pipeline', async () => {
    afterSave.mockReset()
    const { container, getByText } = render(
      <TestWrapper
        path="/account/:accountId/ci/dashboard/:pipelineIdentifier/"
        pathParams={{
          accountId: 'dummy',
          pipelineIdentifier: 'test'
        }}
      >
        <PipelineCreate {...getEditProps()} />
      </TestWrapper>
    )
    await waitFor(() => getByText('continue'))
    expect(container).toMatchSnapshot()
    const continueBtn = getByText('continue')
    fireEvent.click(continueBtn)
    await waitFor(() => expect(afterSave).toBeCalledTimes(1))
    expect(afterSave).toBeCalledWith(
      {
        description: 'desc',
        identifier: 'test',
        name: 'pipeline',
        stages: []
      },
      { connectorRef: undefined, storeType: undefined },
      undefined,
      undefined,
      '1'
    )
    const closeBtn = getByText('cancel')
    fireEvent.click(closeBtn!)
    await waitFor(() => expect(closeModal).toBeCalledTimes(1))
    expect(closeModal).toBeCalled()
  })
  test('Editing should prefill and retain data while creating remote pipeline', async () => {
    const { container, getByText } = render(
      <TestWrapper
        path={remoteTestPath}
        pathParams={pathParams}
        queryParams={remoteQueryParams}
        defaultAppStoreValues={{ isGitSyncEnabled: false, supportingGitSimplification: true }}
      >
        <PipelineCreate {...getEditPropsForRemotePipeline()} />
      </TestWrapper>
    )
    await waitFor(() => getByText('continue'))

    const pipelineName = await screen.findByPlaceholderText('common.namePlaceholder')
    const selectedStoreTypeCard = container.querySelector('.Card--selected')
    const repoNameName = await screen.findByPlaceholderText('- common.git.selectRepositoryPlaceholder -')
    const filePath = await screen.findByPlaceholderText('gitsync.gitSyncForm.enterYamlPath')

    expect(pipelineName).toHaveValue(getEditPropsForRemotePipeline().initialValues?.name)
    expect(selectedStoreTypeCard).toHaveTextContent('remote')
    expect(repoNameName).toHaveValue(getEditPropsForRemotePipeline().gitDetails?.repoName)
    expect(filePath).toHaveValue(getEditPropsForRemotePipeline().gitDetails?.filePath)

    const continueBtn = getByText('continue')
    fireEvent.click(continueBtn)
    await waitFor(() => expect(afterSave).toBeCalledTimes(1))
    expect(afterSave).toBeCalledWith(
      {
        description: 'desc',
        identifier: 'test',
        name: 'pipeline',
        stages: []
      },
      { connectorRef: 'testConnector', storeType: 'REMOTE', provider: getGitProviderCards(getString)[1] },
      { repoName: 'sunnykesh-gitSync', branch: 'master', filePath: './test.yaml', isHarnessCodeRepo: false },
      undefined,
      '1'
    )
    const closeBtn = getByText('cancel')
    fireEvent.click(closeBtn!)
    await waitFor(() => expect(closeModal).toBeCalledTimes(1))
    expect(closeModal).toBeCalled()
  })
  test('initializes ok new pipeline', async () => {
    closeModal.mockReset()
    const { getByText } = render(
      <TestWrapper
        path="/account/:accountId/ci/orgs/default/projects/gitx/pipelines/:pipelineIdentifier/pipeline-studio/"
        pathParams={{
          accountId: 'dummy',
          pipelineIdentifier: DefaultNewPipelineId // PipelineCreate is taking pipelineIdentifier from pathParam
        }}
      >
        <PipelineCreate {...getEditProps(DefaultNewPipelineId)} primaryButtonText="start" />
      </TestWrapper>
    )
    const startBtn = getByText('start')
    await waitFor(() => expect(startBtn).toBeInTheDocument())
    await userEvent.click(startBtn)
    expect(getByText('validation.identifierRequired')).toBeInTheDocument()
  })

  test('when git exp is enabled - pipeline edit modal should display repo and branch to save pipeline to', async () => {
    const initialPipelineCreateData = {
      identifier: 'pipeline1',
      name: 'Pipeline 1',
      description: 'abc',
      connectorRef: 'testConn',
      repo: 'repo',
      branch: 'branch',
      storeType: StoreType.REMOTE,
      stages: []
    }
    const { getByText } = render(
      <TestWrapper
        path="/account/:accountId/:module/orgs/:ordIdentifier/projects/:projectIdentifier/pipelines/:pipelineIdentifier/pipeline-studio"
        pathParams={{
          accountId: 'dummy',
          ordIdentifier: 'testOrg',
          projectIdentifier: 'testProject',
          pipelineIdentifier: 'pipeline1',
          module: 'cd'
        }}
        defaultAppStoreValues={{ isGitSyncEnabled: true }}
      >
        <PipelineCreate
          initialValues={initialPipelineCreateData}
          afterSave={afterSave}
          primaryButtonText="continue"
          isReadonly={false}
        />
      </TestWrapper>
    )

    await waitFor(() => getByText('continue'))
    expect(getByText('COMMON.GITSYNC.GITREPOSITORYDETAILS')).not.toBeNull()
    expect(getByText('common.git.selectRepoLabel')).not.toBeNull()
    expect(getByText('common.gitSync.selectBranchLabel')).not.toBeNull()

    const continueBtn = getByText('continue').parentElement
    act(() => {
      fireEvent.click(continueBtn!)
    })

    await waitFor(() => expect(afterSave).toHaveBeenCalledTimes(1))
    expect(afterSave).toBeCalledWith(
      {
        identifier: 'pipeline1',
        name: 'Pipeline 1',
        description: 'abc',
        stages: []
      },
      {
        connectorRef: 'testConn',
        storeType: StoreType.REMOTE
      },
      {
        repoIdentifier: 'identifier',
        branch: 'branch',
        isHarnessCodeRepo: false
      },
      undefined,
      '1'
    )
  })

  test('when git exp is enabled - pipeline edit modal should display repo and branch to save pipeline to with Git simplification on', async () => {
    afterSave.mockReset()
    const initialPipelineCreateData = {
      identifier: 'pipeline1',
      name: 'Pipeline 1',
      description: 'abc',
      connectorRef: 'testConn',
      repo: 'testRepo',
      branch: 'testBranch',
      storeType: StoreType.REMOTE,
      filePath: '.harness/pipeline1.yaml'
    }
    const { getByText, container, getByTestId, findByPlaceholderText } = render(
      <TestWrapper
        path="/account/:accountId/:module/orgs/:ordIdentifier/projects/:projectIdentifier/pipelines/:pipelineIdentifier/pipeline-studio"
        pathParams={{
          accountId: 'dummy',
          ordIdentifier: 'testOrg',
          projectIdentifier: 'testProject',
          pipelineIdentifier: 'testPipeline',
          module: 'cd'
        }}
        queryParams={{
          connectorRef: 'testConn',
          repoName: 'testRepo',
          branch: 'testBranch',
          storeType: StoreType.REMOTE
        }}
        defaultAppStoreValues={{ isGitSyncEnabled: false, supportingGitSimplification: true }}
      >
        <PipelineCreate
          initialValues={initialPipelineCreateData}
          afterSave={afterSave}
          primaryButtonText="continue"
          isReadonly={true}
        />
      </TestWrapper>
    )

    await waitFor(() => getByText('continue'))
    // Pipeline metadata fields - name, dec, tags
    const nameInput = queryByNameAttribute('name', container)
    expect(nameInput).toBeInTheDocument()
    expect(nameInput).toBeDisabled()
    const descInput = queryByNameAttribute('description', container)
    expect(descInput).toBeInTheDocument()
    expect(descInput).toBeDisabled()
    const tagsEditBtn = getByTestId('tags-edit')
    expect(tagsEditBtn).toBeInTheDocument()
    fireEvent.click(tagsEditBtn)
    const tagsInput = await findByPlaceholderText('Type and press enter to create a tag')
    expect(tagsInput).toBeInTheDocument()
    expect(tagsInput).toBeDisabled()
    // Git related field - connectorRef, repo, branch, filePath
    const connectorRefInput = getByTestId('cr-field-connectorRef')
    expect(connectorRefInput).toBeInTheDocument()
    expect(connectorRefInput).toBeDisabled()
    const repoInput = queryByNameAttribute('repo', container)
    expect(repoInput).toBeInTheDocument()
    expect(repoInput).toBeDisabled()
    const branchInput = queryByNameAttribute('branch', container)
    expect(branchInput).toBeInTheDocument()
    expect(branchInput).toBeDisabled()
    const filePathInput = queryByNameAttribute('filePath', container)
    expect(filePathInput).toBeInTheDocument()
    expect(filePathInput).toBeDisabled()

    const continueBtn = getByText('continue').parentElement
    act(() => {
      fireEvent.click(continueBtn!)
    })

    await waitFor(() => expect(afterSave).toHaveBeenCalledTimes(1))
    expect(afterSave).toBeCalledWith(
      {
        identifier: 'pipeline1',
        name: 'Pipeline 1',
        description: 'abc'
      },
      {
        connectorRef: 'testConn',
        storeType: StoreType.REMOTE,
        provider: getGitProviderCards(getString)[1]
      },
      {
        repoName: 'testRepo',
        branch: 'testBranch',
        filePath: '.harness/pipeline1.yaml',
        isHarnessCodeRepo: false
      },
      undefined,
      '1'
    )
  })
})
