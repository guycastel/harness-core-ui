/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useParams } from 'react-router-dom'
import { defaultTo, get, isEmpty } from 'lodash-es'
import { connect, FormikProps } from 'formik'
import cx from 'classnames'
import type { AllowedTypes } from '@harness/uicore'

import type { PipelineInfoConfig } from 'services/pipeline-ng'
import { useStrings } from 'framework/strings'
import type { GitQueryParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useQueryParams } from '@common/hooks'
import { isValueRuntimeInput } from '@common/utils/utils'
import { FormMultiTypeCheckboxField } from '@common/components'
import { FormMultiTypeDurationField } from '@common/components/MultiTypeDuration/MultiTypeDuration'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { TextFieldInputSetView } from '@pipeline/components/InputSetView/TextFieldInputSetView/TextFieldInputSetView'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'

import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import type { AwsCDKSynthStepInitialValues } from './AwsCDKSynthStep'
import { awsCdkStepAllowedConnectorTypes } from '../AwsCDKCommonFields'
import { AwsCdkStepCommonOptionalFieldsInputSet } from '../AwsCDKCommonFieldsInputSet'

import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

interface AwsCDKSynthStepInputSetProps {
  initialValues: AwsCDKSynthStepInitialValues
  allowableTypes: AllowedTypes
  inputSetData: {
    allValues?: AwsCDKSynthStepInitialValues
    template?: AwsCDKSynthStepInitialValues
    path?: string
    readonly?: boolean
  }
  formik?: FormikProps<PipelineInfoConfig>
}

function AwsCDKSynthStepInputSet(props: AwsCDKSynthStepInputSetProps): React.ReactElement {
  const { initialValues, inputSetData, allowableTypes } = props
  const { template, path, readonly } = inputSetData

  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()

  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const prefix = isEmpty(path) ? '' : `${path}.`

  const renderConnectorField = (fieldName: string, fieldLabel: string): React.ReactElement => {
    return (
      <div className={cx(stepCss.formGroup, stepCss.md)}>
        <FormMultiTypeConnectorField
          disabled={readonly}
          name={fieldName}
          selected={get(initialValues, fieldName, '')}
          label={fieldLabel}
          placeholder={getString('select')}
          setRefValue
          multiTypeProps={{
            allowableTypes,
            expressions,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
          }}
          width={416.5}
          accountIdentifier={accountId}
          projectIdentifier={projectIdentifier}
          orgIdentifier={orgIdentifier}
          type={awsCdkStepAllowedConnectorTypes}
          gitScope={{
            repo: defaultTo(repoIdentifier, ''),
            branch: defaultTo(branch, ''),
            getDefaultFromOtherRepo: true
          }}
          templateProps={{
            isTemplatizedView: true,
            templateValue: get(template, fieldName)
          }}
        />
      </div>
    )
  }

  return (
    <>
      {isValueRuntimeInput(get(template, `timeout`)) && (
        <div className={cx(stepCss.formGroup, stepCss.md)}>
          <FormMultiTypeDurationField
            name={`${prefix}timeout`}
            label={getString('pipelineSteps.timeoutLabel')}
            multiTypeDurationProps={{
              enableConfigureOptions: false,
              allowableTypes,
              expressions,
              disabled: readonly,
              width: 416.5,
              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            }}
            disabled={readonly}
          />
        </div>
      )}

      {isValueRuntimeInput(get(template, `spec.connectorRef`)) &&
        renderConnectorField(`${prefix}spec.connectorRef`, getString('pipelineSteps.connectorLabel'))}

      {isValueRuntimeInput(get(template, `spec.image`)) && (
        <div className={cx(stepCss.formGroup, stepCss.md)}>
          <TextFieldInputSetView
            name={`${prefix}spec.image`}
            label={getString('imageLabel')}
            placeholder={getString('pipeline.artifactsSelection.existingDocker.imageNamePlaceholder')}
            disabled={readonly}
            multiTextInputProps={{
              expressions,
              allowableTypes,
              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            }}
            fieldPath={`spec.image`}
            template={template}
          />
        </div>
      )}

      <AwsCdkStepCommonOptionalFieldsInputSet
        commandOptionsLabel="cd.steps.awsCdkStep.awsCdkSynthCommandOptions"
        {...props}
        stepType={StepType.AwsCdkSynth}
      />
      {isValueRuntimeInput(get(template, `spec.exportTemplate`)) && (
        <div className={cx(stepCss.formGroup, stepCss.sm)}>
          <FormMultiTypeCheckboxField
            name={`${prefix}spec.exportTemplate`}
            label={getString('optionalField', { name: getString('pipeline.buildInfra.exportTemplate') })}
            multiTypeTextbox={{
              expressions,
              allowableTypes,
              disabled: readonly,
              width: 416.5,
              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            }}
            tooltipProps={{ dataTooltipId: 'exportTemplate' }}
            disabled={readonly}
          />
        </div>
      )}
    </>
  )
}

export const AwsCDKSynthStepInputSetMode = connect(AwsCDKSynthStepInputSet)
