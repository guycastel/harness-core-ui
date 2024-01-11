import React from 'react'

import { Icon, Layout, Text } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'

import { useStrings } from 'framework/strings'
import type { ApplicationSettingsConfiguration } from 'services/cd-ng'

import useFileStoreModal from '@filestore/components/FileStoreComponent/FileStoreComponent'

import ConnectorField from '@pipeline/components/ApplicationConfig/ApplicationConfigListView/ApplicationConfigConnectorField'
import { ConnectorIcons, ConnectorTypes } from '@pipeline/components/ApplicationConfig/ApplicationConfig.types'
import { ConfigFilesMap } from '@pipeline/components/ConfigFilesSelection/ConfigFilesHelper'
import { LocationValue } from '@pipeline/components/ConfigFilesSelection/ConfigFilesListView/LocationValue'

export default function ApplicationSettingOverrideInfo({
  store
}: {
  store: ApplicationSettingsConfiguration['store']
}): React.ReactElement {
  const { getString } = useStrings()
  const { openFileStoreModal } = useFileStoreModal({ isReadonly: true })

  const connectorRef = store.spec.connectorRef
  const files = store.spec.files
  const secretFiles = store.spec.secretFiles
  const paths = store.spec.paths

  return (
    <React.Fragment>
      <Layout.Vertical
        width={300}
        height={40}
        flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
        margin={{ right: 'small' }}
      >
        <Text font={{ variation: FontVariation.TABLE_HEADERS }}>{getString('store').toLocaleUpperCase()}</Text>
        <Layout.Horizontal spacing={'small'}>
          <Icon inline name={ConnectorIcons[store?.type as ConnectorTypes]} size={20} width={25} />
          {store.type === 'Harness' ? getString('harness') : <ConnectorField connectorRef={connectorRef} />}
        </Layout.Horizontal>
      </Layout.Vertical>
      <Layout.Vertical width={150} height={40} flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text font={{ variation: FontVariation.TABLE_HEADERS }}>{getString('location').toLocaleUpperCase()}</Text>

        {!!paths?.length && (
          <Text lineClamp={1}>
            <span>{typeof paths === 'string' ? paths : paths.join(', ')}</span>
          </Text>
        )}
        {files?.length && (
          <div>
            <Text lineClamp={1}>
              <LocationValue
                locations={Array.isArray(files) ? files : [files]}
                onClick={(path: string, scope: string) => openFileStoreModal(path, scope)}
                isHarnessStore={store.type === ConfigFilesMap.Harness}
              />
            </Text>
          </div>
        )}
        {secretFiles?.length && (
          <div>
            <Text lineClamp={1}>
              <span>{store.spec.secretFiles}</span>
            </Text>
          </div>
        )}
      </Layout.Vertical>
    </React.Fragment>
  )
}
