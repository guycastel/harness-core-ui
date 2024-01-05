/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Container, Tabs, PageError, Page, FlexExpander, Views } from '@harness/uicore'
import { useQueryParams } from '@common/hooks'
import { useStrings } from 'framework/strings'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useGetMonitoredService } from 'services/cv'
import routesV1 from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { getErrorMessage, getSearchString } from '@cv/utils/CommonUtils'
import DetailsBreadcrumb from '@cv/pages/monitored-service/views/DetailsBreadcrumb'
import DetailsHeaderTitle from '@cv/pages/monitored-service/views/DetailsHeaderTitle'
import DetailsToolbar from '@cv/pages/monitored-service/views/DetailsToolbar'
import { FeatureFlag } from '@common/featureFlags'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import SRMApp from '@modules/85-cv/SRMApp'
import { ChildComponentNames } from '@modules/85-cv/interface/SRMCustomMicroFrontendProps.constants'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import Configurations from './components/Configurations/Configurations'
import { MonitoredServiceEnum } from './MonitoredServicePage.constants'
import HealthScoreCard from './components/ServiceHealth/components/HealthScoreCard/HealthScoreCard'
import CVSLOsListingPage from '../slos/CVSLOsListingPage'
import { isProjectChangedOnMonitoredService } from './MonitoredServicePage.utils'
import MonitoredServiceTabTitle from './CVMonitoredService/components/MonitoredServiceTabTitle'
import { ServiceHealthMFEWrapper } from './components/ServiceHealth/ServiceHealthMFEWrapper'
import css from './MonitoredServicePage.module.scss'

const ServiceHealthAndConfiguration: React.FC = () => {
  const history = useHistory()
  const { getString } = useStrings()

  const {
    tab = MonitoredServiceEnum.SLOs,
    view,
    notificationTime
  } = useQueryParams<{ tab?: MonitoredServiceEnum; view?: Views.GRID; notificationTime?: number }>()
  const { orgIdentifier, projectIdentifier, accountId, identifier } = useParams<
    ProjectPathProps & { identifier: string }
  >()
  const { isNewNavEnabled: isNav2Enabled } = useAppStore()
  const isSRMLicenseEnabled = useFeatureFlag(FeatureFlag.CVNG_LICENSE_ENFORCEMENT)
  const isMFEEnabled = useFeatureFlag(FeatureFlag.SRM_MICRO_FRONTEND)

  const {
    data: monitoredServiceData,
    refetch,
    loading,
    error
  } = useGetMonitoredService({
    identifier,
    queryParams: {
      accountId,
      orgIdentifier,
      projectIdentifier
    }
  })
  const routes = isNav2Enabled ? routesV2 : routesV1

  const { monitoredService, lastModifiedAt } = monitoredServiceData?.data ?? {}

  let selectedTab = tab

  if (!loading && !error) {
    selectedTab = monitoredService?.enabled || !isSRMLicenseEnabled ? tab : MonitoredServiceEnum.Configurations
  }

  if (error) {
    if (isProjectChangedOnMonitoredService(error, identifier)) {
      history.push(
        routes.toCVMonitoringServices({
          projectIdentifier,
          orgIdentifier,
          accountId
        })
      )
    } else {
      return <PageError message={getErrorMessage(error)} onClick={() => refetch()} />
    }
  }

  if (!loading && !monitoredService) {
    return <Page.NoDataCard message={getString('noData')} />
  }

  const onTabChange = (nextTab: MonitoredServiceEnum): void => {
    if (nextTab !== tab && (monitoredService?.enabled || !isSRMLicenseEnabled)) {
      history.push({
        pathname: routes.toCVAddMonitoringServicesEdit({
          accountId,
          orgIdentifier,
          projectIdentifier,
          identifier,
          module: 'cv'
        }),
        search: getSearchString({ view, tab: nextTab, notificationTime })
      })
    }
  }

  const panelServiceHealth = (
    <Page.Body
      loading={loading}
      noData={{
        when: () => !monitoredService
      }}
    >
      <ServiceHealthMFEWrapper
        monitoredServiceIdentifier={monitoredService?.identifier ?? ''}
        serviceIdentifier={monitoredService?.serviceRef as string}
        environmentIdentifier={monitoredService?.environmentRef as string}
      />
    </Page.Body>
  )

  const panelSLO = (
    <Page.Body
      loading={loading}
      noData={{
        when: () => !monitoredService
      }}
    >
      {isMFEEnabled ? (
        <SRMApp
          renderComponent={{ componentName: ChildComponentNames.SLOsListingPage, componentProps: { monitoredService } }}
        />
      ) : (
        <CVSLOsListingPage monitoredService={monitoredService} />
      )}
    </Page.Body>
  )

  const panelConfigurations = (
    <Page.Body
      loading={loading}
      noData={{
        when: () => !monitoredService
      }}
    >
      <Configurations />
    </Page.Body>
  )

  const isMonitoredServiceDisabled = isSRMLicenseEnabled && Boolean(!identifier || !monitoredService?.enabled)

  return (
    <>
      <Page.Header
        size="large"
        breadcrumbs={<DetailsBreadcrumb />}
        title={<DetailsHeaderTitle loading={loading} monitoredService={monitoredService} />}
        toolbar={
          <DetailsToolbar loading={loading} monitoredService={monitoredService} lastModifiedAt={lastModifiedAt} />
        }
        className={css.header}
      />
      <Container className={css.monitoredServiceTabs}>
        <Tabs
          id="monitoredServiceTabs"
          selectedTabId={selectedTab}
          onChange={onTabChange}
          tabList={[
            {
              id: MonitoredServiceEnum.SLOs,
              title: (
                <MonitoredServiceTabTitle
                  title={getString('cv.slos.title')}
                  isTabDisabled={isMonitoredServiceDisabled}
                />
              ),
              panel: panelSLO,
              disabled: isMonitoredServiceDisabled
            },
            {
              id: MonitoredServiceEnum.ServiceHealth,
              title: (
                <MonitoredServiceTabTitle
                  title={getString('cv.monitoredServices.monitoredServiceTabs.changeImpact')}
                  isTabDisabled={isMonitoredServiceDisabled}
                />
              ),
              panel: panelServiceHealth,
              disabled: isMonitoredServiceDisabled
            },
            {
              id: MonitoredServiceEnum.Configurations,
              title: <MonitoredServiceTabTitle title={getString('common.configurations')} isTabDisabled={false} />,
              panel: panelConfigurations
            }
          ]}
        >
          <FlexExpander />
          {tab === MonitoredServiceEnum.ServiceHealth && (
            <HealthScoreCard
              monitoredServiceIdentifier={monitoredService?.identifier}
              monitoredServiceLoading={loading}
            />
          )}
        </Tabs>
      </Container>
    </>
  )
}

const CVMonitoredServiceDetails: React.FC = () => {
  const { getString } = useStrings()

  useDocumentTitle([getString('common.module.srm'), getString('cv.monitoredServices.title')])

  const { identifier, serviceIdentifier, environmentIdentifier } =
    useParams<{ identifier?: string; serviceIdentifier?: string; environmentIdentifier?: string }>()

  if (identifier) {
    return <ServiceHealthAndConfiguration />
  }

  return (
    <>
      <Page.Header
        breadcrumbs={<DetailsBreadcrumb />}
        title={getString('cv.monitoredServices.addNewMonitoredServices')}
      />
      <Configurations serviceIdentifier={serviceIdentifier} environmentIdentifier={environmentIdentifier} />
    </>
  )
}

export default CVMonitoredServiceDetails
