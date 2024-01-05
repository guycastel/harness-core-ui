/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useContext, useState, useCallback } from 'react'
import {
  Layout,
  PageSpinner,
  Container,
  ExpandingSearchInput,
  FormInput,
  PageError,
  SelectOption,
  shouldShowError
} from '@harness/uicore'
import SplitPane from 'react-split-pane'
import { useHistory } from 'react-router-dom'
import { debounce, pick, defaultTo } from 'lodash-es'
import { useModalHook } from '@harness/use-modal'
import type { GetDataError } from 'restful-react'
import type { FormikProps } from 'formik'
import cx from 'classnames'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import type { FileStoreResourceQueryParams } from '@common/interfaces/RouteInterfaces'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { Page, StringUtils, useToaster } from '@common/exports'
import { getLinkForAccountResources } from '@common/utils/BreadcrumbUtils'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { useStrings } from 'framework/strings'
import EmptyNodeView from '@filestore/components/EmptyNodeView/EmptyNodeView'
import StoreExplorer from '@filestore/components/StoreExplorer/StoreExplorer'
import StoreView from '@filestore/components/StoreView/StoreView'
import { FileStoreContext, FileStoreContextProvider } from '@filestore/components/FileStoreContext/FileStoreContext'
import { FILE_STORE_ROOT, SEARCH_FILES } from '@filestore/utils/constants'
import { FileStoreNodeTypes, FileUsage } from '@filestore/interfaces/FileStore'
import {
  Failure,
  FilesFilterProperties,
  FileStoreNodeDTO,
  FilterDTO,
  ListFilesWithFilterQueryParams,
  useDeleteFilter,
  useGetCreatedByList,
  useGetEntityTypes,
  useGetFilterList,
  useGetFolderNodes,
  useListFilesWithFilter,
  usePostFilter,
  useUpdateFilter
} from 'services/cd-ng'
import { NavigationCheck } from '@common/components/NavigationCheck/NavigationCheck'

import FilterSelector from '@common/components/Filter/FilterSelector/FilterSelector'
import {
  flattenObject,
  getFilterByIdentifier,
  isObjectEmpty,
  removeNullAndEmpty,
  UNSAVED_FILTER
} from '@common/components/Filter/utils/FilterUtils'
import { createRequestBodyPayload, FileStoreFilterFormType } from '@filestore/utils/RequestUtils'
import { Filter, FilterRef } from '@common/components/Filter/Filter'
import type { CrudOperation } from '@common/components/Filter/FilterCRUD/FilterCRUD'
import type { FilterDataInterface, FilterInterface } from '@common/components/Filter/Constants'
import { getFileUsageNameByType, sortNodesByType } from '@filestore/utils/FileStoreUtils'
import { useUnsavedConfirmation } from '@filestore/common/useUnsavedConfirmation/useUnsavedConfirmation'

import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { useQueryParams } from '@common/hooks'
import { Category, CDActions } from '@common/constants/TrackingConstants'
import css from './FileStorePage.module.scss'

const fileUsageOptions: SelectOption[] = [
  {
    label: getFileUsageNameByType(FileUsage.MANIFEST_FILE),
    value: FileUsage.MANIFEST_FILE
  },
  {
    label: getFileUsageNameByType(FileUsage.CONFIG),
    value: FileUsage.CONFIG
  },
  {
    label: getFileUsageNameByType(FileUsage.SCRIPT),
    value: FileUsage.SCRIPT
  }
]

const NO_SELECTION = { label: '', value: '' }

interface FileStoreFilterFormProps<T> {
  formikProps?: FormikProps<T>
}

interface FileStoreProps {
  isModalView?: boolean
  onNodeChange?: (node: any) => void
  scope?: string
  queryParams?: any
  fileUsage?: FileUsage
  handleSetIsUnsaved?: (status: boolean) => void
  pathValue?: string
  scopeValue?: string
  isReadonly?: boolean
  isFullScreen?: boolean
  setFullScreen?: (status: boolean) => void
}

export const FileStore: React.FC<FileStoreProps> = ({ onNodeChange, isFullScreen }: FileStoreProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<FilterDTO[]>()
  const [isRefreshingFilters, setIsRefreshingFilters] = useState<boolean>(false)
  const { getRBACErrorMessage } = useRBACError()
  const [filesFetchError, setFilesFetchError] = useState<GetDataError<Failure | Error>>()
  const [referencedByEntitySelected, setReferencedByEntitySelected] = useState<string>()
  const [appliedFilter, setAppliedFilter] = useState<FilterDTO | null>()
  const { getString } = useStrings()
  const { showError } = useToaster()
  const filterRef = React.useRef<FilterRef<FilterDTO> | null>(null)
  const { path } = useQueryParams<FileStoreResourceQueryParams>()

  const {
    fileStore,
    setFileStore,
    setCurrentNode,
    setLoading,
    currentNode,
    isModalView,
    queryParams,
    isCachedNode,
    scope,
    tempNodes,
    unsavedNodes,
    fileUsage: FILE_USAGE_CONTEXT,
    handleSetIsUnsaved,
    globalSort,
    pathValue,
    scopeValue,
    getNodeByPath
  } = useContext(FileStoreContext)
  const { accountIdentifier: accountId, orgIdentifier, projectIdentifier } = queryParams
  const history = useHistory()
  const { trackEvent } = useTelemetry()
  const [splitPaneSize, setSplitPaneSize] = React.useState(400)
  const setSplitPaneSizeDeb = React.useRef(debounce(setSplitPaneSize, 400))
  const handleStageResize = (size: number): void => {
    setSplitPaneSizeDeb.current(size)
  }
  const resizerStyle = navigator.userAgent.match(/firefox/i)
    ? { display: 'flow-root list-item' }
    : { display: 'inline-table' }

  useDocumentTitle(getString('resourcePage.fileStore'))

  React.useEffect(() => {
    if (isModalView) {
      if (isCachedNode(currentNode?.identifier)) {
        handleSetIsUnsaved?.(true)
        return
      }
      handleSetIsUnsaved?.(false)
      onNodeChange?.({
        ...currentNode,
        scope
      })
    }
  }, [currentNode, isCachedNode])

  const { mutate: getRootNodes, loading } = useGetFolderNodes({
    queryParams: {
      ...queryParams,
      fileUsage: FILE_USAGE_CONTEXT
    }
  })

  const { data: createdByListResponse, error } = useGetCreatedByList({
    queryParams
  })

  const { data: entityTypeResponse } = useGetEntityTypes({
    queryParams
  })

  const { mutate: getFilesWithFilter } = useListFilesWithFilter({
    queryParams
  })

  const {
    loading: isFetchingFilters,
    data: fetchedFilterResponse,
    refetch: refetchFilterList
  } = useGetFilterList({
    queryParams: {
      ...queryParams,
      type: 'FileStore'
    }
  })

  const { mutate: createFilter } = usePostFilter({
    queryParams: {
      ...queryParams
    }
  })

  const { mutate: updateFilter } = useUpdateFilter({
    queryParams
  })

  const { mutate: deleteFilter } = useDeleteFilter({
    queryParams: {
      ...queryParams,
      type: 'FileStore'
    }
  })

  const reset = (): void => {
    setReferencedByEntitySelected(undefined)
    setFilesFetchError(undefined)
    refetchFileStoreList(queryParams)
    setAppliedFilter(undefined)
  }

  const createdByOptions: SelectOption[] = (createdByListResponse?.data || []).map(user => ({
    label: user.name || '',
    value: user.email || ''
  }))

  const referencedByOptions: SelectOption[] = (entityTypeResponse?.data || []).map(entityType => ({
    label: entityType,
    value: entityType
  }))

  const FileStoreFilterForm = (props: FileStoreFilterFormProps<FileStoreFilterFormType>): React.ReactElement => {
    const fileUsage = props.formikProps?.values.fileUsage
    const createdBy = props.formikProps?.values.createdBy
    const referencedBy = props.formikProps?.values.referencedBy

    return (
      <>
        <FormInput.Select
          selectProps={{
            addClearBtn: true
          }}
          items={fileUsageOptions}
          name="fileUsage"
          label={getString('platform.filestore.view.fileUsage')}
          key="fileUsage"
          value={fileUsage ? fileUsageOptions.find((option: SelectOption) => option.value === fileUsage) : NO_SELECTION}
          placeholder={getString('platform.filestore.filter.fileUsagePlaceholder')}
        />
        <FormInput.KVTagInput name="tags" label={getString('tagsLabel')} key="tags" />
        <FormInput.Select
          selectProps={{
            addClearBtn: true
          }}
          items={createdByOptions}
          value={createdBy ? createdByOptions.find((option: SelectOption) => option.value === createdBy) : NO_SELECTION}
          name="createdBy"
          label={getString('createdBy')}
          key="createdBy"
        />
        <FormInput.Select
          selectProps={{
            addClearBtn: true
          }}
          items={referencedByOptions}
          onChange={option => setReferencedByEntitySelected(option.value as string)}
          name="referencedBy"
          value={
            referencedBy
              ? referencedByOptions.find((option: SelectOption) => option.value === referencedBy)
              : NO_SELECTION
          }
          label={getString('referencedBy')}
          key="referencedBy"
        />
        {referencedByEntitySelected && (
          <FormInput.Text
            style={{ marginLeft: 20, paddingLeft: 20, borderLeft: '1px solid #CBCBCB' }}
            name="referenceName"
            label={getString('name')}
            key="referenceName"
          />
        )}
      </>
    )
  }

  const refetchFileStoreList = React.useCallback(
    async (
      queryParamsArgs?: ListFilesWithFilterQueryParams,
      filter?: FilesFilterProperties & { referenceName?: string }
    ): Promise<void> => {
      const { tags, fileUsage, createdBy, referencedBy, referenceName } = filter || {}

      const requestBodyPayload = Object.assign(
        filter
          ? {
              tags,
              fileUsage,
              createdBy: (createdByListResponse?.data || []).find(user => user.email === createdBy),
              referencedBy:
                referencedBy && referenceName
                  ? {
                      type: referencedBy,
                      name: referenceName
                    }
                  : null
            }
          : {},
        {
          filterType: 'FileStore'
        }
      ) as FilesFilterProperties

      const sanitizedFilterRequest = FILE_USAGE_CONTEXT
        ? removeNullAndEmpty(
            Object.assign(
              { fileUsage: FILE_USAGE_CONTEXT },
              {
                filterType: 'FileStore'
              }
            )
          )
        : removeNullAndEmpty(requestBodyPayload)
      setLoading(true)

      try {
        const { status, data } = await getFilesWithFilter(sanitizedFilterRequest, { queryParams: queryParamsArgs })
        /* istanbul ignore else */
        if (status === 'SUCCESS') {
          const filteredFiles: FileStoreNodeDTO[] =
            data?.content?.map(file => ({
              ...file,
              identifier: file.identifier,
              lastModifiedBy: file.lastModifiedBy,
              lastModifiedAt: file.lastModifiedAt,
              name: file.name,
              parentIdentifier: file.parentIdentifier,
              fileUsage: file.fileUsage,
              type: file.type
            })) || []

          setCurrentNode({
            identifier: SEARCH_FILES,
            name: SEARCH_FILES,
            type: FileStoreNodeTypes.FOLDER,
            children: filteredFiles
          })
        }
      } /* istanbul ignore next */ catch (e) {
        if (shouldShowError(e)) {
          showError(getRBACErrorMessage(e))
        }
        setFilesFetchError(e)
      }

      setLoading(false)
    },
    [createdByListResponse]
  )

  useEffect(() => {
    if ((pathValue && scopeValue === scope && pathValue !== '/') || path) {
      getNodeByPath(defaultTo(path, ''))
    } else {
      getRootNodes({ identifier: FILE_STORE_ROOT, name: FILE_STORE_ROOT, type: FileStoreNodeTypes.FOLDER }).then(
        response => {
          if (response?.data?.children) {
            setFileStore(
              sortNodesByType(
                response.data.children.map(node => {
                  return {
                    ...node,
                    parentName: FILE_STORE_ROOT
                  }
                }),
                globalSort
              )
            )
            setCurrentNode({
              ...response.data,
              parentName: FILE_STORE_ROOT
            })
          }
        }
      )
    }
  }, [])

  const handleSaveOrUpdate = async (
    isUpdate: boolean,
    data: FilterDataInterface<FileStoreFilterFormType, FilterInterface>
  ): Promise<void> => {
    setIsRefreshingFilters(true)
    const requestBodyPayload = createRequestBodyPayload({
      ...queryParams,
      isUpdate,
      data,
      createdByList: createdByListResponse?.data || []
    })
    const saveOrUpdateHandler = filterRef.current?.saveOrUpdateFilterHandler
    if (saveOrUpdateHandler && typeof saveOrUpdateHandler === 'function') {
      const updatedFilter = await saveOrUpdateHandler(isUpdate, requestBodyPayload)
      setAppliedFilter(updatedFilter)
    }
    await refetchFilterList()
    trackEvent(CDActions.ApplyAdvancedFilter, {
      category: Category.FILESTORE
    })
    setIsRefreshingFilters(false)
  }

  const handleDelete = async (identifier: string): Promise<void> => {
    setIsRefreshingFilters(true)
    const deleteHandler = filterRef.current?.deleteFilterHandler
    if (deleteHandler && typeof deleteFilter === 'function') {
      await deleteHandler(identifier)
    }
    if (identifier === appliedFilter?.identifier) {
      reset()
    }
    await refetchFilterList()
    setIsRefreshingFilters(false)
  }

  const unsavedFilter = {
    name: UNSAVED_FILTER,
    identifier: StringUtils.getIdentifierFromName(UNSAVED_FILTER)
  }

  const handleFilterClick = (identifier: string): void => {
    if (identifier !== unsavedFilter.identifier) {
      const filter = getFilterByIdentifier(filters || [], identifier)
      const { referencedBy } = (filter?.filterProperties as FilesFilterProperties) || {}
      setReferencedByEntitySelected(referencedBy?.type)
      setAppliedFilter(filter)
    }
  }

  useEffect(() => {
    setFilters(fetchedFilterResponse?.data?.content || [])
    setIsRefreshingFilters(isFetchingFilters)
  }, [fetchedFilterResponse])

  useEffect(() => {
    if (error) {
      showError(getRBACErrorMessage(error))
    }
  }, [error])

  const handleFilterSelection = (
    option: SelectOption,
    event?: React.SyntheticEvent<HTMLElement, Event> | undefined
  ): void => {
    event?.stopPropagation()
    event?.preventDefault()
    /* istanbul ignore else */
    if (option.value) {
      const selectedFilter = getFilterByIdentifier(filters || [], option.value?.toString())
      setAppliedFilter(selectedFilter)
      const updatedQueryParams = {
        ...queryParams,
        searchTerm
      }
      refetchFileStoreList(updatedQueryParams, selectedFilter?.filterProperties)
      trackEvent(CDActions.ApplyAdvancedFilter, {
        category: Category.FILESTORE
      })
    } else {
      reset()
    }
  }

  const [openFilterDrawer, hideFilterDrawer] = useModalHook(() => {
    const onFilterApply = (formData: Record<string, any>) => {
      if (!isObjectEmpty(formData)) {
        const filterFromFormData = {
          createdBy: formData.createdBy,
          referencedBy: formData.referencedBy,
          fileUsage: formData.fileUsage,
          tags: formData.tags,
          referenceName: formData.referenceName
        }
        refetchFileStoreList(queryParams, filterFromFormData)
        setAppliedFilter({ ...unsavedFilter, filterProperties: filterFromFormData })
        hideFilterDrawer()
        trackEvent(CDActions.ApplyAdvancedFilter, {
          category: Category.FILESTORE
        })
      }
    }

    const { tags, fileUsage, createdBy, referencedBy, referenceName } =
      (appliedFilter?.filterProperties as FilesFilterProperties & { referenceName: string }) || {}
    const { name = '', filterVisibility } = appliedFilter || {}

    const initialFilterValues = {
      tags,
      fileUsage,
      createdBy: typeof createdBy === 'string' ? createdBy : createdBy?.email,
      referencedBy: typeof referencedBy === 'string' ? referencedBy : referencedBy?.type,
      referenceName: referenceName || referencedBy?.name
    }

    return (
      <Filter<FileStoreFilterFormType, FilterDTO>
        onApply={onFilterApply}
        onClose={() => {
          hideFilterDrawer()
          refetchFilterList()
        }}
        filters={filters}
        initialFilter={{
          formValues: initialFilterValues,
          metadata: {
            name,
            filterVisibility: filterVisibility,
            identifier: appliedFilter?.identifier || '',
            filterProperties: {}
          }
        }}
        onSaveOrUpdate={handleSaveOrUpdate}
        onDelete={handleDelete}
        onFilterSelect={handleFilterClick}
        isRefreshingFilters={isRefreshingFilters}
        formFields={<FileStoreFilterForm />}
        dataSvcConfig={
          new Map<CrudOperation, (...rest: any[]) => Promise<any>>([
            ['ADD', createFilter],
            ['UPDATE', updateFilter],
            ['DELETE', deleteFilter]
          ])
        }
        onSuccessfulCrudOperation={refetchFilterList}
        ref={filterRef}
        onClear={reset}
      />
    )
  }, [isRefreshingFilters, filters, appliedFilter, searchTerm, createdByOptions, referencedByEntitySelected])

  const fieldToLabelMapping = new Map<string, string>()
  fieldToLabelMapping.set('fileUsage', getString('platform.filestore.view.fileUsage'))
  fieldToLabelMapping.set('tags', getString('tagsLabel'))
  fieldToLabelMapping.set('createdBy', getString('createdBy'))
  fieldToLabelMapping.set('referencedBy', getString('referencedBy'))

  /* Through expandable filter text search */
  const debouncedFilesSearch = useCallback(
    debounce((query: string): void => {
      const updatedQueryParams = {
        ...queryParams,
        searchTerm: query
      }
      refetchFileStoreList(updatedQueryParams, appliedFilter?.filterProperties)
    }, 800),
    [refetchFileStoreList, appliedFilter?.filterProperties]
  )

  const { isNewNavEnabled } = useAppStore()

  const { handleUnsavedConfirmation } = useUnsavedConfirmation({
    callback: () => null,
    isNavigationBar: false
  })

  return (
    <>
      <Page.Header
        breadcrumbs={
          <>
            {!isModalView &&
              (isNewNavEnabled ? (
                <NGBreadcrumbs />
              ) : (
                <NGBreadcrumbs
                  links={getLinkForAccountResources({ accountId, orgIdentifier, projectIdentifier, getString })}
                />
              ))}
          </>
        }
        title={!isModalView && getString('resourcePage.fileStore')}
        content={
          <Layout.Horizontal
            margin={{ left: 'small' }}
            onClick={e => {
              e.stopPropagation()
              handleUnsavedConfirmation()
            }}
            className={cx((tempNodes[0] && css.disableEvents) || (unsavedNodes[0] && css.disableEvents))}
          >
            {!isFullScreen && (
              <Container data-name="fileStoreSearchContainer">
                <ExpandingSearchInput
                  alwaysExpanded
                  width={isModalView ? 1300 : 200}
                  placeholder={getString('search')}
                  throttle={200}
                  onChange={(query: string) => {
                    debouncedFilesSearch(encodeURIComponent(query))
                    setSearchTerm(query)
                  }}
                  className={css.expandSearch}
                />
              </Container>
            )}
            {!isModalView && (
              <FilterSelector<FilterDTO>
                appliedFilter={appliedFilter}
                filters={filters}
                onFilterBtnClick={openFilterDrawer}
                onFilterSelect={handleFilterSelection}
                fieldToLabelMapping={fieldToLabelMapping}
                filterWithValidFields={removeNullAndEmpty(
                  pick(flattenObject(appliedFilter?.filterProperties || {}), ...fieldToLabelMapping.keys())
                )}
              />
            )}
          </Layout.Horizontal>
        }
      />

      <Page.Body className={cx(!isModalView && !fileStore?.length ? css.fsPageWrapper : undefined)}>
        {loading ? (
          <PageSpinner />
        ) : /* istanbul ignore next */ filesFetchError && shouldShowError(filesFetchError) ? (
          <div style={{ paddingTop: '200px' }}>
            <PageError
              message={(filesFetchError?.data as Error)?.message || filesFetchError?.message}
              onClick={(e: React.MouseEvent<Element, MouseEvent>) => {
                e.preventDefault()
                e.stopPropagation()
                reset()
              }}
            />
          </div>
        ) : (
          <>
            {!fileStore?.length ? (
              <EmptyNodeView
                title={getString('platform.filestore.noFilesInStore')}
                description={getString('platform.filestore.noFilesTitle')}
              />
            ) : (
              <Layout.Horizontal height={isModalView ? (isFullScreen ? '100vh ' : 530) : '100%'}>
                <SplitPane
                  size={splitPaneSize}
                  split="vertical"
                  minSize={312}
                  maxSize={600}
                  style={{ overflow: 'auto' }}
                  pane2Style={{ overflow: 'scroll', zIndex: 2 }}
                  resizerStyle={resizerStyle}
                  onChange={handleStageResize}
                >
                  <StoreExplorer fileStore={fileStore} />
                  <StoreView />
                </SplitPane>

                <NavigationCheck
                  when={!!tempNodes[0] || !!unsavedNodes[0]}
                  navigate={newPath => {
                    history.push(newPath)
                  }}
                />
              </Layout.Horizontal>
            )}
          </>
        )}
        <input id={isModalView ? 'file-upload-modal' : 'file-upload'} name="file" type="file" hidden />
      </Page.Body>
    </>
  )
}

export default function FileStorePage(props: FileStoreProps): React.ReactElement {
  const { isFullScreen, setFullScreen } = props
  return (
    <FileStoreContextProvider {...props}>
      <FileStore isFullScreen={isFullScreen} setFullScreen={setFullScreen} onNodeChange={props.onNodeChange} />
    </FileStoreContextProvider>
  )
}
