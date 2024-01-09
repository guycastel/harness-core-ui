/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { matchPath, useHistory, useParams } from 'react-router-dom'
import { defaultTo, isEmpty, merge } from 'lodash-es'
import {
  Container,
  Layout,
  useConfirmationDialog,
  useToaster,
  VisualYamlSelectedView as SelectedView,
  shouldShowError,
  getErrorInfoFromErrorObject
} from '@harness/uicore'
import type { FormikProps } from 'formik'
import classNames from 'classnames'
import { GetDataError } from 'restful-react'
import { useStrings } from 'framework/strings'
import { NavigationCheck, Page } from '@common/exports'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { TemplateStudioSubHeaderHandle } from '@templates-library/components/TemplateStudio/TemplateStudioSubHeader/TemplateStudioSubHeader'
import { PageSpinner } from '@common/components'
// TODO
// import templateFactory from '@templates-library/components/Templates/TemplatesFactory'
import type {
  GitQueryParams,
  ModulePathParams,
  TemplateStudioPathProps,
  TemplateStudioQueryParams
} from '@common/interfaces/RouteInterfaces'
import { TemplateType } from '@templates-library/utils/templatesUtils'
import GenericErrorHandler from '@common/pages/GenericErrorHandler/GenericErrorHandler'
import { accountPathProps, orgPathProps, pipelineModuleParams, projectPathProps } from '@common/utils/routeUtils'
import routes from '@common/RouteDefinitions'
import type { GetErrorResponse } from '@templates-library/components/TemplateStudio/SaveTemplatePopover/SaveTemplatePopover'
import type { GitFilterScope } from '@common/components/GitFilters/GitFilters'
import { useQueryParams } from '@common/hooks'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import NoEntityFound from '@pipeline/pages/utils/NoEntityFound/NoEntityFound'
//import { TemplateVariablesContextProvider } from '@pipeline/components/TemplateVariablesContext/TemplateVariablesContext'
import { OutOfSyncErrorStrip } from '@pipeline/components/TemplateLibraryErrorHandling/OutOfSyncErrorStrip/OutOfSyncErrorStrip'
import { TemplateErrorEntity } from '@pipeline/components/TemplateLibraryErrorHandling/utils'
import { BannerEOL } from '@pipeline/components/BannerEOL/BannerEOL'
import { yamlStringify } from '@common/utils/YamlHelperMethods'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { ErrorNodeSummary, useValidateTemplateInputs } from 'services/template-ng'
import { useCheckIfTemplateUsingV1Stage, ResponseEOLBannerResponseDTO, Error } from 'services/cd-ng'
import { DefaultNewVersionLabel } from 'framework/Templates/templates'
import { NodeMetadataProvider } from '@pipeline/components/PipelineDiagram/Nodes/NodeMetadataContext'
import {
  getContentAndTitleStringKeys,
  isNewTemplate,
  isPipelineOrStageType,
  isValidYaml
} from '@templates-library/components/TemplateStudio/TemplateStudioUtils'
import { TemplateContextY1 } from '../TemplateContext/TemplateContextY1'
import TemplateYamlViewY1 from '../TemplateYamlView/TemplateYamlViewY1'
import { TemplateStudioHeaderY1 } from '../TemplateStudioHeader/TemplateStudioHeaderY1'
import { TemplateStudioSubHeaderY1WithRef } from '../TemplateStudioSubHeader/TemplateStudioSubHeaderY1'
import { RightBarY1 } from '../RightBarY1/RightBarY1'
import css from './TemplateStudioInternalY1.module.scss'

export type TemplateFormikRef<T = unknown> = {
  resetForm: FormikProps<T>['resetForm']
  submitForm: FormikProps<T>['submitForm']
  getErrors: () => FormikProps<T>['errors']
}

export type TemplateFormRef<T = unknown> =
  | ((instance: TemplateFormikRef<T> | null) => void)
  | React.MutableRefObject<TemplateFormikRef<T> | null>
  | null

export function TemplateStudioInternalY1(): React.ReactElement {
  const { state, view, updateTemplateView, updateTemplate, deleteTemplateCache, isReadonly, fetchTemplate, setView } =
    React.useContext(TemplateContextY1)
  const params = useParams<TemplateStudioPathProps & ModulePathParams>()
  const { accountId, projectIdentifier, orgIdentifier, templateIdentifier, module, templateType } = params
  const { repoIdentifier, branch, versionLabel = '' } = useQueryParams<TemplateStudioQueryParams & GitQueryParams>()
  const {
    template,
    templateMetadata,
    originalTemplate,
    templateView,
    isLoading,
    isUpdated,
    yamlHandler,
    isBETemplateUpdated,
    isInitialized,
    gitDetails,
    storeMetadata,
    entityValidityDetails,
    templateYamlError
  } = state
  const { isYamlEditable } = templateView
  const { getString } = useStrings()
  const [blockNavigation, setBlockNavigation] = React.useState(false)
  const [selectedBranch, setSelectedBranch] = React.useState(defaultTo(branch, ''))
  const [isYamlError, setYamlError] = React.useState(false)
  const [discardBEUpdateDialog, setDiscardBEUpdate] = React.useState(false)
  const { showError, showSuccess, clear } = useToaster()
  const history = useHistory()
  const templateFormikRef = React.useRef<TemplateFormikRef | null>(null)
  const { isGitSyncEnabled: isGitSyncEnabledForProject, gitSyncEnabledOnlyForFF } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const templateStudioSubHeaderHandleRef = React.useRef<TemplateStudioSubHeaderHandle | null>(null)
  const [shouldShowOutOfSyncError, setShouldShowOutOfSyncError] = React.useState(false)
  const [showBanner, setShowBanner] = React.useState<boolean>(false)

  const { PL_AI_SUPPORT_CHATBOT: auxNavEnabled } = useFeatureFlags()

  useDocumentTitle(defaultTo(templateMetadata?.name, getString('common.templates')))

  const { navigationContentText, navigationTitleText } = getContentAndTitleStringKeys(isYamlError)

  const {
    data: errorData,
    refetch: validateTemplateInputs,
    error: reconcileError
  } = useValidateTemplateInputs({
    lazy: true
  })

  const { mutate } = useCheckIfTemplateUsingV1Stage({
    queryParams: {
      accountIdentifier: accountId
    }
  })

  React.useEffect(() => {
    if (
      isPipelineOrStageType(templateType as TemplateType) &&
      !isNewTemplate(templateIdentifier) // Check if Template Using V1 Stage only for edit flow
    ) {
      mutate({
        templateIdentifier,
        orgIdentifier,
        projectIdentifier
      })
        .then((res: ResponseEOLBannerResponseDTO) => {
          if (res?.data?.showBanner) {
            setShowBanner(true)
          }
        })
        .catch((err: GetDataError<Error>) => {
          showError(defaultTo(defaultTo((err.data as Error)?.message, err.message), getString('somethingWentWrong')))
        })
    }
  }, [templateType, templateIdentifier])

  const { openDialog: openConfirmBEUpdateError } = useConfirmationDialog({
    cancelButtonText: getString('cancel'),
    contentText: getString('templatesLibrary.templateUpdatedError'),
    titleText: getString('common.template.updateTemplate.templateUpdated'),
    confirmButtonText: getString('update'),
    onCloseDialog: isConfirmed => {
      if (isConfirmed) {
        fetchTemplate({ forceFetch: true, forceUpdate: true, loadFromCache: false })
      } else {
        setDiscardBEUpdate(true)
      }
    }
  })

  const templateInputsErrorNodeSummary = React.useMemo((): ErrorNodeSummary | undefined => {
    if (errorData?.data?.validYaml === false && errorData?.data.errorNodeSummary) {
      return errorData?.data.errorNodeSummary
    }
  }, [errorData?.data])

  const { openDialog: openUnsavedChangesDialog } = useConfirmationDialog({
    cancelButtonText: getString('cancel'),
    contentText: getString(navigationContentText),
    titleText: getString(navigationTitleText),
    confirmButtonText: getString('confirm'),
    onCloseDialog: async isConfirmed => {
      if (isConfirmed) {
        deleteTemplateCache(gitDetails).then(() => {
          history.push(
            routes.toTemplateStudio({
              projectIdentifier,
              orgIdentifier,
              templateIdentifier: defaultTo(templateMetadata?.identifier, '-1'),
              accountId,
              module,
              branch: selectedBranch,
              repoIdentifier: repoIdentifier,
              versionLabel: templateMetadata?.versionLabel,
              templateType: template?.spec.type as TemplateType
            })
          )
          location.reload()
        })
      } else {
        setSelectedBranch(defaultTo(branch, ''))
      }
      setBlockNavigation(false)
    }
  })

  const showInvalidYamlError = React.useCallback(
    (error: string) => {
      setYamlError(true)
      showError(error)
    },
    [setYamlError, showError]
  )

  const onViewChange = (newView: SelectedView): boolean => {
    if (newView === view) {
      return false
    }
    // istanbul ignore else
    if (
      newView === SelectedView.VISUAL &&
      isYamlEditable &&
      !isValidYaml(yamlHandler, showInvalidYamlError, getString, updateTemplate)
    ) {
      return false
    }
    setView(newView)
    updateTemplateView({
      ...templateView,
      isDrawerOpened: false,
      isYamlEditable: false
    })
    return true
  }

  const getErrors = async (): Promise<GetErrorResponse> => {
    await templateFormikRef.current?.submitForm()
    const errors = templateFormikRef.current?.getErrors()
    return { status: 'SUCCESS', errors }
  }

  React.useEffect(() => {
    // istanbul ignore else
    if (isBETemplateUpdated && !discardBEUpdateDialog) {
      openConfirmBEUpdateError()
    }
    // istanbul ignore else
    if (blockNavigation) {
      openUnsavedChangesDialog()
    }
  }, [isBETemplateUpdated, discardBEUpdateDialog, openConfirmBEUpdateError, blockNavigation, openUnsavedChangesDialog])

  const onGitBranchChange = React.useMemo(
    () => (selectedFilter: GitFilterScope, defaultSelected?: boolean) => {
      setSelectedBranch(selectedFilter.branch as string)
      if (!defaultSelected) {
        if (isUpdated && branch !== selectedFilter.branch) {
          setBlockNavigation(true)
        } else if (branch !== selectedFilter.branch) {
          deleteTemplateCache({
            repoIdentifier: defaultTo(selectedFilter.repo, ''),
            branch: defaultTo(selectedFilter.branch, '')
          }).then(() => {
            history.push(
              routes.toTemplateStudio({
                projectIdentifier,
                orgIdentifier,
                templateIdentifier: defaultTo(templateIdentifier, '-1'),
                accountId,
                module,
                templateType: template.spec.type as TemplateType,
                versionLabel: templateMetadata.versionLabel,
                branch: selectedFilter.branch,
                repoIdentifier: selectedFilter.repo
              })
            )
          })
        }
      }
    },
    [
      accountId,
      branch,
      deleteTemplateCache,
      history,
      isUpdated,
      module,
      orgIdentifier,
      projectIdentifier,
      template.spec.type,
      templateMetadata.versionLabel,
      templateIdentifier
    ]
  )

  React.useEffect(() => {
    if (reconcileError && shouldShowError(reconcileError)) {
      showError(getErrorInfoFromErrorObject(reconcileError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconcileError])

  React.useEffect(() => {
    if (!shouldShowOutOfSyncError) return

    if (errorData?.data?.validYaml === false && errorData?.data.errorNodeSummary) {
      // This is handled by <OutOfSyncErrorStrip/>
      clear()
    } else {
      clear()
      showSuccess(getString('pipeline.outOfSyncErrorStrip.noErrorText', { entity: TemplateErrorEntity.TEMPLATE }))
      setShouldShowOutOfSyncError(false)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorData])

  function handleReconcile(): void {
    validateTemplateInputs({
      queryParams: {
        accountIdentifier: accountId,
        projectIdentifier,
        orgIdentifier,
        templateIdentifier,
        repoIdentifier,
        branch: defaultTo(storeMetadata?.branch, branch),
        versionLabel: defaultTo(templateMetadata.versionLabel, versionLabel),
        getDefaultFromOtherRepo: true
      }
    })
    showSuccess(getString('pipeline.outOfSyncErrorStrip.reconcileStarted'))
    setShouldShowOutOfSyncError(true)
  }

  React.useEffect(() => {
    if (
      isInitialized &&
      templateYamlError?.status !== 'ERROR' &&
      !isNewTemplate(templateIdentifier) &&
      templateMetadata?.versionLabel !== DefaultNewVersionLabel
    ) {
      handleReconcile()
    }
  }, [isInitialized, templateIdentifier, templateMetadata?.versionLabel, templateYamlError])

  React.useEffect(() => {
    if (isNewTemplate(templateIdentifier)) {
      setView(SelectedView.VISUAL)
    } else if (entityValidityDetails.valid === false || view === SelectedView.YAML) {
      setView(SelectedView.YAML)
    } else {
      setView(SelectedView.VISUAL)
    }
  }, [templateIdentifier, entityValidityDetails.valid])

  const getPathParams = React.useCallback(() => {
    const pathParams = {
      templateIdentifier: ':templateIdentifier',
      templateType: ':templateType' as TemplateType
    }
    return projectIdentifier
      ? merge(pathParams, { ...projectPathProps, ...pipelineModuleParams })
      : orgIdentifier
      ? merge(pathParams, { ...orgPathProps })
      : merge(pathParams, { ...accountPathProps })
  }, [projectIdentifier, orgIdentifier])

  const updateEntity = React.useCallback(async (entityYaml: string) => {
    await templateStudioSubHeaderHandleRef.current?.updateTemplate(entityYaml)
    setShouldShowOutOfSyncError(false)
  }, [])

  const ErrorPanel = (): JSX.Element => (
    <Container style={{ maxWidth: '570px', alignSelf: 'center' }} padding={'huge'}>
      <NoEntityFound
        identifier={templateIdentifier}
        entityType={'template'}
        errorObj={templateYamlError}
        gitDetails={{
          connectorRef: storeMetadata?.connectorRef,
          repoName: storeMetadata?.repoName,
          branch: storeMetadata?.branch,
          onBranchChange: onGitBranchChange
        }}
      />
    </Container>
  )

  const renderView = <TemplateYamlViewY1 />

  // const renderView =
  //   view === SelectedView.VISUAL ? (
  //     /* istanbul ignore next */
  //     templateFactory.getTemplate(templateType)?.renderTemplateCanvas(templateFormikRef)
  //   ) : (
  //     <TemplateYamlView />
  //   )

  const studioCanvasUI = templateYamlError ? (
    <ErrorPanel />
  ) : (
    <>
      {templateInputsErrorNodeSummary && shouldShowOutOfSyncError && (
        <OutOfSyncErrorStrip
          errorNodeSummary={templateInputsErrorNodeSummary}
          entity={TemplateErrorEntity.TEMPLATE}
          originalYaml={yamlStringify({ template: originalTemplate })}
          isReadOnly={isReadonly}
          onRefreshEntity={() => {
            fetchTemplate({ forceFetch: true, forceUpdate: true, loadFromCache: false })
            setShouldShowOutOfSyncError(false)
          }}
          updateRootEntity={updateEntity}
          gitDetails={gitDetails}
          storeMetadata={storeMetadata}
        />
      )}
      <Container className={css.canvasContainer}>{renderView}</Container>
    </>
  )

  // TODO: removed TemplateVariablesContextProvider
  //<TemplateVariablesContextProvider template={template} storeMetadata={storeMetadata}>
  //</TemplateVariablesContextProvider>
  return (
    <>
      <NavigationCheck
        when={templateMetadata?.identifier !== ''}
        shouldBlockNavigation={nextLocation => {
          const matchDefault = matchPath(nextLocation.pathname, {
            path: routes.toTemplateStudioNew(getPathParams()),
            exact: true
          })
          return (
            !matchDefault?.isExact &&
            isUpdated &&
            !isReadonly &&
            !(isNewTemplate(templateIdentifier) && isEmpty(templateMetadata?.name))
          )
        }}
        textProps={{
          contentText: getString(navigationContentText),
          titleText: getString(navigationTitleText)
        }}
        navigate={newPath => {
          const isTemplate = matchPath(newPath, {
            path: routes.toTemplateStudioNew(getPathParams()),
            exact: true
          })
          !isTemplate?.isExact && deleteTemplateCache()
          history.push(newPath)
        }}
      />
      <BannerEOL isVisible={showBanner} />
      <Page.Header
        className={classNames({ [css.rightMargin]: !auxNavEnabled })}
        size={'small'}
        title={<TemplateStudioHeaderY1 templateType={templateType as TemplateType} />}
      />
      <Page.Body className={classNames({ [css.rightMargin]: !auxNavEnabled }, css.studioWrapper)}>
        {isLoading ? (
          <PageSpinner />
        ) : (
          <Layout.Vertical height={'100%'}>
            {isEmpty(template) && !isGitSyncEnabled && <GenericErrorHandler />}
            {isEmpty(template) && isGitSyncEnabled && (
              <NoEntityFound identifier={templateIdentifier} entityType="template" />
            )}
            {isInitialized && !isEmpty(template) && (
              <>
                <TemplateStudioSubHeaderY1WithRef
                  ref={templateStudioSubHeaderHandleRef}
                  onViewChange={onViewChange}
                  getErrors={getErrors}
                  onGitBranchChange={onGitBranchChange}
                  onReconcile={handleReconcile}
                />
                <NodeMetadataProvider>{studioCanvasUI}</NodeMetadataProvider>
              </>
            )}
            {templateType !== TemplateType.Pipeline && <RightBarY1 />}
          </Layout.Vertical>
        )}
      </Page.Body>
    </>
  )
}