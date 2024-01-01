/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type * as React from 'react'
import type { IconName } from '@harness/uicore'
import { defaultTo, get, has, isEmpty, identity } from 'lodash-es'
import type { Module } from 'framework/types/ModuleName'
import {
  ExecutionStatus,
  ExecutionStatusEnum,
  isExecutionSuccess,
  isExecutionCompletedWithBadState,
  isExecutionRunning,
  isExecutionWaiting,
  isExecutionSkipped,
  isExecutionNotStarted,
  isExecutionWaitingForInput,
  isExecutionFailed,
  isExecutionAborted,
  isExecutionExpired
} from '@pipeline/utils/statusHelpers'
import type {
  GraphLayoutNode,
  PipelineExecutionSummary,
  ExecutionGraph,
  ExecutionNode,
  ExecutionNodeAdjacencyList,
  ResponsePipelineExecutionDetail,
  InterruptEffectDTO,
  ResponseMessage
} from 'services/pipeline-ng'
import type { CDStageModuleInfo } from 'services/cd-ng'
import type { CIPipelineStageModuleInfo } from 'services/ci'
import { Infrastructure, Platform } from 'services/logs'
import { extractInfo } from '@common/components/ErrorHandler/ErrorHandler'
import {
  ExecutionPipelineNode,
  ExecutionPipelineNodeType,
  ExecutionPipelineItem,
  ExecutionPipelineGroupInfo
} from '@pipeline/components/ExecutionStageDiagram/ExecutionPipelineModel'
import factory from '@pipeline/components/PipelineSteps/PipelineStepFactory'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { stagesCollection } from '@pipeline/components/PipelineStudio/Stages/StagesCollection'
import { PipelineGraphState, PipelineGraphType } from '@pipeline/components/PipelineDiagram/types'
import { getConditionalExecutionFlag } from '@pipeline/components/ExecutionStageDiagram/ExecutionStageDiagramUtils'
import type { ExecutionContextParams } from '@pipeline/context/ExecutionContext'
import type { ExecutionPageQueryParams } from '@pipeline/utils/types'
import { isApprovalStep } from './stepUtils'
import { PriorityByStageStatus, StageType } from './stageHelpers'
import {
  getActiveStageForPipeline,
  StageNodeType
} from '../pages/execution/ExecutionLandingPage/useExecutionData/getActiveStageForPipeline'

export const LITE_ENGINE_TASK = 'liteEngineTask'
export const STATIC_SERVICE_GROUP_NAME = 'static_service_group'
export const RollbackIdentifier = 'Rollback'
export const StepGroupRollbackIdentifier = '(Rollback)'
export const BARRIER_WITH_OPEN_LINKS = 'barrier-open-with-links'
export const RollbackContainerCss: React.CSSProperties = {
  borderColor: 'var(--red-450)'
}

// TODO: remove use DTO
export interface ServiceDependency {
  identifier: string
  name: string | null
  image: string
  status: string
  startTime: string
  endTime: string | null
  errorMessage: string | null
  errorReason: string | null
}

export enum StepNodeType {
  SERVICE = 'SERVICE',
  SERVICE_CONFIG = 'SERVICE_CONFIG',
  SERVICE_SECTION = 'SERVICE_SECTION',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  GENERIC_SECTION = 'GENERIC_SECTION',
  STEP_GROUP = 'STEP_GROUP',
  GROUP = 'GROUP',
  NG_SECTION = 'NG_SECTION',
  ROLLBACK_OPTIONAL_CHILD_CHAIN = 'ROLLBACK_OPTIONAL_CHILD_CHAIN',
  FORK = 'NG_FORK',
  INFRASTRUCTURE_SECTION = 'INFRASTRUCTURE_SECTION',
  DEPLOYMENT_STAGE_STEP = 'DEPLOYMENT_STAGE_STEP',
  APPROVAL_STAGE = 'APPROVAL_STAGE',
  CUSTOM_STAGE = 'CUSTOM_STAGE',
  NG_SECTION_WITH_ROLLBACK_INFO = 'NG_SECTION_WITH_ROLLBACK_INFO',
  NG_EXECUTION = 'NG_EXECUTION',
  StepGroupNode = 'StepGroupNode',
  'GITOPS_CLUSTERS' = 'GITOPS CLUSTERS',
  STRATEGY = 'STRATEGY',
  RUNTIME_INPUT = 'RUNTIME_INPUT', // virtual node
  INFRASTRUCTURE_V2 = 'INFRASTRUCTURE_V2',
  INFRASTRUCTURE_TASKSTEP_V2 = 'INFRASTRUCTURE_TASKSTEP_V2',
  SERVICE_V3 = 'SERVICE_V3',
  PIPELINE_STAGE = 'PIPELINE_STAGE',
  INTEGRATION_STAGE_STEP_PMS = 'IntegrationStageStepPMS',
  InitializeContainer = 'InitializeContainer',
  FLAG_STAGE = 'FLAG_STAGE'
}

export const NonSelectableStepNodes: StepNodeType[] = [
  StepNodeType.NG_SECTION,
  StepNodeType.FORK,
  StepNodeType.DEPLOYMENT_STAGE_STEP,
  StepNodeType.APPROVAL_STAGE,
  StepNodeType.CUSTOM_STAGE,
  StepNodeType.NG_EXECUTION,
  StepNodeType.PIPELINE_STAGE,
  StepNodeType.STRATEGY,
  StepNodeType.STEP_GROUP,
  StepNodeType.GROUP,
  StepNodeType.NG_SECTION_WITH_ROLLBACK_INFO,
  StepNodeType.ROLLBACK_OPTIONAL_CHILD_CHAIN,
  StepNodeType.INTEGRATION_STAGE_STEP_PMS,
  StepNodeType.FLAG_STAGE
]

export const TopLevelStepNodes: StepNodeType[] = [
  StepNodeType.NG_SECTION,
  StepNodeType.ROLLBACK_OPTIONAL_CHILD_CHAIN,
  StepNodeType.INFRASTRUCTURE_SECTION,
  StepNodeType.NG_SECTION_WITH_ROLLBACK_INFO,
  StepNodeType.NG_EXECUTION
]
export const StepTypeIconsMap: { [key in StepNodeType]: IconName } = {
  SERVICE: 'services',
  SERVICE_CONFIG: 'services',
  SERVICE_SECTION: 'services',
  SERVICE_V3: 'services',
  GENERIC_SECTION: 'step-group',
  NG_SECTION_WITH_ROLLBACK_INFO: 'step-group',
  NG_SECTION: 'step-group',
  NG_EXECUTION: 'step-group',
  ROLLBACK_OPTIONAL_CHILD_CHAIN: 'step-group',
  INFRASTRUCTURE_SECTION: 'step-group',
  STEP_GROUP: 'step-group',
  GROUP: 'step-group',
  INFRASTRUCTURE: 'infrastructure',
  INFRASTRUCTURE_V2: 'infrastructure',
  INFRASTRUCTURE_TASKSTEP_V2: 'infrastructure',
  NG_FORK: 'fork',
  DEPLOYMENT_STAGE_STEP: 'circle',
  APPROVAL_STAGE: 'approval-stage-icon',
  CUSTOM_STAGE: 'custom-stage-icon',
  StepGroupNode: 'step-group',
  'GITOPS CLUSTERS': 'gitops-clusters',
  STRATEGY: 'step-group',
  RUNTIME_INPUT: 'runtime-input',
  PIPELINE_STAGE: 'chained-pipeline',
  IntegrationStageStepPMS: 'step-group',
  InitializeContainer: 'initialize-ci-step',
  FLAG_STAGE: 'feature-flag-stage'
}

export const StepV2TypeIconsMap: {
  [key in keyof typeof StepType]?: IconName
} = {
  TERRAFORM_ROLLBACK_V2: 'terraform-rollback',
  TERRAFORM_DESTROY_V2: 'terraform-destroy',
  TERRAFORM_PLAN_V2: 'terraform-plan',
  TERRAFORM_APPLY_V2: 'terraform-apply',
  JenkinsBuildV2: 'service-jenkins',
  InitContainer: 'initialize-ci-step',
  RunContainer: 'run-ci-step',
  CUSTOM_STAGE_ENVIRONMENT: 'main-environments',
  K8S_BLUE_GREEN_V2: 'bluegreen',
  K8S_BG_SWAP_SERVICES_V2: 'command-swap',
  K8S_CANARY_V2: 'canary',
  K8S_CANARY_DELETE_V2: 'canary-delete',
  K8S_ROLLING_V2: 'rolling',
  K8S_ROLLBACK_ROLLING_V2: 'undo',
  K8S_APPLY_V2: 'apply',
  K8S_SCALE_V2: 'swap-vertical',
  K8S_DELETE_V2: 'delete',
  K8S_BLUE_GREEN_STAGE_SCALE_DOWN_V2: 'bg-scale-down-step',
  K8S_DRY_RUN_V2: 'dry-run',
  HELM_DEPLOY_V2: 'service-helm',
  HELM_ROLLBACK_V2: 'helm-rollback',
  // yaml-simplification v1 step types
  http: 'http-step',
  'shell-script': 'command-shell-script'
}

export const ExecutionStatusIconMap: Record<ExecutionStatus, IconName> = {
  Success: 'tick-circle',
  Running: 'main-more',
  AsyncWaiting: 'main-more',
  TaskWaiting: 'main-more',
  TimedWaiting: 'main-more',
  Failed: 'circle-cross',
  Errored: 'circle-cross',
  IgnoreFailed: 'ignoreFailed',
  Expired: 'expired',
  Aborted: 'banned',
  AbortedByFreeze: 'banned',
  Discontinuing: 'banned',
  Suspended: 'banned',
  Queued: 'queued',
  NotStarted: 'pending',
  Paused: 'pause',
  ResourceWaiting: 'waiting',
  Skipped: 'skipped',
  ApprovalRejected: 'circle-cross',
  InterventionWaiting: 'waiting',
  ApprovalWaiting: 'waiting',
  Pausing: 'pause',
  InputWaiting: 'waiting',
  WaitStepRunning: 'waiting',
  QueuedLicenseLimitReached: 'queued',
  QueuedExecutionConcurrencyReached: 'queued'
}

export type InterruptType = InterruptEffectDTO['interruptType']

export const Interrupt: Record<InterruptType, InterruptType> = {
  UNKNOWN: 'UNKNOWN',
  ABORT: 'ABORT',
  ABORT_ALL: 'ABORT_ALL',
  PAUSE: 'PAUSE',
  PAUSE_ALL: 'PAUSE_ALL',
  RESUME: 'RESUME',
  RESUME_ALL: 'RESUME_ALL',
  RETRY: 'RETRY',
  IGNORE: 'IGNORE',
  WAITING_FOR_MANUAL_INTERVENTION: 'WAITING_FOR_MANUAL_INTERVENTION',
  MARK_FAILED: 'MARK_FAILED',
  MARK_SUCCESS: 'MARK_SUCCESS',
  NEXT_STEP: 'NEXT_STEP',
  END_EXECUTION: 'END_EXECUTION',
  MARK_EXPIRED: 'MARK_EXPIRED',
  CUSTOM_FAILURE: 'CUSTOM_FAILURE',
  EXPIRE_ALL: 'EXPIRE_ALL',
  PROCEED_WITH_DEFAULT: 'PROCEED_WITH_DEFAULT',
  UNRECOGNIZED: 'UNRECOGNIZED',
  USER_MARKED_FAIL_ALL: 'USER_MARKED_FAIL_ALL'
}

/**
 * @deprecated use import { ExecutionPathProps } from '@common/interfaces/RouteInterfaces' instead
 */
export interface ExecutionPathParams {
  orgIdentifier: string
  projectIdentifier: string
  pipelineIdentifier: string
  executionIdentifier: string
  accountId: string
}

export interface ExecutionQueryParams {
  stage?: string
  step?: string
  view?: string
  filterAnomalous?: string
  type?: string
}

export interface LayoutNodeMapInterface {
  [key: string]: GraphLayoutNode
}
export function getPipelineStagesMap(
  layoutNodeMap: PipelineExecutionSummary['layoutNodeMap'],
  startingNodeId?: string,
  parentStageId?: string
): Map<string, GraphLayoutNode> {
  const map = new Map<string, GraphLayoutNode>()

  function recursiveSetInMap(node: GraphLayoutNode): void {
    if (node.nodeType === StageNodeType.Parallel || isNodeTypeMatrixOrFor(node.nodeType)) {
      node.edgeLayoutList?.currentNodeChildren?.forEach(item => {
        if (item && layoutNodeMap?.[item]) {
          // register nodes in case of strategy
          if (isNodeTypeMatrixOrFor(layoutNodeMap?.[item]?.nodeType)) {
            recursiveSetInMap(layoutNodeMap[item])
            return
          }
          const nodeId = isNodeTypeMatrixOrFor(node.nodeType)
            ? defaultTo(layoutNodeMap[item]?.nodeExecutionId, layoutNodeMap[item].nodeUuid)
            : layoutNodeMap[item].nodeUuid
          map.set(nodeId || '', layoutNodeMap[item])
          return
        }
      })
    } else {
      const nodeKey = parentStageId ? [node.nodeUuid, parentStageId].join('|') : node.nodeUuid
      map.set(nodeKey || '', node)
    }

    node.edgeLayoutList?.nextIds?.forEach(item => {
      if (item && layoutNodeMap?.[item]) {
        recursiveSetInMap(layoutNodeMap[item])
        return
      }
    })
  }

  if (startingNodeId && layoutNodeMap?.[startingNodeId]) {
    const node = layoutNodeMap[startingNodeId]
    recursiveSetInMap(node)
  }

  return map
}

export interface ProcessLayoutNodeMapResponse {
  stage?: GraphLayoutNode
  parallel?: GraphLayoutNode[]
}

export const processLayoutNodeMap = (executionSummary?: PipelineExecutionSummary): ProcessLayoutNodeMapResponse[] => {
  const response: ProcessLayoutNodeMapResponse[] = []
  if (!executionSummary) {
    return response
  }
  const startingNodeId = executionSummary.startingNodeId
  const layoutNodeMap = executionSummary.layoutNodeMap
  if (startingNodeId && layoutNodeMap?.[startingNodeId]) {
    let node: GraphLayoutNode | undefined = layoutNodeMap[startingNodeId]
    while (node) {
      const currentNodeChildren: string[] | undefined = node?.edgeLayoutList?.currentNodeChildren
      const nextIds: string[] | undefined = node?.edgeLayoutList?.nextIds
      if (node.nodeType === StageNodeType.Parallel && currentNodeChildren && currentNodeChildren.length > 1) {
        response.push({ parallel: currentNodeChildren.map(item => layoutNodeMap[item]) })
        node = layoutNodeMap[node.edgeLayoutList?.nextIds?.[0] || '']
      } else if (
        node.nodeType === StageNodeType.Parallel &&
        currentNodeChildren &&
        layoutNodeMap[currentNodeChildren[0]]
      ) {
        response.push({ stage: layoutNodeMap[currentNodeChildren[0]] })
        node = layoutNodeMap[node.edgeLayoutList?.nextIds?.[0] || '']
      } else {
        response.push({ stage: node })
        if (nextIds && nextIds.length === 1) {
          node = layoutNodeMap[nextIds[0]]
        } else {
          node = undefined
        }
      }
    }
  }
  return response
}

export interface StepStatus {
  node: string
  interrupted: boolean
  success: boolean
}

export function getActiveStep(
  graph: ExecutionGraph = {},
  pipelineExecutionSummary: PipelineExecutionSummary = {},
  nodeId?: string
): StepStatus | null {
  const { rootNodeId, nodeMap, nodeAdjacencyListMap } = graph
  const { status: pipelineStatus, layoutNodeMap } = pipelineExecutionSummary

  if (!nodeMap || !nodeAdjacencyListMap || !rootNodeId) {
    return null
  }

  const rootNode = nodeMap[rootNodeId]

  // handling for stage level execution inputs
  if (isEmpty(nodeAdjacencyListMap[rootNodeId]?.children) && isExecutionWaitingForInput(rootNode.status)) {
    return {
      node: rootNodeId,
      interrupted: true,
      success: false
    }
  }

  const currentNodeId = nodeId || rootNodeId

  if (!currentNodeId) return null

  const node = nodeMap[currentNodeId]
  const nodeAdjacencyList = nodeAdjacencyListMap[currentNodeId]

  if (!node || !nodeAdjacencyList) {
    return null
  }

  let selectedStep: StepStatus | null = null

  if (Array.isArray(nodeAdjacencyList.children) && nodeAdjacencyList.children.length > 0) {
    const n = nodeAdjacencyList.children.length

    for (let i = 0; i < n; i++) {
      const childNodeId = nodeAdjacencyList.children[i]
      selectedStep = getActiveStep(graph, pipelineExecutionSummary, childNodeId)

      if (selectedStep && selectedStep.interrupted) {
        return selectedStep
      }
    }
  }

  if (nodeAdjacencyList.nextIds && nodeAdjacencyList.nextIds[0]) {
    selectedStep = getActiveStep(graph, pipelineExecutionSummary, nodeAdjacencyList.nextIds[0])

    if (selectedStep && selectedStep.interrupted) return selectedStep
  }

  // pipeline is success and we are in root node
  if (isExecutionSuccess(pipelineStatus) && selectedStep?.success) {
    return selectedStep
  }

  if (
    !NonSelectableStepNodes.includes(node.stepType as StepNodeType) &&
    currentNodeId !== rootNodeId &&
    !has(layoutNodeMap, node.setupId || '')
  ) {
    return {
      node: currentNodeId,
      interrupted:
        isExecutionRunning(node.status) ||
        isExecutionWaiting(node.status) ||
        isExecutionCompletedWithBadState(node.status),
      success: isExecutionSuccess(node.status)
    }
  }

  return selectedStep
}

export const stageTypeY1ToIconMap: Record<string, IconName> = {
  custom: 'custom-stage-icon'
}

export function getIconFromStageModule(stageModule: 'cd' | 'ci' | string | undefined, stageType?: string): IconName {
  if (stageType) {
    const icon = stagesCollection.getStageAttributes(stageType, (key: string) => key)?.icon
    if (icon) {
      return icon
    }
    if (stageTypeY1ToIconMap[stageType]) {
      return stageTypeY1ToIconMap[stageType]
    }
  }
  switch (stageModule) {
    case 'cd':
      return 'pipeline-deploy'
    case 'ci':
      return 'pipeline-build'
    default:
      return 'pipeline-deploy'
  }
}

export function getIconStylesFromCollection(stageType?: string): React.CSSProperties {
  if (stageType) {
    const iconColor = stagesCollection.getStageAttributes(stageType, key => key)?.iconColor

    if (iconColor) {
      return { color: iconColor }
    }
  }

  return {}
}

const getParentNodeId = (adjacencyMap: ExecutionGraph['nodeAdjacencyListMap'], nodeData: ExecutionNode) => {
  return (
    Object.entries(adjacencyMap || {}).find(([_, val]) => {
      return (val?.children?.indexOf(nodeData.uuid!) ?? -1) >= 0
    })?.[0] || ''
  )
}

const addDependencyToArray = (service: ServiceDependency, arr: ExecutionPipelineNode<ExecutionNode>[]): void => {
  const stepItem: ExecutionPipelineItem<ExecutionNode> = {
    identifier: service.identifier as string,
    name: service.name as string,
    type: ExecutionPipelineNodeType.NORMAL,
    status: service.status as ExecutionStatus,
    icon: 'dependency-step',
    data: service as ExecutionNode,
    itemType: 'service-dependency'
  }

  // add step node
  const stepNode: ExecutionPipelineNode<ExecutionNode> = { item: stepItem }
  arr.push(stepNode)
}

const addDependencies = (
  dependencies: ServiceDependency[],
  stepsPipelineNodes: ExecutionPipelineNode<ExecutionNode>[]
): void => {
  if (dependencies && dependencies.length > 0) {
    const items: ExecutionPipelineNode<ExecutionNode>[] = []

    dependencies.forEach(_service => addDependencyToArray(_service, items))

    const dependenciesGroup: ExecutionPipelineGroupInfo<ExecutionNode> = {
      identifier: STATIC_SERVICE_GROUP_NAME,
      name: 'Dependencies', // TODO: use getString('execution.dependencyGroupName'),
      status: dependencies[0].status as ExecutionStatus, // use status of first service
      data: {},
      icon: 'step-group',
      verticalStepGroup: true,
      isOpen: true,
      items: [{ parallel: items }]
    }

    // dependency goes at the beginning
    stepsPipelineNodes.unshift({ group: dependenciesGroup })
  }
}

export const processLiteEngineTask = (
  nodeData: ExecutionNode | undefined,
  rootNodes: ExecutionPipelineNode<ExecutionNode>[],
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
  const stepItem: ExecutionPipelineItem<ExecutionNode> = {
    identifier: nodeData?.uuid as string,
    name: 'Initialize',
    type: getExecutionPipelineNodeType(nodeData?.stepType),
    status: nodeData?.status as ExecutionStatus,
    icon: 'initialize-ci-step',
    data: nodeData as ExecutionNode,
    itemType: 'service-dependency'
  }
  const stepNode: ExecutionPipelineNode<ExecutionNode> = { item: stepItem }
  rootNodes.unshift(stepNode)
}

export const processNodeData = (
  children: string[],
  nodeMap: ExecutionGraph['nodeMap'],
  nodeAdjacencyListMap: ExecutionGraph['nodeAdjacencyListMap'],
  rootNodes: Array<ExecutionPipelineNode<ExecutionNode>>
): Array<ExecutionPipelineNode<ExecutionNode>> => {
  const items: Array<ExecutionPipelineNode<ExecutionNode>> = []
  children?.forEach(item => {
    const nodeData = nodeMap?.[item] as ExecutionNode
    const isRollback = nodeData?.name?.endsWith(StepGroupRollbackIdentifier) ?? false
    const nodeStrategyType =
      nodeData?.stepType === StepNodeType.STRATEGY
        ? ((nodeData?.stepParameters?.strategyType || 'MATRIX') as string)
        : (nodeData?.stepType as string)
    if (nodeStrategyType === StepNodeType.FORK) {
      items.push({
        parallel: processNodeData(
          nodeAdjacencyListMap?.[item].children || /* istanbul ignore next */ [],
          nodeMap,
          nodeAdjacencyListMap,
          rootNodes
        )
      })
    } else if (
      nodeStrategyType === StepNodeType.STEP_GROUP ||
      nodeStrategyType === StepNodeType.GROUP ||
      nodeStrategyType === StepNodeType.NG_SECTION ||
      isNodeTypeMatrixOrFor(nodeStrategyType) ||
      (nodeData && isRollback)
    ) {
      items.push({
        group: {
          name: nodeData.name || /* istanbul ignore next */ '',
          identifier: item,
          data: nodeData,
          containerCss: {
            ...(isRollback ? RollbackContainerCss : {})
          },
          status: nodeData.status as ExecutionStatus,
          isOpen: true,
          skipCondition: nodeData.skipInfo?.evaluatedCondition ? nodeData.skipInfo.skipCondition : undefined,
          when: nodeData.nodeRunInfo,
          ...getIconDataBasedOnType(nodeData),
          items: processNodeData(
            nodeAdjacencyListMap?.[item].children || /* istanbul ignore next */ [],
            nodeMap,
            nodeAdjacencyListMap,
            rootNodes
          )
        }
      })
    } else {
      if (nodeStrategyType === LITE_ENGINE_TASK) {
        const parentNodeId = getParentNodeId(nodeAdjacencyListMap, nodeData)
        processLiteEngineTask(nodeData, rootNodes, nodeMap?.[parentNodeId])
      } else {
        items.push({
          item: {
            name: nodeData?.name || /* istanbul ignore next */ '',
            ...getIconDataBasedOnType(nodeData),
            identifier: item,
            skipCondition: nodeData?.skipInfo?.evaluatedCondition ? nodeData?.skipInfo.skipCondition : undefined,
            when: nodeData?.nodeRunInfo,
            status: nodeData?.status as ExecutionStatus,
            type: getExecutionPipelineNodeType(nodeStrategyType),
            data: nodeData
          }
        })
      }
    }
    const nextIds = nodeAdjacencyListMap?.[item].nextIds || /* istanbul ignore next */ []
    nextIds.forEach(id => {
      const nodeDataNext = nodeMap?.[id] as ExecutionNode
      const isRollbackNext = nodeDataNext?.name?.endsWith(StepGroupRollbackIdentifier) ?? false
      const nodeNextStrategyType =
        nodeDataNext?.stepType === StepNodeType.STRATEGY
          ? ((nodeDataNext?.stepParameters?.strategyType || 'MATRIX') as string)
          : (nodeDataNext?.stepType as string)
      if (nodeNextStrategyType === StepNodeType.FORK) {
        items.push({
          parallel: processNodeData(
            nodeAdjacencyListMap?.[id].children || /* istanbul ignore next */ [],
            nodeMap,
            nodeAdjacencyListMap,
            rootNodes
          )
        })
      } else if (
        nodeNextStrategyType === StepNodeType.STEP_GROUP ||
        nodeStrategyType === StepNodeType.GROUP ||
        isNodeTypeMatrixOrFor(nodeNextStrategyType) ||
        (isRollbackNext && nodeDataNext)
      ) {
        items.push({
          group: {
            name: nodeDataNext.name || /* istanbul ignore next */ '',
            identifier: id,
            data: nodeDataNext,
            containerCss: {
              ...(isRollbackNext ? RollbackContainerCss : {})
            },
            skipCondition: nodeDataNext.skipInfo?.evaluatedCondition ? nodeDataNext.skipInfo.skipCondition : undefined,
            when: nodeDataNext.nodeRunInfo,
            status: nodeDataNext.status as ExecutionStatus,
            isOpen: true,
            ...getIconDataBasedOnType(nodeDataNext),
            items: processNodeData(
              nodeAdjacencyListMap?.[id].children || /* istanbul ignore next */ [],
              nodeMap,
              nodeAdjacencyListMap,
              rootNodes
            )
          }
        })
      } else {
        items.push({
          item: {
            name: nodeDataNext?.name || /* istanbul ignore next */ '',
            ...getIconDataBasedOnType(nodeDataNext),
            identifier: id,
            skipCondition: nodeDataNext?.skipInfo?.evaluatedCondition ? nodeDataNext.skipInfo.skipCondition : undefined,
            when: nodeDataNext?.nodeRunInfo,
            status: nodeDataNext?.status as ExecutionStatus,
            type: getExecutionPipelineNodeType(nodeNextStrategyType),
            data: nodeDataNext
          }
        })
      }
      const nextLevels = nodeAdjacencyListMap?.[id].nextIds
      if (nextLevels) {
        items.push(...processNodeData(nextLevels, nodeMap, nodeAdjacencyListMap, rootNodes))
      }
    })
  })
  return items
}

export const hasOnlyLiteEngineTask = (children?: string[], graph?: ExecutionGraph): boolean => {
  return (
    !!children &&
    children.length === 1 &&
    graph?.nodeMap?.[children[0]]?.stepType === LITE_ENGINE_TASK &&
    graph?.nodeAdjacencyListMap?.[children[0]]?.nextIds?.length === 0
  )
}

const processGroupNodeData = (
  nodeMap: ExecutionGraph['nodeMap'],
  nodeAdjacencyListMap: ExecutionGraph['nodeAdjacencyListMap'],
  nodeId: string,
  items: ExecutionPipelineNode<ExecutionNode>[],
  isRollback?: boolean
): void => {
  const nodeData = nodeMap?.[nodeId]
  if (nodeData) {
    items.push({
      group: {
        name: nodeData.name || /* istanbul ignore next */ '',
        identifier: nodeId,
        data: nodeData,
        skipCondition: nodeData.skipInfo?.evaluatedCondition ? nodeData.skipInfo.skipCondition : undefined,
        when: nodeData.nodeRunInfo,
        containerCss: {
          ...(RollbackIdentifier === nodeData.identifier || isRollback ? RollbackContainerCss : {})
        },
        status: nodeData.status as ExecutionStatus,
        isOpen: true,
        ...getIconDataBasedOnType(nodeData),
        items: processNodeData(
          nodeAdjacencyListMap?.[nodeId].children || /* istanbul ignore next */ [],
          nodeMap,
          nodeAdjacencyListMap,
          items
        )
      }
    })
  }
}

export const processExecutionData = (graph?: ExecutionGraph): Array<ExecutionPipelineNode<ExecutionNode>> => {
  const items: Array<ExecutionPipelineNode<ExecutionNode>> = []

  /* istanbul ignore else */
  if (graph?.nodeAdjacencyListMap && graph?.rootNodeId) {
    const nodeAdjacencyListMap = graph.nodeAdjacencyListMap
    const rootNode = graph.rootNodeId
    // Ignore the graph when its fqn is pipeline, as this doesn't render pipeline graph
    if (graph?.nodeMap?.[rootNode].baseFqn === 'pipeline') {
      return items
    }
    let nodeId = nodeAdjacencyListMap[rootNode].children?.[0]
    while (nodeId && nodeAdjacencyListMap[nodeId]) {
      const nodeData = graph?.nodeMap?.[nodeId]
      /* istanbul ignore else */
      if (nodeData) {
        const isRollback = nodeData.name?.endsWith(StepGroupRollbackIdentifier) ?? false
        if (nodeData.stepType && (TopLevelStepNodes.indexOf(nodeData.stepType as StepNodeType) > -1 || isRollback)) {
          // NOTE: exception if we have only lite task engine in Execution group
          if (hasOnlyLiteEngineTask(nodeAdjacencyListMap[nodeId].children, graph)) {
            const liteTaskEngineId = nodeAdjacencyListMap?.[nodeId]?.children?.[0] || ''
            processLiteEngineTask(graph?.nodeMap?.[liteTaskEngineId], items, nodeData)
          } else if (!isEmpty(nodeAdjacencyListMap[nodeId].children)) {
            if (nodeData.identifier === 'execution') {
              items.push(
                ...processNodeData(
                  nodeAdjacencyListMap[nodeId].children || /* istanbul ignore next */ [],
                  graph?.nodeMap,
                  graph?.nodeAdjacencyListMap,
                  items
                )
              )
            } else {
              processGroupNodeData(graph?.nodeMap, nodeAdjacencyListMap, nodeId, items, isRollback)
            }
          }
        } else if (nodeData.stepType === StepNodeType.FORK) {
          items.push({
            parallel: processNodeData(
              nodeAdjacencyListMap[nodeId].children || /* istanbul ignore next */ [],
              graph?.nodeMap,
              graph?.nodeAdjacencyListMap,
              items
            )
          })
        } else if (nodeData.stepType === StepNodeType.STEP_GROUP) {
          processGroupNodeData(graph?.nodeMap, nodeAdjacencyListMap, nodeId, items, isRollback)
        } else {
          items.push({
            item: {
              name: nodeData.name || /* istanbul ignore next */ '',
              skipCondition: nodeData.skipInfo?.evaluatedCondition ? nodeData.skipInfo.skipCondition : undefined,
              when: nodeData.nodeRunInfo,
              ...getIconDataBasedOnType(nodeData),
              showInLabel:
                nodeData.stepType === StepNodeType.SERVICE || nodeData.stepType === StepNodeType.INFRASTRUCTURE,
              identifier: nodeId,
              status: nodeData.status as ExecutionStatus,
              type: getExecutionPipelineNodeType(nodeData?.stepType),
              data: nodeData
            }
          })
        }
      }
      nodeId = nodeAdjacencyListMap[nodeId].nextIds?.[0]
    }
  }
  return items
}

export function getStageType(node?: GraphLayoutNode): 'ci' | 'cd' | 'unknown' {
  if (node?.module?.toLowerCase?.() === 'ci' || !isEmpty(node?.moduleInfo?.ci)) {
    return 'ci'
  } else if (node?.module?.toLowerCase?.() === 'cd' || !isEmpty(node?.moduleInfo?.cd)) {
    return 'cd'
  }
  return 'unknown'
}

export function getExecutionPipelineNodeType(stepType?: string): ExecutionPipelineNodeType {
  if (stepType === StepType.Barrier || stepType === StepType.ResourceConstraint) {
    return ExecutionPipelineNodeType.ICON
  }
  if (isApprovalStep(stepType)) {
    return ExecutionPipelineNodeType.DIAMOND
  }

  return ExecutionPipelineNodeType.NORMAL
}

export const cloudFormationSteps: StepType[] = [
  StepType.CloudFormationCreateStack,
  StepType.CloudFormationDeleteStack,
  StepType.CloudFormationRollbackStack
]
export function getIconDataBasedOnType(nodeData?: ExecutionNode): {
  icon: IconName
  iconSize: number
  iconStyle?: { marginBottom: string }
} {
  if (nodeData) {
    if (nodeData.stepType === StepType.Barrier) {
      return nodeData.status === 'Success'
        ? { icon: 'barrier-close', iconSize: 57 }
        : { icon: 'barrier-open', iconSize: 70, iconStyle: { marginBottom: '38px' } }
    }
    if (nodeData.stepType === StepType.ResourceConstraint) {
      return { icon: 'traffic-lights', iconSize: 40 }
    }
    if (nodeData.stepType === StepType.Provenance) {
      return { icon: 'slsa-generation', iconSize: 40 }
    }
    // ticket for reference -> https://harness.atlassian.net/browse/CDS-59308
    if (nodeData?.stepType && nodeData.stepType in StepV2TypeIconsMap) {
      const icon = StepV2TypeIconsMap[nodeData.stepType as keyof typeof StepType] as IconName
      return { icon, iconSize: 40 }
    }
    const icon = StepTypeIconsMap[nodeData?.stepType as StepNodeType] || factory.getStepIcon(nodeData?.stepType || '')
    return {
      icon,
      iconSize: cloudFormationSteps.includes(nodeData.stepType as StepType) ? 32 : 20
    }
  }

  return {
    icon: 'cross',
    iconSize: 20
  }
}

/** Add dependency services to nodeMap */
const addServiceDependenciesFromLiteTaskEngine = (
  nodeMap: { [key: string]: ExecutionNode },
  adjacencyMap?: { [key: string]: ExecutionNodeAdjacencyList }
): void => {
  const liteEngineTask = Object.values(nodeMap).find(item => item.stepType === LITE_ENGINE_TASK)
  if (liteEngineTask) {
    const parentNodeId = getParentNodeId(adjacencyMap, liteEngineTask)
    const parentNode: ExecutionNode | undefined = nodeMap[parentNodeId]

    // NOTE: liteEngineTask contains information about dependency services
    const serviceDependencyList: ExecutionNode[] =
      // Array check is required for legacy support
      (Array.isArray(liteEngineTask.outcomes)
        ? liteEngineTask.outcomes.find((_item: any) => !!_item.serviceDependencyList)?.serviceDependencyList
        : liteEngineTask.outcomes?.dependencies?.serviceDependencyList) || []

    // 1. add service dependencies to nodeMap
    serviceDependencyList.forEach(service => {
      if (service?.identifier) {
        service.stepType = 'dependency-service'
        service.executableResponses = [
          {
            task: {
              logKeys: (service as any).logKeys
            } as any
          }
        ]
        if (parentNode && isExecutionRunning(parentNode.status)) {
          // If execution is still running, we should be getting logs as stream, not blob
          service.status = ExecutionStatusEnum.Running
        }
        nodeMap[service.identifier] = service
      }
    })

    // 2. add Initialize (Initialize step is liteEngineTask step)
    // override step name
    if (liteEngineTask.uuid) {
      liteEngineTask.name = 'Initialize'
      nodeMap[liteEngineTask.uuid] = liteEngineTask
    }
  }
}

export const getChildNodeDataForMatrix = (
  parentNode: GraphLayoutNode,
  layoutNodeMap: LayoutNodeMapInterface
): PipelineGraphState[] => {
  const childData: PipelineGraphState[] = []
  if (isNodeTypeMatrixOrFor(parentNode?.nodeType)) {
    parentNode?.edgeLayoutList?.currentNodeChildren?.forEach(item => {
      const nodeDataItem = layoutNodeMap[item]
      const matrixNodeName = nodeDataItem?.strategyMetadata?.matrixmetadata?.matrixvalues

      childData.push({
        id: nodeDataItem.nodeExecutionId as string, // matrix node nodeExecId(unique) + stageNodeId (nodeUUID) commo
        stageNodeId: nodeDataItem?.nodeUuid as string,
        identifier: nodeDataItem.nodeIdentifier as string,
        type: nodeDataItem.nodeType as string,
        name: nodeDataItem.name as string,
        icon: 'cross',
        data: {
          ...(nodeDataItem as any),
          graphType: PipelineGraphType.STAGE_GRAPH,
          matrixNodeName
        },
        children: []
      })
    })
  }

  return childData
}

export const isNodeTypeMatrixOrFor = (nodeType?: string): boolean => {
  return [StageNodeType.Matrix, StageNodeType.Loop, StageNodeType.Parallelism].includes(nodeType as StageNodeType)
}

export const sortNodeIdsByStatus = (nodeIds: string[], layoutNodeMap: Record<string, GraphLayoutNode>): string[] => {
  return [...nodeIds].sort((a, b) => {
    const aNodePriority = PriorityByStageStatus[layoutNodeMap?.[a]?.status as ExecutionStatus] ?? 0
    const bNodePriority = PriorityByStageStatus[layoutNodeMap?.[b]?.status as ExecutionStatus] ?? 0

    return bNodePriority - aNodePriority
  })
}

export function processLayoutNodeMapV1(executionSummary?: PipelineExecutionSummary): PipelineGraphState[] {
  const response: PipelineGraphState[] = []
  if (!executionSummary) {
    return response
  }

  const startingNodeId = executionSummary.startingNodeId
  const layoutNodeMap = executionSummary.layoutNodeMap

  response.push(...processLayoutNodeMapInternal(layoutNodeMap, startingNodeId))

  return response
}

export const processLayoutNodeMapInternal = (
  layoutNodeMap?: Record<string, GraphLayoutNode>,
  startingNodeId?: string
): PipelineGraphState[] => {
  const response: PipelineGraphState[] = []

  if (startingNodeId && layoutNodeMap?.[startingNodeId]) {
    let nodeDetails: GraphLayoutNode | undefined = layoutNodeMap[startingNodeId]

    while (nodeDetails) {
      const currentNodeChildren: string[] | undefined = nodeDetails?.edgeLayoutList?.currentNodeChildren
      const nextIds: string[] | undefined = nodeDetails?.edgeLayoutList?.nextIds
      if (nodeDetails?.nodeType === StageNodeType.Parallel && currentNodeChildren && currentNodeChildren.length > 1) {
        const sortedParallelNodeIds = sortNodeIdsByStatus(currentNodeChildren, layoutNodeMap)
        const firstParallelNode = layoutNodeMap[sortedParallelNodeIds[0]]
        const restChildNodes = sortedParallelNodeIds.slice(1)
        const parentNode = {
          id: firstParallelNode?.nodeUuid as string,
          identifier: firstParallelNode?.nodeIdentifier as string,
          type: firstParallelNode?.nodeType as string,
          name: firstParallelNode?.name as string,
          icon: 'cross',
          data: {
            ...(firstParallelNode as any),
            ...(isNodeTypeMatrixOrFor(firstParallelNode?.nodeType) && {
              children: getChildNodeDataForMatrix(firstParallelNode, layoutNodeMap),
              graphType: PipelineGraphType.STAGE_GRAPH,
              id: firstParallelNode?.nodeUuid,
              maxParallelism: firstParallelNode?.moduleInfo?.maxConcurrency?.value
            })
          },

          children: restChildNodes.map(item => {
            const nodeDataItem = layoutNodeMap[item]
            // eslint-disable-next-line @typescript-eslint/no-shadow
            return {
              id: nodeDataItem.nodeUuid as string,
              identifier: nodeDataItem.nodeIdentifier as string,
              type: nodeDataItem.nodeType as string,
              name: nodeDataItem.name as string,
              icon: 'cross',
              data: {
                ...(nodeDataItem as any),
                ...(isNodeTypeMatrixOrFor(nodeDataItem?.nodeType) && {
                  children: getChildNodeDataForMatrix(nodeDataItem, layoutNodeMap),
                  graphType: PipelineGraphType.STAGE_GRAPH,
                  id: nodeDataItem?.nodeUuid,
                  maxParallelism: nodeDataItem?.moduleInfo?.maxConcurrency?.value
                })
              },
              children: []
            }
          })
        } as PipelineGraphState

        response.push(parentNode)
        nodeDetails = layoutNodeMap[nodeDetails.edgeLayoutList?.nextIds?.[0] || '']
      } else if (
        isNodeTypeMatrixOrFor(nodeDetails?.nodeType) &&
        currentNodeChildren &&
        currentNodeChildren.length >= 1
      ) {
        const childData: PipelineGraphState[] = []
        currentNodeChildren.forEach(item => {
          const nodeDataItem = layoutNodeMap[item]
          const matrixNodeName = nodeDataItem?.strategyMetadata?.matrixmetadata?.matrixvalues
          childData.push({
            id: nodeDataItem.nodeExecutionId as string,
            stageNodeId: nodeDataItem?.nodeUuid as string,
            identifier: nodeDataItem.nodeIdentifier as string,
            type: nodeDataItem.nodeType as string,
            name: nodeDataItem.name as string,
            icon: 'cross',
            data: {
              ...(nodeDataItem as any),
              graphType: PipelineGraphType.STAGE_GRAPH,
              matrixNodeName
            },
            children: []
          })
        })
        response.push({
          id: nodeDetails?.nodeUuid as string,
          identifier: nodeDetails?.nodeIdentifier as string,
          type: nodeDetails?.nodeType as string,
          name: nodeDetails?.name as string,
          icon: 'cross',
          data: {
            ...(nodeDetails as any),
            children: childData,
            graphType: PipelineGraphType.STAGE_GRAPH,
            id: nodeDetails?.nodeUuid,
            maxParallelism: nodeDetails?.moduleInfo?.maxConcurrency?.value
          }
        })

        if (nextIds && nextIds.length === 1) {
          nodeDetails = layoutNodeMap[nextIds[0]]
        } else {
          nodeDetails = undefined
        }
      } else if (
        nodeDetails?.nodeType === StageNodeType.Parallel &&
        currentNodeChildren &&
        layoutNodeMap[currentNodeChildren[0]]
      ) {
        const nodedata = layoutNodeMap[currentNodeChildren[0]]
        response.push({
          id: nodedata.nodeUuid as string,
          identifier: nodedata.nodeIdentifier as string,
          type: nodedata.nodeType as string,
          name: nodedata.name as string,
          icon: 'cross',
          data: {
            ...(nodedata as any),
            ...(isNodeTypeMatrixOrFor(nodedata?.nodeType) && {
              children: getChildNodeDataForMatrix(nodedata, layoutNodeMap),
              graphType: PipelineGraphType.STAGE_GRAPH,
              id: nodedata?.nodeUuid,
              maxParallelism: nodedata?.moduleInfo?.maxConcurrency?.value
            })
          },
          children: []
        })
        nodeDetails = layoutNodeMap[nodeDetails.edgeLayoutList?.nextIds?.[0] || '']
      } else {
        response.push({
          id: nodeDetails?.nodeUuid as string,
          identifier: nodeDetails?.nodeIdentifier as string,
          type: nodeDetails?.nodeType as string,
          name: nodeDetails?.name as string,
          icon: 'cross',
          data: nodeDetails as any,
          children: []
        })
        if (nextIds && nextIds.length === 1) {
          nodeDetails = layoutNodeMap[nextIds[0]]
        } else {
          nodeDetails = undefined
        }
      }
    }
  }

  return response
}

export const processExecutionDataForGraph = (
  stages?: PipelineGraphState[],
  parentStageId?: string,
  isPipelineRollback = false
): PipelineGraphState[] => {
  const items: PipelineGraphState[] = []
  stages?.forEach(currentStage => {
    if (currentStage?.children?.length) {
      const childNodes: PipelineGraphState[] = []
      const currentStageData = currentStage.data
      currentStage = {
        ...currentStage,
        icon: getIconFromStageModule(currentStageData?.module, currentStageData?.nodeType),
        status: currentStageData?.status as any,
        type: [StageType.LOOP, StageType.PARALLELISM].includes(currentStage?.type as StageType)
          ? ExecutionPipelineNodeType.MATRIX
          : currentStage?.type,
        parentStageId,
        ...(isPipelineRollback && {
          id: [defaultTo(currentStageData?.nodeUuid, ''), parentStageId].join('|')
        }),
        data: {
          ...currentStage.data,
          conditionalExecutionEnabled: getConditionalExecutionFlag(currentStage?.data?.nodeRunInfo),
          ...(isPipelineRollback && {
            id: [defaultTo(currentStageData?.nodeUuid, ''), parentStageId].join('|')
          }),
          identifier: isPipelineRollback
            ? [defaultTo(currentStageData?.nodeUuid, ''), parentStageId].join('|')
            : defaultTo(currentStageData?.nodeUuid, ''),
          name: currentStageData?.name || currentStageData?.nodeIdentifier || /* istanbul ignore next */ '',
          status: currentStageData?.status as any,
          barrierFound: currentStageData?.barrierFound,
          tertiaryIcon: currentStageData?.barrierFound ? BARRIER_WITH_OPEN_LINKS : undefined,
          type:
            currentStageData?.nodeType === StageType.APPROVAL
              ? ExecutionPipelineNodeType.DIAMOND
              : isNodeTypeMatrixOrFor(currentStageData?.nodeType)
              ? ExecutionPipelineNodeType.MATRIX
              : ExecutionPipelineNodeType.NORMAL,
          skipCondition: currentStageData?.skipInfo?.evaluatedCondition
            ? currentStageData.skipInfo.skipCondition
            : undefined,
          disableClick: isExecutionNotStarted(currentStageData?.status) || isExecutionSkipped(currentStageData?.status),
          when: currentStageData?.nodeRunInfo,
          graphType: PipelineGraphType.STAGE_GRAPH,
          isExecutionView: true
        }
      }
      currentStage?.children?.forEach?.(currentNode => {
        const node = currentNode.data
        node &&
          childNodes.push({
            ...currentNode,
            icon: getIconFromStageModule(node?.module, node.nodeType),
            status: node?.status as never,
            parentStageId,
            ...(isPipelineRollback && { id: [defaultTo(node?.nodeUuid, ''), parentStageId].join('|') }),
            data: {
              ...node,
              conditionalExecutionEnabled: getConditionalExecutionFlag(node?.nodeRunInfo),
              ...(isPipelineRollback && { id: [defaultTo(node?.nodeUuid, ''), parentStageId].join('|') }),
              identifier: isPipelineRollback
                ? [defaultTo(node?.nodeUuid, ''), parentStageId].join('|')
                : defaultTo(node?.nodeUuid, ''),
              name: node?.name || node?.nodeIdentifier || /* istanbul ignore next */ '',
              status: node?.status as never,
              barrierFound: node?.barrierFound,
              tertiaryIcon: currentStageData?.barrierFound ? BARRIER_WITH_OPEN_LINKS : undefined,
              type:
                node?.nodeType === StageType.APPROVAL
                  ? ExecutionPipelineNodeType.DIAMOND
                  : ExecutionPipelineNodeType.NORMAL,
              skipCondition: node?.skipInfo?.evaluatedCondition ? node.skipInfo.skipCondition : undefined,
              disableClick: isExecutionNotStarted(node?.status) || isExecutionSkipped(node?.status),
              when: node?.nodeRunInfo,
              graphType: PipelineGraphType.STAGE_GRAPH
            }
          })
      })
      currentStage.children = childNodes as PipelineGraphState[]
      items.push(currentStage)
    } else {
      const stage = currentStage.data
      items.push({
        ...currentStage,
        icon: getIconFromStageModule(stage?.module, stage?.nodeType),
        status: stage?.status as any,
        type: [StageType.LOOP, StageType.PARALLELISM].includes(currentStage?.type as StageType)
          ? ExecutionPipelineNodeType.MATRIX
          : currentStage?.type,
        parentStageId,
        ...(isPipelineRollback && { id: [defaultTo(stage?.nodeUuid, ''), parentStageId].join('|') }),
        data: {
          ...stage,
          conditionalExecutionEnabled: getConditionalExecutionFlag(stage?.nodeRunInfo),
          ...(isPipelineRollback && { id: [defaultTo(stage?.nodeUuid, ''), parentStageId].join('|') }),
          identifier: isPipelineRollback
            ? [defaultTo(stage?.nodeUuid, ''), parentStageId].join('|')
            : defaultTo(stage?.nodeUuid, ''),
          name: stage?.name || stage?.nodeIdentifier || /* istanbul ignore next */ '',
          status: stage?.status as any,
          barrierFound: stage?.barrierFound,
          tertiaryIcon: stage?.barrierFound ? BARRIER_WITH_OPEN_LINKS : undefined,
          type:
            stage?.nodeType === StageType.APPROVAL
              ? ExecutionPipelineNodeType.DIAMOND
              : isNodeTypeMatrixOrFor(stage?.nodeType)
              ? ExecutionPipelineNodeType.MATRIX
              : ExecutionPipelineNodeType.NORMAL,
          skipCondition: stage?.skipInfo?.evaluatedCondition ? stage.skipInfo.skipCondition : undefined,
          disableClick: isExecutionNotStarted(stage?.status) || isExecutionSkipped(stage?.status),
          when: stage?.nodeRunInfo,
          data: stage,
          graphType: PipelineGraphType.STAGE_GRAPH
        }
      })
    }
  })
  return items
}

const getGroupSeperatedRunningIdentifiers = (
  nodeMap: { [key: string]: ExecutionNode },
  runningStageStepIdentifiers: string[]
): string[] => {
  const groupIdentifiers: string[] = Object.values(nodeMap)
    .filter(val => val.stepType === StepNodeType.STEP_GROUP && val.identifier)
    .map(val => val.identifier ?? '')

  if (groupIdentifiers.length === 0) return runningStageStepIdentifiers

  const groupSeperatedRunningIdentifiers: string[] = []
  runningStageStepIdentifiers.map((identifier: string) =>
    groupIdentifiers.forEach(
      (groupIdentifier: string) =>
        identifier.includes(groupIdentifier) &&
        groupSeperatedRunningIdentifiers.push(identifier.replace(`${groupIdentifier}_`, ''))
    )
  )
  return groupSeperatedRunningIdentifiers
}

const updateBackgroundStepNodeStatuses = ({
  runningStageIds,
  nodeMap,
  adjacencyMap
}: {
  runningStageIds?: Array<string> | null
  nodeMap: { [key: string]: ExecutionNode }
  adjacencyMap?: { [key: string]: ExecutionNodeAdjacencyList }
}): {
  [key: string]: ExecutionNode
} => {
  const newNodeMap: { [key: string]: ExecutionNode } = { ...nodeMap }
  const nodeMapValues: ExecutionNode[] = Object.values(nodeMap)
  // Find stepIdentifiers in running stage
  const runningStageStepIdentifiers: string[] =
    nodeMapValues.find(node => runningStageIds?.includes(node.setupId!))?.stepParameters?.specConfig?.stepIdentifiers ||
    []
  // Overwrite status for stepType Background in running stage
  const runningStepIdentifiers = getGroupSeperatedRunningIdentifiers(nodeMap, runningStageStepIdentifiers)
  nodeMapValues.forEach(node => {
    const parentNodeId = getParentNodeId(adjacencyMap, node)
    const parentNode: ExecutionNode | undefined = nodeMap[parentNodeId]
    const childNodeId = adjacencyMap?.[node.uuid!]?.children?.[0]
    const childNode: ExecutionNode | undefined = childNodeId ? nodeMap[childNodeId] : undefined
    if (
      node?.uuid &&
      node.identifier &&
      node.stepType === StepType.Background &&
      ((parentNode &&
        (parentNode.stepType === StepNodeType.STRATEGY ||
          parentNode.stepType === StepNodeType.FORK ||
          parentNode.stepType === StepType.Background) &&
        runningStepIdentifiers.includes(parentNode?.identifier ?? '')) ||
        runningStepIdentifiers.includes(node.identifier))
    ) {
      // Overwrite status temporarily for a standalone Background step or a child Background step in a strategy node in running stage
      // this helps keep the stream open for logs instead of blob requests for logs wrt Background step
      newNodeMap[node.uuid].status = ExecutionStatusEnum.Running
    } else if (
      node?.uuid &&
      node?.identifier &&
      node?.stepType === StepNodeType.STRATEGY &&
      childNode?.stepType === StepType.Background &&
      runningStepIdentifiers.includes(node.identifier)
    ) {
      // Overwrite status and stepType temporarily for strategy on a Background step in running stage
      // this helps keep the stream open for logs instead of blob requests for logs wrt Background step
      newNodeMap[node.uuid].status = ExecutionStatusEnum.Running
      newNodeMap[node.uuid].stepType = StepType.Background
    }
  })
  return newNodeMap
}

// Get accurate status for Background Steps from allNodeMap
export const getBackgroundStepStatus = ({
  allNodeMap,
  identifier
}: {
  allNodeMap: Record<string, ExecutionNode>
  identifier: string
}): Omit<ExecutionStatus, 'NOT_STARTED'> | undefined => {
  return allNodeMap[identifier]?.status
}

// Get accurate status for Background Steps from allNodeMap
// allNodeMap already has the status where UI overwrites when stage is running
export const getStepsTreeStatus = ({
  allNodeMap,
  step
}: {
  allNodeMap: Record<string, ExecutionNode>
  step: ExecutionPipelineNode<ExecutionNode>
}): Omit<ExecutionStatus, 'NOT_STARTED'> | undefined => {
  const stepIdentifier = step?.item?.identifier
  const groupIdentifier = step?.group?.identifier
  if (stepIdentifier && step.item?.data) {
    return (
      (step.item.data?.stepType === StepType.Background &&
        getBackgroundStepStatus({ identifier: step.item.identifier, allNodeMap })) ||
      step.item.status
    )
  } else if (groupIdentifier && step.group?.data) {
    return (
      (step.group.data?.stepType === StepType.Background &&
        getBackgroundStepStatus({ identifier: step.group.identifier, allNodeMap })) ||
      step.group.status
    )
  }
}

export const processForCIData = ({
  nodeMap,
  data
}: {
  nodeMap: { [key: string]: ExecutionNode }
  data?: ResponsePipelineExecutionDetail | null
}): { [key: string]: ExecutionNode } => {
  // NOTE: add dependencies from "liteEngineTask" (ci stage)
  const adjacencyMap = data?.data?.executionGraph?.nodeAdjacencyListMap
  addServiceDependenciesFromLiteTaskEngine(nodeMap, adjacencyMap)

  // NOTE: Update Background stepType status as Running if the stage is still running
  let newNodeMap = { ...nodeMap }
  const newNodeMapValues = Object.values(newNodeMap)
  if (
    data?.data?.pipelineExecutionSummary?.status &&
    isExecutionRunning(data.data.pipelineExecutionSummary.status) &&
    !isEmpty(nodeMap)
  ) {
    const runningStageIds = getActiveStageForPipeline(data.data.pipelineExecutionSummary)

    newNodeMap = updateBackgroundStepNodeStatuses({ runningStageIds, nodeMap, adjacencyMap })
  }

  // NOTE: Remove Duration for Background stepType similar to Service Dependency
  newNodeMapValues.forEach(node => {
    if (node?.uuid && node.stepType === StepType.Background) {
      newNodeMap[node.uuid].startTs = 0
      newNodeMap[node.uuid].endTs = 0
    } else if (node?.uuid && node.stepType === StepType.Plugin && node.identifier === 'harness-git-clone') {
      newNodeMap[node.uuid].stepType = StepType.GitClone
    } else if (node?.uuid && node.stepType === StepType.Plugin && node.identifier === 'save-cache-harness') {
      newNodeMap[node.uuid].stepType = StepType.SaveCacheHarness
    } else if (node?.uuid && node.stepType === StepType.Plugin && node.identifier === 'restore-cache-harness') {
      newNodeMap[node.uuid].stepType = StepType.RestoreCacheHarness
    }
  })

  return newNodeMap
}

export function isMultiSvcOrMultiEnv(type?: string): boolean {
  return !!type && ['MULTI_SERVICE_DEPLOYMENT', 'MULTI_ENV_DEPLOYMENT', 'MULTI_SERVICE_ENV_DEPLOYMENT'].includes(type)
}

export function getInterruptHistoriesFromType(
  interruptHistories: InterruptEffectDTO[] | undefined,
  interruptType: InterruptType
): InterruptEffectDTO[] {
  return defaultTo(interruptHistories, []).filter(row => row.interruptType === interruptType)
}

const EXECUTION_STATUS_VS_FAVICON_DETAILS_MAP = {
  [ExecutionStatusEnum.Success]: {
    STATIC: {
      ICO: 'favicon-success.ico',
      PNG: 'favicon-success.png'
    },
    CDN: {
      ICO: 'https://static.harness.io/ng-static/images/favicon-success.ico',
      PNG: 'https://static.harness.io/ng-static/images/favicon-success.png'
    }
  },
  [ExecutionStatusEnum.Failed]: {
    STATIC: {
      ICO: 'favicon-failed.ico',
      PNG: 'favicon-failed.png'
    },
    CDN: {
      ICO: 'https://static.harness.io/ng-static/images/favicon-failed.ico',
      PNG: 'https://static.harness.io/ng-static/images/favicon-failed.png'
    }
  },
  [ExecutionStatusEnum.Running]: {
    STATIC: {
      ICO: 'favicon-running.ico',
      PNG: 'favicon-running.png'
    },
    CDN: {
      ICO: 'https://static.harness.io/ng-static/images/favicon-running.ico',
      PNG: 'https://static.harness.io/ng-static/images/favicon-running.png'
    }
  },
  [ExecutionStatusEnum.InterventionWaiting]: {
    STATIC: {
      ICO: 'favicon-waiting.ico',
      PNG: 'favicon-waiting.png'
    },
    CDN: {
      ICO: 'https://static.harness.io/ng-static/images/favicon-waiting.ico',
      PNG: 'https://static.harness.io/ng-static/images/favicon-waiting.png'
    }
  },
  [ExecutionStatusEnum.Aborted]: {
    STATIC: {
      ICO: 'favicon-aborted.ico',
      PNG: 'favicon-aborted.png'
    },
    CDN: {
      ICO: 'https://static.harness.io/ng-static/images/favicon-aborted.ico',
      PNG: 'https://static.harness.io/ng-static/images/favicon-aborted.png'
    }
  }
}

export const getFavIconDetailsFromPipelineExecutionStatus = (pipelineStatus: PipelineExecutionSummary['status']) => {
  if (isExecutionSuccess(pipelineStatus)) {
    return EXECUTION_STATUS_VS_FAVICON_DETAILS_MAP[ExecutionStatusEnum.Success]
  }

  if (isExecutionFailed(pipelineStatus)) {
    return EXECUTION_STATUS_VS_FAVICON_DETAILS_MAP[ExecutionStatusEnum.Failed]
  }

  if (isExecutionRunning(pipelineStatus)) {
    return EXECUTION_STATUS_VS_FAVICON_DETAILS_MAP[ExecutionStatusEnum.Running]
  }

  if (isExecutionWaiting(pipelineStatus)) {
    return EXECUTION_STATUS_VS_FAVICON_DETAILS_MAP[ExecutionStatusEnum.InterventionWaiting]
  }

  if (isExecutionAborted(pipelineStatus) || isExecutionExpired(pipelineStatus)) {
    return EXECUTION_STATUS_VS_FAVICON_DETAILS_MAP[ExecutionStatusEnum.Aborted]
  }

  return undefined
}

interface RCAUtilsInterface {
  pipelineStagesMap: ExecutionContextParams['pipelineStagesMap']
  selectedStageId: ExecutionContextParams['selectedStageId']
  pipelineExecutionDetail: ExecutionContextParams['pipelineExecutionDetail']
}

export const getSelectedStageModule = (
  pipelineStagesMap: ExecutionContextParams['pipelineStagesMap'],
  selectedStageId: ExecutionContextParams['selectedStageId']
): Module | undefined => {
  const currentStage = pipelineStagesMap.get(selectedStageId)
  if (!currentStage) {
    return
  }
  return currentStage.module as Module
}

export const getCurrentModuleInfo = ({
  pipelineStagesMap,
  selectedStageId,
  pipelineExecutionDetail
}: RCAUtilsInterface): CDStageModuleInfo | CIPipelineStageModuleInfo | null => {
  const currentModule = getSelectedStageModule(pipelineStagesMap, selectedStageId)
  const _pipelineExecutionDetail = get(pipelineExecutionDetail, 'childGraph', pipelineExecutionDetail)
  switch (currentModule) {
    case 'cd':
      return get(_pipelineExecutionDetail, 'pipelineExecutionSummary.moduleInfo.cd', {})
    case 'ci':
      return get(_pipelineExecutionDetail, 'pipelineExecutionSummary.moduleInfo.ci.ciPipelineStageModuleInfo', {})
    default:
      return null
  }
}

export const getInfraTypeFromStageForCurrentStep = ({
  pipelineStagesMap,
  selectedStageId,
  pipelineExecutionDetail
}: RCAUtilsInterface): Infrastructure['type'] => {
  const currentModule = getSelectedStageModule(pipelineStagesMap, selectedStageId) as Module
  const currentModuleInfo = getCurrentModuleInfo({
    pipelineStagesMap,
    selectedStageId,
    pipelineExecutionDetail
  })
  switch (currentModule) {
    case 'cd':
      return get(currentModuleInfo, 'infrastructureTypes', [])?.[0]
    case 'ci':
      return get(currentModuleInfo, 'infraType', '')
  }
}

export const showHarnessCoPilot = ({
  pipelineStagesMap,
  selectedStageId,
  pipelineExecutionDetail,
  enableForCI = false,
  enableForCD = false,
  isEULAccepted
}: RCAUtilsInterface & {
  enableForCI?: boolean
  enableForCD?: boolean
  isEULAccepted: boolean
}): boolean => {
  /* It is possible for a stageId to be not present in "pipelineStagesMap" and be present in "pipelineExecutionSummary.layoutNodeMap" */
  let selectedModule = getSelectedStageModule(pipelineStagesMap, selectedStageId)
  if (!selectedModule) {
    const _pipelineExecutionDetail = get(pipelineExecutionDetail, 'childGraph', pipelineExecutionDetail)
    const pipelineStagesMapFromExecutionDetails = new Map(
      Object.entries(get(_pipelineExecutionDetail, 'pipelineExecutionSummary.layoutNodeMap', {}))
    ) as Map<string, GraphLayoutNode>
    selectedModule = getSelectedStageModule(pipelineStagesMapFromExecutionDetails, selectedStageId)
  }
  return isEULAccepted && ((enableForCI && 'ci' === selectedModule) || (enableForCD && 'cd' === selectedModule))
}

export function resolveCurrentStep(selectedStepId: string, queryParams: ExecutionPageQueryParams): string {
  return queryParams.retryStep ? queryParams.retryStep : selectedStepId
}

export const getCommandFromCurrentStep = ({
  step,
  pipelineStagesMap,
  selectedStageId
}: {
  step: ExecutionNode
  pipelineStagesMap: ExecutionContextParams['pipelineStagesMap']
  selectedStageId: ExecutionContextParams['selectedStageId']
}): string => {
  const currentModule = getSelectedStageModule(pipelineStagesMap, selectedStageId) as Module
  switch (currentModule) {
    case 'cd':
      return get(step, 'stepParameters.spec.source.spec.script', '') as string
    case 'ci':
      return get(step, 'stepParameters.spec.command', '') as string
    default:
      return ''
  }
}

export const getOSTypeAndArchFromStageForCurrentStep = ({
  pipelineStagesMap,
  selectedStageId,
  pipelineExecutionDetail
}: RCAUtilsInterface): { os: Platform['os']; arch: Platform['arch'] } | null => {
  const currentModule = getSelectedStageModule(pipelineStagesMap, selectedStageId) as Module
  const currentModuleInfo = getCurrentModuleInfo({
    pipelineStagesMap,
    selectedStageId,
    pipelineExecutionDetail
  })
  switch (currentModule) {
    case 'ci':
      return { os: get(currentModuleInfo, 'osType', ''), arch: get(currentModuleInfo, 'osArch', '') }
    default:
      return null
  }
}

export const getPluginUsedFromStepParams = (selectedStep: ExecutionNode, stepType: StepType): string => {
  switch (stepType) {
    case StepType.BitrisePlugin:
    case StepType.GHAPlugin:
      return get(selectedStep, 'stepParameters.spec.uses', '')
    case StepType.Plugin:
      return get(selectedStep, 'stepParameters.spec.image', '')
    default:
      return ''
  }
}

export const getNodeId = (
  selectedStageId: string,
  selectedStageExecutionId?: string,
  selectedChildStageId?: string
): string =>
  selectedStageExecutionId !== selectedStageId && !isEmpty(selectedStageExecutionId)
    ? (selectedStageExecutionId as string)
    : selectedChildStageId && !isEmpty(selectedChildStageId)
    ? selectedChildStageId
    : selectedStageId

export const getStageErrorMessage = (responseMessages: ResponseMessage[], stage: GraphLayoutNode | undefined): string =>
  responseMessages.length > 0
    ? extractInfo(responseMessages)
        .map(err => err.error?.message)
        .filter(identity)
        .join(', ')
    : defaultTo(stage?.failureInfo?.message, '')
