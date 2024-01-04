/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo } from 'react'
import { Formik } from '@harness/uicore'

import * as Yup from 'yup'
import type { FormikErrors, FormikProps } from 'formik'

import { isEmpty } from 'lodash-es'
import { StepFormikFowardRef, setFormikRef } from '@pipeline/components/AbstractSteps/Step'
import { useStrings } from 'framework/strings'

import { getNameAndIdentifierSchema } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { getDurationValidationSchema } from '@common/components/MultiTypeDuration/MultiTypeDuration'
import type { DeploymentStageElementConfig } from '@pipeline/utils/pipelineTypes'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { ModuleName } from 'framework/types/ModuleName'
import { useTelemetry } from '@common/hooks/useTelemetry'
import type { ContinousVerificationData } from '../../types'
import type { ContinousVerificationWidgetProps } from './types'
import { ContinousVerificationWidgetSections } from './components/ContinousVerificationWidgetSections/ContinousVerificationWidgetSections'
import { getMonitoredServiceRefFromType, validateMonitoredService } from './ContinousVerificationWidget.utils'
import { getIsMultiServiceOrEnvs } from '../../utils'
import { Category, VerifyStepActions } from '../../constants'
import { VerificationTypes } from './components/ContinousVerificationWidgetSections/components/ConfigureFields/constants'

/**
 * Spec
 * https://harness.atlassian.net/wiki/spaces/LEARNING/pages/1762656555/Change+intelligence+-+CDNG+integration
 */

export function ContinousVerificationWidget(
  {
    initialValues,
    onUpdate,
    isNewStep,
    stepViewType,
    onChange,
    allowableTypes,
    readonly
  }: ContinousVerificationWidgetProps,
  formikRef: StepFormikFowardRef
): JSX.Element {
  const { getString } = useStrings()
  const { trackEvent } = useTelemetry()
  const {
    state: {
      selectionState: { selectedStageId }
    },
    getStageFromPipeline
  } = usePipelineContext()
  const selectedStage = getStageFromPipeline<DeploymentStageElementConfig>(selectedStageId as string)?.stage

  const isMultiServicesOrEnvs = useMemo(() => {
    return getIsMultiServiceOrEnvs(selectedStage)
  }, [selectedStage])

  const values = {
    ...initialValues,
    spec: {
      ...initialValues.spec,
      isMultiServicesOrEnvs,
      ...(initialValues?.spec?.monitoredService && { initialMonitoredService: initialValues?.spec?.monitoredService })
    }
  }

  const validateForm = (formData: ContinousVerificationData): FormikErrors<ContinousVerificationData> => {
    let errors: FormikErrors<ContinousVerificationData> = {}
    const isMultiServiesOrEnvs = formData?.spec?.isMultiServicesOrEnvs
    const {
      healthSources = [],
      monitoredService: { type },
      monitoredService,
      initialMonitoredService,
      type: verificationType,
      spec
    } = formData?.spec || {}
    if (verificationType !== VerificationTypes.SimpleVerification && isEmpty(spec?.sensitivity)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      errors['spec.spec.sensitivity'] = getString('platform.connectors.cdng.validations.sensitivityRequired')
    }

    const monitoredServiceRef = getMonitoredServiceRefFromType(monitoredService, type, formData)
    const { monitoredServiceTemplateRef = '', templateInputs = {} as unknown } = monitoredService?.spec || {}
    const { templateInputs: initialTemplateInputs = {} } = initialMonitoredService?.spec || {}
    const templateInputsToValidate = (!isEmpty(initialTemplateInputs) ? initialTemplateInputs : templateInputs) as any

    errors = validateMonitoredService(
      type,
      stepViewType,
      monitoredServiceRef,
      errors,
      healthSources,
      getString,
      monitoredServiceTemplateRef,
      templateInputsToValidate,
      templateInputs,
      isMultiServiesOrEnvs
    )

    return errors
  }

  const defaultCVSchema = Yup.object().shape({
    ...getNameAndIdentifierSchema(getString, stepViewType),
    timeout: Yup.string().when(['spec.spec.duration.value'], {
      is: durationValue => durationValue?.length,
      then: getDurationValidationSchema({ minimum: '40m' }).required(
        getString('platform.connectors.cdng.validations.timeoutValidation')
      )
    }),
    spec: Yup.object().shape({
      type: Yup.string().required(getString('platform.connectors.cdng.validations.verificationTypeRequired')),
      spec: Yup.object().shape({
        duration: Yup.string().required(getString('platform.connectors.cdng.validations.durationRequired')),
        deploymentTag: Yup.string().required(getString('platform.connectors.cdng.validations.deploymentTagRequired'))
      })
    })
  })

  return (
    <Formik<ContinousVerificationData>
      onSubmit={submit => {
        trackEvent(VerifyStepActions.ApplyChangesVerifyStep, { category: Category.VERIFY_STEP, module: ModuleName.CD })
        onUpdate?.(submit)
      }}
      validate={data => {
        const errors = validateForm(data)
        if (!isEmpty(errors)) {
          onChange?.(data)
          return errors
        } else {
          onChange?.(data)
        }
      }}
      formName="cvData"
      initialValues={values}
      validationSchema={defaultCVSchema}
    >
      {(formik: FormikProps<ContinousVerificationData>) => {
        setFormikRef(formikRef, formik)
        return (
          <ContinousVerificationWidgetSections
            formik={formik}
            isNewStep={isNewStep}
            stepViewType={stepViewType}
            allowableTypes={allowableTypes}
            readonly={readonly}
          />
        )
      }}
    </Formik>
  )
}

export const ContinousVerificationWidgetWithRef = React.forwardRef(ContinousVerificationWidget)
