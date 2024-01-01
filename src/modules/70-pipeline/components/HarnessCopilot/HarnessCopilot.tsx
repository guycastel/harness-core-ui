/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import moment from 'moment'
import { Drawer, PopoverInteractionKind, PopoverPosition, Position } from '@blueprintjs/core'
import cx from 'classnames'
import { useParams } from 'react-router-dom'
import { capitalize, get } from 'lodash-es'
import { Color, FontVariation } from '@harness/design-system'
import { Container, Icon, Layout, Popover, Text } from '@harness/uicore'
import { RcaRequestBody, ResponseRemediation, rcaPromise, Error } from 'services/logs'
import { useStrings } from 'framework/strings'
import type { Module } from 'framework/types/ModuleName'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { pluralize } from '@common/utils/StringUtils'
import type { ExecutionPathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import { useLocalStorage } from '@common/hooks'
import { createFormDataFromObjectPayload } from '@common/constants/Utils'
import { getHTMLFromMarkdown } from '@common/utils/MarkdownUtils'
import { AidaActions } from '@modules/10-common/constants/TrackingConstants'
import { useExecutionContext } from '@pipeline/context/ExecutionContext'
import {
  getCommandFromCurrentStep,
  getInfraTypeFromStageForCurrentStep,
  resolveCurrentStep,
  getOSTypeAndArchFromStageForCurrentStep,
  getSelectedStageModule,
  getPluginUsedFromStepParams,
  getNodeId
} from '@pipeline/utils/executionUtils'
import type { LogsContentProps } from '@pipeline/factories/ExecutionFactory/types'
import UsefulOrNot, { AidaClient } from '@common/components/UsefulOrNot/UsefulOrNot'
import { GraphLayoutNode } from 'services/pipeline-ng'
import { getTaskFromExecutableResponse } from '../LogsContent/LogsState/createSections'
import { StepType } from '../PipelineSteps/PipelineStepInterface'
import { getErrorMessage, ErrorScope } from './AIDAUtils'

import css from './HarnessCopilot.module.scss'

interface HarnessCopilotProps {
  mode: LogsContentProps['mode']
  scope: ErrorScope
}

enum AIAnalysisStatus {
  NotInitiated = 'NOT_INITIATED',
  Cancelled = 'CANCELLED',
  InProgress = 'IN_PROGRESS',
  Success = 'SUCCESS',
  Failure = 'FAILURE'
}

const SHOW_DELAY_MSSG_AFTER_DURATION = 7000

function HarnessCopilot(props: HarnessCopilotProps): React.ReactElement {
  const { mode, scope } = props
  const { getString } = useStrings()
  const { accountId, executionIdentifier } = useParams<PipelineType<ExecutionPathProps>>()
  const {
    pipelineStagesMap,
    selectedStageId,
    pipelineExecutionDetail,
    selectedStepId,
    queryParams,
    allNodeMap,
    logsToken,
    selectedStageExecutionId,
    selectedChildStageId
  } = useExecutionContext()
  const [showTooltip, setShowTooltip] = useLocalStorage<boolean>('show_harness_ai_co-pilot_tooptip', true)
  const [showPanel, setShowPanel] = useState<boolean>(false)
  const [remediations, setRemediations] = useState<ResponseRemediation[]>([])
  const [remediationsGeneratedAt, setRemediationsGeneratedAt] = useState<number | null>()
  const [error, setError] = useState<Error>()
  const [status, setStatus] = useState<AIAnalysisStatus>(AIAnalysisStatus.NotInitiated)
  const currentStepId = resolveCurrentStep(selectedStepId, queryParams)
  const selectedStep = allNodeMap[currentStepId]
  const [showDelayMssg, setShowDelayMessage] = useState<boolean>(false)
  const controllerRef = useRef<AbortController>()
  const showMinimalView = scope === ErrorScope.Stage
  const nodeId = getNodeId(selectedStageId, selectedStageExecutionId, selectedChildStageId)
  let currentModule = getSelectedStageModule(pipelineStagesMap, nodeId)
  if (!currentModule) {
    const _pipelineExecutionDetail = get(pipelineExecutionDetail, 'childGraph', pipelineExecutionDetail)
    const pipelineStagesMapFromExecutionDetails = new Map(
      Object.entries(get(_pipelineExecutionDetail, 'pipelineExecutionSummary.layoutNodeMap', {}))
    ) as Map<string, GraphLayoutNode>
    currentModule = getSelectedStageModule(pipelineStagesMapFromExecutionDetails, nodeId)
  }
  const { trackEvent } = useTelemetry()

  useEffect(() => {
    let timerId: NodeJS.Timeout
    if (status === AIAnalysisStatus.InProgress) {
      timerId = setTimeout(() => setShowDelayMessage(true), SHOW_DELAY_MSSG_AFTER_DURATION)
    }
    return () => clearTimeout(timerId)
  }, [status])

  useEffect(() => {
    // abort any stray api calls to fetch remediations and reset to default state
    if (currentStepId) {
      controllerRef.current?.abort()
      setRemediations([])
      setRemediationsGeneratedAt(null)
      setStatus(AIAnalysisStatus.NotInitiated)
    }
  }, [currentStepId])

  const fetchAnalysis = useCallback((): void => {
    controllerRef.current = new AbortController()
    setStatus(AIAnalysisStatus.InProgress)
    const apiBodyPayload = getPostAPIBodyPayload()
    if (!logsToken) {
      setStatus(AIAnalysisStatus.Failure)
      return
    }
    const currentTime = new Date().getTime()
    try {
      rcaPromise(
        {
          queryParams: { 'X-Harness-Token': logsToken, accountID: accountId },
          requestOptions: {
            headers: {
              'content-type': 'application/x-www-form-urlencoded'
            }
          },
          body: createFormDataFromObjectPayload(apiBodyPayload)
        },
        controllerRef.current?.signal
      )
        .then((response: ResponseRemediation) => {
          if (response?.rca) {
            const remediationFetched = [response]
            setRemediations(remediationFetched)
            setStatus(AIAnalysisStatus.Success)
            setRemediationsGeneratedAt(currentTime)
          } else {
            setStatus(AIAnalysisStatus.Failure)
            setError(response as Error)
          }
        })
        .catch((err: Error) => {
          // ignore errors like user aborted API request
          if (!controllerRef.current?.signal.aborted) {
            setStatus(AIAnalysisStatus.Failure)
            setError(err as Error)
          }
        })
    } catch (e) {
      setError(e as Error)
      setStatus(AIAnalysisStatus.Failure)
    }
  }, [
    logsToken,
    pipelineStagesMap,
    selectedStageId,
    pipelineExecutionDetail,
    selectedStepId,
    selectedStep,
    accountId,
    controllerRef.current
  ])

  const errorSummary = useMemo(
    () =>
      getErrorMessage({
        erropScope: scope,
        allNodeMap,
        pipelineExecutionDetail,
        pipelineStagesMap,
        queryParams,
        nodeId,
        selectedStepId
      }),
    [allNodeMap, pipelineExecutionDetail, pipelineStagesMap, queryParams, scope, nodeId, selectedStepId]
  )

  const getPostAPIBodyPayload = useCallback((): RcaRequestBody => {
    const commonArgs = {
      pipelineStagesMap,
      selectedStageId: nodeId,
      pipelineExecutionDetail
    }
    const step_type = get(selectedStep, 'stepType', '') as StepType
    return {
      infra: getInfraTypeFromStageForCurrentStep(commonArgs),
      ...(currentModule === 'ci' && {
        ...getOSTypeAndArchFromStageForCurrentStep(commonArgs),
        plugin: getPluginUsedFromStepParams(selectedStep, step_type),
        command: getCommandFromCurrentStep({ step: selectedStep, pipelineStagesMap, selectedStageId })
      }),
      step_type,
      accountID: accountId,
      err_summary: errorSummary,
      keys: get(getTaskFromExecutableResponse(selectedStep), 'logKeys', '""')
    }
  }, [
    pipelineStagesMap,
    selectedStageId,
    pipelineExecutionDetail,
    selectedStep,
    accountId,
    errorSummary,
    currentModule
  ])

  const getAIDAClient = (module: Module): AidaClient | undefined => {
    switch (module) {
      case 'cd':
        return AidaClient.CD_RCA
      case 'ci':
        return AidaClient.CI_RCA
      default:
    }
  }

  const renderCTA = useCallback((): JSX.Element => {
    const hasRemediations = Array.isArray(remediations) && remediations.length > 0
    const errorMssg = (error as Error)?.error_msg ?? getString('errorTitle')
    const footerColor = mode === 'step-details' || showMinimalView ? Color.GREY_900 : Color.GREY_200
    const commonLabelProps = {
      font: { variation: FontVariation.BODY },
      className: css.statusActionBtn,
      color: Color.AI_PURPLE_700
    }

    switch (status) {
      case AIAnalysisStatus.NotInitiated:
        return (
          <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} className={css.pill} spacing="medium">
            <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} spacing="small">
              <Icon name="harness-copilot" size={25} />
              <Layout.Horizontal flex spacing="xsmall">
                {showMinimalView ? (
                  <></>
                ) : (
                  <Text font={{ variation: FontVariation.BODY }}>{getString('pipeline.copilot.analyzeFailure')}</Text>
                )}
                <Text
                  font={{ variation: FontVariation.BODY }}
                  color={Color.AI_PURPLE_700}
                  onClick={() => {
                    fetchAnalysis()
                    if (currentModule) {
                      const aidaClient = getAIDAClient(currentModule)
                      if (aidaClient) {
                        trackEvent(AidaActions.AIDAInteractionStarted, {
                          aidaClient,
                          executionInfo: {
                            errorMssg,
                            stepType: selectedStep.stepType as StepType
                          }
                        })
                      }
                    }
                  }}
                  tooltip={
                    <Container className={css.tooltipPadding}>
                      <Container flex={{ justifyContent: 'flex-end' }}>
                        <Icon
                          name="cross"
                          size={20}
                          onClick={() => setShowTooltip(false)}
                          data-testid="dismiss-tooltip-button"
                          className={css.closeBtn}
                        />
                      </Container>
                      <Layout.Vertical spacing="small" className={css.tooltipContent}>
                        <Layout.Horizontal spacing="small" flex={{ justifyContent: 'flex-start' }}>
                          <Icon name="harness-copilot" size={25} />
                          <Text className={css.label} font={{ variation: FontVariation.H5 }}>
                            {getString('common.csBot.introduction')}
                          </Text>
                        </Layout.Horizontal>
                        <Text className={css.label} font={{ variation: FontVariation.SMALL }}>
                          {getString('pipeline.copilot.helpText')}
                        </Text>
                      </Layout.Vertical>
                    </Container>
                  }
                  tooltipProps={{
                    isOpen: showTooltip,
                    popoverClassName: css.tooltip,
                    usePortal: true,
                    position: PopoverPosition.TOP_RIGHT
                  }}
                  className={css.copilot}
                >
                  {getString('pipeline.copilot.askAIDA')}
                </Text>
              </Layout.Horizontal>
            </Layout.Horizontal>
          </Layout.Horizontal>
        )
      case AIAnalysisStatus.InProgress:
        return (
          <Layout.Vertical flex>
            <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} className={css.pill} spacing="medium">
              <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} spacing="small">
                <Icon name="harness-copilot" size={25} />
                <Text font={{ variation: FontVariation.BODY }}>
                  {showMinimalView
                    ? capitalize(getString('common.analyzing'))
                    : getString('pipeline.copilot.analyzing')}
                </Text>
                <Icon name="loading" size={25} color={Color.AI_PURPLE_900} />
              </Layout.Horizontal>
              {showMinimalView ? (
                <Icon
                  name="small-cross"
                  size={20}
                  onClick={() => setStatus(AIAnalysisStatus.NotInitiated)}
                  className={css.crossBtn}
                />
              ) : (
                <Text
                  font={{ variation: FontVariation.BODY }}
                  onClick={() => setStatus(AIAnalysisStatus.NotInitiated)}
                  className={css.statusActionBtn}
                  color={Color.AI_PURPLE_700}
                >
                  {getString('common.stop')}
                </Text>
              )}
            </Layout.Horizontal>
            {showDelayMssg ? (
              <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} spacing="small">
                <Icon name="info" size={15} color={footerColor} />
                <Text color={footerColor} font={{ variation: FontVariation.SMALL }}>
                  {getString('common.delay15Sec')}
                </Text>
              </Layout.Horizontal>
            ) : null}
          </Layout.Vertical>
        )
      case AIAnalysisStatus.Success:
        return (
          <Layout.Horizontal
            flex={{ justifyContent: 'flex-start' }}
            className={css.pill}
            spacing={showMinimalView ? 'small' : 'medium'}
          >
            <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} spacing="small">
              <Icon name="harness-copilot" size={25} />
              {hasRemediations ? (
                showMinimalView ? (
                  <Text {...commonLabelProps} onClick={() => setShowPanel(true)}>
                    {`${getString('common.viewText')} ${capitalize(getString('pipeline.copilot.remediations'))}`}
                  </Text>
                ) : (
                  <Layout.Horizontal spacing="small">
                    <Text font={{ variation: FontVariation.BODY }}>
                      {getString('pipeline.copilot.foundPossibleRemediations').concat(pluralize(remediations.length))}
                    </Text>
                    <Text {...commonLabelProps} onClick={() => setShowPanel(true)}>
                      {getString('common.viewText')}
                    </Text>
                  </Layout.Horizontal>
                )
              ) : (
                <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} spacing="small">
                  <Text font={{ variation: FontVariation.BODY }}>
                    {getString('pipeline.copilot.noRemediationFound')}
                  </Text>
                  <Icon name="danger-icon" size={20} />
                  <Text {...commonLabelProps} onClick={() => setStatus(AIAnalysisStatus.NotInitiated)}>
                    {getString('close')}
                  </Text>
                </Layout.Horizontal>
              )}
            </Layout.Horizontal>
          </Layout.Horizontal>
        )
      case AIAnalysisStatus.Failure:
        return (
          <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} className={css.pill} spacing="medium">
            <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} spacing="small">
              <Icon name="harness-copilot" size={25} />
              {errorMssg ? <Text font={{ variation: FontVariation.BODY }}>{errorMssg}</Text> : null}
              <Icon name="danger-icon" size={20} />
            </Layout.Horizontal>
            {showMinimalView ? (
              <Icon name="repeat" onClick={fetchAnalysis} color={Color.AI_PURPLE_700} className={css.copilot} />
            ) : (
              <Text
                font={{ variation: FontVariation.BODY }}
                onClick={fetchAnalysis}
                className={css.statusActionBtn}
                color={Color.AI_PURPLE_700}
              >
                {getString('retry')}
              </Text>
            )}
          </Layout.Horizontal>
        )
      default:
        return <></>
    }
  }, [
    status,
    showTooltip,
    remediations,
    error,
    logsToken,
    showDelayMssg,
    showMinimalView,
    pipelineStagesMap,
    selectedStageId,
    selectedStageExecutionId,
    pipelineExecutionDetail,
    selectedStepId,
    selectedStep,
    accountId,
    controllerRef.current,
    scope
  ])

  const renderRemediation = useCallback(
    (remediation: string): JSX.Element => {
      return (
        <Layout.Vertical spacing="xsmall" height="100%">
          <Layout.Vertical
            className={css.remediation}
            padding={{ top: 'large', left: 'xlarge', right: 'xlarge' }}
            spacing="small"
          >
            <Text className={css.label} font={{ variation: FontVariation.H5 }}>
              {getString('pipeline.copilot.possibleSolutions')}
            </Text>
            <div
              className={cx(css.markdown, css.overflow)}
              dangerouslySetInnerHTML={{ __html: getHTMLFromMarkdown(remediation) }}
            />
          </Layout.Vertical>
          <Layout.Horizontal flex={{ justifyContent: 'space-between' }} spacing={'medium'}>
            {remediationsGeneratedAt ? (
              <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} className={css.flex2}>
                <Text color={Color.AI_PURPLE_600} font={{ variation: FontVariation.FORM_LABEL }}>{`${getString(
                  'common.generatedAt'
                )} ${moment(remediationsGeneratedAt).format('LLL')}`}</Text>
              </Layout.Horizontal>
            ) : null}
            <UsefulOrNot
              telemetry={{
                aidaClient: currentModule === 'cd' ? AidaClient.CD_RCA : AidaClient.CI_RCA,
                metadata: {
                  executionIdentifier,
                  error: errorSummary,
                  remediation
                }
              }}
            />
          </Layout.Horizontal>
        </Layout.Vertical>
      )
    },
    [currentModule, errorSummary, executionIdentifier, remediationsGeneratedAt]
  )

  return (
    <>
      {renderCTA()}
      <Drawer
        position={Position.RIGHT}
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        className={css.drawer}
        isCloseButtonShown={true}
      >
        <Layout.Vertical className={css.panel}>
          <Layout.Vertical padding={{ bottom: 'xlarge' }} spacing="medium">
            <Container>
              <Container flex={{ justifyContent: 'flex-end' }}>
                <Icon
                  name="cross"
                  size={25}
                  onClick={() => setShowPanel(false)}
                  data-testid="close-drawer-button"
                  className={css.closeBtn}
                />
              </Container>
              <Layout.Horizontal spacing="small" flex={{ justifyContent: 'flex-start' }}>
                <Layout.Horizontal spacing="medium" flex={{ justifyContent: 'flex-start' }}>
                  <Icon name="harness-copilot" size={35} />
                  <Text font={{ variation: FontVariation.H2 }}>{getString('pipeline.copilot.label')}</Text>
                </Layout.Horizontal>
                <Popover
                  content={
                    <Layout.Horizontal padding="large">
                      <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_100}>
                        {getString('pipeline.copilot.aidaFullText')}
                      </Text>
                    </Layout.Horizontal>
                  }
                  usePortal={true}
                  position={PopoverPosition.RIGHT}
                  interactionKind={PopoverInteractionKind.HOVER}
                  popoverClassName={css.popover}
                >
                  <Icon name="info" size={15} />
                </Popover>
              </Layout.Horizontal>
            </Container>
            <Text>{getString('pipeline.copilot.assist')}</Text>
          </Layout.Vertical>
          <Layout.Vertical className={css.remediations}>
            {remediations.map((remediation: ResponseRemediation) => renderRemediation(remediation.rca))}
          </Layout.Vertical>
        </Layout.Vertical>
      </Drawer>
    </>
  )
}

export default HarnessCopilot
