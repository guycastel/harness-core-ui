/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Layout, PageError } from '@harness/uicore'
import { useStrings } from 'framework/strings'
import { useGetUsageAndLimit } from '@common/hooks/useGetUsageAndLimit'
import { ContainerSpinner } from '@common/components/ContainerSpinner/ContainerSpinner'
import { ModuleName } from 'framework/types/ModuleName'
import type { ModuleLicenseDTO, CreditDTO } from 'services/cd-ng'
import UsageInfoCard, { ErrorContainer } from './UsageInfoCard'

interface ActiveDevelopersProps {
  useCredits?: boolean
  subscribedUsers: number
  activeUsers: number
  rightHeader: string
}

interface IDPUsageInfoProps {
  loadingCredits?: boolean
  module: ModuleName
  licenseData: ModuleLicenseDTO
  creditsData?: CreditDTO[]
  creditsUsed?: number
}
const ActiveDevelopers: React.FC<ActiveDevelopersProps> = ({
  useCredits,
  subscribedUsers,
  activeUsers,
  rightHeader
}) => {
  const { getString } = useStrings()
  const leftHeader = getString('common.subscriptions.usage.activeDevelopers')
  const tooltip = getString('common.subscriptions.usage.idpTooltip')
  const hasBar = true
  const leftFooter = getString('common.subscribed')
  const defaultRightHeader = rightHeader || getString('common.subscriptions.usage.last30days')
  const rightFooter = getString('common.usage')
  const props = {
    subscribed: subscribedUsers,
    usage: activeUsers,
    leftHeader,
    tooltip,
    rightHeader: defaultRightHeader,
    hasBar,
    leftFooter,
    rightFooter,
    useCredits
  }
  return <UsageInfoCard {...props} />
}

export enum creditStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED'
}
export const creditSum = (creditsData: CreditDTO[]): number => {
  let totalCredits = 0
  creditsData.forEach((cd: CreditDTO) => {
    if (cd.creditStatus !== creditStatus.EXPIRED) totalCredits = totalCredits + (cd.quantity || 0)
  })
  return totalCredits
}

const IDPUsageInfo: React.FC<IDPUsageInfoProps> = () => {
  const { limitData, usageData } = useGetUsageAndLimit(ModuleName.IDP)

  const isLoading = limitData.loadingLimit || usageData.loadingUsage

  if (isLoading) {
    return <ContainerSpinner />
  }

  const { usageErrorMsg, refetchUsage, usage } = usageData
  const { limitErrorMsg, refetchLimit, limit } = limitData

  if (usageErrorMsg) {
    return (
      <ErrorContainer>
        <PageError message={usageErrorMsg} onClick={() => refetchUsage?.()} />
      </ErrorContainer>
    )
  }

  if (limitErrorMsg) {
    return (
      <ErrorContainer>
        <PageError message={limitErrorMsg} onClick={() => refetchLimit?.()} />
      </ErrorContainer>
    )
  }

  return (
    <Layout.Horizontal spacing="large">
      <ActiveDevelopers
        rightHeader={usage?.idp?.activeDevelopers?.displayName || ''}
        subscribedUsers={limit?.idp?.totalDevelopers || 0}
        activeUsers={usage?.idp?.activeDevelopers?.count || 0}
        useCredits={false}
      />
    </Layout.Horizontal>
  )
}

export default IDPUsageInfo
