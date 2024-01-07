/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import moment from 'moment'
import { useParams } from 'react-router-dom'
import { isEmpty, isEqual, cloneDeep } from 'lodash-es'

import { PageSpinner } from '@harness/uicore'
import { useDeepCompareEffect } from '@common/hooks'
import { useAppStore } from 'framework/AppStore/AppStoreContext'

import {
  getLastModifiedTimeForAllModuleTypesPromise,
  ModuleLicenseDTO,
  useGetAccountLicenses,
  useGetLastModifiedTimeForAllModuleTypes
} from 'services/cd-ng'
import { ModuleName } from 'framework/types/ModuleName'
import type { Module } from '@common/interfaces/RouteInterfaces'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import GenericErrorPage, { GENERIC_ERROR_CODES } from '@common/pages/GenericError/GenericErrorPage'
import { Editions } from '@common/constants/SubscriptionTypes'
import { useStrings } from 'framework/strings'
import { FeatureIdentifier } from 'framework/featureStore/FeatureIdentifier'
import { useFeaturesContext } from 'framework/featureStore/FeaturesContext'
import { useIsPublicAccess } from 'framework/hooks/usePublicAccess'
import { VersionMap, LICENSE_STATE_VALUES, defaultLicensesByModule } from './licenseStoreUtil'

// Only keep GA modules for now
export interface LicenseStoreContextProps {
  readonly licenseInformation: { [key: string]: ModuleLicenseDTO } | Record<string, undefined>
  readonly versionMap: VersionMap
  readonly CI_LICENSE_STATE: LICENSE_STATE_VALUES
  readonly FF_LICENSE_STATE: LICENSE_STATE_VALUES
  readonly CCM_LICENSE_STATE: LICENSE_STATE_VALUES
  readonly CD_LICENSE_STATE: LICENSE_STATE_VALUES
  readonly CHAOS_LICENSE_STATE: LICENSE_STATE_VALUES
  readonly STO_LICENSE_STATE: LICENSE_STATE_VALUES
  readonly CV_LICENSE_STATE: LICENSE_STATE_VALUES
  readonly CET_LICENSE_STATE: LICENSE_STATE_VALUES
  readonly SEI_LICENSE_STATE: LICENSE_STATE_VALUES
  readonly CODE_LICENSE_STATE: LICENSE_STATE_VALUES
  readonly IDP_LICENSE_STATE: LICENSE_STATE_VALUES

  updateLicenseStore(data: Partial<Pick<LicenseStoreContextProps, 'licenseInformation'>>): void
}

export interface LicenseRedirectProps {
  licenseStateName: keyof Omit<LicenseStoreContextProps, 'licenseInformation' | 'updateLicenseStore' | 'versionMap'>
  startTrialRedirect: () => React.ReactElement
  expiredTrialRedirect: () => React.ReactElement
}

type licenseStateNames = keyof Omit<
  LicenseStoreContextProps,
  'licenseInformation' | 'updateLicenseStore' | 'versionMap'
>

export const LICENSE_STATE_NAMES: { [T in licenseStateNames]: T } = {
  CI_LICENSE_STATE: 'CI_LICENSE_STATE',
  FF_LICENSE_STATE: 'FF_LICENSE_STATE',
  CCM_LICENSE_STATE: 'CCM_LICENSE_STATE',
  CD_LICENSE_STATE: 'CD_LICENSE_STATE',
  CHAOS_LICENSE_STATE: 'CHAOS_LICENSE_STATE',
  STO_LICENSE_STATE: 'STO_LICENSE_STATE',
  CV_LICENSE_STATE: 'CV_LICENSE_STATE',
  CET_LICENSE_STATE: 'CET_LICENSE_STATE',
  SEI_LICENSE_STATE: 'SEI_LICENSE_STATE',
  CODE_LICENSE_STATE: 'CODE_LICENSE_STATE',
  IDP_LICENSE_STATE: 'IDP_LICENSE_STATE'
}

export const LicenseStoreContext = React.createContext<LicenseStoreContextProps>({
  licenseInformation: {},
  versionMap: {},
  CI_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED,
  FF_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED,
  CCM_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED,
  CD_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED,
  CHAOS_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED,
  STO_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED,
  CV_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED,
  CET_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED,
  SEI_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED,
  CODE_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED,
  IDP_LICENSE_STATE: LICENSE_STATE_VALUES.NOT_STARTED,
  updateLicenseStore: () => void 0
})

export function useLicenseStore(): LicenseStoreContextProps {
  return React.useContext(LicenseStoreContext)
}

export function LicenseStoreProvider(props: React.PropsWithChildren<unknown>): React.ReactElement {
  const { currentUserInfo } = useAppStore()
  const { NG_LICENSES_ENABLED } = useFeatureFlags()
  const isPublicAccess = useIsPublicAccess()
  const { getString } = useStrings()
  const { accountId } = useParams<{
    accountId: string
  }>()

  const { accounts } = currentUserInfo

  const createdFromNG = accounts?.find(account => account.uuid === accountId)?.createdFromNG

  // If the user has been created from NG signup we will always enforce licensing
  // If the user is a CG user we will look at the NG_LICENSES_ENABLED feature flag to determine whether or not we should enforce licensing
  const shouldLicensesBeDisabled = !createdFromNG && !NG_LICENSES_ENABLED

  const defaultLicenses = cloneDeep(defaultLicensesByModule)

  const [state, setState] = useState<Omit<LicenseStoreContextProps, 'updateLicenseStore' | 'strings'>>({
    licenseInformation: shouldLicensesBeDisabled ? defaultLicenses : {},
    versionMap: {},
    CI_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : LICENSE_STATE_VALUES.NOT_STARTED,
    FF_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : LICENSE_STATE_VALUES.NOT_STARTED,
    CCM_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : LICENSE_STATE_VALUES.NOT_STARTED,
    CD_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : LICENSE_STATE_VALUES.NOT_STARTED,
    CHAOS_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : LICENSE_STATE_VALUES.NOT_STARTED,
    STO_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : LICENSE_STATE_VALUES.NOT_STARTED,
    CV_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : LICENSE_STATE_VALUES.NOT_STARTED,
    CET_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : LICENSE_STATE_VALUES.NOT_STARTED,
    SEI_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : LICENSE_STATE_VALUES.NOT_STARTED,
    CODE_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : LICENSE_STATE_VALUES.NOT_STARTED,
    IDP_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : LICENSE_STATE_VALUES.NOT_STARTED
  })

  const {
    data: accountLicensesData,
    refetch: getAccountLicenses,
    error,
    loading: getAccountLicensesLoading
  } = useGetAccountLicenses({
    queryParams: {
      accountIdentifier: accountId
    },
    lazy: isPublicAccess
  })

  const { mutate: getVersionMap } = useGetLastModifiedTimeForAllModuleTypes({
    queryParams: {
      accountIdentifier: accountId
    },
    requestOptions: {
      headers: {
        'content-type': 'application/json'
      }
    }
  })

  useEffect(() => {
    if (isPublicAccess) {
      // Prevent get-version-map when public access is enabled
      return
    }

    getVersionMap()
      .then(response => {
        setState(prevState => ({
          ...prevState,
          versionMap: response.data || {}
        }))
      })
      .catch(_err => {
        // do nothing
      })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 1000 milliseconds * 60 seconds * 1 minute
  const POLL_VERSION_INTERVAL = 1000 * 60 * 5

  const { requestFeatures } = useFeaturesContext()

  /*
   * this is to poll versionMap every minute
   * if versionMap changes, refresh license
   * and refresh feature context
   * if versionMap call fails, stop calling
   */
  useEffect(() => {
    let getVersionTimeOut = setTimeout(() => {
      pollVersionMap(state.versionMap)
    }, POLL_VERSION_INTERVAL)

    async function pollVersionMap(versionMap: VersionMap): Promise<void> {
      try {
        // We are using promise since mutate was rerendering the whole applications every 60 seconds
        // even if no data change in store
        const response = await getLastModifiedTimeForAllModuleTypesPromise({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          queryParams: { accountIdentifier: accountId, routingId: accountId } as any,
          body: undefined,
          requestOptions: {
            headers: {
              'content-type': 'application/json'
            }
          }
        })
        const latestVersionMap = response.data
        if (latestVersionMap && !isEqual(latestVersionMap, versionMap)) {
          // Prevent get-account-licenses call when public access is enabled
          if (!isPublicAccess) {
            // refresh licenses
            getAccountLicenses()
          }

          // refresh feature context
          requestFeatures(
            { featureName: FeatureIdentifier.BUILDS },
            {
              skipCache: true
            }
          )

          // refresh versionMap
          setState(prevState => ({
            ...prevState,
            versionMap: response.data || {}
          }))
        }

        // set next poll
        getVersionTimeOut = setTimeout(() => {
          pollVersionMap(latestVersionMap || versionMap)
        }, POLL_VERSION_INTERVAL)
      } catch (_err) {
        clearTimeout(getVersionTimeOut)
      }
    }

    return () => {
      clearTimeout(getVersionTimeOut)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [isLoading, setIsLoading] = useState(true)

  const getLicenseState = React.useCallback(
    (expiryTime?: number): LICENSE_STATE_VALUES => {
      if (!expiryTime) {
        return LICENSE_STATE_VALUES.NOT_STARTED
      }

      const days = Math.round(moment(expiryTime).diff(moment.now(), 'days', true))
      const isExpired = days < 0

      if (shouldLicensesBeDisabled) {
        return LICENSE_STATE_VALUES.ACTIVE
      }

      return isExpired ? LICENSE_STATE_VALUES.EXPIRED : LICENSE_STATE_VALUES.ACTIVE
    },
    [shouldLicensesBeDisabled]
  )

  useDeepCompareEffect(() => {
    const allLicenses = accountLicensesData?.data?.allModuleLicenses || {}
    const licenses: { [key: string]: ModuleLicenseDTO } = {}
    Object.keys(allLicenses).forEach((key: string) => {
      const moduleLicenses = allLicenses[key]
      if (moduleLicenses?.length > 0) {
        /**
         * SRM Module's license will be stored under `CV` property name
         */
        const licenseKey = key === ModuleName.SRM ? ModuleName.CV : key
        const activeLicense = moduleLicenses.find(license => license.status === 'ACTIVE')
        if (activeLicense !== undefined) {
          licenses[licenseKey] = activeLicense
        } else {
          licenses[licenseKey] = moduleLicenses[moduleLicenses.length - 1]
        }
      }
    })

    const CIModuleLicenseData = licenses['CI']
    const FFModuleLicenseData = licenses['CF']
    const CCMModuleLicenseData = licenses['CE']
    const CDModuleLicenseData = licenses['CD']
    const ChaosModuleLicenseData = licenses['CHAOS']
    const STOModuleLicenseData = licenses['STO']
    const CVModuleLicenseData = licenses['CV']
    const CETModuleLicenseData = licenses['CET']
    const SEIModuleLicenseData = licenses['SEI']
    const CODEModuleLicenseData = licenses['CODE']
    const IDPModuleLicenseData = licenses['IDP']

    const updatedCILicenseState: LICENSE_STATE_VALUES = getLicenseState(CIModuleLicenseData?.expiryTime)
    const updatedFFLicenseState: LICENSE_STATE_VALUES = getLicenseState(FFModuleLicenseData?.expiryTime)
    const updatedCCMLicenseState: LICENSE_STATE_VALUES = getLicenseState(CCMModuleLicenseData?.expiryTime)
    const updatedCDLicenseState: LICENSE_STATE_VALUES = getLicenseState(CDModuleLicenseData?.expiryTime)
    const updatedChaosLicenseState: LICENSE_STATE_VALUES = getLicenseState(ChaosModuleLicenseData?.expiryTime)
    const updatedSTOLicenseState: LICENSE_STATE_VALUES = getLicenseState(STOModuleLicenseData?.expiryTime)
    const updatedCVLicenseState: LICENSE_STATE_VALUES = getLicenseState(CVModuleLicenseData?.expiryTime)
    const updatedCETLicenseState: LICENSE_STATE_VALUES = getLicenseState(CETModuleLicenseData?.expiryTime)
    const updatedSEILicenseState: LICENSE_STATE_VALUES = getLicenseState(SEIModuleLicenseData?.expiryTime)
    const updatedCODELicenseState: LICENSE_STATE_VALUES = getLicenseState(CODEModuleLicenseData?.expiryTime)
    const updatedIDPLicenseState: LICENSE_STATE_VALUES = getLicenseState(IDPModuleLicenseData?.expiryTime)

    setState(prevState => ({
      ...prevState,
      licenseInformation: shouldLicensesBeDisabled ? { ...defaultLicenses, ...licenses } : licenses,
      CI_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : updatedCILicenseState,
      FF_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : updatedFFLicenseState,
      CCM_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : updatedCCMLicenseState,
      CD_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : updatedCDLicenseState,
      CHAOS_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : updatedChaosLicenseState,
      STO_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : updatedSTOLicenseState,
      CV_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : updatedCVLicenseState,
      CET_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : updatedCETLicenseState,
      SEI_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : updatedSEILicenseState,
      CODE_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : updatedCODELicenseState,
      IDP_LICENSE_STATE: shouldLicensesBeDisabled ? LICENSE_STATE_VALUES.ACTIVE : updatedIDPLicenseState
    }))

    if (!getAccountLicensesLoading && !isEmpty(currentUserInfo)) {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountLicensesData?.data?.allModuleLicenses, currentUserInfo])

  const updateLicenseStore = React.useCallback(
    (
      updateData: Partial<
        Pick<
          LicenseStoreContextProps,
          | 'licenseInformation'
          | 'CI_LICENSE_STATE'
          | 'FF_LICENSE_STATE'
          | 'CCM_LICENSE_STATE'
          | 'CD_LICENSE_STATE'
          | 'CHAOS_LICENSE_STATE'
          | 'STO_LICENSE_STATE'
          | 'CV_LICENSE_STATE'
          | 'CET_LICENSE_STATE'
          | 'SEI_LICENSE_STATE'
          | 'CODE_LICENSE_STATE'
          | 'IDP_LICENSE_STATE'
        >
      >
    ): void => {
      const CIModuleLicenseData = updateData.licenseInformation?.['CI']
      const FFModuleLicenseData = updateData.licenseInformation?.['CF']
      const CCMModuleLicenseData = updateData.licenseInformation?.['CE']
      const CDModuleLicenseData = updateData.licenseInformation?.['CD']
      const ChaosModuleLicenseData = updateData.licenseInformation?.['CHAOS']
      const STOModuleLicenseData = updateData.licenseInformation?.['STO']
      const CVModuleLicenseData = updateData.licenseInformation?.['CV']
      const CETModuleLicenseData = updateData.licenseInformation?.['CET']
      const SEIModuleLicenseData = updateData.licenseInformation?.['SEI']
      const CODEModuleLicenseData = updateData.licenseInformation?.['CODE']
      const IDPModuleLicenseData = updateData.licenseInformation?.['IDP']

      setState(prevState => ({
        ...prevState,
        licenseInformation: updateData.licenseInformation || prevState.licenseInformation,
        CI_LICENSE_STATE: CIModuleLicenseData?.expiryTime
          ? getLicenseState(CIModuleLicenseData.expiryTime)
          : prevState.CI_LICENSE_STATE,
        FF_LICENSE_STATE: FFModuleLicenseData?.expiryTime
          ? getLicenseState(FFModuleLicenseData.expiryTime)
          : prevState.FF_LICENSE_STATE,
        CCM_LICENSE_STATE: CCMModuleLicenseData?.expiryTime
          ? getLicenseState(CCMModuleLicenseData.expiryTime)
          : prevState.CCM_LICENSE_STATE,
        CD_LICENSE_STATE: CDModuleLicenseData?.expiryTime
          ? getLicenseState(CDModuleLicenseData.expiryTime)
          : prevState.CD_LICENSE_STATE,
        CHAOS_LICENSE_STATE: ChaosModuleLicenseData?.expiryTime
          ? getLicenseState(ChaosModuleLicenseData.expiryTime)
          : prevState.CHAOS_LICENSE_STATE,
        STO_LICENSE_STATE: STOModuleLicenseData?.expiryTime
          ? getLicenseState(STOModuleLicenseData.expiryTime)
          : prevState.STO_LICENSE_STATE,
        CV_LICENSE_STATE: CVModuleLicenseData?.expiryTime
          ? getLicenseState(CVModuleLicenseData.expiryTime)
          : prevState.CV_LICENSE_STATE,
        CET_LICENSE_STATE: CETModuleLicenseData?.expiryTime
          ? getLicenseState(CETModuleLicenseData.expiryTime)
          : prevState.CET_LICENSE_STATE,
        SEI_LICENSE_STATE: SEIModuleLicenseData?.expiryTime
          ? getLicenseState(SEIModuleLicenseData.expiryTime)
          : prevState.SEI_LICENSE_STATE,
        CODE_LICENSE_STATE: CODEModuleLicenseData?.expiryTime
          ? getLicenseState(CODEModuleLicenseData.expiryTime)
          : prevState.CODE_LICENSE_STATE,
        IDPModuleLicenseData: IDPModuleLicenseData?.expiryTime
          ? getLicenseState(IDPModuleLicenseData.expiryTime)
          : prevState.IDP_LICENSE_STATE
      }))
    },
    [getLicenseState]
  )

  let childComponent

  if (error) {
    if ((error.data as any)?.code === 'NG_ACCESS_DENIED') {
      childComponent = <GenericErrorPage code={GENERIC_ERROR_CODES.UNAUTHORIZED} />
    } else {
      childComponent = <GenericErrorPage message={getString('common.genericErrors.licenseCallFailed')} />
    }
  } else if (isLoading) {
    childComponent = <PageSpinner />
  } else {
    childComponent = props.children
  }

  return (
    <LicenseStoreContext.Provider
      value={{
        CCM_LICENSE_STATE: state.CCM_LICENSE_STATE,
        CD_LICENSE_STATE: state.CD_LICENSE_STATE,
        CI_LICENSE_STATE: state.CI_LICENSE_STATE,
        FF_LICENSE_STATE: state.FF_LICENSE_STATE,
        CHAOS_LICENSE_STATE: state.CHAOS_LICENSE_STATE,
        STO_LICENSE_STATE: state.STO_LICENSE_STATE,
        CV_LICENSE_STATE: state.CV_LICENSE_STATE,
        CET_LICENSE_STATE: state.CET_LICENSE_STATE,
        SEI_LICENSE_STATE: state.SEI_LICENSE_STATE,
        CODE_LICENSE_STATE: state.CODE_LICENSE_STATE,
        IDP_LICENSE_STATE: state.IDP_LICENSE_STATE,
        licenseInformation: state.licenseInformation,
        versionMap: state.versionMap,
        updateLicenseStore
      }}
    >
      {childComponent}
    </LicenseStoreContext.Provider>
  )
}

export function handleUpdateLicenseStore(
  newLicenseInformation: Record<string, ModuleLicenseDTO> | Record<string, undefined>,
  updateLicenseStore: (data: Partial<Pick<LicenseStoreContextProps, 'licenseInformation'>>) => void,
  module: Module,
  data?: ModuleLicenseDTO
): void {
  if (!data) {
    return
  }
  let licenseStoreData:
    | Partial<
        Pick<
          LicenseStoreContextProps,
          | 'licenseInformation'
          | 'CI_LICENSE_STATE'
          | 'FF_LICENSE_STATE'
          | 'CCM_LICENSE_STATE'
          | 'CD_LICENSE_STATE'
          | 'CHAOS_LICENSE_STATE'
          | 'STO_LICENSE_STATE'
          | 'CV_LICENSE_STATE'
          | 'CET_LICENSE_STATE'
          | 'SEI_LICENSE_STATE'
          | 'CODE_LICENSE_STATE'
          | 'IDP_LICENSE_STATE'
        >
      >
    | undefined
  if (module.toUpperCase() === ModuleName.CI) {
    newLicenseInformation[ModuleName.CI] = data
    licenseStoreData = {
      licenseInformation: newLicenseInformation
    }
  } else if (module.toUpperCase() === ModuleName.CF) {
    newLicenseInformation[ModuleName.CF] = data
    licenseStoreData = {
      licenseInformation: newLicenseInformation
    }
  } else if (module.toUpperCase() === ModuleName.CE) {
    newLicenseInformation[ModuleName.CE] = data
    licenseStoreData = {
      licenseInformation: newLicenseInformation
    }
  } else if (module.toUpperCase() === ModuleName.CD) {
    newLicenseInformation[ModuleName.CD] = data
    licenseStoreData = {
      licenseInformation: newLicenseInformation
    }
  } else if (module.toUpperCase() === ModuleName.CHAOS) {
    newLicenseInformation[ModuleName.CHAOS] = data
    licenseStoreData = {
      licenseInformation: newLicenseInformation
    }
  } else if (module.toUpperCase() === ModuleName.STO) {
    newLicenseInformation[ModuleName.STO] = data
    licenseStoreData = {
      licenseInformation: newLicenseInformation
    }
  } else if (module.toUpperCase() === ModuleName.CV) {
    newLicenseInformation[ModuleName.CV] = data
    licenseStoreData = {
      licenseInformation: newLicenseInformation
    }
  } else if (module.toUpperCase() === ModuleName.CET) {
    newLicenseInformation[ModuleName.CET] = data
    licenseStoreData = {
      licenseInformation: newLicenseInformation
    }
  } else if (module.toUpperCase() === ModuleName.SEI) {
    newLicenseInformation[ModuleName.SEI] = data
    licenseStoreData = {
      licenseInformation: newLicenseInformation
    }
  } else if (module.toUpperCase() === ModuleName.CODE) {
    newLicenseInformation[ModuleName.CODE] = data
  } else if (module.toUpperCase() === ModuleName.IDP) {
    newLicenseInformation[ModuleName.IDP] = data
    licenseStoreData = {
      licenseInformation: newLicenseInformation
    }
  }

  if (licenseStoreData) {
    updateLicenseStore(licenseStoreData)
  }
}

export const isFreePlan = (
  license: { [p: string]: ModuleLicenseDTO } | undefined | Record<string, undefined>,
  moduleName: ModuleName
): boolean => {
  return license?.[moduleName]?.edition === Editions.FREE
}

export const isEnterprisePlan = (
  license: { [p: string]: ModuleLicenseDTO } | undefined | Record<string, undefined>,
  moduleName: ModuleName
): boolean => {
  return license?.[moduleName]?.edition === Editions.ENTERPRISE
}

export const isTeamPlan = (
  license: { [p: string]: ModuleLicenseDTO } | undefined | Record<string, undefined>,
  moduleName: ModuleName
): boolean => {
  return license?.[moduleName]?.edition === Editions.TEAM
}
