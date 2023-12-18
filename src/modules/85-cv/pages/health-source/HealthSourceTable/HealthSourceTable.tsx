/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback } from 'react'
import { cloneDeep } from 'lodash-es'
import type { CellProps, Renderer } from 'react-table'
import { useParams } from 'react-router-dom'
import { Container, Icon, Layout, Text, NoDataCard, ButtonVariation, TableV2 } from '@harness/uicore'
import { useToaster } from '@common/exports'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import type { HealthSource, HealthSourceDTO } from 'services/cv'
import { useStrings } from 'framework/strings'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import RbacButton from '@rbac/components/Button/Button'
import ContextMenuActions from '@cv/components/ContextMenuActions/ContextMenuActions'
import HealthSources from '@cv/components/PipelineSteps/ContinousVerification/components/HealthSources/HealthSources'
import CardWithOuterTitle from '@common/components/CardWithOuterTitle/CardWithOuterTitle'
import type { RowData } from '../HealthSourceDrawer/HealthSourceDrawerContent.types'
import { getIconBySourceType, getTypeByFeature } from './HealthSourceTable.utils'
import { useConfigurationContext } from '../../monitored-service/components/Configurations/ConfigurationContext'
import css from './HealthSourceTable.module.scss'

export default function HealthSourceTable({
  value,
  onEdit,
  onDeleteHealthSourceVerifyStep,
  onSuccess,
  onAddNewHealthSource,
  shouldRenderAtVerifyStep,
  isRunTimeInput
}: {
  value: any
  onSuccess: (data: HealthSourceDTO[]) => void
  onDeleteHealthSourceVerifyStep?: (selectedRow: HealthSource) => void
  onEdit: (data: HealthSource) => void
  onAddNewHealthSource: () => void
  shouldRenderAtVerifyStep?: boolean
  isRunTimeInput?: boolean
}): JSX.Element {
  const tableData = cloneDeep(value)
  const { showError } = useToaster()
  const { getString } = useStrings()
  const { isTemplateByReference } = useConfigurationContext()

  const { projectIdentifier } = useParams<ProjectPathProps>()

  const onDeleteHealthSource = useCallback(
    async (selectedRow: HealthSource): Promise<void> => {
      const updatedHealthSources = tableData?.filter(
        (healthSource: HealthSource) => healthSource.identifier !== selectedRow.identifier
      )
      onSuccess(updatedHealthSources)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tableData]
  )

  const RenderTypeWithIcon: Renderer<CellProps<RowData>> = ({ row }): JSX.Element => {
    const rowdata = row?.original
    return (
      <Layout.Horizontal flex={{ justifyContent: 'space-between' }}>
        <Icon className={css.sourceTypeIcon} name={getIconBySourceType(rowdata?.type as string)} size={22} />
        <ContextMenuActions
          titleText={getString('cv.healthSource.deleteHealthSource')}
          contentText={getString('cv.healthSource.deleteHealthSourceWarning') + `: ${rowdata.identifier}`}
          onDelete={() => onDeleteHealthSource(rowdata)}
          onEdit={() => {
            const rowFilteredData =
              tableData?.find((healthSource: RowData) => healthSource.identifier === rowdata.identifier) || null
            onEdit(rowFilteredData)
          }}
          RbacPermissions={{
            edit: {
              permission: PermissionIdentifier.EDIT_MONITORED_SERVICE,
              resource: {
                resourceType: ResourceType.MONITOREDSERVICE,
                resourceIdentifier: projectIdentifier
              }
            },
            delete: {
              permission: PermissionIdentifier.DELETE_MONITORED_SERVICE,
              resource: {
                resourceType: ResourceType.MONITOREDSERVICE,
                resourceIdentifier: projectIdentifier
              }
            }
          }}
        />
      </Layout.Horizontal>
    )
  }

  const RenderTypeByFeature: Renderer<CellProps<RowData>> = ({ row }): JSX.Element => {
    const rowdata = row?.original
    return <Text>{getTypeByFeature(rowdata?.type as string, getString)}</Text>
  }

  const editRow = useCallback(rowToEdit => {
    if (rowToEdit) {
      onEdit(rowToEdit)
      return
    }
    showError(getString('cv.healthSource.noDataPresentHealthSource'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderHealthSourceTableInCV = useCallback(
    (healthSourceTableData: RowData[]) => {
      if (healthSourceTableData?.length) {
        return (
          <TableV2
            className={css.healthSourceTableWrapper}
            sortable={true}
            onRowClick={data => {
              const rowFilteredData = healthSourceTableData?.find(
                (healthSource: RowData) => healthSource.identifier === data.identifier
              )
              if (rowFilteredData) {
                onEdit(rowFilteredData)
              }
            }}
            columns={[
              {
                Header: getString('name'),
                accessor: 'name',
                width: '30%'
              },
              {
                Header: getString('typeLabel'),
                width: '27%',
                Cell: RenderTypeByFeature
              },
              {
                Header: getString('source'),
                accessor: 'type',
                width: '43%',
                Cell: RenderTypeWithIcon
              }
            ]}
            data={healthSourceTableData}
          />
        )
      }
      return (
        <Container className={css.noData}>
          <NoDataCard icon={'join-table'} message={getString('cv.healthSource.noData')} />
        </Container>
      )
    },
    [value, onAddNewHealthSource, editRow, onEdit]
  )

  const renderHealthSourceTable = useCallback(
    (renderAtVerifyStep: boolean, healthSourceTableData: RowData[]) => {
      if (renderAtVerifyStep) {
        return (
          <HealthSources
            healthSources={healthSourceTableData}
            editHealthSource={editRow}
            deleteHealthSource={onDeleteHealthSourceVerifyStep}
            isRunTimeInput={isRunTimeInput}
            addHealthSource={onAddNewHealthSource}
          />
        )
      }
      return (
        <CardWithOuterTitle>
          <Text tooltipProps={{ dataTooltipId: 'healthSourcesLabel' }} className={css.tableTitle}>
            {getString('platform.connectors.cdng.healthSources.label')}
          </Text>
          {renderHealthSourceTableInCV(healthSourceTableData)}
          <RbacButton
            icon="plus"
            disabled={isTemplateByReference}
            text={getString('cv.healthSource.addHealthSource')}
            variation={ButtonVariation.LINK}
            onClick={onAddNewHealthSource}
            data-testid="addHealthSource-button"
            margin={{ top: 'small' }}
            permission={{
              permission: PermissionIdentifier.EDIT_MONITORED_SERVICE,
              resource: {
                resourceType: ResourceType.MONITOREDSERVICE,
                resourceIdentifier: projectIdentifier
              }
            }}
          />
        </CardWithOuterTitle>
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isRunTimeInput, value, onAddNewHealthSource, editRow, onEdit]
  )

  return renderHealthSourceTable(!!shouldRenderAtVerifyStep, tableData)
}
