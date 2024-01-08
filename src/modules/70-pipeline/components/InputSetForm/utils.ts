/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { SaveToGitFormInterface } from '@modules/10-common/components/SaveToGitForm/SaveToGitForm'
import type { EntityGitDetails } from 'services/pipeline-ng'

export interface GetUpdatedGitDetailsReturnType extends EntityGitDetails {
  lastObjectId?: string
  lastCommitId?: string
  baseBranch?: string
}

export const getUpdatedGitDetails = (
  isEdit: boolean,
  gitDetails: SaveToGitFormInterface | undefined,
  lastObjectId: string,
  initialGitDetails: EntityGitDetails,
  conflictCommitId?: string
): GetUpdatedGitDetailsReturnType => {
  let updatedGitDetails: GetUpdatedGitDetailsReturnType = {}
  if (gitDetails) {
    updatedGitDetails = { ...gitDetails }
    if (isEdit) {
      updatedGitDetails['lastObjectId'] = lastObjectId
      updatedGitDetails['lastCommitId'] = conflictCommitId || initialGitDetails.commitId
    }
    if (gitDetails.isNewBranch) {
      updatedGitDetails['baseBranch'] = initialGitDetails.branch
    }
  }
  return updatedGitDetails
}
