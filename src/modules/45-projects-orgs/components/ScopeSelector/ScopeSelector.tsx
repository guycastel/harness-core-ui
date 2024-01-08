/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Position, PopoverInteractionKind } from '@blueprintjs/core'
import { matchPath, useHistory, useParams } from 'react-router-dom'
import cx from 'classnames'
import { defaultTo } from 'lodash-es'
import { Text, Container, Popover, Button, Tabs, Layout, Icon, TabProps } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { Scope } from 'framework/types/types'
import { Organization, Project } from 'services/cd-ng'
import { getRouteParams } from '@common/utils/routeUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { useStrings } from 'framework/strings'
import routes from '@common/RouteDefinitionsV2'
import { LinkInfo } from '@common/navigation/SideNavV2/SideNavV2'
import { SIDE_NAV_STATE, useLayoutV2 } from '@modules/10-common/router/RouteWithLayoutV2'
import { getScopeIcon, useGetSelectedScope } from '@common/navigation/SideNavV2/SideNavV2.utils'
import { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import pointerImageDark from './pointer-dark.svg'
import { ProjectScopeSelector } from './ProjectScopeSelector/ProjectScopeSelector'
import { OrgScopeSelector } from './OrgScopeSelector/OrgScopeSelector'
import { AccountScopeSelector } from './AccountScopeSelector/AccountScopeSelector'
import css from './ScopeSelector.module.scss'

interface ScopeSelectorProps {
  isOpen: boolean
  onButtonClick: () => void
  onClose: () => void
  availableLinks?: Record<Scope, LinkInfo[]>
  activeLink?: LinkInfo
  allowedScopes?: Scope[]
  onScopeChange?: (data?: Project) => void
  noScopeSelected?: boolean
}

export const ScopeSelector: React.FC<ScopeSelectorProps> = props => {
  const {
    isOpen: isScopeSelectorOpen,
    onButtonClick,
    onClose,
    availableLinks: possibleScopeSwitchLinksMap,
    activeLink,
    allowedScopes = [Scope.PROJECT, Scope.ORGANIZATION, Scope.ACCOUNT],
    onScopeChange,
    noScopeSelected
  } = props
  const { currentUserInfo, selectedProject, selectedOrg, accountInfo } = useAppStore()
  const { getString } = useStrings()
  const { accountId } = useParams<ProjectPathProps>()
  const { scope: scopeSelected, params } = useGetSelectedScope()
  const { module } = getRouteParams<ModulePathParams>()

  const selectedScope = allowedScopes && allowedScopes.length === 1 ? allowedScopes[0] : scopeSelected

  const [selectedTabId, setSelectedTabId] = React.useState<Scope | undefined>(selectedScope)
  const { path } = getRouteParams<ProjectPathProps & { path: string }>(true, activeLink?.url)
  const history = useHistory()
  const { sideNavState } = useLayoutV2()

  const handleTabChange = (tabId: Scope): void => {
    setSelectedTabId(tabId)
  }

  const getTargetURL = (scope: Scope, data?: Project | Organization) => {
    if (scope === Scope.PROJECT) {
      const projectData = data as Project
      return routes.replace({
        orgIdentifier: projectData.orgIdentifier,
        projectIdentifier: projectData.identifier,
        path
      })
    } else if (scope === Scope.ORGANIZATION) {
      const orgData = data as Organization
      return routes.replace({ orgIdentifier: orgData.identifier, path })
    }

    return routes.replace({ orgIdentifier: undefined, projectIdentifier: undefined, path })
  }

  const getScopeInfoMap = (): Record<Scope, { label: string; identifier?: string; name?: string }> => {
    return {
      [Scope.PROJECT]: {
        label: getString('projectLabel').toUpperCase(),
        identifier: params?.projectIdentifier,
        name: selectedProject?.name
      },
      [Scope.ORGANIZATION]: {
        label: getString('common.organizations').toUpperCase(),
        identifier: params?.orgIdentifier,
        name: selectedOrg?.name
      },
      [Scope.ACCOUNT]: {
        label: getString('account').toUpperCase(),
        identifier: currentUserInfo?.accounts?.find(account => account.uuid === accountId)?.accountName,
        name: accountInfo?.name
      }
    }
  }

  const renderSelectedScopeButtonContent = () => {
    const scopeInfoMap: Record<Scope, { label: string; identifier?: string; name?: string }> = getScopeInfoMap()

    if (!selectedScope || noScopeSelected) {
      return (
        <Layout.Vertical>
          <Text className={css.scopeLabelText} color={Color.GREY_350}>
            {getString('projectLabel').toUpperCase()}
          </Text>
          <Text color={Color.GREY_800} font={{ variation: FontVariation.BODY }}>
            {getString('selectProject')}
          </Text>
        </Layout.Vertical>
      )
    }

    return (
      <>
        <Layout.Horizontal flex={{ justifyContent: 'flex-start' }}>
          <Icon
            color={Color.GREY_350}
            name={scopeSelected ? getScopeIcon(scopeSelected) : 'nav-project'}
            size={12}
            margin={{ right: 'xsmall' }}
          />
          <Text className={css.scopeLabelText} color={Color.GREY_350}>
            {scopeInfoMap[selectedScope].label}
          </Text>
        </Layout.Horizontal>
        <Text
          color={Color.GREY_1000}
          font={{ variation: FontVariation.BODY }}
          lineClamp={1}
          tooltipProps={{
            disabled: true
          }}
        >
          {scopeInfoMap[selectedScope].name}
        </Text>
      </>
    )
  }

  const handleScopeChange = (targetScope: Scope, data?: Project | Organization): void => {
    const targetUrl = getTargetURL(targetScope, data)

    if (!selectedScope) {
      onClose()
      history.push(targetUrl)
      return
    }

    const scopeSwtichData = possibleScopeSwitchLinksMap?.[targetScope]?.find(availableLink => {
      return Boolean(
        matchPath(targetUrl, {
          path: availableLink.url
        })
      )
    })

    if (scopeSwtichData) {
      onClose()
      history.push(targetUrl)
      return
    } else {
      onClose()
      history.push(
        routes.toMode({
          module,
          projectIdentifier: targetScope === Scope.PROJECT ? data?.identifier : undefined,
          orgIdentifier: targetScope === Scope.PROJECT ? (data as Project).orgIdentifier : data?.identifier
        })
      )
    }
  }

  const isCollapsed = sideNavState === SIDE_NAV_STATE.COLLAPSED

  function renderTabList(): TabProps[] {
    const scopeTabPropsMap: Record<Scope, TabProps> = {
      [Scope.PROJECT]: {
        id: Scope.PROJECT,
        title: getString('projectLabel'),
        iconProps: { name: 'nav-project' },
        panel: (
          <ProjectScopeSelector
            onProjectClick={project => {
              onScopeChange
                ? onScopeChange(project.projectResponse.project)
                : handleScopeChange(Scope.PROJECT, project.projectResponse.project)
            }}
            clickOnViewAllProjects={() => {
              onClose()
              history.push(routes.toProjects({ accountId, module }))
            }}
          />
        )
      },
      [Scope.ORGANIZATION]: {
        id: Scope.ORGANIZATION,
        title: getString('orgLabel'),
        iconProps: { name: 'nav-organization' },
        panel: (
          <OrgScopeSelector
            onClose={() => onClose()}
            onClick={(organization: Organization) => {
              handleScopeChange(Scope.ORGANIZATION, organization)
            }}
            clickOnViewAllOrgs={() => {
              onClose()
              history.push(routes.toOrgs({ accountId, module }))
            }}
          />
        )
      },
      [Scope.ACCOUNT]: {
        id: Scope.ACCOUNT,
        title: getString('account'),
        iconProps: { name: 'Account' },
        panel: (
          <AccountScopeSelector
            clickOnLoggedInAccount={() => {
              handleScopeChange(Scope.ACCOUNT)
            }}
          />
        )
      }
    }

    return allowedScopes.map(scope => scopeTabPropsMap[scope])
  }

  return (
    <>
      <Container padding={{ top: 'medium', bottom: 'small' }} width="100%">
        <Popover
          interactionKind={PopoverInteractionKind.CLICK}
          position={Position.RIGHT}
          modifiers={{ offset: { offset: -50 } }}
          hasBackdrop={true}
          lazy={true}
          fill={true}
          popoverClassName={css.popover}
          isOpen={isScopeSelectorOpen}
          onOpening={() => setSelectedTabId(defaultTo(selectedScope, Scope.PROJECT))}
          onClose={onClose}
          boundary="viewport"
        >
          <Button
            minimal
            rightIcon={isCollapsed ? undefined : 'chevron-right'}
            iconProps={{ color: Color.GREY_400 }}
            className={cx(css.selectButton, {
              [css.active]: isScopeSelectorOpen,
              [css.collapsed]: isCollapsed
            })}
            tooltipProps={{
              isDark: true,
              usePortal: true,
              fill: true,
              position: Position.RIGHT,
              hoverOpenDelay: 500
            }}
            tooltip={
              !selectedScope ? (
                <Text padding="small" color={Color.WHITE}>
                  {getString('selectProject')}
                </Text>
              ) : (
                <Layout.Vertical padding="medium" className={css.scopePopoverContainer}>
                  <Text color={Color.GREY_100} margin={{ bottom: 'medium' }}>
                    {getString('common.switchScope')}
                  </Text>
                  {scopeSelected && (
                    <Layout.Vertical>
                      <Text color={Color.GREY_300} margin={{ bottom: 'xsmall' }}>
                        {getString('common.selectedScope', { targetScope: scopeSelected })}
                      </Text>
                      <Text color={Color.GREY_100}>{getScopeInfoMap()[scopeSelected].name}</Text>
                    </Layout.Vertical>
                  )}
                </Layout.Vertical>
              )
            }
            onClick={onButtonClick}
          >
            {isCollapsed ? (
              <Icon name={scopeSelected ? getScopeIcon(scopeSelected) : 'nav-project'} size={20} />
            ) : (
              <Layout.Vertical spacing="xsmall">{renderSelectedScopeButtonContent()}</Layout.Vertical>
            )}
          </Button>
          <Container width={760} padding="xlarge" className={css.selectContainer}>
            <Tabs
              id="scopeSelector"
              onChange={handleTabChange}
              selectedTabId={selectedTabId}
              data-tabId={selectedTabId}
              tabList={renderTabList()}
            />
          </Container>
        </Popover>
        {!selectedScope && sideNavState === SIDE_NAV_STATE.EXPANDED ? (
          <div style={{ backgroundImage: `url(${pointerImageDark})` }} className={css.pickScopeHelp}>
            <Text color={Color.GREY_450} font={{ variation: FontVariation.BODY }} padding="small">
              {getString('projectsOrgs.pickScope', { scope: selectedScope || Scope.PROJECT })}
            </Text>
          </div>
        ) : null}
      </Container>
    </>
  )
}
