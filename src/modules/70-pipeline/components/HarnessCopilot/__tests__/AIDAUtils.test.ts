/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { GraphLayoutNode } from 'services/pipeline-ng'
import { ExecutionContextParams } from '@pipeline/context/ExecutionContext'
import responseMessages from '@pipeline/components/LogsContent/__tests__/reponseMessages.json'
import {
  ciStagePipelineExecutionDetails,
  nodeLayoutForCIStage
} from '@pipeline/utils/__tests__/mockJson/mockExecutionContext'
import { getErrorMessage, ErrorScope } from '../AIDAUtils'

describe('Test AIDAUtils', () => {
  test('Test getErrorMessage method', () => {
    const commonArgs = {
      allNodeMap: { SELECTED_CI_STEP_ID: { failureInfo: { responseMessages } } } as any,
      erropScope: ErrorScope.Step,
      pipelineExecutionDetail: ciStagePipelineExecutionDetails,
      pipelineStagesMap: new Map<string, GraphLayoutNode>([['SELECTED_CI_STAGE_ID', nodeLayoutForCIStage]]),
      nodeId: 'SELECTED_CI_STAGE_ID',
      selectedStepId: 'SELECTED_CI_STEP_ID',
      queryParams: { storeType: 'INLINE' } as ExecutionContextParams['queryParams']
    }
    expect(getErrorMessage(commonArgs)).toBe(
      'Unable to fetch the tags for the image,Check if the image exists and if the permissions are scoped for the authenticated user,Not Found'
    )
    expect(
      getErrorMessage({
        ...commonArgs,
        erropScope: ErrorScope.Stage,
        allNodeMap: {
          SELECTED_CI_STEP_ID: {
            failureInfo: {
              responseMessages: [...responseMessages, { level: 'ERROR', message: 'Error occured with init' }]
            }
          }
        } as any
      })
    ).toBe('1 error occurred:\\n\\t* exit status 1\\n\\n')
  })
})
