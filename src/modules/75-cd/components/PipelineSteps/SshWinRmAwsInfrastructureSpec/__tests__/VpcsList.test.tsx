import React from 'react'
import userEvent from '@testing-library/user-event'
import { render, waitFor, screen, queryByText } from '@testing-library/react'

import { Formik, MultiTypeInputType, RUNTIME_INPUT_VALUE } from '@harness/uicore'

import { TestWrapper, queryByNameAttribute } from '@common/utils/testUtils'
import SelectVpcs from '../VpcsList'
import { vpcsMock } from './mock/Aws.mock'

jest.mock('services/cd-ng', () => ({
  useVpcs: jest.fn().mockImplementation(() => {
    return { data: vpcsMock, loading: false, refetch: jest.fn() }
  })
}))

const initialValues = {
  vpcs: ['1', '2']
}

const initialValuesRuntime = {
  vpcs: RUNTIME_INPUT_VALUE
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

describe('<SelectVpcs /> tests', () => {
  beforeEach(() => jest.clearAllMocks())

  test('should render SelectVpcs select field', async () => {
    const { container } = render(
      <TestWrapper pathParams={TEST_PATH_PARAMS}>
        <Formik initialValues={initialValues} onSubmit={() => undefined} formName="TestWrapper">
          <SelectVpcs name="vpcs" allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME]} />
        </Formik>
      </TestWrapper>
    )

    expect(container.querySelector('[data-testid="aws-infra-vpcs"')).toBeInTheDocument()

    await userEvent.click(container.querySelector('input[class*="bp3-input"')!)

    const multiselectInputField = container.querySelector('.bp3-multi-select')
    expect(multiselectInputField).toBeInTheDocument()

    await userEvent.click(await screen.findByText('vpcs1'))

    expect(queryByText(container, 'vpcs1')).toBeInTheDocument()
    expect(queryByText(container, 'vpcs2')).toBeInTheDocument()

    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs.length).toBe(1)

    await userEvent.click(multiselectInputField as HTMLElement)
    await waitFor(() => expect(portalDivs.length).toBe(1))

    const dropdownPortalDiv = portalDivs[0]
    const selectListMenu = dropdownPortalDiv.querySelector('.bp3-menu')
    const optionsMenu = dropdownPortalDiv.querySelectorAll('.MultiSelect--menuItem')
    expect(optionsMenu).toHaveLength(3)
    await userEvent.click(queryByText(selectListMenu as HTMLElement, 'vpcs3')!)
    expect(queryByText(selectListMenu as HTMLElement, 'vpcs1')).toBeInTheDocument()
    expect(queryByText(selectListMenu as HTMLElement, 'vpcs2')).toBeInTheDocument()
    expect(queryByText(selectListMenu as HTMLElement, 'vpcs3')).toBeInTheDocument()
  })
  test('should render SelectVpcs select field runtime', async () => {
    const { container, getByText } = render(
      <TestWrapper pathParams={TEST_PATH_PARAMS}>
        <Formik initialValues={initialValuesRuntime} onSubmit={() => undefined} formName="TestWrapper">
          <SelectVpcs
            name="vpcs"
            allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]}
          />
        </Formik>
      </TestWrapper>
    )

    const vpcsInput = queryByNameAttribute('vpcs', container)
    await userEvent.click(vpcsInput!)
    const runtimeInputIcon = container.querySelector('span[data-icon="runtime-input"]')
    await userEvent.click(runtimeInputIcon!)
    await userEvent.click(getByText('Fixed value'))
    const fixedInputIcon = container.querySelector('span[data-icon="fixed-input"]')
    expect(fixedInputIcon).toBeInTheDocument()
    await userEvent.click(fixedInputIcon!)
    await userEvent.click(getByText('Expression'))
    const expressionInputIcon = container.querySelector('span[data-icon="expression-input"]')
    expect(expressionInputIcon).toBeInTheDocument()
  })
})
