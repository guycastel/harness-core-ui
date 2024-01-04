/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { connect } from 'formik'
import cx from 'classnames'
import { defaultTo, get } from 'lodash-es'
import { AllowedTypes, Layout } from '@harness/uicore'

import { useStrings } from 'framework/strings'
import type {
  ApplicationSettingsConfiguration,
  ConnectionStringsConfiguration,
  ServiceHookWrapper,
  ServiceSpec,
  KubernetesServiceSpec
} from 'services/cd-ng'
import { isValueRuntimeInput } from '@common/utils/utils'
import type { AbstractStepFactory } from '@pipeline/components/AbstractSteps/AbstractStepFactory'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StepWidget } from '@pipeline/components/AbstractSteps/StepWidget'
import type { CustomVariablesData } from '@pipeline/components/PipelineSteps/Steps/CustomVariables/CustomVariableEditable'
import type { CustomVariableInputSetExtraProps } from '@pipeline/components/PipelineSteps/Steps/CustomVariables/CustomVariableInputSet'
import type { AllNGVariables } from '@pipeline/utils/types'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { TextFieldInputSetView } from '@pipeline/components/InputSetView/TextFieldInputSetView/TextFieldInputSetView'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { RuntimeApplicationConfig } from '@pipeline/components/RuntimeApplicationConfig/RuntimeApplicationConfig'
import configFileSourceBaseFactory from '@cd/factory/ConfigFileSourceFactory/ConfigFileSourceBaseFactory'
import applicationConfigBaseFactory from '@cd/factory/ApplicationConfigFactory/ApplicationConfigFactory'
import artifactSourceBaseFactory from '@cd/factory/ArtifactSourceFactory/ArtifactSourceBaseFactory'
import manifestSourceBaseFactory from '@cd/factory/ManifestSourceFactory/ManifestSourceBaseFactory'
import type { ChildPipelineMetadataType } from '@pipeline/components/PipelineInputSetForm/ChainedPipelineInputSetUtils'
import serviceHookSourceBaseFactory from '@cd/factory/ServiceHookSourceFactory/ServiceHookSourceFactory'
import { StoreMetadata } from '@modules/10-common/constants/GitSyncTypes'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import type { K8SDirectServiceStep } from '../../K8sServiceSpec/K8sServiceSpecInterface'
import { KubernetesArtifacts } from '../../K8sServiceSpec/KubernetesArtifacts/KubernetesArtifacts'
import { KubernetesManifests } from '../../K8sServiceSpec/KubernetesManifests/KubernetesManifests'
import PrimaryArtifactRef from '../../K8sServiceSpec/PrimaryArtifact/PrimaryArtifactRef'
import PrimaryManifestRef from '../../K8sServiceSpec/PrimaryManifest/PrimaryManifestRef'

import { ConfigFiles } from '../../SshServiceSpec/SshConfigFiles/ConfigFiles'
import { ApplicationConfigType } from '../../AzureWebAppServiceSpec/AzureWebAppServiceSpecInterface.types'
import { ServiceHooksConfig } from './RuntimeServiceHookConfig/ServiceHooksConfig'
import css from './GenericServiceSpec.module.scss'

export interface KubernetesInputSetProps {
  initialValues: K8SDirectServiceStep & {
    hooks?: ServiceHookWrapper[]
  }
  onUpdate?: ((data: ServiceSpec) => void) | undefined
  stepViewType?: StepViewType
  template?: KubernetesServiceSpec &
    ServiceSpec & {
      applicationSettings?: ApplicationSettingsConfiguration
      connectionStrings?: ConnectionStringsConfiguration
    }
  allValues?: KubernetesServiceSpec &
    ServiceSpec & {
      applicationSettings?: ApplicationSettingsConfiguration
      connectionStrings?: ConnectionStringsConfiguration
      hooks?: ServiceHookWrapper[]
    }
  resolvedValues?: KubernetesServiceSpec &
    ServiceSpec & {
      applicationSettings?: ApplicationSettingsConfiguration
      connectionStrings?: ConnectionStringsConfiguration
      hooks?: ServiceHookWrapper[]
    }
  readonly?: boolean
  factory?: AbstractStepFactory
  path?: string
  stageIdentifier: string
  serviceBranch?: string
  serviceIdentifier?: string
  gitMetadata?: StoreMetadata
  formik?: any
  allowableTypes: AllowedTypes
  childPipelineMetadata?: ChildPipelineMetadataType
  viewTypeMetadata?: Record<string, boolean>
  isHelm?: boolean
}
const GenericServiceSpecInputSetModeFormikForm = (props: KubernetesInputSetProps): React.ReactElement => {
  const {
    template,
    path,
    factory,
    allValues,
    resolvedValues,
    initialValues,
    onUpdate,
    readonly = false,
    stageIdentifier,
    serviceIdentifier,
    gitMetadata,
    stepViewType,
    serviceBranch,
    formik,
    allowableTypes,
    childPipelineMetadata,
    viewTypeMetadata,
    isHelm
  } = props
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()
  const commonProps = {
    stepViewType,
    formik,
    path,
    initialValues,
    readonly,
    allowableTypes,
    serviceIdentifier,
    serviceBranch,
    gitMetadata,
    childPipelineMetadata
  }

  return (
    <Layout.Vertical spacing="medium" margin={{ bottom: 'xlarge' }}>
      {!!template?.artifacts?.primary?.primaryArtifactRef && (
        <PrimaryArtifactRef primaryArtifact={allValues?.artifacts?.primary} template={template} {...commonProps} />
      )}
      {template?.manifestConfigurations?.primaryManifestRef ? (
        <PrimaryManifestRef
          primaryManifest={allValues?.manifestConfigurations?.primaryManifestRef}
          template={template}
          {...commonProps}
        />
      ) : null}
      {!!(
        template?.artifacts?.primary?.type ||
        (Array.isArray(template?.artifacts?.primary?.sources) && template?.artifacts?.primary?.sources?.length) ||
        template?.artifacts?.sidecars?.length
      ) && (
        <KubernetesArtifacts
          type={template?.artifacts?.primary?.type || ''}
          artifacts={allValues?.artifacts}
          artifactSourceBaseFactory={artifactSourceBaseFactory}
          resolvedArtifacts={resolvedValues?.artifacts}
          stageIdentifier={stageIdentifier}
          template={template as ServiceSpec}
          viewTypeMetadata={viewTypeMetadata}
          {...commonProps}
        />
      )}

      {isValueRuntimeInput(get(template, `ecsTaskDefinitionArn`)) && (
        <TextFieldInputSetView
          name={`${path}.ecsTaskDefinitionArn`}
          label={getString('cd.serviceDashboard.taskDefinitionArn')}
          placeholder={getString('cd.pipelineSteps.serviceTab.manifest.taskDefinitionARNPlaceholder')}
          disabled={readonly}
          multiTextInputProps={{
            expressions,
            allowableTypes,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
          }}
          fieldPath={`ecsTaskDefinitionArn`}
          template={template}
          className={css.inputFieldLayout}
        />
      )}

      {isValueRuntimeInput(get(template, `release.name`)) && (
        <TextFieldInputSetView
          name={`${path}.release.name`}
          label={getString('common.releaseName')}
          placeholder={getString('common.releaseName')}
          disabled={readonly}
          multiTextInputProps={{
            expressions,
            allowableTypes,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
          }}
          fieldPath={`release.name`}
          template={template}
          className={css.inputFieldLayout}
        />
      )}

      {!!template?.manifests?.length && (
        <KubernetesManifests
          manifests={allValues?.manifests}
          manifestSourceBaseFactory={manifestSourceBaseFactory}
          stageIdentifier={stageIdentifier}
          template={template}
          primaryManifest={allValues?.manifestConfigurations?.primaryManifestRef}
          isHelm={isHelm}
          {...commonProps}
        />
      )}

      {!!template?.applicationSettings && (
        <RuntimeApplicationConfig
          type={ApplicationConfigType.applicationSettings}
          template={template}
          applicationConfig={allValues?.applicationSettings}
          applicationConfigBaseFactory={applicationConfigBaseFactory}
          stageIdentifier={stageIdentifier}
          {...commonProps}
        />
      )}

      {!!template?.connectionStrings && (
        <RuntimeApplicationConfig
          type={ApplicationConfigType.connectionStrings}
          template={template}
          applicationConfig={allValues?.connectionStrings}
          applicationConfigBaseFactory={applicationConfigBaseFactory}
          stageIdentifier={stageIdentifier}
          {...commonProps}
        />
      )}

      {!!template?.configFiles?.length && (
        <ConfigFiles
          configFiles={defaultTo(allValues?.configFiles, initialValues?.configFiles)}
          configFileSourceBaseFactory={configFileSourceBaseFactory}
          stageIdentifier={stageIdentifier}
          template={template}
          {...commonProps}
        />
      )}

      {!!template?.hooks?.length && (
        <ServiceHooksConfig
          hooks={defaultTo(allValues?.hooks, initialValues?.hooks)}
          serviceHookSourceBaseFactory={serviceHookSourceBaseFactory}
          stageIdentifier={stageIdentifier}
          template={template}
          {...commonProps}
        />
      )}

      {!!template?.variables?.length && (
        <div id={`Stage.${stageIdentifier}.Service.Variables`} className={cx(css.nopadLeft, css.accordionSummary)}>
          <div className={css.subheading}>{getString('common.variables')}</div>

          <div className={css.nestedAccordions}>
            <StepWidget<CustomVariablesData, CustomVariableInputSetExtraProps>
              factory={factory as unknown as AbstractStepFactory}
              initialValues={{
                variables: (initialValues.variables || []) as AllNGVariables[],
                canAddVariable: true
              }}
              type={StepType.CustomVariable}
              stepViewType={StepViewType.InputSet}
              allowableTypes={allowableTypes}
              onUpdate={({ variables }: CustomVariablesData) => {
                onUpdate?.({
                  variables: variables as any
                })
              }}
              customStepProps={{
                template: { variables: (template?.variables || []) as AllNGVariables[] },
                path,
                allValues: { variables: (allValues?.variables || []) as AllNGVariables[] }
              }}
              readonly={readonly}
            />
          </div>
        </div>
      )}
    </Layout.Vertical>
  )
}

export const GenericServiceSpecInputSetMode = connect(GenericServiceSpecInputSetModeFormikForm)
