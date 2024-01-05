/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import cx from 'classnames'
import { FormikContextType } from 'formik'
import { get, isEmpty } from 'lodash-es'
import React from 'react'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { isExecutionTimeFieldDisabled } from '@pipeline/utils/runPipelineUtils'
import MultiTypeSecretInput from '@secrets/components/MutiTypeSecretInput/MultiTypeSecretInput'
import { useStrings } from 'framework/strings'
import { TimeoutFieldInputSetView } from '@pipeline/components/InputSetView/TimeoutFieldInputSetView/TimeoutFieldInputSetView'
import { isValueRuntimeInput } from '@common/utils/utils'
import { SLSAVerificationStepData, SLSAVerificationStepProps } from './SLSAVerificationStepBase'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

export default function SLSAVerificationStepInputSet(
  props: SLSAVerificationStepProps & { formik?: FormikContextType<SLSAVerificationStepData> }
): React.ReactElement {
  const { template, path, readonly, stepViewType, allowableTypes } = props
  const { getString } = useStrings()
  const prefix = isEmpty(path) ? '' : `${path}.`
  const { expressions } = useVariablesExpression()

  return (
    <>
      {isValueRuntimeInput(template?.timeout) && (
        <TimeoutFieldInputSetView
          label={getString('pipelineSteps.timeoutLabel')}
          name={`${prefix}timeout`}
          disabled={readonly}
          multiTypeDurationProps={{
            configureOptionsProps: {
              isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
            },
            allowableTypes,
            expressions,
            disabled: readonly
          }}
          fieldPath={'timeout'}
          template={template}
          className={cx(stepCss.formGroup, stepCss.sm)}
        />
      )}

      {isValueRuntimeInput(get(template, 'spec.verify_attestation.spec.public_key', '')) && (
        <div className={cx(stepCss.formGroup, stepCss.md)}>
          <MultiTypeSecretInput
            type="SecretFile"
            expressions={expressions}
            name={`${prefix}spec.verify_attestation.spec.public_key`}
            label={getString('ssca.publicKey')}
            disabled={readonly}
          />
        </div>
      )}
    </>
  )
}
