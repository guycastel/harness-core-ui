/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { ReactElement } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import type { ButtonVariation } from '@harness/uicore'
import { ResourceType } from '@common/interfaces/GitSyncInterface'
import routes from '@common/RouteDefinitions'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import CreatePipelineButton from '@pipeline/components/CreatePipelineButton/CreatePipelineButton'
import useMigrateResource from '@pipeline/components/MigrateResource/useMigrateResource'
import { useStrings } from 'framework/strings'
import type { PMSPipelineSummaryResponse } from 'services/pipeline-ng'
import { isSimplifiedYAMLEnabled } from '@common/utils/utils'
import { getRouteProps } from '../PipelineListUtils'
import type { PipelineListPagePathParams } from '../types'

interface CreatePipelineProps {
  onSuccess: () => void
  variation?: ButtonVariation
}

export function CreatePipeline({ onSuccess, variation }: CreatePipelineProps): ReactElement {
  const { getString } = useStrings()
  const pathParams = useParams<PipelineListPagePathParams>()
  const history = useHistory()
  const { CI_YAML_VERSIONING } = useFeatureFlags()

  const goToPipelineStudio = (pipeline?: PMSPipelineSummaryResponse): void =>
    history.push(routes.toPipelineStudio(getRouteProps(pathParams, pipeline)))

  const goToPipelineStudioV1 = (pipeline?: PMSPipelineSummaryResponse): void =>
    history.push(routes.toPipelineStudioV1(getRouteProps(pathParams, pipeline)))

  const { showMigrateResourceModal: showImportResourceModal } = useMigrateResource({
    resourceType: ResourceType.PIPELINES,
    modalTitle: getString('common.importEntityFromGit', { resourceType: getString('common.pipeline') }),
    onSuccess
  })

  return (
    <CreatePipelineButton
      label={getString('common.createPipeline')}
      onCreatePipelineClick={() =>
        isSimplifiedYAMLEnabled(pathParams.module, CI_YAML_VERSIONING)
          ? goToPipelineStudioV1({ identifier: '-1' })
          : goToPipelineStudio({ identifier: '-1' })
      }
      onImportPipelineClick={showImportResourceModal}
      variation={variation}
    />
  )
}
