/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useLocation, useParams } from 'react-router-dom'
import cx from 'classnames'
import qs from 'qs'
import { Container } from '@harness/uicore'
import { ResponseMessage, useGetSettingValue } from 'services/cd-ng'
import type { ExecutionGraph, ExecutionNode, InterruptEffectDTO } from 'services/pipeline-ng'
import { String } from 'framework/strings'
import { ErrorHandler } from '@common/components/ErrorHandler/ErrorHandler'
import { LogsContentWithErrorBoundary as LogsContent } from '@pipeline/components/LogsContent/LogsContent'
import { isExecutionSkipped, isExecutionCompletedWithBadState } from '@pipeline/utils/statusHelpers'
import { StepDetails, StepLabels } from '@pipeline/components/execution/StepDetails/common/StepDetails/StepDetails'
import { useQueryParams } from '@common/hooks'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { SettingType } from '@common/constants/Utils'
import { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { ExecutionQueryParams, getNodeId, showHarnessCoPilot } from '@pipeline/utils/executionUtils'
import HarnessCopilot from '@pipeline/components/HarnessCopilot/HarnessCopilot'
import { ErrorScope } from '@pipeline/components/HarnessCopilot/AIDAUtils'
import { useExecutionContext } from '@pipeline/context/ExecutionContext'

import css from './StepDetailsTab.module.scss'

export interface ExecutionStepDetailsTabProps {
  step: ExecutionNode
  executionMetadata: ExecutionGraph['executionMetadata']
  labels?: StepLabels[]
  interruptHistoryData?: InterruptEffectDTO
}

export function StepDetailsTab(props: ExecutionStepDetailsTabProps): React.ReactElement {
  const { step, executionMetadata, labels, interruptHistoryData } = props
  const { pathname } = useLocation()
  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()
  const queryParams = useQueryParams<ExecutionQueryParams>()
  const {
    pipelineStagesMap,
    selectedStageId,
    selectedStageExecutionId,
    selectedChildStageId,
    pipelineExecutionDetail
  } = useExecutionContext()
  const { CI_AI_ENHANCED_REMEDIATIONS } = useFeatureFlags()

  const logUrl = `${pathname}?${qs.stringify({ ...queryParams, view: 'log' })}`

  const errorMessage = step?.failureInfo?.message || step.executableResponses?.[0]?.skipTask?.message
  const isFailed = isExecutionCompletedWithBadState(step.status)
  const isSkipped = isExecutionSkipped(step.status)
  const nodeId = getNodeId(selectedStageId, selectedStageExecutionId, selectedChildStageId)

  const { data: aidaSettingResponse } = useGetSettingValue({
    identifier: SettingType.AIDA,
    queryParams: { accountIdentifier: accountId, orgIdentifier, projectIdentifier }
  })

  return (
    <div className={css.detailsTab}>
      {step.failureInfo?.responseMessages?.length ? (
        <ErrorHandler responseMessages={step.failureInfo?.responseMessages as ResponseMessage[]} />
      ) : errorMessage ? (
        <div className={cx(css.errorMsg, { [css.error]: isFailed, [css.warn]: isSkipped })}>
          <String className={css.title} stringID="errorSummaryText" tagName="div" />
          <p>{errorMessage}</p>
        </div>
      ) : null}
      {isFailed &&
      showHarnessCoPilot({
        pipelineStagesMap,
        selectedStageId: nodeId,
        pipelineExecutionDetail,
        enableForCI: CI_AI_ENHANCED_REMEDIATIONS,
        enableForCD: true,
        isEULAccepted: aidaSettingResponse?.data?.value === 'true'
      }) ? (
        <Container
          flex={{ justifyContent: 'flex-start' }}
          padding={{ top: 'large', bottom: 'large', right: 'bottom', left: 'medium' }}
        >
          <HarnessCopilot mode="step-details" scope={ErrorScope.Step} />
        </Container>
      ) : null}
      <StepDetails
        step={step}
        labels={labels}
        executionMetadata={executionMetadata}
        interruptHistoryData={interruptHistoryData}
      />
      <LogsContent mode="step-details" toConsoleView={logUrl} />
    </div>
  )
}
