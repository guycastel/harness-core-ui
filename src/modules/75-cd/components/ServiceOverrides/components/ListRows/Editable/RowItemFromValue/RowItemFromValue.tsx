import React from 'react'

import type { StringKeys } from 'framework/strings'
import OverrideTypeInput from '../OverrideTypeInput'

export default function RowItemFromValue({
  isEdit,
  isClone,
  readonly,
  overrideDetailIndex
}: {
  value: StringKeys
  isEdit: boolean
  isClone: boolean
  readonly?: boolean
  overrideDetailIndex: number
}): React.ReactElement {
  return <OverrideTypeInput overrideDetailIndex={overrideDetailIndex} readonly={readonly || isEdit || isClone} />
}
