/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { useParams } from 'react-router-dom'
import type { IconName } from '@harness/icons'
import type { StringKeys } from 'framework/strings'
import { ModuleName, moduleNameToModuleMapping } from 'framework/types/ModuleName'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import type { AccountPathProps } from '@common/interfaces/RouteInterfaces'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useGetCommunity } from '@common/utils/utils'
import { FeatureFlag } from '@common/featureFlags'
import { useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { NAV_MODE } from '@common/utils/routeUtils'
import type { ModuleLicenseDTO } from '../../../services/cd-ng'

export type NavModuleName =
  | ModuleName.CD
  | ModuleName.CI
  | ModuleName.CV
  | ModuleName.CF
  | ModuleName.CE
  | ModuleName.CHAOS
  | ModuleName.STO
  | ModuleName.CODE
  | ModuleName.IACM
  | ModuleName.SSCA
  | ModuleName.IDP
  | ModuleName.CET
  | ModuleName.SEI

// Default order of modules on side nav, please add modules to this list accordingly.
// For any module to be visible on side nav, it has to be added in this list
export const DEFAULT_MODULES_ORDER: NavModuleName[] = [
  ModuleName.CD,
  ModuleName.CI,
  ModuleName.CF,
  ModuleName.CE,
  ModuleName.STO,
  ModuleName.CHAOS,
  ModuleName.SEI,
  ModuleName.CODE,
  ModuleName.IDP,
  ModuleName.IACM,
  ModuleName.SSCA,
  ModuleName.CV,
  ModuleName.CET
]

export interface useNavModuleInfoReturnType {
  shouldVisible: boolean
  label: StringKeys
  icon: IconName
  homePageUrl: string
  hasLicense?: boolean
  color: string
  backgroundColor?: string
  backgroundColorLight?: string
  shortLabel: StringKeys
  moduleIntro?: StringKeys
  isNew?: boolean
}

export interface ModuleInfo {
  icon: IconName
  label: StringKeys
  getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) => string
  featureFlagName?: FeatureFlag
  color: string
  backgroundColor?: string
  backgroundColorLight?: string
  shortLabel: StringKeys
  moduleIntro?: StringKeys
  isNew?: boolean
}

export const moduleInfoMap: Record<NavModuleName, ModuleInfo> = {
  [ModuleName.CD]: {
    icon: 'cd-main',
    label: 'common.cdAndGitops',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.CD],
            noscope: true
          })
        : routes.toCD({ accountId }),
    color: '--cd-border',
    backgroundColor: '--cd-background',
    backgroundColorLight: '--cd-background-light',
    shortLabel: 'deploymentsText',
    moduleIntro: 'common.moduleIntro.deployments'
  },
  [ModuleName.CI]: {
    icon: 'ci-main',
    label: 'common.purpose.ci.continuous',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.CI],
            noscope: true
          })
        : routes.toCI({ accountId }),
    color: '--ci-border',
    backgroundColor: '--ci-background',
    backgroundColorLight: '--ci-background-light',
    shortLabel: 'buildsText',
    moduleIntro: 'common.moduleIntro.builds'
  },
  [ModuleName.CV]: {
    icon: 'cv-main',
    label: 'common.serviceReliabilityManagement',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.CV],
            noscope: true
          })
        : routes.toCV({ accountId }),
    featureFlagName: FeatureFlag.CVNG_ENABLED,
    color: '--srm-border',
    backgroundColor: '--srm-background',
    backgroundColorLight: '--srm-background-light',
    shortLabel: 'common.purpose.cv.serviceReliability',
    moduleIntro: 'common.moduleIntro.reliabilityManagement'
  },
  [ModuleName.CF]: {
    icon: 'ff-solid',
    label: 'common.purpose.cf.continuous',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.CF],
            noscope: true
          })
        : routes.toCF({ accountId }),
    color: '--ff-border',
    backgroundColor: '--ff-background',
    backgroundColorLight: '--ff-background-light',
    shortLabel: 'featureFlagsText',
    moduleIntro: 'common.moduleIntro.featureFlag'
  },
  [ModuleName.CE]: {
    icon: 'ce-main',
    label: 'common.purpose.ce.continuous',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.CE],
            noscope: true
          })
        : routes.toCE({ accountId }),
    color: '--ccm-border',
    backgroundColor: '--ccm-background',
    backgroundColorLight: '--ccm-background-light',
    shortLabel: 'cloudCostsText',
    moduleIntro: 'common.moduleIntro.cloudCosts'
  },
  [ModuleName.STO]: {
    icon: 'sto-color-filled',
    label: 'common.stoText',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.STO],
            noscope: true
          })
        : routes.toSTO({ accountId }),
    color: '--sto-border',
    backgroundColor: '--sto-background',
    backgroundColorLight: '--sto-background-light',
    shortLabel: 'common.purpose.sto.continuous',
    moduleIntro: 'common.moduleIntro.securityTest'
  },
  [ModuleName.CHAOS]: {
    icon: 'chaos-main',
    label: 'common.purpose.chaos.continuous',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.CHAOS],
            noscope: true
          })
        : routes.toChaos({ accountId }),
    color: '--chaos-border',
    backgroundColor: '--chaos-background',
    backgroundColorLight: '--chaos-background-light',
    shortLabel: 'common.purpose.chaos.continuous',
    moduleIntro: 'common.moduleIntro.chaosEngineering'
  },
  [ModuleName.CODE]: {
    icon: 'code',
    label: 'common.purpose.code.title',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.CODE],
            noscope: true
          })
        : routes.toCODE({ accountId }),
    featureFlagName: FeatureFlag.CODE_ENABLED,
    color: '--code-border',
    backgroundColor: '--code-background',
    backgroundColorLight: '--code-background-light',
    shortLabel: 'common.purpose.code.name',
    isNew: true
  },
  [ModuleName.IACM]: {
    icon: 'iacm',
    label: 'common.iacmText',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.IACM],
            noscope: true
          })
        : routes.toIACM({ accountId }),
    featureFlagName: FeatureFlag.IACM_ENABLED,
    color: '--iacm-border',
    shortLabel: 'common.infrastructures',
    isNew: true
  },
  [ModuleName.SSCA]: {
    icon: 'ssca-main',
    label: 'common.sscaText',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.SSCA],
            noscope: true
          })
        : routes.toSSCA({ accountId }),
    featureFlagName: FeatureFlag.SSCA_ENABLED,
    color: '--default-module-border',
    shortLabel: 'common.sscaShortLabel',
    moduleIntro: 'common.moduleIntro.softwareSupplyChainAssurance',
    isNew: true
  },
  [ModuleName.IDP]: {
    icon: 'idp',
    label: 'common.purpose.idp.fullName',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toIDPDefaultPath({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.IDP]
          })
        : routes.toIDPDefaultPath({ accountId }),
    featureFlagName: FeatureFlag.IDP_ENABLED,
    color: '--idp-border',
    shortLabel: 'common.purpose.idp.name',
    moduleIntro: 'common.moduleIntro.idp',
    backgroundColor: '--idp-background',
    backgroundColorLight: '--idp-background-light',
    isNew: true
  },
  [ModuleName.CET]: {
    icon: 'cet',
    label: 'common.purpose.cet.continuous',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.CET],
            noscope: true
          })
        : routes.toCET({ accountId }),
    color: '--cet-border',
    shortLabel: 'common.purpose.errorTracking.title',
    moduleIntro: 'common.moduleIntro.continuousErrorTracking'
  },
  [ModuleName.SEI]: {
    icon: 'sei-main',
    label: 'common.purpose.sei.fullName',
    getHomePageUrl: (accountId: string, isNewnavEnabled: boolean) =>
      isNewnavEnabled
        ? routesV2.toMode({
            accountId,
            mode: NAV_MODE.MODULE,
            module: moduleNameToModuleMapping[ModuleName.SEI],
            noscope: true
          })
        : routes.toSEI({ accountId }),
    featureFlagName: FeatureFlag.SEI_ENABLED,
    color: '--default-module-border',
    shortLabel: 'common.purpose.sei.shortName',
    moduleIntro: 'common.moduleIntro.insights'
  }
}

export interface GroupConfig {
  label: StringKeys
  items: NavModuleName[]
}

// Grouping of modules with label
export const moduleGroupConfig: GroupConfig[] = [
  {
    label: 'common.moduleList.buildAndTest',
    items: [ModuleName.CI, ModuleName.CHAOS, ModuleName.STO, ModuleName.CET]
  },
  {
    label: 'common.moduleList.deployChanges',
    items: [ModuleName.CD, ModuleName.CF, ModuleName.IACM]
  },
  {
    label: 'common.moduleList.manageImpact',
    items: [ModuleName.CE, ModuleName.CV, ModuleName.SSCA, ModuleName.SEI]
  },
  {
    label: 'common.moduleList.optimizeProcesses',
    items: [ModuleName.IDP]
  }
]

const getModuleInfo = (
  moduleInfo: ModuleInfo,
  accountId: string,
  hasLicense: boolean,
  shouldVisible: boolean,
  color: string,
  backgroundColor?: string,
  isNewSidenavEnabled?: boolean
): useNavModuleInfoReturnType => {
  const { icon: moduleIcon, label, getHomePageUrl, shortLabel, moduleIntro, isNew } = moduleInfo

  return {
    icon: moduleIcon,
    label,
    homePageUrl: getHomePageUrl(accountId, isNewSidenavEnabled as boolean),
    shouldVisible: shouldVisible,
    hasLicense,
    color,
    backgroundColor,
    shortLabel,
    moduleIntro,
    isNew
  }
}

const shouldBeVisible = (
  module: NavModuleName,
  featureFlags: Partial<Record<FeatureFlag, boolean>>,
  licenseInformation: { [key: string]: ModuleLicenseDTO } | Record<string, undefined>,
  isCommunity: boolean
): boolean => {
  const featureFlagName = moduleInfoMap[module]?.featureFlagName
  // For community version - only CD module is applicable, all the other modules are hidden.
  if (isCommunity && module !== ModuleName.CD) {
    return false
  } else if (module === ModuleName.CV) {
    return Boolean(
      licenseInformation[ModuleName.CV]?.status === 'ACTIVE' ||
        licenseInformation[ModuleName.CD]?.status === 'ACTIVE' ||
        (featureFlagName && !!featureFlags[featureFlagName])
    )
  }

  return featureFlagName !== undefined && featureFlags[featureFlagName] !== undefined
    ? !!featureFlags[featureFlagName]
    : true
}

const useNavModuleInfo = (module: NavModuleName) => {
  const { accountId } = useParams<AccountPathProps>()
  const featureFlags = useFeatureFlags()
  const { licenseInformation } = useLicenseStore()
  const isCommunity = useGetCommunity()
  const { color, backgroundColor } = moduleInfoMap[module]

  const moduleInfo = getModuleInfo(
    moduleInfoMap[module],
    accountId,
    !!licenseInformation[module]?.id,
    shouldBeVisible(module, featureFlags, licenseInformation, isCommunity),
    color,
    backgroundColor
  ) as useNavModuleInfoReturnType

  return moduleInfo
}

export const useNavModuleInfoMap = (): Record<NavModuleName, useNavModuleInfoReturnType> => {
  const { accountId } = useParams<AccountPathProps>()
  const featureFlags = useFeatureFlags()
  const { isNewNavEnabled } = useAppStore()
  const isCommunity = useGetCommunity()

  const { licenseInformation } = useLicenseStore()

  const modules = Object.keys(moduleInfoMap) as NavModuleName[]

  const infoMap = modules.reduce((map, module) => {
    return {
      ...map,
      [module]: getModuleInfo(
        moduleInfoMap[module],
        accountId,
        !!licenseInformation[module]?.id,
        shouldBeVisible(module, featureFlags, licenseInformation, isCommunity),
        moduleInfoMap[module].color,
        '',
        isNewNavEnabled
      )
    }
  }, {})

  return infoMap as Record<NavModuleName, useNavModuleInfoReturnType>
}

export default useNavModuleInfo
