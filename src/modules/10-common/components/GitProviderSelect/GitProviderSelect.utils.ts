/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { isEmpty } from 'lodash-es'
import { UseStringsReturn } from 'framework/strings'
import { SourceCodeTypes } from '../AccessTokenOAuth/AccessTokenOAuth'
import { CardSelectInterface, getGitProviderCards } from './GitProviderSelect'

export const isHarnessCodeRepoEntity = (gitProviderType?: string): boolean =>
  gitProviderType === SourceCodeTypes.HARNESS

export const getGitProvider = (getString: UseStringsReturn['getString'], connectorRef?: string): CardSelectInterface =>
  isEmpty(connectorRef) ? getGitProviderCards(getString)[0] : getGitProviderCards(getString)[1]
