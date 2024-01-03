import React, { useMemo, useState } from 'react'
import cx from 'classnames'
import { useFormikContext } from 'formik'
import { Popover, PopoverInteractionKind, Position } from '@blueprintjs/core'
import { Color, FontVariation } from '@harness/design-system'
import { Icon, Layout, SelectOption, Text } from '@harness/uicore'
import { useStrings } from 'framework/strings'
import { getDisplayName, getInitialValue } from './ApplicationIdDropdown.utils'
import { NonCustomMetricFields } from '../../NewRelicHealthSource.types'
import styles from './ApplicationIdDropdown.module.scss'

interface NewRelicFormType {
  newRelicApplication?: NonCustomMetricFields['newRelicApplication']
}

export interface ApplicationIdDropdownProps {
  applicationOptions?: SelectOption[]
  applicationLoading: boolean
  isTemplate?: boolean
  onApplicationChange: ({ appName, appId }: { appName: string; appId: string }) => void
}

function ApplicationIdDropdown(props: ApplicationIdDropdownProps): JSX.Element | null {
  const { applicationOptions, applicationLoading, isTemplate, onApplicationChange } = props

  const { getString } = useStrings()

  const [isSelectOpen, setIsSelectOpen] = useState<boolean>(false)

  const { values, setFieldValue } = useFormikContext<NewRelicFormType>()

  const [selectedOption, setSelectedOption] = useState<SelectOption | null>(() =>
    getInitialValue(values?.newRelicApplication)
  )

  const handleSelectType = (currentSelectedOption: SelectOption): void => {
    if (selectedOption?.value === currentSelectedOption.value) {
      return
    }
    onApplicationChange({ appId: currentSelectedOption.value as string, appName: currentSelectedOption.label })
    setSelectedOption(currentSelectedOption)
    setFieldValue('newRelicApplication', currentSelectedOption)
    setIsSelectOpen(false)
  }

  const displayName = useMemo(
    () => getDisplayName({ applicationLoading, getString, selectedOption }),
    [applicationLoading, getString, selectedOption]
  )

  if (!applicationOptions) {
    return null
  }

  return (
    <Popover
      isOpen={isSelectOpen}
      disabled={Boolean(applicationLoading || !applicationOptions?.length)}
      onInteraction={nextOpenState => {
        setIsSelectOpen(nextOpenState)
      }}
      interactionKind={PopoverInteractionKind.CLICK}
      position={Position.BOTTOM_LEFT}
      popoverClassName={styles.popoverContainer}
      modifiers={{
        arrow: { enabled: false },
        flip: { enabled: true },
        keepTogether: { enabled: true },
        preventOverflow: { enabled: true }
      }}
      fill={true}
      usePortal={true}
      content={
        <Layout.Vertical
          spacing="medium"
          padding={{ top: 'medium', bottom: 'medium' }}
          className={styles.menuContainer}
        >
          {applicationOptions.map(applicationOption => {
            return (
              <Layout.Horizontal
                flex={{ alignItems: 'flex-start' }}
                className={styles.option}
                key={applicationOption.value as string}
                onClick={() => handleSelectType(applicationOption)}
                data-testid={`${applicationOption.value as string}-option`}
              >
                <Layout.Vertical style={{ flex: 1 }}>
                  <Text color={Color.BLACK} font={{ variation: FontVariation.BODY2_SEMI }}>
                    {applicationOption.value}
                  </Text>
                  <Text color={Color.GREY_600} font={{ variation: FontVariation.SMALL }}>
                    {applicationOption.label}
                  </Text>
                </Layout.Vertical>
              </Layout.Horizontal>
            )
          })}
        </Layout.Vertical>
      }
    >
      <div
        className={cx(styles.selectContainer, {
          [styles.selectContainerTemplate]: isTemplate
        })}
        data-testid="applicationIdDropdown"
      >
        <Layout.Horizontal>
          <Text data-testid="newRelicApplicationValue" color={Color.BLACK}>
            {displayName}
          </Text>
        </Layout.Horizontal>
        <Icon name="caret-down" />
      </div>
    </Popover>
  )
}

export default ApplicationIdDropdown
