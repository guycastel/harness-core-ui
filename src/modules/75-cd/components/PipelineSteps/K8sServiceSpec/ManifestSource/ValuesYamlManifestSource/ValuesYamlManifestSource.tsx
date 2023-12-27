/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { get } from 'lodash-es'
import { ManifestSourceBase, ManifestSourceRenderProps } from '@cd/factory/ManifestSourceFactory/ManifestSourceBase'
import { ManifestDataType, ManifestStoreMap } from '@pipeline/components/ManifestSelection/Manifesthelper'
import { S3ManifestStoreRuntimeView } from '@cd/components/PipelineSteps/ECSServiceSpec/ManifestSource/S3ManifestStoreRuntimeView'
import { FileUsage } from '@filestore/interfaces/FileStore'
import { ManifestContent } from '../ManifestSourceRuntimeFields/ManifestContent'

export class ValuesYamlManifestSource extends ManifestSourceBase<ManifestSourceRenderProps> {
  protected manifestType = ManifestDataType.Values
  renderContent(props: ManifestSourceRenderProps): JSX.Element | null {
    if (!props.isManifestsRuntime) {
      return null
    }

    const manifestStoreType = get(props.template, `${props.manifestPath}.spec.store.type`, null)
    if (manifestStoreType === ManifestStoreMap.S3) {
      return <S3ManifestStoreRuntimeView {...props} pathFieldlabel="fileFolderPathText" />
    }

    return <ManifestContent {...props} pathFieldlabel="common.git.filePath" fileUsage={FileUsage.MANIFEST_FILE} />
  }
}
