/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { isEqual } from 'lodash-es'
import { Select, SelectOption, Text } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { useStrings } from 'framework/strings'
import type { RetryInfo } from 'services/pipeline-ng'
import { isExecutionFailed } from '@pipeline/utils/statusHelpers'
import css from './RunPipelineForm.module.scss'

export interface ParallelStageOption extends SelectOption {
  isLastIndex: number
}

export interface SelectStageToRetryState {
  isAllStage: boolean
  listOfSelectedStages: string[]
  selectedStage: ParallelStageOption | null
  isParallelStage: boolean
}

export interface SelectStageToRetryProps {
  preSelectLastStage?: boolean
  /* NOTE: onChange gets called once without user interaction */
  onChange: (value: SelectStageToRetryState) => void
  stageToRetryState: SelectStageToRetryState | null
  retryStagesResponseData?: RetryInfo
  retryStagesLoading: boolean
}

function SelectStageToRetryNew({
  preSelectLastStage,
  onChange,
  stageToRetryState,
  retryStagesResponseData,
  retryStagesLoading
}: SelectStageToRetryProps): React.ReactElement | null {
  const { getString } = useStrings()
  const [stageList, setStageList] = useState<SelectOption[]>([])

  const {
    isAllStage = true,
    listOfSelectedStages = [],
    selectedStage = null,
    isParallelStage = false
  } = stageToRetryState ?? {}

  const onChangeInternal = (value: SelectStageToRetryState): void => {
    if (!isEqual(stageToRetryState, value)) {
      onChange(value)
    }
  }

  const lastFailedStageIdx = useMemo(() => {
    let _lastFailedStageIdx = -1
    if (retryStagesResponseData?.groups?.length) {
      _lastFailedStageIdx = retryStagesResponseData.groups.length - 1
      retryStagesResponseData.groups.forEach((stageGroup, idx) => {
        stageGroup.info?.forEach(stageName => {
          if (isExecutionFailed(stageName?.status)) _lastFailedStageIdx = idx
        })
      })
    }
    return _lastFailedStageIdx
  }, [retryStagesResponseData?.groups])

  useEffect(() => {
    if (retryStagesResponseData?.groups?.length) {
      let failedStageIdx = -1
      const stageListValues = retryStagesResponseData.groups.map((stageGroup, idx) => {
        if (stageGroup.info?.length === 1) {
          failedStageIdx = isExecutionFailed(stageGroup.info[0].status) ? idx : failedStageIdx
          return { label: stageGroup.info[0].name, value: stageGroup.info[0].identifier, isLastIndex: idx }
        } else {
          const parallelStagesLabel = stageGroup.info?.map(stageName => stageName.name).join(' | ')
          const parallelStagesValue = stageGroup.info
            ?.map(stageName => {
              failedStageIdx = isExecutionFailed(stageName?.status) ? idx : failedStageIdx
              return stageName.identifier
            })
            .join(' | ')
          return {
            label: parallelStagesLabel,
            value: parallelStagesValue,
            isLastIndex: idx
          }
        }
      })

      if (failedStageIdx !== -1 && preSelectLastStage) {
        stageListValues.splice(failedStageIdx + 1)
      }
      setStageList(stageListValues as SelectOption[])
    }
  }, [retryStagesResponseData, preSelectLastStage])

  useEffect(() => {
    if (retryStagesResponseData?.groups?.length) {
      const newState: SelectStageToRetryState = {
        isAllStage,
        isParallelStage,
        listOfSelectedStages,
        selectedStage
      }

      if (preSelectLastStage && lastFailedStageIdx !== -1) {
        let value: ParallelStageOption
        const groups = retryStagesResponseData.groups
        const stageGroup = groups[lastFailedStageIdx]
        if (stageGroup) {
          if (stageGroup?.info?.length === 1) {
            const [{ name, identifier }] = stageGroup?.info || []
            value = { label: name as string, value: identifier as string, isLastIndex: lastFailedStageIdx }
            const selectedStages = getListOfSelectedStages(value)
            newState.selectedStage = value
            newState.listOfSelectedStages = selectedStages
            onChangeInternal(newState)
          } else {
            const parallelStagesLabel = stageGroup.info?.map(stageName => stageName.name).join(' | ')
            const parallelStagesValue = stageGroup.info?.map(stageName => stageName.identifier).join(' | ')
            value = {
              label: parallelStagesLabel as string,
              value: parallelStagesValue as string,
              isLastIndex: lastFailedStageIdx
            }
            const selectedStages = getListOfSelectedStages(value)
            newState.selectedStage = value
            newState.listOfSelectedStages = selectedStages
            newState.isParallelStage = true
            newState.isAllStage = true
            onChangeInternal(newState)
          }
        }
      } else {
        onChangeInternal(newState)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryStagesResponseData, preSelectLastStage, lastFailedStageIdx])

  const getListOfSelectedStages = (value: ParallelStageOption): string[] => {
    const stagesList = retryStagesResponseData?.groups?.filter((_, stageIdx) => stageIdx < value.isLastIndex)
    const listOfIds: string[] = []

    stagesList?.forEach(stageData => {
      stageData?.info?.forEach(stageInfo => {
        listOfIds.push(stageInfo.identifier as string)
      })
    })
    return listOfIds
  }

  const handleStageChange = (selectedStageValue: ParallelStageOption): void => {
    const newState: SelectStageToRetryState = {
      isAllStage,
      isParallelStage,
      listOfSelectedStages,
      selectedStage: selectedStageValue
    }

    if (selectedStageValue.label.includes('|')) {
      newState.isParallelStage = true
    } else {
      newState.isParallelStage = false
    }

    const selectedStages = getListOfSelectedStages(selectedStageValue)
    newState.listOfSelectedStages = selectedStages

    onChangeInternal(newState)
  }

  return (
    <div className={css.selectStageWrapper}>
      <Text
        tooltipProps={{ dataTooltipId: 'selectRetryStageText' }}
        color={Color.GREY_700}
        font={{ size: 'small', weight: 'semi-bold' }}
      >
        {retryStagesResponseData?.errorMessage
          ? retryStagesResponseData.errorMessage
          : getString('pipeline.stagetoRetryFrom')}
      </Text>
      {!!retryStagesResponseData?.groups?.length && (
        <Select
          disabled={retryStagesLoading}
          name={'selectRetryStage'}
          value={selectedStage}
          items={stageList}
          onChange={value => handleStageChange(value as ParallelStageOption)}
          className={css.selectStage}
        />
      )}
    </div>
  )
}

export default SelectStageToRetryNew
