/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { PopoverInteractionKind } from '@blueprintjs/core'
import { Icon, IconName } from '@harness/icons'
import { FormInput, Layout, Popover, SelectOption, Text } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import React, { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { defaultTo, isEmpty } from 'lodash-es'
import cx from 'classnames'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import type { EntityGitDetails } from 'services/template-ng'
import { useStrings } from 'framework/strings'
import { useGetListOfBranchesByRefConnectorV2 } from 'services/cd-ng'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { getBranchSelectOptions } from '../RepoBranchSelectV2/RepoBranchSelectV2'
import type { GitFilterScope } from '../GitFilters/GitFilters'
import css from './GitPopoverV2.module.scss'
import css2 from '../RepoBranchSelectV2/RepoBranchSelectV2.module.scss'

interface GitPopoverV2Props {
  storeMetadata: StoreMetadata
  gitDetails: EntityGitDetails
  onGitBranchChange: (selectedFilter: GitFilterScope) => void
  branchChangeDisabled?: boolean
  forceFetch?: boolean
  customIcon?: React.ReactNode
  btnClassName?: string
  setDefaultBranch?: React.Dispatch<React.SetStateAction<string | undefined>>
  selectedBranch?: string
}

const createSelectOption = (value?: string): SelectOption => {
  return {
    label: defaultTo(value, ''),
    value: defaultTo(value, '')
  }
}

interface ItemUIProps {
  label: string
  icon: IconName
  value: string | React.ReactNode
}

const ItemUI = ({ label, icon, value }: ItemUIProps): JSX.Element => {
  return (
    <Layout.Vertical spacing="large">
      <Text font={{ size: 'small' }} color={Color.GREY_400}>
        {label}
      </Text>
      <Layout.Horizontal spacing="small" style={{ alignItems: 'center' }}>
        <Icon name={icon} size={16} color={Color.GREY_700} />
        {typeof value === 'string' ? (
          <Text
            font={FontVariation.SMALL}
            style={{ wordWrap: 'break-word', maxWidth: '200px' }}
            lineClamp={1}
            color={Color.GREY_800}
          >
            {value}
          </Text>
        ) : (
          value
        )}
      </Layout.Horizontal>
    </Layout.Vertical>
  )
}

/**
 * Used to get the applicable value
 *
 * storeMetadata.repoName !== gitDetails.repoName
 * This can happen when parentEntity is in different repo (Repo A)
 * and trying to use a template in different repo (Repo B).
 */

type StoreMetadataKeys = keyof StoreMetadata
type EntityGitDetailsKeys = keyof EntityGitDetails

const getActualTemplateValue = (
  storeMetadata: StoreMetadata,
  gitDetails: EntityGitDetails,
  key: StoreMetadataKeys | EntityGitDetailsKeys
): StoreMetadata[StoreMetadataKeys] | EntityGitDetails[EntityGitDetailsKeys] => {
  const check =
    gitDetails.repoName !== undefined &&
    storeMetadata.repoName !== undefined &&
    storeMetadata.repoName !== gitDetails.repoName
  return check
    ? gitDetails[key as keyof EntityGitDetails]
    : defaultTo(storeMetadata[key as keyof StoreMetadata], gitDetails[key as keyof EntityGitDetails])
}

export const GitPopoverV2 = ({
  storeMetadata = {},
  gitDetails = {},
  branchChangeDisabled = false,
  forceFetch = false,
  onGitBranchChange,
  customIcon,
  btnClassName,
  setDefaultBranch,
  selectedBranch: selectedBranchInPopover
}: GitPopoverV2Props): JSX.Element => {
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { getString } = useStrings()

  const filePath = getActualTemplateValue(storeMetadata, gitDetails, 'filePath')
  const repoName = getActualTemplateValue(storeMetadata, gitDetails, 'repoName') as string
  const branch = getActualTemplateValue(storeMetadata, gitDetails, 'branch') as string
  const fileUrl = defaultTo(gitDetails.fileUrl, filePath)

  const {
    data: response,
    loading,
    refetch
  } = useGetListOfBranchesByRefConnectorV2({
    queryParams: {
      connectorRef: storeMetadata.connectorRef,
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      repoName,
      size: 100
    },
    lazy: true
  })

  useEffect(() => {
    if (!branchChangeDisabled || forceFetch) {
      refetch()
    }
  }, [forceFetch, branchChangeDisabled, refetch])

  useEffect(() => {
    //here, default branch is set which is getting consumed in template details for setting it in selected template gitdetails object
    if (response?.data?.defaultBranch?.name) {
      setDefaultBranch?.(response.data.defaultBranch.name)
    }
  }, [response?.data?.defaultBranch?.name])

  const branchOptions = useMemo(() => {
    if (response?.status === 'SUCCESS' && !isEmpty(response?.data)) {
      return getBranchSelectOptions(response?.data?.branches)
    }
    return []
  }, [response?.data, response?.status])

  const selectedBranch = createSelectOption(
    defaultTo(selectedBranchInPopover, defaultTo(branch, response?.data?.defaultBranch?.name))
  )
  const branchUI = (
    <FormInput.Select
      name="branch"
      disabled={loading}
      items={branchOptions}
      placeholder={loading ? getString('loading') : getString('common.git.selectBranchPlaceholder')}
      value={selectedBranch}
      onChange={(selected: SelectOption): void => {
        onGitBranchChange({
          branch: selected.value as string
        })
      }}
      selectProps={{
        usePortal: true,
        allowCreatingNewItems: true,
        popoverClassName: css2.gitBranchSelectorPopover
      }}
      className={css.branchSelector}
    />
  )

  if (storeMetadata.storeType !== StoreType.REMOTE) return <></>

  return (
    <div className={cx(css.customButton, btnClassName)}>
      <Popover interactionKind={PopoverInteractionKind.HOVER} autoFocus={false}>
        <Icon name="git-popover" size={15} />
        <Layout.Vertical padding={{ top: 'large', bottom: 'large', left: 'xlarge', right: 'xlarge' }}>
          {/* Heading */}
          <Text font={{ size: 'small', weight: 'bold' }} color={Color.BLACK}>
            {getString('common.gitDetailsTitle').toUpperCase()}
          </Text>

          {/* Repository */}
          {repoName && <ItemUI label={getString('repository')} icon="repository" value={repoName} />}

          {/* FilePath */}
          {fileUrl && <ItemUI label={getString('common.git.filePath')} icon="repository" value={fileUrl} />}

          {/* Branch */}
          {selectedBranch.value && (
            <ItemUI
              label={getString('gitBranch')}
              icon="git-new-branch"
              value={branchChangeDisabled ? selectedBranch.value : branchUI}
            />
          )}
        </Layout.Vertical>
      </Popover>
      {customIcon || <Icon name="main-chevron-down" size={8} />}
    </div>
  )
}
