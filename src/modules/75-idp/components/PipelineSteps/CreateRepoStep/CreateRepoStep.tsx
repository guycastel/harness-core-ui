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
import { CreateRepoStepEditWithRef } from './CreateRepoStepEdit'
import { getInputSetViewValidateFieldsConfig, transformValuesFieldsConfig } from './CreateRepoStepFunctionConfigs'
import CreateRepoStepInputSet from './CreateRepoStepInputSet'
import { getFormValuesInCorrectFormat } from '../utils'
import { CreateRepoStepData } from './types'

export class CreateRepoStep extends PipelineStep<CreateRepoStepData> {
  constructor() {
    super()
    this._hasStepVariables = true
    this.invocationMap = new Map()
  }

  protected type = StepType.CreateRepo
  protected stepName = 'CreateRepo'
  protected stepIcon: IconName = 'repository'
  protected stepDescription: keyof StringsMap = 'idp.createRepoStep.createRepoStepDescription'
  protected stepPaletteVisible = false
  protected defaultValues: CreateRepoStepData = {
    type: StepType.CreateRepo,
    identifier: '',
    spec: {
      connectorType: 'Github',
      connectorRef: '',
      organization: '',
      repository: '',
      description: '',
      repoType: 'private',
      defaultBranch: ''
    }
  }

  /* istanbul ignore next */
  processFormData<T>(data: T): CreateRepoStepData {
    return getFormValuesInCorrectFormat<T, CreateRepoStepData>(data, transformValuesFieldsConfig)
  }

  validateInputSet({
    data,
    template,
    getString,
    viewType
  }: ValidateInputSetProps<CreateRepoStepData>): FormikErrors<CreateRepoStepData> {
    const isRequired = viewType === StepViewType.DeploymentForm || viewType === StepViewType.TriggerForm
    if (getString) {
      return validateInputSet(data, template, getInputSetViewValidateFieldsConfig(isRequired), { getString }, viewType)
    }

    /* istanbul ignore next */
    return {}
  }

  renderStep(props: StepProps<CreateRepoStepData>): JSX.Element {
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
        <CreateRepoStepInputSet
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
      <CreateRepoStepEditWithRef
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
