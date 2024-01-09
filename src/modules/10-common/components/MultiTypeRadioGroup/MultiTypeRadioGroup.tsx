/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { FormGroup, IFormGroupProps, Intent, IOptionProps, IRadioGroupProps, RadioGroup } from '@blueprintjs/core'
import {
  DataTooltipInterface,
  ExpressionAndRuntimeType,
  ExpressionAndRuntimeTypeProps,
  FormikTooltipContext,
  MultiTypeInputValue,
  Text
} from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { connect } from 'formik'
import cx from 'classnames'
import { get } from 'lodash-es'

import { errorCheck } from '@common/utils/formikHelpers'
import css from './MultiTypeRadioGroup.module.scss'

export interface MultiTypeRadioGroupProps
  extends Omit<ExpressionAndRuntimeTypeProps, 'fixedTypeComponent' | 'fixedTypeComponentProps'> {
  radioGroupProps?: Omit<IRadioGroupProps, 'name' | 'selectedValue' | 'onChange' | 'options'>
  name: string
  options?: IOptionProps[]
}

export const MultiTypeRadioGroup: React.FC<MultiTypeRadioGroupProps> = ({
  radioGroupProps,
  value = '',
  options,
  ...rest
}) => {
  const { className = '', ...restProps } = radioGroupProps || {}
  const fixedTypeComponent = React.useCallback(
    props => {
      const { onChange } = props
      return (
        <RadioGroup
          className={cx(
            css.input,
            rest?.allowableTypes && rest.allowableTypes.length > 1 && css.multiTypeInputs,
            className
          )}
          {...restProps}
          options={options}
          selectedValue={value as string}
          name={rest.name}
          onChange={(event: React.FormEvent<HTMLInputElement>) => {
            onChange?.(event.currentTarget.value, MultiTypeInputValue.STRING)
          }}
        />
      )
    },
    [value, options, name]
  )
  return <ExpressionAndRuntimeType value={value} {...rest} fixedTypeComponent={fixedTypeComponent} />
}

export interface FormMultiTypeRadioGroupProps extends Omit<IFormGroupProps, 'label'> {
  label: string
  name: string
  options: IOptionProps[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formik?: any // TODO: Remove this but not sure why FormikContextType<any> was not working
  multiTypeRadioGroup?: Omit<MultiTypeRadioGroupProps, 'onChange'>
  tooltipProps?: DataTooltipInterface
  onChange?: MultiTypeRadioGroupProps['onChange']
}

export const FormMultiTypeRadioGroup: React.FC<FormMultiTypeRadioGroupProps> = props => {
  const { label, multiTypeRadioGroup, options, formik, name, onChange, ...restProps } = props
  const hasError = errorCheck(name, formik)

  const {
    intent = hasError ? Intent.DANGER : Intent.NONE,
    helperText = hasError ? get(formik?.errors, name) : null,
    disabled,
    ...rest
  } = restProps

  const { radioGroupProps, ...restMultiProps } = multiTypeRadioGroup || {}
  const value: string = get(formik?.values, name, '')
  const tooltipContext = React.useContext(FormikTooltipContext)
  const dataTooltipId =
    props.tooltipProps?.dataTooltipId || (tooltipContext?.formName ? `${tooltipContext?.formName}_${name}` : '')
  return (
    <FormGroup
      {...rest}
      labelFor={name}
      helperText={helperText}
      intent={intent}
      disabled={disabled}
      label={
        <Text
          font={{ variation: FontVariation.FORM_LABEL }}
          tooltipProps={dataTooltipId ? { dataTooltipId: dataTooltipId } : {}}
        >
          {label}
        </Text>
      }
    >
      <MultiTypeRadioGroup
        radioGroupProps={radioGroupProps}
        name={name}
        value={value}
        options={options}
        {...restMultiProps}
        onChange={(val, valueType, type) => {
          if (disabled) return
          formik?.setFieldValue(name, val)
          onChange?.(val, valueType, type)
        }}
      />
    </FormGroup>
  )
}
export const FormMultiTypeRadioGroupField = connect(FormMultiTypeRadioGroup)
