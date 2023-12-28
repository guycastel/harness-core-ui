/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState, useEffect } from 'react'
import cx from 'classnames'
import { Button, Dialog, FormInput, Icon, Layout, SelectOption, SelectProps, useToggleOpen } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { useParams } from 'react-router-dom'
import type { GetDataError } from 'restful-react'
import { defaultTo, isEmpty } from 'lodash-es'
import { useStrings } from 'framework/strings'
import {
  Error,
  Failure,
  GitBranchDetailsDTO,
  ResponseGitBranchesResponseDTO,
  useGetListOfBranchesByRefConnectorV2
} from 'services/cd-ng'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { ErrorHandler, ResponseMessage } from '../ErrorHandler/ErrorHandler'
import { isHarnessCodeRepoEntity } from '../GitProviderSelect/GitProviderSelect.utils'
import css from './RepoBranchSelectV2.module.scss'

export interface RepoBranchSelectProps {
  name?: string
  label?: string
  noLabel?: boolean
  disabled?: boolean
  gitProviderType?: string
  connectorIdentifierRef?: string
  repoName?: string
  selectedValue?: string
  isExecutionHistoryPage?: boolean
  onChange?: (selected: SelectOption, defaultSelected?: boolean) => void // defaultSelected will be true component selected default itself
  setErrorResponse?: React.Dispatch<React.SetStateAction<ResponseMessage[]>>
  branchSelectorClassName?: string
  selectProps?: Omit<SelectProps, 'value' | 'onChange' | 'items'>
  showIcons?: boolean
  showErrorInModal?: boolean
  fallbackDefaultBranch?: boolean
}

const getDefaultBranchOption = (defaultBranch: string): SelectOption => {
  return {
    label: defaultTo(defaultBranch, ''),
    value: defaultTo(defaultBranch, '')
  }
}

export const getBranchSelectOptions = (data: GitBranchDetailsDTO[] = [], selectedBranch?: string): SelectOption[] => {
  const selectOptions = data.map((branch: GitBranchDetailsDTO) => {
    return {
      label: defaultTo(branch.name, ''),
      value: defaultTo(branch.name, '')
    }
  })

  // If dropdown has a selected value which is not in branchList response, pushining selectedBranch as an select option.
  // Use cases for this can be :
  // 1. User selected a branch using createNew
  // 2. URL changed to a branch beyond thresold limit of 30
  if (selectedBranch && -1 === selectOptions.findIndex(selectOption => selectOption.value === selectedBranch)) {
    selectOptions.unshift({
      label: selectedBranch,
      value: selectedBranch
    })
  }

  return selectOptions
}
const getDefaultSelectedOption = (defaultToBranch: string, selected?: string): SelectOption => {
  return { label: selected || defaultToBranch, value: selected || defaultToBranch }
}

const hasToRefetchBranches = (
  disabled: boolean,
  gitProviderType?: string,
  connectorIdentifierRef?: string,
  repoName?: string
): boolean => !disabled && Boolean((isHarnessCodeRepoEntity(gitProviderType) || connectorIdentifierRef) && repoName)

const triggerOnChange = (disabled: boolean, selectedValue?: string): boolean => !disabled && Boolean(!selectedValue)

const showRefetchButton = (
  disabled: boolean,
  error: GetDataError<Failure | Error> | null,
  gitProviderType?: string,
  connectorIdentifierRef?: string,
  repoName?: string
): boolean => {
  const responseMessages = (error?.data as Error)?.responseMessages
  return (
    !disabled &&
    Boolean(
      (isHarnessCodeRepoEntity(gitProviderType) || connectorIdentifierRef) &&
        repoName &&
        ((responseMessages?.length && responseMessages?.length > 0) || !!error)
    )
  )
}

const responseHasBranches = (response: ResponseGitBranchesResponseDTO | null): boolean =>
  response?.status === 'SUCCESS' && !isEmpty(response?.data)

const RepoBranchSelectV2: React.FC<RepoBranchSelectProps> = props => {
  const {
    gitProviderType,
    connectorIdentifierRef,
    repoName,
    selectedValue,
    name,
    label,
    noLabel = false,
    disabled = false,
    setErrorResponse,
    branchSelectorClassName,
    selectProps,
    showIcons = true,
    showErrorInModal = false,
    fallbackDefaultBranch = true
  } = props
  const { getString } = useStrings()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const [branchSelectOptions, setBranchSelectOptions] = useState<SelectOption[]>([])

  const { isOpen, open, close } = useToggleOpen()

  const {
    data: response,
    error,
    loading,
    refetch
  } = useGetListOfBranchesByRefConnectorV2({
    queryParams: {
      ...(!isHarnessCodeRepoEntity(gitProviderType) ? { connectorRef: connectorIdentifierRef } : {}),
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      repoName,
      size: 100
    },
    debounce: 500,
    lazy: true
  })

  const responseMessages = (error?.data as Error)?.responseMessages
  const defaultToBranch = fallbackDefaultBranch ? defaultTo(response?.data?.defaultBranch?.name, '') : ''

  useEffect(() => {
    setBranchSelectOptions([])
    if (hasToRefetchBranches(disabled, gitProviderType, connectorIdentifierRef, repoName)) {
      refetch()
    }
  }, [gitProviderType, connectorIdentifierRef, repoName, disabled])

  useEffect(() => {
    if (loading) {
      return
    }

    if (responseHasBranches(response)) {
      const branchOptions = getBranchSelectOptions(response?.data?.branches, selectedValue)

      setBranchSelectOptions(branchOptions)

      // If used in Formik, onChange will set branch after default selection to overcome form validation
      // If consumer is sending preselected, we do not want to change to default branch
      if (triggerOnChange(disabled, selectedValue)) {
        props.onChange?.(getDefaultBranchOption(defaultToBranch), true)
      }
    }

    if (responseMessages) {
      setErrorResponse?.(responseMessages)
      if (showErrorInModal) {
        open()
      }
    }
  }, [loading, open, response?.data, response?.status, responseMessages, setErrorResponse, showErrorInModal])

  const renderCustomSelectBranch = React.useCallback(
    (query: string, clickHandler?: React.MouseEventHandler<Element>): React.ReactElement => (
      <Button
        intent="primary"
        minimal
        text={`${getString('common.gitSync.selectBranch')} ${query}`}
        icon="chevron-right"
        className={css.createNewItemButton}
        onClick={clickHandler}
      />
    ),
    []
  )

  return (
    <Layout.Horizontal
      onClick={event => {
        event?.stopPropagation?.()
      }}
    >
      <FormInput.Select
        name={defaultTo(name, 'branch')}
        disabled={disabled || loading}
        items={branchSelectOptions}
        label={noLabel ? '' : defaultTo(label, getString('gitBranch'))}
        placeholder={loading ? getString('loading') : getString('common.git.selectBranchPlaceholder')}
        value={getDefaultSelectedOption(defaultToBranch, selectedValue)}
        onChange={selected => props.onChange?.(selected, false)}
        selectProps={{
          usePortal: true,
          allowCreatingNewItems: true,
          newItemRenderer: renderCustomSelectBranch,
          popoverClassName: css.gitBranchSelectorPopover,
          ...selectProps
        }}
        className={cx(branchSelectorClassName, css.branchSelector)}
      />

      {!showIcons ? null : loading && !disabled ? (
        <Layout.Horizontal
          spacing="small"
          flex={{ alignItems: 'flex-start' }}
          className={cx(css.loadingWrapper, { [css.noLabel]: noLabel })}
        >
          <Icon name="steps-spinner" size={18} color={Color.PRIMARY_7} />
        </Layout.Horizontal>
      ) : showRefetchButton(disabled, error, gitProviderType, connectorIdentifierRef, repoName) ? (
        <Layout.Horizontal
          spacing="small"
          flex={{ alignItems: 'flex-start' }}
          className={cx(css.refreshButtonWrapper, { [css.noLabel]: noLabel })}
        >
          <Icon
            name="refresh"
            size={16}
            color={Color.PRIMARY_7}
            background={Color.PRIMARY_1}
            padding="small"
            className={css.refreshIcon}
            onClick={() => {
              setErrorResponse?.([])
              setBranchSelectOptions([])
              refetch()
            }}
          />
        </Layout.Horizontal>
      ) : null}
      <Dialog
        isOpen={isOpen}
        enforceFocus={false}
        title={getString('common.gitSync.branchFetchFailed')}
        onClose={close}
      >
        {responseMessages ? <ErrorHandler responseMessages={responseMessages} /> : undefined}
      </Dialog>
    </Layout.Horizontal>
  )
}
export default RepoBranchSelectV2
