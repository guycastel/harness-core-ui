/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { pick } from 'lodash-es'
import { useMemo } from 'react'
import { flattenObject, removeNullAndEmpty } from '@common/components/Filter/utils/FilterUtils'
import { useStrings } from 'framework/strings'
import type { FilterProperties } from 'services/pipeline-ng'

export const usePipelineListFilterFieldToLabelMapping = () => {
  const { getString } = useStrings()

  return useMemo(() => {
    return new Map<string, string>([
      ['name', getString('name')],
      ['description', getString('description')],
      ['pipelineTags', getString('tagsLabel')],
      ['sourceBranch', getString('common.sourceBranch')],
      ['targetBranch', getString('common.targetBranch')],
      ['branch', getString('pipelineSteps.deploy.inputSet.branch')],
      ['tag', getString('tagLabel')],
      ['repoNames', getString('common.repositoryName')],
      ['buildType', getString('filters.executions.buildType')],
      ['deploymentTypes', getString('deploymentTypeText')],
      ['infrastructureTypes', getString('infrastructureTypeText')],
      ['serviceNames', getString('services')],
      ['environmentNames', getString('environments')]
    ])
  }, [])
}

export const useExecutionListFilterFieldToLabelMapping = () => {
  const { getString } = useStrings()

  return useMemo(() => {
    return new Map<string, string>([
      ['pipelineName', getString('filters.executions.pipelineName')],
      ['status', getString('status')],
      ['sourceBranch', getString('common.sourceBranch')],
      ['targetBranch', getString('common.targetBranch')],
      ['branch', getString('pipelineSteps.deploy.inputSet.branch')],
      ['tag', getString('tagLabel')],
      ['buildType', getString('filters.executions.buildType')],
      ['repoName', getString('common.repositoryName')],
      ['serviceDefinitionTypes', getString('deploymentTypeText')],
      ['infrastructureType', getString('infrastructureTypeText')],
      ['serviceIdentifiers', getString('services')],
      ['envIdentifiers', getString('environments')]
    ])
  }, [])
}

export const useFilterWithValidFieldsWithMetaInfo = (
  filterProperties: FilterProperties = {},
  fieldToLabelMapping: Map<string, string>
) => {
  const { getString } = useStrings()

  const filterWithValidFields = removeNullAndEmpty(
    pick(flattenObject(filterProperties || {}), ...fieldToLabelMapping.keys())
  )
  const filterWithValidFieldsWithMetaInfo =
    filterWithValidFields.sourceBranch && filterWithValidFields.targetBranch
      ? Object.assign(filterWithValidFields, { buildType: getString('filters.executions.pullOrMergeRequest') })
      : filterWithValidFields.branch
      ? Object.assign(filterWithValidFields, { buildType: getString('pipelineSteps.deploy.inputSet.branch') })
      : filterWithValidFields.tag
      ? Object.assign(filterWithValidFields, { buildType: getString('tagLabel') })
      : filterWithValidFields

  return filterWithValidFieldsWithMetaInfo
}