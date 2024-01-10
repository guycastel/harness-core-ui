/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback } from 'react'
import { debounce, omit } from 'lodash-es'
import SplitPane, { SplitPaneProps } from 'react-split-pane'

import { isExecutionNotStarted, isExecutionSkipped } from '@pipeline/utils/statusHelpers'
import { useExecutionContext } from '@pipeline/context/ExecutionContext'
import { useLocalStorage, useUpdateQueryParams } from '@common/hooks'
import type { ExecutionPageQueryParams } from '@pipeline/utils/types'
import ExecutionStepDetails from '@pipeline/components/ExecutionStepDetails/ExecutionStepDetails'
import {
  ExecutionLayoutContext,
  ExecutionLayoutState
} from '@pipeline/components/ExecutionLayout/ExecutionLayoutContext'
import ExecutionLayoutFloatingView from '@pipeline/components/ExecutionLayout/ExecutionLayoutFloatingView'

import { ExecutionNodeList } from '@pipeline/components/ExecutionNodeList/ExecutionNodeList'
import { CollapsedNodeProvider } from '@pipeline/components/ExecutionNodeList/CollapsedNodeStore'
import { NodeMetadataProvider } from '@pipeline/components/PipelineDiagram/Nodes/NodeMetadataContext'
import { RUNTIME_NODE_SUFFIX } from '@modules/70-pipeline/utils/execUtils'
import { ExecutionStageDetailsHeader } from './ExecutionStageDetailsHeader/ExecutionStageDetailsHeader'
import ExecutionGraph from './ExecutionGraph/ExecutionGraph'
import ExecutionStageDetails from './ExecutionStageDetails/ExecutionStageDetails'

import css from './ExecutionGraphView.module.scss'

export const PANEL_RESIZE_DELTA = 50
export const MIN_PANEL_SIZE = 200
const IS_TEST = process.env.NODE_ENV === 'test'
const RIGHT_LAYOUT_DEFAULT_SIZE = 570
const BOTTOM_LAYOUT_DEFAULT_SIZE = 500
const EXECUTION_LAYOUT_DOM_ID = `execution-layout-${IS_TEST ? 'test' : /* istanbul ignore next */ Date.now()}`

const splitPaneProps: Partial<Record<ExecutionLayoutState, SplitPaneProps>> = {
  [ExecutionLayoutState.RIGHT]: {
    split: 'vertical',
    defaultSize: RIGHT_LAYOUT_DEFAULT_SIZE,
    minSize: 300,
    maxSize: -300,
    primary: 'second'
  },
  [ExecutionLayoutState.BOTTOM]: {
    split: 'horizontal',
    defaultSize: BOTTOM_LAYOUT_DEFAULT_SIZE,
    minSize: 200,
    maxSize: -100,
    primary: 'first'
  }
}

const styles: React.CSSProperties = {
  overflow: 'unset',
  position: 'static',
  height: 'min-content'
}

export default function ExecutionGraphView(): React.ReactElement {
  const { replaceQueryParams } = useUpdateQueryParams<ExecutionPageQueryParams>()
  const {
    allNodeMap,
    pipelineStagesMap,
    selectedStepId,
    selectedStageId,
    selectedChildStageId,
    selectedStageExecutionId,
    queryParams
  } = useExecutionContext()

  function handleStepSelection(step?: string): void {
    const stepId = step?.replace(new RegExp(`${RUNTIME_NODE_SUFFIX}$`), '')
    if (!stepId) {
      const params = {
        ...queryParams
      }

      delete params.step

      replaceQueryParams(params)
    } else {
      const selectedStep = allNodeMap?.[stepId]
      const errorMessage =
        selectedStep?.failureInfo?.message || selectedStep?.executableResponses?.[0]?.skipTask?.message

      // Disable step selection for NotStarted, Skipped Step with no error message
      if (isExecutionNotStarted(selectedStep?.status) || (isExecutionSkipped(selectedStep?.status) && !errorMessage)) {
        return
      }

      const params = {
        ...queryParams,
        view: queryParams?.view,
        stage: selectedStageId,
        ...(selectedStageExecutionId && { stageExecId: selectedStageExecutionId }),
        ...(selectedChildStageId && { childStage: selectedChildStageId }),
        step: stepId
      }

      delete params.retryStep
      delete params.collapsedNode

      replaceQueryParams(params)
    }
  }

  function handleStageSelection(stage: string, parentStageId?: string, stageExecId?: string): void {
    const selectedStage = pipelineStagesMap.get(stage)

    if (isExecutionNotStarted(selectedStage?.status) || isExecutionSkipped(selectedStage?.status)) {
      return
    }

    const params = {
      ...queryParams,
      ...(parentStageId ? { stage: parentStageId } : { stage }),
      ...(stageExecId ? { stageExecId } : {}),
      ...(parentStageId && { childStage: stage.split('|')[0] })
    }

    delete params.step
    delete params.retryStep
    delete params.collapsedNode

    if (!parentStageId && params?.childStage) {
      delete params.childStage
    }

    if (!stageExecId) {
      delete params.stageExecId
    }

    replaceQueryParams(params)
  }

  const handleCollapsedNodeSelection = useCallback(
    (collapsedNode?: string): void => {
      const params = {
        ...queryParams,
        stage: selectedStageId,
        step: selectedStepId,
        ...(selectedStageExecutionId && { stageExecId: selectedStageExecutionId }),
        ...(selectedChildStageId && { childStage: selectedChildStageId }),
        collapsedNode
      }

      delete params.retryStep

      if (!collapsedNode) {
        delete params.collapsedNode
      }

      replaceQueryParams(params)
    },
    [queryParams, replaceQueryParams, selectedChildStageId, selectedStageExecutionId, selectedStageId, selectedStepId]
  )

  const [layouts, setLayoutState] = useLocalStorage<ExecutionLayoutState[]>(
    'execution_layout_2', // increase the number in case data structure is changed
    [ExecutionLayoutState.RIGHT]
  )
  const [layoutState] = layouts
  const [isStepDetailsVisible, setStepDetailsVisibility] = React.useState(false)
  const [isCollapsedNodePaneVisible, setCollapsedNodePaneVisibility] = React.useState(false)
  const [primaryPaneSize, setPrimaryPaneSize] = React.useState(250)
  const [tertiaryPaneSize, setTertiaryPaneSize] = React.useState(
    layoutState === ExecutionLayoutState.RIGHT ? RIGHT_LAYOUT_DEFAULT_SIZE : BOTTOM_LAYOUT_DEFAULT_SIZE
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setStageSplitPaneSizeDebounce = React.useCallback(debounce(setPrimaryPaneSize, 300), [setPrimaryPaneSize])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setStepSplitPaneSizeDebounce = React.useCallback(debounce(setTertiaryPaneSize, 300), [setTertiaryPaneSize])

  /* Ignoring this function as it is used by "react-split-pane" */
  /* istanbul ignore next */
  function handleStageResize(size: number): void {
    setStageSplitPaneSizeDebounce(size)
  }

  function setLayout(e: ExecutionLayoutState): void {
    setLayoutState(prevState => [e, ...prevState.slice(0, 1)])
  }

  function restoreDialog(): void {
    setLayoutState(prevState => {
      const prevNonMinState = prevState.find(s => s !== ExecutionLayoutState.MINIMIZE)

      return [prevNonMinState || ExecutionLayoutState.RIGHT, ExecutionLayoutState.MINIMIZE]
    })
  }

  // handle layout change
  React.useEffect(() => {
    if (layoutState === ExecutionLayoutState.RIGHT) {
      setTertiaryPaneSize(RIGHT_LAYOUT_DEFAULT_SIZE)
    } else if (layoutState === ExecutionLayoutState.BOTTOM) {
      setTertiaryPaneSize(BOTTOM_LAYOUT_DEFAULT_SIZE)
    }
  }, [layoutState])

  const executionGraph = <ExecutionGraph onSelectedStage={handleStageSelection} />
  const executionStageDetails = (
    <ExecutionStageDetails
      layout={layoutState}
      onStepSelect={handleStepSelection}
      onCollapsedNodeSelect={handleCollapsedNodeSelection}
    />
  )
  const nodeListOrStepdetails = isCollapsedNodePaneVisible ? <ExecutionNodeList /> : <ExecutionStepDetails />
  const isThirdPaneVisible = isCollapsedNodePaneVisible || isStepDetailsVisible

  let stageGraphPaneStyles = { ...styles }

  if (layoutState === ExecutionLayoutState.RIGHT) {
    Object.assign(stageGraphPaneStyles, {
      position: 'sticky',
      top: 'var(--execution-stage-details-height)'
    })
  } else if (layoutState === ExecutionLayoutState.BOTTOM) {
    stageGraphPaneStyles = {
      overflow: 'hidden'
    }
  }
  return (
    <ExecutionLayoutContext.Provider
      value={{
        layout: layoutState,
        setLayout,
        primaryPaneSize,
        tertiaryPaneSize,
        setPrimaryPaneSize,
        setTertiaryPaneSize,
        isStepDetailsVisible,
        setStepDetailsVisibility,
        restoreDialog,
        isCollapsedNodePaneVisible,
        setCollapsedNodePaneVisibility
      }}
    >
      <CollapsedNodeProvider>
        <NodeMetadataProvider>
          <div className={css.main} id={EXECUTION_LAYOUT_DOM_ID}>
            <SplitPane
              split="horizontal"
              className={css.splitPane1}
              minSize={MIN_PANEL_SIZE}
              size={primaryPaneSize}
              onChange={handleStageResize}
              pane1Style={omit(styles, 'height')}
              pane2Style={styles}
              style={styles}
            >
              {executionGraph}
              <div className={css.stageDetails}>
                <ExecutionStageDetailsHeader />
                {isThirdPaneVisible &&
                (layoutState === ExecutionLayoutState.BOTTOM || layoutState === ExecutionLayoutState.RIGHT) ? (
                  <SplitPane
                    className={css.splitPane2}
                    {...splitPaneProps[layoutState]}
                    size={tertiaryPaneSize}
                    onChange={setStepSplitPaneSizeDebounce}
                    pane1Style={stageGraphPaneStyles}
                    pane2Style={styles}
                    style={styles}
                  >
                    {executionStageDetails}
                    {nodeListOrStepdetails}
                  </SplitPane>
                ) : (
                  <React.Fragment>
                    {executionStageDetails}
                    {isThirdPaneVisible ? (
                      <ExecutionLayoutFloatingView>{nodeListOrStepdetails}</ExecutionLayoutFloatingView>
                    ) : null}
                  </React.Fragment>
                )}
              </div>
            </SplitPane>
          </div>
        </NodeMetadataProvider>
      </CollapsedNodeProvider>
    </ExecutionLayoutContext.Provider>
  )
}
