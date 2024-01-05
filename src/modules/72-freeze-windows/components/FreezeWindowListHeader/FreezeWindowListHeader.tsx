/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { HarnessDocTooltip, Page } from '@harness/uicore'
import React, { FC } from 'react'
import { useParams } from 'react-router-dom'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { getLinkForAccountResources } from '@common/utils/BreadcrumbUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { useStrings } from 'framework/strings'
import { GlobalFreezeToggle, GlobalFreezeToggleProps } from '../GlobalFreezeToggle/GlobalFreezeToggle'

export const FreezeWindowListHeader: FC<GlobalFreezeToggleProps> = ({
  freezeListLoading,
  refreshGlobalFreezeBanner
}) => {
  const { getString } = useStrings()
  const { projectIdentifier, orgIdentifier, accountId } = useParams<ProjectPathProps>()
  const { isNewNavEnabled } = useAppStore()

  return (
    <Page.Header
      title={
        <div className="ng-tooltip-native">
          <h2 data-tooltip-id="freezeWindowsPageHeading"> {getString('common.freezeWindows')}</h2>
          <HarnessDocTooltip tooltipId="freezeWindowsPageHeading" useStandAlone={true} />
        </div>
      }
      breadcrumbs={
        isNewNavEnabled ? (
          <NGBreadcrumbs />
        ) : (
          <NGBreadcrumbs
            links={getLinkForAccountResources({ accountId, orgIdentifier, projectIdentifier, getString })}
          />
        )
      }
      toolbar={
        <GlobalFreezeToggle
          freezeListLoading={freezeListLoading}
          refreshGlobalFreezeBanner={refreshGlobalFreezeBanner}
        />
      }
    />
  )
}
