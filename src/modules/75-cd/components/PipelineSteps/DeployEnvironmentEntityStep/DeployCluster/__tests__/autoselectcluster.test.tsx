/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import * as Formik from 'formik'

import { MultiTypeInputType } from '@harness/uicore'
import { render } from '@testing-library/react'

import { TestWrapper } from '@modules/10-common/utils/testUtils'
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
            agentIdentifier: 'org.syncstepqaagent',
            identifier: 'cluster22',

            scopeLevel: 'ORGANIZATION',
            name: 'cluster22',
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
            clusterRef: 'org.cluster22',
            orgIdentifier: 'default',
            projectIdentifier: 'MeenaSyncStep',
            agentIdentifier: 'syncstepqaagent',
            accountIdentifier: '1bvyLackQK-Hapk25-Ry4w',
            envRef: 'env1',
            linkedAt: 1699386562826,
            scope: 'ORGANIZATION',
            name: 'cluster22',
            tags: {}
          }
        ]
      }
    },
    refetch: jest.fn()
  } as any)
}))

describe('auto select cluster', () => {
  const useFormikContextMock = jest.spyOn(Formik, 'useFormikContext')
  beforeEach(() => {
    useFormikContextMock.mockReturnValue({
      values: initialValues,
      setValues: jest.fn(),
      setFieldValue: jest.fn()
    } as unknown as any)
  })
  test('initial render', async () => {
    const { findByText, findByTestId } = render(
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
    const autoSelectClusterContainer = await findByTestId('clusterEntity-org.cluster22')
    expect(autoSelectClusterContainer).toBeInTheDocument()
  })
})
