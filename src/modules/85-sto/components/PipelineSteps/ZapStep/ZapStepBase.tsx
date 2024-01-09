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
import { transformValuesFieldsConfig, editViewValidateFieldsConfig } from './ZapStepFunctionConfigs'
import type { ZapStepProps, ZapStepData } from './ZapStep'
import {
  AdditionalFields,
  SecurityImageFields,
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
  ORCHESTRATION_SCAN_MODE,
  severityOptions,
  tooltipIds,
  ZAP_ATTACK_CONFIG,
  ZAP_DEFAULT_CONFIG,
  ZAP_QUICK_CONFIG,
  ZAP_STANDARD_CONFIG
} from '../constants'
import SecurityField from '../SecurityField'

export const ZapStepBase = (
  { initialValues, onUpdate, isNewStep = true, readonly, stepViewType, allowableTypes, onChange }: ZapStepProps,
  formikRef: StepFormikFowardRef<ZapStepData>
): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId }
    }
  } = usePipelineContext()

  const { getString } = useStrings()

  const currentStage = useGetPropagatedStageById(selectedStageId || '')

  const valuesInCorrectFormat = getInitialValuesInCorrectFormat<ZapStepData, ZapStepData>(
    initialValues,
    transformValuesFieldsConfig(initialValues),
    { imagePullPolicyOptions: getImagePullPolicyOptions(getString) }
  )

  return (
    <Formik
      initialValues={valuesInCorrectFormat}
      formName="ZapStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<ZapStepData, ZapStepData>(
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
      onSubmit={(_values: ZapStepData) => {
        const schemaValues = getFormValuesInCorrectFormat<ZapStepData, ZapStepData>(
          _values,
          transformValuesFieldsConfig(_values)
        )

        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<ZapStepData>) => {
        // This is required
        setFormikRef?.(formikRef, formik)

        const scanConfigItems =
          formik.values.spec.mode === 'orchestration'
            ? [ZAP_DEFAULT_CONFIG, ZAP_STANDARD_CONFIG, ZAP_ATTACK_CONFIG, ZAP_QUICK_CONFIG]
            : [ZAP_DEFAULT_CONFIG]

        if (formik.values.spec.mode === 'ingestion' && formik.values.spec.config !== ZAP_DEFAULT_CONFIG.value) {
          formik.setFieldValue('spec.config', ZAP_DEFAULT_CONFIG.value)
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
              scanModeSelectItems={[ORCHESTRATION_SCAN_MODE, INGESTION_SCAN_MODE]}
              scanConfigSelectItems={scanConfigItems}
            />

            <SecurityTargetFields
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              targetTypeSelectItems={[INSTANCE_TARGET_TYPE]}
            />

            <SecurityImageFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

            <SecurityIngestionFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

            <SecurityInstanceFields
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              showFields={{ domain: true, path: true, port: true, protocol: true }}
            />

            {formik.values.spec.mode === 'orchestration' && (
              <>
                <SecurityField
                  readonly={readonly}
                  allowableTypes={allowableTypes}
                  formik={formik}
                  enableFields={{
                    header: {
                      label: 'sto.stepField.tool.fieldsHeading'
                    },
                    'spec.tool.context': {
                      label: 'sto.stepField.tool.context',
                      optional: true,
                      tooltipId: tooltipIds.toolContext
                    },
                    'spec.tool.port': {
                      label: 'common.smtp.port',
                      optional: true,
                      inputProps: { placeholder: '8981' },
                      tooltipId: tooltipIds.toolPort
                    }
                  }}
                />
                <Divider style={{ marginBottom: dividerBottomMargin }} />
              </>
            )}

            <>
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
            </>

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

export const ZapStepBaseWithRef = React.forwardRef(ZapStepBase)
