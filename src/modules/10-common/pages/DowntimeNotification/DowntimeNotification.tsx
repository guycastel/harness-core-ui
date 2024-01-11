/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Position, Toaster } from '@blueprintjs/core'
import React, { useEffect, useState } from 'react'
import cx from 'classnames'
import { Button, ButtonVariation, Container, Layout, Text, useToaster } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { defaultTo, isEqual } from 'lodash-es'
import { useQuery } from '@tanstack/react-query'
import { useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import { TrackEvent, useTelemetry } from '@modules/10-common/hooks/useTelemetry'
import { DowntimeNotificationActions } from '@modules/10-common/constants/TrackingConstants'
import { Component, Impact, Incident, IncidentStatus, StatusPage, moduleToLicense } from './downtimeNotificationUtils'

import css from './DowntimeNotification.module.scss'

export const DowntimeToaster = Toaster.create({
  className: css.toaster,
  position: Position.BOTTOM_RIGHT,
  usePortal: false
})

interface IncidentComposedDataProps {
  uid: string
  incidentTitle: string
  status: Impact
  incidentLink?: string
  affectedComponents: string[]
}

const statusToIntent: Record<string, string> = {
  [Impact.None]: 'none',
  [Impact.Minor]: 'warning',
  [Impact.Major]: 'partial',
  [Impact.Critical]: 'danger'
}

const statusToOutageLabel: Record<string, string> = {
  [Impact.None]: 'OPERATIONAL',
  [Impact.Minor]: 'DEGRADED PERFORMANCE',
  [Impact.Major]: 'PARTIAL OUTAGE',
  [Impact.Critical]: 'MAJOR OUTAGE'
}

const DowntimeStatus = (props: IncidentComposedDataProps & { trackEvent: TrackEvent }): JSX.Element => {
  const { uid, affectedComponents, incidentLink, incidentTitle, status, trackEvent } = props
  const statusIntent = statusToIntent[defaultTo(status, 'none')]

  trackEvent(DowntimeNotificationActions.VisibleIncidents, {
    incidentId: uid,
    incidentTitle: incidentTitle
  })

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
          <Text>{defaultTo(statusToOutageLabel[status], '-')}</Text>
        </Container>
        <Container flex={{ alignItems: 'center' }}>
          <a
            href={defaultTo(incidentLink, window.downtimeStatusEndpoint)}
            target="_blank"
            rel="noreferrer"
            className={css.statusLinkBtn}
          >
            {'View Incident'}
          </a>
          <Button
            variation={ButtonVariation.LINK}
            text="Dismiss"
            onClick={() => DowntimeToaster.dismiss(uid)}
            className={css.statusLinkBtn}
          />
        </Container>
      </Layout.Horizontal>
    </Layout.Vertical>
  )
}

export const handleToasters = (
  dismissedIncidents: string[],
  setDismissedCollection: React.Dispatch<React.SetStateAction<string[]>>,
  trackEvent: TrackEvent,
  downtimeData?: IncidentComposedDataProps[]
): void => {
  //getter - hide dismissed toasters
  const incidents = downtimeData?.filter(incident => !dismissedIncidents.includes(incident.uid))

  for (const incident of defaultTo(incidents, [])) {
    DowntimeToaster.show(
      {
        message: (
          <DowntimeStatus
            uid={incident.uid}
            status={incident.status}
            affectedComponents={incident.affectedComponents}
            incidentTitle={incident.incidentTitle}
            incidentLink={incident.incidentLink}
            trackEvent={trackEvent}
          />
        ),
        timeout: -1,
        className: css[statusToIntent[defaultTo(incident.status, 'none')]?.toLowerCase() as keyof typeof css],
        //setter - add current dismissed toast to localStorage collection
        onDismiss: () => {
          trackEvent(DowntimeNotificationActions.DismissedIncidents, {
            incidentId: incident.uid,
            incidentTitle: incident.incidentTitle
          })
          setDismissedCollection([incident.uid])
        }
      },
      incident.uid
    )
  }
}

const getDowntimeNotificationData = async (): Promise<StatusPage> => {
  if (!window.downtimeStatusEndpoint) {
    return {}
  }
  try {
    const response = await fetch(window.downtimeStatusEndpoint + 'api/v2/summary.json')
    if (response.ok) {
      return response.json()
    } else {
      throw response
    }
  } catch (error) {
    return {}
  }
}

type clusterMapType = Record<string, string>

const extractAffectedClusters = (component: Component[]): clusterMapType => {
  const clusterMap: clusterMapType = {}

  component
    .filter(item => item.group)
    .forEach(item => {
      if (item.id) {
        clusterMap[item.id] = defaultTo(item.name, '').toLocaleLowerCase().split(' ').join('-')
      }
    })

  return clusterMap
}

const composeIncidents = (
  activeLicenses: string[],
  cluster: string,
  incidents: Incident[],
  affectedClusters: clusterMapType
): IncidentComposedDataProps[] => {
  const unresolvedIncidents = incidents.filter(
    incident => !(incident.status === IncidentStatus.Postmortem || incident.status === IncidentStatus.Resolved)
  )

  const getValidAffectedComponents = (incident: Incident): string[] => {
    const components = defaultTo(incident.components, [])
      .filter(
        // filter if the user do not have license for the given component
        component => component.name && activeLicenses.includes(defaultTo(moduleToLicense[component.name], 'None'))
      )
      .filter(
        component =>
          component.group_id &&
          // filter if the affected cluster do not match the current cluster
          affectedClusters[component.group_id] === cluster.toLocaleLowerCase().split(' ').join('-')
      )
      .map(component => defaultTo(component.name, '-'))

    return components
  }

  const incidentComposedData: IncidentComposedDataProps[] = unresolvedIncidents.map(incident => {
    return {
      uid: defaultTo(incident.id, ''),
      affectedComponents: getValidAffectedComponents(incident),
      status: defaultTo(incident.impact, Impact.None),
      incidentLink: defaultTo(incident.shortlink, window.downtimeStatusEndpoint),
      incidentTitle: defaultTo(incident.name, '-')
    }
  })
  return incidentComposedData.filter(incident => incident.affectedComponents.length > 0)
}

const DowntimeNotification: React.FC = (): JSX.Element => {
  const enableDowntimeNotification =
    useFeatureFlag(FeatureFlag.CDS_HARNESS_DOWNTIME_NOTIFICATION) && window.downtimeStatusEndpoint
  const [composedIncidentList, setComposedIncidentList] = useState<IncidentComposedDataProps[]>([])

  const { preference: dismissedIncidents = [], setPreference: setDismissedIncidents } = usePreferenceStore<string[]>(
    PreferenceScope.ACCOUNT,
    'dismiss_incidents'
  )
  const [dismissedCollection, setDismissedCollection] = useState<string[]>([])

  const { trackEvent } = useTelemetry()

  useEffect(() => {
    const combinedData = new Set([...dismissedIncidents, ...dismissedCollection])
    setDismissedIncidents([...combinedData])
  }, [dismissedCollection])

  const { accountInfo: accountData } = useAppStore()
  const { licenseInformation } = useLicenseStore()

  const activeLicenses = Object.keys(licenseInformation).filter(
    moduleName => licenseInformation[moduleName]?.status === 'ACTIVE'
  )

  const { showError } = useToaster()

  useQuery(['getDowntimeStatus'], getDowntimeNotificationData, {
    refetchOnWindowFocus: true,
    enabled: Boolean(enableDowntimeNotification),
    onSettled: (data, error) => {
      if (error) {
        showError(error)
      }

      if (enableDowntimeNotification) {
        const composedIncidentsList = composeIncidents(
          activeLicenses,
          defaultTo(accountData?.cluster, ''),
          defaultTo(data?.incidents, []),
          extractAffectedClusters(defaultTo(data?.components, []))
        )
        setComposedIncidentList(composedIncidentsList)
      }
    }
  })

  const cleanLocalStorage = (incidentList: IncidentComposedDataProps[]): void => {
    const updatedIncidentList = dismissedIncidents.filter(inc => incidentList?.map(item => item.uid).includes(inc))
    if (!isEqual(dismissedIncidents, updatedIncidentList)) {
      setDismissedIncidents(updatedIncidentList)
    }
  }

  useEffect(() => {
    if (enableDowntimeNotification) {
      //clean localStorage
      if (composedIncidentList.length) {
        cleanLocalStorage(composedIncidentList)
      }

      handleToasters(dismissedIncidents, setDismissedCollection, trackEvent, composedIncidentList)
    }
  }, [composedIncidentList])

  return <></>
}

export default DowntimeNotification
