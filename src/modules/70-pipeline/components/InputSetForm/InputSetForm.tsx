/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { defaultTo, isEmpty, merge, noop, omit } from 'lodash-es'
import { PageBody, VisualYamlSelectedView as SelectedView } from '@harness/uicore'
import { useParams } from 'react-router-dom'
import type { FormikProps } from 'formik'
import { flushSync } from 'react-dom'
import type { InputSetResponse, PipelineConfig, PipelineInfoConfig } from 'services/pipeline-ng'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import {
  useGetTemplateFromPipeline,
  useCreateInputSetForPipeline,
  useGetInputSetForPipeline,
  useUpdateInputSetForPipeline,
  ResponseInputSetResponse,
  useGetMergeInputSetFromPipelineTemplateWithListInput,
  ResponsePMSPipelineResponseDTO,
  ResponseInputSetTemplateWithReplacedExpressionsResponse,
  useGetPipeline
} from 'services/pipeline-ng'

import { useToaster } from '@common/exports'
import type { YamlBuilderHandlerBinding } from '@common/interfaces/YAMLBuilderProps'
import { ContainerSpinner } from '@common/components/ContainerSpinner/ContainerSpinner'
import type {
  GitQueryParams,
  InputSetGitQueryParams,
  InputSetPathProps,
  PipelineType
} from '@common/interfaces/RouteInterfaces'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { useStrings } from 'framework/strings'
import { AppStoreContext } from 'framework/AppStore/AppStoreContext'
import { useMutateAsGet, useQueryParams } from '@common/hooks'
import { parse, stringify, yamlParse } from '@common/utils/YamlHelperMethods'
import { StoreType } from '@common/constants/GitSyncTypes'
import type { InputSetDTO, InputSetType, Pipeline, InputSet } from '@pipeline/utils/types'
import { hasStoreTypeMismatch, isInputSetInvalid } from '@pipeline/utils/inputSetUtils'
import NoEntityFound from '@pipeline/pages/utils/NoEntityFound/NoEntityFound'
import { clearRuntimeInput } from '@pipeline/utils/runPipelineUtils'
import { useGetResolvedChildPipeline } from '@pipeline/hooks/useGetResolvedChildPipeline'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import useDiffDialog from '@common/hooks/useDiffDialog'
import { usePermission } from '@rbac/hooks/usePermission'
import { ConnectorSelectedValue } from '@platform/connectors/components/ConnectorReferenceField/ConnectorReferenceField'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { getProvider } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect.utils'
import { FormikInputSetForm } from './FormikInputSetForm'
import { useSaveInputSet } from './useSaveInputSet'
import { PipelineVariablesContextProvider } from '../PipelineVariablesContext/PipelineVariablesContext'
import { InputSetFormHeader } from '../InputSetFormHeader/InputSetFormHeader'
import { InputSetFormProps, InputSetDTOGitDetails } from './types'

const getDefaultInputSet = (
  template: PipelineInfoConfig,
  orgIdentifier: string,
  projectIdentifier: string
): InputSetDTO => ({
  name: '',
  identifier: '',
  description: undefined,
  orgIdentifier,
  projectIdentifier,
  pipeline: template,
  repo: '',
  branch: ''
})

const getInputSet = (
  orgIdentifier: string,
  projectIdentifier: string,
  inputSetResponse: ResponseInputSetResponse | null,
  template: ResponseInputSetTemplateWithReplacedExpressionsResponse | null,
  mergeTemplate?: string,
  isGitSyncEnabled = false
): InputSetDTO | InputSetType => {
  if (inputSetResponse?.data) {
    const inputSetObj = inputSetResponse?.data

    const parsedInputSetObj = parse<InputSet>(defaultTo(inputSetObj?.inputSetYaml, ''))
    /*
      Context of the below if block
      We need to populate existing values of input set in the form.
      The values are to be filled come from 'merge' API i.e. mergeTemplate object
      But if the merge API fails (due to invalid input set or any other reason) - we populate the value from the input set response recevied (parsedInputSetObj).
    */
    const parsedPipelineWithValues = mergeTemplate
      ? defaultTo(parse<Pipeline>(defaultTo(mergeTemplate, ''))?.pipeline, {} as PipelineInfoConfig)
      : parsedInputSetObj?.inputSet?.pipeline

    if (isGitSyncEnabled && parsedInputSetObj && parsedInputSetObj.inputSet) {
      return {
        name: parsedInputSetObj.inputSet.name,
        tags: parsedInputSetObj.inputSet.tags,
        identifier: parsedInputSetObj.inputSet.identifier,
        description: parsedInputSetObj.inputSet.description,
        orgIdentifier: parsedInputSetObj.inputSet.orgIdentifier,
        projectIdentifier: parsedInputSetObj.inputSet.projectIdentifier,
        pipeline: clearRuntimeInput(parsedPipelineWithValues),
        gitDetails: defaultTo(inputSetObj.gitDetails, {}),
        connectorRef: defaultTo(inputSetObj.connectorRef, ''),
        inputSetErrorWrapper: defaultTo(inputSetObj.inputSetErrorWrapper, {}),
        entityValidityDetails: defaultTo(inputSetObj.entityValidityDetails, {}),
        outdated: inputSetObj.outdated
      }
    }
    return {
      name: inputSetObj.name,
      tags: inputSetObj.tags,
      identifier: defaultTo(inputSetObj.identifier, ''),
      description: inputSetObj?.description,
      orgIdentifier,
      projectIdentifier,
      pipeline: clearRuntimeInput(parsedPipelineWithValues),
      gitDetails: defaultTo(inputSetObj.gitDetails, {}),
      connectorRef: defaultTo(inputSetObj.connectorRef, ''),
      inputSetErrorWrapper: defaultTo(inputSetObj.inputSetErrorWrapper, {}),
      entityValidityDetails: defaultTo(inputSetObj.entityValidityDetails, {}),
      outdated: inputSetObj.outdated,
      cacheResponse: inputSetObj.cacheResponse,
      storeType: inputSetObj.storeType
    }
  }
  return getDefaultInputSet(
    clearRuntimeInput(parse<Pipeline>(defaultTo(template?.data?.inputSetTemplateYaml, ''))?.pipeline),
    orgIdentifier,
    projectIdentifier
  )
}

export function InputSetForm(props: InputSetFormProps): React.ReactElement {
  const { executionView, inputSetInitialValue, isNewInModal, className, onCancel, onCreateUpdateSuccess } = props
  const { getString } = useStrings()
  const [isEdit, setIsEdit] = React.useState(false)
  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier, inputSetIdentifier } = useParams<
    PipelineType<InputSetPathProps> & { accountId: string }
  >()
  const {
    repoIdentifier,
    branch,
    inputSetRepoIdentifier,
    inputSetBranch,
    connectorRef,
    inputSetConnectorRef,
    repoName,
    inputSetRepoName,
    storeType
  } = useQueryParams<InputSetGitQueryParams>()

  const defaultLoadFromCacheHeader = Boolean(inputSetRepoName).toString()
  const {
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF,
    supportingGitSimplification
  } = React.useContext(AppStoreContext)
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const [inputSetUpdateResponse, setInputSetUpdateResponse] = React.useState<ResponseInputSetResponse>()
  const [filePath, setFilePath] = React.useState<string>()
  const [loadFromCache, setLoadFromCache] = React.useState<string>(defaultLoadFromCacheHeader)
  const {
    refetch: refetchTemplate,
    data: template,
    loading: loadingTemplate
  } = useMutateAsGet(useGetTemplateFromPipeline, {
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      pipelineIdentifier,
      projectIdentifier,
      repoIdentifier,
      branch,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoName
    },
    body: {
      stageIdentifiers: []
    },
    requestOptions: { headers: { 'Load-From-Cache': loadFromCache } },
    lazy: true
  })

  const [selectedView, setSelectedView] = React.useState<SelectedView>(SelectedView.VISUAL)
  const [yamlHandler, setYamlHandler] = React.useState<YamlBuilderHandlerBinding | undefined>()
  const [formErrors, setFormErrors] = React.useState<Record<string, any>>({})
  const [resolvedPipeline, setResolvedPipeline] = React.useState<PipelineInfoConfig | undefined>()
  const { showError, clear } = useToaster()
  const { getRBACErrorMessage } = useRBACError()

  const getBranchQueryParams = (isMerge?: boolean): { branch?: string; loadFromFallbackBranch?: boolean } => {
    if (isGitSyncEnabled) {
      return { branch: inputSetBranch }
    } else if (repoName === inputSetRepoName) {
      // Even for same repo, while coming from NoEntityFound InputSet and pipeline branch may be different for 1st render too
      return isMerge ? { branch } : { branch: inputSetBranch || branch }
    } else {
      return inputSetBranch ? { branch: inputSetBranch } : { loadFromFallbackBranch: true }
    }
  }

  const getInputSetDefaultQueryParam = () => {
    return {
      accountIdentifier: accountId,
      orgIdentifier,
      pipelineIdentifier,
      projectIdentifier,
      ...(isGitSyncEnabled
        ? {
            pipelineRepoID: repoIdentifier,
            pipelineBranch: branch
          }
        : {}),
      repoIdentifier: isGitSyncEnabled ? inputSetRepoIdentifier : inputSetRepoName,
      ...getBranchQueryParams()
    }
  }

  const {
    data: inputSetResponse,
    refetch,
    loading: loadingInputSet,
    error: inputSetError
  } = useGetInputSetForPipeline({
    queryParams: getInputSetDefaultQueryParam(),
    inputSetIdentifier: defaultTo(inputSetIdentifier, ''),
    lazy: true
  })

  const [mergeTemplate, setMergeTemplate] = React.useState<string>()
  const { mutate: mergeInputSet, loading: loadingMerge } = useGetMergeInputSetFromPipelineTemplateWithListInput({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      pipelineIdentifier,
      pipelineRepoID: repoIdentifier,
      pipelineBranch: branch,
      repoIdentifier: isGitSyncEnabled ? inputSetRepoIdentifier : inputSetRepoName,
      ...getBranchQueryParams(true),
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoName
    },
    requestOptions: { headers: { 'Load-From-Cache': loadFromCache } }
  })

  const { mutate: createInputSet, loading: createInputSetLoading } = useCreateInputSetForPipeline({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      pipelineIdentifier,
      projectIdentifier,
      pipelineRepoID: repoIdentifier,
      pipelineBranch: branch
    },
    requestOptions: { headers: { 'content-type': 'application/yaml' } }
  })
  const { mutate: updateInputSet, loading: updateInputSetLoading } = useUpdateInputSetForPipeline({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      pipelineIdentifier,
      projectIdentifier,
      pipelineRepoID: repoIdentifier,
      pipelineBranch: branch
    },
    inputSetIdentifier: '',
    requestOptions: { headers: { 'content-type': 'application/yaml' } }
  })

  const {
    data: pipeline,
    loading: loadingPipeline,
    refetch: refetchPipeline
  } = useGetPipeline({
    pipelineIdentifier,
    lazy: true,
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      repoIdentifier,
      branch,
      getTemplatesResolvedPipeline: true,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoName
    }
  })

  const { handleSubmit } = useSaveInputSet({
    createInputSet,
    updateInputSet,
    inputSetResponse,
    isEdit,
    setFormErrors,
    onCreateUpdateSuccess
  })

  const inputSet: InputSetDTO | InputSetType = React.useMemo(() => {
    if (inputSetUpdateResponse) {
      return getInputSet(
        orgIdentifier,
        projectIdentifier,
        inputSetUpdateResponse,
        template,
        mergeTemplate,
        isGitSyncEnabled
      )
    }
    return getInputSet(orgIdentifier, projectIdentifier, inputSetResponse, template, mergeTemplate, isGitSyncEnabled)
  }, [
    mergeTemplate,
    inputSetResponse?.data,
    template?.data?.inputSetTemplateYaml,
    isGitSyncEnabled,
    inputSetUpdateResponse
  ])

  const [disableVisualView, setDisableVisualView] = React.useState(inputSet.entityValidityDetails?.valid === false)

  const formikRef = React.useRef<FormikProps<InputSetDTOGitDetails>>()

  const inputSetUpdateResponseHandler = (responseData: InputSetResponse): void => {
    setInputSetUpdateResponse({
      data: {
        ...responseData,
        inputSetYaml: responseData?.inputSetYaml
      }
    })
  }

  const parsedPipeline: PipelineInfoConfig | undefined = React.useMemo(
    () => yamlParse<PipelineConfig>(defaultTo(pipeline?.data?.yamlPipeline, ''))?.pipeline,
    [pipeline?.data?.yamlPipeline]
  )

  const latestYamlPipeline = React.useMemo(() => {
    if (selectedView === SelectedView.YAML) {
      const yaml = defaultTo(yamlHandler?.getLatestYaml(), '')
      return stringify(parse<InputSet>(yaml)?.inputSet?.pipeline)
    }
  }, [selectedView, yamlHandler])

  const { open: openDiffModal } = useDiffDialog({
    originalYaml: stringify(inputSet.pipeline),
    updatedYaml:
      selectedView === SelectedView.VISUAL ? stringify(formikRef?.current?.values?.pipeline) : latestYamlPipeline ?? '',
    title: getString('pipeline.inputSetDiffTitle')
  })

  React.useEffect(() => {
    setResolvedPipeline(
      yamlParse<PipelineConfig>(defaultTo(pipeline?.data?.resolvedTemplatesPipelineYaml, ''))?.pipeline
    )
  }, [pipeline?.data?.resolvedTemplatesPipelineYaml])

  const { loadingResolvedChildPipeline, resolvedMergedPipeline } = useGetResolvedChildPipeline(
    { accountId, repoIdentifier: defaultTo(repoName, repoIdentifier), branch, connectorRef },
    parsedPipeline,
    resolvedPipeline
  )

  React.useEffect(() => {
    if (!isEmpty(inputSet)) setFilePath(getFilePath(inputSet))
    if (!isInputSetInvalid(inputSet) && !hasStoreTypeMismatch(storeType, inputSetResponse?.data?.storeType, isEdit)) {
      setSelectedView(SelectedView.VISUAL)
    } else {
      setSelectedView(SelectedView.YAML)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputSet, inputSet.entityValidityDetails?.valid, storeType, isEdit])

  React.useEffect(() => {
    if (
      inputSet.entityValidityDetails?.valid === false ||
      inputSet.outdated ||
      hasStoreTypeMismatch(storeType, inputSetResponse?.data?.storeType, isEdit)
    ) {
      setDisableVisualView(true)
    } else {
      setDisableVisualView(false)
    }
  }, [inputSet.entityValidityDetails?.valid, inputSet.outdated, storeType, inputSetResponse?.data?.storeType, isEdit])

  React.useEffect(() => {
    if (inputSetIdentifier !== '-1' && !isNewInModal) {
      setIsEdit(true)
      refetch({
        pathParams: { inputSetIdentifier: inputSetIdentifier },
        requestOptions: { headers: { 'Load-From-Cache': loadFromCache } }
      })
      refetchTemplate()
      refetchPipeline({ requestOptions: { headers: { 'Load-From-Cache': loadFromCache } } })
    } else {
      refetchTemplate()
      refetchPipeline({ requestOptions: { headers: { 'Load-From-Cache': loadFromCache } } })

      setIsEdit(false)
    }
  }, [inputSetIdentifier])

  React.useEffect(() => {
    if (!loadingInputSet && inputSetResponse && !isInputSetInvalid(inputSet)) {
      // Merge only if inputset is valid
      mergeInputSet({
        inputSetReferences: [inputSetIdentifier]
      })
        .then(response => {
          setMergeTemplate(response.data?.pipelineYaml)
          setLoadFromCache(defaultLoadFromCacheHeader)
        })
        .catch(e => {
          setMergeTemplate(undefined)
          showError(getRBACErrorMessage(e), undefined, 'pipeline.get.template')
        })
    }
  }, [inputSetIdentifier, loadingInputSet])

  useDocumentTitle(
    isNewInModal
      ? document.title
      : [
          defaultTo(
            parse<Pipeline>(defaultTo(pipeline?.data?.yamlPipeline, ''))?.pipeline?.name,
            getString('pipelines')
          ),
          isEdit ? defaultTo(inputSetResponse?.data?.name, '') : getString('inputSets.newInputSetLabel')
        ]
  )

  const getFilePath = React.useCallback(
    (inputSetYamlVisual: InputSetDTO) => {
      if (inputSet.gitDetails?.filePath) {
        return inputSet.gitDetails?.filePath
      }
      if (filePath) {
        return filePath
      }
      return inputSetYamlVisual.identifier ? `.harness/${inputSetYamlVisual.identifier}.yaml` : ''
    },
    [inputSet, filePath]
  )

  const handleModeSwitch = React.useCallback(
    (view: SelectedView) => {
      if (view === SelectedView.VISUAL) {
        const yaml = defaultTo(yamlHandler?.getLatestYaml(), '')
        try {
          const inputSetYamlVisual = parse<InputSet>(yaml).inputSet
          if (inputSetYamlVisual) {
            inputSet.name = inputSetYamlVisual.name
            inputSet.identifier = inputSetYamlVisual.identifier
            inputSet.description = inputSetYamlVisual.description
            inputSet.pipeline = inputSetYamlVisual.pipeline

            const {
              repo: formikRefRepo,
              branch: formikRefBranch,
              connectorRef: formikRefConnectorRef,
              repoName: formikRefRepoName
            } = formikRef.current?.values ?? {}
            formikRef.current?.setValues({
              ...omit(inputSet, 'gitDetails', 'provider', 'entityValidityDetails', 'outdated', 'inputSetErrorWrapper'),
              repo: formikRefRepo ?? defaultTo(repoIdentifier || repoName, ''),
              branch: formikRefBranch ?? defaultTo(branch, ''),
              connectorRef: formikRefConnectorRef ?? defaultTo(connectorRef, ''),
              repoName: formikRefRepoName ?? defaultTo(repoName, ''),
              storeType: defaultTo(storeType, StoreType.INLINE),
              filePath: getFilePath(inputSetYamlVisual)
            })
            setFilePath(getFilePath(inputSetYamlVisual))
          }
        } catch {
          showError(getString('common.validation.invalidYamlText'))
          return
        }
      } else {
        setFilePath(formikRef.current?.values.filePath)
      }
      setSelectedView(view)
    },
    [yamlHandler?.getLatestYaml, inputSet]
  )

  const [isFormDirty, setIsFormDirty] = React.useState(false)
  // Form dirty and isSaveEnabled are different
  // form dirty is determined on formvalues.pipeline and save is enabled on ipset identifier
  const [isSaveEnabled, setIsSaveEnabled] = React.useState(false)

  const handleFormDirty = (dirty: boolean): void => {
    setIsFormDirty(dirty)
  }
  const handleSaveInputSetForm = (): void => {
    if (selectedView === SelectedView.YAML) {
      const latestYaml = defaultTo(yamlHandler?.getLatestYaml(), '')
      try {
        const inputSetDto: InputSetDTO = parse<{ inputSet: InputSetDTO }>(latestYaml)?.inputSet
        const identifier = inputSetDto.identifier
        const defaultFilePath = identifier ? `.harness/${identifier}.yaml` : ''
        const {
          repo: formikRepo,
          branch: formikBranch,
          provider: formikProvider,
          connectorRef: formikConnectorRef,
          repoName: formikRepoName,
          filePath: formikFilePath,
          storeType: formikStoreType
        } = defaultTo(formikRef.current?.values, {}) as InputSetDTOGitDetails
        handleSubmit(
          inputSetDto,
          {
            repoIdentifier: formikRepo,
            branch: formikBranch
          },
          {
            provider: formikProvider,
            connectorRef: (formikConnectorRef as unknown as ConnectorSelectedValue)?.value || formikConnectorRef,
            repoName: formikRepoName,
            branch: formikBranch,
            filePath: defaultTo(formikFilePath, defaultFilePath),
            storeType: formikStoreType
          }
        )
      } catch {
        clear()
        showError(getString('common.validation.invalidYamlText'))
        return
      }
    } else formikRef.current?.submitForm()
  }

  const child = React.useCallback(
    () => (
      <PipelineVariablesContextProvider
        pipeline={resolvedMergedPipeline}
        enablePipelineTemplatesResolution={false}
        storeMetadata={{
          storeType,
          connectorRef,
          repoName,
          branch,
          filePath,
          provider: getProvider(getString, connectorRef)
        }}
      >
        <FormikInputSetForm
          inputSet={isNewInModal && inputSetInitialValue ? merge(inputSet, inputSetInitialValue) : inputSet}
          template={template}
          pipeline={pipeline}
          resolvedPipeline={resolvedMergedPipeline}
          handleSubmit={handleSubmit}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
          yamlHandler={yamlHandler}
          setYamlHandler={setYamlHandler}
          formikRef={formikRef}
          selectedView={selectedView}
          executionView={executionView}
          isEdit={isEdit}
          isGitSyncEnabled={isGitSyncEnabled}
          supportingGitSimplification={supportingGitSimplification}
          className={className}
          onCancel={onCancel}
          filePath={filePath}
          handleFormDirty={handleFormDirty}
          setIsSaveEnabled={setIsSaveEnabled}
        />
      </PipelineVariablesContextProvider>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      inputSet,
      template,
      pipeline,
      resolvedMergedPipeline,
      handleSubmit,
      formErrors,
      setFormErrors,
      yamlHandler,
      setYamlHandler,
      formikRef,
      selectedView,
      executionView,
      isEdit,
      isGitSyncEnabled,
      updateInputSetLoading,
      filePath
    ]
  )

  if (executionView) {
    return child()
  }

  if (supportingGitSimplification && !loadingInputSet && inputSetError) {
    return (
      <NoEntityFound
        identifier={inputSetIdentifier}
        entityType={'inputSet'}
        entityConnectorRef={inputSetConnectorRef}
        gitDetails={{ ...inputSet?.gitDetails, repoName: inputSetRepoName, branch: inputSetBranch }}
        errorObj={inputSetError.data as Error}
      />
    )
  }

  if (loadingInputSet || loadingPipeline || loadingTemplate || loadingMerge || loadingResolvedChildPipeline) {
    return <ContainerSpinner height={'100vh'} flex={{ align: 'center-center' }} />
  }

  const branchChangeHandler = (selectedBranch?: string): void => {
    if (selectedBranch) {
      refetch({
        pathParams: { inputSetIdentifier: inputSetIdentifier },
        queryParams: {
          ...getInputSetDefaultQueryParam(),
          loadFromFallbackBranch: false,
          branch: selectedBranch
        },
        requestOptions: { headers: { 'Load-From-Cache': loadFromCache } }
      })
    }
  }

  function handleReloadFromCache(): void {
    flushSync(() => {
      setLoadFromCache('false')
    })
    refetch({
      pathParams: { inputSetIdentifier: inputSetIdentifier },
      requestOptions: { headers: { 'Load-From-Cache': 'false' } }
    })
    refetchTemplate({
      body: {
        stageIdentifiers: []
      },
      requestOptions: { headers: { 'Load-From-Cache': 'false' } }
    })
    refetchPipeline({ requestOptions: { headers: { 'Load-From-Cache': 'false' } } })
  }

  return (
    <InputSetFormWrapper
      loading={!isGitSyncEnabled && (createInputSetLoading || updateInputSetLoading)}
      isEdit={isEdit}
      selectedView={selectedView}
      handleModeSwitch={handleModeSwitch}
      handleSaveInputSetForm={handleSaveInputSetForm}
      inputSet={inputSet}
      pipeline={pipeline}
      isGitSyncEnabled={isGitSyncEnabled}
      disableVisualView={disableVisualView}
      inputSetUpdateResponseHandler={inputSetUpdateResponseHandler}
      onBranchChange={branchChangeHandler}
      handleReloadFromCache={handleReloadFromCache}
      openDiffModal={openDiffModal}
      isFormDirty={isFormDirty}
      onCancel={onCancel}
      isSaveEnabled={isSaveEnabled}
    >
      {child()}
    </InputSetFormWrapper>
  )
}

export interface InputSetFormWrapperProps {
  isEdit: boolean
  children: React.ReactNode
  selectedView: SelectedView
  loading: boolean
  handleModeSwitch(mode: SelectedView): void
  handleSaveInputSetForm: () => void
  inputSet: InputSetDTO
  pipeline: ResponsePMSPipelineResponseDTO | null
  isGitSyncEnabled?: boolean
  disableVisualView: boolean
  inputSetUpdateResponseHandler?: (responseData: InputSetResponse) => void
  onBranchChange?: (branch?: string) => void
  handleReloadFromCache?: (loadFromCache?: boolean) => void
  openDiffModal: any
  isFormDirty: boolean
  onCancel?: () => void
  isSaveEnabled?: boolean
}

export function InputSetFormWrapper(props: InputSetFormWrapperProps): React.ReactElement {
  const {
    isEdit,
    children,
    selectedView,
    handleModeSwitch,
    handleSaveInputSetForm,
    loading,
    inputSet,
    pipeline,
    isGitSyncEnabled,
    disableVisualView,
    inputSetUpdateResponseHandler,
    onBranchChange,
    handleReloadFromCache = noop,
    onCancel,
    isFormDirty = false,
    openDiffModal
  } = props

  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier } = useParams<
    PipelineType<InputSetPathProps> & { accountId: string }
  >()
  const { storeType } = useQueryParams<GitQueryParams>()
  const { PIE_INPUTSET_RBAC_PERMISSIONS } = useFeatureFlags()

  const [hasEditPermission] = usePermission(
    {
      resourceScope: {
        projectIdentifier,
        orgIdentifier,
        accountIdentifier: accountId
      },
      resource: PIE_INPUTSET_RBAC_PERMISSIONS
        ? {
            resourceType: ResourceType.INPUT_SET,
            resourceIdentifier: `${pipelineIdentifier}-${inputSet?.identifier}`
          }
        : {
            resourceType: ResourceType.PIPELINE,
            resourceIdentifier: pipelineIdentifier
          },
      permissions: PIE_INPUTSET_RBAC_PERMISSIONS
        ? [PermissionIdentifier.EDIT_INPUTSET]
        : [PermissionIdentifier.EDIT_PIPELINE],
      options: {
        skipCache: true
      }
    },
    [
      projectIdentifier,
      orgIdentifier,
      accountId,
      pipelineIdentifier,
      PIE_INPUTSET_RBAC_PERMISSIONS,
      inputSet?.identifier
    ]
  )

  const inputSetStoreType = isGitSyncEnabled ? undefined : inputSet.storeType

  const isEditable =
    hasEditPermission && (isGitSyncEnabled ? true : !hasStoreTypeMismatch(storeType, inputSetStoreType, isEdit))

  return (
    <React.Fragment>
      <InputSetFormHeader
        isEditable={isEditable}
        disableVisualView={disableVisualView}
        handleModeSwitch={handleModeSwitch}
        handleReloadFromCache={handleReloadFromCache}
        handleSaveInputSetForm={handleSaveInputSetForm}
        inputSet={inputSet}
        isEdit={isEdit}
        isFormDirty={isFormDirty}
        isGitSyncEnabled={isGitSyncEnabled}
        loading={loading}
        openDiffModal={openDiffModal}
        selectedView={selectedView}
        inputSetUpdateResponseHandler={inputSetUpdateResponseHandler}
        onBranchChange={onBranchChange}
        onCancel={onCancel}
        pipelineGitDetails={pipeline?.data?.gitDetails}
        pipelineName={defaultTo(parse<Pipeline>(defaultTo(pipeline?.data?.yamlPipeline, ''))?.pipeline.name, '')}
      />
      <PageBody loading={loading}>{children}</PageBody>
    </React.Fragment>
  )
}
