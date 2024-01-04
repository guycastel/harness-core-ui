/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { AllowedTypes } from '@harness/uicore'
import type { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import type { ContinousVerificationData } from '../../types'

export interface ContinousVerificationWidgetProps {
  initialValues: ContinousVerificationData
  isNewStep?: boolean
  onUpdate?: (data: ContinousVerificationData) => void
  onChange?: (data: ContinousVerificationData) => void
  allowableTypes: AllowedTypes
  stepViewType?: StepViewType
  readonly?: boolean
}

export interface VerificationJob {
  sensitivity?: string
  baselineVerificationJobInstanceId?: string
  trafficSplitPercentage?: string
  [x: string]: any
}
