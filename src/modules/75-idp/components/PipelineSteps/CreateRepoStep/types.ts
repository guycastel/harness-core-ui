/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { AllowedTypes } from '@harness/uicore'
import { FormikProps } from 'formik'
import { StepViewType } from '@modules/70-pipeline/components/AbstractSteps/Step'
import { ConnectorInfoDTO } from 'services/cd-ng'

export interface CreateRepoStepData {
  name?: string
  identifier: string
  type: string
  spec: {
    connectorType: ConnectorInfoDTO['type']
    repoType: string
    connectorRef: string
    organization: string
    repository: string
    description: string
    defaultBranch: string
  }
}

export interface CreateRepoStepEditProps {
  initialValues: CreateRepoStepData
  template?: CreateRepoStepData
  path?: string
  isNewStep?: boolean
  readonly?: boolean
  stepViewType: StepViewType
  onUpdate?: (data: CreateRepoStepData) => void
  onChange?: (data: CreateRepoStepData) => void
  allowableTypes: AllowedTypes
  formik?: FormikProps<CreateRepoStepData>
}

export interface GitProviderFieldProps {
  readonly?: boolean
  stepViewType: StepViewType
  allowableTypes: AllowedTypes
}
