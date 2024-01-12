/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { defaultTo, isEmpty } from 'lodash-es'
import { Heading, Layout, TabNavigation, TagsPopover, useToaster } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { matchPath, useLocation, useParams, useRouteMatch } from 'react-router-dom'
import { GetDataError } from 'restful-react'
import { Page } from '@common/exports'
import routesv1 from '@common/RouteDefinitions'
import routesv2 from '@common/RouteDefinitionsV2'
import { useGlobalEventListener, useQueryParams, useUpdateQueryParams } from '@common/hooks'
import type { Error } from 'services/pipeline-ng'
import { useGetPipelineSummaryQuery } from 'services/pipeline-rq'
import {
  useGetListOfBranchesWithStatus,
  ResponseEOLBannerResponseDTO,
  checkIfPipelineUsingV1StagePromise
} from 'services/cd-ng'
import { NavigatedToPage } from '@common/constants/TrackingConstants'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { useStrings, String } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import type { GitQueryParams, PipelinePathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { DefaultNewPipelineId } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineActions'
import GitPopover from '@pipeline/components/GitPopover/GitPopover'
import GenericErrorHandler from '@common/pages/GenericErrorHandler/GenericErrorHandler'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import GitRemoteDetails from '@common/components/GitRemoteDetails/GitRemoteDetails'
import { StoreType } from '@common/constants/GitSyncTypes'
import type { GitFilterScope } from '@common/components/GitFilters/GitFilters'
import { BannerEOL } from '@pipeline/components/BannerEOL/BannerEOL'
import { isSimplifiedYAMLEnabled } from '@common/utils/utils'
import { YamlVersionBadge } from '@modules/70-pipeline/common/components/YamlVersionBadge/YamlVersionBadge'
import { YamlVersion } from '@modules/70-pipeline/common/hooks/useYamlVersion'
import NoEntityFound from '../utils/NoEntityFound/NoEntityFound'
import css from './PipelineDetails.module.scss'

// add custom event to the global scope
declare global {
  interface WindowEventMap {
    RENAME_PIPELINE: CustomEvent<string>
  }
}

function PipelinePage({ children }: React.PropsWithChildren<unknown>): React.ReactElement {
  const { orgIdentifier, projectIdentifier, pipelineIdentifier, accountId, module } =
    useParams<PipelineType<PipelinePathProps>>()
  const {
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF,
    supportingGitSimplification
  } = useAppStore()
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesv2 : routesv1
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const location = useLocation()
  const { trackEvent } = useTelemetry()
  const { showError } = useToaster()
  const { branch, repoIdentifier, storeType, repoName, connectorRef } = useQueryParams<GitQueryParams>()
  const { updateQueryParams } = useUpdateQueryParams()
  const { isExact: isPipelineStudioV0Route } = useRouteMatch(
    routes.toPipelineStudio({
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      accountId,
      module
    })
  ) || { isExact: false }
  const { isExact: isPipelineStudioV1Route } = useRouteMatch(
    routes.toPipelineStudioV1({
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      accountId,
      module
    })
  ) || { isExact: false }
  const isPipelineStudioRoute = isPipelineStudioV0Route || isPipelineStudioV1Route

  const { data: pipeline, error } = useGetPipelineSummaryQuery(
    {
      pipelineIdentifier,
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        branch,
        repoIdentifier,
        getMetadataOnly: true
      }
    },
    {
      enabled: !isPipelineStudioRoute && pipelineIdentifier !== DefaultNewPipelineId,
      staleTime: 5 * 60 * 1000
    }
  )

  const isPipelineRemote = supportingGitSimplification && storeType === StoreType.REMOTE

  const { data: branchesWithStatusData, refetch: getDefaultBranchName } = useGetListOfBranchesWithStatus({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      yamlGitConfigIdentifier: repoIdentifier,
      page: 0,
      size: 20
    },
    lazy: true
  })

  const [pipelineName, setPipelineName] = React.useState('')
  const [triggerTabDisabled, setTriggerTabDisabled] = React.useState(false)
  const [showBanner, setShowBanner] = React.useState<boolean>(false)
  const { CI_YAML_VERSIONING, PL_EULA_ENABLED, PL_AI_SUPPORT_CHATBOT, CDS_YAML_SIMPLIFICATION } = useFeatureFlags()
  const isAuxNavNotEnabled = !PL_EULA_ENABLED || !PL_AI_SUPPORT_CHATBOT
  const isYAMLSimplicationEnabledForCI = isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const routeParams = {
    orgIdentifier,
    projectIdentifier,
    pipelineIdentifier,
    accountId,
    module,
    repoIdentifier,
    branch,
    repoName,
    connectorRef,
    storeType
  }

  React.useEffect(() => {
    // Check if Pipeline is Using V1 Stage only for the Edit flow.
    if (pipelineIdentifier !== DefaultNewPipelineId) {
      abortControllerRef.current = new AbortController()
      checkIfPipelineUsingV1StagePromise(
        {
          queryParams: {
            accountIdentifier: accountId
          },
          body: { orgIdentifier, projectIdentifier, pipelineIdentifier }
        },
        abortControllerRef.current?.signal
      )
        .then((res: ResponseEOLBannerResponseDTO) => {
          if (res?.data?.showBanner) {
            setShowBanner(true)
          }
        })
        .catch((err: GetDataError<Error>) => {
          // ignore errors like user aborted API request
          if (!abortControllerRef.current?.signal.aborted) {
            showError(defaultTo(defaultTo((err.data as Error)?.message, err.message), getString('somethingWentWrong')))
          }
        })
    }
    return () => {
      if (abortControllerRef.current) {
        /* istanbul ignore next */
        abortControllerRef.current.abort()
      }
    }
  }, [orgIdentifier, projectIdentifier, pipelineIdentifier, accountId])

  React.useEffect(() => {
    if (repoIdentifier && !storeType) {
      getDefaultBranchName()
    }
  }, [repoIdentifier])

  React.useEffect(() => {
    if (branch && branchesWithStatusData?.data?.defaultBranch?.branchName !== branch && !supportingGitSimplification) {
      setTriggerTabDisabled(true)
    } else {
      setTriggerTabDisabled(false)
    }
  }, [branchesWithStatusData, branch, supportingGitSimplification])

  React.useEffect(() => {
    pipeline?.data?.gitDetails?.branch && updateQueryParams({ branch: pipeline?.data?.gitDetails?.branch })
  }, [pipeline?.data?.gitDetails?.branch])

  React.useEffect(() => {
    // Pipeline View
    const isPipeLineStudioView = !!matchPath(location.pathname, {
      path: isYAMLSimplicationEnabledForCI
        ? routes.toPipelineStudioV1(routeParams)
        : routes.toPipelineStudio(routeParams)
    })
    if (isPipeLineStudioView) {
      return trackEvent(NavigatedToPage.PipelineStudio, {})
    }

    // Inout View
    const isInputSetsView = !!matchPath(location.pathname, {
      path: routes.toInputSetList(routeParams)
    })
    if (isInputSetsView) {
      return trackEvent(NavigatedToPage.PipelineInputSet, {})
    }

    // Triggers View
    const isTriggersView = !!matchPath(location.pathname, {
      path: routes.toTriggersPage(routeParams)
    })
    if (isTriggersView) {
      return trackEvent(NavigatedToPage.PipelineTriggers, {})
    }

    // Execution History View
    const isExecutionHistoryView = !!matchPath(location.pathname, {
      path: routes.toPipelineDeploymentList(routeParams)
    })
    if (isExecutionHistoryView) {
      return trackEvent(NavigatedToPage.PipelineExecutionHistory, {})
    }
  }, [location.pathname])

  React.useEffect(() => {
    setPipelineName(pipeline?.data?.name || '')
  }, [pipeline?.data?.name])

  useGlobalEventListener('RENAME_PIPELINE', event => {
    if (event.detail) {
      setPipelineName(event.detail)
    }
  })

  const { getString } = useStrings()
  const getBreadCrumbs = React.useCallback(
    () => [
      {
        url: routes.toPipelines({ orgIdentifier, projectIdentifier, accountId, module }),
        label: getString('pipelineBreadcrumb')
      }
    ],
    [accountId, getString, module, orgIdentifier, projectIdentifier]
  )

  const isExecutionHistoryView = !!matchPath(location.pathname, {
    path: routes.toPipelineDeploymentList({
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      accountId,
      module
    })
  })

  if (
    (error && !isGitSyncEnabled && (!supportingGitSimplification || storeType !== StoreType.REMOTE)) ||
    (error as Error)?.code === 'ENTITY_NOT_FOUND'
  ) {
    return <GenericErrorHandler errStatusCode={error?.status} errorMessage={(error as Error)?.message} />
  }

  if (
    error &&
    isEmpty(pipeline) &&
    (isGitSyncEnabled || (supportingGitSimplification && storeType === StoreType.REMOTE))
  ) {
    return <NoEntityFound identifier={pipelineIdentifier} entityType={'pipeline'} errorObj={error as Error} />
  }

  const isTriggersView = !!matchPath(location.pathname, {
    path: routes.toTriggersPage({
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      accountId,
      module
    })
  })
  const isInputSetView = !!matchPath(location.pathname, {
    path: routes.toInputSetList({
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      accountId,
      module
    })
  })

  const onGitBranchChange = (selectedFilter: GitFilterScope): void => {
    if (branch !== selectedFilter.branch) {
      updateQueryParams(
        {
          branch: selectedFilter.branch || ''
        },
        { skipNulls: true },
        true
      )
    }
  }

  return (
    <>
      <BannerEOL isVisible={showBanner} />
      <Page.Header
        className={isPipelineStudioV0Route && isAuxNavNotEnabled ? css.rightMargin : ''}
        testId={isPipelineStudioRoute ? 'pipeline-studio' : 'not-pipeline-studio'}
        size={isPipelineStudioRoute ? 'small' : 'standard'}
        title={
          <Layout.Vertical>
            <Layout.Horizontal>
              <NGBreadcrumbs links={getBreadCrumbs()} />
            </Layout.Horizontal>
            {isPipelineStudioRoute && (
              <String tagName="div" className={css.pipelineStudioTitle} stringID="pipelineStudio" />
            )}
            {!isPipelineStudioRoute && (
              <Layout.Horizontal spacing="xsmall" flex={{ justifyContent: 'left', alignItems: 'center' }}>
                {CDS_YAML_SIMPLIFICATION && pipeline?.data && (
                  <YamlVersionBadge
                    version={pipeline?.data?.yamlVersion as YamlVersion}
                    minimal
                    border
                    className={css.yamlVersionBadge}
                  />
                )}
                <Heading level={2} color={Color.GREY_800} font={{ weight: 'bold' }}>
                  {pipelineName}
                </Heading>
                {CDS_YAML_SIMPLIFICATION && pipeline?.data?.tags && !isEmpty(pipeline.data.tags) && (
                  <TagsPopover
                    iconProps={{ size: 12, color: Color.GREY_600 }}
                    tagsTitle={getString('pipeline.pipelineTags')}
                    tags={pipeline?.data?.tags}
                    containerClassName={css.tagsContainer}
                  />
                )}
                {isPipelineRemote ? (
                  <div className={css.gitRemoteDetailsWrapper}>
                    <GitRemoteDetails
                      connectorRef={connectorRef}
                      repoName={pipeline?.data?.gitDetails?.repoName}
                      branch={defaultTo(pipeline?.data?.gitDetails?.branch, branch)} // gitDetails will not have branch if pipeline not found
                      filePath={pipeline?.data?.gitDetails?.filePath}
                      fileUrl={pipeline?.data?.gitDetails?.fileUrl}
                      onBranchChange={onGitBranchChange}
                      flags={{
                        readOnly: isTriggersView || isInputSetView,
                        showBranch: !isExecutionHistoryView
                      }}
                    />
                  </div>
                ) : isGitSyncEnabled && repoIdentifier ? (
                  <GitPopover data={{ repoIdentifier, branch }} iconProps={{ margin: { left: 'small' } }} />
                ) : null}
              </Layout.Horizontal>
            )}
          </Layout.Vertical>
        }
        toolbar={
          <TabNavigation
            size={'small'}
            links={[
              {
                label: getString('pipelineStudio'),
                to: isYAMLSimplicationEnabledForCI
                  ? routes.toPipelineStudioV1({
                      orgIdentifier,
                      projectIdentifier,
                      pipelineIdentifier,
                      accountId,
                      module,
                      connectorRef,
                      repoIdentifier,
                      repoName,
                      branch,
                      storeType
                    })
                  : routes.toPipelineStudio({
                      orgIdentifier,
                      projectIdentifier,
                      pipelineIdentifier,
                      accountId,
                      module,
                      connectorRef,
                      repoIdentifier,
                      repoName,
                      branch,
                      storeType
                    })
              },
              {
                label: getString('inputSetsText'),
                to: routes.toInputSetList({
                  orgIdentifier,
                  projectIdentifier,
                  pipelineIdentifier,
                  accountId,
                  module,
                  connectorRef,
                  repoIdentifier,
                  repoName,
                  branch,
                  storeType
                }),
                disabled: pipelineIdentifier === DefaultNewPipelineId
              },
              {
                label: getString('common.triggersLabel'),
                to: routes.toTriggersPage({
                  orgIdentifier,
                  projectIdentifier,
                  pipelineIdentifier,
                  accountId,
                  module,
                  connectorRef,
                  repoIdentifier,
                  repoName,
                  branch,
                  storeType
                }),
                disabled: pipelineIdentifier === DefaultNewPipelineId || triggerTabDisabled
              },
              {
                label: getString('executionHeaderText'),
                to: routes.toPipelineDeploymentList({
                  orgIdentifier,
                  projectIdentifier,
                  pipelineIdentifier,
                  accountId,
                  module,
                  connectorRef,
                  repoIdentifier,
                  repoName,
                  branch,
                  storeType
                }),
                disabled: pipelineIdentifier === DefaultNewPipelineId
              }
            ]}
          />
        }
      />
      <Page.Body className={isPipelineStudioV0Route && isAuxNavNotEnabled ? css.rightMargin : ''}>{children}</Page.Body>
    </>
  )
}

export default function PipelineDetails({ children }: React.PropsWithChildren<unknown>): React.ReactElement {
  const { isGitSyncEnabled: isGitSyncEnabledForProject, gitSyncEnabledOnlyForFF } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF

  return (
    <div className={css.wrapper}>
      {isGitSyncEnabled ? (
        <GitSyncStoreProvider>
          <PipelinePage>{children}</PipelinePage>
        </GitSyncStoreProvider>
      ) : (
        <PipelinePage>{children}</PipelinePage>
      )}
    </div>
  )
}
