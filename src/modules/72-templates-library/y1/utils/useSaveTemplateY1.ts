/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { defaultTo, isEmpty, omit } from 'lodash-es'
import { useParams } from 'react-router-dom'
import type { ShowModal } from '@harness/use-modal'
import {
  CreateTemplatesAccProps,
  CreateTemplatesProjectOkResponse,
  UpdateTemplateAccProps,
  createTemplatesAcc,
  createTemplatesOrg,
  createTemplatesProject,
  updateTemplateAcc,
  updateTemplateOrg,
  updateTemplateProject
} from '@harnessio/react-template-service-client'
import { EntityGitDetails, GovernanceMetadata, TemplateSummaryResponse } from 'services/template-ng'
import type { GitData } from '@common/modals/GitDiffEditor/useGitDiffEditorDialog'
import { UseSaveSuccessResponse, useSaveToGitDialog } from '@common/modals/SaveToGitDialog/useSaveToGitDialog'
import type { SaveToGitFormInterface } from '@common/components/SaveToGitForm/SaveToGitForm'
import { DefaultNewTemplateId } from 'framework/Templates/templates'
import { yamlStringify } from '@common/utils/YamlHelperMethods'
import { sanitize } from '@common/utils/JSONUtils'
import type { GitQueryParams, ModulePathParams, TemplateStudioPathProps } from '@common/interfaces/RouteInterfaces'
import { useQueryParams } from '@common/hooks'
import type { PromiseExtraArgs } from 'framework/Templates/TemplateConfigModal/TemplateConfigModal'
import { SaveTemplateAsType, StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import {
  NGTemplateInfoConfigY1_Tmp,
  TemplateMetadata_Tmp
} from '@modules/72-templates-library/y1/components/TemplateContext/types'
import { Status } from '@modules/10-common/utils/Constants'

export interface FetchTemplateUnboundProps {
  forceFetch?: boolean
  forceUpdate?: boolean
  signal?: AbortSignal
  repoIdentifier?: string
  branch?: string
}

declare global {
  interface WindowEventMap {
    TEMPLATE_SAVED: CustomEvent<TemplateSummaryResponse>
  }
}

interface SaveTemplateObj {
  template: NGTemplateInfoConfigY1_Tmp
  templateMetadata: TemplateMetadata_Tmp
}

interface LastRemoteObjectId {
  lastObjectId?: string
  lastCommitId?: string
}

interface UseSaveTemplateReturnType {
  saveAndPublish: (
    updatedTemplate: NGTemplateInfoConfigY1_Tmp,
    updatedTemplateMetadata: TemplateMetadata_Tmp,
    extraInfo: PromiseExtraArgs
  ) => Promise<UseSaveSuccessResponse>
}

export interface TemplateContextMetadata {
  onSuccessCallback: (
    latestTemplate: TemplateSummaryResponse,
    updatedGitDetails?: SaveToGitFormInterface,
    updatedStoreMetadata?: StoreMetadata,
    saveAsType?: SaveTemplateAsType.NEW_LABEL_VERSION | SaveTemplateAsType.NEW_TEMPALTE
  ) => Promise<void>
  showOPAErrorModal: ShowModal
  setGovernanceMetadata: React.Dispatch<React.SetStateAction<GovernanceMetadata | undefined>>
  isY1?: boolean
}

interface SaveAndPublishTemplateArgs {
  latestTemplate: NGTemplateInfoConfigY1_Tmp
  latestTemplateMetadata: TemplateMetadata_Tmp
  comments?: string
  isEdit?: boolean
  updatedGitDetails?: SaveToGitFormInterface
  lastObject?: LastRemoteObjectId
  storeMetadata?: StoreMetadata
  saveAsType?: SaveTemplateAsType.NEW_LABEL_VERSION | SaveTemplateAsType.NEW_TEMPALTE
  saveAsNewVersionOfExistingTemplate?: boolean
  isGitSyncOrRemoteTemplate?: boolean
  isY1?: boolean
}
export function useSaveTemplateY1({
  onSuccessCallback,
  // showOPAErrorModal,
  // setGovernanceMetadata,
  isY1
}: TemplateContextMetadata): UseSaveTemplateReturnType {
  const { templateIdentifier /*, projectIdentifier, orgIdentifier, accountId*/ } = useParams<
    TemplateStudioPathProps & ModulePathParams
  >()
  const { isGitSyncEnabled: isGitSyncEnabledForProject, gitSyncEnabledOnlyForFF } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const { branch } = useQueryParams<GitQueryParams>()

  // const stringifyTemplate = React.useCallback(
  //   // Important to sanitize the final template to avoid sending null values as it fails schema validation
  //   (temp: NGTemplateInfoConfigY1_Tmp) =>
  //     yamlStringify({
  //       template: sanitize(temp, {
  //         removeEmptyString: false,
  //         removeEmptyObject: false,
  //         removeEmptyArray: false
  //       })
  //     }),
  //   []
  // )

  const updateExistingLabel = async (
    latestTemplate: NGTemplateInfoConfigY1_Tmp,
    latestTemplateMetadata: TemplateMetadata_Tmp,
    comments?: string,
    updatedGitDetails?: SaveToGitFormInterface,
    lastObject?: LastRemoteObjectId,
    storeMetadata?: StoreMetadata,
    saveAsType?: SaveTemplateAsType.NEW_LABEL_VERSION | SaveTemplateAsType.NEW_TEMPALTE
  ): Promise<UseSaveSuccessResponse> => {
    const templateYaml = yamlStringify(
      sanitize(latestTemplate, {
        removeEmptyString: false,
        removeEmptyObject: false,
        removeEmptyArray: false
      })
    )

    const payload: UpdateTemplateAccProps = {
      body: {
        template_yaml: templateYaml,
        comments,
        git_details: {
          base_branch:
            updatedGitDetails && updatedGitDetails.isNewBranch ? defaultTo(branch, storeMetadata?.branch) : undefined,
          branch_name: defaultTo(updatedGitDetails?.branch, storeMetadata?.branch),
          commit_message: updatedGitDetails?.commitMsg,
          file_path: defaultTo(updatedGitDetails?.filePath, storeMetadata?.filePath),
          repo_name: defaultTo(updatedGitDetails?.repoName, storeMetadata?.repoName),
          store_type: storeMetadata?.storeType,
          connector_ref: storeMetadata?.connectorRef,
          last_commit_id: lastObject?.lastObjectId,
          last_object_id: lastObject?.lastObjectId
        },
        description: latestTemplateMetadata.description,
        identifier: latestTemplateMetadata.identifier,
        label: latestTemplateMetadata.versionLabel,
        name: latestTemplateMetadata.name,
        tags: latestTemplateMetadata.tags
      },
      template: latestTemplateMetadata.identifier,
      version: latestTemplateMetadata.versionLabel
    }

    let response: CreateTemplatesProjectOkResponse | undefined

    try {
      switch (true) {
        case !!latestTemplateMetadata.orgIdentifier && !!latestTemplateMetadata.projectIdentifier:
          response = await updateTemplateProject({
            ...payload,
            org: latestTemplateMetadata.orgIdentifier ?? '',
            project: latestTemplateMetadata.projectIdentifier ?? ''
          })
          break
        case !!latestTemplateMetadata.orgIdentifier:
          response = await updateTemplateOrg({ ...payload, org: latestTemplateMetadata.orgIdentifier ?? '' })
          break
        default:
          response = await updateTemplateAcc(payload)
          break
      }
    } catch (err) {
      throw response || err
    }

    const template: TemplateSummaryResponse = {
      yaml: response?.content.yaml,
      accountId: response?.content.account,
      childType: response?.content.child_type,
      description: response?.content.description,
      // TODO: check
      // entityValidityDetails,
      gitDetails: {
        branch: response?.content.git_details?.branch_name,
        commitId: response?.content.git_details?.commit_id,
        filePath: response?.content.git_details?.file_path,
        fileUrl: response?.content.git_details?.file_url,
        objectId: response?.content.git_details?.object_id,
        repoName: response?.content.git_details?.repo_name,
        repoUrl: response?.content.git_details?.repo_url
        // TODO: check
        // rootFolder
        // parentEntityConnectorRef,
        // parentEntityRepoName,
        // repoIdentifier,
      },
      // TODO: check
      // icon,
      identifier: response?.content.identifier,
      lastUpdatedAt: response?.content.updated,
      name: response?.content.name,
      orgIdentifier: response?.content.org,
      projectIdentifier: response?.content.project,
      stableTemplate: response?.content.stable_template,
      tags: response?.content.tags,
      templateEntityType: response?.content.entity_type,
      templateScope: response?.content.scope
    }

    const isInlineTemplate = isEmpty(updatedGitDetails) && storeMetadata?.storeType !== StoreType.REMOTE
    if (isInlineTemplate) {
      onSuccessCallback(template, updatedGitDetails, storeMetadata, saveAsType)
    }

    const status = response?.content?.identifier ? Status.SUCCESS : undefined

    return {
      status: status,
      nextCallback: () => {
        onSuccessCallback(template, updatedGitDetails, storeMetadata, saveAsType)
      }
    }
  }

  const saveAndPublishTemplate = async (args: SaveAndPublishTemplateArgs): Promise<UseSaveSuccessResponse> => {
    const {
      latestTemplate,
      latestTemplateMetadata,
      comments,
      isEdit = false,
      updatedGitDetails,
      lastObject,
      storeMetadata,
      saveAsType,
      saveAsNewVersionOfExistingTemplate,
      isGitSyncOrRemoteTemplate
    } = args

    if (isEdit) {
      return updateExistingLabel(
        latestTemplate,
        latestTemplateMetadata,
        comments,
        updatedGitDetails,
        lastObject,
        storeMetadata,
        saveAsType
      )
    } else {
      const isNewTemplateIdentifierCreation =
        saveAsType !== SaveTemplateAsType.NEW_LABEL_VERSION &&
        !saveAsNewVersionOfExistingTemplate &&
        !isGitSyncOrRemoteTemplate

      const templateYaml = yamlStringify(
        sanitize(latestTemplate, {
          removeEmptyString: false,
          removeEmptyObject: false,
          removeEmptyArray: false
        })
      )

      const payload: CreateTemplatesAccProps = {
        body: {
          template_yaml: templateYaml,
          comments,
          ...(isNewTemplateIdentifierCreation ? { isNewTemplate: true } : {}),
          git_details: {
            base_branch:
              updatedGitDetails && updatedGitDetails.isNewBranch ? defaultTo(branch, storeMetadata?.branch) : undefined,
            branch_name: defaultTo(updatedGitDetails?.branch, storeMetadata?.branch),
            commit_message: updatedGitDetails?.commitMsg,
            file_path: defaultTo(updatedGitDetails?.filePath, storeMetadata?.filePath),
            repo_name: defaultTo(updatedGitDetails?.repoName, storeMetadata?.repoName),
            store_type: storeMetadata?.storeType,
            connector_ref: storeMetadata?.connectorRef
          },
          description: latestTemplateMetadata.description,
          identifier: latestTemplateMetadata.identifier,
          label: latestTemplateMetadata.versionLabel,
          name: latestTemplateMetadata.name,
          tags: latestTemplateMetadata.tags,
          is_stable: true
        }
      }

      let response: CreateTemplatesProjectOkResponse | undefined

      try {
        switch (true) {
          case !!latestTemplateMetadata.orgIdentifier && !!latestTemplateMetadata.projectIdentifier:
            response = await createTemplatesProject({
              ...payload,
              org: latestTemplateMetadata.orgIdentifier ?? '',
              project: latestTemplateMetadata.projectIdentifier ?? ''
            })
            break
          case !!latestTemplateMetadata.orgIdentifier:
            response = await createTemplatesOrg({ ...payload, org: latestTemplateMetadata.orgIdentifier ?? '' })
            break
          default:
            response = await createTemplatesAcc(payload)
            break
        }
      } catch (err) {
        throw response || err
      }

      // const governanceData: GovernanceMetadata | undefined = get(response, 'data.governanceMetadata')
      // const createdTemplate = response.data?.templateResponseDTO as TemplateSummaryResponse

      // setGovernanceMetadata({ ...governanceData, createdTemplate, updatedGitDetails, storeMetadata, saveAsType })
      // if (governanceData?.status === 'error' || governanceData?.status === 'warning') {
      //   showOPAErrorModal()
      //   return {
      //     status: 'FAILURE',
      //     governanceMetaData: { ...governanceData, createdTemplate, updatedGitDetails, storeMetadata, saveAsType }
      //   }
      // }

      const template: TemplateSummaryResponse = {
        yaml: response?.content.yaml,
        accountId: response?.content.account,
        childType: response?.content.child_type,
        description: response?.content.description,
        // TODO: check
        // entityValidityDetails,
        gitDetails: {
          branch: response?.content.git_details?.branch_name,
          commitId: response?.content.git_details?.commit_id,
          filePath: response?.content.git_details?.file_path,
          fileUrl: response?.content.git_details?.file_url,
          objectId: response?.content.git_details?.object_id,
          repoName: response?.content.git_details?.repo_name,
          repoUrl: response?.content.git_details?.repo_url
          // TODO: check
          // rootFolder
          // parentEntityConnectorRef,
          // parentEntityRepoName,
          // repoIdentifier,
        },
        // TODO: check
        // icon,
        identifier: response?.content.identifier,
        lastUpdatedAt: response?.content.updated,
        name: response?.content.name,
        orgIdentifier: response?.content.org,
        projectIdentifier: response?.content.project,
        stableTemplate: response?.content.stable_template,
        tags: response?.content.tags,
        templateEntityType: response?.content.entity_type,
        templateScope: response?.content.scope
      }

      const isInlineTemplate = isEmpty(updatedGitDetails) && storeMetadata?.storeType !== StoreType.REMOTE
      if (isInlineTemplate) {
        onSuccessCallback(template, updatedGitDetails, storeMetadata, saveAsType)
      }

      return {
        status: 'SUCCESS',
        nextCallback: () => {
          onSuccessCallback(template, updatedGitDetails, storeMetadata, saveAsType)
        }
      }
    }
  }

  const saveAndPublishWithGitInfo = async (
    updatedGitDetails: SaveToGitFormInterface,
    payload?: SaveTemplateObj,
    objectId?: string,
    isEdit = false,
    lastCommitId = '',
    storeMetadata?: StoreMetadata
  ): Promise<UseSaveSuccessResponse> => {
    const response = await saveAndPublishTemplate({
      latestTemplate: payload?.template as NGTemplateInfoConfigY1_Tmp,
      latestTemplateMetadata: payload?.templateMetadata as TemplateMetadata_Tmp,

      comments: '',
      isEdit,
      updatedGitDetails: omit(updatedGitDetails, 'name', 'identifier'),
      lastObject: templateIdentifier !== DefaultNewTemplateId ? { lastObjectId: objectId, lastCommitId } : {},
      storeMetadata,
      saveAsType: undefined,
      saveAsNewVersionOfExistingTemplate: undefined,
      isGitSyncOrRemoteTemplate: true,
      isY1
    })
    return response
  }

  const { openSaveToGitDialog } = useSaveToGitDialog<SaveTemplateObj>({
    onSuccess: (
      gitData: GitData,
      payload?: SaveTemplateObj,
      objectId?: string,
      isEdit = false,
      storeMetadata?: StoreMetadata
    ): Promise<UseSaveSuccessResponse> =>
      saveAndPublishWithGitInfo(
        gitData,
        payload,
        defaultTo(objectId, ''),
        isEdit,
        gitData?.resolvedConflictCommitId || gitData?.lastCommitId,
        storeMetadata
      )
  })

  const getUpdatedGitDetails = (
    currGitDetails: EntityGitDetails,
    latestTemplateMetadata: TemplateMetadata_Tmp,
    isEdit: boolean | undefined = false
  ): EntityGitDetails => ({
    ...currGitDetails,
    ...(!isEdit && {
      filePath: `${defaultTo(latestTemplateMetadata.identifier, '')}_${defaultTo(
        latestTemplateMetadata.versionLabel,
        ''
      ).replace(/[^a-zA-Z0-9-_]/g, '')}.yaml`
    })
  })

  const saveAndPublish = async (
    updatedTemplate: NGTemplateInfoConfigY1_Tmp,
    updatedTemplateMetadata: TemplateMetadata_Tmp,
    extraInfo: PromiseExtraArgs
  ): Promise<UseSaveSuccessResponse> => {
    const {
      isEdit,
      comment,
      updatedGitDetails,
      storeMetadata,
      disableCreatingNewBranch,
      saveAsType,
      saveAsNewVersionOfExistingTemplate
    } = extraInfo

    const isGitSyncOrRemoteTemplate =
      (isGitSyncEnabled && !isEmpty(updatedGitDetails)) || storeMetadata?.storeType === StoreType.REMOTE

    // if Git sync enabled then display modal
    if (isGitSyncOrRemoteTemplate) {
      openSaveToGitDialog({
        isEditing: defaultTo(isEdit, false),
        disableCreatingNewBranch,
        resource: {
          type: 'Template',
          name: updatedTemplateMetadata.name,
          identifier: updatedTemplateMetadata.identifier,
          gitDetails: getUpdatedGitDetails(defaultTo(updatedGitDetails, {}), updatedTemplateMetadata, isEdit),
          storeMetadata
        },
        payload: { template: omit(updatedTemplate, 'repo', 'branch'), templateMetadata: updatedTemplateMetadata }
      })
      return Promise.resolve({ status: 'SUCCESS' })
    }

    return saveAndPublishTemplate({
      latestTemplate: updatedTemplate,
      latestTemplateMetadata: updatedTemplateMetadata,
      comments: comment,
      isEdit,
      updatedGitDetails: undefined,
      lastObject: undefined,
      storeMetadata,
      saveAsType,
      saveAsNewVersionOfExistingTemplate,
      isGitSyncOrRemoteTemplate
    })
  }

  return {
    saveAndPublish
  }
}
