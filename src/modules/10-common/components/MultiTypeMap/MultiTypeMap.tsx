/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { v4 as nameSpace, v5 as uuid } from 'uuid'
import cx from 'classnames'
import {
  Text,
  FormInput,
  Button,
  getMultiTypeFromValue,
  MultiTypeInputType,
  MultiTextInputProps,
  RuntimeTypeComponentProps
} from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { FieldArray, connect, FormikContextType } from 'formik'
import { get } from 'lodash-es'
import {
  ALLOWED_VALUES_TYPE,
  ConfigureOptions,
  ConfigureOptionsProps
} from '@common/components/ConfigureOptions/ConfigureOptions'
import { useStrings } from 'framework/strings'
import MultiTypeFieldSelector, {
  MultiTypeFieldSelectorProps
} from '@common/components/MultiTypeFieldSelector/MultiTypeFieldSelector'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import css from './MultiTypeMap.module.scss'

export type MapValue = { id: string; key: string; value: string }[]
export type MultiTypeMapValue = MapValue | string

interface MultiTypeMapConfigureOptionsProps
  extends Omit<ConfigureOptionsProps, 'value' | 'type' | 'variableName' | 'onChange'> {
  variableName?: ConfigureOptionsProps['variableName']
}

export interface MultiTypeMapProps {
  name: string
  multiTypeFieldSelectorProps: Omit<MultiTypeFieldSelectorProps, 'name' | 'defaultValueToReset' | 'children'>
  valueMultiTextInputProps?: Omit<MultiTextInputProps, 'name'>
  valueConfigureOptionsProps?: Omit<ConfigureOptionsProps, 'value' | 'type' | 'variableName' | 'onChange'>
  disableValueTypeSelection?: boolean
  enableConfigureOptions?: boolean
  enableValueConfigureOptions?: boolean
  configureOptionsProps?: MultiTypeMapConfigureOptionsProps
  formik?: FormikContextType<any>
  style?: React.CSSProperties
  disabled?: boolean
  keyLabel?: string
  valueLabel?: string
  restrictToSingleEntry?: boolean
  keyValuePlaceholders?: Array<string>
  addButtonLabel?: string
  alwaysShowKeyValueLabel?: boolean
  renderRuntimeInput?: (props: RuntimeTypeComponentProps) => JSX.Element
}

const MultiTypeMap = (props: MultiTypeMapProps): React.ReactElement => {
  const {
    name,
    multiTypeFieldSelectorProps,
    valueMultiTextInputProps = {},
    valueConfigureOptionsProps,
    disableValueTypeSelection,
    enableConfigureOptions = true,
    enableValueConfigureOptions = false,
    alwaysShowKeyValueLabel = false,
    configureOptionsProps,
    formik,
    disabled,
    keyLabel,
    valueLabel,
    restrictToSingleEntry,
    keyValuePlaceholders,
    addButtonLabel,
    renderRuntimeInput,
    ...restProps
  } = props
  const { getString } = useStrings()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const getDefaultResetValue = (): MultiTypeMapValue => {
    return [{ id: uuid('', nameSpace()), key: '', value: '' }]
  }
  const value = get(formik?.values, name, getDefaultResetValue()) as MultiTypeMapValue
  const isRuntime = typeof value === 'string' && getMultiTypeFromValue(value) === MultiTypeInputType.RUNTIME

  const KeyValueLabelComponent = React.useMemo(
    () => (
      <div className={cx(css.grid, css.row)}>
        <div>
          <Text font={{ variation: FontVariation.FORM_LABEL }} margin={{ bottom: 'xsmall' }}>
            {keyLabel || getString('keyLabel')}
          </Text>
        </div>
        <div>
          <Text font={{ variation: FontVariation.FORM_LABEL }} margin={{ bottom: 'xsmall' }}>
            {valueLabel || getString('valueLabel')}
          </Text>
        </div>
      </div>
    ),
    [keyLabel, valueLabel]
  )

  return (
    <div
      className={cx(css.multiTypeMap, css.grid, {
        [css.fieldAndOptions]: isRuntime
      })}
      {...restProps}
    >
      {isRuntime && (
        <>
          <FormInput.MultiTextInput
            className={css.marginZero}
            name={name}
            multiTextInputProps={{
              allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME],
              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            }}
            {...multiTypeFieldSelectorProps}
          />
          {enableConfigureOptions && (
            <ConfigureOptions
              value={value}
              type="Map"
              variableName={name}
              showRequiredField={false}
              showDefaultField={false}
              onChange={val => formik?.setFieldValue(name, val)}
              {...configureOptionsProps}
              isReadonly={props.disabled}
            />
          )}
        </>
      )}

      {!isRuntime && (
        <MultiTypeFieldSelector
          name={name}
          defaultValueToReset={getDefaultResetValue()}
          style={{ marginBottom: 0 }}
          {...multiTypeFieldSelectorProps}
          disableTypeSelection={multiTypeFieldSelectorProps.disableTypeSelection || disabled}
        >
          <FieldArray
            name={name}
            render={({ push, remove }) => (
              <>
                <div className={cx(css.grid, css.rows)}>
                  {alwaysShowKeyValueLabel && KeyValueLabelComponent}
                  {Array.isArray(value) && value.length > 0 && (
                    <>
                      {!alwaysShowKeyValueLabel && KeyValueLabelComponent}
                      {value.map(({ id }, index: number) => (
                        <div className={cx(css.grid, css.row)} key={id}>
                          <div>
                            <FormInput.Text
                              className={css.marginZero}
                              name={`${name}[${index}].key`}
                              disabled={disabled}
                              placeholder={keyValuePlaceholders?.[0]}
                            />
                          </div>

                          <div>
                            <div className={cx(css.grid, enableValueConfigureOptions && css.fieldAndOptions)}>
                              {disableValueTypeSelection ? (
                                <FormInput.Text
                                  name={`${name}[${index}].value`}
                                  disabled={disabled}
                                  placeholder={keyValuePlaceholders?.[1]}
                                  className={css.marginZero}
                                />
                              ) : (
                                <>
                                  <FormInput.MultiTextInput
                                    className={css.marginZero}
                                    label=""
                                    name={`${name}[${index}].value`}
                                    multiTextInputProps={{
                                      allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION],
                                      newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                                      renderRuntimeInput: multiTypeFieldSelectorProps?.renderRuntimeInput,
                                      ...valueMultiTextInputProps
                                    }}
                                    disabled={disabled}
                                    placeholder={keyValuePlaceholders?.[1]}
                                  />
                                  {enableValueConfigureOptions &&
                                    getMultiTypeFromValue(get(formik?.values, `${name}[${index}].value`, '')) ===
                                      MultiTypeInputType.RUNTIME && (
                                      <ConfigureOptions
                                        value={get(formik?.values, `${name}[${index}].value`, '')}
                                        type="String"
                                        variableName={`${name}[${index}].value`}
                                        onChange={val => formik?.setFieldValue(`${name}[${index}].value`, val)}
                                        isReadonly={disabled}
                                        allowedValuesType={ALLOWED_VALUES_TYPE.TEXT}
                                        {...valueConfigureOptionsProps}
                                      />
                                    )}
                                </>
                              )}
                            </div>
                          </div>

                          <Button
                            icon="main-trash"
                            iconProps={{ size: 20 }}
                            minimal
                            data-testid={`remove-${name}-[${index}]`}
                            onClick={() => remove(index)}
                            disabled={disabled}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {restrictToSingleEntry && Array.isArray(value) && value?.length === 1 ? null : (
                  <Button
                    intent="primary"
                    minimal
                    text={addButtonLabel || getString('plusAdd')}
                    data-testid={`add-${name}`}
                    onClick={() => push({ id: uuid('', nameSpace()), key: '', value: '' })}
                    disabled={disabled}
                    style={{ padding: 0 }}
                  />
                )}
              </>
            )}
          />
        </MultiTypeFieldSelector>
      )}
    </div>
  )
}

export default connect(MultiTypeMap)
