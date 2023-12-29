/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { PageSpinner } from '@harness/uicore'
import { defaultTo } from 'lodash-es'
import type { DeploymentMetaData, ServiceResponseDTO, ServiceYaml } from 'services/cd-ng'
import { StoreMetadata } from '@modules/10-common/constants/GitSyncTypes'
import ServiceConfigurationWrapper from '@cd/components/Services/ServiceStudio/ServiceConfigWrapper/ServiceConfigWrapper'
import { ServiceContextProvider } from '@cd/context/ServiceContext'
import type { ServiceDeploymentType } from '@pipeline/utils/stageHelpers'

export interface ServiceEntityEditModalProps {
  onCloseModal: () => void
  onServiceCreate: (val: ServiceYaml) => void
  isServiceCreateModalView: boolean
  serviceResponse?: ServiceResponseDTO
  isLoading?: boolean
  serviceCacheKey?: string
  selectedDeploymentType?: ServiceDeploymentType
  gitOpsEnabled?: boolean
  isGitXEnforced?: boolean
  defaultStoreType?: StoreMetadata['storeType']
  deploymentMetadata?: DeploymentMetaData
}
function ServiceEntityEditModal({
  isServiceCreateModalView,
  onServiceCreate,
  onCloseModal,
  serviceResponse,
  isLoading,
  serviceCacheKey,
  selectedDeploymentType,
  gitOpsEnabled,
  isGitXEnforced = false,
  defaultStoreType,
  deploymentMetadata
}: ServiceEntityEditModalProps): React.ReactElement {
  if (isLoading) {
    return (
      <React.Fragment>
        <PageSpinner fixed />
        <div /> {/* this empty div is required for rendering layout correctly */}
      </React.Fragment>
    )
  }
  return (
    <ServiceContextProvider
      serviceResponse={isServiceCreateModalView ? {} : (serviceResponse as ServiceResponseDTO)}
      isServiceEntityModalView={true}
      onCloseModal={onCloseModal}
      onServiceCreate={onServiceCreate}
      isServiceEntityPage={true}
      isServiceCreateModalView={isServiceCreateModalView}
      serviceCacheKey={defaultTo(serviceCacheKey, '')}
      selectedDeploymentType={selectedDeploymentType as ServiceDeploymentType}
      gitOpsEnabled={defaultTo(gitOpsEnabled, false)}
      isGitXEnforced={isGitXEnforced}
      deploymentMetadata={deploymentMetadata}
      isDeploymentTypeDisabled
    >
      <ServiceConfigurationWrapper defaultStoreType={defaultStoreType} />
    </ServiceContextProvider>
  )
}

export default ServiceEntityEditModal
