/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import * as Yup from 'yup'
import { get, omit, defaultTo } from 'lodash-es'
import type { FormikProps } from 'formik'
import { Formik, getErrorInfoFromErrorObject } from '@harness/uicore'

import {
  ServiceRequestDTO,
  ServiceResponseDTO,
  useUpsertServiceV2,
  useCreateServiceV2,
  ResponseServiceResponse
} from 'services/cd-ng'
import { queryClient } from 'services/queryClient'
import { useStrings } from 'framework/strings'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { IdentifierSchema, NameSchema } from '@common/utils/Validation'
import { useToaster } from '@common/exports'
import { yamlStringify } from '@common/utils/YamlHelperMethods'
import { useSaveToGitDialog } from '@common/modals/SaveToGitDialog/useSaveToGitDialog'
import { SaveToGitFormInterface } from '@common/components/SaveToGitForm/SaveToGitForm'
import { StoreType } from '@common/constants/GitSyncTypes'
import { GitSyncFormFields, gitSyncFormSchema } from '@gitsync/components/GitSyncForm/GitSyncForm'
import { ConnectorSelectedValue } from '@platform/connectors/components/ConnectorReferenceField/ConnectorReferenceField'
import { ProjectPathProps } from '@modules/10-common/interfaces/RouteInterfaces'
import type { NewEditServiceModalProps } from './DeployServiceInterface'
import NewEditServiceForm from './NewEditServiceForm'

const cleanData = (values: ServiceRequestDTO): ServiceRequestDTO => {
  const { description, identifier, name } = values

  return {
    name: defaultTo(name, '').trim(),
    identifier: defaultTo(identifier, '').trim(),
    orgIdentifier: values.orgIdentifier,
    projectIdentifier: values.projectIdentifier,
    description: defaultTo(description, '').trim(),
    tags: values.tags,
    yaml: yamlStringify({
      service: {
        ...omit(values, ['storeType', 'connectorRef', 'repo', 'branch', 'filePath'])
      }
    })
  }
}

export const NewEditServiceModal: React.FC<NewEditServiceModalProps> = ({
  isEdit,
  data,
  isService,
  isGitXEnforced,
  onCreateOrUpdate,
  closeModal,
  setShowOverlay
}): JSX.Element => {
  const { getString } = useStrings()
  const isGitXEnabledForServices = useFeatureFlag(FeatureFlag.CDS_SERVICE_GITX)

  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()

  const { loading: createLoading, mutate: createService } = useCreateServiceV2({
    queryParams: {
      accountIdentifier: accountId
    }
  })
  const { loading: updateLoading, mutate: updateService } = useUpsertServiceV2({
    queryParams: {
      accountIdentifier: accountId
    }
  })

  useEffect(() => {
    setShowOverlay?.(createLoading || updateLoading)
  }, [createLoading, updateLoading])

  const { showSuccess, showError, clear } = useToaster()

  const { openSaveToGitDialog } = useSaveToGitDialog({
    onSuccess: async (
      gitData: SaveToGitFormInterface,
      payload?: ServiceRequestDTO
    ): Promise<ResponseServiceResponse> => {
      const isNewBranch = gitData?.isNewBranch
      const selectedBranch = get(formikRef.current, 'values.branch')
      const response = await createService(
        { ...payload, orgIdentifier, projectIdentifier },
        {
          queryParams: {
            accountIdentifier: accountId,
            storeType: StoreType.REMOTE,
            connectorRef: get(formikRef.current, 'values.connectorRef.value'),
            repoName: get(formikRef.current, 'values.repo'),
            isNewBranch: gitData?.isNewBranch,
            filePath: get(formikRef.current, 'values.filePath'),
            ...(isNewBranch ? { baseBranch: selectedBranch, branch: gitData?.branch } : { branch: selectedBranch }),
            commitMsg: gitData?.commitMsg
          }
        }
      )
      if (response.status === 'SUCCESS' && response?.data?.service) {
        clear()
        showSuccess(getString('cd.serviceCreated'))
        // We invalidate the service list call on creating a new service
        queryClient.invalidateQueries(['getServiceAccessList'])
        // onCreateOrUpdate will redirect to details page and hide modals showing status
        setTimeout(() => {
          response?.data?.service && onCreateOrUpdate(response?.data?.service)
        }, 1000)
      }
      return Promise.resolve(response)
    }
  })

  const onSubmit = React.useCallback(
    async (value: ServiceRequestDTO) => {
      try {
        const values = cleanData(value)
        if (!values.name) {
          showError(getString('fieldRequired', { field: 'Service' }))
        } else if (!values.identifier) {
          showError(getString('common.validation.fieldIsRequired', { name: 'Identifier' }))
        } else if (isEdit && id !== values.identifier) {
          showError(getString('cd.editIdError', { id: id }))
        } else if (get(formikRef.current, 'values.storeType') === StoreType.REMOTE) {
          openSaveToGitDialog({
            isEditing: isEdit,
            resource: {
              type: 'Service',
              name: values.name as string,
              identifier: values.identifier as string,
              gitDetails: {
                branch: formikRef.current?.values?.branch,
                commitId: undefined,
                filePath: formikRef.current?.values?.filePath,
                fileUrl: undefined,
                objectId: undefined,
                repoName: formikRef.current?.values?.repo,
                repoUrl: undefined
              },
              storeMetadata: {
                storeType: StoreType.REMOTE,
                connectorRef: (formikRef.current?.values?.connectorRef as unknown as ConnectorSelectedValue)?.value
              }
            },
            payload: {
              ...omit(values, ['storeType', 'connectorRef', 'repo', 'branch', 'filePath']),
              orgIdentifier,
              projectIdentifier
            }
          })
        } else if (isEdit && !isService) {
          const response = await updateService({
            ...omit(values, 'accountId', 'deleted'),
            orgIdentifier,
            projectIdentifier
          })
          if (response.status === 'SUCCESS') {
            clear()
            showSuccess(getString('cd.serviceUpdated'))
            onCreateOrUpdate(values)
          }
        } else {
          const response = await createService({ ...values, orgIdentifier, projectIdentifier })
          if (response.status === 'SUCCESS') {
            clear()
            showSuccess(getString('cd.serviceCreated'))
            // We invalidate the service list call on creating a new service
            queryClient.invalidateQueries(['getServiceAccessList'])
            onCreateOrUpdate(values)
          }
        }
      } catch (e) {
        showError(getErrorInfoFromErrorObject(e, true))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCreateOrUpdate, orgIdentifier, projectIdentifier, isEdit, isService]
  )

  const formikRef = React.useRef<FormikProps<ServiceResponseDTO & GitSyncFormFields>>()
  const id = data.identifier

  return (
    <Formik<Required<ServiceResponseDTO> & GitSyncFormFields>
      initialValues={data as Required<ServiceResponseDTO>}
      formName="deployService"
      onSubmit={values => {
        onSubmit(values)
      }}
      validationSchema={Yup.object().shape({
        name: NameSchema(getString, { requiredErrorMsg: getString('fieldRequired', { field: 'Service' }) }),
        identifier: IdentifierSchema(getString),
        ...(isGitXEnabledForServices ? { ...gitSyncFormSchema(getString) } : {})
      })}
    >
      {formikProps => {
        // if (!isEdit && isGitXEnforced) {
        //   formikProps?.setFieldValue('storeType', StoreType.REMOTE)
        // }
        formikRef.current = formikProps as FormikProps<ServiceResponseDTO> | undefined

        return (
          <>
            <NewEditServiceForm
              isEdit={isEdit}
              isGitXEnforced={isGitXEnforced}
              formikProps={formikProps as FormikProps<ServiceResponseDTO & GitSyncFormFields>}
              isGitXEnabledForServices={isGitXEnabledForServices}
              closeModal={closeModal}
            />
          </>
        )
      }}
    </Formik>
  )
}
