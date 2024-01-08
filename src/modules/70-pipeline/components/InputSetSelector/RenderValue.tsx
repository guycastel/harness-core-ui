/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { Dispatch, SetStateAction } from 'react'
import { clone, isEmpty, isNil } from 'lodash-es'
import cx from 'classnames'

import {
  Button,
  ButtonVariation,
  Layout,
  Text,
  MultiTypeInputType,
  ExpressionAndRuntimeType,
  getMultiTypeFromValue,
  PageSpinner
} from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { useStrings } from 'framework/strings'
import { useVariablesExpression } from '../PipelineStudio/PiplineHooks/useVariablesExpression'
import { SelectedInputSetList } from './SelectedInputSetList'
import { getInputSetExpressionValue, InputSetValue } from './utils'
import css from './InputSetSelector.module.scss'

export function RenderValue({
  value,
  onChange,
  setSelectedInputSets,
  setOpenInputSetsList,
  openInputSetsList,
  selectedValueClass,
  showNewInputSet,
  onNewInputSetClick,
  invalidInputSetReferences,
  loadingMergeInputSets
}: {
  value: InputSetValue[]
  onChange?: (value?: InputSetValue[]) => void
  setSelectedInputSets: Dispatch<SetStateAction<InputSetValue[]>>
  setOpenInputSetsList: Dispatch<SetStateAction<boolean>>
  openInputSetsList?: boolean
  selectedValueClass?: string
  showNewInputSet?: boolean
  onNewInputSetClick?: () => void
  invalidInputSetReferences?: string[]
  loadingMergeInputSets?: boolean
}): JSX.Element {
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const [expressionVal, setExpressionVal] = React.useState<string>('')
  const [multiType, setMultiType] = React.useState<MultiTypeInputType>(getMultiTypeFromValue(value))

  const toggleMultiType = (): void => {
    setMultiType(MultiTypeInputType.FIXED)
    setExpressionVal('')
  }

  const addExpressionValue = (): void => {
    const clonedInputSets = clone(value)
    const inputSetExpressionValue = getInputSetExpressionValue(expressionVal)
    clonedInputSets.push(inputSetExpressionValue)
    setSelectedInputSets(clonedInputSets)
    onChange?.(clonedInputSets)
    toggleMultiType()
  }

  return (
    <>
      {showNewInputSet && (
        <Layout.Horizontal spacing="medium">
          <Button
            icon="small-plus"
            className={css.addInputSetButton}
            onClick={onNewInputSetClick}
            color={Color.PRIMARY_7}
            minimal
            variation={ButtonVariation.LINK}
          >
            {getString('pipeline.inputSets.createNewInputSet')}
          </Button>
          <Text font={{ variation: FontVariation.FORM_LABEL }} color={Color.GREY_200} style={{ alignSelf: 'center' }}>
            |
          </Text>
          <Button
            icon="small-plus"
            className={css.addInputSetButton}
            onClick={() => setOpenInputSetsList(true)}
            color={Color.PRIMARY_7}
            minimal
            variation={ButtonVariation.LINK}
          >
            {getString('pipeline.inputSets.selectPlaceholder')}
          </Button>
        </Layout.Horizontal>
      )}
      {!showNewInputSet && (
        <div className={css.inputSetSelectorWrapper}>
          <ExpressionAndRuntimeType
            name={''}
            value={expressionVal}
            expressions={expressions}
            allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION]}
            onChange={(val, _valueType, typeVal) => {
              if (typeVal === MultiTypeInputType.EXPRESSION && !isNil(val)) setExpressionVal(val as string)
              else if (typeVal === MultiTypeInputType.FIXED) setExpressionVal('')
            }}
            disabled={false}
            onTypeChange={setMultiType}
            multitypeInputValue={multiType}
            fixedTypeComponent={() => (
              <Button
                minimal
                className={css.inputSetSelectorBtn}
                style={{ width: '300px' }}
                withoutCurrentColor={true}
                rightIcon="chevron-down"
                iconProps={{ size: 16 }}
                onClick={() => setOpenInputSetsList(true)}
              >
                <span className={css.placeholder}>{getString('pipeline.inputSets.selectPlaceholder')}</span>
              </Button>
            )}
          />
          {multiType === MultiTypeInputType.EXPRESSION && (
            <>
              <Button
                disabled={isEmpty(expressionVal)}
                onClick={addExpressionValue}
                variation={ButtonVariation.SECONDARY}
                className={css.addExpressionBtn}
                text={getString('add')}
              />
              <Button
                text={getString('cancel')}
                onClick={toggleMultiType}
                variation={ButtonVariation.LINK}
                className={css.removeExpressionBtn}
              />
            </>
          )}
        </div>
      )}
      {(isEmpty(invalidInputSetReferences) || isNil(invalidInputSetReferences)) && (
        <div className={cx(css.renderSelectedValue, selectedValueClass)}>
          <SelectedInputSetList
            value={value.map(item => ({
              data: item,
              label: item.label,
              type: item.type as unknown as string,
              value: item.value
            }))}
            onChange={selectedItems => {
              const selectedInputSets = selectedItems?.map(item => item.data)
              setSelectedInputSets(selectedInputSets)
              onChange?.(selectedInputSets)
            }}
            isDisabled={item =>
              !(item.data?.idType === MultiTypeInputType.EXPRESSION && item.data?.label?.split('.').length === 5)
            }
          />
        </div>
      )}
      {value && value.length > 1 && (
        <Layout.Horizontal
          spacing="small"
          flex={{ alignItems: 'center', justifyContent: 'flex-start' }}
          margin={{ bottom: 'medium' }}
        >
          <Text>{getString('pipeline.inputSets.lastApplied')}</Text>
          <Text font={{ weight: 'bold' }} color={Color.GREY_500}>
            {value.slice(-1)[0].value}
          </Text>
        </Layout.Horizontal>
      )}
      {loadingMergeInputSets && !openInputSetsList && (
        <div className={css.selectedInputSetSpinnerContainer}>
          <PageSpinner className={css.selectedInputSetSpinner} />
        </div>
      )}
    </>
  )
}
