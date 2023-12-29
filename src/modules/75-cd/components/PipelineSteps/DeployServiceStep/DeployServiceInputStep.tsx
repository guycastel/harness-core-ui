/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import {
  Button,
  ButtonSize,
  ButtonVariation,
  getMultiTypeFromValue,
  Layout,
  MultiTypeInputType,
  SelectOption,
  ModalDialog
} from '@harness/uicore'
import { useModalHook } from '@harness/use-modal'
import { defaultTo, isEmpty } from 'lodash-es'
import { useParams } from 'react-router-dom'
import { connect } from 'formik'
import { ServiceRequestDTO, useGetServiceAccessList, useGetSettingsList } from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import type { PipelineType } from '@common/interfaces/RouteInterfaces'
import { useToaster } from '@common/exports'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { usePermission } from '@rbac/hooks/usePermission'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { getDefaultStoreTypeFromSettings, getSettingValue } from '@modules/27-platform/default-settings/utils/utils'
import { SettingType } from '@modules/10-common/constants/Utils'
import type { DeployServiceProps, DeployServiceState } from './DeployServiceInterface'
import ExperimentalInput from '../K8sServiceSpec/K8sServiceSpecForms/ExperimentalInput'
import { isEditService } from './DeployServiceUtils'
import { NewEditServiceModal } from './NewEditServiceModal'
import css from './DeployServiceStep.module.scss'

const DeployServiceInputStep: React.FC<DeployServiceProps & { formik?: any }> = ({
  inputSetData,
  initialValues,
  formik,
  allowableTypes
}) => {
  const { getString } = useStrings()
  const { CDS_SERVICE_GITX } = useFeatureFlags()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<
    PipelineType<{
      orgIdentifier: string
      projectIdentifier: string
      pipelineIdentifier: string
      accountId: string
    }>
  >()

  const { showError, clear } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const { expressions } = useVariablesExpression()
  const [showOverlay, setShowOverlay] = useState(false)
  const {
    data: serviceResponse,
    error,
    refetch
  } = useGetServiceAccessList({
    queryParams: { accountIdentifier: accountId, orgIdentifier, projectIdentifier }
  })

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

  const [services, setService] = React.useState<SelectOption[]>([])

  React.useEffect(() => {
    if (serviceResponse?.data?.length) {
      setService(
        serviceResponse.data.map(service => ({
          label: service.service?.name || '',
          value: service.service?.identifier || ''
        }))
      )
    }
  }, [serviceResponse, serviceResponse?.data?.length])

  const [canEdit] = usePermission({
    resource: {
      resourceType: ResourceType.SERVICE,
      resourceIdentifier: services[0]?.value as string
    },
    permissions: [PermissionIdentifier.EDIT_SERVICE],
    options: {
      skipCondition: ({ resourceIdentifier }) => !resourceIdentifier
    }
  })

  const [canCreate] = usePermission({
    resource: {
      resourceType: ResourceType.SERVICE
    },
    permissions: [PermissionIdentifier.EDIT_SERVICE]
  })
  const [state, setState] = React.useState<DeployServiceState>({ isEdit: false, isService: false })

  const [showModal, hideModal] = useModalHook(
    () => (
      <ModalDialog
        isOpen={true}
        enforceFocus={false}
        canEscapeKeyClose
        canOutsideClickClose
        onClose={onClose}
        title={state.isEdit ? getString('editService') : getString('newService')}
        isCloseButtonShown
        width={800}
        showOverlay={showOverlay}
      >
        <NewEditServiceModal
          data={{
            name: defaultTo(state.data?.name, ''),
            identifier: defaultTo(state.data?.identifier, ''),
            orgIdentifier,
            projectIdentifier,
            ...state.data,
            ...(!state.isEdit && CDS_SERVICE_GITX ? { storeType: getDefaultStoreTypeFromSettings(gitXSetting) } : {})
          }}
          isEdit={state.isEdit}
          isGitXEnforced={getSettingValue(gitXSetting, SettingType.ENFORCE_GIT_EXPERIENCE) === 'true'}
          isService={state.isService}
          onCreateOrUpdate={values => {
            refetch()
            formik?.setFieldValue(
              `${isEmpty(inputSetData?.path) ? '' : `${inputSetData?.path}.`}serviceRef`,
              values.identifier
            )
            onClose.call(null)
          }}
          closeModal={onClose}
          setShowOverlay={setShowOverlay}
        />
      </ModalDialog>
    ),
    [state, gitXSetting]
  )

  const onClose = React.useCallback(() => {
    setState({ isEdit: false, isService: false })
    hideModal()
  }, [hideModal])
  if (error?.message) {
    clear()
    showError(getRBACErrorMessage(error), undefined, 'cd.svc.list.error')
  }

  return (
    <>
      {getMultiTypeFromValue(inputSetData?.template?.serviceRef) === MultiTypeInputType.RUNTIME && (
        <Layout.Horizontal spacing="medium" style={{ alignItems: 'center' }}>
          <ExperimentalInput
            tooltipProps={{ dataTooltipId: 'specifyYourService' }}
            label={getString('cd.pipelineSteps.serviceTab.specifyYourService')}
            name={`${isEmpty(inputSetData?.path) ? '' : `${inputSetData?.path}.`}serviceRef`}
            placeholder={getString('cd.pipelineSteps.serviceTab.selectService')}
            selectItems={services}
            useValue
            multiTypeInputProps={{
              expressions,
              allowableTypes: allowableTypes,
              selectProps: {
                addClearBtn: true && !inputSetData?.readonly,
                items: services
              }
            }}
            disabled={inputSetData?.readonly}
            className={css.inputWidth}
            formik={formik}
          />
          {getMultiTypeFromValue(initialValues?.serviceRef) === MultiTypeInputType.FIXED && (
            <Button
              size={ButtonSize.SMALL}
              variation={ButtonVariation.LINK}
              disabled={inputSetData?.readonly || (isEditService(initialValues) ? !canEdit : !canCreate)}
              onClick={() => {
                const isEdit = isEditService(initialValues)
                if (isEdit) {
                  setState({
                    isEdit,
                    isService: false,
                    data: serviceResponse?.data?.filter(
                      service => service.service?.identifier === initialValues.serviceRef
                    )?.[0]?.service as ServiceRequestDTO
                  })
                }
                showModal()
              }}
              text={
                isEditService(initialValues)
                  ? getString('editService')
                  : getString('cd.pipelineSteps.serviceTab.plusNewService')
              }
            />
          )}
        </Layout.Horizontal>
      )}
    </>
  )
}

export const DeployServiceInputStepFormik = connect(DeployServiceInputStep)
