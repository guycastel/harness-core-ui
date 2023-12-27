/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { Schema } from 'yup'
import { isBoolean } from 'lodash-es'
import { getMultiTypeFromValue, IconName, MultiTypeInputType } from '@harness/uicore'

import { StringsMap } from 'stringTypes'
import type { ConnectorConfigDTO, ConnectorInfoDTO, ServiceDefinition, ManifestConfigWrapper } from 'services/cd-ng'
import type { PipelineInfoConfig } from 'services/pipeline-ng'
import type { StringKeys, UseStringsReturn } from 'framework/strings'
import { FeatureFlag } from '@common/featureFlags'
import { IdentifierSchemaWithOutName, NameSchema } from '@common/utils/Validation'
import { Connectors } from '@platform/connectors/constants'
import {
  buildAzureRepoPayload,
  buildBitbucketPayload,
  buildGithubPayload,
  buildGitlabPayload,
  buildGitPayload
} from '@platform/connectors/pages/connectors/utils/ConnectorUtils'
import { ServiceDeploymentType } from '@pipeline/utils/stageHelpers'
import type {
  ArtifactBundleType,
  CLIVersionOptions,
  HelmVersionOptions,
  ManifestStores,
  ManifestStoreWithoutConnector,
  ManifestTypes,
  PrimaryManifestType
} from './ManifestInterface'

export type ReleaseRepoPipeline = PipelineInfoConfig & { gitOpsEnabled: boolean }

export const isManifestAdditionAllowed = (deploymentType: ServiceDefinition['type']): boolean => {
  return !(
    deploymentType === ServiceDeploymentType.Ssh ||
    deploymentType === ServiceDeploymentType.WinRm ||
    deploymentType === ServiceDeploymentType.AzureWebApp
  )
}

export const showAddManifestBtn = (
  isReadonly: boolean,
  allowOnlyOne: boolean,
  listOfManifests: Array<any>,
  deploymentType?: ServiceDefinition['type']
): boolean => {
  if (allowOnlyOne && listOfManifests.length >= 1) {
    return false
  }
  if (deploymentType) {
    return !isReadonly && isManifestAdditionAllowed(deploymentType)
  }
  return !isReadonly
}

export const ManifestDataType: Record<ManifestTypes, ManifestTypes> = {
  K8sManifest: 'K8sManifest',
  Values: 'Values',
  HelmChart: 'HelmChart',
  Kustomize: 'Kustomize',
  OpenshiftTemplate: 'OpenshiftTemplate',
  OpenshiftParam: 'OpenshiftParam',
  KustomizePatches: 'KustomizePatches',
  ServerlessAwsLambda: 'ServerlessAwsLambda',
  EcsTaskDefinition: 'EcsTaskDefinition',
  EcsServiceDefinition: 'EcsServiceDefinition',
  EcsScalingPolicyDefinition: 'EcsScalingPolicyDefinition',
  EcsScalableTargetDefinition: 'EcsScalableTargetDefinition',
  TasManifest: 'TasManifest',
  TasVars: 'TasVars',
  TasAutoScaler: 'TasAutoScaler',
  AsgConfiguration: 'AsgConfiguration',
  AsgLaunchTemplate: 'AsgLaunchTemplate',
  AsgScalingPolicy: 'AsgScalingPolicy',
  AsgScheduledUpdateGroupAction: 'AsgScheduledUpdateGroupAction',
  GoogleCloudFunctionDefinition: 'GoogleCloudFunctionDefinition',
  GoogleCloudFunctionGenOneDefinition: 'GoogleCloudFunctionGenOneDefinition',
  HelmRepoOverride: 'HelmRepoOverride',
  AwsLambdaFunctionDefinition: 'AwsLambdaFunctionDefinition',
  AwsLambdaFunctionAliasDefinition: 'AwsLambdaFunctionAliasDefinition',
  AwsSamDirectory: 'AwsSamDirectory'
}

export const TASManifestTypes = [ManifestDataType.TasManifest, ManifestDataType.TasVars, ManifestDataType.TasAutoScaler]
export const TASManifestAllowedPaths = [ManifestDataType.TasVars, ManifestDataType.TasAutoScaler]

export const ManifestToPathMap: Record<PrimaryManifestType, string> = {
  K8sManifest: 'Values',
  HelmChart: 'Values',
  OpenshiftTemplate: 'OpenShift Params',
  Kustomize: 'KustomizePatches',
  TasVars: 'Vars',
  TasAutoScaler: 'AutoScaler'
}
export const ManifestToPathLabelMap: Record<PrimaryManifestType, StringKeys> = {
  K8sManifest: 'pipeline.manifestType.valuesYamlPath',
  HelmChart: 'pipeline.manifestType.valuesYamlPath',
  OpenshiftTemplate: 'pipeline.manifestType.paramsYamlPath',
  Kustomize: 'pipeline.manifestTypeLabels.KustomizePatches',
  TasVars: 'pipeline.manifestType.addVarsYAMLPath',
  TasAutoScaler: 'pipeline.manifestType.addAutoScalerYAMLPath'
}
export const ManifestToPathKeyMap: Record<PrimaryManifestType, string> = {
  K8sManifest: 'valuesPaths',
  HelmChart: 'valuesPaths',
  OpenshiftTemplate: 'paramsPaths',
  Kustomize: 'patchesPaths',
  TasVars: 'varsPaths',
  TasAutoScaler: 'autoScalerPath'
}

export const ManifestStoreMap: { [key: string]: ManifestStores } = {
  Git: 'Git',
  Github: 'Github',
  GitLab: 'GitLab',
  Bitbucket: 'Bitbucket',
  Http: 'Http',
  OciHelmChart: 'OciHelmChart',
  S3: 'S3',
  Gcs: 'Gcs',
  InheritFromManifest: 'InheritFromManifest',
  Inline: 'Inline',
  Harness: 'Harness',
  CustomRemote: 'CustomRemote',
  AzureRepo: 'AzureRepo',
  ArtifactBundle: 'ArtifactBundle'
}

export const allowedManifestTypes: Record<ServiceDefinition['type'], Array<ManifestTypes>> = {
  Kubernetes: [
    ManifestDataType.K8sManifest,
    ManifestDataType.Values,
    ManifestDataType.HelmChart,
    ManifestDataType.OpenshiftTemplate,
    ManifestDataType.OpenshiftParam,
    ManifestDataType.Kustomize,
    ManifestDataType.KustomizePatches
  ],
  NativeHelm: [ManifestDataType.HelmChart, ManifestDataType.Values],
  ServerlessAwsLambda: [ManifestDataType.ServerlessAwsLambda],
  Ssh: [],
  WinRm: [],
  AzureWebApp: [],
  ECS: [
    ManifestDataType.EcsTaskDefinition,
    ManifestDataType.EcsServiceDefinition,
    ManifestDataType.EcsScalingPolicyDefinition,
    ManifestDataType.EcsScalableTargetDefinition
  ],
  TAS: TASManifestTypes,
  Asg: [
    ManifestDataType.AsgLaunchTemplate,
    ManifestDataType.AsgConfiguration,
    ManifestDataType.AsgScalingPolicy,
    ManifestDataType.AsgScheduledUpdateGroupAction
  ],
  CustomDeployment: [],
  Elastigroup: [],
  GoogleCloudFunctions: [ManifestDataType.GoogleCloudFunctionDefinition],
  AwsLambda: [ManifestDataType.AwsLambdaFunctionDefinition, ManifestDataType.AwsLambdaFunctionAliasDefinition],
  AWS_SAM: [ManifestDataType.AwsSamDirectory, ManifestDataType.Values]
}

export const gitStoreTypes: Array<ManifestStores> = [
  ManifestStoreMap.Git,
  ManifestStoreMap.Github,
  ManifestStoreMap.GitLab,
  ManifestStoreMap.Bitbucket
]

export const gitStoreTypesWithHarnessStoreType: Array<ManifestStores> = [...gitStoreTypes, ManifestStoreMap.Harness]

export const ManifestTypetoStoreMap: Record<ManifestTypes, ManifestStores[]> = {
  K8sManifest: [...gitStoreTypesWithHarnessStoreType, ManifestStoreMap.AzureRepo, ManifestStoreMap.CustomRemote],
  Values: [
    ...gitStoreTypes,
    ManifestStoreMap.AzureRepo,
    ManifestStoreMap.InheritFromManifest,
    ManifestStoreMap.Harness,
    ManifestStoreMap.CustomRemote,
    ManifestStoreMap.S3
  ],
  HelmChart: [
    ...gitStoreTypes,
    ManifestStoreMap.AzureRepo,
    ManifestStoreMap.Http,
    ManifestStoreMap.OciHelmChart,
    ManifestStoreMap.S3,
    ManifestStoreMap.Gcs,
    ManifestStoreMap.Harness,
    ManifestStoreMap.CustomRemote
  ],
  OpenshiftTemplate: [...gitStoreTypesWithHarnessStoreType, ManifestStoreMap.AzureRepo, ManifestStoreMap.CustomRemote],
  OpenshiftParam: [
    ...gitStoreTypes,
    ManifestStoreMap.AzureRepo,
    ManifestStoreMap.InheritFromManifest,
    ManifestStoreMap.Harness,
    ManifestStoreMap.CustomRemote
  ],
  Kustomize: [...gitStoreTypesWithHarnessStoreType, ManifestStoreMap.AzureRepo],
  KustomizePatches: [
    ...gitStoreTypes,
    ManifestStoreMap.AzureRepo,
    ManifestStoreMap.InheritFromManifest,
    ManifestStoreMap.Harness
  ],
  ServerlessAwsLambda: [...gitStoreTypes, ManifestStoreMap.AzureRepo, ManifestStoreMap.S3],
  EcsTaskDefinition: [...gitStoreTypesWithHarnessStoreType, ManifestStoreMap.AzureRepo, ManifestStoreMap.S3],
  EcsServiceDefinition: [...gitStoreTypesWithHarnessStoreType, ManifestStoreMap.AzureRepo, ManifestStoreMap.S3],
  EcsScalingPolicyDefinition: [...gitStoreTypesWithHarnessStoreType, ManifestStoreMap.AzureRepo, ManifestStoreMap.S3],
  EcsScalableTargetDefinition: [...gitStoreTypesWithHarnessStoreType, ManifestStoreMap.AzureRepo, ManifestStoreMap.S3],
  TasManifest: [...gitStoreTypesWithHarnessStoreType, ManifestStoreMap.CustomRemote, ManifestStoreMap.ArtifactBundle],
  TasVars: [...gitStoreTypesWithHarnessStoreType, ManifestStoreMap.CustomRemote],
  TasAutoScaler: [...gitStoreTypesWithHarnessStoreType, ManifestStoreMap.CustomRemote],
  AsgLaunchTemplate: gitStoreTypesWithHarnessStoreType,
  AsgConfiguration: gitStoreTypesWithHarnessStoreType,
  AsgScalingPolicy: gitStoreTypesWithHarnessStoreType,
  AsgScheduledUpdateGroupAction: gitStoreTypesWithHarnessStoreType,
  GoogleCloudFunctionDefinition: gitStoreTypesWithHarnessStoreType,
  GoogleCloudFunctionGenOneDefinition: gitStoreTypesWithHarnessStoreType,
  HelmRepoOverride: [ManifestStoreMap.Http, ManifestStoreMap.OciHelmChart, ManifestStoreMap.S3, ManifestStoreMap.Gcs],
  AwsLambdaFunctionDefinition: [...gitStoreTypes, ManifestStoreMap.Harness],
  AwsLambdaFunctionAliasDefinition: [...gitStoreTypes, ManifestStoreMap.Harness],
  AwsSamDirectory: [...gitStoreTypes]
}

export const getManifestStoresByDeploymentType = (
  selectedDeploymentType: ServiceDefinition['type'],
  selectedManifest: ManifestTypes | null,
  featureFlagMap: Partial<Record<FeatureFlag, boolean>>
): ManifestStores[] => {
  const valuesManifestStores = ManifestTypetoStoreMap[selectedManifest as ManifestTypes]
  if (
    selectedDeploymentType === ServiceDeploymentType.TAS &&
    selectedManifest === ManifestDataType.TasManifest &&
    !featureFlagMap.CDS_ENABLE_TAS_ARTIFACT_AS_MANIFEST_SOURCE_NG
  ) {
    return valuesManifestStores?.filter(manifestStore => manifestStore !== ManifestStoreMap.ArtifactBundle)
  }
  if (
    selectedDeploymentType === ServiceDeploymentType.ServerlessAwsLambda &&
    [ManifestDataType.ServerlessAwsLambda, ManifestDataType.Values].includes(selectedManifest as ManifestTypes) &&
    !featureFlagMap.CDS_CONTAINER_STEP_GROUP_AWS_S3_DOWNLOAD
  ) {
    return valuesManifestStores?.filter(manifestStore => manifestStore !== ManifestStoreMap.S3)
  }
  return valuesManifestStores
}

export const manifestTypeIcons: Record<ManifestTypes, IconName> = {
  K8sManifest: 'service-kubernetes',
  Values: 'functions',
  HelmChart: 'service-helm',
  Kustomize: 'kustamize',
  OpenshiftTemplate: 'openshift',
  OpenshiftParam: 'openshift-params',
  KustomizePatches: 'kustomizeparam',
  ServerlessAwsLambda: 'service-serverless-aws',
  EcsTaskDefinition: 'service-amazon-ecs',
  EcsServiceDefinition: 'service-amazon-ecs',
  EcsScalingPolicyDefinition: 'service-amazon-ecs',
  EcsScalableTargetDefinition: 'service-amazon-ecs',
  TasManifest: 'tas-manifest',
  TasVars: 'list-vars',
  TasAutoScaler: 'autoScaler',
  AsgLaunchTemplate: 'aws-asg',
  AsgConfiguration: 'aws-asg',
  AsgScalingPolicy: 'aws-asg',
  AsgScheduledUpdateGroupAction: 'aws-asg',
  GoogleCloudFunctionDefinition: 'service-google-functions',
  GoogleCloudFunctionGenOneDefinition: 'service-google-functions',
  HelmRepoOverride: 'service-helm',
  AwsLambdaFunctionDefinition: 'service-aws-native-lambda',
  AwsLambdaFunctionAliasDefinition: 'service-aws-native-lambda',
  AwsSamDirectory: 'service-aws-sam'
}

export const manifestTypeLabels: Record<ManifestTypes, StringKeys> = {
  K8sManifest: 'pipeline.manifestTypeLabels.K8sManifest',
  Values: 'pipeline.manifestTypeLabels.ValuesYaml',
  HelmChart: 'common.HelmChartLabel',
  Kustomize: 'pipeline.manifestTypeLabels.KustomizeLabel',
  OpenshiftTemplate: 'pipeline.manifestTypeLabels.OpenshiftTemplate',
  OpenshiftParam: 'pipeline.manifestTypeLabels.OpenshiftParam',
  KustomizePatches: 'pipeline.manifestTypeLabels.KustomizePatches',
  ServerlessAwsLambda: 'pipeline.manifestTypeLabels.ServerlessAwsLambda',
  EcsTaskDefinition: 'pipeline.manifestTypeLabels.EcsTaskDefinition',
  EcsServiceDefinition: 'pipeline.manifestTypeLabels.EcsServiceDefinition',
  EcsScalingPolicyDefinition: 'pipeline.manifestTypeLabels.EcsScalingPolicyDefinition',
  EcsScalableTargetDefinition: 'pipeline.manifestTypeLabels.EcsScalableTargetDefinition',
  TasManifest: 'pipeline.manifestTypeLabels.TASManifest',
  TasVars: 'pipeline.manifestTypeLabels.VarsYAML',
  TasAutoScaler: 'pipeline.manifestTypeLabels.Autoscaler',
  AsgLaunchTemplate: 'pipeline.manifestTypeLabels.AsgLaunchTemplate',
  AsgConfiguration: 'pipeline.manifestTypeLabels.AsgConfiguration',
  AsgScalingPolicy: 'pipeline.manifestTypeLabels.AsgScalingPolicy',
  AsgScheduledUpdateGroupAction: 'pipeline.manifestTypeLabels.AsgScheduledUpdateGroupAction',
  GoogleCloudFunctionDefinition: 'pipeline.manifestTypeLabels.GoogleCloudFunctionDefinition',
  GoogleCloudFunctionGenOneDefinition: 'pipeline.manifestTypeLabels.GoogleCloudFunctionDefinitionGenOne',
  HelmRepoOverride: 'pipeline.manifestTypeLabels.HelmRepoOverride',
  AwsLambdaFunctionDefinition: 'pipeline.manifestTypeLabels.AwsLambdaFunctionDefinition',
  AwsLambdaFunctionAliasDefinition: 'pipeline.manifestTypeLabels.AwsLambdaFunctionAliasDefinition',
  AwsSamDirectory: 'pipeline.manifestTypeLabels.AwsSamDirectory'
}

export const helmVersions: Array<{ label: string; value: HelmVersionOptions }> = [
  { label: 'Version 2', value: 'V2' },
  { label: 'Version 3', value: 'V3' }
]

export const cfCliVersions: Array<{ label: string; value: CLIVersionOptions }> = [
  { label: 'CLI Version 7.0', value: 'V7' }
]

export const getArtifactBundleTypes = (
  getString: (key: keyof StringsMap, vars?: Record<string, any> | undefined) => string
): Array<{ label: string; value: ArtifactBundleType }> => [
  { label: getString('pipeline.phasesForm.packageTypes.zip'), value: 'ZIP' },
  { label: getString('pipeline.phasesForm.packageTypes.tar'), value: 'TAR' },
  { label: getString('pipeline.phasesForm.packageTypes.tar_gzip'), value: 'TAR_GZIP' }
]

export const ManifestIconByType: Record<ManifestStores, IconName> = {
  Git: 'service-github',
  Github: 'github',
  GitLab: 'service-gotlab',
  Bitbucket: 'bitbucket-selected',
  Http: 'service-helm',
  OciHelmChart: 'helm-oci',
  S3: 'service-service-s3',
  Gcs: 'gcs-step',
  InheritFromManifest: 'custom-artifact',
  Inline: 'custom-artifact',
  Harness: 'harness',
  CustomRemote: 'custom-remote-manifest',
  AzureRepo: 'service-azure',
  ArtifactBundle: 'store-artifact-bundle'
}

export const ManifestStoreTitle: Record<ManifestStores, StringKeys> = {
  Git: 'pipeline.manifestType.gitConnectorLabel',
  Github: 'common.repo_provider.githubLabel',
  GitLab: 'common.repo_provider.gitlabLabel',
  Bitbucket: 'common.repo_provider.bitbucketLabel',
  Http: 'pipeline.manifestType.httpHelmRepoConnectorLabel',
  OciHelmChart: 'pipeline.manifestType.ociHelmConnectorLabel',
  S3: 'platform.connectors.S3',
  Gcs: 'pipeline.artifacts.googleCloudStorage.title',
  InheritFromManifest: 'pipeline.manifestType.InheritFromManifest',
  Inline: 'inline',
  Harness: 'harness',
  CustomRemote: 'pipeline.manifestType.customRemote',
  AzureRepo: 'pipeline.manifestType.azureRepoConnectorLabel',
  ArtifactBundle: 'pipeline.manifestType.artifactBundle.title'
}

export const ManifestToConnectorMap: Record<ManifestStores | string, ConnectorInfoDTO['type']> = {
  Git: Connectors.GIT,
  Github: Connectors.GITHUB,
  GitLab: Connectors.GITLAB,
  Bitbucket: Connectors.BITBUCKET,
  Http: Connectors.HttpHelmRepo,
  OciHelmChart: Connectors.OciHelmRepo,
  S3: Connectors.AWS,
  Gcs: Connectors.GCP,
  AzureRepo: Connectors.AZURE_REPO
}

export const ManifestToConnectorLabelMap: Record<ManifestStoreWithoutConnector, StringKeys> = {
  Git: 'pipeline.manifestType.gitConnectorLabel',
  Github: 'common.repo_provider.githubLabel',
  GitLab: 'common.repo_provider.gitlabLabel',
  Bitbucket: 'common.repo_provider.bitbucketLabel',
  Http: 'platform.connectors.title.helmConnector',
  OciHelmChart: 'platform.connectors.title.ociHelmConnector',
  S3: 'pipeline.manifestToConnectorLabelMap.AWSLabel',
  Gcs: 'common.gcp',
  AzureRepo: 'pipeline.manifestType.azureRepoConnectorLabel'
}

export const getOciHelmConnectorLabel = (type: string): StringKeys => {
  switch (type) {
    case 'Generic':
      return 'platform.connectors.title.ociHelmConnector'
    case 'ECR':
      return 'pipeline.manifestToConnectorLabelMap.AWSLabel'
    default:
      return 'platform.connectors.title.ociHelmConnector'
  }
}

export const getOciHelmConnectorMap = (type: string): ConnectorInfoDTO['type'] => {
  switch (type) {
    case 'Generic':
      return Connectors.OciHelmRepo
    case 'ECR':
      return Connectors.AWS
    default:
      return Connectors.OciHelmRepo
  }
}

export enum GitRepoName {
  Account = 'Account',
  Repo = 'Repo'
}

export enum GitFetchTypes {
  Branch = 'Branch',
  Commit = 'Commit'
}

export enum MultiManifestsTypes {
  MANIFESTS = 'manifests',
  PARAMS = 'params'
}

export const gitFetchTypeList = [
  { label: 'Latest from Branch', value: 'Branch' },
  { label: 'Specific Commit Id / Git Tag', value: 'Commit' }
]

export const ManifestIdentifierValidation = (
  getString: UseStringsReturn['getString'],
  manifestNames: Array<string>,
  id: string | undefined,
  validationMsg: string
): { identifier: Schema<unknown> } => {
  const requiredErrorMsg = getString('common.validation.fieldIsRequired', {
    name: getString('pipeline.manifestType.manifestIdentifier')
  })
  const regexErrorMsg = getString('pipeline.manifestType.manifestIdentifierRegexErrorMsg')
  if (!id) {
    return {
      identifier: IdentifierSchemaWithOutName(getString, { requiredErrorMsg, regexErrorMsg }).notOneOf(
        manifestNames,
        validationMsg
      )
    }
  }
  return {
    identifier: NameSchema(getString, { requiredErrorMsg })
  }
}

export const doesStorehasConnector = (selectedStore: ManifestStores): boolean => {
  return [
    ManifestStoreMap.InheritFromManifest,
    ManifestStoreMap.Harness,
    ManifestStoreMap.Inline,
    ManifestStoreMap.CustomRemote,
    ManifestStoreMap.ArtifactBundle
  ].includes(selectedStore)
}

export function isConnectorStoreType(): boolean {
  return !(ManifestStoreMap.InheritFromManifest || ManifestStoreMap.Harness || ManifestStoreMap.Inline,
  ManifestStoreMap.CustomRemote)
}
export const isGitTypeManifestStore = (manifestStore: ManifestStores): boolean =>
  [
    ManifestStoreMap.Git,
    ManifestStoreMap.Github,
    ManifestStoreMap.GitLab,
    ManifestStoreMap.Bitbucket,
    ManifestStoreMap.AzureRepo
  ].includes(manifestStore)
export const isECSTypeManifest = (selectedManifest: ManifestTypes): boolean =>
  [
    ManifestDataType.EcsTaskDefinition,
    ManifestDataType.EcsServiceDefinition,
    ManifestDataType.EcsScalingPolicyDefinition,
    ManifestDataType.EcsScalableTargetDefinition
  ].includes(selectedManifest)

export function getManifestLocation(manifestType: ManifestTypes, manifestStore: ManifestStores): string {
  switch (true) {
    case manifestStore === ManifestStoreMap.Harness:
      return 'store.spec.files'
    case manifestStore === ManifestStoreMap.CustomRemote:
      return 'store.spec.filePath'
    case manifestStore === ManifestStoreMap.ArtifactBundle:
      return 'store.spec.manifestPath'
    case [
      ManifestDataType.K8sManifest,
      ManifestDataType.Values,
      ManifestDataType.KustomizePatches,
      ManifestDataType.OpenshiftParam,
      ManifestDataType.OpenshiftTemplate,
      ManifestDataType.ServerlessAwsLambda,
      ManifestDataType.EcsTaskDefinition,
      ManifestDataType.EcsServiceDefinition,
      ManifestDataType.EcsScalableTargetDefinition,
      ManifestDataType.EcsScalingPolicyDefinition,
      ManifestDataType.AsgLaunchTemplate,
      ManifestDataType.AsgConfiguration,
      ManifestDataType.AsgScalingPolicy,
      ManifestDataType.AsgScheduledUpdateGroupAction,
      ManifestDataType.TasManifest,
      ManifestDataType.TasAutoScaler,
      ManifestDataType.TasVars,
      ManifestDataType.GoogleCloudFunctionDefinition,
      ManifestDataType.GoogleCloudFunctionGenOneDefinition,
      ManifestDataType.AwsLambdaFunctionDefinition,
      ManifestDataType.AwsLambdaFunctionAliasDefinition,
      ManifestDataType.AwsSamDirectory
    ].includes(manifestType):
      return 'store.spec.paths'
    case manifestType === ManifestDataType.Kustomize:
    case manifestType === ManifestDataType.HelmChart &&
      ([ManifestStoreMap.S3, ManifestStoreMap.Gcs].includes(manifestStore) || isGitTypeManifestStore(manifestStore)):
      return 'store.spec.folderPath'
    case manifestType === ManifestDataType.HelmChart &&
      [ManifestStoreMap.Http, ManifestStoreMap.OciHelmChart].includes(manifestStore):
      return 'chartName'
    default:
      return 'paths'
  }
}
export const getBuildPayload = (type: ConnectorInfoDTO['type']) => {
  switch (type) {
    case Connectors.GIT:
      return buildGitPayload
    case Connectors.GITHUB:
      return buildGithubPayload
    case Connectors.BITBUCKET:
      return buildBitbucketPayload
    case Connectors.GITLAB:
      return buildGitlabPayload
    case Connectors.AZURE_REPO:
      return buildAzureRepoPayload
    default:
      return () => ({})
  }
}

export const getManifestsHeaderTooltipId = (selectedDeploymentType: ServiceDefinition['type']): string => {
  return `${selectedDeploymentType}DeploymentTypeManifests`
}

export const getManifestsFirstStepTooltipId = (
  selectedDeploymentType: ServiceDefinition['type'],
  manifestType: ManifestTypes
): string => {
  return `${selectedDeploymentType}_${manifestType}_FirstManifestStep`
}

export const getManifestsSecondStepTooltipId = (
  selectedDeploymentType: ServiceDefinition['type'],
  manifestType: ManifestTypes
): string => {
  return `${selectedDeploymentType}_${manifestType}_SecondManifestStep`
}

const getConnectorRef = (prevStepData: ConnectorConfigDTO): string => {
  return getMultiTypeFromValue(prevStepData.connectorRef) !== MultiTypeInputType.FIXED
    ? prevStepData.connectorRef
    : prevStepData.connectorRef?.value
}

const getConnectorId = (prevStepData?: ConnectorConfigDTO): string => {
  return prevStepData?.identifier ? prevStepData?.identifier : ''
}

export const getConnectorRefOrConnectorId = (prevStepData?: ConnectorConfigDTO): string => {
  return prevStepData?.connectorRef ? getConnectorRef(prevStepData) : getConnectorId(prevStepData)
}

// Record to control manifest override limits
export const allowedOverrideManfests: Record<keyof Pick<typeof ManifestDataType, 'HelmRepoOverride'>, number> = {
  HelmRepoOverride: 1
}

export const getSkipResourceVersioningBasedOnDeclarativeRollback = (
  skipResourceVersioning?: boolean,
  enableDeclarativeRollback?: boolean
): boolean | undefined => {
  return !(isBoolean(enableDeclarativeRollback) && enableDeclarativeRollback) ? skipResourceVersioning : false
}

export const allowedManifestForDeclarativeRollback = (selectedManifest?: ManifestTypes | null): boolean =>
  [ManifestDataType.K8sManifest, ManifestDataType.HelmChart, ManifestDataType.OpenshiftTemplate].includes(
    selectedManifest as ManifestTypes
  )

interface MultiManifest {
  manifests: ManifestTypes[]
  params: ManifestTypes[]
}

export enum PathType {
  PATH = 'PATH',
  VALUE = 'VALUE'
}

export const allowedMultiManifestTypes: Record<ServiceDefinition['type'], MultiManifest> = {
  Kubernetes: {
    manifests: [
      ManifestDataType.K8sManifest,
      ManifestDataType.HelmChart,
      ManifestDataType.OpenshiftTemplate,
      ManifestDataType.Kustomize
    ],
    params: [ManifestDataType.Values, ManifestDataType.OpenshiftParam, ManifestDataType.KustomizePatches]
  },
  NativeHelm: {
    manifests: [ManifestDataType.HelmChart],
    params: [ManifestDataType.Values]
  },

  ServerlessAwsLambda: { manifests: [ManifestDataType.ServerlessAwsLambda], params: [] },

  Ssh: {
    manifests: [],
    params: []
  },
  WinRm: {
    manifests: [],
    params: []
  },
  AzureWebApp: {
    manifests: [],
    params: []
  },
  ECS: {
    manifests: [
      ManifestDataType.EcsTaskDefinition,
      ManifestDataType.EcsServiceDefinition,
      ManifestDataType.EcsScalingPolicyDefinition,
      ManifestDataType.EcsScalableTargetDefinition
    ],
    params: []
  },

  TAS: {
    manifests: TASManifestTypes,
    params: []
  },
  Asg: {
    manifests: [
      ManifestDataType.AsgLaunchTemplate,
      ManifestDataType.AsgConfiguration,
      ManifestDataType.AsgScalingPolicy,
      ManifestDataType.AsgScheduledUpdateGroupAction
    ],
    params: []
  },
  CustomDeployment: {
    manifests: [],
    params: []
  },
  Elastigroup: {
    manifests: [],
    params: []
  },
  GoogleCloudFunctions: {
    manifests: [ManifestDataType.GoogleCloudFunctionDefinition],
    params: []
  },
  AwsLambda: {
    manifests: [ManifestDataType.AwsLambdaFunctionDefinition, ManifestDataType.AwsLambdaFunctionAliasDefinition],
    params: []
  },
  AWS_SAM: {
    manifests: [ManifestDataType.AwsSamDirectory, ManifestDataType.Values],
    params: []
  }
}

export const getMultiManifestType = (allowedTypes: MultiManifest, manifestType: ManifestTypes): MultiManifestsTypes => {
  if (allowedTypes.params.includes(manifestType)) {
    return MultiManifestsTypes.PARAMS
  }
  return MultiManifestsTypes.MANIFESTS
}

export const getOnlyMainManifests = (
  listOfManifests: ManifestConfigWrapper[],
  deploymentType: ServiceDefinition['type'],
  manifestType: MultiManifestsTypes
): ManifestConfigWrapper[] => {
  return listOfManifests.filter((item: ManifestConfigWrapper) =>
    allowedMultiManifestTypes[deploymentType]?.[manifestType].includes(item?.manifest?.type as ManifestTypes)
  )
}

export const isOnlyHelmChartManifests = (mainManifests: ManifestConfigWrapper[]): boolean => {
  return (
    mainManifests?.length > 1 &&
    mainManifests.every((manifest: ManifestConfigWrapper) => manifest?.manifest?.type === ManifestDataType.HelmChart)
  )
}

export const filterManifestByType = (
  listOfManifests: ManifestConfigWrapper[],
  listOfMainManifests: ManifestTypes[],
  deploymentType: ServiceDefinition['type'],
  manifestType: MultiManifestsTypes
): ManifestTypes[] => {
  const filteredMainManifests = getOnlyMainManifests(listOfManifests, deploymentType, manifestType)
  if (manifestType === MultiManifestsTypes.PARAMS || filteredMainManifests.length < 1) {
    return listOfMainManifests
  }

  return [filteredMainManifests[0]?.manifest?.type] as ManifestTypes[]
}

export const enableMultipleManifest = (
  listOfManifests: ManifestConfigWrapper[],
  deploymentType: ServiceDefinition['type'],
  manifestType: MultiManifestsTypes
): boolean => {
  const filteredMainManifests = getOnlyMainManifests(listOfManifests, deploymentType, manifestType)

  return (
    filteredMainManifests?.length > 0 &&
    !filteredMainManifests.every(
      (manifest: ManifestConfigWrapper) => manifest?.manifest?.type === ManifestDataType.HelmChart
    )
  )
}
