/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Color } from '@harness/design-system'
import type { IconName } from '@harness/icons'
import type { FormikErrors } from 'formik'
import { defaultTo } from 'lodash-es'
import React from 'react'
import { StepViewType, ValidateInputSetProps } from '@pipeline/components/AbstractSteps/Step'
import { PipelineStep, StepProps } from '@pipeline/components/PipelineSteps/PipelineStep'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { flatObject } from '@pipeline/components/PipelineSteps/Steps/Common/ApprovalCommons'
import { getFormValuesInCorrectFormat } from '@pipeline/components/PipelineSteps/Steps/StepsTransformValuesUtils'
import { validateInputSet } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { VariableListTableProps, VariablesListTable } from '@pipeline/components/VariablesListTable/VariablesListTable'
import type { StringsMap } from 'stringTypes'
import { PolicyEnforcementStepData } from '../common/types'
import { PolicyEnforcementStepBase } from './PolicyEnforcementStepBase'
import { commonDefaultEnforcementSpecValues, ciSpecValues } from '../common/default-values'
import {
  getInputSetViewValidateFieldsConfig,
  transformValuesFieldsConfig
} from './PolicyEnforcementStepFunctionConfigs'
import { SBOMEnforceStepInputSet } from './PolicyEnforcementStepInputSet'

export class PolicyEnforcement extends PipelineStep<PolicyEnforcementStepData> {
  constructor() {
    super()
    this._hasStepVariables = true
    this.invocationMap = new Map()
  }

  protected type = StepType.PolicyEnforcement
  protected stepName = 'SBOM Policy Enforcement'
  protected stepIcon: IconName = 'ssca-enforce'
  protected stepIconColor = Color.GREY_600
  protected stepDescription: keyof StringsMap = 'pipeline.stepDescription.PolicyEnforcement'
  protected stepPaletteVisible = false
  protected defaultValues: PolicyEnforcementStepData = {
    type: StepType.PolicyEnforcement,
    identifier: '',
    spec: {
      ...commonDefaultEnforcementSpecValues,
      ...ciSpecValues
    }
  }

  processFormData<T>(data: T): PolicyEnforcementStepData {
    return getFormValuesInCorrectFormat<T, PolicyEnforcementStepData>(data, transformValuesFieldsConfig(this?.type))
  }

  validateInputSet({
    data,
    template,
    getString,
    viewType
  }: ValidateInputSetProps<PolicyEnforcementStepData>): FormikErrors<PolicyEnforcementStepData> {
    const isRequired = viewType === StepViewType.DeploymentForm || viewType === StepViewType.TriggerForm
    if (getString) {
      return validateInputSet(
        data,
        template,
        getInputSetViewValidateFieldsConfig(this.type)(isRequired),
        { getString },
        viewType
      )
    }

    /* istanbul ignore next */
    return {}
  }

  renderStep(props: StepProps<PolicyEnforcementStepData>): JSX.Element {
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
        <SBOMEnforceStepInputSet
          initialValues={initialValues}
          template={inputSetData?.template}
          path={inputSetData?.path || ''}
          readonly={!!inputSetData?.readonly}
          stepViewType={stepViewType}
          onUpdate={onUpdate}
          onChange={onChange}
          allowableTypes={allowableTypes}
          stepType={this.type}
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
      <PolicyEnforcementStepBase
        initialValues={initialValues}
        allowableTypes={allowableTypes}
        onChange={onChange}
        stepViewType={stepViewType || StepViewType.Edit}
        onUpdate={onUpdate}
        readonly={readonly}
        isNewStep={isNewStep}
        ref={formikRef}
        stepType={this.type}
      />
    )
  }
}
