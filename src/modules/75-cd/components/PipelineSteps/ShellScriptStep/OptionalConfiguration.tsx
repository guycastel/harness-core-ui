/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { FormikProps, FieldArray, useFormikContext } from 'formik'
import {
  AllowedTypes,
  Button,
  ButtonVariation,
  FormikForm,
  FormInput,
  getMultiTypeFromValue,
  Layout,
  Text,
  MultiTypeInputType,
  HarnessDocTooltip,
  Label
} from '@harness/uicore'
import { useParams } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { get, isEmpty } from 'lodash-es'

import cx from 'classnames'

import { useStrings } from 'framework/strings'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import MultiTypeFieldSelector from '@common/components/MultiTypeFieldSelector/MultiTypeFieldSelector'
import { isValueFixed, isValueRuntimeInput } from '@common/utils/utils'
import { ConfigureOptions } from '@common/components/ConfigureOptions/ConfigureOptions'
import MultiTypeDelegateSelector from '@common/components/MultiTypeDelegateSelector/MultiTypeDelegateSelector'
import { useFeatureFlag, useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import MultiTypeSecretInput from '@platform/secrets/components/MutiTypeSecretInput/MultiTypeSecretInput'
import { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'

import { SecretConfigureOptions } from '@modules/27-platform/secrets/components/SecretConfigureOptions/SecretConfigureOptions'
import { ShellScriptStepInfo } from 'services/pipeline-ng'
import { getAllowableTypesWithoutExpressionAndExecutionTime } from '@modules/70-pipeline/utils/runPipelineUtils'
import {
  scriptInputType,
  scriptOutputType,
  ShellScriptFormData,
  shellScriptInputType,
  ShellScriptOutputStepVariable,
  ShellScriptStepVariable
} from './shellScriptTypes'
import { getShowExecutionTarget, MultiTypeExecutionTargetGroup } from './ExecutionTargetGroup'

import { getShellScriptSecretType, getShellScriptConnectionLabel } from './helper'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'
import css from './ShellScript.module.scss'

interface FixedExecTargetGroupProps {
  readonly?: boolean
  expressions?: string[]
  allowableTypes: AllowedTypes
  formik: FormikProps<ShellScriptFormData>
  prefix?: string
  shellScriptType?: ShellScriptStepInfo['shell']
}

export const FixedExecTargetGroup = ({
  expressions,
  readonly,
  allowableTypes,
  formik,
  prefix,
  shellScriptType
}: FixedExecTargetGroupProps): React.ReactElement => {
  const { getString } = useStrings()
  const { values: formValues, setFieldValue } = formik
  const delegateFieldPath = prefix ? `${prefix}spec.onDelegate` : 'spec.onDelegate'
  const executionTargetPath = prefix ? `${prefix}spec.executionTarget` : 'spec.executionTarget'
  const onDelegateVal = get(formValues, delegateFieldPath)
  const executionTargetVal = get(formValues, executionTargetPath)
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const showExecutionTarget = getShowExecutionTarget(onDelegateVal, executionTargetVal)

  if (showExecutionTarget) {
    return (
      <div>
        <div className={cx(stepCss.formGroup)}>
          <FormInput.MultiTextInput
            name={`${executionTargetPath}.host`}
            placeholder={getString('cd.specifyTargetHost')}
            label={getString('targetHost')}
            style={{ marginTop: 'var(--spacing-small)' }}
            multiTextInputProps={{
              expressions,
              disabled: readonly,
              allowableTypes,
              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            }}
            disabled={readonly}
          />
          {getMultiTypeFromValue(formValues.spec?.executionTarget?.host) === MultiTypeInputType.RUNTIME && (
            <ConfigureOptions
              value={formValues.spec?.executionTarget?.host}
              type="String"
              variableName="spec.executionTarget.host"
              showRequiredField={false}
              showDefaultField={false}
              onChange={value => setFieldValue('spec.executionTarget.host', value)}
              style={{ marginTop: 12 }}
              isReadonly={readonly}
            />
          )}
        </div>
        <div className={cx(stepCss.formGroup)}>
          <MultiTypeSecretInput
            type={getShellScriptSecretType(shellScriptType)}
            name={`${executionTargetPath}.connectorRef`}
            label={getShellScriptConnectionLabel(getString, shellScriptType)}
            expressions={expressions}
            allowableTypes={allowableTypes}
            disabled={readonly}
          />
          {getMultiTypeFromValue(formValues?.spec?.executionTarget?.connectorRef) === MultiTypeInputType.RUNTIME && (
            <ConfigureOptions
              value={formValues?.spec?.executionTarget?.connectorRef as string}
              type={
                <Layout.Horizontal spacing="medium" style={{ alignItems: 'center' }}>
                  <Text>{getString('pipelineSteps.connectorLabel')}</Text>
                </Layout.Horizontal>
              }
              variableName="spec.executionTarget.connectorRef"
              showRequiredField={false}
              showDefaultField={false}
              onChange={value => {
                setFieldValue('spec.executionTarget.connectorRef', value)
              }}
              style={{ marginTop: 4 }}
              isReadonly={readonly}
            />
          )}
        </div>
        <div className={cx(stepCss.formGroup)}>
          <FormInput.MultiTextInput
            name={`${executionTargetPath}.workingDirectory`}
            placeholder={getString('cd.enterWorkDirectory')}
            label={getString('workingDirectory')}
            style={{ marginTop: 'var(--spacing-medium)' }}
            disabled={readonly}
            multiTextInputProps={{
              expressions,
              disabled: readonly,
              allowableTypes,
              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            }}
          />
          {getMultiTypeFromValue(formValues.spec?.executionTarget?.workingDirectory) === MultiTypeInputType.RUNTIME && (
            <ConfigureOptions
              value={formValues.spec?.executionTarget?.workingDirectory}
              type="String"
              variableName="spec.executionTarget.workingDirectory"
              showRequiredField={false}
              showDefaultField={false}
              onChange={value => setFieldValue('spec.executionTarget.workingDirectory', value)}
              style={{ marginTop: 12 }}
              isReadonly={readonly}
            />
          )}
        </div>
      </div>
    )
  }
  return <div />
}

export default function OptionalConfiguration(props: {
  formik: FormikProps<ShellScriptFormData>
  readonly?: boolean
  allowableTypes: AllowedTypes
  enableOutputVar?: boolean
  stepName?: string
}): React.ReactElement {
  const { formik, readonly, allowableTypes, enableOutputVar = true, stepName } = props
  const { projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()

  const { values: formValues, setFieldValue } = formik
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()

  const shellVariablesExportFF = useFeatureFlag(FeatureFlag.CDS_SHELL_VARIABLES_EXPORT)
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const scopeTypes = [
    {
      label: getString('common.pipeline'),
      value: 'Pipeline'
    },
    {
      label: getString('common.stage'),
      value: 'Stage'
    },
    {
      label: getString('stepGroup'),
      value: 'StepGroup'
    }
  ]

  return (
    <FormikForm>
      <div className={stepCss.stepPanel}>
        <div className={stepCss.formGroup}>
          <MultiTypeFieldSelector
            name="spec.environmentVariables"
            label={getString('pipeline.scriptInputVariables')}
            isOptional
            optionalLabel={getString('common.optionalLabel')}
            defaultValueToReset={[]}
            disableTypeSelection
            data-tooltip-id={`shellScriptInputVariable_${formValues?.spec?.shell}`}
            tooltipProps={{ dataTooltipId: `shellScriptInputVariable_${formValues?.spec?.shell}` }}
          >
            <FieldArray
              name="spec.environmentVariables"
              render={({ push, remove }) => {
                return (
                  <div className={css.panel}>
                    <div className={css.environmentVarHeader}>
                      <span className={css.label}>{getString('name')}</span>
                      <span className={css.label}>{getString('typeLabel')}</span>
                      <span className={css.label}>{getString('valueLabel')}</span>
                    </div>
                    {formValues.spec.environmentVariables?.map(({ id }: ShellScriptStepVariable, i: number) => {
                      return (
                        <div className={css.environmentVarHeader} key={id}>
                          <FormInput.Text
                            name={`spec.environmentVariables[${i}].name`}
                            placeholder={getString('name')}
                            disabled={readonly}
                          />
                          <FormInput.Select
                            items={isEmpty(stepName) ? scriptInputType : shellScriptInputType}
                            name={`spec.environmentVariables[${i}].type`}
                            placeholder={getString('typeLabel')}
                            disabled={readonly}
                          />
                          <OptionalVariables
                            variableSpec={`spec.environmentVariables[${i}]`}
                            allowableTypes={allowableTypes}
                            readonly={readonly}
                            stepName={stepName}
                          />
                          <Button
                            variation={ButtonVariation.ICON}
                            icon="main-trash"
                            data-testid={`remove-environmentVar-${i}`}
                            onClick={() => remove(i)}
                            disabled={readonly}
                          />
                        </div>
                      )
                    })}
                    <Button
                      icon="plus"
                      variation={ButtonVariation.LINK}
                      data-testid="add-environmentVar"
                      disabled={readonly}
                      onClick={() => push({ name: '', type: 'String', value: '', id: uuid() })}
                      className={css.addButton}
                    >
                      {getString('addInputVar')}
                    </Button>
                  </div>
                )
              }}
            />
          </MultiTypeFieldSelector>
        </div>
        {enableOutputVar ? (
          <div className={stepCss.formGroup}>
            <MultiTypeFieldSelector
              name="spec.outputVariables"
              label={getString('pipeline.scriptOutputVariables')}
              isOptional
              optionalLabel={getString('common.optionalLabel')}
              defaultValueToReset={[]}
              disableTypeSelection
              data-tooltip-id={`shellScriptOutputVariable_${formValues?.spec?.shell}`}
              tooltipProps={{ dataTooltipId: `shellScriptOutputVariable_${formValues?.spec?.shell}` }}
            >
              <FieldArray
                name="spec.outputVariables"
                render={({ push, remove }) => {
                  return (
                    <div className={css.panel}>
                      <div className={css.outputVarHeader}>
                        <span className={css.label}>{getString('name')}</span>
                        <span className={css.label}>{getString('typeLabel')}</span>
                        <span className={css.label}>
                          {getString('cd.steps.shellScriptOutputVariablesLabel', {
                            scriptType: formValues?.spec?.shell
                          })}
                        </span>
                      </div>
                      {formValues.spec.outputVariables?.map(({ id }: ShellScriptOutputStepVariable, i: number) => {
                        return (
                          <div className={css.outputVarHeader} key={id}>
                            <FormInput.Text
                              name={`spec.outputVariables[${i}].name`}
                              placeholder={getString('name')}
                              disabled={readonly}
                            />
                            <FormInput.Select
                              items={scriptOutputType}
                              name={`spec.outputVariables[${i}].type`}
                              placeholder={getString('typeLabel')}
                              disabled={readonly}
                            />
                            <FormInput.MultiTextInput
                              name={`spec.outputVariables[${i}].value`}
                              placeholder={getString('valueLabel')}
                              multiTextInputProps={{
                                allowableTypes,
                                expressions,
                                disabled: readonly,
                                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                              }}
                              label=""
                              disabled={readonly}
                            />

                            <Button minimal icon="main-trash" onClick={() => remove(i)} disabled={readonly} />
                          </div>
                        )
                      })}
                      <Button
                        icon="plus"
                        variation={ButtonVariation.LINK}
                        onClick={() => push({ name: '', type: 'String', value: '', id: uuid() })}
                        disabled={readonly}
                        className={css.addButton}
                      >
                        {getString('addOutputVar')}
                      </Button>
                    </div>
                  )
                }}
              />
            </MultiTypeFieldSelector>
          </div>
        ) : null}

        {shellVariablesExportFF ? (
          <>
            <Label className={css.execTargetLabel}>
              <HarnessDocTooltip
                tooltipId={'exec-target'}
                labelText={`${getString('pipeline.exportVars.label')} ${getString('common.optionalLabel')}`}
              />
            </Label>

            <div className={cx(stepCss.formGroup, stepCss.lg)}>
              <FormInput.MultiTextInput
                name={`spec.outputAlias.key`}
                label={getString('pipeline.exportVars.publishVarLabel')}
                tooltipProps={{ dataTooltipId: 'publishVariableName' }}
              />

              {getMultiTypeFromValue(formValues.spec?.export?.alias) === MultiTypeInputType.RUNTIME && (
                <ConfigureOptions
                  value={formValues.spec?.export?.alias}
                  type="String"
                  variableName="spec.outputAlias.key"
                  showRequiredField={false}
                  showDefaultField={false}
                  onChange={value => setFieldValue('spec.outputAlias.key', value)}
                  isReadonly={readonly}
                />
              )}
            </div>
            <div className={cx(stepCss.formGroup, stepCss.lg)}>
              <FormInput.Select
                items={scopeTypes}
                data-testId="outputalias-scope"
                name="spec.outputAlias.scope"
                disabled={readonly}
                label={getString('common.scopeLabel')}
                placeholder={getString('pipeline.queueStep.scopePlaceholder')}
                onChange={val => {
                  setFieldValue('spec.outputAlias.scope', val.value)
                }}
                addClearButton
                value={
                  scopeTypes.find(item => item.value === formik.values?.spec?.outputAlias?.scope) || {
                    label: '',
                    value: ''
                  }
                }
              />
            </div>
          </>
        ) : null}
        {stepName === StepType.SHELLSCRIPT && (
          <div className={cx(stepCss.lg)}>
            <Label className={css.execTargetLabel}>
              <HarnessDocTooltip tooltipId={'exec-target'} labelText={getString('pipeline.executionTarget')} />
            </Label>
            <MultiTypeExecutionTargetGroup
              executionTargetPath="spec.executionTarget"
              onDelegatePath="spec.onDelegate"
              formik={formik}
              readonly={readonly}
              allowableTypes={getAllowableTypesWithoutExpressionAndExecutionTime(allowableTypes)}
            />
            {isValueFixed(formValues.spec?.executionTarget) && (
              <FixedExecTargetGroup
                expressions={expressions}
                readonly={readonly}
                allowableTypes={allowableTypes}
                formik={formik}
                shellScriptType={formValues.spec?.shell}
              />
            )}
            <MultiTypeDelegateSelector
              name={'spec.delegateSelectors'}
              disabled={readonly}
              inputProps={{ projectIdentifier, orgIdentifier }}
              expressions={expressions}
              allowableTypes={allowableTypes}
              enableConfigureOptions={true}
            />
          </div>
        )}
      </div>
    </FormikForm>
  )
}

export function OptionalVariables({
  variableSpec,
  allowableTypes,
  readonly,
  stepName
}: {
  variableSpec: string
  allowableTypes: AllowedTypes
  readonly?: boolean
  stepName?: string
}): React.ReactElement {
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const { values: formValues, setFieldValue } = useFormikContext()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const variablePath = `${variableSpec}.value`
  const variableTypePath = `${variableSpec}.type`
  const variableNamePath = `${variableSpec}.name`

  const variableValue = get(formValues, variablePath)
  const variableName = variableNamePath ? get(formValues, variableNamePath) : undefined
  const variableType = variableTypePath ? get(formValues, variableTypePath) : undefined
  const commasInAllowedValues = useFeatureFlag(FeatureFlag.PIE_MULTISELECT_AND_COMMA_IN_ALLOWED_VALUES)

  return (
    <Layout.Horizontal className={NG_EXPRESSIONS_NEW_INPUT_ELEMENT ? css.textAreaWidth : ''}>
      {variableType === 'Secret' && stepName === StepType.SHELLSCRIPT ? (
        <MultiTypeSecretInput name={variablePath} label="" disabled={readonly} />
      ) : (
        <FormInput.MultiTextInput
          name={variablePath}
          placeholder={getString('valueLabel')}
          multiTextInputProps={{
            allowableTypes,
            expressions,
            disabled: readonly,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
          }}
          label=""
          disabled={readonly}
        />
      )}

      {isValueRuntimeInput(variableValue) &&
        (variableType === 'Secret' ? (
          <SecretConfigureOptions
            value={variableValue as string}
            type="Secret"
            variableName={variableName}
            onChange={value => {
              setFieldValue(variablePath, value)
            }}
            isReadonly={readonly}
            secretInputProps={{
              disabled: readonly
            }}
          />
        ) : (
          <ConfigureOptions
            value={variableValue}
            type="String"
            variableName={variableName}
            onChange={value => setFieldValue(variablePath, value)}
            isReadonly={readonly}
            tagsInputSeparator={commasInAllowedValues && variableType === 'String' ? '/[\n\r]/' : undefined}
          />
        ))}
    </Layout.Horizontal>
  )
}
