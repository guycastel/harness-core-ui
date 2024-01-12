/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Formik } from '@harness/uicore'
import { TestWrapper, queryByNameAttribute } from '@common/utils/testUtils'
import type { ExecutionWrapperConfig } from 'services/cd-ng'

import { provisionersMock, stepGroupTemplateProvisioner } from './mock'

import ProvisionerSelectField from '../ProvisionerSelect'

describe('<ProvisionerSelectField /> tests', () => {
  beforeEach(() => jest.clearAllMocks())

  test('should render Provisioner select field', async () => {
    const { container } = render(
      <TestWrapper>
        <Formik initialValues={{ provisioner: 'test1' }} onSubmit={() => undefined} formName="TestWrapper">
          <ProvisionerSelectField
            name="provisioner"
            provisioners={[...provisionersMock] as ExecutionWrapperConfig[]}
            path={''}
          />
        </Formik>
      </TestWrapper>
    )

    const provisionerSelectField = queryByNameAttribute('provisioner', container)
    expect(provisionerSelectField).toBeInTheDocument()
    await userEvent.click(provisionerSelectField!)
    const provisionerList = document.querySelectorAll('li[class*="Select--menuItem')
    await waitFor(() => expect(provisionerList).toHaveLength(2))
  })
  test('should render Provisioner select field from stepGroupTemplate', async () => {
    const { container } = render(
      <TestWrapper>
        <Formik initialValues={{ provisioner: 'test1' }} onSubmit={() => undefined} formName="TestWrapper">
          <ProvisionerSelectField
            name="provisioner"
            provisioners={[...provisionersMock, stepGroupTemplateProvisioner] as ExecutionWrapperConfig[]}
            path={''}
          />
        </Formik>
      </TestWrapper>
    )

    const provisionerSelectField = queryByNameAttribute('provisioner', container)
    expect(provisionerSelectField).toBeInTheDocument()
    await userEvent.click(provisionerSelectField!)
    const provisionerList = document.querySelectorAll('li[class*="Select--menuItem')
    await waitFor(() => expect(provisionerList).toHaveLength(5))
  })
})
