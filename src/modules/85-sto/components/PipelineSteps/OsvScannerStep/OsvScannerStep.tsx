/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import type { AllowedTypes, IconName } from '@harness/uicore'
import type { FormikErrors, FormikProps } from 'formik'
import type { StepProps, ValidateInputSetProps } from '@pipeline/components/AbstractSteps/Step'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { PipelineStep } from '@pipeline/components/PipelineSteps/PipelineStep'
import { validateInputSet } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { getFormValuesInCorrectFormat } from '@pipeline/components/PipelineSteps/Steps/StepsTransformValuesUtils'
import type { StringsMap } from 'stringTypes'
import { OsvScannerStepBaseWithRef } from './OsvScannerStepBase'
import { SecurityStepInputSet } from '../SecurityStepInputSet'
import { OsvScannerStepVariables, OsvScannerStepVariablesProps } from './OsvScannerStepVariables'
import { getInputSetViewValidateFieldsConfig, transformValuesFieldsConfig } from './OsvScannerStepFunctionConfigs'
import type { SecurityStepData, SecurityStepSpec } from '../types'

export type OsvScannerStepData = SecurityStepData<SecurityStepSpec>
export interface OsvScannerStepProps {
  initialValues: OsvScannerStepData
  template?: OsvScannerStepData
  path?: string
  isNewStep?: boolean
  readonly?: boolean
  stepViewType: StepViewType
  onUpdate?: (data: OsvScannerStepData) => void
  onChange?: (data: OsvScannerStepData) => void
  allowableTypes: AllowedTypes
  formik?: FormikProps<OsvScannerStepData>
}

export class OsvScannerStep extends PipelineStep<OsvScannerStepData> {
  constructor() {
    super()
    this._hasStepVariables = true
    this._hasDelegateSelectionVisible = true
  }

  protected type = StepType.OsvScanner
  protected stepName = 'Configure OSV Scanner'
  protected stepIcon: IconName = 'osv'
  protected stepDescription: keyof StringsMap = 'sto.stepDescription.OsvScanner'
  protected stepPaletteVisible = false

  protected defaultValues: OsvScannerStepData = {
    identifier: '',
    type: StepType.OsvScanner as string,
    spec: {
      mode: 'ingestion',
      config: 'default',
      target: {
        type: 'repository',
        name: '',
        variant: '',
        workspace: ''
      },
      advanced: {
        log: {
          level: 'info'
        }
      }
    }
  }

  /* istanbul ignore next */
  processFormData(data: OsvScannerStepData): OsvScannerStepData {
    return getFormValuesInCorrectFormat(data, transformValuesFieldsConfig(data))
  }

  validateInputSet({
    data,
    template,
    getString,
    viewType
  }: ValidateInputSetProps<OsvScannerStepData>): FormikErrors<OsvScannerStepData> {
    if (getString) {
      return validateInputSet(data, template, getInputSetViewValidateFieldsConfig(data), { getString }, viewType)
    }

    return {}
  }

  renderStep(props: StepProps<OsvScannerStepData>): JSX.Element {
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
        <SecurityStepInputSet
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
        <OsvScannerStepVariables
          {...(customStepProps as OsvScannerStepVariablesProps)}
          initialValues={initialValues}
          onUpdate={onUpdate}
        />
      )
    }

    return (
      <OsvScannerStepBaseWithRef
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
