/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { FC, useState } from 'react'
import { Button, ButtonVariation, Icon, Layout, Text } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import moment from 'moment'
import { Collapse } from '@blueprintjs/core'
import { Link, useParams, useRouteMatch } from 'react-router-dom'
import { defaultTo } from 'lodash-es'
import type { FreezeBannerDetails, FreezeDetailedResponse } from 'services/cd-ng'
import { String } from 'framework/strings'
import { getFreezeRouteLink, isFreezeOnSameScope } from '@common/utils/freezeWindowUtils'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useModuleInfo } from '@common/hooks/useModuleInfo'
import routesV1 from '@common/RouteDefinitions'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import routesV2 from '@common/RouteDefinitionsV2'
import css from './GlobalFreezeBanner.module.scss'

export const DATE_PARSE_FORMAT = 'YYYY-MM-DD hh:mm A'
export type Scope = Exclude<FreezeDetailedResponse['freezeScope'], 'unknown' | undefined>

export const getReadableDateFromEpoch = (dateTimeEpoch?: number): string => moment(dateTimeEpoch).format('LLL')

export const scopeText: Record<Scope, string> = {
  account: 'Account',
  org: 'Organization',
  project: 'Project'
}

export const GlobalFreezeBanner: FC<{ globalFreezes: FreezeBannerDetails[] | undefined }> = ({ globalFreezes }) => {
  const [open, setOpen] = useState(false)
  const { module } = useModuleInfo()
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesV2 : routesV1
  const { orgIdentifier, projectIdentifier, accountId } = useParams<ProjectPathProps>()
  const isFreezeWindowsPage = useRouteMatch(
    routes.toFreezeWindows({ accountId, projectIdentifier, orgIdentifier, module })
  )

  if (!globalFreezes || globalFreezes?.length === 0) {
    return null
  }
  const hasMultipleFreezes = globalFreezes.length > 1

  return (
    <Layout.Vertical className={css.globalFreezeBanner}>
      <Layout.Horizontal spacing="small" flex={{ alignItems: 'center', justifyContent: 'start' }}>
        <Icon name="warning-sign" color={Color.YELLOW_800} size={16} />
        <Text
          font={{ variation: FontVariation.SMALL_BOLD }}
          color={Color.GREY_800}
          padding={{ left: 'small', right: 'small' }}
        >
          FREEZE IN PLACE
        </Text>

        {hasMultipleFreezes ? (
          <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_800}>
            <String stringID="common.freezeListActiveBannerText" useRichText vars={{ count: globalFreezes.length }} />
          </Text>
        ) : (
          <Layout.Horizontal spacing="xsmall">
            <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_800}>
              <String stringID="common.freezeActiveBannerTextPrefix" />
            </Text>

            {isFreezeWindowsPage &&
            isFreezeOnSameScope(globalFreezes[0].freezeScope, { projectIdentifier, orgIdentifier, accountId }) ? (
              <Text font={{ variation: FontVariation.SMALL_BOLD }} color={Color.GREY_800}>
                {scopeText[globalFreezes[0].freezeScope as Scope]}
              </Text>
            ) : (
              <Link
                to={getFreezeRouteLink(globalFreezes[0], {
                  projectIdentifier,
                  orgIdentifier,
                  accountId,
                  module
                })}
              >
                <Text font={{ variation: FontVariation.SMALL_BOLD }} color={Color.PRIMARY_7}>
                  {scopeText[globalFreezes[0].freezeScope as Scope]}
                </Text>
              </Link>
            )}
            <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_800}>
              <String
                stringID="common.freezeActiveBannerTimeframe"
                useRichText
                vars={{
                  startTime: getReadableDateFromEpoch(globalFreezes[0].window?.startTime),
                  endTime: getReadableDateFromEpoch(globalFreezes[0].window?.endTime)
                }}
              />
            </Text>
          </Layout.Horizontal>
        )}

        {hasMultipleFreezes && (
          <Button
            rightIcon={open ? 'chevron-up' : 'chevron-down'}
            text={open ? 'Collapse List' : 'Expand List'}
            variation={ButtonVariation.LINK}
            onClick={() => setOpen(!open)}
            className={css.toggleMultiFreezeView}
          />
        )}
      </Layout.Horizontal>

      {hasMultipleFreezes && (
        <Collapse isOpen={open}>
          <ul className={css.freezeWindowList}>
            {globalFreezes.map((freeze, i) => (
              <li key={i}>
                <Layout.Horizontal spacing="xsmall">
                  <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_800}>
                    <String stringID="common.freezeListActiveBannerExpandedTextPrefix" />
                  </Text>

                  {isFreezeWindowsPage &&
                  isFreezeOnSameScope(freeze.freezeScope, { projectIdentifier, orgIdentifier, accountId }) ? (
                    <Text font={{ variation: FontVariation.SMALL_BOLD }} color={Color.GREY_800}>
                      {scopeText[freeze.freezeScope as Scope]}
                    </Text>
                  ) : (
                    <Link
                      to={getFreezeRouteLink(freeze, {
                        projectIdentifier,
                        orgIdentifier,
                        accountId,
                        module: defaultTo(module, 'cd')
                      })}
                    >
                      <Text font={{ variation: FontVariation.SMALL_BOLD }} color={Color.PRIMARY_7}>
                        {scopeText[freeze.freezeScope as Scope]}
                      </Text>
                    </Link>
                  )}

                  <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_800}>
                    <String
                      stringID="common.freezeActiveBannerTimeframe"
                      useRichText
                      vars={{
                        startTime: getReadableDateFromEpoch(freeze.window?.startTime),
                        endTime: getReadableDateFromEpoch(freeze.window?.endTime)
                      }}
                    />
                  </Text>
                </Layout.Horizontal>
              </li>
            ))}
          </ul>
        </Collapse>
      )}
    </Layout.Vertical>
  )
}
