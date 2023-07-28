/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useContext, useState } from 'react'

import { useConfirmationDialog, useToaster } from '@harness/uicore'
import { Intent } from '@blueprintjs/core'
import { capitalize as _capitalize, defaultTo as _defaultTo, lowerCase as _lowerCase } from 'lodash-es'
import { String, useStrings } from 'framework/strings'
import { FileStoreNodeDTO, useDeleteFile } from 'services/cd-ng'
import { useEntityDeleteErrorHandlerDialog } from '@common/hooks/EntityDeleteErrorHandlerDialog/useEntityDeleteErrorHandlerDialog'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import type { FileStorePopoverItem } from '@filestore/common/FileStorePopover/FileStorePopover'
import { FileStoreContext } from '@filestore/components/FileStoreContext/FileStoreContext'
import { FILE_VIEW_TAB, FileStoreNodeTypes } from '@filestore/interfaces/FileStore'
import { FileStoreActionTypes, FILE_STORE_ROOT, SEARCH_FILES } from '@filestore/utils/constants'

const useDelete = (identifier: string, name: string, type: string, notCurrentNode?: boolean): FileStorePopoverItem => {
  const { getString } = useStrings()
  const { showSuccess, showError } = useToaster()
  const [errorMessage, setErrorMessage] = useState<string>('')
  const {
    setActiveTab,
    setCurrentNode,
    getNode,
    queryParams,
    currentNode,
    isCachedNode,
    removeFromTempNodes,
    addDeletedNode,
    forceDeleteEnabled
  } = useContext(FileStoreContext)

  const getConfirmationDialogContent = (): JSX.Element => {
    return (
      <div className={'filestoreDeleteDialog'}>
        <String
          useRichText
          stringID="platform.filestore.confirmDeleteFile"
          vars={{
            entity: _lowerCase(type),
            name: name
          }}
        />
      </div>
    )
  }

  const { mutate: deleteFile } = useDeleteFile({
    queryParams
  })

  /* istanbul ignore next */
  const onDelete = async (forceDelete: boolean) => {
    try {
      const deleted = await deleteFile(identifier || '', {
        headers: { 'content-type': 'application/json' },
        queryParams: {
          ...queryParams,
          forceDelete: forceDelete ? forceDeleteEnabled : undefined
        }
      })
      if (deleted) {
        addDeletedNode(identifier)
        showSuccess(getString('platform.filestore.deletedSuccessMessage', { name: name, type: _capitalize(type) }))
        getNode(nodeParams as FileStoreNodeDTO)
      }
    } catch (err) {
      handleFileDeleteError(err?.data.code, _defaultTo(err?.data?.message, err?.message))
    }
  }

  /* istanbul ignore next */
  const redirectToReferencedBy = () => {
    setErrorMessage('')
    setCurrentNode({
      identifier,
      name,
      type: FileStoreNodeTypes.FILE,
      children: []
    } as FileStoreNodeDTO)
    setActiveTab(FILE_VIEW_TAB.REFERENCED_BY)
    closeDialog()
  }

  const forceDeleteCallback = forceDeleteEnabled ? () => onDelete(true) : undefined

  const { openDialog: openReferenceErrorDialog, closeDialog } = useEntityDeleteErrorHandlerDialog({
    entity: {
      type: ResourceType.FILE,
      name: _defaultTo(currentNode.identifier, '')
    },
    customErrorMessage: errorMessage,
    redirectToReferencedBy,
    forceDeleteCallback
  })

  /* istanbul ignore next */
  const handleFileDeleteError = (code: string, message: string): void => {
    if (code === 'ENTITY_REFERENCE_EXCEPTION') {
      setErrorMessage(message)
      openReferenceErrorDialog()
    } else {
      showError(message)
    }
  }

  const createParams = () => {
    const params = {
      identifier: '',
      name: '',
      type: FileStoreNodeTypes.FOLDER,
      parentIdentifier: '',
      children: []
    }
    if (notCurrentNode) {
      if (currentNode.identifier === SEARCH_FILES) {
        params.identifier = FILE_STORE_ROOT
        params.name = FILE_STORE_ROOT
      } else {
        params.identifier = currentNode.identifier
        params.name = currentNode.name
        params.parentIdentifier = currentNode?.parentIdentifier || ''
      }
    } else {
      params.identifier = currentNode.parentIdentifier || FILE_STORE_ROOT
      params.name = currentNode.parentName || FILE_STORE_ROOT
    }
    return params
  }
  const nodeParams = createParams()

  const { openDialog } = useConfirmationDialog({
    contentText: getConfirmationDialogContent(),
    titleText: `${getString('delete')} ${_capitalize(type)}?`,
    confirmButtonText: getString('delete'),
    cancelButtonText: getString('cancel'),
    intent: Intent.DANGER,
    buttonIntent: Intent.DANGER,
    onCloseDialog: async (isConfirmed: boolean) => {
      /* istanbul ignore next */
      if (isConfirmed) {
        if (isCachedNode(currentNode.identifier)) {
          removeFromTempNodes(currentNode.identifier)
          try {
            addDeletedNode(identifier)
            getNode(nodeParams as FileStoreNodeDTO)
            showSuccess(getString('platform.filestore.deletedSuccessMessage', { name: name, type: _capitalize(type) }))
          } catch (err) {
            handleFileDeleteError(err?.data.code, _defaultTo(err?.data?.message, err?.message))
          }
          return
        }
        onDelete(false)
      }
    }
  })

  const handleClick = useCallback(() => {
    openDialog()
  }, [openDialog])

  return {
    onClick: handleClick,
    label: getString('delete'),
    actionType: FileStoreActionTypes.DELETE_NODE,
    identifier
  }
}

export default useDelete