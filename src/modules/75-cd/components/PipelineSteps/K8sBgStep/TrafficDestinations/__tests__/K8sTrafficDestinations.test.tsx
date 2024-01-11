/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Formik, RUNTIME_INPUT_VALUE, MultiTypeInputType, AllowedTypesWithRunTime } from '@harness/uicore'
import { TestWrapper } from '@common/utils/testUtils'

import TrafficDestinations from '../K8sTrafficDestinations'

const defaultProps = {
  multiTypeFieldSelectorProps: {
    label: 'Destinations',
    disableTypeSelection: false,
    allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME] as AllowedTypesWithRunTime[]
  },
  enableValueConfigureOptions: true,
  defaultValues: {
    stage: 'stageTest',
    host: 'hostTest'
  },
  name: 'destinations',
  expressions: []
}

describe('<TrafficDestinations /> tests', () => {
  beforeEach(() => jest.clearAllMocks())

  test('should render Destinations  field', async () => {
    const { findByTestId } = render(
      <TestWrapper>
        <Formik initialValues={{ destinations: [] }} onSubmit={() => undefined} formName="TestWrapper">
          <TrafficDestinations {...defaultProps} />
        </Formik>
      </TestWrapper>
    )
    const addBtn = await findByTestId('add-destinations')
    await userEvent.click(addBtn)
    expect(addBtn).toBeInTheDocument()
    await userEvent.click(addBtn)
    expect(addBtn).not.toBeInTheDocument()
    const deleteBtn = await findByTestId('remove-destinations-[1]')
    await userEvent.click(deleteBtn)
  })
  test('should render Destinations runtime  field', async () => {
    const { findByTestId } = render(
      <TestWrapper>
        <Formik initialValues={{ destinations: RUNTIME_INPUT_VALUE }} onSubmit={() => undefined} formName="TestWrapper">
          <TrafficDestinations {...defaultProps} />
        </Formik>
      </TestWrapper>
    )

    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs).toHaveLength(0)

    const destinationMultiTypeBtn = await findByTestId('multi-type-button')
    await userEvent.click(destinationMultiTypeBtn)
    await waitFor(() => expect(portalDivs).toHaveLength(2))
    const portalDiv = portalDivs[0] as HTMLElement
    const fixedOption = within(portalDiv).getByText('Fixed value')
    await userEvent.click(fixedOption)
    const addBtn = await findByTestId('add-destinations')
    await userEvent.click(addBtn)
    expect(addBtn).toBeInTheDocument()
  })
})
