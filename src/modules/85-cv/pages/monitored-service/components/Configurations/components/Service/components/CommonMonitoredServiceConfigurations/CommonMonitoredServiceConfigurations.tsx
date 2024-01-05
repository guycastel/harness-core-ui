/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Container, Layout, Tab, Tabs, Text, Views } from '@harness/uicore'
import React, { useEffect, useState } from 'react'
import { Color } from '@harness/design-system'
import { FormikContextType, useFormikContext } from 'formik'
import { useHistory, useParams } from 'react-router-dom'
import {
  useIsReconciliationRequiredForMonitoredServices,
  ChangeSourceDTO,
  MonitoredServiceDTO,
  IsReconciliationRequiredForMonitoredServicesQueryParams
} from 'services/cv'
import type { MonitoredServiceConfig } from '@cv/components/MonitoredServiceListWidget/MonitoredServiceListWidget.types'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import SaveAndDiscardButton from '@cv/components/SaveAndDiscardButton/SaveAndDiscardButton'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { isUpdated, showDependencies } from '@cv/pages/monitored-service/components/Configurations/Configurations.utils'
import { useStrings } from 'framework/strings'
import { useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { LICENSE_STATE_VALUES } from 'framework/LicenseStore/licenseStoreUtil'
import { CETAgentConfig } from '@cet/pages/CETAgentConfig'
import { ModuleName } from 'framework/types/ModuleName'
import { MonitoredServiceEnum } from '@cv/pages/monitored-service/MonitoredServicePage.constants'
import { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useQueryParams } from '@common/hooks'
import ReconcileIcon from '@cv/assets/Running.svg'
import { NGTemplateInfoConfig } from 'services/template-ng'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import NoResultsView from '@modules/72-templates-library/pages/TemplatesPage/views/NoResultsView/NoResultsView'
import {
  getIsAgentConfigSectionHidden,
  getIsChangeSrcSectionHidden,
  getIsHealthSrcSectionHidden,
  getIsNotifcationsSectionHidden,
  onSave,
  shouldShowSaveAndDiscard,
  updateMonitoredServiceDTOOnTypeChange
} from '../../Service.utils'
import ChangeSourceTableContainer from '../ChangeSourceTableContainer/ChangeSourceTableContainer'
import HealthSourceTableContainer from '../HealthSourceTableContainer/HealthSourceTableContainer'
import type { MonitoredServiceForm } from '../../Service.types'
import MonitoredServiceOverview from '../MonitoredServiceOverview/MonitoredServiceOverview'
import MonitoredServiceNotificationsContainer from '../MonitoredServiceNotificationsContainer/MonitoredServiceNotificationsContainer'
import Dependency from '../../../Dependency/Dependency'
import { MonitoredServiceConfigurationsTabsEnum } from './CommonMonitoredServiceConfigurations.constants'
import { handleTabChange } from './CommonMonitoredServiceConfigurations.utils'
import MonitoredServiceReconcileList from '../MonitoredServiceReconcileList/MonitoredServiceReconcileList'
import { ReconcileMonitoredServiceFormInMS } from '../MonitoredServiceReconcileList/ReconcileMonitoredServiceFormInMS'
import css from './CommonMonitoredServiceConfigurations.module.scss'

export interface CommonMonitoredServiceConfigurationsProps {
  config?: MonitoredServiceConfig
  identifier: string
  hideDrawer: () => void
  showDrawer: (data: ChangeSourceDTO[]) => void
  isTemplate?: boolean
  expressions?: string[]
  initialValues: MonitoredServiceForm
  onSuccess: (val: MonitoredServiceForm) => Promise<void>
  onDependencySuccess: (val: MonitoredServiceForm) => Promise<void>
  onSuccessChangeSource: (data: ChangeSourceDTO[]) => void
  openChangeSourceDrawer: ({
    formik,
    onSuccessChangeSource
  }: {
    formik: FormikContextType<MonitoredServiceForm>
    onSuccessChangeSource: (data: ChangeSourceDTO[]) => void
  }) => Promise<void>
  isEdit: boolean
  onChangeMonitoredServiceType: (updatedValues: MonitoredServiceForm) => void
  cachedInitialValues?: MonitoredServiceForm | null
  onDiscard?: () => void
  setDBData?: (val: MonitoredServiceForm) => void
  dependencyTabformRef?: unknown
}
export default function CommonMonitoredServiceConfigurations(
  props: CommonMonitoredServiceConfigurationsProps
): JSX.Element {
  const {
    config,
    identifier,
    hideDrawer,
    showDrawer,
    onSuccessChangeSource,
    openChangeSourceDrawer,
    isTemplate,
    expressions,
    initialValues,
    onSuccess,
    isEdit,
    onChangeMonitoredServiceType,
    cachedInitialValues,
    onDiscard,
    dependencyTabformRef,
    onDependencySuccess
  } = props
  const formik = useFormikContext<MonitoredServiceForm>()
  const { licenseInformation } = useLicenseStore()
  const { CET_PLATFORM_MONITORED_SERVICE, SRM_ENABLE_MS_TEMPLATE_RECONCILIATION: showInputsets } = useFeatureFlags()
  const { isNewNavEnabled } = useAppStore()
  const isCETLicensePresentAndActive = licenseInformation[ModuleName.CET]?.status === LICENSE_STATE_VALUES.ACTIVE
  const isChangeSrcSectionHidden = getIsChangeSrcSectionHidden(config, identifier)
  const isHealthSrcSectionHidden = getIsHealthSrcSectionHidden(config, identifier)
  const isAgentConfigSectionHidden = getIsAgentConfigSectionHidden(
    config,
    identifier,
    isCETLicensePresentAndActive,
    CET_PLATFORM_MONITORED_SERVICE
  )
  const { getString } = useStrings()
  const history = useHistory()
  const isNotificationsSectionHidden = getIsNotifcationsSectionHidden(isTemplate, config, identifier)
  const isSRMLicensePresentAndActive = licenseInformation[ModuleName.CV]?.status === LICENSE_STATE_VALUES.ACTIVE
  const {
    tab = MonitoredServiceEnum.SLOs,
    subTab = MonitoredServiceConfigurationsTabsEnum.MONITORED_SERVICE_OVERVIEW,
    view,
    notificationTime
  } = useQueryParams<{
    tab?: MonitoredServiceEnum
    view?: Views.GRID
    notificationTime?: number
    subTab?: MonitoredServiceConfigurationsTabsEnum
  }>()
  const { orgIdentifier, projectIdentifier, accountId } = useParams<
    ProjectPathProps & { identifier: string; templateIdentifier?: string }
  >()
  const [areOtherTabsDisabled, setAreOtherTabsDisabled] = useState<boolean>(true)
  const { isTemplateByReference } = formik.values?.template || {}

  const getQueryParms = (): IsReconciliationRequiredForMonitoredServicesQueryParams => {
    const templateMS = formik?.values?.template
    const templateData = initialValues.templateValue

    const templateQueryParam = isTemplate
      ? {
          templateIdentifier: templateData?.identifier || '',
          versionLabel: templateData?.versionLabel || '',
          monitoredServiceIdentifier: identifier
        }
      : {
          templateIdentifier: templateMS?.templateRef || '',
          versionLabel: templateMS?.versionLabel || '',
          monitoredServiceIdentifier: identifier
        }

    return {
      accountId,
      orgIdentifier,
      projectIdentifier,
      ...templateQueryParam
    }
  }

  const queryParams = getQueryParms()

  const { refetch: refetchReconileRequired, data: isReconcileRequiredData } =
    useIsReconciliationRequiredForMonitoredServices({
      queryParams,
      lazy: true
    })

  useEffect(() => {
    if (showInputsets && queryParams.templateIdentifier && queryParams.versionLabel) {
      refetchReconileRequired()
    }
  }, [showInputsets, queryParams.templateIdentifier, queryParams.versionLabel])

  useEffect(() => {
    const shouldDisableTabs = !(formik.values.serviceRef && formik.values.environmentRef)

    if (shouldDisableTabs !== areOtherTabsDisabled) {
      setAreOtherTabsDisabled(shouldDisableTabs)
    }
  }, [formik.values.serviceRef, formik.values.environmentRef, areOtherTabsDisabled])

  const handleMonitoredServiceTypeChange = (type: MonitoredServiceDTO['type']): void => {
    if (type === formik.values.type) {
      return
    }
    formik.setFieldValue('type', type)
    onChangeMonitoredServiceType({
      isEdit,
      ...updateMonitoredServiceDTOOnTypeChange(type, formik.values)
    })
  }

  const onTabChange = (nextTab: MonitoredServiceEnum): void => {
    handleTabChange({
      nextTab,
      tab,
      config,
      history,
      accountId,
      orgIdentifier,
      projectIdentifier,
      identifier,
      view,
      notificationTime,
      isTemplate,
      isNav2Enabled: isNewNavEnabled
    })
  }

  return (
    <Container className={css.configurationTabs}>
      <Tabs id={'monitoredServiceConfigurations'} defaultSelectedTabId={subTab} onChange={onTabChange} animate>
        <Tab
          id={MonitoredServiceConfigurationsTabsEnum.MONITORED_SERVICE_OVERVIEW}
          title={getString('overview')}
          panel={
            <>
              <Container className={css.saveDiscardButton}>
                {shouldShowSaveAndDiscard(isTemplate) ? (
                  <SaveAndDiscardButton
                    isUpdated={isUpdated(formik.dirty, initialValues, cachedInitialValues)}
                    onSave={/* istanbul ignore next */ () => onSave({ formik, onSuccess })}
                    onDiscard={
                      /* istanbul ignore next */ () => {
                        formik.resetForm()
                        onDiscard?.()
                      }
                    }
                    RbacPermission={{
                      permission: PermissionIdentifier.EDIT_MONITORED_SERVICE,
                      resource: {
                        resourceType: ResourceType.MONITOREDSERVICE,
                        resourceIdentifier: projectIdentifier
                      }
                    }}
                  />
                ) : null}
              </Container>
              <MonitoredServiceOverview
                formikProps={formik}
                isEdit={isEdit}
                onChangeMonitoredServiceType={handleMonitoredServiceTypeChange}
                config={config}
              />
            </>
          }
        />
        {isHealthSrcSectionHidden ? null : (
          <Tab
            disabled={areOtherTabsDisabled}
            id={MonitoredServiceConfigurationsTabsEnum.HEALTH_SOURCE}
            title={getString('platform.connectors.cdng.healthSources.label')}
            panel={
              <>
                <Container className={css.saveDiscardButton}>
                  {shouldShowSaveAndDiscard(isTemplate) ? (
                    <SaveAndDiscardButton
                      isUpdated={isUpdated(formik.dirty, initialValues, cachedInitialValues)}
                      onSave={/* istanbul ignore next */ () => onSave({ formik, onSuccess })}
                      onDiscard={
                        /* istanbul ignore next */ () => {
                          formik.resetForm()
                          onDiscard?.()
                        }
                      }
                      RbacPermission={{
                        permission: PermissionIdentifier.EDIT_MONITORED_SERVICE,
                        resource: {
                          resourceType: ResourceType.MONITOREDSERVICE,
                          resourceIdentifier: projectIdentifier
                        }
                      }}
                    />
                  ) : null}
                </Container>
                <HealthSourceTableContainer
                  healthSourceListFromAPI={initialValues.sources?.healthSources}
                  serviceFormFormik={formik}
                  isTemplate={isTemplate}
                  expressions={expressions}
                  onSave={
                    /* istanbul ignore next */ data => {
                      onSave({
                        formik: {
                          ...formik,
                          values: {
                            ...(formik?.values || {}),
                            sources: { ...formik.values?.sources, healthSources: data }
                          }
                        },
                        onSuccess
                      })
                    }
                  }
                />
              </>
            }
          />
        )}
        {isChangeSrcSectionHidden ? null : (
          <Tab
            disabled={areOtherTabsDisabled}
            id={MonitoredServiceConfigurationsTabsEnum.CHANGE_SOURCE}
            title={getString('cv.navLinks.adminSideNavLinks.activitySources')}
            panel={
              <>
                <Container className={css.saveDiscardButton}>
                  {shouldShowSaveAndDiscard(isTemplate) ? (
                    <SaveAndDiscardButton
                      isUpdated={isUpdated(formik.dirty, initialValues, cachedInitialValues)}
                      onSave={/* istanbul ignore next */ () => onSave({ formik, onSuccess })}
                      onDiscard={
                        /* istanbul ignore next */ () => {
                          formik.resetForm()
                          onDiscard?.()
                        }
                      }
                      RbacPermission={{
                        permission: PermissionIdentifier.EDIT_MONITORED_SERVICE,
                        resource: {
                          resourceType: ResourceType.MONITOREDSERVICE,
                          resourceIdentifier: projectIdentifier
                        }
                      }}
                    />
                  ) : null}
                </Container>
                <ChangeSourceTableContainer
                  onEdit={values => {
                    showDrawer({ ...values, hideDrawer })
                  }}
                  onAddNewChangeSource={
                    /* istanbul ignore next */ () => {
                      openChangeSourceDrawer({ formik, onSuccessChangeSource })
                    }
                  }
                  value={formik.values?.sources?.changeSources}
                  onSuccess={onSuccessChangeSource}
                />
              </>
            }
          />
        )}
        {isAgentConfigSectionHidden ? null : (
          <Tab
            disabled={areOtherTabsDisabled}
            id={MonitoredServiceConfigurationsTabsEnum.AGENT_CONFIG}
            title={getString('cet.monitoredservice.agentconfig')}
            panel={
              <CETAgentConfig serviceRef={formik.values?.serviceRef} environmentRef={formik.values?.environmentRef} />
            }
          />
        )}
        {showDependencies(isTemplate as boolean, config, isSRMLicensePresentAndActive) && (
          <Tab
            disabled={areOtherTabsDisabled}
            id={getString('pipelines-studio.dependenciesGroupTitle')}
            title={getString('pipelines-studio.dependenciesGroupTitle')}
            panel={
              <Dependency
                value={formik.values}
                dependencyTabformRef={dependencyTabformRef}
                onSuccess={onDependencySuccess}
                onDiscard={onDiscard}
              />
            }
          />
        )}
        {isNotificationsSectionHidden ? null : (
          <Tab
            disabled={areOtherTabsDisabled}
            id={MonitoredServiceConfigurationsTabsEnum.NOTIFICATIONS}
            title={getString('rbac.notifications.name')}
            panel={
              <>
                <Container className={css.saveDiscardButton}>
                  <SaveAndDiscardButton
                    isUpdated={isUpdated(formik.dirty, initialValues, cachedInitialValues)}
                    onSave={/* istanbul ignore next */ () => onSave({ formik, onSuccess })}
                    onDiscard={
                      /* istanbul ignore next */ () => {
                        formik.resetForm()
                        onDiscard?.()
                      }
                    }
                    RbacPermission={{
                      permission: PermissionIdentifier.EDIT_MONITORED_SERVICE,
                      resource: {
                        resourceType: ResourceType.MONITOREDSERVICE,
                        resourceIdentifier: projectIdentifier
                      }
                    }}
                  />
                </Container>
                <MonitoredServiceNotificationsContainer
                  setFieldValue={formik.setFieldValue}
                  notificationRuleRefs={formik.values?.notificationRuleRefs}
                  identifier={identifier}
                />
              </>
            }
          />
        )}
        {showInputsets && (
          <Tab
            disabled={areOtherTabsDisabled}
            id={getString('inputSets.inputSetLabel')}
            title={
              <Layout.Horizontal flex={{ alignItems: 'baseline' }}>
                <Text color={Color.BLACK}>{getString('inputSets.inputSetLabel')}</Text>
                {Boolean(isReconcileRequiredData?.data) && <img src={ReconcileIcon} />}
              </Layout.Horizontal>
            }
            panel={
              isTemplate ? (
                <MonitoredServiceReconcileList
                  templateValue={initialValues.templateValue as NGTemplateInfoConfig}
                  refetchReconileRequired={refetchReconileRequired}
                />
              ) : (
                <Container
                  width={'100%'}
                  flex={{ justifyContent: 'center' }}
                  margin={{ top: !isTemplateByReference ? 'large' : '' }}
                >
                  {formik.values.template && isTemplateByReference ? (
                    <ReconcileMonitoredServiceFormInMS
                      templateData={formik.values.template}
                      monitoredServiceIdentifier={identifier}
                      refetchReconileRequired={refetchReconileRequired}
                    />
                  ) : (
                    <NoResultsView minimal={true} text={getString('templatesLibrary.noInputsRequired')} />
                  )}
                </Container>
              )
            }
          />
        )}
      </Tabs>
    </Container>
  )
}
