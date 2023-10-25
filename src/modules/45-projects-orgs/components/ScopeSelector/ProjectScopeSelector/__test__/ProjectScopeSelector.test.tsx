/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, waitFor, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '@common/utils/testUtils'
import * as cdngServices from 'services/cd-ng'
import { useGetProjectAggregateDTOList } from 'services/cd-ng'
import { ProjectScopeSelector } from '../ProjectScopeSelector'
import { projectMockDataWithModules, organizations } from './Mocks'

jest.mock('services/cd-ng', () => ({
  useGetOrganizationAggregateDTOList: jest.fn().mockImplementation(() => {
    return { data: organizations, refetch: jest.fn(), error: null, loading: false }
  }),
  useGetProjectListWithMultiOrgFilter: jest.fn().mockImplementation(() => {
    return { data: projectMockDataWithModules, refetch: jest.fn(), error: null, loading: false }
  }),
  useGetProjectAggregateDTOList: jest.fn().mockImplementation(() => {
    return { data: projectMockDataWithModules, refetch: jest.fn(), error: null }
  }),
  useDeleteProject: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  getOrganizationListPromise: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      data: {
        content: [
          {
            label: 'org1',
            value: 'org1'
          }
        ]
      }
    })
  })
}))

const onProjectClick = jest.fn()

function WrapperComponent(): JSX.Element {
  return (
    <TestWrapper defaultFeatureFlagValues={{ PL_FAVORITES: true }}>
      <ProjectScopeSelector onProjectClick={onProjectClick} />
    </TestWrapper>
  )
}

describe('ProjectScopeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  test('render grid view', async () => {
    const { container } = render(<WrapperComponent />)
    const card = container.querySelector('[data-testid="project-card-gitX_CDCAAAsunnyGitExp"]')
    expect(card).toBeDefined()
  })
  test('render list view', async () => {
    const { getByTestId, getAllByRole } = render(<WrapperComponent />)

    const listViewButton = getByTestId('list-view')
    act(() => {
      fireEvent.click(listViewButton)
    })
    const rows = getAllByRole('row')
    expect(rows).toHaveLength(2)
  })
  test('render split view', async () => {
    const { getByTestId, getAllByRole } = render(<WrapperComponent />)
    const listViewButton = getByTestId('split-view')
    act(() => {
      fireEvent.click(listViewButton)
    })
    const rows = getAllByRole('row')
    expect(rows).toHaveLength(1)
    expect(screen.findByText('common.allOrganizations')).toBeDefined()
  })
  test('should render pagespinner if loading', () => {
    jest.spyOn(cdngServices, 'useGetProjectAggregateDTOList').mockImplementation((): any => {
      return { data: {}, loading: true }
    })
    const { container } = render(<WrapperComponent />)
    expect(container.querySelector('.PageSpinner--spinner')).toBeDefined()
  })
  test('View all projects button is working as expected', async () => {
    const { findByText, getByTestId } = render(<WrapperComponent />)
    fireEvent.click(await findByText('projectsOrgs.viewAllProjects'))
    await waitFor(() => getByTestId('location'))
    expect(getByTestId('location')).toHaveTextContent('/projects')
  })
  test('test search functionality', async () => {
    jest.clearAllMocks()
    jest
      .spyOn(cdngServices, 'useGetProjectAggregateDTOList')
      .mockImplementation(() => ({ data: projectMockDataWithModules, refetch: jest.fn() } as any))
    render(<WrapperComponent />)
    const searchInput = screen.getByPlaceholderText('projectsOrgs.searchProjectPlaceHolder') as HTMLInputElement

    expect(searchInput).toBeVisible()
    expect(searchInput?.value).toBe('')

    const query = 'abcd'

    userEvent.type(searchInput, query)
    await waitFor(() => expect(searchInput?.value).toBe(query))
    await waitFor(() => expect(useGetProjectAggregateDTOList).toBeCalledTimes(2))
  })
})