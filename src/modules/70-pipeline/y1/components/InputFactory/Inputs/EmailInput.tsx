/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { FormInput } from '@harness/uicore'
import { useStrings } from 'framework/strings'
import { useRuntimeInput } from '@modules/70-pipeline/y1/hooks/useRuntimeInput'
import { InputsFormValues } from '../../InputsForm/InputsForm'
import { InputComponent, InputProps } from '../InputComponent'
import { PrimitiveInputType } from '../InputComponentType'
import { RuntimeInputType } from '../../InputsForm/types'

function EmailInputInternal(props: InputProps<InputsFormValues>): JSX.Element {
  const { allowableTypes, readonly, path, input } = props
  const { label = '' } = input
  const { getString } = useStrings()
  const { renderRuntimeInput } = useRuntimeInput({ type: RuntimeInputType.string })

  return (
    <FormInput.MultiTextInput
      name={path}
      placeholder={getString('pipeline.utilitiesStep.to')}
      label={label}
      disabled={readonly}
      multiTextInputProps={{ expressions: [], disabled: readonly, allowableTypes, renderRuntimeInput }}
    />
  )
}

export class EmailInput extends InputComponent<InputsFormValues> {
  public internalType = PrimitiveInputType.email

  constructor() {
    super()
  }

  renderComponent(props: InputProps<InputsFormValues>): JSX.Element {
    return <EmailInputInternal {...props} />
  }
}
