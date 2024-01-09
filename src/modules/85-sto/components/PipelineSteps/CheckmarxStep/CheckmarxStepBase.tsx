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
import { transformValuesFieldsConfig, editViewValidateFieldsConfig } from './CheckmarxStepFunctionConfigs'
import type { CheckmarxStepProps, CheckmarxStepData } from './CheckmarxStep'
import {
  AdditionalFields,
  SecurityAuthFields,
  SecurityImageFields,
  SecurityIngestionFields,
  SecurityScanFields,
  SecurityTargetFields
} from '../SecurityFields'
import {
  INGESTION_SCAN_MODE,
  ORCHESTRATION_SCAN_MODE,
  EXTRACTION_SCAN_MODE,
  REPOSITORY_TARGET_TYPE,
  dividerBottomMargin,
  tooltipIds
} from '../constants'
import SecurityField from '../SecurityField'

export const CheckmarxStepBase = (
  { initialValues, onUpdate, isNewStep = true, readonly, stepViewType, allowableTypes, onChange }: CheckmarxStepProps,
  formikRef: StepFormikFowardRef<CheckmarxStepData>
): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId }
    }
  } = usePipelineContext()

  const { getString } = useStrings()

  const currentStage = useGetPropagatedStageById(selectedStageId || '')

  const valuesInCorrectFormat = getInitialValuesInCorrectFormat<CheckmarxStepData, CheckmarxStepData>(
    initialValues,
    transformValuesFieldsConfig(initialValues),
    { imagePullPolicyOptions: getImagePullPolicyOptions(getString) }
  )

  return (
    <Formik
      initialValues={valuesInCorrectFormat}
      formName="CheckmarxStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<CheckmarxStepData, CheckmarxStepData>(
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
      onSubmit={(_values: CheckmarxStepData) => {
        const schemaValues = getFormValuesInCorrectFormat<CheckmarxStepData, CheckmarxStepData>(
          _values,
          transformValuesFieldsConfig(_values)
        )

        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<CheckmarxStepData>) => {
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
              scanModeSelectItems={[ORCHESTRATION_SCAN_MODE, EXTRACTION_SCAN_MODE, INGESTION_SCAN_MODE]}
            />

            <SecurityTargetFields
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              targetTypeSelectItems={[REPOSITORY_TARGET_TYPE]}
            />

            <SecurityImageFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

            <SecurityIngestionFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

            <SecurityAuthFields
              showFields={{
                ssl: true,
                domain: true,
                access_id: true
              }}
              allowableTypes={allowableTypes}
              formik={formik}
            />

            {(formik.values.spec.mode === 'orchestration' || formik.values.spec.mode === 'extraction') && (
              <>
                <SecurityField
                  readonly={readonly}
                  allowableTypes={allowableTypes}
                  formik={formik}
                  enableFields={{
                    header: {
                      label: 'sto.stepField.tool.fieldsHeading'
                    },
                    'spec.tool.team_name': {
                      label: 'sto.stepField.tool.teamName',
                      optional: true,
                      tooltipId: tooltipIds.toolTeamName
                    },
                    'spec.tool.project_name': {
                      label: 'projectCard.projectName',
                      optional: true,
                      tooltipId: tooltipIds.toolProjectName
                    }
                  }}
                />
                <Divider style={{ marginBottom: dividerBottomMargin }} />
              </>
            )}

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

export const CheckmarxStepBaseWithRef = React.forwardRef(CheckmarxStepBase)
