/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ExecutionPathProps } from '@modules/10-common/interfaces/RouteInterfaces'
import { useExecutionContext } from '@modules/70-pipeline/context/ExecutionContext'
import { logBlobPromise, useGetToken } from 'services/logs'
import { useDeepCompareEffect } from '@common/hooks'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLogsContentHook(logKeys: string[], deps: any[]): any {
  const { accountId, orgIdentifier, pipelineIdentifier, projectIdentifier } = useParams<ExecutionPathProps>()
  const { logsToken, setLogsToken } = useExecutionContext()
  const { data: tokenData } = useGetToken({ queryParams: { accountID: accountId }, lazy: !!logsToken })
  const logsTokenRef = React.useRef('')

  const [blobDataCur, setBlobDataCur] = useState<Record<string, unknown>>()

  const commonQueryParams = {
    accountID: accountId,
    orgId: orgIdentifier,
    pipelineId: pipelineIdentifier,
    projectId: projectIdentifier
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function getBlobData(id: string): Promise<any> {
    // if token is not found, schedule the call for later

    try {
      const data = await logBlobPromise({
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
      })

      if (typeof data === 'string') {
        return data
      }
    } catch (e) {
      return e
    }
  }

  React.useEffect(() => {
    if (logsToken) {
      logsTokenRef.current = logsToken
    }

    if (tokenData) {
      setLogsToken(tokenData)
      logsTokenRef.current = tokenData
    }
  }, [tokenData, logsToken, setLogsToken])
  useDeepCompareEffect(() => {
    logKeys.forEach(async logKey => {
      const blobData = await getBlobData(logKey)
      setBlobDataCur(blobData)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { blobDataCur, getBlobData }
}
