/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'

import { Layout, Button, ButtonVariation, ButtonSize } from '@harness/uicore'
import { PopoverInteractionKind, PopoverPosition } from '@blueprintjs/core'
import { Color } from '@harness/design-system'
import { NavLink, useParams } from 'react-router-dom'
import { useGetSettingValue } from 'services/cd-ng'
import { Page } from '@common/exports'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import routes from '@common/RouteDefinitions'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { SettingType } from '@common/constants/Utils'
import AidaDashboardContent from '@dashboards/components/AidaDashboardContent/AidaDashboardContent'
import AidaDrawer from '@dashboards/components/AidaDrawer/AidaDrawer'
import AidaToolTip from '@dashboards/components/AidaToolTip/AidaToolTip'
import { DashboardMode } from '@dashboards/types/DashboardTypes.types'
import { CDBActions, Category } from '@modules/10-common/constants/TrackingConstants'
import { useTelemetry } from '@modules/10-common/hooks/useTelemetry'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { useStrings } from 'framework/strings'
import { GetStarted } from './home/GetStarted'
import { useDashboardsContext } from './DashboardsContext'
import css from './home/HomePage.module.scss'

const DashboardsHeader: React.FC = () => {
  const { getString } = useStrings()
  const { trackEvent } = useTelemetry()
  const { aiTileDetails, breadcrumbs, mode } = useDashboardsContext()
  const { CDB_AIDA_WIDGET } = useFeatureFlags()
  const { isNewNavEnabled } = useAppStore()
  const { updateTitle } = useDocumentTitle(getString('common.dashboards'))
  const { accountId, folderId, viewId } = useParams<{ accountId: string; folderId: string; viewId: string }>()
  const [isOpen, setDrawerOpen] = useState(false)
  const [isAidaDrawerOpen, setAidaDrawerOpen] = useState(false)
  const [isAidaToolTipOpen, setAidaToolTipOpen] = useState(true)

  const handleAidaOpenEvent = (): void => {
    trackEvent(CDBActions.AidaGenerateDashboardTileOpened, { category: Category.CUSTOM_DASHBOARDS })
    setAidaDrawerOpen(true)
  }

  const handleAidaCloseEvent = (): void => {
    trackEvent(CDBActions.AidaGenerateDashboardTileClosed, { category: Category.CUSTOM_DASHBOARDS })
    setAidaDrawerOpen(false)
  }

  const title = React.useMemo(
    () => (breadcrumbs.length ? breadcrumbs[breadcrumbs.length - 1].label : getString('common.dashboards')),
    [breadcrumbs, getString]
  )

  React.useEffect(() => {
    const titleArray: string[] = [getString('common.dashboards')]

    breadcrumbs.forEach(breadcrumb => titleArray.push(breadcrumb.label))

    updateTitle(titleArray)
  }, [breadcrumbs, getString, updateTitle])

  React.useEffect(() => {
    setAidaDrawerOpen(false)
  }, [aiTileDetails])

  const { data: aidaSettingResponse } = useGetSettingValue({
    identifier: SettingType.AIDA,
    queryParams: { accountIdentifier: accountId }
  })

  const handleGetStartedClicked = (): void => {
    trackEvent(CDBActions.DashboardGetStartedClicked, { category: Category.CUSTOM_DASHBOARDS })
    setDrawerOpen(true)
  }

  const getStarted = (
    <>
      <Button
        minimal
        color={Color.PRIMARY_6}
        icon="question"
        onClick={handleGetStartedClicked}
        text={getString('getStarted')}
      />
      <GetStarted isOpen={isOpen} setDrawerOpen={(val: boolean) => setDrawerOpen(val)} />
    </>
  )

  const aidaButton = (
    <Button
      icon="harness-copilot"
      onClick={handleAidaOpenEvent}
      variation={ButtonVariation.AI}
      text={getString('dashboards.aida.createWidget')}
      tooltip={<AidaToolTip hideToolTip={() => setAidaToolTipOpen(false)} />}
      tooltipProps={{
        isOpen: isAidaToolTipOpen,
        onClose: () => setAidaToolTipOpen(false),
        popoverClassName: css.tooltip,
        position: PopoverPosition.RIGHT_TOP,
        interactionKind: PopoverInteractionKind.CLICK,
        hasBackdrop: true
      }}
      size={ButtonSize.SMALL}
    />
  )

  const showAidaButton =
    aidaSettingResponse?.data?.value === 'true' &&
    mode === DashboardMode.EDIT &&
    viewId &&
    CDB_AIDA_WIDGET &&
    !isAidaDrawerOpen

  return (
    <Page.Header
      title={title}
      breadcrumbs={<NGBreadcrumbs links={breadcrumbs} />}
      content={
        <Layout.Horizontal spacing="medium">
          {!isNewNavEnabled && (
            <>
              <NavLink
                className={css.tags}
                activeClassName={css.activeTag}
                to={routes.toCustomDashboardHome({ accountId, folderId })}
              >
                {getString('common.dashboards')}
              </NavLink>
              <NavLink
                className={css.tags}
                activeClassName={css.activeTag}
                to={routes.toCustomFolderHome({ accountId })}
              >
                {getString('common.folders')}
              </NavLink>
            </>
          )}
          <AidaDrawer isOpen={isAidaDrawerOpen} onClose={handleAidaCloseEvent}>
            <AidaDashboardContent />
          </AidaDrawer>
        </Layout.Horizontal>
      }
      toolbar={showAidaButton ? aidaButton : getStarted}
    />
  )
}

export default DashboardsHeader
