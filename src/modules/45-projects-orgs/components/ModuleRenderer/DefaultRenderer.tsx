/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Layout, Icon, Text } from '@harness/uicore'
import { FontVariation, Color } from '@harness/design-system'
import { useStrings } from 'framework/strings'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { isFreePlan, useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { ModuleName } from 'framework/types/ModuleName'
import useNavModuleInfo from '@common/hooks/useNavModuleInfo'
import { LICENSE_STATE_VALUES } from 'framework/LicenseStore/licenseStoreUtil'
import css from './ModuleRenderer.module.scss'

const DefaultRenderer: React.FC = () => {
  const { getString } = useStrings()
  const { CVNG_ENABLED } = useFeatureFlags()
  const { FF_LICENSE_STATE, licenseInformation } = useLicenseStore()
  const { shouldVisible } = useNavModuleInfo(ModuleName.CD)

  return (
    <Layout.Vertical padding={{ top: 'xlarge' }} className={css.started}>
      <Text font={{ variation: FontVariation.TINY_SEMI }} color={Color.GREY_400} padding={{ bottom: 'xsmall' }}>
        {getString('modules')}
      </Text>
      <Layout.Horizontal spacing="small">
        {shouldVisible ? <Icon name="cd-main" size={20} /> : null}
        <Icon name="ci-main" size={20} />
        {FF_LICENSE_STATE === LICENSE_STATE_VALUES.ACTIVE ? <Icon name="cf-main" size={20} /> : null}
        {licenseInformation['CE']?.status === LICENSE_STATE_VALUES.ACTIVE ? <Icon name="ce-main" size={20} /> : null}
        {CVNG_ENABLED ? <Icon name="cv-main" size={20} /> : null}
        {licenseInformation['CHAOS']?.status === LICENSE_STATE_VALUES.ACTIVE ? (
          <Icon name="chaos-main" size={20} />
        ) : null}
        {licenseInformation['STO']?.status === LICENSE_STATE_VALUES.ACTIVE ||
        (licenseInformation['CI']?.status === LICENSE_STATE_VALUES.ACTIVE &&
          isFreePlan(licenseInformation, ModuleName.CI)) ? (
          <Icon name="sto-color-filled" size={20} />
        ) : null}
        {licenseInformation[ModuleName.CET]?.status === LICENSE_STATE_VALUES.ACTIVE ? (
          <Icon name="cet" size={20} />
        ) : null}
        {licenseInformation[ModuleName.SEI]?.status === LICENSE_STATE_VALUES.ACTIVE ? (
          <Icon name="sei-main" size={20} />
        ) : null}
        {licenseInformation[ModuleName.IDP]?.status === LICENSE_STATE_VALUES.ACTIVE ? (
          <Icon name="idp" size={20} />
        ) : null}
      </Layout.Horizontal>
    </Layout.Vertical>
  )
}

export default DefaultRenderer
