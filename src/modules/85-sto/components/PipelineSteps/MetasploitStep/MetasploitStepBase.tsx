/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Formik, FormikForm } from '@harness/uicore'
import { Divider } from '@blueprintjs/core'
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
import { transformValuesFieldsConfig, editViewValidateFieldsConfig } from './MetasploitStepFunctionConfigs'
import type { MetasploitStepProps, MetasploitStepData } from './MetasploitStep'
import {
  AdditionalFields,
  SecurityIngestionFields,
  SecurityInstanceFields,
  SecurityScanFields,
  SecurityTargetFields
} from '../SecurityFields'
import {
  dividerBottomMargin,
  INGESTION_SCAN_MODE,
  INSTANCE_TARGET_TYPE,
  logLevelOptions,
  METASPLOIT_WEAK_SSH_CONFIG,
  METASPLOIT_OPEN_SSL_HEARTBLEED_CONFIG,
  ORCHESTRATION_SCAN_MODE,
  severityOptions,
  tooltipIds,
  METASPLOIT_DEFAULT_CONFIG
} from '../constants'
import SecurityField from '../SecurityField'

export const MetasploitStepBase = (
  { initialValues, onUpdate, isNewStep = true, readonly, stepViewType, allowableTypes, onChange }: MetasploitStepProps,
  formikRef: StepFormikFowardRef<MetasploitStepData>
): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId }
    }
  } = usePipelineContext()

  const { getString } = useStrings()

  const currentStage = useGetPropagatedStageById(selectedStageId || '')

  const valuesInCorrectFormat = getInitialValuesInCorrectFormat<MetasploitStepData, MetasploitStepData>(
    initialValues,
    transformValuesFieldsConfig(initialValues),
    { imagePullPolicyOptions: getImagePullPolicyOptions(getString) }
  )

  const scanModeSelectItems = [ORCHESTRATION_SCAN_MODE, INGESTION_SCAN_MODE]
  return (
    <Formik
      initialValues={valuesInCorrectFormat}
      formName="MetasploitStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<MetasploitStepData, MetasploitStepData>(
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
      onSubmit={(_values: MetasploitStepData) => {
        const schemaValues = getFormValuesInCorrectFormat<MetasploitStepData, MetasploitStepData>(
          _values,
          transformValuesFieldsConfig(_values)
        )

        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<MetasploitStepData>) => {
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
              scanModeSelectItems={scanModeSelectItems}
              scanConfigSelectItems={[
                METASPLOIT_DEFAULT_CONFIG,
                METASPLOIT_WEAK_SSH_CONFIG,
                METASPLOIT_OPEN_SSL_HEARTBLEED_CONFIG
              ]}
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

            <SecurityField
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              enableFields={{
                'spec.advanced.log.level': {
                  optional: true,
                  fieldType: 'dropdown',
                  label: 'sto.stepField.advanced.logLevel',
                  selectItems: logLevelOptions(getString),
                  tooltipId: tooltipIds.logLevel
                },
                'spec.advanced.fail_on_severity': {
                  optional: true,
                  fieldType: 'dropdown',
                  label: 'sto.stepField.advanced.failOnSeverity',
                  selectItems: severityOptions(getString),
                  tooltipId: tooltipIds.failOnSeverity
                }
              }}
            />

            <Divider style={{ marginBottom: dividerBottomMargin }} />

            <AdditionalFields
              showAdvancedFields={false}
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

export const MetasploitStepBaseWithRef = React.forwardRef(MetasploitStepBase)
