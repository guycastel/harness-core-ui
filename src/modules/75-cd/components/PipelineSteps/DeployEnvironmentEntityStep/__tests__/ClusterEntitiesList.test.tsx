/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'

import { findByTestId, fireEvent, render, waitFor, within } from '@testing-library/react'
import { act } from 'react-dom/test-utils'

import { TestWrapper } from '@modules/10-common/utils/testUtils'
import routes from '@modules/10-common/RouteDefinitionsV2'
import ClusterEntitiesList from '../ClusterEntitiesList/ClusterEntitiesList'

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

const clusterProps = {
  loading: false,
  clustersData: [
    {
      name: 'test-cluster1',
      clusterRef: 'test-cluster1',
      agentIdentifier: 'a1'
    },
    {
      name: 'test-cluster2',
      clusterRef: 'test-cluster2',
      agentIdentifier: 'account.a2'
    }
  ],
  readonly: false,
  onRemoveClusterFromList: jest.fn()
}
describe('Cluster Entities ', () => {
  test('initial render', async () => {
    const { container } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <ClusterEntitiesList {...clusterProps} />
      </TestWrapper>
    )
    const clusterEntities = await findByTestId(container, 'cluster-entities-list')
    expect(within(clusterEntities).getByTestId('clusterEntity-test-cluster1')).toBeInTheDocument()
    expect(within(clusterEntities).getByTestId('clusterEntity-test-cluster1')).toBeInTheDocument()
    expect(clusterEntities).toBeDefined()
  })

  test('remove a cluster', async () => {
    const { container, getByText } = render(
      <TestWrapper
        path={PATH}
        pathParams={PATH_PARAMS}
        defaultFeatureFlagValues={{ CDS_SCOPE_INFRA_TO_SERVICES: true, NG_SVC_ENV_REDESIGN: true }}
      >
        <ClusterEntitiesList {...clusterProps} />
      </TestWrapper>
    )
    const clusterDelBtn = await findByTestId(container, 'delete-cluster-test-cluster1')
    expect(clusterDelBtn).toBeDefined()
    act(async () => {
      fireEvent.click(clusterDelBtn)
      await waitFor(() => {
        expect(getByText('common.ID: test-cluster1')).toBeDefined()
      })
    })
  })
})
