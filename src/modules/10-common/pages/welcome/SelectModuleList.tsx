/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useLayoutEffect, useRef, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import type { IconName } from '@harness/uicore'
import { upperCase, throttle } from 'lodash-es'
import { useTelemetry } from '@common/hooks/useTelemetry'
import routes from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import {
  ModuleLicenseDTO,
  ResponseModuleLicenseDTO,
  StartFreeLicenseQueryParams,
  useStartFreeLicense,
  useUpdateAccountDefaultExperienceNG
} from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import { Experiences } from '@common/constants/Utils'
import { useToaster } from '@common/components'
import { useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { Category, PurposeActions } from '@common/constants/TrackingConstants'
import type { ProjectPathProps, Module as RouteModule } from '@common/interfaces/RouteInterfaces'
import {
  getLicenseStateNameByModuleType,
  getModuleToDefaultURLMap,
  LICENSE_STATE_VALUES
} from 'framework/LicenseStore/licenseStoreUtil'
import { getGaClientID, getSavedRefererURL } from '@common/utils/utils'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { Module, moduleToModuleNameMapping } from 'framework/types/ModuleName'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import type { PLG_CD_GET_STARTED_VARIANTS } from '@common/components/ConfigureOptions/constants'
import ModuleCard from './ModuleCard'
import css from './WelcomePage.module.scss'

interface ModuleProps {
  enabled: boolean
  titleIcon: IconName
  bodyIcon: IconName
  module: RouteModule
  description: string
}

interface SelectModuleListProps {
  onModuleClick: (module?: Module) => void
  moduleList: ModuleProps[]
  getStartedVariant?: string
}

const SelectModuleList: React.FC<SelectModuleListProps> = ({ onModuleClick, moduleList, getStartedVariant }) => {
  const [selected, setSelected] = useState<Module>('ci')
  const { isNewNavEnabled } = useAppStore()
  const { CREATE_DEFAULT_PROJECT, AUTO_FREE_MODULE_LICENSE } = useFeatureFlags()
  const { licenseInformation, updateLicenseStore } = useLicenseStore()
  const { getString } = useStrings()
  const { accountId } = useParams<ProjectPathProps>()
  const { trackEvent } = useTelemetry()
  const { showError } = useToaster()
  const { mutate: updateDefaultExperience, loading: updatingDefaultExperience } = useUpdateAccountDefaultExperienceNG({
    accountIdentifier: accountId
  })

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: innerHeight })
  const ref = useRef<HTMLDivElement>(null)
  const { mutate } = useStartFreeLicense({
    queryParams: { accountIdentifier: accountId, moduleType: '' as StartFreeLicenseQueryParams['moduleType'] },
    requestOptions: {
      headers: {
        'content-type': 'application/json'
      }
    }
  })
  const handleModuleSelection = (module: RouteModule): void => {
    setSelected(module as Module)
    onModuleClick(module as Module)
  }

  const history = useHistory()
  const startFreeLicense = async (): Promise<ResponseModuleLicenseDTO> => {
    const refererURL = getSavedRefererURL()
    const gaClientID = getGaClientID()
    return mutate(undefined, {
      queryParams: {
        accountIdentifier: accountId,
        moduleType: moduleToModuleNameMapping[selected as Module] as StartFreeLicenseQueryParams['moduleType'],
        ...(refererURL ? { referer: refererURL } : {}),
        ...(gaClientID ? { gaClientId: gaClientID } : {})
      }
    })
  }
  const getButtonProps = (buttonType: string): { clickHandle?: () => Promise<void>; disabled?: boolean } => {
    switch (buttonType) {
      case 'ci':
      case 'cd':
      case 'ce':
      case 'cv':
      case 'cf':
      case 'chaos':
        return {
          clickHandle: async () => {
            trackEvent(PurposeActions.ModuleContinue, { category: Category.SIGNUP, module: buttonType })
            try {
              if (AUTO_FREE_MODULE_LICENSE) {
                await updateDefaultExperience({
                  defaultExperience: Experiences.NG
                })
                const licenseStateName = getLicenseStateNameByModuleType(selected as Module)
                const hasFreeLicense = licenseInformation[upperCase(selected)]?.edition === 'FREE'
                if (!hasFreeLicense) {
                  const licenseResponse = await startFreeLicense()

                  updateLicenseStore({
                    licenseInformation: {
                      ...licenseInformation,
                      [moduleToModuleNameMapping[selected as Module]]: licenseResponse.data as ModuleLicenseDTO
                    } as { [key: string]: ModuleLicenseDTO },
                    [licenseStateName]: LICENSE_STATE_VALUES.ACTIVE
                  })
                }
                const defaultURL = getModuleToDefaultURLMap(
                  accountId,
                  selected as Module,
                  getStartedVariant as PLG_CD_GET_STARTED_VARIANTS
                )[selected as Module]
                if (CREATE_DEFAULT_PROJECT) {
                  history.push(defaultURL)
                } else if (isNewNavEnabled) {
                  history.push(routesV2.toModuleHome({ accountId, module: buttonType, source: 'purpose' }))
                } else {
                  history.push(routes.toModuleHome({ accountId, module: buttonType, source: 'purpose' }))
                }
              } else {
                updateDefaultExperience({
                  defaultExperience: Experiences.NG
                }).then(() => {
                  if (isNewNavEnabled) {
                    history.push(routesV2.toModuleHome({ accountId, module: buttonType, source: 'purpose' }))
                  } else {
                    history.push(routes.toModuleHome({ accountId, module: buttonType, source: 'purpose' }))
                  }
                })
              }
            } catch (error) {
              showError(error.data?.message || getString('somethingWentWrong'))
            }
          },
          disabled: updatingDefaultExperience
        }
      default:
        return {}
    }
  }

  const moduleListElements = moduleList.map(option => {
    const buttonProp: { clickHandle?: () => Promise<void>; disabled?: boolean } = getButtonProps(option.module)

    return (
      <ModuleCard
        key={option.module}
        option={option}
        onClick={handleModuleSelection}
        selected={selected === option.module}
        buttonText={getString('continue')}
        buttonDisabled={buttonProp.disabled}
        handleButtonClick={buttonProp.clickHandle}
      />
    )
  })

  useLayoutEffect(() => {
    const resize = throttle((): void => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }, 200)
    window.addEventListener('resize', resize)
    resize()
    const removeListener = (): void => window.removeEventListener('resize', resize)

    return removeListener
  }, [])

  const wWI = dimensions.width
  const wHI = dimensions.height
  const scaleW = Math.max(wWI / 1920, 1)
  const scaleH = Math.max(wHI / 1080, 1)
  const scale = Math.min(scaleH, scaleW)

  let topMarginAdd = 0
  let leftMarginAdd = 0
  if (scale > 1 && ref !== null && ref !== undefined) {
    const height = ref?.current?.clientHeight
    const width = ref?.current?.clientWidth
    topMarginAdd = height ? (height * (scale - 1)) / 3 : 0
    leftMarginAdd = width ? (width * (scale - 1)) / 3 : 0
  }
  return (
    <div
      ref={ref}
      className={css.moduleList}
      style={{ transform: `scale(${scale}) translate(${leftMarginAdd}px,${topMarginAdd}px)` }}
    >
      {moduleListElements}
    </div>
  )
}

export default SelectModuleList
