/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { match } from 'path-to-regexp'

import type { Module } from 'framework/types/ModuleName'
import { getRouteParams, withAccountId } from '@common/utils/routeUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'

export interface ModuleInfo {
  module?: Module
  accountId: string
}

export interface UseModuleInfoReturn {
  module?: Module
}

const pathToMatch = withAccountId(() => '/:module(ci|cd|cf|cv|ce|sto|chaos|iacm|idp-admin|cet|ssca|code)')({
  accountId: ':accountId'
})
const matchModuleFn = match<ModuleInfo>(pathToMatch, { end: false })

export function useModuleInfo(): UseModuleInfoReturn {
  const { pathname } = useLocation()
  const { isNewNavEnabled } = useAppStore()

  const matchModule = useMemo(() => matchModuleFn(pathname), [pathname])

  if (isNewNavEnabled) {
    return getRouteParams<{ module: Module }>()
  }

  return { module: matchModule === false ? undefined : matchModule.params.module }
}
