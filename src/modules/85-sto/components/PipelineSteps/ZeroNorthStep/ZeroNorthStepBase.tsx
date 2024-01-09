/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Formik, FormikForm } from '@harness/uicore'
import type { FormikProps } from 'formik'
import { get } from 'lodash-es'
import { getImagePullPolicyOptions } from '@common/utils/ContainerRunStepUtils'
import type { StepFormikFowardRef } from '@pipeline/components/AbstractSteps/Step'
import { setFormikRef } from '@pipeline/components/AbstractSteps/Step'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { useStrings } from 'framework/strings'
import StepCommonFields from '@ci/components/PipelineSteps/StepCommonFields/StepCommonFields'
import {
  getInitialValuesInCorrectFormat,
  getFormValuesInCorrectFormat
} from '@pipeline/components/PipelineSteps/Steps/StepsTransformValuesUtils'
import { validate } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { CIStep } from '@ci/components/PipelineSteps/CIStep/CIStep'
import { CIStepOptionalConfig } from '@ci/components/PipelineSteps/CIStep/CIStepOptionalConfig'
import { useGetPropagatedStageById } from '@ci/components/PipelineSteps/CIStep/StepUtils'
import { CIBuildInfrastructureType } from '@pipeline/utils/constants'
import { transformValuesFieldsConfig, editViewValidateFieldsConfig } from './ZeroNorthStepFunctionConfigs'
import type { ZeroNorthStepProps, ZeroNorthStepData, ZeroNorthStepDataUI } from './ZeroNorthStep'

export const ZeroNorthStepBase = (
  { initialValues, onUpdate, isNewStep = true, readonly, stepViewType, allowableTypes, onChange }: ZeroNorthStepProps,
  formikRef: StepFormikFowardRef<ZeroNorthStepData>
): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId }
    }
  } = usePipelineContext()

  const { getString } = useStrings()

  const currentStage = useGetPropagatedStageById(selectedStageId || '')

  const buildInfrastructureType =
    (get(currentStage, 'stage.spec.infrastructure.type') as CIBuildInfrastructureType) ||
    (get(currentStage, 'stage.spec.runtime.type') as CIBuildInfrastructureType)

  return (
    <Formik
      initialValues={getInitialValuesInCorrectFormat<ZeroNorthStepData, ZeroNorthStepDataUI>(
        initialValues,
        transformValuesFieldsConfig,
        { imagePullPolicyOptions: getImagePullPolicyOptions(getString) }
      )}
      formName="zeroNorthStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<ZeroNorthStepDataUI, ZeroNorthStepData>(
          valuesToValidate,
          transformValuesFieldsConfig
        )
        onChange?.(schemaValues)
        return validate(
          valuesToValidate,
          editViewValidateFieldsConfig,
          {
            initialValues,
            steps: currentStage?.stage?.spec?.execution?.steps || {},
            serviceDependencies: currentStage?.stage?.spec?.serviceDependencies || {},
            getString
          },
          stepViewType
        )
      }}
      onSubmit={(_values: ZeroNorthStepDataUI) => {
        const schemaValues = getFormValuesInCorrectFormat<ZeroNorthStepDataUI, ZeroNorthStepData>(
          _values,
          transformValuesFieldsConfig
        )

        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<ZeroNorthStepData>) => {
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
            <CIStepOptionalConfig
              stepViewType={stepViewType}
              readonly={readonly}
              enableFields={{
                'spec.settings': {}
              }}
              allowableTypes={allowableTypes}
            />
            <CIStepOptionalConfig
              stepViewType={stepViewType}
              readonly={readonly}
              enableFields={{
                'spec.privileged': {
                  shouldHide: [
                    CIBuildInfrastructureType.Cloud,
                    CIBuildInfrastructureType.VM,
                    CIBuildInfrastructureType.KubernetesHosted,
                    CIBuildInfrastructureType.Docker
                  ].includes(buildInfrastructureType)
                }
              }}
              allowableTypes={allowableTypes}
            />
            <StepCommonFields
              enableFields={['spec.imagePullPolicy']}
              disabled={readonly}
              allowableTypes={allowableTypes}
              buildInfrastructureType={buildInfrastructureType}
            />
          </FormikForm>
        )
      }}
    </Formik>
  )
}

export const ZeroNorthStepBaseWithRef = React.forwardRef(ZeroNorthStepBase)
