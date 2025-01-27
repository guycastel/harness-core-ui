/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { act, fireEvent, render, waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper, UseGetReturnData } from '@common/utils/testUtils'
import type * as pipelineng from 'services/pipeline-ng'
import { PipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { NodeMetadataProvider } from '@pipeline/components/PipelineDiagram/Nodes/NodeMetadataContext'
import { RightDrawer } from '../../RightDrawer/RightDrawer'
import pipelineContextMock, { mockBarriers } from '../../RightDrawer/__tests__/stateMock'
import { DrawerTypes } from '../../PipelineContext/PipelineActions'

jest.mock('@blueprintjs/core', () => ({
  ...(jest.requireActual('@blueprintjs/core') as any),
  // eslint-disable-next-line react/display-name
  Drawer: ({ children, title }: any) => (
    <div className="drawer-mock">
      {title}
      {children}
    </div>
  )
}))

const useGetBarriersSetupInfoList: UseGetReturnData<pipelineng.ResponseListBarrierSetupInfo> = {
  loading: false,
  refetch: jest.fn(),
  error: null,
  data: {
    status: 'SUCCESS',
    data: mockBarriers
  }
}

jest.mock('@common/hooks', () => ({
  ...(jest.requireActual('@common/hooks') as any),

  useMutateAsGet: jest.fn().mockImplementation(() => {
    return useGetBarriersSetupInfoList
  })
}))

function WrapperComponent(): JSX.Element {
  return (
    <PipelineContext.Provider value={pipelineContextMock}>
      <TestWrapper>
        <NodeMetadataProvider>
          <RightDrawer />
        </NodeMetadataProvider>
      </TestWrapper>
    </PipelineContext.Provider>
  )
}

const initial = () => {
  pipelineContextMock.stepsFactory.getStepData = () => undefined
  pipelineContextMock.state.pipelineView.drawerData.type = DrawerTypes.FlowControl
  pipelineContextMock.state.pipelineView?.drawerData?.data &&
    (pipelineContextMock.state.pipelineView.drawerData.data.paletteData = {
      isRollback: false,
      isParallelNodeClicked: false
    } as any)
}

describe('FlowControl tests', () => {
  test('should render fine', async () => {
    initial()

    const { findByText, container } = render(<WrapperComponent />)

    expect(container).toMatchSnapshot()
    const flowControlHeader = await findByText('pipeline.barriers.syncBarriers')
    expect(flowControlHeader).toBeInTheDocument()
  })

  test('should call createItem when add barrier is clicked', async () => {
    initial()
    pipelineContextMock.updatePipeline = jest.fn()

    const { container, findByText, getByText } = render(<WrapperComponent />)

    const addBarrierButton = await findByText('pipeline.barriers.addBarrier')
    expect(addBarrierButton).toBeTruthy()
    fireEvent.click(addBarrierButton)
    fireEvent.change(container.querySelector('input[name="barriers[0].name"]')!, { target: { value: 'demoId' } })
    await waitFor(() => fireEvent.click(getByText('pipeline.barriers.syncBarriers')))

    expect(container.querySelectorAll('[data-icon="main-trash"]').length).toBe(1)

    const applyChangeButton = await findByText('applyChanges')
    expect(applyChangeButton).toBeTruthy()
    await act(() => {
      fireEvent.click(applyChangeButton)
    })
    await waitFor(() => expect(pipelineContextMock.updatePipeline).toHaveBeenCalled())
  })

  test('should call deleteItem when delete icon is clicked', async () => {
    initial()
    pipelineContextMock.state.pipeline.flowControl = {
      barriers: mockBarriers
    }

    const { container } = render(<WrapperComponent />)

    //delete
    const listTrash = container.querySelectorAll('[data-icon="main-trash"]')
    await act(() => {
      fireEvent.click(listTrash[1])
    })

    //check if deleted
    expect(container.querySelectorAll('[data-icon="main-trash"]').length).toBe(1)
  })

  test('should call editItem when edit icon is clicked', async () => {
    initial()
    pipelineContextMock.updatePipeline = jest.fn()

    const { container } = render(<WrapperComponent />)

    const editBarrierButtons = await screen.findAllByRole('button', { name: /edit/i })
    expect(editBarrierButtons[0]).toBeTruthy()
    await userEvent.click(editBarrierButtons[0])
    fireEvent.change(await screen.findByRole('textbox')!, { target: { value: 'demoId' } })
    await waitFor(async () => await userEvent.click(screen.getByText('pipeline.barriers.syncBarriers')))
    expect(container).toMatchSnapshot()
    const applyChangeButton = await screen.findByText('applyChanges')
    await userEvent.click(applyChangeButton)
    await waitFor(() => expect(pipelineContextMock.updatePipeline).toHaveBeenCalled())
  })

  test('discard button should exist', async () => {
    initial()

    const { findByText } = render(<WrapperComponent />)

    const discardButton = await findByText('pipeline.discard')
    expect(discardButton).toBeTruthy()
    act(() => {
      fireEvent.click(discardButton)
    })
  })

  test('should render with no stages and delete', async () => {
    initial()
    pipelineContextMock.state.pipeline.flowControl = {
      barriers: [
        {
          identifier: 'demoId',
          name: 'demoName'
        },
        {
          identifier: 'demoId1',
          name: 'demoName1'
        }
      ]
    }
    const { container } = render(<WrapperComponent />)

    //delete
    const listTrash = container.querySelectorAll('[data-icon="main-trash"]')
    await act(() => {
      fireEvent.click(listTrash[1])
    })

    //check if deleted
    expect(container.querySelectorAll('[data-icon="main-trash"]').length).toBe(1)
  })
  test('should render barrier list with mode', async () => {
    initial()
    pipelineContextMock.state.pipeline.flowControl = {
      barriers: [
        {
          identifier: 'demoId',
          name: 'demoName',
          stages: [
            {
              name: 'demoStageName'
            },
            {
              name: 'demoStageName2'
            }
          ]
        },
        {
          identifier: 'demoId1',
          name: 'demoName1',
          mode: 'Add'
        } as any
      ]
    }
    const { container, getByText } = render(<WrapperComponent />)
    //delete
    const listTrash = container.querySelectorAll('[data-icon="main-trash"]')
    fireEvent.click(listTrash[1])

    expect(container.querySelectorAll('[data-icon="main-trash"]').length).toBe(1)

    //add new barrier
    fireEvent.click(getByText('pipeline.barriers.addBarrier'))
    fireEvent.change(container.querySelector('input[name="barriers[1].name"]')!, { target: { value: 'demoId' } })
    await waitFor(() => fireEvent.click(getByText('pipeline.barriers.syncBarriers')))

    expect(container.querySelectorAll('[data-icon="main-trash"]').length).toBe(2)
  })
})
