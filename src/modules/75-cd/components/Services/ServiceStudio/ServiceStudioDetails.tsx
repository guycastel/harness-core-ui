/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Classes, Expander, Menu, Position } from '@blueprintjs/core'
import {
  Container,
  Tabs,
  Tab,
  Button,
  ButtonVariation,
  Layout,
  PageSpinner,
  useToaster,
  VisualYamlSelectedView as SelectedView,
  Popover,
  shouldShowError,
  getErrorInfoFromErrorObject
} from '@harness/uicore'
import { parse } from 'yaml'
import { Color } from '@harness/design-system'
import { cloneDeep, defaultTo, get, isEmpty, omit, set, unset } from 'lodash-es'
import produce from 'immer'
import { yamlStringify, stringify } from '@common/utils/YamlHelperMethods'
import RbacMenuItem from '@rbac/components/MenuItem/MenuItem'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { TemplateErrorEntity } from '@pipeline/components/TemplateLibraryErrorHandling/utils'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { useStrings } from 'framework/strings'
import type { ProjectPathProps, ServicePathProps } from '@common/interfaces/RouteInterfaces'
import {
  CreateServiceV2QueryParams,
  NGServiceConfig,
  ResponseServiceResponse,
  ResponseValidateTemplateInputsResponseDTO,
  ServiceRequestDTO,
  ServiceResponseDTO,
  UpdateServiceV2QueryParams,
  useCreateServiceV2,
  useUpdateServiceV2,
  validateTemplateInputsPromise
} from 'services/cd-ng'
import type { PipelineInfoConfig } from 'services/pipeline-ng'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { useServiceContext } from '@cd/context/ServiceContext'
import { sanitize } from '@common/utils/JSONUtils'
import { queryClient } from 'services/queryClient'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { CDActions, Category } from '@common/constants/TrackingConstants'
import { StoreType } from '@common/constants/GitSyncTypes'
import { useSaveToGitDialog } from '@common/modals/SaveToGitDialog/useSaveToGitDialog'
import { GitData } from '@common/modals/GitDiffEditor/useGitDiffEditorDialog'
import useDiffDialog from '@modules/10-common/hooks/useDiffDialog'
import ServiceConfiguration from './ServiceConfiguration/ServiceConfiguration'
import { ServiceTabs, setNameIDDescription, ServicePipelineConfig } from '../utils/ServiceUtils'
import css from '@cd/components/Services/ServiceStudio/ServiceStudio.module.scss'

interface ServiceStudioDetailsProps {
  serviceData: NGServiceConfig & Pick<ServiceResponseDTO, 'storeType' | 'connectorRef' | 'entityGitDetails'>
  summaryPanel?: JSX.Element
  refercedByPanel?: JSX.Element
  invokeServiceHeaderRefetch?: () => void
}
function ServiceStudioDetails(props: ServiceStudioDetailsProps): React.ReactElement | null {
  const { getString } = useStrings()
  const { trackEvent } = useTelemetry()
  const { accountId, orgIdentifier, projectIdentifier, serviceId } = useParams<ProjectPathProps & ServicePathProps>()
  const [hasYamlValidationErrors, setHasYamlValidationErrors] = React.useState<boolean>(false)
  const { tab } = useQueryParams<{ tab: string }>()
  const { updateQueryParams } = useUpdateQueryParams()
  const {
    state: { pipeline, isUpdated, pipelineView, isLoading, storeMetadata = {}, originalPipeline },
    view,
    updatePipelineView,
    fetchPipeline,
    isReadonly
  } = usePipelineContext()

  const {
    isServiceEntityModalView,
    isServiceCreateModalView,
    onServiceCreate,
    onCloseModal,
    serviceResponse: serviceData,
    setIsDeploymentTypeDisabled,
    setServiceResponse
  } = useServiceContext()
  const [selectedTabId, setSelectedTabId] = useState(
    tab === ServiceTabs.SUMMARY && projectIdentifier ? ServiceTabs.SUMMARY : tab
  )
  const { showSuccess, showError, clear } = useToaster()
  const isSvcEnvEntityEnabled = useFeatureFlag(FeatureFlag.NG_SVC_ENV_REDESIGN)

  const [shouldShowOutOfSyncError, setShouldShowOutOfSyncError] = React.useState(false)
  const [validateTemplateInputsResponse, setValidateTemplateInputsResponse] =
    React.useState<ResponseValidateTemplateInputsResponseDTO>()

  const getOriginalServiceData = () => {
    const oldServiceDefinition = get(originalPipeline, 'stages[0].stage.spec.serviceConfig.serviceDefinition')
    return produce(props.serviceData, draft => {
      if (draft) {
        setNameIDDescription(draft.service as PipelineInfoConfig, originalPipeline as ServicePipelineConfig)
        set(draft, 'service.serviceDefinition', oldServiceDefinition)
      }
    })
  }

  const getFinalServiceData = useCallback(() => {
    let updatedService
    const isVisualView = view === SelectedView.VISUAL
    const newServiceDefinition = get(pipeline, 'stages[0].stage.spec.serviceConfig.serviceDefinition')
    if (!isVisualView) {
      updatedService = produce(props.serviceData, draft => {
        if (draft) {
          setNameIDDescription(draft.service as PipelineInfoConfig, pipeline as ServicePipelineConfig)
          set(draft, 'service.serviceDefinition', newServiceDefinition)
        }
      })
    }
    const finalServiceData = isVisualView ? props.serviceData : updatedService

    if (!get(finalServiceData, 'service.serviceDefinition.type')) {
      unset(finalServiceData?.service, 'serviceDefinition')
    }

    return finalServiceData
  }, [pipeline, props.serviceData, view])

  const afterUpdateHandler = (response: ResponseServiceResponse, finalServiceData?: NGServiceConfig): void => {
    if (response.status === 'SUCCESS') {
      const isManifestPresent = !isEmpty(finalServiceData?.service?.serviceDefinition?.spec?.manifests)
      isManifestPresent &&
        trackEvent(CDActions.CreateUpdateManifest, {
          category: Category.SERVICE
        })
      if (isServiceCreateModalView) {
        // We invalidate the service list call on creating a new service
        queryClient.invalidateQueries(['getServiceAccessList'])
      } else {
        // We invalidate the service inputs call on updating an existing service
        queryClient.invalidateQueries(['getServicesYamlAndRuntimeInputs'])
        queryClient.invalidateQueries(['getServicesYamlAndRuntimeInputsV2'])
      }
      const serviceResponse = response.data?.service
      if (isServiceEntityModalView) {
        onServiceCreate?.(
          {
            identifier: serviceResponse?.identifier as string,
            name: serviceResponse?.name as string
          },
          serviceResponse
        )
      } else {
        if (serviceResponse?.storeType === StoreType.REMOTE) {
          setServiceResponse?.(serviceResponse)
          updateQueryParams({ branch: serviceResponse?.entityGitDetails?.branch || '' })
          // For Remote we do not need these toaster as we show status in git save modal
        } else {
          showSuccess(
            isServiceEntityModalView && isServiceCreateModalView
              ? getString('common.serviceCreated')
              : getString('common.serviceUpdated')
          )
        }
        fetchPipeline()
        const newServiceDefinition = get(pipeline, 'stages[0].stage.spec.serviceConfig.serviceDefinition')
        setIsDeploymentTypeDisabled?.(!!newServiceDefinition.type)
      }
    } else {
      throw response
    }
  }
  const { open: openUnsavedChangesDiffModal } = useDiffDialog({
    originalYaml: stringify(omit(getOriginalServiceData(), ['storeType', 'connectorRef', 'entityGitDetails'])),
    updatedYaml: stringify(omit(getFinalServiceData(), ['storeType', 'connectorRef', 'entityGitDetails'])),
    title: getString('cd.serviceDefinitionDiffTitle', {
      serviceId: props.serviceData.service?.identifier
    })
  })

  const { openSaveToGitDialog } = useSaveToGitDialog({
    onSuccess: (gitData: GitData, servicePayload?: ServiceRequestDTO): Promise<ResponseServiceResponse> => {
      const { connectorRef, repoName, branch, filePath } = storeMetadata
      const createUpdatePromise = isServiceCreateModalView
        ? createService(
            { ...servicePayload, orgIdentifier, projectIdentifier },
            {
              queryParams: {
                accountIdentifier: accountId,
                storeType: StoreType.REMOTE,
                connectorRef,
                repoName,
                isNewBranch: gitData?.isNewBranch,
                filePath,
                ...(gitData?.isNewBranch ? { baseBranch: branch, branch: gitData?.branch } : { branch }),
                commitMsg: gitData?.commitMsg
              } as CreateServiceV2QueryParams
            }
          )
        : updateService(
            { ...servicePayload, orgIdentifier, projectIdentifier },
            {
              queryParams: {
                accountIdentifier: accountId,
                storeType: StoreType.REMOTE,
                connectorRef,
                repoName,
                isNewBranch: gitData?.isNewBranch,
                filePath,
                ...(gitData?.isNewBranch
                  ? { baseBranch: serviceData?.entityGitDetails?.branch, branch: gitData?.branch }
                  : { branch: serviceData?.entityGitDetails?.branch }),
                commitMsg: gitData?.commitMsg,
                lastObjectId: serviceData?.entityGitDetails?.objectId,
                lastCommitId: serviceData?.entityGitDetails?.commitId,
                resolvedConflictCommitId: gitData?.resolvedConflictCommitId
              } as unknown as UpdateServiceV2QueryParams
            }
          )

      return createUpdatePromise.then(response => {
        afterUpdateHandler(response, getFinalServiceData())
        return response
      })
    }
  })

  const handleTabChange = useCallback(
    (nextTab: ServiceTabs): void => {
      setSelectedTabId(nextTab)
      updateQueryParams({ tab: nextTab })
    },
    [updateQueryParams]
  )

  const { mutate: createService } = useCreateServiceV2({
    queryParams: {
      accountIdentifier: accountId
    },
    requestOptions: {
      headers: {
        'content-type': 'application/yaml'
      }
    }
  })
  const { mutate: updateService } = useUpdateServiceV2({
    queryParams: {
      accountIdentifier: accountId
    },
    requestOptions: {
      headers: {
        'content-type': 'application/yaml'
      }
    }
  })

  const validateServiceReconcile = async (): Promise<void> => {
    clear()
    try {
      const response = await validateTemplateInputsPromise({
        queryParams: {
          accountIdentifier: accountId,
          orgIdentifier,
          projectIdentifier,
          identifier: serviceId,
          branch: serviceData?.entityGitDetails?.branch
        }
      })
      if (response?.data?.validYaml === false && response?.data?.errorNodeSummary) {
        setValidateTemplateInputsResponse(response)
        setShouldShowOutOfSyncError(true)
      } else {
        showSuccess(
          getString('pipeline.outOfSyncErrorStrip.noErrorText', {
            entity: TemplateErrorEntity.SERVICE
          })
        )
        setShouldShowOutOfSyncError(false)
      }
    } catch (reconcileValidateError) {
      if (reconcileValidateError && shouldShowError(reconcileValidateError)) {
        showError(getErrorInfoFromErrorObject(reconcileValidateError))
      }
    }
  }

  const handleReconcileClick = () => {
    validateServiceReconcile()
    showSuccess(getString('pipeline.outOfSyncErrorStrip.reconcileStarted'))
  }

  const updateAndPublishReconciledService = async (reconciledServiceYaml: string): Promise<void> => {
    clear()
    const reconciledService = parse(reconciledServiceYaml) as NGServiceConfig
    const body = {
      ...omit(cloneDeep(reconciledService?.service), 'serviceDefinition', 'gitOpsEnabled'),
      projectIdentifier: isServiceCreateModalView ? projectIdentifier : serviceData?.projectIdentifier,
      orgIdentifier: isServiceCreateModalView ? orgIdentifier : serviceData?.orgIdentifier,
      //serviceId is not present in queryParam when service is created in pipeline studio.
      identifier: defaultTo(serviceId, reconciledService?.service?.identifier),
      yaml: reconciledServiceYaml
    }

    try {
      const response = await updateService(body)
      if (response.status === 'SUCCESS') {
        // We invalidate the service inputs call on updating an existing service
        queryClient.invalidateQueries(['getServicesYamlAndRuntimeInputs'])

        showSuccess(getString('common.serviceUpdated'))
        setShouldShowOutOfSyncError(false)
        fetchPipeline()
        setIsDeploymentTypeDisabled?.(!!reconciledService.service?.serviceDefinition?.type)
      } else {
        throw response
      }
    } catch (err) {
      showError(getErrorInfoFromErrorObject(err))
    }
    // this is for refetching serviceHeader API for updating "last updated" time after "saveAndPublishService" action
    props.invokeServiceHeaderRefetch?.()
  }

  const saveAndPublishService = async (): Promise<void> => {
    clear()
    const finalServiceData = getFinalServiceData()
    if (!finalServiceData?.service?.name) {
      return
    }

    const finalServiceDataForYAML = omit(finalServiceData, ['storeType', 'connectorRef', 'entityGitDetails'])

    const body = {
      ...omit(cloneDeep(finalServiceData?.service), 'serviceDefinition', 'gitOpsEnabled'),
      projectIdentifier: isServiceCreateModalView ? projectIdentifier : serviceData?.projectIdentifier,
      orgIdentifier: isServiceCreateModalView ? orgIdentifier : serviceData?.orgIdentifier,
      //serviceId is not present in queryParam when service is created in pipeline studio.
      identifier: defaultTo(serviceId, finalServiceData?.service?.identifier),
      yaml: yamlStringify(
        sanitize({ ...finalServiceDataForYAML }, { removeEmptyObject: false, removeEmptyString: false })
      )
    }

    try {
      if (storeMetadata?.storeType === StoreType.REMOTE) {
        openSaveToGitDialog({
          isEditing: !isServiceCreateModalView,
          resource: {
            type: 'Service',
            name: finalServiceData?.service.name,
            identifier: body.identifier,
            gitDetails: isServiceCreateModalView ? finalServiceData.entityGitDetails : serviceData.entityGitDetails,
            storeMetadata: {
              storeType: storeMetadata?.storeType,
              connectorRef: storeMetadata?.connectorRef
            }
          },
          payload: body
        })
      } else {
        const response = isServiceCreateModalView ? await createService(body) : await updateService(body)
        afterUpdateHandler(response, finalServiceData)
      }
    } catch (e: any) {
      showError(e?.data?.message || e?.message || getString('commonError'))
    }

    // this is for refetching serviceHeader API for updating "last updated" time after "saveAndPublishService" action
    props.invokeServiceHeaderRefetch?.()
  }

  if (isLoading) {
    return (
      <React.Fragment>
        <PageSpinner fixed />
        <div /> {/* this empty div is required for rendering layout correctly */}
      </React.Fragment>
    )
  }

  if (isSvcEnvEntityEnabled) {
    if (isServiceEntityModalView) {
      return (
        <>
          <Container background={Color.FORM_BG} padding={{ right: 'medium', left: 'huge' }}>
            <ServiceConfiguration
              setHasYamlValidationErrors={setHasYamlValidationErrors}
              serviceData={props.serviceData}
            />
          </Container>
          <Layout.Horizontal
            className={css.stickyBtnContainer}
            spacing="medium"
            padding={{ top: 'xlarge', left: 'huge', bottom: 'large' }}
          >
            <Button
              variation={ButtonVariation.PRIMARY}
              disabled={!isUpdated || hasYamlValidationErrors}
              text={getString('save')}
              onClick={saveAndPublishService}
              className={css.saveButton}
            />
            <Button text={getString('cancel')} variation={ButtonVariation.TERTIARY} onClick={onCloseModal} />
          </Layout.Horizontal>
        </>
      )
    }

    return (
      <Container className={css.tabsContainer}>
        <Tabs id="serviceDetailsTab" selectedTabId={selectedTabId} onChange={handleTabChange}>
          {projectIdentifier && (
            <Tab id={ServiceTabs.SUMMARY} title={getString('summary')} panel={props.summaryPanel} />
          )}

          <Tab
            id={ServiceTabs.Configuration}
            title={getString('configuration')}
            panel={
              <ServiceConfiguration
                setHasYamlValidationErrors={setHasYamlValidationErrors}
                serviceData={props.serviceData}
                shouldShowOutOfSyncError={shouldShowOutOfSyncError}
                setShouldShowOutOfSyncError={(value: boolean) => setShouldShowOutOfSyncError(value)}
                validateTemplateInputsResponse={validateTemplateInputsResponse}
                updateServicePostReconcile={reconciledServiceYaml =>
                  updateAndPublishReconciledService(reconciledServiceYaml)
                }
              />
            }
          />

          <Tab id={ServiceTabs.REFERENCED_BY} title={getString('referencedBy')} panel={props.refercedByPanel} />
          {/* <Tab id={ServiceTabs.ActivityLog} title={getString('activityLog')} panel={<></>} /> */}
          <Expander />
          {selectedTabId === ServiceTabs.Configuration && (
            <Layout.Horizontal className={css.btnContainer}>
              {isUpdated && !isReadonly && (
                <Button
                  variation={ButtonVariation.LINK}
                  className={css.tagRender}
                  onClick={openUnsavedChangesDiffModal}
                >
                  {getString('unsavedChanges')}
                </Button>
              )}
              <Button
                variation={ButtonVariation.PRIMARY}
                disabled={!isUpdated || hasYamlValidationErrors}
                text={getString('save')}
                onClick={saveAndPublishService}
                className={css.saveButton}
              />
              <Button
                disabled={!isUpdated}
                onClick={() => {
                  updatePipelineView({ ...pipelineView, isYamlEditable: false })
                  fetchPipeline()
                }}
                className={css.discardBtn}
                variation={ButtonVariation.SECONDARY}
                text={getString('pipeline.discard')}
              />
              <Popover className={Classes.DARK} position={Position.LEFT}>
                <Button variation={ButtonVariation.ICON} icon="Options" aria-label="service studio menu actions" />
                <Menu style={{ backgroundColor: 'unset' }}>
                  <RbacMenuItem
                    icon="refresh"
                    text={getString('pipeline.outOfSyncErrorStrip.reconcile')}
                    disabled={isReadonly}
                    onClick={handleReconcileClick}
                    permission={{
                      permission: PermissionIdentifier.EDIT_SERVICE,
                      resource: {
                        resourceType: ResourceType.SERVICE,
                        resourceIdentifier: serviceId
                      },
                      resourceScope: {
                        accountIdentifier: accountId,
                        orgIdentifier: serviceData?.orgIdentifier,
                        projectIdentifier: serviceData?.projectIdentifier
                      }
                    }}
                  />
                </Menu>
              </Popover>
            </Layout.Horizontal>
          )}
        </Tabs>
      </Container>
    )
  }

  return (
    <Container padding={{ left: 'xlarge', right: 'xlarge' }} className={css.tabsContainer}>
      <Tabs id="serviceDetailsTab" selectedTabId={selectedTabId} onChange={handleTabChange}>
        {projectIdentifier && <Tab id={ServiceTabs.SUMMARY} title={getString('summary')} panel={props.summaryPanel} />}
        <Tab id={ServiceTabs.REFERENCED_BY} title={getString('referencedBy')} panel={props.refercedByPanel} />
      </Tabs>
    </Container>
  )
}

export default ServiceStudioDetails
