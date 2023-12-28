/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Icon, Text, SelectOption } from '@harness/uicore'
import { PopoverInteractionKind, Position } from '@blueprintjs/core'
import cx from 'classnames'
import RepoBranchSelectV2 from '@common/components/RepoBranchSelectV2/RepoBranchSelectV2'
import { defaultGitContextBranchPlaceholder } from '@modules/10-common/utils/gitSyncUtils'
import css from './GitRemoteDetails.module.scss'

export interface GitRemoteDetailsProps {
  gitProviderType?: string
  connectorRef?: string
  repoName?: string
  filePath?: string
  fileUrl?: string
  branch?: string
  onBranchChange?: (selectedFilter: { branch: string }, defaultSelected?: boolean) => void
  branchCustomClassName?: string
  customClassName?: string

  flags?: {
    borderless?: boolean
    showRepo?: boolean
    showBranch?: boolean
    normalInputStyle?: boolean
    readOnly?: boolean
    fallbackDefaultBranch?: boolean
  }
}

const getTooltipContent = (filePath: string, fileUrl?: string) => {
  // fileUrl will available only once entity is saved in Git,
  // it will not be available while creating the entities
  if (fileUrl) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
        <Text className={css.tooltip}>{fileUrl}</Text>
      </a>
    )
  } else {
    return <Text className={css.tooltip}>{filePath}</Text>
  }
}

const GitRemoteDetails = ({
  gitProviderType,
  connectorRef,
  repoName,
  filePath,
  fileUrl,
  branch = '',
  onBranchChange,
  branchCustomClassName,
  customClassName,
  flags: { borderless = true, showRepo = true, showBranch = true, normalInputStyle = false, readOnly = false } = {}
}: GitRemoteDetailsProps): React.ReactElement => {
  return (
    <div className={cx(css.wrapper, { [css.normalInputStyle]: normalInputStyle })}>
      {showRepo && (
        <>
          <Icon
            name="repository"
            size={normalInputStyle ? undefined : 14}
            margin={{
              right: 'small'
            }}
            className={customClassName}
          />
          <Text
            tooltip={filePath && getTooltipContent(filePath, fileUrl)}
            tooltipProps={{
              isDark: true,
              interactionKind: PopoverInteractionKind.HOVER,
              position: Position.BOTTOM_LEFT
            }}
            lineClamp={1}
            alwaysShowTooltip
            className={cx(css.repoDetails, customClassName)}
          >
            {repoName}
          </Text>
          {showBranch && <span className={cx(css.separator, customClassName)}></span>}
        </>
      )}
      {showBranch && (
        <Icon
          name="git-new-branch"
          size={normalInputStyle ? undefined : 14}
          margin={{
            right: 'small'
          }}
          className={customClassName}
        />
      )}
      {showBranch ? (
        readOnly ? (
          <Text
            lineClamp={1}
            className={cx(css.repoDetails, branchCustomClassName)}
            data-tooltip-id={
              branch === defaultGitContextBranchPlaceholder ? 'defaultGitContextBranchPlaceholder' : undefined
            }
            data-testid="readonly-gitbranch"
          >
            {branch}
          </Text>
        ) : (
          <RepoBranchSelectV2
            name="remoteBranch"
            noLabel={true}
            gitProviderType={gitProviderType}
            connectorIdentifierRef={connectorRef}
            repoName={repoName}
            onChange={(selected: SelectOption, defaultSelected = false): void => {
              onBranchChange?.(
                {
                  branch: selected.value as string
                },
                defaultSelected
              )
            }}
            selectedValue={branch}
            branchSelectorClassName={cx(css.branchSelector, { [css.transparent]: borderless })}
            selectProps={{ borderless }}
            showIcons={false}
            showErrorInModal
          />
        )
      ) : null}
    </div>
  )
}

export default GitRemoteDetails
