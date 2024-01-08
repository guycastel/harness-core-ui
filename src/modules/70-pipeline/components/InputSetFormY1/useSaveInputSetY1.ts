/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { defaultTo, isEmpty } from 'lodash-es'
import { useParams } from 'react-router-dom'
import { UseMutateAsyncFunction } from '@tanstack/react-query'
import {
  CreateInputSetOkResponse,
  CreateInputSetProps,
  GetInputSetOkResponse,
  UpdateInputSetOkResponse,
  UpdateInputSetProps
} from '@harnessio/react-pipeline-service-client'
import { useToaster } from '@harness/uicore'
import type { CreateUpdateInputSetsReturnType } from '@pipeline/utils/types'
import { getFormattedErrorsOpenAPI } from '@pipeline/utils/runPipelineUtils'
import type { InputSetGitQueryParams, InputSetPathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import { useStrings } from 'framework/strings'
import { yamlStringify } from '@common/utils/YamlHelperMethods'
import { StoreMetadata, StoreType } from '@modules/10-common/constants/GitSyncTypes'
import {
  UseSaveSuccessResponse,
  useSaveToGitDialog
} from '@modules/10-common/modals/SaveToGitDialog/useSaveToGitDialog'
import { EntityGitDetails } from 'services/cd-ng'
import { GitData } from '@modules/10-common/modals/GitDiffEditor/useGitDiffEditorDialog'
import { GitResourceInterface, SaveToGitFormInterface } from '@modules/10-common/components/SaveToGitForm/SaveToGitForm'
import { useQueryParams } from '@modules/10-common/hooks'
import { InputSetMetadataY1, InputSetY1 } from './types'
import { gitDetailsV1toV0 } from './utils'
import { getUpdatedGitDetails } from '../InputSetForm/utils'

interface SaveToGitPayload {
  inputSet: InputSetY1
  inputSetMetadata: InputSetMetadataY1
  gitMetadata: EntityGitDetails
}

interface UseSaveInputSetReturnType {
  handleSubmit: (props: {
    inputSet: InputSetY1
    inputSetMetadata: InputSetMetadataY1
    storeMetadata?: StoreMetadata
    gitDetails: EntityGitDetails
  }) => Promise<void>
}

interface UseSaveInputSetY1Props {
  createInputSet: UseMutateAsyncFunction<CreateInputSetOkResponse, unknown, CreateInputSetProps, unknown>
  updateInputSet: UseMutateAsyncFunction<UpdateInputSetOkResponse, unknown, UpdateInputSetProps, unknown>
  inputSetResponse: GetInputSetOkResponse | UpdateInputSetOkResponse | undefined
  isEdit: boolean
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  onCreateUpdateSuccess: (response?: CreateInputSetOkResponse | UpdateInputSetOkResponse) => void
}

export function useSaveInputSetY1(props: UseSaveInputSetY1Props): UseSaveInputSetReturnType {
  const {
    createInputSet: createInputSet,
    updateInputSet: updateInputSet,
    isEdit,
    setFormErrors,
    onCreateUpdateSuccess,
    inputSetResponse
  } = props
  const { projectIdentifier, orgIdentifier, pipelineIdentifier } = useParams<
    PipelineType<InputSetPathProps> & { accountId: string }
  >()
  const { getString } = useStrings()
  const { repoIdentifier, branch, repoName, connectorRef, storeType } = useQueryParams<InputSetGitQueryParams>()
  const [initialStoreMetadata, setInitialStoreMetadata] = React.useState<StoreMetadata>({
    repoName,
    branch,
    connectorRef,
    storeType
  })
  const [initialGitDetails, setInitialGitDetails] = React.useState<EntityGitDetails>({ repoIdentifier, branch })
  const { showSuccess } = useToaster()

  const createUpdateInputSet = React.useCallback(
    async ({
      inputSet,
      inputSetMetadata,
      gitDetails,
      onCreateUpdateInputSetSuccess,
      objectId = '',
      conflictCommitId
    }: {
      inputSet?: InputSetY1
      inputSetMetadata?: InputSetMetadataY1
      gitDetails?: SaveToGitFormInterface //StoreMetadata
      onCreateUpdateInputSetSuccess: (response?: CreateInputSetOkResponse | UpdateInputSetOkResponse) => void
      objectId?: string
      conflictCommitId?: string
    }): CreateUpdateInputSetsReturnType => {
      let response: CreateInputSetOkResponse | undefined = undefined

      try {
        const updatedGitDetails = getUpdatedGitDetails(
          isEdit,
          gitDetails,
          objectId,
          initialGitDetails,
          conflictCommitId
        )

        if (isEdit) {
          if (inputSetMetadata?.identifier) {
            const git_details = initialStoreMetadata.storeType === 'REMOTE' && {
              ...{
                branch_name: initialStoreMetadata.branch,
                connector_ref: initialStoreMetadata.connectorRef,
                file_path: initialStoreMetadata.filePath,
                repo_name: initialStoreMetadata.repoName,
                store_type: initialStoreMetadata.storeType
              },
              ...{
                last_commit_id: updatedGitDetails.lastCommitId,
                last_object_id: updatedGitDetails.lastObjectId,
                branch_name: updatedGitDetails?.branch,
                commit_message: gitDetails?.commitMsg
              }
            }

            response = await updateInputSet({
              body: {
                identifier: inputSetMetadata.identifier,
                name: inputSetMetadata.name ?? '',
                description: inputSetMetadata.description,
                tags: inputSetMetadata.tags,
                input_set_yaml: yamlStringify(inputSet),
                ...(git_details ? { git_details } : {})
              },
              'input-set': inputSetMetadata.identifier,
              queryParams: { pipeline: pipelineIdentifier },
              org: orgIdentifier,
              project: projectIdentifier
            })
          } else {
            throw new Error(getString('common.validation.identifierIsRequired'))
          }
        } else {
          const git_details = initialStoreMetadata.storeType === 'REMOTE' && {
            ...{
              branch_name: initialStoreMetadata.branch,
              connector_ref: initialStoreMetadata.connectorRef,
              file_path: initialStoreMetadata.filePath,
              repo_name: initialStoreMetadata.repoName,
              store_type: initialStoreMetadata.storeType
            },
            ...{
              branch_name: gitDetails?.branch,
              commit_message: gitDetails?.commitMsg
            }
          }

          response = await createInputSet({
            body: {
              identifier: inputSetMetadata?.identifier ?? '',
              name: inputSetMetadata?.name ?? '',
              description: inputSetMetadata?.description,
              tags: inputSetMetadata?.tags,
              input_set_yaml: yamlStringify({ ...inputSet, kind: 'input-set' }),
              ...(git_details ? { git_details } : {})
            },
            queryParams: { pipeline: pipelineIdentifier },
            org: orgIdentifier,
            project: projectIdentifier
          })
        }

        // For inline input set
        if (initialStoreMetadata.storeType !== StoreType.REMOTE) {
          showSuccess(getString('inputSets.inputSetSaved'))
          onCreateUpdateInputSetSuccess(response)
        }
      } catch (e) {
        const errors = getFormattedErrorsOpenAPI(e?.errors)
        if (!isEmpty(errors)) {
          setFormErrors(errors)
        }

        throw e
      }

      return {
        nextCallback: () => onCreateUpdateInputSetSuccess(response),
        status: response?.content.identifier ? 'SUCCESS' : 'FAILURE'
      }
    },
    [
      isEdit,
      initialGitDetails,
      initialStoreMetadata.storeType,
      initialStoreMetadata.branch,
      initialStoreMetadata.connectorRef,
      initialStoreMetadata.filePath,
      initialStoreMetadata.repoName,
      updateInputSet,
      pipelineIdentifier,
      orgIdentifier,
      projectIdentifier,
      getString,
      createInputSet,
      showSuccess,
      setFormErrors
    ]
  )

  const { openSaveToGitDialog } = useSaveToGitDialog<SaveToGitPayload>({
    onSuccess: (gitData: GitData, payload?: SaveToGitPayload, objectId?: string): Promise<UseSaveSuccessResponse> =>
      createUpdateInputSet({
        inputSet: payload?.inputSet,
        inputSetMetadata: payload?.inputSetMetadata,
        gitDetails: gitData,
        objectId,
        onCreateUpdateInputSetSuccess: onCreateUpdateSuccess
        // conflictCommitId: gitData?.resolvedConflictCommitId
      })
  })

  const handleSubmit = React.useCallback(
    async ({
      inputSet,
      inputSetMetadata,
      storeMetadata,
      gitDetails // TODO
    }: {
      inputSet: InputSetY1
      inputSetMetadata: InputSetMetadataY1
      storeMetadata?: StoreMetadata
      gitDetails: EntityGitDetails
    }) => {
      if (storeMetadata?.storeType === StoreType.REMOTE) {
        setInitialStoreMetadata(defaultTo(storeMetadata, {}))
        setInitialGitDetails(
          defaultTo(isEdit ? gitDetailsV1toV0(inputSetResponse?.content?.git_details) : gitDetails, {})
        )

        const resource: GitResourceInterface = {
          type: 'InputSets',
          name: inputSetMetadata.name as string,
          identifier: inputSetMetadata.identifier as string,
          gitDetails: isEdit ? gitDetailsV1toV0(inputSetResponse?.content?.git_details) : gitDetails,
          storeMetadata: storeMetadata?.storeType === StoreType.REMOTE ? storeMetadata : undefined
        }
        openSaveToGitDialog({
          isEditing: isEdit,
          resource,
          payload: { inputSet: inputSet, inputSetMetadata: inputSetMetadata, gitMetadata: storeMetadata }
        })
      } else {
        createUpdateInputSet({
          inputSet,
          inputSetMetadata,
          onCreateUpdateInputSetSuccess: onCreateUpdateSuccess
        })
      }
    },
    [createUpdateInputSet, inputSetResponse?.content?.git_details, isEdit, onCreateUpdateSuccess, openSaveToGitDialog]
  )

  return {
    handleSubmit
  }
}
