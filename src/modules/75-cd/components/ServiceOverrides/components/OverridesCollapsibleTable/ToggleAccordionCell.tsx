import { ColumnInstance, Renderer, Row, UseExpandedRowProps } from 'react-table'
import React from 'react'
import { Button, ButtonVariation } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { useParams } from 'react-router-dom'
import { killEvent } from '@common/utils/eventUtils'
import { StoreType } from '@modules/10-common/constants/GitSyncTypes'
import { getServiceOverridesV2Promise } from 'services/cd-ng'
import { ProjectPathProps } from '@modules/10-common/interfaces/RouteInterfaces'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { RemoteOverrideMetadata } from '@cd/components/ServiceOverrides/components/OverridesCollapsibleTable/OverridesCollapsibleTable'
import { ServiceOverrideSectionProps } from '../../ServiceOverridesUtils'
import css from './OverridesCollapsibleTable.module.scss'

interface ToggleAccordionCellProps {
  expandedRows: Set<string>
  setRemoteOverrideMetadataMap: React.Dispatch<React.SetStateAction<Map<string, RemoteOverrideMetadata>>>
  setExpandedRows: React.Dispatch<React.SetStateAction<Set<string>>>
}

export const ToggleAccordionCell: Renderer<{
  row: UseExpandedRowProps<ServiceOverrideSectionProps> & Row<ServiceOverrideSectionProps>
  column: ColumnInstance<ServiceOverrideSectionProps> & ToggleAccordionCellProps
}> = ({ row, column }) => {
  const { expandedRows, setExpandedRows, setRemoteOverrideMetadataMap } = column
  const { CDS_OVERRIDES_GITX } = useFeatureFlags()
  const data = row.original
  const [isExpanded, setIsExpanded] = React.useState<boolean>(row.isExpanded)
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const isEditSection = !!data?.isEdit
  const isNewSection = !!data?.isNew

  React.useEffect(() => {
    if (data?.groupKey) {
      const isRowExpanded = expandedRows.has(data.groupKey)
      setIsExpanded(isRowExpanded)
      row.toggleRowExpanded(isRowExpanded)
    }

    if (isNewSection) {
      setIsExpanded(true)
      row.toggleRowExpanded(true)
    }
  }, [data?.groupKey, expandedRows, isNewSection])

  const fetchRemoteOverrideData = async (id: string): Promise<void> => {
    try {
      const response = await getServiceOverridesV2Promise({
        queryParams: {
          accountIdentifier: accountId,
          orgIdentifier,
          projectIdentifier,
          repoName: data?.overrideResponse?.entityGitInfo?.repoName,
          loadFromFallbackBranch: true
        },
        identifier: data?.overrideResponse?.identifier as string,
        requestOptions: {
          headers: {
            'Load-From-Cache': 'true'
          }
        }
      })
      if (response) {
        setRemoteOverrideMetadataMap(
          (map: Map<string, RemoteOverrideMetadata>) =>
            new Map(
              map.set(id, {
                isLoading: false,
                remoteOverrideResponse: response
              })
            )
        )
      }
    } catch (err) {
      setRemoteOverrideMetadataMap(
        (map: Map<string, RemoteOverrideMetadata>) =>
          new Map(
            map.set(id, {
              isLoading: false
            })
          )
      )
    }
  }

  const toggleRow = (): void => {
    if (CDS_OVERRIDES_GITX && data?.overrideResponse?.storeType === StoreType.REMOTE && !row.isExpanded) {
      const val = data?.overrideResponse?.identifier
      setRemoteOverrideMetadataMap(
        (map: Map<string, RemoteOverrideMetadata>) =>
          new Map(
            map.set(val, {
              isLoading: true
            })
          )
      )

      fetchRemoteOverrideData(val)
    }
    setExpandedRows((prevExpandedRows: Set<string>) => {
      if (data?.groupKey) {
        const isRowExpanded = prevExpandedRows.has(data.groupKey)
        if (!isRowExpanded) {
          prevExpandedRows.add(data.groupKey)
        } else {
          prevExpandedRows.delete(data.groupKey)
        }
      }
      return new Set(prevExpandedRows)
    })
  }

  return (
    <div onClick={killEvent}>
      <Button
        {...row.getToggleRowExpandedProps()}
        onClick={toggleRow}
        color={Color.GREY_600}
        icon={isExpanded ? 'chevron-down' : 'chevron-right'}
        variation={ButtonVariation.ICON}
        iconProps={{ size: 19 }}
        className={css.toggleAccordion}
        disabled={isNewSection || isEditSection}
      />
    </div>
  )
}
