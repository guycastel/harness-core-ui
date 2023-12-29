/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { act, fireEvent, screen, render, waitFor } from '@testing-library/react'
import { Formik } from '@harness/uicore'
import { TestWrapper } from '@common/utils/testUtils'
import routes from '@common/RouteDefinitions'
import { accountPathProps } from '@common/utils/routeUtils'
import { gitConnectorMock, mockBranches, mockRepos } from '@gitsync/components/GitSyncForm/__tests__/mockdata'
import { ServiceResponseDTO } from 'services/cd-ng'
import { GitSyncFormFields } from '@gitsync/components/GitSyncForm/GitSyncForm'
import NewEditServiceForm from '../NewEditServiceForm'

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

describe('NewEditServiceForm test', () => {
  afterEach(() => {
    fetchRepos.mockReset()
    fetchBranches.mockReset()
    fetchSupportedConnectorsList.mockReset()
  })

  test('Inline Remote option should not be available while creating if gitX is not supported', async () => {
    render(
      <TestWrapper
        path={routes.toServices({ ...accountPathProps, accountRoutePlacement: 'settings' })}
        pathParams={{ accountId: 'testAcc' }}
      >
        <Formik<ServiceResponseDTO & GitSyncFormFields>
          initialValues={{}}
          onSubmit={() => undefined}
          formName="newEditServiceForm"
        >
          {formikProps => (
            <NewEditServiceForm
              isGitXEnabledForServices={false}
              formikProps={formikProps}
              isEdit={false}
              isGitXEnforced={false}
            />
          )}
        </Formik>
      </TestWrapper>
    )

    expect(screen.queryByText('common.git.inlineStoreLabel')).not.toBeInTheDocument()
    expect(screen.queryByText('common.git.remoteStoreLabel')).not.toBeInTheDocument()
  })

  test('Inline Remote option should be enabled while creating if gitX is supported', async () => {
    const { container } = render(
      <TestWrapper
        path={routes.toServices({ ...accountPathProps, accountRoutePlacement: 'settings' })}
        pathParams={{ accountId: 'testAcc' }}
      >
        <Formik<ServiceResponseDTO & GitSyncFormFields>
          initialValues={{}}
          onSubmit={() => undefined}
          formName="newEditServiceForm"
        >
          {formikProps => (
            <NewEditServiceForm
              isGitXEnabledForServices={true}
              formikProps={formikProps}
              isEdit={false}
              isGitXEnforced={false}
            />
          )}
        </Formik>
      </TestWrapper>
    )

    waitFor(() =>
      expect(screen.queryByText('cd.pipelineSteps.serviceTab.chooseServiceSetupHeader')).toBeInTheDocument()
    )

    expect(screen.queryByText('common.git.inlineStoreLabel')).toBeInTheDocument()
    expect(screen.queryByText('common.git.remoteStoreLabel')).toBeInTheDocument()
    const inlineStoreTypeCard = container.querySelector('.serviceCardWrapper > div[data-index="0"]')
    const remoteStoreTypeCard = container.querySelector('.serviceCardWrapper div[data-index="1"]')
    expect(inlineStoreTypeCard?.classList.contains('Card--interactive')).toBe(true)
    expect(inlineStoreTypeCard?.classList.contains('Card--selected')).toBe(true)
    expect(remoteStoreTypeCard?.classList.contains('Card--selected')).toBe(false)
    expect(remoteStoreTypeCard?.classList.contains('Card--interactive')).toBe(true)
    // Storetype onChange should change storeType while creating
    act(() => {
      fireEvent.click(remoteStoreTypeCard!)
    })
    expect(remoteStoreTypeCard?.classList.contains('Card--selected')).toBe(true)
  })

  test('Inline should be selected and Remote option disabled while editing for Inline service', async () => {
    const { container } = render(
      <TestWrapper
        path={routes.toServices({ ...accountPathProps, accountRoutePlacement: 'settings' })}
        pathParams={{ accountId: 'testAcc' }}
      >
        <Formik<ServiceResponseDTO & GitSyncFormFields>
          initialValues={{ identifier: 'testService', storeType: 'INLINE' }}
          onSubmit={() => undefined}
          formName="newEditServiceForm"
        >
          {formikProps => (
            <NewEditServiceForm
              isGitXEnabledForServices={true}
              formikProps={formikProps}
              isEdit={true}
              isGitXEnforced={false}
            />
          )}
        </Formik>
      </TestWrapper>
    )
    waitFor(() =>
      expect(screen.queryByText('cd.pipelineSteps.serviceTab.chooseServiceSetupHeader')).toBeInTheDocument()
    )

    expect(screen.queryByText('common.git.inlineStoreLabel')).toBeInTheDocument()
    expect(screen.queryByText('common.git.remoteStoreLabel')).toBeInTheDocument()
    const inlineStoreTypeCard = container.querySelector('.serviceCardWrapper > div[data-index="0"]')
    const remoteStoreTypeCard = container.querySelector('.serviceCardWrapper div[data-index="1"]')
    expect(inlineStoreTypeCard?.classList.contains('Card--interactive')).toBe(true)
    expect(inlineStoreTypeCard?.classList.contains('Card--selected')).toBe(true)
    expect(remoteStoreTypeCard?.classList.contains('Card--selected')).toBe(false)
    expect(remoteStoreTypeCard?.classList.contains('Card--interactive')).toBe(false)
    expect(remoteStoreTypeCard?.classList.contains('Card--disabled')).toBe(true)
    // Storetype onChange should not change storeType while editing
    act(() => {
      fireEvent.click(remoteStoreTypeCard!)
    })
    expect(remoteStoreTypeCard?.classList.contains('Card--selected')).toBe(false)
  })
})
