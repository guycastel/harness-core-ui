/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Free Trial 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/05/PolyForm-Free-Trial-1.0.0.txt.
 */

import type { ResponseBoolean } from 'services/cd-ng'

export const mockResponse: ResponseBoolean = {
  status: 'SUCCESS',
  data: true,
  metaData: {},
  correlationId: ''
}

export const mockSecretList = {
  status: 'SUCCESS',
  data: {
    totalPages: 1,
    totalItems: 1,
    pageItemCount: 1,
    pageSize: 100,
    content: [
      {
        secret: {
          type: 'SecretText',
          name: 'selected_secret',
          identifier: 'selected_secret',
          tags: {},
          description: '',
          spec: { secretManagerIdentifier: 'New_Vault_Read_only', valueType: 'Inline', value: null }
        },
        createdAt: 1611917313699,
        updatedAt: 1611917313699,
        draft: false
      }
    ],
    pageIndex: 0,
    empty: false
  },
  metaData: null,
  correlationId: 'abb45801-d524-44ab-824c-aa532c367f39'
}

export const mockSecret = {
  status: 'SUCCESS',
  data: {
    secret: {
      type: 'SecretText',
      name: 'selected_secret',
      identifier: 'selected_secret',
      tags: {},
      description: '',
      spec: { secretManagerIdentifier: 'harnessSecretManager' }
    },
    createdAt: 1611917313699,
    updatedAt: 1611917313699,
    draft: false
  },
  metaData: null,
  correlationId: 'abb45801-d524-44ab-824c-aa532c367f39'
}

export const mockRegions = {
  resource: [{ name: 'region1', value: 'region1' }]
}