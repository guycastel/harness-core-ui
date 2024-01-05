/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Select } from '@harness/uicore'
import qs from 'qs'
import React from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { get } from 'lodash-es'
import { useQueryParams } from '@common/hooks'
import routesV1 from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import type { PipelineExecutionSummary } from 'services/pipeline-ng'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import css from './ExecutionArtifactsView.module.scss'

// Only CI and CD artifacts for SSCA, avoids node type like pipeline rollback, parallel
export function getSscaArtifactStageSetupIds(layoutNodeMap?: PipelineExecutionSummary['layoutNodeMap']): string[] {
  return Object.keys(layoutNodeMap ?? {}).filter(layoutNodeMapKey => {
    const _nodeType = get(layoutNodeMap, layoutNodeMapKey)?.nodeType as string
    return _nodeType && ['CI', 'Deployment'].includes(_nodeType)
  })
}

export function StageSelector(props: {
  layoutNodeMap?: PipelineExecutionSummary['layoutNodeMap']
}): React.ReactElement {
  const history = useHistory()
  const params = useParams<any>()
  const query = useQueryParams<any>()
  const { isNewNavEnabled } = useAppStore()
  const options = getSscaArtifactStageSetupIds(props.layoutNodeMap).map(value => ({
    value,
    label: props.layoutNodeMap![value].name!
  }))
  const selectedOption = options.find(option => option.value === query.stage)
  const routes = isNewNavEnabled ? routesV2 : routesV1

  // Need to have a selected change by default when we are opening a page
  if (!selectedOption && options.length > 0) {
    history.push(routes.toExecutionArtifactsView(params) + '?' + qs.stringify({ ...query, stage: options[0].value }))
  }

  return (
    <Select
      className={css.stageSelector}
      value={selectedOption}
      items={options}
      onChange={val => {
        history.push(routes.toExecutionArtifactsView(params) + '?' + qs.stringify({ ...query, stage: val.value }))
      }}
    />
  )
}
