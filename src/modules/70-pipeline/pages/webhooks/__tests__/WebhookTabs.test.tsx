/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '@modules/10-common/utils/testUtils'
import WebhooksTabs from '../WebhooksTabs'
import { WebhookTabIds } from '../utils'

const mockHistoryPush = jest.fn()
// eslint-disable-next-line jest-no-mock
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockHistoryPush
  }),
  useParams: () => ({
    accountId: 'dummy'
  })
}))

describe('Webhook Tabs Test', () => {
  test('Should render webhook tabs ', async () => {
    const { getByText } = render(
      <TestWrapper pathParams={{ accountId: 'dummy' }}>
        <WebhooksTabs defaultTabId={WebhookTabIds.ListTab} />
      </TestWrapper>
    )
    const listTab = getByText('pipeline.webhooks.webhooksListing')
    const eventsTab = getByText('events')
    expect(listTab).toBeInTheDocument()
    expect(eventsTab).toBeInTheDocument()

    await userEvent.click(eventsTab)
    expect(mockHistoryPush).toHaveBeenCalledWith('/account/dummy/settings/resources/webhooks/events')

    await userEvent.click(listTab)
    expect(mockHistoryPush).toHaveBeenCalledWith('/account/dummy/settings/resources/webhooks')
  })
  test('Should render webhook tabs new nav ', async () => {
    const { getByText } = render(
      <TestWrapper pathParams={{ accountId: 'dummy' }} defaultAppStoreValues={{ isNewNavEnabled: true }}>
        <WebhooksTabs defaultTabId={WebhookTabIds.ListTab} />
      </TestWrapper>
    )
    const listTab = getByText('pipeline.webhooks.webhooksListing')
    const eventsTab = getByText('events')
    expect(listTab).toBeInTheDocument()
    expect(eventsTab).toBeInTheDocument()

    await userEvent.click(eventsTab)
    expect(mockHistoryPush).toHaveBeenCalledWith('/account/dummy/settings/webhooks/events')

    await userEvent.click(listTab)
    expect(mockHistoryPush).toHaveBeenCalledWith('/account/dummy/settings/webhooks')
  })
})
