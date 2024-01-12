/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import type { IconName, MultiTypeInputType } from '@harness/uicore'
import type { FormikErrors } from 'formik'
import { ProviderInterface } from '@common/components/GitProviderSelect/GitProviderSelect'
import type { StepProps, ValidateInputSetProps } from '@pipeline/components/AbstractSteps/Step'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { PipelineStep } from '@pipeline/components/PipelineSteps/PipelineStep'
import { validateInputSet } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { getFormValuesInCorrectFormat } from '@pipeline/components/PipelineSteps/Steps/StepsTransformValuesUtils'
import type { MultiTypeConnectorRef, Resources } from '@pipeline/components/PipelineSteps/Steps/StepsTypes'
import type { StringsMap } from 'stringTypes'
import { GitCloneStepBaseWithRef } from './GitCloneStepBase'
import { GitCloneStepInputSet } from './GitCloneStepInputSet'
import { GitCloneStepVariables, GitCloneStepVariablesProps } from './GitCloneStepVariables'
import { getInputSetViewValidateFieldsConfig, transformValuesFieldsConfig } from './GitCloneStepFunctionConfigs'

type BuildInterface = {
  type: string
  spec: {
    branch?: string
    tag?: string
  }
}
export interface GitCloneStepSpec {
  connectorRef: string
  repoName?: string
  build: BuildInterface | string // string when hardcoded <+input>
  cloneDirectory?: string
  runAsUser?: string
  resources?: Resources
  depth?: number
  sslVerify?: boolean
}

export interface GitCloneStepData {
  identifier: string
  name?: string
  description?: string
  type: string
  timeout?: string
  spec: GitCloneStepSpec
  provider?: ProviderInterface | string
}

export interface GitCloneStepSpecUI
  extends Omit<GitCloneStepSpec, 'connectorRef' | 'reports' | 'settings' | 'pull' | 'resources'> {
  connectorRef: MultiTypeConnectorRef
  cloneDirectory?: string
  limitMemory?: string
  limitCPU?: string
  runAsUser?: string
  resources?: Resources
  depth?: number
  sslVerify?: boolean
}

// Interface for the form
export interface GitCloneStepDataUI extends Omit<GitCloneStepData, 'spec'> {
  spec: GitCloneStepSpecUI
}

export interface GitCloneStepProps {
  initialValues: GitCloneStepData
  template?: GitCloneStepData
  path?: string
  isNewStep?: boolean
  readonly?: boolean
  stepViewType: StepViewType
  onUpdate?: (data: GitCloneStepData) => void
  onChange?: (data: GitCloneStepData) => void
  allowableTypes: MultiTypeInputType[]
  formik?: any
}

export class GitCloneStep extends PipelineStep<GitCloneStepData> {
  constructor() {
    super()
    this._hasStepVariables = true
  }

  protected type = StepType.GitClone
  protected stepName = 'Configure Git Clone Step'
  protected stepIcon: IconName = 'git-clone-ci-step'
  protected stepIconColor = '#4F5162'
  protected stepDescription: keyof StringsMap = 'pipeline.stepDescription.GitClone'
  protected stepIconSize = 34
  protected stepPaletteVisible = false

  protected defaultValues: GitCloneStepData = {
    identifier: '',
    type: StepType.GitClone as string,
    spec: {
      connectorRef: '',
      build: { type: '', spec: {} }
    }
  }

  /* istanbul ignore next */
  processFormData<T>(data: T): GitCloneStepData {
    return getFormValuesInCorrectFormat<T, GitCloneStepData>(data, transformValuesFieldsConfig)
  }

  validateInputSet({
    data,
    template,
    getString,
    viewType
  }: ValidateInputSetProps<GitCloneStepData>): FormikErrors<GitCloneStepData> {
    const isRequired = viewType === StepViewType.DeploymentForm || viewType === StepViewType.TriggerForm
    if (getString) {
      return validateInputSet(
        data,
        template,
        getInputSetViewValidateFieldsConfig({
          isRequired
        }),
        { getString },
        viewType
      )
    }
    /* istanbul ignore next */
    return {}
  }

  renderStep(props: StepProps<GitCloneStepData>): JSX.Element {
    const {
      initialValues,
      onUpdate,
      stepViewType,
      inputSetData,
      formikRef,
      customStepProps,
      isNewStep,
      readonly,
      onChange,
      allowableTypes
    } = props

    if (this.isTemplatizedView(stepViewType)) {
      return (
        <GitCloneStepInputSet
          initialValues={initialValues}
          template={inputSetData?.template}
          path={inputSetData?.path || ''}
          readonly={!!inputSetData?.readonly}
          stepViewType={stepViewType}
          onUpdate={onUpdate}
          onChange={onChange}
          allowableTypes={allowableTypes}
        />
      )
    } else if (stepViewType === StepViewType.InputVariable) {
      return (
        <GitCloneStepVariables
          {...(customStepProps as GitCloneStepVariablesProps)}
          initialValues={initialValues}
          onUpdate={onUpdate}
        />
      )
    }

    return (
      <GitCloneStepBaseWithRef
        initialValues={initialValues}
        allowableTypes={allowableTypes}
        onChange={onChange}
        stepViewType={stepViewType || StepViewType.Edit}
        onUpdate={onUpdate}
        readonly={readonly}
        isNewStep={isNewStep}
        ref={formikRef}
      />
    )
  }
}
