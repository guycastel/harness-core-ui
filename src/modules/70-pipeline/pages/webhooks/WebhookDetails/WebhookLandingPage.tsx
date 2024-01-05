/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useHistory, useParams } from 'react-router-dom'
import {
  Container,
  Text,
  Layout,
  Switch,
  Page,
  Button,
  DetailPageCard,
  HarnessDocTooltip,
  ButtonVariation,
  Content,
  ContentType,
  useToaster,
  Heading,
  Dialog
} from '@harness/uicore'
import { Color } from '@harness/design-system'
import {
  useGetGitxWebhookRefQuery,
  useListGitxWebhookEventsRefQuery,
  useUpdateGitxWebhookRefMutation
} from '@harnessio/react-ng-manager-client'
import cx from 'classnames'
import { defaultTo, get, isEmpty } from 'lodash-es'
import { useModalHook } from '@harness/use-modal'
import EmptyContentImg from '@common/images/EmptySearchResults.svg'
import { ModulePathParams, ProjectPathProps, WebhooksPathProps } from '@common/interfaces/RouteInterfaces'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { UseStringsReturn, useStrings } from 'framework/strings'
import { getReadableDateTime } from '@common/utils/dateUtils'
import useRBACError, { RBACError } from '@rbac/utils/useRBACError/useRBACError'
import routesv1 from '@common/RouteDefinitions'
import routesv2 from '@common/RouteDefinitionsV2'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { StringsMap } from 'stringTypes'
import NewWebhookModal from '../NewWebhookModal'
import { processFolderPaths } from '../utils'
import css from './WebhookLandingPage.module.scss'

const loadingHeaderHeight = 43

const getOverviewContent = ({
  getString,
  name,
  identifier,
  connectorRef,
  repo
}: {
  getString: UseStringsReturn['getString']
  name?: string
  identifier?: string
  connectorRef?: string
  repo?: string
}): Content[] => [
  {
    label: getString('common.triggerName'),
    value: name
  },
  {
    label: getString('identifier'),
    value: identifier
  },
  {
    label: getString('platform.connectors.title.gitConnector'),
    value: connectorRef
  },
  {
    label: getString('repository'),
    value: repo
  }
]
const getDetailsContent = ({
  folderPaths,
  repoName,
  getString
}: {
  folderPaths?: string[]
  repoName?: string
  getString: (key: keyof StringsMap, vars?: Record<string, any> | undefined) => string
}): Content[] => {
  return [
    {
      label: '',
      type: ContentType.CUSTOM,
      value: (
        <Layout.Vertical>
          {defaultTo(folderPaths, []).length > 0 ? (
            folderPaths?.map((folderPath, index) => {
              let folderPathContent = folderPath
              if (index === 0 && isEmpty(folderPath)) {
                folderPathContent = getString('pipeline.webhooks.allFolders')
              }
              return (
                <Text color={Color.BLACK} lineClamp={1} margin={{ bottom: 'small' }} key={folderPath}>
                  {`${index + 1}. ${folderPathContent}`}
                </Text>
              )
            })
          ) : (
            <Text color={Color.BLACK} lineClamp={1} margin={{ bottom: 'small' }} key={repoName}>
              {`1. ${getString('pipeline.webhooks.allFolders')}`}
            </Text>
          )}
        </Layout.Vertical>
      )
    }
  ]
}
export default function WebhookLandingPage(): JSX.Element {
  const { webhookIdentifier, accountId, orgIdentifier, projectIdentifier, module } = useParams<
    WebhooksPathProps & ProjectPathProps & ModulePathParams
  >()
  const { getString } = useStrings()
  const { getRBACErrorMessage } = useRBACError()
  const history = useHistory()
  const { showSuccess, showError } = useToaster()
  const { isNewNavEnabled: newLeftNav } = useAppStore()
  const routes = newLeftNav ? routesv2 : routesv1

  const {
    data: webhookResponse,
    isInitialLoading: loadingWebhook,
    isFetching,
    refetch,
    error: webhooksDetailsError
  } = useGetGitxWebhookRefQuery({
    pathParams: {
      'gitx-webhook': webhookIdentifier,
      org: orgIdentifier,
      project: projectIdentifier
    }
  })

  const {
    data: webhookUpdateData,
    error: webhookUpdateError,
    isLoading: loadingUpdateWebhook,
    mutate: updateWebhook
  } = useUpdateGitxWebhookRefMutation({})

  const {
    data: webhookEvent,
    isInitialLoading: loadingWebhookEvent,
    error: webhookEventError
  } = useListGitxWebhookEventsRefQuery({
    pathParams: {
      org: orgIdentifier,
      project: projectIdentifier
    },
    queryParams: {
      limit: 1,
      page: 0,
      webhook_identifier: webhookIdentifier
    }
  })

  React.useEffect(() => {
    if (webhooksDetailsError) {
      showError(getRBACErrorMessage(webhooksDetailsError as RBACError))
      history.replace(routes.toWebhooks({ accountId, orgIdentifier, projectIdentifier, module }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhooksDetailsError])
  const [showCreateModal, hideCreateModal] = useModalHook(
    /* istanbul ignore next */ () => {
      const onCloseHandler = (): void => {
        hideCreateModal()
        refetch()
      }
      return (
        <Dialog
          isOpen={true}
          enforceFocus={false}
          canEscapeKeyClose
          canOutsideClickClose
          onClose={onCloseHandler}
          isCloseButtonShown
          className={cx('padded-dialog', css.dialogStylesWebhook)}
        >
          <Container>
            <NewWebhookModal
              isEdit={true}
              initialData={{
                name: defaultTo(webhookResponse?.content?.webhook_name, ''),
                identifier: defaultTo(webhookResponse?.content?.webhook_identifier, ''),
                connectorRef: defaultTo(webhookResponse?.content?.connector_ref, ''),
                repo: defaultTo(webhookResponse?.content?.repo_name, ''),
                folderPaths: defaultTo(processFolderPaths(defaultTo(webhookResponse?.content?.folder_paths, [])), [])
              }}
              closeModal={onCloseHandler}
            />
          </Container>
        </Dialog>
      )
    },
    [webhookResponse]
  )
  const time = getReadableDateTime(get(webhookEvent, 'content.[0].event_trigger_time'), 'hh:mm a')
  const date = getReadableDateTime(get(webhookEvent, 'content.[0].event_trigger_time'), 'MMM DD, YYYY')

  const hasData = Boolean(!loadingWebhookEvent && webhookEvent && !isEmpty(webhookEvent.content))
  const noData = Boolean(!loadingWebhookEvent && webhookEvent && isEmpty(webhookEvent.content))

  const handleViewAllEventsClick = (): void => {
    history.replace(
      routes.toWebhooksEvents({
        accountId,
        orgIdentifier,
        projectIdentifier,
        module,
        webhookIdentifier
      })
    )
  }

  React.useEffect(() => {
    if (webhookEventError) {
      showError(getRBACErrorMessage(webhookEventError as RBACError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhookEventError])

  React.useEffect(() => {
    if (webhookUpdateData) {
      showSuccess(
        getString('pipeline.webhooks.successUpdateMessage', {
          name: webhookUpdateData.content.webhook_identifier
        })
      )
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhookUpdateData])

  React.useEffect(() => {
    if (webhookUpdateError) {
      showError(getRBACErrorMessage(webhookUpdateError as RBACError))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhookUpdateError])

  return (
    <>
      <Container
        border={{ bottom: true, width: 1, color: Color.GREY_200 }}
        padding={{ top: 'xlarge', left: 'xlarge', bottom: 'medium', right: 'xlarge' }}
        background={Color.PRIMARY_1}
      >
        <Layout.Vertical spacing="medium">
          <NGBreadcrumbs
            links={[
              {
                url: routes.toWebhooks({ accountId, orgIdentifier, projectIdentifier, module }),
                label: getString('common.webhooks')
              }
            ]}
          />
          {(loadingWebhook || loadingUpdateWebhook || isFetching) && <Container height={loadingHeaderHeight} />}
          {webhookResponse && !loadingWebhook && !isFetching && !loadingUpdateWebhook && (
            <Layout.Horizontal spacing="medium" style={{ alignItems: 'center' }}>
              <Layout.Horizontal spacing="small" data-testid={webhookResponse.content.webhook_identifier} width={'78%'}>
                <Layout.Vertical padding={{ left: 'small' }}>
                  <Layout.Horizontal spacing="medium" style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: 600 }} color={Color.GREY_700} data-testid="webhook-title">
                      {get(webhookResponse.content, 'webhook_name')}
                    </Text>
                    <Switch
                      padding={{ left: 'xxxlarge' }}
                      label={getString('enabledLabel')}
                      data-testid="webhook-enable-toggle"
                      checked={webhookResponse.content.is_enabled ?? false}
                      onChange={e => {
                        updateWebhook({
                          pathParams: {
                            'gitx-webhook': webhookIdentifier,
                            org: orgIdentifier,
                            project: projectIdentifier
                          },

                          body: {
                            is_enabled: e.currentTarget.checked,
                            folder_paths: webhookResponse.content.folder_paths
                          }
                        })
                      }}
                    />
                  </Layout.Horizontal>
                  <Text data-testid="webhook-id">
                    {getString('common.ID')}: {get(webhookResponse.content, 'webhook_identifier')}
                  </Text>
                </Layout.Vertical>
              </Layout.Horizontal>
            </Layout.Horizontal>
          )}
        </Layout.Vertical>
      </Container>
      <Page.Body
        loading={loadingWebhook || loadingWebhookEvent || isFetching || loadingUpdateWebhook}
        className={css.main}
      >
        <Layout.Horizontal className={css.panel}>
          <Layout.Vertical spacing="medium" className={css.information}>
            <Layout.Horizontal flex={{ distribution: 'space-between' }} className={css.editBtn}>
              <Button
                variation={ButtonVariation.SECONDARY}
                icon="edit"
                onClick={() => {
                  showCreateModal()
                }}
                minimal
                text={getString('edit')}
              />
            </Layout.Horizontal>
            <Layout.Horizontal spacing="medium">
              <DetailPageCard
                title={getString('overview')}
                content={getOverviewContent({
                  getString,
                  name: webhookResponse?.content?.webhook_name,
                  identifier: webhookResponse?.content?.webhook_identifier,
                  connectorRef: webhookResponse?.content?.connector_ref,
                  repo: webhookResponse?.content?.repo_name
                })}
              />
              <DetailPageCard
                classname={css.inputSet}
                title={getString('pipeline.webhooks.trackedFolders')}
                content={getDetailsContent({
                  folderPaths: webhookResponse?.content?.folder_paths,
                  repoName: webhookResponse?.content.repo_name,
                  getString
                })}
              />
            </Layout.Horizontal>
          </Layout.Vertical>
          <Layout.Vertical style={{ flex: 1 }}>
            <Layout.Horizontal spacing="xxlarge">
              <Text
                font={{ size: 'medium', weight: 'bold' }}
                inline={true}
                color={Color.GREY_800}
                padding={{ left: 'large', bottom: 'large' }}
              >
                {getString('pipeline.webhookEvents.lastEventDetails')}
                <HarnessDocTooltip tooltipId="lastEventDetails" useStandAlone={true} />
              </Text>
            </Layout.Horizontal>
            {hasData && (
              <Layout.Vertical padding={{ left: 'large', right: 'large' }}>
                <Text padding={{ bottom: 'small' }}>{getString('pipeline.webhookEvents.dateTime')}</Text>
                <Text color={Color.BLACK} padding={{ bottom: 'large' }}>{`${time} ${date}`}</Text>
                <Text padding={{ bottom: 'small' }}>{getString('pipeline.webhookEvents.eventId')}</Text>
                <Text
                  padding={{ bottom: 'xxlarge' }}
                  color={Color.BLACK}
                  border={{ bottom: true, width: 1, color: Color.GREY_200 }}
                >
                  {webhookEvent?.content[0]?.event_identifier}
                </Text>
                <Button
                  minimal
                  onClick={handleViewAllEventsClick}
                  className={css.viewAllBtn}
                  data-testid="view-all-events"
                >
                  {getString('pipeline.webhookEvents.viewAll')}
                </Button>
              </Layout.Vertical>
            )}
            {noData && (
              <Container flex={{ align: 'center-center' }} height="40vh">
                <Layout.Vertical flex={{ alignItems: 'center' }}>
                  <img src={EmptyContentImg} width={300} height={150} />
                  <Heading level={2} padding={{ top: 'xxlarge' }} margin={{ bottom: 'large' }}>
                    {getString('pipeline.webhookEvents.noEvents')}
                  </Heading>
                </Layout.Vertical>
              </Container>
            )}
          </Layout.Vertical>
        </Layout.Horizontal>
      </Page.Body>
    </>
  )
}
