import React from 'react'
import userEvent from '@testing-library/user-event'
import { render, waitFor, findByText } from '@testing-library/react'

import { Formik, MultiTypeInputType, RUNTIME_INPUT_VALUE } from '@harness/uicore'
import { noop } from 'lodash-es'

import * as cdNg from 'services/cd-ng'

import { TestWrapper, queryByNameAttribute, doConfigureOptionsTesting } from '@common/utils/testUtils'
import SelectAsgName from '../AsgAutoScalingGroup'
import { autoScaling } from './mock/Aws.mock'

jest.mock('services/cd-ng', () => ({
  useAutoScalingGroups: jest.fn().mockImplementation(() => {
    return { data: autoScaling, loading: false, refetch: jest.fn() }
  })
}))

const initialValues = {
  asgName: 'AMI-BASE-ASG-TODOLIST'
}

const initialValuesRuntime = {
  asgName: RUNTIME_INPUT_VALUE
}

const accountId = 'testAccount'
const orgIdentifier = 'testOrg'
const projectIdentifier = 'testProject'

const TEST_PATH_PARAMS = {
  accountId,
  orgIdentifier,
  projectIdentifier,
  pipelineIdentifier: 'testPipeline',
  executionIdentifier: 'testExec'
}
describe('<SelectAsgName /> tests', () => {
  beforeEach(() => jest.clearAllMocks())

  test('should render SelectAsgName select field', async () => {
    const { container } = render(
      <TestWrapper pathParams={TEST_PATH_PARAMS}>
        <Formik initialValues={initialValues} onSubmit={noop} formName="TestWrapper">
          <SelectAsgName
            name="asgName"
            allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]}
          />
        </Formik>
      </TestWrapper>
    )
    const asgNameField = queryByNameAttribute('asgName', container)
    expect(asgNameField).toBeInTheDocument()
    await userEvent.click(asgNameField!)
    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs.length).toBe(1)

    const dropdownPortalDiv = portalDivs[0] as HTMLElement

    expect(dropdownPortalDiv).toBeInTheDocument()
  })
  test('should render SelectAsgName, loading', async () => {
    jest.spyOn(cdNg, 'useAutoScalingGroups').mockImplementation((): any => {
      return { loading: true, data: null, refetch: () => jest.fn() }
    })
    const { container } = render(
      <TestWrapper pathParams={TEST_PATH_PARAMS}>
        <Formik initialValues={initialValues} onSubmit={noop} formName="TestWrapper">
          <SelectAsgName
            name="asgName"
            allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]}
          />
        </Formik>
      </TestWrapper>
    )
    const asgNameField = queryByNameAttribute('asgName', container)
    expect(asgNameField).toBeInTheDocument()
    await userEvent.click(asgNameField!)
    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs.length).toBe(1)

    const dropdownPortalDiv = portalDivs[0] as HTMLElement
    const loadingField = await findByText(dropdownPortalDiv!, 'common.loadingFieldOptions')
    expect(loadingField).toBeInTheDocument()
  })
  test('should render SelectAsgName, runtime', async () => {
    const { container } = render(
      <TestWrapper pathParams={TEST_PATH_PARAMS}>
        <Formik initialValues={initialValuesRuntime} onSubmit={noop} formName="TestWrapper">
          <SelectAsgName
            name="asgName"
            allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]}
          />
        </Formik>
      </TestWrapper>
    )
    const modals = document.getElementsByClassName('bp3-dialog')
    expect(modals.length).toBe(0)
    const asgNameField = queryByNameAttribute('asgName', container) as HTMLInputElement
    expect(asgNameField).toBeInTheDocument()
    expect(asgNameField).toHaveValue(RUNTIME_INPUT_VALUE)
    const cogAsgNameInstanceCount = document.getElementById('configureOptions_asgName')
    await userEvent.click(cogAsgNameInstanceCount!)
    await waitFor(() => expect(modals.length).toBe(1))
    const newAsgNameCountCOGModal = modals[0] as HTMLElement
    await doConfigureOptionsTesting(newAsgNameCountCOGModal, asgNameField!)
    expect(asgNameField).toHaveValue('<+input>.regex(<+input>.includes(/test/))')
  })
})
