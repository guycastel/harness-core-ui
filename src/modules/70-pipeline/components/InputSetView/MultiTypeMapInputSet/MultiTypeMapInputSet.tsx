/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo, useCallback, useState } from 'react'
import { v4 as nameSpace, v5 as uuid } from 'uuid'
import cx from 'classnames'
import {
  Text,
  TextInput,
  MultiTextInput,
  Button,
  getMultiTypeFromValue,
  MultiTypeInputType,
  MultiTextInputProps,
  RUNTIME_INPUT_VALUE,
  FormInput
} from '@harness/uicore'
import { Intent, FontVariation } from '@harness/design-system'
import { connect, FormikContextType } from 'formik'
import { get, isEmpty, isEqual } from 'lodash-es'
import { ConfigureOptions, ConfigureOptionsProps } from '@common/components/ConfigureOptions/ConfigureOptions'
import { useStrings } from 'framework/strings'
import MultiTypeFieldSelector, {
  MultiTypeFieldSelectorProps
} from '@common/components/MultiTypeFieldSelector/MultiTypeFieldSelector'
import { shouldRenderRunTimeInputViewWithAllowedValues } from '@modules/70-pipeline/utils/CIUtils'
import { ValueInputSet } from '@pipeline/components/InputSetView/MultiTypeMapInputSet/ValueInputSet'

import css from './MultiTypeMapInputSet.module.scss'

export type MapType = { [key: string]: string }
export type MultiTypeMapType = MapType | string

export type MapUIType = { id: string; key: string; value: string }[]
export type MultiTypeUIMapType = MapUIType | string

interface MultiTypeMapConfigureOptionsProps
  extends Omit<ConfigureOptionsProps, 'value' | 'type' | 'variableName' | 'onChange'> {
  variableName?: ConfigureOptionsProps['variableName']
}

export interface MultiTypeMapInputSetProps {
  name: string
  multiTypeFieldSelectorProps: Omit<MultiTypeFieldSelectorProps, 'name' | 'defaultValueToReset' | 'children'>
  valueMultiTextInputProps?: Omit<MultiTextInputProps, 'name'>
  enableConfigureOptions?: boolean
  configureOptionsProps?: MultiTypeMapConfigureOptionsProps
  formik?: FormikContextType<any>
  style?: React.CSSProperties
  cardStyle?: React.CSSProperties
  disabled?: boolean
  keyLabel?: string
  valueLabel?: string
  appearance?: 'default' | 'minimal'
  restrictToSingleEntry?: boolean
  isApplyingTemplate?: boolean
  appliedInputSetValue?: Record<string, any>
  hasValuesAsRuntimeInput?: boolean // doesn't support additional rows when fixed key/value expects value
  keyValuePlaceholders?: Array<string>
  template?: any
  /** path of the field in `template` */
  fieldPath?: string
}

function generateNewValue(): { id: string; key: string; value: string } {
  return { id: uuid('', nameSpace()), key: '', value: '' }
}

const getInitialValueInCorrectFormat = (initialValue: Record<string, any>): MapUIType =>
  Object.keys(initialValue || {}).map(key => ({
    id: uuid('', nameSpace()),
    key: key,
    value: initialValue[key]
  }))

export function MultiTypeMapInputSet(props: MultiTypeMapInputSetProps): React.ReactElement {
  const {
    name,
    multiTypeFieldSelectorProps,
    valueMultiTextInputProps = {},
    enableConfigureOptions = true,
    configureOptionsProps,
    cardStyle,
    formik,
    disabled,
    appearance = 'default',
    restrictToSingleEntry,
    isApplyingTemplate,
    appliedInputSetValue,
    hasValuesAsRuntimeInput,
    keyValuePlaceholders,
    template,
    fieldPath,
    ...restProps
  } = props

  let formikFieldValues = useMemo(() => get(formik?.values, name, {}), [formik?.values, name])
  // applicable only when working with step template
  const [isReadonlyFieldEnabled, setIsReadonlyFieldEnabled] = useState(
    typeof formikFieldValues === 'string' && getMultiTypeFromValue(formikFieldValues) === MultiTypeInputType.RUNTIME
  )

  const renderReadonlyRuntimeInputField = useCallback(
    () => (
      <FormInput.MultiTextInput
        style={{ width: '300px', marginBottom: 0 }}
        name={name}
        disabled={disabled}
        label=""
        multiTextInputProps={{
          allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME]
        }}
      />
    ),
    []
  )

  const [value, setValue] = React.useState<MapUIType>(() => {
    let initialValue = formikFieldValues
    if (initialValue === RUNTIME_INPUT_VALUE) {
      initialValue = []
    }

    const initialValueInCorrectFormat = getInitialValueInCorrectFormat(initialValue)

    return initialValueInCorrectFormat as MapUIType
  })

  const { getString } = useStrings()

  const error = get(formik?.errors, name, '')
  const touched = get(formik?.touched, name)
  const hasSubmitted = get(formik, 'submitCount', 0) > 0

  const addValue = (): void => {
    setValue(currentValue => [...currentValue, generateNewValue()])
  }

  const removeValue = (index: number): void => {
    setValue(currentValue => {
      const newCurrentValue = [...currentValue]
      newCurrentValue.splice(index, 1)
      return newCurrentValue
    })
  }

  const changeValue = (index: number, key: 'key' | 'value', newValue: string): void => {
    formik?.setFieldTouched(name, true)
    setValue(currentValue => {
      const newCurrentValue = [...currentValue]
      newCurrentValue[index][key] = newValue
      return newCurrentValue
    })
  }

  React.useEffect(() => {
    // On Run Pipeline Modal, set `value` with applied input set value
    const valueInCorrectFormat: MapType = {}
    if (Array.isArray(value)) {
      value.forEach(mapValue => {
        if (mapValue.key) {
          valueInCorrectFormat[mapValue.key] = mapValue.value
        }
      })
    }

    const appliedInputSetValueArray =
      typeof appliedInputSetValue === 'object' &&
      Object.entries(appliedInputSetValue).map((entry: [string, string]): { key: string; value: string } => ({
        key: entry[0] || '',
        value: entry[1] || ''
      }))

    if (
      appliedInputSetValue &&
      !isEmpty(appliedInputSetValueArray) &&
      !isEqual(appliedInputSetValue, valueInCorrectFormat)
    ) {
      const newVal = getInitialValueInCorrectFormat(appliedInputSetValue)
      setValue(newVal)
      formikFieldValues = appliedInputSetValue
    }
  }, [appliedInputSetValue])

  React.useEffect(() => {
    const initialValue = formikFieldValues

    // onEdit and applying input set
    if (initialValue !== RUNTIME_INPUT_VALUE && !isEmpty(initialValue) && !isEqual(initialValue, value)) {
      setValue(getInitialValueInCorrectFormat(initialValue))
    } else if (formikFieldValues === '' && Array.isArray(value) && value.length === 0) {
      // empty value for the optional field should default to {}
      formik?.setFieldValue(name, {})
    }
  }, [formik?.setFieldValue, name]) // removed formik?.values as it will re-render after every key-press with random uuid for map

  React.useEffect(() => {
    const valueInCorrectFormat: MapType = {}
    if (Array.isArray(value)) {
      value.forEach(mapValue => {
        if (mapValue.key) {
          valueInCorrectFormat[mapValue.key] = mapValue.value
        }
      })
    }

    if (formikFieldValues !== RUNTIME_INPUT_VALUE) {
      if (isEmpty(valueInCorrectFormat)) {
        formik?.setFieldValue(name, {})
      } else if (!isEqual(formikFieldValues, valueInCorrectFormat)) {
        formik?.setFieldValue(name, valueInCorrectFormat)
      }
    } else if (!isEmpty(valueInCorrectFormat) && !isEqual(formikFieldValues, valueInCorrectFormat)) {
      // handle step template toggling runtime to fixed and adding value
      formik?.setFieldValue(name, valueInCorrectFormat)
    }
  }, [name, value, formik?.setFieldValue])

  return (
    <div className={cx(css.group, css.withoutSpacing, appearance === 'minimal' ? css.minimalCard : '')} {...restProps}>
      <MultiTypeFieldSelector
        name={name}
        defaultValueToReset={{}}
        style={{ flexGrow: 1, marginBottom: 0 }}
        {...multiTypeFieldSelectorProps}
        {...(isApplyingTemplate ? { allowedTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME] } : {})}
        disableTypeSelection={multiTypeFieldSelectorProps.disableTypeSelection || disabled}
        onTypeChange={type => {
          setIsReadonlyFieldEnabled(false)
          if (type === MultiTypeInputType.FIXED) {
            formik?.setFieldValue(name, {})
          }
        }}
      >
        {isReadonlyFieldEnabled ? (
          renderReadonlyRuntimeInputField()
        ) : (
          <>
            {value.map(({ id, key, value: valueValue }, index: number) => {
              const keyError = get(error, `[${index}].key`)

              const valueTemplatePath = `${fieldPath}[${key}]`
              const valueHasAllowedValues = shouldRenderRunTimeInputViewWithAllowedValues(valueTemplatePath, template)

              const valueField = (
                <div className={css.valueField}>
                  {valueHasAllowedValues ? (
                    <ValueInputSet
                      name={`${name}[${index}].value`}
                      value={valueValue}
                      defaultValueToReset=""
                      template={template}
                      fieldPath={valueTemplatePath}
                      onChange={v => changeValue(index, 'value', typeof v === 'string' ? v : '')}
                      disabled={disabled}
                      allowableTypes={
                        valueMultiTextInputProps.allowableTypes ?? [
                          MultiTypeInputType.FIXED,
                          MultiTypeInputType.EXPRESSION
                        ]
                      }
                      expressions={valueMultiTextInputProps.expressions}
                      width="100%"
                    />
                  ) : (
                    <MultiTextInput
                      name={`${name}[${index}].value`}
                      textProps={{ name: `${name}[${index}].value` }}
                      value={valueValue}
                      intent={(touched || hasSubmitted) && error ? Intent.DANGER : Intent.NONE}
                      disabled={disabled}
                      onChange={v => changeValue(index, 'value', v as any)}
                      data-testid={`value-${name}-[${index}]`}
                      allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION]}
                      {...valueMultiTextInputProps}
                      placeholder={keyValuePlaceholders?.[1]}
                    />
                  )}
                </div>
              )

              return (
                <div className={cx(css.group, css.withoutAligning)} key={id}>
                  <div>
                    {index === 0 && (
                      <Text margin={{ bottom: 'xsmall' }} font={{ variation: FontVariation.FORM_LABEL }}>
                        {props.keyLabel || getString('keyLabel')}
                      </Text>
                    )}
                    <TextInput
                      name={`${name}[${index}].key`}
                      value={key}
                      intent={(touched || hasSubmitted) && error ? Intent.DANGER : Intent.NONE}
                      errorText={(touched || hasSubmitted) && keyError ? keyError : undefined}
                      disabled={disabled || hasValuesAsRuntimeInput}
                      onChange={e => changeValue(index, 'key', (e.currentTarget as HTMLInputElement).value)}
                      data-testid={`key-${name}-[${index}]`}
                      placeholder={keyValuePlaceholders?.[0]}
                    />
                  </div>
                  <div>
                    {index === 0 && (
                      <Text margin={{ bottom: 'xsmall' }} font={{ variation: FontVariation.FORM_LABEL }}>
                        {props.valueLabel || getString('valueLabel')}
                      </Text>
                    )}
                    <div className={cx(css.group, css.withoutAligning, css.withoutSpacing)}>
                      {valueField}
                      {!disabled && !hasValuesAsRuntimeInput && (
                        <Button
                          icon="main-trash"
                          iconProps={{ size: 20 }}
                          minimal
                          data-testid={`remove-${name}-[${index}]`}
                          onClick={() => removeValue(index)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {(restrictToSingleEntry && Array.isArray(value) && value?.length === 1) ||
            disabled ||
            hasValuesAsRuntimeInput ? null : (
              <Button
                intent="primary"
                minimal
                text={getString('plusAdd')}
                data-testid={`add-${name}`}
                onClick={addValue}
                style={{ padding: 0 }}
              />
            )}
          </>
        )}
      </MultiTypeFieldSelector>
      {enableConfigureOptions &&
        typeof value === 'string' &&
        getMultiTypeFromValue(value) === MultiTypeInputType.RUNTIME && (
          <ConfigureOptions
            style={{ marginTop: 2 }}
            value={value}
            type={getString('map')}
            variableName={name}
            showRequiredField={false}
            showDefaultField={false}
            onChange={val => formik?.setFieldValue(name, val)}
            {...configureOptionsProps}
            isReadonly={props.disabled}
          />
        )}
    </div>
  )
}

export default connect(MultiTypeMapInputSet)