/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import cx from 'classnames'
import { useFormikContext } from 'formik'
import { Popover, PopoverInteractionKind, Position } from '@blueprintjs/core'
import { Color, FontVariation } from '@harness/design-system'
import { Container, Icon, IconName, Layout, Text } from '@harness/uicore'
import { useStrings } from 'framework/strings'
import { ContinousVerificationData } from '@cv/components/PipelineSteps/ContinousVerification/types'
import { VerificationTypesOptionsType } from '../SelectVerificationType.types'
import { getInitialValue } from './VerificationTypeDropdown.utils'
import styles from './VerificationTypeDropdown.module.scss'

interface VerificationTypeDropdownProps {
  verificationTypeOptions: VerificationTypesOptionsType[]
  readonly?: boolean
}

export default function VerificationTypeDropdown({
  verificationTypeOptions,
  readonly
}: VerificationTypeDropdownProps): JSX.Element {
  const { getString } = useStrings()

  const [isSelectOpen, setIsSelectOpen] = useState<boolean>(false)

  const { values, setFieldValue } = useFormikContext<ContinousVerificationData>()

  const [selectedOption, setSelectedOption] = useState<VerificationTypesOptionsType | null>(() =>
    getInitialValue(verificationTypeOptions, values?.spec?.type)
  )

  const handleSelectType = (currentSelectedOption: VerificationTypesOptionsType): void => {
    if (selectedOption?.value === currentSelectedOption.value) {
      return
    }
    setSelectedOption(currentSelectedOption)
    setFieldValue('spec.type', currentSelectedOption.value)
    setIsSelectOpen(false)
  }

  return (
    <Container>
      <Text color={Color.GREY_600} margin={{ bottom: 'xsmall' }} tooltipProps={{ dataTooltipId: 'cvData_spec.type' }}>
        {getString('platform.connectors.cdng.continousVerificationType')}
      </Text>
      <Popover
        isOpen={isSelectOpen}
        disabled={readonly}
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
            {verificationTypeOptions.map(verificationType => {
              return (
                <Layout.Horizontal
                  flex={{ alignItems: 'flex-start' }}
                  className={styles.option}
                  key={verificationType.value as string}
                  onClick={() => handleSelectType(verificationType)}
                  data-testid={`${verificationType.value as string}-option`}
                >
                  <Icon margin={{ right: 'medium' }} size={24} name={verificationType.icon?.name as IconName} />
                  <Layout.Vertical style={{ flex: 1 }}>
                    <Text color={Color.BLACK} font={{ variation: FontVariation.BODY2_SEMI }}>
                      {verificationType.label}
                    </Text>
                    <Text color={Color.GREY_700} font={{ variation: FontVariation.SMALL }}>
                      {getString(verificationType.descriptionKey)}
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
            [styles.disabledStyle]: readonly
          })}
          data-testid="selectedVerificationDisplay"
        >
          {selectedOption ? (
            <Layout.Horizontal>
              <Icon margin={{ right: 'small' }} name={selectedOption?.icon?.name as IconName} />
              <Text data-testid="selectedVerificationLabel" color={Color.BLACK}>
                {selectedOption.label}
              </Text>
            </Layout.Horizontal>
          ) : (
            getString('select')
          )}
          <Icon name="caret-down" />
        </div>
      </Popover>
    </Container>
  )
}
