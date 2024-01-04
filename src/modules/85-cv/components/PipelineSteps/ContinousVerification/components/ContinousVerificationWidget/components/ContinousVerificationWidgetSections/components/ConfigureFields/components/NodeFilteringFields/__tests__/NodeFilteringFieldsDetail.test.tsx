import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { Formik } from 'formik'
import { TestWrapper } from '@modules/10-common/utils/testUtils'
import NodeFilteringFieldsDetail from '../NodeFilteringFieldsDetail'

describe('NodeFilteringFieldsDetail', () => {
  test('NodeFilteringFieldsDetail should render all the fields as disabled if it is readonly', async () => {
    render(
      <TestWrapper
        defaultFeatureFlagValues={{
          CV_UI_DISPLAY_NODE_REGEX_FILTER: true,
          CV_UI_DISPLAY_SHOULD_USE_NODES_FROM_CD_CHECKBOX: true
        }}
      >
        <Formik initialValues={{}} onSubmit={Promise.resolve}>
          <NodeFilteringFieldsDetail allowableTypes={[]} readonly />
        </Formik>
      </TestWrapper>
    )

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'cv.verifyStep.shouldFailWhenNoAnalysisForMetrics' })).toBeDisabled()
    )

    expect(screen.getByRole('checkbox', { name: 'cv.verifyStep.shouldUseCDNodesLabel' })).toBeDisabled()
    expect(screen.getByPlaceholderText('cv.verifyStep.controlNodePlaceholder')).toBeDisabled()
    expect(screen.getByPlaceholderText('cv.verifyStep.testNodePlaceholder')).toBeDisabled()
  })
})
