import React, { useCallback } from 'react'
import { useFormikContext } from 'formik'
import { get } from 'lodash-es'

import { AllowedTypes, FormInput, MultiTypeInputType } from '@harness/uicore'
import { useStrings } from 'framework/strings'

import type {
  ApplicationSettingsConfiguration,
  ConfigFileWrapper,
  ConnectionStringsConfiguration,
  ManifestConfigWrapper
} from 'services/cd-ng'

import { OverrideTypes, overridesLabelStringMap } from '@cd/components/ServiceOverrides/ServiceOverridesUtils'
import { useServiceOverridesContext } from '@cd/components/ServiceOverrides/context/ServiceOverrideContext'
import useManifestOverride from './useManifestOverride'
import useConfigFileOverride from './useConfigFileOverride'
import useApplicationSettingOverride from './useApplicationSettingOverride'
import useConnectionStringOverride from './useConnectionStringOverride'

export default function OverrideTypeInput({
  readonly,
  overrideDetailIndex
}: {
  readonly?: boolean
  overrideDetailIndex: number
}): React.ReactElement {
  const { getString } = useStrings()
  const { setFieldValue, values } = useFormikContext()
  const { serviceOverrideType } = useServiceOverridesContext()

  const uniqueRowId = get(values, `${overrideDetailIndex}.id`)

  const handleOverrideSubmit = useCallback(
    (
      overrideObj:
        | ManifestConfigWrapper
        | ConfigFileWrapper
        | ApplicationSettingsConfiguration
        | ConnectionStringsConfiguration,
      type: string
    ): void => {
      switch (type) {
        case 'applicationSettings':
        case 'connectionStrings':
          setFieldValue(`${overrideDetailIndex}.${type}`, overrideObj)
          break
        default:
          setFieldValue(`${overrideDetailIndex}.${type}.0`, overrideObj)
      }
    },
    []
  )

  const allowableTypes: AllowedTypes =
    serviceOverrideType === 'ENV_GLOBAL_OVERRIDE' || serviceOverrideType === 'ENV_SERVICE_OVERRIDE'
      ? [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]
      : [MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION]

  const { createNewManifestOverride } = useManifestOverride({
    manifestOverrides: [],
    isReadonly: false,
    handleManifestOverrideSubmit: manifestObj => handleOverrideSubmit(manifestObj, 'manifests'),
    fromEnvConfigPage: true,
    expressions: [],
    allowableTypes
  })

  const { createNewFileOverride } = useConfigFileOverride({
    fileOverrides: [],
    isReadonly: false,
    fromEnvConfigPage: true,
    handleConfigFileOverrideSubmit: filesObj => handleOverrideSubmit(filesObj, 'configFiles'),
    expressions: [],
    allowableTypes
  })

  const { showApplicationSettingModal } = useApplicationSettingOverride({
    isReadonly: false,
    allowableTypes,
    handleSubmitConfig: config => handleOverrideSubmit(config, 'applicationSettings')
  })

  const { showConnectionStringModal } = useConnectionStringOverride({
    isReadonly: false,
    allowableTypes,
    handleSubmitConfig: config => handleOverrideSubmit(config, 'connectionStrings')
  })

  return (
    <React.Fragment key={uniqueRowId}>
      <FormInput.Select
        name={`${overrideDetailIndex}.overrideType`}
        usePortal
        items={[
          {
            label: getString(overridesLabelStringMap[OverrideTypes.VARIABLE]),
            value: OverrideTypes.VARIABLE
          },
          {
            label: getString(overridesLabelStringMap[OverrideTypes.MANIFEST]),
            value: OverrideTypes.MANIFEST
          },
          { label: getString(overridesLabelStringMap[OverrideTypes.CONFIG]), value: OverrideTypes.CONFIG },
          ...(serviceOverrideType === 'ENV_GLOBAL_OVERRIDE'
            ? [
                {
                  label: getString(overridesLabelStringMap[OverrideTypes.APPLICATIONSETTING]),
                  value: OverrideTypes.APPLICATIONSETTING
                },
                {
                  label: getString(overridesLabelStringMap[OverrideTypes.CONNECTIONSTRING]),
                  value: OverrideTypes.CONNECTIONSTRING
                }
              ]
            : [])
        ]}
        onChange={item => {
          if (item.value === OverrideTypes.MANIFEST) {
            createNewManifestOverride()
          } else if (item.value === OverrideTypes.CONFIG) {
            createNewFileOverride()
          } else if (item.value === OverrideTypes.APPLICATIONSETTING) {
            showApplicationSettingModal()
          } else if (item.value === OverrideTypes.CONNECTIONSTRING) {
            showConnectionStringModal()
          }
        }}
        selectProps={{
          disabled: readonly
        }}
        disabled={readonly}
      />
    </React.Fragment>
  )
}
