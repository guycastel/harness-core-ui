/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

export enum DashboardType {
  SHARED = 'SHARED',
  ACCOUNT = 'ACCOUNT'
}

export enum DashboardLayoutViews {
  GRID = 'grid',
  LIST = 'list'
}

export enum DashboardTags {
  HARNESS = 'HARNESS',
  CD = 'CD',
  CE = 'CE',
  CF = 'CF',
  CI = 'CI'
}

export type MappedDashboardTagOptions = Record<DashboardTags, boolean>

export interface IDashboardFormData {
  id: string
  resourceIdentifier: string
  title: string
  description: string
}
