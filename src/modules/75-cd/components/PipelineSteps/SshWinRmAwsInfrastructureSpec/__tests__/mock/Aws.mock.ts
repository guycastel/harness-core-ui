import type { UseGetReturnData } from '@common/utils/testUtils'
import type { ResponseMapStringString, ResponseSetString } from 'services/cd-ng'

export const tagsResponse: UseGetReturnData<ResponseSetString> = {
  loading: false,
  refetch: jest.fn(),
  error: null,
  data: {
    status: 'SUCCESS',
    data: ['tag1', 'tag1']
  }
}

export const regionsResponse: UseGetReturnData<ResponseMapStringString> = {
  loading: false,
  refetch: jest.fn(),
  error: null,
  data: {
    status: 'SUCCESS',
    data: {
      region1: 'region-1',
      region2: 'region-2'
    }
  }
}

export const autoScaling = {
  status: 'SUCCESS',
  data: ['AMI-BASE-ASG-TODOLIST', 'AMI-BASE-ASG-TODOLIST-NEW'],
  metaData: null,
  correlationId: 'b34as2d122f2-36dd-463d-be96-123'
}

export const vpcsMock = {
  status: 'SUCCESS',
  data: [
    { id: '1', name: 'vpcs1' },
    { id: '2', name: 'vpcs2' },
    { id: '3', name: 'vpcs3' }
  ],
  metaData: null,
  correlationId: 'corId123'
}
