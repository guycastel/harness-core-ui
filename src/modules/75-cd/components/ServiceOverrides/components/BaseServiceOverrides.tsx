/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'

import NewButtonWithSearchFilter from './NewButtonWithSearchFilter/NewButtonWithSearchFilter'
import NoServiceOverrides from './NoServiceOverrides'
import { OverridesCollapsibleTable } from './OverridesCollapsibleTable/OverridesCollapsibleTable'

import { useServiceOverridesContext } from '../context/ServiceOverrideContext'

export default function BaseServiceOverrides(): React.ReactElement {
  const { listSectionItems, loadingServiceOverrideData } = useServiceOverridesContext()

  const showOverridesList = Array.isArray(listSectionItems) && listSectionItems.length > 0

  return (
    <React.Fragment>
      <NewButtonWithSearchFilter />
      {showOverridesList ? (
        <React.Fragment>
          <OverridesCollapsibleTable />
        </React.Fragment>
      ) : !loadingServiceOverrideData ? (
        <NoServiceOverrides />
      ) : null}
    </React.Fragment>
  )
}
