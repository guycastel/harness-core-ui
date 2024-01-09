/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Formik, FormikForm, MultiTypeInputType } from '@harness/uicore'
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
import { transformValuesFieldsConfig, editViewValidateFieldsConfig } from './MendStepFunctionConfigs'
import type { MendStepProps, MendStepData } from './MendStep'
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
  CONTAINER_TARGET_TYPE,
  tooltipIds
} from '../constants'
import SecurityField from '../SecurityField'

export const MendStepBase = (
  { initialValues, onUpdate, isNewStep = true, readonly, stepViewType, allowableTypes, onChange }: MendStepProps,
  formikRef: StepFormikFowardRef<MendStepData>
): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId }
    }
  } = usePipelineContext()

  const { getString } = useStrings()

  const currentStage = useGetPropagatedStageById(selectedStageId || '')

  const valuesInCorrectFormat = getInitialValuesInCorrectFormat<MendStepData, MendStepData>(
    initialValues,
    transformValuesFieldsConfig(initialValues),
    { imagePullPolicyOptions: getImagePullPolicyOptions(getString) }
  )

  type LookupType = 'appendToProductByToken' | 'appendToProductByName' | 'byTokens' | 'byNames'
  type LookupTypeOption = {
    value: LookupType
    label: string
  }
  const orchestrationLookupTypes: LookupTypeOption[] = [
    {
      label: 'By Token',
      value: 'appendToProductByToken'
    },
    {
      label: 'By Name',
      value: 'appendToProductByName'
    }
  ]

  const extractionLookupTypes: LookupTypeOption[] = [
    {
      label: 'By Tokens',
      value: 'byTokens'
    },
    {
      label: 'By Names',
      value: 'byNames'
    }
  ]

  return (
    <Formik
      initialValues={valuesInCorrectFormat}
      formName="MendStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<MendStepData, MendStepData>(
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
      onSubmit={(_values: MendStepData) => {
        const schemaValues = getFormValuesInCorrectFormat<MendStepData, MendStepData>(
          _values,
          transformValuesFieldsConfig(_values)
        )

        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<MendStepData>) => {
        // This is required
        setFormikRef?.(formikRef, formik)

        const show_product_token_field =
          formik.values.spec.mode !== 'ingestion' &&
          (formik.values.spec.tool?.product_lookup_type === 'byTokens' ||
            formik.values.spec.tool?.product_lookup_type === 'appendToProductByToken')
        const show_project_token_field =
          formik.values.spec.mode === 'extraction' && formik.values.spec.tool?.product_lookup_type === 'byTokens'
        const show_product_name_field =
          formik.values.spec.mode !== 'ingestion' &&
          (formik.values.spec.tool?.product_lookup_type === 'byNames' ||
            formik.values.spec.tool?.product_lookup_type === 'appendToProductByName')
        const show_project_name_field =
          formik.values.spec.mode === 'extraction' && formik.values.spec.tool?.product_lookup_type === 'byNames'

        if (formik.values.spec.mode === 'ingestion' && formik.values.spec.tool?.product_lookup_type) {
          formik.setFieldValue('spec.tool.product_lookup_type', undefined)
        }

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
              scanModeSelectItems={[ORCHESTRATION_SCAN_MODE, EXTRACTION_SCAN_MODE, INGESTION_SCAN_MODE]}
            />

            <SecurityTargetFields
              readonly={readonly}
              allowableTypes={allowableTypes}
              formik={formik}
              targetTypeSelectItems={[REPOSITORY_TARGET_TYPE, CONTAINER_TARGET_TYPE]}
            />

            <SecurityImageFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

            <SecurityIngestionFields readonly={readonly} allowableTypes={allowableTypes} formik={formik} />

            <SecurityAuthFields
              showFields={{
                access_id: true,
                ssl: true,
                domain: true
              }}
              allowableTypes={allowableTypes}
              formik={formik}
              authDomainPlaceHolder="https://saas.whitesourcesoftware.com/"
            />
            <>
              <SecurityField
                readonly={readonly}
                allowableTypes={allowableTypes}
                formik={formik}
                enableFields={{
                  header: {
                    label: 'sto.stepField.tool.fieldsHeading',
                    hide: formik.values.spec.mode === 'ingestion'
                  },
                  'spec.tool.product_lookup_type': {
                    label: 'sto.stepField.tool.productLookupType',
                    fieldType: 'dropdown',
                    selectItems:
                      formik.values.spec.mode === 'orchestration' ? orchestrationLookupTypes : extractionLookupTypes,
                    hide: formik.values.spec.mode === 'ingestion',
                    tooltipId: tooltipIds.toolProductLookupType,
                    multiTypeInputProps: { allowableTypes: [MultiTypeInputType.FIXED] }
                  },
                  'spec.tool.product_token': {
                    label: 'sto.stepField.tool.productToken',
                    hide: !show_product_token_field,
                    tooltipId: tooltipIds.toolProductToken
                  },
                  'spec.tool.product_name': {
                    label: 'name',
                    hide: !show_product_name_field,
                    tooltipId: tooltipIds.toolProductName
                  },
                  'spec.tool.project_token': {
                    label: 'sto.stepField.tool.projectToken',
                    hide: !show_project_token_field,
                    tooltipId: tooltipIds.toolProjectToken
                  },
                  'spec.tool.project_name': {
                    label: 'projectCard.projectName',
                    hide: !show_project_name_field,
                    tooltipId: tooltipIds.toolProjectName
                  },
                  'spec.tool.include': {
                    label: 'sto.stepField.toolInclude',
                    optional: true,
                    hide: !(formik.values.spec.mode === 'orchestration' || formik.values.spec.mode === 'extraction'),
                    tooltipId: tooltipIds.toolInclude
                  },
                  'spec.tool.exclude': {
                    label: 'sto.stepField.tool.exclude',
                    optional: true,
                    hide: !(formik.values.spec.mode === 'orchestration' || formik.values.spec.mode === 'extraction'),
                    tooltipId: tooltipIds.toolExclude
                  }
                }}
              />
              <Divider style={{ marginBottom: dividerBottomMargin }} />
            </>

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

export const MendStepBaseWithRef = React.forwardRef(MendStepBase)
