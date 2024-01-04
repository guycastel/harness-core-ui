/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { PipelinePathProps } from '@common/interfaces/RouteInterfaces'
import { usePermission } from '@rbac/hooks/usePermission'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { SettingType } from '@modules/10-common/constants/Utils'
import { useGetSettingValue } from 'services/cd-ng'

export const useIsTriggerCreatePermission = (): boolean => {
  const {
    pipelineIdentifier,
    accountId: accountIdentifier,
    orgIdentifier,
    projectIdentifier
  } = useParams<PipelinePathProps>()
  const [isTriggerCreatePermission, setIsTriggerCreatePermission] = useState(false)
  const { data: projectSettingData } = useGetSettingValue({
    identifier: SettingType.MANDATE_PIPELINE_CREATE_EDIT_PERMISSION_TO_CREATE_EDIT_TRIGGERS,
    queryParams: {
      accountIdentifier,
      orgIdentifier,
      projectIdentifier
    }
  })

  const [isExecutePipeline, isEditPipeline] = usePermission(
    {
      resource: {
        resourceType: ResourceType.PIPELINE,
        resourceIdentifier: pipelineIdentifier
      },
      permissions: [PermissionIdentifier.EXECUTE_PIPELINE, PermissionIdentifier.EDIT_PIPELINE],
      options: {
        skipCache: true
      }
    },
    [pipelineIdentifier]
  )

  useEffect(() => {
    /*
     * 1: projectSettingData = undefined (Initial value before API call) => Check for both EXECUTE_PIPELINE & EDIT_PIPELINE Permission
     * 2: MANDATE_PIPELINE_CREATE_EDIT_PERMISSION_TO_CREATE_EDIT_TRIGGERS = 'true' => Check for both EXECUTE_PIPELINE & EDIT_PIPELINE Permission
     * 3: MANDATE_PIPELINE_CREATE_EDIT_PERMISSION_TO_CREATE_EDIT_TRIGGERS = 'false' => Check for EXECUTE_PIPELINE Permission
     */
    const isEditExecutePipeline = isExecutePipeline && isEditPipeline
    setIsTriggerCreatePermission(
      projectSettingData?.data?.value
        ? projectSettingData.data.value === 'true'
          ? isEditExecutePipeline
          : isExecutePipeline
        : isEditExecutePipeline
    )
  }, [isExecutePipeline, isEditPipeline, projectSettingData])

  return isTriggerCreatePermission
}
