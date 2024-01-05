/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { pick } from 'lodash-es'
import { useStrings } from 'framework/strings'
import routesV2 from '@common/RouteDefinitionsV2'
import routes from '@common/RouteDefinitions'
import { StartTrialTemplate } from '@rbac/components/TrialHomePageTemplate/StartTrialTemplate'
import { useStartFreeLicense, ResponseModuleLicenseDTO } from 'services/cd-ng'
import { useToaster } from '@common/components'
import { handleUpdateLicenseStore, useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import type { Module } from 'framework/types/ModuleName'
import { getModuleToDefaultURLMap } from 'framework/LicenseStore/licenseStoreUtil'
import type { AccountPathProps } from '@common/interfaces/RouteInterfaces'
import { ModuleLicenseType } from '@common/constants/SubscriptionTypes'
import { getGaClientID, getSavedRefererURL, isOnPrem } from '@common/utils/utils'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { useQueryParams } from '@common/hooks'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import bgImage from './images/cehomebg.svg'

const CETrialHomePage: React.FC = () => {
  const { getString } = useStrings()
  const { accountId } = useParams<AccountPathProps>()
  const history = useHistory()
  const { licenseInformation, updateLicenseStore } = useLicenseStore()
  const { experience } = useQueryParams<{ experience?: ModuleLicenseType }>()
  const isFreeEnabled = !isOnPrem()
  const module = 'ce' as Module
  const moduleType = 'CE'
  const isDefaultProjectCreated = useFeatureFlag(FeatureFlag.CREATE_DEFAULT_PROJECT)
  const { isNewNavEnabled } = useAppStore()

  const refererURL = getSavedRefererURL()
  const gaClientID = getGaClientID()
  const { mutate: startFreePlan } = useStartFreeLicense({
    queryParams: {
      accountIdentifier: accountId,
      moduleType,
      ...(refererURL ? { referer: refererURL } : {}),
      ...(gaClientID ? { gaClientId: gaClientID } : {})
    },
    requestOptions: {
      headers: {
        'content-type': 'application/json'
      }
    }
  })

  const { showError } = useToaster()

  function startPlan(): Promise<ResponseModuleLicenseDTO> {
    return handleStartFree()
  }

  const handleStartFree = async (): Promise<ResponseModuleLicenseDTO> => {
    const data = await startFreePlan()
    if (isDefaultProjectCreated) {
      const moduleUrlWithDefaultProject = getModuleToDefaultURLMap(accountId, module as Module)[module]
      history.push(
        moduleUrlWithDefaultProject
          ? (moduleUrlWithDefaultProject as string)
          : isNewNavEnabled
          ? routesV2.toCEHome({ accountId, module })
          : routes.toCEHome({ accountId })
      )
    } else {
      history.push(isNewNavEnabled ? routesV2.toCEOverview({ accountId, module }) : routes.toCEOverview({ accountId }))
    }
    return data
  }

  const handleStartTrial = async (): Promise<void> => {
    try {
      const data = await startPlan()

      const expiryTime = data?.data?.expiryTime

      const updatedLicenseInfo = data?.data && {
        ...licenseInformation?.[moduleType],
        ...pick(data?.data, ['licenseType', 'edition']),
        expiryTime
      }

      handleUpdateLicenseStore({ ...licenseInformation }, updateLicenseStore, module as Module, updatedLicenseInfo)
      history.push(isNewNavEnabled ? routesV2.toCEOverview({ accountId, module }) : routes.toCEOverview({ accountId }))
    } catch (error) {
      showError(error.data?.message)
    }
  }

  const startBtnDescription = isFreeEnabled
    ? getString('common.startFreePlan', { module: 'CCM' })
    : getString('ce.ceTrialHomePage.startTrial.startBtn.description')

  const startTrialProps = {
    description: getString('ce.homepage.slogan'),
    learnMore: {
      description: getString('ce.learnMore'),
      url: 'https://docs.harness.io/article/dvspc6ub0v-create-cost-perspectives'
    },
    startBtn: {
      description: startBtnDescription,
      onClick: handleStartTrial
    }
  }

  useEffect(() => {
    if (experience) {
      history.push(isNewNavEnabled ? routesV2.toCEOverview({ accountId, module }) : routes.toCEOverview({ accountId }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experience])

  return (
    <StartTrialTemplate
      title={getString('common.purpose.ce.continuous')}
      bgImageUrl={bgImage}
      startTrialProps={startTrialProps}
      module={module}
    />
  )
}

export default CETrialHomePage
