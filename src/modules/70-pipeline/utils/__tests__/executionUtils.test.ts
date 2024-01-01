/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
import type { InterruptEffectDTO, GraphLayoutNode } from 'services/pipeline-ng'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import * as utils from '../executionUtils'

import stageGraph from './stage-graph.json'
import success from './successful-execution.json'
import interruptHistories from './mockJson/interruptHistories.json'
import {
  cdStagePipelineExecutionDetails,
  ciStagePipelineExecutionDetails,
  nodeLayoutForCDStage,
  nodeLayoutForCIStage,
  nodeLayoutForPMS,
  pipelineExecutionDetailMock
} from './mockJson/mockExecutionContext'
import { nodeDataBackgroundStep, backgroundStepId } from './mockJson/mockExecutionData'

jest.mock('@pipeline/components/PipelineSteps/PipelineStepFactory', () => ({}))

describe('ExecutionUtils tests', () => {
  describe('getRunningStep tests', () => {
    test('gives current running step from stage graph', () => {
      const result = utils.getActiveStep(stageGraph as unknown as any)

      expect(result?.node).toBe('WOLUCzOCQDWyjJyOLN_9TQ')
    })

    test('gives successful step', () => {
      const result = utils.getActiveStep(success.executionGraph as any, success.pipelineExecutionSummary as any)

      expect(result?.node).toBe('Jt0IeteUS7i6aJ4-4jY-UQ')
    })

    test('handles empty objects', () => {
      expect(utils.getActiveStep({})).toBe(null)
      expect(utils.getActiveStep({ nodeMap: {} })).toBe(null)
      expect(utils.getActiveStep({ nodeAdjacencyListMap: {} })).toBe(null)
      expect(utils.getActiveStep({ nodeMap: {}, nodeAdjacencyListMap: {} })).toBe(null)
    })
  })

  test('filter interruptHistories data based on type', () => {
    const filteredInterruptHistories = utils.getInterruptHistoriesFromType(
      interruptHistories as InterruptEffectDTO[],
      utils.Interrupt.RETRY
    )

    expect(filteredInterruptHistories.length).toBe(1)
  })

  describe('sortNodeIdsByStatus', () => {
    test('sortNodeIdsByStatus sorts based on the priority of status', () => {
      const unsortedIds = ['s1', 's2', 's3']
      const sortedIds = utils.sortNodeIdsByStatus(unsortedIds, {
        s1: {
          status: 'Success'
        },
        s2: {
          status: 'Failed'
        },
        s3: {
          status: 'Failed'
        }
      })

      expect(sortedIds).toEqual(['s2', 's3', 's1'])
    })

    test('sorts ids with falsy status to the end', () => {
      const unsortedIds = ['s1', 's2', 's3']

      expect(
        utils.sortNodeIdsByStatus(unsortedIds, {
          s1: {
            status: 'Success'
          },
          s2: {
            status: 'Failed'
          },
          s3: {
            status: undefined
          }
        })
      ).toEqual(['s2', 's1', 's3'])
      expect(
        utils.sortNodeIdsByStatus(unsortedIds, {
          s1: {
            status: 'Success'
          },
          s3: {
            status: 'Failed'
          }
        })
      ).toEqual(['s3', 's1', 's2'])
    })

    test('Test getNodeId method', () => {
      expect(utils.getNodeId('', '')).toBe('')
      expect(utils.getNodeId('selected_stage_id', '', '')).toBe('selected_stage_id')
      expect(utils.getNodeId('selected_stage_id')).toBe('selected_stage_id')
      expect(utils.getNodeId('', 'selected_stage_execution_id')).toBe('selected_stage_execution_id')
      expect(utils.getNodeId('selected_stage_id', 'selected_stage_execution_id', 'selected_child_stage_id')).toBe(
        'selected_stage_execution_id'
      )
      expect(utils.getNodeId('', '', 'selected_child_stage_id')).toBe('selected_child_stage_id')
      expect(utils.getNodeId('selected_stage_id', undefined, 'selected_child_stage_id')).toBe('selected_child_stage_id')
    })

    test('Test getStageErrorMessage method', () => {
      expect(utils.getStageErrorMessage([], nodeLayoutForCIStage)).toBe('1 error occurred:\\n\\t* exit status 1\\n\\n')
      expect(
        utils.getStageErrorMessage([{ level: 'ERROR', message: 'Error occurred during init' }], nodeLayoutForCIStage)
      ).toBe('Error occurred during init')
      expect(
        utils.getStageErrorMessage(
          [
            { level: 'ERROR', message: 'Error occurred during init' },
            { level: 'ERROR', message: 'Execution aborted' }
          ],
          nodeLayoutForCIStage
        )
      ).toBe('Error occurred during init, Execution aborted')
    })
  })

  describe('Utils for Harness AIDA integration', () => {
    test('Test showHarnessCoPilot method', () => {
      const args = {
        pipelineStagesMap: new Map<string, GraphLayoutNode>([['', {}]]),
        selectedStageId: 'CI_stage_1',
        pipelineExecutionDetail: {},
        isEULAccepted: true
      }
      /* Testing for modules CI and CD */
      expect(utils.showHarnessCoPilot(args)).toBe(false)
      // for CI
      expect(
        utils.showHarnessCoPilot({
          ...args,
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CI_stage_1', nodeLayoutForCIStage]]),
          enableForCI: true
        })
      ).toBe(true)
      expect(
        utils.showHarnessCoPilot({
          ...args,
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CI_stage_2', nodeLayoutForCIStage]])
        })
      ).toBe(false)

      // for CD
      expect(
        utils.showHarnessCoPilot({
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CD_stage_1', nodeLayoutForCDStage]]),
          selectedStageId: 'CD_stage_1',
          enableForCD: true,
          isEULAccepted: true,
          pipelineExecutionDetail: {}
        })
      ).toBe(true)
      expect(
        utils.showHarnessCoPilot({
          ...args,
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CD_stage_2', nodeLayoutForCDStage]])
        })
      ).toBe(false)

      // for Pipeline PMS
      expect(
        utils.showHarnessCoPilot({
          selectedStageId: 'PMS_Stage_1',
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['PMS_Stage_1', nodeLayoutForPMS]]),
          isEULAccepted: true,
          pipelineExecutionDetail: {}
        })
      ).toBe(false)

      // for both CI and CD
      expect(
        utils.showHarnessCoPilot({
          selectedStageId: 'CI_Stage_2',
          pipelineStagesMap: new Map<string, GraphLayoutNode>([
            ['CI_Stage_2', nodeLayoutForCIStage],
            ['CD_Stage_2', nodeLayoutForCDStage]
          ]),
          enableForCI: true,
          enableForCD: true,
          isEULAccepted: true,
          pipelineExecutionDetail: {}
        })
      ).toBe(true)

      // branch coverage for use case: a stageId to be not present in "pipelineStagesMap" and be present in "pipelineExecutionSummary.layoutNodeMap"
      expect(
        utils.showHarnessCoPilot({
          selectedStageId: 'CI_Stage_1',
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CI_Stage_2', nodeLayoutForCIStage]]),
          enableForCI: true,
          enableForCD: true,
          isEULAccepted: true,
          pipelineExecutionDetail: pipelineExecutionDetailMock
        })
      ).toBe(true)

      expect(
        utils.showHarnessCoPilot({
          selectedStageId: 'CI_Stage',
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CI_Stage_2', nodeLayoutForCIStage]]),
          enableForCI: true,
          enableForCD: true,
          isEULAccepted: true,
          pipelineExecutionDetail: {}
        })
      ).toBe(false)
    })

    test('Test resolveCurrentStep method', () => {
      expect(utils.resolveCurrentStep('step_id_2', { retryStep: 'step_id_1' })).toBe('step_id_1')
      expect(utils.resolveCurrentStep('step_id_2', {})).toBe('step_id_2')
    })

    test('Test getSelectedStageModule method', () => {
      expect(
        utils.getSelectedStageModule(new Map<string, GraphLayoutNode>([['CD_stage', nodeLayoutForCDStage]]), 'CD_stage')
      ).toBe('cd')
      expect(
        utils.getSelectedStageModule(new Map<string, GraphLayoutNode>([['CI_stage', nodeLayoutForCIStage]]), 'CI_stage')
      ).toBe('ci')
      expect(
        utils.getSelectedStageModule(new Map<string, GraphLayoutNode>([['PMS_stage', nodeLayoutForPMS]]), 'PMS_stage')
      ).toBe('pms')
      expect(utils.getSelectedStageModule(new Map<string, GraphLayoutNode>([]), 'PMS_stage_1')).toBe(undefined)
    })

    test('Test getInfraTypeFromStageForCurrentStep method', () => {
      expect(
        utils.getInfraTypeFromStageForCurrentStep({
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CD_stage', {}]]),
          selectedStageId: 'CD_stage',
          pipelineExecutionDetail: {}
        })
      ).toBeUndefined()

      expect(
        utils.getInfraTypeFromStageForCurrentStep({
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CD_stage', nodeLayoutForCDStage]]),
          selectedStageId: 'CD_stage',
          pipelineExecutionDetail: {}
        })
      ).toBeUndefined()

      // for CD

      expect(
        utils.getInfraTypeFromStageForCurrentStep({
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CD_stage', nodeLayoutForCDStage]]),
          selectedStageId: 'CD_stage',
          pipelineExecutionDetail: cdStagePipelineExecutionDetails
        })
      ).toBe('KUBERNETES')

      // for CI

      expect(
        utils.getInfraTypeFromStageForCurrentStep({
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CI_stage', nodeLayoutForCIStage]]),
          selectedStageId: 'CI_stage',
          pipelineExecutionDetail: ciStagePipelineExecutionDetails
        })
      ).toBe('HostedVm')
    })

    test('Test getOSTypeAndArchFromStageForCurrentStep method', () => {
      let osTypeAndArch = utils.getOSTypeAndArchFromStageForCurrentStep({
        pipelineStagesMap: new Map<string, GraphLayoutNode>([['CI_stage', nodeLayoutForCIStage]]),
        selectedStageId: 'CI_stage',
        pipelineExecutionDetail: ciStagePipelineExecutionDetails
      })
      expect(osTypeAndArch?.arch).toBe('Amd64')
      expect(osTypeAndArch?.os).toBe('Linux')

      osTypeAndArch = utils.getOSTypeAndArchFromStageForCurrentStep({
        pipelineStagesMap: new Map<string, GraphLayoutNode>([['CD_stage', nodeLayoutForCDStage]]),
        selectedStageId: 'CD_stage',
        pipelineExecutionDetail: {}
      })
      expect(osTypeAndArch?.arch).toBeUndefined()
      expect(osTypeAndArch?.os).toBeUndefined()
    })

    test('Test getCurrentModuleInfo method', () => {
      expect(
        utils.getCurrentModuleInfo({
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CI_stage', nodeLayoutForCIStage]]),
          selectedStageId: 'CI_stage',
          pipelineExecutionDetail: ciStagePipelineExecutionDetails
        })
      ).not.toBeUndefined()
      expect(
        utils.getCurrentModuleInfo({
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CD_stage', nodeLayoutForCIStage]]),
          selectedStageId: 'CD_stage',
          pipelineExecutionDetail: cdStagePipelineExecutionDetails
        })
      ).not.toBeUndefined()
      expect(
        utils.getCurrentModuleInfo({
          pipelineStagesMap: new Map<string, GraphLayoutNode>([['CD_stage', {}]]),
          selectedStageId: 'CD_stage',
          pipelineExecutionDetail: {}
        })
      ).toBeNull()
    })

    test('Test getPluginUsedFromStepParams method', () => {
      expect(utils.getPluginUsedFromStepParams({}, StepType.Run)).toBe('')
      expect(
        utils.getPluginUsedFromStepParams(
          {
            stepParameters: {
              identifier: 'bitriseStep',
              name: 'Bitrise Step',
              type: 'Bitrise',
              spec: {
                uses: 'plugins/download'
              }
            } as any
          },
          StepType.BitrisePlugin
        )
      ).toBe('plugins/download')

      expect(
        utils.getPluginUsedFromStepParams(
          {
            stepParameters: {
              identifier: 'ghaStep',
              name: 'Github Action Step',
              type: 'Action',
              spec: {
                uses: 'actions/checkout@v3'
              }
            } as any
          },
          StepType.GHAPlugin
        )
      ).toBe('actions/checkout@v3')

      expect(
        utils.getPluginUsedFromStepParams(
          {
            stepParameters: {
              identifier: 'pluginStep',
              name: 'Plugin Step',
              type: 'Plugin',
              spec: {
                image: 'node'
              }
            } as any
          },
          StepType.Plugin
        )
      ).toBe('node')
    })
  })

  describe('Utils for Process CI Data', () => {
    test('background node map', () => {
      const newNodeMap = utils.processForCIData({
        nodeMap: { ...nodeDataBackgroundStep?.data?.executionGraph?.nodeMap },
        data: nodeDataBackgroundStep
      })
      expect(newNodeMap[backgroundStepId].startTs).toBe(0)
      expect(newNodeMap[backgroundStepId].endTs).toBe(0)
      expect(newNodeMap[backgroundStepId].status).toBe('Running')
    })
  })
})
