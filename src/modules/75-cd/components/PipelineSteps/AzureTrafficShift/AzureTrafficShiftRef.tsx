/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import * as Yup from 'yup'
import { Formik, FormInput, getMultiTypeFromValue, MultiTypeInputType, AllowedTypes } from '@harness/uicore'
import { get } from 'lodash-es'
import { useStrings } from 'framework/strings'
import {
  FormMultiTypeDurationField,
  getDurationValidationSchema
} from '@common/components/MultiTypeDuration/MultiTypeDuration'
import { useQueryParams } from '@common/hooks'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { setFormikRef, StepFormikFowardRef, StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { ALLOWED_VALUES_TYPE, ConfigureOptions } from '@common/components/ConfigureOptions/ConfigureOptions'
import { getNameAndIdentifierSchema } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { getAllowableTypes, isMultiEnv } from '../AzureSlotDeployment/utils'
import type { AzureTrafficShiftProps } from './AzureTrafficShiftInterface.types'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

export const AzureTrafficShiftRef = (props: AzureTrafficShiftProps, formikRef: StepFormikFowardRef): JSX.Element => {
  /* istanbul ignore next */
  const {
    allowableTypes,
    isNewStep = true,
    readonly,
    initialValues,
    onUpdate,
    onChange,
    stepViewType,
    selectedStage
  } = props
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const query = useQueryParams()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionId = (query as any).sectionId || ''

  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialValues}
      formName={`AzureTrafficShift-${sectionId}`}
      validate={values => {
        const payload = {
          ...values
        }
        /* istanbul ignore next */
        onChange?.(payload)
      }}
      onSubmit={values => {
        const payload = {
          ...values
        }
        /* istanbul ignore next */
        onUpdate?.(payload)
      }}
      validationSchema={Yup.object().shape({
        ...getNameAndIdentifierSchema(getString, stepViewType),
        timeout: getDurationValidationSchema({ minimum: '10s' }).required(getString('validation.timeout10SecMinimum')),
        spec: Yup.object().shape({
          traffic: Yup.string().required(getString('fieldRequired', { field: getString('pipeline.traffic') }))
        })
      })}
    >
      {formik => {
        setFormikRef(formikRef, formik)
        return (
          <>
            {stepViewType !== StepViewType.Template && (
              <div className={cx(stepCss.formGroup, stepCss.lg)}>
                <FormInput.InputWithIdentifier
                  inputLabel={getString('name')}
                  isIdentifierEditable={isNewStep}
                  inputGroupProps={{
                    disabled: readonly
                  }}
                />
              </div>
            )}
            <div className={cx(stepCss.formGroup, stepCss.sm)}>
              <FormMultiTypeDurationField
                name="timeout"
                label={getString('pipelineSteps.timeoutLabel')}
                multiTypeDurationProps={{
                  enableConfigureOptions: true,
                  expressions,
                  allowableTypes,
                  newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                }}
                disabled={readonly}
              />
            </div>
            <div className={stepCss.divider} />
            <div className={cx(stepCss.formGroup, stepCss.md)}>
              <FormInput.MultiTextInput
                name="spec.traffic"
                placeholder={getString('pipeline.traffic')}
                label={getString('pipeline.trafficPercentage')}
                multiTextInputProps={{
                  expressions,
                  multitypeInputValue: getMultiTypeFromValue(get(formik.values, 'spec.traffic')),
                  allowableTypes: isMultiEnv(selectedStage)
                    ? (getAllowableTypes(selectedStage) as AllowedTypes)
                    : allowableTypes,
                  newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                }}
                disabled={readonly}
              />
              {getMultiTypeFromValue(get(formik, 'values.spec.traffic')) === MultiTypeInputType.RUNTIME && (
                <ConfigureOptions
                  value={get(formik, 'values.spec.traffic') as string}
                  type="String"
                  variableName="spec.traffic"
                  showRequiredField={false}
                  showDefaultField={false}
                  onChange={
                    /* istanbul ignore next */ value => {
                      formik?.setFieldValue('spec.traffic', value)
                    }
                  }
                  isReadonly={readonly}
                  allowedValuesType={ALLOWED_VALUES_TYPE.TEXT}
                />
              )}
            </div>
          </>
        )
      }}
    </Formik>
  )
}
