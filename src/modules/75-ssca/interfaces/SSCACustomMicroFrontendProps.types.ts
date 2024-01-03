/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { Duration, TimeAgoPopover } from '@common/components'
import type { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { useQueryParamsOptions } from '@common/hooks/useQueryParams'
import { PolicyViolationsDrawer } from '@modules/70-pipeline/pages/execution/ExecutionArtifactsView/PolicyViolations/PolicyViolationsDrawer'
import { SLSAVerification } from '@modules/70-pipeline/pages/execution/ExecutionArtifactsView/ArtifactsTable/ArtifactTableCells'
import {
  useMetadataGetProject,
  useMetadataListPriorities,
  useMetadataListProjects
} from 'services/ticket-service/ticketServiceComponents'
export interface SSCACustomMicroFrontendProps {
  customHooks: {
    useQueryParams: typeof useQueryParams
    useUpdateQueryParams: typeof useUpdateQueryParams
    useQueryParamsOptions: typeof useQueryParamsOptions
  }
  customComponents: {
    Duration: typeof Duration
    PolicyViolationsDrawer: typeof PolicyViolationsDrawer
    SLSAVerification: typeof SLSAVerification
    TimeAgoPopover: typeof TimeAgoPopover
  }
  customServices: {
    useMetadataListProjects: typeof useMetadataListProjects
    useMetadataGetProject: typeof useMetadataGetProject
    useMetadataListPriorities: typeof useMetadataListPriorities
  }
}
