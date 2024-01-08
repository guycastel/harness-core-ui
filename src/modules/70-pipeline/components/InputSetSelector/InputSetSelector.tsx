/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useMemo, useState } from 'react'
import {
  Layout,
  Popover,
  Text,
  TextInput,
  ButtonVariation,
  PageSpinner,
  Container,
  Button,
  Pagination,
  MultiTypeInputType
} from '@harness/uicore'
import { Color } from '@harness/design-system'
import { clone, defaultTo, isEmpty, includes, isNil, get } from 'lodash-es'
import cx from 'classnames'
import { Classes, PopoverPosition } from '@blueprintjs/core'
import { useParams } from 'react-router-dom'
import {
  EntityGitDetails,
  InputSetErrorWrapper,
  InputSetSummaryResponse,
  getInputSetForPipelinePromise,
  useGetInputSetsListForPipeline
} from 'services/pipeline-ng'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { useToaster } from '@common/exports'
import type { GitQueryParams } from '@common/interfaces/RouteInterfaces'
import { useQueryParams } from '@common/hooks'
import { useStrings } from 'framework/strings'
import { isValueExpression } from '@common/utils/utils'
import { StoreMetadata } from '@common/constants/GitSyncTypes'
import { usePipelineVariables } from '../PipelineVariablesContext/PipelineVariablesContext'
import {
  ChildPipelineStageProps,
  INPUT_SET_SELECTOR_PAGE_SIZE,
  getInputSetExpressionValue,
  InputSetValue,
  InputSetErrorMetaData,
  removeInvalidInputSet
} from './utils'
import { MultipleInputSetList } from './MultipleInputSetList'
import { RenderValue } from './RenderValue'
import { SelectedInputSetList } from './SelectedInputSetList'
import css from './InputSetSelector.module.scss'

export interface InputSetSelectorProps {
  value?: InputSetValue[]
  pipelineIdentifier: string
  onChange?: (value?: InputSetValue[]) => void
  width?: number
  selectedValueClass?: string
  selectedRepo?: string
  selectedBranch?: string
  isOverlayInputSet?: boolean
  showNewInputSet?: boolean
  onNewInputSetClick?: () => void
  pipelineGitDetails?: EntityGitDetails
  hideInputSetButton?: boolean
  invalidInputSetReferences?: string[]
  loadingMergeInputSets?: boolean
  isRetryPipelineForm?: boolean
  onReconcile?: (identifier: string) => void
  reRunInputSetYaml?: string
  childPipelineProps?: ChildPipelineStageProps
  closeInputSetModalOnApply?: boolean
  isSimplifiedYAML?: boolean
  isY1?: boolean
}

export function InputSetSelector({
  value,
  onChange,
  pipelineIdentifier,
  selectedValueClass,
  selectedRepo,
  selectedBranch,
  isOverlayInputSet,
  showNewInputSet,
  onNewInputSetClick,
  pipelineGitDetails,
  hideInputSetButton,
  invalidInputSetReferences,
  loadingMergeInputSets,
  isRetryPipelineForm,
  onReconcile,
  reRunInputSetYaml,
  childPipelineProps,
  closeInputSetModalOnApply,
  isSimplifiedYAML,
  isY1
}: InputSetSelectorProps): React.ReactElement {
  const valueRef = React.useRef<InputSetValue[]>(value || [])
  valueRef.current = value || []
  const [searchTerm, setSearchTerm] = React.useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedInputSets, setSelectedInputSets] = React.useState<InputSetValue[]>(value || [])
  const [openInputSetsList, setOpenInputSetsList] = useState(false)
  const { getString } = useStrings()
  const { showError, showSuccess } = useToaster()
  const { getRBACErrorMessage } = useRBACError()

  const { projectIdentifier, orgIdentifier, accountId } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
  }>()
  const { repoIdentifier, repoName, branch } = useQueryParams<GitQueryParams>()
  const [inputSetErrorMap, setInputSetErrorMap] = useState<Map<string, InputSetErrorMetaData>>(
    new Map<string, InputSetErrorMetaData>()
  )

  useEffect(() => setSelectedInputSets(defaultTo(value, [])), [value])
  const { setSelectedInputSetsContext } = usePipelineVariables()

  const getGitQueryParams = React.useCallback(() => {
    if (!isEmpty(selectedRepo) && !isEmpty(selectedBranch)) {
      return {
        repoIdentifier: selectedRepo,
        branch: selectedBranch
      }
    }
    if (!isEmpty(repoIdentifier) && !isEmpty(branch)) {
      return {
        repoIdentifier,
        branch,
        getDefaultFromOtherRepo: true
      }
    }
    return {}
  }, [repoIdentifier, branch, selectedRepo, selectedBranch])

  const {
    data: inputSetResponse,
    refetch,
    error,
    loading: loadingInpSets
  } = useGetInputSetsListForPipeline({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier: childPipelineProps?.childOrgIdentifier ?? orgIdentifier,
      projectIdentifier: childPipelineProps?.childProjectIdentifier ?? projectIdentifier,
      pipelineIdentifier,
      inputSetType: isOverlayInputSet ? 'INPUT_SET' : undefined,
      pageSize: INPUT_SET_SELECTOR_PAGE_SIZE,
      pageIndex,
      searchTerm: searchTerm.trim(),
      ...getGitQueryParams()
    },
    debounce: 300,
    lazy: true
  })

  useEffect(() => {
    if (
      inputSetResponse?.data?.content &&
      inputSetResponse?.data?.content?.length > 0 &&
      childPipelineProps?.inputSetReferences &&
      childPipelineProps.inputSetReferences?.length > 0 &&
      isEmpty(value)
    ) {
      // Check when switching from Yaml to Visual view, to show the selected input sets in chained pipeline inputs tab
      const savedInputSets = childPipelineProps.inputSetReferences?.reduce((accum, inputSetRef) => {
        const currentInputSet = inputSetResponse?.data?.content?.find(
          currInputSet => currInputSet.identifier === inputSetRef
        )
        if (!currentInputSet && isValueExpression(inputSetRef)) {
          const inputSetExpressionValue = getInputSetExpressionValue(inputSetRef)
          accum.push(inputSetExpressionValue)
        } else if (currentInputSet)
          accum.push({
            ...currentInputSet,
            label: defaultTo(currentInputSet?.name, ''),
            value: defaultTo(currentInputSet?.identifier, ''),
            type: currentInputSet?.inputSetType,
            gitDetails: defaultTo(currentInputSet?.gitDetails, {}),
            inputSetErrorDetails: currentInputSet?.inputSetErrorDetails,
            overlaySetErrorDetails: currentInputSet?.overlaySetErrorDetails
          })
        return accum
      }, [] as InputSetValue[])
      onChange?.(savedInputSets as InputSetValue[])
    }
  }, [inputSetResponse?.data?.content, childPipelineProps?.inputSetReferences])

  useEffect(() => {
    refetch()
  }, [repoIdentifier, branch, selectedRepo, selectedBranch, refetch, pageIndex, searchTerm])

  useEffect(() => {
    if ((isEmpty(invalidInputSetReferences) || isNil(invalidInputSetReferences)) && openInputSetsList) {
      setOpenInputSetsList(false)
      showSuccess(getString('pipeline.inputSets.inputSetApplied'))
    } else if (invalidInputSetReferences && invalidInputSetReferences.length > 0 && openInputSetsList) {
      showError(getString('pipeline.inputSetErrorStrip.reconcileErrorInfo'))
    }
  }, [invalidInputSetReferences])

  const anyInputSetInLoadingState = useMemo(
    () => [...inputSetErrorMap.values()].some(inputSetErrorMetaData => inputSetErrorMetaData.isLoading),
    [inputSetErrorMap]
  )

  const validateInputSet = async (inputSetId: string, inputSetRepoName?: string): Promise<void> => {
    let inputSetContainsError = false
    let inputSetBranch = ''
    try {
      const response = await getInputSetForPipelinePromise({
        inputSetIdentifier: inputSetId,
        queryParams: {
          accountIdentifier: accountId,
          orgIdentifier: childPipelineProps?.childOrgIdentifier ?? orgIdentifier,
          projectIdentifier: childPipelineProps?.childProjectIdentifier ?? projectIdentifier,
          pipelineIdentifier,
          repoIdentifier: inputSetRepoName ?? repoName,
          ...(inputSetRepoName === repoName && { branch: selectedBranch ?? branch })
        },
        requestOptions: { headers: { 'Load-From-Cache': 'true' } }
      })
      if (response?.status === 'ERROR') {
        inputSetContainsError = true
        inputSetBranch = get(response, 'metadata.branch', '')
      }
    } catch (err) {
      inputSetContainsError = true
    } finally {
      setSelectedInputSets((prevSelectedInputSets: InputSetValue[]) => {
        if (!inputSetContainsError) return prevSelectedInputSets
        return removeInvalidInputSet(prevSelectedInputSets, inputSetId)
      })
      setSelectedInputSetsContext?.((prevSelectedInputSets?: InputSetValue[]) => {
        if (prevSelectedInputSets) {
          if (!inputSetContainsError) return prevSelectedInputSets
          return removeInvalidInputSet(prevSelectedInputSets, inputSetId)
        }
      })
      setInputSetErrorMap(
        map =>
          new Map(
            map.set(inputSetId, {
              isLoading: false,
              containsError: inputSetContainsError,
              branch: inputSetBranch
            })
          )
      )
    }
  }

  const onCheckBoxHandler = (
    checked: boolean,
    label: string,
    val: string,
    type: InputSetSummaryResponse['inputSetType'],
    inputSetGitDetails: EntityGitDetails | null,
    inputSetErrorDetails?: InputSetErrorWrapper,
    overlaySetErrorDetails?: { [key: string]: string },
    storeType?: StoreMetadata['storeType']
  ): void => {
    const selected = clone(selectedInputSets)
    const removedItem = selected.filter(set => set.value === val)[0]
    if (checked && !removedItem) {
      selected.push({
        label,
        value: val,
        type,
        gitDetails: defaultTo(inputSetGitDetails, {}),
        inputSetErrorDetails,
        overlaySetErrorDetails
      })
      setSelectedInputSets(selected)
      setSelectedInputSetsContext?.(selected)

      if (storeType === 'REMOTE') {
        setInputSetErrorMap(
          map =>
            new Map(
              map.set(val, {
                isLoading: true,
                containsError: false
              })
            )
        )
        validateInputSet(val, inputSetGitDetails?.repoName)
      }
    } else if (removedItem) {
      selected.splice(selected.indexOf(removedItem), 1)
      setSelectedInputSets(selected)
      setSelectedInputSetsContext?.(selected)
    }
  }

  if (error) {
    showError(getRBACErrorMessage(error), undefined, 'pipeline.get.inputsetlist')
  }

  const inputSets = inputSetResponse?.data?.content

  const multipleInputSetList =
    inputSets &&
    inputSets.map((inputSet, index) => {
      let isInputSetSelected = false
      for (const selectedSet of selectedInputSets) {
        if (selectedSet.value === inputSet.identifier) {
          isInputSetSelected = true
        }
        if (isInputSetSelected) break
      }
      return (
        <MultipleInputSetList
          key={`${index}-${inputSet.identifier as string}`}
          inputSet={inputSet}
          onCheckBoxHandler={onCheckBoxHandler}
          checked={isInputSetSelected}
          pipelineGitDetails={pipelineGitDetails}
          refetch={refetch}
          hideInputSetButton={hideInputSetButton}
          showReconcile={
            invalidInputSetReferences &&
            invalidInputSetReferences.length > 0 &&
            includes(invalidInputSetReferences, inputSet.identifier)
              ? true
              : false
          }
          onReconcile={onReconcile}
          reRunInputSetYaml={reRunInputSetYaml}
          isInputSetLoading={!!inputSetErrorMap.get(inputSet.identifier as string)?.isLoading}
          showInputSetError={!!inputSetErrorMap.get(inputSet.identifier as string)?.containsError}
          inputSetBranch={inputSetErrorMap.get(inputSet.identifier as string)?.branch}
        />
      )
    })

  return (
    <Popover
      position={PopoverPosition.TOP}
      usePortal
      isOpen={openInputSetsList}
      minimal={true}
      className={css.isPopoverParent}
      onOpening={() => {
        setOpenInputSetsList(true)
      }}
      onInteraction={interaction => {
        if (!interaction) {
          setOpenInputSetsList(false)
        }
      }}
      onClosing={() => {
        setOpenInputSetsList(false)
        setSelectedInputSets(valueRef.current)
      }}
    >
      <RenderValue
        value={defaultTo(value, [])}
        onChange={onChange}
        setSelectedInputSets={setSelectedInputSets}
        setOpenInputSetsList={setOpenInputSetsList}
        openInputSetsList={openInputSetsList}
        selectedValueClass={selectedValueClass}
        showNewInputSet={showNewInputSet}
        onNewInputSetClick={onNewInputSetClick}
        invalidInputSetReferences={invalidInputSetReferences}
        loadingMergeInputSets={!isOverlayInputSet && loadingMergeInputSets}
      />
      {openInputSetsList ? (
        <Layout.Vertical spacing="small" className={css.popoverContainer}>
          <div className={!inputSets ? css.loadingSearchContainer : css.searchContainer}>
            <TextInput
              placeholder={getString('search')}
              rightElement="chevron-down"
              className={css.search}
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchTerm(e.target.value)
                setPageIndex(0)
              }}
            />
          </div>
          <Container className={css.overlayIsHelperTextContainer} border={{ bottom: true }}>
            <Text className={css.overlayIsHelperText}>{getString('pipeline.inputSets.overlayISHelperText')}</Text>
            <div className={cx(css.renderSelectedValue, css.renderPopoverSelectedValue, selectedValueClass)}>
              <SelectedInputSetList
                value={selectedInputSets.map(item => ({
                  data: item,
                  label: item.label,
                  type: item.type as unknown as string,
                  value: item.value
                }))}
                onChange={selectedItems => {
                  setSelectedInputSets(selectedItems?.map(item => item.data) ?? [])
                }}
                isDisabled={item =>
                  !(item.data?.idType === MultiTypeInputType.EXPRESSION && item.data?.label?.split('.').length === 5)
                }
              />
            </div>
          </Container>
          {!inputSets ? (
            <PageSpinner className={css.spinner} />
          ) : (
            <Layout.Vertical padding={{ bottom: 'medium' }}>
              {(loadingInpSets || (loadingMergeInputSets && !isRetryPipelineForm)) && <PageSpinner />}
              {inputSets && inputSets.length > 0 ? (
                <>
                  <ul className={cx(Classes.MENU, css.list, { [css.multiple]: inputSets.length > 0 })}>
                    {multipleInputSetList}
                  </ul>
                  <Layout.Vertical padding={{ right: 'medium', left: 'medium' }}>
                    <Pagination
                      itemCount={inputSetResponse?.data?.totalItems || 0}
                      pageSize={inputSetResponse?.data?.pageSize || INPUT_SET_SELECTOR_PAGE_SIZE}
                      pageCount={inputSetResponse?.data?.totalPages || 0}
                      pageIndex={inputSetResponse?.data?.pageIndex || 0}
                      gotoPage={setPageIndex}
                      hidePageNumbers
                    />
                  </Layout.Vertical>
                  <Button
                    margin="small"
                    text={
                      selectedInputSets?.length > 1
                        ? getString('pipeline.inputSets.applyInputSets')
                        : getString('pipeline.inputSets.applyInputSet')
                    }
                    variation={ButtonVariation.PRIMARY}
                    disabled={!selectedInputSets?.length || anyInputSetInLoadingState}
                    onClick={() => {
                      onChange?.(selectedInputSets)
                      if (reRunInputSetYaml || closeInputSetModalOnApply || isSimplifiedYAML || isY1) {
                        setOpenInputSetsList(false)
                      }
                    }}
                  />
                </>
              ) : (
                <Layout.Horizontal
                  spacing="small"
                  background={Color.GREY_200}
                  flex={{ align: 'center-center' }}
                  padding="small"
                  margin="small"
                >
                  <Text>{getString('inputSets.noRecord')}</Text>
                </Layout.Horizontal>
              )}
            </Layout.Vertical>
          )}
        </Layout.Vertical>
      ) : null}
    </Popover>
  )
}
