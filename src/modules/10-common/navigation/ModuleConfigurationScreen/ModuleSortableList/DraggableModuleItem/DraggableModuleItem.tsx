/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Layout } from '@harness/uicore'
import { Icon } from '@harness/icons'
import { Color } from '@harness/design-system'
import { Draggable } from 'react-beautiful-dnd'
import NavModule from '@common/navigation/ModuleList/NavModule/NavModule'
import type { NavModuleName } from '@common/hooks/useNavModuleInfo'
import useNavModuleInfo from '@common/hooks/useNavModuleInfo'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import css from './DraggableModuleItem.module.scss'

export interface DraggableModuleItemProps {
  index: number
  module: NavModuleName
  isActive?: boolean
  onClick?: (module: NavModuleName) => void
  onCheckboxChange?: (checked: boolean) => void
  checked?: boolean
}

const DraggableModuleItem: React.FC<DraggableModuleItemProps> = ({
  onClick,
  module,
  isActive,
  index,
  onCheckboxChange,
  checked = false
}) => {
  const { isNewNavEnabled: isLightThemed } = useAppStore()
  return (
    <>
      <Draggable key={module} draggableId={module} index={index}>
        {providedDrag => (
          <div
            className={css.container}
            {...providedDrag.draggableProps}
            {...providedDrag.dragHandleProps}
            ref={providedDrag.innerRef}
          >
            <Layout.Horizontal flex={{ justifyContent: 'flex-start' }}>
              <Icon name="drag-handle-vertical" size={20} color={Color.GREY_300} margin={{ right: 'xsmall' }} />
              <NavModule
                module={module}
                active={isActive}
                onClick={onClick}
                checkboxProps={{ checked, handleChange: onCheckboxChange }}
                theme={isLightThemed ? 'LIGHT' : 'DARK'}
              />
            </Layout.Horizontal>
          </div>
        )}
      </Draggable>
    </>
  )
}

const DraggableModuleItemWithCondition: React.FC<DraggableModuleItemProps> = props => {
  const { shouldVisible } = useNavModuleInfo(props.module)

  if (!shouldVisible) {
    return null
  }

  return <DraggableModuleItem {...props} />
}

export default DraggableModuleItemWithCondition
