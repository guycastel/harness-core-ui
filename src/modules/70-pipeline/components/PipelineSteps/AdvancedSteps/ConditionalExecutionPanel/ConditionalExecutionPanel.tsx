/*
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * Copyright 2021 Harness Inc. All rights reserved.
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { AllowedTypes, Button, ConfirmationDialog, FormInput, Layout, useToggleOpen } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { useFormikContext } from 'formik'
import { get, isUndefined, set } from 'lodash-es'
import produce from 'immer'
import { StepMode as Modes } from '@pipeline/utils/stepUtils'
import { isValueRuntimeInput } from '@common/utils/utils'
import { useStrings } from 'framework/strings'
import ConditionalExecutionPanelHeader from './ConditionalExecutionHeader'
import ConditionalExecutionPanelStatus from './ConditionalExecutionStatus'
import ConditionalExecutionPanelCondition from './ConditionalExecutionCondition'

import css from './ConditionalExecutionPanel.module.scss'

export interface ConditionalExecutionPanelProps {
  path: string
  mode: Modes
  isReadonly: boolean
  className?: string
  allowableTypes?: AllowedTypes
}

export default function ConditionalExecutionPanel(props: ConditionalExecutionPanelProps): React.ReactElement {
  const { mode, isReadonly, path = 'when', className, allowableTypes } = props
  const { getString } = useStrings()
  const formik = useFormikContext()
  const {
    isOpen: isDeleteConfirmationOpen,
    open: openDeleteConfirmation,
    close: closeDeleteConfirmation
  } = useToggleOpen()

  const statusPath = mode === Modes.STAGE ? 'pipelineStatus' : 'stageStatus'
  const value = get(formik.values, path)

  const handleCloseDeleteConfirmation = (confirm: boolean): void => {
    if (confirm) {
      formik.setValues(
        produce(formik.values, (draft: any) => {
          set(draft, path, undefined)
        })
      )
    }
    closeDeleteConfirmation()
  }

  return (
    <div className={css.main}>
      <Layout.Horizontal flex={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <ConditionalExecutionPanelHeader mode={mode} />
        <Button
          intent={'primary'}
          data-testid="delete"
          disabled={isReadonly || isUndefined(value)}
          onClick={openDeleteConfirmation}
          minimal
          font={{ variation: FontVariation.H6 }}
        >
          {getString('reset')}
        </Button>
      </Layout.Horizontal>
      {isValueRuntimeInput(value) ? (
        <FormInput.Text className={css.runtimeInput} name={path} disabled />
      ) : (
        <div className={cx(css.panel, className)}>
          <ConditionalExecutionPanelStatus path={path} statusPath={statusPath} isReadonly={isReadonly} mode={mode} />
          <div className={css.divider} />
          <ConditionalExecutionPanelCondition
            path={path}
            statusPath={statusPath}
            isReadonly={isReadonly}
            mode={mode}
            allowableTypes={allowableTypes}
          />
        </div>
      )}
      <ConfirmationDialog
        intent="danger"
        titleText={getString('pipeline.conditionalExecution.deleteModal.title')}
        contentText={getString('pipeline.conditionalExecution.deleteModal.content')}
        confirmButtonText={getString('common.remove')}
        cancelButtonText={getString('cancel')}
        isOpen={isDeleteConfirmationOpen}
        onClose={handleCloseDeleteConfirmation}
      />
    </div>
  )
}
