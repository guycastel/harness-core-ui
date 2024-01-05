/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { TestWrapper } from '@common/utils/testUtils'
import NotFoundPage from './NotFoundPage'

describe('NotFoundPage', () => {
  test('render', () => {
    const { container } = render(
      <TestWrapper path="/abc">
        <NotFoundPage />
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
  })
  test('should redirect to overview page', async () => {
    const { getByTestId, getByText } = render(
      <TestWrapper path="/abc" defaultAppStoreValues={{ isNewNavEnabled: true }}>
        <NotFoundPage redirectTo="/overview" />
      </TestWrapper>
    )
    fireEvent.click(getByText('Go to Home'))
    await waitFor(() => getByTestId('location'))
    expect(getByTestId('location')).toHaveTextContent('/overview')
  })
})
