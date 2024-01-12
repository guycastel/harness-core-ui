/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, fireEvent, act, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { findPopoverContainer, TestWrapper } from '@common/utils/testUtils'
import routes from '@common/RouteDefinitions'
import DelegatesListingItem from '../DelegateListingItem'
import { delegateGroupsMock } from './DelegateGroupsMock'

jest.mock('@common/components/YAMLBuilder/YamlBuilder')

jest.mock('services/portal', () => ({
  useDeleteDelegateGroupByIdentifier: () => ({
    mutate: jest.fn()
  })
}))

jest.mock('services/cd-ng', () => ({
  useIsImmutableDelegateEnabled: jest.fn().mockImplementation(() => {
    return {
      mutate: jest.fn()
    }
  })
}))
const routesToDelegateDetails = jest.spyOn(routes, 'toDelegatesDetails')
describe('Delegates Listing With Groups', () => {
  test('render data', () => {
    const { getByText } = render(
      <TestWrapper>
        <DelegatesListingItem data={delegateGroupsMock} />
      </TestWrapper>
    )

    // Ensure that at least one of the delegateGroupIdentifier from mock data renders
    expect(getByText(delegateGroupsMock[0].delegateGroupIdentifier)).toBeInTheDocument()
  })

  test('click on delegate item details option', async () => {
    render(
      <TestWrapper>
        <DelegatesListingItem data={delegateGroupsMock} />
      </TestWrapper>
    )
    const row = await screen.findAllByRole('row')
    const moreOptions = within(row[2]).getByRole('button', {
      name: /delegate menu options/i
    })
    await userEvent.click(moreOptions)

    const menuContent = findPopoverContainer() as HTMLElement

    const viewDetailsFromMenu = within(menuContent).getByText('details')

    await userEvent.click(viewDetailsFromMenu)
    await waitFor(() => {
      expect(routesToDelegateDetails).toHaveBeenCalled()
    })
  })

  test('click on delegate item delete action', async () => {
    const { queryAllByText } = render(
      <TestWrapper>
        <DelegatesListingItem data={delegateGroupsMock} />
      </TestWrapper>
    )

    const row = await screen.findAllByRole('row')
    const moreOptions = within(row[1]).getByRole('button', {
      name: /delegate menu options/i
    })
    await userEvent.click(moreOptions)

    const menuContent = findPopoverContainer() as HTMLElement

    const viewDeleteFromMenu = within(menuContent).getByText('delete')

    await userEvent.click(viewDeleteFromMenu)

    expect(document.body.querySelector('[class*="useConfirmationDialog"]')).toBeDefined()
    const modalDeleteBtn = queryAllByText('delete')[1]
    act(() => {
      fireEvent.click(modalDeleteBtn!)
    })
    waitFor(() => {
      expect(document.body.innerHTML).not.toContain('useConfirmationDialog')
    })
  })

  test('click on delegate item troubleshoot action', async () => {
    render(
      <TestWrapper>
        <DelegatesListingItem data={delegateGroupsMock} />
      </TestWrapper>
    )
    const row = await screen.findAllByRole('row')
    const moreOptions = within(row[1]).getByRole('button', {
      name: /delegate menu options/i
    })
    await userEvent.click(moreOptions)

    const menuContent = findPopoverContainer() as HTMLElement
    const viewTroubleshooterFromMenu = within(menuContent).getByText('platform.delegates.openTroubleshooter')
    await userEvent.click(viewTroubleshooterFromMenu)
    expect(document.body.innerHTML).toContain('troubleshoot')
  })

  test('click on delegate item and expand it', async () => {
    const { container } = render(
      <TestWrapper>
        <DelegatesListingItem data={delegateGroupsMock} />
      </TestWrapper>
    )
    const expandRowBtn = container.querySelector('[data-icon="chevron-right"]') as HTMLButtonElement
    act(() => {
      fireEvent.click(expandRowBtn!)
    })
    waitFor(() => {
      expect(document.body.innerHTML).toContain('platform.delegates.noInstances')
    })
  })
})
