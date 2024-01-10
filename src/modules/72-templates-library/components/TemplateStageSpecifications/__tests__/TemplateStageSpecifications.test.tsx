/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import produce from 'immer'
import routes from '@common/RouteDefinitions'
import { accountPathProps, pipelineModuleParams, pipelinePathProps } from '@common/utils/routeUtils'
import { PipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import pipelineContextMock from '@pipeline/components/PipelineStudio/RightDrawer/__tests__/stateMock'
import { findPopoverContainer, TestWrapper } from '@common/utils/testUtils'
import { TemplateStageSpecifications } from '@templates-library/components/TemplateStageSpecifications/TemplateStageSpecifications'
import type { TemplateBarProps } from '@pipeline/components/PipelineStudio/TemplateBar/TemplateBar'
import {
  stageMockTemplateVersion1InputYaml,
  stageTemplateVersion1,
  stageTemplateVersion2
} from '@templates-library/TemplatesTestHelper'
import { useGetResolvedTemplate, useGetTemplateInputSetYaml } from 'services/template-ng'

jest.mock('@pipeline/components/PipelineStudio/TemplateBar/TemplateBar', () => ({
  ...jest.requireActual('@pipeline/components/PipelineStudio/TemplateBar/TemplateBar'),
  TemplateBar: (_props: TemplateBarProps) => {
    return <div className="template-bar-mock" />
  }
}))

const refetchResolvedTemplate = jest.fn()

jest.mock('@common/hooks/useMutateAsGet', () => ({
  useMutateAsGet: jest.fn().mockImplementation(() => {
    return { data: stageTemplateVersion1, refetch: refetchResolvedTemplate, error: null }
  })
}))

jest.mock('services/template-ng', () => ({
  ...jest.requireActual('services/template-ng'),
  useGetTemplateInputSetYaml: jest.fn().mockImplementation(() => ({
    data: stageMockTemplateVersion1InputYaml,
    refetch: jest.fn(),
    error: null,
    loading: false
  })),
  useGetResolvedTemplate: jest
    .fn()
    .mockImplementation(() => ({ data: stageTemplateVersion1, refetch: jest.fn(), error: null, loading: false })),
  getsMergedTemplateInputYamlPromise: jest.fn().mockImplementation(() => ({
    status: 'SUCCESS',
    data: {
      mergedTemplateInputs: stageMockTemplateVersion1InputYaml
    }
  }))
}))

jest.mock('services/cd-ng', () => ({
  useGetSettingsList: jest.fn().mockResolvedValue({}),
  useGetServiceAccessList: jest.fn().mockImplementation(() => ({
    loading: false,
    data: {
      status: 'SUCCESS',
      data: []
    },
    refetch: jest.fn()
  }))
}))

const PATH = routes.toPipelineStudio({ ...accountPathProps, ...pipelinePathProps, ...pipelineModuleParams })
const PATH_PARAMS = {
  pipelineIdentifier: 'stage1',
  accountId: 'accountId',
  projectIdentifier: 'Milos2',
  orgIdentifier: 'CV',
  module: 'cd'
}

const contextMock = produce(pipelineContextMock, draft => {
  draft.getStageFromPipeline = jest.fn().mockReturnValue({
    stage: {
      stage: {
        name: 'Stage 1',
        identifier: 'Stage_1',
        template: {
          templateRef: 'Test_Stage_Template',
          versionLabel: 'Version1',
          templateInputs: {
            type: 'Deployment',
            spec: {
              serviceConfig: {
                serviceRef: '<+input>'
              },
              infrastructure: {
                infrastructureDefinition: {
                  type: 'KubernetesDirect',
                  spec: {
                    namespace: '<+input>'
                  }
                }
              }
            },
            variables: [
              {
                name: 'var1',
                type: 'String',
                value: '<+input'
              }
            ]
          }
        }
      }
    }
  })
})

describe('<TemplateStageSpecifications /> tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('snapshot test with template inputs', async () => {
    const { container } = render(
      <PipelineContext.Provider value={contextMock}>
        <TestWrapper path={PATH} pathParams={PATH_PARAMS}>
          <TemplateStageSpecifications />
        </TestWrapper>
      </PipelineContext.Provider>
    )
    const nameInput = container.querySelector('input[name="name"]') as HTMLElement
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Stage 2' } })
    })
    await waitFor(() => {
      expect(contextMock.updateStage).toBeCalledWith(expect.objectContaining({ name: 'Stage 2' }))
    })
  })

  test('should have all three type options for fields', async () => {
    const { container } = render(
      <PipelineContext.Provider value={contextMock}>
        <TestWrapper path={PATH} pathParams={PATH_PARAMS}>
          <TemplateStageSpecifications />
        </TestWrapper>
      </PipelineContext.Provider>
    )

    const typeChangeButtons = container.querySelectorAll('.MultiTypeInput--btn')

    await act(async () => {
      fireEvent.click(typeChangeButtons?.[0])
    })
    let popOverContainer = findPopoverContainer() as HTMLElement
    let menuItems = popOverContainer.querySelectorAll('.bp3-menu-item')
    expect(menuItems).toHaveLength(3)
    expect(menuItems?.[0]).toHaveTextContent('Fixed value')
    expect(menuItems?.[1]).toHaveTextContent('Runtime input')
    expect(menuItems?.[2]).toHaveTextContent('Expression')

    await act(async () => {
      fireEvent.click(typeChangeButtons?.[1])
    })
    popOverContainer = findPopoverContainer() as HTMLElement
    menuItems = popOverContainer.querySelectorAll('.bp3-menu-item')
    expect(menuItems).toHaveLength(3)
    expect(menuItems?.[0]).toHaveTextContent('Fixed value')
    expect(menuItems?.[1]).toHaveTextContent('Runtime input')
    expect(menuItems?.[2]).toHaveTextContent('Expression')

    await act(async () => {
      fireEvent.click(typeChangeButtons?.[2])
    })
    popOverContainer = findPopoverContainer() as HTMLElement
    menuItems = popOverContainer.querySelectorAll('.bp3-menu-item')
    expect(menuItems).toHaveLength(3)
    expect(menuItems?.[0]).toHaveTextContent('Fixed value')
    expect(menuItems?.[1]).toHaveTextContent('Runtime input')
    expect(menuItems?.[2]).toHaveTextContent('Expression')
  })

  test('snapshot test with no template inputs', async () => {
    ;(useGetTemplateInputSetYaml as jest.Mock).mockImplementation(() => ({
      data: { status: 'SUCCESS' },
      refetch: jest.fn(),
      error: null,
      loading: false
    }))

    const { container } = render(
      <PipelineContext.Provider value={contextMock}>
        <TestWrapper path={PATH} pathParams={PATH_PARAMS}>
          <TemplateStageSpecifications />
        </TestWrapper>
      </PipelineContext.Provider>
    )
    const inputsContainer = container.querySelector('.inputsContainer')
    expect(inputsContainer).toBeEmptyDOMElement()
  })

  test('should call refetch on retrying in case of error', async () => {
    const refetchTemplateInputSetYaml = jest.fn()
    ;(useGetTemplateInputSetYaml as jest.Mock).mockImplementation(() => ({
      refetch: refetchTemplateInputSetYaml,
      error: {
        message: 'Failed to fetch: 400 Bad Request',
        data: {
          status: 'ERROR',
          code: 'TEMPLATE_EXCEPTION',
          message: 'Template to fetch template inputs does not exist.',
          correlationId: '31cc76e3-2914-4b9c-8b33-6faf1873ee65',
          detailedMessage: null,
          responseMessages: [
            {
              code: 'TEMPLATE_EXCEPTION',
              level: 'ERROR',
              message: 'Template to fetch template inputs does not exist.',
              exception: null,
              failureTypes: []
            }
          ],
          metadata: null
        },
        status: 400
      },
      loading: false
    }))
    ;(useGetResolvedTemplate as jest.Mock).mockImplementation(() => ({
      data: stageTemplateVersion2,
      refetch: refetchResolvedTemplate,
      error: null,
      loading: false
    }))

    const { getByRole } = render(
      <PipelineContext.Provider value={contextMock}>
        <TestWrapper path={PATH} pathParams={PATH_PARAMS}>
          <TemplateStageSpecifications />
        </TestWrapper>
      </PipelineContext.Provider>
    )

    const retryBtn = getByRole('button', { name: 'Retry' })
    await act(async () => {
      fireEvent.click(retryBtn)
    })
    expect(refetchTemplateInputSetYaml).toBeCalled()
    expect(refetchResolvedTemplate).toBeCalled()
  })
})
