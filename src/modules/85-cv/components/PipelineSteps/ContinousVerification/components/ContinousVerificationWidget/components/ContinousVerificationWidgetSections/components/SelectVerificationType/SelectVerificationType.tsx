/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useMemo } from 'react'
import { AllowedTypes, Text, Layout } from '@harness/uicore'
import { useFormikContext } from 'formik'
import type { FormikProps } from 'formik'
import { useStrings } from 'framework/strings'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import Card from '@cv/components/Card/Card'
import type { ContinousVerificationData } from '@cv/components/PipelineSteps/ContinousVerification/types'
import { continousVerificationTypes } from './constants'
import ConfigureFields from '../ConfigureFields/ConfigureFields'
import { VerificationTypes } from '../ConfigureFields/constants'
import VerificationTypeDropdown from './components/VerificationTypeDropdown'
interface SelectVerificationTypeProps {
  formik: FormikProps<ContinousVerificationData>
  allowableTypes: AllowedTypes
  readonly?: boolean
}

export default function SelectVerificationType(props: SelectVerificationTypeProps): React.ReactElement {
  const { formik, allowableTypes, readonly } = props

  const { setFieldValue } = useFormikContext()

  const { getString } = useStrings()

  useEffect(() => {
    if (formik.values?.spec?.type === VerificationTypes.SimpleVerification) {
      setFieldValue('spec.spec.sensitivity', undefined)
      setFieldValue('spec.spec.failOnNoAnalysis', undefined)
    }
  }, [formik.values?.spec?.type])

  const isSimpleVerificationEnabled = useFeatureFlag(FeatureFlag.SRM_ENABLE_SIMPLE_VERIFICATION)

  const continousVerificationTypeOptions = useMemo(() => {
    const options = [...continousVerificationTypes]

    if (isSimpleVerificationEnabled) {
      options.push({
        value: VerificationTypes.SimpleVerification,
        label: getString('pipeline.deploymentType.thresholdAnalysis'),
        icon: { name: 'simple-verification' },
        descriptionKey: 'cv.verifyStep.verificationTypesDescription.simpleVerification'
      })
    }

    return options
  }, [isSimpleVerificationEnabled])

  return (
    <Card>
      <>
        <Layout.Vertical spacing={'medium'}>
          <Text font={{ size: 'small' }}>{getString('platform.connectors.cdng.verificationTypeHeading')}</Text>
          <VerificationTypeDropdown verificationTypeOptions={continousVerificationTypeOptions} readonly={readonly} />
        </Layout.Vertical>
        {formik?.values?.spec?.type ? (
          <ConfigureFields formik={formik} allowableTypes={allowableTypes} readonly={readonly} />
        ) : null}
      </>
    </Card>
  )
}
