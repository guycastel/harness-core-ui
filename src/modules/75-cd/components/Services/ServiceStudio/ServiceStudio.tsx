/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Layout, PageSpinner } from '@harness/uicore'
import { useParams } from 'react-router-dom'
import { defaultTo, noop } from 'lodash-es'
import { parse } from 'yaml'
import { ServiceDetailHeaderRef } from '@cd/components/ServiceDetails/ServiceDetailsHeader/ServiceDetailsHeader'
import { GitErrorMetadataDTO, ServiceResponseDTO, useGetServiceV2 } from 'services/cd-ng'
import type { GitQueryParams, ProjectPathProps, ServicePathProps } from '@common/interfaces/RouteInterfaces'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { ServiceContextProvider } from '@cd/context/ServiceContext'
import ServiceDetailsSummary from '@cd/components/ServiceDetails/ServiceDetailsContent/ServiceDetailsSummary'
import ServiceDetailsSummaryV2 from '@cd/components/ServiceDetails/ServiceDetailsSummaryV2/ServiceDetailsSummaryV2'
import EntitySetupUsage from '@common/pages/entityUsage/EntityUsage'
import type { ServiceDeploymentType } from '@pipeline/utils/stageHelpers'
import { EntityType } from '@common/pages/entityUsage/EntityConstants'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import NoEntityFound from '@pipeline/pages/utils/NoEntityFound/NoEntityFound'
import ServiceConfigurationWrapper from './ServiceConfigWrapper/ServiceConfigWrapper'

export interface ServiceHeaderRefetchRef {
  refetchData: () => void
}

function ServiceStudio(): React.ReactElement | null {
  const { accountId, orgIdentifier, projectIdentifier, serviceId } = useParams<ProjectPathProps & ServicePathProps>()
  const { storeType, connectorRef, repoName, branch } = useQueryParams<GitQueryParams>()
  const { updateQueryParams } = useUpdateQueryParams()
  const refetch = useRef<ServiceHeaderRefetchRef>(null)
  const [isDeploymentTypeDisabled, setIsDeploymentTypeDisabled] = useState(false)
  const [updatedServiceResponse, setUpdatedServiceResponse] = useState<ServiceResponseDTO | undefined>()
  const [deploymentType, setDeploymentType] = useState<ServiceDeploymentType>('' as ServiceDeploymentType)
  const isServiceDetailSummaryV2 = useFeatureFlag(FeatureFlag.CDC_SERVICE_DASHBOARD_REVAMP_NG)

  const {
    data: serviceResponse,
    loading: serviceDataLoading,
    refetch: refetchServiceResponse,
    error
  } = useGetServiceV2({
    serviceIdentifier: serviceId,
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      ...(storeType === 'REMOTE'
        ? {
            connectorRef,
            repoName,
            ...(branch ? { branch } : { loadFromFallbackBranch: true })
          }
        : {})
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
  })

  useEffect(() => {
    if (!serviceDataLoading && serviceResponse?.data?.service) {
      const serviceDefinitionType = parse(defaultTo(serviceResponse?.data?.service?.yaml, '{}'))?.service
        ?.serviceDefinition?.type
      setDeploymentType(serviceDefinitionType)
      setIsDeploymentTypeDisabled(!!serviceDefinitionType)
      serviceResponse?.data?.service?.storeType === 'REMOTE' &&
        !branch &&
        updateQueryParams({ branch: serviceResponse?.data?.service?.entityGitDetails?.branch || '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceDataLoading, serviceResponse?.data?.service])

  const hasRemoteFetchFailed = useMemo(() => {
    const errorMetadata = (error?.data as any)?.metadata as GitErrorMetadataDTO
    return Boolean(error?.status === 400 && errorMetadata?.branch)
  }, [error?.data, error?.status])

  const invokeRefetch = (): void => {
    refetch.current?.refetchData?.()
  }

  if (serviceDataLoading) {
    return <PageSpinner />
  }
  const handleReloadFromCache = (): void => {
    refetchServiceResponse({
      requestOptions: { headers: { 'Load-From-Cache': 'false' } }
    })
  }

  return (
    <Layout.Vertical>
      <ServiceContextProvider
        serviceResponse={updatedServiceResponse || (serviceResponse?.data?.service as ServiceResponseDTO)}
        isServiceEntityModalView={false}
        onCloseModal={noop}
        onServiceCreate={noop}
        isServiceEntityPage={true}
        isServiceCreateModalView={false}
        serviceCacheKey={''}
        selectedDeploymentType={defaultTo(deploymentType, '') as ServiceDeploymentType}
        gitOpsEnabled={false}
        isGitXEnforced={false} // This is used from GitX setting only while creating, not required in ServiceStudio
        isDeploymentTypeDisabled={isDeploymentTypeDisabled}
        setIsDeploymentTypeDisabled={setIsDeploymentTypeDisabled}
        setServiceResponse={setUpdatedServiceResponse}
      >
        <ServiceDetailHeaderRef
          ref={refetch}
          handleReloadFromCache={handleReloadFromCache}
          service={serviceResponse?.data?.service as ServiceResponseDTO}
        />
        {hasRemoteFetchFailed ? (
          <NoEntityFound identifier={serviceId} entityType={'service'} errorObj={error?.data as unknown as Error} />
        ) : (
          <ServiceConfigurationWrapper
            summaryPanel={isServiceDetailSummaryV2 ? <ServiceDetailsSummaryV2 /> : <ServiceDetailsSummary />}
            refercedByPanel={<EntitySetupUsage entityType={EntityType.Service} entityIdentifier={serviceId} />}
            invokeServiceHeaderRefetch={invokeRefetch}
          />
        )}
      </ServiceContextProvider>
    </Layout.Vertical>
  )
}

export default ServiceStudio
