/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import type { MutateMethod } from 'restful-react'
import { defaultTo, isEmpty, omit, omitBy, set } from 'lodash-es'
import { useHistory, useParams } from 'react-router-dom'

import { useToaster } from '@harness/uicore'
import type { CreateUpdateInputSetsReturnType, InputSetDTO, SaveInputSetDTO } from '@pipeline/utils/types'
import { AppStoreContext } from 'framework/AppStore/AppStoreContext'
import type {
  CreateInputSetForPipelineQueryParams,
  EntityGitDetails,
  ResponseInputSetResponse,
  UpdateInputSetForPipelinePathParams,
  UpdateInputSetForPipelineQueryParams
} from 'services/pipeline-ng'
import type { SaveToGitFormInterface } from '@common/components/SaveToGitForm/SaveToGitForm'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { UseSaveSuccessResponse, useSaveToGitDialog } from '@common/modals/SaveToGitDialog/useSaveToGitDialog'
import { getFormattedErrors } from '@pipeline/utils/runPipelineUtils'
import type { InputSetGitQueryParams, InputSetPathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import { useQueryParams } from '@common/hooks'
import type { GitData } from '@common/modals/GitDiffEditor/useGitDiffEditorDialog'
import { useStrings } from 'framework/strings'
import { yamlStringify } from '@common/utils/YamlHelperMethods'
import { clearNullUndefined } from '@pipeline/utils/inputSetUtils'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { isHarnessCodeRepoEntity } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect.utils'
import { getUpdatedGitDetails } from './utils'

interface UseSaveInputSetReturnType {
  handleSubmit: (
    inputSetObjWithGitInfo: InputSetDTO,
    gitDetails?: EntityGitDetails,
    storeMetadata?: StoreMetadata
  ) => Promise<void>
}

interface InputSetInfo {
  createInputSet: MutateMethod<ResponseInputSetResponse, string, CreateInputSetForPipelineQueryParams, void>
  updateInputSet: MutateMethod<
    ResponseInputSetResponse,
    string,
    UpdateInputSetForPipelineQueryParams,
    UpdateInputSetForPipelinePathParams
  >
  inputSetResponse: ResponseInputSetResponse | null
  isEdit: boolean
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  onCreateUpdateSuccess: (response?: ResponseInputSetResponse) => void
}

export function useSaveInputSet(inputSetInfo: InputSetInfo): UseSaveInputSetReturnType {
  const { createInputSet, updateInputSet, inputSetResponse, isEdit, setFormErrors, onCreateUpdateSuccess } =
    inputSetInfo
  const { getString } = useStrings()
  const { showSuccess, showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const history = useHistory()

  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier } = useParams<
    PipelineType<InputSetPathProps> & { accountId: string }
  >()
  const { repoIdentifier, branch, repoName, connectorRef, storeType } = useQueryParams<InputSetGitQueryParams>()

  const [savedInputSetObj, setSavedInputSetObj] = React.useState<InputSetDTO>({})
  const [initialGitDetails, setInitialGitDetails] = React.useState<EntityGitDetails>({ repoIdentifier, branch })
  const [initialStoreMetadata, setInitialStoreMetadata] = React.useState<StoreMetadata>({
    repoName,
    branch,
    connectorRef,
    storeType
  })

  const { isGitSyncEnabled: isGitSyncEnabledForProject, gitSyncEnabledOnlyForFF } = React.useContext(AppStoreContext)
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF

  const initialStoreMetadataPayload = React.useMemo(() => {
    if (isGitSyncEnabled) {
      return {}
    } else {
      return initialStoreMetadata.storeType === StoreType.REMOTE
        ? initialStoreMetadata
        : { storeType: StoreType.INLINE }
    }
  }, [initialStoreMetadata, isGitSyncEnabled])

  const createUpdateInputSet = React.useCallback(
    async ({
      inputSetObj,
      gitDetails,
      objectId = '',
      onCreateUpdateInputSetSuccess,
      conflictCommitId
    }: {
      inputSetObj: InputSetDTO
      onCreateUpdateInputSetSuccess: (response?: ResponseInputSetResponse) => void
      gitDetails?: SaveToGitFormInterface
      objectId?: string
      conflictCommitId?: string
    }): CreateUpdateInputSetsReturnType => {
      let response: ResponseInputSetResponse | undefined = undefined
      const inputSetYaml = yamlStringify({ inputSet: clearNullUndefined(inputSetObj) })
      try {
        const updatedGitDetails = getUpdatedGitDetails(
          isEdit,
          gitDetails,
          objectId,
          initialGitDetails,
          conflictCommitId
        )
        if (isEdit) {
          if (inputSetObj.identifier) {
            response = await updateInputSet(inputSetYaml, {
              pathParams: {
                inputSetIdentifier: defaultTo(inputSetObj.identifier, '')
              },
              queryParams: {
                accountIdentifier: accountId,
                orgIdentifier,
                pipelineIdentifier,
                projectIdentifier,
                ...(isGitSyncEnabled
                  ? {
                      pipelineRepoID: repoIdentifier,
                      pipelineBranch: branch
                    }
                  : {}),
                ...initialStoreMetadataPayload,
                ...updatedGitDetails
              }
            })
          } else {
            throw new Error(getString('common.validation.identifierIsRequired'))
          }
        } else {
          response = await createInputSet(inputSetYaml, {
            queryParams: {
              accountIdentifier: accountId,
              orgIdentifier,
              pipelineIdentifier,
              projectIdentifier,
              ...(isGitSyncEnabled
                ? {
                    pipelineRepoID: repoIdentifier,
                    pipelineBranch: branch
                  }
                : {}),
              ...initialStoreMetadataPayload,
              ...updatedGitDetails
            }
          })
        }
        // For inline input set
        if (!isGitSyncEnabled && initialStoreMetadata.storeType !== StoreType.REMOTE) {
          showSuccess(getString('inputSets.inputSetSaved'))
          onCreateUpdateInputSetSuccess(response)
        }
      } catch (e) {
        const errors = getFormattedErrors(e?.data?.metadata?.uuidToErrorResponseMap)
        if (!isEmpty(errors)) {
          setFormErrors(errors)
        }
        // This is done because when git sync is enabled / storeType in REMOTE, errors are displayed in a modal
        if (!isGitSyncEnabled && initialStoreMetadata.storeType !== StoreType.REMOTE) {
          showError(getRBACErrorMessage(e), undefined, 'pipeline.update.create.inputset')
        } else {
          throw e
        }
      }
      // For remote input set
      return {
        status: response?.status, // nextCallback can be added if required,        response,
        nextCallback: () => onCreateUpdateInputSetSuccess(response)
      }
    },
    [
      accountId,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      repoIdentifier,
      branch,
      createInputSet,
      updateInputSet,
      initialGitDetails,
      initialStoreMetadata,
      getString,
      history,
      isEdit,
      isGitSyncEnabled,
      setFormErrors,
      showSuccess,
      showError
    ]
  )

  const { openSaveToGitDialog } = useSaveToGitDialog<SaveInputSetDTO>({
    onSuccess: (gitData: GitData, payload?: SaveInputSetDTO, objectId?: string): Promise<UseSaveSuccessResponse> =>
      createUpdateInputSet({
        inputSetObj: payload?.inputSet || savedInputSetObj,
        gitDetails: gitData,
        objectId,
        onCreateUpdateInputSetSuccess: onCreateUpdateSuccess,
        conflictCommitId: gitData?.resolvedConflictCommitId
      })
  })

  const handleSubmit = React.useCallback(
    async (inputSetObjWithGitInfo: InputSetDTO, gitDetails?: EntityGitDetails, storeMetadata?: StoreMetadata) => {
      const inputSetObj = omit(
        inputSetObjWithGitInfo,
        'repo',
        'branch',
        'provider',
        'connectorRef',
        'repoName',
        'filePath',
        'storeType',
        'cacheResponse'
      )
      const updatedGitDetails = {
        ...defaultTo(isEdit ? inputSetResponse?.data?.gitDetails : gitDetails, {}),
        isHarnessCodeRepo: isHarnessCodeRepoEntity(inputSetObjWithGitInfo?.provider?.type)
      }

      // This removes the pseudo fields set for handling multiple fields in the form at once
      set(
        inputSetObj,
        'pipeline',
        omitBy(inputSetObjWithGitInfo.pipeline, (_val, key) => key.startsWith('_'))
      )

      setSavedInputSetObj(inputSetObj)
      setInitialGitDetails(defaultTo(updatedGitDetails, {}))
      setInitialStoreMetadata(defaultTo(storeMetadata, {}))

      if (inputSetObj) {
        if (isGitSyncEnabled || storeMetadata?.storeType === StoreType.REMOTE) {
          openSaveToGitDialog({
            isEditing: isEdit,
            resource: {
              type: 'InputSets',
              name: inputSetObj.name as string,
              identifier: inputSetObj.identifier as string,
              gitDetails: updatedGitDetails,
              storeMetadata: storeMetadata?.storeType === StoreType.REMOTE ? storeMetadata : undefined
            },
            payload: { inputSet: inputSetObj }
          })
        } else {
          createUpdateInputSet({
            inputSetObj,
            onCreateUpdateInputSetSuccess: onCreateUpdateSuccess
          })
        }
      }
    },
    [isEdit, isGitSyncEnabled, inputSetResponse, createUpdateInputSet, openSaveToGitDialog]
  )

  return {
    handleSubmit
  }
}
