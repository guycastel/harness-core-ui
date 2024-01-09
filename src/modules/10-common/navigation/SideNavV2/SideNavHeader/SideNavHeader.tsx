/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Color, FontVariation } from '@harness/design-system'
import { Icon } from '@harness/icons'
import cx from 'classnames'
import { Link, useParams } from 'react-router-dom'
import { Layout, Text } from '@harness/uicore'
import { ModeSelector } from '@common/components/ModeSelector/ModeSelector'
import { StringKeys, useStrings } from 'framework/strings'
import { NavModuleName, useNavModuleInfoMap } from '@common/hooks/useNavModuleInfo'
import routes from '@common/RouteDefinitionsV2'
import { ModePathProps, NAV_MODE, getRouteParams } from '@common/utils/routeUtils'
import { AccountPathProps, ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { Module, moduleToModuleNameMapping } from 'framework/types/ModuleName'
import { SIDE_NAV_STATE, useLayoutV2 } from '@modules/10-common/router/RouteWithLayoutV2'
import css from './SideNavHeader.module.scss'

interface ModeConfig {
  className?: string
  subtitle?: StringKeys
}

type MODE_WITH_SUBTITLE = NAV_MODE.ADMIN | NAV_MODE.DASHBOARDS

const modeConfig: Record<MODE_WITH_SUBTITLE, ModeConfig> = {
  [NAV_MODE.ADMIN]: {
    className: css.admin,
    subtitle: 'common.adminSettingsLabel'
  },
  [NAV_MODE.DASHBOARDS]: {
    className: css.dashboards,
    subtitle: 'common.dashboards'
  }
}

const SideNavHeader: React.FC = () => {
  const moduleMap = useNavModuleInfoMap()
  const { accountId } = useParams<AccountPathProps>()
  const { module, mode, projectIdentifier, orgIdentifier } = getRouteParams<
    ModePathProps & ModulePathParams & ProjectPathProps
  >()
  const moduleFromParam = module as Module
  const moduleName = moduleFromParam ? moduleToModuleNameMapping[moduleFromParam] : undefined
  const {
    icon = undefined,
    color = undefined,
    label = undefined
  } = mode === NAV_MODE.MODULE && moduleMap[moduleName as NavModuleName] ? moduleMap[moduleName as NavModuleName] : {}
  const { getString } = useStrings()
  const { sideNavState } = useLayoutV2()
  const moduleProps = mode === NAV_MODE.MODULE ? { module: moduleFromParam } : {}

  const isCollapsed = sideNavState === SIDE_NAV_STATE.COLLAPSED
  const { className, subtitle } = modeConfig[mode as MODE_WITH_SUBTITLE] || {}

  return (
    <Layout.Horizontal
      flex={{ justifyContent: isCollapsed ? 'center' : 'space-between' }}
      className={cx(css.container, className)}
      style={{ borderColor: color ? `var(${color})` : 'var(--primary-6)' }}
    >
      <Link
        className={css.link}
        to={routes.toMode({
          mode: mode || NAV_MODE.ADMIN,
          accountId,
          ...moduleProps,
          projectIdentifier,
          orgIdentifier
        })}
      >
        <Layout.Horizontal flex={{ alignItems: 'center', justifyContent: 'flex-start' }}>
          {isCollapsed ? (
            <Icon name={icon || 'nav-harness'} size={32} />
          ) : (
            <Icon
              className={cx({ [css.harnessLogo]: !icon })}
              name={icon || 'harness-logo-white'}
              size={icon ? 32 : 100}
              margin={{ right: 'small' }}
            />
          )}

          {label && !isCollapsed && (
            <Text color={Color.WHITE} font={{ variation: FontVariation.BODY2 }} className={css.label}>
              {getString(label)}
            </Text>
          )}
        </Layout.Horizontal>
        {!isCollapsed && subtitle && (
          <Text font={{ variation: FontVariation.BODY2 }} className={css.subtitle}>
            {getString(subtitle)}
          </Text>
        )}
      </Link>
      {!isCollapsed && <ModeSelector />}
    </Layout.Horizontal>
  )
}

export default SideNavHeader
