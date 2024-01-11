/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { ModuleLicenseDTO } from 'services/cd-ng'

export enum ComponentStatus {
  Operational = 'operational',
  Degraded_Performance = 'degraded_performance',
  Partial_Outage = 'partial_outage',
  Major_Outage = 'major_outage',
  Under_Maintenance = 'under_maintenance'
}

export enum IncidentStatus {
  Investigating = 'Investigating',
  Identified = 'Identified',
  Monitoring = 'Monitoring',
  Resolved = 'Resolved',
  Postmortem = 'Postmortem'
}

export enum Impact {
  None = 'none',
  Minor = 'minor',
  Major = 'major',
  Critical = 'critical'
}

export const moduleToLicense: Record<string, ModuleLicenseDTO['moduleType'] | 'CG' | 'Dashboard' | 'None'> = {
  'Continuous Delivery (CD) - FirstGen - EOS': 'CG',
  'Continuous Delivery - Next Generation (CDNG)': 'CD',
  'Cloud Cost Management (CCM)': 'CE',
  'Continuous Error Tracking (CET)': 'CET',
  'Chaos Engineering': 'CHAOS',
  'Continuous Integration Enterprise(CIE) - Cloud Builds': 'CI',
  'Continuous Integration Enterprise(CIE) - Self Hosted Runners': 'CI',
  'Custom Dashboards': 'Dashboard',
  'Feature Flags (FF)': 'CF',
  'Security Testing Orchestration (STO)': 'STO',
  'Service Reliability Management (SRM)': 'CV',
  None: 'None'
}

export interface Page {
  id?: string
  name?: string
  url?: string
  time_zone?: string
  updated_at?: string
}

export interface Component {
  id?: string
  name?: string
  status?: ComponentStatus
  created_at?: string
  updated_at?: string
  position?: number
  description?: string
  showcase?: boolean
  start_date?: string
  group_id?: string
  page_id?: string
  group?: boolean
  only_show_if_degraded?: boolean
  components?: string[]
}

export interface IncidentUpdate {
  id?: string
  status?: IncidentStatus
  body?: string
  created_at?: string
  updated_at?: string
  display_at?: string
  affected_components?: AffectedComponent[]
  deliver_notifications?: boolean
  custom_tweet?: string
  tweet_id?: string
}

export interface AffectedComponent {
  code?: string
  name?: string
  old_status?: ComponentStatus
  new_status?: ComponentStatus
}

export interface Incident {
  id?: string
  name?: string
  status?: IncidentStatus
  created_at?: string
  updated_at?: string
  monitoring_at?: string
  resolved_at?: string
  impact?: Impact
  shortlink?: string
  started_at?: string
  page_id?: string
  incident_updates?: IncidentUpdate[]
  components?: Component[]
}

export interface Status {
  indicator?: string
  description?: string
}

export interface StatusPage {
  page?: Page
  components?: Component[]
  incidents?: Incident[]
  scheduled_maintenances?: []
  status?: Status
}
