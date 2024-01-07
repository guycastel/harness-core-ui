/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { capitalize } from 'lodash-es'
import { Text, Layout, Icon } from '@harness/uicore'
import { Color } from '@harness/design-system'
import type { StringsMap } from 'stringTypes'
import { useStrings } from 'framework/strings'
import { Editions, ModuleLicenseType, CDLicenseType } from '@common/constants/SubscriptionTypes'
import { ModuleName } from 'framework/types/ModuleName'
import type {
  CDModuleLicenseDTO,
  CEModuleLicenseDTO,
  CFModuleLicenseDTO,
  CIModuleLicenseDTO,
  STOModuleLicenseDTO,
  ModuleLicenseDTO,
  ChaosModuleLicenseDTO,
  CVModuleLicenseDTO,
  CETModuleLicenseDTO,
  SEIModuleLicenseDTO,
  IDPModuleLicenseDTO
} from 'services/cd-ng'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'

import css from './SubscriptionDetailsCard.module.scss'

interface SubscriptionDetailsCardExpiryDateProps {
  isTrial: boolean
  isFreeOrCommunity: boolean
  expiryDate?: string
}

function getExpiryMsg({
  isFreeOrCommunity,
  isExpired,
  expiredDays,
  licenseType,
  days
}: {
  isFreeOrCommunity: boolean
  isExpired: boolean
  expiredDays?: number
  licenseType?: ModuleLicenseDTO['licenseType']
  days?: number
}): React.ReactElement | undefined {
  if (isFreeOrCommunity) {
    return undefined
  }

  return isExpired ? (
    <ExpiredMessage expiredDays={expiredDays} />
  ) : (
    <ExpiryCountdownMessage licenseType={licenseType} days={days} />
  )
}

export const MAX_LICENSES = 1000000
const AccountName = ({ accountName }: { accountName?: string }): React.ReactElement => {
  const { getString } = useStrings()
  return (
    <React.Fragment key="account">
      <Text color={Color.GREY_600}>{getString('common.accountName')}</Text>
      <Text color={Color.BLACK} font={{ weight: 'semi-bold' }}>
        {accountName}
      </Text>
    </React.Fragment>
  )
}

const ExpiredMessage = ({ expiredDays }: { expiredDays?: number }): React.ReactElement => {
  const { getString } = useStrings()
  return (
    <Layout.Horizontal spacing="small">
      <Icon className={css.expiryIcon} size={12} name={'warning-sign'} color={Color.RED_700} />
      <Text color={Color.RED_700}>{getString('common.subscriptions.expired', { days: expiredDays })}</Text>
    </Layout.Horizontal>
  )
}

const ExpiryCountdownMessage = ({
  licenseType,
  days
}: {
  licenseType?: ModuleLicenseDTO['licenseType']
  days?: number
}): React.ReactElement | null => {
  const { getString } = useStrings()
  if (licenseType !== ModuleLicenseType.PAID || (days && days < 14)) {
    return (
      <Layout.Horizontal spacing="small">
        <Icon className={css.expiryIcon} size={12} name={'warning-sign'} color={Color.ORANGE_800} />
        <Text color={Color.ORANGE_800}>{getString('common.subscriptions.expiryCountdown', { days })}</Text>
      </Layout.Horizontal>
    )
  }

  return null
}

const SubscriptionDetailsCardExpiryDate = ({
  isTrial,
  isFreeOrCommunity,
  expiryDate
}: SubscriptionDetailsCardExpiryDateProps): React.ReactElement => {
  const { getString } = useStrings()

  const expiryStr = isTrial
    ? getString('common.subscriptions.overview.trialExpiry')
    : getString('common.extendTrial.expiryDate')

  return (
    <React.Fragment key="expiry">
      <Text color={Color.GREY_600}>{expiryStr}</Text>
      <Text color={Color.BLACK} font={{ weight: 'semi-bold' }}>
        {isFreeOrCommunity ? getString('common.subscriptions.overview.freeExpiry') : expiryDate}
      </Text>
    </React.Fragment>
  )
}

const SubscriptionDetailsCardPlan = ({
  isFreeOrCommunity,
  isExpired,
  expiredDays,
  licenseType,
  days,
  edition
}: {
  isFreeOrCommunity: boolean
  isExpired: boolean
  expiredDays?: number
  licenseType?: ModuleLicenseDTO['licenseType']
  days?: number
  edition: Editions
}): React.ReactElement => {
  const { getString } = useStrings()
  const expiryMessage = getExpiryMsg({
    isFreeOrCommunity,
    isExpired,
    expiredDays,
    licenseType,
    days
  })
  const editionStr = capitalize(edition)
  const planMessage =
    licenseType === ModuleLicenseType.PAID || isFreeOrCommunity
      ? getString('common.subscriptions.paid', { edition: editionStr })
      : getString('common.subscriptions.trial', { edition: editionStr })
  return (
    <React.Fragment key="plan">
      <Text color={Color.GREY_600}>{getString('common.subscriptions.overview.plan')}</Text>
      <Layout.Vertical>
        <Text color={Color.BLACK} font={{ weight: 'semi-bold' }}>
          {planMessage}
        </Text>
        {expiryMessage}
      </Layout.Vertical>
    </React.Fragment>
  )
}

function getLicenseCountByModule({
  licenseFF,
  licenseData,
  getString
}: {
  licenseFF?: boolean
  licenseData?: ModuleLicenseDTO
  getString: (key: keyof StringsMap, vars?: Record<string, any> | undefined) => string
}): React.ReactElement | undefined {
  const UNLIMITED = -1
  switch (licenseData?.moduleType) {
    case ModuleName.CF: {
      const cfModuleLicenseDTO = licenseData as CFModuleLicenseDTO
      const featureFlagUsers = cfModuleLicenseDTO?.numberOfUsers?.toLocaleString()
      const monthlyActiveUsers = cfModuleLicenseDTO?.numberOfClientMAUs?.toLocaleString()
      return (
        <Layout.Vertical spacing="medium">
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 5 }}>
            {getString('common.subscriptions.featureFlags.users', { users: featureFlagUsers })}
          </Text>
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }}>
            {getString('common.subscriptions.featureFlags.mau', { maus: monthlyActiveUsers })}
          </Text>
        </Layout.Vertical>
      )
    }
    case ModuleName.CI: {
      const ciModuleLicenseDTO = licenseData as CIModuleLicenseDTO
      const committers =
        ciModuleLicenseDTO?.numberOfCommitters === UNLIMITED
          ? getString('common.unlimited')
          : ciModuleLicenseDTO?.numberOfCommitters?.toLocaleString()
      return (
        <Layout.Vertical spacing="medium">
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 5 }}>
            {getString('common.subscriptions.ci.developers', { developers: committers })}
          </Text>
        </Layout.Vertical>
      )
    }
    case ModuleName.CV: {
      const cvModuleLicenseDTO = licenseData as CVModuleLicenseDTO
      const workloads = cvModuleLicenseDTO?.numberOfServices?.toLocaleString()
      const serviceStr = getString('common.subscriptions.cd.services', { workloads })

      return (
        <Layout.Vertical spacing="medium">
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 5 }}>
            {serviceStr}
          </Text>
        </Layout.Vertical>
      )
    }
    case ModuleName.CD: {
      const cdModuleLicenseDTO = licenseData as CDModuleLicenseDTO

      const workloadsCnt = cdModuleLicenseDTO?.workloads ?? 0
      // # disabled reading serviceInstances as part of https://harness.atlassian.net/browse/PLG-1382
      // const serviceInstances = cdModuleLicenseDTO?.serviceInstances?.toLocaleString()
      const cdLicenseType = cdModuleLicenseDTO?.cdLicenseType
      const totalLicenses = workloadsCnt > MAX_LICENSES && licenseFF ? workloadsCnt - MAX_LICENSES : workloadsCnt
      const serviceStr =
        cdLicenseType === CDLicenseType.SERVICES
          ? getString('common.subscriptions.cd.services', { workloads: workloadsCnt })
          : getString('common.subscriptions.cd.serviceInstances', { workloads: workloadsCnt })

      return (
        <Layout.Vertical spacing="medium">
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 5 }}>
            {licenseFF && workloadsCnt > MAX_LICENSES ? `${totalLicenses} ${getString('users')}` : serviceStr}
          </Text>
        </Layout.Vertical>
      )
    }
    case ModuleName.CE: {
      const ceModuleLicenseDTO = licenseData as CEModuleLicenseDTO
      const spendLimit =
        ceModuleLicenseDTO?.spendLimit === UNLIMITED
          ? getString('common.unlimited')
          : `$${ceModuleLicenseDTO?.spendLimit?.toLocaleString()}`
      return (
        <Layout.Vertical spacing="medium">
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 5 }}>
            {getString('common.subscriptions.ccm.cloudSpend', { spendLimit: spendLimit })}
          </Text>
        </Layout.Vertical>
      )
    }
    case ModuleName.STO: {
      const stoModuleLicenseDTO = licenseData as STOModuleLicenseDTO
      const developers =
        stoModuleLicenseDTO?.numberOfDevelopers === UNLIMITED
          ? getString('common.unlimited')
          : stoModuleLicenseDTO?.numberOfDevelopers?.toLocaleString()
      return (
        <Layout.Vertical spacing="medium">
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 5 }}>
            {getString('common.subscriptions.sto.developers', { developers: developers })}
          </Text>
        </Layout.Vertical>
      )
    }
    case ModuleName.CHAOS: {
      const chaosModuleLicenseDTO = licenseData as ChaosModuleLicenseDTO
      const totalChaosExperimentRuns = chaosModuleLicenseDTO?.totalChaosExperimentRuns?.toLocaleString()
      return (
        <Layout.Vertical spacing="medium">
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 5 }}>
            {getString('common.subscriptions.chaos.experiments', { experiments: totalChaosExperimentRuns })}
          </Text>
        </Layout.Vertical>
      )
    }
    case ModuleName.CET: {
      const cetModuleLicenseDTO = licenseData as CETModuleLicenseDTO
      const agents =
        cetModuleLicenseDTO?.numberOfAgents === UNLIMITED
          ? getString('common.unlimited')
          : cetModuleLicenseDTO?.numberOfAgents?.toLocaleString()
      return (
        <Layout.Vertical spacing="medium">
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 5 }}>
            {getString('common.subscriptions.cet.agents', { agents: agents })}
          </Text>
        </Layout.Vertical>
      )
    }
    case ModuleName.SEI: {
      const seiModuleLicenseDTO = licenseData as SEIModuleLicenseDTO
      const contributors =
        seiModuleLicenseDTO?.numberOfContributors === UNLIMITED
          ? getString('common.unlimited')
          : seiModuleLicenseDTO?.numberOfContributors?.toLocaleString()
      return (
        <Layout.Vertical spacing="medium">
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 5 }}>
            {getString('common.subscriptions.sei.contributors', { contributors: contributors })}
          </Text>
        </Layout.Vertical>
      )
    }
    case ModuleName.IDP: {
      const idpModuleLicenseDTO = licenseData as IDPModuleLicenseDTO
      const developers =
        idpModuleLicenseDTO?.numberOfDevelopers === UNLIMITED
          ? getString('common.unlimited')
          : idpModuleLicenseDTO?.numberOfDevelopers?.toLocaleString()
      return (
        <Layout.Vertical spacing="medium">
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 5 }}>
            {getString('common.subscriptions.sto.developers', { developers: developers })}
          </Text>
        </Layout.Vertical>
      )
    }
    default: {
      return undefined
    }
  }
}

const SubscriptionDetailsCardLicenseCount = ({
  licenseData
}: {
  licenseData?: ModuleLicenseDTO
}): React.ReactElement => {
  const { getString } = useStrings()

  const { CDS_USER_CD_LICENSE_VIEW: hasUserCDLicenseView } = useFeatureFlags()

  const licenseCount = getLicenseCountByModule({ licenseFF: hasUserCDLicenseView, licenseData, getString })
  return (
    <React.Fragment key="licenseCount">
      <Text color={Color.GREY_600}>{getString('common.account.licenseCount')}</Text>
      {licenseCount}
    </React.Fragment>
  )
}

export const NoSubscriptionDetailsCardInfo = ({ accountName }: { accountName?: string }): React.ReactElement => {
  const { getString } = useStrings()
  return (
    <div className={css.detailFields}>
      <AccountName accountName={accountName} />
      <React.Fragment key="plan">
        <Text color={Color.GREY_600}>{getString('common.subscriptions.overview.plan')}</Text>
        <Layout.Vertical>
          <Text color={Color.BLACK} font={{ weight: 'semi-bold' }}>
            {getString('common.subscriptions.noActiveSubscription')}
          </Text>
        </Layout.Vertical>
      </React.Fragment>
    </div>
  )
}

export const enum Hosting {
  SaaS = 'SAAS',
  OnPrem = 'ON_PREM'
}

export const CommunitySubscriptionDetailsCardInfo = ({ accountName }: { accountName?: string }): React.ReactElement => {
  const { getString } = useStrings()
  const serviceType = getString('platform.authSettings.onprem')
  const serviceTypeElement = (
    <React.Fragment key="service-type">
      <Text color={Color.GREY_600}>{getString('common.serviceType')}</Text>
      <Text color={Color.BLACK} font={{ weight: 'semi-bold' }}>
        {serviceType}
      </Text>
    </React.Fragment>
  )

  return (
    <div className={css.detailFields}>
      <AccountName accountName={accountName} />
      {serviceTypeElement}
      <SubscriptionDetailsCardPlan isFreeOrCommunity isExpired={false} edition={Editions.COMMUNITY} />
      <SubscriptionDetailsCardExpiryDate isTrial={false} isFreeOrCommunity />
    </div>
  )
}

export const SubscriptionDetailsCardInfo = ({
  accountName,
  isFreeOrCommunity,
  isExpired,
  expiredDays,
  days,
  edition,
  licenseData,
  expiryDate
}: {
  accountName?: string
  isFreeOrCommunity: boolean
  isExpired: boolean
  expiredDays?: number
  days?: number
  edition: Editions
  licenseData?: ModuleLicenseDTO
  expiryDate: string
}): React.ReactElement => {
  return (
    <div className={css.detailFields}>
      <AccountName accountName={accountName} />
      <SubscriptionDetailsCardPlan
        isFreeOrCommunity={isFreeOrCommunity}
        isExpired={isExpired}
        expiredDays={expiredDays}
        licenseType={licenseData?.licenseType}
        days={days}
        edition={edition}
      />
      <SubscriptionDetailsCardLicenseCount licenseData={licenseData} />
      <SubscriptionDetailsCardExpiryDate
        isTrial={licenseData?.licenseType === ModuleLicenseType.TRIAL}
        isFreeOrCommunity={isFreeOrCommunity}
        expiryDate={expiryDate}
      />
    </div>
  )
}
