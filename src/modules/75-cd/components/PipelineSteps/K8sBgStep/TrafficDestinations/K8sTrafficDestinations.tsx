/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { v4 as nameSpace, v5 as uuid } from 'uuid'
import cx from 'classnames'
import { FormInput, Button, getMultiTypeFromValue, MultiTypeInputType, Container } from '@harness/uicore'
import { FieldArray, connect, FormikContextType } from 'formik'
import { get } from 'lodash-es'
import { ConfigureOptions, ConfigureOptionsProps } from '@common/components/ConfigureOptions/ConfigureOptions'
import { useStrings } from 'framework/strings'
import MultiTypeFieldSelector, {
  MultiTypeFieldSelectorProps
} from '@common/components/MultiTypeFieldSelector/MultiTypeFieldSelector'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'
import css from './K8sTrafficDestinations.module.scss'

export type MapValue = { id: string; key: string; value: string }[]
export type MultiTypeMapValue = MapValue | string

interface MultiTypeMapConfigureOptionsProps
  extends Omit<ConfigureOptionsProps, 'value' | 'type' | 'variableName' | 'onChange'> {
  variableName?: ConfigureOptionsProps['variableName']
}

interface DestinationItem {
  destination: {
    id?: string
    host?: string
    weight?: string
  }
}
interface DestinationDefaultValue {
  host: string
  stage: string
}

export interface TrafficDestinationsProps {
  name: string
  multiTypeFieldSelectorProps: Omit<MultiTypeFieldSelectorProps, 'name' | 'defaultValueToReset' | 'children'>
  enableConfigureOptions?: boolean
  enableValueConfigureOptions?: boolean
  configureOptionsProps?: MultiTypeMapConfigureOptionsProps
  formik?: FormikContextType<unknown>
  disabled?: boolean
  defaultValues: DestinationDefaultValue
  expressions: string[]
}

const MultiTrafficDestionations = (props: TrafficDestinationsProps): React.ReactElement => {
  const {
    name,
    multiTypeFieldSelectorProps,
    enableConfigureOptions = true,
    enableValueConfigureOptions = false,
    configureOptionsProps,
    formik,
    disabled,
    defaultValues,
    expressions
  } = props
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()
  const { getString } = useStrings()

  const getDefaultResetValue = (): DestinationItem[] => {
    return [{ destination: { id: uuid('', nameSpace()), host: defaultValues.host, weight: '' } }]
  }
  const value = get(formik?.values, name, []) as MultiTypeMapValue

  const isRuntime = typeof value === 'string' && getMultiTypeFromValue(value) === MultiTypeInputType.RUNTIME

  return (
    <Container
      className={cx(css.multiTypeMap, css.grid, {
        [css.fieldAndOptions]: isRuntime
      })}
    >
      {!isRuntime && (
        <MultiTypeFieldSelector
          name={name}
          defaultValueToReset={getDefaultResetValue()}
          style={{ marginBottom: 0 }}
          {...multiTypeFieldSelectorProps}
          disableTypeSelection={disabled}
        >
          <FieldArray
            name={name}
            render={({ push, remove }) => (
              <>
                <div className={cx(css.grid, css.rows)}>
                  {Array.isArray(value) && value.length > 0 && (
                    <>
                      {value.map(({ id }, index: number) => {
                        return (
                          <div className={cx(css.grid, css.row)} key={id}>
                            <div>
                              <FormInput.Text
                                className={css.marginZero}
                                name={`${name}[${index}].destination.host`}
                                disabled={disabled}
                                placeholder={index === 0 ? getString('common.stable') : getString('common.stage')}
                                label={getString('common.hostLabel')}
                              />
                            </div>
                            <Container>
                              <div className={cx(css.grid, enableValueConfigureOptions && css.fieldAndOptions)}>
                                <div className={cx(stepCss.formGroup, stepCss.xxlg)}>
                                  <FormInput.MultiTextInput
                                    name={`${name}[${index}].destination.weight`}
                                    placeholder={getString('common.weight')}
                                    label={getString('common.weight')}
                                    disabled={disabled}
                                    multiTextInputProps={{
                                      expressions,
                                      disabled: disabled,
                                      textProps: { type: 'number', min: 0, max: 100 },
                                      newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                                      allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION]
                                    }}
                                  />
                                </div>
                              </div>
                            </Container>

                            <Container flex={{ alignItems: 'center' }} height={'100%'}>
                              <Button
                                icon="main-trash"
                                iconProps={{ size: 20 }}
                                minimal
                                data-testid={`remove-${name}-[${index}]`}
                                onClick={() => remove(index)}
                                disabled={disabled}
                              />
                            </Container>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>

                {Array.isArray(value) && value?.length === 2 ? null : (
                  <Button
                    intent="primary"
                    minimal
                    text={getString('plusAdd')}
                    data-testid={`add-${name}`}
                    onClick={() =>
                      push({
                        destination: { host: value.length === 1 ? defaultValues.host : defaultValues.stage, weight: '' }
                      })
                    }
                    disabled={disabled}
                    style={{ padding: 0 }}
                  />
                )}
              </>
            )}
          />
        </MultiTypeFieldSelector>
      )}
      {isRuntime && (
        <>
          <FormInput.MultiTextInput
            className={css.marginZero}
            name={name}
            multiTextInputProps={{
              allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME],
              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            }}
            {...multiTypeFieldSelectorProps}
          />
          {enableConfigureOptions && (
            <ConfigureOptions
              value={value}
              type="Map"
              variableName={name}
              showRequiredField={false}
              showDefaultField={false}
              onChange={val => formik?.setFieldValue(name, val)}
              {...configureOptionsProps}
              isReadonly={props.disabled}
            />
          )}
        </>
      )}
    </Container>
  )
}

export default connect(MultiTrafficDestionations)
