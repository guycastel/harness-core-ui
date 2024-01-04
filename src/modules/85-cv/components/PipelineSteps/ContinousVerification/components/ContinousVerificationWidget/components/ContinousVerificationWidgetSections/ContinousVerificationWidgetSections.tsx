/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import Card from '@cv/components/Card/Card'
import { useStrings } from 'framework/strings'
import BaseContinousVerification from './components/BaseContinousVerification/BaseContinousVerification'
import type { ContinousVerificationWidgetSectionsProps } from './types'
import SelectVerificationType from './components/SelectVerificationType/SelectVerificationType'
import SelectMonitoredServiceType from './components/SelectMonitoredServiceType/SelectMonitoredServiceType'
import { MONITORED_SERVICE_TYPE } from './components/SelectMonitoredServiceType/SelectMonitoredServiceType.constants'
import ConfiguredMonitoredService from './components/ConfiguredMonitoredService/ConfiguredMonitoredService'
import MonitoredService from './components/MonitoredService/MonitoredService'

export function ContinousVerificationWidgetSections({
  formik,
  isNewStep,
  stepViewType,
  allowableTypes,
  readonly
}: ContinousVerificationWidgetSectionsProps): JSX.Element {
  const { CVNG_TEMPLATE_VERIFY_STEP } = useFeatureFlags()

  const { getString } = useStrings()

  const renderMonitoredService = (): JSX.Element | null => {
    const { monitoredService, isMultiServicesOrEnvs = false } = formik?.values?.spec || {}

    if (isMultiServicesOrEnvs) {
      return <Card>{getString('cv.verifyStep.monitoredServiceMultipleServiceEnvHideMessge')}</Card>
    }

    if (monitoredService?.type === MONITORED_SERVICE_TYPE.CONFIGURED) {
      return <ConfiguredMonitoredService allowableTypes={allowableTypes} formik={formik} />
    }

    if (
      monitoredService?.type === MONITORED_SERVICE_TYPE.DEFAULT &&
      stepViewType !== 'Template' &&
      !isMultiServicesOrEnvs
    ) {
      return <MonitoredService formik={formik} />
    }
    return null
  }

  return (
    <>
      <BaseContinousVerification
        formik={formik}
        isNewStep={isNewStep}
        stepViewType={stepViewType}
        allowableTypes={allowableTypes}
        readonly={readonly}
      />
      <SelectVerificationType formik={formik} allowableTypes={allowableTypes} readonly={readonly} />
      {CVNG_TEMPLATE_VERIFY_STEP && (
        <SelectMonitoredServiceType formik={formik} allowableTypes={allowableTypes} readonly={readonly} />
      )}
      {CVNG_TEMPLATE_VERIFY_STEP ? renderMonitoredService() : <MonitoredService formik={formik} />}
    </>
  )
}
