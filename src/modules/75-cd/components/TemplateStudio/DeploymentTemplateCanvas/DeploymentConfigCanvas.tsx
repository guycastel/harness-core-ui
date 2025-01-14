/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { set } from 'lodash-es'
import produce from 'immer'
import { useToaster } from '@harness/uicore'
import type { TemplateFormRef } from '@templates-library/components/TemplateStudio/TemplateStudioInternal'
import { getScopeBasedTemplateRef } from '@pipeline/utils/templateUtils'
import { useGlobalEventListener } from '@common/hooks'
import type { TemplateSummaryResponse } from 'services/template-ng'
import { DrawerTypes } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineActions'
import {
  getUpdatedDeploymentConfig,
  getUpdatedTemplateDetailsByRef
} from '@cd/components/TemplateStudio/DeploymentTemplateCanvas/DeploymentTemplateForm/components/ExecutionPanel/ExecutionPanelUtils'
import { useDeploymentContext } from '@cd/context/DeploymentContext/DeploymentContextProvider'
import { DeploymentConfigStepDrawer } from '@cd/components/TemplateStudio/DeploymentTemplateCanvas/DeploymentTemplateForm/components/DeploymentConfigStepDrawer/DeploymentConfigStepDrawer'
import { DeployStageErrorProvider } from '@pipeline/context/StageErrorContext'
import { DeploymentConfigFormWithRef } from './DeploymentTemplateForm/DeploymentConfigForm'

function useSaveStepTemplateListener(): void {
  const {
    drawerData,
    setDrawerData,
    deploymentConfig,
    updateDeploymentConfig,
    templateDetailsByRef,
    setTemplateDetailsByRef
  } = useDeploymentContext()
  const { showWarning } = useToaster()

  const updateViewForSavedStepTemplate = (savedTemplate: TemplateSummaryResponse) => {
    const templateRef = getScopeBasedTemplateRef(savedTemplate as TemplateSummaryResponse)
    const stepTemplateRefs = deploymentConfig.execution?.stepTemplateRefs || /* istanbul ignore next */ []
    if (stepTemplateRefs.some(item => item === templateRef)) {
      showWarning('Duplicate step cannot be added')
      return
    }
    const updatedDeploymentConfig = getUpdatedDeploymentConfig({ templateRef, deploymentConfig })
    const updatedTemplateDetailsByRef = getUpdatedTemplateDetailsByRef({
      templateDetailsObj: savedTemplate as TemplateSummaryResponse,
      templateDetailsByRef,
      templateRef
    })

    const updatedDrawerData = produce(drawerData, draft => {
      set(draft, 'type', DrawerTypes.AddStep)
      set(draft, 'data.isDrawerOpen', false)
    })
    setTemplateDetailsByRef(updatedTemplateDetailsByRef)
    updateDeploymentConfig(updatedDeploymentConfig)
    setDrawerData(updatedDrawerData)
  }

  useGlobalEventListener('TEMPLATE_SAVED', event => {
    const { detail: savedTemplate } = event
    if (savedTemplate) {
      updateViewForSavedStepTemplate(savedTemplate)
    }
  })
}

// eslint-disable-next-line react/display-name
export const DeploymentConfigCanvasWithRef = React.forwardRef(
  (_props: unknown, formikRef: TemplateFormRef): JSX.Element => {
    useSaveStepTemplateListener()

    return (
      <DeployStageErrorProvider>
        <DeploymentConfigFormWithRef ref={formikRef} />
        <DeploymentConfigStepDrawer />
      </DeployStageErrorProvider>
    )
  }
)
