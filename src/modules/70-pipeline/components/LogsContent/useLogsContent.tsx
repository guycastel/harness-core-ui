/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { Reducer } from 'react'
import { useParams } from 'react-router-dom'
import { defaultTo, throttle } from 'lodash-es'
import { EventSourcePolyfill } from 'event-source-polyfill'

import type { ExecutionPathProps } from '@common/interfaces/RouteInterfaces'
import { PQueue } from '@common/utils/PQueue'
import { useGetToken, logBlobPromise } from 'services/logs'
import SessionToken from 'framework/utils/SessionToken'
import { useExecutionContext } from '@pipeline/context/ExecutionContext'
import { useDeepCompareEffect } from '@common/hooks'

import { useIsPublicAccess } from 'framework/hooks/usePublicAccess'
import type { ActionType, State, Action } from './LogsState/types'
import { reducer } from './LogsState'
import { useActionCreator, UseActionCreatorReturn } from './LogsState/actions'
import { getDefaultReducerState, logsCache } from './LogsState/utils'

type LogsReducer = Reducer<State, Action<ActionType>>

export interface UseLogsContentReturn {
  state: State
  actions: UseActionCreatorReturn
}

export interface StartStreamProps {
  queryParams: {
    key: string
    accountID: string
    orgId?: string
    projectId?: string
    pipelineId?: string
  }
  headers: Record<string, string>
  key: string
  throttleTime?: number
}

const STREAM_ENDPOINT = `${window.apiUrl || ''}/log-service/stream`

export function useLogsContent(): UseLogsContentReturn {
  const requestQueue = React.useRef(new PQueue())
  const {
    accountId,

    orgIdentifier,
    pipelineIdentifier,
    projectIdentifier
  } = useParams<ExecutionPathProps>()
  const [state, dispatch] = React.useReducer<LogsReducer>(reducer, getDefaultReducerState())
  const actions = useActionCreator(dispatch)
  const { logsToken, setLogsToken } = useExecutionContext()
  const { data: tokenData } = useGetToken({ queryParams: { accountID: accountId }, lazy: !!logsToken })
  const eventSource = React.useRef<null | EventSource>(null)
  const isCurrentSessionPublic = useIsPublicAccess()
  /**
   * Here we are utilizing the concept of double buffering in case of streaming logs
   * https://www.computerhope.com/jargon/d/doublebu.htm
   */
  const buffer1 = React.useRef<Record<string, string>>({})
  const buffer2 = React.useRef<Record<string, string>>({})
  const activeBuffer = React.useRef(buffer1.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throlledSetState = React.useCallback(
    throttle((props: StartStreamProps) => {
      let data = ''
      // switch buffer
      if (activeBuffer.current === buffer1.current) {
        data = buffer1.current[props.key]
        activeBuffer.current = buffer2.current
        buffer1.current[props.key] = ''
      } else if (activeBuffer.current === buffer2.current) {
        data = buffer2.current[props.key]
        activeBuffer.current = buffer1.current
        buffer2.current[props.key] = ''
      }

      actions.updateSectionData({ data, id: props.key, append: true }) // with old buffer
    }, 500),
    [actions]
  )

  const closeStream = React.useCallback(() => {
    eventSource.current?.close()
    eventSource.current = null
  }, [])

  const startStream = React.useCallback(
    (props: StartStreamProps): void => {
      closeStream()
      actions.updateSectionData({ data: '', id: props.key })

      const currentEventSource = new EventSourcePolyfill(
        `${STREAM_ENDPOINT}?accountID=${props.queryParams.accountID}&orgId=${props.queryParams.orgId}&projectId=${props.queryParams.projectId}&pipelineId=${props.queryParams.pipelineId}&key=${props.queryParams.key}`,
        { headers: props.headers }
      ) as EventSource

      eventSource.current = currentEventSource

      currentEventSource.onmessage = (e: MessageEvent) => {
        if (e.type === 'error') {
          currentEventSource.close()
        }

        /* istanbul ignore else */
        if (e.data) {
          // write to current buffer here
          activeBuffer.current[props.key] += `\n${e.data}`
          throlledSetState(props)
        }
      }

      currentEventSource.onerror = (e: Event) => {
        /* istanbul ignore else */
        if (e.type === 'error') {
          closeStream()
        }
      }
    },
    [closeStream, actions]
  )

  const commonQueryParams = {
    accountID: accountId,
    orgId: orgIdentifier,
    pipelineId: pipelineIdentifier,
    projectId: projectIdentifier
  }
  // need to save token in a ref due to scoping issues
  const logsTokenRef = React.useRef('')
  const timerRef = React.useRef<null | number>(null)

  function getBlobData(id: string): void {
    requestQueue.current.add(async (signal: AbortSignal) => {
      if (logsCache.has(id)) {
        actions.updateSectionData({ data: defaultTo(logsCache.get(id), ''), id })
        return
      }

      // if token is not found, schedule the call for later
      // Do not block the blob call in case of publicAccess
      if (!logsTokenRef.current && !isCurrentSessionPublic) {
        timerRef.current = window.setTimeout(() => getBlobData(id), 300)
        return
      }

      actions.fetchingSectionData(id)

      try {
        const data = (await logBlobPromise(
          {
            queryParams: {
              ...commonQueryParams,
              'X-Harness-Token': '',
              key: id
            },
            requestOptions: {
              headers: {
                'X-Harness-Token': logsTokenRef.current
              }
            }
          },
          signal
        )) as unknown

        if (typeof data === 'string') {
          logsCache.set(id, data)
          actions.updateSectionData({ id, data })
        } else {
          actions.resetSection(id)
        }
      } catch (e) {
        actions.resetSection(id)
      }
    })
  }

  function getStream(logKey: string): void {
    // if token is not found, schedule the call for later
    // Do not block the blob call in case of publicAccess
    if (!logsTokenRef.current && !isCurrentSessionPublic) {
      timerRef.current = window.setTimeout(() => getStream(logKey), 300)
      return
    }
    actions.fetchingSectionData(logKey)
    const headers: Record<string, string> = {
      'X-Harness-Token': logsTokenRef.current
    }
    if (!window.noAuthHeader) {
      headers.Authorization = `Bearer ${SessionToken.getToken()}`
    }
    startStream({
      queryParams: {
        ...commonQueryParams,
        key: encodeURIComponent(logKey)
      },
      headers,
      key: logKey
    })
  }

  React.useEffect(() => {
    // use the existing token if present
    if (logsToken) {
      logsTokenRef.current = logsToken
    }

    // if `logsToken` is not present, `tokenData` is fetched
    // as we set the lazy flag based on it's presence
    /* istanbul ignore else */
    if (tokenData) {
      setLogsToken(tokenData)
      logsTokenRef.current = tokenData
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenData, logsToken])

  // This fetches data for sections
  useDeepCompareEffect(() => {
    state.logKeys.forEach(logKey => {
      const section = state.dataMap[logKey]
      /* istanbul ignore else */
      if (section && section.status === 'LOADING') {
        /* istanbul ignore else */
        if (section.dataSource === 'blob') {
          getBlobData(logKey)
        } else if (section.dataSource === 'stream') {
          getStream(logKey)
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedStep, state.dataMap])

  // on unmount
  React.useEffect(() => {
    const queue = requestQueue.current

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
      queue.cancel()
      closeStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, actions }
}
