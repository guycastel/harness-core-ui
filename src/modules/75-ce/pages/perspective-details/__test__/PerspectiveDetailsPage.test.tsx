import React from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'urql'
import { fromValue } from 'wonka'
import type { DocumentNode } from 'graphql'
import { TestWrapper } from '@common/utils/testUtils'
import {
  FetchPerspectiveTimeSeriesDocument,
  FetchPerspectiveDetailsSummaryDocument,
  FetchViewFieldsDocument,
  FetchperspectiveGridDocument,
  FetchPerspectiveBudgetDocument
} from 'services/ce/services'
import PerspectiveDetailsPage from '../PerspectiveDetailsPage'

import ChartResponseData from './ChartDataResponse.json'
import SummaryResponseData from './SummaryResponse.json'
import ViewFieldResponseData from './ViewFieldResponse.json'
import PerspectiveResponseData from './PerspectiveData.json'

jest.mock('services/ce', () => ({
  ...(jest.requireActual('services/ce') as any),
  useGetLastMonthCost: jest.fn().mockImplementation(() => ({
    data: { resource: 100 },
    refetch: jest.fn(),
    error: null,
    loading: false
  })),
  useGetForecastCost: jest.fn().mockImplementation(() => ({
    data: { resource: 100 },
    refetch: jest.fn(),
    error: null,
    loading: false
  })),
  useGetPerspective: jest.fn().mockImplementation(() => {
    return { data: PerspectiveResponseData, refetch: jest.fn(), error: null, loading: false }
  })
}))

jest.mock('@ce/components/CEChart/CEChart', () => 'mock')

const params = {
  accountId: 'TEST_ACC',
  perspetiveId: 'perspectiveId',
  perspectiveName: 'sample perspective'
}

describe('test cases for Perspective details Page', () => {
  test('should be able to render the details page', async () => {
    const responseState = {
      executeQuery: ({ query }: { query: DocumentNode }) => {
        if (query === FetchPerspectiveTimeSeriesDocument) {
          return fromValue(ChartResponseData)
        }
        if (query === FetchPerspectiveDetailsSummaryDocument) {
          return fromValue(SummaryResponseData)
        }
        if (query === FetchViewFieldsDocument) {
          return fromValue(ViewFieldResponseData)
        }
        if (query === FetchPerspectiveBudgetDocument) {
          return fromValue({
            data: {
              budgetSummary: {
                id: 'OgqEcGrMTY6yw1pLWmjmpQ',
                name: 'GCP All',
                budgetAmount: 2000000.0,
                actualCost: 785774.63,
                timeLeft: 9,
                timeUnit: 'days',
                timeScope: 'monthly',
                __typename: 'BudgetSummary'
              }
            }
          })
        }
        return fromValue({})
      }
    }

    const { container } = render(
      <TestWrapper pathParams={params}>
        <Provider value={responseState as any}>
          <PerspectiveDetailsPage />
        </Provider>
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
  })

  test('should be able to render no data page', async () => {
    const responseState = {
      executeQuery: ({ query }: { query: DocumentNode }) => {
        if (query === FetchPerspectiveTimeSeriesDocument) {
          return fromValue({
            data: {
              perspectiveTimeSeriesStats: {
                stats: []
              }
            }
          })
        }
        if (query === FetchperspectiveGridDocument) {
          return fromValue({
            data: {
              perspectiveGrid: {
                data: []
              }
            }
          })
        }
        if (query === FetchPerspectiveDetailsSummaryDocument) {
          return fromValue(SummaryResponseData)
        }
        if (query === FetchViewFieldsDocument) {
          return fromValue(ViewFieldResponseData)
        }
        return fromValue({})
      }
    }

    const { container } = render(
      <TestWrapper pathParams={params}>
        <Provider value={responseState as any}>
          <PerspectiveDetailsPage />
        </Provider>
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
  })
})
