/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { get, isArray, isEmpty } from 'lodash-es'

import { Icon, Layout, Text } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'

import { useStrings } from 'framework/strings'
import type { ManifestConfigWrapper } from 'services/cd-ng'

import useFileStoreModal from '@filestore/components/FileStoreComponent/FileStoreComponent'

import { ManifestStoreMap, getManifestLocation } from '@pipeline/components/ManifestSelection/Manifesthelper'
import { LocationValue } from '@pipeline/components/ConfigFilesSelection/ConfigFilesListView/LocationValue'

import {
  ManifestIcons,
  ManifestLabels,
  OverrideManifestTypes,
  OverrideManifests
} from '@cd/components/EnvironmentsV2/EnvironmentDetails/ServiceOverrides/ServiceManifestOverride/ServiceManifestOverrideUtils'

export default function ManifestOverrideInfo({
  manifest
}: {
  manifest?: ManifestConfigWrapper['manifest']
}): React.ReactElement {
  const { getString } = useStrings()
  const { openFileStoreModal } = useFileStoreModal({ isReadonly: true })

  const manifestLocation = get(
    manifest?.spec,
    getManifestLocation(manifest?.type as OverrideManifestTypes, manifest?.spec?.store?.type)
  )

  const isHarnessStore = manifest?.spec?.store?.type === ManifestStoreMap.Harness

  return (
    <React.Fragment>
      <Layout.Vertical width={180} height={40} flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text font={{ variation: FontVariation.TABLE_HEADERS }}>{getString('common.ID').toUpperCase()}</Text>
        <Layout.Horizontal spacing={'small'}>
          <Icon inline name={ManifestIcons[manifest?.type as OverrideManifestTypes]} size={20} width={20} />
          <Text inline width={130} lineClamp={1}>
            {manifest?.identifier}
          </Text>
        </Layout.Horizontal>
      </Layout.Vertical>
      <Layout.Vertical width={180} height={40} flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text font={{ variation: FontVariation.TABLE_HEADERS }}>
          {getString('pipelineSteps.serviceTab.manifestList.manifestType').toUpperCase()}
        </Text>
        <Text lineClamp={1}>{getString(ManifestLabels[manifest?.type as OverrideManifestTypes])}</Text>
      </Layout.Vertical>
      <Layout.Vertical width={180} height={40} flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text font={{ variation: FontVariation.TABLE_HEADERS }}>
          {getString('pipelineSteps.serviceTab.manifestList.manifestStore').toUpperCase()}
        </Text>
        <Text lineClamp={1}>
          {manifest?.type !== OverrideManifests.HelmRepoOverride ? manifest?.spec?.store.type : manifest?.spec?.type}
        </Text>
      </Layout.Vertical>
      <Layout.Vertical width={180} height={40} flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text font={{ variation: FontVariation.TABLE_HEADERS }}>{getString('location').toUpperCase()}</Text>
        {manifest?.type === OverrideManifests.HelmRepoOverride && (
          <span>
            <Text lineClamp={1}>{getString('pipeline.manifestType.helmRepoOverride.locationText')}</Text>
          </span>
        )}
        {!isEmpty(manifestLocation) && (
          <span>
            <Text
              tooltip={
                isArray(manifestLocation) ? (
                  <LocationValue
                    isTooltip
                    isHarnessStore={isHarnessStore}
                    locations={manifestLocation}
                    onClick={openFileStoreModal}
                  />
                ) : (
                  manifestLocation
                )
              }
            >
              {typeof manifestLocation === 'string'
                ? manifestLocation
                : isArray(manifestLocation) && (
                    <LocationValue
                      locations={manifestLocation}
                      isHarnessStore={isHarnessStore}
                      onClick={openFileStoreModal}
                    />
                  )}
            </Text>
          </span>
        )}
      </Layout.Vertical>
    </React.Fragment>
  )
}
