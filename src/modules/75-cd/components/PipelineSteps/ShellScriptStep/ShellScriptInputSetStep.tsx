/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import {
  getMultiTypeFromValue,
  MultiTypeInputType,
  FormInput,
  FormikForm,
  AllowedTypes,
  MultiSelectOption,
  SelectOption,
  ExpressionInput,
  EXPRESSION_INPUT_PLACEHOLDER,
  HarnessDocTooltip,
  Label
} from '@harness/uicore'
import { isEmpty, get, isArray, defaultTo } from 'lodash-es'
import cx from 'classnames'
import { FieldArray, useFormikContext } from 'formik'

import { useStrings } from 'framework/strings'
import { ShellScriptMonacoField, ScriptType } from '@common/components/ShellScriptMonaco/ShellScriptMonaco'
import MultiTypeFieldSelector from '@common/components/MultiTypeFieldSelector/MultiTypeFieldSelector'
import { FileUsage } from '@platform/filestore/interfaces/FileStore'
import FileStoreSelectField from '@platform/filestore/components/MultiTypeFileSelect/FileStoreSelect/FileStoreSelectField'
import MultiTypeSecretInput from '@secrets/components/MutiTypeSecretInput/MultiTypeSecretInput'
import type { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { TimeoutFieldInputSetView } from '@pipeline/components/InputSetView/TimeoutFieldInputSetView/TimeoutFieldInputSetView'
import { TextFieldInputSetView } from '@pipeline/components/InputSetView/TextFieldInputSetView/TextFieldInputSetView'
import MultiTypeConfigFileSelect from '@pipeline/components/StartupScriptSelection/MultiTypeConfigFileSelect'
import {
  isExecutionTimeFieldDisabled,
  getAllowableTypesWithoutExpressionAndExecutionTime
} from '@pipeline/utils/runPipelineUtils'
import { useFeatureFlag, useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import {
  MultiSelectVariableAllowedValues,
  concatValuesWithQuotes,
  isFixedInput
} from '@pipeline/components/PipelineSteps/Steps/CustomVariables/MultiSelectVariableAllowedValues/MultiSelectVariableAllowedValues'
import { getAllowedValuesFromTemplate, shouldRenderRunTimeInputViewWithAllowedValues } from '@pipeline/utils/CIUtils'
import { FormMultiTypeCheckboxField } from '@common/components'
import { ShellScriptStepInfo } from 'services/pipeline-ng'
import { isValueRuntimeInput } from '@modules/10-common/utils/utils'
import {
  scriptOutputType,
  ShellScriptData,
  ShellScriptFormData,
  shellScriptInputType,
  ShellScriptStepVariable
} from './shellScriptTypes'
import { MultiTypeExecutionTargetGroup } from './ExecutionTargetGroup'
import { FixedExecTargetGroup } from './OptionalConfiguration'

import { getShellScriptSecretType, getShellScriptConnectionLabel } from './helper'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'
import css from './ShellScript.module.scss'

export interface ShellScriptInputSetStepProps {
  initialValues: ShellScriptFormData
  onUpdate?: (data: ShellScriptFormData) => void
  onChange?: (data: ShellScriptFormData) => void
  allowableTypes: AllowedTypes
  stepViewType?: StepViewType
  readonly?: boolean
  template?: ShellScriptData
  path?: string
  shellScriptType?: ShellScriptStepInfo['shell']
}

type variablesInfo = {
  selectOption: SelectOption[]
  variableType: 'String' | 'Number' | 'Secret'
  variableValue: string
}
const getMultiSelectProps = (
  template: ShellScriptData,
  initialValues: ShellScriptFormData,
  path: string
): variablesInfo => {
  const selectOpt = defaultTo(getAllowedValuesFromTemplate(template, `${path}.value`), [])
  const variableValue = get(initialValues, `${path}.value`, '')
  const variableType = get(initialValues, `${path}.type`, 'String') as 'String' | 'Number' | 'Secret'

  return {
    selectOption: selectOpt,
    variableType,
    variableValue
  }
}

export default function ShellScriptInputSetStep(props: ShellScriptInputSetStepProps): React.ReactElement {
  const { template, path, readonly, initialValues, allowableTypes, stepViewType, shellScriptType } = props

  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()
  const scriptType: ScriptType = shellScriptType || 'Bash'
  const prefix = isEmpty(path) ? '' : `${path}.`
  const isExecutionTimeFieldDisabledForStep = isExecutionTimeFieldDisabled(stepViewType)
  const multiSelectSupportForAllowedValues = useFeatureFlag(FeatureFlag.PIE_MULTISELECT_AND_COMMA_IN_ALLOWED_VALUES)
  const formik = useFormikContext<ShellScriptFormData>()
  return (
    <FormikForm>
      {getMultiTypeFromValue(template?.timeout) === MultiTypeInputType.RUNTIME && (
        <TimeoutFieldInputSetView
          multiTypeDurationProps={{
            configureOptionsProps: {
              isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
            },
            allowableTypes,
            expressions,
            disabled: readonly
          }}
          label={getString('pipelineSteps.timeoutLabel')}
          name={`${prefix}timeout`}
          disabled={readonly}
          fieldPath={'timeout'}
          template={template}
          className={cx(stepCss.formGroup, stepCss.sm)}
        />
      )}
      {getMultiTypeFromValue(template?.spec?.source?.spec?.script) === MultiTypeInputType.RUNTIME && (
        <div className={cx(stepCss.formGroup, stepCss.alignStart, stepCss.md)}>
          <MultiTypeFieldSelector
            name={`${prefix}spec.source.spec.script`}
            label={getString('common.script')}
            defaultValueToReset=""
            disabled={readonly}
            allowedTypes={allowableTypes}
            enableConfigureOptions={true}
            configureOptionsProps={{
              isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
            }}
            disableTypeSelection={readonly}
            skipRenderValueInExpressionLabel
            expressionRender={() => {
              return (
                <ShellScriptMonacoField
                  name={`${prefix}spec.source.spec.script`}
                  scriptType={scriptType}
                  disabled={readonly}
                  expressions={expressions}
                />
              )
            }}
          >
            <ShellScriptMonacoField
              name={`${prefix}spec.source.spec.script`}
              scriptType={scriptType}
              disabled={readonly}
              expressions={expressions}
            />
          </MultiTypeFieldSelector>
        </div>
      )}
      {getMultiTypeFromValue(template?.spec?.source?.spec?.file) === MultiTypeInputType.RUNTIME && (
        <div className={cx(stepCss.formGroup, stepCss.alignStart, stepCss.md)}>
          <MultiTypeConfigFileSelect
            name={`${prefix}spec.source.spec.file`}
            label={''}
            defaultValueToReset={''}
            hideError={true}
            style={{ marginBottom: 0, marginTop: 0 }}
            disableTypeSelection={false}
            supportListOfExpressions={true}
            onTypeChange={() => {
              formik?.setFieldValue(`${prefix}spec.source.spec.file`, undefined)
            }}
            defaultType={getMultiTypeFromValue(
              get(formik?.values, `${prefix}spec.source.spec.file`),
              [MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION, MultiTypeInputType.RUNTIME],
              true
            )}
            allowedTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION, MultiTypeInputType.RUNTIME]}
            expressionRender={() => {
              return (
                <ExpressionInput
                  name={`${prefix}spec.source.spec.file`}
                  value={get(formik?.values, `${prefix}spec.source.spec.file`)}
                  disabled={false}
                  newExpressionComponent={NG_EXPRESSIONS_NEW_INPUT_ELEMENT}
                  inputProps={{ placeholder: EXPRESSION_INPUT_PLACEHOLDER }}
                  items={expressions}
                  onChange={val =>
                    /* istanbul ignore next */
                    formik?.setFieldValue(`${prefix}spec.source.spec.file`, val)
                  }
                />
              )
            }}
          >
            <FileStoreSelectField
              label={getString('common.git.filePath')}
              name={`${prefix}spec.source.spec.file`}
              onChange={(newValue: string) => {
                formik?.setFieldValue(`${prefix}spec.source.spec.file`, newValue)
                formik?.setFieldValue(`${prefix}spec.source.spec.file`, undefined)
              }}
              fileUsage={FileUsage.SCRIPT}
            />
          </MultiTypeConfigFileSelect>
        </div>
      )}

      {getMultiTypeFromValue(template?.spec?.includeInfraSelectors) === MultiTypeInputType.RUNTIME && (
        <div className={cx(stepCss.formGroup, stepCss.md)}>
          <FormMultiTypeCheckboxField
            multiTypeTextbox={{
              expressions,
              allowableTypes,
              disabled: readonly,
              defaultValueToReset: false
            }}
            enableConfigureOptions={true}
            configureOptionsProps={{
              isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
            }}
            disabled={readonly}
            name={`${prefix}spec.includeInfraSelectors`}
            label={getString('pipeline.includeInfrastructureSelectors')}
            setToFalseWhenEmpty={true}
          />
        </div>
      )}

      {isArray(template?.spec?.environmentVariables) && template?.spec?.environmentVariables && (
        <div className={stepCss.formGroup}>
          <MultiTypeFieldSelector
            name="spec.environmentVariables"
            label={getString('pipeline.scriptInputVariables')}
            defaultValueToReset={[]}
            disableTypeSelection
            data-tooltip-id={`shellScriptInputVariable_${shellScriptType}`}
            tooltipProps={{ dataTooltipId: `shellScriptInputVariable_${shellScriptType}` }}
          >
            <FieldArray
              name="spec.environmentVariables"
              render={() => {
                const formikEnvironmentVariablesPath = `${prefix}spec.environmentVariables`
                const formikEnvironmentVariables = defaultTo(get(formik?.values, formikEnvironmentVariablesPath), [])
                return (
                  <div className={css.panel}>
                    <div className={css.environmentVarHeader}>
                      <span className={css.label}>{getString('name')}</span>
                      <span className={css.label}>{getString('typeLabel')}</span>
                      <span className={css.label}>{getString('valueLabel')}</span>
                    </div>
                    {template.spec.environmentVariables?.map((environmentVariable, i: number) => {
                      // find Index from values, not from template variables
                      // because the order of the variables might not be the same
                      const formikEnvironmentVariableIndex = formikEnvironmentVariables.findIndex(
                        (formikEnvironmentVariable: ShellScriptStepVariable) =>
                          environmentVariable.name === formikEnvironmentVariable.name
                      )
                      const formikEnvironmentVariablePath = `${formikEnvironmentVariablesPath}[${formikEnvironmentVariableIndex}]`
                      const variableInfo = getMultiSelectProps(
                        template,
                        initialValues,
                        `spec.environmentVariables[${i}]`
                      )
                      const allowMultiSelectAllowedValues =
                        multiSelectSupportForAllowedValues &&
                        variableInfo.variableType === 'String' &&
                        shouldRenderRunTimeInputViewWithAllowedValues(
                          `spec.environmentVariables[${i}].value`,
                          template
                        ) &&
                        isFixedInput(formik, `${formikEnvironmentVariablePath}.value`)

                      return (
                        <div className={css.environmentVarHeader} key={environmentVariable.value}>
                          <FormInput.Text
                            name={`${formikEnvironmentVariablePath}.name`}
                            placeholder={getString('name')}
                            disabled={true}
                          />

                          <FormInput.Select
                            items={shellScriptInputType}
                            name={`${formikEnvironmentVariablePath}.type`}
                            placeholder={getString('typeLabel')}
                            disabled={true}
                          />
                          {get(environmentVariable, 'type') === 'Secret' ? (
                            <MultiTypeSecretInput
                              expressions={expressions}
                              allowableTypes={allowableTypes}
                              name={`${formikEnvironmentVariablePath}.value`}
                              disabled={readonly}
                              label=""
                              templateProps={{
                                isTemplatizedView: true,
                                templateValue: get(template, `${formikEnvironmentVariablePath}.value`)
                              }}
                              enableConfigureOptions
                              configureOptionsProps={{
                                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
                              }}
                            />
                          ) : allowMultiSelectAllowedValues ? (
                            <MultiSelectVariableAllowedValues
                              name={`${formikEnvironmentVariablePath}.value`}
                              allowableTypes={allowableTypes}
                              disabled={readonly}
                              selectOption={variableInfo.selectOption}
                              onChange={val => {
                                const finalValue =
                                  getMultiTypeFromValue(val) === MultiTypeInputType.FIXED
                                    ? concatValuesWithQuotes(val as MultiSelectOption[])
                                    : val
                                formik.setFieldValue(`${formikEnvironmentVariablePath}.value`, finalValue)
                              }}
                              label=""
                              multiTextInputProps={{
                                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                              }}
                            />
                          ) : (
                            <TextFieldInputSetView
                              name={`${formikEnvironmentVariablePath}.value`}
                              multiTextInputProps={{
                                allowableTypes,
                                expressions,
                                disabled: readonly,
                                defaultValueToReset: '',
                                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                              }}
                              label=""
                              placeholder={getString('valueLabel')}
                              fieldPath={`spec.environmentVariables[${i}].value`}
                              template={template}
                              enableConfigureOptions
                              configureOptionsProps={{
                                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
                              }}
                              className={css.shellScriptVariable}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              }}
            />
          </MultiTypeFieldSelector>
        </div>
      )}
      {isArray(template?.spec?.outputVariables) && template?.spec?.outputVariables && (
        <div className={stepCss.formGroup}>
          <MultiTypeFieldSelector
            name="spec.outputVariables"
            label={getString('pipeline.scriptOutputVariables')}
            defaultValueToReset={[]}
            disableTypeSelection
            data-tooltip-id={`shellScriptOutputVariable_${shellScriptType}`}
            tooltipProps={{ dataTooltipId: `shellScriptOutputVariable_${shellScriptType}` }}
          >
            <FieldArray
              name="spec.outputVariables"
              render={() => {
                const formikOutputVariablesPath = `${prefix}spec.outputVariables`
                const formikOutputVariables = defaultTo(get(formik?.values, formikOutputVariablesPath), [])
                return (
                  <div className={css.panel}>
                    <div className={css.outputVarHeader}>
                      <span className={css.label}>{getString('name')}</span>
                      <span className={css.label}>{getString('typeLabel')}</span>
                      <span className={css.label}>
                        {getString('cd.steps.shellScriptOutputVariablesLabel', { scriptType: shellScriptType })}
                      </span>
                    </div>
                    {template.spec.outputVariables?.map((outputVariable, i: number) => {
                      // find Index from values, not from template variables
                      // because the order of the variables might not be the same
                      const formikOutputVariableIndex = formikOutputVariables.findIndex(
                        (formikOutputVariable: ShellScriptStepVariable) =>
                          outputVariable.name === formikOutputVariable.name
                      )
                      const formikOutputVariablePath = `${formikOutputVariablesPath}[${formikOutputVariableIndex}]`
                      const variableInfo = getMultiSelectProps(template, initialValues, `spec.outputVariables[${i}]`)
                      const allowMultiSelectAllowedValues =
                        multiSelectSupportForAllowedValues &&
                        variableInfo.variableType === 'String' &&
                        shouldRenderRunTimeInputViewWithAllowedValues(`spec.outputVariables[${i}].value`, template) &&
                        isFixedInput(formik, `${formikOutputVariablePath}.value`)
                      return (
                        <div className={css.outputVarHeader} key={outputVariable.name}>
                          <FormInput.Text
                            name={`${formikOutputVariablePath}.name`}
                            placeholder={getString('name')}
                            disabled={true}
                          />

                          <FormInput.Select
                            items={scriptOutputType}
                            name={`${formikOutputVariablePath}.type`}
                            placeholder={getString('typeLabel')}
                            disabled={true}
                          />

                          {allowMultiSelectAllowedValues ? (
                            <MultiSelectVariableAllowedValues
                              name={`${formikOutputVariablePath}.value`}
                              allowableTypes={allowableTypes}
                              disabled={readonly}
                              selectOption={variableInfo.selectOption}
                              onChange={val => {
                                const finalValue =
                                  getMultiTypeFromValue(val) === MultiTypeInputType.FIXED
                                    ? concatValuesWithQuotes(val as MultiSelectOption[])
                                    : val
                                formik.setFieldValue(`${formikOutputVariablePath}.value`, finalValue)
                              }}
                              label=""
                            />
                          ) : (
                            <TextFieldInputSetView
                              name={`${formikOutputVariablePath}.value`}
                              multiTextInputProps={{
                                allowableTypes,
                                expressions,
                                disabled: readonly,
                                defaultValueToReset: ''
                              }}
                              label=""
                              placeholder={getString('valueLabel')}
                              fieldPath={`spec.outputVariables[${i}].value`}
                              template={template}
                              enableConfigureOptions
                              configureOptionsProps={{
                                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
                              }}
                              className={css.shellScriptVariable}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              }}
            />
          </MultiTypeFieldSelector>
        </div>
      )}

      {getMultiTypeFromValue(template?.spec?.outputAlias?.key) === MultiTypeInputType.RUNTIME && (
        <TextFieldInputSetView
          label={getString('pipeline.exportVars.publishVarLabel')}
          multiTextInputProps={{
            expressions,
            disabled: readonly,
            allowableTypes
          }}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
          }}
          disabled={readonly}
          name={`${prefix}spec.outputAlias.key`}
          fieldPath={`spec.outputAlias.key`}
          template={template}
          className={cx(stepCss.formGroup, stepCss.md)}
        />
      )}
      {/*
       * Check for both onDelegate & executionTarget to make changes backward compatible.
       */}
      {(isValueRuntimeInput(template?.spec?.onDelegate) || isValueRuntimeInput(template?.spec?.executionTarget)) && (
        <>
          <div className={cx(stepCss.lg)}>
            <Label>
              <HarnessDocTooltip tooltipId={'exec-target'} labelText={getString('pipeline.executionTarget')} />
            </Label>

            <MultiTypeExecutionTargetGroup
              executionTargetPath={`${prefix}spec.executionTarget`}
              onDelegatePath={`${prefix}spec.onDelegate`}
              formik={formik}
              readonly={readonly}
              allowableTypes={getAllowableTypesWithoutExpressionAndExecutionTime(allowableTypes)}
            />
          </div>
          <div className={cx(stepCss.md)}>
            <FixedExecTargetGroup
              allowableTypes={allowableTypes}
              formik={formik as any}
              prefix={prefix}
              expressions={expressions}
              readonly={readonly}
              shellScriptType={shellScriptType}
            />
          </div>
        </>
      )}
      {getMultiTypeFromValue(template?.spec?.executionTarget?.host) === MultiTypeInputType.RUNTIME && (
        <TextFieldInputSetView
          placeholder={getString('cd.specifyTargetHost')}
          label={getString('targetHost')}
          multiTextInputProps={{
            expressions,
            disabled: readonly,
            allowableTypes
          }}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
          }}
          disabled={readonly}
          name={`${prefix}spec.executionTarget.host`}
          fieldPath={`spec.executionTarget.host`}
          template={template}
          className={cx(stepCss.formGroup, stepCss.md)}
        />
      )}
      {getMultiTypeFromValue(template?.spec?.executionTarget?.connectorRef) === MultiTypeInputType.RUNTIME && (
        <div className={cx(stepCss.formGroup, stepCss.md)}>
          <MultiTypeSecretInput
            type={getShellScriptSecretType(shellScriptType)}
            expressions={expressions}
            allowableTypes={allowableTypes}
            enableConfigureOptions={true}
            configureOptionsProps={{
              isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
            }}
            name={`${prefix}spec.executionTarget.connectorRef`}
            label={getShellScriptConnectionLabel(getString, shellScriptType)}
            disabled={readonly}
          />
        </div>
      )}
      {getMultiTypeFromValue(template?.spec?.executionTarget?.workingDirectory) === MultiTypeInputType.RUNTIME && (
        <TextFieldInputSetView
          disabled={readonly}
          placeholder={getString('cd.enterWorkDirectory')}
          label={getString('workingDirectory')}
          multiTextInputProps={{
            expressions,
            disabled: readonly,
            allowableTypes
          }}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
          }}
          name={`${prefix}spec.executionTarget.workingDirectory`}
          fieldPath={`spec.executionTarget.workingDirectory`}
          template={template}
          className={cx(stepCss.formGroup, stepCss.md)}
        />
      )}
    </FormikForm>
  )
}
