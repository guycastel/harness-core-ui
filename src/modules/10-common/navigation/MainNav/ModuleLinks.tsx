/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { Icon, Layout, Text } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { useParams, NavLink as Link, NavLinkProps, useLocation } from 'react-router-dom'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import routes from '@common/RouteDefinitions'
import { String } from 'framework/strings'

import css from './MainNav.module.scss'

const commonLinkProps: Partial<NavLinkProps> = {
  activeClassName: css.active,
  className: cx(css.navLink)
}

export const ChaosNavItem = () => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toChaos(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="chaos-main" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="common.purpose.chaos.chaos" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const DeploymentsNavItem = () => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toCD(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="cd-main" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="deploymentsText" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const BuildsNavItem = () => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toCI(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="ci-main" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="buildsText" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const FeatureFlagsNavItem = () => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toCF(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="cf-main" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="featureFlagsText" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const CloudCostsNavItem = () => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toCE(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="ce-main" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="cloudCostsText" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const SRMNavItem = () => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toCV(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="cv-main" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="common.purpose.cv.serviceReliability" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const STONavItem = () => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toSTO(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="sto-color-filled" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="common.purpose.sto.continuous" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const CODENavItem = () => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toCODE(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="code" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="common.purpose.code.name" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const IACNavItem = (): JSX.Element => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toIACM(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="iacm" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="infrastructureText" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const SSCANavItem = (): JSX.Element => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toSSCA(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="ssca-main" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="common.ssca" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const IDPNavItem = (): JSX.Element => {
  const params = useParams<ProjectPathProps & ModulePathParams>()
  const location = useLocation()

  const validPath = location.pathname.match(/idp-admin|idp/g)

  function isIDPActive(): boolean {
    if (params?.module === 'idp-admin') {
      return true
    }
    return validPath?.length === 1
  }

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toIDPDefaultPath(params)} isActive={() => isIDPActive()}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="idp" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            margin="xsmall"
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="common.purpose.idp.name" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const ETNavItem = () => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toCET(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="cet" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            margin="xsmall"
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="common.purpose.errorTracking.title" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}

export const SEINavItem = (): JSX.Element => {
  const params = useParams<ProjectPathProps>()

  return (
    <li className={css.navItem}>
      <Link {...commonLinkProps} to={routes.toSEI(params)}>
        <Layout.Vertical flex={{ align: 'center-center' }} spacing="small">
          <Icon name="sei-main" size={30} />
          <Text
            font={{ weight: 'semi-bold', align: 'center' }}
            padding={{ bottom: 'xsmall' }}
            color={Color.WHITE}
            className={css.text}
          >
            <String stringID="common.purpose.sei.continuous" />
          </Text>
        </Layout.Vertical>
      </Link>
    </li>
  )
}
