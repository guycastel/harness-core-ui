/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { useMemo } from 'react'
import { usePipelineLoaderContext } from '../components/PipelineStudio/PipelineLoaderContext/PipelineLoaderContext'

export const YamlVersion = {
  '0': '0',
  '1': '1'
} as const

export type YamlVersion = keyof typeof YamlVersion

export type UseYamlVersion = () => {
  yamlVersion: YamlVersion
  isYamlV1: boolean
}

export const isYamlV1 = (yamlVersion?: YamlVersion): boolean => {
  return yamlVersion === YamlVersion[1]
}

export const useYamlVersion: UseYamlVersion = () => {
  const { yamlVersion: yamlVersionFromContext } = usePipelineLoaderContext()

  const yamlVersion = (yamlVersionFromContext as YamlVersion) ?? YamlVersion[0]

  const value = useMemo(
    () => ({
      yamlVersion,
      isYamlV1: isYamlV1(yamlVersion)
    }),
    [yamlVersion]
  )

  return value
}
