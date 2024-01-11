/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'

import { Icon, Layout, Text } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'

import { useStrings } from 'framework/strings'
import type { ConfigFileWrapper } from 'services/cd-ng'

import useFileStoreModal from '@filestore/components/FileStoreComponent/FileStoreComponent'

import { LocationValue } from '@pipeline/components/ConfigFilesSelection/ConfigFilesListView/LocationValue'

import {
  ConfigFileIconByType,
  ConfigFileTypeTitle,
  ConfigFilesMap
} from '@pipeline/components/ConfigFilesSelection/ConfigFilesHelper'
import type { ConfigFileType } from '@pipeline/components/ConfigFilesSelection/ConfigFilesInterface'

export default function ConfigFileOverrideInfo({
  configFile,
  isServiceOverride
}: {
  configFile?: ConfigFileWrapper['configFile']
  isServiceOverride?: boolean
}): React.ReactElement {
  const { getString } = useStrings()
  const { openFileStoreModal } = useFileStoreModal({ isReadonly: true })

  const isHarnessStore = configFile?.spec.store.type === ConfigFilesMap.Harness
  const isFileStore = !!configFile?.spec?.store?.spec?.files?.length
  const filesType = isHarnessStore
    ? configFile?.spec?.store?.spec?.files?.length
      ? getString('pipeline.configFiles.plainText')
      : getString('encrypted')
    : 'Git'

  const pathsLocation = configFile?.spec?.store?.spec?.paths

  const filesLocation = isHarnessStore
    ? configFile?.spec?.store?.spec?.files?.length
      ? configFile?.spec?.store?.spec?.files
      : configFile?.spec?.store?.spec?.secretFiles
    : pathsLocation

  return (
    <React.Fragment>
      <Layout.Vertical width={180} height={40} flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text font={{ variation: FontVariation.TABLE_HEADERS }}>{getString('common.ID').toUpperCase()}</Text>
        <Text lineClamp={1}>{configFile?.identifier}</Text>
      </Layout.Vertical>
      <Layout.Vertical width={180} height={40} flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text font={{ variation: FontVariation.TABLE_HEADERS }}>
          {getString('pipeline.configFiles.fileType').toUpperCase()}
        </Text>
        <Text lineClamp={1}>{filesType}</Text>
      </Layout.Vertical>
      <Layout.Vertical width={180} height={40} flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text font={{ variation: FontVariation.TABLE_HEADERS }}>
          {getString('pipelineSteps.serviceTab.manifestList.manifestStore').toUpperCase()}
        </Text>
        <Layout.Horizontal spacing={'small'}>
          <Icon
            inline
            name={ConfigFileIconByType[configFile?.spec?.store?.type as ConfigFileType]}
            size={20}
            width={20}
          />
          <Text margin={{ left: 'xsmall' }} inline width={130} lineClamp={1}>
            {getString(ConfigFileTypeTitle[configFile?.spec?.store?.type as ConfigFileType])}
          </Text>
        </Layout.Horizontal>
      </Layout.Vertical>
      {!isServiceOverride && (
        <Layout.Vertical width={180} height={40} flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {<Text font={{ variation: FontVariation.TABLE_HEADERS }}>{getString('location')}</Text>}
          <Text
            tooltip={
              Array.isArray(filesLocation) ? (
                <LocationValue
                  isTooltip
                  isHarnessStore={isHarnessStore}
                  locations={isHarnessStore ? filesLocation : pathsLocation}
                  onClick={openFileStoreModal}
                  isFileStore={isFileStore}
                />
              ) : (
                filesLocation
              )
            }
          >
            {typeof filesLocation === 'string' ? (
              filesLocation
            ) : (
              <LocationValue
                isFileStore={isFileStore}
                isHarnessStore={isHarnessStore}
                locations={isHarnessStore ? filesLocation : pathsLocation}
                onClick={openFileStoreModal}
              />
            )}
          </Text>
        </Layout.Vertical>
      )}
    </React.Fragment>
  )
}
