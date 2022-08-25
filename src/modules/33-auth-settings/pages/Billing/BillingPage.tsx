/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState, useEffect } from 'react'
import { Button, Page, ButtonVariation, Layout, Card, Text, FontVariation } from '@harness/uicore'
import { useParams } from 'react-router-dom'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { StringKeys, useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import type { AccountPathProps } from '@common/interfaces/RouteInterfaces'
import { TimeType } from '@common/constants/SubscriptionTypes'
import { SubscriptionDetailDTO, useListSubscriptions } from 'services/cd-ng'
import { useModuleInfo } from '@common/hooks/useModuleInfo'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { usePage } from '@common/pages/pageContext/PageProvider'
import { getSubscriptionByPaymentFrequency } from '@auth-settings/components/Subscription/subscriptionUtils'
import NoBills from './images/noBills.svg'
import BillingAdminsCard from './BillingAdminsCard'
import SubscriptionTable from './SubscriptionTable'
import PaymentMethods from './PaymentMethods'
import css from './BillingPage.module.scss'

export default function BillingPage(_props: { children?: JSX.Element }): JSX.Element {
  const { accountId } = useParams<AccountPathProps>()
  const { getString } = useStrings()
  const { pageName } = usePage()
  const { currentUserInfo } = useAppStore()
  const { module } = useModuleInfo()
  const { trackPage, identifyUser } = useTelemetry()
  const [subscriptions, setsubscriptions] = useState<{ [key: string]: SubscriptionDetailDTO[] }>({})

  const { data } = useListSubscriptions({ queryParams: { accountIdentifier: accountId } })
  useEffect(() => {
    if (pageName) {
      identifyUser(currentUserInfo.email)
      trackPage(pageName, { module: module || '' })
    }
  }, [pageName])
  useEffect(() => {
    if (data?.data) {
      setsubscriptions(getSubscriptionByPaymentFrequency(data.data as SubscriptionDetailDTO[]))
    }
  }, [data])

  return (
    <>
      <Page.Header
        breadcrumbs={<NGBreadcrumbs />}
        title={getString('common.billing')}
        toolbar={
          <Button
            variation={ButtonVariation.PRIMARY}
            icon="contact-support"
            text={getString('common.banners.trial.contactSales')}
          />
        }
      />
      <Page.Body>
        <Layout.Vertical spacing="xxlarge" padding="xlarge" className={css.billingPage}>
          <Layout.Horizontal flex className={css.topCards}>
            <Card className={css.card}>
              <Text font={{ variation: FontVariation.CARD_TITLE }}>{getString('common.subscriptions.title')}</Text>
              <div className={css.centerText}>
                <Text font={{ variation: FontVariation.BODY }}>{getString('none')}</Text>
              </div>
            </Card>
            <PaymentMethods />
            <BillingAdminsCard />
          </Layout.Horizontal>
          {/* {subscriptions[TimeType.YEARLY]?.length ? (
            <> */}
          {subscriptions[TimeType.YEARLY]?.length > 0 && (
            <SubscriptionTable frequency={TimeType.YEARLY} data={subscriptions[TimeType.YEARLY]} />
          )}
          {subscriptions[TimeType.MONTHLY]?.length > 0 && (
            <SubscriptionTable frequency={TimeType.MONTHLY} data={subscriptions[TimeType.MONTHLY]} />
          )}
          {/* </>
          ) : (
            <NoSubscriptionsCard getString={getString} />
          )} */}
        </Layout.Vertical>
      </Page.Body>
    </>
  )
}

export const NoSubscriptionsCard = ({
  getString
}: {
  getString: (key: StringKeys, vars?: Record<string, any>) => string
}): JSX.Element => (
  <Card className={css.billingList}>
    <img src={NoBills} width="25%" />
    <Text font={{ size: 'medium', weight: 'bold' }}>{getString('authSettings.billingInfo.nobills')}</Text>
    <Text font={{ size: 'small' }}>{getString('authSettings.billingInfo.firstSubscription')}</Text>
    <Button variation={ButtonVariation.PRIMARY} text={getString('authSettings.billingInfo.explorePlans')} />
  </Card>
)
