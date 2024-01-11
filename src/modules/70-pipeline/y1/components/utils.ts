/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { JsonNode } from 'services/cd-ng'
import { InputsKVPair } from './RunPipelineModal/RunPipelineFormY1'

export const STAGE_REGEX = 'spec.stages'
export const STEP_REGEX = 'spec.steps'

export const getLastStageIndexInPath = (path: string[]): number => {
  const fqn = path.join('.')
  const stageRegex = new RegExp(`${STAGE_REGEX}\\.([\\d]+)\\.`, 'g')
  const lastStages = Array.from(fqn.matchAll(stageRegex))

  if (lastStages.length > 0) {
    const lastMatch = lastStages[lastStages.length - 1]
    return parseInt(lastMatch[1], 10)
  }
  return 0
}

export const findPathAndIndex = (
  path: string[],
  entityName = 'steps'
): {
  path: string[]
  index: number
} => {
  const pathIndex = path.lastIndexOf(entityName)

  return {
    path: pathIndex !== -1 ? path.slice(0, pathIndex + 1) : path,
    index: parseInt(path?.[pathIndex + 1], 10) ?? 0
  }
}

export const getStepSanitizedData = (unSanitizedObj: JsonNode): JsonNode => {
  try {
    return JSON.parse(JSON.stringify(unSanitizedObj).replace(/:null/gi, ':""'))
  } catch (e) {
    return unSanitizedObj
  }
}

export const replaceEmptyStringsWithNull = (values: InputsKVPair): [boolean, InputsKVPair] => {
  let isReplaced = false

  const replacedValues = Object.fromEntries(
    Object.entries(values).map(([k, v]) => {
      if (v === '') {
        isReplaced = true
        return [k, null]
      }
      return [k, v]
    })
  )

  return [isReplaced, replacedValues]
}

export const wrapEmptyStrings = (values: InputsKVPair): InputsKVPair => {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => {
      if (v === '') {
        return [k, '""']
      }
      return [k, v]
    })
  )
}

export const unwrapEmptyStrings = (values: InputsKVPair): InputsKVPair => {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => {
      if (v === '""') {
        return [k, '']
      }
      return [k, v]
    })
  )
}
