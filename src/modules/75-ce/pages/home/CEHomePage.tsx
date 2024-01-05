/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { pick } from 'lodash-es'
import { PageError, PageSpinner } from '@harness/uicore'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { ModuleName } from 'framework/types/ModuleName'
import type { AccountPathProps, Module } from '@common/interfaces/RouteInterfaces'
import { useGetLicensesAndSummary } from 'services/cd-ng'
import { useQueryParams } from '@common/hooks'
import routesV2 from '@common/RouteDefinitionsV2'
import routes from '@common/RouteDefinitions'
import { handleUpdateLicenseStore, useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import type { ModuleLicenseType } from '@common/constants/SubscriptionTypes'

const CEHomePage: React.FC = () => {
  const { currentUserInfo, isNewNavEnabled } = useAppStore()
  const { NG_LICENSES_ENABLED } = useFeatureFlags()
  const { licenseInformation, updateLicenseStore } = useLicenseStore()

  const { accountId } = useParams<AccountPathProps>()

  const { experience } = useQueryParams<{ experience?: ModuleLicenseType }>()
  const moduleType = ModuleName.CE
  const module = moduleType.toLowerCase() as Module

  const { accounts } = currentUserInfo
  const createdFromNG = accounts?.find(account => account.uuid === accountId)?.createdFromNG

  const { data, error, refetch, loading } = useGetLicensesAndSummary({
    queryParams: { moduleType },
    accountIdentifier: accountId,
    lazy: true
  })

  const expiryTime = data?.data?.maxExpiryTime
  const updatedLicenseInfo = data?.data && {
    ...licenseInformation?.[moduleType],
    ...pick(data?.data, ['licenseType', 'edition']),
    expiryTime
  }

  useEffect(() => {
    handleUpdateLicenseStore({ ...licenseInformation }, updateLicenseStore, module, updatedLicenseInfo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => {
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experience])

  const history = useHistory()

  if (loading) {
    return <PageSpinner />
  }

  if (error) {
    const message = (error?.data as Error)?.message || error?.message
    return <PageError message={message} onClick={() => refetch()} />
  }

  const showTrialPages = createdFromNG || NG_LICENSES_ENABLED

  if (showTrialPages && data?.status === 'SUCCESS' && !data.data) {
    history.push(
      isNewNavEnabled
        ? routesV2.toModuleTrialHome({ accountId, module })
        : routes.toModuleTrialHome({ accountId, module })
    )
  } else {
    history.push(isNewNavEnabled ? routesV2.toCEOverview({ accountId, module }) : routes.toCEOverview({ accountId }))
  }

  return <></>
}

export default CEHomePage
