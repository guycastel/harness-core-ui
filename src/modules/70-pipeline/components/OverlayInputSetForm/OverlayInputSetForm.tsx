/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo } from 'react'
import cx from 'classnames'
import { defaultTo, get, isNull, isUndefined, omit, omitBy, remove, set } from 'lodash-es'
import type { MutateRequestOptions } from 'restful-react/dist/Mutate'
import { Callout, Classes, Dialog, IDialogProps, Menu, PopoverPosition, Position } from '@blueprintjs/core'
import * as Yup from 'yup'
import {
  Button,
  ButtonVariation,
  Formik,
  FormikForm,
  Layout,
  Text,
  PageSpinner,
  VisualYamlSelectedView as SelectedView,
  VisualYamlToggle,
  Heading,
  Container,
  Popover
} from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { useParams } from 'react-router-dom'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'

import {
  OverlayInputSetResponse,
  useGetPipeline,
  useGetInputSetsListForPipeline,
  useGetOverlayInputSetForPipeline,
  useCreateOverlayInputSetForPipeline,
  useUpdateOverlayInputSetForPipeline,
  ResponseOverlayInputSetResponse,
  EntityGitDetails,
  UpdateOverlayInputSetForPipelineQueryParams,
  UpdateOverlayInputSetForPipelinePathParams,
  CreateOverlayInputSetForPipelineQueryParams,
  useGetMergeInputSetFromPipelineTemplateWithListInput,
  ResponseMergeInputSetResponse,
  GitErrorMetadataDTO
} from 'services/pipeline-ng'
import { useGetSettingValue } from 'services/cd-ng'
import { SettingType } from '@common/constants/Utils'
import { useToaster } from '@common/exports'
import { NameSchema } from '@common/utils/Validation'
import type {
  YamlBuilderHandlerBinding,
  YamlBuilderProps,
  InvocationMapFunction,
  CompletionItemInterface
} from '@common/interfaces/YAMLBuilderProps'
import YAMLBuilder from '@common/components/YAMLBuilder/YamlBuilder'
import { NameIdDescriptionTags } from '@common/components'
import { useStrings } from 'framework/strings'
import type { InputSetGitQueryParams } from '@common/interfaces/RouteInterfaces'
import { UseSaveSuccessResponse, useSaveToGitDialog } from '@common/modals/SaveToGitDialog/useSaveToGitDialog'
import type { SaveToGitFormInterface } from '@common/components/SaveToGitForm/SaveToGitForm'
import type { GitData } from '@common/modals/GitDiffEditor/useGitDiffEditorDialog'
import GitContextForm, { GitContextProps } from '@common/components/GitContextForm/GitContextForm'
import { useQueryParams } from '@common/hooks'
import { GitSyncForm } from '@gitsync/components/GitSyncForm/GitSyncForm'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { AppStoreContext } from 'framework/AppStore/AppStoreContext'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import type { CreateUpdateInputSetsReturnType, InputSetDTO } from '@pipeline/utils/types'
import { parse, yamlStringify } from '@common/utils/YamlHelperMethods'
import { getOverlayErrors } from '@pipeline/utils/runPipelineUtils'
import { getYamlFileName } from '@pipeline/utils/yamlUtils'
import { OutOfSyncErrorStrip } from '@pipeline/components/InputSetErrorHandling/OutOfSyncErrorStrip/OutOfSyncErrorStrip'
import { shouldDisableGitDetailsFields, hasStoreTypeMismatch, isInputSetInvalid } from '@pipeline/utils/inputSetUtils'
import type { PipelineInfoConfig } from 'services/pipeline-ng'
import type { ConnectorSelectedValue } from '@platform/connectors/components/ConnectorReferenceField/ConnectorReferenceField'
import NoEntityFound from '@pipeline/pages/utils/NoEntityFound/NoEntityFound'
import GitRemoteDetails from '@common/components/GitRemoteDetails/GitRemoteDetails'
import { isValueExpression } from '@common/utils/utils'
import { CardSelectInterface } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect'
import {
  getGitProvider,
  isHarnessCodeRepoEntity
} from '@modules/10-common/components/GitProviderSelect/GitProviderSelect.utils'
import { ErrorsStrip } from '../ErrorsStrip/ErrorsStrip'
import { InputSetSelector, InputSetSelectorProps } from '../InputSetSelector/InputSetSelector'
import {
  anyOneOf,
  constructInputSetYamlObject,
  getCreateUpdateRequestBodyOptions,
  getInputSetReference
} from './OverlayInputSetUtils'
import { getInputSetExpressionValue, InputSetValue } from '../InputSetSelector/utils'
import css from './OverlayInputSetForm.module.scss'

export interface OverlayInputSetDTO extends Omit<OverlayInputSetResponse, 'identifier'> {
  pipeline?: PipelineInfoConfig
  identifier?: string
  provider?: CardSelectInterface
  repo?: string
  branch?: string
}

export interface SaveOverlayInputSetDTO {
  overlayInputSet: OverlayInputSetDTO
}

const getDefaultInputSet = (
  orgIdentifier: string,
  projectIdentifier: string,
  pipelineIdentifier: string
): OverlayInputSetDTO => ({
  name: undefined,
  identifier: '',
  description: undefined,
  orgIdentifier,
  projectIdentifier,
  pipelineIdentifier,
  inputSetReferences: [],
  tags: {},
  repo: '',
  branch: ''
})

export interface OverlayInputSetFormProps {
  hideForm: () => void
  identifier?: string
  isReadOnly?: boolean
  overlayInputSetRepoIdentifier?: string
  overlayInputSetBranch?: string
  overlayInputSetRepoName?: string
  overlayInputSetConnectorRef?: string
}

const dialogProps: Omit<IDialogProps, 'isOpen'> = {
  usePortal: true,
  autoFocus: true,
  canEscapeKeyClose: true,
  canOutsideClickClose: true,
  enforceFocus: false,
  style: { minWidth: 700 },
  className: css.overlayInputSetDialog
}

const yamlBuilderReadOnlyModeProps: YamlBuilderProps = {
  fileName: `overlay-input-set.yaml`,
  entityType: 'Pipelines',
  width: 620,
  height: 360,
  yamlSanityConfig: {
    removeEmptyString: false,
    removeEmptyObject: false,
    removeEmptyArray: false
  }
}

const clearNullUndefined = /* istanbul ignore next */ (data: OverlayInputSetDTO): OverlayInputSetDTO =>
  omitBy(omitBy(data, isUndefined), isNull)

export function OverlayInputSetForm({
  hideForm,
  identifier,
  isReadOnly = false,
  overlayInputSetRepoIdentifier,
  overlayInputSetBranch,
  overlayInputSetRepoName,
  overlayInputSetConnectorRef
}: OverlayInputSetFormProps): React.ReactElement {
  const { getString } = useStrings()
  const [isOpen, setIsOpen] = React.useState(true)
  const [isEdit, setIsEdit] = React.useState(false)
  const [savedInputSetObj, setSavedInputSetObj] = React.useState<OverlayInputSetDTO>({})
  const {
    isGitSyncEnabled: isGitSyncEnabledForProject,
    supportingGitSimplification: gitSimplification,
    gitSyncEnabledOnlyForFF
  } = React.useContext(AppStoreContext)
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
    pipelineIdentifier: string
  }>()
  const {
    repoIdentifier,
    branch,
    connectorRef: pipelineConnectorRef,
    storeType,
    repoName: pipelineRepoName
  } = useQueryParams<InputSetGitQueryParams>()
  const repoName = overlayInputSetRepoName || pipelineRepoName
  const connectorRef = overlayInputSetConnectorRef || pipelineConnectorRef
  const [initialGitDetails, setInitialGitDetails] = React.useState<EntityGitDetails>({ repoIdentifier, branch })
  const [initialStoreMetadata, setInitialStoreMetadata] = React.useState<StoreMetadata>({
    repoName,
    branch,
    connectorRef,
    storeType
  })
  const [selectedView, setSelectedView] = React.useState<SelectedView>(SelectedView.VISUAL)
  const [yamlHandler, setYamlHandler] = React.useState<YamlBuilderHandlerBinding | undefined>()
  const [selectedRepo, setSelectedRepo] = React.useState<string>(overlayInputSetRepoIdentifier || repoIdentifier || '')
  const [selectedBranch, setSelectedBranch] = React.useState<string>(overlayInputSetBranch || branch || '')
  const [selectedInputSets, setSelectedInputSets] = React.useState<InputSetSelectorProps['value']>()
  const { showSuccess, showError, clear } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const [formErrors, setFormErrors] = React.useState<Record<string, any>>({})
  const [invalidInputSetIds, setInvalidInputSetIds] = React.useState<Array<string>>([])
  const [invokeMergeInp, setInvokeMergeInp] = React.useState<boolean>(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const isPipelineRemote = gitSimplification && storeType === StoreType.REMOTE
  const commonQueryParams = useMemo(() => {
    return {
      accountIdentifier: accountId,
      orgIdentifier,
      pipelineIdentifier,
      projectIdentifier,
      repoIdentifier
    }
  }, [accountId, orgIdentifier, pipelineIdentifier, projectIdentifier, repoIdentifier])

  const {
    data: overlayInputSetResponse,
    refetch: refetchOverlay,
    loading: loadingOverlayInputSet,
    error: errorOverlayInputSet
  } = useGetOverlayInputSetForPipeline({
    queryParams: {
      ...commonQueryParams,
      ...(isGitSyncEnabled
        ? {
            pipelineRepoID: repoIdentifier,
            pipelineBranch: branch
          }
        : {}),
      repoIdentifier: isGitSyncEnabled ? overlayInputSetRepoIdentifier : repoName,
      ...(isGitSyncEnabled
        ? { branch: overlayInputSetBranch }
        : { ...(overlayInputSetRepoName !== pipelineRepoName ? { loadFromFallbackBranch: true } : { branch }) })
    },
    inputSetIdentifier: defaultTo(identifier, ''),
    lazy: true
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

  const { mutate: createOverlayInputSet, loading: createOverlayInputSetLoading } = useCreateOverlayInputSetForPipeline({
    queryParams: { ...commonQueryParams, branch },
    requestOptions: { headers: { 'content-type': 'application/yaml' } }
  })
  const { mutate: updateOverlayInputSet, loading: updateOverlayInputSetLoading } = useUpdateOverlayInputSetForPipeline({
    queryParams: { ...commonQueryParams, branch },
    inputSetIdentifier: '',
    requestOptions: { headers: { 'content-type': 'application/yaml' } }
  })

  const {
    data: inputSetList,
    refetch: refetchInputSetList,
    loading: loadingInputSetList,
    error: errorInputSetList
  } = useGetInputSetsListForPipeline({
    queryParams: {
      ...commonQueryParams,
      inputSetType: 'INPUT_SET',
      repoIdentifier: selectedRepo,
      branch: selectedBranch,
      getDefaultFromOtherRepo: true
    },
    debounce: 300,
    lazy: true
  })

  const {
    data: pipeline,
    loading: loadingPipeline,
    refetch: refetchPipeline,
    error: errorPipeline
  } = useGetPipeline({
    pipelineIdentifier,
    lazy: true,
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      repoIdentifier,
      branch,
      parentEntityConnectorRef: pipelineConnectorRef,
      parentEntityRepoName: pipelineRepoName
    }
  })

  const { mutate: mergeInputSet, loading: loadingMergeInputSets } =
    useGetMergeInputSetFromPipelineTemplateWithListInput({
      queryParams: {
        accountIdentifier: accountId,
        projectIdentifier,
        orgIdentifier,
        pipelineIdentifier,
        pipelineRepoID: repoIdentifier,
        pipelineBranch: branch,
        repoIdentifier,
        branch,
        parentEntityConnectorRef: pipelineConnectorRef,
        parentEntityRepoName: pipelineRepoName
      }
    })

  const inputSetStoreType = overlayInputSetResponse?.data?.storeType
  const inputSet = React.useMemo(() => {
    if (!overlayInputSetResponse?.data) {
      return getDefaultInputSet(orgIdentifier, projectIdentifier, pipelineIdentifier)
    }
    const inputSetObj = overlayInputSetResponse.data
    const parsedInputSetObj = parse<{ overlayInputSet: OverlayInputSetDTO }>(
      defaultTo(inputSetObj?.overlayInputSetYaml, '')
    )
    if ((isGitSyncEnabled || inputSetObj.storeType === StoreType.REMOTE) && parsedInputSetObj?.overlayInputSet) {
      const parsedOverlayInputSet = parsedInputSetObj.overlayInputSet
      return {
        name: parsedOverlayInputSet.name as string,
        tags: parsedOverlayInputSet.tags as {
          [key: string]: string
        },
        identifier: parsedOverlayInputSet.identifier as string,
        description: parsedOverlayInputSet.description as string,
        orgIdentifier: parsedOverlayInputSet.orgIdentifier as string,
        projectIdentifier: parsedOverlayInputSet.projectIdentifier as string,
        pipelineIdentifier: parsedOverlayInputSet.pipelineIdentifier as string,
        inputSetReferences: defaultTo(parsedOverlayInputSet.inputSetReferences, []),
        gitDetails: defaultTo(inputSetObj.gitDetails, {}),
        entityValidityDetails: defaultTo(inputSetObj.entityValidityDetails, {}),
        outdated: inputSetObj.outdated
      }
    }
    return {
      name: inputSetObj.name,
      tags: inputSetObj.tags,
      identifier: inputSetObj.identifier,
      description: inputSetObj.description,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      inputSetReferences: defaultTo(inputSetObj?.inputSetReferences, []),
      gitDetails: defaultTo(inputSetObj.gitDetails, {}),
      entityValidityDetails: defaultTo(inputSetObj.entityValidityDetails, {}),
      outdated: inputSetObj.outdated
    }
  }, [overlayInputSetResponse?.data, isGitSyncEnabled])

  const [disableVisualView, setDisableVisualView] = React.useState(inputSet.entityValidityDetails?.valid === false)

  React.useEffect(() => {
    if (
      loadingOverlayInputSet ||
      (!isInputSetInvalid(inputSet) && !hasStoreTypeMismatch(storeType, inputSetStoreType, isEdit))
    ) {
      setSelectedView(SelectedView.VISUAL)
    } else {
      setSelectedView(SelectedView.YAML)
    }
  }, [
    inputSet,
    isEdit,
    inputSet.entityValidityDetails?.valid,
    inputSet.outdated,
    loadingOverlayInputSet,
    storeType,
    inputSetStoreType
  ])

  React.useEffect(() => {
    if (
      inputSet.entityValidityDetails?.valid === false ||
      inputSet.outdated ||
      (!loadingOverlayInputSet && hasStoreTypeMismatch(storeType, inputSetStoreType, isEdit))
    ) {
      setDisableVisualView(true)
    } else {
      setDisableVisualView(false)
    }
  }, [
    inputSet.entityValidityDetails?.valid,
    inputSet.outdated,
    loadingOverlayInputSet,
    inputSetStoreType,
    storeType,
    isEdit
  ])

  const inputSetListYaml: CompletionItemInterface[] = React.useMemo(() => {
    if (!inputSetList?.data?.content) return []
    return inputSetList.data.content.map(constructInputSetYamlObject)
  }, [inputSetList?.data?.content])

  const onReconcile = (inpSetId: string): void => {
    remove(invalidInputSetIds, id => id === inpSetId)
    setInvalidInputSetIds(invalidInputSetIds)
  }

  React.useEffect(() => {
    const inputSetsToSelect = inputSet.inputSetReferences?.reduce((accum, inputSetRef) => {
      const foundInputSet = inputSetList?.data?.content?.find(currInputSet => currInputSet.identifier === inputSetRef)
      if (!foundInputSet && isValueExpression(inputSetRef)) {
        const inputSetExpressionValue = getInputSetExpressionValue(inputSetRef)
        accum.push(inputSetExpressionValue)
      } else if (foundInputSet)
        accum.push({
          ...foundInputSet,
          label: defaultTo(foundInputSet?.name, ''),
          value: defaultTo(foundInputSet?.identifier, ''),
          type: foundInputSet?.inputSetType,
          gitDetails: defaultTo(foundInputSet?.gitDetails, {}),
          inputSetErrorDetails: foundInputSet?.inputSetErrorDetails,
          overlaySetErrorDetails: foundInputSet?.overlaySetErrorDetails
        })
      return accum
    }, [] as InputSetValue[])
    setSelectedInputSets(inputSetsToSelect)
  }, [inputSetList?.data?.content, inputSet.inputSetReferences])

  React.useEffect(() => {
    if (invokeMergeInp && selectedInputSets?.length) {
      mergeInputSet({
        inputSetReferences: selectedInputSets?.map(item => item.value as string)
      })
        .then((response: ResponseMergeInputSetResponse) => {
          if (response.data?.errorResponse) {
            setSelectedInputSets([])
          }
          setInvalidInputSetIds(get(response?.data, 'inputSetErrorWrapper.invalidInputSetReferences', []))
        })
        .catch(() => setInvokeMergeInp(false))
    }
  }, [selectedInputSets, selectedInputSets?.length, invokeMergeInp])

  React.useEffect(() => {
    if (identifier) {
      setIsEdit(true)
      refetchPipeline()
      refetchInputSetList()
      refetchOverlay({ pathParams: { inputSetIdentifier: identifier } })
    } else {
      refetchPipeline()
      refetchInputSetList()
      setIsEdit(false)
    }
  }, [identifier])

  React.useEffect(() => {
    refetchInputSetList()
  }, [selectedRepo, selectedBranch])

  const onRepoChange = (gitDetails: EntityGitDetails): void => {
    setSelectedRepo(defaultTo(gitDetails.repoIdentifier, ''))
    setSelectedBranch(defaultTo(gitDetails.branch, ''))
  }

  const onBranchChange = (gitDetails: EntityGitDetails): void => {
    setSelectedBranch(defaultTo(gitDetails.branch, ''))
  }

  const handleModeSwitch = React.useCallback(
    (view: SelectedView) => {
      if (view === SelectedView.VISUAL) {
        const yaml = defaultTo(yamlHandler?.getLatestYaml(), '')
        const inputSetYamlVisual = parse<{ overlayInputSet: OverlayInputSetDTO }>(yaml).overlayInputSet

        inputSet.name = inputSetYamlVisual.name
        inputSet.identifier = inputSetYamlVisual.identifier
        inputSet.description = inputSetYamlVisual.description
        inputSet.pipeline = inputSetYamlVisual.pipeline
        inputSet.inputSetReferences = inputSetYamlVisual.inputSetReferences
      }
      setSelectedView(view)
    },
    [yamlHandler?.getLatestYaml, inputSet]
  )

  const closeForm = React.useCallback(() => {
    setIsOpen(false)
    hideForm()
  }, [hideForm])

  const createUpdateOverlayInputSet = async (
    inputSetObj: InputSetDTO,
    gitDetails?: SaveToGitFormInterface,
    objectId = '',
    conflictCommitId?: string
  ): CreateUpdateInputSetsReturnType => {
    let response: ResponseOverlayInputSetResponse | null = null
    try {
      const requestData = yamlStringify({ overlayInputSet: clearNullUndefined(inputSetObj) })
      const requestOptions = getCreateUpdateRequestBodyOptions({
        isEdit,
        initialGitDetails,
        inputSetObj,
        orgIdentifier,
        accountId,
        projectIdentifier,
        pipelineIdentifier,
        gitDetails,
        objectId,
        initialStoreMetadata,
        conflictCommitId
      })
      response = isEdit
        ? await updateOverlayInputSet(requestData as unknown as void, {
            ...(requestOptions as MutateRequestOptions<
              UpdateOverlayInputSetForPipelineQueryParams,
              UpdateOverlayInputSetForPipelinePathParams
            >)
          })
        : await createOverlayInputSet(requestData, {
            ...(requestOptions as MutateRequestOptions<CreateOverlayInputSetForPipelineQueryParams, void>)
          })

      if (response) {
        // This is done because when git sync is enabled, errors are displayed in a modal
        if (!isGitSyncEnabled && initialStoreMetadata.storeType !== StoreType.REMOTE) {
          if (response.data?.errorResponse) {
            clear()
            showError(getString('inputSets.overlayInputSetSavedError'), undefined, 'pipeline.overlayinputset.error')
          } else {
            clear()
            showSuccess(getString('inputSets.overlayInputSetSaved'))
          }
        }
      }
      if (!isGitSyncEnabled && initialStoreMetadata.storeType !== StoreType.REMOTE) {
        closeForm()
      }
    } catch (e) {
      const invaliderrors = getOverlayErrors(e?.data?.metadata?.invalidReferences)
      if (Object.keys(invaliderrors).length) {
        setFormErrors(invaliderrors)
      }
      // This is done because when git sync is enabled or storeType is REMOTE, errors are displayed in a modal
      if (!isGitSyncEnabled && initialStoreMetadata.storeType !== StoreType.REMOTE) {
        showError(getRBACErrorMessage(e), undefined, 'pipeline.common.error')
      } else {
        throw e
      }
    }
    return {
      status: response?.status,
      nextCallback: () => closeForm()
    }
  }

  const { openSaveToGitDialog } = useSaveToGitDialog<SaveOverlayInputSetDTO>({
    onSuccess: (
      gitData: GitData,
      payload?: SaveOverlayInputSetDTO,
      objectId?: string
    ): Promise<UseSaveSuccessResponse> =>
      createUpdateOverlayInputSet(
        defaultTo(payload?.overlayInputSet, savedInputSetObj),
        gitData,
        objectId,
        gitData?.resolvedConflictCommitId
      )
  })

  const handleSubmit = React.useCallback(
    async (
      inputSetObjWithGitInfo: OverlayInputSetDTO,
      gitDetails?: EntityGitDetails,
      storeMetadata?: StoreMetadata
    ) => {
      const inputSetObj = omit(
        inputSetObjWithGitInfo,
        'repo',
        'branch',
        'provider',
        'connectorRef',
        'repoName',
        'filePath',
        'storeType'
      )
      const updatedGitDetails = {
        ...defaultTo(isEdit ? overlayInputSetResponse?.data?.gitDetails : gitDetails, {}),
        isHarnessCodeRepo: isHarnessCodeRepoEntity(inputSetObjWithGitInfo?.provider?.type)
      }

      // This removes the pseudo fields set for handling multiple fields in the form at once
      set(
        inputSetObj,
        'pipeline',
        omitBy(inputSetObjWithGitInfo?.pipeline, (_val, key) => key.startsWith('_'))
      )

      setSavedInputSetObj(inputSetObj)
      setInitialGitDetails(defaultTo(updatedGitDetails, {}))
      setInitialStoreMetadata(defaultTo(storeMetadata, {}))
      if (inputSetObj) {
        delete inputSetObj.pipeline
        if (isGitSyncEnabled || storeMetadata?.storeType === StoreType.REMOTE) {
          openSaveToGitDialog({
            isEditing: isEdit,
            resource: {
              type: 'InputSets',
              name: inputSetObj.name as string,
              identifier: inputSetObj.identifier as string,
              gitDetails: updatedGitDetails,
              storeMetadata: storeMetadata?.storeType === StoreType.REMOTE ? storeMetadata : undefined
            },
            payload: { overlayInputSet: inputSetObj }
          })
        } else {
          createUpdateOverlayInputSet(inputSetObj)
        }
      }
    },
    [
      isEdit,
      showSuccess,
      closeForm,
      showError,
      createOverlayInputSet,
      updateOverlayInputSet,
      isGitSyncEnabled,
      overlayInputSetResponse,
      pipeline
    ]
  )

  const hasRemoteFetchFailed = useMemo(() => {
    const errorMetadata = (errorOverlayInputSet?.data as any)?.metadata as GitErrorMetadataDTO
    return errorOverlayInputSet?.status === 400 && errorMetadata?.branch
  }, [errorOverlayInputSet?.data, errorOverlayInputSet?.status])

  const hasAnyApiError = useMemo(() => {
    return anyOneOf([errorPipeline, errorOverlayInputSet, errorInputSetList])
  }, [errorPipeline, errorOverlayInputSet, errorInputSetList])

  if (hasAnyApiError && !hasRemoteFetchFailed) {
    // Toaster is not required for RemoteFetchFailed
    clear()
    showError(
      defaultTo(getRBACErrorMessage(hasAnyApiError), getString('commonError')),
      undefined,
      'pipeline.common.error'
    )
  }

  const invocationMap: YamlBuilderProps['invocationMap'] = new Map<RegExp, InvocationMapFunction>()
  invocationMap.set(
    /^.+\.inputSetReferences$/,
    (_matchingPath: string, _currentYaml: string): Promise<CompletionItemInterface[]> => {
      return new Promise(resolve => {
        resolve(inputSetListYaml)
      })
    }
  )

  const selectedInputSetReferences: string[] | undefined = React.useMemo(() => {
    return selectedInputSets?.map(getInputSetReference)
  }, [selectedInputSets])

  const anyApiLoading = useMemo(() => {
    return anyOneOf([
      loadingPipeline,
      createOverlayInputSetLoading,
      updateOverlayInputSetLoading,
      loadingInputSetList,
      loadingOverlayInputSet
    ])
  }, [
    loadingPipeline,
    createOverlayInputSetLoading,
    updateOverlayInputSetLoading,
    loadingInputSetList,
    loadingOverlayInputSet
  ])

  const handleRemoteBranchChange = (changedBranch: string): void => {
    setSelectedBranch(changedBranch)
    refetchOverlay({
      pathParams: { inputSetIdentifier: identifier },
      queryParams: { ...commonQueryParams, loadFromFallbackBranch: false, branch: changedBranch }
    })
  }

  return (
    <Dialog
      title={
        hasRemoteFetchFailed ? (
          ''
        ) : (
          <Text
            tooltipProps={{
              position: PopoverPosition.RIGHT_TOP,
              isDark: true
            }}
            tooltip={
              <Text padding="medium" width={350} color={Color.GREY_200}>
                {getString('inputSets.selectInputSetsHelp')}
              </Text>
            }
            data-testid="overlay-input-set-description-tooltip"
            rightIcon="info-sign"
            rightIconProps={{
              color: Color.PRIMARY_7,
              margin: { left: 'xsmall' }
            }}
            font={{ weight: 'semi-bold', variation: FontVariation.H4 }}
          >
            {isEdit ? getString('inputSets.editOverlayTitle') : getString('inputSets.newOverlayInputSet')}
          </Text>
        )
      }
      onClose={() => closeForm()}
      isOpen={isOpen}
      {...dialogProps}
    >
      {anyApiLoading && selectedView === SelectedView.VISUAL && <PageSpinner />}
      <div className={Classes.DIALOG_BODY}>
        {hasRemoteFetchFailed ? (
          <NoEntityFound
            identifier={defaultTo(identifier, '')}
            entityType={'overlayInputSet'}
            entityConnectorRef={overlayInputSetConnectorRef}
            gitDetails={{
              ...inputSet?.gitDetails,
              repoName: repoName,
              branch: (errorOverlayInputSet?.data as any)?.metadata?.branch
            }}
            errorObj={errorOverlayInputSet?.data as Error}
            onBranchChange={handleRemoteBranchChange}
          />
        ) : (
          <Layout.Vertical spacing="medium">
            <Layout.Horizontal className={css.rowBtns}>
              <div className={css.optionBtns}>
                <VisualYamlToggle
                  selectedView={selectedView}
                  onChange={nextMode => {
                    handleModeSwitch(nextMode)
                  }}
                  disableToggle={disableVisualView}
                  disableToggleReasonIcon={'danger-icon'}
                  showDisableToggleReason={!hasStoreTypeMismatch(storeType, inputSetStoreType, isEdit)}
                />
              </div>
              <Layout.Horizontal>
                {isEdit && overlayInputSetResponse?.data?.storeType === StoreType.REMOTE && (
                  <Container>
                    <GitRemoteDetails
                      gitProviderType={getGitProvider(getString, overlayInputSetResponse?.data?.connectorRef).type}
                      connectorRef={overlayInputSetResponse?.data?.connectorRef}
                      repoName={inputSet?.gitDetails?.repoName}
                      branch={inputSet?.gitDetails?.branch}
                      flags={{ borderless: false, showRepo: false, normalInputStyle: true }}
                      onBranchChange={item => {
                        handleRemoteBranchChange(item?.branch)
                      }}
                    />
                  </Container>
                )}
                <Popover
                  className={Classes.DARK}
                  position={Position.LEFT}
                  isOpen={menuOpen}
                  onInteraction={nextOpenState => {
                    setMenuOpen(nextOpenState)
                  }}
                >
                  <Button
                    variation={ButtonVariation.ICON}
                    icon="Options"
                    aria-label="overlay input set menu actions"
                    onClick={() => setMenuOpen(true)}
                  />
                  <Menu style={{ backgroundColor: 'unset' }}>
                    <OutOfSyncErrorStrip
                      inputSet={inputSet}
                      overlayInputSetRepoIdentifier={overlayInputSetRepoIdentifier}
                      overlayInputSetBranch={overlayInputSetBranch}
                      overlayInputSetIdentifier={identifier}
                      pipelineGitDetails={get(pipeline, 'data.gitDetails')}
                      hideForm={hideForm}
                      isOverlayInputSet
                      hideInputSetButton
                      closeReconcileMenu={() => setMenuOpen(false)}
                    />
                  </Menu>
                </Popover>
              </Layout.Horizontal>
            </Layout.Horizontal>

            <Formik<OverlayInputSetDTO & GitContextProps & StoreMetadata>
              initialValues={{
                ...omit(inputSet, 'gitDetails', 'entityValidityDetails', 'outdated'),
                repo: isGitSyncEnabled ? defaultTo(repoIdentifier, '') : defaultTo(repoName, ''),
                branch: defaultTo(inputSet.gitDetails?.branch || branch, ''),
                connectorRef: defaultTo(connectorRef, ''),
                repoName: defaultTo(repoName, ''),
                storeType: defaultTo(storeType, StoreType.INLINE),
                filePath: defaultTo(inputSet.gitDetails?.filePath, `.harness/${inputSet.identifier}.yaml`),
                provider: getGitProvider(getString, connectorRef)
              }}
              formName="overlayInputSet"
              enableReinitialize={true}
              validationSchema={Yup.object().shape({
                name: NameSchema(getString, { requiredErrorMsg: getString('common.validation.nameIsRequired') }),
                inputSetReferences: Yup.array().of(Yup.string().required(getString('inputSets.inputSetIsRequired')))
              })}
              onSubmit={values => {
                handleSubmit(
                  { ...values, inputSetReferences: selectedInputSetReferences },
                  { repoIdentifier: values.repo, branch: values.branch, repoName: values.repo },
                  {
                    connectorRef:
                      (values.connectorRef as unknown as ConnectorSelectedValue)?.value || values.connectorRef,
                    repoName: values.repo,
                    branch: values.branch,
                    filePath: values.filePath,
                    storeType: values.storeType
                  }
                )
              }}
            >
              {formikProps => {
                return (
                  <>
                    {selectedView === SelectedView.VISUAL ? (
                      <>
                        <ErrorsStrip formErrors={formErrors} />
                        <FormikForm>
                          <div className={css.inputSetForm}>
                            <NameIdDescriptionTags
                              className={css.inputSetName}
                              identifierProps={{
                                inputLabel: getString('name'),
                                isIdentifierEditable: !isEdit && !isReadOnly,
                                inputGroupProps: {
                                  disabled: isReadOnly
                                }
                              }}
                              descriptionProps={{ disabled: isReadOnly }}
                              tagsProps={{
                                disabled: isReadOnly
                              }}
                              formikProps={formikProps}
                            />
                            {isGitSyncEnabled && (
                              <GitSyncStoreProvider>
                                <GitContextForm
                                  formikProps={formikProps}
                                  gitDetails={
                                    isEdit
                                      ? { ...overlayInputSetResponse?.data?.gitDetails, getDefaultFromOtherRepo: false }
                                      : {
                                          repoIdentifier,
                                          branch,
                                          getDefaultFromOtherRepo: true
                                        }
                                  }
                                  onRepoChange={onRepoChange}
                                  onBranchChange={onBranchChange}
                                />
                              </GitSyncStoreProvider>
                            )}
                            {!isGitSyncEnabled && isPipelineRemote && (
                              <Container>
                                <GitSyncForm
                                  formikProps={formikProps as any}
                                  isEdit={isEdit}
                                  disableFields={
                                    shouldDisableGitDetailsFields(isEdit, allowDifferentRepoSettings?.data?.value)
                                      ? {
                                          provider: true,
                                          connectorRef: true,
                                          repoName: true,
                                          branch: true,
                                          filePath: false
                                        }
                                      : {}
                                  }
                                  differentRepoAllowedSettings={allowDifferentRepoSettings?.data?.value === 'true'}
                                  shouldRenderRepositoryLocationCard
                                ></GitSyncForm>
                              </Container>
                            )}
                            {inputSet && (
                              <>
                                <div className={cx(css.divider, css.inputSetName)} />
                                <Layout.Vertical padding={{ top: 'large', bottom: 'xxlarge' }} spacing="small">
                                  <Heading level={6} className={css.exisitingInputSetsHeader}>
                                    {getString('pipeline.pipelineInputPanel.useExisitingInputSets')}
                                  </Heading>
                                  <GitSyncStoreProvider>
                                    <InputSetSelector
                                      pipelineIdentifier={pipelineIdentifier}
                                      onChange={inputsets => {
                                        setSelectedInputSets(inputsets)
                                        setInvokeMergeInp(true)
                                      }}
                                      value={selectedInputSets}
                                      selectedRepo={selectedRepo}
                                      selectedBranch={selectedBranch}
                                      isOverlayInputSet={true}
                                      selectedValueClass={css.selectedInputSetsContainer}
                                      pipelineGitDetails={get(pipeline, 'data.gitDetails')}
                                      hideInputSetButton={true}
                                      invalidInputSetReferences={invalidInputSetIds}
                                      loadingMergeInputSets={loadingMergeInputSets}
                                      onReconcile={onReconcile}
                                    />
                                  </GitSyncStoreProvider>
                                </Layout.Vertical>
                              </>
                            )}
                          </div>
                          <Layout.Horizontal padding={{ top: 'medium' }}>
                            <Button
                              variation={ButtonVariation.PRIMARY}
                              type="submit"
                              text={getString('save')}
                              disabled={isReadOnly}
                            />
                            &nbsp; &nbsp;
                            <Button
                              variation={ButtonVariation.TERTIARY}
                              onClick={closeForm}
                              text={getString('cancel')}
                            />
                          </Layout.Horizontal>
                        </FormikForm>
                      </>
                    ) : (
                      <div className={css.editor}>
                        <ErrorsStrip formErrors={formErrors} />

                        <>
                          {hasStoreTypeMismatch(storeType, inputSetStoreType, isEdit) ? (
                            <Callout intent="danger">{getString('pipeline.inputSetInvalidStoreTypeCallout')}</Callout>
                          ) : null}
                          <YAMLBuilder
                            {...yamlBuilderReadOnlyModeProps}
                            existingJSON={{
                              overlayInputSet: {
                                ...omit(
                                  formikProps?.values,
                                  'pipeline',
                                  'repo',
                                  'branch',
                                  'connectorRef',
                                  'provider',
                                  'repoName',
                                  'filePath',
                                  'storeType'
                                ),
                                inputSetReferences: selectedInputSetReferences
                              }
                            }}
                            invocationMap={invocationMap}
                            bind={setYamlHandler}
                            isReadOnlyMode={isReadOnly || hasStoreTypeMismatch(storeType, inputSetStoreType, isEdit)}
                            isEditModeSupported={
                              !isReadOnly && !hasStoreTypeMismatch(storeType, inputSetStoreType, isEdit)
                            }
                            hideErrorMesageOnReadOnlyMode={hasStoreTypeMismatch(storeType, inputSetStoreType, isEdit)}
                            fileName={getYamlFileName({
                              isPipelineRemote,
                              filePath: inputSet?.gitDetails?.filePath,
                              defaultName: yamlBuilderReadOnlyModeProps.fileName
                            })}
                          />
                        </>

                        <Layout.Horizontal padding={{ top: 'medium' }}>
                          <Button
                            variation={ButtonVariation.PRIMARY}
                            type="submit"
                            text={getString('save')}
                            onClick={() => {
                              const latestYaml = defaultTo(yamlHandler?.getLatestYaml(), '')

                              handleSubmit(
                                parse<{ overlayInputSet: OverlayInputSetDTO }>(latestYaml)?.overlayInputSet,
                                {
                                  repoIdentifier: formikProps.values.repo,
                                  branch: formikProps.values.branch,
                                  repoName: formikProps.values.repo
                                },
                                {
                                  connectorRef: formikProps.values.connectorRef,
                                  repoName: formikProps.values.repo,
                                  branch: formikProps.values.branch,
                                  filePath: formikProps.values.filePath,
                                  storeType: formikProps.values.storeType
                                }
                              )
                            }}
                            disabled={isReadOnly || hasStoreTypeMismatch(storeType, inputSetStoreType, isEdit)}
                          />
                          &nbsp; &nbsp;
                          <Button variation={ButtonVariation.TERTIARY} onClick={closeForm} text={getString('cancel')} />
                        </Layout.Horizontal>
                      </div>
                    )}
                  </>
                )
              }}
            </Formik>
          </Layout.Vertical>
        )}
      </div>
    </Dialog>
  )
}
