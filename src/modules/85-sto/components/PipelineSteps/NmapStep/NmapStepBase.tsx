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
import { transformValuesFieldsConfig, editViewValidateFieldsConfig } from './NmapStepFunctionConfigs'
import type { NmapStepProps, NmapStepData } from './NmapStep'
import {
  AdditionalFields,
  SecurityIngestionFields,
  SecurityInstanceFields,
  SecurityScanFields,
  SecurityTargetFields
} from '../SecurityFields'
import {
  INGESTION_SCAN_MODE,
  INSTANCE_TARGET_TYPE,
  NMAP_DEFAULT_CONFIG,
  NMAP_EXPLOIT_CONFIG,
  NMAP_FIREWALL_BYPASS_CONFIG,
  NMAP_SMB_SECURITY_MODE_CONFIG,
  NMAP_UNUSUAL_PORT_CONFIG,
  NMAP_VULN_CONFIG,
  NMAP_NO_DEFAULT_CLI_FLAGS,
  ORCHESTRATION_SCAN_MODE
} from '../constants'

export const NmapStepBase = (
  { initialValues, onUpdate, isNewStep = true, readonly, stepViewType, allowableTypes, onChange }: NmapStepProps,
  formikRef: StepFormikFowardRef<NmapStepData>
): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId }
    }
  } = usePipelineContext()

  const { getString } = useStrings()

  const currentStage = useGetPropagatedStageById(selectedStageId || '')

  const valuesInCorrectFormat = getInitialValuesInCorrectFormat<NmapStepData, NmapStepData>(
    initialValues,
    transformValuesFieldsConfig(initialValues),
    { imagePullPolicyOptions: getImagePullPolicyOptions(getString) }
  )

  const scanModeSelectItems = [ORCHESTRATION_SCAN_MODE, INGESTION_SCAN_MODE]
  return (
    <Formik
      initialValues={valuesInCorrectFormat}
      formName="NmapStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<NmapStepData, NmapStepData>(
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
      onSubmit={(_values: NmapStepData) => {
        const schemaValues = getFormValuesInCorrectFormat<NmapStepData, NmapStepData>(
          _values,
          transformValuesFieldsConfig(_values)
        )

        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<NmapStepData>) => {
        // This is required
        setFormikRef?.(formikRef, formik)

        const scanConfigItems =
          formik.values.spec.mode === 'orchestration'
            ? [
                NMAP_DEFAULT_CONFIG,
                NMAP_NO_DEFAULT_CLI_FLAGS,
                NMAP_FIREWALL_BYPASS_CONFIG,
                NMAP_UNUSUAL_PORT_CONFIG,
                NMAP_SMB_SECURITY_MODE_CONFIG,
                NMAP_VULN_CONFIG,
                NMAP_EXPLOIT_CONFIG
              ]
            : [NMAP_DEFAULT_CONFIG]

        if (formik.values.spec.mode === 'ingestion' && formik.values.spec.config !== NMAP_DEFAULT_CONFIG.value) {
          formik.setFieldValue('spec.config', NMAP_DEFAULT_CONFIG.value)
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
              scanModeSelectItems={scanModeSelectItems}
              scanConfigSelectItems={scanConfigItems}
            />

            <SecurityTargetFields
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              targetTypeSelectItems={[INSTANCE_TARGET_TYPE]}
            />

            <SecurityIngestionFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

            <SecurityInstanceFields
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              showFields={{ domain: true, protocol: true, path: true, port: true }}
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

export const NmapStepBaseWithRef = React.forwardRef(NmapStepBase)
