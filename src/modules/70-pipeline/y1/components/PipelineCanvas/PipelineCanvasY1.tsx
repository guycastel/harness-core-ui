/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { Classes, Dialog, IDialogProps, Intent } from '@blueprintjs/core'
import cx from 'classnames'
import {
  Button,
  ButtonVariation,
  Container,
  Layout,
  PageSpinner,
  useConfirmationDialog,
  useToaster,
  VisualYamlSelectedView as SelectedView,
  ModalDialog
} from '@harness/uicore'
import { useModalHook } from '@harness/use-modal'
import { matchPath, useHistory, useLocation, useParams } from 'react-router-dom'
import { defaultTo, isEmpty, merge } from 'lodash-es'
import produce from 'immer'
import { parse } from '@common/utils/YamlHelperMethods'
import type { Error, PipelineInfoConfig, ResponsePMSPipelineSummaryResponse } from 'services/pipeline-ng'
import { EntityGitDetails, useGetInputsetYaml } from 'services/pipeline-ng'
import { useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import type {
  GitQueryParams,
  PipelinePathProps,
  PipelineStudioQueryParams,
  PipelineType,
  RunPipelineQueryParams
} from '@common/interfaces/RouteInterfaces'
import routes from '@common/RouteDefinitions'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import type { GitFilterScope } from '@common/components/GitFilters/GitFilters'
import type { IGitContextFormProps } from '@common/components/GitContextForm/GitContextForm'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import GenericErrorHandler from '@common/pages/GenericErrorHandler/GenericErrorHandler'
import { RunPipelineFormY1 } from '@pipeline/y1/components/RunPipelineModal/RunPipelineFormY1'
import { RightBarY1 } from '@pipeline/y1/components/RightBar/RightBarY1'
// TODO start
import { PipelineVariablesContextProvider } from '@pipeline/components/PipelineVariablesContext/PipelineVariablesContext'
import NoEntityFound, { handleFetchFailure } from '@pipeline/pages/utils/NoEntityFound/NoEntityFound'
import { createTemplate } from '@pipeline/utils/templateUtils'
// import StageBuilder from '@pipeline/components/PipelineStudio/StageBuilder/StageBuilder'
// import { TemplatePipelineBuilder } from '@pipeline/components/PipelineStudio/PipelineTemplateBuilder/TemplatePipelineBuilder/TemplatePipelineBuilder'
import { useSaveTemplateListener } from '@pipeline/components/PipelineStudio/hooks/useSaveTemplateListener'
import { NodeMetadataProvider } from '@pipeline/components/PipelineDiagram/Nodes/NodeMetadataContext'
import usePipelineErrors from '@pipeline/components/PipelineStudio/PipelineCanvas/PipelineErrors/usePipelineErrors'
import PipelineCreate from '@pipeline/components/PipelineStudio/CreateModal/PipelineCreate'
// TODO end
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { useTemplateSelector } from 'framework/Templates/TemplateSelectorContext/useTemplateSelector'
import { SettingType } from '@common/constants/Utils'
import { useGetSettingsList } from 'services/cd-ng'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { getPipelineUrl } from '@common/hooks/useGetEntityMetadata'
import { getDefaultStoreType, getSettingValue } from '@default-settings/utils/utils'
import { PipelineMetadataForRouter } from '@pipeline/components/CreatePipelineButton/useCreatePipelineModalY1'
import { NavigationCheck } from '@modules/10-common/exports'
import { accountPathProps, pipelineModuleParams, pipelinePathProps } from '@modules/10-common/utils/routeUtils'
import { usePipelineContextY1 } from '../PipelineContext/PipelineContextY1'
import { DefaultNewPipelineId } from '../PipelineContext/PipelineActionsY1'
import PipelineYamlViewY1 from '../PipelineYamlView/PipelineYamlViewY1'
import { PipelineCanvasHeaderY1 } from './PipelineCanvasHeaderY1'
import css from './PipelineCanvasY1.module.scss'

// TODO
// interface OtherModalProps {
//   onSubmit?: (values: PipelineInfoConfig) => void
//   initialValues?: PipelineInfoConfig
//   onClose?: () => void
// }

interface PipelineWithGitContextFormProps extends PipelineInfoConfig {
  repo?: string
  branch?: string
  connectorRef?: string
  filePath?: string
  storeType?: string
}

// interface InputSetValue extends SelectOption {
//   type: InputSetSummaryResponse['inputSetType']
//   gitDetails?: EntityGitDetails
// }

const runModalProps: IDialogProps = {
  isOpen: true,
  // usePortal: true,
  autoFocus: true,
  canEscapeKeyClose: true,
  canOutsideClickClose: false,
  enforceFocus: false,
  className: css.runPipelineDialog,
  style: { width: 1028, height: 'fit-content', overflow: 'auto' },
  isCloseButtonShown: false
}

export function PipelineCanvasY1(): React.ReactElement {
  const { supportingGitSimplification, isNewNavEnabled } = useAppStore()
  const {
    state,
    updatePipeline,
    updatePipelineStoreMetadata,
    updateGitDetails,
    deletePipelineCache,
    fetchPipeline,
    view,
    setView,
    isReadonly
  } = usePipelineContextY1()
  const { getTemplate } = useTemplateSelector()
  const {
    repoIdentifier,
    branch,
    runPipeline,
    executionId,
    inputSetType,
    inputSetValue,
    inputSetLabel,
    inputSetRepoIdentifier,
    inputSetBranch,
    stagesExecuted,
    repoName,
    connectorRef,
    storeType
  } = useQueryParams<GitQueryParams & RunPipelineQueryParams>()
  const { updateQueryParams, replaceQueryParams } = useUpdateQueryParams<PipelineStudioQueryParams>()
  const {
    pipeline,
    pipelineMetadata,
    isUpdated,
    isLoading,
    isInitialized,
    originalPipeline,
    isBEPipelineUpdated,
    gitDetails,
    remoteFetchError,
    storeMetadata,
    entityValidityDetails,
    templateError,
    yamlSchemaErrorWrapper
  } = state

  const { getString } = useStrings()
  const { accountId, projectIdentifier, orgIdentifier, pipelineIdentifier, module } = useParams<
    PipelineType<PipelinePathProps> & GitQueryParams
  >()
  const history = useHistory()
  const { state: routerState } = useLocation<Optional<PipelineMetadataForRouter>>()
  const [pipelineSummaryError, setPipelineSummaryError] = useState<ResponsePMSPipelineSummaryResponse | undefined>()

  React.useEffect(() => {
    // Populating pipeline context with pipeline metadata after DB is initialised with DefaultPipeline with state property of the location object
    if (routerState?.updatedPipeline && state.isInitialized) {
      const { updatedPipeline, gitDetails: updatedGitDetails, storeMetadata: updatedStoreMetadata } = routerState

      const latestPipeline = {
        ...updatedPipeline,
        projectIdentifier,
        orgIdentifier,
        version: Number(routerState.yamlSyntax)
      } as PipelineInfoConfig

      updatePipeline(latestPipeline).then(async () => {
        if (updatedStoreMetadata?.storeType) {
          await updatePipelineStoreMetadata(updatedStoreMetadata, updatedGitDetails as EntityGitDetails, latestPipeline)
        }

        if (updatedGitDetails) {
          updateGitDetails(updatedGitDetails, latestPipeline).then(() => {
            if (updatedGitDetails) {
              if (supportingGitSimplification && updatedStoreMetadata?.storeType === StoreType.REMOTE) {
                updateQueryParams(
                  {
                    connectorRef: updatedStoreMetadata.connectorRef,
                    repoName: updatedGitDetails?.repoName,
                    branch: updatedGitDetails.branch,
                    storeType: updatedStoreMetadata.storeType as StoreType
                  },
                  { skipNulls: true }
                )
              }
            }
          })
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerState, supportingGitSimplification, updateQueryParams, state.isInitialized])

  // For remote pipeline queryParam will always as branch as selected branch except coming from list view
  // While opening studio from list view, selected branch can be any branch as in pipeline response
  // We also have to discard Transition url which was without branch
  React.useEffect(() => {
    if (
      originalPipeline?.identifier !== DefaultNewPipelineId &&
      storeType === StoreType.REMOTE &&
      !branch &&
      gitDetails?.branch
    ) {
      history.replace(routes.toPipelines({ orgIdentifier, projectIdentifier, accountId, module }))
      updateQueryParams({ branch: gitDetails?.branch })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, gitDetails?.branch, module, originalPipeline?.identifier, projectIdentifier])

  // Handling when user move a pipline to REMOTE but still opening pipelineStudio with INLINE url
  React.useEffect(() => {
    if (originalPipeline?.identifier !== DefaultNewPipelineId && storeMetadata?.storeType !== storeType) {
      getPipelineUrl(
        {
          accountIdentifier: accountId,
          orgIdentifier,
          projectIdentifier,
          branch: gitDetails?.branch
        },
        defaultTo(pipelineMetadata?.identifier, pipeline?.identifier),
        !!isNewNavEnabled
      )
        .then((remotePiplineRoute: string) => {
          history.push(remotePiplineRoute)
        })
        .catch(err => {
          setPipelineSummaryError(err)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gitDetails?.branch, storeType])

  const { showError } = useToaster()

  useDocumentTitle([parse(pipelineMetadata?.name || getString('pipelines'))])
  const [discardBEUpdateDialog, setDiscardBEUpdate] = React.useState(false)
  const { openDialog: openConfirmBEUpdateError } = useConfirmationDialog({
    cancelButtonText: getString('cancel'),
    contentText: getString('pipelines-studio.pipelineUpdatedError'),
    titleText: getString('pipelines-studio.pipelineUpdated'),
    className: css.beErrorModal,
    confirmButtonText: getString('update'),
    intent: Intent.WARNING,
    onCloseDialog: isConfirmed => {
      if (isConfirmed) {
        fetchPipeline()
      } else {
        setDiscardBEUpdate(true)
      }
    }
  })

  const { openPipelineErrorsModal } = usePipelineErrors()
  const [isYamlError, setYamlError] = React.useState(false)
  const [blockNavigation, setBlockNavigation] = React.useState(false)
  const [selectedBranch, setSelectedBranch] = React.useState(defaultTo(branch, ''))
  const [disableVisualView, setDisableVisualView] = React.useState(entityValidityDetails?.valid === false)
  const [useTemplate, setUseTemplate] = React.useState<boolean>(false)
  const [modalMode, setModalMode] = React.useState<'edit' | 'create'>('create')
  const { getRBACErrorMessage } = useRBACError()
  const isPipelineRemote = supportingGitSimplification && storeType === StoreType.REMOTE

  React.useEffect(() => {
    if (isPipelineRemote) {
      openPipelineErrorsModal(yamlSchemaErrorWrapper?.schemaErrors)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yamlSchemaErrorWrapper, isPipelineRemote])

  const { openDialog: openUnsavedChangesDialog } = useConfirmationDialog({
    cancelButtonText: getString('common.stayOnThisPage'),
    className: css.dialogStyle,
    contentText: isYamlError ? getString('navigationYamlError') : getString('navigationCheckText'),
    titleText: isYamlError ? getString('navigationYamlErrorTitle') : getString('navigationCheckTitle'),
    confirmButtonText: getString('common.leaveThisPage'),
    intent: Intent.WARNING,
    showCloseButton: false,
    onCloseDialog: async isConfirmed => {
      if (isConfirmed) {
        deletePipelineCache(gitDetails).then(() => {
          history.push(
            routes.toPipelineStudio({
              projectIdentifier,
              orgIdentifier,
              pipelineIdentifier: defaultTo(pipelineMetadata?.identifier || pipeline?.identifier, '-1'),
              accountId,
              module,
              branch: selectedBranch,
              repoIdentifier,
              repoName,
              connectorRef,
              storeType
            })
          )
          location.reload()
        })
      } else {
        setSelectedBranch(branch || '')
      }
      setBlockNavigation(false)
    }
  })

  useSaveTemplateListener()

  const {
    data: gitXSetting,
    error: gitXSettingError,
    loading: loadingSetting
  } = useGetSettingsList({
    queryParams: {
      category: 'GIT_EXPERIENCE',
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    },
    lazy: pipelineIdentifier !== DefaultNewPipelineId
  })

  const getPipelineStoreType = (): StoreMetadata['storeType'] => {
    if (getSettingValue(gitXSetting, SettingType.ENFORCE_GIT_EXPERIENCE) === 'true') {
      return StoreType.REMOTE // Createing new with GitX enforced
    } else {
      // Handling rest all use cases
      // Retaining previous storeType for editing while creating
      return pipelineMetadata?.identifier === DefaultNewPipelineId ? getDefaultStoreType(gitXSetting) : storeType
    }
  }

  React.useEffect(() => {
    if (!loadingSetting && gitXSettingError) {
      showError(getRBACErrorMessage(gitXSettingError))
    }
  }, [gitXSettingError, showError, loadingSetting])

  const dialogWidth = React.useMemo<number | undefined>(() => {
    if (supportingGitSimplification) {
      return 800
    }
  }, [supportingGitSimplification])

  const [showModal, hideModal] = useModalHook(() => {
    // TODO
    // if (getOtherModal) {
    //   pipeline.identifier = ''
    //   updatePipeline(pipeline)
    //   return (
    //     <PipelineVariablesContextProvider pipeline={pipeline} storeMetadata={storeMetadata}>
    //       {getOtherModal(onSubmit, onCloseCreate)}
    //     </PipelineVariablesContextProvider>
    //   )
    // } else {
    return (
      <ModalDialog
        width={dialogWidth}
        enforceFocus={false}
        isOpen={true}
        onClose={onCloseCreate}
        showOverlay={loadingSetting}
        title={modalMode === 'create' ? getString('moduleRenderer.newPipeLine') : getString('editPipeline')}
      >
        <PipelineCreate
          afterSave={onSubmit}
          initialValues={merge(pipeline, {
            repo: repoName || gitDetails.repoIdentifier || '',
            branch: branch || gitDetails.branch || '',
            connectorRef: defaultTo(connectorRef, ''),
            storeType: getPipelineStoreType(),
            filePath: gitDetails.filePath
          })}
          closeModal={onCloseCreate}
          gitDetails={{ ...gitDetails, remoteFetchFailed: Boolean(remoteFetchError) } as IGitContextFormProps}
          primaryButtonText={modalMode === 'create' ? getString('start') : getString('continue')}
          isReadonly={isReadonly}
          isGitXEnforced={getSettingValue(gitXSetting, SettingType.ENFORCE_GIT_EXPERIENCE) === 'true'}
          modalMode={modalMode}
        />
      </ModalDialog>
    )
    //}
  }, [
    supportingGitSimplification,
    loadingSetting,
    getSettingValue(gitXSetting, SettingType.DEFAULT_STORE_TYPE_FOR_ENTITIES),
    getSettingValue(gitXSetting, SettingType.ENFORCE_GIT_EXPERIENCE),
    pipeline,
    pipelineIdentifier,
    repoName,
    gitDetails,
    branch,
    connectorRef,
    modalMode,
    isReadonly
  ])

  React.useEffect(() => {
    // for new pipeline always use UI as default view
    if (pipelineIdentifier === DefaultNewPipelineId) {
      setView(SelectedView.VISUAL)
    } else if (entityValidityDetails?.valid === false || view === SelectedView.YAML) {
      setView(SelectedView.YAML)
    } else {
      setView(SelectedView.VISUAL)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineIdentifier, entityValidityDetails?.valid])

  React.useEffect(() => {
    if (entityValidityDetails?.valid === false) {
      setDisableVisualView(true)
    } else {
      setDisableVisualView(false)
    }
  }, [entityValidityDetails?.valid])

  React.useEffect(() => {
    if (isInitialized) {
      // Prevent create modal opening if location.state has pipeline data ( redirected from listing page )
      if (pipelineMetadata?.identifier === DefaultNewPipelineId && isEmpty(routerState?.updatedPipeline)) {
        setModalMode('create')
        showModal()
      }
      if (isBEPipelineUpdated && !discardBEUpdateDialog) {
        openConfirmBEUpdateError()
      }
      if (blockNavigation && isUpdated) {
        openUnsavedChangesDialog()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    pipelineMetadata?.identifier,
    showModal,
    isInitialized,
    isBEPipelineUpdated,
    discardBEUpdateDialog,
    blockNavigation
  ])

  React.useEffect(() => {
    if (pipeline?.name) {
      window.dispatchEvent(new CustomEvent('RENAME_PIPELINE', { detail: pipelineMetadata?.name }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline?.name])

  const onCloseCreate = React.useCallback(() => {
    delete (pipeline as PipelineWithGitContextFormProps).repo
    delete (pipeline as PipelineWithGitContextFormProps).branch
    delete (pipeline as PipelineWithGitContextFormProps).connectorRef
    delete (pipeline as PipelineWithGitContextFormProps).filePath
    delete (pipeline as PipelineWithGitContextFormProps).storeType
    if (pipelineIdentifier === DefaultNewPipelineId) {
      // TODO: || getOtherModal
      deletePipelineCache(gitDetails)
      history.push(routes.toPipelines({ orgIdentifier, projectIdentifier, accountId, module }))
    }
    hideModal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accountId,
    hideModal,
    history,
    module,
    orgIdentifier,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    pipeline?.identifier,
    pipelineMetadata?.identifier,
    projectIdentifier,
    //TODO
    // toPipelineList,
    // getOtherModal,
    gitDetails,
    deletePipelineCache
  ])

  const onSubmit = React.useCallback(
    (
      values: PipelineInfoConfig,
      currStoreMetadata?: StoreMetadata,
      updatedGitDetails?: EntityGitDetails,
      shouldUseTemplate = false
    ) => {
      pipeline.name = values.name
      pipeline.description = values.description
      pipeline.identifier = values.identifier
      pipeline.tags = values.tags ?? {}
      delete (pipeline as PipelineWithGitContextFormProps).repo
      delete (pipeline as PipelineWithGitContextFormProps).branch
      delete (pipeline as PipelineWithGitContextFormProps).connectorRef
      delete (pipeline as PipelineWithGitContextFormProps).filePath
      delete (pipeline as PipelineWithGitContextFormProps).storeType
      updatePipeline(pipeline)
      if (currStoreMetadata?.storeType) {
        updatePipelineStoreMetadata(currStoreMetadata, gitDetails)
      }

      if (updatedGitDetails) {
        if (gitDetails?.objectId || gitDetails?.commitId) {
          updatedGitDetails = { ...gitDetails, ...updatedGitDetails }
        }
        updateGitDetails(updatedGitDetails).then(() => {
          if (updatedGitDetails) {
            if (supportingGitSimplification && currStoreMetadata?.storeType === StoreType.REMOTE) {
              updateQueryParams(
                {
                  connectorRef: currStoreMetadata.connectorRef,
                  repoName: updatedGitDetails?.repoName,
                  branch: updatedGitDetails.branch,
                  storeType: currStoreMetadata.storeType as StoreType
                },
                { skipNulls: true }
              )
            }
          }
        })
      }
      setUseTemplate(shouldUseTemplate)
      hideModal()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hideModal, pipeline, updatePipeline]
  )

  const getPipelineTemplate = async (): Promise<void> => {
    const { template: newTemplate, isCopied } = await getTemplate({
      templateType: 'Pipeline',
      gitDetails,
      storeMetadata
    })
    const processNode = isCopied
      ? produce(
          defaultTo(
            parse<{ template: { spec: string } }>(defaultTo(newTemplate?.yaml, ''))?.template.spec,
            {}
          ) as PipelineInfoConfig,
          draft => {
            draft.name = defaultTo(pipelineMetadata?.name, '')
            draft.identifier = defaultTo(pipelineMetadata?.identifier, '')
          }
        )
      : createTemplate(pipeline, newTemplate, gitDetails?.branch, gitDetails?.repoName)
    processNode.description = pipeline.description
    processNode.tags = pipeline.tags
    processNode.projectIdentifier = pipeline.projectIdentifier
    processNode.orgIdentifier = pipeline.orgIdentifier
    await updatePipeline(processNode)
  }

  React.useEffect(() => {
    if (useTemplate && !isEmpty(gitDetails) && (!supportingGitSimplification || !isEmpty(storeMetadata))) {
      getPipelineTemplate()
        .catch(_ => {
          // Do nothing.. user cancelled template selection
        })
        .finally(() => {
          setUseTemplate(false)
        })
    }
  }, [useTemplate, gitDetails, storeMetadata, supportingGitSimplification])

  const [inputSetYaml, setInputSetYaml] = React.useState('')

  const { data, refetch, loading } = useGetInputsetYaml({
    planExecutionId: executionId ?? '',
    queryParams: {
      orgIdentifier,
      projectIdentifier,
      accountIdentifier: accountId
    },
    lazy: true,
    requestOptions: {
      headers: {
        'content-type': 'application/yaml'
      }
    }
  })

  React.useEffect(() => {
    if (data) {
      ;(data as unknown as Response).text().then(str => {
        setInputSetYaml(str)
      })
    }
  }, [data])

  React.useEffect(() => {
    if (executionId && executionId !== null) {
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId])

  function onCloseRunPipelineModal(): void {
    closeRunPipelineModal()
    setInputSetYaml('')
    replaceQueryParams({ repoIdentifier, branch, connectorRef, storeType, repoName }, { skipNulls: true }, true)
  }

  const allowOpeningRunPipelineModal: boolean = React.useMemo(() => {
    /**
     * This is done because Run Pipeline modal was opening twice for Remote Pipelines.
     * For remote pipeline when we land on Pipeline Studio from Deployments page, there is no branch initially,
     * because pipeline in list view does not have branch, so there is no branch in url initially and then we update branch in the url.
     * Because of all this, useModalHook for opening Run Pipeline modal runs twice and modal visibly opens twice.
     * To Prevent the issue, added a check which waits for branch name to appear in url when pipeline is of Remote type,
     */
    let shouldOpenRunPipelineModal = false
    if (!isPipelineRemote) {
      shouldOpenRunPipelineModal = true
    } else if (isPipelineRemote && !isEmpty(branch)) {
      shouldOpenRunPipelineModal = true
    }
    return shouldOpenRunPipelineModal
  }, [branch, isPipelineRemote])

  React.useEffect(() => {
    if (runPipeline && allowOpeningRunPipelineModal) {
      openRunPipelineModal()
    }
  }, [runPipeline, allowOpeningRunPipelineModal])

  React.useEffect(() => {
    isPipelineRemote &&
      gitDetails.repoName &&
      gitDetails.branch &&
      updatePipelineStoreMetadata({ connectorRef, storeType }, gitDetails)
  }, [isPipelineRemote, gitDetails, connectorRef, storeType])

  const [openRunPipelineModal, closeRunPipelineModal] = useModalHook(
    () =>
      loading ? (
        <PageSpinner />
      ) : (
        <Dialog {...runModalProps}>
          <Layout.Vertical className={css.modalCard}>
            <RunPipelineFormY1
              pipelineIdentifier={pipelineIdentifier}
              orgIdentifier={orgIdentifier}
              projectIdentifier={projectIdentifier}
              accountId={accountId}
              module={module}
              connectorRef={connectorRef}
              repoIdentifier={isPipelineRemote ? repoName : repoIdentifier}
              branch={branch}
              source="executions"
              onClose={onCloseRunPipelineModal}
              stagesExecuted={stagesExecuted}
              storeType={storeType}
              storeMetadata={storeMetadata}
              pipelineMetadata={pipelineMetadata}
            />
            <Button
              aria-label="close modal"
              icon="cross"
              variation={ButtonVariation.ICON}
              onClick={onCloseRunPipelineModal}
              className={css.crossIcon}
            />
          </Layout.Vertical>
        </Dialog>
      ),
    [
      loading,
      inputSetYaml,
      inputSetRepoIdentifier,
      inputSetBranch,
      branch,
      repoIdentifier,
      inputSetType,
      inputSetValue,
      inputSetLabel,
      pipelineIdentifier,
      pipelineMetadata
    ]
  )

  const onGitBranchChange = React.useMemo(
    () => (selectedFilter: GitFilterScope, defaultSelected?: boolean) => {
      setSelectedBranch(selectedFilter.branch as string)
      if (isUpdated && branch !== selectedFilter.branch) {
        setBlockNavigation(true)
      } else if (branch !== selectedFilter.branch) {
        deletePipelineCache({
          repoIdentifier: defaultTo(selectedFilter.repo, ''),
          branch: defaultTo(selectedFilter.branch, '')
        }).then(() => {
          history.push(
            routes.toPipelineStudio({
              projectIdentifier,
              orgIdentifier,
              pipelineIdentifier: defaultTo(pipelineIdentifier, '-1'),
              accountId,
              module,
              branch: selectedFilter.branch,
              repoIdentifier: selectedFilter.repo,
              ...(isPipelineRemote
                ? {
                    repoIdentifier: repoName,
                    repoName,
                    connectorRef,
                    storeType
                  }
                : {})
            })
          )
          if (!defaultSelected) {
            fetchPipeline({
              repoIdentifier: selectedFilter.repo,
              branch: selectedFilter.branch
            })
          }
        })
      }
    },
    [
      isUpdated,
      branch,
      deletePipelineCache,
      history,
      projectIdentifier,
      orgIdentifier,
      pipelineIdentifier,
      accountId,
      module,
      isPipelineRemote,
      repoName,
      connectorRef,
      storeType,
      fetchPipeline
    ]
  )

  if (isLoading) {
    return (
      <React.Fragment>
        <PageSpinner />
        <div /> {/* this empty div is required for rendering layout correctly */}
      </React.Fragment>
    )
  }

  if (pipelineSummaryError || (templateError?.data && !isPipelineRemote)) {
    return (
      <GenericErrorHandler
        errStatusCode={pipelineSummaryError ? (pipelineSummaryError as Error)?.code : templateError?.status}
        errorMessage={
          pipelineSummaryError ? (pipelineSummaryError as Error)?.message : (templateError?.data as Error)?.message
        }
      />
    )
  }

  if (templateError?.data && isEmpty(pipeline) && isPipelineRemote) {
    return (
      <NoEntityFound identifier={pipelineIdentifier} entityType={'pipeline'} fetchPipelineCallback={fetchPipeline} />
    )
  }

  return (
    <PipelineVariablesContextProvider pipeline={pipeline} storeMetadata={storeMetadata}>
      <NodeMetadataProvider>
        <div
          className={cx(Classes.POPOVER_DISMISS, css.content)}
          onClick={e => {
            e.stopPropagation()
          }}
        >
          <NavigationCheck
            when={!!pipelineMetadata.identifier}
            shouldBlockNavigation={nextLocation => {
              const matchDefault = matchPath(nextLocation.pathname, {
                path: routes.toPipelineStudio({ ...accountPathProps, ...pipelinePathProps, ...pipelineModuleParams }),
                exact: true
              })
              const shouldBlockNavigation =
                !matchDefault?.isExact && isUpdated && !isReadonly && !(useTemplate && isEmpty(pipeline?.template))

              if (!shouldBlockNavigation && !matchDefault?.isExact) {
                deletePipelineCache(gitDetails)
              }
              return shouldBlockNavigation
            }}
            textProps={{
              contentText: isYamlError ? getString('navigationYamlError') : getString('navigationCheckText'),
              titleText: isYamlError ? getString('navigationYamlErrorTitle') : getString('navigationCheckTitle')
            }}
            navigate={newPath => {
              const isPipeline = matchPath(newPath, {
                path: routes.toPipelineStudio({ ...accountPathProps, ...pipelinePathProps, ...pipelineModuleParams }),
                exact: true
              })
              !isPipeline?.isExact && deletePipelineCache(gitDetails)
              history.push(newPath)
            }}
          />
          <Layout.Vertical height={'100%'}>
            <PipelineCanvasHeaderY1
              isPipelineRemote={!!isPipelineRemote}
              onGitBranchChange={onGitBranchChange}
              setModalMode={setModalMode}
              setYamlError={setYamlError}
              showModal={showModal}
              disableVisualView={disableVisualView}
              toPipelineStudio={routes.toPipelineStudio}
              openRunPipelineModal={openRunPipelineModal}
            />
            {remoteFetchError ? (
              handleFetchFailure({
                entityType: 'pipeline',
                identifier: pipelineIdentifier,
                isInline: storeType !== StoreType.REMOTE,
                fetchError: remoteFetchError as unknown as Error,
                fetchPipelineCallback: fetchPipeline
              })
            ) : (
              <Container className={css.builderContainer}>
                {pipelineMetadata.identifier !== DefaultNewPipelineId && <PipelineYamlViewY1 />}
                {/* TODO: {isYaml ? <PipelineYamlView /> : pipeline.template ? <TemplatePipelineBuilder /> : <StageBuilder />} */}
              </Container>
            )}
          </Layout.Vertical>
        </div>
        <RightBarY1 />
        {/* TODO: {CDS_PIPELINE_STUDIO_UPGRADES && <StageConfigurationDrawer />} */}
      </NodeMetadataProvider>
    </PipelineVariablesContextProvider>
  )
}
