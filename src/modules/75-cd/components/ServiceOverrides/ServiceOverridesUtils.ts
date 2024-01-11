import { IconName } from '@harness/uicore'
import type {
  ApplicationSettingsConfiguration,
  ConfigFileWrapper,
  ConnectionStringsConfiguration,
  ManifestConfigWrapper,
  ServiceOverridesResponseDTOV2 as CDServiceOverridesResponseDTOV2
} from 'services/cd-ng'
import type { StringKeys } from 'framework/strings'
import type { AllNGVariables } from '@pipeline/utils/types'
import type { RequiredField } from '@common/interfaces/RouteInterfaces'

export enum ServiceOverridesTab {
  ENV_GLOBAL_OVERRIDE = 'ENV_GLOBAL_OVERRIDE',
  ENV_SERVICE_OVERRIDE = 'ENV_SERVICE_OVERRIDE',
  INFRA_GLOBAL_OVERRIDE = 'INFRA_GLOBAL_OVERRIDE',
  INFRA_SERVICE_OVERRIDE = 'INFRA_SERVICE_OVERRIDE'
}

export enum OverrideTypes {
  VARIABLE = 'variableoverride',
  CONFIG = 'configoverride',
  MANIFEST = 'manifestoverride',
  APPLICATIONSETTING = 'applicationsetting',
  CONNECTIONSTRING = 'connectionstring'
}

export const overridesLabelStringMap: Record<OverrideTypes, StringKeys> = {
  [OverrideTypes.VARIABLE]: 'variableLabel',
  [OverrideTypes.MANIFEST]: 'manifestsText',
  [OverrideTypes.CONFIG]: 'cd.configFileStoreTitle',
  [OverrideTypes.APPLICATIONSETTING]: 'pipeline.appServiceConfig.applicationSettings.name',
  [OverrideTypes.CONNECTIONSTRING]: 'pipeline.appServiceConfig.connectionStrings.name'
}

export const overridesTypeIconMap: Record<OverrideTypes, IconName> = {
  [OverrideTypes.VARIABLE]: 'variables',
  [OverrideTypes.MANIFEST]: 'list-blue',
  [OverrideTypes.CONFIG]: 'configure',
  [OverrideTypes.APPLICATIONSETTING]: 'chaos-cube',
  [OverrideTypes.CONNECTIONSTRING]: 'explode'
}

export const noOverridesStringMap: Record<ServiceOverridesTab, StringKeys> = {
  ENV_GLOBAL_OVERRIDE: 'common.serviceOverrides.noOverrides.globalEnvironment',
  ENV_SERVICE_OVERRIDE: 'common.serviceOverrides.noOverrides.environmentServiceSpecific',
  INFRA_GLOBAL_OVERRIDE: 'common.serviceOverrides.noOverrides.globalInfrastructure',
  INFRA_SERVICE_OVERRIDE: 'common.serviceOverrides.noOverrides.infrastructureServiceSpecific'
}

export interface ServiceOverrideSectionProps {
  /**
   * isNew is set to true when creating a new override section
   */
  isNew: boolean
  /**
   * Unique id used to reset formik
   */
  id: string
  /**
   * isEdit is set to true when editing a new override section
   */
  isEdit: boolean
  /**
   * sectionIndex is used to identify the row in case of any actions
   */
  sectionIndex: number
  /**
   * overrideDetails contains all the values that form part of 1 override row
   */
  overrideSpecDetails?: OverrideDetails[]
  /**
   * groupKey is used to identify a group - for display or for actions
   */
  groupKey: string
  /**
   * overrideResponse is used to handle any operations that require the entire object
   */
  overrideResponse?: ServiceOverridesResponseDTOV2
}

export interface ServiceOverrideRowProps {
  /**
   * isNew is set to true when creating a new override row
   */
  isNew: boolean
  /**
   * isEdit is set to true when editing an existing override row
   */
  isEdit: boolean
  /**
   * isClone is set to true when cloning an existing override row
   */
  isClone: boolean
  /**
   * rowIndex is used to identify the row in case of any actions - clone, edit, delete
   */
  rowIndex: number
  /**
   * variableIndex is used to update the field in case of any updates to a variable
   */
  variableIndex?: number
  /**
   * manifestIndex is used to update the field in case of any updates to a manifest
   */
  manifestIndex?: number
  /**
   * configFileIndex is used to update the field in case of any updates to a config file
   */
  configFileIndex?: number
  /**
   * overrideDetails contains all the values that form part of 1 override row
   */
  overrideDetails?: OverrideDetails
  /**
   * groupKey is used to identify a group - for display or for actions
   */
  groupKey: string
  /**
   * overrideResponse is used to handle any operations that require the entire object
   */
  overrideResponse?: ServiceOverridesResponseDTOV2
}

interface CommonOverrideDetails extends Omit<ServiceOverridesResponseDTOV2, 'spec'> {
  isEdit: boolean
  isNew: boolean
  isClone: boolean
  overrideType: OverrideTypes
}

export type VariableOverrideDetails = CommonOverrideDetails & {
  variableValue: RequiredField<AllNGVariables, 'name' | 'type'>
}

export type ManifestOverrideDetails = CommonOverrideDetails & {
  manifestValue: Required<ManifestConfigWrapper>
}

export type ConfigFileOverrideDetails = CommonOverrideDetails & {
  configFileValue: Required<ConfigFileWrapper>
}

export type ApplicationSettingsOverrideDetails = CommonOverrideDetails & {
  applicationSettingsValue: RequiredField<ApplicationSettingsConfiguration, 'store'>
}

export type ConnectionStringsOverrideDetails = CommonOverrideDetails & {
  connectionStringsValue: RequiredField<ConnectionStringsConfiguration, 'store'>
}

export type OverrideDetails =
  | VariableOverrideDetails
  | ManifestOverrideDetails
  | ConfigFileOverrideDetails
  | ApplicationSettingsOverrideDetails
  | ConnectionStringsOverrideDetails

export type PartiallyRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>

export interface ServiceOverrideRowFormState {
  id?: string
  overrideType?: OverrideTypes
  environmentRef?: string
  serviceRef?: string
  infraIdentifier?: string
  variables?: RequiredField<AllNGVariables, 'type' | 'name'>[]
  manifests?: Required<ManifestConfigWrapper>[]
  configFiles?: Required<ConfigFileWrapper>[]
  applicationSettings?: RequiredField<ApplicationSettingsConfiguration, 'store'>
  connectionStrings?: RequiredField<ConnectionStringsConfiguration, 'store'>
}

export interface EnvironmentRefFormState {
  environmentRef: string | undefined
}

export interface ServiceRefFormState {
  serviceRef: string | undefined
}

export interface InfraIdentifierFormState {
  infraIdentifier: string | undefined
}

export type ServiceOverridesResponseDTOV2 = RequiredField<
  CDServiceOverridesResponseDTOV2,
  'environmentRef' | 'identifier' | 'spec' | 'type'
>
