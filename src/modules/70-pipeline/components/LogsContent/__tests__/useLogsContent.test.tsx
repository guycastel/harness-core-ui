/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { renderHook, act } from '@testing-library/react-hooks'
import { EventSourcePolyfill } from 'event-source-polyfill'

import { TestWrapper } from '@common/utils/testUtils'
import { logBlobPromise } from 'services/logs'
import { useLogsContent } from '../useLogsContent'

jest.mock('event-source-polyfill', () => ({
  EventSourcePolyfill: jest.fn().mockImplementation({
    close: jest.fn()
  } as any)
}))

jest.mock('services/logs', () => ({
  useGetToken: jest.fn(() => ({ data: 'logs_token' })),
  logBlobPromise: jest.fn(() => Promise.resolve({}))
}))

describe('useLogsContent tests', () => {
  test('fetches blob data', () => {
    ;(logBlobPromise as jest.Mock).mockImplementation(() => Promise.resolve('{}'))
    const { result } = renderHook(useLogsContent, { wrapper: TestWrapper })

    act(() => {
      result.current.actions.createSections({
        node: {
          status: 'Success',
          executableResponses: [
            {
              task: { logKeys: ['logKey1'] } as any
            }
          ]
        },
        getSectionName: (i: number) => `Section ${i}`,
        selectedStage: '',
        selectedStep: ''
      })
    })

    expect(logBlobPromise).toHaveBeenCalledWith(
      {
        queryParams: { 'X-Harness-Token': '', accountID: undefined, key: 'logKey1' },
        requestOptions: { headers: { 'X-Harness-Token': 'logs_token' } }
      },
      expect.any(AbortSignal)
    )
  })

  test('fetches stream data', () => {
    const { result } = renderHook(useLogsContent, { wrapper: TestWrapper })

    act(() => {
      result.current.actions.createSections({
        node: {
          status: 'Running',
          executableResponses: [
            {
              task: { logKeys: ['logKey1'] } as any
            }
          ]
        },
        getSectionName: (i: number) => `Section ${i}`,
        selectedStage: '',
        selectedStep: ''
      })
    })

    expect(EventSourcePolyfill).toHaveBeenCalledWith(
      '/log-service/stream?accountID=undefined&orgId=undefined&projectId=undefined&pipelineId=undefined&key=logKey1',
      {
        headers: { Authorization: 'Bearer ', 'X-Harness-Token': 'logs_token' }
      }
    )
  })
})
