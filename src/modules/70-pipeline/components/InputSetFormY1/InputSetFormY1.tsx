/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Container,
  Layout,
  PageBody,
  VisualYamlSelectedView as SelectedView,
  Formik,
  FormikForm,
  Text
} from '@harness/uicore'
import cx from 'classnames'
import * as Yup from 'yup'
import type { FormikProps } from 'formik'
import {
  CreateInputSetOkResponse,
  UpdateInputSetOkResponse,
  useCreateInputSetMutation,
  useGetInputSetQuery,
  useGetInputsSchemaDetailsQuery,
  useMergedInputSetsMutation,
  useUpdateInputSetMutation
} from '@harnessio/react-pipeline-service-client'
import { cloneDeep, defaultTo, isEqual, omit, pick } from 'lodash-es'
import { useParams } from 'react-router-dom'
import { ResponsePMSPipelineResponseDTO, useGetPipeline } from 'services/pipeline-ng'
import { useToaster } from '@common/exports'
import type {
  CompletionItemInterface,
  InvocationMapFunction,
  YamlBuilderHandlerBinding,
  YamlBuilderProps
} from '@common/interfaces/YAMLBuilderProps'
import { ContainerSpinner } from '@common/components/ContainerSpinner/ContainerSpinner'
import type { InputSetGitQueryParams, InputSetPathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import { useStrings } from 'framework/strings'
import { parse, stringify } from '@common/utils/YamlHelperMethods'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { usePermission } from '@rbac/hooks/usePermission'
import { generateInputsFromMetadataResponse } from '@modules/70-pipeline/y1/components/InputsForm/utils'
import { UIInputs } from '@modules/70-pipeline/y1/components/InputsForm/types'
import { NameIdDescriptionTags } from '@modules/10-common/components'
import { NameSchema } from '@modules/10-common/utils/Validation'
import { YamlBuilderMemo } from '@modules/10-common/components/YAMLBuilder/YamlBuilder'
import { InputSetOnCreateUpdate, shouldDisableGitDetailsFields } from '@modules/70-pipeline/utils/inputSetUtils'
import { GitSyncForm } from '@modules/40-gitsync/components/GitSyncForm/GitSyncForm'
import { useQueryParams } from '@modules/10-common/hooks'
import useRBACError from '@modules/20-rbac/utils/useRBACError/useRBACError'
import { SettingType } from '@modules/10-common/constants/Utils'
import { EntityGitDetails, useGetSettingValue } from 'services/cd-ng'
import { StoreMetadata, StoreType } from '@modules/10-common/constants/GitSyncTypes'
import { PipelineInputsFormY1 } from '@modules/70-pipeline/y1/components/PipelineInputSetFormY1/PipelineInputSetFormY1'
import useDiffDialog from '@modules/10-common/hooks/useDiffDialog'
import NoEntityFound from '@modules/70-pipeline/pages/utils/NoEntityFound/NoEntityFound'
import { PipelineVariablesContextProvider } from '../PipelineVariablesContext/PipelineVariablesContext'
import { InputSetFormHeader } from '../InputSetFormHeader/InputSetFormHeader'
import { InputSetMetadataY1, FromikInputSetY1, InputSetY1, InputSetItem, InputSetKVPairs } from './types'
import { ErrorsStrip } from '../ErrorsStrip/ErrorsStrip'
import {
  addRemoveKeysFromInputSet,
  constructInputSetYamlObject,
  formikToGitMetadata,
  formikToMetadata,
  formikToYaml,
  getDefaultInputSet,
  getInputSetFromYaml,
  inputSetIdsToSelectedItems,
  replaceEmptyWithNull
} from './utils'
import { InputSetSelectorY1 } from '../InputSetSelectorY1/InputSetSelectorY1'
import { useSaveInputSetY1 } from './useSaveInputSetY1'
import { SelectedInputSetList } from '../InputSetSelector/SelectedInputSetList'
import { ManageInputsY1 } from './ManageInputsY1'
import css from './InputSetFormY1.module.scss'

const yamlBuilderReadOnlyModeProps: YamlBuilderProps = {
  fileName: 'input-set.yaml',
  entityType: 'InputSets',
  height: 'calc(100vh - 230px)',
  width: 'calc(100vw - 400px)',
  yamlSanityConfig: {
    removeEmptyString: false,
    removeEmptyObject: false,
    removeEmptyArray: false,
    removeNull: false
  }
}

type OverlayInputSetFormY1Props = InputSetOnCreateUpdate<
  CreateInputSetOkResponse | UpdateInputSetOkResponse | undefined
> & { pipelineName: string }

export function InputSetFormY1(props: OverlayInputSetFormY1Props): React.ReactElement {
  const { onCreateUpdateSuccess, pipelineName } = props
  const { showError } = useToaster()
  const { getString } = useStrings()
  const { getRBACErrorMessage } = useRBACError()
  const [isEdit, setIsEdit] = useState(false)
  const formikRef = useRef<FormikProps<FromikInputSetY1>>()
  const [formErrors] = useState<Record<string, unknown>>({})
  const [selectedInputSetItems, setSelectedInputSetItems] = useState<{
    selected: InputSetItem[]
    initial?: boolean
  }>({ selected: [] })
  const [allInputSetItems, setAllInputSetItems] = useState<InputSetItem[]>([])
  const [mergedInputSetValues, setMergedInputSetValues] = useState<InputSetKVPairs>({}) // undefined
  const [selectedView, setSelectedView] = useState<SelectedView>(SelectedView.VISUAL)
  const [yamlHandler, setYamlHandler] = useState<YamlBuilderHandlerBinding | undefined>()
  const [latestInputSetMetadata, setLatestInputSetMetadata] = useState<InputSetMetadataY1>({})
  const [latestGitMetadata, setLatestGitMetadata] = useState<StoreMetadata>({})
  const [storeMetadata, setStoreMetadata] = useState<StoreMetadata>({})
  const [initialized, setInitialized] = useState<boolean>(false)
  // all runtime inputs
  const [runtimeInputsAll, setRuntimeInputsAll] = useState<UIInputs>({ inputs: [], hasInputs: true }) //cloneDeep(runtimeInputs)
  // visible runtime inputs
  const [runtimeInputsVisible, setRuntimeInputsVisible] = useState<UIInputs>({ hasInputs: true, inputs: [] })
  // user selection (checkboxes changes)
  const [selectedInputKeys, setSelectedInputKeys] = useState<string[]>([])
  const [manageInputsActive, setManageInputsActive] = useState(false)

  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier, inputSetIdentifier } = useParams<
    PipelineType<InputSetPathProps> & { accountId: string }
  >()
  const queryParams = useQueryParams<InputSetGitQueryParams>()

  const { inputSetBranch, inputSetConnectorRef } = queryParams //inputSetRepoName

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

  const {
    data: inputSetResponse,
    isFetching: loadingInputSet,
    refetch: refetchInputSet,
    error: inputSetError
  } = useGetInputSetQuery(
    {
      'input-set': defaultTo(inputSetIdentifier, ''),
      queryParams: {
        pipeline: pipelineIdentifier,
        branch_name: inputSetBranch
      },
      org: orgIdentifier,
      project: projectIdentifier
    },
    { enabled: false, retry: false }
  )

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
      getTemplatesResolvedPipeline: true,
      branch: queryParams.branch
    }
  })

  const { mutateAsync: mergeInputSet2, isLoading: loadingMergeInputSets } = useMergedInputSetsMutation()

  const inputSetMetadata: InputSetMetadataY1 = useMemo(
    () => ({
      identifier: inputSetResponse?.content?.identifier,
      name: inputSetResponse?.content?.name,
      tags: inputSetResponse?.content?.tags,
      description: inputSetResponse?.content?.description
    }),
    [inputSetResponse]
  )

  useEffect(() => {
    setLatestInputSetMetadata(inputSetMetadata)
  }, [inputSetMetadata])

  useEffect(() => {
    if (inputSetResponse) {
      const newStoreMetadata = {
        branch: inputSetResponse?.content?.git_details?.branch_name,
        // TODO: fix after API fix
        connectorRef: inputSetResponse?.content?.git_details?.branch_name
          ? queryParams.inputSetConnectorRef
          : undefined, //TODO: fix after API fix; inputSetResponse?.content?.git_details?.connector_ref,
        repoName: inputSetResponse?.content?.git_details?.repo_name,
        //TODO: fix after API fix; inputSetResponse?.content?.git_details?.store_type
        storeType: (inputSetResponse?.content?.git_details?.branch_name ? 'REMOTE' : 'INLINE') as 'REMOTE' | 'INLINE',
        filePath: inputSetResponse?.content?.git_details?.file_path
      }
      setStoreMetadata(newStoreMetadata)
      setLatestGitMetadata(newStoreMetadata)
    }
  }, [inputSetResponse])

  useEffect(() => {
    if (selectedInputSetItems?.selected.length > 0) {
      mergeInputSet2({
        queryParams: {
          pipeline: pipelineIdentifier
        },
        body: {
          input_set_references: selectedInputSetItems?.selected?.map(item => item.value as string)
        },
        org: orgIdentifier,
        project: projectIdentifier
      }).then(response => {
        if (response.content.is_error_response) {
          showError('Something went wrong')
        }
        try {
          const mergedInputSet = omit(parse<InputSetKVPairs>(response.content.inputs_yaml_merged ?? '{}'), 'input_sets')
          setMergedInputSetValues(mergedInputSet)

          // on input set add/remove we are applying latest values from merge call
          if (!isEdit || !selectedInputSetItems.initial) {
            const currentSpec = formikRef?.current?.values?.spec ? formikRef.current.values.spec : {}
            // only visible
            const mergedInputSetVisible = pick(
              mergedInputSet,
              runtimeInputsVisible.inputs.map(input => input.name)
            )

            formikRef.current?.setFieldValue('spec', { ...currentSpec, ...mergedInputSetVisible })
          }
        } catch (e) {
          showError('Something went wrong')
        }
      })
    }
  }, [selectedInputSetItems])

  const { mutateAsync: createOverlayInputSet, isLoading: createOverlayInputSetLoading } = useCreateInputSetMutation()

  const { mutateAsync: updateOverlayInputSet, isLoading: updateOverlayInputSetLoading } = useUpdateInputSetMutation()

  const { handleSubmit } = useSaveInputSetY1({
    createInputSet: createOverlayInputSet,
    updateInputSet: updateOverlayInputSet,
    inputSetResponse,
    isEdit,
    setFormErrors: () => undefined,
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

  const { data: allowDifferentRepoSettings, error: allowDifferentRepoSettingsError } = useGetSettingValue({
    identifier: SettingType.ALLOW_DIFFERENT_REPO_FOR_INPUT_SETS,
    queryParams: { accountIdentifier: accountId },
    lazy: false
  })

  React.useEffect(() => {
    if (allowDifferentRepoSettingsError) {
      showError(getRBACErrorMessage(allowDifferentRepoSettingsError))
    }
  }, [allowDifferentRepoSettingsError, getRBACErrorMessage, showError])

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

  useEffect(() => {
    if (runtimeInputs.inputs.length > 0) {
      setRuntimeInputsAll(runtimeInputs)
    }
  }, [runtimeInputs])

  useEffect(() => {
    if (inputSetIdentifier !== '-1') {
      setIsEdit(true)
      refetchInputSet()
    } else {
      setIsEdit(false)
    }
    refetchPipeline()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputSetIdentifier])

  const handleModeSwitch = useCallback(
    (view: SelectedView) => {
      if (view === SelectedView.VISUAL) {
        const yaml = defaultTo(yamlHandler?.getLatestYaml(), '{}')
        try {
          const inputSetFromYaml = getInputSetFromYaml(parse<InputSetY1>(yaml), { escapeEmpty: true })

          if (inputSetFromYaml) {
            formikRef.current?.setValues({
              ...latestGitMetadata,
              ...latestInputSetMetadata,
              ...inputSetFromYaml
            })

            // set selected input set
            const inputSetArr = inputSetFromYaml.spec?.input_sets ?? []
            const isItems: InputSetItem[] = inputSetIdsToSelectedItems(inputSetArr, allInputSetItems)
            setSelectedInputSetItems({ selected: isItems })

            // set visible inputs
            const kvPairs = omit(defaultTo(inputSetFromYaml?.spec, {}), 'input_sets')
            const visibleInputs = runtimeInputs.inputs.filter(
              runtimeInput => typeof kvPairs[runtimeInput.name] !== 'undefined'
            )
            setRuntimeInputsVisible({ hasInputs: true, inputs: visibleInputs })
          }
        } catch {
          showError(getString('common.validation.invalidYamlText'))
          return
        }
      }
      setSelectedView(view)
    },
    [
      yamlHandler,
      latestGitMetadata,
      latestInputSetMetadata,
      allInputSetItems,
      runtimeInputs.inputs,
      showError,
      getString
    ]
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
        const latestOverlayInputSet = parse<InputSetY1>(latestYaml)
        const gitDetails: EntityGitDetails = {
          branch: storeMetadata.branch,
          repoIdentifier: storeMetadata.repoName,
          repoName: storeMetadata.repoName
        }
        handleSubmit({
          inputSet: latestOverlayInputSet,
          inputSetMetadata: latestInputSetMetadata,
          storeMetadata: latestGitMetadata,
          gitDetails
        })
      } catch {
        showError(getString('common.validation.invalidYamlText'))
      }
    } else {
      formikRef.current?.submitForm()
    }
  }

  const initialValues: FromikInputSetY1 = useMemo(
    () => ({
      version: 1,
      kind: 'input-set',
      name: '',
      identifier: '',
      spec: {}
    }),
    []
  )

  const { branch, connectorRef, storeType, repoName } = queryParams

  useEffect(() => {
    const initialStoreMetadata = {
      repo: defaultTo(repoName, ''),
      branch: defaultTo(branch, ''),
      connectorRef: defaultTo(connectorRef, ''),
      repoName: defaultTo(repoName, ''),
      storeType: defaultTo(storeType, StoreType.INLINE),
      filePath: ''
    }
    setStoreMetadata(initialStoreMetadata)
  }, [])

  const [overlayInputSetFormik, setOverlayInputSetFormik] = useState<FromikInputSetY1 | undefined>()

  useEffect(() => {
    if (isEdit) {
      if (inputSetResponse) {
        const inputSetData = parse<InputSetY1>(inputSetResponse?.content?.input_set_yaml || '')

        if (inputSetData?.spec) {
          const kvPairs = omit(inputSetData?.spec, 'input_sets')
          const visibleInputs = runtimeInputs.inputs.filter(
            runtimeInput => typeof kvPairs[runtimeInput.name] !== 'undefined'
          )
          setRuntimeInputsVisible({ hasInputs: true, inputs: visibleInputs })
        }

        setOverlayInputSetFormik({
          ...inputSetData,
          ...inputSetMetadata,
          ...storeMetadata
        })
      }
    } else {
      const kvNulls = Object.fromEntries(
        runtimeInputs.inputs.map(runtimeInput => [runtimeInput.name, runtimeInput.default ?? null])
      )

      setOverlayInputSetFormik({
        ...initialValues,
        spec: {
          ...kvNulls
        },
        ...storeMetadata
      })
    }
  }, [isEdit, inputSetResponse, inputSetMetadata, initialValues, storeMetadata, runtimeInputs])

  useEffect(() => {
    if (!isEdit) {
      setRuntimeInputsVisible(cloneDeep(runtimeInputs))
    }
  }, [isEdit, runtimeInputs])

  useEffect(() => {
    if (overlayInputSetFormik && allInputSetItems.length > 0 && !initialized) {
      const inputSetArr = overlayInputSetFormik?.spec?.input_sets ?? []

      const isItems: InputSetItem[] = inputSetIdsToSelectedItems(inputSetArr, allInputSetItems)

      setSelectedInputSetItems({ selected: isItems, initial: true })
      setInitialized(true)
    }
  }, [overlayInputSetFormik, allInputSetItems, initialized])

  const overlayInputSetListYaml: CompletionItemInterface[] = React.useMemo(() => {
    return allInputSetItems.map(constructInputSetYamlObject)
  }, [allInputSetItems])

  const invocationMap: YamlBuilderProps['invocationMap'] = new Map<RegExp, InvocationMapFunction>()
  invocationMap.set(
    /^spec.input_sets$/,
    (_matchingPath: string, _currentYaml: string): Promise<CompletionItemInterface[]> => {
      return Promise.resolve(overlayInputSetListYaml)
    }
  )

  const isEditable = hasEditPermission

  const latestInputSetYaml = useMemo(() => {
    if (selectedView === SelectedView.YAML) {
      const yaml = defaultTo(yamlHandler?.getLatestYaml(), '')
      return stringify(parse<InputSetY1>(yaml))
    }
  }, [selectedView, yamlHandler])

  const { open: openDiffModal } = useDiffDialog({
    originalYaml: stringify(formikToYaml(defaultTo(overlayInputSetFormik, getDefaultInputSet()))),
    updatedYaml:
      selectedView === SelectedView.VISUAL
        ? stringify(formikToYaml(defaultTo(formikRef.current?.values, getDefaultInputSet())))
        : defaultTo(latestInputSetYaml, ''),
    title: getString('pipeline.inputSetDiffTitle') // << TODO label
  })

  const branchChangeHandler = (selectedBranch?: string): void => {
    if (selectedBranch) {
      refetchInputSet()
    }
  }

  if (storeMetadata.storeType === 'REMOTE' && !loadingInputSet && inputSetError) {
    return (
      <NoEntityFound
        identifier={inputSetIdentifier}
        entityType={'inputSet'}
        entityConnectorRef={inputSetConnectorRef}
        gitDetails={{
          repoName: storeMetadata.repoName,
          branch: storeMetadata.branch,
          connectorRef: storeMetadata.connectorRef,
          filePath: storeMetadata.filePath
        }}
        errorObj={inputSetError}
      />
    )
  }

  if (loadingInputSet || inputsSchemaLoading || loadingPipeline || !overlayInputSetFormik) {
    return <ContainerSpinner height={'100vh'} flex={{ align: 'center-center' }} />
  }

  return (
    <InputSetFormWrapperY1
      loading={createOverlayInputSetLoading || updateOverlayInputSetLoading}
      isEdit={isEdit}
      selectedView={selectedView}
      handleModeSwitch={handleModeSwitch}
      handleSaveInputSetForm={handleSaveInputSetForm}
      inputSetMetadata={inputSetMetadata}
      inputSetGitMetadata={{
        storeType: storeMetadata.storeType as StoreType,
        connectorRef: storeMetadata.connectorRef,
        gitDetails: {
          repoName: storeMetadata.repoName,
          branch: storeMetadata.branch,
          filePath: storeMetadata.filePath
        }
      }}
      pipeline={pipeline}
      disableVisualView={false}
      openDiffModal={openDiffModal}
      isFormDirty={isFormDirty}
      isSaveEnabled={isSaveEnabled}
      isEditable={hasEditPermission}
      pipelineName={pipelineName}
      manageInputsActive={false}
      onBranchChange={branchChangeHandler}
    >
      <PipelineVariablesContextProvider
        enablePipelineTemplatesResolution={false}
        // TODO
        //pipeline={resolvedMergedPipeline}
        //storeMetadata={{ storeType, connectorRef, repoName, branch, filePath }}
      >
        <Formik<FromikInputSetY1>
          initialValues={overlayInputSetFormik}
          formName="overlayInputSet"
          enableReinitialize
          validationSchema={Yup.object().shape({
            name: NameSchema(getString, { requiredErrorMsg: getString('common.validation.nameIsRequired') })
          })}
          validate={values => {
            const { changed, values: newValues } = replaceEmptyWithNull(values)
            if (changed) {
              formikRef.current?.setValues(newValues, false)
            }

            setLatestInputSetMetadata(formikToMetadata(newValues))
            setLatestGitMetadata(formikToGitMetadata(newValues))
            //setStoreMetadata({...storeMetadata, })
            //setStoreMetadata({storeMetadata})
            if (formikRef.current?.values) {
              const formDirty = !isEqual(formikToYaml(overlayInputSetFormik), formikToYaml(newValues))
              handleFormDirty(formDirty)
              setIsSaveEnabled(!formDirty)
            }
          }}
          onSubmit={values => {
            handleSubmit({
              inputSet: formikToYaml(values),
              inputSetMetadata: formikToMetadata(values),
              storeMetadata: formikToGitMetadata(values),
              gitDetails: { branch: values.branch, repoIdentifier: values.repo, repoName: values.repo }
            })
          }}
        >
          {formikProps => {
            formikRef.current = formikProps
            return (
              <>
                {selectedView === SelectedView.VISUAL ? (
                  <FormikForm>
                    <Layout.Vertical>
                      <Container className={css.section}>
                        <NameIdDescriptionTags
                          className={css.nameId}
                          identifierProps={{
                            inputLabel: getString('name'),
                            isIdentifierEditable: !isEdit && isEditable,
                            inputGroupProps: {
                              disabled: !isEditable
                            }
                          }}
                          descriptionProps={{ disabled: !isEditable }}
                          tagsProps={{
                            disabled: !isEditable
                          }}
                          formikProps={formikProps}
                        />
                        {storeType === StoreType.REMOTE && (
                          <Container className={css.gitForm}>
                            <GitSyncForm
                              formikProps={formikProps}
                              isEdit={isEdit}
                              initialValues={storeMetadata}
                              disableFields={
                                shouldDisableGitDetailsFields(isEdit, allowDifferentRepoSettings?.data?.value)
                                  ? {
                                      connectorRef: true,
                                      repoName: true,
                                      branch: true,
                                      filePath: false
                                    }
                                  : {}
                              }
                            ></GitSyncForm>
                          </Container>
                        )}
                      </Container>
                      <Layout.Horizontal className={css.manageHolder} spacing={10}></Layout.Horizontal>
                      <Container className={cx(css.section, css.inputsSection)}>
                        <InputSetSelectorY1
                          pipelineIdentifier={pipelineIdentifier}
                          selectedInputSetItems={selectedInputSetItems.selected}
                          onAdd={inputSetItem => {
                            const newValue = [...selectedInputSetItems.selected, inputSetItem]
                            setSelectedInputSetItems({ selected: newValue })
                            formikProps.setFieldValue(
                              'spec.input_sets',
                              newValue.map(item => item.value)
                            )
                          }}
                          className={css.inputSetSelector}
                          listHolderClassName={css.listHolderClassName}
                          onListChange={inputSetItems => {
                            setAllInputSetItems(inputSetItems)
                          }}
                        />
                        <div className={css.inputSetPreviewHolder}>
                          <div className={css.selectedInputSetListHolder}>
                            {selectedInputSetItems && selectedInputSetItems.selected.length === 0 ? (
                              <Text margin={{ top: 'medium' }}>
                                {getString('pipeline.inputSets.noInputSetSelected')}
                              </Text>
                            ) : (
                              <Text
                                font={{ size: 'xsmall' }}
                                rightIconProps={{ size: 10 }}
                                rightIcon="arrow-right"
                                className={css.orderBy}
                              >
                                {getString('pipeline.inputSets.orderBy')}
                              </Text>
                            )}
                            <Container className={css.selectedInputSetList}>
                              <SelectedInputSetList
                                value={selectedInputSetItems.selected}
                                onChange={value => {
                                  setSelectedInputSetItems({ selected: value ?? [] })
                                  if (value && value.length > 0) {
                                    formikProps.setFieldValue(
                                      'spec.input_sets',
                                      value?.map(item => item.value)
                                    )
                                  } else {
                                    formikProps.setFieldValue('spec.input_sets', undefined)
                                  }
                                }}
                              />
                            </Container>
                          </div>

                          <ManageInputsY1
                            className={css.manageInputs}
                            active={manageInputsActive}
                            onActivate={() => {
                              setManageInputsActive(true)
                              setSelectedInputKeys(runtimeInputsVisible.inputs.map(input => input.name))
                            }}
                            onCancel={() => {
                              setManageInputsActive(false)
                              setSelectedInputKeys([])
                            }}
                            onApply={() => {
                              setManageInputsActive(false)
                              const newRuntimeInputsVisible = {
                                hasInputs: true,
                                inputs: runtimeInputsAll.inputs.filter(input => selectedInputKeys.includes(input.name))
                              }
                              setRuntimeInputsVisible(newRuntimeInputsVisible)

                              if (formikRef.current?.values) {
                                const newValues = addRemoveKeysFromInputSet(
                                  formikRef.current.values,
                                  selectedInputKeys,
                                  mergedInputSetValues
                                )
                                formikRef.current?.setValues(newValues)
                              }
                            }}
                            inputsCounter={{
                              all: runtimeInputsAll.inputs.length,
                              selected: selectedInputKeys.length
                            }}
                          />
                          <PipelineInputsFormY1
                            prefix={'spec.'}
                            className={css.inputsForm}
                            inputs={manageInputsActive ? runtimeInputsAll : runtimeInputsVisible}
                            readonly={manageInputsActive} // !isEditable
                            manageInputsActive={manageInputsActive}
                            selectedInputs={selectedInputKeys}
                            onSelectedInputsChange={setSelectedInputKeys}
                            disabled={loadingMergeInputSets}
                          />
                        </div>
                      </Container>
                    </Layout.Vertical>
                  </FormikForm>
                ) : (
                  <div className={css.editor}>
                    <ErrorsStrip formErrors={formErrors} />
                    <Layout.Vertical padding="xlarge">
                      <YamlBuilderMemo
                        {...yamlBuilderReadOnlyModeProps}
                        existingJSON={formikToYaml(formikProps?.values, { escapeEmpty: true })}
                        bind={setYamlHandler}
                        isReadOnlyMode={!isEditable}
                        isEditModeSupported={isEditable}
                        invocationMap={invocationMap}
                      />
                    </Layout.Vertical>
                  </div>
                )}
              </>
            )
          }}
        </Formik>
      </PipelineVariablesContextProvider>
    </InputSetFormWrapperY1>
  )
}

export interface InputSetOverlayFormWrapperY1Props {
  isEdit: boolean
  children: React.ReactNode
  selectedView: SelectedView
  loading: boolean
  handleModeSwitch(mode: SelectedView): void
  handleSaveInputSetForm: () => void
  inputSetMetadata?: InputSetMetadataY1
  inputSetGitMetadata?: { gitDetails: EntityGitDetails; storeType?: StoreType; connectorRef?: string }
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
  onBranchChange?: (branch?: string) => void
}

export function InputSetFormWrapperY1(props: InputSetOverlayFormWrapperY1Props): React.ReactElement {
  const {
    isEdit,
    children,
    selectedView,
    handleModeSwitch,
    handleSaveInputSetForm,
    loading,
    inputSetMetadata = {},
    inputSetGitMetadata,
    pipeline,
    disableVisualView,
    onCancel,
    isFormDirty = false,
    openDiffModal,
    isEditable,
    pipelineName,
    manageInputsActive,
    onBranchChange
  } = props

  return (
    <React.Fragment>
      <InputSetFormHeader
        isEditable={isEditable}
        disableVisualView={disableVisualView}
        handleModeSwitch={handleModeSwitch}
        handleReloadFromCache={() => undefined}
        handleSaveInputSetForm={handleSaveInputSetForm}
        inputSet={{
          ...inputSetMetadata,
          ...{
            // cacheResponse?: CacheResponseMetadata // TODO
            gitDetails: inputSetGitMetadata?.gitDetails,
            storeType: inputSetGitMetadata?.storeType,
            connectorRef: inputSetGitMetadata?.connectorRef
          }
        }}
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
        onBranchChange={onBranchChange}
      />
      <PageBody loading={loading}>{children}</PageBody>
    </React.Fragment>
  )
}
