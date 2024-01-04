import React from 'react'

import { Layout, Text } from '@harness/uicore'

import { defaultTo } from 'lodash-es'
import { useStrings } from 'framework/strings'

import { useServiceOverridesContext } from '@cd/components/ServiceOverrides/context/ServiceOverrideContext'
import {
  ApplicationSettingsOverrideDetails,
  ConfigFileOverrideDetails,
  ConnectionStringsOverrideDetails,
  ManifestOverrideDetails,
  OverrideTypes,
  ServiceOverrideRowProps,
  VariableOverrideDetails
} from '@cd/components/ServiceOverrides/ServiceOverridesUtils'
import { serviceOverridesConfig } from '@cd/components/ServiceOverrides/ServiceOverridesConfig'

import VariableOverrideInfo from './VariableOverrideInfo'
import RowActionButtons from './RowActionButtons'
import ManifestOverrideInfo from './ManifestOverrideInfo'
import ConfigFileOverrideInfo from './ConfigFileOverrideInfo'
import ApplicationSettingOverrideInfo from './ApplicationSettingOverrideInfo'
import ConnectionStringOverrideInfo from './ConnectionStringOverrideInfo'

import css from '../ListRows.module.scss'

export default function ViewOnlyRow({
  rowIndex,
  overrideDetails
}: Pick<Required<ServiceOverrideRowProps>, 'rowIndex' | 'overrideDetails'>): React.ReactElement | null {
  const { getString } = useStrings()
  const { serviceOverrideType } = useServiceOverridesContext()
  const rowConfigs = serviceOverridesConfig[serviceOverrideType]

  const { overrideType } = overrideDetails

  return (
    <Layout.Horizontal flex={{ justifyContent: 'flex-start', alignItems: 'center' }}>
      {rowConfigs.map(rowConfig => {
        if (rowConfig.accessKey) {
          return (
            <Text lineClamp={1} width={rowConfig.rowWidth} key={rowConfig.value} margin={{ right: 'small' }}>
              {rowConfig.mapper
                ? getString(rowConfig.mapper[overrideDetails[rowConfig.accessKey] as string])
                : overrideDetails[rowConfig.accessKey]}
            </Text>
          )
        } else {
          return (
            <Layout.Horizontal
              key={rowConfig.value}
              flex={{ justifyContent: 'space-between' }}
              className={css.flexGrow}
            >
              <Layout.Horizontal
                border={{ left: true }}
                padding={{ left: 'medium', right: 'small' }}
                className={css.flexWrap}
              >
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
                environmentRef={overrideDetails['environmentRef']}
                serviceRef={defaultTo(overrideDetails['serviceRef'], '')}
              />
            </Layout.Horizontal>
          )
        }
      })}
    </Layout.Horizontal>
  )
}
