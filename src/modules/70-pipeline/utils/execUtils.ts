/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { IconName } from '@harness/uicore'
import { defaultTo, get, isEmpty } from 'lodash-es'
import { PipelineGraphState, PipelineGraphType } from '@pipeline/components/PipelineDiagram/types'
import type { ExecutionGraph, ExecutionNode, NodeRunInfo } from 'services/pipeline-ng'
import {
  getConditionalExecutionFlag,
  getStatusProps
} from '@pipeline/components/ExecutionStageDiagram/ExecutionStageDiagramUtils'
import { ExecutionPipelineNodeType } from '@pipeline/components/ExecutionStageDiagram/ExecutionPipelineModel'
import { Event } from '@pipeline/components/PipelineDiagram/Constants'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import {
  StepGroupRollbackIdentifier,
  StepNodeType,
  RollbackContainerCss,
  getIconDataBasedOnType,
  LITE_ENGINE_TASK,
  RollbackIdentifier,
  TopLevelStepNodes,
  hasOnlyLiteEngineTask,
  StepTypeIconsMap,
  ServiceDependency,
  STATIC_SERVICE_GROUP_NAME,
  isNodeTypeMatrixOrFor,
  NonSelectableStepNodes
} from './executionUtils'
import type { ExecutionStatus } from './statusHelpers'
interface ProcessParalellNodeArgs {
  nodeMap: ExecutionGraph['nodeMap']
  nodeAdjacencyListMap: ExecutionGraph['nodeAdjacencyListMap']
  rootNodes: Array<PipelineGraphState>
  items: Array<PipelineGraphState>
  id: string
  isNestedGroup?: boolean
}

interface StepPipelineGraphState {
  step?: ExecutionNode & { skipCondition?: string; when?: NodeRunInfo; type?: string; data: any }
}
interface ParallelStepPipelineGraphState {
  parallel: StepPipelineGraphState
}

export const RUNTIME_NODE_SUFFIX = '__RUNTIME__'
const addDependencyToArray = (service: ServiceDependency, arr: Array<PipelineGraphState>): void => {
  const stepItem: PipelineGraphState = {
    identifier: service.identifier as string,
    name: service.name as string,
    status: service.status as ExecutionStatus,
    icon: 'dependency-step',
    data: { ...(service as ExecutionNode), icon: 'dependency-step' },
    type: 'service-dependency',
    nodeType: 'service-dependency',
    id: service.identifier
  }

  // add step node
  arr.push(stepItem)
}

const addDependencies = (dependencies: ServiceDependency[], stepsPipelineNodes: Array<PipelineGraphState>): void => {
  if (dependencies && dependencies.length > 0) {
    const items: Array<PipelineGraphState> = []

    dependencies.forEach(_service => addDependencyToArray(_service, items))

    const dependenciesGroup: PipelineGraphState = {
      name: 'Dependencies',
      identifier: STATIC_SERVICE_GROUP_NAME,
      status: dependencies[0].status as ExecutionStatus,
      icon: 'step-group',
      nodeType: StepNodeType.STEP_GROUP,
      type: StepNodeType.STEP_GROUP,
      id: STATIC_SERVICE_GROUP_NAME,
      data: {
        icon: 'step-group',
        identifier: STATIC_SERVICE_GROUP_NAME,
        stepGroup: {
          name: 'Dependencies',
          identifier: STATIC_SERVICE_GROUP_NAME,
          status: dependencies[0].status as ExecutionStatus,
          nodeType: StepNodeType.STEP_GROUP,
          type: StepNodeType.STEP_GROUP,
          data: {},
          steps: [
            { parallel: items.map(stepData => ({ step: { ...stepData, graphType: PipelineGraphType.STEP_GRAPH } })) }
          ] // processStepGroupSteps({ nodeAdjacencyListMap, id: parentNodeId, nodeMap, rootNodes })
        }
      }
    }
    stepsPipelineNodes.unshift(dependenciesGroup)
  }
}
export const processLiteEngineTask = (
  nodeData: ExecutionNode | undefined,
  rootNodes: Array<PipelineGraphState>,
  parentNode?: ExecutionNode
): void => {
  // NOTE: liteEngineTask contains information about dependencies
  const serviceDependencyList: ServiceDependency[] =
    // Array check is required for legacy support
    (Array.isArray(nodeData?.outcomes)
      ? nodeData?.outcomes?.find((_item: any) => !!_item.serviceDependencyList)?.serviceDependencyList
      : nodeData?.outcomes?.dependencies?.serviceDependencyList) || []

  // 1. Add dependency services
  addDependencies(serviceDependencyList, rootNodes)

  // 2. Exclude Initialize duration from the parent
  if (nodeData && parentNode) {
    const taskDuration = nodeData.endTs! - nodeData.startTs!
    parentNode.startTs = Math.min(parentNode.startTs! + taskDuration, parentNode.endTs!)
  }

  // 3. Add Initialize step ( at the first place in array )

  const iconData = getIconDataBasedOnType(nodeData)
  const stepItem: PipelineGraphState = {
    name: 'Initialize',
    identifier: nodeData?.identifier as string,
    id: nodeData?.uuid as string,
    status: nodeData?.status as ExecutionStatus,
    type: nodeData?.stepType as string,
    data: {
      ...nodeData,
      when: nodeData?.nodeRunInfo,
      ...iconData,
      icon: 'initialize-ci-step',
      conditionalExecutionEnabled: getConditionalExecutionFlag(nodeData?.nodeRunInfo)
    },
    icon: 'initialize-ci-step'
  }

  rootNodes.unshift(stepItem)
}

const processParallelNodeData = ({
  items,
  nodeMap,
  nodeAdjacencyListMap,
  id,
  rootNodes,
  isNestedGroup = false
}: ProcessParalellNodeArgs): void => {
  const [parentNodeId, ...childNodeIds] = nodeAdjacencyListMap?.[id].children as string[]
  const parentNodeData = nodeMap?.[parentNodeId]
  const iconData = getIconDataBasedOnType(parentNodeData)
  const nodeStrategyType =
    parentNodeData?.stepType === StepNodeType.STRATEGY
      ? ((parentNodeData?.stepParameters?.strategyType || 'MATRIX') as string)
      : (parentNodeData?.stepType as string)
  items.push({
    name: getExecutionNodeName(parentNodeData),
    identifier: parentNodeData?.identifier as string,
    id: parentNodeData?.uuid as string,
    nodeType: nodeStrategyType,
    type: nodeStrategyType,
    icon: iconData.icon,
    status: parentNodeData?.status as ExecutionStatus,
    data: {
      ...iconData,
      ...(parentNodeData?.stepType === StepNodeType.STEP_GROUP || parentNodeData?.stepType === StepNodeType.GROUP
        ? {
            isNestedGroup,
            stepGroup: {
              name: getExecutionNodeName(parentNodeData),
              identifier: parentNodeData?.identifier,
              id: parentNodeData?.uuid as string,
              skipCondition: parentNodeData?.skipInfo?.evaluatedCondition
                ? parentNodeData.skipInfo.skipCondition
                : undefined,
              status: parentNodeData?.status as ExecutionStatus,
              type: parentNodeData?.stepType,
              data: parentNodeData,
              steps: processStepGroupSteps({ nodeAdjacencyListMap, id: parentNodeId, nodeMap, rootNodes })
            }
          }
        : parentNodeData?.stepType === StepNodeType.STRATEGY
        ? {
            maxParallelism: parentNodeData?.stepParameters?.maxConcurrency,
            stepGroup: {
              ...parentNodeData,
              name: getExecutionNodeName(parentNodeData),
              id: parentNodeData?.uuid as string,
              skipCondition: parentNodeData?.skipInfo?.evaluatedCondition
                ? parentNodeData.skipInfo.skipCondition
                : undefined,
              status: parentNodeData?.status as ExecutionStatus,
              type: nodeStrategyType,
              nodeType: nodeStrategyType,
              maxParallelism: parentNodeData?.stepParameters?.maxConcurrency,
              icon: StepTypeIconsMap.STEP_GROUP,
              steps: processStepGroupSteps({ nodeAdjacencyListMap, id: parentNodeId, nodeMap, rootNodes })
            }
          }
        : {
            name: getExecutionNodeName(parentNodeData),
            identifier: parentNodeData?.identifier,
            id: parentNodeData?.uuid as string,
            skipCondition: parentNodeData?.skipInfo?.evaluatedCondition
              ? parentNodeData.skipInfo.skipCondition
              : undefined,
            status: parentNodeData?.status as ExecutionStatus,
            type: parentNodeData?.stepType,
            data: parentNodeData
          }),
      nodeType: nodeStrategyType,
      maxParallelism: parentNodeData?.stepParameters?.maxConcurrency,
      graphType: PipelineGraphType.STEP_GRAPH,
      conditionalExecutionEnabled: getConditionalExecutionFlag(parentNodeData?.nodeRunInfo),
      when: parentNodeData?.nodeRunInfo
    },
    children: processNodeDataV1(childNodeIds || /* istanbul ignore next */ [], nodeMap, nodeAdjacencyListMap, rootNodes)
  })
}

interface ProcessStepGroupStepsArgs {
  nodeMap: ExecutionGraph['nodeMap']
  nodeAdjacencyListMap: ExecutionGraph['nodeAdjacencyListMap']
  rootNodes: Array<PipelineGraphState>
  id: string
  isNestedGroup?: boolean
}
const processStepGroupSteps = ({
  nodeAdjacencyListMap,
  id,
  nodeMap,
  rootNodes,
  isNestedGroup = false
}: ProcessStepGroupStepsArgs): any[] => {
  const steps: any[] = []
  nodeAdjacencyListMap?.[id].children?.forEach((childId: string): void => {
    const nodeData = nodeMap?.[childId] as ExecutionNode
    if (nodeData.stepType === StepNodeType.FORK) {
      const childrenNodes = processNodeDataV1(
        nodeAdjacencyListMap[childId].children || [],
        nodeMap,
        nodeAdjacencyListMap,
        rootNodes,
        isNestedGroup
      )
      if (nodeData.name === 'parallel') {
        if (!isEmpty(childrenNodes)) {
          steps.push({
            parallel: childrenNodes.map(node => ({
              step: { ...node, ...getNodeConditions(node as ExecutionNode), graphType: PipelineGraphType.STEP_GRAPH }
            }))
          })
        }
      } else {
        steps.push(
          ...childrenNodes.map(node => ({
            step: { ...node, ...getNodeConditions(node as ExecutionNode), graphType: PipelineGraphType.STEP_GRAPH }
          }))
        )
      }
    } else {
      const nodeStrategyType =
        nodeData?.stepType === StepNodeType.STRATEGY
          ? ((nodeData?.stepParameters?.strategyType || 'MATRIX') as string)
          : (nodeData?.stepType as string)

      const stepData = isNodeTypeMatrixOrFor(nodeStrategyType)
        ? processStepGroupSteps({
            nodeAdjacencyListMap,
            id: nodeData?.uuid as string,
            nodeMap,
            rootNodes,
            isNestedGroup
          })
        : nodeStrategyType === StepNodeType.STEP_GROUP || nodeStrategyType === StepNodeType.GROUP
        ? processStepGroupSteps({
            nodeAdjacencyListMap,
            id: nodeData?.uuid as string,
            nodeMap,
            rootNodes,
            isNestedGroup
          })
        : []
      const matrixNodeName = nodeData?.strategyMetadata?.matrixmetadata?.matrixvalues

      steps.push({
        step: {
          ...nodeData,
          name: getExecutionNodeName(nodeData),
          ...getNodeConditions(nodeData as ExecutionNode),
          graphType: PipelineGraphType.STEP_GRAPH,
          ...getIconDataBasedOnType(nodeData),
          matrixNodeName,
          type: nodeStrategyType,
          nodeType: nodeStrategyType,
          ...(isNodeTypeMatrixOrFor(nodeStrategyType) ||
          nodeStrategyType === StepNodeType.STEP_GROUP ||
          nodeStrategyType === StepNodeType.GROUP
            ? {
                data: {
                  ...nodeData?.progressData,
                  ...nodeData,
                  name: getExecutionNodeName(nodeData),
                  isNestedGroup: true, // strategy in step_group
                  maxParallelism: nodeData?.stepParameters?.maxConcurrency,
                  matrixNodeName,
                  nodeType: nodeStrategyType,
                  stepGroup: {
                    ...nodeData,
                    type: nodeStrategyType,
                    nodeType: nodeStrategyType,
                    maxParallelism: nodeData?.stepParameters?.maxConcurrency,
                    icon: StepTypeIconsMap.STEP_GROUP,
                    steps: stepData,
                    status: nodeData?.status as ExecutionStatus
                  }
                }
              }
            : {
                data: { ...nodeData, isNestedGroup }
              })
        }
      })
    }
    const processChildNodes = processNextNodes({
      nodeMap,
      nodeAdjacencyListMap,
      nextIds: nodeAdjacencyListMap?.[childId].nextIds || [],
      rootNodes,
      isNestedGroup: true
    })

    steps.push(...processChildNodes.map(step => ({ step })))
  })
  return steps
}
interface ProcessSingleItemArgs {
  nodeMap: ExecutionGraph['nodeMap']
  items: Array<PipelineGraphState>
  id: string
  nodeAdjacencyListMap: ExecutionGraph['nodeAdjacencyListMap']
  showInLabel?: boolean

  rootNodes: Array<PipelineGraphState>
}
const processSingleItem = ({
  items,
  id,
  nodeMap,
  showInLabel,
  nodeAdjacencyListMap,
  rootNodes
}: ProcessSingleItemArgs): void => {
  const nodeData = nodeMap?.[id]
  if (!nodeData) {
    return
  }

  const iconData = getIconDataBasedOnType(nodeData)
  const item = {
    name: getExecutionNodeName(nodeData),
    identifier: nodeData?.identifier,
    id: nodeData?.uuid,
    skipCondition: nodeData?.skipInfo?.evaluatedCondition ? nodeData.skipInfo.skipCondition : undefined,
    when: nodeData?.nodeRunInfo,
    status: nodeData?.status as ExecutionStatus,
    type: nodeData?.stepType,
    data: { ...nodeData, conditionalExecutionEnabled: getConditionalExecutionFlag(nodeData.nodeRunInfo) },
    showInLabel
  }
  const nodeStrategyType =
    nodeData.stepType === StepNodeType.STRATEGY
      ? ((nodeData?.stepParameters?.strategyType || 'MATRIX') as string)
      : (nodeData?.stepType as string)
  const finalItem = {
    name: getExecutionNodeName(nodeData),
    identifier: nodeData?.identifier as string,
    id: nodeData?.uuid as string,
    nodeType: nodeStrategyType,
    type: nodeStrategyType,
    icon: iconData.icon as IconName,
    status: nodeData?.status as ExecutionStatus,
    data: {
      ...iconData,
      graphType: PipelineGraphType.STEP_GRAPH,
      ...(nodeData?.stepType === StepNodeType.STEP_GROUP || nodeData?.stepType === StepNodeType.GROUP
        ? {
            stepGroup: {
              ...item,
              steps: processStepGroupSteps({ nodeAdjacencyListMap, id, nodeMap, rootNodes })
            }
          }
        : nodeData?.stepType === StepNodeType.STRATEGY
        ? {
            isNestedGroup: true, // strategy in step_group
            maxParallelism: nodeData?.stepParameters?.maxConcurrency,
            stepGroup: {
              ...item,
              type: nodeStrategyType,
              nodeType: nodeStrategyType,
              maxParallelism: nodeData?.stepParameters?.maxConcurrency,
              icon: StepTypeIconsMap.STEP_GROUP,
              steps: processStepGroupSteps({ nodeAdjacencyListMap, id, nodeMap, rootNodes }),
              status: nodeData?.status as ExecutionStatus
            }
          }
        : { step: item }),
      nodeType: nodeStrategyType,
      maxParallelism: nodeData?.stepParameters?.maxConcurrency,
      conditionalExecutionEnabled: getConditionalExecutionFlag(nodeData.nodeRunInfo)
    }
  }
  items.push(finalItem)
}

export const processNodeDataV1 = (
  children: string[],
  nodeMap: ExecutionGraph['nodeMap'],
  nodeAdjacencyListMap: ExecutionGraph['nodeAdjacencyListMap'],
  rootNodes: Array<PipelineGraphState>,
  isNestedGroup = false
): Array<PipelineGraphState> => {
  const items: Array<PipelineGraphState> = []
  children?.forEach(item => {
    const nodeData = nodeMap?.[item]
    const isRollback = nodeData?.name?.endsWith(StepGroupRollbackIdentifier) ?? false
    if (nodeData?.stepType === StepNodeType.FORK) {
      processParallelNodeData({ items, id: item, nodeAdjacencyListMap, nodeMap, rootNodes, isNestedGroup })
    } else if (
      nodeData?.stepType === StepNodeType.STEP_GROUP ||
      nodeData?.stepType === StepNodeType.GROUP ||
      nodeData?.stepType === StepNodeType.NG_SECTION ||
      nodeData?.stepType === StepNodeType.STRATEGY ||
      (nodeData && isRollback)
    ) {
      processGroupItem({
        items,
        id: item,
        isRollbackNext: isRollback,
        nodeMap,
        nodeAdjacencyListMap,
        rootNodes,
        isNestedGroup: true
      })
    } else {
      if (nodeData?.stepType === LITE_ENGINE_TASK) {
        const parentNodeId =
          Object.entries(nodeAdjacencyListMap || {}).find(([_, val]) => {
            return (val?.children?.indexOf(nodeData.uuid!) ?? -1) >= 0
          })?.[0] || ''
        processLiteEngineTask(nodeData, rootNodes as any, nodeMap?.[parentNodeId])
      } else {
        processSingleItem({ id: item, items, nodeMap, nodeAdjacencyListMap, rootNodes })
      }
    }
    const nextIds = nodeAdjacencyListMap?.[item].nextIds || /* istanbul ignore next */ []
    const processedNodes = processNextNodes({ nodeMap, nodeAdjacencyListMap, nextIds, rootNodes })
    items.push(...processedNodes)
  })
  return items
}

interface ProcessGroupItemArgs {
  nodeMap: ExecutionGraph['nodeMap']
  nodeAdjacencyListMap: ExecutionGraph['nodeAdjacencyListMap']
  rootNodes: Array<PipelineGraphState>
  items: Array<PipelineGraphState>
  id: string
  isRollbackNext?: boolean
  isNestedGroup?: boolean
}
export const processGroupItem = ({
  items,
  id,
  nodeMap,
  nodeAdjacencyListMap,
  rootNodes,
  isNestedGroup = false
}: // isRollbackNext
ProcessGroupItemArgs): void => {
  const nodeData = nodeMap?.[id]
  if (!nodeData) {
    return
  }
  const iconData = getIconDataBasedOnType(nodeData)

  const steps: Array<StepPipelineGraphState | ParallelStepPipelineGraphState> = []

  nodeAdjacencyListMap?.[id].children?.forEach(childId => {
    const childStep = nodeMap?.[childId]

    /** If we have parallel steps then create parallel object so that it can be processed by StepGroupGraphNode to create a Graph inside step group **/
    if (childStep?.name === 'parallel') {
      if (nodeAdjacencyListMap?.[childStep?.uuid as string]?.children?.length) {
        const stepGroupChildrenNodes = nodeAdjacencyListMap?.[childStep?.uuid as string]?.children

        steps.push({
          parallel: stepGroupChildrenNodes?.map(childItemId => {
            const stepNodeData = nodeMap?.[childItemId]
            const nodeStrategyType =
              stepNodeData?.stepType === StepNodeType.STRATEGY
                ? ((stepNodeData?.stepParameters?.strategyType || 'MATRIX') as string)
                : (stepNodeData?.stepType as string)

            const stepData =
              isNodeTypeMatrixOrFor(nodeStrategyType) ||
              nodeStrategyType === StepNodeType.STEP_GROUP ||
              nodeStrategyType === StepNodeType.GROUP
                ? processStepGroupSteps({
                    nodeAdjacencyListMap,
                    id: stepNodeData?.uuid as string,
                    nodeMap,
                    rootNodes,
                    isNestedGroup
                  })
                : []

            return {
              step: {
                //strategy
                ...stepNodeData,
                ...getNodeConditions(stepNodeData as ExecutionNode),
                name: getExecutionNodeName(stepNodeData),
                type: nodeStrategyType,
                nodeType: nodeStrategyType,
                graphType: PipelineGraphType.STEP_GRAPH,
                isNestedGroup,
                data: {
                  ...stepNodeData,
                  graphType: PipelineGraphType.STEP_GRAPH,
                  conditionalExecutionEnabled: getConditionalExecutionFlag(stepNodeData?.nodeRunInfo),
                  ...((isNodeTypeMatrixOrFor(nodeStrategyType) ||
                    nodeStrategyType === StepNodeType.STEP_GROUP ||
                    nodeStrategyType === StepNodeType.GROUP) && {
                    isNestedGroup: true, // strategy in step_group
                    type: nodeStrategyType,
                    nodeType: nodeStrategyType,
                    maxParallelism: stepNodeData?.stepParameters?.maxConcurrency,
                    stepGroup: {
                      ...stepNodeData,
                      graphType: PipelineGraphType.STEP_GRAPH,
                      type: nodeStrategyType,
                      nodeType: nodeStrategyType,
                      steps: stepData,
                      maxParallelism: stepNodeData?.stepParameters?.maxConcurrency
                    }
                  })
                }
              }
            }
          })
        } as ParallelStepPipelineGraphState)
      }
    } else {
      const childStepIconData = getIconDataBasedOnType(childStep)

      const childSecondaryIconProps = getStatusProps(
        childStep?.status as ExecutionStatus,
        ExecutionPipelineNodeType.NORMAL
      )
      if (childStep?.stepType === StepNodeType.STEP_GROUP || childStep?.stepType === StepNodeType.GROUP) {
        steps.push({
          step: {
            ...childStepIconData,
            name: getExecutionNodeName(childStep),
            identifier: childStep?.identifier as string,
            uuid: childStep?.uuid as string,
            skipCondition: childStep?.skipInfo?.evaluatedCondition ? childStep.skipInfo.skipCondition : undefined,
            when: childStep?.nodeRunInfo,
            status: childStep?.status as ExecutionStatus,
            type: childStep?.stepType as string,
            data: {
              id: childStep?.uuid as string,
              isNestedGroup: true,
              conditionalExecutionEnabled: getConditionalExecutionFlag(childStep?.nodeRunInfo),
              stepGroup: {
                ...childStep,
                ...childSecondaryIconProps,
                graphType: PipelineGraphType.STEP_GRAPH,
                steps: processStepGroupSteps({
                  nodeAdjacencyListMap,
                  id: childStep?.uuid as string,
                  nodeMap,
                  rootNodes
                })
              }
            }
          }
        })
      } else {
        const nodeStrategyType =
          childStep?.stepType === StepNodeType.STRATEGY
            ? ((childStep?.stepParameters?.strategyType || 'MATRIX') as string)
            : (childStep?.stepType as string)

        const stepData = isNodeTypeMatrixOrFor(nodeStrategyType)
          ? processStepGroupSteps({
              nodeAdjacencyListMap,
              id: childStep?.uuid as string,
              nodeMap,
              rootNodes
            })
          : []
        const matrixNodeName = childStep?.strategyMetadata?.matrixmetadata?.matrixvalues

        steps.push({
          step: {
            ...childStepIconData,
            name: getExecutionNodeName(childStep),
            identifier: childStep?.identifier as string,
            uuid: childStep?.uuid as string,
            skipCondition: childStep?.skipInfo?.evaluatedCondition ? childStep.skipInfo.skipCondition : undefined,
            when: childStep?.nodeRunInfo,
            status: childStep?.status as ExecutionStatus,
            type: nodeStrategyType,
            data: {
              ...childStep,
              ...childSecondaryIconProps,
              matrixNodeName,
              graphType: PipelineGraphType.STEP_GRAPH,
              conditionalExecutionEnabled: getConditionalExecutionFlag(childStep?.nodeRunInfo),
              ...(isNodeTypeMatrixOrFor(nodeStrategyType) && {
                isNestedGroup: true, // strategy in step_group
                type: nodeStrategyType,
                nodeType: nodeStrategyType,
                maxParallelism: childStep?.stepParameters?.maxConcurrency,
                stepGroup: {
                  ...childStep,
                  ...childSecondaryIconProps,
                  graphType: PipelineGraphType.STEP_GRAPH,
                  type: nodeStrategyType,
                  nodeType: nodeStrategyType,
                  steps: stepData,
                  maxParallelism: childStep?.stepParameters?.maxConcurrency
                }
              })
            }
          }
        })
      }
    }

    let processedNodes: PipelineGraphState[] | StepPipelineGraphState[] = processNextNodes({
      nodeAdjacencyListMap,
      nodeMap,
      rootNodes,
      nextIds: nodeAdjacencyListMap?.[childStep?.uuid as string]?.nextIds || [],
      isNestedGroup: true
    })
    processedNodes = processedNodes.map(stepData => ({
      step: { ...stepData, graphType: PipelineGraphType.STEP_GRAPH }
    })) as StepPipelineGraphState[]
    steps.push(...processedNodes)
  })

  const item = {
    name: getExecutionNodeName(nodeData),
    identifier: nodeData?.identifier,
    skipCondition: nodeData?.skipInfo?.evaluatedCondition ? nodeData.skipInfo.skipCondition : undefined,
    when: nodeData?.nodeRunInfo,
    status: nodeData?.status as ExecutionStatus,
    type: nodeData?.stepType,
    id: nodeData.uuid as string,
    isNestedGroup,
    data: { ...nodeData, id: nodeData.uuid as string }
  }

  const isRollbackNext = nodeData?.name?.endsWith(StepGroupRollbackIdentifier) ?? false
  const nodeStrategyType =
    nodeData.stepType === StepNodeType.STRATEGY
      ? ((nodeData?.stepParameters?.strategyType || 'MATRIX') as string)
      : 'STEP_GROUP'
  const finalDataItem = {
    id: nodeData.uuid as string,
    identifier: nodeData?.identifier as string,
    name: getExecutionNodeName(nodeData),
    type: nodeStrategyType,
    nodeType: nodeStrategyType,
    icon: StepTypeIconsMap.STEP_GROUP as IconName,
    status: nodeData?.status as ExecutionStatus,
    ...getNodeConditions(nodeData),
    data: {
      ...(nodeData?.stepType === StepNodeType.STEP_GROUP ||
      nodeData?.stepType === StepNodeType.GROUP ||
      nodeData.stepType === StepNodeType.ROLLBACK_OPTIONAL_CHILD_CHAIN
        ? {
            graphType: PipelineGraphType.STEP_GRAPH,
            isNestedGroup,
            ...iconData,
            stepGroup: {
              ...item,
              type: 'STEP_GROUP',
              nodeType: 'STEP_GROUP',
              icon: StepTypeIconsMap.STEP_GROUP,
              steps,
              status: nodeData?.status as ExecutionStatus,
              containerCss: {
                ...(isRollbackNext ? RollbackContainerCss : {})
              }
            }
          }
        : nodeData?.stepType === StepNodeType.STRATEGY
        ? {
            graphType: PipelineGraphType.STEP_GRAPH,
            isNestedGroup,
            ...iconData,
            maxParallelism: nodeData?.stepParameters?.maxConcurrency,
            stepGroup: {
              ...item,
              isNestedGroup,
              type: nodeStrategyType,
              nodeType: nodeStrategyType,
              maxParallelism: nodeData?.stepParameters?.maxConcurrency,
              icon: StepTypeIconsMap.STEP_GROUP,
              steps,
              status: nodeData?.status as ExecutionStatus,
              containerCss: {
                ...(isRollbackNext ? RollbackContainerCss : {})
              }
            }
          }
        : item),
      nodeType: nodeStrategyType,
      maxParallelism: nodeData?.stepParameters?.maxConcurrency,
      conditionalExecutionEnabled: getConditionalExecutionFlag(nodeData?.nodeRunInfo)
    }
  }
  items.push(finalDataItem)
}

interface ProcessNextNodesParams {
  nextIds: string[]
  nodeMap: ExecutionGraph['nodeMap']
  nodeAdjacencyListMap: ExecutionGraph['nodeAdjacencyListMap']
  rootNodes: Array<PipelineGraphState>
  isNestedGroup?: boolean
}
export const processNextNodes = ({
  nodeMap,
  nodeAdjacencyListMap,
  nextIds,
  rootNodes,
  isNestedGroup = false
}: ProcessNextNodesParams): PipelineGraphState[] => {
  const result: PipelineGraphState[] = []
  nextIds.forEach(id => {
    const nodeDataNext = nodeMap?.[id]
    const isRollbackNext = nodeDataNext?.name?.endsWith(StepGroupRollbackIdentifier) ?? false
    if (nodeDataNext?.stepType === StepNodeType.FORK) {
      processParallelNodeData({ items: result, id, nodeAdjacencyListMap, nodeMap, rootNodes, isNestedGroup })
    } else if (
      nodeDataNext?.stepType === StepNodeType.STEP_GROUP ||
      nodeDataNext?.stepType === StepNodeType.GROUP ||
      (isRollbackNext && nodeDataNext)
    ) {
      processGroupItem({ items: result, id, isRollbackNext, nodeMap, nodeAdjacencyListMap, rootNodes, isNestedGroup })
    } else {
      processSingleItem({ id, items: result, nodeMap, nodeAdjacencyListMap, rootNodes })
    }
    const nextLevels = nodeAdjacencyListMap?.[id].nextIds
    if (nextLevels) {
      result.push(...processNodeDataV1(nextLevels, nodeMap, nodeAdjacencyListMap, rootNodes, isNestedGroup))
    }
  })
  return result
}
export const processExecutionDataV1 = (graph?: ExecutionGraph): any => {
  const items: Array<any> = []
  /* istanbul ignore else */
  if (graph?.nodeAdjacencyListMap && graph?.rootNodeId) {
    const nodeAdjacencyListMap = graph.nodeAdjacencyListMap
    const rootNodeId = graph.rootNodeId
    const rootNode = graph?.nodeMap?.[rootNodeId]
    // Ignore the graph when its fqn is pipeline, as this doesn't render pipeline graph
    if (rootNode?.baseFqn === 'pipeline') {
      return items
    }

    let nodeId = nodeAdjacencyListMap[rootNodeId].children?.[0]

    // handling for stage level execution inputs
    if (rootNode?.executionInputConfigured && NonSelectableStepNodes.includes(rootNode.stepType as StepNodeType)) {
      const runtimeNodeId = rootNode?.strategyMetadata ? `${rootNodeId}${RUNTIME_NODE_SUFFIX}` : rootNodeId
      items.push({
        name: 'Runtime Inputs',
        identifier: runtimeNodeId,
        id: runtimeNodeId,
        icon: StepTypeIconsMap.RUNTIME_INPUT,
        type: StepType.StageRuntimeInput,
        nodeType: StepNodeType.RUNTIME_INPUT,
        status: rootNode?.status as ExecutionStatus,
        data: {
          ...rootNode
        }
      })
    }

    while (nodeId && nodeAdjacencyListMap[nodeId]) {
      const nodeData = graph?.nodeMap?.[nodeId]

      if (nodeData) {
        /* istanbul ignore else */
        const isRollback = nodeData.name?.endsWith(StepGroupRollbackIdentifier) ?? false
        if (nodeData.stepType && (TopLevelStepNodes.indexOf(nodeData.stepType as StepNodeType) > -1 || isRollback)) {
          // NOTE: exception if we have only lite task engine in Execution group
          if (hasOnlyLiteEngineTask(nodeAdjacencyListMap[nodeId].children, graph)) {
            const liteTaskEngineId = nodeAdjacencyListMap?.[nodeId]?.children?.[0] || ''
            processLiteEngineTask(graph?.nodeMap?.[liteTaskEngineId], items, nodeData)
          } else if (!isEmpty(nodeAdjacencyListMap[nodeId].children)) {
            if (nodeData.identifier === 'execution') {
              /* All execution steps will be processed here */
              const exec = processNodeDataV1(
                nodeAdjacencyListMap[nodeId].children || /* istanbul ignore next */ [],
                graph?.nodeMap,
                graph?.nodeAdjacencyListMap,
                items
              )
              items.push(...exec)
            } else {
              const steps = processStepGroupSteps({
                nodeAdjacencyListMap,
                id: nodeId,
                nodeMap: graph?.nodeMap,
                rootNodes: []
              })
              items.push({
                name: getExecutionNodeName(nodeData),
                identifier: nodeId,
                id: nodeData.uuid as string,
                data: {
                  graphType: PipelineGraphType.STEP_GRAPH,
                  type: 'STEP_GROUP',
                  nodeType: 'STEP_GROUP',
                  icon: StepTypeIconsMap.STEP_GROUP,
                  stepGroup: {
                    ...nodeData,
                    type: 'STEP_GROUP',
                    nodeType: 'STEP_GROUP',
                    icon: StepTypeIconsMap.STEP_GROUP,
                    steps,
                    status: nodeData?.status as ExecutionStatus
                  }
                },
                skipCondition: nodeData.skipInfo?.evaluatedCondition ? nodeData.skipInfo.skipCondition : undefined,
                when: nodeData.nodeRunInfo,
                type: 'STEP_GROUP',
                nodeType: 'STEP_GROUP',
                containerCss: {
                  ...(RollbackIdentifier === nodeData.identifier || isRollback ? RollbackContainerCss : {})
                },
                status: nodeData.status as ExecutionStatus,
                isOpen: true,
                ...getIconDataBasedOnType(nodeData),
                steps
              })
            }
          }
        } else if (nodeData.stepType === StepNodeType.FORK) {
          processParallelNodeData({
            items,
            id: nodeData.uuid as string,
            nodeAdjacencyListMap,
            nodeMap: graph.nodeMap,
            rootNodes: items
          })
        } else if (nodeData.identifier === LITE_ENGINE_TASK) {
          // handle lite engine task seperately for V1 yaml and process next nodes accordingly since NG_EXECUTION node is not available for V! yaml execution
          const parentNodeId =
            Object.keys(nodeAdjacencyListMap || {}).find(key => {
              const val = nodeAdjacencyListMap[key]
              return val?.children?.includes(nodeData.uuid!)
            }) || ''
          processLiteEngineTask(nodeData, items as any, graph?.nodeMap?.[parentNodeId])
          const nextIds = nodeAdjacencyListMap?.[nodeId].nextIds || /* istanbul ignore next */ []
          const nodeMap = graph?.nodeMap
          const processedNodes = processNextNodes({ nodeMap, nodeAdjacencyListMap, nextIds, rootNodes: items })
          items.push(...processedNodes)
          break
        } else {
          const iconData = getIconDataBasedOnType(nodeData)
          if (nodeData.stepType === StepNodeType.STEP_GROUP || nodeData?.stepType === StepNodeType.STRATEGY) {
            processGroupItem({
              items,
              id: nodeId,
              isRollbackNext: isRollback,
              nodeMap: graph?.nodeMap,
              nodeAdjacencyListMap,
              rootNodes: items,
              isNestedGroup: false
            })
          } else {
            items.push({
              id: nodeData.uuid as string,
              name: getExecutionNodeName(nodeData),
              identifier: nodeData.identifier as string,
              icon: iconData.icon as IconName,
              type: nodeData.stepType,
              nodeType: nodeData.stepType,
              status: nodeData?.status as ExecutionStatus,
              data: {
                ...iconData,
                name: getExecutionNodeName(nodeData),
                skipCondition: nodeData.skipInfo?.evaluatedCondition ? nodeData.skipInfo.skipCondition : undefined,
                when: nodeData.nodeRunInfo,
                showInLabel:
                  nodeData.stepType === StepNodeType.SERVICE || nodeData.stepType === StepNodeType.INFRASTRUCTURE,
                identifier: nodeId,
                status: nodeData.status as ExecutionStatus,
                type: nodeData?.stepType,
                data: nodeData
              }
            })
          }
        }
      }
      nodeId = nodeAdjacencyListMap[nodeId].nextIds?.[0]
    }
  }

  return items
}

interface GetExecutionStageDiagramListenersParams {
  onMouseEnter: ({ data, event }: { data: any; event: any }) => void
  allNodeMap?: any
  allChildNodeMap?: any
  onMouseLeave: () => void
  onStepSelect: (id: string, parentStageId?: string, stageExecId?: string) => void
  onCollapsedNodeSelect?: (collapsedNodeId?: string) => void
}
export const getExecutionStageDiagramListeners = ({
  allNodeMap,
  allChildNodeMap,
  onMouseEnter,
  onMouseLeave,
  onStepSelect,
  onCollapsedNodeSelect
}: GetExecutionStageDiagramListenersParams): { [key: string]: (event: any) => void } => {
  const nodeListeners: { [key: string]: (event?: any) => void } = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [Event.ClickNode]: (event: any) => {
      const selectedNodeId =
        event?.data?.nodeType === StepNodeType.RUNTIME_INPUT ? event.data.identifier : event.data?.id
      event?.data?.data?.stageNodeId
        ? onStepSelect(event?.data?.data?.stageNodeId, event?.data?.parentStageId, event?.data?.id)
        : onStepSelect(selectedNodeId, event?.data?.parentStageId)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [Event.MouseEnterNode]: (event: any) => {
      const nodeID = defaultTo(event?.data?.nodeExecutionId, event?.data?.id)
      const stageData = allNodeMap[nodeID] ?? (allChildNodeMap && nodeID ? allChildNodeMap[nodeID.split('|')[0]] : null)
      const target = document.querySelector(`[data-nodeid="${event?.data?.id}"]`)
      if (stageData) {
        onMouseEnter({
          data: { ...stageData, name: getExecutionNodeName(stageData), ...getNodeConditions(stageData) },
          event: { ...event, target }
        })
      }
    },
    [Event.MouseLeaveNode]: () => {
      onMouseLeave()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [Event.CollapsedNodeClick]: (event: any) => {
      onCollapsedNodeSelect?.(event?.data?.id)
    }
  }
  return nodeListeners
}

const getNodeConditions = (node: ExecutionNode): { skipCondition: any | undefined; when: any | undefined } => {
  const skipInfo = get(node, 'skipInfo')
  const when = get(node, 'nodeRunInfo')
  return {
    skipCondition: skipInfo?.evaluatedCondition ? skipInfo.skipCondition : undefined,
    when
  }
}

export const getExecutionNodeName = (node?: ExecutionNode): string => {
  if (!node) {
    return ''
  }

  const hostName = node.strategyMetadata?.formetadata?.value
  const isCommandStepType = node.stepType === StepType.Command

  if (isCommandStepType && hostName) {
    return hostName
  }

  return node.name ?? ''
}
