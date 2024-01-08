/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { clone } from 'lodash-es'
import { Button, Layout, Text, Icon } from '@harness/uicore'
import { PopoverPosition } from '@blueprintjs/core'
import { Color } from '@harness/design-system'
import { getIconByType, onDragEnd, onDragLeave, onDragOver, onDragStart } from './utils'
import css from './InputSetSelector.module.scss'

export interface SelectedInputSetListValue<T = unknown> {
  type: string
  label: string
  value: string | number | symbol
  data: T
}

export interface SelectedInputSetListProps<T> {
  value: Array<SelectedInputSetListValue<T>>
  onChange?: (value: Array<SelectedInputSetListValue<T>>) => void
  isDisabled?: (item: SelectedInputSetListValue<T>) => boolean
}

export function SelectedInputSetList<T>({ value, onChange, isDisabled }: SelectedInputSetListProps<T>): JSX.Element {
  const onDrop = React.useCallback(
    (event: React.DragEvent<HTMLLIElement>, droppedLocation: SelectedInputSetListValue<T>) => {
      if (event.preventDefault) {
        event.preventDefault()
      }
      const data = event.dataTransfer.getData('data')
      if (data) {
        try {
          const dropInputSet: SelectedInputSetListValue = JSON.parse(data)
          const selected = clone(value)
          const droppedItem = selected.filter(item => item.value === dropInputSet.value)[0]
          if (droppedItem) {
            const droppedItemIndex = selected.indexOf(droppedItem)
            const droppedLocationIndex = selected.indexOf(droppedLocation)
            selected.splice(droppedItemIndex, 1)
            selected.splice(droppedLocationIndex, 0, droppedItem)
            onChange?.(selected)
          }
          // eslint-disable-next-line no-empty
        } catch {}
      }
      event.currentTarget.classList.remove(css.dragOver)
    },
    [value]
  )

  return (
    <>
      {value?.map((item, index) => (
        <li
          key={`${item.value as string}-${item.type ?? 'INPUT_SET'}`}
          data-testid={`${index}-${item.value as string}`}
          className={css.selectedInputSetLi}
          draggable={true}
          onDragStart={event => {
            onDragStart(event, item)
          }}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={event => onDrop(event, item)}
        >
          <Button
            data-testid={`button-${item.label}`}
            round={true}
            rightIcon="cross"
            iconProps={{
              onClick: event => {
                event.stopPropagation()
                const valuesAfterRemoval = value.filter(inputset => inputset.value !== item.value)
                onChange?.(valuesAfterRemoval)
              },
              style: {
                cursor: 'pointer'
              }
            }}
            text={
              <Layout.Horizontal flex={{ alignItems: 'center' }} spacing="small">
                <Icon name="drag-handle-vertical" className={css.drag} size={14} />
                <Text
                  color={Color.PRIMARY_8}
                  icon={getIconByType(item.type)}
                  className={css.selectedInputSetLabel}
                  iconProps={{ className: css.selectedInputSetTypeIcon }}
                  tooltip={
                    <Text padding={'small'} color={Color.GREY_200}>
                      {item.value}
                    </Text>
                  }
                  lineClamp={1}
                  tooltipProps={{
                    isDark: true,
                    position: PopoverPosition.TOP,
                    disabled: isDisabled?.(item)
                  }}
                >
                  {item.label}
                </Text>
              </Layout.Horizontal>
            }
            margin={{ top: 'small', bottom: 'small', left: 0, right: 'small' }}
            className={css.selectedInputSetCard}
            color={Color.PRIMARY_7}
          />
        </li>
      ))}
    </>
  )
}
