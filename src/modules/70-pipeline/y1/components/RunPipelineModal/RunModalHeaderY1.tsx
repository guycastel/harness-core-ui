/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { Dispatch, SetStateAction, useState } from 'react'
import {
  Heading,
  HarnessDocTooltip,
  MultiSelectDropDown,
  VisualYamlSelectedView as SelectedView,
  VisualYamlToggle,
  SelectOption,
  Layout
  // Utils,
  // Icon,
  // Text
} from '@harness/uicore'
import {
  Color
  // , FontVariation
} from '@harness/design-system'
import { isEmpty } from 'lodash-es'

import type { FormikErrors } from 'formik'
import type { GetDataError } from 'restful-react'
// import { Position } from '@blueprintjs/core'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import { useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import type {
  CacheResponseMetadata,
  //ResponseInputSetTemplateWithReplacedExpressionsResponse,
  ResponseListStageExecutionResponse,
  ResponsePMSPipelineResponseDTO,
  Error,
  Failure,
  //AccessControlCheckError,
  useGetPipeline
} from 'services/pipeline-ng'
// TODO start
import {
  ALL_STAGE_VALUE,
  getAllStageData,
  getAllStageItem,
  SelectedStageData,
  StageSelectionData
} from '@pipeline/utils/runPipelineUtils'
import type { InputSetDTO } from '@pipeline/utils/types'
import { EntityCachedCopy } from '@pipeline/components/PipelineStudio/PipelineCanvas/EntityCachedCopy/EntityCachedCopy'
import { ErrorsStrip } from '@pipeline/components/ErrorsStrip/ErrorsStrip'
import GitPopover from '@pipeline/components/GitPopover/GitPopover'
// TODO ends
import GitRemoteDetails from '@common/components/GitRemoteDetails/GitRemoteDetails'
import type { GitFilterScope } from '@common/components/GitFilters/GitFilters'
// import useRBACError, { RBACError } from '@rbac/utils/useRBACError/useRBACError'

import css from './RunPipelineFormY1.module.scss'

export interface RunModalHeaderY1Props {
  hasRuntimeInputs: boolean
  pipelineExecutionId?: string
  selectedStageData: StageSelectionData
  setSelectedStageData: (selectedStages: StageSelectionData) => void
  setSkipPreFlightCheck: Dispatch<SetStateAction<boolean>>
  selectedView: SelectedView
  handleModeSwitch(view: SelectedView): void
  runClicked: boolean
  executionView?: boolean
  connectorRef?: string
  pipelineResponse: ResponsePMSPipelineResponseDTO | null
  //template: ResponseInputSetTemplateWithReplacedExpressionsResponse | null
  formRefDom: React.MutableRefObject<HTMLElement | undefined>
  formErrors: FormikErrors<InputSetDTO>
  stageExecutionData: ResponseListStageExecutionResponse | null
  //stageExecutionError: GetDataError<Failure | Error | AccessControlCheckError> | null
  executionStageList: SelectOption[]
  runModalHeaderTitle: string
  refetchPipeline: ReturnType<typeof useGetPipeline>['refetch']
  selectedBranch?: string
  onGitBranchChange(selectedFilter: GitFilterScope, defaultSelected?: boolean): void
  remoteFetchError?: GetDataError<Failure | Error> | null
  isRetryFromStage?: boolean
  isRerunPipeline?: boolean
}

export default function RunModalHeaderY1(props: RunModalHeaderY1Props): React.ReactElement | null {
  const {
    hasRuntimeInputs,
    pipelineExecutionId,
    selectedStageData,
    setSelectedStageData,
    setSkipPreFlightCheck,
    handleModeSwitch,
    runClicked,
    executionView,
    selectedView,
    connectorRef,
    pipelineResponse,
    //template,
    formRefDom,
    formErrors,
    stageExecutionData,
    //stageExecutionError,
    executionStageList,
    runModalHeaderTitle,
    refetchPipeline,
    selectedBranch,
    remoteFetchError,
    onGitBranchChange,
    isRerunPipeline,
    isRetryFromStage
  } = props
  const {
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF,
    supportingGitSimplification
  } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const { getString } = useStrings()
  // const { getRBACErrorMessage } = useRBACError()
  const [localSelectedStagesData, setLocalSelectedStagesData] = useState(selectedStageData)
  const isPipelineRemote =
    supportingGitSimplification &&
    pipelineResponse?.data?.gitDetails?.repoName &&
    pipelineResponse?.data?.gitDetails?.branch

  const isStageExecutionDisabled = (): boolean => {
    //stageExecutionData?.data is empty array when allowStageExecution is set to false in advanced tab
    return Boolean(pipelineExecutionId) || isEmpty(stageExecutionData?.data)
  }

  const handleReloadFromCache = (): void => {
    refetchPipeline({
      requestOptions: { headers: { 'Load-From-Cache': 'false' } }
    })
  }

  const stageExecutionDisabledTooltip = isStageExecutionDisabled() ? 'stageExecutionDisabled' : undefined

  const onStageSelect = (items: SelectOption[]): void => {
    const allStagesSelected = items.find(item => item.value === ALL_STAGE_VALUE)
    const updatedSelectedStages: SelectedStageData[] = []
    const hasOnlyAllStagesUnChecked =
      items.length === stageExecutionData?.data?.length &&
      !items.find(item => item.value === getAllStageItem(getString).value)
    if (
      (!localSelectedStagesData.allStagesSelected && allStagesSelected) ||
      hasOnlyAllStagesUnChecked ||
      items?.length === 0
    ) {
      const updatedSelectedStageItems = []
      updatedSelectedStageItems.push(getAllStageItem(getString))
      updatedSelectedStages.push(getAllStageData(getString))

      setLocalSelectedStagesData({
        selectedStages: updatedSelectedStages,
        selectedStageItems: updatedSelectedStageItems,
        allStagesSelected: true
      })
    } else {
      const newItems = items.filter((option: SelectOption) => {
        const stageDetails = stageExecutionData?.data?.find(stageData => stageData.stageIdentifier === option.value)
        stageDetails && updatedSelectedStages.push(stageDetails)
        return option.value !== ALL_STAGE_VALUE
      })
      setLocalSelectedStagesData({
        selectedStages: updatedSelectedStages,
        selectedStageItems: newItems,
        allStagesSelected: false
      })
    }
    setSkipPreFlightCheck(true)
  }

  if (executionView) {
    return null
  }

  return (
    <>
      <div className={css.runModalHeader}>
        <Heading
          level={2}
          font={{ weight: 'bold' }}
          color={Color.BLACK_100}
          className={css.runModalHeaderTitle}
          data-tooltip-id="runPipelineFormTitle"
        >
          {runModalHeaderTitle}
          <HarnessDocTooltip tooltipId="runPipelineFormTitle" useStandAlone={true} />
        </Heading>
        {isGitSyncEnabled && (
          <GitSyncStoreProvider>
            <GitPopover
              data={pipelineResponse?.data?.gitDetails ?? {}}
              iconProps={{ margin: { left: 'small', top: 'xsmall' } }}
            />
          </GitSyncStoreProvider>
        )}

        {remoteFetchError ? null : (
          <>
            {!isRetryFromStage && (
              <Layout.Horizontal
                data-tooltip-id={stageExecutionDisabledTooltip}
                spacing="small"
                flex={{ alignItems: 'center', justifyContent: 'flex-start' }}
              >
                <MultiSelectDropDown
                  popoverClassName={css.disabledStageDropdown}
                  hideItemCount={localSelectedStagesData.allStagesSelected}
                  disabled={isStageExecutionDisabled()}
                  buttonTestId={'stage-select'}
                  onChange={onStageSelect}
                  onPopoverClose={() => setSelectedStageData(localSelectedStagesData)}
                  value={localSelectedStagesData.selectedStageItems}
                  items={executionStageList}
                  minWidth={150}
                  usePortal={true}
                  placeholder={
                    localSelectedStagesData.allStagesSelected ? getString('pipeline.allStages') : getString('stages')
                  }
                  className={css.stagesDropdown}
                />
                <HarnessDocTooltip tooltipId={stageExecutionDisabledTooltip} useStandAlone={true} />
                {/* TODO:: commenting till selectiveStageExecution API is fixed */}
                {/* {!isEmpty(stageExecutionError) ? (
                  <Utils.WrapOptionalTooltip
                    tooltip={
                      <Text
                        padding="medium"
                        font={{ variation: FontVariation.BODY }}
                        width={380}
                        className={css.stageExecutionErrorTooltip}
                      >
                        {getRBACErrorMessage(stageExecutionError as RBACError, true)}
                      </Text>
                    }
                    tooltipProps={{ usePortal: true, position: Position.RIGHT, isDark: true }}
                  >
                    <Icon name="warning-sign" color={Color.RED_700} data-testid="stageExecutionErrorIcon" />
                  </Utils.WrapOptionalTooltip>
                ) : null} */}
              </Layout.Horizontal>
            )}
            <div className={css.optionBtns}>
              <VisualYamlToggle
                selectedView={selectedView}
                onChange={handleModeSwitch}
                disableToggle={!hasRuntimeInputs}
              />
            </div>
          </>
        )}
      </div>
      {isPipelineRemote && (
        <div className={css.gitRemoteDetailsWrapper}>
          <GitRemoteDetails
            connectorRef={connectorRef}
            repoName={pipelineResponse?.data?.gitDetails?.repoName}
            branch={pipelineResponse?.data?.gitDetails?.branch || selectedBranch}
            filePath={pipelineResponse?.data?.gitDetails?.filePath}
            fileUrl={pipelineResponse?.data?.gitDetails?.fileUrl}
            onBranchChange={onGitBranchChange}
            flags={{ readOnly: isRerunPipeline || isRetryFromStage }}
          />
          {!isEmpty(pipelineResponse?.data?.cacheResponse) && (
            <EntityCachedCopy
              reloadContent={getString('common.pipeline')}
              cacheResponse={pipelineResponse?.data?.cacheResponse as CacheResponseMetadata}
              reloadFromCache={handleReloadFromCache}
            />
          )}
        </div>
      )}
      {runClicked ? <ErrorsStrip domRef={formRefDom} formErrors={formErrors} /> : null}
    </>
  )
}
