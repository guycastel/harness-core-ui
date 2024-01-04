/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useFormikContext } from 'formik'
import { get } from 'lodash-es'
import { Container } from '@harness/uicore'
import MonacoEditor from '@common/components/MonacoEditor/MonacoEditor'
import MultiTypeFieldSelector from '@common/components/MultiTypeFieldSelector/MultiTypeFieldSelector'
import { getDefaultMonacoConfig } from '@modules/10-common/components/MonacoTextField/MonacoTextField'
import { useRuntimeInput } from '@modules/70-pipeline/y1/hooks/useRuntimeInput'
import { PrimitiveInputType } from '../InputComponentType'
import { InputComponent, InputProps } from '../InputComponent'
import { InputsFormValues } from '../../InputsForm/InputsForm'
import { RuntimeInputType } from '../../InputsForm/types'
import css from './inputs.module.scss'

function ObjectInputInternal(props: InputProps<InputsFormValues>): JSX.Element {
  const { allowableTypes, readonly, path, input } = props
  const { label = '' } = input
  const formik = useFormikContext()
  const value = get(formik.values, path)?.toString() || ''
  const { renderRuntimeInput } = useRuntimeInput({ type: RuntimeInputType.object, standalone: true })

  const editor = (
    <Container
      className={css.monacoWrapper}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.stopPropagation()
        }
      }}
    >
      <MonacoEditor
        height={300}
        options={getDefaultMonacoConfig(!!readonly)}
        language="yaml"
        name={path}
        value={value}
        onChange={txt => formik.setFieldValue(path, txt)}
      />
    </Container>
  )
  return (
    <MultiTypeFieldSelector
      name={path}
      label={label}
      defaultValueToReset=""
      disabled={readonly}
      allowedTypes={allowableTypes}
      disableTypeSelection={readonly}
      skipRenderValueInExpressionLabel
      expressionRender={() => editor}
      renderRuntimeInput={renderRuntimeInput}
    >
      {editor}
    </MultiTypeFieldSelector>
  )
}

export class ObjectInput extends InputComponent<InputsFormValues> {
  public internalType = PrimitiveInputType.object

  constructor() {
    super()
  }

  renderComponent(props: InputProps<InputsFormValues>): JSX.Element {
    return <ObjectInputInternal {...props} />
  }
}
