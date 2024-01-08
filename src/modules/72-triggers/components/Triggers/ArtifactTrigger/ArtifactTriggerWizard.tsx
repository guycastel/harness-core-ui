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
  CreateTriggerQueryParams,
  UpdateTriggerQueryParams,
  useGetMergeInputSetFromPipelineTemplateWithListInput
} from 'services/pipeline-ng'
import {
  isCloneCodebaseEnabledAtLeastOneStage,
  isCodebaseFieldsRuntimeInputs,
  getPipelineWithoutCodebaseInputs
} from '@pipeline/utils/CIUtils'
import { useStrings } from 'framework/strings'
import type { PipelineType } from '@common/interfaces/RouteInterfaces'
import { validatePipeline } from '@pipeline/components/PipelineStudio/StepUtil'
import { ErrorsStrip } from '@pipeline/components/ErrorsStrip/ErrorsStrip'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { getIdentifierFromValue, getScopeFromDTO } from '@common/components/EntityReference/EntityReference'
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
} from '@triggers/pages/triggers/interface/TriggersWizardInterface'
import type { AddConditionInterface } from '@triggers/pages/triggers/views/AddConditionsSection'
import { useGetResolvedChildPipeline } from '@pipeline/hooks/useGetResolvedChildPipeline'

import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { isSimplifiedYAMLEnabled } from '@common/utils/utils'
import {
  getConnectorName,
  getConnectorValue,
  clearNullUndefined,
  getArtifactWizardMap,
  ResponseStatus,
  TriggerTypes,
  getValidationSchema,
  displayPipelineIntegrityResponse,
  getOrderedPipelineVariableValues,
  getModifiedTemplateValues,
  getErrorMessage,
  isHarnessExpression,
  getArtifactManifestTriggerYaml,
  flattenKeys,
  getDefaultPipelineReferenceBranch,
  EventConditionTypes,
  getTriggerArtifactInitialSource,
  transformArtifactTriggerSourceSpecToMultiRegionArtifactTriggerSourceSpec
} from './TriggersWizardPageUtils'
import useIsNewGitSyncRemotePipeline from '../useIsNewGitSyncRemotePipeline'
import { isNewTrigger } from '../utils'
import { useIsTriggerCreatePermission } from '../useIsTriggerCreatePermission'
import type { ArtifactTriggerType, TriggerType } from '../TriggerInterface'
import css from '@triggers/pages/triggers/TriggersWizardPage.module.scss'

type ResponseNGTriggerResponseWithMessage = ResponseNGTriggerResponse & { message?: string }

const ArtifactTriggerWizard = (props: { children: JSX.Element[]; isSimplifiedYAML?: boolean }): JSX.Element => {
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
  const { CI_YAML_VERSIONING } = useFeatureFlags()
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

  const isNewGitSyncRemotePipeline = useIsNewGitSyncRemotePipeline()

  const [connectorScopeParams] = useState<GetConnectorQueryParams | undefined>(undefined)
  const [ignoreError, setIgnoreError] = useState<boolean>(false)
  const createUpdateTriggerQueryParams: UpdateTriggerQueryParams = useMemo(
    () => ({
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      targetIdentifier: pipelineIdentifier,
      ignoreError
    }),
    [accountId, orgIdentifier, projectIdentifier, pipelineIdentifier, ignoreError]
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
    queryParams: { ...createUpdateTriggerQueryParams, withServiceV2: true } as CreateTriggerQueryParams,
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
  const convertFormikValuesToYaml = (values: any): { trigger: TriggerConfigDTO } | undefined => {
    const res = getArtifactManifestTriggerYaml({
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

    if (values.inputSetSelected?.length) {
      res.inputSetRefs = values.inputSetSelected.map((inputSet: InputSetValue) => inputSet.value)
    }

    return { trigger: res }
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
  const [isMergedPipelineReady, setIsMergedPipelineReady] = useState<boolean>(false)
  const [resolvedPipeline, setResolvedPipeline] = useState<PipelineInfoConfig | undefined>()

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

  const originalPipeline: PipelineInfoConfig | undefined = memoizedParse<Pipeline>(
    (pipelineResponse?.data?.yamlPipeline as any) || ''
  )?.pipeline

  useEffect(() => {
    setResolvedPipeline(
      yamlParse<Pipeline>(defaultTo(pipelineResponse?.data?.resolvedTemplatesPipelineYaml, ''))?.pipeline ??
        ({} as PipelineInfoConfig)
    )
  }, [pipelineResponse?.data?.resolvedTemplatesPipelineYaml])

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
    if (triggerResponse?.data?.yaml) {
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

  const getArtifactTriggerValues = ({
    triggerResponseYaml,
    triggerYaml
  }: {
    triggerResponseYaml?: string
    triggerYaml?: { trigger: NGTriggerConfigV2 }
  }): FlatOnEditValuesInterface | undefined => {
    let newOnEditInitialValues: FlatOnEditValuesInterface | undefined
    try {
      const triggerResponseJson = triggerYaml ?? parse(triggerResponseYaml ?? '')
      const {
        trigger: {
          name,
          identifier,
          description,
          tags,
          inputYaml,
          pipelineBranchName = getDefaultPipelineReferenceBranch(),
          inputSetRefs,
          source: { type, spec },
          source,
          stagesToExecute
        }
      } = triggerResponseJson

      const triggerSourceType = type as ArtifactTriggerType
      const isMultiRegionArtifact = triggerSourceType === 'MultiRegionArtifact'
      const artifactSpec = isMultiRegionArtifact ? spec : spec?.spec
      const triggerSource = isMultiRegionArtifact
        ? source
        : {
            type: triggerSourceType,
            spec: transformArtifactTriggerSourceSpecToMultiRegionArtifactTriggerSourceSpec(spec?.type, artifactSpec)
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
      const eventConditions = artifactSpec?.eventConditions || []
      const metaDataConditions = artifactSpec?.metaDataConditions || []
      const jexlCondition = artifactSpec?.jexlCondition
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
        stagesToExecute,
        tags,
        source: triggerSource,
        pipeline: pipelineJson,
        pipelineOverride,
        triggerType: triggerSourceType,
        stageId: source?.spec?.stageIdentifier,
        inputSetTemplateYamlObj: parse(template?.data?.inputSetTemplateYaml || ''),
        pipelineBranchName,
        inputSetRefs,
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

      return newOnEditInitialValues
    } catch (e) {
      // set error
      setErrorToasterMessage(getString('triggers.cannotParseTriggersData'))
    }
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
      if (!(triggerYaml.pipelineBranchName ?? '').trim()) {
        triggerYaml.pipelineBranchName = getDefaultPipelineReferenceBranch(
          triggerYaml?.source?.type,
          triggerYaml?.source?.spec?.spec?.type
        )
      }
    }

    const successCallback = ({ status, data, message }: ResponseNGTriggerResponseWithMessage): void => {
      if (status === ResponseStatus.ERROR) {
        retryTriggerSubmit({ message })
      } else if (data?.errors && !isEmpty(data?.errors)) {
        const displayErrors = displayPipelineIntegrityResponse(data.errors)
        setFormErrors(displayErrors)

        return
      } else if (status === ResponseStatus.SUCCESS) {
        showSuccess(
          getString(isCreatingNewTrigger ? 'triggers.toast.successfulCreate' : 'triggers.toast.successfulUpdate', {
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
    }

    const errorCallback = (err: any): void => {
      if (err?.data?.status === ResponseStatus.ERROR) {
        retryTriggerSubmit({ message: getErrorMessage(err?.data) || getString('triggers.retryTriggerSave') })
      } else {
        setErrorToasterMessage(err?.data?.message)
      }
    }

    if (!isCreatingNewTrigger) {
      try {
        const { status, data, message } = (await updateTrigger(
          yamlStringify({ trigger: clearNullUndefined(triggerYaml) }) as any
        )) as ResponseNGTriggerResponseWithMessage

        successCallback({ status, data, message })
      } catch (err) {
        errorCallback(err)
      } finally {
        setIgnoreError(false)
      }
      // error flow sent to Wizard
    } else {
      try {
        const { status, data, message } = (await createTrigger(
          yamlStringify({ trigger: clearNullUndefined(triggerYaml) }) as any
        )) as ResponseNGTriggerResponseWithMessage

        successCallback({ status, data, message })
      } catch (err) {
        errorCallback(err)
      } finally {
        setIgnoreError(false)
      }
    }
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

  const getInitialValues = (): FlatInitialValuesInterface | any => {
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
    return {
      triggerType: triggerTypeOnNew,
      identifier: '',
      tags: {},
      artifactType,
      manifestType,
      source: getTriggerArtifactInitialSource(artifactType!),
      pipeline: newPipeline,
      originalPipeline,
      resolvedPipeline: resolvedMergedPipeline,
      inputSetTemplateYamlObj,
      pipelineBranchName: getDefaultPipelineReferenceBranch(triggerTypeOnNew) || branch,
      selectedArtifact: {},
      stagesToExecute: newPipeline?.stagesToExecute
    }
  }

  const [initialValues, setInitialValues] = useState<FlatInitialValuesInterface>(
    Object.assign(getInitialValues(), onEditInitialValues)
  )

  useEffect(() => {
    let newInitialValues = Object.assign(getInitialValues(), onEditInitialValues)
    if (onEditInitialValues?.identifier) {
      newInitialValues = newInitialValues?.pipeline?.template
        ? getModifiedTemplateValues(newInitialValues)
        : newInitialValues
    }

    setInitialValues(newInitialValues)
  }, [onEditInitialValues, currentPipeline])

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

        const inputSetTemplateYamlObj = parse(template?.data?.inputSetTemplateYaml || '')
        additionalValues.inputSetTemplateYamlObj = inputSetTemplateYamlObj

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

  const { data: connectorData, refetch: getConnectorDetails } = useGetConnector({
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
      (onEditInitialValues?.connectorRef?.identifier && !isUndefined(connectorScopeParams) && !connectorData) ||
      (initialValues?.connectorRef?.value &&
        (!initialValues.connectorRef.label ||
          (connectorData?.data?.connector?.identifier &&
            !initialValues?.connectorRef?.identifier?.includes(connectorData?.data?.connector?.identifier))))
    ) {
      getConnectorDetails()
    }
  }, [onEditInitialValues?.connectorRef?.identifier, connectorScopeParams, initialValues?.connectorRef])

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

  const handleArtifactModeSwitch = (view: SelectedView, yamlHandler?: YamlBuilderHandlerBinding): void => {
    if (view === SelectedView.VISUAL) {
      const yaml = yamlHandler?.getLatestYaml() || /* istanbul ignore next */ ''
      setErrorToasterMessage('')
      try {
        const triggerYaml = parse(yaml)
        const updatedInitialValues = {
          ...initialValues,
          ...getArtifactTriggerValues({ triggerYaml })
        }
        setInitialValues(updatedInitialValues)
        setWizardKey(() => wizardKey + 1)
      } catch (e) {
        setErrorToasterMessage(getString('triggers.cannotParseInputValues'))
      }
    }
  }

  const isTriggerCreatePermission = useIsTriggerCreatePermission()

  const isTriggerRbacDisabled = !isTriggerCreatePermission

  const wizardMap = initialValues.triggerType
    ? getArtifactWizardMap({
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
            stagesToExecute: formikProps.values?.stagesToExecute
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

  const renderArtifactWizard = (): JSX.Element | undefined => {
    const isEdit = !!onEditInitialValues?.identifier
    if (!wizardMap) return undefined

    return (
      <Wizard
        key={wizardKey} // re-renders with yaml to visual initialValues
        formikInitialProps={{
          initialValues: { ...initialValues, resolvedPipeline: resolvedMergedPipeline },
          onSubmit: (val: FlatValidArtifactFormikValuesInterface) => handleArtifactSubmit(val),
          validationSchema: getValidationSchema(getString),
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
          showVisualYaml: !props.isSimplifiedYAML,
          convertFormikValuesToYaml,
          schema: defaultTo(triggerSchema?.data, triggerStaticSchema?.content?.data),
          onYamlSubmit: submitTrigger,
          loading: defaultTo(loadingYamlSchema, loadingStaticYamlSchema),
          invocationMap: invocationMapWebhook
        }}
        renderErrorsStrip={renderErrorsStrip}
        leftNav={titleWithSwitch}
        onFormikEffect={onFormikEffect}
      >
        {props.children}
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
    <Page.Body>{renderArtifactWizard()}</Page.Body>
  )
}

export default ArtifactTriggerWizard
