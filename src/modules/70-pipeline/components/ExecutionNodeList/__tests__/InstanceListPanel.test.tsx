/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, RenderResult, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '@common/utils/testUtils'
import type { ExecutionContextParams } from '@pipeline/context/ExecutionContext'
import * as executionContext from '@pipeline/context/ExecutionContext'
import { InstanceListPanel } from '../InstanceListPanel'
import { executionContextMock, executionContextMockWithChildGraph } from './mock'
import { CollapsedNodeProvider } from '../CollapsedNodeStore'

const renderInstanceListPanel = (): RenderResult =>
  render(
    <TestWrapper getString={(key: string, vars: Record<string, string>) => `${key} ${Object.values(vars).join()}`}>
      <CollapsedNodeProvider>
        <InstanceListPanel />
      </CollapsedNodeProvider>
    </TestWrapper>
  )

const getNodeNames = (): string[] => {
  const { selectedCollapsedNodeId, pipelineExecutionDetail } = executionContextMock as unknown as ExecutionContextParams
  const { nodeMap = {}, nodeAdjacencyListMap = {} } = pipelineExecutionDetail?.executionGraph ?? {}

  return nodeAdjacencyListMap[selectedCollapsedNodeId].children!.map(id => nodeMap[id].name) as string[]
}

describe('InstanceListPanel', () => {
  beforeEach(() => {
    jest.spyOn(executionContext, 'useExecutionContext').mockReturnValue(executionContextMock as any)
  })

  test('should render correct total count', () => {
    renderInstanceListPanel()

    expect(screen.getByTestId('nodes-total-count')).toHaveTextContent('9')
  })

  test('should find and use the correct execution graph based on selectedCollapsedNodeId', () => {
    jest.spyOn(executionContext, 'useExecutionContext').mockReturnValue(executionContextMockWithChildGraph as any)

    renderInstanceListPanel()
    expect(screen.getByTestId('nodes-total-count')).toHaveTextContent('10')
  })

  test('should filter nodes based on search term', async () => {
    renderInstanceListPanel()

    const nodeA = screen.getByText('Shell Script_1_0_1')
    const nodeB = screen.getByText('Shell Script_1_0_2')

    expect(nodeA).toBeInTheDocument()
    expect(nodeB).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText('Search')

    expect(searchInput).toBeInTheDocument()

    await userEvent.clear(searchInput)
    await userEvent.type(searchInput, 'Shell Script_1_0_1')

    await waitFor(() => {
      expect(nodeA).toBeInTheDocument()
      expect(nodeB).not.toBeInTheDocument()
    })
  })

  test('should filter nodes based on status', async () => {
    const { baseElement } = renderInstanceListPanel()

    const nodeWithStatusSuccess = screen.getByText('Shell Script_1_0_1')
    expect(nodeWithStatusSuccess).toBeInTheDocument()

    const statusDropdown = screen.getByTestId('dropdown-button')
    expect(statusDropdown).toBeInTheDocument()
    await userEvent.click(statusDropdown)

    const statusMenu = baseElement.querySelector('.bp3-menu')
    await waitFor(() => {
      expect(statusMenu).toBeInTheDocument()
    })

    const successItem = within(statusMenu as HTMLElement).getByText(/^success$/i)
    await userEvent.click(successItem)
    await waitFor(() => {
      expect(screen.getByTestId('dropdown-value')).toHaveTextContent(/^success$/i)
    })

    expect(nodeWithStatusSuccess).toBeInTheDocument()

    await userEvent.click(statusDropdown)
    await waitFor(() => {
      expect(statusMenu).toBeInTheDocument()
    })

    const failedItem = within(statusMenu as HTMLElement).getByText(/^failed$/i)
    await userEvent.click(failedItem)
    await waitFor(() => {
      expect(screen.getByTestId('dropdown-value')).toHaveTextContent(/^failed$/i)
    })

    expect(nodeWithStatusSuccess).not.toBeInTheDocument()
  })

  test('checking/unchecking a node works as expected', async () => {
    const { container } = renderInstanceListPanel()
    const nodeName = getNodeNames().at(0)
    const checkbox = container.querySelector(`input[name="instanceCheckbox-${nodeName}"]`)

    expect(checkbox).toBeInTheDocument()
    await userEvent.click(checkbox!)
    expect(checkbox).toBeChecked()
    await userEvent.click(checkbox!)
    expect(checkbox).not.toBeChecked()
  })

  test('checking every node should check global checkbox', async () => {
    const { container } = renderInstanceListPanel()
    const nodeNames = getNodeNames()

    nodeNames.forEach(async nodeName => {
      const checkbox = container.querySelector(`input[name="instanceCheckbox-${nodeName}"]`)

      expect(checkbox).toBeInTheDocument()
      await userEvent.click(checkbox!)
      expect(checkbox).toBeChecked()
    })

    const globalCheckbox = container.querySelector(`input[name="globalInstancesCheckbox"]`)
    expect(globalCheckbox).toBeInTheDocument()
    await waitFor(() => expect(globalCheckbox).toBeChecked())
  })

  test('checking some nodes should make global checkbox indeterminate', async () => {
    const { container } = renderInstanceListPanel()
    const nodeNames = getNodeNames()
    const someNodeNames = nodeNames.slice(0, Math.floor(nodeNames.length / 2))

    someNodeNames.forEach(async nodeName => {
      const checkbox = container.querySelector(`input[name="instanceCheckbox-${nodeName}"]`)

      expect(checkbox).toBeInTheDocument()
      await userEvent.click(checkbox!)
      expect(checkbox).toBeChecked()
    })

    const globalCheckbox = container.querySelector(`input[name="globalInstancesCheckbox"]`)
    expect(globalCheckbox).toBeInTheDocument()
    expect(globalCheckbox).not.toBeChecked()
    await waitFor(() => expect(globalCheckbox).toBePartiallyChecked())
  })

  test('checking/unchecking global checkbox should check/uncheck all node checkboxes', async () => {
    const { container } = renderInstanceListPanel()
    const globalCheckbox = container.querySelector(`input[name="globalInstancesCheckbox"]`)

    expect(globalCheckbox).toBeInTheDocument()
    await userEvent.click(globalCheckbox!)

    await waitFor(() => {
      expect(globalCheckbox).toBeChecked()
    })

    const nodeNames = getNodeNames()

    nodeNames.forEach(nodeName => {
      const checkbox = container.querySelector(`input[name="instanceCheckbox-${nodeName}"]`)

      expect(checkbox).toBeInTheDocument()
      expect(checkbox).toBeChecked()
    })

    await userEvent.click(globalCheckbox!)

    await waitFor(() => {
      expect(globalCheckbox).not.toBeChecked()
    })

    nodeNames.forEach(nodeName => {
      const checkbox = container.querySelector(`input[name="instanceCheckbox-${nodeName}"]`)

      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })
  })
})
