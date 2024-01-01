/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { Container, Dialog } from '@harness/uicore'
import { useParams } from 'react-router-dom'
import { defaultTo, get, has } from 'lodash-es'

import { useExecutionContext } from '@pipeline/context/ExecutionContext'
import factory from '@pipeline/factories/ExecutionFactory'
import { isExecutionSkipped } from '@pipeline/utils/statusHelpers'
import type { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { ExecutionNode, useGetExecutionNode } from 'services/pipeline-ng'
import type { ExecutionPathProps } from '@common/interfaces/RouteInterfaces'
import type { ConsoleViewStepDetailProps } from '@pipeline/factories/ExecutionFactory/types'
import { ExecutionInputs } from '@pipeline/components/execution/StepDetails/tabs/ExecutionInputs/ExecutionInputs'
import { getNodeId, getStageErrorMessage } from '@pipeline/utils/executionUtils'
import { StageSelection } from './StageSelection/StageSelection'
import css from './ExecutionLogView.module.scss'

export default function ExecutionLogView(): React.ReactElement {
  const {
    allNodeMap,
    selectedStepId,
    queryParams,
    addNewNodeToMap,
    pipelineExecutionDetail,
    selectedStageId,
    selectedStageExecutionId,
    selectedChildStageId,
    pipelineStagesMap
  } = useExecutionContext()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ExecutionPathProps>()
  const { data: executionNode, loading } = useGetExecutionNode({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      nodeExecutionId: defaultTo(queryParams.retryStep, '')
    },
    /**
     * Do not fetch data:
     * 1. No retry step
     * 2. Already have data for it
     */
    lazy: !queryParams.retryStep || has(allNodeMap, queryParams.retryStep)
  })
  const [executionInputStep, setExecutionInputStep] = useState<ExecutionNode | null>(null)

  const selectedStep = allNodeMap[selectedStepId]
  const errorMessage =
    get(selectedStep, 'failureInfo.message') || get(selectedStep, 'executableResponses[0].skipTask.message')

  const nodeId = getNodeId(selectedStageId, selectedStageExecutionId, selectedChildStageId)

  const stage = pipelineStagesMap.get(nodeId)
  const responseMessages = defaultTo(
    pipelineExecutionDetail?.childGraph?.pipelineExecutionSummary?.failureInfo?.responseMessages,
    defaultTo(pipelineExecutionDetail?.pipelineExecutionSummary?.failureInfo?.responseMessages, [])
  )
  const stageErrorMessage = getStageErrorMessage(responseMessages, stage)

  const isSkipped = isExecutionSkipped(selectedStep?.status)
  const openExecutionTimeInputsForStep = React.useCallback(
    (node?: ExecutionNode): void => {
      if (node) {
        setExecutionInputStep(node)
      }
    },
    [setExecutionInputStep]
  )

  const closeExecutionTimeInputsModal = React.useCallback((): void => {
    setExecutionInputStep(null)
  }, [setExecutionInputStep])

  const stepDetails = factory.getConsoleViewStepDetails(selectedStep?.stepType as StepType)

  React.useEffect(() => {
    if (executionNode?.data) {
      Object.assign(executionNode.data, { __isInterruptNode: true })
      addNewNodeToMap(defaultTo(executionNode.data.uuid, ''), executionNode.data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionNode?.data])

  return (
    <Container className={css.logsContainer}>
      <StageSelection openExecutionTimeInputsForStep={openExecutionTimeInputsForStep} />
      {React.createElement<ConsoleViewStepDetailProps>(stepDetails.component, {
        step: selectedStep,
        errorMessage,
        isSkipped,
        loading,
        stageErrorMessage
      })}
      <Dialog
        title={defaultTo(executionInputStep?.name, '')}
        lazy
        isOpen={!!executionInputStep}
        enforceFocus={false}
        onClose={closeExecutionTimeInputsModal}
        className={css.executionInputDialog}
      >
        {executionInputStep ? (
          <ExecutionInputs
            step={executionInputStep}
            className={css.executionInput}
            executionMetadata={defaultTo(
              pipelineExecutionDetail?.childGraph?.executionGraph?.executionMetadata ||
                pipelineExecutionDetail?.rollbackGraph?.executionGraph?.executionMetadata,
              defaultTo(pipelineExecutionDetail?.executionGraph?.executionMetadata, {})
            )}
            onSuccess={closeExecutionTimeInputsModal}
          />
        ) : (
          <div />
        )}
      </Dialog>
    </Container>
  )
}
