/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { NavLink, matchPath, useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import { Avatar, Container, Layout, Popover, Text, useToaster } from '@harness/uicore'
import { PopoverInteractionKind, PopoverPosition } from '@blueprintjs/core'
import { Color, FontVariation } from '@harness/design-system'
import { get } from 'lodash-es'
import classNames from 'classnames'
import { ResourceCenter } from '@common/components/ResourceCenter/ResourceCenter'
import routesV1 from '@common/RouteDefinitions'
import routes from '@common/RouteDefinitionsV2'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { useStrings } from 'framework/strings'
import { useLogout1 } from 'services/portal'
import SecureStorage from 'framework/utils/SecureStorage'
import { ModulePathParams } from '@common/interfaces/RouteInterfaces'
import { SIDE_NAV_STATE, useLayoutV2 } from '@modules/10-common/router/RouteWithLayoutV2'
import { accountPathProps, getRouteParams, modulePathProps, returnUrlParams } from '@common/utils/routeUtils'
import { getLoginPageURL } from 'framework/utils/SessionUtils'
import SideNavLink from '../SideNavLink/SideNavLink'
import { useGetSelectedScope } from '../SideNavV2.utils'
import css from './SideNavFooter.module.scss'

const UserProfilePopoverContent: React.FC = () => {
  const { currentUserInfo: user } = useAppStore()
  const { params } = useGetSelectedScope()
  const { getString } = useStrings()
  const { pathname } = useLocation()
  const { showError } = useToaster()
  const history = useHistory()
  const { mutate: logout } = useLogout1({
    userId: SecureStorage.get('uuid') as string,
    requestOptions: { headers: { 'content-type': 'application/json' } }
  })

  const match = matchPath<ModulePathParams>(pathname, {
    path: routes.toModule({ ...modulePathProps, ...accountPathProps })
  })

  const signOut = async (): Promise<void> => {
    try {
      // BE is not publishing correct types for logout response yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await logout()
      SecureStorage.clear()
      if (response?.resource?.logoutUrl) {
        // if BE returns a logoutUrl, redirect there. Used by some customers in onprem
        window.location.href = response.resource.logoutUrl
      } else {
        history.push({ pathname: routesV1.toRedirect(), search: returnUrlParams(getLoginPageURL({})) })
      }
      return
    } catch (err) {
      showError(get(err, 'responseMessages[0].message', getString('somethingWentWrong')))
    }
  }

  return (
    <Container className={css.userProfileContent}>
      <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} padding={'xlarge'}>
        <Avatar name={user.name || user.email} email={user.email} size="medium" hoverCard={false} />
        <Layout.Vertical
          flex={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}
          padding={{ left: 'medium' }}
          width={195}
        >
          <Text
            color={Color.GREY_800}
            font={{ variation: FontVariation.H5 }}
            lineClamp={1}
            style={{ overflow: 'none' }}
          >
            {user.name}
          </Text>
          <Text color={Color.GREY_800} font={{ variation: FontVariation.SMALL }} lineClamp={1}>
            {user.email}
          </Text>
        </Layout.Vertical>
      </Layout.Horizontal>
      <Layout.Vertical
        padding={{ top: 'small', right: 'xlarge', bottom: 'xlarge', left: 'xlarge' }}
        className={css.section}
      >
        <NavLink
          to={routes.toUserProfile({ module: match?.params.module, ...params })}
          activeClassName={css.selected}
          className={css.link}
        >
          <Text font={{ variation: FontVariation.BODY }} color={Color.GREY_800}>
            {getString('common.profileOverview')}
          </Text>
        </NavLink>
        <Text
          className={css.signout}
          icon="log-out"
          color={Color.RED_700}
          padding="small"
          iconProps={{ margin: { right: 'medium' } }}
          margin={{ top: 'small' }}
          onClick={signOut}
        >
          {getString('signOut')}
        </Text>
      </Layout.Vertical>
    </Container>
  )
}

const SideNavFooter: React.FC = () => {
  const [showResourceCenter, setShowResourceCenter] = useState<boolean>(false)
  const { currentUserInfo: user } = useAppStore()
  const { getString } = useStrings()
  const { module, ...params } = getRouteParams<ModulePathParams>()
  const { sideNavState } = useLayoutV2()
  const history = useHistory()
  const match = useRouteMatch(routes.toUserProfile({ module: module, ...params }))

  const isCollapsed = sideNavState === SIDE_NAV_STATE.COLLAPSED
  return (
    <Container className={css.container}>
      <SideNavLink
        to=""
        icon="nav-help"
        label={getString('common.help')}
        onClick={e => {
          e.stopPropagation()
          e.preventDefault()
          setShowResourceCenter(true)
        }}
        className={css.helpLink}
      />

      <ResourceCenter
        hideHelpBtn={true}
        isOpen={showResourceCenter}
        onClose={() => {
          setShowResourceCenter(false)
        }}
      />

      <Popover
        interactionKind={PopoverInteractionKind.HOVER}
        content={<UserProfilePopoverContent />}
        popoverClassName={css.width100}
        targetClassName={css.width100}
        position={PopoverPosition.RIGHT_BOTTOM}
        usePortal={false}
      >
        <Layout.Horizontal
          className={classNames(css.profileLink, { [css.active]: match })}
          flex={{ justifyContent: 'flex-start' }}
          margin={{ top: 'medium' }}
          padding={{ top: 'small', bottom: 'small', left: 'small', right: 'small' }}
          onClick={() => history.push(routes.toUserProfile({ module, ...params }))}
        >
          <Avatar name={user.name || user.email} email={user.email} size="small" hoverCard={false} />
          {!isCollapsed && (
            <Text font={{ variation: FontVariation.BODY2 }} color={Color.BLACK} lineClamp={1}>
              {user.name || user.email}
            </Text>
          )}
        </Layout.Horizontal>
      </Popover>
    </Container>
  )
}

export default SideNavFooter
