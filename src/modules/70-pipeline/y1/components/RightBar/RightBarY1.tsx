/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { Button, ButtonVariation } from '@harness/uicore'
import { useStrings } from 'framework/strings'
import { usePipelineContextY1 } from '../PipelineContext/PipelineContextY1'
import { DrawerTypesY1 } from '../PipelineContext/PipelineActionsY1'
import { RightDrawerY1 } from '../RightDrawer/RightDrawerY1'

import rightBarCss from '@pipeline/components/PipelineStudio/RightBar/RightBar.module.scss'

export function RightBarY1(): JSX.Element {
  const { getString } = useStrings()
  const {
    state: { pipelineView },
    updatePipelineView
  } = usePipelineContextY1()

  const { drawerData } = pipelineView
  const { type } = drawerData

  const openRightDrawer = React.useCallback(
    (drawerType: DrawerTypesY1): void => {
      updatePipelineView({
        ...pipelineView,
        isDrawerOpened: true,
        drawerData: { type: drawerType },
        isSplitViewOpen: false,
        splitViewData: {}
      })
    },
    [pipelineView, updatePipelineView]
  )

  return (
    <aside className={rightBarCss.rightBar}>
      <Button
        className={cx(rightBarCss.iconButton, { [rightBarCss.selected]: type === DrawerTypesY1.RuntimeInputs })}
        onClick={() => openRightDrawer(DrawerTypesY1.RuntimeInputs)}
        variation={ButtonVariation.TERTIARY}
        font={{ weight: 'semi-bold', size: 'xsmall' }}
        icon="pipeline-variables"
        withoutCurrentColor={true}
        iconProps={{ size: 20 }}
        text={getString('pipeline.runtimeInputs')}
        data-testid="runtime-inputs-nav-tile"
      />

      <Button
        className={cx(rightBarCss.iconButton, {
          [rightBarCss.selected]: type === DrawerTypesY1.AdvancedOptions
        })}
        variation={ButtonVariation.TERTIARY}
        onClick={() => openRightDrawer(DrawerTypesY1.AdvancedOptions)}
        font={{ weight: 'semi-bold', size: 'xsmall' }}
        icon="pipeline-advanced"
        withoutCurrentColor={true}
        iconProps={{ size: 20 }}
        text={getString('pipeline.advancedOptions')}
        data-testid="advanced-configurations-nav-tile"
      />

      <RightDrawerY1 />
    </aside>
  )
}
