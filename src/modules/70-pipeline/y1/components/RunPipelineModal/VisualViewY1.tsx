/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { Dispatch, FormEvent, SetStateAction, useMemo } from 'react'
import cx from 'classnames'
import type { GetDataError } from 'restful-react'
import { cloneDeep, get } from 'lodash-es'
import { FormikForm, Layout, Text } from '@harness/uicore'
import { useStrings } from 'framework/strings'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import type {
  Error,
  Failure,
  PipelineInfoConfig,
  ResponsePMSPipelineResponseDTO,
  RetryInfo
} from 'services/pipeline-ng'
// TODO start
import { InputSetValue } from '@pipeline/components/InputSetSelector/utils'
import { StageSelectionData } from '@pipeline/utils/runPipelineUtils'
import SelectStageToRetryNew, {
  SelectStageToRetryState
} from '@pipeline/components/RunPipelineModal/SelectStageToRetryNew'
import SelectExistingInputsOrProvideNew from '@pipeline/components/RunPipelineModal/SelectExistingOrProvide'
import { InputSetSelector } from '@pipeline/components/InputSetSelector/InputSetSelector'
// import { PipelineInputSetForm } from '@pipeline/components/PipelineInputSetForm/PipelineInputSetForm'
// import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import { InputsKVPair } from './RunPipelineFormY1'
// TODO end
import { InputsForm } from '../InputsForm/InputsForm'
import { UIInputs } from '../InputsForm/types'
import css from './RunPipelineFormY1.module.scss'

export type ExistingProvide = 'existing' | 'provide'

export interface VisualViewY1Props {
  runtimeInputs: UIInputs
  inputsSchemaLoading: boolean
  executionView?: boolean
  existingProvide: ExistingProvide
  setExistingProvide: Dispatch<SetStateAction<ExistingProvide>>
  setRunClicked: Dispatch<SetStateAction<boolean>>
  selectedInputSets?: InputSetValue[]
  pipelineIdentifier: string
  executionIdentifier?: string
  hasRuntimeInputs: boolean
  template: PipelineInfoConfig
  templateError?: GetDataError<Failure | Error> | null
  pipeline?: PipelineInfoConfig
  resolvedPipeline?: PipelineInfoConfig
  currentPipeline?: {
    pipeline?: InputsKVPair
  }
  getTemplateError: GetDataError<Error | Failure> | null
  submitForm(): void
  hasInputSets: boolean
  setSelectedInputSets: Dispatch<SetStateAction<InputSetValue[] | undefined>>
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
}

export default function VisualViewY1(props: VisualViewY1Props): React.ReactElement {
  const {
    runtimeInputs,
    inputsSchemaLoading,
    executionView,
    existingProvide,
    setExistingProvide,
    selectedInputSets,
    setSelectedInputSets,
    pipelineIdentifier,
    //executionIdentifier,
    hasRuntimeInputs,
    pipeline,
    currentPipeline,
    setRunClicked,
    submitForm,
    hasInputSets,
    //selectedStageData,
    pipelineResponse,
    invalidInputSetReferences,
    loadingInputSets,
    onReconcile,
    reRunInputSetYaml,
    selectedBranch,
    isRetryFromStage,
    preSelectLastStage,
    stageToRetryState,
    onStageToRetryChange,
    retryStagesResponseData,
    retryStagesLoading
  } = props
  const { getString } = useStrings()
  const { setPreference: setUseInputSetSelected } = usePreferenceStore<ExistingProvide>(
    PreferenceScope.USER,
    'useInputSetsSelected'
  )

  const showInputSetSelector = (): boolean => {
    return !!(pipeline && currentPipeline && hasRuntimeInputs && existingProvide === 'existing' && hasInputSets)
  }

  // const showPipelineInputSetForm = (): boolean => {
  //   const retryFromStageCondition =
  //     !isRetryFromStage || (isRetryFromStage && (!!stageToRetryState || !!retryStagesResponseData?.errorMessage))
  //   return (
  //     !!(existingProvide === 'provide' || selectedInputSets?.length || executionView) &&
  //     !loadingInputSets &&
  //     retryFromStageCondition
  //   )
  // }

  const showVoidPipelineInputSetForm = (): boolean => {
    return !!(existingProvide === 'existing' && selectedInputSets?.length)
  }

  const onExistingProvideRadioChange = (ev: FormEvent<HTMLInputElement>): void => {
    const existingProvideValue = ev.currentTarget.checked ? 'existing' : 'provide'
    setExistingProvide(existingProvideValue)
    setUseInputSetSelected(existingProvideValue)
  }

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
          <>
            {/* Do not show input set selector on rerun / execution input-set view */}
            {!executionView && !reRunInputSetYaml && !isRetryFromStage && (
              <Layout.Vertical
                className={css.pipelineHeader}
                padding={{ top: 'xlarge', left: 'xlarge', right: 'xlarge' }}
              >
                <SelectExistingInputsOrProvideNew
                  existingProvide={existingProvide}
                  onExistingProvideRadioChange={onExistingProvideRadioChange}
                  hasInputSets={hasInputSets}
                />
                {showInputSetSelector() ? (
                  <GitSyncStoreProvider>
                    <InputSetSelector
                      pipelineIdentifier={pipelineIdentifier}
                      onChange={inputsets => {
                        setSelectedInputSets(cloneDeep(inputsets))
                      }}
                      value={selectedInputSets}
                      pipelineGitDetails={get(pipelineResponse, 'data.gitDetails')}
                      invalidInputSetReferences={invalidInputSetReferences}
                      loadingMergeInputSets={loadingInputSets}
                      onReconcile={onReconcile}
                      reRunInputSetYaml={reRunInputSetYaml}
                      selectedBranch={selectedBranch}
                      isY1
                    />
                  </GitSyncStoreProvider>
                ) : null}
              </Layout.Vertical>
            )}
            <InputsForm className={css.inputsForm} inputs={runtimeInputs} />
            {/* TODO: Keep this for reference - delete it before merging into develop 
            {showPipelineInputSetForm() ? (
              // <PipelineInputSetFormWrapper
              //   executionView={executionView}
              //   currentPipeline={currentPipeline}
              //   executionIdentifier={executionIdentifier}
              //   hasRuntimeInputs={hasRuntimeInputs}
              //   template={template}
              //   resolvedPipeline={resolvedPipeline}
              //   selectedStageData={selectedStageData}
              //   showDivider={!executionView && !reRunInputSetYaml}
              //   listOfSelectedStages={isRetryFromStage ? stageToRetryState?.listOfSelectedStages : undefined}
              //   isRetryFormStageSelected={isRetryFromStage ? stageToRetryState?.selectedStage !== null : undefined}
              // />
            ) : null} */}
            {showVoidPipelineInputSetForm() ? <div className={css.noPipelineInputSetForm} /> : null}
          </>
        )}
      </FormikForm>
    </div>
  )
}

// export interface PipelineInputSetFormWrapperProps {
//   executionView?: boolean
//   executionIdentifier?: string
//   currentPipeline?: {
//     pipeline?: PipelineInfoConfig
//   }
//   hasRuntimeInputs?: boolean
//   template: PipelineInfoConfig
//   resolvedPipeline?: PipelineInfoConfig
//   selectedStageData: StageSelectionData
//   maybeContainerClassOverride?: string
//   showDivider?: boolean
//   listOfSelectedStages?: string[]
//   isRetryFormStageSelected?: boolean
// }

// function PipelineInputSetFormWrapper(props: PipelineInputSetFormWrapperProps): React.ReactElement | null {
//   const {
//     executionView,
//     currentPipeline,
//     hasRuntimeInputs,
//     template,
//     executionIdentifier,
//     resolvedPipeline,
//     selectedStageData,
//     showDivider,
//     listOfSelectedStages,
//     isRetryFormStageSelected
//   } = props

//   if (currentPipeline?.pipeline && resolvedPipeline && (hasRuntimeInputs || executionView)) {
//     return (
//       <>
//         {showDivider && (
//           <div className={css.dividerWrapper} data-testid={'inputSetFormDivider'}>
//             <div className={css.divider} />
//           </div>
//         )}
//         <PipelineInputSetForm
//           originalPipeline={resolvedPipeline}
//           template={template}
//           readonly={executionView}
//           path=""
//           viewType={StepViewType.DeploymentForm}
//           isRunPipelineForm
//           executionIdentifier={executionIdentifier}
//           maybeContainerClass={css.inputSetFormRunPipeline}
//           selectedStageData={selectedStageData}
//           disableRuntimeInputConfigureOptions
//           listOfSelectedStages={listOfSelectedStages}
//           isRetryFormStageSelected={isRetryFormStageSelected}
//         />
//       </>
//     )
//   }

//   return null
// }
