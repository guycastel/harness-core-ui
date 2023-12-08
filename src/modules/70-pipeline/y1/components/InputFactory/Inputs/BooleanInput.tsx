/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { FormMultiTypeCheckboxField } from '@common/components'
import { PrimitiveInputType } from '../InputComponentType'
import { InputComponent, InputProps } from '../InputComponent'
import { InputsFormValues } from '../../InputsForm/InputsForm'

function BooleanInputInternal(props: InputProps<InputsFormValues>): JSX.Element {
  const { allowableTypes, readonly, path, input } = props
  const { label = '' } = input

  return (
    <FormMultiTypeCheckboxField
      name={path}
      label={label}
      multiTypeTextbox={{ expressions: [], disabled: readonly, allowableTypes }}
      disabled={readonly}
    />
  )
}

export class BooleanInput extends InputComponent<InputsFormValues> {
  public internalType = PrimitiveInputType.boolean

  constructor() {
    super()
  }

  renderComponent(props: InputProps<InputsFormValues>): JSX.Element {
    return <BooleanInputInternal {...props} />
  }
}
