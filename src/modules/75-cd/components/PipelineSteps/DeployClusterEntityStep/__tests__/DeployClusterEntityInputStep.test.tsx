/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'

import * as Formik from 'formik'
import { MultiTypeInputType } from '@harness/uicore'

import { TestWrapper } from '@modules/10-common/utils/testUtils'
import routes from '@modules/10-common/RouteDefinitionsV2'
import { StepViewType } from '@modules/70-pipeline/components/AbstractSteps/Step'

import DeployClusterEntityInputStep from '../DeployClusterEntityInputStep'
import { clusterArr } from './mocks'

const initialValues = {
  environment: 'env1'
}
const PATH = routes.toEnvironmentDetails({
  accountId: ':accountId',
  orgIdentifier: ':orgIdentifier',
  projectIdentifier: ':projectIdentifier',
  module: 'cd',
  environmentIdentifier: 'env1'
})

const PATH_PARAMS = {
  accountId: 'testAccount',
  orgIdentifier: 'testOrg',
  projectIdentifier: 'testProject',
  module: 'cd',
  environmentIdentifier: 'env1'
}

jest.mock('services/cd-ng', () => ({
  useGetClusterList: jest.fn().mockImplementation(() => {
    return { data: { data: { content: [...clusterArr] }, loading: false }, refetch: jest.fn() }
  })
}))
describe('DeployClusterentity input step tests', () => {
  const useFormikContextMock = jest.spyOn(Formik, 'useFormikContext')
  beforeEach(() => {
    jest.clearAllMocks()

    useFormikContextMock.mockReturnValue({
      values: initialValues,
      setValues: jest.fn(),
      setFieldValue: jest.fn()
    } as unknown as any)
  })

  test('initial render when gitOps Cluster is runtime', async () => {
    const { findByText } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <DeployClusterEntityInputStep
          initialValues={{
            environmentRef: '',
            deployToAll: false,
            gitOpsClusters: []
          }}
          isMultipleCluster={true}
          allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]}
          readonly={false}
          stepViewType={StepViewType.DeploymentForm}
          deployToAllClusters={false}
          showEnvironmentsSelectionInputField={false}
          environmentIdentifier={'Prod'}
          inputSetData={
            {
              template: {
                deployToAll: '<+input>',
                gitOpsClusters: '<+input>'
              },
              path: 'stages[0].stage.spec.environment'
            } as any
          }
        />
      </TestWrapper>
    )

    expect(await findByText('pipeline.specifyGitOpsClusters')).toBeInTheDocument()
    const allClstrsTxt = await findByText('common.allClusters')
    expect(allClstrsTxt).toBeInTheDocument()
  })

  test('initial render when gitOps Cluster is runtime and is not multiClusters', async () => {
    const { findByText } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <DeployClusterEntityInputStep
          initialValues={{
            environmentRef: '',
            deployToAll: false,
            gitOpsClusters: [
              {
                identifier: 'test'
              }
            ]
          }}
          isMultipleCluster={false}
          allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]}
          readonly={false}
          stepViewType={StepViewType.DeploymentForm}
          deployToAllClusters={false}
          showEnvironmentsSelectionInputField={false}
          environmentIdentifier={'Prod'}
          inputSetData={
            {
              template: {
                deployToAll: '<+input>',
                gitOpsClusters: '<+input>'
              },
              path: 'stages[0].stage.spec.environment'
            } as any
          }
        />
      </TestWrapper>
    )

    expect(await findByText('pipeline.specifyGitOpsClusters')).toBeInTheDocument()
  })

  test('when clusters are preselected', async () => {
    useFormikContextMock.mockReturnValue({
      values: {
        ...initialValues,
        gitOpsClusters: [
          {
            name: 'incluster',
            identifier: 'incluster',
            value: 'incluster',
            agentIdentifier: 'syncstepqaagent'
          }
        ] as any
      },
      setValues: jest.fn(),
      setFieldValue: jest.fn()
    } as unknown as any)
    const { getByText } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <DeployClusterEntityInputStep
          initialValues={{
            environmentRef: 'Prod',
            deployToAll: false,
            gitOpsClusters: [
              {
                name: 'incluster',
                value: 'incluster',
                identifier: 'incluster',
                agentIdentifier: 'syncstepqaagent'
              }
            ] as any
          }}
          isMultipleCluster={true}
          allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]}
          readonly={false}
          stepViewType={StepViewType.DeploymentForm}
          deployToAllClusters={false}
          showEnvironmentsSelectionInputField={false}
          environmentIdentifier={'Prod'}
          inputSetData={
            {
              template: {
                deployToAll: '<+input>',
                gitOpsClusters: '<+input>'
              },
              path: 'stages[0].stage.spec.environment'
            } as any
          }
        />
      </TestWrapper>
    )

    expect(getByText('PROJECT')).toBeVisible()
    expect(getByText('1')).toBeVisible()

    fireEvent.click(getByText('PROJECT'))

    waitFor(() => {
      expect(getByText('entityReference.apply')).not.toBeDisabled()
    })
  })

  test('when clusterList is empty', async () => {
    jest.mock('services/cd-ng', () => ({
      useGetClusterList: jest.fn().mockReturnValue({
        data: {
          content: []
        },
        refetch: jest.fn()
      } as any)
    }))

    const { findByText } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <DeployClusterEntityInputStep
          initialValues={{
            environmentRef: '',
            deployToAll: false,
            gitOpsClusters: []
          }}
          isMultipleCluster={true}
          allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]}
          readonly={false}
          stepViewType={StepViewType.DeploymentForm}
          deployToAllClusters={false}
          showEnvironmentsSelectionInputField={false}
          environmentIdentifier={'Prod'}
          inputSetData={
            {
              template: {
                deployToAll: '<+input>',
                gitOpsClusters: '<+input>'
              },
              path: 'stages[0].stage.spec.environment'
            } as any
          }
        />
      </TestWrapper>
    )
    expect(await findByText('pipeline.specifyGitOpsClusters')).toBeInTheDocument()
  })
})
