/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { ReactElement } from 'react'
import { matchPath, useHistory } from 'react-router-dom'
import { Page, useToaster, VisualYamlSelectedView as SelectedView } from '@harness/uicore'
import { NavigationCheck } from '@common/components'
import routesv1 from '@common/RouteDefinitions'
import routesv2 from '@common/RouteDefinitionsV2'
import { useStrings, StringKeys } from 'framework/strings'
import type { Error } from 'services/cd-ng'
import { FreezeWindowContext, FreezeWindowProvider } from '@freeze-windows/context/FreezeWindowContext'
import { isValidYaml, getContentAndTitleStringKeys, PATH_PARAMS } from '@freeze-windows/utils/FreezeWindowStudioUtil'
import { useFreezeStudioData } from '@freeze-windows/hooks/useFreezeStudioData'
import { RightBar } from '@freeze-windows/components/RightBar/RightBar'
import { FreezeWindowStudioHeader } from '@freeze-windows/components/FreezeWindowStudioHeader/FreezeWindowStudioHeader'
import { FreezeWindowStudioSubHeader } from '@freeze-windows/components/FreezeWindowStudioSubHeader/FreezeWindowStudioSubHeader'
import { FreezeWindowStudioBody } from '@freeze-windows/components/FreezeWindowStudioBody/FreezeWindowStudioBody'
import { DefaultFreezeId } from '@freeze-windows/context/FreezeWindowReducer'
import { useAppStore } from 'framework/AppStore/AppStoreContext'

const _FreezeWindowStudioPage = (): React.ReactElement => {
  const {
    view,
    setView,
    updateYamlView,
    updateFreeze,
    loadingFreezeObj,
    isUpdatingFreeze,
    freezeObjError,
    refetchFreezeObj,
    freezeWindowLevel,
    state: { isYamlEditable, yamlHandler, freezeObj, isUpdated }
  } = React.useContext(FreezeWindowContext)
  const history = useHistory()
  const { isNewNavEnabled } = useAppStore()

  const resources = useFreezeStudioData()

  const { navigationContentText, navigationTitleText } = getContentAndTitleStringKeys(false)

  // isYamlError
  const [, setYamlError] = React.useState(false)
  const { showError } = useToaster()
  const { getString } = useStrings()
  const showInvalidYamlError = React.useCallback(
    (error: string) => {
      setYamlError(true)
      showError(error)
    },
    [setYamlError, showError]
  )

  const onViewChange = (newView: SelectedView): boolean => {
    if (newView === view) {
      return false
    }

    if (
      newView === SelectedView.VISUAL &&
      isYamlEditable &&
      !isValidYaml(yamlHandler, showInvalidYamlError, getString, updateFreeze)
    ) {
      return false
    }
    setView(newView)
    updateYamlView(false)
    return true
  }

  const routes = isNewNavEnabled ? routesv2 : routesv1

  return (
    <>
      <NavigationCheck
        when={freezeObj.identifier !== DefaultFreezeId}
        shouldBlockNavigation={nextLocation => {
          const matchDefault = matchPath(nextLocation.pathname, {
            path: routes.toFreezeWindowStudio(PATH_PARAMS[freezeWindowLevel]),
            exact: true
          })
          return (!matchDefault?.isExact && isUpdated) || false
        }}
        textProps={{
          contentText: getString(navigationContentText as StringKeys),
          titleText: getString(navigationTitleText as StringKeys)
        }}
        navigate={newPath => {
          history.push(newPath)
        }}
      />
      <Page.Body
        loading={loadingFreezeObj || isUpdatingFreeze}
        error={(freezeObjError?.data as Error)?.message || freezeObjError?.message}
        retryOnError={refetchFreezeObj}
      >
        <div style={{ marginRight: 'var(--spacing-11)' }}>
          <FreezeWindowStudioHeader />
          <FreezeWindowStudioSubHeader onViewChange={onViewChange} />
          {loadingFreezeObj || isUpdatingFreeze ? null : <FreezeWindowStudioBody resources={resources} />}
        </div>
        <RightBar />
      </Page.Body>
    </>
  )
}

export default function FreezeWindowStudioPage(): ReactElement {
  return (
    <FreezeWindowProvider>
      <_FreezeWindowStudioPage />
    </FreezeWindowProvider>
  )
}
