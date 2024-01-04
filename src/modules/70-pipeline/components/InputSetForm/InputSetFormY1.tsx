/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { defaultTo, merge } from 'lodash-es'
import { PageBody, VisualYamlSelectedView as SelectedView } from '@harness/uicore'
import { useParams } from 'react-router-dom'
import type { FormikProps } from 'formik'
import {
  useCreateInputSetMutation,
  useGetInputSetQuery,
  useGetInputsSchemaDetailsQuery,
  useUpdateInputSetMutation
} from '@harnessio/react-pipeline-service-client'
import { useGetPipeline, ResponsePMSPipelineResponseDTO } from 'services/pipeline-ng'
import { useToaster } from '@common/exports'
import type { YamlBuilderHandlerBinding } from '@common/interfaces/YAMLBuilderProps'
import { ContainerSpinner } from '@common/components/ContainerSpinner/ContainerSpinner'
import type { InputSetPathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { useStrings } from 'framework/strings'
import { parse, stringify } from '@common/utils/YamlHelperMethods'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import useDiffDialog from '@common/hooks/useDiffDialog'
import { usePermission } from '@rbac/hooks/usePermission'
import { generateInputsFromMetadataResponse } from '@modules/70-pipeline/y1/components/InputsForm/utils'
import { UIInputs } from '@modules/70-pipeline/y1/components/InputsForm/types'
import { PipelineVariablesContextProvider } from '../PipelineVariablesContext/PipelineVariablesContext'
import { FormikInputSetFormY1 } from './FormikInputSetFormY1'
import { InputSetFormProps, InputSetKVPairs, InputSetMetadata } from './types'
import { useSaveInputSetY1 } from './useSaveInputSetY1'
import { InputSetFormHeader } from './InputSetFormHeader'
import { getInputSetFromFormikValues, getInputSetFromYaml } from './utils'

type InputSetFormY1Props = InputSetFormProps & { pipelineName: string }

export function InputSetFormY1(props: InputSetFormY1Props): React.ReactElement {
  const { pipelineName, inputSetInitialValue, isNewInModal, className, onCancel, onCreateUpdateSuccess } = props
  const { getString } = useStrings()
  const [isEdit, setIsEdit] = useState(false)
  const [manageInputsActive, setManageInputsActive] = useState(false)

  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier, inputSetIdentifier } = useParams<
    PipelineType<InputSetPathProps> & { accountId: string }
  >()
  const formikRef = useRef<FormikProps<InputSetKVPairs>>()
  const loadFromCache = 'true'

  const [hasEditPermission] = usePermission(
    {
      resourceScope: {
        projectIdentifier,
        orgIdentifier,
        accountIdentifier: accountId
      },
      resource: {
        resourceType: ResourceType.PIPELINE,
        resourceIdentifier: pipelineIdentifier
      },
      permissions: [PermissionIdentifier.EDIT_PIPELINE],
      options: {
        skipCache: true
      }
    },
    [projectIdentifier, orgIdentifier, accountId, pipelineIdentifier]
  )

  const [selectedView, setSelectedView] = useState<SelectedView>(SelectedView.VISUAL)
  const [yamlHandler, setYamlHandler] = useState<YamlBuilderHandlerBinding | undefined>()
  const [formErrors, setFormErrors] = useState<Record<string, unknown>>({})
  const { showError } = useToaster()
  const [latestInputSetMetadata, setLatestInputSetMetadata] = useState<InputSetMetadata>({})

  const {
    data: inputSetResponse,
    isFetching: loadingInputSet,
    refetch
  } = useGetInputSetQuery(
    {
      'input-set': defaultTo(inputSetIdentifier, ''),
      queryParams: {
        pipeline: pipelineIdentifier
      },
      org: orgIdentifier,
      project: projectIdentifier
    },
    { enabled: false }
  )

  const inputSetMetadata = useMemo(
    () => ({
      identifier: inputSetResponse?.content?.identifier,
      name: inputSetResponse?.content?.name
    }),
    [inputSetResponse]
  )

  useEffect(() => {
    setLatestInputSetMetadata(inputSetMetadata)
  }, [inputSetMetadata])

  const { mutateAsync: createInputSet, isLoading: createInputSetLoading } = useCreateInputSetMutation()

  const { mutateAsync: updateInputSet, isLoading: updateInputSetLoading } = useUpdateInputSetMutation()

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
      getTemplatesResolvedPipeline: true
    }
  })

  const { handleSubmit } = useSaveInputSetY1({
    createInputSet,
    updateInputSet,
    inputSetResponse,
    isEdit,
    setFormErrors,
    onCreateUpdateSuccess
  })

  const {
    data: inputsSchema,
    isRefetching: inputsSchemaLoading,
    failureReason: inputsSchemaError
  } = useGetInputsSchemaDetailsQuery({
    org: orgIdentifier,
    pipeline: pipelineIdentifier,
    project: projectIdentifier,
    queryParams: {}
  })

  useEffect(() => {
    if (inputsSchemaError) {
      showError((inputsSchemaError as { message: string })?.message)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsSchemaError])

  const runtimeInputs: UIInputs = useMemo(
    () => generateInputsFromMetadataResponse(inputsSchema?.content),
    [inputsSchema?.content]
  )

  const initialValues = useMemo(() => {
    return Object.fromEntries(
      runtimeInputs.inputs.map(runtimeInput => [runtimeInput.name, runtimeInput.default ?? null])
    )
  }, [runtimeInputs])

  const inputSet = useMemo(() => {
    if (isEdit) {
      const inputSetData = parse<{ inputSet: InputSetKVPairs }>(
        inputSetResponse?.content?.input_set_yaml || ''
      )?.inputSet
      return getInputSetFromYaml(inputSetData, { escapeEmpty: true })
    } else {
      return initialValues
    }
  }, [inputSetResponse, initialValues, isEdit])

  const latestInputSetYaml = useMemo(() => {
    if (selectedView === SelectedView.YAML) {
      const yaml = defaultTo(yamlHandler?.getLatestYaml(), '')
      return stringify(parse<InputSetKVPairs>(yaml))
    }
  }, [selectedView, yamlHandler])

  const { open: openDiffModal } = useDiffDialog({
    originalYaml: stringify(getInputSetFromFormikValues(inputSet)),
    updatedYaml:
      selectedView === SelectedView.VISUAL
        ? stringify(getInputSetFromFormikValues(formikRef?.current?.values ?? {}))
        : latestInputSetYaml ?? '',
    title: getString('pipeline.inputSetDiffTitle') // << TODO label
  })

  useEffect(() => {
    if (inputSetIdentifier !== '-1' && !isNewInModal) {
      setIsEdit(true)
      refetch()
      refetchPipeline({ requestOptions: { headers: { 'Load-From-Cache': loadFromCache } } })
    } else {
      setIsEdit(false)
      refetchPipeline({ requestOptions: { headers: { 'Load-From-Cache': loadFromCache } } })
    }
  }, [inputSetIdentifier])

  useDocumentTitle(
    isNewInModal
      ? document.title
      : [
          defaultTo(pipelineName, getString('pipelines')),
          isEdit ? defaultTo(inputSetResponse?.content?.name, '') : getString('inputSets.newInputSetLabel')
        ]
  )

  const handleModeSwitch = useCallback(
    (view: SelectedView) => {
      if (view === SelectedView.VISUAL) {
        const yaml = defaultTo(yamlHandler?.getLatestYaml(), '')
        try {
          const inputSetYamlVisual = getInputSetFromYaml(parse<InputSetKVPairs>(yaml), { escapeEmpty: true })
          if (inputSetYamlVisual) {
            formikRef.current?.setValues({
              ...latestInputSetMetadata,
              ...inputSetYamlVisual
            })
          }
        } catch {
          showError(getString('common.validation.invalidYamlText'))
          return
        }
      }
      setSelectedView(view)
    },
    [showError, getString, yamlHandler]
  )

  const [isFormDirty, setIsFormDirty] = useState(false)
  const [isSaveEnabled, setIsSaveEnabled] = useState(false)

  const handleFormDirty = (dirty: boolean): void => {
    setIsFormDirty(dirty)
  }

  const handleSaveInputSetForm = (): void => {
    if (selectedView === SelectedView.YAML) {
      const latestYaml = defaultTo(yamlHandler?.getLatestYaml(), '')
      try {
        const latestInputSet = parse<InputSetKVPairs>(latestYaml)
        handleSubmit({ inputSet: latestInputSet, inputSetMetadata: latestInputSetMetadata })
      } catch {
        showError(getString('common.validation.invalidYamlText'))
      }
    } else {
      formikRef.current?.submitForm()
    }
  }

  if (loadingInputSet || loadingPipeline || inputsSchemaLoading) {
    return <ContainerSpinner height={'100vh'} flex={{ align: 'center-center' }} />
  }

  return (
    <InputSetFormWrapperY1
      loading={createInputSetLoading || updateInputSetLoading}
      isEdit={isEdit}
      selectedView={selectedView}
      handleModeSwitch={handleModeSwitch}
      handleSaveInputSetForm={handleSaveInputSetForm}
      inputSet={inputSet}
      inputSetMetadata={inputSetMetadata}
      pipeline={pipeline}
      disableVisualView={false}
      openDiffModal={openDiffModal}
      isFormDirty={isFormDirty}
      onCancel={onCancel}
      isSaveEnabled={isSaveEnabled}
      isEditable={hasEditPermission}
      pipelineName={pipelineName}
      manageInputsActive={manageInputsActive}
    >
      <PipelineVariablesContextProvider
        enablePipelineTemplatesResolution={false}
        // TODO
        //pipeline={resolvedMergedPipeline}
        //storeMetadata={{ storeType, connectorRef, repoName, branch, filePath }}
      >
        <FormikInputSetFormY1
          runtimeInputs={runtimeInputs}
          inputSet={isNewInModal && inputSetInitialValue ? merge(inputSet, inputSetInitialValue) : inputSet}
          inputSetMetadata={inputSetMetadata}
          setLatestInputSetMetadata={setLatestInputSetMetadata}
          handleSubmit={handleSubmit}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
          yamlHandler={yamlHandler}
          setYamlHandler={setYamlHandler}
          formikRef={formikRef}
          selectedView={selectedView}
          isEdit={isEdit}
          className={className}
          onCancel={onCancel}
          handleFormDirty={handleFormDirty}
          setIsSaveEnabled={setIsSaveEnabled}
          isEditable={hasEditPermission}
          setManageInputsActive={setManageInputsActive}
          manageInputsActive={manageInputsActive}
        />
      </PipelineVariablesContextProvider>
    </InputSetFormWrapperY1>
  )
}

export interface InputSetFormWrapperY1Props {
  isEdit: boolean
  children: React.ReactNode
  selectedView: SelectedView
  loading: boolean
  handleModeSwitch(mode: SelectedView): void
  handleSaveInputSetForm: () => void
  inputSet: InputSetKVPairs
  inputSetMetadata: InputSetMetadata
  pipeline: ResponsePMSPipelineResponseDTO | null
  isGitSyncEnabled?: boolean
  disableVisualView: boolean
  openDiffModal: () => void
  isFormDirty: boolean
  onCancel?: () => void
  isSaveEnabled?: boolean
  isEditable: boolean
  pipelineName: string
  manageInputsActive: boolean
}

export function InputSetFormWrapperY1(props: InputSetFormWrapperY1Props): React.ReactElement {
  const {
    isEdit,
    children,
    selectedView,
    handleModeSwitch,
    handleSaveInputSetForm,
    loading,
    inputSet,
    inputSetMetadata,
    pipeline,
    disableVisualView,
    onCancel,
    isFormDirty = false,
    openDiffModal,
    isEditable,
    pipelineName,
    manageInputsActive
  } = props

  return (
    <React.Fragment>
      <InputSetFormHeader
        isEditable={isEditable}
        disableVisualView={disableVisualView}
        handleModeSwitch={handleModeSwitch}
        handleReloadFromCache={() => undefined}
        handleSaveInputSetForm={handleSaveInputSetForm}
        inputSet={{ ...inputSet, ...inputSetMetadata }}
        isEdit={isEdit}
        isFormDirty={isFormDirty}
        loading={loading}
        openDiffModal={openDiffModal}
        selectedView={selectedView}
        onCancel={onCancel}
        pipelineGitDetails={pipeline?.data?.gitDetails}
        pipelineName={pipelineName}
        yamlVersion="1"
        manageInputsActive={manageInputsActive}
      />
      <PageBody loading={loading}>{children}</PageBody>
    </React.Fragment>
  )
}
