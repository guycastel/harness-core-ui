/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { IconName } from '@harness/icons'

export enum StepPanelCategory {
  AddStep = 'AddStep',
  AddStepGroup = 'AddStepGroup',
  UseStepTemplate = 'UseStepTemplate',
  Harness = 'Harness',
  Bitrise = 'Bitrise',
  GithubActions = 'Action'
}

export interface CategoryData {
  category: StepPanelCategory
  label: string
  description?: string
  iconName: IconName
  disabled?: boolean
  isPlugin?: boolean
}

export interface StepCategoryData {
  category: StepPanelCategory
  isPlugin: boolean
}
