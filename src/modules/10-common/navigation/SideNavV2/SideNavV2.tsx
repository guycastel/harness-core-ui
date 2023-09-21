/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect } from 'react'
import cx from 'classnames'
import { Layout, Text, useToggleOpen } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { ModalProvider } from '@harness/use-modal'
import { useStrings } from 'framework/strings'
import routes from '@common/RouteDefinitionsV2'
import { NAV_MODE, accountPathProps, getRouteParams, orgPathProps, projectPathProps } from '@common/utils/routeUtils'
import { Module } from 'framework/types/ModuleName'
import { Scope } from 'framework/types/types'
import { StringsMap } from 'stringTypes'
import SideNavHeader from './SideNavHeader/SideNavHeader'
import { useSideNavV2 } from './useSideNavV2'
import SideNavFooter from './SideNavFooter/SideNavFooter'
import { ScopeLinkParams } from './ScopeSwitchDialog/usePrimaryScopeSwitchDialog'
import { SideNavContextProvider } from './SideNavV2Context'
import SideNavSectionComponent, { SideNavSectionComponentProps } from './SideNavSection/SideNavSection'
import { SideNavLink as SideNavLinkComponent, SideNavLinkProps } from './SideNavLink/SideNavLink'
import { useGetSelectedScope } from './SideNavV2.utils'
import ModulesConfigurationScreen from '../ModuleConfigurationScreen/ModuleConfigurationScreen'
import css from './SideNavV2.module.scss'

// scope selector should be moved to common component

type ScopeComponent = React.FunctionComponent<SideNavScopeProps>
type SectionComponent = React.FunctionComponent<SideNavSectionComponentProps>
type LinkComponent = React.FunctionComponent<SideNavLinkProps>
type MainComponent = React.FunctionComponent<SideNavMainProps>
type SideNavSettingsLink = React.FunctionComponent<SettingsLinkProps>
type SettingsTitle = React.FunctionComponent<{ label: keyof StringsMap; __TYPE?: string }>

type SideNavComponent<T> = React.FunctionComponent<T> & {
  Scope: ScopeComponent
  Section: SectionComponent
  Link: LinkComponent
  Main: MainComponent
  SettingsLink: SideNavSettingsLink
  Title: SettingsTitle
}

export interface ScopeSwitchProps {
  link?: ScopeLinkParams
}

interface SideNavScopeProps {
  scope: Scope | Scope[]
  children?: React.ReactElement<SideNavLinkProps> | Array<React.ReactElement<SideNavLinkProps>>
  showLinksIfNotPresentInScope?: boolean
  scopeSwitchProps?: Partial<Record<Scope, ScopeSwitchProps>>
  __TYPE?: string
}

interface SideNavMainProps {
  disableScopeSelector?: boolean
  children: React.ReactElement | React.ReactElement[]
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
    if (child?.props?.__TYPE === 'SIDENAV_LINK') {
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
  const { children, scopeSwitchProps, showLinksIfNotPresentInScope } = props
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
    return <>{children.map(child => React.cloneElement(child as React.ReactElement, { scope: props.scope }))}</>
  }

  return <>{React.cloneElement(props.children as React.ReactElement, { scope: props.scope })}</>
}

SideNavScope.defaultProps = {
  __TYPE: 'SIDENAV_SCOPE'
}

const SideNavMainComponent: React.FC<SideNavMainProps> = props => {
  const { scope } = useGetSelectedScope()
  const { children, disableScopeSelector } = props

  return (
    <SideNavContextProvider disableScopeSelector={disableScopeSelector}>
      {scope ? children : undefined}
    </SideNavContextProvider>
  )
}

export const SideNav: SideNavComponent<React.PropsWithChildren<unknown>> = (props): JSX.Element => {
  const { children } = props

  return (
    <ModalProvider>
      <Layout.Vertical className={cx(css.container, css.expanded)} padding="medium">
        <SideNavHeader />
        {children}
        <SideNavFooter />
      </Layout.Vertical>
    </ModalProvider>
  )
}

interface SettingsLinkProps {
  module?: Module
  mode: NAV_MODE
  showConfigurationLink?: boolean
}

const SettingsTitle = (props: { label: keyof StringsMap }): JSX.Element => {
  const { label } = props
  const { getString } = useStrings()

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
  __TYPE: 'SIDENAV_TITLE'
}

const SettingsLink: React.FC<SettingsLinkProps> = props => {
  const { module, mode, showConfigurationLink = false } = props
  const { params } = useGetSelectedScope()
  const { getString } = useStrings()
  const { isOpen: isModuleConfigOpen, toggle: toggleModuleConfig, close: closeModuleConfig } = useToggleOpen(false)

  if (mode === NAV_MODE.ALL && module) {
    return null
  }

  return (
    <SideNavSectionComponent>
      <SideNav.Scope scope={Scope.ACCOUNT}>
        <SideNav.Link
          to={routes.toSettings({ mode, module })}
          label={getString('common.accountSettings')}
          icon={'setting'}
        />
      </SideNav.Scope>
      <SideNav.Scope scope={Scope.ORGANIZATION}>
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
      {showConfigurationLink && (
        <Text
          icon="list-view"
          iconProps={{ size: 20, margin: { right: 'xsmall' } }}
          font={{ variation: FontVariation.BODY }}
          color={Color.GREY_800}
          className={css.configureNavigation}
          onClick={() => {
            toggleModuleConfig()
          }}
        >
          {getString('common.configureNavigation')}
        </Text>
      )}
      {isModuleConfigOpen ? (
        <ModulesConfigurationScreen
          onClose={() => {
            closeModuleConfig()
          }}
        />
      ) : null}
    </SideNavSectionComponent>
  )
}

SideNav.Scope = SideNavScope
SideNav.Link = SideNavLinkComponent
SideNav.Main = SideNavMainComponent
SideNav.Section = SideNavSectionComponent
SideNav.SettingsLink = SettingsLink
SideNav.Title = SettingsTitle