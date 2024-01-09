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
import { transformValuesFieldsConfig, editViewValidateFieldsConfig } from './AquaSecurityStepFunctionConfigs'
import type { AquaSecurityStepProps, AquaSecurityStepData } from './AquaSecurityStep'
import {
  AdditionalFields,
  SecurityAuthFields,
  SecurityImageFields,
  SecurityIngestionFields,
  SecurityScanFields,
  SecurityTargetFields
} from '../SecurityFields'
import { INGESTION_SCAN_MODE, ORCHESTRATION_SCAN_MODE, CONTAINER_TARGET_TYPE } from '../constants'

export const AquaSecurityStepBase = (
  {
    initialValues,
    onUpdate,
    isNewStep = true,
    readonly,
    stepViewType,
    allowableTypes,
    onChange
  }: AquaSecurityStepProps,
  formikRef: StepFormikFowardRef<AquaSecurityStepData>
): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId }
    }
  } = usePipelineContext()

  const { getString } = useStrings()

  const currentStage = useGetPropagatedStageById(selectedStageId || '')

  const valuesInCorrectFormat = getInitialValuesInCorrectFormat<AquaSecurityStepData, AquaSecurityStepData>(
    initialValues,
    transformValuesFieldsConfig(initialValues),
    { imagePullPolicyOptions: getImagePullPolicyOptions(getString) }
  )

  return (
    <Formik
      initialValues={valuesInCorrectFormat}
      formName="AquaSecurityStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<AquaSecurityStepData, AquaSecurityStepData>(
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
      onSubmit={(_values: AquaSecurityStepData) => {
        const schemaValues = getFormValuesInCorrectFormat<AquaSecurityStepData, AquaSecurityStepData>(
          _values,
          transformValuesFieldsConfig(_values)
        )

        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<AquaSecurityStepData>) => {
        // This is required
        setFormikRef?.(formikRef, formik)

        const targetTypeSelectItems = [CONTAINER_TARGET_TYPE]

        if (
          formik.values.spec.privileged !== true &&
          formik.values.spec.mode === 'orchestration' &&
          formik.values.spec.target.type === 'container'
        ) {
          formik.setFieldValue('spec.privileged', true)
        } else if (
          formik.values.spec.privileged === true &&
          (formik.values.spec.mode !== 'orchestration' || formik.values.spec.target.type !== 'container')
        ) {
          formik.setFieldValue('spec.privileged', false)
        }

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
            />

            <SecurityTargetFields
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              targetTypeSelectItems={targetTypeSelectItems}
            />

            <SecurityImageFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

            <SecurityIngestionFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

            <SecurityAuthFields
              readonly={readonly}
              showFields={{ domain: true }}
              allowableTypes={allowableTypes}
              formik={formik}
              authDomainPlaceHolder="https://<TENANT_ID>.cloud.aquasec.com"
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

export const AquaSecurityStepBaseWithRef = React.forwardRef(AquaSecurityStepBase)
