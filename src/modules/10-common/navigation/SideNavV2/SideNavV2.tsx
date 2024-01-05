/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect } from 'react'
import cx from 'classnames'
import { Layout, Text } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { ModalProvider } from '@harness/use-modal'
import { useStrings } from 'framework/strings'
import routes from '@common/RouteDefinitionsV2'
import { NAV_MODE, accountPathProps, getRouteParams, orgPathProps, projectPathProps } from '@common/utils/routeUtils'
import { Module } from 'framework/types/ModuleName'
import { useIsPublicAccess } from 'framework/hooks/usePublicAccess'
import { Scope } from 'framework/types/types'
import { SIDE_NAV_STATE, useLayoutV2 } from '@modules/10-common/router/RouteWithLayoutV2'
import { StringsMap } from 'stringTypes'
import SideNavToggleButton from './SideNavToggleButton/SideNavToggleButton'
import SideNavHeader from './SideNavHeader/SideNavHeader'
import SideNavHeaderPublic from './SideNavHeader/SideNavHeaderPublic'
import { useSideNavV2 } from './useSideNavV2'
import SideNavFooter from './SideNavFooter/SideNavFooter'
import SideNavFooterPublic from './SideNavFooter/SideNavFooterPublic'
import { ScopeLinkParams } from './ScopeSwitchDialog/usePrimaryScopeSwitchDialog'
import { SideNavContextProvider } from './SideNavV2Context'
import SideNavSectionComponent, { SideNavSectionComponentProps } from './SideNavSection/SideNavSection'
import { SideNavLink as SideNavLinkComponent, SideNavLinkProps } from './SideNavLink/SideNavLink'
import { useGetSelectedScope } from './SideNavV2.utils'
import css from './SideNavV2.module.scss'

// scope selector should be moved to common component

type ScopeComponent = React.FunctionComponent<SideNavScopeProps>
type SectionComponent = React.FunctionComponent<SideNavSectionComponentProps>
type LinkComponent = React.FunctionComponent<SideNavLinkProps>
type MainComponent = React.FunctionComponent<SideNavMainProps>
type CommonScopeLinks = React.FunctionComponent<CommonScopeLinksProps>
type SettingsTitle = React.FunctionComponent<{ label: keyof StringsMap; __type?: string }>

type SideNavComponent<T> = React.FunctionComponent<T> & {
  Scope: ScopeComponent
  Section: SectionComponent
  Link: LinkComponent
  Main: MainComponent
  CommonScopeLinks: CommonScopeLinks
  Title: SettingsTitle
}

export interface ScopeSwitchProps {
  link?: ScopeLinkParams
}

interface SideNavScopeProps {
  scope: Scope | Scope[]
  children?: React.ReactElement<SideNavLinkProps> | Array<React.ReactElement<SideNavLinkProps>>
  isRenderedInAccordion?: boolean
  showLinksIfNotPresentInScope?: boolean
  scopeSwitchProps?: Partial<Record<Scope, ScopeSwitchProps>>
  __type?: string
}

interface SideNavMainProps {
  disableScopeSelector?: boolean
  disableCollapse?: boolean
}

export interface LinkInfo {
  url: string
  label: string
  scopeSwitchProps?: Partial<Record<Scope, ScopeSwitchProps>>
}

const replaceScopeWithIdentifiers = (url: string, scope: Scope): string => {
  const { path: lastPath, module } = getRouteParams<{ path: string; module: Module }>(true, url)

  if (scope === Scope.PROJECT) {
    return routes.replace({ ...projectPathProps, module, path: lastPath })
  }

  if (scope === Scope.ORGANIZATION) {
    return routes.replace({ ...orgPathProps, module, path: lastPath })
  }

  return routes.replace({ ...accountPathProps, module, path: lastPath })
}

const getSideNavLinks = (
  elements: React.ReactElement | React.ReactElement[],
  linksMap: Record<Scope, LinkInfo[]>,
  scope?: Scope | Scope[],
  scopeSwitchProps?: Partial<Record<Scope, ScopeSwitchProps>>
): Record<Scope, LinkInfo[]> => {
  React.Children.map(elements, (child: JSX.Element) => {
    if (child?.props?.__type === 'SIDENAV_LINK') {
      if (Array.isArray(scope)) {
        scope.forEach(item => {
          if (!linksMap[item]) {
            linksMap[item] = []
          }

          linksMap[item].push({
            url: replaceScopeWithIdentifiers(child?.props?.to, item),
            label: child?.props?.label,
            scopeSwitchProps
          })
        })
      } else if (scope) {
        if (!linksMap[scope]) {
          linksMap[scope] = []
        }
        linksMap[scope].push({
          url: replaceScopeWithIdentifiers(child?.props?.to, scope),
          label: child?.props?.label,
          scopeSwitchProps
        })
      }
    }
  })

  return linksMap
}

const SideNavScope: React.FC<SideNavScopeProps> = props => {
  const { scope } = useGetSelectedScope()
  const { children, scopeSwitchProps, showLinksIfNotPresentInScope, isRenderedInAccordion } = props
  const { updateAvailableLinks } = useSideNavV2()

  useEffect(() => {
    const links = getSideNavLinks(
      children as React.ReactElement,
      {
        Project: [],
        Organization: [],
        Account: []
      },
      props.scope,
      scopeSwitchProps
    )

    updateAvailableLinks(links)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!showLinksIfNotPresentInScope) {
    if (Array.isArray(props.scope)) {
      if (scope && props.scope.indexOf(scope) === -1) {
        return null
      }
    } else if (scope && scope !== props.scope) {
      return null
    }
  }

  if (Array.isArray(children)) {
    return (
      <>
        {children.map((child, idx) =>
          React.cloneElement(child as React.ReactElement, {
            scope: props.scope,
            isRenderedInAccordion,
            key: `sideNavScope-${idx}`
          })
        )}
      </>
    )
  }

  return <>{React.cloneElement(props.children as React.ReactElement, { scope: props.scope, isRenderedInAccordion })}</>
}

SideNavScope.defaultProps = {
  __type: 'SIDENAV_SCOPE'
}

const SideNavMainComponent: React.FC<SideNavMainProps> = props => {
  const { scope } = useGetSelectedScope()
  const { setDisableSideNavCollapse } = useLayoutV2()
  const { children, disableScopeSelector, disableCollapse } = props

  useEffect(() => {
    setDisableSideNavCollapse?.(Boolean(disableCollapse))
  }, [disableCollapse])

  return (
    <SideNavContextProvider disableScopeSelector={disableScopeSelector}>
      {scope ? children : undefined}
    </SideNavContextProvider>
  )
}

export const SideNav: SideNavComponent<React.PropsWithChildren<unknown>> = (props): JSX.Element => {
  const { sideNavState, disableSideNavCollapse } = useLayoutV2()
  const isCurrentSessionPublic = useIsPublicAccess()
  const { children } = props

  if (sideNavState === SIDE_NAV_STATE.HIDDEN) {
    return <></>
  }

  const isCollapsed = sideNavState === SIDE_NAV_STATE.COLLAPSED
  return (
    <ModalProvider>
      <Layout.Vertical
        className={cx(css.container, {
          [css.expanded]: !isCollapsed,
          [css.collapsed]: isCollapsed,
          [css.publicAccessMode]: isCurrentSessionPublic
        })}
      >
        {isCurrentSessionPublic ? (
          <>
            <SideNavHeaderPublic />
            <SideNavFooterPublic />
          </>
        ) : (
          <>
            <SideNavHeader />
            {children}
            <SideNavFooter />
          </>
        )}
        {!disableSideNavCollapse && <SideNavToggleButton />}
      </Layout.Vertical>
    </ModalProvider>
  )
}

interface CommonScopeLinksProps {
  module?: Module
  mode: NAV_MODE
  projectsLinkLabel?: string
}

const SettingsTitle = (props: { label: keyof StringsMap }): JSX.Element => {
  const { label } = props
  const { getString } = useStrings()
  const { sideNavState } = useLayoutV2()

  if (sideNavState === SIDE_NAV_STATE.COLLAPSED) {
    return <></>
  }
  return (
    <Text
      className={css.sectionTitle}
      font={{ variation: FontVariation.TINY }}
      color={Color.GREY_500}
      padding={{ top: 'large', right: 'medium', bottom: 'small', left: 'medium' }}
    >
      {getString(label)}
    </Text>
  )
}

SettingsTitle.defaultProps = {
  __type: 'SIDENAV_TITLE'
}

const CommonScopeLinks: React.FC<CommonScopeLinksProps> = props => {
  const { module, mode, projectsLinkLabel } = props
  const { params } = useGetSelectedScope()
  const { getString } = useStrings()

  if (mode === NAV_MODE.ALL && module) {
    return null
  }

  return (
    <SideNavSectionComponent>
      <SideNav.Scope scope={Scope.ACCOUNT}>
        <SideNav.Link to={routes.toOrgs({ module, mode })} label={getString('orgsText')} icon="nav-organization" />
        <SideNav.Link to={routes.toProjects({ module, mode })} label={getString('projectsText')} icon="nav-project" />
        <SideNav.Link
          to={routes.toSettings({ mode, module })}
          label={getString('common.accountSettings')}
          icon={'setting'}
        />
      </SideNav.Scope>
      <SideNav.Scope scope={Scope.ORGANIZATION}>
        <SideNav.Link
          to={routes.toProjects({ mode, module, orgIdentifier: params?.orgIdentifier })}
          label={projectsLinkLabel || getString('projectsText')}
          icon="nav-project"
        />
        <SideNav.Link
          to={routes.toSettings({ mode, module, orgIdentifier: params?.orgIdentifier })}
          label={getString('common.settingsPage.title.orgSettingsTitle')}
          icon={'setting'}
        />
      </SideNav.Scope>
      <SideNav.Scope scope={Scope.PROJECT}>
        <SideNav.Link
          to={routes.toSettings({
            mode,
            module,
            orgIdentifier: params?.orgIdentifier,
            projectIdentifier: params?.projectIdentifier
          })}
          label={getString('common.settingsPage.title.projectSettingsTitle')}
          icon={'setting'}
        />
      </SideNav.Scope>
    </SideNavSectionComponent>
  )
}

SideNav.Scope = SideNavScope
SideNav.Link = SideNavLinkComponent
SideNav.Main = SideNavMainComponent
SideNav.Section = SideNavSectionComponent
SideNav.CommonScopeLinks = CommonScopeLinks
SideNav.Title = SettingsTitle
