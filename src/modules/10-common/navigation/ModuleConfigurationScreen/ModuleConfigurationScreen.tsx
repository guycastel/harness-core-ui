/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import { Layout, Container, Text } from '@harness/uicore'
import cx from 'classnames'
import { Color, FontVariation } from '@harness/design-system'
import { Icon } from '@harness/icons'
import { PageSpinner } from '@common/components'
import { DEFAULT_MODULES_ORDER, NavModuleName, useNavModuleInfoMap } from '@common/hooks/useNavModuleInfo'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import { String } from 'framework/strings'
import { useTelemetry } from '@modules/10-common/hooks/useTelemetry'
import { NavActions } from '@modules/10-common/constants/TrackingConstants'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import ModuleSortableList from './ModuleSortableList/ModuleSortableList'
import ModuleCarousel from './ModuleDetailsSection/ModuleCarousel'
import useGetContentfulModules from './useGetContentfulModules'
import NavModule from '../ModuleList/NavModule/NavModule'
import css from './ModuleConfigurationScreen.module.scss'

interface ModulesConfigurationScreenProps {
  onClose: () => void
  className?: string
  hideReordering?: boolean
  hideHeader?: boolean
  activeModuleIndex?: number
  readOnly?: boolean
}

interface ModuleConfigHeaderProps {
  onDefaultSettingsClick?: () => void
  isLightThemed?: boolean
  readOnlyConfig?: boolean
}

export interface ModulesPreferenceStoreData {
  orderedModules: NavModuleName[]
  selectedModules: NavModuleName[]
}

export const MODULES_CONFIG_PREFERENCE_STORE_KEY = 'modulesConfiguration'

const ModuleConfigHeader: React.FC<ModuleConfigHeaderProps> = ({ isLightThemed, readOnlyConfig }) => {
  return (
    <>
      {readOnlyConfig ? (
        <Text margin={{ top: 'huge' }} flex={{ justifyContent: 'flex-start' }}>
          <Text inline color={Color.BLACK} font={{ variation: FontVariation.H2 }}>
            <String stringID="common.moduleConfig.readOnlyModules" />
          </Text>
        </Text>
      ) : (
        <>
          <Text inline margin={{ bottom: 'xsmall' }} flex={{ justifyContent: 'flex-start' }}>
            <Text inline color={isLightThemed ? Color.BLACK : Color.WHITE} font={{ variation: FontVariation.H2 }}>
              {isLightThemed ? (
                <String stringID="common.moduleConfig.selectModulesNav" />
              ) : (
                <String stringID="common.moduleConfig.selectModules" />
              )}
            </Text>
            <Text inline color={Color.PRIMARY_5} className={css.blueText} margin={{ left: 'small', right: 'small' }}>
              <String stringID="common.moduleConfig.your" />
            </Text>
            <Text inline color={isLightThemed ? Color.BLACK : Color.WHITE} font={{ variation: FontVariation.H2 }}>
              <String stringID="common.moduleConfig.navigation" />
            </Text>
          </Text>
          <Text className={css.defaultSettingsTextContainer}>
            <Text font={{ variation: FontVariation.SMALL }} color={isLightThemed ? Color.BLACK : Color.GREY_200} inline>
              (<String stringID="common.moduleConfig.autoSaved" />)
            </Text>
          </Text>
        </>
      )}
    </>
  )
}

const ModulesConfigurationScreen: React.FC<ModulesConfigurationScreenProps> = ({
  onClose,
  className,
  hideReordering,
  activeModuleIndex: activeModuleIndexFromProps,
  hideHeader,
  readOnly
}) => {
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0)
  const { setPreference: setModuleConfigPreference, preference: { orderedModules = [], selectedModules = [] } = {} } =
    usePreferenceStore<ModulesPreferenceStoreData>(PreferenceScope.USER, MODULES_CONFIG_PREFERENCE_STORE_KEY)
  const { isNewNavEnabled: isLightThemed } = useAppStore()
  const { contentfulModuleMap, loading } = useGetContentfulModules(isLightThemed)
  const { trackEvent } = useTelemetry()
  const readOnlyConfig = readOnly && isLightThemed

  const moduleMap = useNavModuleInfoMap()
  useEffect(() => {
    if (typeof activeModuleIndexFromProps !== 'undefined') {
      setActiveModuleIndex(activeModuleIndexFromProps)
    }
  }, [activeModuleIndexFromProps])

  useEffect(() => {
    // Handle case when new module is added
    if (!orderedModules || orderedModules.length === 0) {
      setModuleConfigPreference({
        selectedModules,
        orderedModules: DEFAULT_MODULES_ORDER
      })
    }
  }, [orderedModules])

  // When Module Configuration Screen is open and user tries to go back & forth using browser's navigation, module configuration screen is closed and user can see the visited page without the screen overlay
  useEffect(() => {
    window.addEventListener('popstate', onClose)
    return () => {
      window.removeEventListener('popstate', onClose)
    }
  }, [])

  const activeModule = orderedModules[activeModuleIndex]

  return (
    <Layout.Vertical
      className={cx(css.container, className, {
        [css.lightContainer]: isLightThemed,
        [css.readOnlyContainer]: readOnlyConfig
      })}
      padding={{ left: 'xlarge' }}
    >
      <Container className={css.header} padding={isLightThemed && { left: 'huge' }}>
        {!hideHeader ? (
          <ModuleConfigHeader isLightThemed={isLightThemed} />
        ) : readOnlyConfig ? (
          <ModuleConfigHeader isLightThemed={isLightThemed} readOnlyConfig={readOnlyConfig} />
        ) : null}
      </Container>
      <Layout.Horizontal
        padding={{
          bottom: 'huge',
          right: 'huge',
          ...(isLightThemed && { left: 'huge' })
        }}
        margin={{ bottom: 'xxxlarge' }}
        className={css.body}
      >
        <Container margin={{ right: 'xxlarge' }} className={css.sortableListContainer}>
          {!hideReordering ? (
            <ModuleSortableList
              activeModule={activeModule}
              onSelect={setActiveModuleIndex}
              orderedModules={orderedModules}
              selectedModules={selectedModules}
              handleUpdate={(updatedOrder, selected) => {
                trackEvent(NavActions.moduleConfigChange, {
                  updatedOrder,
                  currentSelectedModules: selectedModules,
                  newSelectedModules: selected
                })
                setModuleConfigPreference({ orderedModules: updatedOrder, selectedModules: selected })
              }}
            />
          ) : readOnlyConfig ? (
            orderedModules
              .filter(module => Boolean(moduleMap[module].shouldVisible))
              .map(module => (
                <NavModule
                  module={module}
                  active={activeModule === module}
                  onClick={() => setActiveModuleIndex(orderedModules.indexOf(module))}
                  theme={isLightThemed ? 'LIGHT' : 'DARK'}
                  key={module}
                  className={css.readOnlyNavModule}
                  readOnly={readOnlyConfig}
                />
              ))
          ) : null}
        </Container>

        <Container className={css.flex1}>
          {loading ? (
            <PageSpinner />
          ) : (
            <ModuleCarousel
              key={activeModule}
              module={activeModule}
              data={contentfulModuleMap?.[activeModule]}
              readOnly={readOnlyConfig}
            />
          )}
        </Container>
      </Layout.Horizontal>

      <Icon
        name="cross"
        color={isLightThemed ? Color.BLACK : Color.WHITE}
        size={18}
        className={css.crossIcon}
        onClick={onClose}
      />
    </Layout.Vertical>
  )
}

export default ModulesConfigurationScreen
