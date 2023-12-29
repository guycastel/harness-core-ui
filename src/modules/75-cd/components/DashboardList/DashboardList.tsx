/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { PopoverPosition } from '@blueprintjs/core'
import {
  ExpandingSearchInput,
  Layout,
  Text,
  PageError,
  TableV2,
  TableProps,
  Page,
  useToaster,
  Container,
  useToggleOpen,
  ModalDialog
} from '@harness/uicore'
import { useHistory, useParams } from 'react-router-dom'
import { Color } from '@harness/design-system'
import { defaultTo, noop } from 'lodash-es'
import { useStrings } from 'framework/strings'
import { PageSpinner } from '@common/components'
import ServiceDetailsEmptyState from '@cd/icons/ServiceDetailsEmptyState.svg'
import { useGetCommunity, useGetFreeOrCommunityCD } from '@common/utils/utils'
import GetStartedWithCDButton from '@pipeline/components/GetStartedWithCDButton/GetStartedWithCDButton'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { COMMON_DEFAULT_PAGE_SIZE, COMMON_PAGE_SIZE_OPTIONS } from '@common/constants/Pagination'
import RbacButton from '@rbac/components/Button/Button'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useGetSettingsList, ServiceResponseDTO } from 'services/cd-ng'
import routes from '@common/RouteDefinitions'
import { getDefaultStoreTypeFromSettings, getSettingValue } from '@modules/27-platform/default-settings/utils/utils'
import { SettingType } from '@modules/10-common/constants/Utils'
import useRBACError from '@modules/20-rbac/utils/useRBACError/useRBACError'
import { NewEditServiceModal } from '../PipelineSteps/DeployServiceStep/NewEditServiceModal'
import { ServiceTabs, getRemoteServiceQueryParams } from '../Services/utils/ServiceUtils'
import { useServiceStore } from '../Services/common'
import css from '@cd/components/DashboardList/DashboardList.module.scss'

const PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export interface DashboardListProps<T extends Record<string, any>> {
  HeaderCustomPrimary?: (props: { total: number }) => React.ReactElement
  HeaderCustomSecondary?: (props: { onChange: (val: string) => void }) => React.ReactElement
  sortList: JSX.Element
  columns: TableProps<T>['columns']
  loading: boolean
  error: boolean
  refetch: () => void
  data: T[]
  onRowClick: (data: T) => void
}

const HeaderFilterComponent: React.FC<{ onChange: (val: string) => void }> = props => {
  const { getString } = useStrings()
  const { onChange = noop } = props
  return (
    <Layout.Horizontal>
      <ExpandingSearchInput
        placeholder={getString('search')}
        throttle={200}
        onChange={onChange}
        className={css.searchIcon}
        alwaysExpanded={true}
      />
    </Layout.Horizontal>
  )
}

const applySearch = (items: any[], searchTerm: string): any[] => {
  if (!searchTerm) {
    return items
  }
  return items.filter(item => {
    const term = searchTerm.toLocaleLowerCase()
    return (
      (item?.id || '').toLocaleLowerCase().indexOf(term) !== -1 ||
      (item?.name || '').toLocaleLowerCase().indexOf(term) !== -1
    )
  })
}

export const DashboardList = <T extends Record<string, any>>(props: DashboardListProps<T>): React.ReactElement => {
  const {
    HeaderCustomPrimary = () => <></>,
    HeaderCustomSecondary = HeaderFilterComponent,
    sortList,
    columns,
    loading,
    error,
    refetch,
    data,
    onRowClick
  } = props
  const isFreeOrCommunityCD = useGetFreeOrCommunityCD()
  const { PL_NEW_PAGE_SIZE, CDS_SERVICE_GITX, NG_SVC_ENV_REDESIGN: isSvcEnvEntityEnabled } = useFeatureFlags()
  const { getRBACErrorMessage } = useRBACError()

  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(PL_NEW_PAGE_SIZE ? COMMON_DEFAULT_PAGE_SIZE : PAGE_SIZE)
  const [filteredData, setFilteredData] = useState<T[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showOverlay, setShowOverlay] = useState(false)

  const { getString } = useStrings()
  const { isOpen, open: showModal, close: hideModal } = useToggleOpen()

  const { fetchDeploymentList } = useServiceStore()
  const isCommunity = useGetCommunity()
  const history = useHistory()
  const { showError } = useToaster()
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<ProjectPathProps & ModulePathParams>()

  const [isEdit, setIsEdit] = useState(false)
  const [serviceDetails, setServiceDetails] = useState({
    name: '',
    identifier: '',
    orgIdentifier,
    projectIdentifier,
    description: '',
    tags: {}
  })

  const {
    data: gitXSetting,
    error: gitXSettingError,
    loading: loadingSetting
  } = useGetSettingsList({
    queryParams: {
      category: 'GIT_EXPERIENCE',
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    },
    lazy: !CDS_SERVICE_GITX
  })

  React.useEffect(() => {
    if (!loadingSetting && gitXSettingError) {
      showError(getRBACErrorMessage(gitXSettingError))
    }
  }, [gitXSettingError, showError, loadingSetting])

  useEffect(() => {
    if (isEdit) {
      showModal()
    }
  }, [isEdit])

  const goToServiceDetails = useCallback(
    (selectedService: ServiceResponseDTO): void => {
      if (isCommunity) {
        const newServiceData = {
          name: defaultTo(selectedService.name, ''),
          identifier: defaultTo(selectedService.identifier, ''),
          orgIdentifier,
          projectIdentifier,
          description: defaultTo(selectedService.description, ''),
          tags: defaultTo(selectedService.tags, {})
        }
        setServiceDetails({ ...newServiceData })
        setIsEdit(true)
        return
      }
      if (selectedService?.identifier) {
        const remoteQueryParams = getRemoteServiceQueryParams(selectedService, true)
        history.push({
          pathname: routes.toServiceStudio({
            accountId,
            orgIdentifier,
            projectIdentifier,
            serviceId: selectedService?.identifier,
            module
          }),
          search: isSvcEnvEntityEnabled
            ? `tab=${ServiceTabs.Configuration}${remoteQueryParams}`
            : projectIdentifier
            ? `tab=${ServiceTabs.SUMMARY}${remoteQueryParams}`
            : `tab=${ServiceTabs.REFERENCED_BY}${remoteQueryParams}`
        })
      } else {
        showError(getString('cd.serviceList.noIdentifier'))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountId, orgIdentifier, projectIdentifier, module]
  )

  const onServiceCreate = (values: ServiceResponseDTO): void => {
    if (isSvcEnvEntityEnabled) {
      goToServiceDetails(values)
    } else {
      fetchDeploymentList.current?.()
      hideModal()
    }
  }

  const newServiceDialog = (
    <ModalDialog
      isOpen={isOpen}
      enforceFocus={false}
      canEscapeKeyClose
      canOutsideClickClose
      onClose={() => {
        hideModal()
        setIsEdit(false)
      }}
      title={isEdit ? getString('editService') : getString('cd.addService')}
      isCloseButtonShown
      width={800}
      showOverlay={showOverlay || loadingSetting}
    >
      <Container>
        <NewEditServiceModal
          data={
            isEdit
              ? serviceDetails
              : {
                  name: '',
                  identifier: '',
                  orgIdentifier,
                  projectIdentifier,
                  ...(CDS_SERVICE_GITX ? { storeType: getDefaultStoreTypeFromSettings(gitXSetting) } : {})
                }
          }
          isEdit={isEdit}
          isService={!isEdit}
          isGitXEnforced={getSettingValue(gitXSetting, SettingType.ENFORCE_GIT_EXPERIENCE) === 'true'}
          onCreateOrUpdate={values => {
            onServiceCreate(values)
            setIsEdit(false)
          }}
          closeModal={() => {
            hideModal()
            setIsEdit(false)
          }}
          setShowOverlay={setShowOverlay}
        />
      </Container>
    </ModalDialog>
  )

  useEffect(() => {
    setPageIndex(0)
    setFilteredData(applySearch(data, searchTerm))
  }, [data, searchTerm])

  const onSearchChange = useCallback((val: string): void => {
    setSearchTerm(val)
  }, [])

  const getComponent = (): React.ReactElement => {
    if (loading) {
      return (
        <Container className={css.listStateContainer}>
          <PageSpinner />
        </Container>
      )
    }
    if (error) {
      return (
        <Container className={css.listStateContainer}>
          <PageError onClick={() => refetch()} />
        </Container>
      )
    }
    if (!filteredData?.length) {
      return (
        <Layout.Vertical
          height="80%"
          flex={{ align: 'center-center' }}
          padding={{ top: 'medium' }}
          data-test="deploymentsWidgetEmpty"
        >
          <img width="150" height="100" src={ServiceDetailsEmptyState} style={{ alignSelf: 'center' }} />
          <Text color={Color.GREY_400} margin={{ top: 'medium' }}>
            {getString('cd.serviceDashboard.noServiceDetails')}
          </Text>
          {isFreeOrCommunityCD && <GetStartedWithCDButton className={css.paddingTop} hideOrSection />}
        </Layout.Vertical>
      )
    }
    return (
      <TableV2<T>
        columns={columns}
        data={filteredData.slice(pageSize * pageIndex, pageSize * (pageIndex + 1))}
        className={css.table}
        pagination={{
          itemCount: filteredData.length,
          pageSize,
          pageCount: Math.ceil(filteredData.length / pageSize),
          pageIndex: pageIndex,
          gotoPage: pageNum => {
            setPageIndex(pageNum)
          },
          onPageSizeChange: size => {
            setPageSize(size)
            setPageIndex(0)
          },
          showPagination: true,
          pageSizeDropdownProps: {
            usePortal: true,
            popoverProps: {
              position: PopoverPosition.TOP
            }
          },
          pageSizeOptions: PL_NEW_PAGE_SIZE ? COMMON_PAGE_SIZE_OPTIONS : PAGE_SIZE_OPTIONS
        }}
        onRowClick={onRowClick}
      />
    )
  }

  return (
    <Layout.Vertical className={css.container}>
      <Page.SubHeader className={css.subHeader}>
        <RbacButton
          intent="primary"
          data-testid="add-service"
          icon="plus"
          iconProps={{ size: 10 }}
          text={getString('newService')}
          permission={{
            permission: PermissionIdentifier.EDIT_SERVICE,
            resource: {
              resourceType: ResourceType.SERVICE
            }
          }}
          onClick={showModal}
        />
        <HeaderCustomSecondary onChange={onSearchChange} />
      </Page.SubHeader>
      <Layout.Horizontal flex={{ justifyContent: 'space-between' }} padding={{ right: 'large', left: 'large' }}>
        <HeaderCustomPrimary total={filteredData.length} />
        {sortList}
      </Layout.Horizontal>
      {getComponent()}
      {newServiceDialog}
    </Layout.Vertical>
  )
}
