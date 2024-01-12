/* eslint-disable strings-restrict-modules */
/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { defaultTo } from 'lodash-es'
import { Color } from '@harness/design-system'
import { Container, Icon, Layout, Text } from '@harness/uicore'
import cx from 'classnames'
import type { ReferenceSelectProps } from '@common/components/ReferenceSelect/ReferenceSelect'
import {
  EnvironmentResponse,
  EnvironmentResponseDTO,
  Failure,
  getEnvironmentAccessListPromise,
  getEnvironmentListPromise,
  GetEnvironmentListQueryParams,
  getEnvironmentListV2Promise,
  getInfrastructureListPromise,
  GetInfrastructureListQueryParams,
  InfrastructureResponse,
  PageEnvironmentResponse,
  ResponseListEnvironmentResponse,
  ResponsePageEnvironmentResponse
} from 'services/cd-ng'
import { Scope } from '@common/interfaces/SecretsInterface'
import environmentEmptyStateSvg from '@pipeline/icons/emptyServiceDetail.svg'
import GitRemoteDetails from '@modules/10-common/components/GitRemoteDetails/GitRemoteDetails'
import { StoreType } from '@modules/10-common/constants/GitSyncTypes'
import { getConnectorIdentifierWithScope } from '@modules/27-platform/connectors/utils/utils'
import { getScopeFromDTO } from '@modules/10-common/components/EntityReference/EntityReference.types'
import { defaultGitContextBranchPlaceholder } from '@modules/10-common/utils/gitSyncUtils'
import { isEntitySame } from '@modules/10-common/components/CollapsableList/CollapsableList'
import css from './FormMultiTypeEnvironmentField.module.scss'

export function getReferenceFieldProps({
  defaultScope,
  projectIdentifier,
  orgIdentifier,
  name,
  width,
  selected,
  placeholder,
  isMultiSelect,
  accountIdentifier,
  setPagedEnvironmentData,
  selectedEnvironments,
  getString,
  envTypeFilter,
  userSelectedBranches,
  setUserSelectedBranches,
  hideRemoteDetails
}: any): Omit<
  ReferenceSelectProps<EnvironmentResponseDTO>,
  'onChange' | 'onMultiSelectChange' | 'onCancel' | 'pagination'
> {
  return {
    name,
    width,
    selectAnReferenceLabel: getString('pipeline.envLabel'),
    selected,
    placeholder,
    defaultScope,
    createNewLabel: getString('environment'),
    isNewConnectorLabelVisible: true,
    fetchRecords: (done, search, page, scope, signal = undefined) => {
      const commonQueryParams = {
        page: page,
        accountIdentifier: accountIdentifier,
        orgIdentifier: scope !== Scope.ACCOUNT ? orgIdentifier : undefined,
        projectIdentifier: scope === Scope.PROJECT ? projectIdentifier : undefined,
        searchTerm: search
      }
      const request = envTypeFilter.length
        ? getEnvironmentListV2Promise(
            {
              queryParams: {
                ...commonQueryParams
              },
              body: {
                environmentTypes: envTypeFilter,
                filterType: 'Environment'
              }
            },
            signal
          )
        : getEnvironmentAccessListPromise(
            {
              queryParams: {
                ...commonQueryParams
              }
            },
            signal
          )
      return request
        .then((responseData: ResponseListEnvironmentResponse | ResponsePageEnvironmentResponse) => {
          const responseDt = envTypeFilter.length
            ? (responseData.data as PageEnvironmentResponse).content
            : (responseData.data as EnvironmentResponse[])
          if (responseDt?.length) {
            setPagedEnvironmentData(responseData)
            const environmentsList = responseDt?.map(environment => ({
              identifier: defaultTo(environment.environment?.identifier, ''),
              name: defaultTo(environment.environment?.name, ''),
              record: {
                identifier: defaultTo(environment.environment?.identifier, ''),
                name: defaultTo(environment.environment?.name, ''),
                description: environment.environment?.description,
                tags: environment.environment?.tags,
                type: environment.environment?.type,
                storeType: defaultTo(environment.environment?.storeType, StoreType.INLINE),
                entityGitDetails: environment.environment?.entityGitDetails,
                connectorRef: environment.environment?.connectorRef,
                fallbackBranch: environment.environment?.fallbackBranch,
                orgIdentifier: scope !== Scope.ACCOUNT ? orgIdentifier : undefined,
                projectIdentifier: scope === Scope.PROJECT ? projectIdentifier : undefined
              }
            }))
            done(environmentsList)
          } else done([])
        })
        .catch((err: Failure) => {
          throw err.message
        })
    },
    projectIdentifier,
    orgIdentifier,
    noRecordsText: getString('cd.noEnvironment.title'),
    componentName: getString('environment'),
    noDataCard: {
      image: environmentEmptyStateSvg,
      message: getString('cd.noEnvironment.title'),
      containerClassName: css.noDataCardContainerConnector,
      className: css.noDataCardContainerContent
    },
    isMultiSelect,
    selectedReferences: selectedEnvironments,
    recordRender: function recordRender({ item, selected: checked, onItemClick, selectedRecord }) {
      const environmentId = getConnectorIdentifierWithScope(
        getScopeFromDTO(item?.record),
        item?.record?.identifier || ''
      )
      let selectedBranch
      return (
        <Layout.Horizontal margin={{ left: 'small' }} flex={{ distribution: 'space-between' }} className={css.item}>
          <Layout.Horizontal spacing="medium" className={css.leftInfo}>
            <Icon className={cx(css.iconCheck, { [css.iconChecked]: checked })} size={14} name="pipeline-approval" />
            <div className={css.serviceNameId}>
              <Text lineClamp={1} font={{ weight: 'bold' }} color={Color.BLACK}>
                {item.record.name}
              </Text>
              <Text lineClamp={1} font={{ size: 'small', weight: 'light' }} color={Color.GREY_600}>
                {`${getString('common.ID')}: ${item.identifier}`}
              </Text>
            </div>
          </Layout.Horizontal>
          {!hideRemoteDetails && item?.record?.storeType === StoreType?.REMOTE ? (
            <Container width={320}>
              <GitRemoteDetails
                connectorRef={item?.record?.connectorRef}
                repoName={item?.record?.entityGitDetails?.repoName}
                filePath={item?.record?.entityGitDetails?.filePath}
                branch={selectedBranch || userSelectedBranches[environmentId] || defaultGitContextBranchPlaceholder}
                fileUrl={item?.record?.entityGitDetails?.fileUrl}
                flags={{
                  readOnly: !checked,
                  showBranch: true
                }}
                onBranchChange={env => {
                  if (item?.record?.entityGitDetails) {
                    selectedBranch = env?.branch
                    if (selectedBranch !== userSelectedBranches[environmentId]) {
                      const hasToSelectEnvironment = !isEntitySame(item?.record, selectedRecord || {})
                      if (!isMultiSelect && hasToSelectEnvironment) {
                        onItemClick?.(item)
                      }
                      setUserSelectedBranches({ ...userSelectedBranches, [environmentId]: selectedBranch })
                    }
                  }
                }}
              />
            </Container>
          ) : null}
        </Layout.Horizontal>
      )
    }
  }
}

export async function fetchEnvironmentsMetadata(
  queryParams: Pick<
    GetEnvironmentListQueryParams,
    'accountIdentifier' | 'orgIdentifier' | 'projectIdentifier' | 'envIdentifiers'
  >
): Promise<EnvironmentResponse[]> {
  try {
    const response = await getEnvironmentListPromise({
      queryParams,
      queryParamStringifyOptions: {
        arrayFormat: 'repeat'
      }
    })
    return response?.data?.content || []
  } catch {
    return []
  }
}

export async function fetchInfrastructuresMetadata(
  queryParams: Pick<
    GetInfrastructureListQueryParams,
    'accountIdentifier' | 'orgIdentifier' | 'projectIdentifier' | 'infraIdentifiers' | 'environmentIdentifier'
  >
): Promise<InfrastructureResponse[]> {
  try {
    const response = await getInfrastructureListPromise({
      queryParams,
      queryParamStringifyOptions: {
        arrayFormat: 'repeat'
      }
    })
    return response?.data?.content || []
  } catch {
    return []
  }
}
