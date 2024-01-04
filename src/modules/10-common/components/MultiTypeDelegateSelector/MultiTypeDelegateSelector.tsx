/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { connect, FormikContextType } from 'formik'
import cx from 'classnames'
import {
  FormikTooltipContext,
  DataTooltipInterface,
  MultiTypeInputType,
  HarnessDocTooltip,
  Container,
  AllowedTypes,
  ExpressionInput,
  EXPRESSION_INPUT_PLACEHOLDER,
  Radio,
  Layout
} from '@harness/uicore'
import { get, compact, isArray } from 'lodash-es'
import { FormGroup, IFormGroupProps, Intent } from '@blueprintjs/core'
import { useStrings } from 'framework/strings'
import { errorCheck } from '@common/utils/formikHelpers'
import MultiTypeFieldSelector, {
  MultiTypeFieldSelectorProps
} from '@common/components/MultiTypeFieldSelector/MultiTypeFieldSelector'
import { ExpressionsListInput } from '@common/components/ExpressionsListInput/ExpressionsListInput'
import {
  DelegateSelectorsV2Container,
  DelegateSelectorsV2ContainerProps
} from '@common/components/DelegateSelectors/DelegateSelectorsV2Container'

import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import css from './MultiTypeDelegateSelector.module.scss'

export interface MultiTypeDelegateSelectorProps extends IFormGroupProps {
  name: string
  label?: string
  expressions?: string[]
  allowableTypes?: AllowedTypes
  tooltipProps?: DataTooltipInterface
  inputProps: Omit<DelegateSelectorsV2ContainerProps, 'onChange'>
  disableTypeSelection?: boolean
  enableConfigureOptions?: boolean
  multiTypeFieldSelectorProps?: Partial<MultiTypeFieldSelectorProps>
}

export interface ConnectedMultiTypeDelegateSelectorProps extends MultiTypeDelegateSelectorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formik: FormikContextType<any>
}

interface ExpressionFieldProps {
  name: string
  value: string[] | string
  disabled?: boolean
  expressions?: string[]
  formik?: FormikContextType<any>
}

enum ExpressionView {
  List = 'List',
  Single = 'Single'
}

const ExpressionField = (props: ExpressionFieldProps): JSX.Element => {
  const { name, formik, disabled, value, expressions } = props
  const { getString } = useStrings()
  const [expressionView, setExpressionView] = React.useState<ExpressionView>(
    !isArray(value) ? ExpressionView.List : ExpressionView.Single
  )
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  return (
    <>
      <Layout.Horizontal className={css.radioStyle} spacing="medium">
        <Radio
          label={getString('delegate.DelegateSelector')}
          value={ExpressionView.Single}
          disabled={disabled}
          checked={expressionView === ExpressionView.Single}
          onClick={val => {
            setExpressionView(val.currentTarget.value as ExpressionView)
            // converting single value to array
            !isArray(value) && formik?.setFieldValue(name, [value])
          }}
          width={140}
        />
        <Container flex={{ alignItems: 'center' }}>
          <Radio
            label={getString('common.delegateExpressionList')}
            value={ExpressionView.List}
            checked={expressionView === ExpressionView.List}
            disabled={disabled}
            onClick={val => {
              setExpressionView(val.currentTarget.value as ExpressionView)
              //if single element in array then convert it to text field value on radio switch
              if (isArray(value) && value.length === 1) {
                formik?.setFieldValue(name, value[0])
              }
            }}
          />
          <HarnessDocTooltip tooltipId={'delegateExpressionList'} useStandAlone />
        </Container>
      </Layout.Horizontal>
      {expressionView === ExpressionView.List ? (
        <ExpressionInput
          name={name}
          value={value as string}
          disabled={disabled}
          newExpressionComponent={NG_EXPRESSIONS_NEW_INPUT_ELEMENT}
          inputProps={{ placeholder: EXPRESSION_INPUT_PLACEHOLDER }}
          items={expressions}
          onChange={val =>
            /* istanbul ignore next */
            formik?.setFieldValue(name, val)
          }
        />
      ) : (
        <ExpressionsListInput name={name} value={value as string[]} readOnly={disabled} expressions={expressions} />
      )}
    </>
  )
}

export function MultiTypeDelegateSelector(props: ConnectedMultiTypeDelegateSelectorProps): React.ReactElement {
  const {
    formik,
    allowableTypes = [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION],
    label,
    name,
    expressions = [],
    inputProps,
    disableTypeSelection = false,
    enableConfigureOptions = false,
    multiTypeFieldSelectorProps,
    ...restProps
  } = props
  const { showLabelText = true } = inputProps

  const value = get(formik.values, name)
  const hasError = errorCheck(name, formik)

  const { getString } = useStrings()

  const { intent = hasError ? Intent.DANGER : Intent.NONE, disabled, ...rest } = restProps

  const handleDelegateSelectorFixedValueChange = (tags: string[]): void => {
    formik.setFieldValue(name, compact(tags))
  }

  const tooltipContext = React.useContext(FormikTooltipContext)
  const dataTooltipId =
    props.tooltipProps?.dataTooltipId || (tooltipContext?.formName ? `${tooltipContext?.formName}_${name}` : '')

  return (
    <FormGroup
      {...rest}
      labelFor={name}
      label={label ? <HarnessDocTooltip tooltipId={dataTooltipId} labelText={label} /> : label}
      intent={intent}
    >
      <Container className={css.fieldSelectorContainer}>
        <MultiTypeFieldSelector
          name={name}
          label={showLabelText ? getString('common.defineDelegateSelector') : ''}
          defaultValueToReset={['']}
          skipRenderValueInExpressionLabel
          allowedTypes={allowableTypes}
          supportListOfExpressions={true}
          disableMultiSelectBtn={disabled}
          disableTypeSelection={disableTypeSelection}
          expressionRender={() => (
            <ExpressionField name={name} value={value} disabled={disabled} formik={formik} expressions={expressions} />
          )}
          enableConfigureOptions={enableConfigureOptions}
          style={{ flexGrow: 1, marginBottom: 0 }}
          {...multiTypeFieldSelectorProps}
        >
          <DelegateSelectorsV2Container
            {...inputProps}
            wrapperClassName={cx(css.wrapper, inputProps.wrapperClassName)}
            selectedItems={value}
            readonly={disabled}
            onTagInputChange={handleDelegateSelectorFixedValueChange}
          />
        </MultiTypeFieldSelector>
      </Container>
    </FormGroup>
  )
}

export default connect<MultiTypeDelegateSelectorProps>(MultiTypeDelegateSelector)
