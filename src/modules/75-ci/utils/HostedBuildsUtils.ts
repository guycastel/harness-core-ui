/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { cloneDeep, get, isEmpty, omit, set, unset } from 'lodash-es'
import { parse } from 'yaml'
import type { ConnectorInfoDTO, ConnectorRequestBody, ConnectorResponse, UserRepoResponse } from 'services/cd-ng'
import type { PipelineConfig } from 'services/pipeline-ng'
import type { DelegateGroupDetails } from 'services/portal'
import type { UseStringsReturn } from 'framework/strings'
import { getScopedValueFromDTO } from '@common/components/EntityReference/EntityReference.types'
import { GitSuffixRegex } from '@common/utils/StringUtils'
import { Connectors } from '@platform/connectors/constants'
import { GIT_EXTENSION, YAMLVersion } from '@pipeline/utils/CIUtils'
import {
  BuildType,
  BuildCodebaseType,
  DefaultBuildValues
} from '@pipeline/components/PipelineInputSetForm/CICodebaseInputSetForm'
import { ArchTypes, OsTypes } from '@modules/70-pipeline/utils/constants'
import {
  BitbucketPRTriggerActions,
  GitHubPRTriggerActions,
  GitlabPRTriggerActions,
  DEFAULT_STAGE_ID,
  DOCKER_REGISTRY_CONNECTOR_REF,
  ACCOUNT_SCOPE_PREFIX,
  CodebaseProperties,
  LocalRunnerOsArchTypes
} from '../pages/get-started-with-ci/InfraProvisioningWizard/Constants'

export const DELEGATE_SELECTOR_FOR_HARNESS_PROVISIONED_DELEGATE = 'harness-kubernetes-delegate'

const OAuthConnectorPayload: ConnectorRequestBody = {
  connector: {
    name: '',
    identifier: '',
    type: 'Github',
    orgIdentifier: '',
    projectIdentifier: '',
    spec: {
      authentication: {
        type: 'Http',
        spec: {
          type: 'OAuth',
          spec: {
            tokenRef: ''
          }
        }
      },
      apiAccess: {
        type: 'OAuth',
        spec: {
          tokenRef: ''
        }
      },
      executeOnDelegate: false,
      type: 'Account'
    }
  }
}

export const getOAuthConnectorPayload = ({
  tokenRef,
  refreshTokenRef,
  gitProviderType
}: {
  tokenRef: string
  refreshTokenRef?: string
  gitProviderType?: ConnectorInfoDTO['type']
}): ConnectorRequestBody => {
  let updatedConnectorPayload: ConnectorRequestBody = {}
  updatedConnectorPayload = set(OAuthConnectorPayload, 'connector.name', `${gitProviderType} OAuth`)
  updatedConnectorPayload = set(
    OAuthConnectorPayload,
    'connector.identifier',
    `${gitProviderType}_OAuth_${new Date().getTime()}`
  )
  updatedConnectorPayload = set(OAuthConnectorPayload, 'connector.type', gitProviderType)
  switch (gitProviderType) {
    case Connectors.GITHUB:
      updatedConnectorPayload = set(OAuthConnectorPayload, 'connector.spec.authentication.spec.spec', { tokenRef })
      updatedConnectorPayload = set(OAuthConnectorPayload, 'connector.spec.apiAccess.spec', { tokenRef })
      return updatedConnectorPayload
    case Connectors.GITLAB:
    case Connectors.BITBUCKET:
      updatedConnectorPayload = set(OAuthConnectorPayload, 'connector.spec.authentication.spec.spec', {
        tokenRef,
        refreshTokenRef
      })
      updatedConnectorPayload = set(OAuthConnectorPayload, 'connector.spec.apiAccess.spec', {
        tokenRef,
        refreshTokenRef
      })
      return updatedConnectorPayload
    default:
      return updatedConnectorPayload
  }
}

export const getPRTriggerActions = (gitProviderType: ConnectorInfoDTO['type']) => {
  switch (gitProviderType) {
    case Connectors.GITHUB:
      return GitHubPRTriggerActions

    case Connectors.GITLAB:
      return GitlabPRTriggerActions

    case Connectors.BITBUCKET:
      return BitbucketPRTriggerActions

    default:
      return []
  }
}

export const sortConnectorsByLastConnectedAtTsDescOrder = (
  unsortedConnectorItems: ConnectorResponse[]
): ConnectorResponse[] => {
  const itemsCloneArr = [...unsortedConnectorItems]
  return [...itemsCloneArr].sort((ctr1, ctr2) => {
    const lastTestedAt1: number =
      ctr1?.status?.lastConnectedAt && !isNaN(ctr1.status.lastConnectedAt) ? ctr1.status.lastConnectedAt : 0
    const lastTestedAt2: number =
      ctr2?.status?.lastConnectedAt && !isNaN(ctr2.status.lastConnectedAt) ? ctr2.status.lastConnectedAt : 0
    return lastTestedAt2 - lastTestedAt1
  })
}

export const addDetailsToPipeline = ({
  originalPipeline,
  name,
  identifier,
  projectIdentifier,
  orgIdentifier,
  connectorRef,
  repoName,
  yamlVersion = YAMLVersion.V0,
  shouldAddBuildRuntimeInput = false
}: {
  originalPipeline: PipelineConfig
  name: string
  identifier: string
  projectIdentifier: string
  orgIdentifier: string
  connectorRef?: string
  repoName?: string
  yamlVersion?: YAMLVersion
  shouldAddBuildRuntimeInput?: boolean
}): PipelineConfig => {
  let updatedPipeline = { ...originalPipeline }
  if (yamlVersion === YAMLVersion.V1) {
    return set(updatedPipeline, 'name', name)
  }
  updatedPipeline = set(updatedPipeline, 'pipeline.name', name)
  updatedPipeline = set(updatedPipeline, 'pipeline.identifier', identifier.replace(/[-.]/g, '_'))
  updatedPipeline = set(updatedPipeline, 'pipeline.projectIdentifier', projectIdentifier)
  updatedPipeline = set(updatedPipeline, 'pipeline.orgIdentifier', orgIdentifier)
  if (connectorRef) {
    updatedPipeline = set(updatedPipeline, 'pipeline.properties.ci.codebase.connectorRef', connectorRef)
  } else {
    unset(updatedPipeline, 'pipeline.properties.ci.codebase.connectorRef')
  }
  if (repoName) updatedPipeline = set(updatedPipeline, 'pipeline.properties.ci.codebase.repoName', repoName)
  if (shouldAddBuildRuntimeInput) {
    updatedPipeline = set(
      updatedPipeline,
      'pipeline.properties.ci.codebase.build',
      CodebaseProperties.ci.codebase.build
    )
  }
  return updatedPipeline
}

export const getGitConnectorRepoBasedOnRepoUrl = (
  connector: ConnectorInfoDTO,
  repository: UserRepoResponse
): string => {
  const existingGitConnectorUrl: string = get(connector, 'spec.url')
  const { name: repositoryName = '', namespace = '' } = repository
  return existingGitConnectorUrl.endsWith(namespace) ? repositoryName : getFullRepoName(repository)
}

export const getFullRepoName = (repository: UserRepoResponse): string => {
  const { name: repositoryName = '', namespace = '' } = repository
  return namespace && repositoryName ? `${namespace}/${repositoryName}` : repositoryName
}

export const getPayloadForPipelineCreation = ({
  pipelineYaml,
  getString,
  projectIdentifier,
  orgIdentifier,
  repositoryName,
  configuredGitConnector,
  shouldAddBuildRuntimeInput,
  dummyGitnessHarnessConnector,
  pipelineName
}: {
  pipelineYaml: string
  getString: UseStringsReturn['getString']
  projectIdentifier: string
  orgIdentifier: string
  repositoryName: string
  configuredGitConnector: ConnectorInfoDTO
  shouldAddBuildRuntimeInput?: boolean
  dummyGitnessHarnessConnector?: ConnectorInfoDTO
  pipelineName?: string
}): PipelineConfig => {
  const UNIQUE_PIPELINE_ID = new Date().getTime().toString()
  return addDetailsToPipeline({
    originalPipeline: parse(pipelineYaml),
    name: pipelineName?.length ? pipelineName : `${getString('buildText')} ${repositoryName}`,
    identifier: `${getString('buildText')}_${repositoryName?.replace(/[-./]/g, '_')}_${UNIQUE_PIPELINE_ID}`,
    projectIdentifier,
    orgIdentifier,
    connectorRef:
      configuredGitConnector.identifier === dummyGitnessHarnessConnector?.identifier
        ? ''
        : getScopedValueFromDTO(configuredGitConnector),
    repoName: repositoryName,
    shouldAddBuildRuntimeInput
  })
}

export const getValidRepoName = (repositoryName: string): string => {
  let repoName = repositoryName
  if (!repositoryName) {
    return ''
  }
  if (repositoryName.indexOf('/')) {
    const tokens = repositoryName.split('/')
    repoName = tokens.length > 0 ? tokens[tokens.length - 1] : ''
  }
  return encodeURI(repoName.endsWith(GIT_EXTENSION) ? repoName.replace(/\.[^/.]+$/, '') : repoName)
}

/* Certain Git operations do not work if git connector url doesn't have repo namespace suffixed to it */
export const updateUrlAndRepoInGitConnector = (
  existingConnector: ConnectorInfoDTO,
  repository?: UserRepoResponse
): ConnectorInfoDTO => {
  const existingGitConnectorUrl: string = get(existingConnector, 'spec.url')
  const existingValidationRepo: string = get(existingConnector, 'spec.validationRepo', '')
  const { name: repoName = '', namespace = '' } = repository || {}
  if (existingGitConnectorUrl.endsWith(namespace)) {
    if (existingValidationRepo.startsWith(namespace)) {
      return set(existingConnector, 'spec.validationRepo', repoName)
    }
    return existingConnector
  }
  return set(
    set(existingConnector, 'spec.url', `${existingGitConnectorUrl}/${namespace}`),
    'spec.validationRepo',
    repoName
  )
}

export const DefaultCIPipelineName = 'Sample Pipeline'

export const getPipelinePayloadWithoutCodebase = (): Record<string, any> => {
  return {
    pipeline: {
      name: '',
      identifier: '',
      projectIdentifier: '',
      orgIdentifier: '',
      stages: [
        {
          stage: {
            name: DEFAULT_STAGE_ID,
            identifier: DEFAULT_STAGE_ID,
            type: 'CI',
            spec: {
              cloneCodebase: false,
              infrastructure: {},
              execution: {
                steps: [
                  {
                    step: {
                      type: 'Run',
                      name: 'Echo Welcome Message',
                      identifier: 'Echo_Welcome_Message',
                      spec: {
                        connectorRef: ACCOUNT_SCOPE_PREFIX.concat(DOCKER_REGISTRY_CONNECTOR_REF),
                        image: 'alpine',
                        shell: 'Sh',
                        command: 'echo "Welcome to Harness CI"'
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      ]
    }
  }
}

export const addRepositoryInfoToPipeline = ({
  currentPipeline,
  connectorRef,
  repoName
}: {
  currentPipeline: Record<string, any>
  connectorRef: string
  repoName: string
}): Record<string, any> => {
  return set(currentPipeline, 'options.repository', { connector: connectorRef, name: repoName })
}

export const getCIStarterPipelineV1 = (): Record<string, any> => {
  return {
    version: 1,
    name: `HelloWorld CI ${new Date().getTime().toString()}`,
    stages: [
      {
        name: 'build',
        type: 'ci',
        spec: {
          steps: [
            {
              name: 'Run echo',
              type: 'script',
              spec: {
                run: 'echo "Hello Harness CI!"'
              }
            }
          ]
        }
      }
    ]
  }
}

export const getCIStarterPipeline = (
  yamlVersion: YAMLVersion,
  infraType?: string,
  localRunnerOsArch?: LocalRunnerOsArchTypes
): PipelineConfig => {
  return yamlVersion === YAMLVersion.V1
    ? getCIStarterPipelineV1()
    : getCloudPipelinePayloadWithCodebase(infraType, localRunnerOsArch)
}

export const getCloudPipelinePayloadWithoutCodebase = (
  infraType?: string,
  localRunnerOsArch?: LocalRunnerOsArchTypes
): PipelineConfig => {
  const originalPipeline = getPipelinePayloadWithoutCodebase()
  set(originalPipeline, 'pipeline.stages.0.stage.spec.infrastructure', undefined)
  set(originalPipeline, 'pipeline.stages.0.stage.spec.execution.steps.0.step.spec.image', undefined)
  set(originalPipeline, 'pipeline.stages.0.stage.spec.execution.steps.0.step.spec.connectorRef', undefined)
  set(originalPipeline, 'pipeline.stages.0.stage.spec.platform', {
    os: localRunnerOsArch?.osType ?? 'Linux',
    arch: localRunnerOsArch?.archType ?? 'Amd64'
  })
  set(originalPipeline, 'pipeline.stages.0.stage.spec.runtime', { type: infraType ?? 'Cloud', spec: {} })
  return originalPipeline
}

export const getCloudPipelinePayloadWithCodebase = (
  infraType?: string,
  localRunnerOsArch?: LocalRunnerOsArchTypes
): PipelineConfig => {
  const originalPipeline = getCloudPipelinePayloadWithoutCodebase(infraType, localRunnerOsArch)
  return set(
    set(originalPipeline, 'pipeline.properties', CodebaseProperties),
    'pipeline.stages.0.stage.spec.cloneCodebase',
    true
  )
}

export const moveVersionFieldToTheTop = (existingPipeline: Record<string, any>) => {
  return { name: get(existingPipeline, 'name'), version: 1, ...omit(existingPipeline, 'version') }
}

export const getRemoteInputSetPayload = ({
  name,
  identifier,
  projectIdentifier,
  orgIdentifier,
  pipelineIdentifier,
  triggerType
}: {
  name: string
  identifier: string
  orgIdentifier: string
  projectIdentifier: string
  pipelineIdentifier: string
  triggerType: BuildCodebaseType
}): Record<string, any> => {
  if (![BuildCodebaseType.PR, BuildCodebaseType.branch].includes(triggerType)) {
    return {}
  }
  return {
    inputSet: {
      name,
      identifier,
      orgIdentifier,
      projectIdentifier,
      pipeline: {
        identifier: pipelineIdentifier,
        properties: {
          ci: {
            codebase: {
              build: {
                type: triggerType === BuildCodebaseType.PR ? BuildType.PR : BuildType.branch,
                spec: {
                  ...(triggerType === BuildCodebaseType.PR
                    ? { number: DefaultBuildValues.PR }
                    : { branch: DefaultBuildValues.branch })
                }
              }
            }
          }
        }
      }
    }
  }
}

export const getNamespaceFromGitConnectorURL = (configuredGitConnector: ConnectorInfoDTO): string => {
  /* For url https://github.com/org/repo -> "org" is namespace */
  const gitBaseURL = GIT_PROVIDER_BASE_URL.get(configuredGitConnector?.type)
  const gitConnectorURL: string = get(configuredGitConnector, 'spec.url', '').replace(GitSuffixRegex, '') // remove .git from the url if present
  if (
    !gitBaseURL ||
    gitConnectorURL === gitBaseURL ||
    (gitConnectorURL.endsWith('/') && gitConnectorURL.slice(0, -1) === gitBaseURL)
  ) {
    return ''
  }
  const urlSuffix = gitConnectorURL.split(gitBaseURL)?.[1]
  if (urlSuffix.startsWith('/')) {
    // indicates presence of namespace
    return urlSuffix.slice(1).split('/')?.[0]
  }
  return ''
}

export const getRepoNameForDefaultBranchFetch = (
  configuredGitConnector: ConnectorInfoDTO,
  specifiedRepoName: string
): string => {
  const namespace = getNamespaceFromGitConnectorURL(configuredGitConnector)
  if (!namespace) {
    return specifiedRepoName
  } else {
    if (specifiedRepoName.includes('/')) {
      return specifiedRepoName.split('/')?.[1]
    } else {
      return specifiedRepoName
    }
  }
}

const GIT_PROVIDER_BASE_URL = new Map<ConnectorInfoDTO['type'], string>([
  [Connectors.GITHUB, 'github.com'],
  [Connectors.GITLAB, 'gitlab.com'],
  [Connectors.BITBUCKET, 'bitbucket.org']
])

export const updateRuntimeOsArch = (pipelineYaml: PipelineConfig, localRunnerOsArch?: LocalRunnerOsArchTypes) => {
  const clonedPipeline = cloneDeep(pipelineYaml)
  // Iterate over each stage in the 'stages' array
  clonedPipeline.pipeline?.stages?.forEach((stage, index) => {
    // Construct the path to the 'runtime.type' property using the index
    if (!isEmpty(stage)) {
      const RuntimePath = `pipeline.stages.${index}.stage.spec.runtime.type`
      set(clonedPipeline, RuntimePath, 'Docker')
      if (localRunnerOsArch?.osType && localRunnerOsArch?.archType) {
        const OsPath = `pipeline.stages.${index}.stage.spec.platform.os`
        set(clonedPipeline, OsPath, localRunnerOsArch.osType)
        const ArchPath = `pipeline.stages.${index}.stage.spec.platform.arch`
        set(clonedPipeline, ArchPath, localRunnerOsArch.archType)
      }
    }
  })

  return clonedPipeline
}

export const getOsArchFromDelegateTags = (delegateDetails: DelegateGroupDetails) => {
  const delegateTags = delegateDetails?.groupCustomSelectors
  let osType: OsTypes | undefined
  let archType: ArchTypes | undefined

  const OsChecker = new Map<string, OsTypes>([
    [OsTypes.Linux.toLowerCase(), OsTypes.Linux],
    [OsTypes.MacOS.toLowerCase(), OsTypes.MacOS],
    [OsTypes.Windows.toLowerCase(), OsTypes.Windows]
  ])

  const ArchChecker = new Map<string, ArchTypes>([
    [ArchTypes.Arm64.toLowerCase(), ArchTypes.Arm64],
    [ArchTypes.Amd64.toLowerCase(), ArchTypes.Amd64]
  ])

  for (const item of delegateTags ?? []) {
    const [osPart, archPart] = item.split('-')
    if (OsChecker.has(osPart) && ArchChecker.has(archPart)) {
      osType = OsChecker.get(osPart)
      archType = ArchChecker.get(archPart)
      break
    }
  }

  return { osType, archType }
}
