import React from 'react'
import { useParams } from 'react-router-dom'
import { set, cloneDeep } from 'lodash-es'
import { v4 as uuid } from 'uuid'
import { ButtonVariation, Layout } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { useFormikContext } from 'formik'
import produce from 'immer'

import type { PipelinePathProps } from '@common/interfaces/RouteInterfaces'

import RbacButton from '@rbac/components/Button/Button'
import { ServiceOverrideRowFormState } from '@cd/components/ServiceOverrides/ServiceOverridesUtils'

import { useServiceOverridesContext } from '@cd/components/ServiceOverrides/context/ServiceOverrideContext'
import { useServiceOverridesButtonPermission } from '@cd/components/ServiceOverrides/useServiceOverridesButtonPermission'
import { scrollToOverrideSpecRowByIndex } from '../Editable/editableRowUtils'

export default function RowActionButtons({
  rowIndex,
  environmentRef,
  serviceRef,
  sectionIndex
}: {
  rowIndex: number
  environmentRef: string
  serviceRef: string
  sectionIndex: number
}): React.ReactElement {
  const { accountId, projectIdentifier, orgIdentifier } = useParams<PipelinePathProps>()

  const { onEditChildRow, onDeleteChildRow, onCloneChildRow, serviceOverrideType } = useServiceOverridesContext()
  const { values, setValues } = useFormikContext<ServiceOverrideRowFormState[]>()

  const buttonPermission = useServiceOverridesButtonPermission({
    accountId,
    projectIdentifier,
    orgIdentifier,
    serviceOverrideType,
    environmentRef,
    serviceRef
  })

  const handleOverrideClone = () => {
    onCloneChildRow(rowIndex, sectionIndex)
      .then(() => {
        setValues(
          produce<ServiceOverrideRowFormState[]>(values, draft => {
            const valueToBeCloned = cloneDeep(draft[rowIndex])
            set(valueToBeCloned, 'id', uuid())
            draft.splice(rowIndex + 1, 0, valueToBeCloned)
          })
        )
        scrollToOverrideSpecRowByIndex(rowIndex + 1)
      })
      .catch(() => {
        // do nothing, warning has already been displayed.
      })
  }

  const handleOverrideEdit = () => {
    onEditChildRow(rowIndex, sectionIndex)
  }

  const handleOverrideDelete = () => {
    onDeleteChildRow(rowIndex, sectionIndex)
      .then(() => {
        setValues(
          produce(values, draft => {
            draft.splice(rowIndex, 1)
          })
        )
      })
      .catch(() => {
        // do nothing, warning has already been displayed.
      })
  }

  return (
    <Layout.Horizontal spacing={'small'} width={110}>
      <RbacButton
        icon="duplicate"
        variation={ButtonVariation.ICON}
        font={{ variation: FontVariation.BODY1 }}
        onClick={() => handleOverrideClone()}
        permission={buttonPermission}
      />
      <RbacButton
        icon="Edit"
        variation={ButtonVariation.ICON}
        font={{ variation: FontVariation.BODY1 }}
        onClick={() => handleOverrideEdit()}
        permission={buttonPermission}
      />
      <RbacButton
        icon="main-trash"
        variation={ButtonVariation.ICON}
        font={{ variation: FontVariation.BODY1 }}
        onClick={() => handleOverrideDelete()}
        permission={buttonPermission}
      />
    </Layout.Horizontal>
  )
}
