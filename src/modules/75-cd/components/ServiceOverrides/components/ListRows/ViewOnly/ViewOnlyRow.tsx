import React from 'react'

import { Icon, IconName, Layout, Text } from '@harness/uicore'

import { defaultTo } from 'lodash-es'
import { Color } from '@harness/design-system'
import { useStrings } from 'framework/strings'

import {
  ApplicationSettingsOverrideDetails,
  ConfigFileOverrideDetails,
  ConnectionStringsOverrideDetails,
  ManifestOverrideDetails,
  overridesLabelStringMap,
  overridesTypeIconMap,
  OverrideTypes,
  ServiceOverrideRowProps,
  VariableOverrideDetails
} from '@cd/components/ServiceOverrides/ServiceOverridesUtils'

import VariableOverrideInfo from './VariableOverrideInfo'
import RowActionButtons from './RowActionButtons'
import ManifestOverrideInfo from './ManifestOverrideInfo'
import ConfigFileOverrideInfo from './ConfigFileOverrideInfo'
import ApplicationSettingOverrideInfo from './ApplicationSettingOverrideInfo'
import ConnectionStringOverrideInfo from './ConnectionStringOverrideInfo'

import css from '../ListRows.module.scss'

export default function ViewOnlyRow({
  rowIndex,
  overrideDetails,
  sectionIndex
}: Pick<Required<ServiceOverrideRowProps>, 'rowIndex' | 'overrideDetails'> & {
  sectionIndex: number
}): React.ReactElement | null {
  const { getString } = useStrings()

  const { overrideType } = overrideDetails

  return (
    <Layout.Horizontal flex={{ justifyContent: 'flex-start', alignItems: 'center' }}>
      <Layout.Horizontal flex={{ justifyContent: 'flex-start', alignItems: 'center' }} width={300}>
        <Icon
          name={overridesTypeIconMap[overrideType] as IconName}
          color={Color.PRIMARY_5}
          size={16}
          margin={{ right: 'xsmall' }}
        />
        <Text lineClamp={1}>{getString(overridesLabelStringMap[overrideType])}</Text>
      </Layout.Horizontal>
      <Layout.Horizontal
        key={'common.serviceOverrides.overrideInfo'}
        flex={{ justifyContent: 'space-between' }}
        className={css.flexGrow}
      >
        <Layout.Horizontal padding={{ right: 'small' }} className={css.flexWrap}>
          {overrideType === OverrideTypes.VARIABLE && (
            <VariableOverrideInfo {...(overrideDetails as VariableOverrideDetails).variableValue} />
          )}
          {overrideType === OverrideTypes.MANIFEST && (
            <ManifestOverrideInfo {...(overrideDetails as ManifestOverrideDetails).manifestValue} />
          )}
          {overrideType === OverrideTypes.CONFIG && (
            <ConfigFileOverrideInfo {...(overrideDetails as ConfigFileOverrideDetails).configFileValue} />
          )}
          {overrideType === OverrideTypes.APPLICATIONSETTING && (
            <ApplicationSettingOverrideInfo
              {...(overrideDetails as ApplicationSettingsOverrideDetails).applicationSettingsValue}
            />
          )}
          {overrideType === OverrideTypes.CONNECTIONSTRING && (
            <ConnectionStringOverrideInfo
              {...(overrideDetails as ConnectionStringsOverrideDetails).connectionStringsValue}
            />
          )}
        </Layout.Horizontal>
        <RowActionButtons
          rowIndex={rowIndex}
          sectionIndex={sectionIndex}
          environmentRef={overrideDetails['environmentRef']}
          serviceRef={defaultTo(overrideDetails['serviceRef'], '')}
        />
      </Layout.Horizontal>
    </Layout.Horizontal>
  )
}
