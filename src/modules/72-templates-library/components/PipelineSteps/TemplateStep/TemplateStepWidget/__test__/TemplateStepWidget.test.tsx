/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { render } from '@testing-library/react'
import React from 'react'
import { MultiTypeInputType } from '@harness/uicore'
import { TestWrapper } from '@common/utils/testUtils'
import routes from '@common/RouteDefinitions'
import { accountPathProps, pipelineModuleParams, pipelinePathProps } from '@common/utils/routeUtils'
import { factory } from '@pipeline/components/PipelineSteps/Steps/__tests__/StepTestUtil'
import type { JsonNode } from 'services/template-ng'
import { stepMockTemplatesInputYaml, stepTemplate } from '@templates-library/TemplatesTestHelper'
import { TemplateStepWidgetWithRef } from '../TemplateStepWidget'

jest.mock('@common/hooks/useMutateAsGet', () => ({
  useMutateAsGet: jest.fn().mockImplementation(() => {
    return { data: stepTemplate, refetch: jest.fn(), error: null }
  })
}))

jest.mock('services/template-ng', () => ({
  ...(jest.requireActual('services/template-ng') as any),
  useGetTemplateInputSetYaml: jest
    .fn()
    .mockImplementation(() => ({ data: stepMockTemplatesInputYaml, refetch: jest.fn(), error: null, loading: false })),
  useGetResolvedTemplate: jest
    .fn()
    .mockImplementation(() => ({ data: stepTemplate, refetch: jest.fn(), error: null, loading: false })),
  getsMergedTemplateInputYamlPromise: jest.fn().mockImplementation(() => ({
    status: 'SUCCESS',
    data: {
      mergedTemplateInputs: stepMockTemplatesInputYaml
    }
  }))
}))

describe('<TemplateStepWidgetWithRef /> tests', () => {
  test('snapshot test', async () => {
    const { container } = render(
      <TestWrapper
        path={routes.toPipelineStudio({ ...accountPathProps, ...pipelinePathProps, ...pipelineModuleParams })}
        pathParams={{
          pipelineIdentifier: 'stage1',
          accountId: 'accountId',
          projectIdentifier: 'Milos2',
          orgIdentifier: 'CV',
          module: 'cd'
        }}
      >
        <TemplateStepWidgetWithRef
          initialValues={{
            name: 'Step 2',
            identifier: 'Step_2',
            template: {
              templateRef: 'Test_Random_Step',
              versionLabel: 'v1',
              templateInputs: {
                type: 'Http',
                spec: {
                  requestBody: '<+input>',
                  url: '<+input>'
                },
                delegateSelectors: '<+input>',
                enforce: {
                  policySets: '<+input>'
                }
              } as JsonNode
            }
          }}
          customStepProps={{
            selectedStage: {
              identifier: 'testStage',
              name: 'Test Stage',
              type: 'Deployment',
              spec: {}
            },
            stageIdentifier: 'testStage'
          }}
          allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION, MultiTypeInputType.RUNTIME]}
          factory={factory}
        />
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
  })
})
