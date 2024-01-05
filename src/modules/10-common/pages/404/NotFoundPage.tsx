/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { Icon, Layout, Heading, Text, Container } from '@harness/uicore'
import routes from '@common/RouteDefinitionsV2'
import { ModulePathParams } from '@common/interfaces/RouteInterfaces'
import { getRouteParams } from '@common/utils/routeUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'

interface NotFoundPageProps {
  redirectTo?: string
}

export default function NotFoundPage(props: NotFoundPageProps): JSX.Element {
  const { isNewNavEnabled } = useAppStore()
  const { module } = getRouteParams<ModulePathParams>()

  const homeUrl = isNewNavEnabled ? routes.toMode({ module }) : '/'
  return (
    <Container height="100%" flex={{ align: 'center-center' }}>
      <Layout.Vertical spacing="large" flex={{ align: 'center-center' }}>
        <Heading>404</Heading>
        <Text>Oops, we could not find this page.</Text>
        <Link to={props.redirectTo ? props.redirectTo : homeUrl}>Go to Home</Link>
        <Icon name="harness-logo-black" size={200} />
      </Layout.Vertical>
    </Container>
  )
}
