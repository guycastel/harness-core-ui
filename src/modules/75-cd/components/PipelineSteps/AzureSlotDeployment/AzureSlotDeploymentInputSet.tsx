/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { isEmpty } from 'lodash-es'
import cx from 'classnames'
import { FormikForm, MultiTypeInputType, getMultiTypeFromValue } from '@harness/uicore'

import { connect, FormikContextType } from 'formik'
import { useStrings } from 'framework/strings'

import { FormMultiTypeCheckboxField } from '@common/components'

import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { TimeoutFieldInputSetView } from '@pipeline/components/InputSetView/TimeoutFieldInputSetView/TimeoutFieldInputSetView'
import { TextFieldInputSetView } from '@pipeline/components/InputSetView/TextFieldInputSetView/TextFieldInputSetView'
import { isExecutionTimeFieldDisabled } from '@pipeline/utils/runPipelineUtils'

import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { AzureSlotDeploymentDynamicField, AzureSlotDeploymentDynamicProps } from './AzureWebAppField'
import type { AzureSlotDeploymentData, AzureSlotDeploymentProps } from './AzureSlotDeploymentInterface.types'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

const isRuntime = (value: string): boolean => getMultiTypeFromValue(value) === MultiTypeInputType.RUNTIME

export function AzureSlotDeploymentInputSetRef<T extends AzureSlotDeploymentData = AzureSlotDeploymentData>(
  props: AzureSlotDeploymentProps<T> & { formik?: FormikContextType<any> }
): React.ReactElement {
  const { inputSetData, readonly, allowableTypes, stepViewType, formik, path } = props
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()

  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  return (
    <FormikForm>
      {formik ? (
        <AzureSlotDeploymentDynamicField
          webAppNamePath={`${path}.spec.webApp`}
          webAppSlotPath={`${path}.spec.deploymentSlot`}
          isRuntime={true}
          {...(props as AzureSlotDeploymentDynamicProps)}
        />
      ) : (
        <>
          {isRuntime(inputSetData?.template?.spec?.webApp as string) && (
            <TextFieldInputSetView
              label={getString('cd.serviceDashboard.webApp')}
              name={`${isEmpty(inputSetData?.path) ? '' : `${inputSetData?.path}.`}spec.webApp`}
              disabled={readonly}
              multiTextInputProps={{
                expressions,
                disabled: readonly,
                allowableTypes,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              }}
              configureOptionsProps={{
                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
              }}
              fieldPath={'spec.webApp'}
              template={inputSetData?.template}
              className={cx(stepCss.formGroup, stepCss.md)}
            />
          )}
          {isRuntime(inputSetData?.template?.spec?.deploymentSlot as string) && (
            <TextFieldInputSetView
              label={getString('cd.serviceDashboard.deploymentSlotTitle')}
              name={`${isEmpty(inputSetData?.path) ? '' : `${inputSetData?.path}.`}spec.deploymentSlot`}
              disabled={readonly}
              multiTextInputProps={{
                expressions,
                disabled: readonly,
                allowableTypes,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              }}
              configureOptionsProps={{
                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
              }}
              fieldPath={'spec.deploymentSlot'}
              template={inputSetData?.template}
              className={cx(stepCss.formGroup, stepCss.md)}
            />
          )}
        </>
      )}
      {
        /* istanbul ignore next */
        isRuntime(inputSetData?.template?.timeout as string) && (
          <TimeoutFieldInputSetView
            label={getString('pipelineSteps.timeoutLabel')}
            name={`${isEmpty(inputSetData?.path) ? '' : `${inputSetData?.path}.`}timeout`}
            disabled={readonly}
            multiTypeDurationProps={{
              configureOptionsProps: {
                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
              },
              allowableTypes,
              expressions,
              disabled: readonly,
              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            }}
            template={inputSetData?.template}
            fieldPath={'timeout'}
            className={cx(stepCss.formGroup, stepCss.md)}
          />
        )
      }
      {isRuntime(inputSetData?.template?.spec?.clean as string) && (
        <div className={cx(stepCss.formGroup, stepCss.sm)}>
          <FormMultiTypeCheckboxField
            name={`${isEmpty(inputSetData?.path) ? '' : `${inputSetData?.path}.`}spec.clean`}
            label={getString('optionalField', { name: getString('pipeline.buildInfra.clean') })}
            multiTypeTextbox={{
              expressions,
              allowableTypes,
              disabled: readonly,
              width: 416.5,
              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            }}
            tooltipProps={{ dataTooltipId: 'cleanAzureSlotDeployment' }}
            disabled={readonly}
          />
        </div>
      )}
    </FormikForm>
  )
}

const AzureSlotDeploymentInputSet = connect(AzureSlotDeploymentInputSetRef)
export default AzureSlotDeploymentInputSet
