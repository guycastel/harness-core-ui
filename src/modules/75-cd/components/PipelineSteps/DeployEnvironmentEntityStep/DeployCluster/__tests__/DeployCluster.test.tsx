/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import * as Formik from 'formik'

import { MultiTypeInputType } from '@harness/uicore'
import { findByTestId, fireEvent, render, waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { findDialogContainer, TestWrapper } from '@modules/10-common/utils/testUtils'
import routes from '@modules/10-common/RouteDefinitionsV2'

import DeployCluster from '../DeployCluster'

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

const clusters = {
  env1: [
    {
      label: 'cluster11',
      value: 'cluster11',
      agentIdentifier: 'meena'
    },
    {
      label: 'lucas',
      value: 'lucas',
      agentIdentifier: 'lucas'
    }
  ]
}

const initialValues = {
  environment: 'env1',
  infrastructure: 'infra1'
}

jest.mock('services/cd-ng', () => ({
  getClusterListFromSourcePromise: jest.fn().mockImplementation(() =>
    Promise.resolve({
      data: {
        content: [
          {
            clusterRef: 'cluster22',
            orgIdentifier: 'default',
            projectIdentifier: 'MeenaSyncStep',
            agentIdentifier: 'syncstepqaagent',
            accountIdentifier: '1bvyLackQK-Hapk25-Ry4w',
            identifier: 'cluster22',
            envRef: 'env1',
            linkedAt: 1699386562826,
            scopeLevel: 'PROJECT',
            name: 'cluster22',
            tags: {}
          },
          {
            clusterRef: 'cls',
            identifier: 'cls',
            orgIdentifier: 'default',
            projectIdentifier: 'MeenaSyncStep',
            agentIdentifier: 'account.logtest',
            accountIdentifier: '1bvyLackQK-Hapk25-Ry4w',
            envRef: 'env1',
            linkedAt: 1699386562825,
            scopeLevel: 'PROJECT',
            name: 'cls',
            tags: {}
          }
        ],
        totalItems: 2,
        totalPages: 1,
        pageItemCount: 10,
        pageIndex: 0,
        pageSize: 10
      }
    })
  ),
  useGetClusterList: jest.fn().mockReturnValue({
    data: {
      data: {
        content: [
          {
            clusterRef: 'cluster22',
            orgIdentifier: 'default',
            projectIdentifier: 'MeenaSyncStep',
            agentIdentifier: 'syncstepqaagent',
            accountIdentifier: '1bvyLackQK-Hapk25-Ry4w',
            envRef: 'env1',
            linkedAt: 1699386562826,
            scope: 'PROJECT',
            name: 'cluster22',
            tags: {}
          },
          {
            clusterRef: 'cls',
            orgIdentifier: 'default',
            projectIdentifier: 'MeenaSyncStep',
            agentIdentifier: 'account.logtest',
            accountIdentifier: '1bvyLackQK-Hapk25-Ry4w',
            envRef: 'env1',
            linkedAt: 1699386562825,
            scope: 'PROJECT',
            name: 'cls',
            tags: {}
          }
        ]
      }
    },
    refetch: jest.fn()
  } as any)
}))

describe('DeployCluster Tests', () => {
  const useFormikContextMock = jest.spyOn(Formik, 'useFormikContext')
  beforeEach(() => {
    jest.clearAllMocks()

    useFormikContextMock.mockReturnValue({
      values: initialValues,
      setValues: jest.fn(),
      setFieldValue: jest.fn()
    } as unknown as any)
  })
  test('initial render', async () => {
    const { findByText } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <DeployCluster
          initialValues={initialValues}
          readonly={false}
          allowableTypes={[MultiTypeInputType.RUNTIME, MultiTypeInputType.FIXED]}
          environmentIdentifier="env1"
          isMultiCluster={true}
        />
      </TestWrapper>
    )

    expect(await findByText('pipeline.specifyGitOpsClusters')).toBeInTheDocument()
    const allClstrsTxt = await findByText('common.allClusters')
    expect(allClstrsTxt).toBeInTheDocument()
  })

  test('when some clusters are selected', async () => {
    const { findByText, getByText } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <DeployCluster
          initialValues={{ ...initialValues, clusters: clusters }}
          readonly={false}
          allowableTypes={[MultiTypeInputType.RUNTIME, MultiTypeInputType.FIXED]}
          environmentIdentifier="env1"
          isMultiCluster={true}
        />
      </TestWrapper>
    )

    expect(await findByText('pipeline.specifyGitOpsClusters')).toBeInTheDocument()

    expect(getByText('cd.agentID: meena')).toBeDefined()
    expect(getByText('cd.agentID: lucas')).toBeDefined()
  })

  test('remove one of the selected clusters', async () => {
    useFormikContextMock.mockReturnValue({
      values: {
        environment: 'env1',
        clusters
      },
      setValues: jest.fn()
    } as unknown as any)
    const { container, findByText, getByText } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <DeployCluster
          initialValues={{
            environment: 'env1',
            clusters
          }}
          readonly={false}
          allowableTypes={[MultiTypeInputType.RUNTIME, MultiTypeInputType.FIXED]}
          environmentIdentifier="env1"
          isMultiCluster={true}
        />
      </TestWrapper>
    )

    expect(await findByText('pipeline.specifyGitOpsClusters')).toBeInTheDocument()
    const removeBtn = await findByTestId(container, 'delete-cluster-cluster11')
    const clstrSection = await findByTestId(container, 'clusterEntity-cluster11')
    fireEvent.click(removeBtn!)

    expect(getByText('cd.pipelineSteps.environmentTab.deleteClusterFromListDialogTitleText')).toBeVisible()

    const removeClstrBtn = getByText('common.remove')

    fireEvent.click(removeClstrBtn!)

    expect(clstrSection).not.toBeInTheDocument()
  })

  test('when cluster is fixed value', async () => {
    const { getByText } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <DeployCluster
          initialValues={{ ...initialValues, cluster: 'test' }}
          readonly={false}
          allowableTypes={[MultiTypeInputType.RUNTIME, MultiTypeInputType.FIXED]}
          environmentIdentifier="env1"
          isMultiCluster={true}
        />
      </TestWrapper>
    )

    expect(getByText('cd.reConfigurePipelineClusters')).toBeDefined()
  })

  test('when cluster is made runtime', async () => {
    const { getByTestId } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <DeployCluster
          initialValues={initialValues}
          readonly={false}
          allowableTypes={[MultiTypeInputType.RUNTIME, MultiTypeInputType.FIXED]}
          environmentIdentifier="env1"
          isMultiCluster={true}
        />
      </TestWrapper>
    )
    const portalDivs = document.getElementsByClassName('bp3-portal')
    expect(portalDivs).toHaveLength(0)

    const clstrMultiTypeBtn = getByTestId('multi-type-button')
    userEvent.click(clstrMultiTypeBtn)
    const runtimeInputText = await screen.findByText('Runtime input')
    expect(runtimeInputText).toBeInTheDocument()
    userEvent.click(runtimeInputText)

    expect(await screen.findByPlaceholderText('<+input>')).toBeVisible()
  })

  test('select a cluster', async () => {
    const { findByText, getByText } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <DeployCluster
          initialValues={{ ...initialValues }}
          readonly={false}
          allowableTypes={[MultiTypeInputType.RUNTIME, MultiTypeInputType.FIXED]}
          environmentIdentifier="env1"
          isMultiCluster={true}
        />
      </TestWrapper>
    )

    expect(await findByText('pipeline.specifyGitOpsClusters')).toBeInTheDocument()
    fireEvent.click(getByText('common.allClusters'))
    waitFor(() => {
      expect(getByText('entityReference.apply')).toBeVisible()
      const dialog = findDialogContainer()

      const content = dialog!.getElementsByClassName('collapeHeaderContent')!

      expect(content).toHaveLength(2)
    })
  })
})
