/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import type { IconName } from '@harness/uicore'
import { Template } from '@templates-library/components/AbstractTemplate/Template'
import { TemplateType } from '@templates-library/utils/templatesUtils'
import { PipelineTemplateCanvasWrapperWithRef } from '@templates-library/components/TemplateStudio/PipelineTemplateCanvas/PipelineTemplateCanvasWrapper'
import { Scope } from '@common/interfaces/SecretsInterface'
import { TemplateInputs, TemplateInputsProps } from '@templates-library/components/TemplateInputs/TemplateInputs'
import type { TemplateFormRef } from '@templates-library/components/TemplateStudio/TemplateStudioInternal'

export class PipelineTemplate extends Template {
  protected type = TemplateType.Pipeline
  protected label = 'Pipeline'
  protected icon: IconName = 'pipeline'
  protected allowedScopes = [Scope.PROJECT, Scope.ORG, Scope.ACCOUNT]
  protected colorMap = {
    color: '#004BA4',
    stroke: '#CCCBFF',
    fill: '#E8E8FF'
  }
  protected isRemoteEnabled = true

  renderTemplateCanvas(formikRef: TemplateFormRef): JSX.Element {
    return <PipelineTemplateCanvasWrapperWithRef ref={formikRef} />
  }

  renderTemplateInputsForm(props: TemplateInputsProps & { accountId: string }): JSX.Element {
    return <TemplateInputs template={props.template} templateInputSetFetchParams={props.templateInputSetFetchParams} />
  }
}
