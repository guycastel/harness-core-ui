/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { Layout, MultiTypeInputType, Text, Container, Checkbox } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { Intent, PopoverPosition, Position } from '@blueprintjs/core'
import { isEmpty, remove } from 'lodash-es'
import { CheckboxProps } from '@harness/uicore/dist/components/Checkbox/Checkbox'
import { UIInputs, UIRuntimeInput } from '@modules/70-pipeline/y1/components/InputsForm/types'
import { InputComponentRenderer } from '@modules/70-pipeline/y1/components/InputFactory/InputComponentRenderer'
import inputComponentFactory from '@modules/70-pipeline/y1/components/InputFactory/InputComponentFactory'
import { useStrings } from 'framework/strings'
import css from './PipelineInputSetFormY1.module.scss'

interface CommonCheckboxProps {
  checked: CheckboxProps['checked']
  indeterminate: CheckboxProps['checked']
  onChange: CheckboxProps['onChange']
}
export type InputsFormValues = { [key: string]: unknown }

export interface PipelineInputsFormY1Props {
  inputs: UIInputs
  readonly: boolean
  prefix?: string
  className?: string
  manageInputsActive?: boolean
  selectedInputs?: string[]
  onSelectedInputsChange?: (selectedInputs: string[]) => void
  disabled?: boolean
}

export function PipelineInputsFormY1(props: PipelineInputsFormY1Props): React.ReactElement {
  const {
    inputs,
    readonly,
    prefix = '',
    manageInputsActive,
    selectedInputs = [],
    onSelectedInputsChange,
    className,
    disabled
  } = props

  const commonCheckBoxProps: CommonCheckboxProps = {
    checked: selectedInputs.length !== 0,
    indeterminate: selectedInputs.length > 0 && selectedInputs.length < inputs.inputs.length,
    onChange: evt => {
      if (evt.currentTarget.checked) {
        onSelectedInputsChange?.(inputs.inputs.map(input => input.name))
      } else {
        onSelectedInputsChange?.([])
      }
    }
  }

  return (
    <div className={cx(css.inputsForm, className)}>
      <InputRowHeader manageInputsActive={manageInputsActive} commonCheckBoxProps={commonCheckBoxProps} />
      {inputs.inputs.map(input => {
        const selected = manageInputsActive && selectedInputs.includes(input.name)
        const rowDisabled = disabled || (manageInputsActive && !selectedInputs.includes(input.name))

        return (
          <InputRow
            key={`${input.name}`}
            prefix={prefix}
            input={{
              ...input,
              readonly: input.readonly || disabled
            }}
            readonly={readonly}
            manageInputsActive={manageInputsActive}
            selected={selected}
            rowDisabled={rowDisabled}
            setSelected={value => {
              const newSelectedInputs = [...selectedInputs]
              if (value) {
                newSelectedInputs?.push(input.name)
              } else {
                remove(newSelectedInputs, name => name === input.name)
              }
              onSelectedInputsChange?.(newSelectedInputs)
            }}
          />
        )
      })}
    </div>
  )
}

export interface InputRowProps {
  input: UIRuntimeInput
  readonly: boolean
  prefix?: string
  manageInputsActive?: boolean
  selected?: boolean
  setSelected?: (value: boolean) => void
  rowDisabled?: boolean
}

export function InputRow(props: InputRowProps): React.ReactElement {
  const { input, readonly, manageInputsActive, selected, setSelected, rowDisabled, prefix = '' } = props
  const { name, type, desc } = input

  return (
    <div className={cx(css.inputRow, { [css.manageInputs]: manageInputsActive, [css.rowDisabled]: rowDisabled })}>
      {manageInputsActive && (
        <Checkbox
          checked={selected}
          onChange={e => {
            setSelected?.(e.currentTarget.checked)
          }}
        />
      )}
      <Container>
        <Layout.Horizontal flex={{ justifyContent: 'start' }} margin={{ bottom: 'xsmall' }}>
          <Text lineClamp={1} color={Color.BLACK}>
            {name}
          </Text>
          {!isEmpty(desc) && (
            <Text
              icon="description"
              inline
              padding={'small'}
              iconProps={{ size: 16 }}
              tooltip={desc}
              tooltipProps={{
                position: Position.TOP,
                isDark: true
              }}
            />
          )}
        </Layout.Horizontal>
        <Text color={Color.GREY_350}>{type}</Text>
      </Container>
      <Container>
        <InputComponentRenderer
          path={`${prefix}${input.name}`}
          allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]}
          factory={inputComponentFactory}
          readonly={readonly}
          input={input}
        />
      </Container>
    </div>
  )
}
interface InputRowHeaderProps {
  manageInputsActive?: boolean
  commonCheckBoxProps: CommonCheckboxProps
}

export function InputRowHeader({ manageInputsActive, commonCheckBoxProps }: InputRowHeaderProps): React.ReactElement {
  const { getString } = useStrings()

  return (
    <div className={cx(css.inputRow, css.inputRowHeader, { [css.manageInputs]: manageInputsActive })}>
      {manageInputsActive && <Checkbox {...commonCheckBoxProps} />}
      <Text font={{ variation: FontVariation.TABLE_HEADERS }} flex={{ alignItems: 'center' }}>
        {getString('pipeline.inputs.name')}
      </Text>
      <Layout.Horizontal spacing={'small'} flex={{ alignItems: 'center', justifyContent: 'left' }}>
        <Text font={{ variation: FontVariation.TABLE_HEADERS }}>{getString('pipeline.inputs.value')}</Text>
        <Text
          intent={Intent.PRIMARY}
          rightIcon="info"
          iconProps={{ size: 12 }}
          tooltip={getString('pipeline.inputSets.emptyStringInfoTooltip')}
          tooltipProps={{ isDark: true, position: PopoverPosition.BOTTOM }}
        />
      </Layout.Horizontal>
    </div>
  )
}
