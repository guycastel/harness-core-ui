/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect } from 'react'
import {
  ButtonSize,
  ButtonVariation,
  getMultiTypeFromValue,
  Layout,
  MultiTypeInputType,
  FormikForm,
  AllowedTypes,
  Toggle,
  useToaster,
  Container,
  useToggleOpen,
  ConfirmationDialog,
  RUNTIME_INPUT_VALUE,
  SelectOption,
  ModalDialog
} from '@harness/uicore'
import type { ModalDialogProps } from '@harness/uicore/dist/components/ModalDialog/ModalDialog'
import { defaultTo, get, isEmpty, isNil } from 'lodash-es'
import { useFormikContext } from 'formik'
import { Intent } from '@blueprintjs/core'
import produce from 'immer'
import { useParams } from 'react-router-dom'
import { WritableDraft } from 'immer/dist/types/types-external'
import { JsonNode, mergeServiceInputsPromise, ServiceYaml, useGetSettingsList } from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import RbacButton from '@rbac/components/Button/Button'
import ServiceEntityEditModal from '@cd/components/Services/ServiceEntityEditModal/ServiceEntityEditModal'
import type { ServiceDeploymentType } from '@pipeline/utils/stageHelpers'
import { isValueExpression, isValueRuntimeInput } from '@common/utils/utils'
import { yamlParse, yamlStringify } from '@common/utils/YamlHelperMethods'
import { sanitize } from '@common/utils/JSONUtils'
import type { PipelinePathProps } from '@common/interfaces/RouteInterfaces'
import { getAllowableTypesWithoutExpression } from '@pipeline/utils/runPipelineUtils'
import { usePipelineVariables } from '@pipeline/components/PipelineVariablesContext/PipelineVariablesContext'
import { MultiTypeServiceField } from '@pipeline/components/FormMultiTypeServiceFeild/FormMultiTypeServiceFeild'
import { useDeepCompareEffect } from '@common/hooks'
import { getScopedValueFromDTO } from '@common/components/EntityReference/EntityReference.types'
import { getScopeFromValue } from '@common/components/EntityReference/EntityReference'
import { Scope } from '@common/interfaces/SecretsInterface'
import { FormMultiTypeCheckboxField } from '@common/components/MultiTypeCheckbox/MultiTypeCheckbox'
import type { Error, ServiceResponseDTO } from 'services/cd-ng'
import { ErrorHandler } from '@modules/10-common/components/ErrorHandler/ErrorHandler'
import { StoreType } from '@modules/10-common/constants/GitSyncTypes'
import useRBACError from '@modules/20-rbac/utils/useRBACError/useRBACError'
import { getDefaultStoreTypeFromSettings, getSettingValue } from '@modules/27-platform/default-settings/utils/utils'
import { SettingType } from '@modules/10-common/constants/Utils'
import {
  DeployServiceEntityData,
  DeployServiceEntityCustomProps,
  FormState,
  getAllFixedServices,
  ServicesWithInputs,
  getAllFixedServicesGitBranch
} from './DeployServiceEntityUtils'
import { ServiceEntitiesList } from './ServiceEntitiesList/ServiceEntitiesList'
import { setupMode } from '../PipelineStepsUtil'
import type { UseGetServicesDataReturn } from './useGetServicesData'
import css from './DeployServiceEntityStep.module.scss'

export interface BaseDeployServiceEntityProps extends DeployServiceEntityCustomProps {
  initialValues: DeployServiceEntityData
  readonly: boolean
  allowableTypes: AllowedTypes
  serviceLabel?: string
  serviceInputType: MultiTypeInputType
  setServiceInputType: React.Dispatch<React.SetStateAction<MultiTypeInputType>>
  setIsFetchingMergeServiceInputs: React.Dispatch<React.SetStateAction<boolean>>
  loading: boolean
  useGetServicesDataReturn: UseGetServicesDataReturn
  allServices: string[]
  setAllServices: React.Dispatch<React.SetStateAction<string[]>>
  allServicesGitBranches?: Record<string, string | undefined>
  setAllServicesGitBranches?: (gitBranches?: Record<string, string | undefined>) => void
}

const DIALOG_PROPS: Omit<ModalDialogProps, 'isOpen'> = {
  usePortal: true,
  autoFocus: true,
  canEscapeKeyClose: false,
  canOutsideClickClose: false,
  enforceFocus: false,
  className: css.editServiceDialog,
  lazy: true,
  height: 840,
  width: 1114
}

export default function BaseDeployServiceEntity({
  initialValues,
  readonly,
  allowableTypes,
  setupModeType,
  serviceLabel,
  stageIdentifier,
  deploymentType,
  gitOpsEnabled,
  deploymentMetadata,
  serviceInputType,
  setServiceInputType,
  setIsFetchingMergeServiceInputs,
  loading,
  useGetServicesDataReturn,
  allServices,
  setAllServices,
  setAllServicesGitBranches
}: BaseDeployServiceEntityProps): React.ReactElement {
  const { values, setValues, setTouched } = useFormikContext<FormState>()
  const { prependServiceToServiceList, updatingData, servicesList, servicesData, remoteFetchError } =
    useGetServicesDataReturn
  const remoteFetchErrorMessages = (remoteFetchError as Error)?.responseMessages
  const { getString } = useStrings()
  const { CDS_SERVICE_GITX } = useFeatureFlags()
  const { expressions } = useVariablesExpression()
  const { refetchPipelineVariable } = usePipelineVariables()
  const { showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()

  const { isOpen: isAddNewModalOpen, open: openAddNewModal, close: closeAddNewModal } = useToggleOpen()
  const {
    isOpen: isSwitchToMultiSvcDialogOpen,
    open: openSwitchToMultiSvcDialog,
    close: closeSwitchToMultiSvcDialog
  } = useToggleOpen()
  const {
    isOpen: isSwitchToMultiSvcClearDialogOpen,
    open: openSwitchToMultiSvcClearDialog,
    close: closeSwitchToMultiSvcClearDialog
  } = useToggleOpen()
  const {
    isOpen: isSwitchToSingleSvcDialogOpen,
    open: openSwitchToSingleSvcDialog,
    close: closeSwitchToSingleSvcDialog
  } = useToggleOpen()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<PipelinePathProps>()

  const {
    data: gitXSetting,
    error: gitXSettingError,
    loading: loadingSetting
  } = useGetSettingsList({
    queryParams: {
      category: 'GIT_EXPERIENCE',
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    },
    lazy: !CDS_SERVICE_GITX
  })

  React.useEffect(() => {
    if (!loadingSetting && gitXSettingError) {
      showError(getRBACErrorMessage(gitXSettingError))
    }
  }, [gitXSettingError, showError, loadingSetting])

  useDeepCompareEffect(() => {
    /* istanbul ignore else */
    if (setupModeType === setupMode.PROPAGATE) {
      setAllServices(getAllFixedServices(initialValues))
      setAllServicesGitBranches?.(getAllFixedServicesGitBranch(initialValues))
    }
  }, [initialValues, setupModeType])

  const updateServiceInputsForServices = React.useCallback(
    (
      serviceOrServices: Pick<FormState, 'service' | 'services'>,
      serviceGitBranches?: FormState['serviceGitBranches']
    ): void => {
      /* istanbul ignore else */
      if (servicesData.length > 0) {
        /* istanbul ignore else */
        if (serviceOrServices.service) {
          const service = servicesData.find(svc => getScopedValueFromDTO(svc.service) === serviceOrServices.service)
          setValues({
            ...values,
            ...serviceOrServices,
            serviceGitBranches,
            // if service input is not found, add it, else use the existing one
            serviceInputs: {
              [serviceOrServices.service]: get(
                values.serviceInputs,
                [serviceOrServices.service],
                service?.serviceInputs
              )
            }
          })
          /* istanbul ignore else */
        } else if (Array.isArray(serviceOrServices.services)) {
          const updatedServices = serviceOrServices.services.reduce<ServicesWithInputs>(
            (p, c) => {
              const service = servicesData.find(svc => getScopedValueFromDTO(svc.service) === c.value)

              if (service) {
                p.services.push({ label: service.service.name, value: c.value })
                // if service input is not found, add it, else use the existing one
                const serviceInputs = get(values.serviceInputs, [c.value], service?.serviceInputs)

                p.serviceInputs[c.value as string] = serviceInputs
              } else {
                p.services.push(c)
              }

              return p
            },
            { services: [], serviceInputs: {}, parallel: values.parallel }
          )

          setValues(updatedServices)
        }
      }
    },
    [servicesData, values?.serviceGitBranches]
  )

  const handleSingleSelectChange = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service: any, serviceGitBranches?: FormState['serviceGitBranches']) => {
      updateServiceInputsForServices({ service: service.value || service }, serviceGitBranches)
    },
    [updateServiceInputsForServices]
  )

  const handleMultiSelectChange = React.useCallback(
    (services: SelectOption[], serviceGitBranches?: FormState['serviceGitBranches']) => {
      updateServiceInputsForServices({ services }, serviceGitBranches)
    },
    [updateServiceInputsForServices]
  )

  useEffect(() => {
    /* istanbul ignore else */
    if (!loading) {
      // update services in formik
      updateServiceInputsForServices(values)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, servicesList, servicesData])

  function appendServiceBranch(draft: WritableDraft<FormState>, service?: ServiceResponseDTO): void {
    if (service?.storeType === StoreType.REMOTE) {
      const scopedServiceRef = getScopedValueFromDTO({
        projectIdentifier,
        orgIdentifier,
        identifier: service.identifier
      })
      draft.serviceGitBranches = draft.serviceGitBranches || {}
      draft.serviceGitBranches[scopedServiceRef] = service?.entityGitDetails?.branch
    }
  }

  function onServiceEntityCreate(newServiceInfo: ServiceYaml, service?: ServiceResponseDTO): void {
    closeAddNewModal()

    // prepend the new service in the list
    prependServiceToServiceList(newServiceInfo)

    // add the new service to selection
    /* istanbul ignore else */

    const scopedServiceRef = getScopedValueFromDTO({
      projectIdentifier,
      orgIdentifier,
      identifier: newServiceInfo.identifier
    })
    if (values.services) {
      setValues(
        produce(values, draft => {
          /* istanbul ignore else */
          if (Array.isArray(draft.services)) {
            draft.services.push({ label: newServiceInfo.name, value: scopedServiceRef })
          }
          appendServiceBranch(draft, service)
        })
      )
    } else {
      setValues(
        produce(values, draft => {
          draft.service = scopedServiceRef
          appendServiceBranch(draft, service)
        })
      )
    }
  }

  async function onServiceEntityUpdate(updatedService: ServiceYaml): Promise<void> {
    const scopedValue = getScopedValueFromDTO(updatedService)
    const scope = getScopeFromValue(scopedValue)
    const body = {
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier: scope !== Scope.ACCOUNT ? orgIdentifier : undefined,
        projectIdentifier: scope === Scope.PROJECT ? projectIdentifier : undefined
      },
      serviceIdentifier: updatedService.identifier,
      pathParams: { serviceIdentifier: updatedService.identifier },
      body: yamlStringify(
        sanitize(
          { serviceInputs: { ...get(values, `serviceInputs.['${scopedValue}']`) } },
          { removeEmptyObject: false, removeEmptyString: false }
        )
      )
    }

    // Introduced this loading state so that ServiceEntitiesList's JSX is mounted
    // only after mergeServiceInputsPromise returns data
    setIsFetchingMergeServiceInputs(true)
    refetchPipelineVariable?.()
    const response = await mergeServiceInputsPromise(body)
    const mergedServiceInputsResponse = response.data
    setValues({
      ...values,
      serviceInputs: {
        [updatedService.identifier]: yamlParse<JsonNode>(
          defaultTo(mergedServiceInputsResponse?.mergedServiceInputsYaml, '')
        )?.serviceInputs
      }
    })
    setIsFetchingMergeServiceInputs(false)
  }

  function updateValuesInFormikAndPropagate(newValues: FormState): void {
    setTouched({ service: true, services: true })
    setValues(newValues)
  }

  function handleSwitchToMultiSvcConfirmation(confirmed: boolean): void {
    /* istanbul ignore else */
    if (confirmed) {
      const singleSvcId = values.service
      const singleSvc = servicesData.find(svc => getScopedValueFromDTO(svc.service) === singleSvcId)?.service
      const newValues = produce(values, draft => {
        draft.services = singleSvc
          ? [{ label: singleSvc.name, value: singleSvcId }]
          : isValueRuntimeInput(singleSvcId)
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (RUNTIME_INPUT_VALUE as any)
          : []
        delete draft.service
      })

      setServiceInputType(getMultiTypeFromValue(singleSvcId))
      updateValuesInFormikAndPropagate(newValues)
    }

    closeSwitchToMultiSvcDialog()
  }

  function handleSwitchToMultiSvcClearConfirmation(confirmed: boolean): void {
    /* istanbul ignore else */
    if (confirmed) {
      const newValues = produce(values, draft => {
        draft.parallel = true
        draft.services = []
        draft.serviceInputs = {}
        delete draft.service
      })

      setServiceInputType(MultiTypeInputType.FIXED)
      updateValuesInFormikAndPropagate(newValues)
    }

    closeSwitchToMultiSvcClearDialog()
  }

  function handleSwitchToSingleSvcConfirmation(confirmed: boolean): void {
    /* istanbul ignore else */
    if (confirmed) {
      const newValues = produce(values, draft => {
        draft.service = ''
        delete draft.services
      })
      updateValuesInFormikAndPropagate(newValues)
    }

    closeSwitchToSingleSvcDialog()
  }

  function removeSvcfromList(toDelete: string): void {
    const newValues = produce(values, draft => {
      /* istanbul ignore else */
      if (draft.service) {
        draft.service = ''
        delete draft.services
      } else if (Array.isArray(draft.services)) {
        draft.services = draft.services.filter(svc => svc.value !== toDelete)
        delete draft.service
      }
    })
    updateValuesInFormikAndPropagate(newValues)
  }

  function getMultiSvcToggleHandler(checked: boolean): void {
    if (checked) {
      // open confirmation dialog only if a service is populated
      if (values.service) {
        if (isValueExpression(values.service)) {
          openSwitchToMultiSvcClearDialog()
        } else {
          openSwitchToMultiSvcDialog()
        }
      } else {
        handleSwitchToMultiSvcConfirmation(true)
      }
    } else {
      // open confirmation dialog only if atleast one service is populated
      if (isEmpty(values.services)) {
        handleSwitchToSingleSvcConfirmation(true)
      } else {
        openSwitchToSingleSvcDialog()
      }
    }
  }

  const isMultiSvc = !isNil(values.services)
  const isPropagatedFromMultiServiceStage = isMultiSvc && setupModeType === setupMode.PROPAGATE
  const isFixed = isMultiSvc ? Array.isArray(values.services) : serviceInputType === MultiTypeInputType.FIXED
  let placeHolderForServices =
    Array.isArray(values.services) && !isEmpty(values.services)
      ? getString('services')
      : getString('cd.pipelineSteps.serviceTab.selectServices')
  const placeHolderForService = loading ? getString('loading') : getString('cd.pipelineSteps.serviceTab.selectService')

  /* istanbul ignore else */
  if (loading) {
    placeHolderForServices = getString('loading')
  }

  return (
    <>
      <FormikForm>
        {setupModeType === setupMode.DIFFERENT && (
          <>
            <Layout.Horizontal
              className={css.formRow}
              spacing="medium"
              margin={{ bottom: 'medium' }}
              flex={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
            >
              <Layout.Horizontal spacing="medium" flex={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                {isMultiSvc ? (
                  <>
                    <MultiTypeServiceField
                      name="services"
                      label={defaultTo(serviceLabel, getString('cd.pipelineSteps.serviceTab.specifyYourServices'))}
                      deploymentType={deploymentType as ServiceDeploymentType}
                      gitOpsEnabled={gitOpsEnabled}
                      deploymentMetadata={deploymentMetadata}
                      disabled={readonly || (isFixed && loading)}
                      placeholder={placeHolderForServices}
                      openAddNewModal={openAddNewModal}
                      isMultiSelect={true}
                      isNewConnectorLabelVisible
                      onMultiSelectChange={handleMultiSelectChange}
                      width={300}
                      multiTypeProps={{
                        expressions,
                        allowableTypes: getAllowableTypesWithoutExpression(allowableTypes),
                        onTypeChange: setServiceInputType
                      }}
                    />
                  </>
                ) : (
                  <div className={css.inputFieldLayout}>
                    <MultiTypeServiceField
                      name="service"
                      label={defaultTo(serviceLabel, getString('cd.pipelineSteps.serviceTab.specifyYourService'))}
                      deploymentType={deploymentType as ServiceDeploymentType}
                      gitOpsEnabled={gitOpsEnabled}
                      deploymentMetadata={deploymentMetadata}
                      placeholder={placeHolderForService}
                      setRefValue={true}
                      disabled={readonly || (isFixed && loading)}
                      openAddNewModal={openAddNewModal}
                      isNewConnectorLabelVisible
                      onChange={handleSingleSelectChange}
                      width={300}
                      multiTypeProps={{
                        expressions,
                        allowableTypes,
                        defaultValueToReset: '',
                        onTypeChange: setServiceInputType
                      }}
                    />
                  </div>
                )}
                {isFixed ? (
                  <RbacButton
                    size={ButtonSize.SMALL}
                    icon={'plus'}
                    text={getString('cd.addService')}
                    variation={ButtonVariation.LINK}
                    data-testid="add-new-service"
                    disabled={readonly}
                    className={css.serviceActionWrapper}
                    permission={{
                      permission: PermissionIdentifier.EDIT_SERVICE,
                      resource: {
                        resourceType: ResourceType.SERVICE
                      }
                    }}
                    onClick={openAddNewModal}
                  />
                ) : null}
              </Layout.Horizontal>
              <Toggle
                className={css.serviceActionWrapper}
                checked={isMultiSvc}
                onToggle={getMultiSvcToggleHandler}
                label={getString('cd.pipelineSteps.serviceTab.multiServicesText')}
                tooltipId={'multiServiceToggle'}
              />
            </Layout.Horizontal>

            {isMultiSvc ? (
              <FormMultiTypeCheckboxField
                label={getString('cd.pipelineSteps.serviceTab.multiServicesParallelDeployLabel')}
                name="parallel"
                multiTypeTextbox={{
                  allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME],
                  width: 300
                }}
                style={{ width: '300px' }}
              />
            ) : null}
          </>
        )}
        {isPropagatedFromMultiServiceStage && (
          <Layout.Horizontal
            className={css.propagatedFromMultiServiceStageContainer}
            flex={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Container>
              <FormMultiTypeCheckboxField
                label={getString('cd.pipelineSteps.serviceTab.multiServicesParallelDeployLabel')}
                name="parallel"
                multiTypeTextbox={{
                  allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME],
                  width: 300
                }}
                style={{ width: '300px' }}
              />
            </Container>
            <Container>
              <Toggle
                className={css.multiServiceToggle}
                checked={true}
                label={getString('cd.pipelineSteps.serviceTab.multiServicesText')}
                tooltipId={'multiServiceToggle'}
                disabled={true}
              />
            </Container>
          </Layout.Horizontal>
        )}

        {isFixed || setupModeType === setupMode.PROPAGATE ? (
          <ServiceEntitiesList
            loading={loading || updatingData}
            servicesData={allServices.length > 0 ? servicesData : []}
            gitOpsEnabled={gitOpsEnabled}
            deploymentMetadata={deploymentMetadata}
            readonly={readonly}
            onRemoveServiceFormList={removeSvcfromList}
            selectedDeploymentType={deploymentType as ServiceDeploymentType}
            stageIdentifier={stageIdentifier}
            allowableTypes={allowableTypes}
            onServiceEntityUpdate={onServiceEntityUpdate}
            isPropogateFromStage={setupModeType === setupMode.PROPAGATE}
          />
        ) : null}
        {remoteFetchErrorMessages?.length ? (
          <Layout.Vertical>
            <ErrorHandler responseMessages={remoteFetchErrorMessages} />
          </Layout.Vertical>
        ) : null}
      </FormikForm>

      <ModalDialog
        isOpen={isAddNewModalOpen}
        onClose={closeAddNewModal}
        title={getString('newService')}
        showOverlay={loadingSetting}
        {...DIALOG_PROPS}
      >
        <ServiceEntityEditModal
          selectedDeploymentType={deploymentType as ServiceDeploymentType}
          gitOpsEnabled={gitOpsEnabled}
          isGitXEnforced={getSettingValue(gitXSetting, SettingType.ENFORCE_GIT_EXPERIENCE) === 'true'}
          defaultStoreType={CDS_SERVICE_GITX ? getDefaultStoreTypeFromSettings(gitXSetting) : undefined}
          deploymentMetadata={deploymentMetadata}
          onCloseModal={closeAddNewModal}
          onServiceCreate={onServiceEntityCreate}
          isServiceCreateModalView={true}
        />
      </ModalDialog>
      <ConfirmationDialog
        isOpen={isSwitchToMultiSvcDialogOpen}
        titleText={getString('cd.pipelineSteps.serviceTab.multiServicesTitleText')}
        contentText={getString('cd.pipelineSteps.serviceTab.multiServicesConfirmationText')}
        confirmButtonText={getString('applyChanges')}
        cancelButtonText={getString('cancel')}
        onClose={handleSwitchToMultiSvcConfirmation}
        intent={Intent.WARNING}
      />
      <ConfirmationDialog
        isOpen={isSwitchToMultiSvcClearDialogOpen}
        titleText={getString('cd.pipelineSteps.serviceTab.multiServicesTitleText')}
        contentText={getString('cd.pipelineSteps.serviceTab.multiServicesClearConfirmationText')}
        confirmButtonText={getString('applyChanges')}
        cancelButtonText={getString('cancel')}
        onClose={handleSwitchToMultiSvcClearConfirmation}
        intent={Intent.WARNING}
      />
      <ConfirmationDialog
        isOpen={isSwitchToSingleSvcDialogOpen}
        titleText={getString('cd.pipelineSteps.serviceTab.singleServicesTitleText')}
        contentText={getString('cd.pipelineSteps.serviceTab.singleServicesConfirmationText')}
        confirmButtonText={getString('applyChanges')}
        cancelButtonText={getString('cancel')}
        onClose={handleSwitchToSingleSvcConfirmation}
        intent={Intent.WARNING}
      />
    </>
  )
}
