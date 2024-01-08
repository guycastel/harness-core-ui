/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { cloneDeep, defaultTo, forOwn, pick } from 'lodash-es'
import { CompletionItemKind } from 'vscode-languageserver-types'
import { GitDetails } from '@harnessio/react-pipeline-service-client'
import { CompletionItemInterface } from '@modules/10-common/interfaces/YAMLBuilderProps'
import { EntityGitDetails } from 'services/pipeline-ng'
import { StoreMetadata } from '@modules/10-common/constants/GitSyncTypes'
import {
  FromikInputSetY1,
  InputSetKVPairs,
  InputSetMetadataY1,
  InputSetY1,
  InputSetsY1,
  SelectedItemsType
} from './types'
import { SelectedInputSetListValue } from '../InputSetSelector/SelectedInputSetList'

export const inputSetIdsToSelectedItems = (
  inputSetIds: InputSetsY1,
  allInputSetItems: SelectedItemsType[]
): SelectedItemsType[] => {
  return allInputSetItems.filter(item => inputSetIds.includes(item.value as string))
}

export const getInputSetFromYaml = (
  values: InputSetY1,
  options: { escapeEmpty: boolean } = { escapeEmpty: false }
): InputSetY1 => {
  const ret = cloneDeep(values)

  if (ret.spec) {
    const spec = ret.spec
    if (options.escapeEmpty) {
      forOwn(spec, (value: unknown, key: unknown) => {
        if (key === 'input_sets') return

        if (typeof key === 'string' && typeof value === 'string') {
          spec[key as string] = value === '' ? '""' : value
        }
      })
    }
  }

  return ret
}

export const replaceEmptyWithNull = (values: FromikInputSetY1): { changed: boolean; values: FromikInputSetY1 } => {
  let changed = false
  const retValues = cloneDeep(values)

  forOwn(values.spec, (value: unknown, key: unknown) => {
    if (key === 'input_sets') return

    if (typeof key === 'string') {
      if (retValues.spec) {
        if (value === '' || value === null) {
          changed = true
          retValues.spec[key as string] = null
        } else {
          retValues.spec[key as string] = value
        }
      }
    }
  })

  return { changed, values: retValues }
}

export const addRemoveKeysFromInputSet = (
  inputSet: FromikInputSetY1,
  visibleKeys: string[],
  mergedInputSetValues: InputSetKVPairs
): FromikInputSetY1 => {
  const newInputSet = cloneDeep(inputSet)
  const spec = newInputSet.spec ?? {}

  // add
  visibleKeys.forEach(key => {
    // apply merged or null
    if (typeof spec?.[key] === 'undefined') spec[key] = mergedInputSetValues[key] ?? null
  })

  // remove
  Object.keys(spec).forEach(key => {
    if (!visibleKeys.includes(key) && key !== 'input_sets') {
      delete spec[key]
    }
  })

  newInputSet.spec = spec

  return newInputSet
}

export const getDefaultInputSet = (): InputSetY1 => {
  return {
    version: 1,
    kind: 'input-set'
  }
}
export const formikToYaml = (values: FromikInputSetY1, options?: { escapeEmpty?: boolean }): InputSetY1 => {
  const ret = {
    version: 1,
    kind: 'input-set',
    spec: values.spec
  }

  if (ret.spec) {
    const spec = ret.spec
    if (spec && options?.escapeEmpty) {
      forOwn(ret.spec, (value: unknown, key: unknown) => {
        if (typeof key === 'string' && typeof value === 'string') {
          spec[key as string] = value === '""' ? '' : value
        }
      })
    }
  }

  return ret
}

export const formikToMetadata = (values: FromikInputSetY1): InputSetMetadataY1 => {
  return pick(values, 'name', 'identifier', 'description', 'tags')
}

export const formikToGitMetadata = (values: FromikInputSetY1): StoreMetadata => {
  return {
    branch: values.branch,
    connectorRef: values.connectorRef as string,
    repoName: values.repo,
    filePath: values.filePath,
    storeType: values.storeType
  }
}

export const constructInputSetYamlObject = (item: SelectedInputSetListValue): CompletionItemInterface => ({
  label: defaultTo(item.label, ''),
  insertText: defaultTo(item.value as string, ''),
  kind: CompletionItemKind.Field
})

export const gitDetailsV1toV0 = (gitDetails?: GitDetails): EntityGitDetails | undefined => {
  if (gitDetails) {
    // TODO check missing properties
    return {
      branch: gitDetails.branch_name,
      commitId: gitDetails.commit_id,
      filePath: gitDetails.file_path,
      fileUrl: gitDetails.file_url,
      // isHarnessCodeRepo?: ?
      objectId: gitDetails.object_id,
      // parentEntityConnectorRef: ?,
      // parentEntityRepoName: ?
      // repoIdentifier: ?
      repoName: gitDetails.repo_name,
      repoUrl: gitDetails.repo_url
      // rootFolder: ?
    }
  }
}

export const gitDetailsV0toV1 = (gitDetails: EntityGitDetails): GitDetails | undefined => {
  if (gitDetails) {
    // TODO check missing properties
    return {
      branch_name: gitDetails.branch,
      commit_id: gitDetails.commitId,
      file_path: gitDetails.filePath,
      file_url: gitDetails.fileUrl,
      // isHarnessCodeRepo?: ?
      object_id: gitDetails.objectId,
      // parentEntityConnectorRef: ?,
      // parentEntityRepoName: ?
      // repoIdentifier: ?
      repo_name: gitDetails.repoName,
      repo_url: gitDetails.repoUrl
      // rootFolder: ?
    }
  }
}
