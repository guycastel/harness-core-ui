/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { SelectedInputSetListValue } from '../InputSetSelector/SelectedInputSetList'

export const INPUT_SET_SELECTOR_PAGE_SIZE = 100

export const isInputSetItemSelected = (selected: SelectedInputSetListValue[], identifier: string): boolean => {
  return !!selected.find(item => item.value === identifier)
}
