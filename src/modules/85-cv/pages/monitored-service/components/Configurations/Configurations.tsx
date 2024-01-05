/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useContext, useMemo, useState, useCallback, useRef } from 'react'
import { Container, PageError, Views } from '@harness/uicore'
import { useHistory, useParams, matchPath } from 'react-router-dom'
import { clone, defaultTo, isEmpty, isEqual, omit } from 'lodash-es'
import { parse } from 'yaml'
import type { FormikProps } from 'formik'
import { useQueryParams } from '@common/hooks'
import { getCVMonitoringServicesSearchParam, getErrorMessage, getSearchString } from '@cv/utils/CommonUtils'
import { accountPathProps, projectPathProps, modulePathProps, getRouteParams } from '@common/utils/routeUtils'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { editParams } from '@cv/utils/routeUtils'
import type { Module, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useIndexedDBHook, CVObjectStoreNames } from '@cv/hooks/IndexedDBHook/IndexedDBHook'
import {
  ChangeSourceDTO,
  MonitoredServiceDTO,
  useGetMonitoredService,
  useGetMonitoredServiceYamlTemplate,
  useSaveMonitoredService,
  useUpdateMonitoredService
} from 'services/cv'
import type { NGTemplateInfoConfig } from 'services/template-ng'
import { PageSpinner, useToaster, NavigationCheck } from '@common/components'
import type { TemplateFormRef } from '@templates-library/components/TemplateStudio/TemplateStudioInternal'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { MonitoredServiceEnum } from '@cv/pages/monitored-service/MonitoredServicePage.constants'
import { ChangeSourceCategoryName } from '@cv/pages/ChangeSource/ChangeSourceDrawer/ChangeSourceDrawer.constants'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { useStrings } from 'framework/strings'
import { TemplateContext } from '@templates-library/components/TemplateStudio/TemplateContext/TemplateContext'
import { SLODetailsPageTabIds } from '@cv/pages/slos/CVSLODetailsPage/CVSLODetailsPage.types'
import { isNewTemplate } from '@templates-library/components/TemplateStudio/TemplateStudioUtils'
import type { MonitoredServiceConfig } from '@cv/components/MonitoredServiceListWidget/MonitoredServiceListWidget.types'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import Service, { ServiceWithRef } from './components/Service/Service'
import { getInitFormData } from './components/Service/Service.utils'
import type { MonitoredServiceForm } from './components/Service/Service.types'
import { determineUnSaveState, onSubmit, getImperativeHandleRef } from './Configurations.utils'
import { useMonitoredServiceContext } from '../../MonitoredServiceContext'
import { ConfigurationContextProvider } from './ConfigurationContext'
import css from './Configurations.module.scss'

interface ConfigurationsInterface {
  templateValue?: NGTemplateInfoConfig
  updateTemplate?: (template: MonitoredServiceForm) => void
  config?: MonitoredServiceConfig
  serviceIdentifier?: string
  environmentIdentifier?: string
  calledFromSettings?: boolean
}

export default function Configurations(
  {
    updateTemplate,
    templateValue,
    config,
    serviceIdentifier = '',
    environmentIdentifier = '',
    calledFromSettings
  }: ConfigurationsInterface,
  formikRef: TemplateFormRef
): JSX.Element {
  const { getString } = useStrings()

  useDocumentTitle([getString('common.module.srm'), getString('cv.monitoredServices.title')])

  const {
    state: { storeMetadata }
  } = useContext(TemplateContext)

  const { showWarning, showError, showSuccess } = useToaster()
  const history = useHistory()
  const { isTemplate, templateScope } = useMonitoredServiceContext()
  const { expressions } = useVariablesExpression()
  const { orgIdentifier, projectIdentifier, accountId, identifier, templateIdentifier } = useParams<
    ProjectPathProps & { identifier: string; templateIdentifier?: string }
  >()
  const { view, redirectToSLO, sloIdentifier, monitoredServiceIdentifier } = useQueryParams<{
    view?: Views.GRID
    redirectToSLO?: boolean
    sloIdentifier?: string
    monitoredServiceIdentifier?: string
  }>()
  const [cachedInitialValues, setCachedInitialValue] = useState<MonitoredServiceForm | null>(null)
  const [selectedTabID, setselectedTabID] = useState(getString('service'))
  const serviceTabformRef: React.MutableRefObject<FormikProps<MonitoredServiceForm> | null> = React.useRef(null)
  const dependencyTabformRef: React.MutableRefObject<FormikProps<MonitoredServiceForm> | null> = React.useRef(null)
  const [overrideBlockNavigation, setOverrideBlockNavigation] = useState<boolean>(false)
  const [defaultMonitoredService, setDefaultMonitoredService] = useState<MonitoredServiceDTO>()
  const projectRef = useRef(projectIdentifier)
  const { isNewNavEnabled: newLeftNav } = useAppStore()
  const isSettingsRoute = newLeftNav && calledFromSettings

  const {
    data: dataMonitoredServiceById,
    error: errorFetchMonitoredService,
    refetch: fetchMonitoredService,
    loading: loadingGetMonitoredService
  } = useGetMonitoredService({
    identifier,
    pathParams: {
      identifier
    },
    queryParams: {
      accountId,
      orgIdentifier,
      projectIdentifier
    },
    lazy: true
  })

  const {
    data: yamlMonitoredService,
    error: errorFetchMonitoredServiceYAML,
    loading: loadingFetchMonitoredServiceYAML,
    refetch: fetchMonitoredServiceYAML
  } = useGetMonitoredServiceYamlTemplate({
    queryParams: {
      orgIdentifier,
      projectIdentifier,
      accountId
    },
    lazy: true
  })

  useEffect(() => {
    if (isTemplate && projectRef.current !== projectIdentifier) {
      projectRef.current = projectIdentifier
      history.push({
        pathname: routes.toTemplates({
          accountId,
          orgIdentifier,
          projectIdentifier,
          module: 'cv'
        }),
        search: `?templateType=MonitoredService`
      })
    }
  }, [isTemplate, projectIdentifier])

  const { mutate: saveMonitoredService } = useSaveMonitoredService({
    queryParams: { accountId }
  })
  const { mutate: updateMonitoredService, loading: loadingUpdateMonitoredService } = useUpdateMonitoredService({
    identifier,
    queryParams: { accountId }
  })

  const serviceRef = useRef<any | null>()

  React.useImperativeHandle(getImperativeHandleRef(isTemplate, formikRef), () => ({
    resetForm() {
      return serviceRef?.current?.resetForm()
    },
    submitForm() {
      return serviceRef?.current?.submitForm()
    },
    getErrors() {
      return defaultTo(serviceRef?.current?.getErrors(), {})
    }
  }))

  useEffect(() => {
    if (overrideBlockNavigation && !redirectToSLO) {
      const pathParams = { projectIdentifier, orgIdentifier, accountId }
      const { module: moduleInfo } = getRouteParams<{ module: Module }>()
      const module = moduleInfo || config?.module
      const params = {
        ...pathParams,
        ...(module ? { module: module as Module } : {})
      }
      if (config) {
        isSettingsRoute
          ? history.push(routesV2.toMonitoredServicesSettings(params))
          : history.push(routes.toMonitoredServices(params))
      } else {
        isSettingsRoute
          ? history.push({
              pathname: routesV2.toCVMonitoringServicesSettings(params),
              search: getCVMonitoringServicesSearchParam({ view })
            })
          : history.push({
              pathname: routes.toCVMonitoringServices(pathParams),
              search: getCVMonitoringServicesSearchParam({ view })
            })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideBlockNavigation, redirectToSLO, module, config, isSettingsRoute])

  const [hasTemplateChangeSourceSet, sethasTemplateChangeSourceSet] = useState(false)
  useEffect(() => {
    const cloneTemplateValue = clone(templateValue)

    if (isTemplate && cloneTemplateValue?.name && cloneTemplateValue?.spec?.sources && storeMetadata?.storeType) {
      if (!identifier && isEmpty(cloneTemplateValue?.spec?.sources?.changeSources) && !hasTemplateChangeSourceSet) {
        cloneTemplateValue.spec.sources['changeSources'] = defaultMonitoredService?.sources?.changeSources
        sethasTemplateChangeSourceSet(true)
      }

      if (defaultMonitoredService?.type) {
        cloneTemplateValue.spec['type'] = defaultMonitoredService?.type
      }
      updateTemplate?.(cloneTemplateValue?.spec as MonitoredServiceForm)
    }
  }, [storeMetadata?.storeType, templateValue?.name, defaultMonitoredService])

  useEffect(() => {
    if (yamlMonitoredService && yamlMonitoredService?.resource) {
      // This only executed on creating new Monitored Service
      const { monitoredService }: { monitoredService: MonitoredServiceDTO } = parse(yamlMonitoredService?.resource)
      // Category is not present in default changeSource object
      // hence adding here
      monitoredService.sources?.changeSources?.forEach(changeSource => {
        changeSource['category'] = ChangeSourceCategoryName.DEPLOYMENT as ChangeSourceDTO['category']
        changeSource['spec'] = {}
      })

      setDefaultMonitoredService(prevService => {
        if (!prevService) {
          return monitoredService
        }
        const currSources = prevService.sources?.changeSources || []
        return {
          ...prevService,
          sources: {
            changeSources: currSources.concat(monitoredService.sources?.changeSources || []),
            healthSources: prevService.sources?.healthSources || []
          }
        }
      })
    }
  }, [yamlMonitoredService])

  useEffect(() => {
    if (identifier && fetchMonitoredService) {
      fetchMonitoredService()
    } else if ((isTemplate && isNewTemplate(templateIdentifier)) || (!isTemplate && !identifier)) {
      fetchMonitoredServiceYAML({
        queryParams: {
          accountId,
          orgIdentifier,
          projectIdentifier,
          ...(templateValue?.spec?.type ? { type: templateValue?.spec?.type } : {})
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifier])

  const initialValues: MonitoredServiceForm = useMemo(
    () => {
      const formInitiaValues = getInitFormData(
        defaultMonitoredService,
        isTemplate ? !isNewTemplate(templateIdentifier) : !!identifier,
        isTemplate,
        serviceIdentifier,
        environmentIdentifier,
        isTemplate ? templateValue : dataMonitoredServiceById?.data?.monitoredService,
        templateScope
      )

      return {
        ...formInitiaValues,
        isMonitoredServiceEnabled: dataMonitoredServiceById?.data?.monitoredService?.enabled
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      dataMonitoredServiceById?.data?.monitoredService?.name,
      dataMonitoredServiceById?.data?.monitoredService?.enabled,
      identifier,
      loadingGetMonitoredService,
      defaultMonitoredService,
      templateValue,
      serviceIdentifier,
      environmentIdentifier
    ]
  )

  useEffect(() => {
    // In case user refereshes page with saved changes
    if (isEqual(cachedInitialValues, initialValues)) {
      dbInstance?.clear(CVObjectStoreNames.MONITORED_SERVICE)
      setCachedInitialValue(null)
    }
  }, [cachedInitialValues, initialValues])

  const { isInitializingDB, dbInstance } = useIndexedDBHook({
    clearStroreList: [CVObjectStoreNames.MONITORED_SERVICE]
  })

  useEffect(() => {
    if (!isInitializingDB && dbInstance) {
      dbInstance.get(CVObjectStoreNames.MONITORED_SERVICE, 'monitoredService')?.then(data => {
        setCachedInitialValue(data?.currentData)
      })
    }
  }, [isInitializingDB, dbInstance])

  const setDBData = async (data: MonitoredServiceForm) => {
    try {
      await dbInstance?.put(CVObjectStoreNames.MONITORED_SERVICE, {
        monitoredService: 'monitoredService',
        currentData: data
      })
    } catch (e) {
      showWarning(e)
    }
  }

  const onDiscard = useCallback(() => {
    dbInstance?.clear(CVObjectStoreNames.MONITORED_SERVICE)
    setCachedInitialValue(initialValues)
  }, [initialValues])

  const onSuccess = useCallback(
    async (payload, tabId) => {
      try {
        await onSubmit({
          formikValues: payload,
          identifier,
          orgIdentifier,
          projectIdentifier,
          cachedInitialValues,
          updateMonitoredService,
          saveMonitoredService,
          fetchMonitoredService,
          setOverrideBlockNavigation
        })
        setCachedInitialValue(null)
        if (!identifier) {
          setselectedTabID(tabId)
        }
        showSuccess(
          getString(
            identifier ? 'cv.monitoredServices.monitoredServiceUpdated' : 'cv.monitoredServices.monitoredServiceCreated'
          )
        )

        if (redirectToSLO && sloIdentifier) {
          history.push({
            pathname: routes.toCVSLODetailsPage({
              accountId,
              orgIdentifier,
              projectIdentifier,
              identifier: sloIdentifier,
              module: 'cv'
            }),
            search: getSearchString({ tab: SLODetailsPageTabIds.Configurations, monitoredServiceIdentifier })
          })
        } else if (redirectToSLO) {
          history.push({
            pathname: routes.toCVCreateSLOs({ accountId, orgIdentifier, projectIdentifier, module: 'cv' }),
            search: monitoredServiceIdentifier ? `?monitoredServiceIdentifier=${monitoredServiceIdentifier}` : ''
          })
        }
      } catch (e) {
        showError(getErrorMessage(e))
        return e
      }
    },
    [identifier, redirectToSLO, sloIdentifier, history, monitoredServiceIdentifier]
  )

  const onNavigationChange = useCallback(
    nextLocation => {
      const currentPath = nextLocation.pathname
      const createPath = routes.toCVAddMonitoringServicesSetup({ ...accountPathProps, ...projectPathProps })
      const editPath = `${routes.toCVAddMonitoringServicesEdit({
        ...accountPathProps,
        ...projectPathProps,
        ...modulePathProps,
        ...editParams,
        module: 'cv'
      })}${getCVMonitoringServicesSearchParam({ tab: MonitoredServiceEnum.Configurations })}`
      const matchDefault = matchPath(currentPath, {
        path: identifier ? editPath : createPath,
        exact: true
      })
      return determineUnSaveState({
        cachedInitialValues,
        initialValues,
        overrideBlockNavigation,
        isExactPath: !!matchDefault?.isExact,
        selectedTabID,
        serviceTabformRef,
        dependencyTabformRef,
        getString
      })
    },
    [identifier, cachedInitialValues, initialValues, overrideBlockNavigation, selectedTabID]
  )

  if (identifier && errorFetchMonitoredService) {
    return <PageError message={getErrorMessage(errorFetchMonitoredService)} onClick={() => fetchMonitoredService()} />
  } else if (!identifier && errorFetchMonitoredServiceYAML) {
    return (
      <PageError
        message={getErrorMessage(errorFetchMonitoredServiceYAML)}
        onClick={() => fetchMonitoredServiceYAML()}
      />
    )
  }

  const ServiceComponent = isTemplate ? ServiceWithRef : Service
  const ServiceProps = isTemplate ? { ref: serviceRef } : {}

  return (
    <Container className={css.configurationTabs}>
      {(loadingGetMonitoredService || loadingFetchMonitoredServiceYAML || loadingUpdateMonitoredService) && (
        <PageSpinner />
      )}
      <ConfigurationContextProvider
        fetchMonitoredService={fetchMonitoredService}
        isTemplateByReference={Boolean(initialValues?.template?.isTemplateByReference)}
      >
        <ServiceComponent
          value={initialValues}
          {...ServiceProps}
          onSuccess={async payload => onSuccess(payload, getString('service'))}
          onDependencySuccess={async payload =>
            onSuccess(payload, getString('pipelines-studio.dependenciesGroupTitle'))
          }
          serviceTabformRef={serviceTabformRef}
          cachedInitialValues={!isTemplate ? cachedInitialValues : undefined}
          setDBData={setDBData}
          onDiscard={onDiscard}
          isTemplate={isTemplate}
          expressions={expressions}
          updateTemplate={updateTemplate}
          onChangeMonitoredServiceType={updatedDTO => {
            setDefaultMonitoredService(omit(updatedDTO, ['isEdit']) as MonitoredServiceDTO)
            setCachedInitialValue(updatedDTO)
            fetchMonitoredServiceYAML({
              queryParams: {
                orgIdentifier,
                projectIdentifier,
                accountId,
                type: updatedDTO.type
              }
            })
          }}
          config={config}
          dependencyTabformRef={dependencyTabformRef}
        />
      </ConfigurationContextProvider>
      {!isTemplate && (
        <NavigationCheck
          when={true}
          shouldBlockNavigation={onNavigationChange}
          navigate={newPath => {
            history.push(newPath)
          }}
        />
      )}
    </Container>
  )
}

export const ConfigurationsWithRef = React.forwardRef(Configurations)
