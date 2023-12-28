/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { get, isEmpty, isNull, isUndefined, omitBy } from 'lodash-es'
import {
  Container,
  Button,
  ButtonVariation,
  Layout,
  MultiStepProgressIndicator,
  PageSpinner,
  useToaster
} from '@harness/uicore'
import { useStrings } from 'framework/strings'
import { useSideNavContext } from 'framework/SideNavStore/SideNavContext'
import routes from '@common/RouteDefinitions'
import {
  ConnectorInfoDTO,
  generateYamlPromise,
  ResponseMessage,
  ResponseString,
  UserRepoResponse
} from 'services/cd-ng'
import {
  createPipelineV2Promise,
  NGTriggerConfigV2,
  ResponseNGTriggerResponse,
  ResponsePipelineSaveResponse,
  createTriggerPromise,
  CreatePipelineV2QueryParams,
  PipelineConfig,
  createInputSetForPipelinePromise,
  ResponseInputSetResponse
} from 'services/pipeline-ng'
import type { Module } from 'framework/types/ModuleName'
import type { GitQueryParams, ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { parse, yamlStringify } from '@common/utils/YamlHelperMethods'
import { Status } from '@common/utils/Constants'
import { Connectors } from '@platform/connectors/constants'
import { Scope } from '@common/interfaces/SecretsInterface'
import {
  eventTypes,
  clearNullUndefined,
  ciCodebaseBuild,
  ciCodebaseBuildPullRequest
} from '@triggers/pages/triggers/utils/TriggersWizardPageUtils'
import type { TriggerConfigDTO } from '@triggers/pages/triggers/interface/TriggersWizardInterface'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { CIOnboardingActions } from '@common/constants/TrackingConstants'
import { StoreType } from '@common/constants/GitSyncTypes'
import {
  getScopedValueFromDTO,
  getScopeFromDTO,
  ScopedValueObjectDTO
} from '@common/components/EntityReference/EntityReference.types'
import { getIdentifierFromName } from '@common/utils/StringUtils'
import {
  BuildCodebaseType,
  DefaultBuildValues as CodebaseDefaultValues
} from '@pipeline/components/PipelineInputSetForm/CICodebaseInputSetForm'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import { ExistingProvide } from '@modules/70-pipeline/components/RunPipelineModal/type'
import { isSimplifiedYAMLEnabledForCI, YAMLVersion } from '@pipeline/utils/CIUtils'
import { BuildTabs } from '@ci/components/PipelineStudio/CIPipelineStagesUtils'
import { isHarnessCodeRepoEntity } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect.utils'
import {
  InfraProvisioningWizardProps,
  WizardStep,
  InfraProvisiongWizardStepId,
  StepStatus,
  Hosting,
  GitAuthenticationMethod,
  NonGitOption
} from './Constants'
import { SelectGitProvider, SelectGitProviderRef, SupportedGitProvidersForCIOnboarding } from './SelectGitProvider'
import { SelectRepository, SelectRepositoryRef } from './SelectRepository'
import {
  ConfigurePipeline,
  ConfigurePipelineRef,
  ImportPipelineYAMLInterface,
  PipelineConfigurationOption,
  SavePipelineToRemoteInterface,
  StarterConfigIdToOptionMap
} from './ConfigurePipeline'
import {
  getPRTriggerActions,
  getFullRepoName,
  getPayloadForPipelineCreation,
  addDetailsToPipeline,
  DefaultCIPipelineName,
  getCloudPipelinePayloadWithoutCodebase,
  getCIStarterPipelineV1,
  addRepositoryInfoToPipeline,
  getGitConnectorRepoBasedOnRepoUrl,
  getCIStarterPipeline,
  getRemoteInputSetPayload,
  getCloudPipelinePayloadWithCodebase,
  updateRuntimeTypeToDocker
} from '../../../utils/HostedBuildsUtils'
import css from './InfraProvisioningWizard.module.scss'

export const checkRepoNameInConnectorSpec = (connector: ConnectorInfoDTO | undefined, repoName: string): string => {
  const connectorUrl = connector?.spec?.url
  const repoNameSplitBySlash = repoName.split('/')

  const filteredRepoName = repoNameSplitBySlash.filter((component: string) => {
    return !connectorUrl?.includes(component)
  })

  return filteredRepoName.join('/')
}

export const InfraProvisioningWizard: React.FC<InfraProvisioningWizardProps> = props => {
  const {
    lastConfiguredWizardStepId = InfraProvisiongWizardStepId.SelectGitProvider,
    precursorData,
    enableImportYAMLOption,
    dummyGitnessHarnessConnector,
    useLocalRunnerInfra
  } = props
  const { preSelectedGitConnector, connectorsEligibleForPreSelection } = precursorData || {}
  const { getString } = useStrings()
  const [disableBtn, setDisableBtn] = useState<boolean>(false)
  const [currentWizardStepId, setCurrentWizardStepId] =
    useState<InfraProvisiongWizardStepId>(lastConfiguredWizardStepId)
  const [showError, setShowError] = useState<boolean>(false)
  const { accountId, projectIdentifier, orgIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()
  const history = useHistory()
  const [pageLoader, setPageLoader] = useState<{ show: boolean; message?: string }>({ show: false })
  const [configuredGitConnector, setConfiguredGitConnector] = useState<ConnectorInfoDTO>()
  const selectGitProviderRef = React.useRef<SelectGitProviderRef | null>(null)
  const selectRepositoryRef = React.useRef<SelectRepositoryRef | null>(null)
  const configurePipelineRef = React.useRef<ConfigurePipelineRef | null>(null)
  const { setShowGetStartedTabInMainMenu } = useSideNavContext()
  const { showError: showErrorToaster } = useToaster()
  const [buttonLabel, setButtonLabel] = useState<string>('')
  const { trackEvent } = useTelemetry()
  const [generatedYAMLAsJSON, setGeneratedYAMLAsJSON] = useState<PipelineConfig>({})
  const { CI_YAML_VERSIONING, CODE_ENABLED } = useFeatureFlags()
  const enableSavePipelinetoRemoteOption =
    configuredGitConnector && SupportedGitProvidersForCIOnboarding.includes(configuredGitConnector.type)
  const yamlVersion = useMemo(
    () => (isSimplifiedYAMLEnabledForCI(module, CI_YAML_VERSIONING) ? YAMLVersion.V1 : YAMLVersion.V0),
    [module, CI_YAML_VERSIONING]
  )

  const setCIGetStartedVisible = (shouldShow: boolean): void => setShowGetStartedTabInMainMenu('ci', shouldShow)
  const { setPreference: setUseInputSetsSelected } = usePreferenceStore<ExistingProvide>(
    PreferenceScope.USER,
    'useInputSetsSelected'
  )

  useEffect(() => {
    setCurrentWizardStepId(lastConfiguredWizardStepId)
  }, [lastConfiguredWizardStepId])

  useEffect(() => {
    setConfiguredGitConnector(selectGitProviderRef.current?.validatedConnector)
  }, [selectGitProviderRef.current?.validatedConnector])

  useEffect(() => {
    setConfiguredGitConnector(preSelectedGitConnector)
    if (preSelectedGitConnector) {
      updateStepStatus([InfraProvisiongWizardStepId.SelectGitProvider], StepStatus.Success)
    }
  }, [preSelectedGitConnector])

  useEffect(() => {
    if (
      configuredGitConnector &&
      configurePipelineRef.current?.configuredOption &&
      (selectRepositoryRef.current?.repository || selectRepositoryRef.current?.gitnessRepository?.uid) &&
      StarterConfigIdToOptionMap[configurePipelineRef.current?.configuredOption.id] ===
        PipelineConfigurationOption.GenerateYAML
    ) {
      setDisableBtn(true)
      setPageLoader({ show: true, message: getString('ci.getStartedWithCI.generatingYAMLFromRepo') })
      try {
        const isGitnessConnectorConfigured =
          configuredGitConnector?.identifier === dummyGitnessHarnessConnector?.identifier
        const connectorRef = isGitnessConnectorConfigured ? '' : getScopedValueFromDTO(configuredGitConnector)
        const connectorScope = isGitnessConnectorConfigured ? Scope.PROJECT : getScopeFromDTO(configuredGitConnector)
        const repoNameWithNamespace = selectRepositoryRef.current?.repository
          ? getFullRepoName(selectRepositoryRef.current.repository)
          : selectRepositoryRef.current?.gitnessRepository?.uid || ''
        generateYamlPromise({
          queryParams: {
            accountIdentifier: accountId,
            connectorIdentifier: isGitnessConnectorConfigured ? '' : configuredGitConnector?.identifier,
            repo: repoNameWithNamespace,
            yamlVersion,
            ...(connectorScope === Scope.ORG
              ? {
                  orgIdentifier
                }
              : connectorScope === Scope.PROJECT
              ? { projectIdentifier, orgIdentifier }
              : {})
          }
        }).then((response: ResponseString) => {
          const { status, data: generatedPipelineYAML } = response || {}
          const newPipelineName = `${DefaultCIPipelineName}_${new Date().getTime().toString()}`
          const commonArgs = {
            name: newPipelineName,
            identifier: getIdentifierFromName(newPipelineName),
            projectIdentifier,
            orgIdentifier,
            connectorRef,
            repoName: checkRepoNameInConnectorSpec(configuredGitConnector, repoNameWithNamespace),
            yamlVersion
          }
          if (status === Status.SUCCESS && generatedPipelineYAML) {
            const generatedParsedYaml = parse<PipelineConfig>(generatedPipelineYAML)
            const originalPipeline = useLocalRunnerInfra
              ? updateRuntimeTypeToDocker(generatedParsedYaml)
              : generatedParsedYaml
            setGeneratedYAMLAsJSON(
              addDetailsToPipeline({
                originalPipeline: originalPipeline,
                ...commonArgs
              })
            )
          } else {
            setGeneratedYAMLAsJSON(
              addDetailsToPipeline({
                originalPipeline: getCIStarterPipeline(yamlVersion, useLocalRunnerInfra ? 'Docker' : undefined),
                ...commonArgs
              })
            )
          }
          setDisableBtn(false)
          setPageLoader({ show: false })
        })
      } catch (e) {
        setDisableBtn(false)
        setPageLoader({ show: false })
      }
    }
  }, [
    configuredGitConnector,
    accountId,
    projectIdentifier,
    orgIdentifier,
    configurePipelineRef.current?.configuredOption,
    selectRepositoryRef.current?.repository,
    selectRepositoryRef.current?.gitnessRepository,
    yamlVersion
  ])

  const constructV0PipelinePayloadWithCodebase = React.useCallback(
    (repository?: UserRepoResponse, gitnessRepoName?: string, pipelineName?: string): string => {
      const repositoryName = repository
        ? checkRepoNameInConnectorSpec(configuredGitConnector, getFullRepoName(repository))
        : gitnessRepoName || ''
      if (((!repository?.name || !repository?.namespace) && !gitnessRepoName) || !configuredGitConnector?.identifier) {
        return ''
      }
      try {
        const { id } = configurePipelineRef.current?.configuredOption || {}
        return yamlStringify(
          getPayloadForPipelineCreation({
            pipelineYaml: yamlStringify(
              id && StarterConfigIdToOptionMap[id] === PipelineConfigurationOption.GenerateYAML
                ? generatedYAMLAsJSON
                : getCloudPipelinePayloadWithCodebase(useLocalRunnerInfra ? 'Docker' : undefined)
            ),
            configuredGitConnector,
            orgIdentifier,
            projectIdentifier,
            repositoryName,
            getString,
            shouldAddBuildRuntimeInput: !!(CODE_ENABLED && gitnessRepoName),
            dummyGitnessHarnessConnector,
            pipelineName: pipelineName?.length ? pipelineName : `${getString('buildText')} ${repositoryName}`
          })
        )
      } catch (e) {
        // Ignore error
      }
      return ''
    },
    [projectIdentifier, orgIdentifier, configuredGitConnector?.identifier, configurePipelineRef, generatedYAMLAsJSON]
  )

  const constructPipelinePayloadWithoutCodebase = React.useCallback((): string => {
    const UNIQUE_PIPELINE_ID = new Date().getTime().toString()
    const payload = addDetailsToPipeline({
      originalPipeline: getCloudPipelinePayloadWithoutCodebase(useLocalRunnerInfra ? 'Docker' : undefined),
      name: `${getString('buildText')} ${getString('common.pipeline').toLowerCase()}`,
      identifier: `${getString('buildText')}_${getString('common.pipeline').toLowerCase()}_${UNIQUE_PIPELINE_ID}`,
      projectIdentifier,
      orgIdentifier
    })
    try {
      return yamlStringify(payload)
    } catch (e) {
      // Ignore error
    }
    return ''
  }, [getString, projectIdentifier, orgIdentifier])

  const constructTriggerPayload = React.useCallback(
    ({
      pipelineId,
      eventType,
      shouldSavePipelineToGit,
      remoteInputSetIdentifier
    }: {
      pipelineId: string
      eventType: string
      shouldSavePipelineToGit: boolean
      remoteInputSetIdentifier: string
    }): NGTriggerConfigV2 | TriggerConfigDTO | undefined => {
      const connectorType: ConnectorInfoDTO['type'] | undefined = configuredGitConnector?.type
      if (!connectorType) {
        return
      }
      if (!pipelineId) {
        return
      }

      const pipelineInput = {
        pipeline: {
          identifier: pipelineId,
          properties: {
            ci: {
              codebase: {
                build: [eventTypes.PULL_REQUEST, eventTypes.MERGE_REQUEST].includes(eventType)
                  ? ciCodebaseBuildPullRequest
                  : ciCodebaseBuild
              }
            }
          }
        }
      }

      return {
        name: `${eventType} ${getString('common.triggerLabel')}`,
        identifier: `${eventType}_${getString('common.triggerLabel')}`,
        enabled: true,
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier: pipelineId,
        source: {
          type: 'Webhook',
          spec: {
            type: connectorType,
            spec: {
              type: eventType,
              spec: {
                connectorRef:
                  configuredGitConnector &&
                  configuredGitConnector?.identifier !== dummyGitnessHarnessConnector?.identifier
                    ? getScopedValueFromDTO(configuredGitConnector)
                    : '',
                repoName: selectRepositoryRef.current?.repository
                  ? checkRepoNameInConnectorSpec(
                      configuredGitConnector,
                      getFullRepoName(selectRepositoryRef.current?.repository)
                    )
                  : selectRepositoryRef.current?.gitnessRepository?.uid || '',
                autoAbortPreviousExecutions: false,
                actions: [eventTypes.PULL_REQUEST, eventTypes.MERGE_REQUEST].includes(eventType)
                  ? getPRTriggerActions(connectorType)
                  : []
              }
            }
          }
        },
        ...(shouldSavePipelineToGit
          ? {
              pipelineBranchName: CodebaseDefaultValues.branch,
              ...(yamlVersion === YAMLVersion.V0 && remoteInputSetIdentifier
                ? { inputSetRefs: [remoteInputSetIdentifier] }
                : {})
            }
          : { inputYaml: yamlStringify(omitBy(omitBy(pipelineInput, isUndefined), isNull)) })
      }
    },
    [
      configuredGitConnector,
      selectGitProviderRef?.current?.values?.gitProvider,
      selectRepositoryRef.current?.repository,
      selectRepositoryRef.current?.gitnessRepository,
      yamlVersion
    ]
  )

  const [wizardStepStatus, setWizardStepStatus] = useState<Map<InfraProvisiongWizardStepId, StepStatus>>(
    new Map<InfraProvisiongWizardStepId, StepStatus>([
      [InfraProvisiongWizardStepId.SelectGitProvider, StepStatus.InProgress],
      [InfraProvisiongWizardStepId.SelectRepository, StepStatus.ToDo]
    ])
  )

  const updateStepStatus = React.useCallback((stepIds: InfraProvisiongWizardStepId[], status: StepStatus) => {
    if (Array.isArray(stepIds)) {
      setWizardStepStatus((prevState: Map<InfraProvisiongWizardStepId, StepStatus>) => {
        const clonedState = new Map(prevState)
        stepIds.forEach((item: InfraProvisiongWizardStepId) => clonedState.set(item, status))
        return clonedState
      })
    }
  }, [])

  const getCreatePipelineQueryParams = useCallback(
    ({
      shouldSavePipelineToGit,
      gitParams,
      yamlPath,
      isGitSaveRetry,
      defaultBranch
    }: {
      shouldSavePipelineToGit: boolean
      gitParams: GitQueryParams & { isHarnessCodeRepo?: boolean }
      yamlPath: string
      isGitSaveRetry?: boolean
      defaultBranch: string
    }): CreatePipelineV2QueryParams => {
      // E.g. Added pipeline <yaml-path>
      const commitMsg = `${getString('common.addedEntityLabel', {
        entity: getString('common.pipeline').toLowerCase()
      })} ${yamlPath}`
      return {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        ...(shouldSavePipelineToGit && {
          ...gitParams,
          filePath: yamlPath,
          commitMsg,
          ...(isGitSaveRetry && { isNewBranch: isGitSaveRetry, baseBranch: defaultBranch })
        })
      }
    },
    []
  )

  const createInputSetForRemotePipelinePromise = useCallback(
    ({
      pipelineIdentifier,
      branch,
      repo,
      connectorRef,
      isHarnessCodeRepo,
      triggerType
    }: {
      pipelineIdentifier: string
      branch: string
      repo: string
      connectorRef?: string
      isHarnessCodeRepo?: boolean
      triggerType: BuildCodebaseType
    }): Promise<ResponseInputSetResponse> => {
      const inputSetName =
        triggerType === BuildCodebaseType.PR
          ? `${pipelineIdentifier}-pr-trigger-input-set`
          : `${pipelineIdentifier}-push-trigger-input-set`
      const yamlPath = `.harness/${inputSetName}-${new Date().getTime()}.yaml`
      const commitMsg = `${getString('common.addedEntityLabel', {
        entity: getString('inputSets.inputSetLabel').toLowerCase()
      })} ${yamlPath}`
      return createInputSetForPipelinePromise({
        queryParams: {
          accountIdentifier: accountId,
          orgIdentifier,
          pipelineIdentifier,
          projectIdentifier,
          pipelineBranch: branch,
          connectorRef,
          isHarnessCodeRepo,
          repoName: repo,
          branch,
          filePath: yamlPath,
          storeType: StoreType.REMOTE,
          commitMsg
        },
        body: yamlStringify(
          getRemoteInputSetPayload({
            name: inputSetName,
            identifier: getIdentifierFromName(inputSetName),
            pipelineIdentifier,
            orgIdentifier,
            projectIdentifier,
            triggerType
          })
        ),
        requestOptions: { headers: { 'content-type': 'application/yaml' } }
      })
    },
    [accountId, orgIdentifier, projectIdentifier]
  )

  const getPipelineAndTriggerSetupPromise = useCallback(
    (isGitSaveRetry?: boolean): Promise<void> | undefined => {
      const {
        branch = '',
        storeInGit = false,
        yamlPath = '',
        defaultBranch = '',
        pipelineName = ''
      } = (configurePipelineRef.current?.values as SavePipelineToRemoteInterface) || {}
      const shouldSavePipelineToGit = (enableSavePipelinetoRemoteOption && storeInGit) || false
      const connectorRef =
        configuredGitConnector && !isHarnessCodeRepoEntity(configuredGitConnector.type)
          ? getScopedValueFromDTO(configuredGitConnector as ScopedValueObjectDTO)
          : ''
      const isHarnessCodeRepo = isEmpty(connectorRef)
      if (
        (selectRepositoryRef.current?.repository || (CODE_ENABLED && selectRepositoryRef.current?.gitnessRepository)) &&
        configuredGitConnector
      ) {
        let fullRepoName = ''
        if (selectRepositoryRef?.current?.repository) {
          fullRepoName = getFullRepoName(selectRepositoryRef.current.repository)
        } else if (CODE_ENABLED) {
          fullRepoName = selectRepositoryRef.current?.gitnessRepository?.uid || ''
        }
        fullRepoName = checkRepoNameInConnectorSpec(configuredGitConnector, fullRepoName)
        const commonGitParams: GitQueryParams = {
          storeType: StoreType.REMOTE,
          connectorRef,
          branch,
          repoName: fullRepoName
        }
        const { configuredOption } = configurePipelineRef.current || {}
        const v1YAMLAsJSON: Record<string, any> =
          configuredOption &&
          StarterConfigIdToOptionMap[configuredOption.id] === PipelineConfigurationOption.GenerateYAML
            ? generatedYAMLAsJSON
            : getCIStarterPipelineV1()
        // First create the pipeline for users
        return createPipelineV2Promise({
          body: CI_YAML_VERSIONING
            ? yamlStringify(
                storeInGit
                  ? v1YAMLAsJSON
                  : addRepositoryInfoToPipeline({
                      currentPipeline: v1YAMLAsJSON,
                      connectorRef,
                      repoName: selectRepositoryRef?.current?.repository
                        ? getGitConnectorRepoBasedOnRepoUrl(
                            configuredGitConnector,
                            selectRepositoryRef.current.repository
                          )
                        : selectRepositoryRef.current?.gitnessRepository?.uid || ''
                    })
              )
            : constructV0PipelinePayloadWithCodebase(
                selectRepositoryRef?.current?.repository,
                selectRepositoryRef?.current?.gitnessRepository?.uid,
                pipelineName
              ),
          queryParams: getCreatePipelineQueryParams({
            shouldSavePipelineToGit,
            defaultBranch,
            isGitSaveRetry,
            gitParams: { ...commonGitParams, isHarnessCodeRepo },
            yamlPath
          }),
          requestOptions: { headers: { 'Content-Type': 'application/yaml' } }
        }).then(async (createPipelineResponse: ResponsePipelineSaveResponse) => {
          const { status } = createPipelineResponse
          if (status === Status.SUCCESS && createPipelineResponse?.data?.identifier) {
            const createdPipelineIdentifier = createPipelineResponse?.data?.identifier
            let prTriggerInputSetIdentifier
            const commonQueryParams = {
              accountIdentifier: accountId,
              orgIdentifier,
              projectIdentifier,
              targetIdentifier: createdPipelineIdentifier
            }
            if (shouldSavePipelineToGit && yamlVersion === YAMLVersion.V0 && createdPipelineIdentifier) {
              try {
                const { data: createInputSetResponse, status: createInputSetStatus } =
                  await createInputSetForRemotePipelinePromise({
                    branch,
                    pipelineIdentifier: createdPipelineIdentifier,
                    repo: fullRepoName,
                    connectorRef,
                    isHarnessCodeRepo,
                    triggerType: BuildCodebaseType.PR
                  })
                if (createInputSetStatus === Status.SUCCESS && createInputSetResponse?.identifier) {
                  prTriggerInputSetIdentifier = createInputSetResponse.identifier
                }
              } catch (createPRTriggerInputSetErr) {
                wrapUpAPIOperation(createPRTriggerInputSetErr)
                return
              }
            }
            if (useLocalRunnerInfra) {
              trackEvent(CIOnboardingActions.PipelineCreatedWithLocalRunner, {})
            }
            // For yaml version V0, if pipeline and input set for PR trigger both are created successfully, then create the PR trigger
            // For yaml version V1, if pipeline is created successfully, then create a PR trigger
            createTriggerPromise({
              body: yamlStringify({
                trigger: clearNullUndefined(
                  constructTriggerPayload({
                    pipelineId: createPipelineResponse?.data?.identifier,
                    eventType:
                      configuredGitConnector?.type &&
                      [Connectors.GITHUB, Connectors.BITBUCKET, Connectors.Harness].includes(
                        configuredGitConnector?.type
                      )
                        ? eventTypes.PULL_REQUEST
                        : eventTypes.MERGE_REQUEST,
                    shouldSavePipelineToGit,
                    remoteInputSetIdentifier: prTriggerInputSetIdentifier || ''
                  }) || {}
                )
              }) as any,
              queryParams: commonQueryParams
            })
              .then(async (createPRTriggerResponse: ResponseNGTriggerResponse) => {
                if (createPRTriggerResponse.status === Status.SUCCESS) {
                  let pushTriggerInputSetIdentifier
                  if (shouldSavePipelineToGit && yamlVersion === YAMLVersion.V0 && createdPipelineIdentifier) {
                    try {
                      const { data: _createInputSetResponse, status: _createInputSetStatus } =
                        await createInputSetForRemotePipelinePromise({
                          branch,
                          pipelineIdentifier: createdPipelineIdentifier,
                          repo: fullRepoName,
                          connectorRef,
                          isHarnessCodeRepo,
                          triggerType: BuildCodebaseType.branch
                        })
                      if (_createInputSetStatus === Status.SUCCESS && _createInputSetResponse?.identifier) {
                        pushTriggerInputSetIdentifier = _createInputSetResponse.identifier
                      }
                    } catch (createPushTriggerInputSetErr) {
                      wrapUpAPIOperation(createPushTriggerInputSetErr)
                      return
                    }
                  }
                  // For yaml version V0, if pipeline and input set for Push trigger both are created successfully, then create the Push trigger
                  // For yaml version V1, if pipeline is created successfully, then create a Push trigger
                  const createPushTriggerResponse: ResponseNGTriggerResponse = await createTriggerPromise({
                    body: yamlStringify({
                      trigger: clearNullUndefined(
                        constructTriggerPayload({
                          pipelineId: createPipelineResponse?.data?.identifier || '',
                          eventType: eventTypes.PUSH,
                          shouldSavePipelineToGit,
                          remoteInputSetIdentifier: pushTriggerInputSetIdentifier || ''
                        }) || {}
                      )
                    }) as any,
                    queryParams: commonQueryParams
                  })
                  if (createPushTriggerResponse.status === Status.SUCCESS) {
                    wrapUpAPIOperation()
                    setCIGetStartedVisible(false)
                    if (createPipelineResponse?.data?.identifier) {
                      setUseInputSetsSelected('provide')
                      reRouteToPipelineStudio({
                        pipelineIdentifier: createPipelineResponse.data.identifier,
                        includeGitParams: shouldSavePipelineToGit,
                        gitParams: commonGitParams
                      })
                    }
                  } else {
                    throw createPushTriggerResponse as Error
                  }
                } else {
                  throw createPRTriggerResponse as Error
                }
              })
              .catch(createTriggerErr => {
                wrapUpAPIOperation(createTriggerErr)
              })
          } else {
            throw createPipelineResponse
          }
        })
      }
    },
    [
      selectRepositoryRef.current?.repository,
      selectRepositoryRef.current?.gitnessRepository,
      configuredGitConnector,
      accountId,
      projectIdentifier,
      orgIdentifier,
      generatedYAMLAsJSON,
      configurePipelineRef.current,
      CI_YAML_VERSIONING,
      yamlVersion
    ]
  )

  const initiateAPIOperation = useCallback((loaderMessage: string): void => {
    setDisableBtn(true)
    setPageLoader({ show: true, message: loaderMessage })
  }, [])

  const wrapUpAPIOperation = useCallback((err?: unknown): void => {
    if (err) {
      showErrorToaster((err as Error)?.message)
    }
    setDisableBtn(false)
    setPageLoader({ show: false })
  }, [])

  const setupPipelineWithCodebaseAndTriggers = React.useCallback((): void => {
    if (selectRepositoryRef.current?.repository || selectRepositoryRef.current?.gitnessRepository) {
      try {
        let setupPipelineAndTriggerPromise = getPipelineAndTriggerSetupPromise()
        if (setupPipelineAndTriggerPromise) {
          const { storeInGit, createBranchIfNotExists } =
            (configurePipelineRef.current?.values as SavePipelineToRemoteInterface) || {}
          const shouldSavePipelineToGit = enableSavePipelinetoRemoteOption && storeInGit
          // if pipeline is being saved to Git and create branch if not specified is selected, we will attempt to save pipeline to Git twice
          // Once to directly save pipeline to the specified branch with git param isNewBranch as "false"
          // If above fails, save pipeline to the specified branch with git param isNewBranch as "true" and pass default branch of the repo as base branch
          if (shouldSavePipelineToGit && createBranchIfNotExists) {
            setupPipelineAndTriggerPromise.catch(savePipelineAndTriggerErr => {
              const hasSCMError =
                ((get(savePipelineAndTriggerErr, 'responseMessages') as ResponseMessage[]) || []).filter(
                  (item: ResponseMessage) => item.code === 'SCM_BAD_REQUEST'
                ).length > 0
              if (hasSCMError) {
                // Attempt pipeline save to git to new branch if only specified by user and if the branch specified doesn't exist on Git
                setupPipelineAndTriggerPromise = getPipelineAndTriggerSetupPromise(true)
                if (setupPipelineAndTriggerPromise) {
                  setupPipelineAndTriggerPromise.catch(savePipelineAndTriggerRetryErr => {
                    wrapUpAPIOperation(savePipelineAndTriggerRetryErr)
                  })
                }
              } else {
                wrapUpAPIOperation(savePipelineAndTriggerErr)
              }
            })
          } else {
            setupPipelineAndTriggerPromise.catch(savePipelineInlineErr => {
              wrapUpAPIOperation(savePipelineInlineErr)
            })
          }
        }
      } catch (createPipelineAndTriggerErr) {
        wrapUpAPIOperation(createPipelineAndTriggerErr)
      }
    }
  }, [
    selectRepositoryRef.current?.repository,
    selectRepositoryRef.current?.gitnessRepository,
    configuredGitConnector,
    generatedYAMLAsJSON,
    enableSavePipelinetoRemoteOption
  ])

  const setupPipelineWithoutCodebaseAndTriggers = React.useCallback((): void => {
    try {
      createPipelineV2Promise({
        body:
          yamlVersion === YAMLVersion.V0
            ? constructPipelinePayloadWithoutCodebase()
            : yamlStringify(getCIStarterPipelineV1()),
        queryParams: {
          accountIdentifier: accountId,
          orgIdentifier,
          projectIdentifier
        },
        requestOptions: { headers: { 'Content-Type': 'application/yaml' } }
      }).then((createPipelineResponse: ResponsePipelineSaveResponse) => {
        const { status } = createPipelineResponse
        if (status === Status.SUCCESS && createPipelineResponse?.data?.identifier) {
          wrapUpAPIOperation()
          setCIGetStartedVisible(false)
          if (createPipelineResponse?.data?.identifier) {
            reRouteToPipelineStudio({ pipelineIdentifier: createPipelineResponse.data.identifier })
          }
        }
      })
    } catch (e) {
      wrapUpAPIOperation()
    }
  }, [
    constructPipelinePayloadWithoutCodebase,
    accountId,
    orgIdentifier,
    projectIdentifier,
    setCIGetStartedVisible,
    history,
    getString,
    yamlVersion
  ])

  const reRouteToPipelineStudio = useCallback(
    ({
      pipelineIdentifier,
      includeGitParams,
      gitParams
    }: {
      pipelineIdentifier: string
      includeGitParams?: boolean
      gitParams?: GitQueryParams
    }) => {
      const commonQueryParams = {
        accountId: accountId,
        module: 'ci' as Module,
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier,
        stageId: getString('buildText'),
        sectionId: BuildTabs.EXECUTION,
        ...(includeGitParams && gitParams)
      }

      history.push((CI_YAML_VERSIONING ? routes.toPipelineStudioV1 : routes.toPipelineStudio)({ ...commonQueryParams }))
    },
    [CI_YAML_VERSIONING, accountId, orgIdentifier, projectIdentifier]
  )

  const WizardSteps: Map<InfraProvisiongWizardStepId, WizardStep> = new Map([
    [
      InfraProvisiongWizardStepId.SelectGitProvider,
      {
        stepRender: (
          <SelectGitProvider
            ref={selectGitProviderRef}
            disableNextBtn={() => setDisableBtn(true)}
            enableNextBtn={() => setDisableBtn(false)}
            selectedHosting={Hosting.SaaS}
            updateFooterLabel={setButtonLabel}
            dummyGitnessHarnessConnector={dummyGitnessHarnessConnector}
          />
        ),
        onClickNext: () => {
          const { values, setFieldTouched, validate, validatedConnector } = selectGitProviderRef.current || {}
          const { gitProvider, gitAuthenticationMethod } = values || {}
          if (!gitProvider) {
            setFieldTouched?.('gitProvider', true)
            return
          }
          if (!gitAuthenticationMethod && ![NonGitOption.OTHER, Connectors.Harness].includes(gitProvider?.type)) {
            setFieldTouched?.('gitAuthenticationMethod', true)
            return
          }

          if (CODE_ENABLED && isHarnessCodeRepoEntity(gitProvider?.type)) {
            setCurrentWizardStepId(InfraProvisiongWizardStepId.SelectRepository)
            setShowError(false)
            updateStepStatus([InfraProvisiongWizardStepId.SelectGitProvider], StepStatus.Success)
            updateStepStatus([InfraProvisiongWizardStepId.SelectRepository], StepStatus.InProgress)
          }
          // For non-OAuth auth mechanism, auth fields in the form should validate to proceed here, for OAuth no form validation is needed
          else if ((gitAuthenticationMethod === GitAuthenticationMethod.OAuth && validatedConnector) || validate?.()) {
            setCurrentWizardStepId(InfraProvisiongWizardStepId.SelectRepository)
            setShowError(false)
            updateStepStatus([InfraProvisiongWizardStepId.SelectGitProvider], StepStatus.Success)
            updateStepStatus([InfraProvisiongWizardStepId.SelectRepository], StepStatus.InProgress)
          } else if (gitProvider?.type === NonGitOption.OTHER) {
            setShowError(false)
            initiateAPIOperation(getString('ci.getStartedWithCI.settingUpCIPipeline'))
            setupPipelineWithoutCodebaseAndTriggers()
          }
        },
        stepFooterLabel: `${getString('next')}: ${getString('common.selectRepository')}`
      }
    ],
    [
      InfraProvisiongWizardStepId.SelectRepository,
      {
        stepRender: (
          <SelectRepository
            ref={selectRepositoryRef}
            showError={showError}
            validatedPreSelectedConnector={configuredGitConnector}
            connectorsEligibleForPreSelection={connectorsEligibleForPreSelection}
            onConnectorSelect={(connector: ConnectorInfoDTO) => {
              setConfiguredGitConnector(connector)
              setShowError(false)
            }}
            disableNextBtn={() => setDisableBtn(true)}
            enableNextBtn={() => setDisableBtn(false)}
            updateFooterLabel={setButtonLabel}
            dummyGitnessHarnessConnector={dummyGitnessHarnessConnector}
          />
        ),
        onClickBack: () => {
          setCurrentWizardStepId(InfraProvisiongWizardStepId.SelectGitProvider)
          updateStepStatus([InfraProvisiongWizardStepId.SelectGitProvider], StepStatus.InProgress)
          updateStepStatus([InfraProvisiongWizardStepId.SelectRepository], StepStatus.ToDo)
        },
        onClickNext: () => {
          try {
            trackEvent(CIOnboardingActions.ConfigurePipelineClicked, {})
            const { repository, enableCloneCodebase, gitnessRepository } = selectRepositoryRef.current || {}
            if (enableCloneCodebase && (repository || gitnessRepository) && configuredGitConnector?.spec) {
              updateStepStatus([InfraProvisiongWizardStepId.SelectRepository], StepStatus.Success)
              setCurrentWizardStepId(InfraProvisiongWizardStepId.ConfigurePipeline)
              setShowError(false)
            } else if (!enableCloneCodebase) {
              setShowError(false)
              initiateAPIOperation(getString('ci.getStartedWithCI.settingUpCIPipeline'))
              setupPipelineWithoutCodebaseAndTriggers()
            } else {
              setShowError(true)
            }
          } catch (e) {
            // ignore error
          }
        },
        stepFooterLabel: `${getString('next')}: ${getString('ci.getStartedWithCI.configurePipeline')}`
      }
    ],
    [
      InfraProvisiongWizardStepId.ConfigurePipeline,
      {
        stepRender: (
          <ConfigurePipeline
            ref={configurePipelineRef}
            configuredGitConnector={configuredGitConnector}
            repoName={
              selectRepositoryRef.current?.repository
                ? getFullRepoName(selectRepositoryRef.current.repository)
                : CODE_ENABLED && selectRepositoryRef.current?.gitnessRepository?.uid
                ? selectRepositoryRef.current.gitnessRepository.uid
                : ''
            }
            showError={showError}
            disableNextBtn={() => setDisableBtn(true)}
            enableNextBtn={() => setDisableBtn(false)}
            enableImportYAMLOption={enableImportYAMLOption}
          />
        ),
        onClickBack: () => {
          setCurrentWizardStepId(InfraProvisiongWizardStepId.SelectRepository)
          updateStepStatus([InfraProvisiongWizardStepId.SelectRepository], StepStatus.ToDo)
          updateStepStatus([InfraProvisiongWizardStepId.ConfigurePipeline], StepStatus.ToDo)
        },
        onClickNext: () => {
          const { configuredOption, values, showValidationErrors } = configurePipelineRef.current || {}
          if (configuredOption?.name) {
            try {
              trackEvent(CIOnboardingActions.CreatePipelineClicked, {
                selectedStarterPipeline: StarterConfigIdToOptionMap[configuredOption.id]
              })
            } catch (e) {
              // ignore error
            }
          }

          if (!configuredOption) {
            setShowError(true)
            return
          }

          const selectedConfigOption = StarterConfigIdToOptionMap[configuredOption.id]

          if (
            enableSavePipelinetoRemoteOption &&
            [PipelineConfigurationOption.StarterPipeline, PipelineConfigurationOption.GenerateYAML].includes(
              selectedConfigOption
            )
          ) {
            const saveRemotePipelineFormValues = (values as SavePipelineToRemoteInterface) || {}
            if (
              (saveRemotePipelineFormValues.storeInGit && !saveRemotePipelineFormValues.branch) ||
              !saveRemotePipelineFormValues.yamlPath ||
              !saveRemotePipelineFormValues.pipelineName
            ) {
              showValidationErrors?.()
              return
            }
          } else if (selectedConfigOption === PipelineConfigurationOption.ChooseExistingYAML) {
            const importYAMLFormValues = (values as ImportPipelineYAMLInterface) || {}
            if (!importYAMLFormValues.branch || !importYAMLFormValues.yamlPath) {
              showValidationErrors?.()
              return
            }
          }
          initiateAPIOperation(getString('ci.getStartedWithCI.settingUpCIPipeline'))
          setupPipelineWithCodebaseAndTriggers()
        },
        stepFooterLabel: getString('ci.getStartedWithCI.createPipeline')
      }
    ]
  ])

  const { stepRender, onClickBack, onClickNext, stepFooterLabel } = WizardSteps.get(currentWizardStepId) ?? {}

  useEffect(() => {
    if (stepFooterLabel) {
      setButtonLabel(stepFooterLabel)
    }
  }, [stepFooterLabel])

  const shouldRenderBackButton = useMemo((): boolean => {
    return !(
      (preSelectedGitConnector && currentWizardStepId === InfraProvisiongWizardStepId.SelectRepository) ||
      currentWizardStepId === InfraProvisiongWizardStepId.SelectGitProvider
    )
  }, [currentWizardStepId, preSelectedGitConnector])

  return stepRender ? (
    <>
      <Layout.Vertical
        padding={{ left: 'huge', right: 'huge', top: 'huge', bottom: 'xlarge' }}
        flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
        height="inherit"
        width="100%"
      >
        <Layout.Vertical width="100%">
          <Container padding={{ bottom: 'huge', top: 'large' }}>
            <MultiStepProgressIndicator
              progressMap={
                new Map([
                  [0, { StepStatus: wizardStepStatus.get(InfraProvisiongWizardStepId.SelectGitProvider) || 'TODO' }],
                  [1, { StepStatus: wizardStepStatus.get(InfraProvisiongWizardStepId.SelectRepository) || 'TODO' }],
                  [2, { StepStatus: wizardStepStatus.get(InfraProvisiongWizardStepId.ConfigurePipeline) || 'TODO' }]
                ])
              }
            />
          </Container>
          <Layout.Vertical>{stepRender}</Layout.Vertical>
        </Layout.Vertical>
        <Layout.Horizontal spacing="medium" padding={{ top: 'large' }} className={css.footer} width="100%">
          {shouldRenderBackButton ? (
            <Button
              variation={ButtonVariation.SECONDARY}
              text={getString('back')}
              icon="chevron-left"
              minimal
              onClick={() => onClickBack?.()}
            />
          ) : null}
          <Button
            text={buttonLabel}
            variation={ButtonVariation.PRIMARY}
            rightIcon="chevron-right"
            onClick={() => onClickNext?.()}
            disabled={disableBtn}
          />
        </Layout.Horizontal>
      </Layout.Vertical>
      {pageLoader.show ? <PageSpinner message={pageLoader.message} /> : null}
    </>
  ) : null
}
