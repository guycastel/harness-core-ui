/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Formik, FormikForm } from '@harness/uicore'
import type { FormikProps } from 'formik'
import { Divider } from '@blueprintjs/core'
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
import { transformValuesFieldsConfig, editViewValidateFieldsConfig } from './BurpStepFunctionConfigs'
import type { BurpStepProps, BurpStepData } from './BurpStep'
import {
  AdditionalFields,
  SecurityAuthFields,
  SecurityIngestionFields,
  SecurityInstanceFields,
  SecurityScanFields,
  SecurityTargetFields
} from '../SecurityFields'
import {
  EXTRACTION_SCAN_MODE,
  INGESTION_SCAN_MODE,
  INSTANCE_TARGET_TYPE,
  ORCHESTRATION_SCAN_MODE,
  dividerBottomMargin,
  logLevelOptions,
  severityOptions,
  tooltipIds
} from '../constants'
import { BURP_DEFAULT_CONFIG, BURP_ORCHESTRATION_CONFIGS } from './BurpStepVariables'
import SecurityField from '../SecurityField'

export const BurpStepBase = (
  { initialValues, onUpdate, isNewStep = true, readonly, stepViewType, allowableTypes, onChange }: BurpStepProps,
  formikRef: StepFormikFowardRef<BurpStepData>
): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId }
    }
  } = usePipelineContext()

  const { getString } = useStrings()

  const currentStage = useGetPropagatedStageById(selectedStageId || '')

  const valuesInCorrectFormat = getInitialValuesInCorrectFormat<BurpStepData, BurpStepData>(
    initialValues,
    transformValuesFieldsConfig(initialValues),
    { imagePullPolicyOptions: getImagePullPolicyOptions(getString) }
  )

  const scanModeSelectItems = [ORCHESTRATION_SCAN_MODE, EXTRACTION_SCAN_MODE, INGESTION_SCAN_MODE]
  return (
    <Formik
      initialValues={valuesInCorrectFormat}
      formName="BurpStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<BurpStepData, BurpStepData>(
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
      onSubmit={(_values: BurpStepData) => {
        const schemaValues = getFormValuesInCorrectFormat<BurpStepData, BurpStepData>(
          _values,
          transformValuesFieldsConfig(_values)
        )

        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<BurpStepData>) => {
        // This is required
        setFormikRef?.(formikRef, formik)

        const scanConfigItems =
          formik.values.spec.mode === 'orchestration' ? BURP_ORCHESTRATION_CONFIGS : [BURP_DEFAULT_CONFIG]

        if (formik.values.spec.mode === 'ingestion' && formik.values.spec.config !== BURP_DEFAULT_CONFIG.value) {
          formik.setFieldValue('spec.config', BURP_DEFAULT_CONFIG.value)
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

            <SecurityAuthFields
              showFields={{
                domain: true
              }}
              allowableTypes={allowableTypes}
              formik={formik}
            />

            <SecurityIngestionFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

            <SecurityInstanceFields
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              showFields={{ domain: true, protocol: true, path: true, port: true, username: true, password: true }}
            />

            {/* handle burp extraction need to make it obvious that either a scan or site id needs to provided by user */}
            {formik.values.spec.mode === EXTRACTION_SCAN_MODE.value && (
              <>
                <SecurityField
                  readonly={readonly}
                  allowableTypes={allowableTypes}
                  formik={formik}
                  enableFields={{
                    header: {
                      label: 'sto.stepField.tool.fieldsHeading'
                    },
                    // TODO get feedback on multiple having multiple ways to extract burp data
                    // 'spec.tool.scan_id': {
                    // label: 'sto.stepField.tool.scanId',
                    // TODO add tool tip for scan id
                    // tooltipId: tooltipIds.toolScanId
                    // },
                    'spec.tool.site_id': {
                      label: 'sto.stepField.tool.siteId',
                      tooltipId: tooltipIds.toolSiteId
                    }
                  }}
                />
                <Divider style={{ marginBottom: dividerBottomMargin }} />
              </>
            )}

            {/* tool args are not required and thus shouldn't be an option to users */}
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

export const BurpStepBaseWithRef = React.forwardRef(BurpStepBase)
