/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import ArtifactConditionsPanel from '@triggers/components/steps/ArtifactTriggerConditionsPanel/ArtifactConditionsPanel'
import ArtifactTriggerConfigPanel from '@triggers/components/steps/ArtifactTriggerConfigPanel/ArtifactTriggerConfigPanel'
import WebhookPipelineInputPanelV1 from '@triggers/pages/triggers/views/V1/WebhookPipelineInputPanelV1'
import PipelineInputPanel from '@triggers/components/steps/PipelineInputPanel/PipelineInputPanel'
import { Trigger, TriggerProps } from '../Trigger'
import ArtifactTriggerWizard from './ArtifactTriggerWizard'
import type { TriggerBaseType } from '../TriggerInterface'

export abstract class ArtifactTrigger<T> extends Trigger<T> {
  protected baseType: TriggerBaseType = 'Artifact'

  renderStepOne(): JSX.Element {
    return <ArtifactTriggerConfigPanel />
  }

  renderStepTwo(): JSX.Element {
    return <ArtifactConditionsPanel />
  }

  renderStepThree(isSimplifiedYAML?: boolean): JSX.Element {
    return isSimplifiedYAML ? <WebhookPipelineInputPanelV1 /> : <PipelineInputPanel />
  }

  renderTrigger(props: TriggerProps<T>): JSX.Element {
    return (
      <ArtifactTriggerWizard {...props}>
        {this.renderStepOne()}
        {this.renderStepTwo()}
        {this.renderStepThree(props.isSimplifiedYAML)}
      </ArtifactTriggerWizard>
    )
  }
}
