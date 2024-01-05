/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { MultiTypeMapType } from '@modules/10-common/components/Map/Map'

export enum NotificationType {
  Slack = 'Slack',
  Email = 'Email',
  PagerDuty = 'PagerDuty',
  MsTeams = 'MsTeams',
  Webhook = 'Webhook'
}

interface NotificationConfiguration {
  type: NotificationType
  userGroups: string[]
}

export interface EmailNotificationConfiguration extends NotificationConfiguration {
  emailIds: string[]
}

export interface SlackNotificationConfiguration extends NotificationConfiguration {
  webhookUrl: string
}

export interface WebhookNotificationConfiguration {
  type: NotificationType
  webhookUrl: string
  headers?: MultiTypeMapType
}

export interface MSTeamsNotificationConfiguration extends NotificationConfiguration {
  msTeamKeys: string[]
}
export interface PagerDutyNotificationConfiguration extends NotificationConfiguration {
  key: string
}

export enum TestStatus {
  INIT,
  LOADING,
  SUCCESS,
  FAILED,
  ERROR
}
