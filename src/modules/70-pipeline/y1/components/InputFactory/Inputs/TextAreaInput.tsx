/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { FormMultiTypeTextAreaField } from '@modules/10-common/components'
import { useRuntimeInput } from '@modules/70-pipeline/y1/hooks/useRuntimeInput'
import { PrimitiveInputType } from '../InputComponentType'
import { InputComponent, InputProps } from '../InputComponent'
import { InputsFormValues } from '../../InputsForm/InputsForm'
import { RuntimeInputType } from '../../InputsForm/types'

function TextAreaInternal(props: InputProps<InputsFormValues>): JSX.Element {
  const { readonly, path, input } = props
  const { label = '' } = input
  const { renderRuntimeInput } = useRuntimeInput({ type: RuntimeInputType.string })

  return (
    <FormMultiTypeTextAreaField
      label={label}
      name={path}
      disabled={readonly}
      multiTypeTextArea={{ renderRuntimeInput }}
    />
  )
}

export class TextAreaInput extends InputComponent<InputsFormValues> {
  public internalType = PrimitiveInputType.text_area

  constructor() {
    super()
  }

  renderComponent(props: InputProps<InputsFormValues>): JSX.Element {
    return <TextAreaInternal {...props} />
  }
}
