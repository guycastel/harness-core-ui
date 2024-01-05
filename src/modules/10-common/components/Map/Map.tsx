/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { v4 as nameSpace, v5 as uuid } from 'uuid'
import cx from 'classnames'
import { Text, Card, Button, TextInput } from '@harness/uicore'
import { Intent } from '@harness/design-system'
import { connect, FormikContextType } from 'formik'
import { get, isEmpty } from 'lodash-es'
import { useStrings } from 'framework/strings'
import css from './Map.module.scss'

export type MapType = { [key: string]: string }
export type MultiTypeMapType = MapType | string
export type MapUIType = { id: string; key: string; value: string }[]
export type MultiTypeMapUIType = MapUIType | string

export interface MapProps {
  name: string
  label?: string | React.ReactElement
  formik?: FormikContextType<any>
  disabled?: boolean
  style?: React.CSSProperties
  keyLabel?: string
  valueLabel?: string
}

function generateNewValue(): { id: string; key: string; value: string } {
  return { id: uuid('', nameSpace()), key: '', value: '' }
}

export const Map = (props: MapProps): React.ReactElement => {
  const { name, label, formik, disabled, style } = props

  const { getString } = useStrings()

  const [value, setValue] = React.useState<MapUIType>(() => {
    const initialValue = get(formik?.values, name, '') as MapType

    const initialValueInCorrectFormat = Object.keys(initialValue || {}).map(key => ({
      id: uuid('', nameSpace()),
      key: key,
      value: initialValue[key]
    }))

    // Adding a default value
    if (Array.isArray(initialValueInCorrectFormat) && initialValueInCorrectFormat.length === 0) {
      initialValueInCorrectFormat.push(generateNewValue())
    }

    return initialValueInCorrectFormat as MapUIType
  })

  const error = get(formik?.errors, name, '')
  const touched = get(formik?.touched, name)
  const hasSubmitted = get(formik, 'submitCount', 0) > 0

  const addValue = (): void => {
    setValue(currentValue => [...currentValue, generateNewValue()])
  }

  const removeValue = (index: number): void => {
    setValue(currentValue => {
      const newCurrentValue = [...currentValue]
      newCurrentValue.splice(index, 1)
      return newCurrentValue
    })
  }

  const changeValue = (index: number, key: 'key' | 'value', newValue: string): void => {
    formik?.setFieldTouched(name, true)
    setValue(currentValue => {
      const newCurrentValue = [...currentValue]
      newCurrentValue[index][key] = newValue
      return newCurrentValue
    })
  }

  React.useEffect(() => {
    const initialValue = get(formik?.values, name, '') as MapType
    const valueWithoutEmptyItems = value.filter(item => !!item.value)

    if (isEmpty(valueWithoutEmptyItems) && initialValue) {
      const initialValueInCorrectFormat = Object.keys(initialValue || {}).map(key => ({
        id: uuid('', nameSpace()),
        key: key,
        value: initialValue[key]
      }))

      // Adding a default value
      if (Array.isArray(initialValueInCorrectFormat) && initialValueInCorrectFormat.length === 0) {
        initialValueInCorrectFormat.push(generateNewValue())
      }

      setValue(initialValueInCorrectFormat)
    }
  }, [formik?.values, name, value])

  React.useEffect(() => {
    const valueInCorrectFormat: MapType = {}
    if (Array.isArray(value)) {
      value.forEach(mapValue => {
        if (mapValue.key && mapValue.value) {
          valueInCorrectFormat[mapValue.key] = mapValue.value
        }
      })
    }

    if (isEmpty(valueInCorrectFormat)) {
      formik?.setFieldValue(name, undefined)
    } else {
      formik?.setFieldValue(name, valueInCorrectFormat)
    }
  }, [name, value, formik?.setFieldValue])

  return (
    <div style={style}>
      {label}
      <Card style={{ width: '100%' }}>
        {value.map(({ id, key, value: valueValue }, index: number) => {
          const keyError = get(error, `[${index}].key`)
          const valueError = get(error, `[${index}].value`)

          return (
            <div className={cx(css.group, css.withoutAligning)} key={id}>
              <div style={{ flexGrow: 1 }}>
                {index === 0 && <Text margin={{ bottom: 'xsmall' }}>{props.keyLabel || getString('keyLabel')}</Text>}
                <TextInput
                  value={key}
                  intent={(touched || hasSubmitted) && error ? Intent.DANGER : Intent.NONE}
                  errorText={(touched || hasSubmitted) && keyError ? keyError : undefined}
                  disabled={disabled}
                  onChange={e => changeValue(index, 'key', (e.currentTarget as HTMLInputElement).value)}
                  data-testid={`key-${name}-[${index}]`}
                />
              </div>

              <div style={{ flexGrow: 1 }}>
                {index === 0 && (
                  <Text margin={{ bottom: 'xsmall' }}>{props.valueLabel || getString('valueLabel')}</Text>
                )}
                <div className={cx(css.group, css.withoutAligning, css.withoutSpacing)}>
                  <TextInput
                    value={valueValue}
                    intent={(touched || hasSubmitted) && error ? Intent.DANGER : Intent.NONE}
                    errorText={(touched || hasSubmitted) && valueError ? valueError : undefined}
                    disabled={disabled}
                    onChange={e => changeValue(index, 'value', (e.currentTarget as HTMLInputElement).value)}
                    data-testid={`value-${name}-[${index}]`}
                  />
                  {!disabled && (
                    <Button
                      icon="main-trash"
                      iconProps={{ size: 20 }}
                      minimal
                      data-testid={`remove-${name}-[${index}]`}
                      style={{ marginTop: 4 }}
                      onClick={() => removeValue(index)}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {!disabled && (
          <Button intent="primary" minimal text={getString('plusAdd')} data-testid={`add-${name}`} onClick={addValue} />
        )}
      </Card>

      {(touched || hasSubmitted) && error && typeof error === 'string' && (
        <Text intent={Intent.DANGER} margin={{ top: 'xsmall' }}>
          {error}
        </Text>
      )}
    </div>
  )
}

export default connect(Map)
