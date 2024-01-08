/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { isNull, isUndefined, omitBy, isEmpty, get, set, cloneDeep } from 'lodash-es'
import { string, array, object, ObjectSchema } from 'yup'
import { getMultiTypeFromValue, MultiTypeInputType } from '@harness/uicore'
import type { ConnectorResponse } from 'services/cd-ng'
import { Scope } from '@common/interfaces/SecretsInterface'
import { yamlStringify } from '@common/utils/YamlHelperMethods'
import type {
  PipelineInfoConfig,
  NGVariable,
  NGTriggerConfigV2,
  HelmManifestSpec,
  TriggerEventDataCondition,
  BuildStore
} from 'services/pipeline-ng'
import type { PanelInterface } from '@common/components/Wizard/Wizard'
import { illegalIdentifiers, regexIdentifier } from '@common/utils/StringUtils'
import type { StringKeys, UseStringsReturn } from 'framework/strings'
import type { AddConditionInterface } from '@triggers/pages/triggers/views/AddConditionsSection'
import type { TriggerConfigDTO } from '@triggers/pages/triggers/interface/TriggersWizardInterface'
import type {
  ManifestBuildStoreType,
  ManifestTriggerFormikValues,
  ManifestTriggerSource
} from '@triggers/components/steps/ManifestTriggerConfigPanel/ManifestSelection/ManifestInterface'
import type { InputSetValue } from '@pipeline/components/InputSetSelector/utils'
import { NameIdentifierSchema } from '@common/utils/Validation'

export const eventTypes = {
  PUSH: 'Push',
  BRANCH: 'Branch',
  TAG: 'Tag',
  PULL_REQUEST: 'PullRequest',
  MERGE_REQUEST: 'MergeRequest',
  ISSUE_COMMENT: 'IssueComment',
  PR_COMMENT: 'PRComment',
  MR_COMMENT: 'MRComment'
}

export const TriggerTypes = {
  WEBHOOK: 'Webhook',
  NEW_ARTIFACT: 'NewArtifact',
  SCHEDULE: 'Scheduled',
  MANIFEST: 'Manifest',
  ARTIFACT: 'Artifact'
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

const getTriggerTitle = ({
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
    artifact: getString('manifestsText')
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

const checkValidManifest = ({ formikValues }: { formikValues: { [key: string]: any } }): boolean => {
  return !isEmpty(formikValues.source?.spec?.spec?.store?.spec?.connectorRef)
}

const checkValidManifestTrigger = ({ formikValues }: { formikValues: { [key: string]: any } }): boolean => {
  return isIdentifierIllegal(formikValues?.identifier) ? false : checkValidManifest({ formikValues })
}

const getPanels = ({ getString }: { getString: (key: StringKeys) => string }): PanelInterface[] | [] => {
  return [
    {
      id: 'Trigger Configuration',
      tabTitle: getString('configuration'),
      checkValidPanel: checkValidManifestTrigger,
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

export const getWizardMap = ({
  getString,
  triggerName
}: {
  triggerName?: string
  getString: UseStringsReturn['getString']
}): { wizardLabel: string; panels: PanelInterface[] } => ({
  wizardLabel: getTriggerTitle({
    getString,
    triggerName
  }),
  panels: getPanels({ getString })
})

// requiredFields and checkValidPanel in getPanels() above to render warning icons related to this schema
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
    )
  })
}

export const ciCodebaseBuild = {
  type: 'branch',
  spec: {
    branch: '<+trigger.branch>'
  }
}

export const ciCodebaseBuildPullRequest = {
  type: 'PR',
  spec: {
    number: '<+trigger.prNumber>'
  }
}

export const ciCodebaseBuildIssueComment = {
  type: 'tag',
  spec: {
    tag: '<+trigger.tag>'
  }
}

export const getConnectorName = (connector?: ConnectorResponse): string =>
  `${
    connector?.connector?.orgIdentifier && connector?.connector?.projectIdentifier
      ? `${connector?.connector?.type}: ${connector?.connector?.name}`
      : connector?.connector?.orgIdentifier
      ? `${connector?.connector?.type}[Org]: ${connector?.connector?.name}`
      : `${connector?.connector?.type}[Account]: ${connector?.connector?.name}`
  }` || ''

export const getConnectorValue = (connector?: ConnectorResponse): string =>
  `${
    connector?.connector?.orgIdentifier && connector?.connector?.projectIdentifier
      ? connector?.connector?.identifier
      : connector?.connector?.orgIdentifier
      ? `${Scope.ORG}.${connector?.connector?.identifier}`
      : `${Scope.ACCOUNT}.${connector?.connector?.identifier}`
  }` || ''

export const getFilteredStage = (pipelineObj: any, stageId: string): any => {
  for (const item of pipelineObj) {
    if (Array.isArray(item.parallel)) {
      return getFilteredStage(item.parallel, stageId)
    } else if (item.stage.identifier === stageId) {
      return item
    }
  }
}

// This is to filter the manifestIndex
// with the selectedArtifact's index
export const filterArtifactIndex = ({
  runtimeData,
  stageId,
  artifactId,
  isManifest
}: {
  runtimeData: any
  stageId: any
  artifactId: any
  isManifest: boolean
}): number => {
  const filteredStage = getFilteredStage(runtimeData, stageId)
  if (isManifest) {
    return filteredStage?.stage?.spec?.serviceConfig?.serviceDefinition?.spec?.manifests.findIndex(
      (manifestObj: any) => manifestObj?.manifest?.identifier === artifactId
    )
  } else {
    return (
      filteredStage?.stage?.spec?.serviceConfig?.serviceDefinition?.spec?.artifacts.sidecars?.findIndex(
        (artifactObj: any) => artifactObj?.sidecar?.identifier === artifactId
      ) ||
      filteredStage?.stage?.spec?.serviceConfig?.stageOverrides?.artifacts?.sidecars?.findIndex(
        (artifactObj: any) => artifactObj?.sidecar?.identifier === artifactId
      ) ||
      -1
    )
  }
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
  initialValuesForEdit: ManifestTriggerFormikValues
): ManifestTriggerFormikValues => {
  const returnInitialValuesForEdit = { ...initialValuesForEdit }
  const pipeline = returnInitialValuesForEdit?.pipeline as PipelineInfoConfig
  if (
    pipeline?.template?.templateInputs?.properties?.ci?.codebase?.repoName === '' &&
    !!pipeline.template.templateInputs.properties.ci.codebase.connectorRef
  ) {
    // for CI Codebase, remove repoName: "" onEdit since connector is repo url type
    delete pipeline.template.templateInputs.properties.ci.codebase.repoName
  }
  return returnInitialValuesForEdit
}

const DEFAULT_TRIGGER_BRANCH = '<+trigger.branch>'

/**
 * Get proper branch to fetch Trigger InputSets
 * If gitAwareForTriggerEnabled is true, pipelineBranchName is used only if it's not DEFAULT_TRIGGER_BRANCH
 * Otherwise, return branch which is the active pipeline branch
 */
export function getTriggerInputSetsBranchQueryParameter({
  gitAwareForTriggerEnabled,
  pipelineBranchName = DEFAULT_TRIGGER_BRANCH,
  branch = ''
}: {
  gitAwareForTriggerEnabled?: boolean
  pipelineBranchName?: string
  branch?: string
}): string {
  if (gitAwareForTriggerEnabled) {
    if (
      [
        ciCodebaseBuildIssueComment.spec.tag,
        ciCodebaseBuildPullRequest.spec.number,
        ciCodebaseBuild.spec.branch
      ].includes(pipelineBranchName)
    ) {
      return branch
    } else {
      return pipelineBranchName
    }
  }

  return branch
}

export const getErrorMessage = (error: any): string =>
  get(error, 'data.error', get(error, 'data.message', error?.message))

export enum TriggerGitEvent {
  PULL_REQUEST = 'PullRequest',
  ISSUE_COMMENT = 'IssueComment',
  PUSH = 'Push',
  MR_COMMENT = 'MRComment',
  PR_COMMENT = 'PRComment'
}

export const TriggerGitEventTypes: Readonly<string[]> = [
  TriggerGitEvent.PULL_REQUEST,
  TriggerGitEvent.ISSUE_COMMENT,
  TriggerGitEvent.PUSH,
  TriggerGitEvent.MR_COMMENT,
  TriggerGitEvent.PR_COMMENT
]

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

const replaceStageManifests = ({ filteredStage, selectedArtifact }: { filteredStage: any; selectedArtifact: any }) => {
  const stageArtifacts = filteredStage?.stage?.template
    ? filteredStage?.stage?.template?.templateInputs?.spec?.serviceConfig?.serviceDefinition?.spec?.manifests
    : filteredStage?.stage?.spec?.serviceConfig?.serviceDefinition?.spec?.manifests
  const stageArtifactIdx = stageArtifacts?.findIndex(
    (item: any) => item.manifest?.identifier === selectedArtifact?.identifier
  )

  if (stageArtifactIdx >= 0) {
    stageArtifacts[stageArtifactIdx].manifest = selectedArtifact
  }
}

const replaceStageArtifacts = ({ filteredStage, selectedArtifact }: { filteredStage: any; selectedArtifact: any }) => {
  const stageArtifacts = filteredStage?.stage?.spec?.serviceConfig?.serviceDefinition?.spec?.artifacts
  const stageArtifactIdx =
    filteredStage?.stage?.spec?.serviceConfig?.serviceDefinition?.spec?.artifacts?.sidecars?.findIndex(
      (item: any) => item.sidecar?.identifier === selectedArtifact?.identifier
    )

  if (stageArtifactIdx >= 0) {
    stageArtifacts['sidecars'][stageArtifactIdx].sidecar = selectedArtifact
  }
}

const replaceEventConditions = ({
  values,
  persistIncomplete,
  triggerYaml
}: {
  values: any
  persistIncomplete: boolean
  triggerYaml: any
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
    const sourceSpecSpec = { ...triggerYaml.source?.spec.spec }
    sourceSpecSpec.eventConditions = persistIncomplete
      ? eventConditions
      : eventConditions.filter((eventCondition: AddConditionInterface) => isRowFilled(eventCondition))
    triggerYaml.source.spec.spec = sourceSpecSpec
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
    stagesToExecute,
    tags,
    pipeline: pipelineRuntimeInput,
    pipelineOverride,
    triggerType: formikValueTriggerType,
    event,
    selectedArtifact,
    stageId,
    // manifestType: onEditManifestType,
    artifactType,
    pipelineBranchName = getDefaultPipelineReferenceBranch(formikValueTriggerType, event),
    source
  } = val

  const inputSetRefs = get(
    val,
    'inputSetRefs',
    get(val, 'inputSetSelected', []).map((_inputSet: InputSetValue) => _inputSet.value)
  )

  replaceRunTimeVariables({ manifestType, artifactType, selectedArtifact })
  let newPipeline = cloneDeep(pipelineRuntimeInput)
  const newPipelineObj = newPipeline?.template ? newPipeline?.template?.templateInputs : newPipeline
  const filteredStage = newPipelineObj?.stages?.find((item: any) => item?.stage?.identifier === stageId)
  if (manifestType) {
    replaceStageManifests({ filteredStage, selectedArtifact })
  } else if (artifactType) {
    replaceStageArtifacts({ filteredStage, selectedArtifact })
  }

  // Manually clear null or undefined artifact identifier
  newPipeline = clearUndefinedArtifactId(newPipeline)

  // actions will be required thru validation
  const stringifyPipelineRuntimeInput = yamlStringify({
    pipeline: clearNullUndefined(newPipeline)
  })

  const triggerYaml: NGTriggerConfigV2 = {
    name,
    identifier,
    stagesToExecute,
    enabled: enabledStatus,
    description,
    tags,
    orgIdentifier,
    projectIdentifier,
    pipelineIdentifier,
    source,
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

  replaceEventConditions({ values: val, persistIncomplete, triggerYaml })

  return clearNullUndefined(triggerYaml)
}

const getHelmManifestSpecStoreSpec = (): ManifestBuildStoreType => {
  return {
    connectorRef: ''
  }
}

const getHelmManifestSpecStore = (): BuildStore => {
  return {
    spec: getHelmManifestSpecStoreSpec()
  }
}

export const getHelmManifestSpec = (): HelmManifestSpec => {
  const eventConditions: TriggerEventDataCondition[] = []

  return {
    eventConditions,
    helmVersion: 'V3',
    store: getHelmManifestSpecStore(),
    chartVersion: TriggerDefaultFieldList.chartVersion
  }
}

export const getManifestTriggerInitialSource = (): ManifestTriggerSource => ({
  type: 'Manifest',
  spec: {
    type: 'HelmChart',
    spec: getHelmManifestSpec()
  }
})
