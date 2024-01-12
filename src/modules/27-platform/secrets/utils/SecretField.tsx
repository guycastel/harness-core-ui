/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { clone } from 'lodash-es'

import { ConnectorInfoDTO, getSecretV2Promise, GetSecretV2QueryParams, ListSecretsV2QueryParams } from 'services/cd-ng'
import type { ScopeAndIdentifier } from '@common/components/MultiSelectEntityReference/MultiSelectEntityReference'
import { Scope } from '@common/interfaces/SecretsInterface'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'

export interface SecretReferenceInterface {
  identifier: string
  name: string
  referenceString: string
  accountIdentifier: string
  orgIdentifier?: string
  projectIdentifier?: string
}

export const setSecretField = async (
  secretString: string,
  scopeQueryParams: GetSecretV2QueryParams
): Promise<SecretReferenceInterface | void> => {
  if (!secretString) {
    return undefined
  } else {
    const secretScope = secretString?.indexOf('.') < 0 ? Scope.PROJECT : secretString?.split('.')[0]
    const clonedScopeQueryParams = clone(scopeQueryParams)

    switch (secretScope) {
      case Scope.ACCOUNT:
        delete clonedScopeQueryParams.orgIdentifier
        delete clonedScopeQueryParams.projectIdentifier
        break
      case Scope.ORG:
        delete clonedScopeQueryParams.projectIdentifier
    }

    const identifier = secretString.indexOf('.') < 0 ? secretString : secretString.split('.')[1]
    const response = await getSecretV2Promise({
      identifier,
      queryParams: clonedScopeQueryParams
    })

    return {
      identifier,
      name: response.data?.secret.name || secretString.split('.')[1],
      referenceString: secretString,
      ...clonedScopeQueryParams
    }
  }
}

export interface SecretMultiSelectProps {
  selectedSecrets?: ScopeAndIdentifier[]
  isMultiSelect?: boolean
  onMultiSelect?: (selected: ScopeAndIdentifier[]) => void
}

interface ShouldPassSecretManagerIdentifiersArgs {
  connectorTypeContext?: ConnectorInfoDTO['type']
  secretType: ListSecretsV2QueryParams['type']
}

const isConnectorContenxtTypeOfSecretManagerAndSecretTypeOfTextAndFile = ({
  connectorTypeContext,
  secretType
}: ShouldPassSecretManagerIdentifiersArgs): boolean => {
  const secretManagerTypesForIdentifiers = [
    'AwsKms',
    'AzureKeyVault',
    'Vault',
    'AwsSecretManager',
    'GcpKms',
    'GcpSecretManager',
    'CustomSecretManager'
  ]
  const typesForSecretManagerIdentifiers: ListSecretsV2QueryParams['type'][] = ['SecretText', 'SecretFile']

  if (
    connectorTypeContext &&
    secretManagerTypesForIdentifiers.includes(connectorTypeContext) &&
    typesForSecretManagerIdentifiers.includes(secretType)
  ) {
    return true
  }
  return false
}

export const useShouldPassSecretManagerIdentifiers = (
  args: ShouldPassSecretManagerIdentifiersArgs
): {
  shouldPassSecretManagerIdentifiers: boolean
} => {
  const { DISABLE_SM_CREDENTIALS_CHECK } = useFeatureFlags()

  let shouldPassSecretManagerIdentifiers = false

  if (DISABLE_SM_CREDENTIALS_CHECK) {
    shouldPassSecretManagerIdentifiers = false
  } else {
    shouldPassSecretManagerIdentifiers = isConnectorContenxtTypeOfSecretManagerAndSecretTypeOfTextAndFile(args)
  }

  return {
    shouldPassSecretManagerIdentifiers
  }
}
