/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import cx from 'classnames'
import moment from 'moment'
import { useParams, useHistory } from 'react-router-dom'
import { Card, Container, Icon, IconName, Layout, Heading, PageError } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { useQueryParams } from '@common/hooks'
import { Page } from '@common/exports'
import routes from '@common/RouteDefinitions'
import { PAGE_NAME } from '@common/pages/pageContext/PageName'
import { useTelemetry } from '@common/hooks/useTelemetry'
import type { AccountPathProps, Module } from '@common/interfaces/RouteInterfaces'
import { Editions } from '@common/constants/SubscriptionTypes'
import { ContainerSpinner } from '@common/components/ContainerSpinner/ContainerSpinner'
import { useStrings } from 'framework/strings'
import { ModuleName } from 'framework/types/ModuleName'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import {
  useGetModuleLicensesByAccountAndModuleType,
  GetModuleLicensesByAccountAndModuleTypeQueryParams
} from 'services/cd-ng'

import { useLicenseStore, handleUpdateLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { useGetCommunity } from '@common/utils/utils'
import { LICENSE_STATE_VALUES } from 'framework/LicenseStore/licenseStoreUtil'
import SubscriptionTab from './SubscriptionTab'
import css from './SubscriptionsPage.module.scss'

export interface TrialInformation {
  days: number
  expiryDate: string
  isExpired: boolean
  expiredDays: number
  edition: Editions
  isFreeOrCommunity: boolean
}
interface ModuleSelectCard {
  icon: IconName
  module: ModuleName
}

const MODULE_SELECT_CARDS: ModuleSelectCard[] = [
  {
    icon: 'cd-with-dark-text',
    module: ModuleName.CD
  },
  {
    icon: 'ci-with-dark-text',
    module: ModuleName.CI
  },
  {
    icon: 'ff-with-dark-text',
    module: ModuleName.CF
  },
  {
    icon: 'ccm-with-dark-text',
    module: ModuleName.CE
  },
  {
    icon: 'srm-with-dark-text',
    module: ModuleName.SRM
  },
  {
    icon: 'sto-with-dark-text',
    module: ModuleName.STO
  },
  {
    icon: 'chaos-with-dark-text',
    module: ModuleName.CHAOS
  },
  {
    icon: 'cet-with-dark-text',
    module: ModuleName.CET
  },
  {
    icon: 'sei-with-dark-text',
    module: ModuleName.SEI
  },
  {
    icon: 'idp-with-dark-text',
    module: ModuleName.IDP
  }
]
const SubscriptionsPage: React.FC = () => {
  const { trackPage } = useTelemetry()
  const { getString } = useStrings()
  const { accountId } = useParams<AccountPathProps>()
  const { moduleCard } = useQueryParams<{ moduleCard?: ModuleName }>()
  const { FF_LICENSE_STATE, licenseInformation, updateLicenseStore } = useLicenseStore()
  const history = useHistory()
  const isCommunity = useGetCommunity()
  useEffect(() => {
    trackPage(PAGE_NAME.SubscriptionsPage, { module: moduleCard as string })
  }, [])

  const ACTIVE_MODULE_SELECT_CARDS = MODULE_SELECT_CARDS.reduce(
    (accumulator: ModuleSelectCard[], card: ModuleSelectCard) => {
      const { module } = card
      switch (module) {
        case ModuleName.CD:
          accumulator.push(card)
          break
        case ModuleName.SRM:
          accumulator.push(card)
          break
        case ModuleName.CI:
          accumulator.push(card)
          break
        case ModuleName.CE:
          licenseInformation['CE']?.status === LICENSE_STATE_VALUES.ACTIVE && accumulator.push(card)
          break
        case ModuleName.CF:
          FF_LICENSE_STATE === LICENSE_STATE_VALUES.ACTIVE && accumulator.push(card)
          break
        case ModuleName.STO:
          accumulator.push(card)
          break
        case ModuleName.CHAOS:
          licenseInformation['CHAOS']?.status === LICENSE_STATE_VALUES.ACTIVE && accumulator.push(card)
          break
        case ModuleName.CET:
          licenseInformation[ModuleName.CET]?.status === LICENSE_STATE_VALUES.ACTIVE && accumulator.push(card)
          break
        case ModuleName.SEI:
          licenseInformation[ModuleName.SEI]?.status === LICENSE_STATE_VALUES.ACTIVE && accumulator.push(card)
          break
        case ModuleName.IDP:
          licenseInformation[ModuleName.IDP]?.status === LICENSE_STATE_VALUES.ACTIVE && accumulator.push(card)
          break
      }
      return accumulator
    },
    []
  )

  const initialModule =
    ACTIVE_MODULE_SELECT_CARDS.find(card => card.module === moduleCard?.toUpperCase()) || ACTIVE_MODULE_SELECT_CARDS[0]

  const [selectedModuleCard, setSelectedModuleCard] = useState<ModuleSelectCard>(initialModule)

  const { accountInfo } = useAppStore()

  const getModuleLicenseQueryParams: GetModuleLicensesByAccountAndModuleTypeQueryParams = {
    moduleType: selectedModuleCard?.module as GetModuleLicensesByAccountAndModuleTypeQueryParams['moduleType']
  }

  const {
    data: licenseData,
    error: licenseError,
    loading: isGetLicenseLoading,
    refetch: refetchGetLicense
  } = useGetModuleLicensesByAccountAndModuleType({
    queryParams: getModuleLicenseQueryParams,
    accountIdentifier: accountId
  })
  const hasLicense =
    selectedModuleCard?.module === 'SRM'
      ? (licenseData?.data && licenseData.data.length > 0) || licenseInformation['CV']
      : licenseData?.data && licenseData.data.length > 0

  const latestModuleLicense = hasLicense
    ? licenseData?.data?.[licenseData.data.length - 1] || licenseInformation['CV']
    : undefined

  useEffect(() => {
    handleUpdateLicenseStore(
      { ...licenseInformation },
      updateLicenseStore,
      selectedModuleCard?.module?.toString() as Module,
      latestModuleLicense
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseData])

  if (licenseError) {
    const message = (licenseError?.data as Error)?.message || licenseError?.message

    return <PageError message={message} onClick={() => refetchGetLicense()} />
  }

  function getModuleSelectElements(): React.ReactElement[] {
    return ACTIVE_MODULE_SELECT_CARDS.map(cardData => {
      const currentUrl = window.location.href
      const plansPage = currentUrl.includes('tab=PLANS') || currentUrl.includes('/plans')
      function handleCardClick(): void {
        setSelectedModuleCard(cardData)
        // reset default tab
        plansPage
          ? history.push(
              routes.toPlans({
                accountId,
                moduleCard: cardData.module.toLowerCase() as Module,
                tab: 'PLANS'
              })
            )
          : history.push(
              routes.toSubscriptions({
                accountId,
                moduleCard: cardData.module.toLowerCase() as Module
              })
            )
      }

      const isSelected = cardData === selectedModuleCard
      const moduleClassName = isSelected && css[cardData.module.toLowerCase() as keyof typeof css]

      return (
        <Card
          className={cx(css.moduleSelectCard, moduleClassName)}
          key={cardData.icon}
          selected={isSelected}
          onClick={handleCardClick}
        >
          <Icon className={css.moduleIcons} name={cardData.icon} />
        </Card>
      )
    })
  }

  const expiryTime = latestModuleLicense?.expiryTime
  const time = moment(expiryTime)
  const days = Math.round(time.diff(moment.now(), 'days', true))
  const expiryDate = time.format('DD MMM YYYY')
  const isExpired = expiryTime !== -1 && days < 0
  const expiredDays = Math.abs(days)
  const edition = latestModuleLicense?.edition as Editions

  const isFreeOrCommunity = edition === Editions.FREE || isCommunity

  const trialInformation: TrialInformation = {
    days,
    expiryDate,
    isExpired,
    expiredDays,
    edition,
    isFreeOrCommunity: isFreeOrCommunity
  }

  const innerContent = isGetLicenseLoading ? (
    <Container>
      <ContainerSpinner />
    </Container>
  ) : (
    <SubscriptionTab
      isPlansPage={window.location.href.includes('/plans')}
      accountData={accountInfo}
      trialInfo={trialInformation}
      hasLicense={hasLicense}
      selectedModule={selectedModuleCard.module}
      licenseData={latestModuleLicense}
      refetchGetLicense={refetchGetLicense}
    />
  )
  return (
    <>
      <Page.Header title={getString('common.subscriptions.title')} />
      <Layout.Vertical
        padding={{ left: 'xxxlarge', right: 'xxxlarge', top: 'xlarge', bottom: 'xlarge' }}
        flex={{ align: 'center-center' }}
      >
        <Heading color={Color.BLACK} padding={{ bottom: 'large' }}>
          {isCommunity ? null : getString('common.plans.title')}
        </Heading>
        <Container className={css.moduleSelectCards}>{isCommunity ? null : getModuleSelectElements()}</Container>
        {innerContent}
      </Layout.Vertical>
    </>
  )
}

export default SubscriptionsPage
