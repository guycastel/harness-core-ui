/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, RenderResult } from '@testing-library/react'
import { TestWrapper } from '@common/utils/testUtils'
import * as cfServiceMock from 'services/cf'

import mockFeature from '@cf/utils/testData/data/mockFeature'
import mockGitSync from '@cf/utils/testData/data/mockGitSync'
import FlagActivation from '../FlagActivation'

jest.mock('services/cf')

jest.mock('@cf/hooks/useEnvironmentSelectV2', () => ({
  useEnvironmentSelectV2: jest.fn().mockReturnValue({
    data: [],
    loading: false,
    error: undefined,
    refetch: jest.fn(),
    EnvironmentSelect: function EnvironmentSelect() {
      return <div />
    }
  })
}))

const renderComponent = (): RenderResult => {
  return render(
    <TestWrapper
      path="/account/:accountId/cf/orgs/:orgIdentifier/projects/:projectIdentifier/feature-flags"
      pathParams={{ accountId: 'dummy', orgIdentifier: 'dummy', projectIdentifier: 'dummy' }}
    >
      <FlagActivation
        refetchFlagLoading={false}
        gitSync={mockGitSync}
        flagData={mockFeature}
        projectIdentifier="chris_test"
        refetchFlag={jest.fn()}
      />
    </TestWrapper>
  )
}

describe('FlagActivation', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    jest
      .spyOn(cfServiceMock, 'useGetAllFeatures')
      .mockReturnValue({ data: [], loading: false, mutate: jest.fn() } as any)
    jest
      .spyOn(cfServiceMock, 'useGetTargetsAndSegmentsInfo')
      .mockReturnValue({ data: [], loading: false, mutate: jest.fn() } as any)
    jest
      .spyOn(cfServiceMock, 'useGetAllSegments')
      .mockReturnValue({ data: [], loading: false, mutate: jest.fn() } as any)
    jest
      .spyOn(cfServiceMock, 'useGetAllTargetAttributes')
      .mockReturnValue({ data: [], loading: false, mutate: jest.fn() } as any)
    jest
      .spyOn(cfServiceMock, 'useGetFeatureEvaluations')
      .mockReturnValue({ data: [], loading: false, mutate: jest.fn() } as any)
    jest.spyOn(cfServiceMock, 'usePatchFeature').mockReturnValue({ data: [], loading: false, mutate: jest.fn() } as any)
    jest
      .spyOn(cfServiceMock, 'useGetAllTargets')
      .mockReturnValue({ data: [], loading: false, mutate: jest.fn() } as any)
  })

  test('it should render correctly', async () => {
    const { container } = renderComponent()

    expect(container).toMatchSnapshot()
  })
})
