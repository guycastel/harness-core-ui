/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { defaultTo, get } from 'lodash-es'
import { ResponseMessage } from 'services/pipeline-ng'
import { getStageErrorMessage, resolveCurrentStep } from '@pipeline/utils/executionUtils'
import { ExecutionContextParams } from '@pipeline/context/ExecutionContext'

export enum ErrorScope {
  Stage = 'STAGE',
  Step = 'STEP'
}

export const getErrorMessage = ({
  erropScope,
  nodeId,
  pipelineStagesMap,
  pipelineExecutionDetail,
  selectedStepId,
  allNodeMap,
  queryParams
}: {
  erropScope: ErrorScope
  nodeId: string
  pipelineStagesMap: ExecutionContextParams['pipelineStagesMap']
  pipelineExecutionDetail: ExecutionContextParams['pipelineExecutionDetail']
  selectedStepId: ExecutionContextParams['selectedStepId']
  allNodeMap: ExecutionContextParams['allNodeMap']
  queryParams: ExecutionContextParams['queryParams']
}): string => {
  const stage = pipelineStagesMap.get(nodeId)
  const _pipelineExecutionDetail = get(pipelineExecutionDetail, 'childGraph', pipelineExecutionDetail)
  const responseMessages = defaultTo(
    _pipelineExecutionDetail?.pipelineExecutionSummary?.failureInfo?.responseMessages,
    []
  )
  const currentStepId = resolveCurrentStep(selectedStepId, queryParams)
  const selectedStep = allNodeMap[currentStepId]
  switch (erropScope) {
    case ErrorScope.Step:
      return (
        get(selectedStep, 'failureInfo.message', '') ||
        get(selectedStep, 'failureInfo.responseMessages', [])
          ?.filter((respMssg: ResponseMessage) => !!respMssg?.message)
          ?.map((respMssg: ResponseMessage) => respMssg.message)
          ?.join(',')
      )
    case ErrorScope.Stage:
      return getStageErrorMessage(responseMessages, stage)
    default:
      return ''
  }
}
