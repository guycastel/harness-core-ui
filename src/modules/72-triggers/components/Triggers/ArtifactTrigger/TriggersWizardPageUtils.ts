/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { isNull, isUndefined, omitBy, isEmpty, get, set, cloneDeep, omit } from 'lodash-es'
import { string, array, object, ObjectSchema } from 'yup'
import { getMultiTypeFromValue, MultiTypeInputType } from '@harness/uicore'
import type { ConnectorResponse } from 'services/cd-ng'
import { Scope } from '@common/interfaces/SecretsInterface'
import { yamlStringify } from '@common/utils/YamlHelperMethods'
import type {
  NGTriggerSourceV2,
  NGVariable,
  NGTriggerConfigV2,
  AcrSpec,
  AmazonS3RegistrySpec,
  NexusRegistrySpec,
  DockerRegistrySpec,
  ArtifactoryRegistrySpec,
  EcrSpec,
  GcrSpec,
  CustomArtifactSpec,
  GithubPackagesSpec,
  GarSpec,
  AzureArtifactsRegistrySpec,
  AMIRegistrySpec,
  GoolgeCloudStorageRegistrySpec,
  BambooRegistrySpec,
  Nexus2RegistrySpec
} from 'services/pipeline-ng'
import type { PanelInterface } from '@common/components/Wizard/Wizard'
import { illegalIdentifiers, regexIdentifier } from '@common/utils/StringUtils'
import type { StringKeys, UseStringsReturn } from 'framework/strings'
import { RepositoryFormatTypes } from '@pipeline/utils/stageHelpers'
import type {
  TriggerConfigDTO,
  FlatOnEditValuesInterface
} from '@triggers/pages/triggers/interface/TriggersWizardInterface'
import type { AddConditionInterface } from '@triggers/pages/triggers/views/AddConditionsSection'
import {
  ArtifactTriggerSpec,
  ArtifactTriggerSpecWrapper,
  ArtifactType,
  JenkinsArtifactTriggerSpec,
  RepositoryPortOrServer
} from '@triggers/components/steps/ArtifactTriggerConfigPanel/ArtifactsSelection/ArtifactInterface'
import type { InputSetValue } from '@pipeline/components/InputSetSelector/utils'
import { NameIdentifierSchema } from '@common/utils/Validation'

export const TriggerTypes = {
  WEBHOOK: 'Webhook',
  NEW_ARTIFACT: 'NewArtifact',
  SCHEDULE: 'Scheduled',
  MANIFEST: 'Manifest',
  ARTIFACT: 'Artifact',
  MULTIREGIONARTIFACT: 'MultiRegionArtifact'
}

export const EventConditionTypes = {
  VERSION: 'version',
  BUILD: 'build'
}

export const ResponseStatus = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  ERROR: 'ERROR'
}

const getArtifactTriggerTitle = ({
  triggerName,
  getString
}: {
  triggerName?: string
  getString: UseStringsReturn['getString']
}): string => {
  if (triggerName) {
    return `Trigger: ${triggerName}`
  }

  return getString('triggers.onNewArtifactTitle', {
    artifact: getString('pipeline.artifactTriggerConfigPanel.artifact')
  })
}

export const clearNullUndefined = /* istanbul ignore next */ (data: TriggerConfigDTO): TriggerConfigDTO =>
  omitBy(omitBy(data, isUndefined), isNull)

const isUndefinedOrEmptyString = (str: string | undefined): boolean => isUndefined(str) || str?.trim() === ''

const isRowUnfilled = (payloadCondition: AddConditionInterface): boolean => {
  const truthyValuesLength = Object.values(payloadCondition).filter(val =>
    isUndefinedOrEmptyString(val?.trim?.())
  )?.length
  return truthyValuesLength > 0 && truthyValuesLength < 3
}

const isRowFilled = (payloadCondition: AddConditionInterface): boolean => {
  const truthyValuesLength = Object.values(payloadCondition).filter(val => val?.trim?.())?.length
  return truthyValuesLength === 3
}

const isIdentifierIllegal = (identifier: string): boolean =>
  regexIdentifier.test(identifier) && illegalIdentifiers.includes(identifier)

const checkValidPipelineInput = ({ formikErrors }: { formikErrors: { [key: string]: any } }): boolean => {
  if (!isEmpty(formikErrors?.pipeline) || !isEmpty(formikErrors?.stages)) {
    return false
  }
  return true
}

const checkValidEventConditionsForNewArtifact = ({
  formikValues
}: {
  formikValues: { [key: string]: any }
}): boolean => {
  const eventConditions = formikValues['eventConditions']
  if (
    (formikValues['versionOperator'] && !formikValues['versionValue']) ||
    (!formikValues['versionOperator'] && formikValues['versionValue']?.trim()) ||
    (formikValues['buildOperator'] && !formikValues['buildValue']) ||
    (!formikValues['buildOperator'] && formikValues['buildValue']?.trim()) ||
    (eventConditions?.length &&
      eventConditions.some((eventCondition: AddConditionInterface) => isRowUnfilled(eventCondition)))
  ) {
    return false
  }
  return true
}

const checkValidArtifactTriggerConfig = ({ formikValues }: { formikValues: { [key: string]: any } }): boolean => {
  const { sources: artifactSourceSpecSources = [], type } = formikValues?.source?.spec ?? {}
  const filteredArtifactSourceSpecSources = artifactSourceSpecSources.filter(
    (artifactSourceSpecSource: ArtifactTriggerSpecWrapper) => isArtifactAdded(type, artifactSourceSpecSource.spec)
  )

  return isIdentifierIllegal(formikValues?.identifier) ? false : filteredArtifactSourceSpecSources.length !== 0
}

const getArtifactTriggersPanels = ({
  getString
}: {
  getString: UseStringsReturn['getString']
}): PanelInterface[] | [] => {
  return [
    {
      id: 'Trigger Configuration',
      tabTitle: getString('configuration'),
      checkValidPanel: checkValidArtifactTriggerConfig,
      requiredFields: ['name', 'identifier'] // conditional required validations checkValidTriggerConfiguration
    },
    {
      id: 'Conditions',
      tabTitle: getString('conditions'),
      checkValidPanel: checkValidEventConditionsForNewArtifact
    },
    {
      id: 'Pipeline Input',
      tabTitle: getString('triggers.pipelineInputLabel'),
      checkValidPanel: checkValidPipelineInput
    }
  ]
}

export const getArtifactWizardMap = ({
  getString,
  triggerName
}: {
  triggerName?: string
  getString: UseStringsReturn['getString']
}): { wizardLabel: string; panels: PanelInterface[] } => ({
  wizardLabel: getArtifactTriggerTitle({
    getString,
    triggerName
  }),
  panels: getArtifactTriggersPanels({ getString })
})

export const getValidationSchema = (
  getString: (key: StringKeys, params?: any) => string
): ObjectSchema<Record<string, any> | undefined> => {
  return NameIdentifierSchema(getString, {
    nameRequiredErrorMsg: getString('triggers.validation.triggerName')
  }).shape({
    versionOperator: string().test(
      getString('triggers.validation.operator'),
      getString('triggers.validation.operator'),
      function (operator) {
        return (
          (operator && !this.parent.versionValue) ||
          (operator && this.parent.versionValue) ||
          (!this.parent.versionValue?.trim() && !operator)
        )
      }
    ),
    versionValue: string().test(
      getString('triggers.validation.matchesValue'),
      getString('triggers.validation.matchesValue'),
      function (matchesValue) {
        return (
          (matchesValue && !this.parent.versionOperator) ||
          (matchesValue && this.parent.versionOperator) ||
          (!matchesValue?.trim() && !this.parent.versionOperator)
        )
      }
    ),
    buildOperator: string().test(
      getString('triggers.validation.operator'),
      getString('triggers.validation.operator'),
      function (operator) {
        return (
          (operator && !this.parent.buildValue) ||
          (operator && this.parent.buildValue) ||
          (!this.parent.buildValue?.trim() && !operator)
        )
      }
    ),
    buildValue: string().test(
      getString('triggers.validation.matchesValue'),
      getString('triggers.validation.matchesValue'),
      function (matchesValue) {
        return (
          (matchesValue && !this.parent.buildOperator) ||
          (matchesValue && this.parent.buildOperator) ||
          (!matchesValue?.trim() && !this.parent.buildOperator)
        )
      }
    ),
    eventConditions: array().test(
      getString('triggers.validation.eventConditions'),
      getString('triggers.validation.eventConditions'),
      function (eventConditions = []) {
        if (eventConditions.some((eventCondition: AddConditionInterface) => isRowUnfilled(eventCondition))) {
          return false
        }
        return true
      }
    ),
    metaDataConditions: array().test(
      getString('triggers.validation.eventConditions'),
      getString('triggers.validation.eventConditions'),
      function (metaDataConditions = []) {
        if (metaDataConditions.some((metaDataCondition: AddConditionInterface) => isRowUnfilled(metaDataCondition))) {
          return false
        }
        return true
      }
    )
  })
}

const ciCodebaseBuild = {
  type: 'branch',
  spec: {
    branch: '<+trigger.branch>'
  }
}

export const getConnectorName = (connector?: ConnectorResponse): string => {
  let connectorName = ''

  if (connector?.connector?.orgIdentifier && connector?.connector?.projectIdentifier) {
    connectorName = `${connector?.connector?.type}: ${connector?.connector?.name}`
  } else if (connector?.connector?.orgIdentifier) {
    connectorName = `${connector?.connector?.type}[Org]: ${connector?.connector?.name}`
  } else {
    connectorName = `${connector?.connector?.type}[Account]: ${connector?.connector?.name}`
  }

  return connectorName
}

export const getConnectorValue = (connector?: ConnectorResponse): string => {
  let connectorValue = ''

  if (connector?.connector?.orgIdentifier && connector?.connector?.projectIdentifier) {
    connectorValue = connector?.connector?.identifier
  } else if (connector?.connector?.orgIdentifier) {
    connectorValue = `${Scope.ORG}.${connector?.connector?.identifier}`
  } else {
    connectorValue = `${Scope.ACCOUNT}.${connector?.connector?.identifier}`
  }

  return connectorValue
}

const TriggerDefaultFieldList = {
  chartVersion: '<+trigger.manifest.version>',
  build: '<+trigger.artifact.build>'
}

const replaceTriggerDefaultBuild = ({
  build,
  chartVersion,
  artifactPath
}: {
  build?: string
  chartVersion?: string
  artifactPath?: string
}): string => {
  if (chartVersion === '<+input>') {
    return TriggerDefaultFieldList.chartVersion
  } else if (build === '<+input>' || artifactPath === '<+input>') {
    return TriggerDefaultFieldList.build
  }
  return build || chartVersion || artifactPath || ''
}

const getPipelineIntegrityMessage = (errorObject: { [key: string]: string }): string =>
  `${errorObject.fieldName}: ${errorObject.message}`

export const displayPipelineIntegrityResponse = (errors: {
  [key: string]: { [key: string]: string }
}): { [key: string]: string } => {
  // display backend error for validating pipeline with current pipeline
  const errs = {}
  const errorsEntries = Object.entries(errors)
  errorsEntries.forEach(entry => set(errs, entry[0], getPipelineIntegrityMessage(entry[1])))
  return errs
}

export const getOrderedPipelineVariableValues = ({
  originalPipelineVariables,
  currentPipelineVariables
}: {
  originalPipelineVariables?: NGVariable[]
  currentPipelineVariables: NGVariable[]
}): NGVariable[] => {
  const runtimeVariables = originalPipelineVariables?.filter(
    pipelineVariable => getMultiTypeFromValue(get(pipelineVariable, 'value')) === MultiTypeInputType.RUNTIME
  )

  if (
    runtimeVariables &&
    currentPipelineVariables.some(
      (variable: NGVariable, index: number) => variable.name !== runtimeVariables[index]?.name
    )
  ) {
    return runtimeVariables.map(
      variable =>
        currentPipelineVariables.find(currentVariable => currentVariable.name === variable.name) ||
        Object.assign(variable, { value: '' })
    )
  }
  return currentPipelineVariables
}

const clearUndefinedArtifactId = (newPipelineObj = {}): any => {
  // temporary fix, undefined artifact id gets injected somewhere and needs to be removed for submission
  const clearedNewPipeline: any = cloneDeep(newPipelineObj)
  const clearedNewPipelineObj = clearedNewPipeline.template
    ? clearedNewPipeline.template.templateInputs
    : clearedNewPipeline

  clearedNewPipelineObj?.stages?.forEach((stage: any) => {
    const isParallel = !!stage.parallel
    if (isParallel) {
      stage.parallel.forEach((parallelStage: any) => {
        const finalStage = parallelStage?.stage?.template
          ? parallelStage?.stage?.template?.templateInputs
          : parallelStage?.stage
        const parallelStageArtifacts = finalStage?.spec?.serviceConfig?.serviceDefinition?.spec?.artifacts
        const [artifactKey, artifactValues] =
          (parallelStageArtifacts && Object.entries(parallelStageArtifacts)?.[0]) || []

        if (artifactValues && Object.keys(artifactValues)?.includes('identifier') && !artifactValues.identifier) {
          // remove undefined or null identifier
          delete parallelStageArtifacts[artifactKey].identifier
        }
      })
    } else {
      const finalStage = stage?.stage?.template ? stage?.stage?.template?.templateInputs : stage?.stage
      const stageArtifacts = finalStage?.spec?.serviceConfig?.serviceDefinition?.spec?.artifacts
      const [artifactKey, artifactValues] = (stageArtifacts && Object.entries(stageArtifacts)?.[0]) || []

      if (artifactValues && Object.keys(artifactValues)?.includes('identifier') && !artifactValues.identifier) {
        // remove undefined or null identifier
        delete stageArtifacts[artifactKey].identifier
      }
    }
  })

  return clearedNewPipeline
}

export const getModifiedTemplateValues = (
  initialValuesForEdit: FlatOnEditValuesInterface
): FlatOnEditValuesInterface => {
  const returnInitialValuesForEdit = { ...initialValuesForEdit }
  if (
    returnInitialValuesForEdit?.pipeline?.template?.templateInputs?.properties?.ci?.codebase?.repoName === '' &&
    !!returnInitialValuesForEdit.pipeline.template.templateInputs.properties.ci.codebase.connectorRef
  ) {
    // for CI Codebase, remove repoName: "" onEdit since connector is repo url type
    delete returnInitialValuesForEdit.pipeline.template.templateInputs.properties.ci.codebase.repoName
  }
  return returnInitialValuesForEdit
}

export const getErrorMessage = (error: any): string =>
  get(error, 'data.error', get(error, 'data.message', error?.message))

enum TriggerGitEvent {
  PULL_REQUEST = 'PullRequest',
  ISSUE_COMMENT = 'IssueComment',
  PUSH = 'Push',
  MR_COMMENT = 'MRComment',
  PR_COMMENT = 'PRComment'
}

export const isHarnessExpression = (str = ''): boolean => str.startsWith('<+') && str.endsWith('>')

const replaceRunTimeVariables = ({
  manifestType,
  artifactType,
  selectedArtifact
}: {
  artifactType: string
  selectedArtifact: any
  manifestType?: string
}) => {
  if (manifestType) {
    if (selectedArtifact?.spec?.chartVersion) {
      // hardcode manifest chart version to default
      selectedArtifact.spec.chartVersion = replaceTriggerDefaultBuild({
        chartVersion: selectedArtifact?.spec?.chartVersion
      })
    } else if (!isEmpty(selectedArtifact) && selectedArtifact?.spec?.chartVersion === '') {
      selectedArtifact.spec.chartVersion = TriggerDefaultFieldList.chartVersion
    }
  } else if (artifactType && selectedArtifact?.spec?.tag) {
    selectedArtifact.spec.tag = TriggerDefaultFieldList.build
  }
}

const replaceEventConditions = ({
  values,
  persistIncomplete,
  triggerYaml,
  isMultiArtifact
}: {
  values: any
  persistIncomplete: boolean
  triggerYaml: any
  isMultiArtifact: boolean
}) => {
  const { versionOperator, versionValue, buildOperator, buildValue, eventConditions = [] } = values
  if (
    ((versionOperator && versionValue?.trim()) || (persistIncomplete && (versionOperator || versionValue?.trim()))) &&
    !eventConditions.some((eventCondition: AddConditionInterface) => eventCondition.key === EventConditionTypes.VERSION)
  ) {
    eventConditions.unshift({
      key: EventConditionTypes.VERSION,
      operator: versionOperator || '',
      value: versionValue || ''
    })
  } else if (
    ((buildOperator && buildValue?.trim()) || (persistIncomplete && (buildOperator || buildValue?.trim()))) &&
    !eventConditions.some((eventCondition: AddConditionInterface) => eventCondition.key === EventConditionTypes.BUILD)
  ) {
    eventConditions.unshift({
      key: EventConditionTypes.BUILD,
      operator: buildOperator || '',
      value: buildValue || ''
    })
  }

  if (triggerYaml.source?.spec) {
    const sourceSpecSpec = isMultiArtifact ? { ...triggerYaml.source?.spec } : { ...triggerYaml.source?.spec.spec }
    sourceSpecSpec.eventConditions = persistIncomplete
      ? eventConditions
      : eventConditions.filter((eventCondition: AddConditionInterface) => isRowFilled(eventCondition))

    if (isMultiArtifact) {
      triggerYaml.source.spec = sourceSpecSpec
    } else {
      triggerYaml.source.spec.spec = sourceSpecSpec
    }
  }
}

// @see https://github.com/lodash/lodash/issues/2240#issuecomment-995160298
export const flattenKeys = (obj: any = {}, initialPathPrefix = 'pipeline'): Record<string, any> => {
  if (!obj || typeof obj !== 'object') {
    return [{ [initialPathPrefix]: obj }]
  }

  const prefix = initialPathPrefix ? (Array.isArray(object) ? initialPathPrefix : `${initialPathPrefix}.`) : ''

  return Object.keys(obj)
    .flatMap(key => flattenKeys(obj[key], Array.isArray(obj) ? `${prefix}[${key}]` : `${prefix}${key}`))
    .reduce((acc, path) => ({ ...acc, ...path }), {})
}

export const getDefaultPipelineReferenceBranch = (triggerType = '', event = ''): string => {
  if (triggerType === TriggerTypes.WEBHOOK) {
    switch (event) {
      case TriggerGitEvent.ISSUE_COMMENT:
      case TriggerGitEvent.PULL_REQUEST:
      default:
        return ciCodebaseBuild.spec.branch
    }
  }

  return ''
}

export const getArtifactManifestTriggerYaml = ({
  values: val,
  manifestType,
  orgIdentifier,
  enabledStatus,
  projectIdentifier,
  pipelineIdentifier,
  persistIncomplete = false,
  gitAwareForTriggerEnabled: _gitAwareForTriggerEnabled,
  isAnyPipelineRuntimeInput
}: {
  values: any
  orgIdentifier: string
  enabledStatus: boolean
  projectIdentifier: string
  pipelineIdentifier: string
  manifestType?: string
  persistIncomplete?: boolean
  gitAwareForTriggerEnabled: boolean | undefined
  isAnyPipelineRuntimeInput: boolean
}): TriggerConfigDTO => {
  const {
    name,
    identifier,
    description,
    tags,
    pipeline: pipelineRuntimeInput,
    pipelineOverride,
    triggerType: formikValueTriggerType,
    event,
    selectedArtifact,
    pipelineBranchName = getDefaultPipelineReferenceBranch(formikValueTriggerType, event),
    source,
    stagesToExecute,
    metaDataConditions,
    jexlCondition
  } = val

  const inputSetRefs = get(
    val,
    'inputSetRefs',
    get(val, 'inputSetSelected', []).map((_inputSet: InputSetValue) => _inputSet.value)
  )

  const { spec: triggerSpec } = source ?? {}
  const { type: artifactType, sources: artifactSpecSources = [] } = triggerSpec ?? {}

  replaceRunTimeVariables({ manifestType, artifactType, selectedArtifact })
  let newPipeline = cloneDeep(pipelineRuntimeInput)

  newPipeline = clearUndefinedArtifactId(newPipeline)
  const stringifyPipelineRuntimeInput = yamlStringify({
    pipeline: clearNullUndefined(newPipeline)
  })

  const filteredMetaDataConditions = metaDataConditions?.filter(isRowFilled)

  const isMultiRegionArtifact = artifactSpecSources?.length > 1
  const triggerSource = {
    type: isMultiRegionArtifact ? 'MultiRegionArtifact' : 'Artifact',
    spec: {
      type: artifactType,
      ...(isMultiRegionArtifact
        ? {
            sources: artifactSpecSources?.map((artifactSpecSource: ArtifactTriggerSpecWrapper) => ({
              spec: getArtifactTriggerSpecSource(artifactType, artifactSpecSource.spec)
            })),
            metaDataConditions: filteredMetaDataConditions,
            jexlCondition
          }
        : {
            spec: {
              ...omit(artifactSpecSources[0]?.spec ?? getArtifactTriggerSpecSource(artifactType), ['type']),
              metaDataConditions: filteredMetaDataConditions,
              jexlCondition
            }
          })
    }
  }

  const execStages = val?.originalPipeline?.allowStageExecutions ? stagesToExecute : []
  const triggerYaml: NGTriggerConfigV2 = {
    name,
    identifier,
    enabled: enabledStatus,
    description,
    tags,
    orgIdentifier,
    projectIdentifier,
    pipelineIdentifier,
    stagesToExecute: execStages,
    source: triggerSource as NGTriggerSourceV2,
    pipelineBranchName: _gitAwareForTriggerEnabled ? pipelineBranchName : null,
    // Pass inputYaml or inputSetRefs if there is any pipeline runtime input
    ...(isAnyPipelineRuntimeInput && {
      // pass pipelineOverride values to inputYaml if user has added inputYaml along with inputSetRefs
      inputYaml: inputSetRefs.length
        ? !isEmpty(pipelineOverride)
          ? yamlStringify({ pipeline: pipelineOverride })
          : undefined
        : stringifyPipelineRuntimeInput,
      inputSetRefs: inputSetRefs.length ? inputSetRefs : undefined
    })
  }

  replaceEventConditions({ values: val, persistIncomplete, triggerYaml, isMultiArtifact: isMultiRegionArtifact })

  return clearNullUndefined(triggerYaml)
}

export const getArtifactTriggerSpecSource = (
  artifactType: ArtifactType,
  spec: ArtifactTriggerSpec = {}
): ArtifactTriggerSpec | undefined => {
  const defaultConnectorRef = ''
  const defaultTag = '<+trigger.artifact.build>'
  const defaultVersion = '<+trigger.artifact.build>'
  const defaultBuild = '<+trigger.artifact.build>'
  const defaultImagePath = ''

  switch (artifactType) {
    case 'Gcr': {
      const {
        imagePath = defaultImagePath,
        registryHostname = '',
        connectorRef = defaultConnectorRef,
        tag = defaultTag
      } = spec as GcrSpec

      return {
        type: artifactType,
        connectorRef,
        imagePath,
        registryHostname,
        tag
      }
    }
    case 'Ecr': {
      const {
        imagePath = defaultImagePath,
        region = '',
        connectorRef = defaultConnectorRef,
        registryId = '',
        tag = defaultTag
      } = spec as EcrSpec

      return {
        type: artifactType,
        connectorRef,
        imagePath,
        registryId,
        region,
        tag
      }
    }
    case 'DockerRegistry': {
      const {
        imagePath = defaultImagePath,
        connectorRef = defaultConnectorRef,
        tag = defaultTag
      } = spec as DockerRegistrySpec

      return {
        type: artifactType,
        connectorRef,
        imagePath,
        tag
      }
    }
    // TODO: Update these values once we add support for Nexus2Registry Artifact Trigger
    case 'Nexus2Registry': {
      const {
        artifactId = '',
        classifier = '',
        connectorRef = defaultConnectorRef,
        extension = '',
        groupId = '',
        packageName = '',
        repositoryFormat = '',
        repositoryName = '',
        repositoryUrl = ''
      } = spec as Nexus2RegistrySpec

      return {
        type: artifactType,
        connectorRef,
        artifactId,
        classifier,
        extension,
        groupId,
        packageName,
        repositoryFormat,
        repositoryName,
        repositoryUrl
      }
    }
    case 'Nexus3Registry': {
      const {
        artifactId = '',
        classifier = '',
        connectorRef = defaultConnectorRef,
        extension = '',
        group = '',
        groupId = '',
        artifactPath = '',
        packageName = '',
        repository = '',
        repositoryFormat = RepositoryFormatTypes.Docker,
        repositoryUrl = '',
        repositoryPort = '',
        tag = defaultTag
      } = spec as NexusRegistrySpec

      const repositoryPortorRepositoryURL = repositoryPort
        ? RepositoryPortOrServer.RepositoryPort
        : RepositoryPortOrServer.RepositoryUrl

      if (repositoryFormat === RepositoryFormatTypes.Maven) {
        return {
          type: artifactType,
          connectorRef,
          repositoryFormat,
          repository,
          groupId,
          artifactId,
          extension,
          classifier,
          tag
        }
      }

      if (repositoryFormat === RepositoryFormatTypes.NPM || repositoryFormat === RepositoryFormatTypes.NuGet) {
        return {
          type: artifactType,
          connectorRef,
          repositoryFormat,
          repository,
          packageName,
          tag
        }
      }

      if (repositoryFormat === RepositoryFormatTypes.Raw) {
        return {
          type: artifactType,
          connectorRef,
          repositoryFormat,
          repository,
          group,
          tag
        }
      }

      // By default repositoryFormat === docker
      return {
        type: artifactType,
        connectorRef,
        repositoryFormat,
        repository,
        artifactPath,
        repositoryPortorRepositoryURL,
        ...(repositoryPortorRepositoryURL === RepositoryPortOrServer.RepositoryUrl
          ? { repositoryUrl }
          : { repositoryPort }),
        tag
      }
    }
    case 'ArtifactoryRegistry': {
      const {
        artifactDirectory = '',
        artifactFilter = '',
        artifactPath = '',
        connectorRef = defaultConnectorRef,
        repository = '',
        repositoryFormat = '',
        repositoryUrl = ''
      } = spec as ArtifactoryRegistrySpec

      if (repositoryFormat === RepositoryFormatTypes.Generic) {
        return {
          type: artifactType,
          connectorRef,
          repositoryFormat,
          repository,
          artifactDirectory,
          artifactFilter
        }
      }

      if (repositoryFormat === RepositoryFormatTypes.Docker) {
        return {
          type: artifactType,
          connectorRef,
          repositoryFormat,
          repository,
          artifactPath,
          repositoryUrl
        }
      }

      return {
        type: artifactType,
        connectorRef,
        repositoryFormat,
        repository
      }
    }
    case 'Acr': {
      const {
        connectorRef = defaultConnectorRef,
        registry = '',
        repository = '',
        subscriptionId = '',
        tag = defaultTag
      } = spec as AcrSpec

      return {
        type: artifactType,
        connectorRef,
        registry,
        repository,
        subscriptionId,
        tag
      }
    }
    case 'AmazonS3': {
      const {
        bucketName = '',
        connectorRef = defaultConnectorRef,
        filePathRegex = '',
        region = ''
      } = spec as AmazonS3RegistrySpec

      return {
        type: artifactType,
        connectorRef,
        bucketName,
        filePathRegex,
        region
      }
    }
    case 'Jenkins': {
      const {
        artifactPath = '',
        connectorRef = defaultConnectorRef,
        jobName = '',
        build = defaultBuild
      } = spec as JenkinsArtifactTriggerSpec

      return {
        type: artifactType,
        connectorRef,
        artifactPath,
        build,
        jobName
      }
    }
    case 'CustomArtifact': {
      const {
        artifactsArrayPath = '',
        inputs = [],
        script = '',
        version = defaultVersion,
        versionPath = ''
      } = spec as CustomArtifactSpec

      return {
        type: artifactType,
        artifactsArrayPath,
        inputs,
        script,
        version,
        versionPath
      }
    }
    case 'GoogleArtifactRegistry': {
      const {
        connectorRef = defaultConnectorRef,
        project = '',
        region = '',
        repositoryName = '',
        version = defaultVersion
      } = spec as GarSpec

      return {
        type: artifactType,
        connectorRef,
        // Adding package in this was as 'package' is a reserved word in strict mode. Modules are automatically in strict mode.
        package: spec.package ?? '',
        project,
        region,
        repositoryName,
        version
      }
    }
    case 'GithubPackageRegistry': {
      const {
        packageName = '',
        connectorRef = defaultConnectorRef,
        packageType = 'container',
        org = '',
        version = defaultVersion
      } = spec as GithubPackagesSpec

      return {
        type: artifactType,
        connectorRef,
        org,
        packageName,
        packageType,
        version
      }
    }
    case 'AzureArtifacts': {
      const {
        connectorRef = defaultConnectorRef,
        packageType = 'maven',
        scope = 'project',
        project = '',
        feed = '',
        version = defaultVersion
      } = spec as AzureArtifactsRegistrySpec

      return {
        type: artifactType,
        connectorRef,
        feed,
        // Adding package in this was as 'package' is a reserved word in strict mode. Modules are automatically in strict mode.
        package: spec.package ?? '',
        packageType,
        scope,
        project,
        version
      }
    }
    case 'AmazonMachineImage': {
      const {
        connectorRef = defaultConnectorRef,
        filters = [],
        tags = [],
        region = '',
        version = defaultVersion
      } = spec as AMIRegistrySpec

      return {
        type: artifactType,
        connectorRef,
        filters,
        region,
        tags,
        version
      }
    }
    case 'GoogleCloudStorage': {
      const {
        connectorRef = defaultConnectorRef,
        project = '',
        bucket = '',
        artifactPath = '<+trigger.artifact.build>'
      } = spec as GoolgeCloudStorageRegistrySpec

      return {
        type: artifactType,
        connectorRef,
        artifactPath,
        bucket,
        project
      }
    }
    case 'Bamboo': {
      const { connectorRef = defaultConnectorRef, artifactPaths = [], planKey = '' } = spec as BambooRegistrySpec

      return {
        type: artifactType,
        connectorRef,
        artifactPaths,
        planKey
      }
    }
  }
}

const getArtifactTriggerSourceSpec = (artifactType: ArtifactType, spec?: ArtifactTriggerSpec) => {
  const { eventConditions = [], metaDataConditions = [] } = spec ?? {}

  return {
    type: artifactType,
    eventConditions,
    metaDataConditions,
    sources: [{ spec: getArtifactTriggerSpecSource(artifactType, spec) }]
  }
}

export const getTriggerArtifactInitialSource = (artifactType: ArtifactType): NGTriggerSourceV2 => {
  return {
    // When creating new Artifact trigger, consider that as Artifact Type
    // We will convert the type to MultiRegionArtifact once more than one artifact added
    type: 'Artifact',
    spec: getArtifactTriggerSourceSpec(artifactType)
  }
}

/**
 * We consider all the artifact trigger as MultiRegionArtifact in UI and process the data while doing API communication.
 * This will reduced the changes in the UI.
 *
 * @param artifactType - Type of the Artifact Trigger
 * @param spec - spec of the Artifact Trigger
 *
 * @returns Artifact trigger source for the Artifact type in the formate of MultiRegionArtifact
 */
export const transformArtifactTriggerSourceSpecToMultiRegionArtifactTriggerSourceSpec = (
  artifactType: ArtifactType,
  spec: ArtifactTriggerSpec
) => getArtifactTriggerSourceSpec(artifactType, spec)

export const isArtifactAdded = (artifactType: ArtifactType, spec?: ArtifactTriggerSpec): boolean =>
  !isEmpty(artifactType === 'CustomArtifact' ? spec?.script : spec?.connectorRef)
