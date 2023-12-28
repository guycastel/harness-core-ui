/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import * as Yup from 'yup'
import type { SelectOption } from '@harness/uicore'
import { defaultTo } from 'lodash-es'

import { NameSchema, IdentifierSchema } from '@common/utils/Validation'
import type { UseStringsReturn } from 'framework/strings'
import type {
  ClonePipelineProperties,
  ClonePipelineQueryParams,
  PMSPipelineSummaryResponse
} from 'services/pipeline-ng'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { CardSelectInterface } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect'
import { isHarnessCodeRepoEntity } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect.utils'

export type OriginalPipeline = Pick<
  PMSPipelineSummaryResponse,
  'name' | 'identifier' | 'description' | 'tags' | 'connectorRef' | 'storeType' | 'gitDetails'
>

export interface FormState
  extends Required<ClonePipelineProperties>,
    Omit<OriginalPipeline, 'storeType' | 'gitDetails' | 'connectorRef'> {
  provider?: CardSelectInterface
  connectorRef?: string | SelectOption
  storeType: StoreType
  repo?: string
  branch?: string
  filePath?: string
  commitMsg?: string
}

export function getValidationSchema(getString: UseStringsReturn['getString']): Yup.ObjectSchema {
  return Yup.object().shape({
    name: NameSchema(getString),
    identifier: IdentifierSchema(getString),
    destinationConfig: Yup.mixed().when('storeType', {
      is: StoreType.INLINE,
      then: Yup.object().shape({
        orgIdentifier: Yup.string().trim().required(getString('validation.orgValidation')),
        projectIdentifier: Yup.string().trim().required(getString('common.validation.projectIsRequired'))
      })
    }),
    storeType: Yup.string().oneOf(Object.values(StoreType)).required(getString('common.validation.typeIsRequired')),
    repo: Yup.mixed().when('storeType', {
      is: StoreType.REMOTE,
      then: Yup.string().trim().required(getString('common.git.validation.repoRequired'))
    }),
    connectorRef: Yup.mixed().when(['storeType', 'provider'], {
      is: (storeType, provider) => storeType === StoreType.REMOTE && !isHarnessCodeRepoEntity(provider?.type),
      then: Yup.string().trim().required(getString('platform.connectors.validation.connectorIsRequired'))
    }),
    branch: Yup.mixed().when('storeType', {
      is: StoreType.REMOTE,
      then: Yup.string().trim().required(getString('common.git.validation.branchRequired'))
    }),
    filePath: Yup.mixed().when('storeType', {
      is: StoreType.REMOTE,
      then: Yup.string().trim().required(getString('common.git.validation.filePath'))
    }),
    commitMsg: Yup.mixed().when('storeType', {
      is: StoreType.REMOTE,
      then: Yup.string().trim().required(getString('common.git.validation.commitMessage'))
    })
  })
}

export interface GetInitialValuesProps {
  originalPipeline: OriginalPipeline
  supportingGitSimplification?: boolean
  isGitXEnforced?: boolean
  defaultStoreTypeSetting?: StoreMetadata['storeType']
  orgIdentifier: string
  projectIdentifier: string
}

export function getInitialValues(props: GetInitialValuesProps): FormState {
  const {
    originalPipeline,
    defaultStoreTypeSetting,
    supportingGitSimplification,
    isGitXEnforced,
    orgIdentifier,
    projectIdentifier
  } = props
  return {
    name: `${originalPipeline.name} - Clone`,
    identifier: `${originalPipeline.identifier}_Clone`,
    tags: originalPipeline.tags,
    description: originalPipeline.description,
    storeType: supportingGitSimplification
      ? isGitXEnforced
        ? StoreType.REMOTE
        : (defaultTo(originalPipeline.storeType, defaultStoreTypeSetting) as StoreType)
      : StoreType.INLINE,
    sourceConfig: {
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier: originalPipeline.identifier
    },
    destinationConfig: {
      orgIdentifier,
      projectIdentifier
    },
    connectorRef: originalPipeline.connectorRef,
    repo: originalPipeline.gitDetails?.repoName,
    branch: defaultTo(originalPipeline.gitDetails?.branch, 'main'),
    filePath: defaultTo(originalPipeline.gitDetails?.filePath, '.harness/pipeline.yaml').replace(
      '.yaml',
      '_Clone.yaml'
    ),
    commitMsg: `Clone pipeline ${originalPipeline.name}`,
    cloneConfig: {
      connectors: false,
      inputSets: false,
      templates: false,
      triggers: false
    }
  }
}

export function processFormData(
  formData: FormState,
  accountId: string
): [Required<ClonePipelineProperties>, ClonePipelineQueryParams] {
  const data: Required<ClonePipelineProperties> = {
    sourceConfig: { ...formData.sourceConfig },
    destinationConfig: {
      ...formData.destinationConfig,
      pipelineIdentifier: formData.identifier,
      pipelineName: formData.name,
      description: formData.description,
      tags: formData.tags
    },
    cloneConfig: { ...formData.cloneConfig }
  }
  const queryParams: ClonePipelineQueryParams = {
    accountIdentifier: accountId
  }

  queryParams.storeType = formData.storeType

  if (formData.storeType === StoreType.REMOTE) {
    queryParams.repoName = formData.repo
    queryParams.branch = formData.branch
    queryParams.filePath = formData.filePath
    queryParams.connectorRef =
      typeof formData.connectorRef === 'string'
        ? formData.connectorRef
        : /*istanbul ignore next */ (formData.connectorRef?.value as string)
    queryParams.commitMsg = formData.commitMsg
  }

  return [data, queryParams]
}
