/* eslint-disable react/function-component-definition */
/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Color, FontVariation } from '@harness/design-system'
import { Button, ButtonSize, ButtonVariation, Container, Icon, Layout, Text } from '@harness/uicore'
import { useDownloadSbomQuery } from '@harnessio/react-ssca-manager-client'
import { defaultTo, get } from 'lodash-es'
import React, { FC, lazy } from 'react'
import { useParams } from 'react-router-dom'
import type { Cell, CellValue, ColumnInstance, Renderer, Row, TableInstance, UseTableCellProps } from 'react-table'
import ExecutionStatusLabel from '@modules/70-pipeline/components/ExecutionStatusLabel/ExecutionStatusLabel'
import { ExecutionStatus } from '@modules/70-pipeline/utils/statusHelpers'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { EvaluationStatus } from '@pipeline/components/execution/StepDetails/common/ExecutionContent/PolicyEvaluationContent/EvaluationStatusLabel/EvaluationStatusLabel'
import { useStrings } from 'framework/strings'
import { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import ChildComponentMounter from 'microfrontends/ChildComponentMounter'
import type { Artifact, ArtifactsColumnActions } from './ArtifactsTable'
import css from './ArtifactsTable.module.scss'

// eslint-disable-next-line import/no-unresolved
const SBOMScoreSummary = lazy(() => import('ssca/SBOMScoreSummary'))

export function downloadBlob(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  setTimeout(() => {
    URL.revokeObjectURL(url)
    a.remove()
  }, 150)

  a.click()
}

type CellTypeWithActions<D extends Record<string, any>, V = any> = TableInstance<D> & {
  column: ColumnInstance<D> & ArtifactsColumnActions
  row: Row<D>
  cell: Cell<D, V>
  value: CellValue<V>
}

type CellType = Renderer<CellTypeWithActions<Artifact>>

export interface CellTypeRegister {
  component: React.ComponentType<UseTableCellProps<Artifact>>
}

export const ArtifactCell: CellType = ({ row }) => {
  const data = row.original
  const { getString } = useStrings()

  return (
    <Layout.Vertical spacing="xsmall">
      <a href={data.url} target="_blank" rel="noopener noreferrer">
        <Text font={{ variation: FontVariation.LEAD }} color={Color.PRIMARY_7} lineClamp={1}>
          {data.imageName || data.url}
        </Text>
      </a>
      {data?.tag && (
        <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_600} lineClamp={1}>
          {`${getString('common.artifactTag')}: ${data.tag}`}
        </Text>
      )}
    </Layout.Vertical>
  )
}

export const PipelineStepCell: CellType = ({ row }) => {
  const data = row.original
  const { getString } = useStrings()

  return (
    <Layout.Vertical spacing="xsmall">
      <Text font={{ variation: FontVariation.SMALL_SEMI }} lineClamp={1}>
        {data.node?.name}
      </Text>

      <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_600} lineClamp={1}>
        {`${getString('common.stage').toLowerCase()}: ${data.stage}`}
      </Text>
    </Layout.Vertical>
  )
}

export const ViolationsCell: CellType = ({ row, column }) => {
  const { getString } = useStrings()
  const data = row.original

  const totalViolations = defaultTo(data?.allowListViolationCount, 0) + defaultTo(data?.denyListViolationCount, 0)
  return data?.type === 'SBOM' && totalViolations > 0 ? (
    <Button
      className={css.action}
      variation={ButtonVariation.LINK}
      text={totalViolations}
      size={ButtonSize.SMALL}
      onClick={() => column.showEnforcementViolations(data.stepExecutionId)}
    />
  ) : (
    <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_600}>
      {data?.type === 'SBOM' && data.node?.stepType === 'SscaEnforcement' ? 0 : getString('na')}
    </Text>
  )
}

export const TypeCell: CellType = ({ row, column }) => {
  const artifact = row.original
  const { projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const query = useDownloadSbomQuery(
    {
      org: orgIdentifier,
      project: projectIdentifier,
      'orchestration-id': artifact.stepExecutionId || ''
    },
    {
      enabled: false,
      retry: false,
      onSuccess: _data =>
        downloadBlob(
          defaultTo(_data.content.sbom, ''),
          `sbom_${artifact.imageName}_${artifact.tag}_${artifact.stepExecutionId}.json`
        )
    }
  )

  const { getString } = useStrings()

  return (
    <Layout.Vertical spacing="tiny" flex={{ alignItems: 'start' }}>
      <Layout.Horizontal spacing="xsmall">
        {artifact.sbomName ? (
          <Button
            variation={ButtonVariation.LINK}
            size={ButtonSize.SMALL}
            onClick={() => query.refetch()}
            loading={query.isFetching}
            className={css.action}
          >
            <Layout.Horizontal spacing="small" flex={{ alignItems: 'center', justifyContent: 'start' }}>
              <Text color={Color.PRIMARY_7} font={{ variation: FontVariation.SMALL }}>
                {getString('common.sbom')}
              </Text>
              <Icon size={12} name="import" color={Color.PRIMARY_7} />
            </Layout.Horizontal>
          </Button>
        ) : (
          <Text font={{ variation: FontVariation.SMALL_SEMI }} margin={{ bottom: 'xsmall' }}>
            {artifact.type}
          </Text>
        )}
        {artifact.scorecard && (
          <Container border={{ left: true }}>
            <ChildComponentMounter
              ChildComponent={SBOMScoreSummary}
              orchestrationId={artifact.stepExecutionId}
              scoreCard={artifact.scorecard}
            />
          </Container>
        )}
      </Layout.Horizontal>
      {artifact.drift && (
        <Button
          className={css.action}
          variation={ButtonVariation.LINK}
          size={ButtonSize.SMALL}
          onClick={() => {
            const drift = artifact.drift
            column.showDrift({
              drift_id: drift.driftId,
              artifact_name: artifact.imageName,
              tag: artifact.tag,
              base_tag: drift.baseTag,
              component_drift_summary: {
                added: drift.componentsAdded,
                deleted: drift.componentsDeleted,
                modified: drift.componentsModified,
                total: drift.componentDrifts
              },
              license_drift_summary: {
                added: drift.licenseAdded,
                deleted: drift.licenseDeleted,
                total: drift.licenseDrifts
              },
              total_drifts: drift.totalDrifts
            })
          }}
        >
          <Text color={Color.PRIMARY_7} font={{ variation: FontVariation.SMALL }} lineClamp={1}>
            {getString('common.drift')}
          </Text>
        </Button>
      )}

      {artifact.provenance && (
        <Button
          className={css.action}
          variation={ButtonVariation.LINK}
          size={ButtonSize.SMALL}
          onClick={() =>
            downloadBlob(
              JSON.stringify(get(artifact, 'provenance', {}), null, 2),
              `slsa_provenance_${get(artifact, 'stage', '')}_${get(artifact, 'node.identifier', '')}.json`
            )
          }
        >
          <Layout.Horizontal spacing="small" flex={{ alignItems: 'center', justifyContent: 'start' }}>
            <Text color={Color.PRIMARY_7} font={{ variation: FontVariation.SMALL }} lineClamp={1}>
              {getString('pipeline.slsaProvenance')}
            </Text>
            <Icon size={12} name="import" color={Color.PRIMARY_7} />
          </Layout.Horizontal>
        </Button>
      )}
    </Layout.Vertical>
  )
}

export const SLSAVerificationCell: CellType = ({ row }) => {
  const data = row.original

  const slsaPolicyOutcomeStatus = get(data.node, `outcomes.policyOutput.status`, undefined)

  return (
    <SLSAVerification
      hasSLSAVerification={data.node?.stepType === StepType.SLSAVerification}
      slsaPolicyOutcomeStatus={slsaPolicyOutcomeStatus}
      provenance={data.provenance}
    />
  )
}

// common component shared to MFE
export const SLSAVerification: FC<{
  hasSLSAVerification: boolean
  slsaPolicyOutcomeStatus: string | undefined
  provenance: unknown
}> = ({ hasSLSAVerification, slsaPolicyOutcomeStatus, provenance }) => {
  const { getString } = useStrings()

  const status = slsaPolicyOutcomeStatus as EvaluationStatus

  const getPolicyEvaluationStatusLabel = (): string => {
    switch (status) {
      case EvaluationStatus.ERROR:
        return getString('failed')
      case EvaluationStatus.WARNING:
        return getString('common.warning')
      case EvaluationStatus.PASS:
        return getString('passed')

      default:
        return getString('pipeline.policyNotConfigured')
    }
  }

  const getPolicyEvaluationStatus = (): ExecutionStatus => {
    switch (status) {
      case EvaluationStatus.ERROR:
        return 'Errored'
      case EvaluationStatus.WARNING:
        return 'Errored'
      case EvaluationStatus.PASS:
        return 'Success'

      default:
        return 'Errored'
    }
  }

  return hasSLSAVerification ? (
    <Layout.Vertical spacing="small" flex={{ alignItems: 'flex-start' }}>
      <ExecutionStatusLabel label={getPolicyEvaluationStatusLabel()} status={getPolicyEvaluationStatus()} />
      <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_600} lineClamp={1}>
        {getString('pipeline.attestationVerification')}: {provenance ? getString('passed') : getString('failed')}
      </Text>
    </Layout.Vertical>
  ) : (
    <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_600}>
      {getString('na')}
    </Text>
  )
}
