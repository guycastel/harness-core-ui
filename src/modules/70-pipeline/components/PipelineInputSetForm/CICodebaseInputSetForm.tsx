/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState, useEffect, useRef, Dispatch, SetStateAction, useMemo, useCallback } from 'react'
import { matchPath, useLocation, useParams } from 'react-router-dom'
import { debounce, get, isEmpty, set, omit } from 'lodash-es'
import produce from 'immer'
import {
  FormInput,
  MultiTypeInputType,
  Container,
  Layout,
  Text,
  Radio,
  Icon,
  TextInput,
  RUNTIME_INPUT_VALUE,
  SelectOption,
  AllowedTypesWithRunTime,
  MultiSelectOption,
  MultiTypeInputValue
} from '@harness/uicore'
import { FontVariation, Color } from '@harness/design-system'
import { connect } from 'formik'
import { StringKeys, useStrings, UseStringsReturn } from 'framework/strings'
import routesV1 from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { accountPathProps, executionPathProps, pipelineModuleParams } from '@common/utils/routeUtils'
import {
  getIdentifierFromValue,
  getScopeFromDTO,
  getScopeFromValue
} from '@common/components/EntityReference/EntityReference'
import { Scope } from '@common/interfaces/SecretsInterface'
import { getReference, isMultiTypeRuntime } from '@common/utils/utils'
import { Connectors } from '@platform/connectors/constants'
import {
  getCompleteConnectorUrl,
  GitAuthenticationProtocol
} from '@platform/connectors/pages/connectors/utils/ConnectorUtils'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import {
  ConnectorInfoDTO,
  getListOfBranchesByRefConnectorV2Promise,
  ResponseGitBranchesResponseDTO,
  useGetConnector
} from 'services/cd-ng'
import type { PipelineInfoConfig, StageElementWrapperConfig } from 'services/pipeline-ng'
import { ConnectorRefWidthKeys, getPrCloneStrategyOptions, sslVerifyOptions } from '@pipeline/utils/constants'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { MultiTypeTextField } from '@common/components/MultiTypeText/MultiTypeText'
import { MultiTypeSelectField } from '@common/components/MultiTypeSelect/MultiTypeSelect'
import type { GitQueryParams, PipelinePathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { useQueryParams } from '@common/hooks'
import {
  CodebaseTypes,
  getCodebaseRepoNameFromConnector,
  getConnectorRefWidth,
  GIT_EXTENSION,
  isCodebaseFieldsRuntimeInputs,
  isRuntimeInput
} from '@pipeline/utils/CIUtils'
import type { StageSelectionData } from '@pipeline/utils/runPipelineUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { StageType } from '@pipeline/utils/stageHelpers'
import { getSelectedStagesFromPipeline } from '../PipelineStudio/CommonUtils/CommonUtils'
import { StepViewType } from '../AbstractSteps/Step'
import css from './CICodebaseInputSetForm.module.scss'
import pipelineInputSetCss from './PipelineInputSetForm.module.scss'

export interface CICodebaseInputSetFormProps {
  path: string
  readonly?: boolean
  formik?: any
  template?: PipelineInfoConfig
  originalPipeline: PipelineInfoConfig
  viewType: StepViewType
  viewTypeMetadata?: Record<string, boolean>
  selectedStageData?: StageSelectionData | undefined
  chainedPipelineStagePath?: string
}

export type AcceptableValue = boolean | string | number | SelectOption | string[] | MultiSelectOption[]

const TriggerTypes = {
  SCHEDULED: 'Scheduled'
}

export enum ConnectionType {
  Repo = 'Repo',
  Account = 'Account',
  Region = 'Region', // Used for AWS CodeCommit
  Project = 'Project' // Project level Azure Repo connector is the same as an Account level GitHub/GitLab connector
}

export enum BuildType {
  branch = 'branch',
  tag = 'tag',
  PR = 'PR'
}

export enum BuildCodebaseType {
  branch = 'branch',
  tag = 'tag',
  PR = 'number',
  commitSha = 'commitSha'
}

export const DefaultBuildValues = {
  branch: '<+trigger.branch>',
  tag: '<+trigger.tag>',
  PR: '<+trigger.prNumber>',
  commitSha: '<+trigger.commitSha>'
}

const placeholderValues = {
  branch: DefaultBuildValues['branch'],
  tag: DefaultBuildValues['tag'],
  PR: DefaultBuildValues['PR'],
  commitSha: DefaultBuildValues['commitSha']
}

export interface ConnectorRefInterface {
  record?: ConnectorInfoDTO
}

const renderLabel = ({
  getString,
  tooltip,
  keyString
}: {
  getString: UseStringsReturn['getString']
  tooltip?: string
  keyString: StringKeys
}): JSX.Element => (
  <Layout.Horizontal className={css.inpLabel} style={{ display: 'flex', alignItems: 'baseline' }}>
    <Text
      color={Color.GREY_600}
      font={{ size: 'small', weight: 'semi-bold' }}
      tooltipProps={{ dataTooltipId: tooltip }}
    >
      {getString(keyString)}
    </Text>
    &nbsp;
  </Layout.Horizontal>
)

export const handleCIConnectorRefOnChange = ({
  value,
  connectorRefType,
  setConnectionType,
  setConnectorUrl,
  setConnectorType,
  setFieldValue,
  setIsConnectorExpression,
  setGitAuthProtocol,
  codeBaseInputFieldFormName,
  viewType,
  onConnectorChange
}: {
  value: ConnectorRefInterface | undefined
  connectorRefType: MultiTypeInputType
  setConnectionType: Dispatch<SetStateAction<string>>
  setConnectorUrl: Dispatch<SetStateAction<string>>
  setConnectorType?: Dispatch<SetStateAction<string>> // only used for Add CI Stage to render getCompleteConnectorUrl
  setFieldValue: (field: string, value: unknown) => void
  setGitAuthProtocol?: React.Dispatch<React.SetStateAction<GitAuthenticationProtocol>>
  setIsConnectorExpression?: Dispatch<SetStateAction<boolean>> // used in inputset form
  codeBaseInputFieldFormName?: { [key: string]: string } // only used when setting nested values in input set
  viewType?: StepViewType
  onConnectorChange?: (value?: ConnectorInfoDTO) => void
}): void => {
  const newConnectorRef = value as ConnectorRefInterface
  onConnectorChange?.(value?.record)
  setGitAuthProtocol?.(get(value, 'record.spec.authentication.type'))
  if (viewType === StepViewType.DeploymentForm) {
    setFieldValue(codeBaseInputFieldFormName?.branch || 'branch', '')
  }
  if (connectorRefType === MultiTypeInputType.FIXED) {
    const connectorType = newConnectorRef?.record?.type
    // spec.connectionType property is used in old custom git connectors instead of spec.type
    const connectionType =
      connectorType === 'Git' ? newConnectorRef?.record?.spec?.connectionType : newConnectorRef?.record?.spec?.type
    if (connectionType === ConnectionType.Account) {
      setConnectionType(ConnectionType.Account)
      setConnectorUrl(newConnectorRef.record?.spec?.url || '')
      setFieldValue(codeBaseInputFieldFormName?.repoName || 'repoName', '')
      setConnectorType?.(newConnectorRef.record?.spec?.type || '')
    } else if (
      connectionType &&
      [ConnectionType.Repo, ConnectionType.Region, ConnectionType.Project].includes(connectionType as ConnectionType)
    ) {
      setConnectionType(connectionType)
      setConnectorUrl(newConnectorRef.record?.spec?.url || '')
      //  clear repoName from yaml so it is not required
      setFieldValue(codeBaseInputFieldFormName?.repoName || 'repoName', undefined)
    } else {
      setConnectionType('')
      setConnectorUrl('')
      setFieldValue(codeBaseInputFieldFormName?.repoName || 'repoName', '')
    }
    setIsConnectorExpression?.(false)
  } else if (connectorRefType === MultiTypeInputType.EXPRESSION) {
    setConnectionType('')
    setConnectorUrl('')
    setIsConnectorExpression?.(true)
  } else {
    setConnectionType('')
    setConnectorUrl('')
    setIsConnectorExpression?.(false)

    setFieldValue(
      codeBaseInputFieldFormName?.repoName || 'repoName',
      isMultiTypeRuntime(connectorRefType) ? RUNTIME_INPUT_VALUE : ''
    )
  }
}
export const getBuildTypeLabels = (getString: UseStringsReturn['getString']) => ({
  branch: getString('gitBranch'),
  tag: getString('gitTag'),
  PR: getString('pipeline.gitPullRequest'),
  commitSha: getString('common.git.gitSHACommit')
})

export const getBuildTypeInputLabels = (getString: UseStringsReturn['getString']) => ({
  branch: getString('common.branchName'),
  tag: getString('common.tagName'),
  PR: getString('pipeline.ciCodebase.pullRequestNumber'),
  commitSha: getString('common.commitSHA')
})

export const getCodebaseInputFieldName = (formattedPath: string) => ({
  branch: `${formattedPath}properties.ci.codebase.build.spec.branch`,
  commitSha: `${formattedPath}properties.ci.codebase.build.spec.commitSha`,
  tag: `${formattedPath}properties.ci.codebase.build.spec.tag`,
  PR: `${formattedPath}properties.ci.codebase.build.spec.number`,
  connectorRef: `${formattedPath}properties.ci.codebase.connectorRef`,
  repoName: `${formattedPath}properties.ci.codebase.repoName`,
  depth: `${formattedPath}properties.ci.codebase.depth`,
  sslVerify: `${formattedPath}properties.ci.codebase.sslVerify`,
  prCloneStrategy: `${formattedPath}properties.ci.codebase.prCloneStrategy`,
  memoryLimit: `${formattedPath}properties.ci.codebase.resources.limits.memory`,
  cpuLimit: `${formattedPath}properties.ci.codebase.resources.limits.cpu`
})

const getViewType = ({
  viewType,
  viewTypeMetadata
}: {
  viewType: StepViewType
  viewTypeMetadata?: Record<string, boolean>
}): StepViewType | string => {
  if (viewTypeMetadata?.isTemplateBuilder) {
    return ConnectorRefWidthKeys.TemplateBuilder
  } else if (viewTypeMetadata?.isTemplateDetailDrawer) {
    return ConnectorRefWidthKeys.TemplateDetailDrawer
  } else if (viewTypeMetadata?.isTrigger) {
    return ConnectorRefWidthKeys.Trigger
  } else if (viewType === StepViewType.DeploymentForm) {
    return ConnectorRefWidthKeys.DefaultView // override current DeploymentForm width
  }
  return viewType
}
function CICodebaseInputSetFormInternal({
  path,
  readonly,
  formik,
  template,
  originalPipeline,
  viewType,
  viewTypeMetadata,
  selectedStageData,
  chainedPipelineStagePath
}: CICodebaseInputSetFormProps): JSX.Element {
  const { triggerIdentifier, accountId, projectIdentifier, orgIdentifier } = useParams<Record<string, string>>()
  const location = useLocation()
  const [isInputTouched, setIsInputTouched] = useState(false)
  const [connectorType, setConnectorType] = useState<ConnectorInfoDTO['type']>()
  const [connectorId, setConnectorId] = useState<string>('')
  const [connectorRef, setConnectorRef] = useState<string>('')
  const connectorWidth = getConnectorRefWidth(getViewType({ viewType, viewTypeMetadata }))
  const [connectionType, setConnectionType] = React.useState('')
  const [connectorUrl, setConnectorUrl] = React.useState('')
  const templateInputsProperties = (template?.template?.templateInputs as any)?.properties
  const isConnectorRuntimeInput = (template?.properties || templateInputsProperties)?.ci?.codebase?.connectorRef
  const isDepthRuntimeInput = (template?.properties || templateInputsProperties)?.ci?.codebase?.depth
  const isSslVerifyRuntimeInput = (template?.properties || templateInputsProperties)?.ci?.codebase?.sslVerify
  const isPrCloneStrategyRuntimeInput = (template?.properties || templateInputsProperties)?.ci?.codebase
    ?.prCloneStrategy
  const isRepoNameRuntimeInput = (template?.properties || templateInputsProperties)?.ci?.codebase?.repoName
  const isBuildRuntimeInput = isRuntimeInput((template?.properties || templateInputsProperties)?.ci?.codebase?.build)
  const isTagRuntimeInput = isRuntimeInput(
    (template?.properties || templateInputsProperties)?.ci?.codebase?.build?.spec?.tag
  )
  const isBranchRuntimeInput = isRuntimeInput(
    (template?.properties || templateInputsProperties)?.ci?.codebase?.build?.spec?.branch
  )
  const isCommitRuntimeInput = isRuntimeInput(
    (template?.properties || templateInputsProperties)?.ci?.codebase?.build?.spec?.commitSha
  )
  const isPRNumberRuntimeInput = isRuntimeInput(
    (template?.properties || templateInputsProperties)?.ci?.codebase?.build?.spec?.number
  )
  const buildIncludesRuntimeInput =
    isBuildRuntimeInput || isTagRuntimeInput || isBranchRuntimeInput || isPRNumberRuntimeInput || isCommitRuntimeInput
  const isCpuLimitRuntimeInput = (template?.properties || templateInputsProperties)?.ci?.codebase?.resources?.limits
    ?.cpu
  const isMemoryLimitRuntimeInput = (template?.properties || templateInputsProperties)?.ci?.codebase?.resources?.limits
    ?.memory
  const isDeploymentForm = viewType === StepViewType.DeploymentForm
  const isNotScheduledTrigger = formik?.values?.triggerType !== TriggerTypes.SCHEDULED
  const showSetContainerResources = isCpuLimitRuntimeInput || isMemoryLimitRuntimeInput
  const [isConnectorExpression, setIsConnectorExpression] = useState<boolean>(false)
  const containerWidth = viewTypeMetadata?.isTemplateDetailDrawer ? '100%' : '50%' // drawer view is much smaller 50% would cut out
  const prefix = isEmpty(path) ? '' : `${path}.`
  const buildTypeValue = get(formik?.values, `${prefix}properties.ci.codebase.build.type`)
  const previousBuildTypeSpecValue = get(formik?.values, `${prefix}properties.ci.codebase.build.spec.${buildTypeValue}`)
  const savedValues = useRef<Record<string, string>>(
    Object.assign(
      {
        branch: '',
        tag: '',
        PR: '',
        commitSha: ''
      },
      { [buildTypeValue]: previousBuildTypeSpecValue || '' }
    )
  )
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const formattedPath = isEmpty(path) ? '' : `${path}.`
  const buildPath = `${formattedPath}properties.ci.codebase.build`
  const buildSpecPath = `${formattedPath}properties.ci.codebase.build.spec`
  const codeBaseTypePath = `${formattedPath}properties.ci.codebase.build.type`
  const prCloneStrategyOptions = getPrCloneStrategyOptions(getString)
  const [codeBaseType, setCodeBaseType] = useState<CodebaseTypes | undefined>(get(formik?.values, codeBaseTypePath))
  const [gitAuthProtocol, setGitAuthProtocol] = useState<GitAuthenticationProtocol>(GitAuthenticationProtocol.HTTPS)
  const { module } = useParams<Partial<PipelineType<PipelinePathProps>>>()
  const [codebaseConnector, setCodebaseConnector] = useState<ConnectorInfoDTO>()
  const [isFetchingBranches, setIsFetchingBranches] = useState<boolean>(false)
  const [isDefaultBranchSet, setIsDefaultBranchSet] = useState<boolean>(false)
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesV2 : routesV1
  const routeParams = { ...accountPathProps, ...executionPathProps, ...pipelineModuleParams }

  const radioLabels = getBuildTypeLabels(getString)
  const codebaseTypeError = get(formik?.errors, codeBaseTypePath)

  const inputLabels = getBuildTypeInputLabels(getString)
  const codeBaseInputFieldFormName = getCodebaseInputFieldName(formattedPath)

  const showBuildAsDisabledTextField = useMemo(() => {
    return viewTypeMetadata?.isTemplateBuilder || viewTypeMetadata?.isTemplateDetailDrawer // should disable when template is applied to pipeline
  }, [viewTypeMetadata, formik?.values])

  useEffect(() => {
    if (get(formik?.values, codeBaseInputFieldFormName.connectorRef) === RUNTIME_INPUT_VALUE) {
      formik?.setFieldValue(buildPath, RUNTIME_INPUT_VALUE)
    }
  }, [get(formik?.values, codeBaseInputFieldFormName.connectorRef)])

  useEffect(() => {
    if (get(formik?.values, buildPath) === RUNTIME_INPUT_VALUE) {
      setCodeBaseType(undefined)
    } else if (
      viewType === StepViewType.DeploymentForm &&
      !isEmpty(formik?.values) &&
      !get(formik?.values, buildPath)
    ) {
      setCodeBaseType(CodebaseTypes.BRANCH)
    }
  }, [get(formik?.values, buildPath), viewType])

  const debouncedFetchBranchesForRepo = React.useCallback(
    debounce((repoName?: AcceptableValue) => {
      formik.setFieldValue(codeBaseInputFieldFormName.repoName, repoName)
      if (viewType === StepViewType.DeploymentForm && codeBaseType === CodebaseTypes.BRANCH) {
        formik?.setFieldValue(codeBaseInputFieldFormName.branch, '')
        setIsDefaultBranchSet(false)
        if (repoName) {
          fetchBranchesForRepo(repoName as string)
        }
      }
    }, 1000),
    [viewType, codeBaseType, codebaseConnector]
  )

  // Cleanup debounce
  useEffect(() => {
    return () => {
      debouncedFetchBranchesForRepo.flush()
    }
  }, [])

  const shouldAllowRepoFetch = useMemo((): boolean => {
    return (
      viewType === StepViewType.DeploymentForm &&
      codeBaseType === CodebaseTypes.BRANCH &&
      !get(formik?.values, codeBaseInputFieldFormName.branch) &&
      !isDefaultBranchSet
    )
  }, [viewType, codeBaseType, get(formik?.values, codeBaseInputFieldFormName.branch), isDefaultBranchSet])

  const fetchBranchesForRepo = useCallback(
    (repoName: string) => {
      if (shouldAllowRepoFetch) {
        // Default branch needs to be set only if not specified by the user already for "branch" type build, only on Run Pipeline form
        if (codebaseConnector && !get(codebaseConnector, 'spec.apiAccess')) {
          return
        }
        const connectorReference =
          get(originalPipeline, 'properties.ci.codebase.connectorRef', '') === RUNTIME_INPUT_VALUE
            ? codebaseConnector && getReference(getScopeFromDTO(codebaseConnector), codebaseConnector.identifier)
            : get(originalPipeline, 'properties.ci.codebase.connectorRef', '') ?? null

        if (repoName) {
          try {
            setIsFetchingBranches(true)
            getListOfBranchesByRefConnectorV2Promise({
              queryParams: {
                connectorRef: connectorReference,
                accountIdentifier: accountId,
                orgIdentifier,
                projectIdentifier,
                repoName: encodeURI(repoName.endsWith(GIT_EXTENSION) ? repoName.replace(/\.[^/.]+$/, '') : repoName),
                size: 1
              }
            })
              .then((result: ResponseGitBranchesResponseDTO) => {
                setIsFetchingBranches(false)
                const branchName = result.data?.defaultBranch?.name || ''
                formik.setFieldValue(buildPath, { spec: { branch: branchName }, type: CodebaseTypes.BRANCH })
                savedValues.current.branch = branchName as string

                if (result.data?.defaultBranch?.name) {
                  setIsDefaultBranchSet(true)
                }
              })
              .catch(_e => {
                setIsFetchingBranches(false)
              })
          } catch (e) {
            setIsFetchingBranches(false)
          }
        }
      }
    },
    [shouldAllowRepoFetch, originalPipeline, codebaseConnector]
  )

  useEffect(() => {
    const isInputsView = !!matchPath(location.pathname, {
      path: [
        routes.toExecutionInputsView(routeParams),
        routes.toExecutionInputsView({ ...routeParams, module: undefined })
      ]
    })
    if (codebaseConnector && !isInputsView) {
      const codebaseConnectorConnectionType = get(codebaseConnector, 'spec.type')
      if (codebaseConnectorConnectionType === ConnectionType.Repo) {
        fetchBranchesForRepo(getCodebaseRepoNameFromConnector(codebaseConnector))
      } else if (
        codebaseConnectorConnectionType === ConnectionType.Account &&
        get(originalPipeline, 'properties.ci.codebase.repoName', '') !== RUNTIME_INPUT_VALUE
      ) {
        fetchBranchesForRepo(get(originalPipeline, 'properties.ci.codebase.repoName', ''))
      }
    } else if (codeBaseType === CodebaseTypes.BRANCH && !isInputsView) {
      // fetch branches without connector for gitness
      fetchBranchesForRepo(get(originalPipeline, 'properties.ci.codebase.repoName', ''))
    }
  }, [codebaseConnector, originalPipeline, codeBaseType])

  const codeBaseInputDefaultValue = {
    depth: 50,
    sslVerify: true,
    prCloneStrategy: prCloneStrategyOptions?.[0]?.value,
    memoryLimit: '500Mi',
    cpuLimit: '400m',
    build: { spec: {} }
  }

  const {
    data: connectorDetails,
    loading: loadingConnectorDetails,
    refetch: getConnectorDetails
  } = useGetConnector({
    identifier: connectorId,
    lazy: true
  })

  useEffect(() => {
    if (connectorId) {
      const connectorScope = getScopeFromValue(connectorRef)
      getConnectorDetails({
        pathParams: {
          identifier: connectorId
        },
        queryParams: {
          accountIdentifier: accountId,
          orgIdentifier: connectorScope === Scope.ORG || connectorScope === Scope.PROJECT ? orgIdentifier : undefined,
          projectIdentifier: connectorScope === Scope.PROJECT ? projectIdentifier : undefined
        }
      })
    }
  }, [connectorId])

  useEffect(() => {
    if (!loadingConnectorDetails && connectorDetails) {
      setCodebaseConnector(connectorDetails?.data?.connector)
      setConnectorType(get(connectorDetails, 'data.connector.type', '') as ConnectorInfoDTO['type'])
    }

    if (connectorDetails?.data?.connector) {
      setConnectionType(
        connectorDetails?.data?.connector?.type === Connectors.GIT
          ? connectorDetails?.data?.connector.spec.connectionType
          : connectorDetails?.data?.connector.spec.type
      )
      setConnectorUrl(connectorDetails?.data?.connector.spec.url)
      if ([ConnectionType.Repo, ConnectionType.Region].includes(connectorDetails?.data?.connector?.spec?.type)) {
        formik.setFieldValue(codeBaseInputFieldFormName.repoName, undefined)
      }
    }
  }, [loadingConnectorDetails, connectorDetails])

  useEffect(() => {
    const type = get(formik?.values, codeBaseTypePath) as CodebaseTypes
    if (type) {
      setCodeBaseType(type)
    }
    const typeOfConnector = get(formik?.values, 'connectorRef.connector.type', '') as ConnectorInfoDTO['type']
    if (typeOfConnector) {
      setConnectorType(typeOfConnector)
    } else {
      let ctrRef = get(originalPipeline, 'properties.ci.codebase.connectorRef') as string
      if (isConnectorExpression) {
        return
      }
      if (isRuntimeInput(ctrRef)) {
        ctrRef = get(formik?.values, codeBaseInputFieldFormName.connectorRef, '')
      }

      setConnectorRef(ctrRef)
      setConnectorId(getIdentifierFromValue(ctrRef))
    }
  }, [formik?.values])

  let filteredStages: StageElementWrapperConfig[] | undefined = originalPipeline?.stages
  if (selectedStageData && !selectedStageData.allStagesSelected) {
    filteredStages = getSelectedStagesFromPipeline(originalPipeline, selectedStageData)
  }

  const isCloneCodebaseEnabledAtLeastAtOneStage = filteredStages?.some(
    stage =>
      Object.is(get(stage, 'stage.spec.cloneCodebase'), true) ||
      stage?.parallel?.some(parallelStage => Object.is(get(parallelStage, 'stage.spec.cloneCodebase'), true))
  )

  const codebaseHasRuntimeInputs = isCodebaseFieldsRuntimeInputs(template)

  const pipelineHasCodebaseSection = useMemo((): boolean => {
    return (
      (isCloneCodebaseEnabledAtLeastAtOneStage || codebaseHasRuntimeInputs) &&
      (isConnectorRuntimeInput || isRepoNameRuntimeInput || buildIncludesRuntimeInput)
    )
  }, [
    isCloneCodebaseEnabledAtLeastAtOneStage,
    codebaseHasRuntimeInputs,
    isConnectorRuntimeInput,
    isRepoNameRuntimeInput,
    buildIncludesRuntimeInput
  ])

  useEffect(() => {
    const existingValues = { ...formik?.values }
    if (!pipelineHasCodebaseSection && get(existingValues, 'properties.ci')) {
      let updatedValues = omit(existingValues, 'properties.ci')
      if (isEmpty(get(updatedValues, 'properties'))) {
        updatedValues = omit(updatedValues, 'properties')
      }
      formik?.setValues(updatedValues)
    }
  }, [pipelineHasCodebaseSection, formik?.values])

  useEffect(() => {
    if (
      pipelineHasCodebaseSection &&
      ((viewType === StepViewType.InputSet && formik?.values?.pipeline?.identifier) ||
        (viewType === StepViewType.DeploymentForm && formik?.values?.identifier)) &&
      (!chainedPipelineStagePath || get(formik?.values, `${chainedPipelineStagePath}.type`) === StageType.PIPELINE)
    ) {
      const newInitialValues = { ...formik.values }
      // TriggerForm does not instantiate each runtime input with empty string yet but we want default values there
      const codeBaseSpecPathValue = get(newInitialValues, buildSpecPath)
      if (!codeBaseSpecPathValue && isDeploymentForm) {
        // only deployment form as it instantiates build with ''
        set(newInitialValues, buildPath, codeBaseInputDefaultValue.build)
      }
      if (isDepthRuntimeInput && !get(newInitialValues, codeBaseInputFieldFormName.depth)) {
        set(newInitialValues, codeBaseInputFieldFormName.depth, codeBaseInputDefaultValue.depth)
      }
      if (isSslVerifyRuntimeInput && typeof get(newInitialValues, codeBaseInputFieldFormName.sslVerify) !== 'boolean') {
        set(newInitialValues, codeBaseInputFieldFormName.sslVerify, codeBaseInputDefaultValue.sslVerify)
      }
      if (isPrCloneStrategyRuntimeInput && !get(newInitialValues, codeBaseInputFieldFormName.prCloneStrategy)) {
        set(newInitialValues, codeBaseInputFieldFormName.prCloneStrategy, codeBaseInputDefaultValue.prCloneStrategy)
      }
      if (isMemoryLimitRuntimeInput && !get(newInitialValues, codeBaseInputFieldFormName.memoryLimit)) {
        set(newInitialValues, codeBaseInputFieldFormName.memoryLimit, codeBaseInputDefaultValue.memoryLimit)
      }
      if (isCpuLimitRuntimeInput && !get(newInitialValues, codeBaseInputFieldFormName.cpuLimit)) {
        set(newInitialValues, codeBaseInputFieldFormName.cpuLimit, codeBaseInputDefaultValue.cpuLimit)
      }
      const codeBasePath = `${formattedPath}properties.ci.codebase`

      formik?.setFieldValue(get(newInitialValues, codeBasePath), codeBasePath)
    }
  }, [pipelineHasCodebaseSection, formik?.values?.pipeline?.identifier, formik?.values?.identifier])

  useEffect(() => {
    // OnEdit Case, persists saved ciCodebase build spec
    if (
      pipelineHasCodebaseSection &&
      codeBaseType &&
      (!chainedPipelineStagePath || get(formik?.values, `${chainedPipelineStagePath}.type`) === StageType.PIPELINE)
    ) {
      savedValues.current = Object.assign(savedValues.current, {
        [codeBaseType]: get(
          formik?.values,
          `${formattedPath}properties.ci.codebase.build.spec.${BuildCodebaseType[codeBaseType]}`,
          ''
        )
      })
      const existingValues = { ...formik?.values }
      let updatedValues = set(existingValues, codeBaseTypePath, codeBaseType)
      updatedValues = set(existingValues, buildSpecPath, {
        [BuildCodebaseType[codeBaseType]]: savedValues.current[codeBaseType]
      })
      formik?.setValues(updatedValues)
    }
  }, [pipelineHasCodebaseSection, codeBaseType])

  const handleTypeChange = (newType: CodebaseTypes): void => {
    const newValues = produce(formik?.values, (draft: any) => {
      set(draft, `${formattedPath}properties.ci.codebase.build`, '')
      set(draft, codeBaseTypePath, newType)
      if (!isInputTouched && triggerIdentifier && isNotScheduledTrigger) {
        set(draft, buildSpecPath, { [BuildCodebaseType[newType]]: DefaultBuildValues[newType] })
      } else {
        set(draft, buildSpecPath, { [BuildCodebaseType[newType]]: savedValues.current[newType] })
      }
    })
    formik?.setValues(newValues)
  }

  const renderCodeBaseTypeInput = (type: CodebaseTypes): JSX.Element => {
    const shouldDisableBranchTextInput = type === CodebaseTypes.BRANCH && isFetchingBranches
    return (
      <Layout.Horizontal flex={{ justifyContent: 'flex-start', alignItems: 'center' }} spacing="medium">
        <FormInput.MultiTextInput
          label={<Text font={{ variation: FontVariation.FORM_LABEL }}>{inputLabels[type]}</Text>}
          name={codeBaseInputFieldFormName[type]}
          multiTextInputProps={{
            expressions,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
            allowableTypes: [MultiTypeInputType.EXPRESSION, MultiTypeInputType.FIXED]
          }}
          placeholder={triggerIdentifier && isNotScheduledTrigger ? placeholderValues[type] : ''}
          disabled={readonly || shouldDisableBranchTextInput}
          onChange={val => {
            setIsInputTouched(true)
            savedValues.current[type] = (val || '') as string
          }}
          className={shouldDisableBranchTextInput ? css.width90 : css.width100}
        />
        {shouldDisableBranchTextInput ? <Icon name="steps-spinner" size={20} padding={{ top: 'xsmall' }} /> : null}
      </Layout.Horizontal>
    )
  }

  const AllowableTypesForCodebaseProperties = useMemo((): AllowedTypesWithRunTime[] => {
    return viewTypeMetadata?.isTemplateBuilder || viewTypeMetadata?.isTemplateDetailDrawer
      ? [MultiTypeInputType.RUNTIME, MultiTypeInputType.FIXED]
      : [MultiTypeInputType.FIXED]
  }, [viewTypeMetadata?.isTemplateBuilder])

  const AllowableTypesForCodebaseRepoName = useMemo((): AllowedTypesWithRunTime[] => {
    return viewTypeMetadata?.isTemplateBuilder || viewTypeMetadata?.isTemplateDetailDrawer
      ? [MultiTypeInputType.RUNTIME, MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION]
      : [MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION]
  }, [viewTypeMetadata?.isTemplateBuilder, viewTypeMetadata?.isTemplateDetailDrawer])

  const disableBuildRadioBtnSelection = useMemo(() => {
    return readonly || (codeBaseType === CodebaseTypes.BRANCH && isFetchingBranches)
  }, [readonly, codeBaseType, isFetchingBranches])

  const renderConnectorField = (): JSX.Element => {
    const args = {
      name: codeBaseInputFieldFormName.connectorRef,
      width: connectorWidth,
      error: formik?.errors?.connectorRef,
      type: [
        Connectors.GIT,
        Connectors.GITHUB,
        Connectors.GITLAB,
        Connectors.BITBUCKET,
        Connectors.AWS_CODECOMMIT,
        Connectors.AZURE_REPO
      ],
      label: <Text font={{ variation: FontVariation.FORM_LABEL }}>{getString('connector')}</Text>,
      placeholder: loadingConnectorDetails ? getString('loading') : getString('common.entityPlaceholderText'),
      accountIdentifier: accountId,
      projectIdentifier: projectIdentifier,
      orgIdentifier: orgIdentifier,
      gitScope: { repo: repoIdentifier || '', branch, getDefaultFromOtherRepo: true },
      multiTypeProps: {
        expressions,
        disabled: readonly,
        newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
        allowableTypes: AllowableTypesForCodebaseProperties
      },
      onChange: (
        value: AcceptableValue | undefined,
        _valueType: MultiTypeInputValue,
        connectorRefType: MultiTypeInputType
      ) =>
        handleCIConnectorRefOnChange({
          value: value as ConnectorRefInterface,
          connectorRefType,
          setConnectionType,
          setConnectorUrl,
          setFieldValue: formik?.setFieldValue as (field: string, value: any) => void,
          codeBaseInputFieldFormName,
          setGitAuthProtocol,
          setIsConnectorExpression
        })
    }
    return <FormMultiTypeConnectorField {...args} setRefValue />
  }

  return pipelineHasCodebaseSection ? (
    <>
      <Layout.Horizontal spacing="small" padding={{ top: 'medium', left: 'large', right: 0, bottom: 0 }}>
        <Text
          data-name="ci-codebase-title"
          color={Color.BLACK_100}
          font={{ weight: 'semi-bold' }}
          tooltipProps={{
            dataTooltipId: (() => {
              switch (module) {
                case 'ci':
                  return 'ciCodebase'
                default:
                  return 'codebase'
              }
            })()
          }}
        >
          {getString(
            (() => {
              switch (module) {
                case 'ci':
                  return 'ciCodebase'
                default:
                  return 'codebase'
              }
            })()
          )}
        </Text>
      </Layout.Horizontal>
      <div className={pipelineInputSetCss.topAccordion}>
        <div className={pipelineInputSetCss.accordionSummary}>
          <div className={pipelineInputSetCss.nestedAccordions}>
            <Layout.Vertical spacing="small">
              {loadingConnectorDetails ? (
                <Container flex={{ justifyContent: 'center' }}>
                  <Icon name="steps-spinner" size={25} />
                </Container>
              ) : (
                <>
                  {isConnectorRuntimeInput && <Container width={containerWidth}>{renderConnectorField()}</Container>}
                  {isRepoNameRuntimeInput &&
                    (!isRuntimeInput(formik?.values.connectorRef) && connectionType === ConnectionType.Repo ? (
                      <Container width={containerWidth}>
                        <Text
                          font={{ variation: FontVariation.FORM_LABEL }}
                          margin={{ bottom: 'xsmall' }}
                          tooltipProps={{ dataTooltipId: 'rightBarForm_repoName' }}
                        >
                          {getString('common.repositoryName')}
                        </Text>
                        <TextInput
                          name={codeBaseInputFieldFormName.repoName}
                          value={connectorUrl}
                          style={{ flexGrow: 1 }}
                          disabled
                        />
                      </Container>
                    ) : (
                      <>
                        <Container width={containerWidth}>
                          <MultiTypeTextField
                            label={
                              <Text
                                className={css.inpLabel}
                                font={{ variation: FontVariation.FORM_LABEL }}
                                tooltipProps={{ dataTooltipId: 'rightBarForm_repoName' }}
                              >
                                {getString('common.repositoryName')}
                              </Text>
                            }
                            name={codeBaseInputFieldFormName.repoName}
                            multiTextInputProps={{
                              multiTextInputProps: {
                                expressions,
                                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                                allowableTypes: AllowableTypesForCodebaseRepoName
                              },
                              disabled: readonly || isFetchingBranches,
                              onChange: debouncedFetchBranchesForRepo
                            }}
                          />
                        </Container>
                        {!isRuntimeInput(formik?.values.connectorRef) &&
                          !isRuntimeInput(formik?.values.repoName) &&
                          connectorUrl?.length > 0 && (
                            <div className={css.predefinedValue}>
                              <Text lineClamp={1}>
                                {getCompleteConnectorUrl({
                                  partialUrl: connectorUrl,
                                  repoName: get(formik?.values, codeBaseInputFieldFormName.repoName, ''),
                                  connectorType,
                                  gitAuthProtocol
                                })}
                              </Text>
                            </div>
                          )}
                      </>
                    ))}
                  {buildIncludesRuntimeInput && (
                    <>
                      <Text
                        font={{ variation: FontVariation.FORM_LABEL }}
                        tooltipProps={{ dataTooltipId: 'ciCodebaseBuildType' }}
                      >
                        {getString('filters.executions.buildType')}
                      </Text>
                      {showBuildAsDisabledTextField && (
                        <Container
                          width={viewTypeMetadata?.isTemplateBuilder ? '361px' : containerWidth}
                          className={css.bottomMargin3}
                        >
                          <FormInput.MultiTextInput
                            name={buildPath}
                            label=""
                            // value="<+input>"
                            multiTextInputProps={{
                              expressions,
                              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                              allowableTypes: [MultiTypeInputType.FIXED]
                            }}
                            disabled={true}
                            style={{ marginBottom: 0, flexGrow: 1 }}
                          />
                        </Container>
                      )}
                      {(isBuildRuntimeInput ||
                        (isConnectorRuntimeInput && get(formik?.values, codeBaseInputFieldFormName.connectorRef))) &&
                        !showBuildAsDisabledTextField && (
                          <Layout.Horizontal
                            flex={{ justifyContent: 'start' }}
                            padding={{ top: 'small', left: 'xsmall', bottom: 'xsmall' }}
                            margin={{ left: 'large' }}
                          >
                            <Radio
                              label={radioLabels['branch']}
                              width={110}
                              onClick={() => handleTypeChange(CodebaseTypes.BRANCH)}
                              checked={codeBaseType === CodebaseTypes.BRANCH}
                              disabled={disableBuildRadioBtnSelection}
                              font={{ variation: FontVariation.FORM_LABEL }}
                              key="branch-radio-option"
                            />
                            <Radio
                              label={radioLabels['tag']}
                              width={90}
                              margin={{ left: 'huge' }}
                              onClick={() => handleTypeChange(CodebaseTypes.TAG)}
                              checked={codeBaseType === CodebaseTypes.TAG}
                              disabled={disableBuildRadioBtnSelection}
                              font={{ variation: FontVariation.FORM_LABEL }}
                              key="tag-radio-option"
                            />
                            {connectorType !== 'Codecommit' && (
                              <Radio
                                label={radioLabels['PR']}
                                width={110}
                                margin={{ left: 'huge' }}
                                onClick={() => handleTypeChange(CodebaseTypes.PR)}
                                checked={codeBaseType === CodebaseTypes.PR}
                                disabled={disableBuildRadioBtnSelection}
                                font={{ variation: FontVariation.FORM_LABEL }}
                                key="pr-radio-option"
                              />
                            )}
                          </Layout.Horizontal>
                        )}
                      {codebaseTypeError && (formik.submitCount > 0 || viewTypeMetadata?.isTrigger) && (
                        <Text color={Color.RED_600}>{codebaseTypeError}</Text>
                      )}
                      {(buildIncludesRuntimeInput ||
                        (isConnectorRuntimeInput && get(formik?.values, codeBaseInputFieldFormName.connectorRef))) && (
                        <Container width={containerWidth}>
                          {codeBaseType === CodebaseTypes.BRANCH && renderCodeBaseTypeInput(CodebaseTypes.BRANCH)}
                          {codeBaseType === CodebaseTypes.TAG && renderCodeBaseTypeInput(CodebaseTypes.TAG)}
                          {codeBaseType === CodebaseTypes.PR && renderCodeBaseTypeInput(CodebaseTypes.PR)}
                        </Container>
                      )}
                    </>
                  )}
                  {(isDepthRuntimeInput ||
                    isSslVerifyRuntimeInput ||
                    isPrCloneStrategyRuntimeInput ||
                    showSetContainerResources) && (
                    <Text
                      color={Color.GREY_600}
                      font={{ size: 'small', weight: 'semi-bold' }}
                      tooltipProps={{ dataTooltipId: 'advanced' }}
                    >
                      {getString('advancedTitle')}
                    </Text>
                  )}
                  {isDepthRuntimeInput && (
                    <Container width={containerWidth} className={css.bottomMargin3}>
                      <MultiTypeTextField
                        label={
                          <Layout.Horizontal
                            className={css.inpLabel}
                            style={{ display: 'flex', alignItems: 'baseline' }}
                          >
                            <Text
                              font={{ variation: FontVariation.FORM_LABEL }}
                              tooltipProps={{ dataTooltipId: 'depth' }}
                            >
                              {getString('pipeline.depth')}
                            </Text>
                            &nbsp;
                          </Layout.Horizontal>
                        }
                        name={codeBaseInputFieldFormName.depth}
                        multiTextInputProps={{
                          multiTextInputProps: {
                            expressions,
                            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                            allowableTypes: AllowableTypesForCodebaseProperties,
                            textProps: { type: 'number' }
                          },
                          disabled: readonly
                        }}
                      />
                    </Container>
                  )}
                  {isSslVerifyRuntimeInput && (
                    <Container width={containerWidth} className={css.bottomMargin3}>
                      <MultiTypeSelectField
                        name={codeBaseInputFieldFormName.sslVerify}
                        label={renderLabel({
                          getString,
                          tooltip: 'sslVerify',
                          keyString: 'pipeline.sslVerify'
                        })}
                        multiTypeInputProps={{
                          selectItems: sslVerifyOptions as unknown as SelectOption[],
                          placeholder: getString('select'),
                          multiTypeInputProps: {
                            expressions,
                            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                            selectProps: {
                              addClearBtn: true,
                              items: sslVerifyOptions as unknown as SelectOption[]
                            },
                            allowableTypes: AllowableTypesForCodebaseProperties
                          },
                          disabled: readonly
                        }}
                        useValue
                        disabled={readonly}
                      />
                    </Container>
                  )}
                  {isPrCloneStrategyRuntimeInput && (
                    <Container width={containerWidth} className={css.bottomMargin3}>
                      <MultiTypeSelectField
                        name={codeBaseInputFieldFormName.prCloneStrategy}
                        label={renderLabel({
                          getString,
                          tooltip: 'prCloneStrategy',
                          keyString: 'pipeline.ciCodebase.prCloneStrategy'
                        })}
                        multiTypeInputProps={{
                          selectItems: prCloneStrategyOptions,
                          placeholder: getString('select'),
                          multiTypeInputProps: {
                            expressions,
                            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                            selectProps: { addClearBtn: true, items: prCloneStrategyOptions },
                            allowableTypes: AllowableTypesForCodebaseProperties
                          },
                          disabled: readonly
                        }}
                        useValue
                        disabled={readonly}
                      />
                    </Container>
                  )}
                  {showSetContainerResources && (
                    <Layout.Vertical width={containerWidth} className={css.bottomMargin3} spacing="medium">
                      <Text
                        color={Color.GREY_600}
                        font={{ size: 'small', weight: 'semi-bold' }}
                        tooltipProps={{ dataTooltipId: 'setContainerResources' }}
                      >
                        {getString('pipelineSteps.setContainerResources')}
                      </Text>
                      <Layout.Horizontal spacing="small">
                        {isMemoryLimitRuntimeInput && (
                          <MultiTypeTextField
                            name={codeBaseInputFieldFormName.memoryLimit}
                            label={
                              <Layout.Horizontal style={{ display: 'flex', alignItems: 'baseline' }}>
                                <Text
                                  className={css.inpLabel}
                                  color={Color.GREY_600}
                                  font={{ size: 'small', weight: 'semi-bold' }}
                                  tooltipProps={{ dataTooltipId: 'limitMemory' }}
                                >
                                  {getString('pipelineSteps.limitMemoryLabel')}
                                </Text>
                                &nbsp;
                              </Layout.Horizontal>
                            }
                            multiTextInputProps={{
                              multiTextInputProps: {
                                expressions,
                                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                                allowableTypes: AllowableTypesForCodebaseProperties
                              },
                              disabled: readonly
                            }}
                            configureOptionsProps={{ variableName: 'spec.limit.memory' }}
                            style={{ flexGrow: 1, flexBasis: '50%' }}
                          />
                        )}

                        {isCpuLimitRuntimeInput && (
                          <MultiTypeTextField
                            name={codeBaseInputFieldFormName.cpuLimit}
                            label={
                              <Layout.Horizontal style={{ display: 'flex', alignItems: 'baseline' }}>
                                <Text
                                  className={css.inpLabel}
                                  color={Color.GREY_600}
                                  font={{ size: 'small', weight: 'semi-bold' }}
                                  tooltipProps={{ dataTooltipId: 'limitCPULabel' }}
                                >
                                  {getString('pipelineSteps.limitCPULabel')}
                                </Text>
                                &nbsp;
                              </Layout.Horizontal>
                            }
                            multiTextInputProps={{
                              multiTextInputProps: {
                                expressions,
                                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                                allowableTypes: AllowableTypesForCodebaseProperties
                              },
                              disabled: readonly
                            }}
                            configureOptionsProps={{ variableName: 'spec.limit.cpu' }}
                            style={{ flexGrow: 1, flexBasis: '50%' }}
                          />
                        )}
                      </Layout.Horizontal>
                    </Layout.Vertical>
                  )}
                </>
              )}
            </Layout.Vertical>
          </div>
        </div>
      </div>
    </>
  ) : (
    <></>
  )
}

export const CICodebaseInputSetForm = connect(CICodebaseInputSetFormInternal)
