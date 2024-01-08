/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Position, Toaster } from '@blueprintjs/core'
import React, { useEffect, useState } from 'react'
import cx from 'classnames'
import { Button, ButtonVariation, Container, Layout, Text } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { defaultTo, upperCase } from 'lodash-es'
import { useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'

import css from './DowntimeNotification.module.scss'

export const DowntimeToaster = Toaster.create({
  className: css.toaster,
  position: Position.BOTTOM_RIGHT,
  usePortal: false
})

interface DowntimeStatusPopoverProps {
  incidentTitle?: string
  status?: string
  affectedComponents?: string[]
  incidentLink?: string
  uid: string
  componentName?: string
  updatedAt?: string
}

const statusToIntent: Record<string, string> = {
  degraded_performance: 'warning',
  under_maintenance: 'warning',
  partial_outage: 'partial',
  major_outage: 'danger',
  operational: 'success',
  postmortem: 'warning',
  none: 'none'
}

const moduleNames: Record<string, string> = {
  CD: 'Continuous Delivery - Next Generation (CDNG)',
  CI: 'Continuous Integration Enterprise(CIE) - Cloud Builds',
  CE: 'Cloud Cost Management (CCM)',
  CHAOS: 'Chaos Engineering',
  CF: 'Feature Flags (FF)',
  SRM: 'Service Reliability Management (SRM)',
  STO: 'Security Testing Orchestration (STO)',
  CET: 'Continuous Error Tracking (CET)'
}

const DowntimeStatus = (props: DowntimeStatusPopoverProps): JSX.Element => {
  const { uid, affectedComponents, incidentLink, incidentTitle, status } = props
  const statusIntent = statusToIntent[defaultTo(status, 'none')]
  return (
    <Layout.Vertical spacing={'small'} className={css[statusIntent?.toLowerCase() as keyof typeof css]}>
      <Text
        font={{ variation: FontVariation.BODY2 }}
        lineClamp={2}
        tooltipProps={{
          usePortal: false,
          isDark: true,
          position: Position.BOTTOM_RIGHT
        }}
      >
        {`Incident title: ${defaultTo(incidentTitle, '-')}`}
      </Text>
      <Text
        font={{ variation: FontVariation.BODY }}
        lineClamp={3}
        tooltipProps={{
          usePortal: false,
          isDark: true,
          position: Position.BOTTOM_RIGHT
        }}
        tooltip={`Affected Components: ${defaultTo(affectedComponents?.join(', '), '-')}`}
        className={css.affectedComponents}
      >
        <strong>{'Affected Components: '}</strong>
        {defaultTo(affectedComponents?.join(', '), '-')}
      </Text>
      <Layout.Horizontal flex={{ justifyContent: 'space-between' }} className={css.actionBtn}>
        <Container className={cx(css.incidentStatusTag, css[statusIntent?.toLowerCase() as keyof typeof css])}>
          <Text>{upperCase(defaultTo(status?.replace(/_/g, ' '), '-'))}</Text>
        </Container>
        <div>
          <Button
            variation={ButtonVariation.LINK}
            text="Incident"
            className={css.statusLinkBtn}
            onClick={() => {
              window.open(defaultTo(incidentLink, 'https://status.harness.io/'), '_blank')
            }}
          />
          <Button
            variation={ButtonVariation.LINK}
            text="Dismiss"
            onClick={() => DowntimeToaster.dismiss(uid)}
            className={css.statusLinkBtn}
          />
        </div>
      </Layout.Horizontal>
    </Layout.Vertical>
  )
}

export const handleToasters = (downtimeData?: DowntimeStatusPopoverProps[]): void => {
  for (const incident of defaultTo(downtimeData, [])) {
    const uniqueKey = incident.uid + incident.incidentTitle
    DowntimeToaster.show(
      {
        message: (
          <DowntimeStatus
            uid={uniqueKey}
            status={incident.status}
            affectedComponents={incident.affectedComponents}
            incidentTitle={incident.incidentTitle}
            incidentLink={incident.incidentLink}
          />
        ),
        timeout: -1,
        className: css[statusToIntent[defaultTo(incident.status, 'none')]?.toLowerCase() as keyof typeof css]
      },
      uniqueKey
    )
  }
}

const DowntimeNotification = (): JSX.Element => {
  const [downtimeStatusResponse, setDowntimeStatusResponse] = useState<any>()
  const [downtimeStatusError, setDowntimeStatusError] = useState<any>()

  const enableDowntimeNotification = useFeatureFlag(FeatureFlag.CDS_HARNESS_DOWNTIME_NOTIFICATION)
  const [statusData, setStatusData] = useState<DowntimeStatusPopoverProps[]>([])

  const { accountInfo: accountData } = useAppStore()
  const { licenseInformation } = useLicenseStore()

  const activeLicenses = Object.keys(licenseInformation).filter(
    moduleName => licenseInformation[moduleName]?.status === 'ACTIVE'
  )
  const activeLicensesWithFullNames = activeLicenses.map(moduleName => ({
    abbreviation: moduleName,
    fullForm: moduleNames[moduleName]
  }))
  const fullFormNames = activeLicensesWithFullNames.map(license => license.fullForm)

  const components = downtimeStatusResponse?.components || []

  function extractClusterComponents(component: any, parentName: string): DowntimeStatusPopoverProps[] {
    const name = component.name
    const fullName = parentName ? `${parentName} > ${name}` : name
    const cluster = accountData ? accountData.cluster : undefined

    const clusterVariant = cluster?.toLocaleLowerCase().split('-').join(' ')

    if (
      (fullName.toLocaleLowerCase().startsWith(cluster?.toLocaleLowerCase()) && fullName !== cluster) ||
      (fullName.toLocaleLowerCase().startsWith(clusterVariant) && fullName.toLocaleLowerCase() !== clusterVariant)
    ) {
      const componentData: DowntimeStatusPopoverProps = {
        componentName: name,
        status: component?.status,
        updatedAt: component.updated_at,
        incidentLink: '',
        incidentTitle: '',
        affectedComponents: [],
        uid: component.id
      }
      if (componentData?.status !== 'operational') {
        const currentIncidents = downtimeStatusResponse.incidents.filter((incident: any) =>
          incident.components.some((comp: any) => comp.name === name && comp?.status !== 'operational')
        )
        if (currentIncidents.length > 0) {
          const matchingIncidents = currentIncidents.filter((currentIncident: any) => {
            const affectedComponents = currentIncident.components
              .filter((comp: any) => comp?.status !== 'operational')
              .map((comp: any) => comp.name)
            const hasCILicense = activeLicenses.includes('CI')
            const includesSelfHostedRunners = affectedComponents.includes(
              'Continuous Integration Enterprise(CIE) - Self Hosted Runners'
            )
            if (hasCILicense && includesSelfHostedRunners) {
              return true
            }
            return affectedComponents.some((item: any) => fullFormNames.includes(item))
          })
          if (matchingIncidents.length > 0) {
            return matchingIncidents.map((matchingIncident: any) => ({
              ...componentData,
              incidentLink: matchingIncident.shortlink,
              incidentTitle: matchingIncident.name,
              affectedComponents: matchingIncident.components
                .filter((comp: any) => comp?.status !== 'operational')
                .map((comp: any) => comp.name)
            }))
          }
        }
      }
    }
    if (component.components) {
      let extractedComponents: DowntimeStatusPopoverProps[] = []

      for (const subComponentId of component.components) {
        const subComponent = components.find((subComp: any) => subComp.id === subComponentId)
        if (subComponent) {
          extractedComponents = extractedComponents.concat(extractClusterComponents(subComponent, fullName))
        }
      }
      return extractedComponents
    }
    return []
  }

  useEffect(() => {
    let apiCallInProgress = false

    function makeAPICall(): void {
      if (!apiCallInProgress) {
        apiCallInProgress = true
        fetch('https://tq9lcrwd1tcn.statuspage.io/api/v2/summary.json')
          .then(response => response.json())
          .then(data => {
            apiCallInProgress = false
            setDowntimeStatusResponse(data)
          })
          .catch(error => {
            apiCallInProgress = false
            setDowntimeStatusError(error)
          })
      }
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === 'visible') {
        // Tab is in focus, make the API call
        makeAPICall()
      }
    }

    if (enableDowntimeNotification) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      makeAPICall()

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [])

  useEffect(() => {
    const extractedData: DowntimeStatusPopoverProps[] = []
    for (const component of components) {
      const extractedComponents = extractClusterComponents(component, '')
      extractedData.push(...extractedComponents)
    }
    setStatusData(extractedData)
  }, [downtimeStatusResponse, downtimeStatusError])

  useEffect(() => {
    if (enableDowntimeNotification) {
      handleToasters(statusData)
    }
  }, [statusData])

  return <></>
}

export default DowntimeNotification
