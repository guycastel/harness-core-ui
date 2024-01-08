/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { IconName, SelectOption, MultiTypeInputType } from '@harness/uicore'
import { clone, remove } from 'lodash-es'
import type { EntityGitDetails, InputSetSummaryResponse } from 'services/pipeline-ng'
import { SelectedInputSetListValue } from './SelectedInputSetList'
import css from './InputSetSelector.module.scss'

export const INPUT_SET_SELECTOR_PAGE_SIZE = 100

type InputSetLocal = InputSetSummaryResponse & SelectOption
export interface InputSetValue extends InputSetLocal {
  type: InputSetSummaryResponse['inputSetType']
  gitDetails?: EntityGitDetails
  idType?: MultiTypeInputType
}
export interface ChildPipelineStageProps {
  childOrgIdentifier: string
  childProjectIdentifier: string
  inputSetReferences?: string[]
}
export interface InputSetErrorMetaData {
  isLoading: boolean
  containsError: boolean
  branch?: string
}

export const getIconByType = (type: 'INPUT_SET' | 'OVERLAY_INPUT_SET' | string | undefined): IconName => {
  return type === 'OVERLAY_INPUT_SET' ? 'step-group' : 'yaml-builder-input-sets'
}

export const onDragStart = (event: React.DragEvent<HTMLLIElement>, row: SelectedInputSetListValue): void => {
  event.dataTransfer.setData('data', JSON.stringify(row))
  event.currentTarget.classList.add(css.dragging)
}

export const onDragEnd = (event: React.DragEvent<HTMLLIElement>): void => {
  event.currentTarget.classList.remove(css.dragging)
}

export const onDragLeave = (event: React.DragEvent<HTMLLIElement>): void => {
  event.currentTarget.classList.remove(css.dragOver)
}

export const onDragOver = (event: React.DragEvent<HTMLLIElement>): void => {
  if (event.preventDefault) {
    event.preventDefault()
  }
  event.currentTarget.classList.add(css.dragOver)
  event.dataTransfer.dropEffect = 'move'
}

export const getInputSetExpressionValue = (expressionVal: string): InputSetValue => {
  const expressionArr = expressionVal.split('.')
  let expressionLabel = expressionVal
  //  Only show 1st and last 2 name of expression
  //  -> (pipeline.execution.Stage.StageA.name = pipeline.....StageA.name)
  if (expressionArr.length > 3) {
    expressionLabel = expressionArr[0] + '...' + expressionArr.slice(expressionArr.length - 2).join('.')
  }
  return {
    type: 'INPUT_SET',
    label: expressionLabel,
    value: expressionVal,
    idType: MultiTypeInputType.EXPRESSION
  }
}

export const removeInvalidInputSet = (selectedInputSets: InputSetValue[], inputSetId: string): InputSetValue[] => {
  const clonedInputSets = clone(selectedInputSets)
  remove(clonedInputSets, set => set.value === inputSetId)
  return clonedInputSets
}
