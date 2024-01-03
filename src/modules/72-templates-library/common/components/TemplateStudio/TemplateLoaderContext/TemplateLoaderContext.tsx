/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { TemplateType } from '@common/interfaces/RouteInterfaces'
import { GetTemplateQueryParams } from 'services/template-ng'
import { TemplateMetadataForRouter } from '@templates-library/pages/TemplatesPage/views/NewTemplatePopover/useCreateTemplateModalY1'
import { isNewTemplate } from '@templates-library/components/TemplateStudio/TemplateStudioUtils'
import { useIDBContext } from '@modules/10-common/components/IDBContext/IDBContext'
import { YamlVersion } from '@modules/72-templates-library/y1/components/TemplateContext/types'
import { getYamlVersion } from './utils'

interface TemplateLoaderContextInterface {
  yamlVersion?: YamlVersion
  fetchingTemplate: boolean
}

interface TemplateLoaderProviderProps {
  queryParams: GetTemplateQueryParams
  templateIdentifier: string
  versionLabel?: string
  templateType: TemplateType
  children: React.ReactNode
}

export const TemplateLoaderContext = React.createContext<TemplateLoaderContextInterface>({
  fetchingTemplate: false
})

export function TemplateLoaderProvider({
  queryParams,
  templateIdentifier,
  children
}: TemplateLoaderProviderProps): React.ReactElement {
  const { CDS_YAML_SIMPLIFICATION } = useFeatureFlags()
  const { initializationFailed: idbInitializationFailed, initialized: idbInitialized } = useIDBContext()

  const [fetchingTemplate, setFetchingTemplate] = useState<boolean>(true)
  const [yamlVersion, setYamlVersion] = useState<YamlVersion>()
  const { state: routerState } = useLocation<Optional<TemplateMetadataForRouter>>()

  // when creating new pipeline user sets the version explicity
  React.useEffect(() => {
    if (typeof routerState?.yamlSyntax !== 'undefined') {
      setYamlVersion(routerState?.yamlSyntax)
    }
  }, [routerState?.yamlSyntax])

  const abortControllerRef = React.useRef<AbortController | null>(null)
  React.useEffect(() => {
    if (idbInitialized || idbInitializationFailed) {
      if (!isNewTemplate(templateIdentifier)) {
        if (CDS_YAML_SIMPLIFICATION) {
          abortControllerRef.current = new AbortController()
          getYamlVersion({ queryParams, templateIdentifier, signal: abortControllerRef.current?.signal }).then(
            version => {
              setFetchingTemplate(false)
              setYamlVersion(version)
            }
          )
        } else {
          setFetchingTemplate(false)
          setYamlVersion('0')
        }
      } else {
        // If FF enabled, the yamlVersion is set via routerState else default to 0
        !CDS_YAML_SIMPLIFICATION && setYamlVersion('0')
      }
    }

    return () => {
      abortControllerRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idbInitialized, idbInitializationFailed])

  return (
    <TemplateLoaderContext.Provider
      value={{
        fetchingTemplate,
        yamlVersion
      }}
    >
      {children}
    </TemplateLoaderContext.Provider>
  )
}

export function useTemplateLoaderContext(): TemplateLoaderContextInterface {
  // eslint-disable-next-line no-restricted-syntax
  return React.useContext(TemplateLoaderContext)
}
