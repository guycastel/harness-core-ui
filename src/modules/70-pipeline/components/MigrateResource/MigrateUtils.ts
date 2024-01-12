/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { StoreMetadata } from '@common/constants/GitSyncTypes'
import { ResourceType } from '@common/interfaces/GitSyncInterface'
import type { NameIdDescriptionTagsType } from '@common/utils/Validation'
import { ProviderInterface } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect'

export enum MigrationType {
  IMPORT = 'IMPORT',
  INLINE_TO_REMOTE = 'INLINE_TO_REMOTE',
  REMOTE_TO_INLINE = 'REMOTE_TO_INLINE'
}

export interface ExtraQueryParams {
  pipelineIdentifier?: string
  inputSetIdentifier?: string
  environmentIdentifier?: string
  identifier?: string
  name?: string
  versionLabel?: string
}

export type InitialValuesType = NameIdDescriptionTagsType &
  StoreMetadata & { versionLabel?: string; commitMsg?: string }
export type ModifiedInitialValuesType = Omit<InitialValuesType, 'repoName'> & {
  repo?: string
  baseBranch?: string
  provider?: ProviderInterface
}

export const getDisableFields = (resourceType: ResourceType): Record<string, boolean> | undefined => {
  if (resourceType === ResourceType.INPUT_SETS) {
    return {
      provider: true,
      connectorRef: true,
      repoName: true,
      branch: true
    }
  }
}
