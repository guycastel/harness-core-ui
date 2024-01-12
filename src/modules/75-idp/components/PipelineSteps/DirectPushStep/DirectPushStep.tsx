/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { IconName } from '@harness/icons'
import type { FormikErrors } from 'formik'
import React from 'react'
import { defaultTo } from 'lodash-es'
import { StepViewType, ValidateInputSetProps } from '@pipeline/components/AbstractSteps/Step'
import { PipelineStep, StepProps } from '@pipeline/components/PipelineSteps/PipelineStep'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import type { StringsMap } from 'stringTypes'
import { VariableListTableProps, VariablesListTable } from '@pipeline/components/VariablesListTable/VariablesListTable'
import { flatObject } from '@pipeline/components/PipelineSteps/Steps/Common/ApprovalCommons'
import { validateInputSet } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { DirectPushStepEditWithRef } from './DirectPushStepEdit'
import { getInputSetViewValidateFieldsConfig, transformValuesFieldsConfig } from './DirectPushStepFunctionConfigs'
import DirectPushStepInputSet from './DirectPushStepInputSet'
import { getFormValuesInCorrectFormat } from '../utils'
import { DirectPushStepData } from './types'

export class DirectPushStep extends PipelineStep<DirectPushStepData> {
  constructor() {
    super()
    this._hasStepVariables = true
    this.invocationMap = new Map()
  }

  protected type = StepType.DirectPush
  protected stepName = 'DirectPush'
  protected stepIcon: IconName = 'git-push'
  protected stepDescription: keyof StringsMap = 'idp.directPushStep.directPushStepDescription'
  protected stepPaletteVisible = false
  protected defaultValues: DirectPushStepData = {
    type: StepType.DirectPush,
    identifier: '',
    spec: {
      connectorType: 'Github',
      connectorRef: '',
      organization: '',
      repository: '',
      codeDirectory: '',
      codeOutputDirectory: '',
      branch: ''
    }
  }

  /* istanbul ignore next */
  processFormData<T>(data: T): DirectPushStepData {
    return getFormValuesInCorrectFormat<T, DirectPushStepData>(data, transformValuesFieldsConfig)
  }

  validateInputSet({
    data,
    template,
    getString,
    viewType
  }: ValidateInputSetProps<DirectPushStepData>): FormikErrors<DirectPushStepData> {
    const isRequired = viewType === StepViewType.DeploymentForm || viewType === StepViewType.TriggerForm
    if (getString) {
      return validateInputSet(data, template, getInputSetViewValidateFieldsConfig(isRequired), { getString }, viewType)
    }

    /* istanbul ignore next */
    return {}
  }

  renderStep(props: StepProps<DirectPushStepData>): JSX.Element {
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
        <DirectPushStepInputSet
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
        <VariablesListTable
          data={flatObject(defaultTo(initialValues, {}))}
          originalData={initialValues}
          metadataMap={(customStepProps as Pick<VariableListTableProps, 'metadataMap'>)?.metadataMap}
        />
      )
    }

    return (
      <DirectPushStepEditWithRef
        initialValues={initialValues}
        allowableTypes={allowableTypes}
        onChange={onChange}
        stepViewType={defaultTo(stepViewType, StepViewType.Edit)}
        onUpdate={onUpdate}
        readonly={readonly}
        isNewStep={isNewStep}
        ref={formikRef}
      />
    )
  }
}
