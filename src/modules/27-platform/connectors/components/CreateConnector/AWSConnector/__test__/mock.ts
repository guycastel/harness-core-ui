/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { ResponseBoolean } from 'services/cd-ng'

export const mockConnector = {
  status: 'SUCCESS',
  data: {
    connector: {
      name: 'AWS test',
      identifier: 'AWS_test',
      description: 'dummy AWS description',
      orgIdentifier: undefined,
      projectIdentifier: undefined,
      tags: {},
      type: 'Aws',
      spec: {
        delegateSelectors: ['dummyDelegateSelector'],
        awsSdkClientBackOffStrategyOverride: {
          spec: {
            fixedBackoff: 0,
            retryCount: 0
          },
          type: 'FixedDelayBackoffStrategy'
        },
        credential: {
          crossAccountAccess: { crossAccountRoleArn: 'mock URN', externalId: 'externalId' },
          type: 'ManualConfig',
          spec: { accessKey: 'mockAccessKey', secretKeyRef: 'account.mnfbjfjsecretKey' }
        },
        executeOnDelegate: true
      }
    },
    createdAt: 1610964845475,
    lastModifiedAt: 1610964845451,
    status: null,
    harnessManaged: false
  },
  metaData: null,
  correlationId: '0b7963ac-ae8c-40fa-9af8-dce37bbfdd6e'
}

export const hostedMockConnector = {
  status: 'SUCCESS',
  data: {
    connector: {
      name: 'AWS test',
      identifier: 'AWS_test',
      description: 'dummy AWS description',
      orgIdentifier: undefined,
      projectIdentifier: undefined,
      tags: {},
      type: 'Aws',
      spec: {
        credential: {
          crossAccountAccess: { crossAccountRoleArn: 'mock URN', externalId: 'externalId' },
          type: 'ManualConfig',
          spec: { accessKey: 'mockAccessKey', secretKeyRef: 'account.mnfbjfjsecretKey' }
        },
        executeOnDelegate: false
      }
    },
    createdAt: 1610964845475,
    lastModifiedAt: 1610964845451,
    status: null,
    harnessManaged: false
  },
  metaData: null,
  correlationId: '0b7963ac-ae8c-40fa-9af8-dce37bbfdd6e'
}

export const awsWithDelegate = {
  status: 'SUCCESS',
  data: {
    connector: {
      name: 'asasasa1212',
      identifier: 'asasasa1212',
      description: '',
      orgIdentifier: undefined,
      projectIdentifier: undefined,
      tags: {},
      type: 'Aws',
      spec: {
        delegateSelectors: ['dummyDelegateSelector'],
        credential: {
          crossAccountAccess: null,
          type: 'InheritFromDelegate',
          spec: null
        },
        executeOnDelegate: true
      }
    },
    createdAt: 1613481338947,
    lastModifiedAt: 1613481372391,
    status: {
      status: 'FAILURE',
      errorSummary: 'Unexpected Error',
      errors: [
        {
          reason: 'Unexpected Error',
          message: 'Something went wrong on our end. Please contact Harness Support.',
          code: 450
        }
      ],
      testedAt: 1613481372602,
      lastTestedAt: 0,
      lastConnectedAt: 0
    },
    activityDetails: { lastActivityTime: 1613481372398 },
    harnessManaged: false
  },
  metaData: null,
  correlationId: '7895e879-0a6b-4e48-9ad9-d27b01721ada'
}

export const mockSecret = {
  status: 'SUCCESS',
  data: {
    secret: {
      type: 'SecretText',
      name: 'connectorPass',
      identifier: 'connectorPass',
      tags: {},
      description: '',
      spec: { secretManagerIdentifier: 'harnessSecretManager' }
    },
    createdAt: 1606373702954,
    updatedAt: 1606373702954,
    draft: false
  },
  metaData: null,
  correlationId: '0346aa2b-290e-4892-a7f0-4ad2128c9829'
}

export const mockResponse: ResponseBoolean = {
  status: 'SUCCESS',
  data: true,
  metaData: {},
  correlationId: ''
}

export const mockOIDCConnector = {
  status: 'SUCCESS',
  data: {
    connector: {
      description: '',
      identifier: 'OIDC_Connector',
      name: 'OIDC Connector',
      orgIdentifier: undefined,
      projectIdentifier: undefined,
      spec: {
        awsSdkClientBackOffStrategyOverride: {
          spec: { fixedBackoff: 0, retryCount: 0 },
          type: 'FixedDelayBackoffStrategy'
        },
        credential: {
          crossAccountAccess: null,
          region: 'us-gov-west-1',
          spec: { iamRoleArn: 'IAM_ROLE' },
          type: 'OidcAuthentication'
        },
        executeOnDelegate: false,
        proxy: undefined
      },
      tags: {},
      type: 'Aws'
    }
  }
}
