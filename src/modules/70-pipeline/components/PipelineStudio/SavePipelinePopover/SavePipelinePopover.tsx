/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo } from 'react'
import {
  Button,
  ButtonVariation,
  Container,
  Heading,
  Icon,
  PopoverProps,
  SplitButton,
  SplitButtonOption,
  useToaster,
  VisualYamlSelectedView as SelectedView,
  Dialog
} from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { useHistory, useParams } from 'react-router-dom'
import { defaultTo, get, isEmpty, noop, omit } from 'lodash-es'
import { useModalHook } from '@harness/use-modal'
import { Spinner, Dialog as OPAErrorDialog } from '@blueprintjs/core'
import { parse, yamlStringify } from '@common/utils/YamlHelperMethods'
import { useStrings } from 'framework/strings'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { usePermission } from '@rbac/hooks/usePermission'
import { useFeature } from '@common/hooks/useFeatures'
import { savePipeline, usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import type { SaveToGitFormInterface } from '@common/components/SaveToGitForm/SaveToGitForm'
import type { GitData } from '@common/modals/GitDiffEditor/useGitDiffEditorDialog'
import { UseSaveSuccessResponse, useSaveToGitDialog } from '@common/modals/SaveToGitDialog/useSaveToGitDialog'
import { DefaultNewPipelineId } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineActions'
import { PipelineActions } from '@common/constants/TrackingConstants'
import { useQueryParams } from '@common/hooks'
import type {
  GitQueryParams,
  PathFn,
  PipelinePathProps,
  PipelineStudioQueryParams,
  PipelineType
} from '@common/interfaces/RouteInterfaces'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { useSaveAsTemplate } from '@pipeline/components/PipelineStudio/SaveTemplateButton/useSaveAsTemplate'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import type { Error, GovernanceMetadata, PipelineInfoConfig, ResponseMessage } from 'services/pipeline-ng'
import { FeatureIdentifier } from 'framework/featureStore/FeatureIdentifier'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { ErrorHandler } from '@common/components/ErrorHandler/ErrorHandler'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { PolicyManagementEvaluationView } from '@governance/PolicyManagementEvaluationView'
import type { SaveToGitFormV2Interface } from '@common/components/SaveToGitFormV2/SaveToGitFormV2'
import { SCHEMA_VALIDATION_FAILED } from '@common/interfaces/GitSyncInterface'
import type { Pipeline } from '@pipeline/utils/types'
import useTemplateErrors from '@pipeline/components/TemplateErrors/useTemplateErrors'
import { sanitize } from '@common/utils/JSONUtils'
import { TemplateErrorEntity } from '@pipeline/components/TemplateLibraryErrorHandling/utils'
import { hasChainedPipelineStage } from '@pipeline/utils/stageHelpers'
import { FeatureFlag } from '@common/featureFlags'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { AccessControlCheckError } from 'services/cd-ng'
import { validateCICodebaseConfiguration } from '../StepUtil'
import usePipelineErrors from '../PipelineCanvas/PipelineErrors/usePipelineErrors'
import css from './SavePipelinePopover.module.scss'

export default interface SavePipelinePopoverProps extends PopoverProps {
  toPipelineStudio: PathFn<PipelineType<PipelinePathProps> & PipelineStudioQueryParams>
}

export type SavePipelineHandle = {
  updatePipeline: (pipelineYaml: string) => Promise<void>
}

interface SavePipelineObj {
  pipeline: PipelineInfoConfig
}

function SavePipelinePopover(
  props: SavePipelinePopoverProps,
  ref: React.ForwardedRef<SavePipelineHandle>
): React.ReactElement {
  const { toPipelineStudio } = props
  const {
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF,
    supportingGitSimplification,
    isPublicAccessEnabledOnResources
  } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const {
    state: {
      pipeline,
      yamlHandler,
      storeMetadata,
      gitDetails,
      isUpdated,
      isMetadataUpdated,
      isIntermittentLoading,
      pipelineMetadataConfig
    },
    deletePipelineCache,
    fetchPipeline,
    view,
    setSchemaErrorView,
    isReadonly
  } = usePipelineContext()
  const [loading, setLoading] = React.useState<boolean>()
  const { branch, repoName, connectorRef, storeType, repoIdentifier } = useQueryParams<GitQueryParams>()
  const { trackEvent } = useTelemetry()
  const { showSuccess, showError, clear } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const { getString } = useStrings()
  const history = useHistory()
  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier, module } =
    useParams<PipelineType<PipelinePathProps>>()
  const isYaml = view === SelectedView.YAML
  const { openTemplateReconcileErrorsModal, openSelectedTemplateErrorsModal } = useTemplateErrors({
    entity: TemplateErrorEntity.PIPELINE
  })
  const [governanceMetadata, setGovernanceMetadata] = React.useState<GovernanceMetadata>()
  const [savePipelineError, setSavePipelineError] = React.useState<Error>({})
  const [OPAErrorModalClosePromise, setOPAErrorModalClosePromise] = React.useState<() => void | undefined>()
  const isPipelineRemote = supportingGitSimplification && storeType === StoreType.REMOTE
  const isPipelineInline = supportingGitSimplification && storeType === StoreType.INLINE
  const isErrorEnhancementFFEnabled = useFeatureFlag(FeatureFlag.PIE_ERROR_ENHANCEMENTS)

  const [showOPAErrorModal, closeOPAErrorModal] = useModalHook(
    () => (
      <OPAErrorDialog
        isOpen
        onClose={() => {
          closeOPAErrorModal()
          OPAErrorModalClosePromise?.()
          const { status, newPipelineId, updatedGitDetails } = governanceMetadata as GovernanceMetadata
          if (status === 'warning' && !isPipelineRemote) {
            // For Remote pipeline, publishPipeline will be done as callback from SaveToGit modal
            publishPipeline(newPipelineId, updatedGitDetails)
          }
        }}
        title={
          <Heading level={3} font={{ variation: FontVariation.H3 }} padding={{ top: 'medium' }}>
            {getString('common.policiesSets.evaluations')}
          </Heading>
        }
        enforceFocus={false}
        className={css.policyEvaluationDialog}
      >
        <PolicyManagementEvaluationView
          metadata={governanceMetadata}
          accountId={accountId}
          module={module}
          headingErrorMessage={getString('pipeline.policyEvaluations.failedToSavePipeline')}
        />
      </OPAErrorDialog>
    ),
    [governanceMetadata, OPAErrorModalClosePromise]
  )
  const { enabled: templatesFeatureEnabled } = useFeature({
    featureRequest: {
      featureName: FeatureIdentifier.TEMPLATE_SERVICE
    }
  })

  const [canEdit] = usePermission({
    resource: {
      resourceType: ResourceType.TEMPLATE
    },
    permissions: [PermissionIdentifier.EDIT_TEMPLATE]
  })

  const isTemplatesEnabled = templatesFeatureEnabled && canEdit && !pipeline?.template
  // Enable save even if isUpdated is false as metadata has changed
  const isSaveDisabled = isReadonly || isIntermittentLoading || (!isUpdated && !isMetadataUpdated)

  const _hasChainedPipelineStage = React.useMemo(() => hasChainedPipelineStage(pipeline?.stages), [pipeline?.stages])

  const { save } = useSaveAsTemplate({
    data: pipeline,
    type: 'Pipeline',
    gitDetails,
    storeMetadata
  })

  const { openPipelineErrorsModal } = usePipelineErrors()
  const navigateToLocation = (newPipelineId: string, updatedGitDetails?: SaveToGitFormInterface): void => {
    history.replace(
      toPipelineStudio({
        projectIdentifier,
        orgIdentifier,
        pipelineIdentifier: newPipelineId,
        accountId,
        module,
        repoIdentifier: defaultTo(updatedGitDetails?.repoIdentifier, repoIdentifier),
        branch: updatedGitDetails?.branch,
        ...(isPipelineRemote
          ? {
              repoName: updatedGitDetails?.repoName || repoName,
              connectorRef,
              storeType
            }
          : isPipelineInline
          ? { storeType }
          : {}) //Not keeping storeType only for oldGitSync
      })
    )
  }

  const publishPipeline = async (newPipelineId: string, updatedGitDetails?: SaveToGitFormInterface) => {
    const repoId =
      storeMetadata?.storeType === StoreType.REMOTE
        ? defaultTo(updatedGitDetails?.repoName, repoName)
        : defaultTo(updatedGitDetails?.repoIdentifier, repoIdentifier)

    if (pipelineIdentifier === DefaultNewPipelineId) {
      await deletePipelineCache(gitDetails)

      // Show toast only for Inline pipelines
      if (!isPipelineRemote && isEmpty(updatedGitDetails)) {
        showSuccess(getString('pipelines-studio.publishPipeline'))
      }

      // if updatedGitDetails is not there or isNewBranch is false - For Inline or default branch new pipelines
      if (!updatedGitDetails?.isNewBranch) {
        navigateToLocation(newPipelineId, updatedGitDetails)
        fetchPipeline({ newPipelineId })
      }
    } else if (!updatedGitDetails || updatedGitDetails?.isNewBranch === false) {
      fetchPipeline()
    }

    // Only for Git Synced pipelines when isNewBranch is true
    if (updatedGitDetails?.isNewBranch) {
      navigateToLocation(newPipelineId, updatedGitDetails)
      fetchPipeline({
        newPipelineId,
        repoIdentifier: repoId,
        branch: updatedGitDetails?.branch
      })
    }
  }

  const saveAndPublishPipeline = async (
    latestPipeline: PipelineInfoConfig,
    currStoreMetadata?: StoreMetadata,
    updatedGitDetails?: SaveToGitFormInterface,
    lastObject?: { lastObjectId?: string; lastCommitId?: string }
  ): Promise<UseSaveSuccessResponse> => {
    setLoading(true)
    setSchemaErrorView(false)
    const isEdit = pipelineIdentifier !== DefaultNewPipelineId
    const response = await savePipeline(
      {
        accountIdentifier: accountId,
        projectIdentifier,
        orgIdentifier,
        ...(currStoreMetadata?.storeType ? { storeType: currStoreMetadata?.storeType } : {}),
        ...(currStoreMetadata?.storeType === StoreType.REMOTE ? { connectorRef: currStoreMetadata?.connectorRef } : {}),
        ...(updatedGitDetails ?? {}),
        ...(lastObject ?? {}),
        ...(updatedGitDetails && currStoreMetadata?.storeType !== StoreType.REMOTE && updatedGitDetails?.isNewBranch
          ? { baseBranch: branch }
          : {}),
        ...(isPublicAccessEnabledOnResources
          ? { public: !!pipelineMetadataConfig?.modifiedMetadata?.publicAccessResponse?.public }
          : {})
      },
      omit(latestPipeline, 'repo', 'branch'),
      isEdit
    )
    setLoading(false)
    setSavePipelineError({})
    const newPipelineId = latestPipeline?.identifier

    if (response && response.status === 'SUCCESS') {
      const governanceData: GovernanceMetadata | undefined = get(response, 'data.governanceMetadata')
      setGovernanceMetadata({ ...governanceData, newPipelineId, updatedGitDetails })
      if (governanceData?.status === 'error' || governanceData?.status === 'warning') {
        showOPAErrorModal()
        // Ignoring OPA warning in GitDialog as commit will be done successfully
        // Also proceding with PR creation if applicable
        const gitModalPromise: UseSaveSuccessResponse = {
          status: isPipelineRemote && governanceData?.status === 'warning' ? 'SUCCESS' : 'FAILURE',
          governanceMetaData: { ...governanceData, newPipelineId, updatedGitDetails },
          nextCallback: () => publishPipeline(newPipelineId, updatedGitDetails)
        }

        return new Promise(resolve => {
          setOPAErrorModalClosePromise(() => {
            return () => resolve(gitModalPromise)
          })

          if (governanceData?.status === 'error') {
            // Save failed due to OPA policy so can hide git modal
            resolve(gitModalPromise)
          }
        })
      }
      // Handling cache and page navigation only when Governance is disabled, or Governance Evaluation is successful
      // Otherwise, keep current pipeline editing states, and show Governance evaluation error
      if (
        governanceData?.status !== 'error' &&
        governanceData?.status !== 'warning' &&
        !isGitSyncEnabled &&
        storeMetadata?.storeType !== StoreType.REMOTE
      ) {
        // do not do this for git path, it will hide progress overlay
        // While saving pipeline in git, publishPipeline is done as next callback
        await publishPipeline(newPipelineId, updatedGitDetails)
      }
      if (isEdit) {
        trackEvent(isYaml ? PipelineActions.PipelineUpdatedViaYAML : PipelineActions.PipelineUpdatedViaVisual, {})
      } else {
        trackEvent(isYaml ? PipelineActions.PipelineCreatedViaYAML : PipelineActions.PipelineCreatedViaVisual, {})
      }
    } else {
      clear()
      setSchemaErrorView(true)
      if ((response as any)?.metadata?.schemaErrors?.length) {
        openPipelineErrorsModal((response as any)?.metadata?.schemaErrors)
        if (isGitSyncEnabled || currStoreMetadata?.storeType === StoreType.REMOTE) {
          // isGitSyncEnabled true
          throw { code: SCHEMA_VALIDATION_FAILED }
        }
      } else {
        if (isGitSyncEnabled || currStoreMetadata?.storeType === StoreType.REMOTE) {
          throw response
        } else if (!isEmpty((response as any)?.metadata?.errorNodeSummary)) {
          openTemplateReconcileErrorsModal({
            error: (response as any)?.metadata?.errorNodeSummary,
            originalYaml: yamlStringify(
              sanitize(
                { pipeline: latestPipeline },
                { removeEmptyArray: false, removeEmptyObject: false, removeEmptyString: false }
              )
            ),
            onSave: async (refreshedYaml: string) => {
              await saveAndPublishPipeline(
                (parse(refreshedYaml) as { pipeline: PipelineInfoConfig }).pipeline,
                storeMetadata
              )
            },
            isEdit
          })
        } else {
          if ((response as any)?.metadata?.schemaErrors) {
            openSelectedTemplateErrorsModal?.((response as any)?.metadata?.schemaErrors)
          } else {
            setSavePipelineError(response as Error)
            if (!isErrorEnhancementFFEnabled)
              showError(
                getRBACErrorMessage({ data: response as AccessControlCheckError }) || getString('errorWhileSaving'),
                undefined,
                'pipeline.save.pipeline.error'
              )
          }
        }
      }
    }
    return { status: response?.status, nextCallback: () => publishPipeline(newPipelineId, updatedGitDetails) }
  }

  const saveAndPublishWithGitInfo = async (
    updatedGitDetails: SaveToGitFormInterface | SaveToGitFormV2Interface,
    payload?: SavePipelineObj,
    objectId?: string,
    commitId?: string
  ): Promise<UseSaveSuccessResponse> => {
    let latestPipeline: PipelineInfoConfig = payload?.pipeline || pipeline

    if (isYaml && yamlHandler) {
      try {
        latestPipeline =
          payload?.pipeline || (parse<Pipeline>(yamlHandler.getLatestYaml()).pipeline as PipelineInfoConfig)
      } /* istanbul ignore next */ catch (err) {
        showError(getRBACErrorMessage(err) || err, undefined, 'pipeline.save.gitinfo.error')
      }
    }

    const response = await saveAndPublishPipeline(
      latestPipeline,
      storeMetadata,
      {
        ...updatedGitDetails,
        repoName: gitDetails.repoName,
        filePath: isGitSyncEnabled ? updatedGitDetails.filePath : defaultTo(gitDetails.filePath, '')
      },
      pipelineIdentifier !== DefaultNewPipelineId ? { lastObjectId: objectId, lastCommitId: commitId } : {}
    )

    return {
      status: response?.status,
      nextCallback: response?.nextCallback || noop,
      governanceMetaData: response.governanceMetaData
    }
  }

  const { openSaveToGitDialog } = useSaveToGitDialog<SavePipelineObj>({
    onSuccess: (gitData: GitData, payload?: SavePipelineObj, objectId?: string): Promise<UseSaveSuccessResponse> =>
      saveAndPublishWithGitInfo(
        gitData,
        payload,
        objectId || gitDetails?.objectId || '',
        gitData?.resolvedConflictCommitId || gitDetails.commitId
      )
  })

  const initPipelinePublish = React.useCallback(
    async (latestPipeline: PipelineInfoConfig): Promise<void> => {
      // if Git sync enabled then display modal
      if (isGitSyncEnabled || storeMetadata?.storeType === 'REMOTE') {
        if (
          (storeMetadata?.storeType !== 'REMOTE' && isEmpty(gitDetails.repoIdentifier)) ||
          isEmpty(gitDetails.branch)
        ) {
          clear()
          showError(getString('pipeline.gitExperience.selectRepoBranch'))
          return
        }
        const isEditing = pipelineIdentifier !== DefaultNewPipelineId
        openSaveToGitDialog({
          isEditing,
          resource: {
            type: 'Pipelines',
            name: latestPipeline.name,
            identifier: latestPipeline.identifier,
            gitDetails: { ...gitDetails, ...(isEditing && { isHarnessCodeRepo: isEmpty(connectorRef) }) } ?? {},
            storeMetadata: storeMetadata?.storeType ? storeMetadata : undefined
          },
          payload: { pipeline: omit(latestPipeline, 'repo', 'branch') }
        })
      } else {
        await saveAndPublishPipeline(latestPipeline, storeMetadata)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      gitDetails,
      isGitSyncEnabled,
      openSaveToGitDialog,
      pipelineIdentifier,
      saveAndPublishPipeline,
      showError,
      storeMetadata
    ]
  )

  const saveAndPublish = async (): Promise<void> => {
    window.dispatchEvent(new CustomEvent('SAVE_PIPELINE_CLICKED'))

    let latestPipeline: PipelineInfoConfig = pipeline

    if (isYaml && yamlHandler) {
      try {
        latestPipeline = parse<Pipeline>(yamlHandler.getLatestYaml())?.pipeline

        if (!latestPipeline) {
          clear()
          showError(getString('invalidYamlText'))
          return
        }
      } /* istanbul ignore next */ catch {
        clear()
        showError(getString('invalidYamlText'))
        return
      }
    }

    const ciCodeBaseConfigurationError = validateCICodebaseConfiguration({ pipeline: latestPipeline, getString })
    if (ciCodeBaseConfigurationError) {
      clear()
      showError(ciCodeBaseConfigurationError)
      return
    }

    await initPipelinePublish(latestPipeline)
  }

  const [canExecute] = usePermission(
    {
      resourceScope: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier
      },
      resource: {
        resourceType: ResourceType.PIPELINE,
        resourceIdentifier: pipeline?.identifier
      },
      permissions: [PermissionIdentifier.EXECUTE_PIPELINE]
    },
    [orgIdentifier, projectIdentifier, accountId, pipeline?.identifier]
  )

  const permissionText = canExecute
    ? getString('common.viewAndExecutePermissions')
    : getString('common.readonlyPermissions')

  const tooltip = isReadonly ? (
    <div className={css.readonlyAccessTag}>
      <Icon name="eye-open" size={16} />
      <span className={css.readonlyAccessText}>{permissionText}</span>
    </div>
  ) : undefined

  const saveText: React.ReactNode = getString('save')

  React.useImperativeHandle(
    ref,
    () => ({
      updatePipeline: async (pipelineYaml: string) => {
        await initPipelinePublish(parse<Pipeline>(pipelineYaml).pipeline)
      }
    }),
    [initPipelinePublish]
  )

  const errorDialog = useMemo(
    () => (
      <Dialog
        isOpen={isErrorEnhancementFFEnabled && !isEmpty(savePipelineError)}
        enforceFocus={false}
        onClose={() => setSavePipelineError({})}
        className={css.errorHandlerDialog}
      >
        <ErrorHandler responseMessages={savePipelineError?.responseMessages as ResponseMessage[]} />
      </Dialog>
    ),
    [savePipelineError, isErrorEnhancementFFEnabled]
  )

  if (loading) {
    return (
      <Container padding={{ left: 'medium', right: 'medium' }}>
        <Spinner size={Spinner.SIZE_SMALL} />
      </Container>
    )
  }

  if (!isTemplatesEnabled) {
    if (!isReadonly) {
      return (
        <>
          <Button
            variation={ButtonVariation.PRIMARY}
            text={saveText}
            onClick={saveAndPublish}
            icon="send-data"
            disabled={isSaveDisabled}
            tooltip={tooltip}
          />
          {errorDialog}
        </>
      )
    } else {
      return <></>
    }
  }

  return (
    <>
      <SplitButton
        disabled={isSaveDisabled}
        variation={ButtonVariation.PRIMARY}
        text={saveText}
        loading={loading}
        onClick={saveAndPublish}
        tooltip={tooltip}
      >
        <SplitButtonOption
          onClick={save}
          disabled={isIntermittentLoading || _hasChainedPipelineStage}
          text={getString('common.saveAsTemplate')}
        />
      </SplitButton>
      {errorDialog}
    </>
  )
}

export const SavePipelinePopoverWithRef = React.forwardRef(SavePipelinePopover)
