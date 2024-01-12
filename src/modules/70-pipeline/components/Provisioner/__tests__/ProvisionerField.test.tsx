/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { Formik } from '@harness/uicore'
import { TestWrapper } from '@common/utils/testUtils'

import ProvisionerField from '../ProvisionerField'

describe('<ProvisionerField /> tests', () => {
  beforeEach(() => jest.clearAllMocks())

  test('should render Provisioner field', async () => {
    const { container } = render(
      <TestWrapper>
        <Formik initialValues={{ provisioner: '<+input>' }} onSubmit={() => undefined} formName="TestWrapper">
          <ProvisionerField name="provisioner" isReadonly />
        </Formik>
      </TestWrapper>
    )

    const checkbox = container.querySelector('input[type="checkbox"]')
    const provField = container.querySelector('input[name="provisioner"]')
    expect(checkbox).toBeChecked()
    expect(provField).toBeDisabled()
    expect(provField).toBeInTheDocument()

    fireEvent.click(checkbox!)
    expect(provField).not.toBeInTheDocument()

    expect(checkbox).not.toBeChecked()
  })
})
