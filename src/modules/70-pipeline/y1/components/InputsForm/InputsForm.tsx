/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { InputRow, InputRowHeader } from './InputRow'
import { UIInputs } from './types'
import css from './InputsForm.module.scss'

export type InputsFormValues = { [key: string]: unknown }

export interface InputsFormProps {
  inputs: UIInputs
  className?: string
}

export function InputsForm(props: InputsFormProps): React.ReactElement {
  const { inputs, className } = props //initialValues, onChange,

  return (
    <div className={cx(css.inputsForm, className)}>
      <InputRowHeader />
      {inputs.inputs.map(input => {
        return <InputRow key={input.name} input={input} />
      })}
    </div>
  )
}
