/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render } from '@testing-library/react'
import { TestWrapper } from '@common/utils/testUtils'
import routes from '@common/RouteDefinitions'
import { accountPathProps, orgPathProps, projectPathProps } from '@common/utils/routeUtils'
import IDPAdminSideNav from '../IDPAdminSideNav'

jest.mock('@harnessio/react-idp-service-client', () => ({
  useGetStatusInfoTypeV2Query: jest.fn().mockImplementation(() => {
    return { data: { onboarding: { currentStatus: 'NOT_FOUND' } } }
  })
}))

describe('IDP Sidenav', () => {
  test('render', () => {
    const { getByText } = render(
      <TestWrapper
        path={routes.toIDPAdmin({
          ...accountPathProps,
          ...projectPathProps,
          ...orgPathProps
        })}
        pathParams={{
          accountId: 'accountId',
          projectIdentifier: 'projectID',
          orgIdentifier: 'default'
        }}
      >
        <IDPAdminSideNav />
      </TestWrapper>
    )
    expect(getByText('common.plugins')).toBeVisible()
    expect(getByText('idp.urlAllowList')).toBeVisible()
    expect(getByText('connectorsLabel')).toBeVisible()
    expect(getByText('accessControl')).toBeVisible()
    expect(getByText('selectProject')).toBeVisible()
    expect(getByText('pipelines')).toBeVisible()
  })
})
