import React, { useEffect, useState } from 'react'
import cx from 'classnames'

import moment from 'moment'
import { useParams } from 'react-router-dom'
import { Button, Card, Color, Container, Icon, IconName, Layout, Text } from '@wings-software/uicore'
import { useQueryParams } from '@common/hooks'
import { Page } from '@common/exports'
import type { AccountPathProps, Module } from '@common/interfaces/RouteInterfaces'
import { ContainerSpinner } from '@common/components/ContainerSpinner/ContainerSpinner'
import { PageError } from '@common/components/Page/PageError'
import { useStrings } from 'framework/strings'
import type { StringsMap } from 'stringTypes'
import { ModuleName } from 'framework/types/ModuleName'
import {
  useGetAccountNG,
  useGetModuleLicenseByAccountAndModuleType,
  GetModuleLicenseByAccountAndModuleTypeQueryParams
} from 'services/cd-ng'

import { useLicenseStore, handleUpdateLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import type { SubscriptionTab } from './SubscriptionTab'
import { SUBSCRIPTION_TABS, SUBSCRIPTION_TAB_NAMES } from './SubscriptionTab'

import SubscriptionOverview from './overview/SubscriptionOverview'
import css from './SubscriptionsPage.module.scss'

export interface TrialInformation {
  days: number
  expiryDate: string
  isExpired: boolean
  expiredDays: number
}
interface ModuleSelectCard {
  icon: IconName
  module: ModuleName
  title: keyof StringsMap
  titleDescriptor: keyof StringsMap
}

const MODULE_SELECT_CARDS: ModuleSelectCard[] = [
  {
    icon: 'cd-main',
    module: ModuleName.CD,
    title: 'common.purpose.continuous',
    titleDescriptor: 'common.purpose.cd.delivery'
  },
  {
    icon: 'cv-main',
    module: ModuleName.CV,
    title: 'common.purpose.continuous',
    titleDescriptor: 'common.purpose.cv.verification'
  },
  {
    icon: 'ci-main',
    module: ModuleName.CI,
    title: 'common.purpose.continuous',
    titleDescriptor: 'common.purpose.ci.integration'
  },
  {
    icon: 'ce-main',
    module: ModuleName.CE,
    title: 'common.purpose.continuous',
    titleDescriptor: 'common.purpose.ce.efficiency'
  },
  {
    icon: 'cf-main',
    module: ModuleName.CF,
    title: 'common.purpose.cf.feature',
    titleDescriptor: 'common.purpose.cf.flags'
  }
]

const SubscriptionsPage: React.FC = () => {
  const { getString } = useStrings()
  const { accountId } = useParams<AccountPathProps>()
  const { moduleCard } = useQueryParams<{ moduleCard?: ModuleName }>()
  const { CDNG_ENABLED, CVNG_ENABLED, CING_ENABLED, CENG_ENABLED, CFNG_ENABLED } = useFeatureFlags()
  const { licenseInformation, updateLicenseStore } = useLicenseStore()

  const ACTIVE_MODULE_SELECT_CARDS = MODULE_SELECT_CARDS.reduce(
    (accumulator: ModuleSelectCard[], card: ModuleSelectCard) => {
      const { module } = card

      switch (module) {
        case ModuleName.CD:
          if (CDNG_ENABLED) {
            accumulator.push(card)
          }
          return accumulator
        case ModuleName.CV:
          if (CVNG_ENABLED) {
            accumulator.push(card)
          }
          return accumulator
        case ModuleName.CI:
          if (CING_ENABLED) {
            accumulator.push(card)
          }
          return accumulator
        case ModuleName.CE:
          if (CENG_ENABLED) {
            accumulator.push(card)
          }
          return accumulator
        case ModuleName.CF:
          if (CFNG_ENABLED) {
            accumulator.push(card)
          }
          return accumulator
        default:
          return accumulator
      }
    },
    []
  )

  const initialModule =
    ACTIVE_MODULE_SELECT_CARDS.find(card => card.module === moduleCard?.toUpperCase()) || ACTIVE_MODULE_SELECT_CARDS[0]

  const [selectedModuleCard, setSelectedModuleCard] = useState<ModuleSelectCard>(initialModule)
  const [selectedSubscriptionTab, setSelectedSubscriptionTab] = useState<SubscriptionTab>(SUBSCRIPTION_TABS[0])

  const {
    data: accountData,
    error: accountError,
    loading: isGetAccountLoading,
    refetch: refetchGetAccount
  } = useGetAccountNG({ accountIdentifier: accountId })

  const getModuleLicenseQueryParams: GetModuleLicenseByAccountAndModuleTypeQueryParams = {
    accountIdentifier: accountId,
    moduleType: selectedModuleCard.module as GetModuleLicenseByAccountAndModuleTypeQueryParams['moduleType']
  }

  const {
    data: licenseData,
    error: licenseError,
    loading: isGetLicenseLoading,
    refetch: refetchGetLicense
  } = useGetModuleLicenseByAccountAndModuleType({
    queryParams: getModuleLicenseQueryParams
  })

  useEffect(() => {
    handleUpdateLicenseStore(
      { ...licenseInformation },
      updateLicenseStore,
      selectedModuleCard.module.toString() as Module,
      licenseData?.data
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseData])

  if (accountError || licenseError) {
    const message =
      (accountError?.data as Error)?.message ||
      accountError?.message ||
      (licenseError?.data as Error)?.message ||
      licenseError?.message

    return (
      <PageError message={message} onClick={accountError ? () => refetchGetAccount() : () => refetchGetLicense()} />
    )
  }

  function getModuleSelectElements(): React.ReactElement[] {
    const cards = ACTIVE_MODULE_SELECT_CARDS.map(cardData => {
      function handleCardClick(): void {
        setSelectedModuleCard(cardData)
      }

      const isSelected = cardData === selectedModuleCard

      return (
        <Card className={css.moduleSelectCard} key={cardData.icon} selected={isSelected} onClick={handleCardClick}>
          <Layout.Horizontal width={150}>
            <Icon className={css.moduleIcons} name={cardData.icon} size={28} />
            <Layout.Vertical>
              <Text color={Color.BLACK} font={{ size: 'xsmall' }}>
                {getString(cardData.title).toUpperCase()}
              </Text>
              <Text color={Color.BLACK} font={{ size: 'medium' }}>
                {getString(cardData.titleDescriptor)}
              </Text>
            </Layout.Vertical>
          </Layout.Horizontal>
        </Card>
      )
    })

    return cards
  }

  const expiryTime = licenseData?.data?.expiryTime
  const time = moment(expiryTime)
  const days = Math.round(time.diff(moment.now(), 'days', true))
  const expiryDate = time.format('DD MMM YYYY')
  const isExpired = days < 0
  const expiredDays = Math.abs(days)

  const trialInformation: TrialInformation = {
    days,
    expiryDate,
    isExpired,
    expiredDays
  }

  function getBanner(): React.ReactElement | null {
    if (!isExpired && licenseData?.data?.licenseType !== 'TRIAL' && expiredDays > 14) {
      return null
    }

    const moduleEnterpriseMessage = getString('common.subscriptions.banner.enterprise', {
      module: selectedModuleCard.module === 'CF' ? 'FF' : selectedModuleCard.module.toString()
    })
    const expiryMessage = isExpired
      ? getString('common.subscriptions.expired', {
          days: expiredDays
        })
      : getString('common.subscriptions.expiryCountdown', {
          days
        })

    const bannerMessage = `${moduleEnterpriseMessage} ${expiryMessage}`
    const bannerClassnames = cx(css.banner, isExpired ? css.expired : css.expiryCountdown)
    const color = isExpired ? Color.RED_700 : Color.ORANGE_700

    return (
      <Container
        padding="medium"
        intent="warning"
        width={350}
        flex={{
          justifyContent: 'start'
        }}
        className={bannerClassnames}
        font={{
          align: 'center'
        }}
      >
        <Icon name={'warning-sign'} size={15} className={css.bannerIcon} color={color} />
        <Text color={color}>{bannerMessage}</Text>
      </Container>
    )
  }

  function getSubscriptionTabButtons(): React.ReactElement[] {
    const tabs = SUBSCRIPTION_TABS.map(tab => {
      function handleTabClick(): void {
        setSelectedSubscriptionTab(tab)
      }

      const isSelected = tab === selectedSubscriptionTab
      const buttonClassnames = cx(css.subscriptionTabButton, isSelected && css.selected)

      return (
        <Button className={buttonClassnames} key={tab.label} round onClick={handleTabClick}>
          {getString(tab.label)}
        </Button>
      )
    })

    return tabs
  }

  function getTabComponent(): React.ReactElement | null {
    switch (selectedSubscriptionTab.name) {
      case SUBSCRIPTION_TAB_NAMES.OVERVIEW:
      default:
        return (
          <SubscriptionOverview
            accountName={accountData?.data?.name}
            module={selectedModuleCard.module}
            licenseData={licenseData?.data}
            trialInformation={trialInformation}
          />
        )
    }
  }

  const innerContent =
    isGetAccountLoading || isGetLicenseLoading ? (
      <Container>
        <ContainerSpinner />
      </Container>
    ) : (
      <React.Fragment>
        {licenseData?.data && getBanner()}
        <Layout.Horizontal className={css.subscriptionTabButtons} spacing="medium">
          {getSubscriptionTabButtons()}
        </Layout.Horizontal>
        {getTabComponent()}
      </React.Fragment>
    )

  return (
    <>
      <Page.Header title={getString('common.subscriptions.title')} />
      <Layout.Vertical padding="xxxlarge">
        <Layout.Horizontal
          className={css.moduleSelectCards}
          flex={{ alignItems: 'center', justifyContent: 'flex-start' }}
        >
          {getModuleSelectElements()}
        </Layout.Horizontal>
        {innerContent}
      </Layout.Vertical>
    </>
  )
}

export default SubscriptionsPage
