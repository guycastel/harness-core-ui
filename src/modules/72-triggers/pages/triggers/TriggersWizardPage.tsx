/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { FormikErrors, FormikProps } from 'formik'
import { useHistory, useParams } from 'react-router-dom'
import {
  Layout,
  SelectOption,
  Text,
  Switch,
  PageSpinner,
  VisualYamlSelectedView as SelectedView,
  useConfirmationDialog,
  ButtonVariation,
  Button
} from '@harness/uicore'
import { Color, Intent } from '@harness/design-system'
import { parse } from 'yaml'
import { isEmpty, isUndefined, merge, defaultTo, noop, get, omitBy, omit } from 'lodash-es'
import { CompletionItemKind } from 'vscode-languageserver-types'
import {
  getPipelineInputs,
  InputsResponseBody,
  useGetIndividualStaticSchemaQuery
} from '@harnessio/react-pipeline-service-client'
import { Page, useToaster } from '@common/exports'
import Wizard from '@common/components/Wizard/Wizard'
import { connectorUrlType } from '@platform/connectors/constants'
import routes from '@common/RouteDefinitions'
import { clearRuntimeInput, mergeTemplateWithInputSetData } from '@pipeline/utils/runPipelineUtils'
import type { Pipeline } from '@pipeline/utils/types'
import { useGetConnector, GetConnectorQueryParams, getConnectorListV2Promise, Failure } from 'services/cd-ng'
import {
  PipelineInfoConfig,
  useGetPipeline,
  useGetTemplateFromPipeline,
  useCreateTrigger,
  useGetTrigger,
  useUpdateTrigger,
  NGTriggerConfigV2,
  useGetSchemaYaml,
  ResponseNGTriggerResponse,
  useGetMergeInputSetFromPipelineTemplateWithListInput
} from 'services/pipeline-ng'
import {
  isCloneCodebaseEnabledAtLeastOneStage,
  isCodebaseFieldsRuntimeInputs,
  getPipelineWithoutCodebaseInputs
} from '@pipeline/utils/CIUtils'
import { useStrings } from 'framework/strings'
import type { PipelineType } from '@common/interfaces/RouteInterfaces'
import { Scope } from '@common/interfaces/SecretsInterface'
import { validatePipeline } from '@pipeline/components/PipelineStudio/StepUtil'
import { ErrorsStrip } from '@pipeline/components/ErrorsStrip/ErrorsStrip'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import {
  getIdentifierFromValue,
  getScopeFromValue,
  getScopeFromDTO
} from '@common/components/EntityReference/EntityReference'
import type {
  YamlBuilderHandlerBinding,
  YamlBuilderProps,
  InvocationMapFunction,
  CompletionItemInterface
} from '@common/interfaces/YAMLBuilderProps'
import { memoizedParse, yamlParse, yamlStringify } from '@common/utils/YamlHelperMethods'
import { useConfirmAction, useMutateAsGet, useDeepCompareEffect, useQueryParams } from '@common/hooks'
import type { FormikEffectProps } from '@common/components/FormikEffect/FormikEffect'
import type { InputSetValue } from '@pipeline/components/InputSetSelector/utils'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import useIsNewGitSyncRemotePipeline from '@triggers/components/Triggers/useIsNewGitSyncRemotePipeline'
import useIsGithubWebhookAuthenticationEnabled from '@triggers/components/Triggers/WebhookTrigger/useIsGithubWebhookAuthenticationEnabled'
import { useGetResolvedChildPipeline } from '@pipeline/hooks/useGetResolvedChildPipeline'
import { GitSourceProviders, isNewTrigger } from '@triggers/components/Triggers/utils'
import { isSimplifiedYAMLEnabled } from '@common/utils/utils'
import { useIsTriggerCreatePermission } from '@triggers/components/Triggers/useIsTriggerCreatePermission'
import type { TriggerType } from '@triggers/components/Triggers/TriggerInterface'
import {
  scheduleTabsId,
  getDefaultExpressionBreakdownValues,
  resetScheduleObject,
  getBreakdownValues,
  CronFormat
} from '@common/components/SchedulePanel/components/utils'
import SchedulePanel from '@common/components/SchedulePanel/SchedulePanel'
import type { AddConditionInterface } from './views/AddConditionsSection'
import {
  getConnectorName,
  getConnectorValue,
  isRowFilled,
  isArtifactOrManifestTrigger,
  clearNullUndefined,
  getWizardMap,
  PayloadConditionTypes,
  EventConditionTypes,
  ResponseStatus,
  TriggerTypes,
  scheduledTypes,
  getValidationSchema,
  eventTypes,
  displayPipelineIntegrityResponse,
  getOrderedPipelineVariableValues,
  getModifiedTemplateValues,
  getErrorMessage,
  isHarnessExpression,
  getArtifactManifestTriggerYaml,
  flattenKeys,
  getDefaultPipelineReferenceBranch
} from './utils/TriggersWizardPageUtils'
import {
  ArtifactTriggerConfigPanel,
  WebhookTriggerConfigPanel,
  WebhookConditionsPanel,
  WebhookPipelineInputPanel,
  TriggerOverviewPanel
} from './views'
import WebhookPipelineInputPanelV1 from './views/V1/WebhookPipelineInputPanelV1'
import ArtifactConditionsPanel from './views/ArtifactConditionsPanel'

import type {
  ConnectorRefInterface,
  FlatInitialValuesInterface,
  FlatOnEditValuesInterface,
  FlatValidWebhookFormikValuesInterface,
  FlatValidScheduleFormikValuesInterface,
  FlatValidArtifactFormikValuesInterface,
  TriggerConfigDTO,
  FlatValidFormikValuesInterface,
  TriggerGitQueryParams
} from './interface/TriggersWizardInterface'
import css from './TriggersWizardPage.module.scss'

type ResponseNGTriggerResponseWithMessage = ResponseNGTriggerResponse & { message?: string }

const TriggersWizardPage = (): JSX.Element => {
  const { orgIdentifier, accountId, projectIdentifier, pipelineIdentifier, triggerIdentifier, module } = useParams<
    PipelineType<{
      projectIdentifier: string
      orgIdentifier: string
      accountId: string
      pipelineIdentifier: string
      targetIdentifier: string
      triggerIdentifier: string
    }>
  >()
  const {
    repoIdentifier,
    connectorRef: pipelineConnectorRef,
    repoName: pipelineRepoName,
    branch,
    storeType,
    triggerType: triggerTypeOnNew,
    sourceRepo: sourceRepoOnNew,
    manifestType,
    artifactType
  } = useQueryParams<TriggerGitQueryParams>()
  const gitXQueryParams = {
    branch,
    repoName: pipelineRepoName,
    repoIdentifier,
    parentEntityConnectorRef: pipelineConnectorRef
  }
  const history = useHistory()
  const { getString } = useStrings()
  const [pipelineInputs, setPipelineInputs] = useState<InputsResponseBody>({})
  const { data: template, loading: fetchingTemplate } = useMutateAsGet(useGetTemplateFromPipeline, {
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      pipelineIdentifier,
      projectIdentifier,
      // GitX related query params
      ...gitXQueryParams
    },
    body: {
      stageIdentifiers: []
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
  })

  const { data: triggerResponse, loading: loadingGetTrigger } = useGetTrigger({
    triggerIdentifier,
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      targetIdentifier: pipelineIdentifier
    },
    lazy: isNewTrigger(triggerIdentifier)
  })
  const { data: pipelineResponse, loading: loadingPipeline } = useGetPipeline({
    pipelineIdentifier,
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      getTemplatesResolvedPipeline: true,
      // GitX related query params
      ...gitXQueryParams
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
  })

  const {
    CD_GIT_WEBHOOK_POLLING: isGitWebhookPollingEnabled,

    CI_YAML_VERSIONING
  } = useFeatureFlags()

  const isSimplifiedYAML = isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING)

  const isNewGitSyncRemotePipeline = useIsNewGitSyncRemotePipeline()

  const [connectorScopeParams, setConnectorScopeParams] = useState<GetConnectorQueryParams | undefined>(undefined)
  const [ignoreError, setIgnoreError] = useState<boolean>(false)
  const [resolvedPipeline, setResolvedPipeline] = useState<PipelineInfoConfig | undefined>()
  const createUpdateTriggerQueryParams = useMemo(
    () => ({
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      targetIdentifier: pipelineIdentifier,
      ...(isNewGitSyncRemotePipeline
        ? {
            ignoreError,
            branch,
            connectorRef: pipelineConnectorRef,
            repoName: pipelineRepoName,
            storeType
          }
        : undefined)
    }),
    [
      accountId,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      ignoreError,
      isNewGitSyncRemotePipeline,
      branch,
      pipelineConnectorRef,
      pipelineRepoName,
      storeType
    ]
  )
  const retryFn = useRef<() => void>(noop)
  const [retrySavingConfirmationMessage, setRetrySavingConfirmation] = useState('')
  const confirmIgnoreErrorAndResubmit = useConfirmAction({
    intent: Intent.PRIMARY,
    title: getString('triggers.triggerCouldNotBeSavedTitle'),
    confirmText: getString('continue'),
    message: (
      <Layout.Vertical spacing="medium">
        <Text>
          {retrySavingConfirmationMessage}
          {getString('triggers.triggerSaveWithError')}
        </Text>
        <Text>{getString('triggers.triggerCouldNotBeSavedContent')}</Text>
      </Layout.Vertical>
    ),
    action: () => {
      retryFn.current?.()
    }
  })

  const { mutate: createTrigger, loading: createTriggerLoading } = useCreateTrigger({
    queryParams: createUpdateTriggerQueryParams,
    requestOptions: { headers: { 'content-type': 'application/yaml' } }
  })

  const { mutate: updateTrigger, loading: updateTriggerLoading } = useUpdateTrigger({
    triggerIdentifier,
    queryParams: createUpdateTriggerQueryParams,
    requestOptions: { headers: { 'content-type': 'application/yaml' } }
  })

  const {
    data: mergeInputSetResponse,
    refetch: refetchMergeInputSet,
    loading: loadingMergeInputSet
  } = useMutateAsGet(useGetMergeInputSetFromPipelineTemplateWithListInput, {
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      pipelineIdentifier,
      // GitX related query params
      ...gitXQueryParams
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } },
    lazy: true
  })

  const [errorToasterMessage, setErrorToasterMessage] = useState<string>('')

  const { loading: loadingYamlSchema, data: triggerSchema } = useGetSchemaYaml({
    queryParams: {
      entityType: 'Triggers',
      projectIdentifier,
      orgIdentifier,
      accountIdentifier: accountId,
      scope: getScopeFromDTO({
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier
      })
    },
    lazy: !__DEV__
  })
  const { data: triggerStaticSchema, isLoading: loadingStaticYamlSchema } = useGetIndividualStaticSchemaQuery(
    {
      queryParams: {
        node_group: 'trigger'
      }
    },
    {
      enabled: !__DEV__
    }
  )

  useEffect(() => {
    if (isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING)) {
      getPipelineInputs({
        org: orgIdentifier,
        project: projectIdentifier,
        pipeline: pipelineIdentifier,
        queryParams: {
          repo_name: repoIdentifier,
          branch_name: branch,
          connector_ref: pipelineConnectorRef
        }
      })
        .then(response => {
          setPipelineInputs(response.content)
        })
        .catch((err: Error) => setErrorToasterMessage(err.message))
    }
  }, [CI_YAML_VERSIONING])

  const { isGithubWebhookAuthenticationEnabled } = useIsGithubWebhookAuthenticationEnabled()

  const convertFormikValuesToYaml = (values: any): { trigger: TriggerConfigDTO } | undefined => {
    let res
    if (values.triggerType === TriggerTypes.WEBHOOK) {
      res = getWebhookTriggerYaml({ values, persistIncomplete: true })
      // remove invalid values
      if (res?.source?.spec?.spec && !res.source.spec.spec.actions) {
        delete res.source.spec.spec.actions
      }
      if (res?.source?.spec?.spec && !res.source.spec.spec.event) {
        delete res.source.spec.spec.event
      }
    } else if (values.triggerType === TriggerTypes.SCHEDULE) {
      res = getScheduleTriggerYaml({ values })
    } else if (values.triggerType === TriggerTypes.MANIFEST || values.triggerType === TriggerTypes.ARTIFACT) {
      res = getArtifactManifestTriggerYaml({
        values,
        persistIncomplete: true,
        manifestType,
        enabledStatus,
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier,
        gitAwareForTriggerEnabled: isNewGitSyncRemotePipeline,
        isAnyPipelineRuntimeInput
      })
    }

    if (res) {
      if (values.inputSetSelected?.length) {
        res.inputSetRefs = values.inputSetSelected.map((inputSet: InputSetValue) => inputSet.value)
      }

      return { trigger: res }
    }
  }

  const yamlBuilderReadOnlyModeProps: YamlBuilderProps = {
    fileName: `${triggerResponse?.data?.identifier ?? 'Trigger'}.yaml`,
    entityType: 'Triggers',
    width: 'calc(100vw - 350px)',
    height: 'calc(100vh - 280px)',

    yamlSanityConfig: {
      removeEmptyString: false,
      removeEmptyObject: false,
      removeEmptyArray: false
    }
  }

  const [enabledStatus, setEnabledStatus] = useState<boolean>(true)
  const [currentPipeline, setCurrentPipeline] = useState<{ pipeline?: PipelineInfoConfig } | undefined>(undefined)
  const [wizardKey, setWizardKey] = useState<number>(0)
  const [artifactManifestType, setArtifactManifestType] = useState<string | undefined>(undefined)
  const [isMergedPipelineReady, setIsMergedPipelineReady] = useState<boolean>(false)

  const [onEditInitialValues, setOnEditInitialValues] = useState<
    | FlatOnEditValuesInterface
    | {
        triggerType: TriggerType
        pipeline?: PipelineInfoConfig | Record<string, never>
        originalPipeline?: PipelineInfoConfig
        resolvedPipeline?: PipelineInfoConfig
        identifier?: string
        connectorRef?: { identifier?: string; scope?: string }
        inputSetTemplateYamlObj?: {
          pipeline: PipelineInfoConfig | Record<string, never>
        }
        stagesToExecute?: string[]
      }
  >({ triggerType: triggerTypeOnNew })
  const isCreatingNewTrigger = useMemo(() => !onEditInitialValues?.identifier, [onEditInitialValues?.identifier])

  const { openDialog, closeDialog } = useConfirmationDialog({
    contentText: getString('triggers.updateTriggerDetails'),
    intent: Intent.WARNING,
    titleText: getString('triggers.updateTrigger'),
    customButtons: (
      <>
        <Button variation={ButtonVariation.PRIMARY} text={getString('close')} onClick={() => closeDialog()} />
      </>
    )
  })

  const originalPipeline: PipelineInfoConfig | undefined =
    memoizedParse<Pipeline>((pipelineResponse?.data?.yamlPipeline as any) || '')?.pipeline ?? {}

  useEffect(() => {
    setResolvedPipeline(
      yamlParse<Pipeline>(defaultTo(pipelineResponse?.data?.resolvedTemplatesPipelineYaml, ''))?.pipeline
    )
  }, [pipelineResponse?.data?.resolvedTemplatesPipelineYaml])

  const { loadingResolvedChildPipeline, resolvedMergedPipeline } = useGetResolvedChildPipeline(
    {
      accountId,
      repoIdentifier: defaultTo(pipelineRepoName, repoIdentifier),
      branch,
      connectorRef: pipelineConnectorRef
    },
    originalPipeline,
    resolvedPipeline
  )

  const shouldRenderWizard = useMemo(() => {
    return (
      !loadingGetTrigger &&
      !fetchingTemplate &&
      !loadingPipeline &&
      !loadingResolvedChildPipeline &&
      !loadingMergeInputSet
    )
  }, [loadingGetTrigger, fetchingTemplate, loadingPipeline, loadingResolvedChildPipeline, loadingMergeInputSet])

  useDeepCompareEffect(() => {
    if (template?.data?.inputSetTemplateYaml !== undefined) {
      if (onEditInitialValues?.pipeline && !isMergedPipelineReady) {
        let newOnEditPipeline = merge(
          parse(template?.data?.inputSetTemplateYaml)?.pipeline,
          onEditInitialValues.pipeline || {}
        )

        /*this check is needed as when trigger is already present with 1 stage and then tries to add parallel stage,
      we need to have correct yaml with both stages as a part of parallel*/
        if (
          newOnEditPipeline?.stages?.some((stages: { stage: any; parallel: any }) => stages?.stage && stages?.parallel)
        ) {
          openDialog() // give warning to update trigger
          newOnEditPipeline = parse(template?.data?.inputSetTemplateYaml)?.pipeline
        }

        const newPipeline = clearRuntimeInput(newOnEditPipeline)
        setOnEditInitialValues({
          ...onEditInitialValues,
          pipeline: newPipeline as unknown as PipelineInfoConfig
        })
        if (!isMergedPipelineReady) {
          setCurrentPipeline({ pipeline: newPipeline }) // will reset initialValues
          setIsMergedPipelineReady(true)
        }
      } else if (!isMergedPipelineReady) {
        const inpuSet = clearRuntimeInput(memoizedParse<Pipeline>(template?.data?.inputSetTemplateYaml).pipeline)
        const newPipeline = mergeTemplateWithInputSetData({
          inputSetPortion: { pipeline: inpuSet },
          templatePipeline: { pipeline: inpuSet },
          allValues: { pipeline: defaultTo(resolvedMergedPipeline, {} as PipelineInfoConfig) },
          shouldUseDefaultValues: true
        })
        setCurrentPipeline(newPipeline)
      }
    }
  }, [template?.data?.inputSetTemplateYaml, onEditInitialValues?.pipeline, resolvedMergedPipeline])

  useEffect(() => {
    if (triggerResponse?.data?.enabled === false) {
      setEnabledStatus(false)
    }
  }, [triggerResponse?.data?.enabled])

  useEffect(() => {
    if (triggerResponse?.data?.yaml) {
      try {
        const triggerResponseJson = parse(triggerResponse.data.yaml)
        if (triggerResponseJson.trigger.inputYaml) {
          refetchMergeInputSet({
            body: {
              lastYamlToMerge: triggerResponseJson.trigger.inputYaml,
              withMergedPipelineYaml: true
            }
          })
        }
      } catch (e) {
        setErrorToasterMessage(getString('triggers.cannotParseTriggersData'))
      }
    }
  }, [triggerResponse?.data?.yaml])

  useEffect(() => {
    if (mergeInputSetResponse?.data?.pipelineYaml) {
      try {
        const pipeline = parse(mergeInputSetResponse.data.pipelineYaml)?.pipeline
        setOnEditInitialValues(oldOnEditInitialValues => ({
          ...oldOnEditInitialValues,
          pipeline: clearRuntimeInput(pipeline)
        }))
      } catch (error) {
        setErrorToasterMessage(getString('triggers.cannotParseTriggersData'))
      }
    }
  }, [mergeInputSetResponse?.data?.pipelineYaml])

  useEffect(() => {
    if (triggerResponse?.data?.yaml && triggerResponse.data.type === TriggerTypes.WEBHOOK) {
      const newOnEditInitialValues = getWebhookTriggerValues({
        triggerResponseYaml: triggerResponse.data.yaml
      })

      setOnEditInitialValues({
        ...onEditInitialValues,
        ...newOnEditInitialValues
      })
    } else if (triggerResponse?.data?.yaml && triggerResponse.data.type === TriggerTypes.SCHEDULE) {
      const newOnEditInitialValues = getScheduleTriggerValues({
        triggerResponseYaml: triggerResponse.data.yaml
      })
      setOnEditInitialValues({
        ...onEditInitialValues,
        ...newOnEditInitialValues
      })
    } else if (
      triggerResponse?.data?.yaml &&
      (triggerResponse.data.type === TriggerTypes.MANIFEST || triggerResponse.data.type === TriggerTypes.ARTIFACT)
    ) {
      const newOnEditInitialValues = getArtifactTriggerValues({
        triggerResponseYaml: triggerResponse?.data?.yaml
      })
      setOnEditInitialValues({
        ...onEditInitialValues,
        ...newOnEditInitialValues
      })
    }
  }, [triggerIdentifier, triggerResponse, template])

  const returnToTriggersPage = (): void => {
    history.push(
      routes.toTriggersPage({
        accountId,
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier,
        module,
        repoIdentifier,
        connectorRef: pipelineConnectorRef,
        repoName: pipelineRepoName,
        branch,
        storeType
      })
    )
  }
  const { showSuccess } = useToaster()

  const getWebhookTriggerYaml = ({
    values: val,
    persistIncomplete = false
  }: {
    values: FlatValidWebhookFormikValuesInterface
    persistIncomplete?: boolean
  }): TriggerConfigDTO => {
    const {
      name = '',
      identifier,
      description = '',
      tags,
      stagesToExecute,
      pipeline: pipelineRuntimeInput,
      pipelineOverride,
      sourceRepo: formikValueSourceRepo,
      triggerType: formikValueTriggerType,
      repoName,
      connectorRef,
      event = '',
      actions,
      sourceBranchOperator,
      sourceBranchValue,
      targetBranchOperator,
      targetBranchValue,
      changedFilesOperator,
      changedFilesValue,
      tagConditionOperator,
      tagConditionValue,
      headerConditions = [],
      payloadConditions = [],
      jexlCondition,
      autoAbortPreviousExecutions = false,
      pipelineBranchName = getDefaultPipelineReferenceBranch(formikValueTriggerType, event),
      pollInterval,
      webhookId,
      encryptedWebhookSecretIdentifier
    } = val
    const inputSetRefs = get(
      val,
      'inputSetRefs',
      get(val, 'inputSetSelected', []).map((_inputSet: InputSetValue) => _inputSet.value)
    )
    const referenceString =
      typeof encryptedWebhookSecretIdentifier === 'string'
        ? encryptedWebhookSecretIdentifier
        : encryptedWebhookSecretIdentifier?.referenceString ?? ''

    const stringifyPipelineRuntimeInput = yamlStringify({
      pipeline: clearNullUndefined(pipelineRuntimeInput)
    })

    const execStages = val?.resolvedPipeline?.allowStageExecutions ? stagesToExecute : []

    if (formikValueSourceRepo !== GitSourceProviders.Custom.value) {
      if (
        ((targetBranchOperator && targetBranchValue?.trim()) ||
          (persistIncomplete && (targetBranchOperator || targetBranchValue?.trim()))) &&
        !payloadConditions.some(pc => pc.key === PayloadConditionTypes.TARGET_BRANCH) &&
        event !== eventTypes.TAG
      ) {
        payloadConditions.unshift({
          key: PayloadConditionTypes.TARGET_BRANCH,
          operator: targetBranchOperator || '',
          value: targetBranchValue || ''
        })
      }
      if (
        ((sourceBranchOperator && sourceBranchValue?.trim()) ||
          (persistIncomplete && (sourceBranchOperator || sourceBranchValue?.trim()))) &&
        !payloadConditions.some((pc: AddConditionInterface) => pc.key === PayloadConditionTypes.SOURCE_BRANCH) &&
        event !== eventTypes.PUSH &&
        event !== eventTypes.TAG
      ) {
        payloadConditions.unshift({
          key: PayloadConditionTypes.SOURCE_BRANCH,
          operator: sourceBranchOperator || '',
          value: sourceBranchValue || ''
        })
      }
      if (
        ((changedFilesOperator && changedFilesValue?.trim()) ||
          (persistIncomplete && (changedFilesOperator || changedFilesValue?.trim()))) &&
        !payloadConditions.some((pc: AddConditionInterface) => pc.key === PayloadConditionTypes.CHANGED_FILES) &&
        event !== eventTypes.TAG
      ) {
        payloadConditions.unshift({
          key: PayloadConditionTypes.CHANGED_FILES,
          operator: changedFilesOperator || '',
          value: changedFilesValue || ''
        })
      }
      if (
        ((tagConditionOperator && tagConditionValue?.trim()) ||
          (persistIncomplete && (tagConditionOperator || tagConditionValue?.trim()))) &&
        !payloadConditions.some((pc: AddConditionInterface) => pc.key === PayloadConditionTypes.TAG) &&
        event === eventTypes.TAG
      ) {
        payloadConditions.unshift({
          key: PayloadConditionTypes.TAG,
          operator: tagConditionOperator || '',
          value: tagConditionValue || ''
        })
      }

      // actions will be required thru validation
      const actionsValues = (actions as unknown as SelectOption[])?.map(action => action.value)
      const triggerYaml: NGTriggerConfigV2 = {
        name,
        identifier,
        enabled: enabledStatus,
        ...(formikValueSourceRepo === GitSourceProviders.Github.value && {
          encryptedWebhookSecretIdentifier: referenceString
        }),
        description,
        tags,
        orgIdentifier,
        stagesToExecute: execStages,
        projectIdentifier,
        pipelineIdentifier,
        source: {
          type: formikValueTriggerType,
          pollInterval,
          webhookId,
          spec: {
            type: formikValueSourceRepo, // Github
            spec: {
              type: event,
              spec: {
                connectorRef: connectorRef?.value || '',
                autoAbortPreviousExecutions
              }
            }
          }
        },
        pipelineBranchName: isNewGitSyncRemotePipeline ? pipelineBranchName : null,
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
      } as NGTriggerConfigV2
      if (triggerYaml.source?.spec?.spec) {
        triggerYaml.source.spec.spec.spec.payloadConditions = persistIncomplete
          ? payloadConditions
          : payloadConditions.filter(payloadCondition => isRowFilled(payloadCondition))

        triggerYaml.source.spec.spec.spec.headerConditions = persistIncomplete
          ? headerConditions
          : headerConditions.filter(headerCondition => isRowFilled(headerCondition))

        if (jexlCondition) {
          triggerYaml.source.spec.spec.spec.jexlCondition = jexlCondition
        }

        if (repoName) {
          triggerYaml.source.spec.spec.spec.repoName = repoName
        } else if (connectorRef?.connector?.spec?.type === connectorUrlType.ACCOUNT) {
          triggerYaml.source.spec.spec.spec.repoName = ''
        }
        if (actionsValues) {
          triggerYaml.source.spec.spec.spec.actions = actionsValues
        }
      }
      return clearNullUndefined(triggerYaml)
    } else {
      const triggerYaml: NGTriggerConfigV2 = {
        name,
        identifier,
        enabled: enabledStatus,
        description,
        tags,
        stagesToExecute: execStages,
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier,
        source: {
          type: formikValueTriggerType,
          spec: {
            type: formikValueSourceRepo, // Custom
            spec: {
              payloadConditions: []
            }
          }
        },
        pipelineBranchName: isNewGitSyncRemotePipeline ? pipelineBranchName : null,
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
      } as NGTriggerConfigV2

      if (triggerYaml.source?.spec) {
        triggerYaml.source.spec.spec.payloadConditions = persistIncomplete
          ? payloadConditions
          : payloadConditions.filter(payloadCondition => isRowFilled(payloadCondition))
      }

      if (triggerYaml.source?.spec) {
        triggerYaml.source.spec.spec.headerConditions = persistIncomplete
          ? headerConditions
          : headerConditions.filter(headerCondition => isRowFilled(headerCondition))
      }

      if (jexlCondition && triggerYaml.source?.spec) {
        triggerYaml.source.spec.spec.jexlCondition = jexlCondition
      }

      if (triggerYaml?.source?.spec && isEmpty(triggerYaml.source.spec.spec)) {
        delete triggerYaml.source.spec.spec
      }

      return clearNullUndefined(triggerYaml)
    }
  }

  const getWebhookTriggerValues = ({
    triggerResponseYaml,
    triggerYaml
  }: {
    triggerResponseYaml?: string
    triggerYaml?: { trigger: NGTriggerConfigV2 }
  }): FlatOnEditValuesInterface | undefined => {
    // triggerResponseYaml comes from onEdit render, triggerYaml comes from visualYaml toggle
    let triggerValues: FlatOnEditValuesInterface | undefined

    if (triggerYaml && triggerYaml?.trigger?.enabled === false) {
      setEnabledStatus(false)
    } else if (triggerYaml && triggerYaml?.trigger?.enabled === true) {
      setEnabledStatus(true)
    }
    try {
      const triggerResponseJson = triggerResponseYaml ? parse(triggerResponseYaml) : triggerYaml

      if (triggerResponseJson?.trigger?.source?.spec?.type !== GitSourceProviders.Custom.value) {
        // non-custom flow #github | gitlab | bitbucket
        const {
          trigger: {
            name,
            identifier,
            stagesToExecute,
            description,
            tags,
            inputYaml,
            inputSetRefs,
            source: {
              pollInterval,
              webhookId,
              spec: {
                type: sourceRepo,
                spec: {
                  type: event,
                  spec: {
                    actions,
                    connectorRef,
                    repoName,
                    payloadConditions,
                    headerConditions,
                    jexlCondition,
                    autoAbortPreviousExecutions = false
                  }
                }
              }
            },
            pipelineBranchName = getDefaultPipelineReferenceBranch(TriggerTypes.WEBHOOK, event),
            encryptedWebhookSecretIdentifier
          }
        } = triggerResponseJson

        const { value: sourceBranchValue, operator: sourceBranchOperator } =
          payloadConditions?.find(
            (payloadCondition: AddConditionInterface) => payloadCondition.key === PayloadConditionTypes.SOURCE_BRANCH
          ) || {}
        const { value: targetBranchValue, operator: targetBranchOperator } =
          payloadConditions?.find(
            (payloadCondition: AddConditionInterface) => payloadCondition.key === PayloadConditionTypes.TARGET_BRANCH
          ) || {}
        const { value: changedFilesValue, operator: changedFilesOperator } =
          payloadConditions?.find(
            (payloadCondition: AddConditionInterface) => payloadCondition.key === PayloadConditionTypes.CHANGED_FILES
          ) || {}
        const { value: tagConditionValue, operator: tagConditionOperator } =
          payloadConditions?.find(
            (payloadCondition: AddConditionInterface) => payloadCondition.key === PayloadConditionTypes.TAG
          ) || {}

        let pipelineJson = undefined
        let pipelineOverride = undefined

        if (inputYaml) {
          try {
            pipelineJson = parse(inputYaml)?.pipeline
            // Ensure ordering of variables and their values respectively for UI
            if (pipelineJson?.variables) {
              pipelineJson.variables = getOrderedPipelineVariableValues({
                originalPipelineVariables: resolvedMergedPipeline?.variables,
                currentPipelineVariables: pipelineJson.variables
              })
            }
            // Add inputYaml from from yaml to pipelineOverride to override input sets values
            // As of now Pipeline inputs override is possible only from yaml view
            if (inputSetRefs?.length) {
              pipelineOverride = pipelineJson
            }
          } catch (e) {
            // set error
            setErrorToasterMessage(getString('triggers.cannotParseInputValues'))
          }
        } else {
          pipelineJson = clearRuntimeInput(yamlTemplate)
        }

        triggerValues = {
          name,
          identifier,
          description,
          stagesToExecute,
          tags,
          ...(sourceRepo === GitSourceProviders.Github.value && { encryptedWebhookSecretIdentifier }),
          pipeline: pipelineJson,
          pipelineOverride,
          sourceRepo,
          triggerType: 'Webhook',
          event,
          pollInterval,
          webhookId,
          autoAbortPreviousExecutions,
          connectorRef,
          repoName,
          actions: (actions || []).map((action: string) => ({
            label: action,
            value: action
          })),
          anyAction: (actions || []).length === 0,
          sourceBranchOperator,
          sourceBranchValue,
          targetBranchOperator,
          targetBranchValue,
          changedFilesOperator,
          changedFilesValue,
          tagConditionOperator,
          tagConditionValue,
          headerConditions,
          payloadConditions: payloadConditions?.filter(
            (payloadCondition: AddConditionInterface) =>
              payloadCondition.key !== PayloadConditionTypes.SOURCE_BRANCH &&
              payloadCondition.key !== PayloadConditionTypes.TARGET_BRANCH &&
              payloadCondition.key !== PayloadConditionTypes.CHANGED_FILES &&
              payloadCondition.key !== PayloadConditionTypes.TAG
          ),
          jexlCondition,
          pipelineBranchName,
          inputSetRefs
        }

        // connectorRef in Visual UI is an object (with the label), but in YAML is a string
        if (triggerValues?.connectorRef && typeof triggerValues.connectorRef === 'string') {
          const connectorRefWithBlankLabel: ConnectorRefInterface = {
            value: triggerValues.connectorRef,
            identifier: triggerValues.connectorRef
          }

          if (triggerYaml && connectorData?.data?.connector?.name) {
            const { connector } = connectorData.data

            connectorRefWithBlankLabel.connector = connector
            connectorRefWithBlankLabel.connector.identifier = triggerValues.connectorRef

            connectorRefWithBlankLabel.label = connectorData.data.connector.name
          }

          triggerValues.connectorRef = connectorRefWithBlankLabel

          const connectorParams: GetConnectorQueryParams = {
            accountIdentifier: accountId
          }
          if (triggerValues?.connectorRef?.value) {
            if (getScopeFromValue(triggerValues.connectorRef?.value) === Scope.ORG) {
              connectorParams.orgIdentifier = orgIdentifier
            } else if (getScopeFromValue(triggerValues.connectorRef?.value) === Scope.PROJECT) {
              connectorParams.orgIdentifier = orgIdentifier
              connectorParams.projectIdentifier = projectIdentifier
            }

            setConnectorScopeParams(connectorParams)
          }
        }

        return triggerValues
      } else {
        // custom webhook flow
        const {
          trigger: {
            name,
            identifier,
            stagesToExecute,
            description,
            tags,
            inputYaml,
            pipelineBranchName = getDefaultPipelineReferenceBranch(),
            inputSetRefs,
            source: {
              spec: {
                type: sourceRepo,
                spec: { payloadConditions, headerConditions, jexlCondition }
              }
            }
          }
        } = triggerResponseJson

        let pipelineJson = undefined
        let pipelineOverride = undefined

        if (inputYaml) {
          try {
            pipelineJson = parse(inputYaml)?.pipeline
            // Ensure ordering of variables and their values respectively for UI
            if (pipelineJson?.variables) {
              pipelineJson.variables = getOrderedPipelineVariableValues({
                originalPipelineVariables: resolvedMergedPipeline?.variables,
                currentPipelineVariables: pipelineJson.variables
              })
            }
            // Add inputYaml from from yaml to pipelineOverride to override input sets values
            // As of now Pipeline inputs override is possible only from yaml view
            if (inputSetRefs?.length) {
              pipelineOverride = pipelineJson
            }
          } catch (e) {
            // set error
            setErrorToasterMessage(getString('triggers.cannotParseInputValues'))
          }
        } else {
          pipelineJson = clearRuntimeInput(yamlTemplate)
        }

        triggerValues = {
          name,
          identifier,
          description,
          stagesToExecute,
          tags,
          pipeline: pipelineJson,
          pipelineOverride,
          sourceRepo,
          triggerType: 'Webhook',
          headerConditions,
          payloadConditions,
          jexlCondition,
          pipelineBranchName,
          inputSetRefs
        }

        return triggerValues
      }
    } catch (e) {
      // set error
      setErrorToasterMessage(getString('triggers.cannotParseTriggersData'))
    }

    return triggerValues
  }

  const getScheduleTriggerValues = ({
    triggerResponseYaml,
    triggerYaml
  }: {
    triggerResponseYaml?: string
    triggerYaml?: { trigger: NGTriggerConfigV2 }
  }): FlatOnEditValuesInterface | undefined => {
    let newOnEditInitialValues: FlatOnEditValuesInterface | undefined
    try {
      const triggerResponseJson = triggerYaml ? triggerYaml : triggerResponseYaml ? parse(triggerResponseYaml) : {}
      const {
        trigger: {
          name,
          identifier,
          description,
          stagesToExecute,
          tags,
          inputYaml,
          pipelineBranchName = getDefaultPipelineReferenceBranch(),
          inputSetRefs,
          source: {
            spec: {
              spec: { expression, type }
            }
          }
        }
      } = triggerResponseJson

      let pipelineJson = undefined
      let pipelineOverride = undefined

      if (inputYaml) {
        try {
          pipelineJson = parse(inputYaml)?.pipeline
          // Ensure ordering of variables and their values respectively for UI
          if (pipelineJson?.variables) {
            pipelineJson.variables = getOrderedPipelineVariableValues({
              originalPipelineVariables: resolvedMergedPipeline?.variables,
              currentPipelineVariables: pipelineJson.variables
            })
          }
          // Add inputYaml from from yaml to pipelineOverride to override input sets values
          // As of now Pipeline inputs override is possible only from yaml view
          if (inputSetRefs?.length) {
            pipelineOverride = pipelineJson
          }
        } catch (e) {
          // set error
          setErrorToasterMessage(getString('triggers.cannotParseInputValues'))
        }
      } else {
        pipelineJson = clearRuntimeInput(yamlTemplate)
      }
      const expressionBreakdownValues = getBreakdownValues(expression)
      const newExpressionBreakdown = {
        ...resetScheduleObject,
        ...expressionBreakdownValues
      }
      newOnEditInitialValues = {
        name,
        identifier,
        description,
        stagesToExecute,
        tags,
        pipeline: pipelineJson,
        pipelineOverride,
        triggerType: 'Scheduled',
        expression,
        pipelineBranchName,
        inputSetRefs,
        cronFormat: type,
        ...newExpressionBreakdown,
        selectedScheduleTab: scheduleTabsId.CUSTOM // only show CUSTOM on edit
      }
      return newOnEditInitialValues
    } catch (e) {
      // set error
      setErrorToasterMessage(getString('triggers.cannotParseTriggersData'))
    }
  }

  const getArtifactTriggerValues = ({
    triggerResponseYaml,
    triggerYaml
  }: {
    triggerResponseYaml?: string
    triggerYaml?: { trigger: NGTriggerConfigV2 }
  }): FlatOnEditValuesInterface | undefined => {
    let newOnEditInitialValues: FlatOnEditValuesInterface | undefined
    try {
      const triggerResponseJson = triggerYaml ? triggerYaml : triggerResponseYaml ? parse(triggerResponseYaml) : {}
      const {
        trigger: {
          name,
          identifier,
          description,
          tags,
          inputYaml,
          pipelineBranchName = getDefaultPipelineReferenceBranch(),
          inputSetRefs,
          source: { type },
          source
        }
      } = triggerResponseJson

      let selectedArtifact
      let triggerType: TriggerType

      if (type === TriggerTypes.MANIFEST) {
        const { manifestRef, type: _manifestType, spec } = source?.spec || {}
        if (_manifestType) {
          setArtifactManifestType(_manifestType)
        }
        triggerType = 'Manifest'
        selectedArtifact = {
          identifier: manifestRef,
          type: artifactManifestType || _manifestType,
          spec
        }
      } else if (type === TriggerTypes.ARTIFACT) {
        const { artifactRef, type: _artifactType, spec } = source?.spec || {}
        if (_artifactType) {
          setArtifactManifestType(_artifactType)
        }
        triggerType = 'Artifact'
        selectedArtifact = {
          identifier: artifactRef,
          type: artifactManifestType || _artifactType,
          spec
        }
      }

      let pipelineJson = undefined
      let pipelineOverride = undefined

      if (inputYaml) {
        try {
          pipelineJson = parse(inputYaml)?.pipeline
          // Ensure ordering of variables and their values respectively for UI
          if (pipelineJson?.variables) {
            pipelineJson.variables = getOrderedPipelineVariableValues({
              originalPipelineVariables: resolvedMergedPipeline?.variables,
              currentPipelineVariables: pipelineJson.variables
            })
          }
          // Add inputYaml from from yaml to pipelineOverride to override input sets values
          // As of now Pipeline inputs override is possible only from yaml view
          if (inputSetRefs?.length) {
            pipelineOverride = pipelineJson
          }
        } catch (e) {
          // set error
          setErrorToasterMessage(getString('triggers.cannotParseInputValues'))
        }
      } else {
        pipelineJson = clearRuntimeInput(yamlTemplate)
      }
      const eventConditions = source?.spec?.spec?.eventConditions || []
      const metaDataConditions = source?.spec?.spec?.metaDataConditions || []
      const jexlCondition = source?.spec?.spec?.jexlCondition
      const { value: versionValue, operator: versionOperator } =
        eventConditions?.find(
          (eventCondition: AddConditionInterface) => eventCondition.key === EventConditionTypes.VERSION
        ) || {}
      const { value: buildValue, operator: buildOperator } =
        eventConditions?.find(
          (eventCondition: AddConditionInterface) => eventCondition.key === EventConditionTypes.BUILD
        ) || {}

      newOnEditInitialValues = {
        name,
        identifier,
        description,
        tags,
        pipeline: pipelineJson,
        pipelineOverride,
        triggerType: triggerType,
        manifestType: selectedArtifact?.type,
        stageId: source?.spec?.stageIdentifier,
        inputSetTemplateYamlObj: parse(template?.data?.inputSetTemplateYaml || ''),
        pipelineBranchName,
        inputSetRefs,
        selectedArtifact,
        versionValue,
        versionOperator,
        buildValue,
        buildOperator,
        eventConditions: eventConditions?.filter(
          (eventCondition: AddConditionInterface) =>
            eventCondition.key !== EventConditionTypes.BUILD && eventCondition.key !== EventConditionTypes.VERSION
        ),
        metaDataConditions,
        jexlCondition
      }
      if (type === TriggerTypes.ARTIFACT) {
        delete newOnEditInitialValues['manifestType']
        newOnEditInitialValues.artifactType = selectedArtifact?.type
      }
      return newOnEditInitialValues
    } catch (e) {
      // set error
      setErrorToasterMessage(getString('triggers.cannotParseTriggersData'))
    }
  }
  const getScheduleTriggerYaml = ({
    values: val
  }: {
    values: FlatValidScheduleFormikValuesInterface
  }): TriggerConfigDTO => {
    const {
      name,
      identifier,
      stagesToExecute,
      description,
      tags,
      pipeline: pipelineRuntimeInput,
      pipelineOverride,
      triggerType: formikValueTriggerType,
      expression,
      cronFormat,
      pipelineBranchName = getDefaultPipelineReferenceBranch()
    } = val
    const inputSetRefs = get(
      val,
      'inputSetRefs',
      get(val, 'inputSetSelected', []).map((_inputSet: InputSetValue) => _inputSet.value)
    )

    // actions will be required thru validation
    const stringifyPipelineRuntimeInput = yamlStringify({
      pipeline: clearNullUndefined(pipelineRuntimeInput)
    })
    const execStages = val?.resolvedPipeline?.allowStageExecutions ? stagesToExecute : []

    return clearNullUndefined({
      name,
      identifier,
      stagesToExecute: execStages,
      enabled: enabledStatus,
      description,
      tags,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      source: {
        type: formikValueTriggerType,
        spec: {
          type: scheduledTypes.CRON,
          spec: {
            type: cronFormat,
            expression
          }
        }
      },
      pipelineBranchName: isNewGitSyncRemotePipeline ? pipelineBranchName : undefined,
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
    })
  }

  const [formErrors, setFormErrors] = useState<FormikErrors<FlatValidFormikValuesInterface>>({})
  const formikRef = useRef<FormikProps<any>>()

  // Fix https://harness.atlassian.net/browse/CI-3411
  useEffect(() => {
    if (Object.keys(formErrors || {}).length > 0) {
      Object.entries({
        ...flattenKeys(omit(formErrors, ['pipelineBranchName', 'inputSetRefs'])),
        pipelineBranchName: get(formErrors, 'pipelineBranchName'),
        inputSetRefs: get(formErrors, 'inputSetRefs')
      }).forEach(([fieldName, fieldError]) => {
        formikRef?.current?.setFieldTouched(fieldName, true, true)
        setTimeout(() => formikRef?.current?.setFieldError(fieldName, fieldError), 0)
      })
    }
  }, [formErrors, formikRef])

  const yamlTemplate = useMemo(() => {
    return parse(defaultTo(template?.data?.inputSetTemplateYaml, ''))?.pipeline
  }, [template?.data?.inputSetTemplateYaml])

  const isAnyPipelineRuntimeInput = !isEmpty(yamlTemplate)

  const getFormErrors = async ({
    latestPipeline,
    latestYamlTemplate,
    orgPipeline,
    setSubmitting,
    stagesToExecute
  }: {
    latestPipeline: { pipeline: PipelineInfoConfig }
    latestYamlTemplate: PipelineInfoConfig
    orgPipeline: PipelineInfoConfig | undefined
    setSubmitting: (bool: boolean) => void
    stagesToExecute?: string[]
  }): Promise<any> => {
    let errors = formErrors
    function validateErrors(): Promise<
      FormikErrors<
        | FlatValidArtifactFormikValuesInterface
        | FlatValidWebhookFormikValuesInterface
        | FlatValidScheduleFormikValuesInterface
      >
    > {
      return new Promise(resolve => {
        try {
          const validatedErrors =
            (validatePipeline({
              pipeline: { ...clearRuntimeInput(latestPipeline.pipeline) },
              template: latestYamlTemplate,
              originalPipeline: orgPipeline,
              resolvedPipeline: resolvedMergedPipeline,
              getString,
              viewType: StepViewType.TriggerForm,
              viewTypeMetadata: { isTrigger: true },
              stagesToExecute
            }) as any) || formErrors
          resolve(validatedErrors)
        } catch (e) {
          setErrorToasterMessage(getString('triggers.cannotParseTriggersYaml'))
          setSubmitting(false)
        }
      })
    }
    if (latestPipeline?.pipeline && latestYamlTemplate && orgPipeline) {
      errors = await validateErrors()

      setFormErrors(errors)
    }
    return errors
  }

  const retryTriggerSubmit = useCallback(({ message }: ResponseNGTriggerResponseWithMessage) => {
    retryFn.current = () => {
      setIgnoreError(true)
      formikRef.current?.handleSubmit()
    }
    setRetrySavingConfirmation(message || getString('triggers.triggerCouldNotBeSavedGenericError'))
    confirmIgnoreErrorAndResubmit()
  }, [])

  // TriggerConfigDTO is NGTriggerConfigV2 with optional identifier
  const submitTrigger = async (triggerYaml: NGTriggerConfigV2 | TriggerConfigDTO): Promise<void> => {
    setErrorToasterMessage('')

    if (isNewGitSyncRemotePipeline) {
      // Set pipelineBranchName to proper expression when it's left empty
      if (!(triggerYaml.pipelineBranchName || '').trim()) {
        triggerYaml.pipelineBranchName = getDefaultPipelineReferenceBranch(
          triggerYaml?.source?.type,
          triggerYaml?.source?.spec?.spec?.type
        )
      }
    }

    if (!isCreatingNewTrigger) {
      try {
        const { status, data, message } = (await updateTrigger(
          yamlStringify({ trigger: clearNullUndefined(triggerYaml) }) as any
        )) as ResponseNGTriggerResponseWithMessage

        if (status === ResponseStatus.ERROR) {
          retryTriggerSubmit({ message })
        } else if (data?.errors && !isEmpty(data?.errors)) {
          const displayErrors = displayPipelineIntegrityResponse(data.errors)
          setFormErrors(displayErrors)

          return
        } else if (status === ResponseStatus.SUCCESS) {
          showSuccess(
            getString('triggers.toast.successfulUpdate', {
              name: data?.name
            })
          )
          history.push(
            routes.toTriggersPage({
              accountId,
              orgIdentifier,
              projectIdentifier,
              pipelineIdentifier,
              module,
              repoIdentifier,
              connectorRef: pipelineConnectorRef,
              repoName: pipelineRepoName,
              branch,
              storeType
            })
          )
        }
      } catch (err) {
        if (err?.data?.status === ResponseStatus.ERROR) {
          retryTriggerSubmit({ message: getErrorMessage(err?.data) || getString('triggers.retryTriggerSave') })
        } else {
          setErrorToasterMessage(getErrorMessage(err))
        }
      } finally {
        setIgnoreError(false)
      }
      // error flow sent to Wizard
    } else {
      try {
        const { status, data, message } = (await createTrigger(
          yamlStringify({ trigger: clearNullUndefined(triggerYaml) }) as any
        )) as ResponseNGTriggerResponseWithMessage

        if (status === ResponseStatus.ERROR) {
          retryTriggerSubmit({ message })
        } else if (data?.errors && !isEmpty(data?.errors)) {
          const displayErrors = displayPipelineIntegrityResponse(data.errors)
          setFormErrors(displayErrors)

          return
        } else if (status === ResponseStatus.SUCCESS) {
          showSuccess(
            getString('triggers.toast.successfulCreate', {
              name: data?.name,
              enabled: data?.enabled ? getString('triggers.enabled') : getString('triggers.disabled')
            })
          )
          history.push(
            routes.toTriggersPage({
              accountId,
              orgIdentifier,
              projectIdentifier,
              pipelineIdentifier,
              module,
              repoIdentifier,
              connectorRef: pipelineConnectorRef,
              repoName: pipelineRepoName,
              branch,
              storeType
            })
          )
        }
      } catch (err) {
        if (err?.data?.status === ResponseStatus.ERROR) {
          retryTriggerSubmit({ message: getErrorMessage(err?.data) || getString('triggers.retryTriggerSave') })
        } else {
          setErrorToasterMessage(err?.data?.message)
        }
      } finally {
        setIgnoreError(false)
      }
    }
  }

  const handleWebhookSubmit = async (val: FlatValidWebhookFormikValuesInterface): Promise<void> => {
    const triggerYaml = getWebhookTriggerYaml({ values: val })

    submitTrigger(triggerYaml)
  }

  const handleScheduleSubmit = async (val: FlatValidScheduleFormikValuesInterface): Promise<void> => {
    const triggerYaml = getScheduleTriggerYaml({ values: val })
    submitTrigger(triggerYaml)
  }

  const handleArtifactSubmit = async (val: FlatValidArtifactFormikValuesInterface): Promise<void> => {
    const triggerYaml = getArtifactManifestTriggerYaml({
      values: val,
      manifestType,
      enabledStatus,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      gitAwareForTriggerEnabled: isNewGitSyncRemotePipeline,
      isAnyPipelineRuntimeInput
    })
    submitTrigger(triggerYaml)
  }

  const getInitialValues = (triggerType: TriggerType): FlatInitialValuesInterface | any => {
    let newPipeline: any = { ...(currentPipeline?.pipeline || {}) }
    // only applied for CI, Not cloned codebase
    if (
      newPipeline?.template?.templateInputs &&
      isCodebaseFieldsRuntimeInputs(newPipeline.template.templateInputs as PipelineInfoConfig) &&
      resolvedMergedPipeline &&
      !isCloneCodebaseEnabledAtLeastOneStage(resolvedMergedPipeline as PipelineInfoConfig)
    ) {
      newPipeline = getPipelineWithoutCodebaseInputs(newPipeline)
    }
    const inputSetTemplateYamlObj = parse(template?.data?.inputSetTemplateYaml || '')
    if (triggerType === TriggerTypes.WEBHOOK) {
      return {
        triggerType: triggerTypeOnNew,
        sourceRepo: sourceRepoOnNew,
        identifier: '',
        tags: {},
        inputSetTemplateYamlObj,
        ...(sourceRepoOnNew === GitSourceProviders.Github.value && {
          encryptedWebhookSecretIdentifier: '',
          isGithubWebhookAuthenticationEnabled
        }),
        pipeline: newPipeline,
        originalPipeline,
        resolvedPipeline: resolvedMergedPipeline,
        anyAction: false,
        autoAbortPreviousExecutions: false,
        stagesToExecute: newPipeline?.stagesToExecute,
        pipelineBranchName: getDefaultPipelineReferenceBranch(triggerType),
        // setDefaultValue only when polling is enabled and for Github Webhook Trigger
        ...(isGitWebhookPollingEnabled &&
          sourceRepoOnNew === GitSourceProviders.Github.value && { pollInterval: '0', webhookId: '' })
      }
    } else if (triggerType === TriggerTypes.SCHEDULE) {
      return {
        triggerType: triggerTypeOnNew,
        identifier: '',
        inputSetTemplateYamlObj,
        tags: {},
        selectedScheduleTab: scheduleTabsId.MINUTES,
        pipeline: newPipeline,
        originalPipeline,
        resolvedPipeline: resolvedMergedPipeline,
        stagesToExecute: newPipeline?.stagesToExecute,
        pipelineBranchName: getDefaultPipelineReferenceBranch(triggerType) || branch,
        cronFormat: CronFormat.UNIX,
        ...getDefaultExpressionBreakdownValues(scheduleTabsId.MINUTES)
      }
    } else if (isArtifactOrManifestTrigger(triggerType)) {
      return {
        triggerType: triggerTypeOnNew,
        identifier: '',
        tags: {},
        artifactType,
        manifestType,
        pipeline: newPipeline,
        originalPipeline,
        resolvedPipeline: resolvedMergedPipeline,
        inputSetTemplateYamlObj,
        stagesToExecute: newPipeline?.stagesToExecute,
        pipelineBranchName: getDefaultPipelineReferenceBranch(triggerTypeOnNew) || branch,
        selectedArtifact: {}
      }
    }
    return {}
  }
  const [initialValues, setInitialValues] = useState<FlatInitialValuesInterface>(
    Object.assign(getInitialValues(triggerTypeOnNew), onEditInitialValues)
  )

  useEffect(() => {
    let newInitialValues = Object.assign(getInitialValues(triggerTypeOnNew), onEditInitialValues)
    if (onEditInitialValues?.identifier) {
      newInitialValues = newInitialValues?.pipeline?.template
        ? getModifiedTemplateValues(newInitialValues)
        : newInitialValues
    }

    const isGitHubWebhookTrigger = newInitialValues.sourceRepo === GitSourceProviders.Github.value

    if (isGitHubWebhookTrigger) {
      Object.assign(newInitialValues, { isGithubWebhookAuthenticationEnabled })
    }

    setInitialValues(newInitialValues)
  }, [onEditInitialValues, currentPipeline, isGithubWebhookAuthenticationEnabled])

  useEffect(() => {
    const yamlPipeline = pipelineResponse?.data?.yamlPipeline

    if (
      yamlPipeline &&
      resolvedMergedPipeline &&
      ((initialValues && !initialValues.originalPipeline && !initialValues.resolvedPipeline) ||
        (onEditInitialValues?.identifier &&
          !onEditInitialValues.originalPipeline &&
          !onEditInitialValues.resolvedPipeline))
    ) {
      try {
        let newOriginalPipeline = parse(yamlPipeline)?.pipeline
        let newResolvedPipeline: any = resolvedMergedPipeline
        // only applied for CI, Not cloned codebase
        if (
          newOriginalPipeline?.template?.templateInputs &&
          isCodebaseFieldsRuntimeInputs(newOriginalPipeline.template.templateInputs as PipelineInfoConfig) &&
          resolvedMergedPipeline &&
          !isCloneCodebaseEnabledAtLeastOneStage(resolvedMergedPipeline)
        ) {
          const newOriginalPipelineWithoutCodebaseInputs = getPipelineWithoutCodebaseInputs(newOriginalPipeline)
          const newResolvedPipelineWithoutCodebaseInputs = getPipelineWithoutCodebaseInputs(newResolvedPipeline)
          newOriginalPipeline = newOriginalPipelineWithoutCodebaseInputs
          newResolvedPipeline = newResolvedPipelineWithoutCodebaseInputs
        }
        const additionalValues: {
          inputSetTemplateYamlObj?: {
            pipeline: PipelineInfoConfig | Record<string, never>
          }
        } = {}

        if (isArtifactOrManifestTrigger(initialValues?.triggerType)) {
          const inputSetTemplateYamlObj = parse(template?.data?.inputSetTemplateYaml || '')
          additionalValues.inputSetTemplateYamlObj = inputSetTemplateYamlObj
        }

        if (onEditInitialValues?.identifier) {
          const newPipeline = currentPipeline?.pipeline ? currentPipeline.pipeline : onEditInitialValues.pipeline || {}
          setOnEditInitialValues({
            ...onEditInitialValues,
            originalPipeline: newOriginalPipeline,
            resolvedPipeline: newResolvedPipeline,
            pipeline: newPipeline,
            ...additionalValues
          })
        } else {
          setInitialValues({
            ...initialValues,
            originalPipeline: newOriginalPipeline,
            resolvedPipeline: newResolvedPipeline,
            ...additionalValues
          })
        }
      } catch (e) {
        // set error
        setErrorToasterMessage(getString('triggers.cannotParseInputValues'))
      }
    }
  }, [
    pipelineResponse?.data?.yamlPipeline,
    resolvedMergedPipeline,
    onEditInitialValues?.identifier,
    initialValues,
    currentPipeline
  ])

  const {
    data: connectorData,
    refetch: getConnectorDetails,
    loading: loadingConnector
  } = useGetConnector({
    identifier: getIdentifierFromValue(
      wizardKey < 1 // wizardKey >1 means we've reset initialValues cause of Yaml Switching (onEdit or new) and should use those formik values instead
        ? onEditInitialValues?.connectorRef?.identifier || ''
        : initialValues?.connectorRef?.identifier || ''
    ),
    queryParams: connectorScopeParams,
    lazy: true
  })

  const onFormikEffect: FormikEffectProps['onChange'] = ({ formik, prevValues, nextValues }) => {
    formikRef.current = formik

    // Clear Errors Trip when Input Set Refs is changed (from users)
    if (
      formErrors &&
      Object.keys(formErrors).length &&
      nextValues.inputSetRefs?.length &&
      prevValues.inputSetRefs?.length !== nextValues.inputSetRefs?.length
    ) {
      setFormErrors({})
    }

    // Set pipelineBranchName to proper default expression when event is changed
    if (prevValues.event !== nextValues.event) {
      const { triggerType, event, pipelineBranchName } = nextValues
      if (!(pipelineBranchName || '').trim() || isHarnessExpression(pipelineBranchName)) {
        const defaultBranchName = getDefaultPipelineReferenceBranch(triggerType, event)
        if (pipelineBranchName !== defaultBranchName) {
          formik.setFieldValue('pipelineBranchName', defaultBranchName)
        }
      }
    }
  }

  useEffect(() => {
    if (
      onEditInitialValues?.connectorRef?.identifier &&
      !isUndefined(connectorScopeParams) &&
      !connectorData &&
      !loadingConnector
    ) {
      getConnectorDetails()
    } else if (
      initialValues?.connectorRef?.value &&
      (!initialValues.connectorRef.label ||
        connectorData?.data?.connector?.identifier !== initialValues.connectorRef?.connector?.identifier) &&
      !loadingConnector
    ) {
      // need to get label due to switching from yaml to visual
      getConnectorDetails()
    }
  }, [
    onEditInitialValues?.connectorRef?.identifier,
    connectorScopeParams,
    initialValues?.connectorRef,
    loadingConnector
  ])

  useEffect(() => {
    if (connectorData?.data?.connector?.name && onEditInitialValues?.connectorRef?.identifier && wizardKey < 1) {
      // Assigns label on Visual mode for onEdit
      const { connector, status } = connectorData.data
      const connectorRef: ConnectorRefInterface = {
        ...(onEditInitialValues || initialValues).connectorRef,
        label: connector.name,
        connector,
        live: status?.status === 'SUCCESS'
      }
      if (onEditInitialValues?.connectorRef?.identifier) {
        setOnEditInitialValues({ ...onEditInitialValues, connectorRef })
      }
    } else if (connectorData?.data?.connector?.name && initialValues?.connectorRef?.identifier) {
      // means we switched from yaml to visual and need to get the label
      const { connector, status } = connectorData.data
      const connectorRef: ConnectorRefInterface = {
        ...initialValues.connectorRef,
        label: connector.name,
        connector,
        live: status?.status === 'SUCCESS'
      }
      setInitialValues({ ...initialValues, connectorRef })
    }
  }, [
    connectorData?.data?.connector,
    onEditInitialValues?.connectorRef?.identifier,
    initialValues?.connectorRef?.identifier
  ])

  const handleWebhookModeSwitch = (view: SelectedView, yamlHandler?: YamlBuilderHandlerBinding): void => {
    if (view === SelectedView.VISUAL) {
      const yaml = yamlHandler?.getLatestYaml() || /* istanbul ignore next */ ''
      setErrorToasterMessage('')
      try {
        const triggerYaml = parse(yaml)
        setInitialValues({
          ...initialValues,
          ...getWebhookTriggerValues({ triggerYaml })
        })
        setWizardKey(wizardKey + 1)
      } catch (e) {
        setErrorToasterMessage(getString('triggers.cannotParseInputValues'))
      }
    }
  }

  const handleScheduleModeSwitch = (view: SelectedView, yamlHandler?: YamlBuilderHandlerBinding): void => {
    if (view === SelectedView.VISUAL) {
      const yaml = yamlHandler?.getLatestYaml() || /* istanbul ignore next */ ''
      setErrorToasterMessage('')
      try {
        const triggerYaml = parse(yaml)
        setInitialValues({
          ...initialValues,
          ...getScheduleTriggerValues({ triggerYaml })
        })
        setWizardKey(wizardKey + 1)
      } catch (e) {
        setErrorToasterMessage(getString('triggers.cannotParseInputValues'))
      }
    }
  }

  const handleArtifactModeSwitch = (view: SelectedView, yamlHandler?: YamlBuilderHandlerBinding): void => {
    if (view === SelectedView.VISUAL) {
      const yaml = yamlHandler?.getLatestYaml() || /* istanbul ignore next */ ''
      setErrorToasterMessage('')
      try {
        const triggerYaml = parse(yaml)
        setInitialValues({
          ...initialValues,
          ...getArtifactTriggerValues({ triggerYaml })
        })
        setWizardKey(wizardKey + 1)
      } catch (e) {
        setErrorToasterMessage(getString('triggers.cannotParseInputValues'))
      }
    }
  }

  const isTriggerCreatePermission = useIsTriggerCreatePermission()

  const isTriggerRbacDisabled = !isTriggerCreatePermission

  const wizardMap = initialValues.triggerType
    ? getWizardMap({
        triggerType: initialValues.triggerType,
        getString,
        triggerName: initialValues?.name
      })
    : undefined

  const titleWithSwitch = ({ selectedView }: { selectedView: SelectedView }): JSX.Element => (
    <Layout.Horizontal
      spacing="medium"
      style={{
        paddingLeft: 'var(--spacing-xlarge)',
        paddingTop: 'var(--spacing-xsmall)',
        alignItems: 'baseline'
      }}
    >
      <Text color={Color.GREY_800} font={{ weight: 'bold' }} style={{ fontSize: 20 }}>
        {wizardMap?.wizardLabel}{' '}
      </Text>
      {selectedView !== SelectedView.YAML ? (
        <>
          <Switch
            style={{ paddingLeft: '46px' }}
            label={getString('enabledLabel')}
            disabled={isTriggerRbacDisabled}
            data-name="enabled-switch"
            key={Date.now()}
            checked={enabledStatus}
            onChange={() => setEnabledStatus(!enabledStatus)}
          />
        </>
      ) : null}
    </Layout.Horizontal>
  )
  const ConnectorRefRegex = /^.+source\.spec\.spec\.spec\.connectorRef$/
  const invocationMapWebhook: YamlBuilderProps['invocationMap'] = new Map<RegExp, InvocationMapFunction>()

  invocationMapWebhook.set(
    ConnectorRefRegex,

    (_matchingPath: string, _currentYaml: string): Promise<CompletionItemInterface[]> => {
      return new Promise(resolve => {
        const request = getConnectorListV2Promise({
          queryParams: {
            accountIdentifier: accountId,
            orgIdentifier,
            projectIdentifier,
            includeAllConnectorsAvailableAtScope: true
          },
          body: { filterType: 'Connector', categories: ['CODE_REPO'] }
        })
          .then(response => {
            const data =
              response?.data?.content?.map(connector => ({
                label: getConnectorName(connector),
                insertText: getConnectorValue(connector),
                kind: CompletionItemKind.Field
              })) || []
            return data
          })
          .catch((err: Failure) => {
            throw err.message
          })

        resolve(request)
      })
    }
  )

  const renderErrorsStrip = (): JSX.Element => <ErrorsStrip formErrors={formErrors} />

  const getTriggerPipelineValues = (
    triggerYaml: string,
    formikProps: any
  ): { pipeline: PipelineInfoConfig } | undefined => {
    try {
      const triggerResponseJson = parse(triggerYaml)
      try {
        return parse(triggerResponseJson?.trigger.inputYaml || '')
      } catch (e) {
        setErrorToasterMessage(getString('triggers.cannotParseInputYaml'))
        // backend api to provide additional details on submit
        return
      }
    } catch (e) {
      setErrorToasterMessage(getString('triggers.cannotParseTriggersYaml'))
      formikProps.setSubmitting(false)
      e.preventDefault()
      // backend api to provide additional details on submit
      return
    }
  }

  const validateTriggerPipeline = async ({
    formikProps,
    latestYaml: triggerYaml
  }: {
    formikProps: FormikProps<any>
    latestYaml?: string
  }): Promise<FormikErrors<FlatValidWebhookFormikValuesInterface>> => {
    if (!formikProps) return {}
    let _pipelineBranchNameError = ''
    let _inputSetRefsError = ''
    let parsedTriggerYaml

    try {
      parsedTriggerYaml = parse(triggerYaml || '')
    } catch (e) {
      setErrorToasterMessage(getString('triggers.cannotParseInputValues'))
    }

    if (isNewGitSyncRemotePipeline) {
      // Custom validation when pipeline Reference Branch Name is an expression for non-webhook triggers
      if (formikProps?.values?.triggerType !== TriggerTypes.WEBHOOK) {
        const pipelineBranchName = (formikProps?.values?.pipelineBranchName || '').trim()

        if (isHarnessExpression(pipelineBranchName)) {
          _pipelineBranchNameError = getString('triggers.branchNameCantBeExpression')
        }
      }

      // inputSetRefs is required if Input Set is required to run pipeline
      if (template?.data?.inputSetTemplateYaml) {
        if (!formikProps?.values?.inputSetSelected?.length) {
          _inputSetRefsError = getString('triggers.inputSetIsRequired')
        }

        if (parsedTriggerYaml?.trigger?.inputSetRefs?.length || formikProps?.values?.inputSetRefs?.length) {
          _inputSetRefsError = ''
        }
      }
    }
    if (isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING)) {
      // inputSetRefs is required if Input Set is required to run pipeline
      if (!isEmpty(pipelineInputs.inputs) || !isEmpty(pipelineInputs.options?.clone)) {
        if (!formikProps?.values?.inputSetSelected?.length) {
          _inputSetRefsError = getString('triggers.inputSetV1Required')
        }

        if (parsedTriggerYaml?.trigger?.inputSetRefs?.length || formikProps?.values?.inputSetRefs?.length) {
          _inputSetRefsError = ''
        }
      }
    }

    const { values, setErrors, setSubmitting } = formikProps
    let latestPipelineFromYamlView
    const latestPipeline = {
      ...currentPipeline,
      pipeline: values.pipeline as PipelineInfoConfig
    }

    if (triggerYaml) {
      latestPipelineFromYamlView = getTriggerPipelineValues(triggerYaml, formikProps)
    }

    const runPipelineFormErrors =
      isNewGitSyncRemotePipeline || formikProps.values.inputSetRefs?.length
        ? null
        : await getFormErrors({
            latestPipeline: latestPipelineFromYamlView || latestPipeline,
            latestYamlTemplate: yamlTemplate,
            orgPipeline: initialValues?.originalPipeline || values?.pipeline,
            setSubmitting,
            stagesToExecute: formikProps?.values?.stagesToExecute
          })
    const gitXErrors = isNewGitSyncRemotePipeline
      ? omitBy({ pipelineBranchName: _pipelineBranchNameError, inputSetRefs: _inputSetRefsError }, value => !value)
      : undefined
    const V1TriggerError = isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING)
      ? omitBy({ inputSetRefs: _inputSetRefsError }, value => !value)
      : undefined
    // https://github.com/formium/formik/issues/1392
    const errors: any = await {
      ...runPipelineFormErrors
    }

    if (gitXErrors && Object.keys(gitXErrors).length) {
      setErrors(gitXErrors)
      setFormErrors(gitXErrors)
      return gitXErrors
    } else if (V1TriggerError && Object.keys(V1TriggerError).length) {
      setErrors(V1TriggerError)
      setFormErrors(V1TriggerError)
      return V1TriggerError
    } else if (!isEmpty(runPipelineFormErrors)) {
      setErrors(runPipelineFormErrors)
      return runPipelineFormErrors
    }
    return errors
  }

  const renderWebhookWizard = (): JSX.Element | undefined => {
    const isEdit = !!onEditInitialValues?.identifier
    if (!wizardMap) return undefined
    return (
      <Wizard
        key={wizardKey} // re-renders with yaml to visual initialValues
        formikInitialProps={{
          initialValues: { ...initialValues, resolvedPipeline: resolvedMergedPipeline },
          onSubmit: (val: FlatValidWebhookFormikValuesInterface) => handleWebhookSubmit(val),
          validationSchema: getValidationSchema(
            'Webhook',
            getString,
            isGitWebhookPollingEnabled &&
              (sourceRepoOnNew === GitSourceProviders.Github.value ||
                (onEditInitialValues as any).sourceRepo === GitSourceProviders.Github.value),
            isGithubWebhookAuthenticationEnabled &&
              (sourceRepoOnNew === GitSourceProviders.Github.value ||
                (onEditInitialValues as any).sourceRepo === GitSourceProviders.Github.value)
          ),
          validate: validateTriggerPipeline,
          validateOnChange: true,
          enableReinitialize: true
        }}
        className={css.tabs}
        wizardMap={wizardMap}
        tabWidth="200px"
        tabChevronOffset="178px"
        onHide={returnToTriggersPage}
        wizardType="webhook"
        // defaultTabId="Schedule"
        submitLabel={isEdit ? getString('triggers.updateTrigger') : getString('triggers.createTrigger')}
        disableSubmit={
          loadingGetTrigger || createTriggerLoading || updateTriggerLoading || isTriggerRbacDisabled || fetchingTemplate
        }
        isEdit={isEdit}
        errorToasterMessage={errorToasterMessage}
        visualYamlProps={{
          handleModeSwitch: handleWebhookModeSwitch,
          yamlBuilderReadOnlyModeProps,
          yamlObjectKey: 'trigger',
          showVisualYaml: !isSimplifiedYAML,
          convertFormikValuesToYaml,
          schema: defaultTo(triggerSchema?.data, triggerStaticSchema?.content.data),
          onYamlSubmit: submitTrigger,
          loading: defaultTo(loadingYamlSchema, loadingStaticYamlSchema),
          invocationMap: invocationMapWebhook,
          positionInHeader: true
        }}
        leftNav={titleWithSwitch}
        renderErrorsStrip={renderErrorsStrip}
        onFormikEffect={onFormikEffect}
      >
        <WebhookTriggerConfigPanel />
        <WebhookConditionsPanel />
        {isSimplifiedYAML ? (
          <WebhookPipelineInputPanelV1 gitAwareForTriggerEnabled={isNewGitSyncRemotePipeline} />
        ) : (
          <WebhookPipelineInputPanel gitAwareForTriggerEnabled={isNewGitSyncRemotePipeline} />
        )}
      </Wizard>
    )
  }

  const renderArtifactWizard = (): JSX.Element | undefined => {
    const isEdit = !!onEditInitialValues?.identifier
    if (!wizardMap) return undefined

    return (
      <Wizard
        key={wizardKey} // re-renders with yaml to visual initialValues
        formikInitialProps={{
          initialValues: { ...initialValues, resolvedPipeline: resolvedMergedPipeline },
          onSubmit: (val: FlatValidArtifactFormikValuesInterface) => handleArtifactSubmit(val),
          validationSchema: getValidationSchema(initialValues.triggerType, getString),
          validate: validateTriggerPipeline,
          validateOnChange: true,
          enableReinitialize: true
        }}
        className={css.tabs}
        wizardMap={wizardMap}
        tabWidth="200px"
        tabChevronOffset="178px"
        onHide={returnToTriggersPage}
        submitLabel={isEdit ? getString('triggers.updateTrigger') : getString('triggers.createTrigger')}
        wizardType="artifacts"
        disableSubmit={
          loadingGetTrigger || createTriggerLoading || updateTriggerLoading || isTriggerRbacDisabled || fetchingTemplate
        }
        isEdit={isEdit}
        errorToasterMessage={errorToasterMessage}
        visualYamlProps={{
          handleModeSwitch: handleArtifactModeSwitch,
          yamlBuilderReadOnlyModeProps,
          yamlObjectKey: 'trigger',
          showVisualYaml: !isSimplifiedYAML,
          convertFormikValuesToYaml,
          schema: triggerSchema?.data,
          onYamlSubmit: submitTrigger,
          loading: loadingYamlSchema,
          invocationMap: invocationMapWebhook
        }}
        renderErrorsStrip={renderErrorsStrip}
        leftNav={titleWithSwitch}
        onFormikEffect={onFormikEffect}
      >
        <ArtifactTriggerConfigPanel />
        <ArtifactConditionsPanel />
        {isSimplifiedYAML ? (
          <WebhookPipelineInputPanelV1 gitAwareForTriggerEnabled={isNewGitSyncRemotePipeline} />
        ) : (
          <WebhookPipelineInputPanel gitAwareForTriggerEnabled={isNewGitSyncRemotePipeline} />
        )}
      </Wizard>
    )
  }

  const renderScheduleWizard = (): JSX.Element | undefined => {
    const isEdit = !!onEditInitialValues?.identifier
    if (!wizardMap) return undefined
    return (
      <Wizard
        formikInitialProps={{
          initialValues: { ...initialValues, resolvedPipeline: resolvedMergedPipeline },
          onSubmit: (val: FlatValidScheduleFormikValuesInterface) => handleScheduleSubmit(val),
          validationSchema: getValidationSchema('Scheduled', getString),
          validate: validateTriggerPipeline,
          validateOnChange: true,
          enableReinitialize: true
        }}
        className={css.tabs}
        wizardMap={wizardMap}
        tabWidth="200px"
        tabChevronOffset="178px"
        onHide={returnToTriggersPage}
        // defaultTabId="Conditions"
        submitLabel={isEdit ? getString('triggers.updateTrigger') : getString('triggers.createTrigger')}
        disableSubmit={
          loadingGetTrigger || createTriggerLoading || updateTriggerLoading || isTriggerRbacDisabled || fetchingTemplate
        }
        isEdit={isEdit}
        wizardType="scheduled"
        errorToasterMessage={errorToasterMessage}
        leftNav={titleWithSwitch}
        visualYamlProps={{
          handleModeSwitch: handleScheduleModeSwitch,
          yamlBuilderReadOnlyModeProps,
          yamlObjectKey: 'trigger',
          showVisualYaml: !isSimplifiedYAML,
          convertFormikValuesToYaml,
          schema: triggerSchema?.data,
          onYamlSubmit: submitTrigger,
          loading: loadingYamlSchema
        }}
        renderErrorsStrip={renderErrorsStrip}
        onFormikEffect={onFormikEffect}
      >
        <TriggerOverviewPanel />
        <SchedulePanel isQuartsExpressionSupported hideSeconds />

        {isSimplifiedYAML ? (
          <WebhookPipelineInputPanelV1 gitAwareForTriggerEnabled={isNewGitSyncRemotePipeline} />
        ) : (
          <WebhookPipelineInputPanel gitAwareForTriggerEnabled={isNewGitSyncRemotePipeline} />
        )}
      </Wizard>
    )
  }

  if (
    initialValues?.triggerType &&
    !Object.values(TriggerTypes).includes(initialValues.triggerType) &&
    shouldRenderWizard
  ) {
    return (
      <Layout.Vertical spacing="medium" padding="medium">
        <Page.Body>
          <h2>{getString('triggers.pageNotFound')}</h2>
        </Page.Body>
      </Layout.Vertical>
    )
  }

  return (triggerIdentifier && !wizardMap) || !shouldRenderWizard ? (
    <div style={{ position: 'relative', height: 'calc(100vh - 128px)' }}>
      <PageSpinner />
    </div>
  ) : (
    <>
      <Page.Body>
        {shouldRenderWizard && initialValues.triggerType === TriggerTypes.WEBHOOK && renderWebhookWizard()}
        {shouldRenderWizard && initialValues.triggerType === TriggerTypes.SCHEDULE && renderScheduleWizard()}

        {shouldRenderWizard && isArtifactOrManifestTrigger(initialValues.triggerType) && renderArtifactWizard()}
      </Page.Body>
    </>
  )
}

export default TriggersWizardPage
