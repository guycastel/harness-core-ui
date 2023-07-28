/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { TestWrapper } from '@common/utils/testUtils'
import { catalogueData } from '@platform/connectors/pages/connectors/__tests__/mockData'
import AddConnectorsDrawer from '../AddConnectorsDrawer'

jest.mock('services/cd-ng', () => ({
  useGetConnector: jest.fn().mockImplementation(() => ({ data: {} })),
  useGetConnectorCatalogue: jest.fn().mockImplementation(() => {
    return { data: catalogueData, loading: false }
  })
}))
jest.mock('@connectors/pages/connectors/hooks/useGetConnectorsListHook/useGetConectorsListHook', () => ({
  useGetConnectorsListHook: jest.fn().mockReturnValue({
    loading: true,
    categoriesMap: {}
  })
}))
describe('AddConnectorsDrawer tests', () => {
  test(`loading state for AddConnectorsDrawer`, async () => {
    render(
      <TestWrapper>
        <AddConnectorsDrawer onSelect={jest.fn()} onClose={jest.fn()} />
      </TestWrapper>
    )
    expect(document.querySelectorAll('.PageSpinner--spinner').length).toEqual(1)
  })
})