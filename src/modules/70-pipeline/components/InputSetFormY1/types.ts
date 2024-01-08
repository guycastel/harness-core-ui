/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { GitSyncFormFields } from '@modules/40-gitsync/components/GitSyncForm/GitSyncForm'
import { InputSetSummaryResponse } from 'services/pipeline-ng'
import { SelectedInputSetListValue } from '../InputSetSelector/SelectedInputSetList'

export type InputSetsY1 = string[]

export interface InputSetKVPairs {
  [key: string]: unknown
}

export type InputSetY1 = {
  version: number
  kind: string
  spec?: {
    input_sets?: InputSetsY1
  } & InputSetKVPairs
}

export interface InputSetMetadataY1 {
  identifier?: string
  name?: string
  description?: string
  tags?: {
    [key: string]: string
  }
}

export type FromikInputSetY1 = InputSetY1 & InputSetMetadataY1 & GitSyncFormFields & { storeType?: 'INLINE' | 'REMOTE' }

export type SelectedItemsType = SelectedInputSetListValue<InputSetSummaryResponse>
