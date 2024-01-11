/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import cx from 'classnames'
import { get, isEmpty } from 'lodash-es'
import React from 'react'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { isExecutionTimeFieldDisabled } from '@pipeline/utils/runPipelineUtils'
import { useStrings } from 'framework/strings'
import { TimeoutFieldInputSetView } from '@pipeline/components/InputSetView/TimeoutFieldInputSetView/TimeoutFieldInputSetView'
import { isValueRuntimeInput } from '@common/utils/utils'
import { TextFieldInputSetView } from '@pipeline/components/InputSetView/TextFieldInputSetView/TextFieldInputSetView'
import {
  PolicyEnforcementCdStepData,
  PolicyEnforcementStepData,
  SBOMOrchestrationCdStepData,
  SBOMOrchestrationStepData,
  SscaStepProps
} from './types'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

export function CommonInputSet(
  props: SscaStepProps<
    PolicyEnforcementCdStepData | PolicyEnforcementStepData | SBOMOrchestrationCdStepData | SBOMOrchestrationStepData
  >
): React.ReactElement {
  const { template, path, readonly, stepViewType, allowableTypes } = props
  const { getString } = useStrings()
  const prefix = isEmpty(path) ? '' : `${path}.`
  const { expressions } = useVariablesExpression()

  const textFieldInputSetViewCommonProps = {
    disabled: readonly,
    template,
    multiTextInputProps: {
      expressions,
      allowableTypes
    },
    configureOptionsProps: {
      isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
    },
    className: cx(stepCss.formGroup, stepCss.md)
  }

  return (
    <>
      {isValueRuntimeInput(get(template, 'spec.source.spec.url')) && (
        <TextFieldInputSetView
          name={`${path}spec.source.spec.url`}
          fieldPath="spec.source.spec.url"
          label={getString('repositoryUrlLabel')}
          {...textFieldInputSetViewCommonProps}
        />
      )}

      {isValueRuntimeInput(get(template, 'spec.source.spec.path')) && (
        <TextFieldInputSetView
          name={`${path}spec.source.spec.path`}
          fieldPath={'spec.source.spec.path'}
          label={getString('pipelineSteps.sourcePathLabel')}
          {...textFieldInputSetViewCommonProps}
        />
      )}

      {isValueRuntimeInput(get(template, 'spec.source.spec.variant')) && (
        <TextFieldInputSetView
          name={`${path}spec.source.spec.variant`}
          fieldPath={'spec.source.spec.variant'}
          label={getString('ssca.variantValue')}
          {...textFieldInputSetViewCommonProps}
        />
      )}

      {isValueRuntimeInput(get(template, 'spec.source.spec.cloned_codebase')) && (
        <TextFieldInputSetView
          name={`${path}spec.source.spec.cloned_codebase`}
          fieldPath={'spec.source.spec.cloned_codebase'}
          label={getString('pipelineSteps.workspace')}
          {...textFieldInputSetViewCommonProps}
        />
      )}

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
    </>
  )
}
