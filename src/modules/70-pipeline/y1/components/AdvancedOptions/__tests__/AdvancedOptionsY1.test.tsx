/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { TestWrapper } from '@common/utils/testUtils'
import { AdvancedOptionsY1 } from '../AdvancedOptionsY1'

const mockGetCallFunction = jest.fn()
jest.mock('services/portal', () => ({
  useGetDelegateSelectorsUpTheHierarchy: jest.fn().mockImplementation(args => {
    mockGetCallFunction(args)
    return []
  }),
  useGetDelegateSelectorsUpTheHierarchyV2: jest.fn().mockImplementation(args => {
    mockGetCallFunction(args)
    return []
  })
}))

describe('<AdvancedOptions/> tests', () => {
  const baseProps = {
    pipeline: {
      version: 1,
      kind: 'pipeline',
      spec: {
        stages: []
      },
      labels: {
        orgId: '<+org.name>'
      },
      timeout: '10m',
      options: {
        delegates: ['kubernetes-delegate-preqa']
      }
    },
    onApplyChanges: jest.fn(),
    onDiscard: jest.fn()
  }

  test('basic element assertions', async () => {
    render(
      <TestWrapper>
        <AdvancedOptionsY1 {...baseProps} />
      </TestWrapper>
    )
    expect(await screen.findByText('pipeline.advancedOptions')).toBeInTheDocument()
    expect(await screen.findByText('common.discard')).toBeInTheDocument()
    expect(await screen.findByText('pipeline.delegate.DelegateSelectorOptional')).toBeInTheDocument()
    expect(await screen.findByText('pipeline.executionSettings')).toBeInTheDocument()
  })

  test('Add execution labels and apply should work as expected when values are changed', async () => {
    const { container, getByText } = render(
      <TestWrapper>
        <AdvancedOptionsY1 {...baseProps} />
      </TestWrapper>
    )

    fireEvent.change(container.querySelector('input[name="timeout"]')!, { target: { value: '30m' } })

    await act(async () => {
      fireEvent.click(getByText('plusAdd'))
    })

    fireEvent.change(container.querySelector('input[name="labels[1].key"]')!, { target: { value: 'executor' } })
    fireEvent.change(container.querySelector('input[name="labels[1].value"]')!, {
      target: { value: '<+pipeline.triggeredBy.name>' }
    })

    await act(async () => {
      fireEvent.click(getByText('applyChanges'))
    })
    expect(baseProps.onApplyChanges).toBeCalledWith({
      version: 1,
      kind: 'pipeline',
      spec: {
        stages: []
      },
      timeout: '30m',
      labels: {
        orgId: '<+org.name>',
        executor: '<+pipeline.triggeredBy.name>'
      },
      options: {
        delegates: ['kubernetes-delegate-preqa']
      }
    })
  })

  test('Empty state sanitised data - onApplyChanges', async () => {
    const { container, getByText } = render(
      <TestWrapper>
        <AdvancedOptionsY1 {...baseProps} />
      </TestWrapper>
    )

    fireEvent.change(container.querySelector('input[name="timeout"]')!, { target: { value: '' } })

    fireEvent.click(container.querySelector('span[data-icon="main-trash"]')!)

    await act(async () => {
      fireEvent.click(getByText('applyChanges'))
    })
    expect(baseProps.onApplyChanges).toBeCalledWith({
      version: 1,
      kind: 'pipeline',
      spec: {
        stages: []
      },
      options: {
        delegates: ['kubernetes-delegate-preqa']
      }
    })
  })
})
