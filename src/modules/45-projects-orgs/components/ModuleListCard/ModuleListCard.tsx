/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Card, Container, Icon, Layout, Text } from '@harness/uicore'
import { useHistory } from 'react-router-dom'
import { Color } from '@harness/design-system'
import { getModuleIcon } from '@common/utils/utils'
import { getModulePurpose, getModuleTitle } from '@projects-orgs/utils/utils'
import { useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { ModuleName } from 'framework/types/ModuleName'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import css from './ModuleListCard.module.scss'

export interface ModuleListCardProps {
  module: ModuleName
  orgIdentifier: string
  projectIdentifier: string
  accountId: string
}
export const getModuleLink = ({ accountId, orgIdentifier, projectIdentifier, module }: ModuleListCardProps): string => {
  switch (module) {
    case ModuleName.CD:
      return routes.toProjectOverview({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module: 'cd'
      })
    case ModuleName.CI:
      return routes.toProjectOverview({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module: 'ci'
      })
    case ModuleName.CV:
      return routes.toCVSLOs({
        projectIdentifier,
        orgIdentifier,
        accountId
      })
    case ModuleName.CF:
      return routes.toCFConfigurePath({
        projectIdentifier,
        orgIdentifier,
        accountId
      })
    case ModuleName.CE:
      return routes.toCEOverview({ accountId })
    case ModuleName.STO:
      return routes.toSTOProjectOverview({
        projectIdentifier,
        orgIdentifier,
        accountId
      })
    case ModuleName.CHAOS:
      return routes.toProjectOverview({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module: 'chaos'
      })
    case ModuleName.CET:
      return routes.toCETMonitoredServices({
        orgIdentifier,
        projectIdentifier,
        accountId,
        module: 'cet'
      })
  }
  return ''
}

export const getModuleLinkV2 = ({
  accountId,
  orgIdentifier,
  projectIdentifier,
  module
}: ModuleListCardProps): string => {
  switch (module) {
    case ModuleName.CD:
      return routesV2.toMode({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module: 'cd',
        mode: 'module'
      })
    case ModuleName.CI:
      return routesV2.toMode({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module: 'ci',
        mode: 'module'
      })
    case ModuleName.CV:
      return routesV2.toMode({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module: 'cv',
        mode: 'module'
      })
    case ModuleName.CF:
      return routesV2.toMode({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module: 'cf',
        mode: 'module'
      })
    case ModuleName.CE:
      return routesV2.toMode({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module: 'ce',
        mode: 'module'
      })
    case ModuleName.STO:
      return routesV2.toMode({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module: 'sto',
        mode: 'module'
      })
    case ModuleName.CHAOS:
      return routesV2.toMode({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module: 'chaos',
        mode: 'module'
      })
    case ModuleName.CET:
      return routesV2.toMode({
        projectIdentifier,
        orgIdentifier,
        accountId,
        module: 'cet',
        mode: 'module'
      })
  }
  return ''
}
const ModuleListCard: React.FC<ModuleListCardProps> = ({ module, accountId, orgIdentifier, projectIdentifier }) => {
  const { getString } = useStrings()
  const history = useHistory()
  const { isNewNavEnabled } = useAppStore()
  const purpose = getModulePurpose(module)

  return (
    <>
      <Card
        className={css.card}
        interactive
        onClick={() =>
          history.push(
            isNewNavEnabled
              ? getModuleLinkV2({ module, accountId, orgIdentifier, projectIdentifier })
              : getModuleLink({ module, accountId, orgIdentifier, projectIdentifier })
          )
        }
      >
        <Layout.Horizontal>
          <Container width="100%" flex border={{ right: true, color: Color.WHITE }}>
            <Layout.Horizontal flex spacing="large">
              <Icon name={getModuleIcon(module)} size={70}></Icon>
              <div>
                <Layout.Vertical padding={{ bottom: 'medium' }}>
                  <Text font={{ size: 'small' }}>{getString(getModuleTitle(module)).toUpperCase()}</Text>
                  <Text font={{ size: 'medium' }} color={Color.BLACK}>
                    {purpose && getString(purpose)}
                  </Text>
                </Layout.Vertical>
              </div>
            </Layout.Horizontal>
          </Container>
        </Layout.Horizontal>
      </Card>
    </>
  )
}

export default ModuleListCard
