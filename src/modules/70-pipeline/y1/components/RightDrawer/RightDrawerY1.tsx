/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Button } from '@harness/uicore'
import { Drawer, Position } from '@blueprintjs/core'
import produce from 'immer'
import { cloneDeep, set } from 'lodash-es'
import { usePipelineContextY1 } from '../PipelineContext/PipelineContextY1'
import { DrawerSizesY1, DrawerTypesY1 } from '../PipelineContext/PipelineActionsY1'
import { RuntimeInputs } from '../RuntimeInputs/RuntimeInputs'

import { PipelineInputs } from '../InputsForm/types'
import { AdvancedOptionsY1 } from '../AdvancedOptions/AdvancedOptionsY1'
import css from './RightDrawerY1.module.scss'

export function RightDrawerY1(): JSX.Element {
  const {
    state: { pipelineView, pipeline },
    isReadonly,
    updatePipelineView,
    updatePipeline
  } = usePipelineContextY1()

  const { isDrawerOpened, drawerData } = pipelineView
  const { type } = drawerData

  const onClose = (): void => {
    updatePipelineView({ ...pipelineView, isDrawerOpened: false, drawerData: { type: DrawerTypesY1.AddStep } })
  }

  const onUpdateInputs = async (updatedInputs: PipelineInputs): Promise<void> => {
    const updatedPipeline = produce(pipeline, draft => {
      set(draft, 'spec.inputs', updatedInputs)
    })

    await updatePipeline(updatedPipeline)
  }

  const content: Record<DrawerTypesY1, JSX.Element> = {
    [DrawerTypesY1.RuntimeInputs]: (
      <RuntimeInputs isReadonly={isReadonly} pipeline={pipeline} onClose={onClose} onUpdateInputs={onUpdateInputs} />
    ),
    [DrawerTypesY1.AdvancedOptions]: (
      <AdvancedOptionsY1
        pipeline={cloneDeep(pipeline)}
        onApplyChanges={async updatedPipeline => {
          await updatePipeline(
            produce(pipeline, draft => {
              updatedPipeline?.timeout && set(draft, 'timeout', updatedPipeline.timeout)
              updatedPipeline?.labels && set(draft, 'labels', updatedPipeline.labels)
              updatedPipeline?.options && set(draft, 'options', updatedPipeline.options)
            })
          )
          updatePipelineView({
            ...pipelineView,
            isDrawerOpened: false,
            drawerData: {
              type: DrawerTypesY1.AddStep
            }
          })
        }}
        onDiscard={onClose}
      />
    )
  } as Record<DrawerTypesY1, JSX.Element> // TODO: remove when all drawer types are supported

  return (
    <Drawer
      lazy
      usePortal
      autoFocus
      canEscapeKeyClose
      hasBackdrop
      canOutsideClickClose
      enforceFocus={false}
      position={Position.RIGHT}
      size={DrawerSizesY1[type]}
      isOpen={isDrawerOpened}
      onClose={onClose}
      className={css.drawer}
      portalClassName={css.portal}
      backdropClassName={css.backdrop}
    >
      <Button
        intent="primary"
        iconProps={{
          size: 24
        }}
        className={css.closeBtn}
        icon="cross"
        onClick={onClose}
        withoutBoxShadow
        data-testid="drawer-close-btn"
      />
      {content[type] ?? null}
    </Drawer>
  )
}
