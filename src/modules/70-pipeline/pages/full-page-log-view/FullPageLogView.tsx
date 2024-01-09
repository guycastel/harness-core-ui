/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useParams } from 'react-router-dom'
import { defaultTo, get } from 'lodash-es'
import { Spinner } from '@blueprintjs/core'

import { String as LocaleString, useStrings } from 'framework/strings'
import type { PipelineLogsPathProps } from '@common/interfaces/RouteInterfaces'
import { useGetExecutionDetailV2, useGetExecutionNode } from 'services/pipeline-ng'
import { logBlobPromise, useGetToken } from 'services/logs'

import { useDeepCompareEffect } from '@common/hooks'
import { createSections } from '@pipeline/components/LogsContent/LogsState/createSections'
import { ActionType, LogLineData } from '@pipeline/components/LogsContent/LogsState/types'
import { getDefaultReducerState } from '@pipeline/components/LogsContent/LogsState/utils'
import { processLogsData } from '@pipeline/components/LogsContent/LogsState/updateSectionData'

import LogsSection from './LogsSection'

import css from './FullPageLogView.module.scss'

export interface LogsData {
  name: string
  data: LogLineData[]
}

export default function FullPageLogView(): React.ReactElement {
  const {
    stageIdentifier,
    stepIndentifier,
    accountId,
    orgIdentifier,
    projectIdentifier,
    executionIdentifier,
    pipelineIdentifier
  } = useParams<PipelineLogsPathProps>()
  const { getString } = useStrings()
  const [logsData, setLogsData] = React.useState<LogsData[]>([])
  const [logsDataLoading, setLogsDataLoading] = React.useState(false)
  const { data: tokenData, loading: tokenLoading } = useGetToken({ queryParams: { accountID: accountId } })
  const { data: executionData, loading: executionLoading } = useGetExecutionDetailV2({
    planExecutionId: executionIdentifier,
    queryParams: {
      orgIdentifier,
      projectIdentifier,
      accountIdentifier: accountId,
      stageNodeId: stageIdentifier
    }
  })

  const node = get(executionData, ['data', 'executionGraph', 'nodeMap', stepIndentifier])
  // this is for retry node
  const { data: retryNodeData, loading: retryNodeLoading } = useGetExecutionNode({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      nodeExecutionId: stepIndentifier
    },
    /**
     * Do not fetch data:
     * 1. execution data call is in progress
     * 2. we have node data already
     */
    lazy: executionLoading || !!node
  })

  const loading = tokenLoading || executionLoading || retryNodeLoading || logsDataLoading
  const finalNode = defaultTo(retryNodeData?.data, node)

  useDeepCompareEffect(() => {
    const abortController = new AbortController()

    /* istanbul ignore else */
    if (finalNode) {
      try {
        const sections = createSections(
          getDefaultReducerState({ selectedStage: stageIdentifier, selectedStep: stepIndentifier }),
          {
            type: ActionType.CreateSections,
            payload: {
              node: finalNode,
              selectedStage: stageIdentifier,
              selectedStep: stepIndentifier,
              getSectionName: (index: number): string => getString('pipeline.logs.sectionName', { index })
            }
          }
        )

        setLogsDataLoading(true)

        const promises = sections.logKeys.map(async (key, i) => {
          const data = (await logBlobPromise(
            {
              queryParams: {
                accountID: accountId,
                orgId: orgIdentifier,
                pipelineId: pipelineIdentifier,
                projectId: projectIdentifier,
                'X-Harness-Token': '',
                key
              },
              requestOptions: {
                headers: {
                  'X-Harness-Token': tokenData as unknown as string
                }
              }
            },
            abortController.signal
          )) as unknown as string

          return { name: get(sections, ['units', i]), data: processLogsData(defaultTo(data, '')) }
        })
        Promise.all(promises).then(data => {
          setLogsData(data)
          setLogsDataLoading(false)
        })
      } catch (_e) {
        setLogsDataLoading(false)
      }
    }

    return () => {
      abortController.abort()
    }
  }, [finalNode])

  /* istanbul ignore else */
  if (loading) {
    return (
      <div className={css.main}>
        <Spinner />
      </div>
    )
  }

  /* istanbul ignore else */
  if (!finalNode || logsData.length === 0) {
    return (
      <div className={css.main}>
        <LocaleString stringID="common.logs.noLogsText" />
      </div>
    )
  }

  /* istanbul ignore else */
  if (logsData.length === 1) {
    return (
      <div className={css.main} data-testid="single-section">
        <LogsSection data={logsData[0].data} className={css.logsSection} />
      </div>
    )
  }

  return (
    <div className={css.main} data-testid="multi-section">
      {logsData.map((section, i) => {
        return (
          <details key={i} open>
            <summary>{section.name}</summary>
            <LogsSection data={section.data} className={css.logsSection} />
          </details>
        )
      })}
    </div>
  )
}
