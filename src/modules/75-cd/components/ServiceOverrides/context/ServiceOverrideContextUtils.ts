import { defaultTo, isEmpty, omit } from 'lodash-es'
import { v4 as uuid } from 'uuid'
import type { ConfigFileWrapper, ManifestConfigWrapper, ServiceOverridesSpec } from 'services/cd-ng'
import type { RequiredField } from '@common/interfaces/RouteInterfaces'
import { sanitize } from '@common/utils/JSONUtils'
import type { AllNGVariables } from '@pipeline/utils/types'
import {
  ConfigFileOverrideDetails,
  ManifestOverrideDetails,
  OverrideDetails,
  OverrideTypes,
  ServiceOverrideRowFormState,
  ServiceOverrideSectionProps,
  VariableOverrideDetails,
  ServiceOverridesResponseDTOV2
} from '../ServiceOverridesUtils'

export const formGroupKey = (dataItem: ServiceOverridesResponseDTOV2): string => {
  const { environmentRef, infraIdentifier, serviceRef } = dataItem
  return `${environmentRef} - ${infraIdentifier} - ${serviceRef}`
}

export const formListSectionOverrideSpecData = (dataItem: ServiceOverridesResponseDTOV2): OverrideDetails[] => {
  const spec = dataItem.spec
  const overrideSpecDetails: OverrideDetails[] = []

  const commonOverrideSpecDetailsProps = {
    isEdit: false,
    isNew: false,
    isClone: false
  }

  if (Array.isArray(spec?.variables)) {
    ;(spec?.variables as RequiredField<AllNGVariables, 'name' | 'type'>[]).forEach(variable => {
      overrideSpecDetails.push({
        ...commonOverrideSpecDetailsProps,
        ...omit(dataItem, 'spec'),
        overrideType: OverrideTypes.VARIABLE,
        variableValue: {
          ...variable
        }
      })
    })
  }

  if (Array.isArray(spec?.manifests)) {
    ;(spec?.manifests as Required<ManifestConfigWrapper>[]).forEach(manifest => {
      overrideSpecDetails.push({
        ...commonOverrideSpecDetailsProps,
        ...omit(dataItem, 'spec'),
        overrideType: OverrideTypes.MANIFEST,
        manifestValue: {
          ...manifest
        }
      })
    })
  }

  if (Array.isArray(spec?.configFiles)) {
    ;(spec?.configFiles as Required<ConfigFileWrapper>[]).forEach(configFile => {
      overrideSpecDetails.push({
        ...commonOverrideSpecDetailsProps,
        ...omit(dataItem, 'spec'),
        overrideType: OverrideTypes.CONFIG,
        configFileValue: {
          ...configFile
        }
      })
    })
  }

  if (spec?.applicationSettings && !isEmpty(spec?.applicationSettings)) {
    overrideSpecDetails.push({
      ...commonOverrideSpecDetailsProps,
      ...omit(dataItem, 'spec'),
      overrideType: OverrideTypes.APPLICATIONSETTING,
      applicationSettingsValue: {
        ...spec.applicationSettings
      }
    })
  }

  if (spec?.connectionStrings && !isEmpty(spec?.connectionStrings)) {
    overrideSpecDetails.push({
      ...commonOverrideSpecDetailsProps,
      ...omit(dataItem, 'spec'),
      overrideType: OverrideTypes.CONNECTIONSTRING,
      connectionStringsValue: {
        ...spec.connectionStrings
      }
    })
  }
  return overrideSpecDetails
}

export const formListSectionItem = (dataItem: ServiceOverridesResponseDTOV2, dataIndex: number) => {
  const overrideSpecDetails = formListSectionOverrideSpecData(dataItem)
  const commonSectionProps = {
    isNew: false,
    isEdit: false,
    groupKey: formGroupKey(dataItem),
    overrideResponse: sanitize(dataItem, {
      removeEmptyArray: false,
      removeEmptyObject: false,
      removeEmptyString: false
    }) as ServiceOverridesResponseDTOV2
  }

  return {
    ...commonSectionProps,
    sectionIndex: dataIndex,
    id: uuid(),
    overrideSpecDetails
  }
}

export const formListSectionItems = (dataItems: ServiceOverridesResponseDTOV2[]): ServiceOverrideSectionProps[] => {
  return dataItems.map((dataItem, dataIndex) => formListSectionItem(dataItem, dataIndex))
}

export const shouldDeleteOverrideCompletely = (overrideResponse: ServiceOverridesResponseDTOV2): boolean => {
  const {
    variables = [],
    manifests = [],
    configFiles = [],
    applicationSettings = {},
    connectionStrings
  } = overrideResponse?.spec as Required<ServiceOverridesSpec>

  const variablesLength = defaultTo(variables, []).length
  const manifestsLength = defaultTo(manifests, []).length
  const configFilesLength = defaultTo(configFiles, []).length
  const applicationSettingsLength = !isEmpty(applicationSettings) ? 1 : 0
  const connectionStringsLength = !isEmpty(connectionStrings) ? 1 : 0

  return (
    variablesLength + manifestsLength + configFilesLength + applicationSettingsLength + connectionStringsLength === 1
  )
}

export const formDeleteOverrideResponseSpec = (
  overrideResponseSpec: ServiceOverridesSpec,
  overrideDetails: OverrideDetails
): ServiceOverridesSpec => {
  if ('variableValue' in overrideDetails) {
    overrideResponseSpec.variables = overrideResponseSpec.variables?.filter(
      variableObj => variableObj.name !== (overrideDetails as VariableOverrideDetails).variableValue.name
    )
  }

  if ('manifestValue' in overrideDetails) {
    overrideResponseSpec.manifests = overrideResponseSpec.manifests?.filter(
      manifestObj =>
        manifestObj.manifest?.identifier !==
        (overrideDetails as ManifestOverrideDetails).manifestValue.manifest.identifier
    )
  }

  if ('configFileValue' in overrideDetails) {
    overrideResponseSpec.configFiles = overrideResponseSpec.configFiles?.filter(
      configFileObj =>
        configFileObj.configFile?.identifier !==
        (overrideDetails as ConfigFileOverrideDetails).configFileValue.configFile.identifier
    )
  }

  if ('applicationSettingsValue' in overrideDetails) {
    delete overrideResponseSpec.applicationSettings
  }

  if ('connectionStringsValue' in overrideDetails) {
    delete overrideResponseSpec.connectionStrings
  }

  return overrideResponseSpec
}

export const formUpdateOverrideResponseSpec = (values: ServiceOverrideRowFormState[]): ServiceOverridesSpec => {
  const overrideResponseSpec: ServiceOverridesSpec = {}

  values.forEach(formValue => {
    if (formValue.overrideType === OverrideTypes.VARIABLE) {
      if (overrideResponseSpec.variables) {
        overrideResponseSpec.variables.push({
          ...formValue.variables?.[0]
        })
      } else {
        overrideResponseSpec.variables = []
        overrideResponseSpec.variables.push({
          ...formValue.variables?.[0]
        })
      }
    }

    if (formValue.overrideType === OverrideTypes.MANIFEST) {
      if (overrideResponseSpec.manifests) {
        overrideResponseSpec.manifests.push({
          ...formValue.manifests?.[0]
        })
      } else {
        overrideResponseSpec.manifests = []
        overrideResponseSpec.manifests.push({
          ...formValue.manifests?.[0]
        })
      }
    }

    if (formValue.overrideType === OverrideTypes.CONFIG) {
      if (overrideResponseSpec.configFiles) {
        overrideResponseSpec.configFiles.push({
          ...formValue.configFiles?.[0]
        })
      } else {
        overrideResponseSpec.configFiles = []
        overrideResponseSpec.configFiles.push({
          ...formValue.configFiles?.[0]
        })
      }
    }

    if (formValue.overrideType === OverrideTypes.APPLICATIONSETTING && formValue.applicationSettings) {
      overrideResponseSpec.applicationSettings = { ...formValue.applicationSettings }
    }

    if (formValue.overrideType === OverrideTypes.CONNECTIONSTRING && formValue.connectionStrings) {
      overrideResponseSpec.connectionStrings = { ...formValue.connectionStrings }
    }
  })

  return overrideResponseSpec
}

export const checkIfSectionUpdateOperationIsAllowed = (
  currentEditableSectionIndex: number | undefined,
  sectionIndex: number
) => {
  if (currentEditableSectionIndex === undefined) {
    return true
  } else if (currentEditableSectionIndex === sectionIndex) {
    return true
  }

  return false
}
