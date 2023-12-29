/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { SettingType } from '@common/constants/Utils'
import { ResponseListSettingResponseDTO } from 'services/cd-ng'

export const AidaAgreementType = 'AIDA'
export const defaultSettingsTagInputSeparator = ','

export const getSettingValue = (
  settingsData: ResponseListSettingResponseDTO | null,
  identifier: string
): string | undefined => {
  let settingValue: string | undefined

  if (settingsData?.data?.length) {
    settingValue = settingsData?.data?.find(element => element.setting?.identifier === identifier)?.setting?.value
  }
  return settingValue
}

export const getDefaultStoreType = (
  settingsData: ResponseListSettingResponseDTO | null
): StoreMetadata['storeType'] => {
  const settingValue = getSettingValue(settingsData, SettingType.DEFAULT_STORE_TYPE_FOR_ENTITIES)
  return settingValue === StoreType.REMOTE ? StoreType.REMOTE : StoreType.INLINE
}

/**
 * This method will include both ENFORCE_GIT_EXPERIENCE and DEFAULT_STORE_TYPE_FOR_ENTITIES settings
 * INLINE is used as fallback if no gitXSetting is defined
 * @param gitXSetting
 * @returns
 */
export function getDefaultStoreTypeFromSettings(
  gitXSetting?: ResponseListSettingResponseDTO | null
): StoreMetadata['storeType'] {
  return gitXSetting
    ? getSettingValue(gitXSetting, SettingType.ENFORCE_GIT_EXPERIENCE) === 'true'
      ? StoreType.REMOTE
      : getDefaultStoreType(gitXSetting)
    : StoreType.INLINE
}
