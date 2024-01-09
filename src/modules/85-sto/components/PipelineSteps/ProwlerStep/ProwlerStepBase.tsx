/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Formik, FormikForm } from '@harness/uicore'
import type { FormikProps } from 'formik'
import type { StepFormikFowardRef } from '@pipeline/components/AbstractSteps/Step'
import { setFormikRef } from '@pipeline/components/AbstractSteps/Step'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { useStrings } from 'framework/strings'
import {
  getInitialValuesInCorrectFormat,
  getFormValuesInCorrectFormat
} from '@pipeline/components/PipelineSteps/Steps/StepsTransformValuesUtils'
import { validate } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { CIStep } from '@ci/components/PipelineSteps/CIStep/CIStep'
import { useGetPropagatedStageById } from '@ci/components/PipelineSteps/CIStep/StepUtils'
import { getImagePullPolicyOptions } from '@common/utils/ContainerRunStepUtils'
import { transformValuesFieldsConfig, editViewValidateFieldsConfig } from './ProwlerStepFunctionConfigs'
import type { ProwlerStepProps, ProwlerStepData } from './ProwlerStep'
import {
  AdditionalFields,
  SecurityAuthFields,
  SecurityIngestionFields,
  SecurityScanFields,
  SecurityTargetFields
} from '../SecurityFields'
import {
  AWS_ACCOUNT_AUTH_TYPE,
  CONFIGURATION_TARGET_TYPE,
  INGESTION_SCAN_MODE,
  ORCHESTRATION_SCAN_MODE,
  PROWLER_DEFAULT_CONFIG,
  PROWLER_EXCLUDE_EXTRAS_CONFIG,
  PROWLER_GDPR_CONFIG,
  PROWLER_HIPAA_CONFIG
} from '../constants'

export const ProwlerStepBase = (
  { initialValues, onUpdate, isNewStep = true, readonly, stepViewType, allowableTypes, onChange }: ProwlerStepProps,
  formikRef: StepFormikFowardRef<ProwlerStepData>
): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId }
    }
  } = usePipelineContext()

  const { getString } = useStrings()

  const currentStage = useGetPropagatedStageById(selectedStageId || '')

  const valuesInCorrectFormat = getInitialValuesInCorrectFormat<ProwlerStepData, ProwlerStepData>(
    initialValues,
    transformValuesFieldsConfig(initialValues),
    { imagePullPolicyOptions: getImagePullPolicyOptions(getString) }
  )

  return (
    <Formik
      initialValues={valuesInCorrectFormat}
      formName="ProwlerStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<ProwlerStepData, ProwlerStepData>(
          valuesToValidate,
          transformValuesFieldsConfig(valuesToValidate)
        )
        onChange?.(schemaValues)
        return validate(
          valuesToValidate,
          editViewValidateFieldsConfig(valuesToValidate),
          {
            initialValues,
            steps: currentStage?.stage?.spec?.execution?.steps || {},
            serviceDependencies: currentStage?.stage?.spec?.serviceDependencies || {},
            getString
          },
          stepViewType
        )
      }}
      onSubmit={(_values: ProwlerStepData) => {
        const schemaValues = getFormValuesInCorrectFormat<ProwlerStepData, ProwlerStepData>(
          _values,
          transformValuesFieldsConfig(_values)
        )

        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<ProwlerStepData>) => {
        // This is required
        setFormikRef?.(formikRef, formik)

        return (
          <FormikForm>
            <CIStep
              readonly={readonly}
              isNewStep={isNewStep}
              stepViewType={stepViewType}
              allowableTypes={allowableTypes}
              enableFields={{
                name: {},
                description: {}
              }}
              formik={formik}
            />

            <SecurityScanFields
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              scanConfigReadonly
              scanModeSelectItems={[ORCHESTRATION_SCAN_MODE, INGESTION_SCAN_MODE]}
              scanConfigSelectItems={[
                PROWLER_DEFAULT_CONFIG,
                PROWLER_HIPAA_CONFIG,
                PROWLER_GDPR_CONFIG,
                PROWLER_EXCLUDE_EXTRAS_CONFIG
              ]}
            />

            <SecurityTargetFields
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              targetTypeSelectItems={[CONFIGURATION_TARGET_TYPE]}
            />

            <SecurityIngestionFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

            <SecurityAuthFields
              showFields={{
                type: true,
                access_id: true,
                region: true
              }}
              allowableTypes={allowableTypes}
              formik={formik}
              authTypes={[AWS_ACCOUNT_AUTH_TYPE]}
            />

            <AdditionalFields
              readonly={readonly}
              currentStage={currentStage}
              stepViewType={stepViewType}
              allowableTypes={allowableTypes}
              formik={formik}
            />
          </FormikForm>
        )
      }}
    </Formik>
  )
}

export const ProwlerStepBaseWithRef = React.forwardRef(ProwlerStepBase)
