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
import { transformValuesFieldsConfig, editViewValidateFieldsConfig } from './CustomIngestionStepFunctionConfigs'
import type { CustomIngestionStepProps, CustomIngestionStepData } from './CustomIngestionStep'
import { AdditionalFields, SecurityIngestionFields, SecurityScanFields, SecurityTargetFields } from '../SecurityFields'
import {
  CONFIGURATION_TARGET_TYPE,
  CONTAINER_TARGET_TYPE,
  INGESTION_SCAN_MODE,
  INSTANCE_TARGET_TYPE,
  REPOSITORY_TARGET_TYPE,
  CUSTOM_INGEST_DEFAULT_CONFIG,
  CUSTOM_INGEST_SARIF_CONFIG
} from '../constants'

export const CustomIngestionStepBase = (
  {
    initialValues,
    onUpdate,
    isNewStep = true,
    readonly,
    stepViewType,
    allowableTypes,
    onChange
  }: CustomIngestionStepProps,
  formikRef: StepFormikFowardRef<CustomIngestionStepData>
): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId }
    }
  } = usePipelineContext()

  const { getString } = useStrings()

  const currentStage = useGetPropagatedStageById(selectedStageId || '')

  const valuesInCorrectFormat = getInitialValuesInCorrectFormat<CustomIngestionStepData, CustomIngestionStepData>(
    initialValues,
    transformValuesFieldsConfig(initialValues),
    { imagePullPolicyOptions: getImagePullPolicyOptions(getString) }
  )

  return (
    <Formik
      initialValues={valuesInCorrectFormat}
      formName="CustomIngestionStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<CustomIngestionStepData, CustomIngestionStepData>(
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
      onSubmit={(_values: CustomIngestionStepData) => {
        const schemaValues = getFormValuesInCorrectFormat<CustomIngestionStepData, CustomIngestionStepData>(
          _values,
          transformValuesFieldsConfig(_values)
        )

        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<CustomIngestionStepData>) => {
        // This is required
        setFormikRef?.(formikRef, formik)

        const scanConfigItems = [CUSTOM_INGEST_DEFAULT_CONFIG, CUSTOM_INGEST_SARIF_CONFIG]

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
              scanModeSelectItems={[INGESTION_SCAN_MODE]}
              scanConfigSelectItems={scanConfigItems}
            />

            <SecurityTargetFields
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              targetTypeSelectItems={[
                REPOSITORY_TARGET_TYPE,
                INSTANCE_TARGET_TYPE,
                CONTAINER_TARGET_TYPE,
                CONFIGURATION_TARGET_TYPE
              ]}
            />

            <SecurityIngestionFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

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

export const CustomIngestionStepBaseWithRef = React.forwardRef(CustomIngestionStepBase)
