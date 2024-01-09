/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, RenderResult, queryByAttribute } from '@testing-library/react'
import { SIDE_NAV_STATE } from '@modules/10-common/router/RouteWithLayoutV2'
import * as routUtils from '@common/utils/routeUtils'
import { TestWrapper } from '@common/utils/testUtils'
import SideNavHeader from '../SideNavHeader'
import SideNavHeaderPublic from '../SideNavHeaderPublic'

const renderComponent = (): RenderResult =>
  render(
    <TestWrapper
      defaultAppStoreValues={{
        currentUserInfo: { name: 'Dev Name', email: 'mail@harness.io', uuid: '123' },
        isNewNavEnabled: true
      }}
      path="/account/:accountId/:mode/:module/orgs/:orgIdentifier/projects/:projectIdentifier"
      pathParams={{
        accountId: 'abcd',
        orgIdentifier: 'abcd',
        projectIdentifier: 'abcd',
        mode: routUtils.NAV_MODE.MODULE,
        module: 'cd'
      }}
    >
      <SideNavHeader />
    </TestWrapper>
  )

const renderComponentPublic = (sideNavState: SIDE_NAV_STATE = SIDE_NAV_STATE.EXPANDED): RenderResult =>
  render(
    <TestWrapper
      defaultAppStoreValues={{ isCurrentSessionPublic: true }}
      path="/account/:accountId/:mode/:module/orgs/:orgIdentifier/projects/:projectIdentifier"
      pathParams={{
        accountId: 'abcd',
        orgIdentifier: 'abcd',
        projectIdentifier: 'abcd',
        mode: routUtils.NAV_MODE.MODULE,
        module: 'cd'
      }}
      defaultLayoutValue={{ sideNavState, setSideNavState: jest.fn() }}
    >
      <SideNavHeaderPublic />
    </TestWrapper>
  )

describe('Sidenav header', () => {
  test('should render', () => {
    const { container } = renderComponent()
    expect(queryByAttribute('data-icon', container, 'harness-logo-white')).toBeInTheDocument()
    expect(queryByAttribute('data-icon', container, 'nine-dot-options')).toBeInTheDocument()
  })
  test('collapsed state', () => {
    const { container } = render(
      <TestWrapper defaultLayoutValue={{ sideNavState: SIDE_NAV_STATE.COLLAPSED, setSideNavState: jest.fn() }}>
        <SideNavHeader />
      </TestWrapper>
    )
    expect(queryByAttribute('data-icon', container, 'nav-harness')).toBeInTheDocument()
  })
  test('module', async () => {
    jest.spyOn(routUtils, 'getRouteParams').mockReturnValue({
      mode: routUtils.NAV_MODE.MODULE,
      module: 'cd',
      accountId: 'accountId',
      orgIdentifier: 'orgIdentifier',
      projectIdentifier: 'projectIdentifier'
    })
    const { container, findByText } = renderComponent()
    expect(queryByAttribute('data-icon', container, 'cd-main')).toBeInTheDocument()
    const text = await findByText('common.cdAndGitops')
    expect(text).toBeInTheDocument()
    expect(text.closest('a')).toHaveAttribute(
      'href',
      '/account/abcd/module/cd/orgs/orgIdentifier/projects/projectIdentifier'
    )
  })

  test('Render SideNavHeaderPublic with EXPANDED STATE', async () => {
    const { container } = renderComponentPublic(SIDE_NAV_STATE.EXPANDED)

    // harnessLogoBlackIcon should be visible in EXPANDED state
    const harnessLogoBlackIcon = queryByAttribute('data-icon', container, 'harness-logo-black')
    expect(harnessLogoBlackIcon).toBeInTheDocument()
  })

  test('Render SideNavHeaderPublic with COLLAPSED STATE', async () => {
    const { container } = renderComponentPublic(SIDE_NAV_STATE.COLLAPSED)

    // navHarnessIcon should be visible in COLLAPSED state
    const navHarnessIcon = queryByAttribute('data-icon', container, 'nav-harness')
    expect(navHarnessIcon).toBeInTheDocument()

    // harnessLogoBlackIcon should NOT be visible in COLLAPSED state
    const harnessLogoBlackIcon = queryByAttribute('data-icon', container, 'harness-logo-black')
    expect(harnessLogoBlackIcon).not.toBeInTheDocument()
  })
})
