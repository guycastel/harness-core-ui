/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { merge } from 'lodash-es'
import { Tabs, Tab, HarnessDocTooltip } from '@harness/uicore'

import { useStrings } from 'framework/strings'
import { isExecutionWaitingForInput, isExecutionWaitingForIntervention } from '@pipeline/utils/statusHelpers'
import type { StepDetailProps } from '@pipeline/factories/ExecutionFactory/types'
import { ExecutionInputs } from '@pipeline/components/execution/StepDetails/tabs/ExecutionInputs/ExecutionInputs'
import { StepDetailsTab } from '@pipeline/components/execution/StepDetails/tabs/StepDetailsTab/StepDetailsTab'
import { InputOutputTab } from '@pipeline/components/execution/StepDetails/tabs/InputOutputTab/InputOutputTab'
import { ManualInterventionTab } from '@pipeline/components/execution/StepDetails/tabs/ManualInterventionTab/ManualInterventionTab'
import { StageType } from '@pipeline/utils/stageHelpers'

import { PolicyEvaluationContent } from '../../common/ExecutionContent/PolicyEvaluationContent/PolicyEvaluationContent'
import css from './DefaultView.module.scss'

enum StepDetailTab {
  STEP_DETAILS = 'STEP_DETAILS',
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
  MANUAL_INTERVENTION = 'MANUAL_INTERVENTION',
  STEP_EXECUTION_INPUTS = 'STEP_EXECUTION_INPUTS',
  POLICY_ENFORCEMENT = 'POLICY_ENFORCEMENT'
}

export function DefaultView(props: StepDetailProps): React.ReactElement {
  const {
    step,
    stageType = StageType.DEPLOY,
    isStageExecutionInputConfigured,
    executionMetadata,
    interruptHistoryData
  } = props
  const { getString } = useStrings()
  const [activeTab, setActiveTab] = React.useState(StepDetailTab.STEP_DETAILS)
  const manuallySelected = React.useRef(false)
  const isWaitingOnExecInputs = isExecutionWaitingForInput(step.status)
  const shouldShowExecutionInputs = !!step.executionInputConfigured
  const shouldShowInputOutput =
    ((step?.stepType ?? '') as string) !== 'liteEngineTask' && !isStageExecutionInputConfigured
  const isManualInterruption = isExecutionWaitingForIntervention(step.status)
  const shouldShowPolicyEnforcement = !!step?.outcomes?.policyOutput?.policySetDetails

  React.useEffect(() => {
    if (!manuallySelected.current) {
      let tab = StepDetailTab.STEP_DETAILS

      if (shouldShowExecutionInputs && (isWaitingOnExecInputs || isStageExecutionInputConfigured)) {
        tab = StepDetailTab.STEP_EXECUTION_INPUTS
      } else if (isManualInterruption) {
        tab = StepDetailTab.MANUAL_INTERVENTION
      }
      setActiveTab(tab)
    }
  }, [
    step.identifier,
    isManualInterruption,
    shouldShowExecutionInputs,
    isWaitingOnExecInputs,
    isStageExecutionInputConfigured
  ])

  return (
    <div className={css.tabs}>
      <Tabs
        id="step-details"
        selectedTabId={activeTab}
        onChange={newTab => {
          manuallySelected.current = true
          setActiveTab(newTab as StepDetailTab)
        }}
        renderAllTabPanels={false}
      >
        {isStageExecutionInputConfigured ? null : (
          <Tab
            id={StepDetailTab.STEP_DETAILS}
            title={<HarnessDocTooltip tooltipId={'stepDetailsTab'} labelText={getString('details')} />}
            panel={
              <StepDetailsTab
                step={step}
                executionMetadata={executionMetadata}
                interruptHistoryData={interruptHistoryData}
              />
            }
          />
        )}

        {shouldShowInputOutput && (
          <Tab
            id={StepDetailTab.INPUT}
            title={<HarnessDocTooltip tooltipId={'stepInputTab'} labelText={getString('common.input')} />}
            disabled={isWaitingOnExecInputs}
            panel={<InputOutputTab baseFqn={step.baseFqn} mode="input" data={step.stepParameters} />}
          />
        )}
        {shouldShowInputOutput && (
          <Tab
            id={StepDetailTab.OUTPUT}
            title={<HarnessDocTooltip tooltipId={'stepOutputTab'} labelText={getString('outputLabel')} />}
            disabled={isWaitingOnExecInputs}
            panel={
              <InputOutputTab
                baseFqn={step.baseFqn}
                mode="output"
                data={Array.isArray(step.outcomes) ? { output: merge({}, ...step.outcomes) } : step.outcomes}
              />
            }
          />
        )}
        {shouldShowExecutionInputs ? (
          <Tab
            id={StepDetailTab.STEP_EXECUTION_INPUTS}
            title={
              <HarnessDocTooltip tooltipId={'executionInputsTab'} labelText={getString('pipeline.runtimeInputs')} />
            }
            panel={<ExecutionInputs step={step} executionMetadata={executionMetadata} />}
          />
        ) : null}
        {isManualInterruption ? (
          <Tab
            id={StepDetailTab.MANUAL_INTERVENTION}
            title={
              <HarnessDocTooltip
                tooltipId={'manualInterventionTab'}
                labelText={getString('pipeline.failureStrategies.strategiesLabel.ManualIntervention')}
              />
            }
            panel={<ManualInterventionTab step={step} stageType={stageType} executionMetadata={executionMetadata} />}
          />
        ) : null}
        {shouldShowPolicyEnforcement ? (
          <Tab
            id={StepDetailTab.POLICY_ENFORCEMENT}
            title={getString('pipeline.policyEnforcement.title')}
            panel={
              <PolicyEvaluationContent
                step={step}
                executionMetadata={executionMetadata}
                policySetOutputPath={'outcomes.policyOutput'}
              />
            }
          />
        ) : null}
      </Tabs>
    </div>
  )
}
