/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { get } from 'lodash-es'
import { Container, Button, Text, Layout } from '@harness/uicore'
import type { PipelineExecutionSummary } from 'services/pipeline-ng'
import { useReportSummary, useGetToken } from 'services/ti-service'
import type { StageDetailProps } from '@pipeline/factories/ExecutionFactory/types'
import { useExecutionContext } from '@pipeline/context/ExecutionContext'
import { String as StrTemplate } from 'framework/strings'
import {
  getStageSetupIds,
  getStageNodesWithArtifacts,
  getArtifactGroups
} from '@pipeline/pages/execution/ExecutionArtifactsView/ExecutionArtifactsView'
import type { Artifact } from '@pipeline/pages/execution/ExecutionArtifactsView/ArtifactsComponent/ArtifactsComponent'
import { useIsPublicAccess } from 'framework/hooks/usePublicAccess'
import css from './CIStageDetails.module.scss'

export function CIStageDetails(props: StageDetailProps): React.ReactElement {
  const context = useExecutionContext()
  const isCurrentSessionPublic = useIsPublicAccess()
  const executionSummary = get(context, 'pipelineExecutionDetail.pipelineExecutionSummary')
  const executionGraph = get(context, 'pipelineExecutionDetail.executionGraph')
  const stageSetupIds = getStageSetupIds(executionSummary as PipelineExecutionSummary)
  const stageNodes = getStageNodesWithArtifacts(executionGraph as any, stageSetupIds)
  const artifactGroups = getArtifactGroups(
    stageNodes.filter(({ identifier }) => identifier === props.stage.nodeIdentifier)
  )
  const artifacts: Artifact[] = []
  artifactGroups.forEach(artifactGroup => artifacts.push(...artifactGroup.artifacts))

  const status = (context?.pipelineExecutionDetail?.pipelineExecutionSummary?.status || '').toUpperCase()

  const { accountId, orgIdentifier, projectIdentifier } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
  }>()

  const { data: serviceToken } = useGetToken({
    queryParams: { accountId }
  })

  const queryParams = useMemo(
    () => ({
      accountId,
      orgId: orgIdentifier,
      projectId: projectIdentifier,
      pipelineId: context?.pipelineExecutionDetail?.pipelineExecutionSummary?.pipelineIdentifier || '',
      buildId: String(context?.pipelineExecutionDetail?.pipelineExecutionSummary?.runSequence || ''),
      stageId: props.stage.nodeIdentifier as string
    }),
    [
      accountId,
      orgIdentifier,
      projectIdentifier,
      context?.pipelineExecutionDetail?.pipelineExecutionSummary?.pipelineIdentifier,
      context?.pipelineExecutionDetail?.pipelineExecutionSummary?.runSequence,
      props.stage.nodeIdentifier
    ]
  )

  const { data: reportSummary, refetch: fetchReportSummary } = useReportSummary({
    queryParams: { ...queryParams, report: 'junit' as const },
    lazy: true,
    requestOptions: {
      headers: {
        'X-Harness-Token': serviceToken || ''
      }
    }
  })

  useEffect(() => {
    if (status && (serviceToken || isCurrentSessionPublic)) {
      fetchReportSummary()
    }
  }, [status, serviceToken, props.stage?.nodeIdentifier, isCurrentSessionPublic])

  return (
    <div className={css.container}>
      <div className={css.main}>
        {artifacts && artifacts.length > 0 && (
          <div>
            <StrTemplate className={css.title} tagName="div" stringID="artifactOrArtifacts" />
            <ul className={css.values}>
              {artifacts.slice(0, 2).map(({ type, image, tag, url }, index) => (
                <li key={url}>
                  <Button
                    className={css.artifact}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    tooltip={<Container padding="small">{type === 'Image' ? `${image}:${tag}` : url}</Container>}
                    noStyling
                  >
                    {type === 'Image' ? `${image}:${tag}` : url}
                  </Button>
                  {index === 1 && artifacts.length > 2 && (
                    <Text
                      className={css.artifact}
                      tooltip={
                        <Container padding="small">
                          {artifacts.slice(2).map(artifact => (
                            <React.Fragment key={artifact.url}>
                              <Button
                                className={css.artifact}
                                href={artifact.url}
                                target="_blank"
                                rel="noreferrer"
                                tooltip={
                                  <Container padding="small">
                                    {artifact.type === 'Image' ? `${artifact.image}:${artifact.tag}` : artifact.url}
                                  </Container>
                                }
                                noStyling
                              >
                                {artifact.type === 'Image' ? `${artifact.image}:${artifact.tag}` : artifact.url}
                              </Button>
                              <br />
                            </React.Fragment>
                          ))}
                        </Container>
                      }
                      style={{ width: 'auto' }}
                    >
                      {`+${artifacts.length - 2}`}
                    </Text>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!!reportSummary?.total_tests && (
          <div>
            <StrTemplate className={css.title} tagName="div" stringID="ci.testSummary" />
            <Layout.Horizontal spacing="small" style={{ marginBottom: 'var(--spacing-1)' }}>
              <div className={css.testSummaryItem}>
                <StrTemplate tagName="div" stringID="total" />:<span>{reportSummary.total_tests}</span>
              </div>
              <div className={css.testSummaryItem}>
                <StrTemplate tagName="div" stringID="pipeline.testsReports.skipped" />:
                <span>{reportSummary.skipped_tests}</span>
              </div>
            </Layout.Horizontal>
            <Layout.Horizontal spacing="small">
              <div className={css.testSummaryItem}>
                <StrTemplate tagName="div" stringID="ci.successful" />:<span>{reportSummary.successful_tests}</span>
              </div>
              <div className={css.testSummaryItem}>
                <StrTemplate tagName="div" stringID="failed" />:<span>{reportSummary.failed_tests}</span>
              </div>
            </Layout.Horizontal>
          </div>
        )}
      </div>
    </div>
  )
}
