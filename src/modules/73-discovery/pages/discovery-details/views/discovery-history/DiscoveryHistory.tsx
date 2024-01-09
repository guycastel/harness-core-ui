/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Container, Layout, Text, CardSelect, Tabs, Pagination, Page, PageSpinner } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import moment from 'moment'
import { DatabaseInstallationCollection, useListInstallation } from 'services/servicediscovery'
import type { DiscoveryPathProps, PipelinePathProps } from '@common/interfaces/RouteInterfaces'
import { SimpleLogViewer } from '@common/components/LogViewer/SimpleLogViewer'
import { DiscoveryAgentStatus } from '@discovery/components/DelegateAgentStatus/DelegateAgentStatus'
import { useStrings } from 'framework/strings'
import { logBlobPromise, useGetToken } from 'services/logs'
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE } from '@discovery/interface/filters'
import { CommonPaginationQueryParams, useDefaultPaginationProps } from '@common/hooks/useDefaultPaginationProps'
import { useQueryParams } from '@common/hooks'
import { DAgentLogs, processAgentLogs } from '@discovery/utils/LogUtils'
import { loggerFor } from 'framework/logging/logging'
import { ModuleName } from 'framework/types/ModuleName'
import css from './DiscoveryHistory.module.scss'

const logger = loggerFor(ModuleName.CHAOS)

const DiscoveryHistory: React.FC = () => {
  const { getString } = useStrings()
  const { dAgentId, accountId, orgIdentifier, projectIdentifier, pipelineIdentifier } = useParams<
    PipelinePathProps & DiscoveryPathProps
  >()
  const { data: tokenData } = useGetToken({ queryParams: { accountID: accountId } })
  const [logsToken, setLogsToken] = React.useState<string>()
  const [dAgentLogs, setDAgentLogs] = React.useState<DAgentLogs>()
  const [loading, setLoading] = React.useState<boolean>(true)

  const { page, size } = useQueryParams<CommonPaginationQueryParams>()

  React.useEffect(() => {
    // if `logsToken` is not present, `tokenData` is fetched
    // as we set the lazy flag based on it's presence
    /* istanbul ignore else */
    if (tokenData) {
      setLogsToken(tokenData as string)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenData])

  async function getBlobData(id: string): Promise<string | undefined> {
    try {
      setLoading(true)
      const data = (await logBlobPromise({
        queryParams: {
          accountID: accountId,
          orgId: orgIdentifier,
          pipelineId: pipelineIdentifier,
          projectId: projectIdentifier,
          'X-Harness-Token': '',
          key: id
        },
        requestOptions: {
          headers: {
            'X-Harness-Token': logsToken as string
          }
        }
      })) as unknown as string
      setLoading(false)
      return data
    } catch (error) {
      setLoading(false)
      logger.error(`Error while fetching log blob ${error}`)
    }
  }

  const { data: infraInstalls, loading: infraInstallLoading } = useListInstallation({
    queryParams: {
      accountIdentifier: accountId,
      organizationIdentifier: orgIdentifier,
      projectIdentifier: projectIdentifier,
      all: false,
      page: page ?? 0,
      limit: size ?? DEFAULT_PAGE_SIZE
    },
    agentIdentity: dAgentId
  })

  const paginationProps = useDefaultPaginationProps({
    itemCount: infraInstalls?.page?.totalItems ?? 0,
    pageCount: infraInstalls?.page?.totalPages ?? 1,
    pageIndex: infraInstalls?.page?.index ?? DEFAULT_PAGE_INDEX,
    pageSize: infraInstalls?.page?.limit ?? DEFAULT_PAGE_SIZE,
    hidePageNumbers: false
  })

  const [selected, setSelected] = React.useState<DatabaseInstallationCollection>()

  useEffect(() => {
    if (infraInstalls?.items && !infraInstallLoading) {
      if (infraInstalls.items?.length > 0) {
        setSelected(infraInstalls.items[0])
        getBlobData(infraInstalls.items[0].logStreamID ?? '').then(data => {
          const { clusterLogs, nodeLogs } = processAgentLogs(data, infraInstalls?.items?.[0])
          setDAgentLogs({ clusterLogs, nodeLogs })
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infraInstalls, infraInstallLoading])

  const convertTime = (time: string): string => {
    return moment(time).format('MMM DD, hh:mm A')
  }

  if (infraInstallLoading) {
    return (
      <Page.Body>
        <PageSpinner />
      </Page.Body>
    )
  }

  return (
    <Layout.Horizontal width="100%" height="100%">
      <Container width={'35%'}>
        <Layout.Vertical height={'100%'}>
          <Layout.Horizontal style={{ padding: '10px 30px' }} flex={{ justifyContent: 'space-between' }}>
            <Text font={{ variation: FontVariation.CARD_TITLE }}>
              {getString('discovery.discoveryDetails.tabTitles.history')}
            </Text>
            <div>
              <Button icon="repeat" minimal />
              <Button icon="main-sort" minimal />
            </div>
          </Layout.Horizontal>
          <CardSelect
            data={infraInstalls?.items ?? []}
            className={css.selectableCard}
            renderItem={item => {
              return (
                <Layout.Vertical padding={{ left: 'small' }}>
                  <Text font={{ variation: FontVariation.BODY2 }} style={{ fontWeight: 500 }}>
                    {convertTime(item?.createdAt ?? '')}
                  </Text>
                  <DiscoveryAgentStatus status={item.delegateTaskStatus} />
                </Layout.Vertical>
              )
            }}
            onChange={value => {
              setSelected(value)
              getBlobData(value.logStreamID ?? '').then(data => {
                const { clusterLogs, nodeLogs } = processAgentLogs(data, value)
                setDAgentLogs({ clusterLogs, nodeLogs })
              })
            }}
            selected={selected}
          />
          <Pagination className={css.pagination} {...paginationProps} />
        </Layout.Vertical>
      </Container>
      <Container width="65%" height="100%">
        <Layout.Vertical height={'100%'}>
          <Container className={css.logsTab} background={Color.BLACK} height={'100%'} width={'100%'}>
            <Tabs
              id={'DiscoveredHistoryTab'}
              defaultSelectedTabId={'cluster'}
              tabList={[
                {
                  id: 'cluster',
                  title: getString('common.cluster'),
                  panel: (
                    <SimpleLogViewer
                      className={css.logContainer}
                      data={dAgentLogs?.clusterLogs ?? ''}
                      loading={loading}
                    />
                  )
                },
                {
                  id: 'node',
                  // eslint-disable-next-line strings-restrict-modules
                  title: getString('common.node'),
                  panel: (
                    <SimpleLogViewer className={css.logContainer} data={dAgentLogs?.nodeLogs ?? ''} loading={loading} />
                  )
                }
              ]}
            />
          </Container>
        </Layout.Vertical>
      </Container>
    </Layout.Horizontal>
  )
}

export default DiscoveryHistory
