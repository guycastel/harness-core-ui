/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { createContext, createRef, useContext, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { defaultTo, get, isEmpty, noop, omit, set } from 'lodash-es'
import produce from 'immer'
import { FormikProps } from 'formik'

import { PageSpinner, useToaster } from '@harness/uicore'
import {
  EntityGitInfo,
  PageServiceOverridesResponseDTOV2,
  ResponseServiceOverridesResponseDTOV2,
  ServiceOverrideRequestDTOV2,
  useCreateServiceOverrideV2,
  useDeleteServiceOverrideV2,
  useGetServiceOverrideListV3,
  useUpdateServiceOverrideV2,
  useUpsertServiceOverrideV2
} from 'services/cd-ng'
import { useStrings } from 'framework/strings'

import type { ProjectPathProps, RequiredField } from '@common/interfaces/RouteInterfaces'
import {
  getSanitizedFilter,
  ServiceOverridesPageQueryParams
} from '@cd/components/ServiceOverrides/components/ServiceOverrideFilters/filterUtils'
import {
  EnvironmentRefFormState,
  InfraIdentifierFormState,
  OverrideDetails,
  ServiceOverrideSectionProps,
  ServiceOverridesTab,
  ServiceRefFormState
} from '@cd/components/ServiceOverrides/ServiceOverridesUtils'
import { useRbacQueryParamOptions } from '@rbac/utils/utils'
import { useMutateAsGet, useQueryParams } from '@common/hooks'
import { PageQueryParamsWithDefaults } from '@common/constants/Pagination'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import type {
  ServiceOverrideRowFormState,
  ServiceOverridesResponseDTOV2
} from '@cd/components/ServiceOverrides/ServiceOverridesUtils'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { useSaveToGitDialog } from '@modules/10-common/modals/SaveToGitDialog/useSaveToGitDialog'
import { GitData } from '@modules/10-common/modals/GitDiffEditor/useGitDiffEditorDialog'
import { StoreMetadata, StoreType } from '@modules/10-common/constants/GitSyncTypes'
import { GitContextProps } from '@modules/10-common/components/GitContextForm/GitContextForm'
import {
  formListSectionItem,
  formListSectionItems,
  formUpdateOverrideResponseSpec,
  checkIfSectionUpdateOperationIsAllowed
} from './ServiceOverrideContextUtils'

interface RowMetadata {
  isNewRow: boolean
  isCloneRow: boolean
  isEditRow: boolean
  childRowIndex: number
  containsAnyDeletedRows: boolean
}

// ServiceOverridesTab
type ServiceOverrideType =
  | 'ENV_GLOBAL_OVERRIDE'
  | 'ENV_SERVICE_OVERRIDE'
  | 'INFRA_GLOBAL_OVERRIDE'
  | 'INFRA_SERVICE_OVERRIDE'

interface ServiceOverridesContextInterface {
  serviceOverrideType: ServiceOverridesTab
  handleNewOverrideSection(): void
  addNewChildOverrideRow(sectionIndex: number): Promise<void>
  onAddOverrideSection(values: ServiceOverrideRowFormState): void
  onCloneChildRow(rowIndex: number, sectionIndex: number): Promise<void>
  onEditChildRow(rowIndex: number, sectionIndex: number): Promise<void>
  onUpdate(sectionIndex: number, values: ServiceOverrideRowFormState[]): void
  onDeleteChildRow(rowIndex: number, sectionIndex: number): Promise<void>
  onDeleteOverrideSection(rowIndex: number): void
  onDiscardSection(sectionIndex: number): void
  onDiscardChildRow(rowMetadata: RowMetadata): void
  listSectionItems: ServiceOverrideSectionProps[]
  serviceOverrideResponse?: PageServiceOverridesResponseDTOV2
  loadingServiceOverrideData?: boolean
  currentEditableSectionIndex?: number
  currentEditableSectionRef?: React.MutableRefObject<FormikProps<ServiceOverrideRowFormState[]> | undefined>
  newOverrideEnvironmentInputRef: React.MutableRefObject<FormikProps<EnvironmentRefFormState> | undefined | null>
  newOverrideServiceInputRef: React.MutableRefObject<FormikProps<ServiceRefFormState> | undefined | null>
  newOverrideInfraInputRef: React.MutableRefObject<FormikProps<InfraIdentifierFormState> | undefined | null>
  newOverrideEnvironmentInputValue?: string
  setNewOverrideEnvironmentInputValue: React.Dispatch<React.SetStateAction<string | undefined>>
  setListSectionItems?: React.Dispatch<React.SetStateAction<ServiceOverrideSectionProps[]>>
  newRemoteOverrideGitDetailsRef: React.MutableRefObject<
    FormikProps<GitContextProps & StoreMetadata> | undefined | null
  >
  expandedRows: Set<string>
  setExpandedRows: React.Dispatch<React.SetStateAction<Set<string>>>
}

interface ServiceOverridesProviderProps {
  serviceOverrideType: ServiceOverrideType
}

const ServiceOverridesContext = createContext<ServiceOverridesContextInterface>({
  serviceOverrideType: 'ENV_GLOBAL_OVERRIDE' as ServiceOverridesTab.ENV_GLOBAL_OVERRIDE,
  handleNewOverrideSection: noop,
  addNewChildOverrideRow: () => Promise.resolve(),
  onAddOverrideSection: noop,
  onCloneChildRow: () => Promise.resolve(),
  onEditChildRow: () => Promise.resolve(),
  onUpdate: noop,
  onDeleteChildRow: () => Promise.resolve(),
  onDeleteOverrideSection: noop,
  onDiscardSection: noop,
  onDiscardChildRow: noop,
  listSectionItems: [],
  setListSectionItems: noop,
  loadingServiceOverrideData: false,
  newOverrideEnvironmentInputRef: createRef<FormikProps<EnvironmentRefFormState>>(),
  newOverrideServiceInputRef: createRef<FormikProps<ServiceRefFormState>>(),
  newOverrideInfraInputRef: createRef<FormikProps<InfraIdentifierFormState>>(),
  newRemoteOverrideGitDetailsRef: createRef<FormikProps<GitContextProps & StoreMetadata>>(),
  expandedRows: new Set(),
  setExpandedRows: noop,
  setNewOverrideEnvironmentInputValue: noop
})

export function ServiceOverridesProvider({
  children,
  serviceOverrideType
}: React.PropsWithChildren<ServiceOverridesProviderProps>): React.ReactElement {
  const { getString } = useStrings()
  const { showSuccess, showError, showWarning } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()
  const queryParamOptions = useRbacQueryParamOptions()
  const queryParams = useQueryParams<PageQueryParamsWithDefaults>(queryParamOptions)
  const { page, size } = queryParams
  const { CDS_OVERRIDES_GITX: isGitxEnabledForOverrides } = useFeatureFlags()

  const commonQueryParams = useMemo(
    () => ({
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      size,
      page
    }),
    [accountId, orgIdentifier, projectIdentifier, page, size]
  )

  const [currentEditableSectionIndex, setCurrentEditableSectionIndex] = useState<number | undefined>(undefined)
  const [listSectionItems, setListSectionItems] = useState<ServiceOverrideSectionProps[]>([])
  const [serviceOverrideResponse, setServiceOverrideResponse] = useState<PageServiceOverridesResponseDTOV2>({})
  const currentEditableSectionRef = React.useRef<FormikProps<ServiceOverrideRowFormState[]>>()
  const newOverrideEnvironmentInputRef = React.useRef<FormikProps<EnvironmentRefFormState>>()
  const [newOverrideEnvironmentInputValue, setNewOverrideEnvironmentInputValue] = React.useState<string | undefined>()
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  const newOverrideServiceInputRef = React.useRef<FormikProps<ServiceRefFormState>>()
  const newOverrideInfraInputRef = React.useRef<FormikProps<InfraIdentifierFormState>>()
  const newRemoteOverrideGitDetailsRef = React.useRef<FormikProps<GitContextProps & StoreMetadata> | undefined>(
    undefined
  )
  const sanitizedAppliedFilter = React.useMemo(
    () => getSanitizedFilter(queryParams.filters as ServiceOverridesPageQueryParams['filters']),
    [queryParams.filters]
  )

  const { environmentIdentifiers, serviceIdentifiers, infraIdentifiers } = sanitizedAppliedFilter

  const svcOverridesRequestBody = React.useMemo(
    () =>
      !isEmpty(sanitizedAppliedFilter)
        ? {
            serviceRefs: defaultTo(serviceIdentifiers, []),
            environmentRefs: defaultTo(environmentIdentifiers, []),
            infraIdentifiers: defaultTo(infraIdentifiers, []),
            filterType: 'Override'
          }
        : null,
    [serviceIdentifiers, environmentIdentifiers, infraIdentifiers, sanitizedAppliedFilter]
  )

  const {
    data,
    loading: loadingServiceOverridesList,
    refetch: refetchServiceOverridesList
  } = useMutateAsGet(useGetServiceOverrideListV3, {
    queryParams: {
      ...commonQueryParams,
      type: serviceOverrideType
    },
    body: svcOverridesRequestBody
  })

  const clearRefsAndReset = () => {
    setCurrentEditableSectionIndex(undefined)
    currentEditableSectionRef.current = undefined

    newOverrideEnvironmentInputRef.current = undefined
    newOverrideServiceInputRef.current = undefined
    newOverrideInfraInputRef.current = undefined
    setNewOverrideEnvironmentInputValue(undefined)
  }

  useEffect(() => {
    if (!loadingServiceOverridesList) {
      const svcOverridesList = defaultTo(data?.data?.content, []) as ServiceOverridesResponseDTOV2[]
      setListSectionItems(formListSectionItems(svcOverridesList))
      setServiceOverrideResponse(defaultTo(data?.data, {}) as PageServiceOverridesResponseDTOV2)
      clearRefsAndReset()
    }
  }, [loadingServiceOverridesList, data?.data?.content])

  const shouldSectionUpdateOperationBeAllowed = (sectionIndex: number) => {
    return checkIfSectionUpdateOperationIsAllowed(currentEditableSectionIndex, sectionIndex)
  }

  const handleNewOverrideSection = (): void => {
    if (currentEditableSectionIndex !== -1 && shouldSectionUpdateOperationBeAllowed(-1)) {
      setCurrentEditableSectionIndex(-1)
      setListSectionItems(c => [{ isNew: true, sectionIndex: -1, groupKey: '', isEdit: true, id: uuid() }, ...c])
    } else {
      showWarning(getString('common.serviceOverrides.editablePlaceholderExists'))
    }
  }

  const addNewChildOverrideRow = (sectionIndex: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (shouldSectionUpdateOperationBeAllowed(sectionIndex)) {
        setCurrentEditableSectionIndex(sectionIndex)
        const sanitizedSectionIndex = sectionIndex < 0 ? 0 : sectionIndex
        const svcOverridesList = defaultTo(data?.data?.content, []) as ServiceOverridesResponseDTOV2[]
        setListSectionItems(prevSectionList => {
          return produce(prevSectionList, draft => {
            const sectionToAppendChildRow = draft[sanitizedSectionIndex] as ServiceOverrideSectionProps
            const specDetailsListToBeUpdated = (sectionToAppendChildRow?.overrideSpecDetails || []) as OverrideDetails[]

            specDetailsListToBeUpdated.push({
              isEdit: false,
              isNew: true,
              isClone: false,
              ...omit(svcOverridesList[sanitizedSectionIndex], 'spec')
            } as unknown as OverrideDetails)

            set(sectionToAppendChildRow, 'isEdit', true)
            set(sectionToAppendChildRow, 'overrideSpecDetails', specDetailsListToBeUpdated)
          })
        })
        resolve()
      } else {
        showWarning(getString('common.serviceOverrides.editablePlaceholderExists'))
        reject()
      }
    })
  }

  const { mutate: createServiceOverride, loading: loadingCreateServiceOverride } = useUpsertServiceOverrideV2({
    queryParams: {
      accountIdentifier: accountId
    }
  })

  const { mutate: createRemoteServiceOverride, loading: loadingCreateRemoteServiceOverride } =
    useCreateServiceOverrideV2({})

  const { mutate: updateServiceOverride, loading: loadingUpdateServiceOverride } = useUpdateServiceOverrideV2({
    queryParams: {
      accountIdentifier: accountId
    }
  })

  const afterUpdateHandler = (updatedResponse: ServiceOverridesResponseDTOV2, sectionIndex: number): void => {
    const updatedListSectionItem = formListSectionItem(updatedResponse, sectionIndex)
    setListSectionItems(prevSectionList => {
      return produce(prevSectionList, draft => {
        set(draft, sectionIndex, updatedListSectionItem)
      })
    })
    showSuccess(getString('cd.override.updatedSuccessfully'))
  }

  const { openSaveToGitDialog } = useSaveToGitDialog({
    onSuccess: (gitData: GitData, overridePayload?: any): Promise<ResponseServiceOverridesResponseDTOV2> => {
      const { connectorRef, branch, repo, filePath } = newRemoteOverrideGitDetailsRef.current?.values || {}
      const {
        branch: updatedBranch,
        filePath: updatedFilePath,
        repoName,
        objectId,
        commitId
      } = get(overridePayload, 'entityGitInfo', {}) as EntityGitInfo
      const createUpdatePromise =
        currentEditableSectionIndex === -1
          ? createRemoteServiceOverride({ ...omit(overridePayload, 'sectionIndex') } as ServiceOverridesResponseDTOV2, {
              queryParams: {
                accountIdentifier: accountId,
                storeType: StoreType.REMOTE,
                isNewBranch: gitData?.isNewBranch,
                ...(gitData?.isNewBranch ? { baseBranch: branch, branch: gitData?.branch } : { branch: branch }),
                repoName: repo,
                connectorRef,
                filePath,
                commitMsg: gitData?.commitMsg
              }
            })
          : updateServiceOverride({ ...omit(overridePayload, 'sectionIndex') } as ServiceOverridesResponseDTOV2, {
              queryParams: {
                accountIdentifier: accountId,
                storeType: StoreType.REMOTE,
                connectorRef: overridePayload?.connectorRef,
                isNewBranch: gitData?.isNewBranch,
                repoIdentifier: repoName,
                filePath: updatedFilePath,
                ...(gitData?.isNewBranch
                  ? { baseBranch: updatedBranch || overridePayload?.fallbackBranch, branch: gitData?.branch }
                  : { branch: updatedBranch || overridePayload?.fallbackBranch }),
                commitMsg: gitData?.commitMsg,
                lastObjectId: objectId,
                lastCommitId: commitId,
                resolvedConflictCommitId: gitData?.resolvedConflictCommitId
              }
            })
      return createUpdatePromise.then(response => {
        if (response.status === 'SUCCESS' && response.data) {
          clearRefsAndReset()
          if (currentEditableSectionIndex !== -1) {
            afterUpdateHandler(response.data as ServiceOverridesResponseDTOV2, overridePayload?.sectionIndex)
          } else {
            refetchServiceOverridesList()
            showSuccess(getString('cd.override.createdSuccessfully'))
          }
        } else {
          throw response
        }
        return response
      })
    }
  })

  const onAddOverrideSection = (values: RequiredField<ServiceOverrideRowFormState, 'environmentRef'>): void => {
    const {
      environmentRef,
      serviceRef,
      infraIdentifier,
      variables,
      manifests,
      configFiles,
      applicationSettings,
      connectionStrings
    } = values

    const createOverridePayload = {
      type: serviceOverrideType,
      environmentRef,
      infraIdentifier,
      serviceRef,
      orgIdentifier,
      projectIdentifier,
      spec: {
        ...(variables && { variables }),
        ...(manifests && { manifests }),
        ...(configFiles && { configFiles }),
        ...(applicationSettings && { applicationSettings }),
        ...(connectionStrings && { connectionStrings })
      }
    }
    try {
      if (isGitxEnabledForOverrides && newRemoteOverrideGitDetailsRef.current?.values?.storeType === StoreType.REMOTE) {
        if (isEmpty(newRemoteOverrideGitDetailsRef.current?.errors)) {
          const envRefFormValue = newOverrideEnvironmentInputRef.current?.values?.['environmentRef']
          openSaveToGitDialog({
            isEditing: false,
            disableCreatingNewBranch: true,
            resource: {
              type: 'Overrides',
              name: defaultTo(envRefFormValue, ''),
              identifier: defaultTo(envRefFormValue, ''),
              gitDetails: newRemoteOverrideGitDetailsRef.current?.values,
              storeMetadata: {
                storeType: StoreType.REMOTE,
                connectorRef: newRemoteOverrideGitDetailsRef.current?.values?.connectorRef
              }
            },
            payload: createOverridePayload as ServiceOverridesResponseDTOV2
          })
        } else {
          showError(getString('cd.overrideValidations.overrideFormContainsErrors'))
        }
      } else {
        createServiceOverride(createOverridePayload as ServiceOverrideRequestDTOV2)
          .then(() => {
            clearRefsAndReset()
            refetchServiceOverridesList()
            showSuccess(getString('cd.override.createdSuccessfully'))
          })
          .catch(e => {
            showError(getRBACErrorMessage(e))
          })
      }
    } catch (e) {
      showError(getRBACErrorMessage(e))
    }
  }

  const { mutate: deleteServiceOverride, loading: loadingDeleteServiceOverride } = useDeleteServiceOverrideV2({})

  const onDeleteOverrideSection = (sectionIndex: number): void => {
    if (shouldSectionUpdateOperationBeAllowed(sectionIndex)) {
      setCurrentEditableSectionIndex(sectionIndex)

      const overrideSectionToDelete = listSectionItems[sectionIndex]
      const overrideResponse = overrideSectionToDelete.overrideResponse as ServiceOverridesResponseDTOV2

      deleteServiceOverride(overrideResponse.identifier, {
        headers: { 'content-type': 'application/json' },
        queryParams: {
          ...commonQueryParams
        }
      })
        .then(() => {
          clearRefsAndReset()
          refetchServiceOverridesList()
          showSuccess('Successfully deleted override with identifier: ' + overrideResponse?.identifier)
        })
        .catch(e => {
          showError(getRBACErrorMessage(e))
        })
    } else {
      showWarning(getString('common.serviceOverrides.editablePlaceholderExists'))
    }
  }

  const onUpdate = (sectionIndex: number, values: ServiceOverrideRowFormState[]): void => {
    const sectionItemToUpdate = listSectionItems[sectionIndex] as RequiredField<
      ServiceOverrideSectionProps,
      'overrideSpecDetails'
    >

    const overrideResponse = sectionItemToUpdate.overrideResponse as ServiceOverridesResponseDTOV2

    const updateOverridePayload = {
      ...omit(overrideResponse, 'yamlInternal'),
      environmentRef: defaultTo(overrideResponse.environmentRef, ''),
      serviceRef: defaultTo(overrideResponse.serviceRef, ''),
      infraIdentifier: defaultTo(overrideResponse.infraIdentifier, ''),
      spec: {
        ...formUpdateOverrideResponseSpec(values)
      }
    }

    try {
      if (isGitxEnabledForOverrides && overrideResponse?.storeType === StoreType.REMOTE) {
        openSaveToGitDialog({
          isEditing: true,
          disableCreatingNewBranch: true,
          resource: {
            type: 'Overrides',
            name: defaultTo(overrideResponse?.identifier, ''),
            identifier: defaultTo(overrideResponse?.identifier, ''),
            gitDetails: overrideResponse?.entityGitInfo,
            storeMetadata: {
              storeType: overrideResponse.storeType,
              connectorRef: overrideResponse.connectorRef
            }
          },
          payload: { ...updateOverridePayload, sectionIndex }
        })
      } else {
        updateServiceOverride(updateOverridePayload)
          .then(updateResponseData => {
            clearRefsAndReset()
            if (updateResponseData.data) {
              const updatedListSectionItem = formListSectionItem(
                updateResponseData.data as ServiceOverridesResponseDTOV2,
                sectionIndex
              )
              setListSectionItems(prevSectionList => {
                return produce(prevSectionList, draft => {
                  set(draft, sectionIndex, updatedListSectionItem)
                })
              })
            }
            showSuccess('Successfully updated override')
          })
          .catch(e => {
            showError(getRBACErrorMessage(e))
          })
      }
    } catch (e) {
      showError(getRBACErrorMessage(e))
    }
  }

  const onDiscardSection = (sectionIndex: number): void => {
    clearRefsAndReset()
    if (sectionIndex >= 0) {
      setListSectionItems?.(prevSectionList => {
        return produce(prevSectionList, draft => {
          const overrideResponseData = listSectionItems?.[sectionIndex]
            ?.overrideResponse as ServiceOverridesResponseDTOV2
          draft[sectionIndex] = formListSectionItem(overrideResponseData, sectionIndex)
        })
      })
    } else if (data?.data?.content) {
      setListSectionItems(formListSectionItems(data.data.content as ServiceOverridesResponseDTOV2[]))
    }
  }

  const checkIfEntireOverrideSectionCanBeDiscarded = (
    updatedListSectionItems: ServiceOverrideSectionProps[],
    containsAnyDeletedRows: boolean
  ): boolean => {
    const sanitizedSectionIndex =
      (currentEditableSectionIndex as number) < 0 ? 0 : (currentEditableSectionIndex as number)
    const overrideSectionToCheck = updatedListSectionItems[sanitizedSectionIndex] as ServiceOverrideSectionProps
    const overrideSpecDetailsArr = (overrideSectionToCheck?.overrideSpecDetails || []) as OverrideDetails[]
    const anyEditableRowExists = overrideSpecDetailsArr.some((overrideRowDetail: OverrideDetails) => {
      return overrideRowDetail.isEdit || overrideRowDetail.isNew || overrideRowDetail.isClone
    })

    return (
      overrideSectionToCheck.isEdit && !anyEditableRowExists && !containsAnyDeletedRows && !overrideSectionToCheck.isNew
    )
  }

  const onDeleteChildRow = (childRowIndex: number, sectionIndex: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (shouldSectionUpdateOperationBeAllowed(sectionIndex)) {
        setCurrentEditableSectionIndex(sectionIndex)
        const updatedListSectionItems = produce(listSectionItems, draft => {
          const overrideSectionToBeUpdated = draft[sectionIndex] as ServiceOverrideSectionProps

          const overrideSpecDetailsToBeUpdated = overrideSectionToBeUpdated.overrideSpecDetails as OverrideDetails[]
          if (overrideSpecDetailsToBeUpdated[childRowIndex]) {
            overrideSpecDetailsToBeUpdated.splice(childRowIndex, 1)
            set(overrideSectionToBeUpdated, 'isEdit', true)
          }
        })
        setListSectionItems(updatedListSectionItems)
        resolve()
      } else {
        showWarning(getString('common.serviceOverrides.editablePlaceholderExists'))
        reject()
      }
    })
  }

  const onCloneChildRow = (childRowIndex: number, sectionIndex: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (shouldSectionUpdateOperationBeAllowed(sectionIndex)) {
        setCurrentEditableSectionIndex(sectionIndex)
        const updatedListSectionItems = produce(listSectionItems, listSectionItemsDraft => {
          const overrideSectionToBeUpdated = listSectionItemsDraft[sectionIndex] as ServiceOverrideSectionProps
          const overrideSpecDetailsToBeUpdated = overrideSectionToBeUpdated.overrideSpecDetails as OverrideDetails[]
          if (overrideSpecDetailsToBeUpdated[childRowIndex]) {
            const clonedUpdatedRowData = produce(overrideSpecDetailsToBeUpdated[childRowIndex], draft => {
              set(draft, 'isEdit', true)
              set(draft, 'isClone', true)
            })
            overrideSpecDetailsToBeUpdated?.splice(childRowIndex + 1, 0, clonedUpdatedRowData)
            set(overrideSectionToBeUpdated, 'isEdit', true)
          }
        })
        setListSectionItems(updatedListSectionItems)
        resolve()
      } else {
        showWarning(getString('common.serviceOverrides.editablePlaceholderExists'))
        reject()
      }
    })
  }

  const onEditChildRow = (childRowIndex: number, sectionIndex: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (shouldSectionUpdateOperationBeAllowed(sectionIndex)) {
        setCurrentEditableSectionIndex(sectionIndex)
        const updatedListSectionItems = produce(listSectionItems, draft => {
          const overrideSectionToBeUpdated = draft[sectionIndex] as ServiceOverrideSectionProps
          const overrideSpecDetailsToBeUpdated = overrideSectionToBeUpdated.overrideSpecDetails as OverrideDetails[]
          if (overrideSpecDetailsToBeUpdated[childRowIndex]) {
            set(overrideSpecDetailsToBeUpdated[childRowIndex], 'isEdit', true)
            set(overrideSectionToBeUpdated, 'isEdit', true)
          }
        })
        setListSectionItems(updatedListSectionItems)
        resolve()
      } else {
        showWarning(getString('common.serviceOverrides.editablePlaceholderExists'))
        reject()
      }
    })
  }

  const onDiscardChildRow = (rowMetadata: RowMetadata): void => {
    const { isNewRow, isCloneRow, isEditRow, childRowIndex, containsAnyDeletedRows } = rowMetadata
    let updatedListSectionItems: ServiceOverrideSectionProps[] = []
    const sanitizedSectionIndex =
      (currentEditableSectionIndex as number) < 0 ? 0 : (currentEditableSectionIndex as number)

    // For new/clone row, the child row needs to be deleted on discard.
    if (isNewRow || isCloneRow) {
      updatedListSectionItems = produce(listSectionItems, draft => {
        const overrideSectionToBeUpdated = draft[sanitizedSectionIndex] as ServiceOverrideSectionProps

        const overrideSpecDetailsToBeUpdated = overrideSectionToBeUpdated.overrideSpecDetails as OverrideDetails[]
        if (overrideSpecDetailsToBeUpdated[childRowIndex]) {
          overrideSpecDetailsToBeUpdated.splice(childRowIndex, 1)
        }
      })
    }

    // For edit row, the child row needs to be converted to view only on discard.
    if (isEditRow && !isCloneRow) {
      updatedListSectionItems = produce(listSectionItems, draft => {
        const overrideSectionToBeUpdated = draft[sanitizedSectionIndex] as ServiceOverrideSectionProps

        const overrideSpecDetailsToBeUpdated = overrideSectionToBeUpdated.overrideSpecDetails as OverrideDetails[]
        if (overrideSpecDetailsToBeUpdated[childRowIndex]) {
          set(overrideSpecDetailsToBeUpdated[childRowIndex], 'isEdit', false)
        }
      })
    }

    // check if no other edit, clone or new rows remain - then discard/reset the entire section
    if (checkIfEntireOverrideSectionCanBeDiscarded(updatedListSectionItems, containsAnyDeletedRows)) {
      onDiscardSection(sanitizedSectionIndex as number)
    } else {
      setListSectionItems(updatedListSectionItems)
    }
  }

  const loading =
    loadingServiceOverridesList ||
    loadingCreateServiceOverride ||
    loadingUpdateServiceOverride ||
    loadingDeleteServiceOverride ||
    loadingCreateRemoteServiceOverride

  return (
    <ServiceOverridesContext.Provider
      value={{
        serviceOverrideType: serviceOverrideType as unknown as ServiceOverridesTab,
        currentEditableSectionIndex,
        handleNewOverrideSection,
        addNewChildOverrideRow,
        onAddOverrideSection,
        onCloneChildRow,
        onEditChildRow,
        onUpdate,
        onDeleteChildRow,
        onDeleteOverrideSection,
        onDiscardSection,
        onDiscardChildRow,
        listSectionItems,
        serviceOverrideResponse,
        loadingServiceOverrideData: loading,
        currentEditableSectionRef,
        setListSectionItems,
        newOverrideEnvironmentInputRef,
        newOverrideServiceInputRef,
        newOverrideInfraInputRef,
        newOverrideEnvironmentInputValue,
        setNewOverrideEnvironmentInputValue,
        newRemoteOverrideGitDetailsRef,
        expandedRows,
        setExpandedRows
      }}
    >
      {loading && <PageSpinner />}
      {children}
    </ServiceOverridesContext.Provider>
  )
}

export const useServiceOverridesContext = (): ServiceOverridesContextInterface => useContext(ServiceOverridesContext)
