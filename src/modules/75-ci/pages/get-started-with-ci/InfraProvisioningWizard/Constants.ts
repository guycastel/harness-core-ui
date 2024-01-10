/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { IconName } from '@harness/uicore'
import type { BitbucketPRSpec, GithubPRSpec, GitlabPRSpec } from 'services/pipeline-ng'
import type { ConnectorInfoDTO, SecretDTOV2 } from 'services/cd-ng'
import type { StringsMap } from 'stringTypes'
import { Connectors } from '@platform/connectors/constants'
import { ArchTypes, OsTypes } from '@modules/70-pipeline/utils/constants'
import type { SelectBuildLocationForwardRef } from './SelectBuildLocation'
export interface LocalRunnerOsArchTypes {
  osType: OsTypes | undefined
  archType: ArchTypes | undefined
}
export interface InfraProvisioningWizardProps {
  precursorData?: {
    preSelectedGitConnector?: ConnectorInfoDTO
    connectorsEligibleForPreSelection?: ConnectorInfoDTO[]
    secretForPreSelectedConnector?: SecretDTOV2
  }
  lastConfiguredWizardStepId?: InfraProvisiongWizardStepId
  enableImportYAMLOption?: boolean
  dummyGitnessHarnessConnector?: ConnectorInfoDTO
  useLocalRunnerInfra?: boolean
  localRunnerOsArch?: LocalRunnerOsArchTypes
}

export const enum Hosting {
  SaaS = 'SAAS',
  OnPrem = 'ON_PREM'
}

export const enum BuildLocation {
  HostedByHarness = 'HOSTED_BY_HARNESS',
  Kubernetes = 'KUBERNETES',
  AWS = 'AWS',
  DockerRunner = 'DOCKER_RUNNER'
}

export const OAUTH2_USER_NAME = 'oauth2'

export interface BuildLocationDetails {
  icon: IconName
  location: BuildLocation
  label: keyof StringsMap
  details: keyof StringsMap
  approxETAInMins: number
  disabled?: boolean
}

export interface WizardStep {
  stepRender: React.ReactElement
  onClickNext?: () => void
  onClickBack?: () => void
  stepFooterLabel?: string
}

export enum ProvisioningStatus {
  TO_DO,
  IN_PROGRESS,
  FAILURE,
  SUCCESS
}

export interface SelectBuildLocationProps {
  ref: SelectBuildLocationForwardRef
  selectedHosting?: Hosting
  selectedBuildLocation?: BuildLocationDetails
  provisioningStatus?: ProvisioningStatus
  onChangeBuildLocation: (status: ProvisioningStatus) => void
  onStartProvisioning: () => void
}

export const HostedByHarnessBuildLocation: BuildLocationDetails = {
  icon: 'harness',
  location: BuildLocation.HostedByHarness,
  label: 'ci.getStartedWithCI.hostedByHarness',
  details: 'ci.getStartedWithCI.hostedByHarnessBuildLocation',
  approxETAInMins: 2
}

export const K8sBuildLocation: BuildLocationDetails = {
  icon: 'app-kubernetes',
  location: BuildLocation.Kubernetes,
  label: 'kubernetesText',
  details: 'ci.getStartedWithCI.k8sBuildLocation',
  approxETAInMins: 12,
  disabled: true
}

export const AllBuildLocationsForOnPrem: BuildLocationDetails[] = [
  K8sBuildLocation,
  {
    icon: 'docker-step',
    location: BuildLocation.DockerRunner,
    label: 'ci.getStartedWithCI.dockerRunner',
    details: 'ci.getStartedWithCI.dockerRunnerBuildLocation',
    approxETAInMins: 2,
    disabled: true
  }
]

export const AllBuildLocationsForSaaS: BuildLocationDetails[] = [
  HostedByHarnessBuildLocation,
  ...AllBuildLocationsForOnPrem
]

export enum InfraProvisiongWizardStepId {
  SelectBuildLocation = 'SELECT_BUILD_LOCATION',
  SelectGitProvider = 'SELECT_GIT_PROVIDER',
  SelectRepository = 'SELECT_REPOSITORY',
  ConfigurePipeline = 'CONFIGURE_PIPELINE'
}

// TODO Need to use exported StepStatus from uicore -> MultiStepProgressIndicator component
export enum StepStatus {
  ToDo = 'TODO',
  InProgress = 'INPROGRESS',
  Failed = 'FAILED',
  Success = 'SUCCESS'
}

export interface GitProvider {
  icon: IconName
  label: keyof StringsMap
  type: GitProviderCardSelectOptionTypes
  disabled?: boolean
}

export enum NonGitOption {
  OTHER = 'Other'
}

export type GitProviderCardSelectOptionTypes = ConnectorInfoDTO['type'] | NonGitOption

export const GitProviderIcons: Map<ConnectorInfoDTO['type'], IconName> = new Map([
  [Connectors.Harness, 'code'],
  [Connectors.GITHUB, 'github'],
  [Connectors.GITLAB, 'gitlab'],
  [Connectors.BITBUCKET, 'bitbucket-blue'],
  [Connectors.GIT, 'service-github']
])

export const OtherProviderOptions: GitProvider[] = [
  {
    icon: GitProviderIcons.get(Connectors.GIT) as IconName,
    label: 'common.other',
    type: NonGitOption.OTHER
  }
]

export const AllSaaSGitProviders: GitProvider[] = [
  {
    icon: GitProviderIcons.get(Connectors.GITHUB) as IconName,
    label: 'common.repo_provider.githubLabel',
    type: Connectors.GITHUB
  },
  {
    icon: GitProviderIcons.get(Connectors.GITLAB) as IconName,
    label: 'common.repo_provider.gitlabLabel',
    type: Connectors.GITLAB
  },
  {
    icon: GitProviderIcons.get(Connectors.BITBUCKET) as IconName,
    label: 'common.repo_provider.bitbucketLabel',
    type: Connectors.BITBUCKET
  }
]

export const HarnessGitProvider: GitProvider = {
  icon: 'code' as IconName,
  label: 'harness',
  type: Connectors.Harness
}

export const AllOnPremGitProviders: GitProvider[] = [
  ...AllSaaSGitProviders,
  {
    icon: GitProviderIcons.get(Connectors.GIT) as IconName,
    label: 'ci.getStartedWithCI.genericGit',
    type: Connectors.GIT
  }
]

export enum GitAuthenticationMethod {
  OAuth = 'OAUTH',
  AccessToken = 'ACCESS_TOKEN',
  AccessKey = 'ACCESS_KEY',
  UserNameAndApplicationPassword = 'USERNAME_AND_PASSWORD'
}

export interface GitProviderPermission {
  type: ConnectorInfoDTO['type']
  permissions: string[]
}

export const GitProviderPermissions: GitProviderPermission[] = [
  { type: Connectors.GITHUB, permissions: ['repo', 'admin:repo_hook', 'user'] },
  { type: Connectors.BITBUCKET, permissions: ['Issues:read', 'Webhooks:read and write', 'Pull requests:write'] },
  { type: Connectors.GITLAB, permissions: ['api', 'read_repository', 'write_repository'] }
]

export const GitProviderTypeToAuthenticationMethodMapping: Map<ConnectorInfoDTO['type'], GitAuthenticationMethod> =
  new Map([
    [Connectors.GITHUB, GitAuthenticationMethod.AccessToken],
    [Connectors.GITLAB, GitAuthenticationMethod.AccessKey],
    [Connectors.BITBUCKET, GitAuthenticationMethod.UserNameAndApplicationPassword]
  ])

export const DEFAULT_HARNESS_KMS = 'harnessSecretManager'

export const ACCOUNT_SCOPE_PREFIX = 'account.'

export const ORG_SCOPE_PREFIX = 'org.'

export const DEFAULT_STAGE_ID = 'Build'

export const DOCKER_REGISTRY_CONNECTOR_REF = 'harnessImage'

export const KUBERNETES_HOSTED_INFRA_ID = 'k8s-hosted-infra'

export const CodebaseProperties = {
  ci: {
    codebase: {
      connectorRef: 'connectorRef',
      repoName: '',
      build: '<+input>'
    }
  }
}

export const DELEGATE_INSTALLATION_REFETCH_DELAY = 20 * 1000 // 20 secs
export const MAX_TIMEOUT_DELEGATE_INSTALLATION = 1000 * 60 * 10 // 10 minutes

export const BitbucketPRTriggerActions: BitbucketPRSpec['actions'] = ['Create', 'Update']

export const GitHubPRTriggerActions: GithubPRSpec['actions'] = ['Reopen', 'Synchronize', 'Open']

export const GitlabPRTriggerActions: GitlabPRSpec['actions'] = ['Reopen', 'Sync', 'Open']

export const AccessTokenPermissionsDocLinks: Map<ConnectorInfoDTO['type'], string> = new Map([
  [Connectors.GITHUB, 'https://docs.harness.io/article/jd77qvieuw#step_3_credentials'],
  [Connectors.GITLAB, 'https://docs.harness.io/article/5abnoghjgo#password_personal_access_token'],
  [Connectors.BITBUCKET, 'https://docs.harness.io/article/iz5tucdwyu#personal_access_token']
])

export const ProvisionedByHarnessDelegateGroupIdentifier = '_harness_kubernetes_delegate' // unique group identifier of delegate installed and managed by Harness for Hosted by Harness infra offering
