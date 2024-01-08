/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Layout, Text, TextInput, Container, Icon } from '@harness/uicore'
import { Color } from '@harness/design-system'
import cx from 'classnames'
import { useParams } from 'react-router-dom'
import { debounce, defaultTo } from 'lodash-es'
import { Spinner } from '@blueprintjs/core'
import { InputSetSummaryResponse, getInputSetsListForPipelinePromise } from 'services/pipeline-ng'
import { useToaster } from '@common/exports'
import { useStrings } from 'framework/strings'
import { useInfiniteScroll } from '@modules/10-common/hooks/useInfiniteScroll'
import { INPUT_SET_SELECTOR_PAGE_SIZE, isInputSetItemSelected } from './utils'
import { InputSetType } from './types'
import { SelectedInputSetListValue } from '../InputSetSelector/SelectedInputSetList'
import css from './InputSetSelectorY1.module.scss'

export interface InputSetSelectorProps {
  pipelineIdentifier: string
  selectedInputSetItems: SelectedInputSetListValue<InputSetSummaryResponse>[]
  onAdd?: (inputSetItem: SelectedInputSetListValue<InputSetSummaryResponse>) => void
  onListChange?: (inputSetItems: SelectedInputSetListValue<InputSetSummaryResponse>[]) => void
  onListLoadingChange?: (loading: boolean) => void
  className?: string
  listHolderClassName?: string
}

export function InputSetSelectorY1(props: InputSetSelectorProps): React.ReactElement {
  const {
    selectedInputSetItems,
    onAdd,
    pipelineIdentifier,
    className,
    listHolderClassName,
    onListChange,
    onListLoadingChange
  } = props
  const valueRef = React.useRef<SelectedInputSetListValue<InputSetSummaryResponse>[]>(selectedInputSetItems || [])
  valueRef.current = selectedInputSetItems || []
  const [searchTerm, setSearchTerm] = React.useState('')
  const { getString } = useStrings()
  const { showError } = useToaster()

  const loadMoreRef = useRef(null)

  const { projectIdentifier, orgIdentifier, accountId } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
  }>()

  const queryParams = useMemo(
    () => ({
      accountIdentifier: accountId,
      orgIdentifier: orgIdentifier,
      projectIdentifier: projectIdentifier,
      pipelineIdentifier,
      inputSetType: 'INPUT_SET' as InputSetType,
      pageSize: INPUT_SET_SELECTOR_PAGE_SIZE,
      searchTerm: searchTerm.trim()
      //...getGitQueryParams() // TODO
    }),
    [accountId, orgIdentifier, pipelineIdentifier, projectIdentifier, searchTerm]
  )

  const getItems = useCallback(
    options => {
      return getInputSetsListForPipelinePromise({
        queryParams: { ...queryParams, pageIndex: options.offset }
      })
    },
    [queryParams]
  )

  const {
    items: inputSets,
    fetching: loadingInputSets,
    error: errorInputSets,
    attachRefToLastElement
  } = useInfiniteScroll<InputSetSummaryResponse>({
    getItems: getItems,
    limit: INPUT_SET_SELECTOR_PAGE_SIZE,
    loadMoreRef,
    searchTerm
  })

  useEffect(() => {
    if (inputSets) {
      onListChange?.(
        inputSets.map(item => ({
          value: item.identifier ?? '',
          label: item.name ?? '',
          type: item.inputSetType as InputSetType,
          data: item
        }))
      )
    }
  }, [inputSets])

  useEffect(() => {
    onListLoadingChange?.(loadingInputSets)
  }, [loadingInputSets])

  const debounceSetSearchTerm = debounce((term: string) => {
    setSearchTerm(term)
  }, 300)

  if (errorInputSets) {
    showError(errorInputSets, undefined, 'pipeline.get.inputsetlist')
  }

  return (
    <Layout.Vertical spacing="small" className={cx(css.inputSetSelector, className)}>
      <Container border={{ bottom: true }}>
        <Text color={Color.BLACK} margin={{ bottom: 'large' }}>
          {getString('pipeline.inputSets.selectInputSet')}
        </Text>
        <TextInput
          leftIcon={'thinner-search'}
          leftIconProps={{ name: 'thinner-search', size: 14, color: Color.GREY_700 }}
          placeholder={getString('pipeline.inputSets.searchOrEnterExpression')}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            debounceSetSearchTerm(e.target.value)
          }}
        />
        <div className={listHolderClassName}>
          {inputSets?.map((inputSet, index) => {
            if (isInputSetItemSelected(selectedInputSetItems, inputSet.identifier ?? '')) {
              return null
            }
            return (
              <Layout.Horizontal
                ref={attachRefToLastElement(index) ? loadMoreRef : undefined}
                key={inputSet.identifier}
                className={css.inputSetItem}
                onClick={() => {
                  onAdd?.({
                    value: defaultTo(inputSet.identifier, ''),
                    label: defaultTo(inputSet.name, ''),
                    type: defaultTo(inputSet.inputSetType, 'INPUT_SET'),
                    data: inputSet
                  })
                }}
                flex={{ alignItems: 'center' }}
              >
                <Layout.Vertical spacing={'xsmall'}>
                  <Text color={Color.BLACK} icon="yaml-builder-input-sets">
                    {inputSet.name}
                  </Text>
                  <Text color={Color.GREY_600} font={{ size: 'small' }}>
                    ID: {inputSet.identifier}
                  </Text>
                </Layout.Vertical>
                <Icon name="plus" color={Color.PRIMARY_7} />
              </Layout.Horizontal>
            )
          })}
          {loadingInputSets && (
            <Container height={30}>
              <Spinner size={Spinner.SIZE_SMALL} />
            </Container>
          )}
        </div>
      </Container>
    </Layout.Vertical>
  )
}
