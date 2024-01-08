/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Intent, PopoverPosition } from '@blueprintjs/core'
import { Button, ButtonSize, ButtonVariation, Layout, Text } from '@harness/uicore'
import { useStrings } from 'framework/strings'

interface ManageInputsY1Props {
  active?: boolean
  onActivate: () => void
  onCancel: () => void
  onApply: () => void
  inputsCounter: {
    all: number
    selected: number
  }
  className?: string
}

export function ManageInputsY1(props: ManageInputsY1Props): React.ReactElement {
  const { active, onActivate, onCancel, onApply, inputsCounter, className } = props
  const { getString } = useStrings()
  return (
    <Layout.Horizontal flex={{ distribution: 'space-between' }} spacing={'small'} className={className}>
      <div>
        <Text inline>{getString('pipeline.inputSets.manageListOfInputs')}</Text>
        {active && (
          <Text inline>
            {' '}
            {getString('pipeline.inputSets.selectedOutOf', {
              selected: inputsCounter.selected,
              all: inputsCounter.all
            })}
          </Text>
        )}
      </div>
      <Layout.Horizontal flex={{ justifyContent: 'center' }} spacing={'small'}>
        {!active ? (
          <Button
            variation={ButtonVariation.SECONDARY}
            size={ButtonSize.SMALL}
            onClick={() => {
              onActivate()
            }}
          >
            {getString('common.manage')}
          </Button>
        ) : (
          <>
            <Button
              variation={ButtonVariation.SECONDARY}
              size={ButtonSize.SMALL}
              onClick={() => {
                onApply()
              }}
            >
              {getString('common.apply')}
            </Button>
            <Button
              minimal
              variation={ButtonVariation.LINK}
              size={ButtonSize.SMALL}
              onClick={() => {
                onCancel()
              }}
            >
              {getString('cancel')}
            </Button>
          </>
        )}
        <Text
          intent={Intent.PRIMARY}
          rightIcon="info"
          iconProps={{ size: 12 }}
          tooltip={getString('pipeline.inputSets.manageInputSetTooltip')}
          tooltipProps={{ isDark: true, position: PopoverPosition.BOTTOM }}
        />
      </Layout.Horizontal>
    </Layout.Horizontal>
  )
}
