/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, RenderResult, screen } from '@testing-library/react'
import { TestWrapper } from '@common/utils/testUtils'
import * as useGetSelectedStaleFlags from '../../../hooks/useGetSelectedStaleFlags'
import { StaleFlagActions } from '../StaleFlagActions'

const renderComponent = (): RenderResult =>
  render(
    <TestWrapper>
      <StaleFlagActions />
    </TestWrapper>
  )

describe('StaleFlagActions', () => {
  const useGetSelectedStaleFlagsMock = jest.spyOn(useGetSelectedStaleFlags, 'useGetSelectedStaleFlags')

  beforeEach(() => {
    jest.clearAllMocks()
    useGetSelectedStaleFlagsMock.mockReturnValue(['flag1', 'flag2', 'flag3'])
  })

  test('it should render the component', () => {
    renderComponent()

    expect(screen.getByRole('button', { name: 'cf.staleFlagAction.notStale' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'cf.staleFlagAction.readyForCleanup' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'cf.staleFlagAction.learnMore' })).toBeVisible()
  })

  test('it should not render the component when there are no flags selected', async () => {
    useGetSelectedStaleFlagsMock.mockReturnValue([])
    renderComponent()

    expect(screen.queryByRole('button', { name: 'cf.staleFlagAction.notStale' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'cf.staleFlagAction.readyForCleanup' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'cf.staleFlagAction.learnMore' })).not.toBeInTheDocument()
  })
})
