/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import type { FormikErrors, FormikProps } from 'formik'
import { defaultTo, get, isEmpty, merge, noop, omit, omitBy } from 'lodash-es'
import { parse } from 'yaml' // Use parse from yaml helper

import {
  Button,
  ButtonVariation,
  getMultiTypeFromValue,
  Layout,
  MultiTypeInputType,
  Text,
  useConfirmationDialog,
  useToaster,
  VisualYamlSelectedView as SelectedView
} from '@harness/uicore'
import { Intent } from '@harness/design-system'

import { useGetIndividualStaticSchemaQuery } from '@harnessio/react-pipeline-service-client'
import {
  NGTriggerConfigV2,
  PipelineInfoConfig,
  ResponseNGTriggerResponse,
  useCreateTrigger,
  useGetMergeInputSetFromPipelineTemplateWithListInput,
  useGetPipeline,
  useGetSchemaYaml,
  useGetTemplateFromPipeline,
  useUpdateTrigger
} from 'services/pipeline-ng'
import { useStrings } from 'framework/strings'

import type { YamlBuilderHandlerBinding, YamlBuilderProps } from '@common/interfaces/YAMLBuilderProps'
import type {
  GitQueryParams,
  ModulePathParams,
  PipelinePathProps,
  TriggerPathProps
} from '@common/interfaces/RouteInterfaces'
import routes from '@common/RouteDefinitions'
import { useConfirmAction, useDeepCompareEffect, useMutateAsGet, useQueryParams } from '@common/hooks'
import { memoizedParse, yamlParse, yamlStringify } from '@common/utils/YamlHelperMethods'
import { getScopeFromDTO } from '@common/components/EntityReference/EntityReference'
import type { FormikEffectProps } from '@common/components/FormikEffect/FormikEffect'

import type { InputSetValue } from '@pipeline/components/InputSetSelector/utils'
import { validatePipeline } from '@pipeline/components/PipelineStudio/StepUtil'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { ErrorsStrip } from '@pipeline/components/ErrorsStrip/ErrorsStrip'
import type { Pipeline } from '@pipeline/utils/types'
import {
  getPipelineWithoutCodebaseInputs,
  isCloneCodebaseEnabledAtLeastOneStage,
  isCodebaseFieldsRuntimeInputs
} from '@pipeline/utils/CIUtils'
import { clearRuntimeInput, mergeTemplateWithInputSetData } from '@pipeline/utils/runPipelineUtils'

import TabWizard from '@triggers/components/TabWizard/TabWizard'

import {
  CronFormat,
  getBreakdownValues,
  getDefaultExpressionBreakdownValues,
  resetScheduleObject,
  scheduleTabsId
} from '@common/components/SchedulePanel/components/utils'
import { scheduledTypes } from '@triggers/pages/triggers/utils/TriggersWizardPageUtils'
import { useGetResolvedChildPipeline } from '@pipeline/hooks/useGetResolvedChildPipeline'
import useTriggerView from '@common/components/Wizard/useTriggerView'
import TitleWithSwitch from '../components/TitleWithSwitch/TitleWithSwitch'
import { flattenKeys, getModifiedTemplateValues } from '../WebhookTrigger/utils'
import type { TriggerProps } from '../Trigger'
import {
  clearNullUndefined,
  displayPipelineIntegrityResponse,
  getErrorMessage,
  getOrderedPipelineVariableValues,
  ResponseStatus
} from '../utils'
import type { FlatValidFormikValuesInterface, TriggerConfigDTO } from '../TriggerWizardInterface'
import {
  FlatInitialValuesInterface,
  FlatOnEditValuesInterface,
  FlatValidScheduleFormikValuesInterface,
  getValidationSchema,
  getPanels
} from './utils'
import useIsNewGitSyncRemotePipeline from '../useIsNewGitSyncRemotePipeline'
import { useIsTriggerCreatePermission } from '../useIsTriggerCreatePermission'

type ResponseNGTriggerResponseWithMessage = ResponseNGTriggerResponse & { message?: string }

export default function ScheduledTriggerWizard(
  props: TriggerProps<any> & { children: JSX.Element[] }
): React.ReactElement {
  const { isNewTrigger, baseType, triggerData } = props

  const [yamlHandler, setYamlHandler] = useState<YamlBuilderHandlerBinding | undefined>()
  const [selectedView, setSelectedView] = useTriggerView(isNewTrigger)
  const [resolvedPipeline, setResolvedPipeline] = useState<PipelineInfoConfig | undefined>()

  const history = useHistory()
  const { getString } = useStrings()
  const { showSuccess, showError, clear } = useToaster()

  const {
    accountId: accountIdentifier,
    orgIdentifier,
    projectIdentifier,
    pipelineIdentifier,
    triggerIdentifier,
    module
  } = useParams<PipelinePathProps & TriggerPathProps & ModulePathParams>()

  const {
    repoIdentifier,
    connectorRef: pipelineConnectorRef,
    repoName: pipelineRepoName,
    branch,
    storeType
  } = useQueryParams<GitQueryParams>()
  const gitXQueryParams = {
    branch,
    repoName: pipelineRepoName,
    repoIdentifier,
    parentEntityConnectorRef: pipelineConnectorRef
  }

  const { data: template, loading: fetchingTemplate } = useMutateAsGet(useGetTemplateFromPipeline, {
    queryParams: {
      accountIdentifier,
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

  const { data: pipelineResponse } = useGetPipeline({
    pipelineIdentifier,
    queryParams: {
      accountIdentifier,
      orgIdentifier,
      projectIdentifier,
      getTemplatesResolvedPipeline: true,
      // GitX related query params
      ...gitXQueryParams
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
  })

  //! This can be moved to the wizard to load the schema yaml when yaml builder loads
  const { loading: loadingYamlSchema, data: triggerSchema } = useGetSchemaYaml({
    queryParams: {
      entityType: 'Triggers',
      projectIdentifier,
      orgIdentifier,
      accountIdentifier,
      scope: getScopeFromDTO({
        accountIdentifier,
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

  const returnToTriggersPage = (): void =>
    history.push(
      routes.toTriggersPage({
        accountId: accountIdentifier,
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

  const isNewGitSyncRemotePipeline = useIsNewGitSyncRemotePipeline()

  const [ignoreError, setIgnoreError] = useState<boolean>(false)

  const createUpdateTriggerQueryParams = useMemo(
    () => ({
      accountIdentifier,
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
      accountIdentifier,
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
      accountIdentifier,
      projectIdentifier,
      orgIdentifier,
      pipelineIdentifier,
      // GitX related query params
      ...gitXQueryParams
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } },
    lazy: true
  })

  const { openDialog, closeDialog } = useConfirmationDialog({
    contentText: getString('triggers.updateTriggerDetails'),
    intent: Intent.WARNING,
    titleText: getString('triggers.updateTrigger'),
    customButtons: (
      <Button variation={ButtonVariation.PRIMARY} text={getString('close')} onClick={() => closeDialog()} />
    )
  })

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

  const yamlBuilderReadOnlyModeProps: YamlBuilderProps = {
    fileName: `${triggerData?.identifier ?? 'Trigger'}.yaml`,
    entityType: 'Triggers',
    width: 'calc(100vw - 350px)',
    height: 'calc(100vh - 280px)',

    yamlSanityConfig: {
      removeEmptyString: false,
      removeEmptyObject: false,
      removeEmptyArray: false
    }
  }

  const [currentPipeline, setCurrentPipeline] = useState<{ pipeline?: PipelineInfoConfig } | undefined>(undefined)

  const originalPipeline: PipelineInfoConfig | undefined = memoizedParse<Pipeline>(
    defaultTo(pipelineResponse?.data?.yamlPipeline, '')
  )?.pipeline

  useEffect(() => {
    setResolvedPipeline(
      yamlParse<Pipeline>(defaultTo(pipelineResponse?.data?.resolvedTemplatesPipelineYaml, ''))?.pipeline
    )
  }, [pipelineResponse?.data?.resolvedTemplatesPipelineYaml])

  const { resolvedMergedPipeline } = useGetResolvedChildPipeline(
    {
      accountId: accountIdentifier,
      repoIdentifier: defaultTo(pipelineRepoName, repoIdentifier),
      branch,
      connectorRef: pipelineConnectorRef
    },
    originalPipeline,
    resolvedPipeline
  )

  const [onEditInitialValues, setOnEditInitialValues] = useState<FlatOnEditValuesInterface>({
    triggerType: baseType
  })

  const getInitialValues = (): FlatInitialValuesInterface => {
    let newPipeline = { ...(currentPipeline?.pipeline || {}) } as PipelineInfoConfig
    // only applied for CI, Not cloned codebase
    if (
      newPipeline?.template?.templateInputs &&
      isCodebaseFieldsRuntimeInputs(newPipeline.template.templateInputs as PipelineInfoConfig) &&
      resolvedMergedPipeline &&
      !isCloneCodebaseEnabledAtLeastOneStage(resolvedMergedPipeline as PipelineInfoConfig)
    ) {
      newPipeline = getPipelineWithoutCodebaseInputs(newPipeline) as Pipeline['pipeline']
    }

    return {
      triggerType: baseType,
      identifier: '',
      tags: {},
      stagesToExecute: triggerData?.stagesToExecute,
      selectedScheduleTab: scheduleTabsId.MINUTES,
      pipeline: newPipeline,
      originalPipeline,
      resolvedPipeline: resolvedMergedPipeline,
      cronFormat: CronFormat.UNIX,
      pipelineBranchName: isNewGitSyncRemotePipeline ? branch : '',
      ...getDefaultExpressionBreakdownValues(scheduleTabsId.MINUTES)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        if (onEditInitialValues?.identifier) {
          const newPipeline = currentPipeline?.pipeline ? currentPipeline.pipeline : onEditInitialValues.pipeline || {}
          setOnEditInitialValues({
            ...onEditInitialValues,
            originalPipeline: newOriginalPipeline,
            resolvedPipeline: newResolvedPipeline,
            pipeline: newPipeline as PipelineInfoConfig,
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
        showError(getString('triggers.cannotParseInputValues'))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pipelineResponse?.data?.yamlPipeline,
    resolvedMergedPipeline,
    onEditInitialValues?.identifier,
    initialValues,
    currentPipeline
  ])

  const [wizardKey, setWizardKey] = useState<number>(0)

  const [isMergedPipelineReady, setIsMergedPipelineReady] = useState<boolean>(false)

  useDeepCompareEffect(() => {
    if (template?.data?.inputSetTemplateYaml !== undefined) {
      if (onEditInitialValues?.pipeline && !isMergedPipelineReady) {
        let newOnEditPipeline: PipelineInfoConfig = merge(
          parse(template?.data?.inputSetTemplateYaml)?.pipeline,
          onEditInitialValues.pipeline || {}
        )

        /*this check is needed as when trigger is already present with 1 stage and then tries to add parallel stage,
        we need to have correct yaml with both stages as a part of parallel*/
        if (newOnEditPipeline?.stages?.some(stages => stages?.stage && stages?.parallel)) {
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

  const [enabledStatus, setEnabledStatus] = useState<boolean>(true)

  useEffect(() => {
    if (triggerData?.enabled === false) {
      setEnabledStatus(false)
    }
  }, [triggerData?.enabled])

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
          tags,
          inputYaml,
          pipelineBranchName = '',
          inputSetRefs,
          source: {
            spec: {
              spec: { expression, type }
            }
          },
          stagesToExecute
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
          showError(getString('triggers.cannotParseInputValues'))
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
      showError(getString('triggers.cannotParseTriggersData'))
    }
  }

  useEffect(() => {
    if (triggerData?.yaml) {
      try {
        const triggerResponseJson = parse(triggerData.yaml)
        if (triggerResponseJson.trigger.inputYaml) {
          refetchMergeInputSet({
            body: {
              lastYamlToMerge: triggerResponseJson.trigger.inputYaml,
              withMergedPipelineYaml: true
            }
          })
        }
      } catch (e) {
        showError(getString('triggers.cannotParseTriggersData'))
      }
    }
  }, [triggerData?.yaml])

  useEffect(() => {
    if (mergeInputSetResponse?.data?.pipelineYaml) {
      try {
        const pipeline = parse(mergeInputSetResponse.data.pipelineYaml)?.pipeline
        setOnEditInitialValues(oldOnEditInitialValues => ({
          ...oldOnEditInitialValues,
          pipeline: clearRuntimeInput(pipeline)
        }))
      } catch (error) {
        showError(getString('triggers.cannotParseTriggersData'))
      }
    }
  }, [mergeInputSetResponse?.data?.pipelineYaml])

  useEffect(() => {
    if (triggerData?.yaml && triggerData.type === 'Scheduled') {
      const newOnEditInitialValues = getScheduleTriggerValues({
        triggerResponseYaml: triggerData.yaml
      })
      setOnEditInitialValues({
        ...onEditInitialValues,
        ...newOnEditInitialValues
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerIdentifier, triggerData, template])

  const getScheduleTriggerYaml = ({
    values: val
  }: {
    values: FlatValidScheduleFormikValuesInterface
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
      expression,
      cronFormat: type,
      pipelineBranchName = ''
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
    const noPipelineInput = isEmpty(yamlTemplate)
    return clearNullUndefined({
      name,
      identifier,
      enabled: enabledStatus,
      stagesToExecute,
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
            expression,
            type
          }
        }
      },
      pipelineBranchName: isNewGitSyncRemotePipeline ? pipelineBranchName : undefined,
      ...(!noPipelineInput && {
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

  const convertFormikValuesToYaml = (values: any): { trigger: TriggerConfigDTO } | undefined => {
    const res = getScheduleTriggerYaml({ values })

    if (values.inputSetSelected?.length) {
      res.inputSetRefs = values.inputSetSelected.map((inputSet: InputSetValue) => inputSet.value)
    }

    return { trigger: res }
  }

  const formikRef = useRef<FormikProps<any>>()
  const [formErrors, setFormErrors] = useState<FormikErrors<FlatValidFormikValuesInterface>>({})

  const renderErrorsStrip = (): JSX.Element => <ErrorsStrip formErrors={formErrors} />

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
      const { pipelineBranchName } = nextValues
      if (
        !(pipelineBranchName || '').trim() ||
        getMultiTypeFromValue(pipelineBranchName) === MultiTypeInputType.EXPRESSION
      ) {
        const defaultBranchName = ''
        if (pipelineBranchName !== defaultBranchName) {
          formik.setFieldValue('pipelineBranchName', defaultBranchName)
        }
      }
    }
  }

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

  const getTriggerPipelineValues = (
    triggerYaml: string,
    formikProps: any
  ): { pipeline: PipelineInfoConfig } | undefined => {
    try {
      const triggerResponseJson = parse(triggerYaml)
      try {
        return parse(triggerResponseJson?.trigger.inputYaml || '')
      } catch (e) {
        showError(getString('triggers.cannotParseInputYaml'))
        // backend api to provide additional details on submit
        return
      }
    } catch (e) {
      showError(getString('triggers.cannotParseTriggersYaml'))
      formikProps
        .setSubmitting(false)(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          e as any
        )
        .preventDefault()
      // backend api to provide additional details on submit
      return
    }
  }

  const yamlTemplate = useMemo(() => {
    return parse(defaultTo(template?.data?.inputSetTemplateYaml, ''))?.pipeline
  }, [template?.data?.inputSetTemplateYaml])

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
    function validateErrors(): Promise<FormikErrors<FlatValidScheduleFormikValuesInterface>> {
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
          showError(getString('triggers.cannotParseTriggersYaml'))
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

  const validateTriggerPipeline = async ({
    formikProps,
    latestYaml: triggerYaml
  }: {
    formikProps: FormikProps<any>
    latestYaml?: string
  }): Promise<FormikErrors<FlatValidScheduleFormikValuesInterface>> => {
    if (!formikProps) return {}
    let _pipelineBranchNameError = ''
    let _inputSetRefsError = ''

    let parsedTriggerYaml

    try {
      parsedTriggerYaml = parse(triggerYaml || '')
    } catch (e) {
      showError(getString('triggers.cannotParseInputValues'))
    }

    if (isNewGitSyncRemotePipeline) {
      const pipelineBranchName = (formikProps?.values?.pipelineBranchName || '').trim()

      if (getMultiTypeFromValue(pipelineBranchName) === MultiTypeInputType.EXPRESSION) {
        _pipelineBranchNameError = getString('triggers.branchNameCantBeExpression')
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
    // https://github.com/formium/formik/issues/1392
    const errors: any = await {
      ...runPipelineFormErrors
    }

    if (gitXErrors && Object.keys(gitXErrors).length) {
      setErrors(gitXErrors)
      setFormErrors(gitXErrors)
      return gitXErrors
    } else if (!isEmpty(runPipelineFormErrors)) {
      setErrors(runPipelineFormErrors)
      return runPipelineFormErrors
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

  const submitTrigger = async (triggerYaml: NGTriggerConfigV2 | TriggerConfigDTO): Promise<void> => {
    if (!isNewTrigger) {
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
          returnToTriggersPage()
        }
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((err as any)?.data?.status === ResponseStatus.ERROR) {
          retryTriggerSubmit({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            message: getErrorMessage((err as any)?.data) || getString('triggers.retryTriggerSave')
          })
        } else {
          showError(getErrorMessage(err))
        }
      } finally {
        setIgnoreError(false)
      }
      // error flow sent to Wizard
    } else {
      try {
        const { status, data, message } = (await createTrigger(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          returnToTriggersPage()
        }
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((err as any)?.data?.status === ResponseStatus.ERROR) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          retryTriggerSubmit({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            message: getErrorMessage((err as any)?.data) || getString('triggers.retryTriggerSave')
          })
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          showError((err as any)?.data?.message)
        }
      } finally {
        setIgnoreError(false)
      }
    }
  }

  const onSubmit = async (val: FlatValidScheduleFormikValuesInterface): Promise<void> => {
    const triggerYaml = getScheduleTriggerYaml({ values: val })

    submitTrigger(triggerYaml)
  }

  const handleModeSwitch = (view: SelectedView): void => {
    try {
      const latestYaml = yamlHandler?.getLatestYaml() || /* istanbul ignore next */ ''
      parse(latestYaml)
      const errorsYaml =
        (yamlHandler?.getYAMLValidationErrorMap() as unknown as Map<number, string>) || /* istanbul ignore next */ ''
      /* istanbul ignore next */
      if (errorsYaml?.size > 0) {
        showError(getString('common.validation.invalidYamlText'))
        return
      }
      // handleModeSwitch?.(mode, yamlHandler)
      if (view === SelectedView.VISUAL) {
        const yaml = yamlHandler?.getLatestYaml() || /* istanbul ignore next */ ''
        clear()
        try {
          const triggerYaml = parse(yaml)
          setInitialValues({
            ...initialValues,
            ...getScheduleTriggerValues({ triggerYaml })
          })
          setWizardKey(wizardKey + 1)
        } catch (e) {
          showError(getString('triggers.cannotParseInputValues'))
        }
      }
      setSelectedView(view)
    } catch (e) {
      /* istanbul ignore next */
      showError(getString('common.validation.invalidYamlText'))
      return
    }
  }

  const isTriggerCreatePermission = useIsTriggerCreatePermission()

  const isTriggerRbacDisabled = !isTriggerCreatePermission

  const triggerHeading = isNewTrigger ? getString('triggers.onNewScheduleTitle') : `Trigger: ${triggerData?.name}`

  return (
    <TabWizard
      key={wizardKey} // re-renders with yaml to visual initialValues
      wizardType="scheduled"
      formikInitialProps={{
        initialValues: { ...initialValues, resolvedPipeline: resolvedMergedPipeline },
        onSubmit: onSubmit,
        validationSchema: getValidationSchema(getString),
        validate: validateTriggerPipeline,
        enableReinitialize: true
      }}
      tabWidth="200px"
      onHide={returnToTriggersPage}
      submitLabel={!isNewTrigger ? getString('triggers.updateTrigger') : getString('triggers.createTrigger')}
      disableSubmit={
        createTriggerLoading ||
        updateTriggerLoading ||
        isTriggerRbacDisabled ||
        fetchingTemplate ||
        loadingMergeInputSet
      }
      isEdit={!isNewTrigger}
      visualYamlProps={{
        handleModeSwitch,
        yamlBuilderReadOnlyModeProps,
        yamlObjectKey: 'trigger',
        convertFormikValuesToYaml,
        schema: defaultTo(triggerSchema?.data, triggerStaticSchema?.content.data),
        onYamlSubmit: submitTrigger,
        loading: defaultTo(loadingYamlSchema, loadingStaticYamlSchema)
      }}
      renderErrorsStrip={renderErrorsStrip}
      onFormikEffect={onFormikEffect}
      // new props
      panels={getPanels(getString)}
      // headerProps={{
      title={
        <TitleWithSwitch
          selectedView={selectedView}
          enabledStatus={enabledStatus}
          setEnabledStatus={setEnabledStatus}
          isTriggerRbacDisabled={isTriggerRbacDisabled}
          triggerHeading={triggerHeading}
        />
      }
      selectedView={selectedView}
      setSelectedView={setSelectedView}
      // }}
      yamlHandler={yamlHandler}
      setYamlHandler={setYamlHandler}
    >
      {props.children}
    </TabWizard>
  )
}
