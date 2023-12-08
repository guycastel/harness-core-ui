/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { FormikContextType } from 'formik'
import { isEqual, omit } from 'lodash-es'
import { RUNTIME_INPUT_VALUE } from '@harness/uicore'
import type { MonitoredServiceDTO } from 'services/cv'
import { Scope } from '@common/interfaces/SecretsInterface'
import type { NGMonitoredServiceTemplateInfoConfig } from '@cv/components/MonitoredServiceTemplate/components/MonitoredServiceTemplateCanvas.types'
import type { MonitoredServiceConfig } from '@cv/components/MonitoredServiceListWidget/MonitoredServiceListWidget.types'
import { MonitoredServiceType } from './components/MonitoredServiceOverview/MonitoredServiceOverview.constants'
import type { MonitoredServiceForm } from './Service.types'

export const getMonitoredServiceType = ({
  isTemplate,
  templateValue,
  defaultMonitoredService
}: {
  isTemplate: boolean
  templateValue?: NGMonitoredServiceTemplateInfoConfig
  defaultMonitoredService?: MonitoredServiceDTO
}): MonitoredServiceDTO['type'] => {
  if (isTemplate) {
    return templateValue?.spec?.type ?? MonitoredServiceType.APPLICATION
  }

  return defaultMonitoredService?.type ?? (MonitoredServiceType.APPLICATION as MonitoredServiceForm['type'])
}

const getEnvironmentRefBasedOnMonitoredServiveType = ({
  type,
  environmentRef,
  environmentRefList
}: {
  type: MonitoredServiceDTO['type']
  environmentRef?: string
  environmentRefList?: string[]
}): string | undefined => {
  if (
    type === MonitoredServiceType.APPLICATION &&
    (typeof environmentRef === 'string' || environmentRef === RUNTIME_INPUT_VALUE)
  ) {
    return environmentRef
  }

  if (type === MonitoredServiceType.INFRASTRUCTURE) {
    if (Array.isArray(environmentRef) || environmentRef === RUNTIME_INPUT_VALUE) {
      return environmentRef
    } else if (Array.isArray(environmentRefList)) {
      return environmentRefList as unknown as MonitoredServiceForm['environmentRef']
    }
  }

  return undefined
}

/**
 *
 * This function returns correct data structure for environmentRef
 * based on the monitored service type
 *
 */
export const getEnvironmentRef = ({
  templateScope,
  templateValue
}: {
  templateScope?: Scope
  templateValue: NGMonitoredServiceTemplateInfoConfig
}): string | undefined => {
  if (templateScope !== Scope.PROJECT) {
    return RUNTIME_INPUT_VALUE
  }

  return getEnvironmentRefBasedOnMonitoredServiveType({
    type: templateValue?.spec?.type,
    environmentRef: templateValue?.spec?.environmentRef
  })
}

export const getInitFormData = (
  defaultMonitoredService: MonitoredServiceDTO | undefined,
  isEdit: boolean,
  isTemplate = false,
  serviceIdentifier: string,
  environmentIdentifier: string,
  data?: MonitoredServiceDTO | NGMonitoredServiceTemplateInfoConfig,
  templateScope?: Scope
): MonitoredServiceForm => {
  if (isTemplate) {
    const templateValue = data as NGMonitoredServiceTemplateInfoConfig

    return {
      isEdit: false,
      name: templateValue?.name || '',
      identifier: templateValue?.identifier || '',
      description: '',
      tags: templateValue?.tags || {},
      serviceRef: templateScope !== Scope.PROJECT ? RUNTIME_INPUT_VALUE : templateValue?.spec?.serviceRef,
      type: getMonitoredServiceType({ isTemplate, templateValue, defaultMonitoredService }),
      environmentRef: getEnvironmentRef({ templateValue, templateScope }),
      environmentRefList: [],
      sources: templateValue?.spec?.sources,
      dependencies: [],
      ...(templateValue?.notificationRuleRefs && {
        notificationRuleRefs: templateValue?.notificationRuleRefs
      }),
      templateValue
    }
  }

  const monitoredServiceData = isEdit ? data : defaultMonitoredService
  const {
    name = '',
    identifier = '',
    description = '',
    tags = {},
    serviceRef = serviceIdentifier,
    environmentRef = environmentIdentifier,
    environmentRefList = [],
    sources,
    dependencies = [],
    type,
    notificationRuleRefs = [],
    template
  } = (monitoredServiceData || {}) as MonitoredServiceDTO

  return {
    isEdit,
    name,
    identifier,
    description,
    tags,
    serviceRef,
    type: (type as MonitoredServiceForm['type']) || MonitoredServiceType.APPLICATION,
    notificationRuleRefs,
    environmentRef: getEnvironmentRefBasedOnMonitoredServiveType({ type, environmentRef, environmentRefList }),
    environmentRefList,
    sources,
    dependencies,
    template
  }
}

export const isCacheUpdated = (
  initialValues: MonitoredServiceForm | null | undefined,
  cachedInitialValues: MonitoredServiceForm | null | undefined
): boolean => {
  if (!cachedInitialValues) {
    return false
  }
  return !isEqual(omit(cachedInitialValues, 'dependencies'), omit(initialValues, 'dependencies'))
}

export const onSave = async ({
  formik,
  onSuccess
}: {
  formik: FormikContextType<any>
  onSuccess: (val: MonitoredServiceForm) => Promise<void>
}): Promise<void> => {
  const validResponse = await formik?.validateForm()
  if (!Object.keys(validResponse).length) {
    await onSuccess(formik?.values)
  } else {
    formik?.submitForm()
  }
}

export function updateMonitoredServiceDTOOnTypeChange(
  type: MonitoredServiceDTO['type'],
  monitoredServiceForm: MonitoredServiceForm
): MonitoredServiceDTO {
  const monitoredServiceDTO: MonitoredServiceDTO = omit(monitoredServiceForm, ['isEdit']) as MonitoredServiceDTO

  if (!monitoredServiceDTO.sources) {
    monitoredServiceDTO.sources = { changeSources: [], healthSources: [] }
  }

  monitoredServiceDTO.sources.changeSources =
    monitoredServiceDTO.sources.changeSources?.filter(source => {
      if (type === 'Application' && source.type !== 'K8sCluster') {
        return true
      }
      if (type === 'Infrastructure' && source.type !== 'HarnessCD' && source.type !== 'HarnessCDNextGen') {
        return true
      }
      return false
    }) || []

  monitoredServiceDTO.type = type
  return monitoredServiceDTO
}

export function getIsNotifcationsSectionHidden(
  isTemplate?: boolean,
  config?: MonitoredServiceConfig,
  identifier?: string
): boolean {
  return Boolean(isTemplate || config || !identifier)
}

export function getIsHealthSrcSectionHidden(config: MonitoredServiceConfig | undefined, identifier: string): boolean {
  const isMonitoredServiceConfigPresentInCreateMode = config && !identifier
  return Boolean(isMonitoredServiceConfigPresentInCreateMode)
}

export function getIsAgentConfigSectionHidden(
  config: MonitoredServiceConfig | undefined,
  identifier: string,
  isCETLicensePresentAndActive?: boolean,
  CET_PLATFORM_MONITORED_SERVICE?: boolean
): boolean {
  const isAgentConfigSectionVisible =
    config?.details.agentConfiguration && isCETLicensePresentAndActive && CET_PLATFORM_MONITORED_SERVICE

  return Boolean(!(identifier && isAgentConfigSectionVisible))
}

export function getIsChangeSrcSectionHidden(config: MonitoredServiceConfig | undefined, identifier: string): boolean {
  const isChangeSourceSectionHidden = !config?.listing?.changeSource
  const isCreateModeForNonCDModules = !isChangeSourceSectionHidden && !identifier
  return Boolean(config && (isChangeSourceSectionHidden || isCreateModeForNonCDModules))
}

export function shouldShowSourcesSection(config: MonitoredServiceConfig | undefined): boolean {
  return !config
}

export function shouldShowSaveAndDiscard(isTemplate: boolean | undefined): boolean {
  return !isTemplate
}
