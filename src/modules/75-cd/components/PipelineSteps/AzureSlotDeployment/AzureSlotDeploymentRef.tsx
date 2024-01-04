/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import * as Yup from 'yup'
import { Formik, FormInput, SelectOption } from '@harness/uicore'

import { get } from 'lodash-es'
import { useStrings } from 'framework/strings'
import { FormMultiTypeCheckboxField } from '@common/components'

import {
  FormMultiTypeDurationField,
  getDurationValidationSchema
} from '@common/components/MultiTypeDuration/MultiTypeDuration'

import { useQueryParams } from '@common/hooks'

import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'

import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { setFormikRef, StepFormikFowardRef, StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { getNameAndIdentifierSchema } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { AzureSlotDeploymentDynamicField } from './AzureWebAppField'
import type { AzureSlotDeploymentProps } from './AzureSlotDeploymentInterface.types'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

export type AcceptableValue = boolean | string | number | SelectOption | string[]

export const AzureSlotDeploymentRef = (
  props: AzureSlotDeploymentProps,
  formikRef: StepFormikFowardRef
): JSX.Element => {
  /* istanbul ignore next */
  const { allowableTypes, isNewStep = true, readonly, initialValues, onUpdate, onChange, stepViewType } = props
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const query = useQueryParams()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionId = (query as any).sectionId || ''

  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialValues}
      formName={`AzureSlotDeployment-${sectionId}`}
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
          deploymentSlot: Yup.string().required(
            getString('common.validation.fieldIsRequired', {
              name: 'Deployment Slot'
            })
          ),
          webApp: Yup.string().required(
            getString('common.validation.fieldIsRequired', {
              name: 'Web App'
            })
          )
        })
      })}
    >
      {formik => {
        setFormikRef(formikRef, formik)
        if (get(formik, 'values.spec.webApp') && formik.errors?.spec?.webApp) {
          formik.setFieldError('spec.webApp', undefined)
        }
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
            <div className={cx(stepCss.formGroup, stepCss.lg)}>
              <FormMultiTypeCheckboxField
                name={'spec.clean'}
                label={getString('pipeline.buildInfra.clean')}
                multiTypeTextbox={{
                  expressions,
                  allowableTypes,
                  disabled: readonly,
                  newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                }}
                disabled={readonly}
                configureOptionsProps={{ hideExecutionTimeField: true }}
              />
            </div>
            <div className={stepCss.divider} />
            <AzureSlotDeploymentDynamicField {...props} />
          </>
        )
      }}
    </Formik>
  )
}
