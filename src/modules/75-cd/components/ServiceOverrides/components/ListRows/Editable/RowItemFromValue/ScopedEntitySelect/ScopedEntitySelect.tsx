import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { get } from 'lodash-es'
import { useFormikContext } from 'formik'
import cx from 'classnames'
import { Classes, IconName, Popover, PopoverInteractionKind, PopoverPosition } from '@blueprintjs/core'

import { Button, Container, Tabs, SelectOption, Layout, Text } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { StringKeys, useStrings } from 'framework/strings'

import { TAB_ID } from '@common/components/EntityReference/EntityReference.types'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { Scope } from '@common/interfaces/SecretsInterface'
import { useServiceOverridesContext } from '@cd/components/ServiceOverrides/context/ServiceOverrideContext'

import ScopedEntitySelectTabContent from './ScopedEntitySelectTabContent'

import css from './ScopedEntitySelect.module.scss'

export interface ScopedEntitySelectProps {
  fieldKey: 'environmentRef' | 'serviceRef'
  readonly?: boolean
  width?: number
}

export default function ScopedEntitySelect<T>({
  fieldKey,
  readonly,
  width = 160
}: ScopedEntitySelectProps): React.ReactElement {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const { getString } = useStrings()

  const { orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()

  const { values, setFieldValue, errors } = useFormikContext<T>()
  const { setNewOverrideEnvironmentInputValue } = useServiceOverridesContext()

  const fieldValue = get(values, fieldKey)
  const errorDisplayString = get(errors, fieldKey) as string

  const [selectedOption, setSelectedOption] = useState<SelectOption | undefined>(
    fieldValue ? { label: fieldValue, value: fieldValue } : undefined
  )

  const disabled = readonly

  const onSelect = (option: SelectOption): void => {
    setSelectedOption(option)
    setFieldValue(fieldKey, option.value)
    if (fieldKey === 'environmentRef') {
      setNewOverrideEnvironmentInputValue(option.value as string)
    }
    setIsPopoverOpen(false)
  }

  const renderTab = (icon: IconName, title: StringKeys): React.ReactElement | null => {
    return (
      <Layout.Horizontal flex={{ alignItems: 'center' }}>
        <Text
          icon={icon}
          iconProps={{
            margin: {
              right: 'xsmall'
            },
            size: 16
          }}
        >
          {getString(title)}
        </Text>
      </Layout.Horizontal>
    )
  }

  const buttonColor = disabled ? Color.GREY_400 : selectedOption?.label ? Color.BLACK : Color.GREY_300

  return (
    <React.Fragment>
      <Popover
        isOpen={isPopoverOpen}
        boundary={'viewport'}
        interactionKind={PopoverInteractionKind.CLICK}
        position={PopoverPosition.BOTTOM_LEFT}
        popoverClassName={Classes.DIALOG_BODY}
        disabled={disabled}
        minimal
        lazy
        usePortal
        fill
        onClose={() => setIsPopoverOpen(false)}
        content={
          <Container className={css.tabList}>
            <Tabs
              id={'scoped-select-popover'}
              tabList={[
                {
                  id: TAB_ID.ALL,
                  title: (
                    <Layout.Horizontal flex={{ alignItems: 'center' }}>
                      <Text>{getString('common.all')}</Text>
                    </Layout.Horizontal>
                  ),
                  panel: <ScopedEntitySelectTabContent onSelect={onSelect} fieldKey={fieldKey} />
                },
                {
                  id: TAB_ID.PROJECT,
                  title: renderTab('cube', 'projectLabel'),
                  panel: <ScopedEntitySelectTabContent onSelect={onSelect} scope={Scope.PROJECT} fieldKey={fieldKey} />,
                  hidden: !projectIdentifier
                },
                {
                  id: TAB_ID.ORGANIZATION,
                  title: renderTab('diagram-tree', 'orgLabel'),
                  panel: <ScopedEntitySelectTabContent onSelect={onSelect} scope={Scope.ORG} fieldKey={fieldKey} />,
                  hidden: !orgIdentifier
                },
                {
                  id: TAB_ID.ACCOUNT,
                  title: renderTab('layers', 'account'),
                  panel: <ScopedEntitySelectTabContent onSelect={onSelect} scope={Scope.ACCOUNT} fieldKey={fieldKey} />
                }
              ]}
            />
          </Container>
        }
      >
        <Button
          minimal
          data-testid={`scoped-select-popover-field_${fieldKey}`}
          className={cx(css.container, { [css.disabled]: disabled }, { [css.errorBorder]: !!errorDisplayString })}
          withoutCurrentColor={true}
          width={width}
          disabled={disabled}
          onClick={e => {
            e.preventDefault()
            setIsPopoverOpen(true)
          }}
        >
          <Text lineClamp={1} color={buttonColor}>
            {selectedOption?.label || getString('common.entityPlaceholderText')}
          </Text>
        </Button>
      </Popover>
      {errorDisplayString && (
        <div className={css.infraErrorMessageContainer}>
          <Text
            icon="circle-cross"
            iconProps={{ size: 10, color: Color.RED_600 }}
            font={{ size: 'small' }}
            color={Color.RED_600}
          >
            {errorDisplayString}
          </Text>
        </div>
      )}
    </React.Fragment>
  )
}
