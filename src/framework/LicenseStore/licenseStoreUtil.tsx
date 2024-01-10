/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { PLG_CD_GET_STARTED_VARIANTS } from '@common/components/ConfigureOptions/constants'
import { Editions } from '@common/constants/SubscriptionTypes'
import routes from '@common/RouteDefinitions'
import type { Module, ModuleName } from 'framework/types/ModuleName'

export interface VersionMap {
  [key: string]: number
}

export enum LICENSE_STATE_VALUES {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
  EXPIRED = 'EXPIRED',
  NOT_STARTED = 'NOT_STARTED'
}

export const defaultLicensesByModule: {
  [key in ModuleName]?: {
    edition: Editions
  }
} = {
  CD: {
    edition: Editions.FREE
  },
  CI: {
    edition: Editions.FREE
  },
  CF: {
    edition: Editions.FREE
  },
  CE: {
    edition: Editions.FREE
  },
  // TODO: change to free when free plan is supported
  CHAOS: {
    edition: Editions.ENTERPRISE
  },
  CV: {
    edition: Editions.FREE
  },
  // TODO: change to free when free plan is supported
  STO: {
    edition: Editions.ENTERPRISE
  },
  CODE: {
    edition: Editions.FREE
  }
}

export const getLicenseStateNameByModuleType = (moduleName: Module): string =>
  `${moduleName.toUpperCase()}_LICENSE_STATE`

const DEFAULT_PROJECT_ID = 'default_project'
const DEFAULT_ORG = 'default'
export const getModuleToDefaultURLMap = (
  accountId: string,
  module: Module,
  getStartedVariant?: PLG_CD_GET_STARTED_VARIANTS
): { [key: string]: string } => ({
  ci: routes.toGetStartedWithCI({
    accountId,
    module,
    projectIdentifier: DEFAULT_PROJECT_ID,
    orgIdentifier: DEFAULT_ORG
  }),
  cd:
    getStartedVariant === PLG_CD_GET_STARTED_VARIANTS.INFO_HEAVY
      ? routes.toGetStartedWithCD({
          accountId,
          module,
          projectIdentifier: DEFAULT_PROJECT_ID,
          orgIdentifier: DEFAULT_ORG
        })
      : routes.toCDOnboardingWizard({
          accountId,
          module,
          projectIdentifier: DEFAULT_PROJECT_ID,
          orgIdentifier: DEFAULT_ORG
        }),
  code: routes.toCODERepositoriesV1({
    projectIdentifier: DEFAULT_PROJECT_ID,
    orgIdentifier: DEFAULT_ORG,
    accountId,
    module: 'code'
  }),
  cf: routes.toCFOnboarding({
    accountId,
    projectIdentifier: DEFAULT_PROJECT_ID,
    orgIdentifier: DEFAULT_ORG
  }),
  ce: routes.toCEOverview({
    accountId
  }),
  cv: routes.toCVHome({
    accountId
  }),
  chaos: routes.toProjectOverview({
    accountId,
    projectIdentifier: DEFAULT_PROJECT_ID,
    orgIdentifier: DEFAULT_ORG,
    module
  }),
  sto: routes.toSTOProjectOverview({
    accountId,
    projectIdentifier: DEFAULT_PROJECT_ID,
    orgIdentifier: DEFAULT_ORG
  })
})
