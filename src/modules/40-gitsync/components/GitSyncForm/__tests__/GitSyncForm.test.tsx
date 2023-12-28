/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { act, findAllByText, fireEvent, queryByAttribute, render, waitFor } from '@testing-library/react'
import { Formik, FormikForm } from '@harness/uicore'
import * as cdNg from 'services/cd-ng'
import { Scope } from '@common/interfaces/SecretsInterface'
import { TestWrapper } from '@common/utils/testUtils'
import type { ConnectorSelectedValue } from '@platform/connectors/components/ConnectorReferenceField/ConnectorReferenceField'
import routes from '@common/RouteDefinitions'
import { modulePathProps, pipelinePathProps, projectPathProps } from '@common/utils/routeUtils'
import { GitSyncForm, GitSyncFormFields } from '../GitSyncForm'
import {
  mockRepos,
  mockBranches,
  gitConnectorMock,
  gitXSettingMock,
  fetchSupportedConnectorsListPayload
} from './mockdata'

const pathParams = {
  accountId: 'dummy',
  orgIdentifier: 'default',
  projectIdentifier: 'DevX',
  module: 'cd'
}
const getGitConnector = jest.fn(() => Promise.resolve(gitConnectorMock))
const fetchRepos = jest.fn(() => Promise.resolve(mockRepos))
const fetchBranches = jest.fn(() => Promise.resolve(mockBranches))
const fetchSupportedConnectorsList = jest.fn(_arg => Promise.resolve(gitConnectorMock))

jest.mock('services/cd-ng', () => ({
  getConnectorListV2Promise: jest.fn().mockImplementation(arg => fetchSupportedConnectorsList(arg)),
  useGetConnector: jest.fn().mockImplementation(() => {
    return { data: { data: gitConnectorMock.data.content[1] }, refetch: getGitConnector, loading: false }
  }),
  useGetListOfReposByRefConnector: jest.fn().mockImplementation(() => {
    return { data: mockRepos, refetch: fetchRepos, loading: false }
  }),
  useGetListOfBranchesByRefConnectorV2: jest.fn().mockImplementation(() => {
    return { data: mockBranches, refetch: fetchBranches }
  }),
  useGetSettingsList: jest.fn().mockImplementation(() => {
    return { data: { data: [] } }
  }),
  validateRepoPromise: jest.fn().mockImplementation(() => {
    return { data: { isValid: true } }
  })
}))

describe('GitSyncForm test', () => {
  afterEach(() => {
    fetchRepos.mockReset()
    fetchBranches.mockReset()
    fetchSupportedConnectorsList.mockReset()
  })

  test('Rendering GitSyncForm for create flow and filling form', async () => {
    const { container, getByText } = render(
      <TestWrapper
        path="/account/:accountId/ci/orgs/:orgIdentifier/projects/:projectIdentifier/pipelines/-1/pipeline-studio/"
        pathParams={pathParams}
      >
        <Formik<GitSyncFormFields>
          initialValues={{
            identifier: 'testIdentifier',
            connectorRef: {} as ConnectorSelectedValue,
            repo: '',
            branch: '',
            filePath: ''
          }}
          onSubmit={() => undefined}
          formName="GitSyncForm"
        >
          {formikProps => (
            <FormikForm>
              <GitSyncForm formikProps={formikProps} isEdit={false} />
            </FormikForm>
          )}
        </Formik>
      </TestWrapper>
    )

    const form = document.getElementsByClassName('gitSyncForm')[0] as HTMLElement
    const connnectorRefInput = queryByAttribute('data-testid', form, /connectorRef/)
    expect(connnectorRefInput).toBeTruthy()
    if (connnectorRefInput) {
      act(() => {
        fireEvent.click(connnectorRefInput)
      })
    }

    expect(fetchSupportedConnectorsList).toBeCalledTimes(1)
    expect(fetchSupportedConnectorsList).toBeCalledWith(fetchSupportedConnectorsListPayload)

    await act(async () => {
      const connectorSelectorDialog = document.getElementsByClassName('bp3-dialog')[0]

      const githubConnector = await findAllByText(connectorSelectorDialog as HTMLElement, 'ValidGithubRepo')
      expect(githubConnector).toBeTruthy()
      fireEvent.click(githubConnector?.[0])
      const applySelected = getByText('entityReference.apply')
      await act(async () => {
        fireEvent.click(applySelected)
      })
    })

    await waitFor(() => expect(fetchRepos).toBeCalledTimes(1))
    expect(getByText('repository')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  test('Rendering GitSyncForm for create flow with FF on', async () => {
    const { getByText } = render(
      <TestWrapper
        path="/account/:accountId/ci/orgs/:orgIdentifier/projects/:projectIdentifier/pipelines/-1/pipeline-studio/"
        pathParams={pathParams}
        defaultFeatureFlagValues={{ CODE_ENABLED: true }}
      >
        <Formik<GitSyncFormFields>
          initialValues={{
            identifier: 'testIdentifier',
            connectorRef: {} as ConnectorSelectedValue,
            repo: '',
            branch: '',
            filePath: ''
          }}
          onSubmit={() => undefined}
          formName="GitSyncForm"
        >
          {formikProps => (
            <FormikForm>
              <GitSyncForm formikProps={formikProps} isEdit={false} shouldRenderRepositoryLocationCard />
            </FormikForm>
          )}
        </Formik>
      </TestWrapper>
    )

    await waitFor(() => expect(fetchRepos).toBeCalledTimes(1))
    expect(getByText('common.git.gitRepositoryLocation')).toBeInTheDocument()
    expect(getByText('common.harnessCodeRepo')).toBeInTheDocument()
    expect(getByText('common.harnessCodeRepoInfo')).toBeInTheDocument()
    expect(getByText('common.thirdPartyGitProvider')).toBeInTheDocument()
    expect(getByText('common.thirdPartyGitProviderInfo')).toBeInTheDocument()
    expect(getByText('repository')).toBeInTheDocument()
    expect(getByText('gitBranch')).toBeInTheDocument()
    expect(getByText('gitsync.gitSyncForm.yamlPathLabel')).toBeInTheDocument()
  })

  test('Rendering GitSyncForm for create flow with FF on with shouldRenderRepositoryLocationCard as false', async () => {
    const { getByText, queryByText } = render(
      <TestWrapper
        path="/account/:accountId/ci/orgs/:orgIdentifier/projects/:projectIdentifier/pipelines/-1/pipeline-studio/"
        pathParams={pathParams}
        defaultFeatureFlagValues={{ CODE_ENABLED: true }}
      >
        <Formik<GitSyncFormFields>
          initialValues={{
            identifier: 'testIdentifier',
            connectorRef: {} as ConnectorSelectedValue,
            repo: '',
            branch: '',
            filePath: ''
          }}
          onSubmit={() => undefined}
          formName="GitSyncForm"
        >
          {formikProps => (
            <FormikForm>
              <GitSyncForm formikProps={formikProps} isEdit={false} />
            </FormikForm>
          )}
        </Formik>
      </TestWrapper>
    )

    expect(queryByText('common.git.gitRepositoryLocation')).not.toBeInTheDocument()
    expect(queryByText('common.harnessCodeRepo')).not.toBeInTheDocument()
    expect(queryByText('common.harnessCodeRepoInfo')).not.toBeInTheDocument()
    expect(queryByText('common.thirdPartyGitProvider')).not.toBeInTheDocument()
    expect(queryByText('common.thirdPartyGitProviderInfo')).not.toBeInTheDocument()
    expect(getByText('platform.connectors.title.gitConnector')).toBeInTheDocument()
    expect(getByText('repository')).toBeInTheDocument()
    expect(getByText('gitBranch')).toBeInTheDocument()
    expect(getByText('gitsync.gitSyncForm.yamlPathLabel')).toBeInTheDocument()
  })

  test('Rendering GitSyncForm for create flow and switching to third-party provider and filling form with FF on', async () => {
    const { getByText } = render(
      <TestWrapper
        path="/account/:accountId/ci/orgs/:orgIdentifier/projects/:projectIdentifier/pipelines/-1/pipeline-studio/"
        pathParams={pathParams}
        defaultFeatureFlagValues={{ CODE_ENABLED: true }}
      >
        <Formik<GitSyncFormFields>
          initialValues={{
            identifier: 'testIdentifier',
            connectorRef: {} as ConnectorSelectedValue,
            repo: '',
            branch: '',
            filePath: ''
          }}
          onSubmit={() => undefined}
          formName="GitSyncForm"
        >
          {formikProps => (
            <FormikForm>
              <GitSyncForm formikProps={formikProps} isEdit={false} shouldRenderRepositoryLocationCard />
            </FormikForm>
          )}
        </Formik>
      </TestWrapper>
    )

    const form = document.getElementsByClassName('gitSyncForm')[0] as HTMLElement
    fireEvent.click(getByText('common.thirdPartyGitProvider'))
    const connectorRefInput = queryByAttribute('data-testid', form, /connectorRef/)
    expect(connectorRefInput).toBeTruthy()
    if (connectorRefInput) {
      act(() => {
        fireEvent.click(connectorRefInput)
      })
    }

    expect(fetchSupportedConnectorsList).toBeCalledTimes(1)
    expect(fetchSupportedConnectorsList).toBeCalledWith(fetchSupportedConnectorsListPayload)

    await act(async () => {
      const githubConnector = await getByText('ValidGithubRepo')
      expect(githubConnector).toBeTruthy()
      fireEvent.click(githubConnector)
      const applySelected = getByText('entityReference.apply')
      await act(async () => {
        fireEvent.click(applySelected)
      })
    })

    await waitFor(() => expect(fetchRepos).toBeCalledTimes(1))
    expect(getByText('repository')).toBeInTheDocument()
  })

  test('Rendering GitSyncForm for while edit : all field should be disabled', async () => {
    const { container, getByText } = render(
      <TestWrapper
        path="/account/:accountId/ci/orgs/:orgIdentifier/projects/:projectIdentifier/pipelines/-1/pipeline-studio/"
        pathParams={pathParams}
      >
        <Formik<GitSyncFormFields>
          initialValues={{
            identifier: 'testIdentifier',
            connectorRef: {
              label: 'ValidGithubRepo',
              value: 'ValidGithubRepo',
              live: true,
              scope: Scope.PROJECT,
              connector: {}
            } as ConnectorSelectedValue,
            repo: 'test-repo',
            branch: 'dev',
            filePath: '.harness/pipeline.yaml'
          }}
          onSubmit={() => undefined}
          formName="GitSyncForm"
        >
          {formikProps => (
            <FormikForm>
              <GitSyncForm formikProps={formikProps} isEdit={true} />
            </FormikForm>
          )}
        </Formik>
      </TestWrapper>
    )

    await waitFor(() => expect(fetchRepos).not.toBeCalled())
    expect(getByText('repository')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  test('Rendering GitSyncForm while create pre-populated with settings', async () => {
    jest.spyOn(cdNg, 'useGetSettingsList').mockImplementation((): any => {
      return { data: gitXSettingMock, refetch: () => Promise.resolve(gitXSettingMock) }
    })
    const { container, getByText } = render(
      <TestWrapper
        path={routes.toPipelineStudio({
          ...projectPathProps,
          ...pipelinePathProps,
          ...modulePathProps
        })}
        pathParams={{ ...pathParams, pipelineIdentifier: '-1' }}
        queryParams={{ storeType: 'REMOTE' }}
      >
        <Formik<GitSyncFormFields>
          initialValues={{
            identifier: '',
            connectorRef: '',
            repo: '',
            branch: '',
            filePath: ''
          }}
          onSubmit={() => undefined}
          formName="GitSyncForm"
        >
          {formikProps => (
            <FormikForm>
              <GitSyncForm formikProps={formikProps} isEdit={false} />
            </FormikForm>
          )}
        </Formik>
      </TestWrapper>
    )

    await waitFor(() => expect(getGitConnector).toBeCalled())
    expect(getByText('ValidGithubRepo')).toBeInTheDocument()
    const repoInput = queryByAttribute('name', container, 'repo')
    await waitFor(() => expect(repoInput).toHaveValue('gitX2'))
    await waitFor(() => expect(fetchRepos).toBeCalledTimes(1))
    await waitFor(() => expect(fetchBranches).toBeCalledTimes(1))
    const branchInput = queryByAttribute('name', container, 'branch')
    expect(branchInput).toHaveValue('main')
  })

  test('Rendering GitSyncForm while create pre-populated with settings with FF on', async () => {
    jest.spyOn(cdNg, 'useGetSettingsList').mockImplementation((): any => {
      return { data: gitXSettingMock, refetch: () => Promise.resolve(gitXSettingMock) }
    })
    const { container, getByText } = render(
      <TestWrapper
        path={routes.toPipelineStudio({
          ...projectPathProps,
          ...pipelinePathProps,
          ...modulePathProps
        })}
        pathParams={{ ...pathParams, pipelineIdentifier: '-1' }}
        queryParams={{ storeType: 'REMOTE' }}
        defaultFeatureFlagValues={{ CODE_ENABLED: true }}
      >
        <Formik<GitSyncFormFields>
          initialValues={{
            identifier: '',
            connectorRef: '',
            repo: '',
            branch: '',
            filePath: ''
          }}
          onSubmit={() => undefined}
          formName="GitSyncForm"
        >
          {formikProps => (
            <FormikForm>
              <GitSyncForm formikProps={formikProps} isEdit={false} shouldRenderRepositoryLocationCard />
            </FormikForm>
          )}
        </Formik>
      </TestWrapper>
    )

    fireEvent.click(getByText('common.thirdPartyGitProvider'))
    await waitFor(() => expect(getGitConnector).toBeCalled())
    expect(getByText('ValidGithubRepo')).toBeInTheDocument()
    const repoInput = queryByAttribute('name', container, 'repo')
    await waitFor(() => expect(repoInput).toHaveValue('gitX2'))
    await waitFor(() => expect(fetchRepos).toBeCalledTimes(3))
    await waitFor(() => expect(fetchBranches).toBeCalledTimes(1))
    const branchInput = queryByAttribute('name', container, 'branch')
    expect(branchInput).toHaveValue('main')
  })

  test('Rendering GitSyncForm while create with repo in settings not in allowed list', async () => {
    jest.spyOn(cdNg, 'useGetSettingsList').mockImplementation((): any => {
      return { data: gitXSettingMock, refetch: () => Promise.resolve(gitXSettingMock) }
    })
    jest.spyOn(cdNg, 'validateRepoPromise').mockImplementation((): any => {
      return { data: { isValid: false } }
    })

    const { container, getByText } = render(
      <TestWrapper
        path={routes.toPipelineStudio({
          ...projectPathProps,
          ...pipelinePathProps,
          ...modulePathProps
        })}
        pathParams={{ ...pathParams, pipelineIdentifier: '-1' }}
        queryParams={{ storeType: 'REMOTE' }}
      >
        <Formik<GitSyncFormFields>
          initialValues={{
            identifier: '',
            connectorRef: '',
            repo: '',
            branch: '',
            filePath: ''
          }}
          onSubmit={() => undefined}
          formName="GitSyncForm"
        >
          {formikProps => (
            <FormikForm>
              <GitSyncForm formikProps={formikProps} isEdit={false} />
            </FormikForm>
          )}
        </Formik>
      </TestWrapper>
    )

    await waitFor(() => expect(getGitConnector).toBeCalled())
    expect(getByText('ValidGithubRepo')).toBeInTheDocument()
    // Connector should get auto filled but not repo and branch
    const repoInput = queryByAttribute('name', container, 'repo')
    expect(repoInput).toHaveValue('')
    await waitFor(() => expect(fetchRepos).toBeCalledTimes(1))
    await waitFor(() => expect(fetchBranches).toBeCalledTimes(0))
    const branchInput = queryByAttribute('name', container, 'branch')
    expect(branchInput).not.toHaveValue('')
  })

  test('Rendering GitSyncForm in edit mode with FF on', async () => {
    const { container } = render(
      <TestWrapper
        path={routes.toPipelineStudio({
          ...projectPathProps,
          ...pipelinePathProps,
          ...modulePathProps
        })}
        pathParams={{ ...pathParams, pipelineIdentifier: 'demo' }}
        queryParams={{ storeType: 'REMOTE' }}
        defaultFeatureFlagValues={{ CODE_ENABLED: true }}
      >
        <Formik<GitSyncFormFields>
          initialValues={{
            identifier: '',
            connectorRef: '',
            repo: 'gitX2',
            branch: 'main',
            filePath: '.harness/demo.yaml'
          }}
          onSubmit={() => undefined}
          formName="GitSyncForm"
        >
          {formikProps => (
            <FormikForm>
              <GitSyncForm formikProps={formikProps} isEdit shouldRenderRepositoryLocationCard />
            </FormikForm>
          )}
        </Formik>
      </TestWrapper>
    )

    const disabledCards = container.querySelectorAll('.Card--disabled')
    expect(disabledCards).toHaveLength(1)
    const repoInput = queryByAttribute('name', container, 'repo')
    expect(repoInput).toBeDisabled()
    await waitFor(() => expect(repoInput).toHaveValue('gitX2'))
    const branchInput = queryByAttribute('name', container, 'branch')
    expect(branchInput).toBeDisabled()
    expect(branchInput).toHaveValue('main')
    const filePathInput = queryByAttribute('name', container, 'filePath')
    await waitFor(() => expect(filePathInput).toHaveValue('.harness/demo.yaml'))
    expect(filePathInput).toBeDisabled()
  })
})
