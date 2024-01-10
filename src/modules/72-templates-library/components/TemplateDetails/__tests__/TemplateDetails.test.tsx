/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { defaultTo, unset } from 'lodash-es'
import produce from 'immer'
import { TestWrapper } from '@common/utils/testUtils'
import { mockTemplates } from '@templates-library/TemplatesTestHelper'
import templateFactory from '@templates-library/components/Templates/TemplatesFactory'
import { mockTemplatesInputYaml } from '@pipeline/components/PipelineStudio/PipelineStudioTestHelper'
import { StepTemplate } from '@templates-library/components/Templates/StepTemplate/StepTemplate'
import * as commonHooks from '@common/hooks'
import { templatePathProps } from '@common/utils/routeUtils'
import routes from '@common/RouteDefinitions'
import { mockBranches } from '@gitsync/components/GitSyncForm/__tests__/mockdata'
import { TemplateDetails, TemplateDetailsProps } from '../TemplateDetails'

const gitAppStoreValues = {
  isGitSyncEnabled: false,
  isGitSimplificationEnabled: true,
  supportingGitSimplification: true,
  gitSyncEnabledOnlyForFF: false,
  supportingTemplatesGitx: true
}

const TEST_PATH = routes.toTemplateStudio(templatePathProps)
const TEST_PATH_PARAMS = {
  templateIdentifier: '-1',
  accountId: 'accountId',
  orgIdentifier: 'default',
  projectIdentifier: 'projectId',
  module: 'cd',
  templateType: 'Step'
}

const useGetResolvedTemplateMock = jest.fn()

jest.mock('@templates-library/components/TemplateInputs/TemplateInputs', () => ({
  ...jest.requireActual('@templates-library/components/TemplateInputs/TemplateInputs'),
  TemplateInputs: () => {
    return <div className="template-inputs-mock"></div>
  }
}))

jest.mock('services/template-ng', () => ({
  useGetResolvedTemplate: jest.fn().mockImplementation(() => ({
    mutate: useGetResolvedTemplateMock,
    cancel: jest.fn(),
    loading: false
  })),
  useGetTemplateInputSetYaml: jest
    .fn()
    .mockImplementation(() => ({ data: mockTemplatesInputYaml, refetch: jest.fn(), error: null, loading: false })),
  useListTemplateUsage: () => ({
    loading: false,
    data: {},
    refetch: jest.fn()
  }),
  useGetTemplateMetadataList: jest.fn().mockImplementation(() => ({
    mutate: jest.fn(() => Promise.resolve(mockTemplates)),
    cancel: jest.fn(),
    loading: false
  })),
  useGetTemplateList: jest.fn().mockImplementation(() => ({
    mutate: jest.fn(() => Promise.resolve(mockTemplates)),
    cancel: jest.fn(),
    loading: false
  }))
}))

const fetchBranches = jest.fn(() => Promise.resolve(mockBranches))
jest.mock('services/cd-ng', () => ({
  useGetListOfBranchesByRefConnectorV2: jest.fn().mockImplementation(() => {
    return { data: mockBranches, refetch: fetchBranches }
  }),
  useListAllEntityUsageByFqn: () => ({
    loading: false,
    data: {},
    refetch: jest.fn()
  })
}))

function ComponentWrapper(props: TemplateDetailsProps): React.ReactElement {
  const location = useLocation()
  return (
    <React.Fragment>
      <TemplateDetails {...props} />
      <div data-testid="location">{`${location.pathname}${location.search}`}</div>
    </React.Fragment>
  )
}

describe('<TemplateDetails /> git experience', () => {
  afterEach(() => {
    useGetResolvedTemplateMock.mockReset()
  })

  test('Resolved Template POST API sends parent entity context in query params only when default behaviour is there', () => {
    const baseProps: TemplateDetailsProps = {
      template: defaultTo(mockTemplates?.data?.content?.[0], {}),
      storeMetadata: {
        connectorRef: 'connectorRefTest',
        storeType: 'REMOTE',
        branch: 'branchTest',
        repoName: 'manju-test-template-qq-12344'
      }
    }

    render(
      <TestWrapper path={TEST_PATH} pathParams={TEST_PATH_PARAMS} defaultAppStoreValues={gitAppStoreValues}>
        <ComponentWrapper {...baseProps} />
      </TestWrapper>
    )

    expect(useGetResolvedTemplateMock).toHaveBeenCalledWith(
      { templatesResolvedYaml: true },
      {
        headers: { 'Load-From-Cache': 'true' },
        pathParams: undefined,
        queryParams: {
          accountIdentifier: 'kmpySmUISimoRrJL6NL73w',
          branch: 'branchTest',
          getDefaultFromOtherRepo: true,
          orgIdentifier: 'default',
          parentEntityAccountIdentifier: 'accountId',
          parentEntityConnectorRef: 'connectorRefTest',
          parentEntityOrgIdentifier: 'default',
          parentEntityProjectIdentifier: 'projectId',
          parentEntityRepoName: 'manju-test-template-qq-12344',
          projectIdentifier: 'Templateproject',
          repoIdentifier: undefined,
          versionLabel: 'v4'
        }
      }
    )
  })

  test('Resolved Template POST API does not send parent entity context in query params for inline templates', async () => {
    const baseProps: TemplateDetailsProps = {
      template: defaultTo(mockTemplates?.data?.content?.[0], {}),
      storeMetadata: undefined
    }

    render(
      <TestWrapper path={TEST_PATH} pathParams={TEST_PATH_PARAMS} defaultAppStoreValues={gitAppStoreValues}>
        <ComponentWrapper {...baseProps} />
      </TestWrapper>
    )

    expect(useGetResolvedTemplateMock).toHaveBeenCalledWith(
      { templatesResolvedYaml: true },
      {
        headers: { 'Load-From-Cache': 'true' },
        pathParams: undefined,
        queryParams: {
          accountIdentifier: 'kmpySmUISimoRrJL6NL73w',
          branch: undefined,
          getDefaultFromOtherRepo: true,
          orgIdentifier: 'default',
          parentEntityConnectorRef: undefined,
          parentEntityRepoName: undefined,
          projectIdentifier: 'Templateproject',
          repoIdentifier: undefined,
          versionLabel: 'v4'
        }
      }
    )
  })
})

describe('<TemplateDetails /> tests', () => {
  beforeAll(() => {
    templateFactory.registerTemplate(new StepTemplate())
  })

  const baseProps = {
    template: defaultTo(mockTemplates?.data?.content?.[0], {})
  }
  test('should render component properly', async () => {
    const { getByText } = render(
      <TestWrapper>
        <ComponentWrapper {...baseProps} />
      </TestWrapper>
    )

    expect(getByText('manju-test-template-qq-12344')).toBeDefined()
    expect(getByText('templatesLibrary.openInTemplateStudio')).toBeDefined()
    expect(getByText('details')).toBeDefined()
    expect(getByText('activityLog')).toBeDefined()
    expect(getByText('Manual Approval')).toBeDefined()
    expect(getByText('description')).toBeDefined()
    expect(getByText('tagsLabel')).toBeDefined()
    expect(getByText('Internal 1')).toBeDefined()
    expect(getByText('BLUE')).toBeDefined()
    expect(getByText('Tag A')).toBeDefined()
    expect(getByText('pipeline.templateInputs')).toBeDefined()
    expect(getByText('common.yaml')).toBeDefined()
    expect(getByText('templatesLibrary.referencedBy')).toBeDefined()
  })

  test('should render no references when reference by tab is selected', async () => {
    const { getByText, queryByText, findByText } = render(
      <TestWrapper>
        <ComponentWrapper {...baseProps} />
      </TestWrapper>
    )

    await findByText('manju-test-template-qq-12344')

    await act(async () => {
      fireEvent.click(queryByText('templatesLibrary.referencedBy')!)
    })

    expect(getByText('common.noRefData')).toBeDefined()
  })

  test('should show selected version label', async () => {
    const { getByTestId, findByText } = render(
      <TestWrapper defaultAppStoreValues={{ isGitSyncEnabled: true }}>
        <ComponentWrapper {...baseProps} isStandAlone />
      </TestWrapper>
    )
    await findByText('manju-test-template-qq-12344')

    const dropValue = getByTestId('dropdown-value')
    expect(dropValue).toHaveTextContent('v4COMMON.STABLE')
  })

  test('should show always use stable version of the template ', async () => {
    const newBaseProps = produce(baseProps, draft => {
      unset(draft, 'template.versionLabel')
    })
    const { getByTestId, findByText } = render(
      <TestWrapper>
        <ComponentWrapper {...newBaseProps} isStandAlone />
      </TestWrapper>
    )
    await findByText('manju-test-template-qq-12344')
    const dropValue = getByTestId('dropdown-value')
    expect(dropValue).toHaveTextContent('templatesLibrary.alwaysUseStableVersion')
  })

  test('should open template studio on clicking open in template studio', async () => {
    const { getByRole, getByTestId } = render(
      <TestWrapper>
        <ComponentWrapper {...baseProps} />
      </TestWrapper>
    )

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'templatesLibrary.openInTemplateStudio' }))
    })
    expect(getByTestId('location')).toMatchInlineSnapshot(`
      <div
        data-testid="location"
      >
        /account/kmpySmUISimoRrJL6NL73w/home/orgs/default/projects/Templateproject/setup/resources/template-studio/Step/template/manjutesttemplate/?versionLabel=v4
      </div>
    `)
  })

  test('should match snapshot when error occurs in useMutateAsGet', async () => {
    jest.spyOn(commonHooks, 'useMutateAsGet').mockImplementation(() => {
      return { loading: false, error: 'Some error occurred', data: undefined, refetch: jest.fn() } as any
    })
    const { getByText } = render(
      <TestWrapper>
        <ComponentWrapper {...baseProps} />
      </TestWrapper>
    )
    expect(getByText('We cannot perform your request at the moment. Please try again.')).toBeDefined()
  })
})
