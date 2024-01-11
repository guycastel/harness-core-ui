import React from 'react'
import { Button, ButtonVariation, Layout } from '@harness/uicore'
import { set } from 'lodash-es'
import produce from 'immer'
import { Color } from '@harness/design-system'
import { useFormikContext } from 'formik'
import { useServiceOverridesContext } from '@cd/components/ServiceOverrides/context/ServiceOverrideContext'
import { ServiceOverrideRowFormState } from '@cd/components/ServiceOverrides/ServiceOverridesUtils'

interface RowActionButtonsProps {
  isNewRow: boolean
  isCloneRow: boolean
  isEditRow: boolean
  childRowIndex: number
}

export default function RowActionButtons(props: RowActionButtonsProps): React.ReactElement {
  const { isNewRow, isCloneRow, isEditRow, childRowIndex } = props
  const { onDiscardChildRow } = useServiceOverridesContext()
  const { values, setValues, initialValues } = useFormikContext<ServiceOverrideRowFormState[]>()

  const handleChildRowDiscard = () => {
    const containsAnyDeletedRows = initialValues?.length > values?.length
    setValues(
      produce(values, draft => {
        if (isNewRow || isCloneRow) {
          draft.splice(childRowIndex, 1)
        }

        if (isEditRow && !isCloneRow) {
          set(draft, childRowIndex, initialValues[childRowIndex])
        }
      })
    )
    onDiscardChildRow({ isNewRow, isCloneRow, isEditRow, childRowIndex, containsAnyDeletedRows })
  }

  return (
    <Layout.Horizontal spacing={'medium'}>
      <Button
        icon="cross"
        variation={ButtonVariation.ICON}
        onClick={() => handleChildRowDiscard()}
        color={Color.PRIMARY_7}
      />
    </Layout.Horizontal>
  )
}
