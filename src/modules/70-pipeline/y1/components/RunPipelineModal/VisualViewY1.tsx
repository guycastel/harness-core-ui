/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { Dispatch, SetStateAction, useMemo } from 'react'
import cx from 'classnames'
import type { GetDataError } from 'restful-react'
import { FormikForm, Layout, OverlaySpinner, Text } from '@harness/uicore'
import { useStrings } from 'framework/strings'
import type {
  Error,
  Failure,
  PipelineInfoConfig,
  ResponsePMSPipelineResponseDTO,
  RetryInfo
} from 'services/pipeline-ng'

import { StageSelectionData } from '@pipeline/utils/runPipelineUtils'
import SelectStageToRetryNew, {
  SelectStageToRetryState
} from '@pipeline/components/RunPipelineModal/SelectStageToRetryNew'
import { InputSetItem } from '@modules/70-pipeline/components/InputSetFormY1/types'
import { InputSetSelectorY1 } from '@modules/70-pipeline/components/InputSetSelectorY1/InputSetSelectorY1'
import { SelectedInputSetList } from '@modules/70-pipeline/components/InputSetSelector/SelectedInputSetList'
import { InputsKVPair } from './RunPipelineFormY1'
import { InputsForm } from '../InputsForm/InputsForm'
import { UIInputs } from '../InputsForm/types'
import css from './RunPipelineFormY1.module.scss'

export type ExistingProvide = 'existing' | 'provide'

export interface VisualViewY1Props {
  runtimeInputs: UIInputs
  inputsSchemaLoading: boolean
  executionView?: boolean
  setRunClicked: Dispatch<SetStateAction<boolean>>
  selectedInputSetItems: InputSetItem[]
  setSelectedInputSetItems: Dispatch<SetStateAction<InputSetItem[]>>
  pipelineIdentifier: string
  executionIdentifier?: string
  hasRuntimeInputs: boolean
  templateError?: GetDataError<Failure | Error> | null
  pipeline?: PipelineInfoConfig
  resolvedPipeline?: PipelineInfoConfig
  currentPipeline?: {
    pipeline?: InputsKVPair
  }
  submitForm(): void
  selectedStageData: StageSelectionData
  pipelineResponse: ResponsePMSPipelineResponseDTO | null
  invalidInputSetReferences: string[]
  loadingInputSets: boolean
  onReconcile: (identifier: string) => void
  reRunInputSetYaml?: string
  selectedBranch?: string
  isRetryFromStage?: boolean
  preSelectLastStage?: boolean
  accountId: string
  projectIdentifier: string
  orgIdentifier: string
  repoIdentifier?: string
  branch?: string
  connectorRef?: string
  stageToRetryState: SelectStageToRetryState | null
  onStageToRetryChange: (state: SelectStageToRetryState) => void
  retryStagesResponseData?: RetryInfo
  retryStagesLoading: boolean
  isMergingInputSets: boolean
}

export default function VisualViewY1(props: VisualViewY1Props): React.ReactElement {
  const {
    runtimeInputs,
    inputsSchemaLoading,
    isMergingInputSets,
    executionView,
    selectedInputSetItems,
    setSelectedInputSetItems,
    pipelineIdentifier,
    setRunClicked,
    submitForm,
    isRetryFromStage,
    preSelectLastStage,
    stageToRetryState,
    onStageToRetryChange,
    retryStagesResponseData,
    retryStagesLoading
  } = props
  const { getString } = useStrings()

  const noRuntimeInputs =
    !inputsSchemaLoading && !runtimeInputs.hasInputs ? getString('runPipelineForm.noRuntimeInput') : null

  const SelectStageToRetryMemo = useMemo(
    () =>
      isRetryFromStage ? (
        <SelectStageToRetryNew
          preSelectLastStage={preSelectLastStage}
          stageToRetryState={stageToRetryState}
          onChange={onStageToRetryChange}
          retryStagesResponseData={retryStagesResponseData}
          retryStagesLoading={retryStagesLoading}
        />
      ) : null,
    [
      isRetryFromStage,
      preSelectLastStage,
      stageToRetryState,
      onStageToRetryChange,
      retryStagesResponseData,
      retryStagesLoading
    ]
  )

  return (
    <div
      className={cx(executionView ? css.runModalFormContentExecutionView : css.runModalFormContent, {
        [css.noRuntimeInput]: noRuntimeInputs
      })}
      data-testid="runPipelineVisualView"
      onKeyDown={ev => {
        if (ev.key === 'Enter') {
          ev.preventDefault()
          ev.stopPropagation()
          setRunClicked(true)
          submitForm()
        }
      }}
    >
      <FormikForm>
        {SelectStageToRetryMemo}
        {noRuntimeInputs ? (
          <Layout.Horizontal padding="medium" margin="medium">
            <Text>{noRuntimeInputs}</Text>
          </Layout.Horizontal>
        ) : (
          <div className={css.splitView}>
            {/* TODO: Do not show input set selector on rerun / execution input-set view */}
            <InputSetSelectorY1
              pipelineIdentifier={pipelineIdentifier}
              selectedInputSetItems={selectedInputSetItems}
              onAdd={inputSetItem => {
                setSelectedInputSetItems(prev => [...prev, inputSetItem])
              }}
              className={css.inputSetSelector}
              listHolderClassName={css.inputSetListHolder}
              collapseByDefault
            />

            <div className={css.selectedListAndFields}>
              {!!selectedInputSetItems.length && (
                <Text
                  font={{ size: 'xsmall' }}
                  rightIconProps={{ size: 10 }}
                  rightIcon="arrow-right"
                  className={css.orderBy}
                >
                  {getString('pipeline.inputSets.orderBy')}
                </Text>
              )}
              <div className={css.selectedInputSetList}>
                <SelectedInputSetList
                  value={selectedInputSetItems}
                  onChange={value => {
                    setSelectedInputSetItems(value ?? [])
                  }}
                />
              </div>

              <OverlaySpinner className={css.inputsForm} show={isMergingInputSets}>
                <InputsForm inputs={runtimeInputs} />
              </OverlaySpinner>
            </div>
          </div>
        )}
      </FormikForm>
    </div>
  )
}
