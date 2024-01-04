/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { FormikProps } from 'formik'
import type { AllowedTypes } from '@harness/uicore'
import type { ContinousVerificationData } from '@cv/components/PipelineSteps/ContinousVerification/types'
import type { StepViewType } from '@pipeline/components/AbstractSteps/Step'

export interface ContinousVerificationWidgetSectionsProps {
  isNewStep?: boolean
  formik: FormikProps<ContinousVerificationData>
  stepViewType?: StepViewType
  allowableTypes: AllowedTypes
  readonly?: boolean
}
