/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { get, set, isEmpty, isArray } from 'lodash-es'
import { IconName, getMultiTypeFromValue, MultiTypeInputType, RUNTIME_INPUT_VALUE } from '@harness/uicore'

import { parse } from 'yaml'
import { CompletionItemKind } from 'vscode-languageserver-types'
import type { FormikErrors } from 'formik'
import { StepViewType, ValidateInputSetProps, Step, StepProps } from '@pipeline/components/AbstractSteps/Step'
import {
  ServiceSpec,
  KubernetesServiceSpec,
  getConnectorListV2Promise,
  getBuildDetailsForDockerPromise,
  getBuildDetailsForGcrPromise,
  getBuildDetailsForEcrPromise
} from 'services/cd-ng'
import { ArtifactToConnectorMap, ENABLED_ARTIFACT_TYPES } from '@pipeline/components/ArtifactsSelection/ArtifactHelper'

import { loggerFor } from 'framework/logging/logging'
import { ModuleName } from 'framework/types/ModuleName'
import type { CompletionItemInterface } from '@common/interfaces/YAMLBuilderProps'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { getConnectorName, getConnectorValue } from '@triggers/pages/triggers/utils/TriggersWizardPageUtils'
import type { ArtifactType } from '@pipeline/components/ArtifactsSelection/ArtifactInterface'
import { isTemplatizedView } from '@pipeline/utils/stepUtils'
import { ManifestDataType } from '@pipeline/components/ManifestSelection/Manifesthelper'
import {
  GenericServiceSpecVariablesForm,
  K8sServiceSpecVariablesFormProps
} from '../Common/GenericServiceSpec/GenericServiceSpecVariablesForm'
import type { K8SDirectServiceStep } from './K8sServiceSpecInterface'
import GenericServiceSpecEditable from '../Common/GenericServiceSpec/GenericServiceSpecEditable'
import { GenericServiceSpecInputSetMode as GenericServiceSpecInputSetMode } from '../Common/GenericServiceSpec/GenericServiceSpecInputSetMode'
import {
  validateCustomArtifactFields,
  validateArtifactoryArtifactFields,
  validateACRArtifactFields,
  validateNexus3ArtifactFields,
  validateCommonArtifactFields,
  validateAmazonS3ArtifactFields,
  validateECRArtifactFields,
  validateGCRArtifactFields,
  validateAzureArtifactFields,
  validateConfigFilesFields,
  validateGoogleRegistryArtifactFields
} from '../Common/utils/runtimeViewValidation'
import type { ValidateArtifactInputSetFieldArgs, ValidateInputSetFieldArgs } from '../Common/types'

const logger = loggerFor(ModuleName.CD)

const ManifestConnectorRefRegex = /^.+manifest\.spec\.store\.spec\.connectorRef$/
const ManifestConnectorRefType = 'Git'
const ArtifactsSidecarRegex = /^.+.sidecar\.spec\.connectorRef$/
const ArtifactsPrimaryRegex = /^.+artifacts\.primary\.spec\.connectorRef$/
const ArtifactsSidecarTagRegex = /^.+.sidecar\.spec\.tag$/
const ArtifactsPrimaryTagRegex = /^.+artifacts\.primary\.spec\.tag$/

const allowedArtifactTypes: Array<ArtifactType> = [
  ENABLED_ARTIFACT_TYPES.DockerRegistry,
  ENABLED_ARTIFACT_TYPES.Gcr,
  ENABLED_ARTIFACT_TYPES.Ecr
]

export class GenericServiceSpec extends Step<KubernetesServiceSpec & ServiceSpec> {
  protected type = StepType.K8sServiceSpec
  protected defaultValues: KubernetesServiceSpec = {
    manifestConfigurations: {
      primaryManifestRef: RUNTIME_INPUT_VALUE
    }
  }

  protected stepIcon: IconName = 'service-kubernetes'
  protected stepName = 'Deplyment Service'
  protected stepPaletteVisible = false
  protected _hasStepVariables = true
  protected invocationMap: Map<
    RegExp,
    (path: string, yaml: string, params: Record<string, unknown>) => Promise<CompletionItemInterface[]>
  > = new Map()

  constructor() {
    super()
    this.invocationMap.set(ArtifactsPrimaryRegex, this.getArtifactsPrimaryConnectorsListForYaml.bind(this))
    this.invocationMap.set(ArtifactsSidecarRegex, this.getArtifactsSidecarConnectorsListForYaml.bind(this))
    this.invocationMap.set(ManifestConnectorRefRegex, this.getManifestConnectorsListForYaml.bind(this))
    this.invocationMap.set(ArtifactsPrimaryTagRegex, this.getArtifactsTagsListForYaml.bind(this))
    this.invocationMap.set(ArtifactsSidecarTagRegex, this.getArtifactsTagsListForYaml.bind(this))
  }

  protected getManifestConnectorsListForYaml(
    path: string,
    yaml: string,
    params: Record<string, unknown>
  ): Promise<CompletionItemInterface[]> {
    let pipelineObj
    try {
      pipelineObj = parse(yaml)
    } catch (err) {
      logger.error('Error while parsing the yaml', err)
    }
    const { accountId, projectIdentifier, orgIdentifier } = params as {
      accountId: string
      orgIdentifier: string
      projectIdentifier: string
    }

    if (pipelineObj) {
      const obj = get(pipelineObj, path.replace('.spec.connectorRef', ''))
      if (obj?.type === ManifestConnectorRefType) {
        return getConnectorListV2Promise({
          queryParams: {
            accountIdentifier: accountId,
            orgIdentifier,
            projectIdentifier,
            includeAllConnectorsAvailableAtScope: true
          },
          body: { types: ['Git', 'Github', 'Gitlab', 'Bitbucket'], filterType: 'Connector' }
        }).then(response => {
          const data =
            response?.data?.content?.map(connector => ({
              label: getConnectorName(connector),
              insertText: getConnectorValue(connector),
              kind: CompletionItemKind.Field
            })) || []
          return data
        })
      }
    }

    return new Promise(resolve => {
      resolve([])
    })
  }

  protected getArtifactsPrimaryConnectorsListForYaml(
    path: string,
    yaml: string,
    params: Record<string, unknown>
  ): Promise<CompletionItemInterface[]> {
    let pipelineObj
    try {
      pipelineObj = parse(yaml)
    } catch (err) {
      logger.error('Error while parsing the yaml', err)
    }
    const { accountId, projectIdentifier, orgIdentifier } = params as {
      accountId: string
      orgIdentifier: string
      projectIdentifier: string
    }
    if (pipelineObj) {
      const obj = get(pipelineObj, path.replace('.spec.connectorRef', ''))
      if (allowedArtifactTypes.includes(obj?.type)) {
        return getConnectorListV2Promise({
          queryParams: {
            accountIdentifier: accountId,
            orgIdentifier,
            projectIdentifier,
            includeAllConnectorsAvailableAtScope: true
          },
          body: {
            types: [ArtifactToConnectorMap.DockerRegistry, ArtifactToConnectorMap.Gcr, ArtifactToConnectorMap.Ecr],
            filterType: 'Connector'
          }
        }).then(response => {
          const data =
            response?.data?.content?.map(connector => ({
              label: getConnectorName(connector),
              insertText: getConnectorValue(connector),
              kind: CompletionItemKind.Field
            })) || []
          return data
        })
      }
    }

    return new Promise(resolve => {
      resolve([])
    })
  }

  protected getArtifactsSidecarConnectorsListForYaml(
    path: string,
    yaml: string,
    params: Record<string, unknown>
  ): Promise<CompletionItemInterface[]> {
    let pipelineObj
    try {
      pipelineObj = parse(yaml)
    } catch (err) {
      logger.error('Error while parsing the yaml', err)
    }
    const { accountId, projectIdentifier, orgIdentifier } = params as {
      accountId: string
      orgIdentifier: string
      projectIdentifier: string
    }
    if (pipelineObj) {
      const obj = get(pipelineObj, path.replace('.spec.connectorRef', ''))
      if (allowedArtifactTypes.includes(obj?.type)) {
        return getConnectorListV2Promise({
          queryParams: {
            accountIdentifier: accountId,
            orgIdentifier,
            projectIdentifier,
            includeAllConnectorsAvailableAtScope: true
          },
          body: {
            types: [ArtifactToConnectorMap.DockerRegistry, ArtifactToConnectorMap.Gcr, ArtifactToConnectorMap.Ecr],
            filterType: 'Connector'
          }
        }).then(response => {
          const data =
            response?.data?.content?.map(connector => ({
              label: getConnectorName(connector),
              insertText: getConnectorValue(connector),
              kind: CompletionItemKind.Field
            })) || []
          return data
        })
      }
    }

    return new Promise(resolve => {
      resolve([])
    })
  }

  protected getArtifactsTagsListForYaml(
    path: string,
    yaml: string,
    params: Record<string, unknown>
  ): Promise<CompletionItemInterface[]> {
    let pipelineObj
    try {
      pipelineObj = parse(yaml)
    } catch (err) {
      logger.error('Error while parsing the yaml', err)
    }

    const { accountId, projectIdentifier, orgIdentifier } = params as {
      accountId: string
      orgIdentifier: string
      projectIdentifier: string
    }
    if (pipelineObj) {
      const obj = get(pipelineObj, path.replace('.spec.tag', ''))
      if (allowedArtifactTypes.includes(obj?.type)) {
        switch (obj.type) {
          case ENABLED_ARTIFACT_TYPES.DockerRegistry: {
            return getBuildDetailsForDockerPromise({
              queryParams: {
                imagePath: obj.spec?.imagePath,
                connectorRef: obj.spec?.connectorRef,
                accountIdentifier: accountId,
                orgIdentifier,
                projectIdentifier
              }
            }).then(response => {
              const data =
                response?.data?.buildDetailsList?.map(buildDetails => ({
                  label: buildDetails.tag || '',
                  insertText: buildDetails.tag || '',
                  kind: CompletionItemKind.Field
                })) || []
              return data
            })
          }
          case ENABLED_ARTIFACT_TYPES.Gcr: {
            return getBuildDetailsForGcrPromise({
              queryParams: {
                imagePath: obj.spec?.imagePath,
                registryHostname: obj.spec?.registryHostname,
                connectorRef: obj.spec?.connectorRef,
                accountIdentifier: accountId,
                orgIdentifier,
                projectIdentifier
              }
            }).then(response => {
              const data =
                response?.data?.buildDetailsList?.map(buildDetails => ({
                  label: buildDetails.tag || '',
                  insertText: buildDetails.tag || '',
                  kind: CompletionItemKind.Field
                })) || []
              return data
            })
          }
          case ENABLED_ARTIFACT_TYPES.Ecr: {
            return getBuildDetailsForEcrPromise({
              queryParams: {
                imagePath: obj.spec?.imagePath,
                region: obj.spec?.region,
                connectorRef: obj.spec?.connectorRef,
                accountIdentifier: accountId,
                orgIdentifier,
                projectIdentifier
              }
            }).then(response => {
              const data =
                response?.data?.buildDetailsList?.map(buildDetails => ({
                  label: buildDetails.tag || '',
                  insertText: buildDetails.tag || '',
                  kind: CompletionItemKind.Field
                })) || []
              return data
            })
          }
        }
      }
    }

    return new Promise(resolve => {
      resolve([])
    })
  }

  validateManifestConfiguration({ data, template, isRequired, errors, getString }: ValidateInputSetFieldArgs): void {
    const currentManifestConfigurationTemplate = get(template, `manifestConfigurations.primaryManifestRef`, '')

    if (
      isEmpty(data?.manifestConfigurations?.primaryManifestRef) &&
      isRequired &&
      getMultiTypeFromValue(currentManifestConfigurationTemplate) === MultiTypeInputType.RUNTIME
    ) {
      set(
        errors,
        `manifestConfigurations.primaryManifestRef`,
        getString?.('fieldRequired', { field: getString('cd.pipelineSteps.serviceTab.manifest.primaryManifest') })
      )
    }
  }

  validateManifestInputSetFields({ data, template, isRequired, errors, getString }: ValidateInputSetFieldArgs): void {
    data?.manifests?.forEach((manifest, index) => {
      const currentManifestTemplate = get(template, `manifests[${index}].manifest.spec.store.spec`, '')

      if (
        data?.manifestConfigurations?.primaryManifestRef &&
        data?.manifestConfigurations?.primaryManifestRef === manifest?.manifest?.identifier
      ) {
        // Git provider manifest store specific fields
        if (
          isEmpty(manifest?.manifest?.spec?.store?.spec?.connectorRef) &&
          isRequired &&
          getMultiTypeFromValue(currentManifestTemplate?.connectorRef) === MultiTypeInputType.RUNTIME
        ) {
          set(
            errors,
            `manifests[${index}].manifest.spec.store.spec.connectorRef`,
            getString?.('fieldRequired', { field: getString('connector') })
          )
        }
        if (
          isEmpty(manifest?.manifest?.spec?.store?.spec?.branch) &&
          isRequired &&
          getMultiTypeFromValue(currentManifestTemplate?.branch) === MultiTypeInputType.RUNTIME
        ) {
          set(
            errors,
            `manifests[${index}].manifest.spec.store.spec.branch`,
            getString?.('fieldRequired', { field: 'Branch' })
          )
        }
        if (
          isEmpty(manifest?.manifest?.spec?.store?.spec?.commitId) &&
          isRequired &&
          getMultiTypeFromValue(currentManifestTemplate?.commitId) === MultiTypeInputType.RUNTIME
        ) {
          set(
            errors,
            `manifests[${index}].manifest.spec.store.spec.commitId`,
            getString?.('fieldRequired', { field: getString('common.commitId') })
          )
        }
        if (
          isEmpty(manifest?.manifest?.spec?.store?.spec?.paths?.[0]) &&
          isRequired &&
          getMultiTypeFromValue(currentManifestTemplate?.paths) === MultiTypeInputType.RUNTIME
        ) {
          set(
            errors,
            `manifests[${index}].manifest.spec.store.spec.paths`,
            getString?.('fieldRequired', { field: getString?.('common.fileOrFolderPath') })
          )
        }
        if (
          isEmpty(manifest?.manifest?.spec?.store?.spec?.folderPath) &&
          isRequired &&
          getMultiTypeFromValue(currentManifestTemplate?.folderPath) === MultiTypeInputType.RUNTIME
        ) {
          set(
            errors,
            `manifests[${index}].manifest.spec.store.spec.folderPath`,
            getString?.('fieldRequired', {
              field: manifest.manifest?.type === ManifestDataType.HelmChart ? getString?.('chartPath') : 'Folder Path'
            })
          )
        }

        if (
          isArray(manifest.manifest?.spec?.valuesPaths) &&
          manifest.manifest?.spec?.valuesPaths?.includes('') &&
          getMultiTypeFromValue(get(template, `manifests[${index}].manifest.spec.valuesPaths`, '')) ===
            MultiTypeInputType.RUNTIME
        ) {
          set(errors, `manifests[${index}].manifest.spec.valuesPaths`, getString?.('cd.valuesYamlValidation'))
        }

        // Harness manifest store spcific fields
        if (
          isEmpty(manifest?.manifest?.spec?.store?.spec?.files?.[0]) &&
          isRequired &&
          getMultiTypeFromValue(currentManifestTemplate?.files) === MultiTypeInputType.RUNTIME
        ) {
          set(
            errors,
            `manifests[${index}].manifest.spec.store.spec.files[0]`,
            getString?.('fieldRequired', { field: getString?.('resourcePage.fileStore') })
          )
        }

        // S3 manifest store specific fields
        if (
          isEmpty(manifest?.manifest?.spec?.store?.spec?.region) &&
          isRequired &&
          getMultiTypeFromValue(currentManifestTemplate?.region) === MultiTypeInputType.RUNTIME
        ) {
          set(
            errors,
            `manifests[${index}].manifest.spec.store.spec.region`,
            getString?.('fieldRequired', { field: getString?.('regionLabel') })
          )
        }
        if (
          isEmpty(manifest?.manifest?.spec?.store?.spec?.bucketName) &&
          isRequired &&
          getMultiTypeFromValue(currentManifestTemplate?.bucketName) === MultiTypeInputType.RUNTIME
        ) {
          set(
            errors,
            `manifests[${index}].manifest.spec.store.spec.bucketName`,
            getString?.('fieldRequired', { field: getString?.('common.bucketName') })
          )
        }

        // Helm With S3 manifest store specific fields
        if (
          isEmpty(manifest?.manifest?.spec?.chartName) &&
          isRequired &&
          getMultiTypeFromValue(get(template, `manifests[${index}].manifest.spec.chartName`)) ===
            MultiTypeInputType.RUNTIME
        ) {
          set(
            errors,
            `manifests[${index}].manifest.spec.chartName`,
            getString?.('fieldRequired', { field: 'Chart Name' })
          )
        }

        // Custom Remote Manifest store specific fields
        if (
          isEmpty(manifest?.manifest?.spec?.store?.spec?.extractionScript) &&
          isRequired &&
          getMultiTypeFromValue(currentManifestTemplate?.extractionScript) === MultiTypeInputType.RUNTIME
        ) {
          set(
            errors,
            `manifests[${index}].manifest.spec.store.spec.extractionScript`,
            getString?.('fieldRequired', { field: getString?.('pipeline.manifestType.customRemoteExtractionScript') })
          )
        }
        if (
          isEmpty(manifest?.manifest?.spec?.store?.spec?.filePath) &&
          isRequired &&
          getMultiTypeFromValue(currentManifestTemplate?.filePath) === MultiTypeInputType.RUNTIME
        ) {
          set(
            errors,
            `manifests[${index}].manifest.spec.store.spec.filePath`,
            getString?.('fieldRequired', {
              field: getString?.('pipeline.manifestType.customRemoteExtractedFileLocation')
            })
          )
        }
      }
    })
  }

  validateArtifactInputSetFields({
    artifactType,
    data,
    dataPathToField,
    template,
    templatePathToField,
    getString,
    isRequired,
    errors
  }: ValidateArtifactInputSetFieldArgs) {
    /** Most common artifact fields */
    validateCommonArtifactFields({
      data,
      dataPathToField,
      template,
      templatePathToField,
      getString,
      isRequired,
      errors
    })

    validateAmazonS3ArtifactFields({
      data,
      dataPathToField,
      template,
      templatePathToField,
      getString,
      isRequired,
      errors
    })

    // Artifactory artifact specific fields
    validateArtifactoryArtifactFields({
      data,
      dataPathToField,
      template,
      templatePathToField,
      getString,
      isRequired,
      errors
    })

    // ECR artifact specific fields
    if (artifactType === ENABLED_ARTIFACT_TYPES.Ecr) {
      validateECRArtifactFields({
        data,
        dataPathToField,
        template,
        templatePathToField,
        getString,
        isRequired,
        errors
      })
    }

    // Nexus3 artifact specific fields
    if (artifactType === ENABLED_ARTIFACT_TYPES.Nexus3Registry) {
      validateNexus3ArtifactFields({
        data,
        dataPathToField,
        template,
        templatePathToField,
        getString,
        isRequired,
        errors
      })
    }

    // GCR artifact specific fields
    validateGCRArtifactFields({
      data,
      dataPathToField,
      template,
      templatePathToField,
      getString,
      isRequired,
      errors
    })

    // ACR artifact specific fields
    validateACRArtifactFields({
      data,
      dataPathToField,
      template,
      templatePathToField,
      getString,
      isRequired,
      errors
    })

    // Custom artifact specific fields
    validateCustomArtifactFields({
      data,
      dataPathToField,
      template,
      templatePathToField,
      getString,
      isRequired,
      errors
    })

    // Github Package Registry specific fields
    if (
      isEmpty(get(data, `${dataPathToField}.packageName`)) &&
      isRequired &&
      getMultiTypeFromValue(get(template, `${templatePathToField}.packageName`)) === MultiTypeInputType.RUNTIME
    ) {
      set(
        errors,
        `${dataPathToField}.packageName`,
        getString?.('fieldRequired', { field: getString?.('pipeline.artifactsSelection.packageName') })
      )
    }

    if (
      isEmpty(get(data, `${dataPathToField}.groupId`)) &&
      artifactType === ENABLED_ARTIFACT_TYPES.GithubPackageRegistry &&
      isRequired &&
      getMultiTypeFromValue(get(template, `${templatePathToField}.groupId`)) === MultiTypeInputType.RUNTIME
    ) {
      set(
        errors,
        `${dataPathToField}.groupId`,
        getString?.('fieldRequired', { field: getString?.('pipeline.artifactsSelection.groupId') })
      )
    }

    if (
      isEmpty(get(data, `${dataPathToField}.artifactId`)) &&
      artifactType === ENABLED_ARTIFACT_TYPES.GithubPackageRegistry &&
      isRequired &&
      getMultiTypeFromValue(get(template, `${templatePathToField}.artifactId`)) === MultiTypeInputType.RUNTIME
    ) {
      set(
        errors,
        `${dataPathToField}.artifactId`,
        getString?.('fieldRequired', { field: getString?.('pipeline.artifactsSelection.artifactId') })
      )
    }

    // Azure Artifact specific fields
    validateAzureArtifactFields({
      data,
      dataPathToField,
      template,
      templatePathToField,
      getString,
      isRequired,
      errors
    })

    // Google Artifact Registry specific fields
    validateGoogleRegistryArtifactFields({
      data,
      dataPathToField,
      template,
      templatePathToField,
      getString,
      isRequired,
      errors
    })
  }

  validatePrimaryArtifactInputSetFields({
    data,
    template,
    getString,
    isRequired,
    errors
  }: ValidateInputSetFieldArgs): void {
    this.validateArtifactInputSetFields({
      artifactType: data?.artifacts?.primary?.type,
      data,
      dataPathToField: 'artifacts.primary.spec',
      template,
      templatePathToField: 'artifacts.primary.spec',
      getString,
      isRequired,
      errors
    })
  }

  validatePrimaryArtifactSourcesInputSetFields({
    data,
    template,
    getString,
    isRequired,
    errors
  }: ValidateInputSetFieldArgs): void {
    if (
      isEmpty(data?.artifacts?.primary?.primaryArtifactRef) &&
      isRequired &&
      getMultiTypeFromValue(template?.artifacts?.primary?.primaryArtifactRef) === MultiTypeInputType.RUNTIME
    ) {
      set(errors, 'artifacts.primary.primaryArtifactRef', getString?.('fieldRequired', { field: 'Primary Artifact' }))
    }
    if (isArray(data?.artifacts?.primary?.sources)) {
      data?.artifacts?.primary?.sources?.forEach((_artifactSource, index) => {
        this.validateArtifactInputSetFields({
          artifactType: data?.artifacts?.primary?.sources?.[index].type,
          data,
          dataPathToField: `artifacts.primary.sources[${index}].spec`,
          template,
          templatePathToField: `artifacts.primary.sources[${index}].spec`,
          getString,
          isRequired,
          errors
        })
      })
    }
  }

  validateSidecarsInputSetFields({ data, template, isRequired, errors, getString }: ValidateInputSetFieldArgs): void {
    data?.artifacts?.sidecars?.forEach((_sidecar, index) => {
      this.validateArtifactInputSetFields({
        artifactType: data?.artifacts?.sidecars?.[index].sidecar?.type,
        data,
        dataPathToField: `artifacts.sidecars[${index}].sidecar.spec`,
        template,
        templatePathToField: `artifacts.sidecars[${index}].sidecar.spec`,
        getString,
        isRequired,
        errors
      })
    })
  }

  validateInputSet(props: ValidateInputSetProps<K8SDirectServiceStep>): FormikErrors<K8SDirectServiceStep> {
    const { data, template, getString, viewType } = props
    const errors: FormikErrors<K8SDirectServiceStep> = {}
    const isRequired = viewType === StepViewType.DeploymentForm || viewType === StepViewType.TriggerForm
    /** Manifest fields validation */
    this.validateManifestInputSetFields({
      data,
      template,
      isRequired,
      getString,
      errors
    })

    /** Primary Artifact fields validation */
    this.validatePrimaryArtifactInputSetFields({
      data,
      template,
      getString,
      isRequired,
      errors
    })

    /** Primary Artifact Sources fields validation */
    this.validatePrimaryArtifactSourcesInputSetFields({
      data,
      template,
      getString,
      isRequired,
      errors
    })

    /** Sidecar Artifact fields validation */
    this.validateSidecarsInputSetFields({
      data,
      template,
      getString,
      isRequired,
      errors
    })
    //**Primary Manifest validation */
    this.validateManifestConfiguration({ data, template, isRequired, getString, errors })
    /** Config Files Fields Validation */
    validateConfigFilesFields({ data, template, isRequired, errors, getString })

    return errors
  }

  renderStep(props: StepProps<K8SDirectServiceStep>): JSX.Element {
    const {
      initialValues,
      onUpdate,
      stepViewType,
      inputSetData,
      factory,
      customStepProps,
      readonly,
      allowableTypes,
      viewTypeMetadata
    } = props
    if (stepViewType === StepViewType.InputVariable) {
      return (
        <GenericServiceSpecVariablesForm
          {...(customStepProps as K8sServiceSpecVariablesFormProps)}
          initialValues={initialValues}
          stepsFactory={factory}
          onUpdate={onUpdate}
          readonly={readonly}
          allowableTypes={allowableTypes}
        />
      )
    }

    if (isTemplatizedView(stepViewType)) {
      return (
        <GenericServiceSpecInputSetMode
          {...(customStepProps as K8sServiceSpecVariablesFormProps)}
          initialValues={initialValues}
          onUpdate={onUpdate}
          stepViewType={stepViewType}
          template={inputSetData?.template}
          path={inputSetData?.path}
          readonly={inputSetData?.readonly || readonly}
          factory={factory}
          allowableTypes={allowableTypes}
          viewTypeMetadata={viewTypeMetadata}
          isHelm={true}
        />
      )
    }

    return (
      <GenericServiceSpecEditable
        {...(customStepProps as K8sServiceSpecVariablesFormProps)}
        factory={factory}
        initialValues={initialValues}
        onUpdate={onUpdate}
        stepViewType={stepViewType}
        path={inputSetData?.path}
        readonly={inputSetData?.readonly || readonly}
        allowableTypes={allowableTypes}
      />
    )
  }
}
