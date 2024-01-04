/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useParams } from 'react-router-dom'
import MultiTypeDelegateSelector from '@common/components/MultiTypeDelegateSelector/MultiTypeDelegateSelector'
import { ProjectPathProps } from '@modules/10-common/interfaces/RouteInterfaces'
import { useRuntimeInput } from '@modules/70-pipeline/y1/hooks/useRuntimeInput'
import { DerivedInputType } from '../InputComponentType'
import { InputComponent, InputProps } from '../InputComponent'
import { InputsFormValues } from '../../InputsForm/InputsForm'
import { RuntimeInputType } from '../../InputsForm/types'
import css from './inputs.module.scss'

function DelegateSelectorInputInternal(props: InputProps<InputsFormValues>): JSX.Element {
  const { allowableTypes, readonly, path } = props
  const { projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { renderRuntimeInput } = useRuntimeInput({ type: RuntimeInputType.string, standalone: true })

  return (
    <MultiTypeDelegateSelector
      name={path}
      disabled={readonly}
      inputProps={{ projectIdentifier, orgIdentifier, wrapperClassName: css.delegateSelectorWrapper }}
      expressions={[]}
      allowableTypes={allowableTypes}
      multiTypeFieldSelectorProps={{ renderRuntimeInput }}
    />
  )
}

export class DelegateSelectorInput extends InputComponent<InputsFormValues> {
  public internalType = DerivedInputType.delegate_selector

  constructor() {
    super()
  }

  renderComponent(props: InputProps<InputsFormValues>): JSX.Element {
    return <DelegateSelectorInputInternal {...props} />
  }
}
