/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { InputSetOnCreateUpdate } from '@modules/70-pipeline/utils/inputSetUtils'
import { InputSetDTO } from '@modules/70-pipeline/utils/types'

export interface InputSetFormProps<T = unknown> extends InputSetOnCreateUpdate<T> {
  executionView?: boolean

  // Props to support embedding InputSetForm (create new) in a modal (NewInputSetModal)
  inputSetInitialValue?: InputSetDTO
}
