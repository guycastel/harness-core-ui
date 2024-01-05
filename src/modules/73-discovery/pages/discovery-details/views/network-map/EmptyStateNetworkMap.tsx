/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Button, ButtonVariation, Icon, Layout, Text } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import React from 'react'
import { useHistory, useParams } from 'react-router-dom'
import CELogo from '@discovery/images/chaos-engineering-logo.svg'
import NetworkMapVisual from '@discovery/images/network-map-visual.svg'
import { useStrings } from 'framework/strings'
import routesV1 from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import type { DiscoveryPathProps, ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import css from './NetworkMapTable.module.scss'

const EmptyStateNetworkMap: React.FC = () => {
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesV2 : routesV1
  const { getString } = useStrings()
  const history = useHistory()
  const { dAgentId, accountId, orgIdentifier, projectIdentifier, module } = useParams<
    ProjectPathProps & ModulePathParams & DiscoveryPathProps
  >()

  return (
    <Layout.Horizontal className={css.noNetworkMapDiv} width={'80%'}>
      <Layout.Vertical spacing={'xxxlarge'} width={'60%'} style={{ margin: 'auto', paddingRight: '20px' }}>
        <img src={CELogo} width="140px" />
        <Text font={{ variation: FontVariation.H2 }}>
          {getString('discovery.discoveryDetails.networkMaps.noNetworkMapHeader')}
        </Text>
        <Text>{getString('discovery.discoveryDetails.networkMaps.noNetworkMapDesc')}</Text>
        <Layout.Horizontal spacing={'medium'} width={'350px'} flex={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className={css.iconDiv}>
              <Icon name="code-settings" size={20} className={css.moduleIcons} />
            </div>
            <Text margin={{ left: 'xsmall' }}>
              {getString('discovery.discoveryDetails.networkMaps.noNetworkMapChooseService')}
            </Text>
          </div>
          <Icon name="arrow-right" />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className={css.iconDiv}>
              <Icon name="graph" margin={{ top: 'xsmall', left: 'xsmall' }} size={20} className={css.moduleIcons} />
            </div>
            <Text margin={{ left: 'xsmall' }}>{getString('discovery.tabs.configureRelations')}</Text>
          </div>
        </Layout.Horizontal>
        <Button
          width={'220px'}
          text={getString('discovery.createNewNetworkMap')}
          variation={ButtonVariation.PRIMARY}
          onClick={() => {
            history.push({
              pathname: routes.toCreateNetworkMap({
                accountId,
                orgIdentifier,
                projectIdentifier,
                module,
                dAgentId
              })
            })
          }}
        />
      </Layout.Vertical>
      <Layout.Vertical width={'40%'}>
        <img src={NetworkMapVisual} style={{ marginTop: '50px' }} />
      </Layout.Vertical>
    </Layout.Horizontal>
  )
}

export default EmptyStateNetworkMap
