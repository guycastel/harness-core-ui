import { Renderer, Row, UseExpandedRowProps } from 'react-table'
import React from 'react'
import { Button, ButtonVariation, Layout, useConfirmationDialog } from '@harness/uicore'
import { useParams } from 'react-router-dom'
import { defaultTo } from 'lodash-es'
import { Color, Intent } from '@harness/design-system'
import { useStrings } from 'framework/strings'
import RbacButton from '@rbac/components/Button/Button'
import { killEvent } from '@common/utils/eventUtils'
import { useServiceOverridesContext } from '@cd/components/ServiceOverrides/context/ServiceOverrideContext'
import { useServiceOverridesButtonPermission } from '@cd/components/ServiceOverrides/useServiceOverridesButtonPermission'
import { ServiceOverrideSectionProps } from '@cd/components/ServiceOverrides/ServiceOverridesUtils'
import { PipelinePathProps } from '@common/interfaces/RouteInterfaces'
import { checkIfSectionUpdateOperationIsAllowed } from '@cd/components/ServiceOverrides/context/ServiceOverrideContextUtils'
import { useToaster } from '@common/exports'
import css from './OverridesCollapsibleTable.module.scss'

export const SectionActionsCell: Renderer<{
  row: UseExpandedRowProps<ServiceOverrideSectionProps> & Row<ServiceOverrideSectionProps>
}> = ({ row }) => {
  const data = row.original as ServiceOverrideSectionProps
  const { isNew, isEdit, sectionIndex, groupKey, overrideResponse } = data || {}
  const {
    onDiscardSection,
    currentEditableSectionRef,
    currentEditableSectionIndex,
    onDeleteOverrideSection,
    newOverrideEnvironmentInputRef,
    newOverrideServiceInputRef,
    newOverrideInfraInputRef,
    listSectionItems,
    expandedRows,
    serviceOverrideType
  } = useServiceOverridesContext()
  const { getString } = useStrings()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<PipelinePathProps>()
  const { showWarning } = useToaster()

  const buttonPermission = useServiceOverridesButtonPermission({
    accountId,
    projectIdentifier,
    orgIdentifier,
    serviceOverrideType,
    environmentRef: defaultTo(overrideResponse?.['environmentRef'], ''),
    serviceRef: defaultTo(overrideResponse?.['serviceRef'], '')
  })

  // Scenario when all the rows are deleted by user
  const shouldNotDisplayApplyChanges =
    !isNew &&
    sectionIndex === currentEditableSectionIndex &&
    listSectionItems[sectionIndex]?.overrideSpecDetails?.length === 0

  const shouldShowDeleteIcon = expandedRows?.has(groupKey) && !isNew

  const { openDialog: openDeleteOverrideConfirmation } = useConfirmationDialog({
    cancelButtonText: getString('cancel'),
    contentText: getString('cd.deleteConfirmationText'),
    titleText: getString('cd.deleteOverride'),
    confirmButtonText: getString('confirm'),
    intent: Intent.DANGER,
    onCloseDialog: isConfirmed => {
      if (isConfirmed) {
        onDeleteOverrideSection(sectionIndex)
      }
    }
  })

  const handleSectionDelete = (): void => {
    if (checkIfSectionUpdateOperationIsAllowed(currentEditableSectionIndex, sectionIndex)) {
      openDeleteOverrideConfirmation()
    } else {
      showWarning(getString('common.serviceOverrides.editablePlaceholderExists'))
    }
  }

  const handleSectionSave = (): void => {
    if (sectionIndex === currentEditableSectionIndex) {
      // Handle validation of Env, Svc and Infra field if applicable
      if (newOverrideEnvironmentInputRef.current) {
        if (!newOverrideEnvironmentInputRef.current.values?.['environmentRef']) {
          newOverrideEnvironmentInputRef.current?.setErrors({
            environmentRef: getString('fieldRequired', { field: getString('environment') })
          })
        }
      }

      if (newOverrideServiceInputRef.current) {
        if (!newOverrideServiceInputRef.current.values?.['serviceRef']) {
          newOverrideServiceInputRef.current?.setErrors({
            serviceRef: getString('fieldRequired', { field: getString('service') })
          })
        }
      }

      if (newOverrideInfraInputRef.current) {
        if (!newOverrideInfraInputRef.current.values?.['infraIdentifier']) {
          newOverrideInfraInputRef.current?.setErrors({
            infraIdentifier: getString('fieldRequired', { field: getString('infrastructureText') })
          })
        }
      }

      currentEditableSectionRef?.current?.submitForm()
    }
  }

  const handleSectionDiscard = (): void => {
    if (sectionIndex === currentEditableSectionIndex) {
      currentEditableSectionRef?.current?.resetForm()
      onDiscardSection(sectionIndex)
    }
  }

  const renderDeleteButton = (): JSX.Element => (
    <RbacButton
      icon="trash"
      iconProps={{ size: 18 }}
      variation={ButtonVariation.ICON}
      onClick={() => handleSectionDelete()}
      color={Color.PRIMARY_7}
      className={css.sectionActionBtn}
      tooltip={getString('cd.deleteOverride')}
      permission={buttonPermission}
    />
  )

  return (
    <div onClick={killEvent}>
      {isNew || isEdit ? (
        <Layout.Horizontal spacing={'medium'} flex={{ justifyContent: 'flex-end' }}>
          {shouldShowDeleteIcon && renderDeleteButton()}
          {!shouldNotDisplayApplyChanges && (
            <Button
              icon="tick"
              iconProps={{ size: 24 }}
              variation={ButtonVariation.ICON}
              onClick={() => handleSectionSave()}
              color={Color.PRIMARY_7}
              className={css.sectionActionBtn}
              tooltip={getString('applyChanges')}
            />
          )}
          <Button
            icon="cross"
            iconProps={{ size: 24 }}
            variation={ButtonVariation.ICON}
            onClick={() => handleSectionDiscard()}
            color={Color.PRIMARY_7}
            className={css.sectionActionBtn}
            tooltip={getString('cd.discardChanges')}
          />
        </Layout.Horizontal>
      ) : (
        <Layout.Horizontal spacing={'medium'} flex={{ justifyContent: 'flex-end' }}>
          {shouldShowDeleteIcon && renderDeleteButton()}
        </Layout.Horizontal>
      )}
    </div>
  )
}
