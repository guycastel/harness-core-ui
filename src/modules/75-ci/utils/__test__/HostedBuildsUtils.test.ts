/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
import { get, set } from 'lodash-es'
import type { UseStringsReturn } from 'framework/strings'
import type { ConnectorInfoDTO } from 'services/cd-ng'
import type { PipelineConfig } from 'services/pipeline-ng'
import { Connectors } from '@platform/connectors/constants'
import { YAMLVersion } from '@pipeline/utils/CIUtils'
import { getBackendServerUrl } from '@common/components/ConnectViaOAuth/OAuthUtils'
import {
  addDetailsToPipeline,
  getFullRepoName,
  getOAuthConnectorPayload,
  getPayloadForPipelineCreation,
  getPRTriggerActions,
  getRepoNameForDefaultBranchFetch,
  getNamespaceFromGitConnectorURL,
  getValidRepoName,
  sortConnectorsByLastConnectedAtTsDescOrder,
  updateUrlAndRepoInGitConnector,
  getOsArchFromDelegateTags
} from '../HostedBuildsUtils'
import {
  GitHubPRTriggerActions,
  GitlabPRTriggerActions,
  BitbucketPRTriggerActions
} from '../../pages/get-started-with-ci/InfraProvisioningWizard/Constants'

beforeAll(() => {
  jest.useFakeTimers({ advanceTimers: true })
  jest.setSystemTime(new Date(2020, 3, 1))
})

afterAll(() => {
  jest.useRealTimers()
})

describe('Test HostedBuildsUtils methods', () => {
  test('Test getOAuthConnectorPayload method', () => {
    const oAuthConnectorPayloadForGithub = getOAuthConnectorPayload({
      tokenRef: 'secret-token',
      gitProviderType: 'Github'
    })
    expect(get(oAuthConnectorPayloadForGithub, 'connector.name')).toBe('Github OAuth')
    expect(get(oAuthConnectorPayloadForGithub, 'connector.identifier')).toBe('Github_OAuth_1585699200000')
    expect(get(oAuthConnectorPayloadForGithub, 'connector.spec.authentication.spec.spec.tokenRef')).toBe('secret-token')
    expect(get(oAuthConnectorPayloadForGithub, 'connector.spec.apiAccess.spec.tokenRef')).toBe('secret-token')
    expect(get(oAuthConnectorPayloadForGithub, 'connector.spec.executeOnDelegate')).toBe(false)

    const oAuthConnectorPayloadForGitlab = getOAuthConnectorPayload({
      tokenRef: 'secret-token',
      refreshTokenRef: 'secret-refresh-token',
      gitProviderType: 'Gitlab'
    })
    expect(get(oAuthConnectorPayloadForGitlab, 'connector.name')).toBe('Gitlab OAuth')
    expect(get(oAuthConnectorPayloadForGitlab, 'connector.identifier')).toBe('Gitlab_OAuth_1585699200000')
    expect(get(oAuthConnectorPayloadForGitlab, 'connector.spec.authentication.spec.spec.tokenRef')).toBe('secret-token')
    expect(get(oAuthConnectorPayloadForGitlab, 'connector.spec.authentication.spec.spec.refreshTokenRef')).toBe(
      'secret-refresh-token'
    )
    expect(get(oAuthConnectorPayloadForGitlab, 'connector.spec.apiAccess.spec.tokenRef')).toBe('secret-token')
    expect(get(oAuthConnectorPayloadForGitlab, 'connector.spec.apiAccess.spec.refreshTokenRef')).toBe(
      'secret-refresh-token'
    )
    expect(get(oAuthConnectorPayloadForGithub, 'connector.spec.executeOnDelegate')).toBe(false)

    const oAuthConnectorPayloadForBitbucket = getOAuthConnectorPayload({
      tokenRef: 'secret-token',
      refreshTokenRef: 'secret-refresh-token',
      gitProviderType: 'Bitbucket'
    })
    expect(get(oAuthConnectorPayloadForBitbucket, 'connector.name')).toBe('Bitbucket OAuth')
    expect(get(oAuthConnectorPayloadForBitbucket, 'connector.identifier')).toBe('Bitbucket_OAuth_1585699200000')
    expect(get(oAuthConnectorPayloadForBitbucket, 'connector.spec.authentication.spec.spec.tokenRef')).toBe(
      'secret-token'
    )
    expect(get(oAuthConnectorPayloadForBitbucket, 'connector.spec.authentication.spec.spec.refreshTokenRef')).toBe(
      'secret-refresh-token'
    )
    expect(get(oAuthConnectorPayloadForBitbucket, 'connector.spec.apiAccess.spec.tokenRef')).toBe('secret-token')
    expect(get(oAuthConnectorPayloadForBitbucket, 'connector.spec.apiAccess.spec.refreshTokenRef')).toBe(
      'secret-refresh-token'
    )
    expect(get(oAuthConnectorPayloadForGithub, 'connector.spec.executeOnDelegate')).toBe(false)
  })

  test('Test getBackendServerUrl method', () => {
    expect(getBackendServerUrl()).toBe('http://localhost')

    delete (window as any).location
    global.window.location = {
      ...window.location,
      protocol: 'https',
      hostname: 'app.harness.io'
    }
    expect(getBackendServerUrl()).toBe('https//app.harness.io')
  })

  test('Test getPRTriggerActions method', () => {
    expect(getPRTriggerActions(Connectors.GITHUB)).toBe(GitHubPRTriggerActions)
    expect(getPRTriggerActions(Connectors.GITLAB)).toBe(GitlabPRTriggerActions)
    expect(getPRTriggerActions(Connectors.BITBUCKET)).toBe(BitbucketPRTriggerActions)
    expect(getPRTriggerActions(Connectors.KUBERNETES_CLUSTER)).toStrictEqual([])
  })

  test('Test sortConnectorsByLastConnectedAtTsDescOrder method', () => {
    let sortedItems = sortConnectorsByLastConnectedAtTsDescOrder([
      { status: { lastConnectedAt: 1668000000000 } },
      { status: { lastConnectedAt: 1658000000000 } }
    ])
    expect(
      new Number(get(sortedItems[0], 'status.lastConnectedAt')) >
        new Number(get(sortedItems[1], 'status.lastConnectedAt'))
    ).toBe(true)
    sortedItems = sortConnectorsByLastConnectedAtTsDescOrder([
      { status: {} },
      { status: { lastConnectedAt: 1658000000000 } }
    ])
    expect(
      new Number(get(sortedItems[0], 'status.lastConnectedAt')) >
        new Number(get(sortedItems[1], 'status.lastConnectedAt'))
    ).toBe(false)
  })

  test('Test addDetailsToPipeline method', () => {
    // test for v0 pipeline
    const updatedV0Pipeline = addDetailsToPipeline({
      originalPipeline: { pipeline: { identifier: '', name: '' } },
      name: 'sample pipeline',
      orgIdentifier: 'orgId',
      projectIdentifier: 'projectId',
      identifier: 'sample_pipeline_identifier',
      connectorRef: 'account.github_connector',
      repoName: 'test-repo'
    })
    expect(updatedV0Pipeline.pipeline?.name).toBe('sample pipeline')
    expect(updatedV0Pipeline.pipeline?.orgIdentifier).toBe('orgId')
    expect(updatedV0Pipeline.pipeline?.projectIdentifier).toBe('projectId')
    expect(updatedV0Pipeline.pipeline?.properties?.ci?.codebase?.connectorRef).toBe('account.github_connector')
    expect(updatedV0Pipeline.pipeline?.properties?.ci?.codebase?.repoName).toBe('test-repo')

    // test for V1 pipeline
    const v1Pipeline = {
      version: 1,
      name: 'default',
      stages: [
        {
          name: 'build',
          type: 'ci',
          spec: {
            steps: [
              {
                name: 'Run echo_1',
                type: 'script',
                spec: {
                  run: 'echo "Hello build1!"'
                }
              },
              {
                name: 'Run echo_2',
                type: 'script',
                spec: {
                  run: 'echo "Hello build1!"'
                }
              }
            ]
          }
        }
      ]
    }

    const updatedV1Pipeline = addDetailsToPipeline({
      originalPipeline: v1Pipeline as PipelineConfig,
      name: 'sample pipeline',
      orgIdentifier: 'orgId',
      projectIdentifier: 'projectId',
      identifier: 'sample_pipeline_identifier',
      connectorRef: 'account.github_connector',
      repoName: 'test-repo',
      yamlVersion: YAMLVersion.V1
    })
    expect(get(updatedV1Pipeline, 'name')).toBe('sample pipeline')
  })

  test('Test getFullRepoName method', () => {
    expect(getFullRepoName({ name: 'harness-core-ui', namespace: 'harness' })).toBe('harness/harness-core-ui')
    expect(getFullRepoName({ name: '', namespace: 'harness' })).toBe('')
    expect(getFullRepoName({ name: 'harness-core-ui', namespace: '' })).toBe('harness-core-ui')
    expect(getFullRepoName({ name: '', namespace: '' })).toBe('')
  })

  test('Test getPayloadForPipelineCreation method', () => {
    const args: {
      pipelineYaml: string
      pipelineName: string
      isUsingHostedVMsInfra?: boolean
      isUsingAStarterPipeline: boolean
      getString: UseStringsReturn['getString']
      projectIdentifier: string
      orgIdentifier: string
      repositoryName: string
      configuredGitConnector: ConnectorInfoDTO
    } = {
      pipelineYaml:
        'pipeline:\n  name: Build Dot NET Core\n  identifier: Build_Dot_NET_Core\n  projectIdentifier: testproj\n  orgIdentifier: default\n  stages:\n    - stage:\n        name: Build Dot NET Core App\n        identifier: Build\n        type: CI\n        spec:\n          cloneCodebase: true\n          execution:\n            steps:\n              - step:\n                  type: Run\n                  name: Build Dot NET Core App\n                  identifier: Run\n                  spec:\n                    connectorRef: account.harnessImage\n                    image: mcr.microsoft.com/dotnet/sdk:6.0\n                    shell: Sh\n                    command: echo "Welcome to Harness CI"\n          platform:\n            os: Linux\n            arch: Amd64\n          runtime:\n            type: Cloud\n            spec: {}\n  properties:\n    ci:\n      codebase:\n        connectorRef: account.Gitlab\n        repoName: vardan.bansal/test-project\n        build: <+input>\n',
      isUsingHostedVMsInfra: true,
      getString: (key: any): any => {
        return key
      },
      isUsingAStarterPipeline: true,
      orgIdentifier: 'orgId',
      projectIdentifier: 'projectId',
      pipelineName: 'Build Dot Net',
      repositoryName: 'test-repo.name',
      configuredGitConnector: { identifier: 'testconnector', name: 'test connector', type: 'Github', spec: {} }
    }
    let createdPipelinePayload = getPayloadForPipelineCreation(args)
    const { name, identifier } = createdPipelinePayload?.pipeline || {}
    expect(name).toBe('Build Dot Net')
    expect(identifier).toBe('buildText_test_repo_name_1585699200000')
    expect(get(createdPipelinePayload, 'pipeline.stages.0.stage.spec.runtime')).not.toBeUndefined()
    expect(get(createdPipelinePayload, 'pipeline.stages.0.stage.spec.platform')).not.toBeUndefined()

    createdPipelinePayload = getPayloadForPipelineCreation({ ...args })
    expect(createdPipelinePayload.pipeline?.name).toBe('Build Dot Net')
    expect(createdPipelinePayload.pipeline?.identifier).toBe('buildText_test_repo_name_1585699200000')

    createdPipelinePayload = getPayloadForPipelineCreation({ ...args })
    expect(createdPipelinePayload.pipeline?.name).toBe('Build Dot Net')
    expect(createdPipelinePayload.pipeline?.identifier).toBe('buildText_test_repo_name_1585699200000')

    const k8sArgs = {
      ...args,
      isUsingAStarterPipeline: false,
      isUsingHostedVMsInfra: false,
      pipelineYaml:
        'pipeline:\n  name: Build .NET Core App\n  identifier: Build_reactcalculator_1663793074386\n  projectIdentifier: Default_Project_1663793031057\n  orgIdentifier: default\n  properties:\n    ci:\n      codebase:\n        connectorRef: GitHub\n        repoName: PowerShell/PowerShell\n        build: <+input>\n  stages:\n    - stage:\n        name: Build Dot NET Core App\n        identifier: Build_NET_Core_App\n        description: ""\n        type: CI\n        spec:\n          cloneCodebase: true\n          infrastructure:\n            type: KubernetesHosted\n            spec:\n              identifier: k8s-hosted-infra\n          execution:\n            steps:\n              - step:\n                  type: Run\n                  name: Build Dot NET Core App\n                  identifier: Build_NET_Core_App\n                  spec:\n                    connectorRef: account.harnessImage\n                    image: mcr.microsoft.com/dotnet/sdk:6.0\n                    shell: Sh\n                    command: |-\n                      echo "Welcome to Harness CI"\n                      dotnet restore\n                      dotnet build --no-restore\n                      dotnet test --no-build --verbosity normal'
    }

    createdPipelinePayload = getPayloadForPipelineCreation(k8sArgs)
    expect(get(createdPipelinePayload, 'pipeline.stages.0.stage.spec.runtime')).toBeUndefined()
    expect(get(createdPipelinePayload, 'pipeline.stages.0.stage.spec.platform')).toBeUndefined()
    expect(JSON.stringify(get(createdPipelinePayload, 'pipeline.stages.0.stage.spec.infrastructure'))).toBe(
      JSON.stringify({
        type: 'KubernetesHosted',
        spec: { identifier: 'k8s-hosted-infra' }
      })
    )

    createdPipelinePayload = getPayloadForPipelineCreation({ ...k8sArgs })
    expect(createdPipelinePayload.pipeline?.name).toBe('Build Dot Net')
    expect(createdPipelinePayload.pipeline?.identifier).toBe('buildText_test_repo_name_1585699200000')
    expect(JSON.stringify(get(createdPipelinePayload, 'pipeline.stages.0.stage.spec.infrastructure'))).toBe(
      JSON.stringify({
        type: 'KubernetesHosted',
        spec: { identifier: 'k8s-hosted-infra' }
      })
    )
    expect(createdPipelinePayload.pipeline?.properties?.ci?.codebase?.connectorRef).toBe('account.testconnector')
  })

  test('Test getValidRepoName method', () => {
    expect(getValidRepoName('')).toBe('')
    expect(getValidRepoName('test-namespace/test-repo')).toBe('test-repo')
    expect(getValidRepoName('test-namespace/test-repo.git')).toBe('test-repo')
    expect(getValidRepoName('test-repo')).toBe('test-repo')
    expect(getValidRepoName('test-namespace/')).toBe('')
  })

  test('Test getNamespaceFromGitConnectorURL method', () => {
    const configuredGitConnectorGithub: ConnectorInfoDTO = {
      name: 'Github',
      identifier: 'Github',
      type: 'Github',
      spec: {
        url: 'https://github.com',
        validationRepo: 'test-namespace/test-repo',
        authentication: {
          type: 'Http',
          spec: {
            type: 'UsernameToken',
            spec: {
              username: 'test-user',
              tokenRef: 'account.pat'
            }
          }
        },
        apiAccess: {
          type: 'Token',
          spec: {
            tokenRef: 'account.pat'
          }
        },
        executeOnDelegate: false,
        type: 'Account'
      }
    }
    const configuredGitConnectorBitbucket: ConnectorInfoDTO = {
      name: 'Bitbucket',
      identifier: 'Bitbucket',
      type: 'Bitbucket',
      spec: {
        url: 'https://bitbucket.org',
        validationRepo: 'test-repo',
        authentication: {
          type: 'Http',
          spec: {
            type: 'UsernameToken',
            spec: {
              username: 'test-user',
              tokenRef: 'account.pat'
            }
          }
        },
        apiAccess: {
          type: 'Token',
          spec: {
            tokenRef: 'account.pat'
          }
        },
        executeOnDelegate: false,
        type: 'Account'
      }
    }
    expect(getNamespaceFromGitConnectorURL(configuredGitConnectorGithub)).toBe('')
    expect(getNamespaceFromGitConnectorURL(configuredGitConnectorBitbucket)).toBe('')
    expect(getNamespaceFromGitConnectorURL(set(configuredGitConnectorGithub, 'spec.url', 'https://github.com/'))).toBe(
      ''
    )
    expect(
      getNamespaceFromGitConnectorURL(
        set(configuredGitConnectorGithub, 'spec.url', 'https://github.com/test-namespace')
      )
    ).toBe('test-namespace')
    expect(
      getNamespaceFromGitConnectorURL(
        set(configuredGitConnectorGithub, 'spec.url', 'https://github.com/test-namespace/')
      )
    ).toBe('test-namespace')
    expect(
      getNamespaceFromGitConnectorURL(
        set(configuredGitConnectorGithub, 'spec.url', 'https://github.com/test-namespace/test-repo')
      )
    ).toBe('test-namespace')
    expect(
      getNamespaceFromGitConnectorURL(
        set(configuredGitConnectorGithub, 'spec.url', 'https://github.com/test-namespace/test-repo.git')
      )
    ).toBe('test-namespace')
  })

  test('Test getRepoNameForDefaultBranchFetch method', () => {
    const configuredGitConnector: ConnectorInfoDTO = {
      name: 'Github',
      identifier: 'Github',
      type: 'Github',
      spec: {
        url: 'https://github.com/test-namespace',
        validationRepo: 'test-repo',
        authentication: {
          type: 'Http',
          spec: {
            type: 'UsernameToken',
            spec: {
              username: 'test-user',
              tokenRef: 'account.pat'
            }
          }
        },
        apiAccess: {
          type: 'Token',
          spec: {
            tokenRef: 'account.pat'
          }
        },
        executeOnDelegate: false,
        type: 'Account'
      }
    }
    expect(getRepoNameForDefaultBranchFetch(configuredGitConnector, '')).toBe('')
    expect(
      getRepoNameForDefaultBranchFetch(
        set(configuredGitConnector, 'spec.url', 'https://github.com'),
        'test-namespace/test-repo'
      )
    ).toBe('test-namespace/test-repo')
    expect(
      getRepoNameForDefaultBranchFetch(
        set(configuredGitConnector, 'spec.url', 'https://github.com/test-namespace'),
        'test-namespace/test-repo'
      )
    ).toBe('test-repo')
    expect(
      getRepoNameForDefaultBranchFetch(
        set(configuredGitConnector, 'spec.url', 'https://github.com/test-namespace/'),
        'test-namespace/test-repo'
      )
    ).toBe('test-repo')
    expect(
      getRepoNameForDefaultBranchFetch(
        set(configuredGitConnector, 'spec.url', 'https://github.com/test-namespace/test-repo'),
        'test-namespace/test-repo'
      )
    ).toBe('test-repo')
    expect(
      getRepoNameForDefaultBranchFetch(
        set(configuredGitConnector, 'spec.url', 'https://github.com/test-namespace'),
        'test-repo'
      )
    ).toBe('test-repo')
    expect(
      getRepoNameForDefaultBranchFetch(
        set(configuredGitConnector, 'spec.url', 'https://github.com/test-namespace/test-repo.git'),
        'test-repo'
      )
    ).toBe('test-repo')
    expect(
      getRepoNameForDefaultBranchFetch(
        set(configuredGitConnector, 'spec.url', 'https://github.com/test-namespace/test-repo.git'),
        'test-namespace/test-repo'
      )
    ).toBe('test-repo')
  })

  test('Test updateUrlAndRepoInGitRepoConnector method', () => {
    // repo name with namespace
    const connector: ConnectorInfoDTO = {
      name: 'Github',
      identifier: 'Github',
      type: 'Github',
      spec: {
        url: 'https://github.com',
        validationRepo: 'test-namespace/test-repo',
        authentication: {
          type: 'Http',
          spec: {
            type: 'UsernameToken',
            spec: {
              username: 'test-user',
              tokenRef: 'account.pat'
            }
          }
        },
        apiAccess: {
          type: 'Token',
          spec: {
            tokenRef: 'account.pat'
          }
        },
        executeOnDelegate: false,
        type: 'Account'
      }
    }
    let updatedConnector = updateUrlAndRepoInGitConnector(connector, {
      namespace: 'test-namespace',
      name: 'test-repo'
    })
    expect(updatedConnector).toBeDefined()
    expect(get(updatedConnector, 'spec.url')).toBe('https://github.com/test-namespace')
    expect(get(updatedConnector, 'spec.validationRepo')).toBe('test-repo')

    // repo name and url both with namespace
    updatedConnector = updateUrlAndRepoInGitConnector(
      {
        name: 'Github',
        identifier: 'Github',
        type: 'Github',
        spec: {
          url: 'https://github.com/test-namespace',
          validationRepo: 'test-namespace/test-repo',
          authentication: {
            type: 'Http',
            spec: {
              type: 'UsernameToken',
              spec: {
                username: 'test-user',
                tokenRef: 'account.pat'
              }
            }
          },
          apiAccess: {
            type: 'Token',
            spec: {
              tokenRef: 'account.pat'
            }
          },
          executeOnDelegate: false,
          type: 'Account'
        }
      },
      {
        namespace: 'test-namespace',
        name: 'test-repo'
      }
    )
    expect(get(updatedConnector, 'spec.url')).toBe('https://github.com/test-namespace')
    expect(get(updatedConnector, 'spec.validationRepo')).toBe('test-repo')

    // repo url with namespace
    updatedConnector = updateUrlAndRepoInGitConnector(
      {
        name: 'Github',
        identifier: 'Github',
        type: 'Github',
        spec: {
          url: 'https://github.com/test-namespace',
          validationRepo: 'test-repo',
          authentication: {
            type: 'Http',
            spec: {
              type: 'UsernameToken',
              spec: {
                username: 'test-user',
                tokenRef: 'account.pat'
              }
            }
          },
          apiAccess: {
            type: 'Token',
            spec: {
              tokenRef: 'account.pat'
            }
          },
          executeOnDelegate: false,
          type: 'Account'
        }
      },
      {
        name: 'test-repo'
      }
    )
    expect(get(updatedConnector, 'spec.url')).toBe('https://github.com/test-namespace')
    expect(get(updatedConnector, 'spec.validationRepo')).toBe('test-repo')

    // repo url and repo name without namespace
    updatedConnector = updateUrlAndRepoInGitConnector(
      {
        name: 'Github',
        identifier: 'Github',
        type: 'Github',
        spec: {
          url: 'https://github.com',
          validationRepo: 'test-repo',
          authentication: {
            type: 'Http',
            spec: {
              type: 'UsernameToken',
              spec: {
                username: 'test-user',
                tokenRef: 'account.pat'
              }
            }
          },
          apiAccess: {
            type: 'Token',
            spec: {
              tokenRef: 'account.pat'
            }
          },
          executeOnDelegate: false,
          type: 'Account'
        }
      },
      {
        name: 'test-repo'
      }
    )
    expect(get(updatedConnector, 'spec.url')).toBe('https://github.com')
    expect(get(updatedConnector, 'spec.validationRepo')).toBe('test-repo')

    // repo url without namespace and no repo name
    updatedConnector = updateUrlAndRepoInGitConnector(
      {
        name: 'Github',
        identifier: 'Github',
        type: 'Github',
        spec: {
          url: 'https://github.com',
          authentication: {
            type: 'Http',
            spec: {
              type: 'UsernameToken',
              spec: {
                username: 'test-user',
                tokenRef: 'account.pat'
              }
            }
          },
          apiAccess: {
            type: 'Token',
            spec: {
              tokenRef: 'account.pat'
            }
          },
          executeOnDelegate: false,
          type: 'Account'
        }
      },
      { namespace: 'test-namespace', name: 'test-repo' }
    )
    expect(get(updatedConnector, 'spec.url')).toBe('https://github.com/test-namespace')
    expect(get(updatedConnector, 'spec.validationRepo')).toBe('test-repo')
  })

  test('Test getOsArchFromDelegateTags method', () => {
    const delegateDetailsMac = {
      groupCustomSelectors: ['docker-delegate', 'macos-arm64']
    }
    const delegateDetailsWindows = {
      groupCustomSelectors: ['docker-delegate', 'windows-arm64']
    }
    const delegateDetailsLinux = {
      groupCustomSelectors: ['docker-delegate', 'linux-amd64']
    }
    const delegateDetailsEmpty = {
      groupCustomSelectors: ['docker-delegate']
    }

    let LocalRunnerOsArch = getOsArchFromDelegateTags(delegateDetailsMac)
    expect(LocalRunnerOsArch).toBeDefined()
    expect(LocalRunnerOsArch).toStrictEqual({ osType: 'MacOS', archType: 'Arm64' })
    LocalRunnerOsArch = getOsArchFromDelegateTags(delegateDetailsWindows)
    expect(LocalRunnerOsArch).toBeDefined()
    expect(LocalRunnerOsArch).toStrictEqual({ osType: 'Windows', archType: 'Arm64' })
    LocalRunnerOsArch = getOsArchFromDelegateTags(delegateDetailsLinux)
    expect(LocalRunnerOsArch).toBeDefined()
    expect(LocalRunnerOsArch).toStrictEqual({ osType: 'Linux', archType: 'Amd64' })
    LocalRunnerOsArch = getOsArchFromDelegateTags(delegateDetailsEmpty)
    expect(LocalRunnerOsArch.osType).toBeUndefined()
    expect(LocalRunnerOsArch.archType).toBeUndefined()
  })
})
