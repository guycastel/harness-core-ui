/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { ProviderInterface } from '../components/GitProviderSelect/GitProviderSelect'

export enum StoreType {
  INLINE = 'INLINE',
  REMOTE = 'REMOTE'
}

export interface StoreMetadata {
  storeType?: 'INLINE' | 'REMOTE'
  provider?: ProviderInterface
  connectorRef?: string
  repoName?: string
  branch?: string
  filePath?: string
  fallbackBranch?: string
}

export interface EntitySelectionGitData {
  repoName?: string
  branch?: string
  isDefaultSelected?: boolean
}

export enum SaveTemplateAsType {
  NEW_LABEL_VERSION = ' NEW_LABEL_VEFSION',
  NEW_TEMPALTE = 'NEW_TEMPLATE'
}
