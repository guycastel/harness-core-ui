/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Link, useHistory, useParams } from 'react-router-dom'
import { Text, Layout, Card, Icon, Container, Tag, PageError } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import type { AccountPathProps, ModulePathParams } from '@common/interfaces/RouteInterfaces'
import { useStrings } from 'framework/strings'
import { useGetUserProjectInfo } from 'services/cd-ng'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { NAV_MODE, getRouteParams } from '@common/utils/routeUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import css from './UserSummary.module.scss'

const MyProjectsList: React.FC = () => {
  const { getString } = useStrings()
  const { accountId } = useParams<AccountPathProps>()
  const { module } = getRouteParams<ModulePathParams>()
  const history = useHistory()
  const { isNewNavEnabled } = useAppStore()

  const {
    data: projects,
    loading,
    error,
    refetch
  } = useGetUserProjectInfo({
    queryParams: {
      accountId,
      pageIndex: 0,
      pageSize: 6
    }
  })

  return (
    <Layout.Vertical spacing="large" margin={{ bottom: 'medium' }}>
      <Layout.Horizontal flex={{ alignItems: 'center', justifyContent: 'start' }} spacing="medium">
        <Text font={{ variation: FontVariation.H5 }}>{getString('userProfile.myProjects')}</Text>
        {projects?.data?.totalItems ? <Tag className={css.tagClassName}>{projects.data.totalItems}</Tag> : null}
      </Layout.Horizontal>
      {loading ? (
        <Text color={Color.GREY_600}>{getString('common.loading')}</Text>
      ) : projects?.data?.content?.length ? (
        <Container className={css.cardContainer}>
          {projects.data.content.map(project => {
            return (
              <Card
                key={`${project.identifier}-${project.orgIdentifier}`}
                className={css.card}
                interactive
                onClick={() => {
                  if (isNewNavEnabled) {
                    history.push(
                      routesV2.toProjectDetails({
                        accountId,
                        orgIdentifier: project.orgIdentifier || 'default',
                        projectIdentifier: project.identifier,
                        module,
                        mode: NAV_MODE.ADMIN
                      })
                    )
                  } else {
                    history.push(
                      routes.toProjectDetails({
                        accountId,
                        orgIdentifier: project.orgIdentifier || 'default',
                        projectIdentifier: project.identifier
                      })
                    )
                  }
                }}
              >
                <Layout.Vertical flex={{ align: 'center-center' }}>
                  <Icon
                    name="nav-project"
                    size={32}
                    style={{ color: project.color }}
                    color={project.color}
                    margin={{ top: 'xsmall', bottom: 'medium' }}
                  />
                  <Text
                    width={100}
                    lineClamp={3}
                    color={Color.GREY_800}
                    font={{ size: 'small', align: 'center', weight: 'semi-bold' }}
                    className={css.name}
                  >
                    {project.name}
                  </Text>
                </Layout.Vertical>
              </Card>
            )
          })}
          {Number(projects.data.totalItems) > Number(projects.data.content.length) && (
            <Text flex={{ alignItems: 'center' }}>
              <Link to={routes.toProjects({ accountId })}>
                {getString('more', {
                  number: Number(projects.data.totalItems) - Number(projects.data.content.length)
                })}
              </Link>
            </Text>
          )}
        </Container>
      ) : projects?.data?.content ? (
        <Text color={Color.GREY_700}>{getString('noProjects')}</Text>
      ) : (
        <PageError message={(error?.data as Error)?.message || error?.message} onClick={() => refetch()} />
      )}
    </Layout.Vertical>
  )
}

export default MyProjectsList
