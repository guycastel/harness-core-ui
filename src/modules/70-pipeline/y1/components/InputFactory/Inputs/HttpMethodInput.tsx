/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { FormInput, SelectOption } from '@harness/uicore'
import { useRuntimeInput } from '@modules/70-pipeline/y1/hooks/useRuntimeInput'
import { InputsFormValues } from '../../InputsForm/InputsForm'
import { InputComponent, InputProps } from '../InputComponent'
import { DerivedInputType } from '../InputComponentType'
import { RuntimeInputType } from '../../InputsForm/types'

export const httpStepType: SelectOption[] = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
  { value: 'PATCH', label: 'PATCH' }
]

function HttpMethodInputInternal(props: InputProps<InputsFormValues>): JSX.Element {
  const { allowableTypes, readonly, path, input } = props
  const { label = '' } = input
  const { renderRuntimeInput } = useRuntimeInput({ type: RuntimeInputType.string })

  return (
    <FormInput.MultiTypeInput
      selectItems={httpStepType}
      useValue
      disabled={readonly}
      multiTypeInputProps={{
        expressions: [],
        disabled: readonly,
        allowableTypes,
        renderRuntimeInput
      }}
      label={label}
      name={path}
    />
  )
}

export class HttpMethodInput extends InputComponent<InputsFormValues> {
  public internalType = DerivedInputType.http_method

  constructor() {
    super()
  }

  renderComponent(props: InputProps<InputsFormValues>): JSX.Element {
    return <HttpMethodInputInternal {...props} />
  }
}
