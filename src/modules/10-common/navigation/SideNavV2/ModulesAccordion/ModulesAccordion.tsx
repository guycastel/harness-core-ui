/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Accordion, AccordionHandle, Container, Icon, Layout, Popover, Text } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import React, { useEffect } from 'react'
import cx from 'classnames'
import { matchPath, useLocation, useParams } from 'react-router-dom'
import { PopoverInteractionKind, PopoverPosition } from '@blueprintjs/core'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import { useStrings } from 'framework/strings'
import {
  MODULES_CONFIG_PREFERENCE_STORE_KEY,
  ModulesPreferenceStoreData
} from '@common/navigation/ModuleConfigurationScreen/ModuleConfigurationScreen'
import { getFilteredModules } from '@common/components/ModeSelector/ModeSelector'
import useNavModuleInfo, { NavModuleName, useNavModuleInfoMap } from '@common/hooks/useNavModuleInfo'
import routes from '@common/RouteDefinitionsV2'
import { AccountPathProps } from '@common/interfaces/RouteInterfaces'
import { moduleNameToModuleMapping } from 'framework/types/ModuleName'
import { NAV_MODE } from '@common/utils/routeUtils'
import ModuleRouteConfig from '@modules/ModuleRouteConfig'
import { SIDE_NAV_STATE, useLayoutV2 } from '@modules/10-common/router/RouteWithLayoutV2'
import { useGetSelectedScope } from '../SideNavV2.utils'
import css from './ModulesAccordion.module.scss'
interface SideNavLinksProps {
  module: NavModuleName
  mode: NAV_MODE
}

const filterSideNavScope = (
  element: React.ReactElement,
  components: React.ReactElement[] = []
): React.ReactElement[] => {
  React.Children.map(element, child => {
    if (child?.props?.__type === 'SIDENAV_SCOPE' || child?.props?.__type === 'SIDENAV_TITLE') {
      components.push({
        ...child,
        props: {
          ...child?.props,
          isRenderedInAccordion: true
        }
      })
    }

    filterSideNavScope(child?.props?.children, components)
  })

  return components
}

export const SideNavLinksComponent: React.FC<SideNavLinksProps> = props => {
  const { sideNavState } = useLayoutV2()
  const Component: JSX.Element = ModuleRouteConfig[props.module].sideNavLinks(props.mode, { sideNavState })

  const components = filterSideNavScope(Component)

  return <>{components}</>
}

const ModuleSummary: React.FC<{ module: NavModuleName; selectedModule?: string }> = ({ module, selectedModule }) => {
  const { getString } = useStrings()
  const { icon, shortLabel, color } = useNavModuleInfo(module)
  const { sideNavState } = useLayoutV2()
  const isActive = selectedModule?.toLowerCase() === module.toLowerCase()

  const isCollapsed = sideNavState === SIDE_NAV_STATE.COLLAPSED

  return (
    <Popover
      interactionKind={PopoverInteractionKind.HOVER}
      minimal
      position={PopoverPosition.RIGHT_TOP}
      popoverClassName={css.popover}
      disabled={!isCollapsed}
      content={
        <Layout.Vertical className={cx(css.module, css.linksPopover)} padding="small">
          <Layout.Horizontal className={cx(css.popoverHeader, { [css.active]: isActive })} margin={{ bottom: 'small' }}>
            <Icon className={css.moduleIcon} name={icon} size={20} margin={{ right: 'small' }} />
            <Text color={isActive ? Color.PRIMARY_4 : Color.GREY_300} font={{ variation: FontVariation.BODY2 }}>
              {getString(shortLabel)}
            </Text>
          </Layout.Horizontal>
          <SideNavLinksComponent module={module} mode={NAV_MODE.ALL} />
        </Layout.Vertical>
      }
      boundary="viewport"
    >
      <Layout.Horizontal
        className={cx(css.container, { [css.active]: isActive, [css.sideNavCollapsed]: isCollapsed })}
        flex={{ justifyContent: 'flex-start' }}
      >
        <Icon
          className={css.moduleIcon}
          name={icon}
          size={20}
          margin={{ right: isCollapsed ? 0 : 'small' }}
          style={{ fill: `var(${color})` }}
        />
        {!isCollapsed && (
          <Text
            className={css.moduleName}
            color={isActive ? Color.PRIMARY_4 : Color.GREY_300}
            font={{ variation: FontVariation.BODY2 }}
          >
            {getString(shortLabel)}
          </Text>
        )}
      </Layout.Horizontal>
    </Popover>
  )
}

interface ModulesAccordionProps {
  mode?: NAV_MODE
}

const ModulesAccordion: React.FC<ModulesAccordionProps> = ({ mode = NAV_MODE.ALL }) => {
  const accordionRef = React.useRef<AccordionHandle>({} as AccordionHandle)
  const moduleMap = useNavModuleInfoMap()
  const { sideNavState } = useLayoutV2()
  const { accountId } = useParams<AccountPathProps>()
  const { scope } = useGetSelectedScope()
  const { preference: modulesPreferenceData } = usePreferenceStore<ModulesPreferenceStoreData>(
    PreferenceScope.USER,
    MODULES_CONFIG_PREFERENCE_STORE_KEY
  )
  const { pathname } = useLocation()

  useEffect(() => {
    if (sideNavState === SIDE_NAV_STATE.COLLAPSED && accordionRef.current) {
      accordionRef.current.close(selectedModule as string)
    }
  }, [sideNavState])
  const { selectedModules = [], orderedModules = [] } = modulesPreferenceData || {}

  const visibleModules = React.useMemo(
    () => getFilteredModules(orderedModules, selectedModules, moduleMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moduleMap, orderedModules, selectedModules]
  )

  const selectedModule = visibleModules.find(module =>
    matchPath(pathname, { path: routes.toModule({ mode, accountId, module: moduleNameToModuleMapping[module] }) })
  )

  const isCollapsed = sideNavState === SIDE_NAV_STATE.COLLAPSED

  return (
    <Accordion
      className={cx(css.accordion, { [css.sideNavCollapsed]: sideNavState === SIDE_NAV_STATE.COLLAPSED })}
      summaryClassName={css.summary}
      chevronClassName={css.chevron}
      activeId={selectedModule}
      panelClassName={css.panel}
      detailsClassName={css.accordionDetails}
      ref={accordionRef}
    >
      {orderedModules.map(module => {
        const Component = ModuleRouteConfig[module].sideNavLinks(NAV_MODE.ALL, { sideNavState })
        const availableScopes = filterSideNavScope(Component).filter(
          scopeObj => scopeObj.props?.__type === 'SIDENAV_SCOPE'
        )

        const shouldModuleBeVisible =
          visibleModules.indexOf(module) > -1 &&
          availableScopes.findIndex(scopeObj => scopeObj.props.scope?.indexOf(scope) > -1) > -1

        return (
          <Accordion.Panel
            key={module}
            id={module}
            addDomId={true}
            disabled={isCollapsed}
            className={!shouldModuleBeVisible ? css.hidden : undefined}
            summary={<ModuleSummary module={module} selectedModule={selectedModule} />}
            details={
              <Container className={css.module} padding={{ left: 'small' }}>
                <SideNavLinksComponent module={module} mode={NAV_MODE.ALL} />
              </Container>
            }
          />
        )
      })}
    </Accordion>
  )
}

export default ModulesAccordion
