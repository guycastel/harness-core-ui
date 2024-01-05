/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { Color, FontVariation } from '@harness/design-system'

import { Text, Container } from '@harness/uicore'

import { defaultTo, isEmpty } from 'lodash-es'
import { String, useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'

import type { PipelineType, PipelinePathProps, ExecutionPathProps } from '@common/interfaces/RouteInterfaces'
import { formatDatetoLocale } from '@common/utils/dateUtils'
import { EnvironmentDetailsTab } from '@modules/75-cd/components/EnvironmentsV2/utils'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { PostProdRollbackCheckDTO } from 'services/cd-ng'

interface PostProdMessageProps {
  checkData: PostProdRollbackCheckDTO
  pipelineId: string
}

export function PostProdMessage({ checkData, pipelineId }: PostProdMessageProps): React.ReactElement {
  const { getString } = useStrings()
  const { isNewNavEnabled } = useAppStore()

  const { orgIdentifier, projectIdentifier, accountId, module } =
    useParams<PipelineType<PipelinePathProps & ExecutionPathProps>>()

  const source: ExecutionPathProps['source'] = pipelineId ? 'executions' : 'deployments'
  const swimLaneInfo = checkData?.swimLaneInfo
  const executionId = swimLaneInfo?.lastPipelineExecutionId
  const executionName = swimLaneInfo?.lastPipelineExecutionName
  const message = checkData?.message

  const getEnvUrl = (id: string): string => {
    const envParams = {
      accountId,
      orgIdentifier,
      projectIdentifier,
      module,
      environmentIdentifier: defaultTo(id, ''),
      sectionId: EnvironmentDetailsTab.CONFIGURATION
    }

    return isNewNavEnabled
      ? routesV2.toSettingsEnvironmentDetails({ ...envParams })
      : routes.toEnvironmentDetails({ ...envParams })
  }

  return isEmpty(swimLaneInfo) && message ? (
    <Text font={{ variation: FontVariation.LEAD }}>{message}</Text>
  ) : (
    <>
      <Container flex={{ alignItems: 'center', justifyContent: 'flex-start' }} margin={{ bottom: 'xsmall' }}>
        <String
          useRichText={true}
          vars={{
            executionId,
            executionName,
            lastDeployed: formatDatetoLocale(swimLaneInfo?.lastDeployedAt),
            executionUrl: routes.toExecutionPipelineView({
              orgIdentifier,
              pipelineIdentifier: pipelineId,
              projectIdentifier,
              executionIdentifier: defaultTo(executionId, ''),
              accountId,
              module,
              source
            })
          }}
          stringID="cd.serviceDashboard.postProdRollback.confirmation.executionDescription"
        />
      </Container>
      <Container margin={{ bottom: 'xsmall' }}>
        <Text font={{ variation: FontVariation.LEAD }}>{getString('environment')}:</Text>
        <Link to={getEnvUrl(swimLaneInfo?.envIdentifier)} target="_blank">
          <Text font={{ variation: FontVariation.LEAD }} color={Color.PRIMARY_6}>{`${swimLaneInfo?.envName}`}</Text>
        </Link>
      </Container>
      <Container>
        <Text font={{ variation: FontVariation.LEAD }}>{getString('infrastructureText')}:</Text>
        <Text font={{ variation: FontVariation.LEAD }}>{`${swimLaneInfo?.infraName}`}</Text>
      </Container>
    </>
  )
}
