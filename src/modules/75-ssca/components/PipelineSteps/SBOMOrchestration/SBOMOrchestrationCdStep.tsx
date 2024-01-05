/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { IconName } from '@harness/icons'
import { Color } from '@harness/design-system'
import type { FormikErrors } from 'formik'
import React from 'react'
import { defaultTo } from 'lodash-es'
import { StepViewType, ValidateInputSetProps } from '@pipeline/components/AbstractSteps/Step'
import { PipelineStep, StepProps } from '@pipeline/components/PipelineSteps/PipelineStep'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { getFormValuesInCorrectFormat } from '@pipeline/components/PipelineSteps/Steps/StepsTransformValuesUtils'
import type { StringsMap } from 'stringTypes'
import { VariableListTableProps, VariablesListTable } from '@pipeline/components/VariablesListTable/VariablesListTable'
import { flatObject } from '@pipeline/components/PipelineSteps/Steps/Common/ApprovalCommons'
import { validateInputSet } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { SBOMOrchestrationCdStepData } from '../common/types'
import { commonDefaultOrchestrationSpecValues, cdSpecValues } from '../common/default-values'
import { SBOMOrchestrationStepBase } from './SBOMOrchestrationStepBase'
import { SBOMOrchestrationStepInputSet } from './SBOMOrchestrationStepInputSet'
import {
  transformValuesFieldsConfig,
  getInputSetViewValidateFieldsConfig
} from './SBOMOrchestrationStepFunctionConfigs'

export class SBOMOrchestrationCdStep extends PipelineStep<SBOMOrchestrationCdStepData> {
  constructor() {
    super()
    this._hasStepVariables = true
    this.invocationMap = new Map()
  }

  protected type = StepType.SBOMOrchestrationCd
  protected stepName = 'SBOM Orchestration'
  protected stepIcon: IconName = 'ssca-orchestrate'
  protected stepIconColor = Color.GREY_600
  protected stepDescription: keyof StringsMap = 'pipeline.stepDescription.SBOMOrchestration'
  protected stepPaletteVisible = false
  protected defaultValues: SBOMOrchestrationCdStepData = {
    type: StepType.SBOMOrchestrationCd,
    identifier: '',
    spec: {
      ...commonDefaultOrchestrationSpecValues,
      ...cdSpecValues
    }
  }

  /* istanbul ignore next */
  processFormData<T>(data: T): SBOMOrchestrationCdStepData {
    return getFormValuesInCorrectFormat<T, SBOMOrchestrationCdStepData>(
      data,
      transformValuesFieldsConfig(this?.type, data)
    )
  }

  validateInputSet({
    data,
    template,
    getString,
    viewType
  }: ValidateInputSetProps<SBOMOrchestrationCdStepData>): FormikErrors<SBOMOrchestrationCdStepData> {
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

    return {}
  }

  renderStep(props: StepProps<SBOMOrchestrationCdStepData>): JSX.Element {
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
        <SBOMOrchestrationStepInputSet
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
      <SBOMOrchestrationStepBase
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
