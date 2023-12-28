/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState, useEffect, useMemo } from 'react'
import type { FormikContextType } from 'formik'
import { defaultTo, isEmpty } from 'lodash-es'
import { FormInput, Icon, Layout, SelectOption } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { useParams } from 'react-router-dom'
import { useStrings } from 'framework/strings'
import { Error, GitRepositoryResponseDTO, useGetListOfReposByRefConnector, validateRepoPromise } from 'services/cd-ng'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import type { ResponseMessage } from '../ErrorHandler/ErrorHandler'
import { isHarnessCodeRepoEntity } from '../GitProviderSelect/GitProviderSelect.utils'
import css from '../RepoBranchSelectV2/RepoBranchSelectV2.module.scss'

export interface NewRepoSelectOption extends SelectOption {
  isNew?: boolean
}

export interface RepositorySelectProps<T> {
  formikProps?: FormikContextType<T>
  gitProviderType?: string
  connectorRef?: string
  selectedValue?: string
  onChange?: (selected: SelectOption, options?: SelectOption[]) => void
  formik?: any
  disabled?: boolean
  setErrorResponse?: React.Dispatch<React.SetStateAction<ResponseMessage[]>>
  customClassName?: string
}

export const getRepoSelectOptions = (data: GitRepositoryResponseDTO[] = []): SelectOption[] => {
  return data.map((repo: GitRepositoryResponseDTO) => {
    return {
      label: defaultTo(repo.name, ''),
      value: defaultTo(repo.name, '')
    }
  })
}

const RepositorySelect: React.FC<RepositorySelectProps<any>> = props => {
  const { gitProviderType, connectorRef, selectedValue, formikProps, disabled, setErrorResponse, customClassName } =
    props
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const [repoSelectOptions, setRepoSelectOptions] = useState<SelectOption[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const { getString } = useStrings()
  const commonQueryParams = useMemo(
    () => ({
      ...(!isHarnessCodeRepoEntity(gitProviderType) ? { connectorRef } : {}),
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    }),
    [accountId, gitProviderType, connectorRef, orgIdentifier, projectIdentifier]
  )

  const {
    data: response,
    error,
    loading,
    refetch
  } = useGetListOfReposByRefConnector({
    queryParams: {
      ...commonQueryParams,
      page: 0,
      size: 100,
      applyGitXRepoAllowListFilter: true
    },
    lazy: true
  })

  const responseMessages = (error?.data as Error)?.responseMessages

  useEffect(() => {
    if (!disabled) {
      setRepoSelectOptions([])
      if (connectorRef || isHarnessCodeRepoEntity(gitProviderType)) {
        refetch()
      }
    }
  }, [gitProviderType, connectorRef, disabled, refetch])

  useEffect(() => {
    if (loading || disabled) {
      return
    }

    if (response?.status === 'SUCCESS') {
      if (!isEmpty(response?.data)) {
        const selectOptions = getRepoSelectOptions(response?.data)
        setRepoSelectOptions(selectOptions)
        if (selectOptions.length === 1 && isEmpty(formikProps?.values.repo)) {
          formikProps?.setFieldValue('repo', selectOptions[0].value)
          props.onChange?.(selectOptions[0], repoSelectOptions)
        }
      }
    }

    if (responseMessages) {
      setErrorResponse?.(responseMessages)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  const onAddNewRepo = async (repoName: string): Promise<void> => {
    try {
      setIsValidating(true)
      formikProps?.setFieldValue('repo', '')

      const validateRepoResponse = await validateRepoPromise({
        queryParams: {
          ...commonQueryParams,
          repoName
        }
      })

      if (validateRepoResponse.data?.isValid) {
        formikProps?.setFieldValue('repo', repoName)
        props.onChange?.({ label: repoName, value: repoName }, repoSelectOptions)
        return
      }
      if (
        Array.isArray((validateRepoResponse as unknown as { responseMessages: ResponseMessage[] })?.responseMessages)
      ) {
        setErrorResponse?.(
          (validateRepoResponse as unknown as { responseMessages: ResponseMessage[] }).responseMessages
        )
      }
    } catch (_) {
      // ignore
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <Layout.Horizontal>
      <FormInput.Select
        name="repo"
        label={getString('repository')}
        className={customClassName}
        placeholder={
          loading || isValidating ? getString('loading') : getString('common.git.selectRepositoryPlaceholder')
        }
        disabled={loading || isValidating || disabled}
        items={repoSelectOptions}
        value={{ label: defaultTo(selectedValue, ''), value: defaultTo(selectedValue, '') }}
        onChange={(selected: SelectOption, event: React.SyntheticEvent<HTMLElement, Event> | undefined) => {
          event?.stopPropagation()
          setErrorResponse?.([])

          if ((selected as NewRepoSelectOption).isNew && selected.value) {
            onAddNewRepo(selected.value as string)
            return
          }

          props.onChange?.(selected, repoSelectOptions)
        }}
        selectProps={{
          usePortal: true,
          popoverClassName: css.gitBranchSelectorPopover,
          allowCreatingNewItems: true,
          createNewItemFromQuery: query => ({
            label: query,
            value: query,
            isNew: true
          })
        }}
      />
      {loading || isValidating ? (
        <Layout.Horizontal spacing="small" flex={{ alignItems: 'flex-start' }} className={css.loadingWrapper}>
          <Icon name="steps-spinner" size={18} color={Color.PRIMARY_7} />
        </Layout.Horizontal>
      ) : responseMessages?.length || !!error ? (
        <Layout.Horizontal spacing="small" flex={{ alignItems: 'flex-start' }} className={css.refreshButtonWrapper}>
          <Icon
            name="refresh"
            size={16}
            color={Color.PRIMARY_7}
            background={Color.PRIMARY_1}
            padding="small"
            className={css.refreshIcon}
            onClick={() => {
              setErrorResponse?.([])
              setRepoSelectOptions([])
              ;(connectorRef || isHarnessCodeRepoEntity(gitProviderType)) && refetch()
            }}
          />
        </Layout.Horizontal>
      ) : null}
    </Layout.Horizontal>
  )
}
export default RepositorySelect
