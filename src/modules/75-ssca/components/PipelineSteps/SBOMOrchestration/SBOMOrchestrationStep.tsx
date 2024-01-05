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
import { commonDefaultOrchestrationSpecValues, ciSpecValues } from '../common/default-values'
import { SBOMOrchestrationStepData } from '../common/types'
import { SBOMOrchestrationStepInputSet } from './SBOMOrchestrationStepInputSet'
import {
  getInputSetViewValidateFieldsConfig,
  transformValuesFieldsConfig
} from './SBOMOrchestrationStepFunctionConfigs'
import { SBOMOrchestrationStepBase } from './SBOMOrchestrationStepBase'

export class SBOMOrchestrationStep extends PipelineStep<SBOMOrchestrationStepData> {
  constructor() {
    super()
    this._hasStepVariables = true
    this.invocationMap = new Map()
  }

  protected type = StepType.SBOMOrchestration
  protected stepName = 'SBOM Orchestration'
  protected stepIcon: IconName = 'ssca-orchestrate'
  protected stepIconColor = Color.GREY_600
  protected stepDescription: keyof StringsMap = 'pipeline.stepDescription.SBOMOrchestration'
  protected stepPaletteVisible = false
  protected defaultValues: SBOMOrchestrationStepData = {
    type: StepType.SBOMOrchestration,
    identifier: '',
    spec: {
      ...commonDefaultOrchestrationSpecValues,
      ...ciSpecValues
    }
  }

  processFormData<T>(data: T): SBOMOrchestrationStepData {
    return getFormValuesInCorrectFormat<T, SBOMOrchestrationStepData>(
      data,
      transformValuesFieldsConfig(this?.type, data)
    )
  }

  validateInputSet({
    data,
    template,
    getString,
    viewType
  }: ValidateInputSetProps<SBOMOrchestrationStepData>): FormikErrors<SBOMOrchestrationStepData> {
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

  renderStep(props: StepProps<SBOMOrchestrationStepData>): JSX.Element {
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
