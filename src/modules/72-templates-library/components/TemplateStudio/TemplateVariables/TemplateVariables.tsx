/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect } from 'react'
import { AllowedTypesWithRunTime, MultiTypeInputType, NestedAccordionProvider, PageError } from '@harness/uicore'
import { isEmpty, omit, set } from 'lodash-es'
import { produce } from 'immer'
import {
  MonitoredServiceConfig,
  useTemplateVariables
} from '@pipeline/components/TemplateVariablesContext/TemplateVariablesContext'
import { PageSpinner } from '@common/components'
import type { NGTemplateInfoConfig } from 'services/template-ng'
import StageCard from '@pipeline/components/PipelineStudio/PipelineVariables/Cards/StageCard'
import { TemplateContext } from '@templates-library/components/TemplateStudio/TemplateContext/TemplateContext'
import type {
  PipelineInfoConfig,
  StageElementConfig,
  StepElementConfig,
  StepGroupElementConfig
} from 'services/pipeline-ng'
import {
  StepCardPanel,
  StepGroupTemplateCard
} from '@pipeline/components/PipelineStudio/PipelineVariables/Cards/StepCard'
import factory from '@pipeline/components/PipelineSteps/PipelineStepFactory'
import { DefaultNewStageId } from '@templates-library/components/TemplateStudio/StageTemplateCanvas/StageTemplateForm/StageTemplateForm'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import { sanitize } from '@common/utils/JSONUtils'
import { VariablesHeader } from '@pipeline/components/PipelineStudio/PipelineVariables/VariablesHeader/VariablesHeader'
import MonitoredServiceCard from '@pipeline/components/PipelineStudio/PipelineVariables/Cards/MonitoredServiceCard'
import SecretManagerCard from '@pipeline/components/PipelineStudio/PipelineVariables/Cards/SecretManagerCard'
import { TemplateType } from '@templates-library/utils/templatesUtils'
import { PipelineCardPanel } from '@pipeline/components/PipelineStudio/PipelineVariables/PipelineVariables'
import DeploymentTemplateCard from '@pipeline/components/PipelineStudio/PipelineVariables/Cards/DeploymentTemplateCard'
import ArtifactSourceTemplateCard from '@pipeline/components/PipelineStudio/PipelineVariables/Cards/ArtifactSourceTemplateCard'
import type {
  ArtifactSourceTemplateConfig,
  DeploymentTemplateConfig
} from '@pipeline/components/PipelineStudio/PipelineVariables/types'
import css from '@pipeline/components/PipelineStudio/PipelineVariables/PipelineVariables.module.scss'

const TemplateVariables: React.FC = (): JSX.Element => {
  const {
    state: { template, templateView },
    isReadonly,
    updateTemplate,
    updateTemplateView
  } = React.useContext(TemplateContext)
  const { originalTemplate, variablesTemplate, metadataMap, error, initLoading } = useTemplateVariables()
  const allowableTypes: AllowedTypesWithRunTime[] = [
    MultiTypeInputType.FIXED,
    MultiTypeInputType.RUNTIME,
    MultiTypeInputType.EXPRESSION
  ]
  const [templateAtState, setTemplateAtState] = React.useState<NGTemplateInfoConfig>(template)

  const onUpdate = useCallback(
    async (
      values:
        | PipelineInfoConfig
        | StageElementConfig
        | StepElementConfig
        | DeploymentTemplateConfig
        | StepGroupElementConfig
    ) => {
      const processNode = omit(values, 'name', 'identifier', 'description', 'tags')
      sanitize(processNode, { removeEmptyArray: false, removeEmptyObject: false, removeEmptyString: false })
      const updatedTemplate = produce(templateAtState, draft => {
        set(draft, 'spec', processNode)
      })
      setTemplateAtState(updatedTemplate)
    },
    [templateAtState]
  )

  useEffect(() => {
    setTemplateAtState(template)
  }, [template])

  async function applyChanges(): Promise<void> {
    await updateTemplate(templateAtState)
    updateTemplateView({ ...templateView, isDrawerOpened: false })
  }

  async function discardChanges(): Promise<void> {
    updateTemplateView({ ...templateView, isDrawerOpened: false })
  }

  if (initLoading) {
    return <PageSpinner />
  }

  return (
    <div className={css.pipelineVariables}>
      {error ? (
        <PageError message={(error?.data as Error)?.message || error?.message} />
      ) : (
        !isEmpty(variablesTemplate) && (
          <div className={css.content}>
            <VariablesHeader
              enableSearch={false}
              applyChanges={applyChanges}
              discardChanges={discardChanges}
              isTemplateView
            />
            <div className={css.variableList}>
              <GitSyncStoreProvider>
                {originalTemplate.type === TemplateType.Pipeline && (
                  <PipelineCardPanel
                    variablePipeline={variablesTemplate as PipelineInfoConfig}
                    pipeline={templateAtState.spec as PipelineInfoConfig}
                    originalPipeline={originalTemplate.spec as PipelineInfoConfig}
                    metadataMap={metadataMap}
                    allowableTypes={allowableTypes}
                    stepsFactory={factory}
                    updatePipeline={onUpdate}
                    readonly={isReadonly}
                  />
                )}
                {originalTemplate.type === TemplateType.Stage && (
                  <StageCard
                    stage={variablesTemplate as StageElementConfig}
                    unresolvedStage={{ ...templateAtState.spec, identifier: DefaultNewStageId } as StageElementConfig}
                    originalStage={{ ...originalTemplate.spec, identifier: DefaultNewStageId } as StageElementConfig}
                    metadataMap={metadataMap}
                    path="template"
                    allowableTypes={allowableTypes}
                    stepsFactory={factory}
                    updateStage={onUpdate}
                    readonly={isReadonly}
                  />
                )}
                {originalTemplate.type === TemplateType.Step && (
                  <StepCardPanel
                    step={variablesTemplate as StepElementConfig}
                    originalStep={originalTemplate.spec as StepElementConfig}
                    metadataMap={metadataMap}
                    readonly={isReadonly}
                    stepPath="template"
                    allowableTypes={allowableTypes}
                    stageIdentifier={DefaultNewStageId}
                    onUpdateStep={onUpdate}
                    stepsFactory={factory}
                  />
                )}
                {originalTemplate.type === TemplateType.StepGroup && (
                  <StepGroupTemplateCard
                    templateSteps={variablesTemplate as StepGroupElementConfig}
                    originalSteps={originalTemplate?.spec?.steps}
                    unresolvedStepGroupTemplate={
                      { ...templateAtState.spec, identifier: DefaultNewStageId } as StepGroupElementConfig
                    }
                    stageIdentifier={DefaultNewStageId}
                    stepGroupIdentifier={originalTemplate.identifier}
                    metadataMap={metadataMap}
                    allowableTypes={allowableTypes}
                    stepsFactory={factory}
                    onUpdateStep={onUpdate}
                    readonly={isReadonly}
                    path={'template'}
                    originalStepGroup={originalTemplate}
                    stepGroup={variablesTemplate as StepGroupElementConfig}
                  />
                )}
                {originalTemplate.type === TemplateType.SecretManager && (
                  <SecretManagerCard
                    secretManager={variablesTemplate as any}
                    unresolvedSecretManager={{ ...template.spec, identifier: DefaultNewStageId } as any}
                    originalSecretManager={
                      {
                        ...originalTemplate.spec,
                        identifier: DefaultNewStageId
                      } as any
                    }
                    metadataMap={metadataMap}
                    readonly={isReadonly}
                    path="template"
                    allowableTypes={allowableTypes}
                    updateSceretManager={onUpdate}
                    stepsFactory={factory}
                  />
                )}
                {originalTemplate.type === TemplateType.MonitoredService && (
                  <MonitoredServiceCard
                    monitoredService={variablesTemplate as MonitoredServiceConfig}
                    unresolvedMonitoredService={
                      { ...template.spec, identifier: DefaultNewStageId } as MonitoredServiceConfig
                    }
                    originalMonitoredService={
                      {
                        ...originalTemplate.spec,
                        spec: { env: {} },
                        identifier: DefaultNewStageId
                      } as MonitoredServiceConfig
                    }
                    metadataMap={metadataMap}
                    path="template"
                    allowableTypes={allowableTypes}
                    stepsFactory={factory}
                    updateMonitoredService={onUpdate}
                    readonly={isReadonly}
                  />
                )}
                {originalTemplate.type === TemplateType.CustomDeployment && (
                  <DeploymentTemplateCard
                    deploymentTemplate={variablesTemplate as DeploymentTemplateConfig}
                    unresolvedDeploymentTemplate={
                      { ...template.spec, identifier: DefaultNewStageId } as DeploymentTemplateConfig
                    }
                    originalDeploymentTemplate={
                      {
                        ...originalTemplate.spec,

                        identifier: DefaultNewStageId
                      } as DeploymentTemplateConfig
                    }
                    metadataMap={metadataMap}
                    path="template"
                    allowableTypes={allowableTypes}
                    stepsFactory={factory}
                    updateDeploymentTemplate={onUpdate}
                    readonly={isReadonly}
                  />
                )}
                {originalTemplate.type === TemplateType.ArtifactSource && (
                  <ArtifactSourceTemplateCard
                    artifactSourceTemplate={variablesTemplate as ArtifactSourceTemplateConfig}
                    unresolvedArtifactSourceTemplate={
                      { ...template.spec, identifier: DefaultNewStageId } as ArtifactSourceTemplateConfig
                    }
                    originalArtifactSourceTemplate={
                      {
                        ...originalTemplate.spec,

                        identifier: DefaultNewStageId
                      } as ArtifactSourceTemplateConfig
                    }
                    metadataMap={metadataMap}
                    path="template"
                    allowableTypes={allowableTypes}
                    stepsFactory={factory}
                    readonly={isReadonly}
                  />
                )}
              </GitSyncStoreProvider>
            </div>
          </div>
        )
      )}
    </div>
  )
}

export default function TemplateVariablesWrapper(): React.ReactElement {
  return (
    <NestedAccordionProvider>
      <TemplateVariables />
    </NestedAccordionProvider>
  )
}
