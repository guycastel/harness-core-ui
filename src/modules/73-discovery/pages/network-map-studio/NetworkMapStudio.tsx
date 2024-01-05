/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
import React from 'react'
import { useHistory, useParams } from 'react-router-dom'
import {
  Button,
  ButtonVariation,
  ConfirmationDialog,
  ConfirmationDialogProps,
  Container,
  FlexExpander,
  Formik,
  FormikForm,
  Icon,
  Layout,
  ModalDialog,
  Tab,
  Tabs,
  Text,
  useToaster,
  useToggleOpen
} from '@harness/uicore'
import * as Yup from 'yup'
import { Color, Intent } from '@harness/design-system'
import qs from 'qs'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'

import { useStrings, String } from 'framework/strings'

import { NavigationCheck, Page } from '@common/exports'
import type {
  ModulePathParams,
  NetworkMapPathProps,
  NetworkMapQueryParams,
  ProjectPathProps
} from '@common/interfaces/RouteInterfaces'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import routesV1 from '@common/RouteDefinitions'
import routesV2 from '@common/RouteDefinitionsV2'
import { NameIdDescriptionTags } from '@common/components/NameIdDescriptionTags/NameIdDescriptionTags'
import { StudioTabs } from '@discovery/interface/networkMapStudio'
import RbacButton from '@rbac/components/Button/Button'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ApiCreateNetworkMapRequest, useCreateNetworkMap, useGetNetworkMap } from 'services/servicediscovery'
import { DiscoveryObjectStoreNames, useDiscoveryIndexedDBHook } from '@discovery/hooks/useDiscoveryIndexedDBHook'
import { DiscoveryTabs } from '@discovery/interface/discovery'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import SelectService from './views/select-service/SelectService'
import ConfigureNetworkMap from './views/configure/ConfigureNetworkMap'
import css from './NetworkMapStudio.module.scss'

export interface FormValues {
  identifier: string
  name: string
  description?: string
  tags?: string[]
}

export default function NetworkMapStudio(): React.ReactElement {
  const history = useHistory()
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesV2 : routesV1
  const { accountId, orgIdentifier, projectIdentifier, module, dAgentId, networkMapId } = useParams<
    ProjectPathProps & ModulePathParams & NetworkMapPathProps
  >()
  const { unsavedChanges, tab, ...otherSearchParams } = useQueryParams<NetworkMapQueryParams>()
  const { getString } = useStrings()
  const { showError, showSuccess } = useToaster()
  const { dbInstance } = useDiscoveryIndexedDBHook({
    clearStoreList: [DiscoveryObjectStoreNames.NETWORK_MAP]
  })

  useDocumentTitle(getString('discovery.createNetworkMap'))
  const { updateQueryParams } = useUpdateQueryParams()
  const [networkMap, setNetworkMap] = React.useState<ApiCreateNetworkMapRequest>({
    identity: '',
    name: '',
    resources: []
  })
  const {
    isOpen: isChangeNameToggleOpen,
    open: openChangeNameToggle,
    close: closeChangeNameToggle
  } = useToggleOpen(false)
  const { isOpen: isOpenDiscardDialog, open: openDiscardDialog, close: closeDiscardDialog } = useToggleOpen()

  const safeToNavigate = unsavedChanges === 'false'
  const setSafeToNavigate = (safe: boolean): void => {
    updateQueryParams({ unsavedChanges: (!safe).toString() })
  }

  const { mutate: createNetworkMapMutate } = useCreateNetworkMap({
    queryParams: {
      accountIdentifier: accountId,
      organizationIdentifier: orgIdentifier,
      projectIdentifier: projectIdentifier
    },
    agentIdentity: dAgentId ?? ''
  })

  const { data: networkMapFromAPI, refetch: refetchNetworkMap } = useGetNetworkMap({
    queryParams: {
      accountIdentifier: accountId,
      organizationIdentifier: orgIdentifier,
      projectIdentifier: projectIdentifier
    },
    agentIdentity: dAgentId ?? '',
    networkMapIdentity: networkMapId,
    lazy: true
  })

  const discardDialogProps: ConfirmationDialogProps = {
    isOpen: isOpenDiscardDialog,
    contentText: getString('discovery.discardNetworkMap'),
    titleText: getString('common.confirmText'),
    cancelButtonText: getString('cancel'),
    confirmButtonText: getString('confirm'),
    intent: Intent.WARNING,
    onClose: (isConfirmed: boolean) => {
      if (isConfirmed) {
        setSafeToNavigate(true)
        dbInstance
          ?.delete(DiscoveryObjectStoreNames.NETWORK_MAP, networkMapId)
          .then(() =>
            history.push(routes.toDiscoveredResource({ accountId, projectIdentifier, orgIdentifier, module, dAgentId }))
          )
      }
      closeDiscardDialog()
    }
  }

  const discardExperimentDialog = <ConfirmationDialog {...discardDialogProps} />

  const handleTabChange = (tabID: StudioTabs): void => {
    switch (tabID) {
      case StudioTabs.SELECT_SERVICES:
        history.push({
          pathname: routes.toCreateNetworkMap({
            accountId,
            projectIdentifier,
            orgIdentifier,
            module,
            dAgentId,
            networkMapId
          }),
          search: qs.stringify(
            { unsavedChanges, tab: StudioTabs.SELECT_SERVICES, ...otherSearchParams },
            { skipNulls: true }
          )
        })
        break
      case StudioTabs.CONFIGURE_RELATIONS:
        history.push({
          pathname: routes.toCreateNetworkMap({
            accountId,
            projectIdentifier,
            orgIdentifier,
            module,
            dAgentId,
            networkMapId
          }),
          search: qs.stringify(
            { unsavedChanges, tab: StudioTabs.CONFIGURE_RELATIONS, ...otherSearchParams },
            { skipNulls: true }
          )
        })
    }
  }

  const handleCreateNetworkMap = async (): Promise<void> => {
    const networkMapFromIDB = await dbInstance?.get(DiscoveryObjectStoreNames.NETWORK_MAP, networkMapId)
    /* istanbul ignore next */
    if (
      !networkMapFromIDB ||
      !networkMapFromIDB.identity ||
      !networkMapFromIDB.name ||
      !networkMapFromIDB.resources ||
      networkMapFromIDB.resources.length === 0
    ) {
      return
    }
    setSafeToNavigate(true)

    if (networkMapFromIDB.tags) networkMapFromIDB.tags = Object.keys(networkMapFromIDB.tags)

    await createNetworkMapMutate(networkMapFromIDB)
      .then(() => {
        showSuccess(getString('discovery.networkMapCreated'))
        history.push(
          routes.toDiscoveredResource({
            accountId,
            orgIdentifier,
            projectIdentifier,
            module,
            dAgentId: dAgentId
          })
        )
      })
      .catch(/* istanbul ignore next */ error => showError(error.data?.description || error.data?.message))
  }

  React.useEffect(() => {
    if (networkMapId !== '-1') {
      dbInstance?.get(DiscoveryObjectStoreNames.NETWORK_MAP, networkMapId).then(nwMap => {
        if (!nwMap) {
          /* istanbul ignore next */
          refetchNetworkMap().then(() => {
            if (networkMapFromAPI) {
              const tags: { [key: string]: string } = {}
              networkMapFromAPI.tags?.map(tag => {
                tags[tag] = ''
              })

              updateNetworkMap({ ...networkMapFromAPI, tags } as unknown as ApiCreateNetworkMapRequest)
            }
          })
        } else {
          setNetworkMap(nwMap)
        }
      })
    } else {
      openChangeNameToggle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkMapId, dbInstance, networkMapFromAPI])

  /* istanbul ignore next */
  async function updateNetworkMap(updatedNetworkMap: ApiCreateNetworkMapRequest): Promise<void> {
    setNetworkMap(updatedNetworkMap)
    await dbInstance?.put(DiscoveryObjectStoreNames.NETWORK_MAP, updatedNetworkMap)
  }

  return (
    <>
      <NavigationCheck
        when={true}
        shouldBlockNavigation={nextLocation => {
          const isNextLocationNotNetworkMapStudio = !nextLocation.pathname.includes('network-map-studio')
          if (safeToNavigate && isNextLocationNotNetworkMapStudio) {
            dbInstance?.delete(DiscoveryObjectStoreNames.NETWORK_MAP, networkMapId)
          }
          return !safeToNavigate && isNextLocationNotNetworkMapStudio
        }}
        navigate={/* istanbul ignore next */ (newLocation: string) => history.push(newLocation)}
      />
      <Page.Header
        breadcrumbs={
          <NGBreadcrumbs
            links={[
              {
                url: routes.toDiscovery({ accountId, orgIdentifier, projectIdentifier, module }),
                label: getString('common.discovery')
              },
              {
                url:
                  routes.toDiscoveredResource({
                    accountId,
                    orgIdentifier,
                    projectIdentifier,
                    dAgentId,
                    module
                  }) +
                  '?' +
                  qs.stringify({ tab: DiscoveryTabs.DISCOVERED_RESOURCES }),
                label: dAgentId ?? networkMap.identity
              }
            ]}
          />
        }
        title={
          <>
            <String tagName="div" className={css.networkMapTitle} stringID="common.networkMap" />
            <Layout.Horizontal
              spacing="small"
              flex={{ alignItems: 'center', justifyContent: 'flex-start' }}
              onClick={() => openChangeNameToggle()}
            >
              <Text color={Color.GREY_900} font="medium">
                {networkMap.name}
              </Text>
              <Icon data-testid="edit" name="code-edit" size={20} className={css.headerIcon} />
            </Layout.Horizontal>
            <ModalDialog
              isOpen={isChangeNameToggleOpen}
              onClose={closeChangeNameToggle}
              title={getString('discovery.newNetworkMap')}
              canEscapeKeyClose={false}
              canOutsideClickClose={false}
              enforceFocus={false}
              isCloseButtonShown={false}
              lazy
            >
              <Formik<Pick<ApiCreateNetworkMapRequest, 'identity' | 'name' | 'description' | 'tags'>>
                initialValues={networkMap}
                formName="networkMapNameForm"
                validationSchema={Yup.object().shape({
                  name: Yup.string()
                    .trim()
                    .matches(/^[a-z0-9-]*$/, 'NetworkMap Name can only contain lowercase letters, numbers and dashes')
                    .matches(/^[^-].*$/, 'NetworkMap Name can not start with -')
                    .matches(/^.*[^-]$/, 'NetworkMap Name can not end with -')
                    .max(50, 'NetworkMap Name can have a max length of 50 characters')
                    .required('NetworkMap Name is required!'),
                  identity: Yup.string().trim().required()
                })}
                onSubmit={async values => {
                  const tx = dbInstance?.transaction(DiscoveryObjectStoreNames.NETWORK_MAP, 'readwrite')
                  const store = tx?.objectStore(DiscoveryObjectStoreNames.NETWORK_MAP)
                  if (networkMapId !== '-1') {
                    const networkMapFromIDB = await store?.get(networkMapId)
                    values = { ...networkMapFromIDB, ...values }
                    await store?.delete(networkMapId)
                  }
                  await store?.put({ ...values, resources: [] })
                  await tx?.done
                  setNetworkMap({ ...values, resources: [] })

                  history.push({
                    pathname: routes.toCreateNetworkMap({
                      accountId,
                      projectIdentifier,
                      orgIdentifier,
                      module,
                      dAgentId,
                      networkMapId: values.identity
                    }),
                    search: qs.stringify(
                      { unsavedChanges: 'true', tab: StudioTabs.SELECT_SERVICES, ...otherSearchParams },
                      { skipNulls: true }
                    )
                  })
                  closeChangeNameToggle()
                }}
              >
                {formikProps => (
                  <FormikForm>
                    <Container width="300px" padding={{ bottom: 'small' }}>
                      <NameIdDescriptionTags
                        formikProps={formikProps}
                        identifierProps={{ isIdentifierEditable: true, idName: 'identity' }}
                      />
                    </Container>
                    <FlexExpander />
                    <Layout.Horizontal
                      flex={{ justifyContent: 'flex-start' }}
                      padding={{ bottom: 'medium' }}
                      spacing={'medium'}
                    >
                      <Button type="submit" variation={ButtonVariation.PRIMARY} text={getString('confirm')} />
                      <Button
                        variation={ButtonVariation.TERTIARY}
                        text={getString('cancel')}
                        onClick={() => closeChangeNameToggle()}
                      />
                    </Layout.Horizontal>
                  </FormikForm>
                )}
              </Formik>
            </ModalDialog>
          </>
        }
        toolbar={
          <Layout.Horizontal spacing="small">
            <Button
              variation={ButtonVariation.SECONDARY}
              text={getString('common.discard')}
              onClick={openDiscardDialog}
            />
            <RbacButton
              permission={{
                resource: {
                  resourceType: ResourceType.NETWORK_MAP
                },
                permission: PermissionIdentifier.CREATE_NETWORK_MAP
              }}
              disabled={networkMap.resources.length === 0}
              icon="run-pipeline"
              variation={ButtonVariation.PRIMARY}
              text={getString('save')}
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()

                handleCreateNetworkMap()
              }}
            />
          </Layout.Horizontal>
        }
      />
      <Page.Body className={css.listBody}>
        <section className={css.setupShell}>
          <Tabs
            id="networkMapTabs"
            onChange={handleTabChange}
            defaultSelectedTabId={StudioTabs.SELECT_SERVICES}
            selectedTabId={tab}
          >
            <Tab
              id={StudioTabs.SELECT_SERVICES}
              panel={
                <SelectService
                  networkMap={networkMap}
                  updateNetworkMap={updateNetworkMap}
                  handleTabChange={handleTabChange}
                />
              }
              title={getString('discovery.tabs.selectServices')}
            />
            <Icon
              name="chevron-right"
              height={20}
              size={20}
              margin={{ right: 'small', left: 'small' }}
              color={Color.GREY_400}
              style={{ alignSelf: 'center' }}
            />

            <Tab
              id={StudioTabs.CONFIGURE_RELATIONS}
              disabled={!networkMap}
              panel={
                <ConfigureNetworkMap
                  networkMap={networkMap}
                  updateNetworkMap={updateNetworkMap}
                  handleTabChange={handleTabChange}
                />
              }
              title={getString('discovery.tabs.configureRelations')}
            />
          </Tabs>
          {discardExperimentDialog}
        </section>
      </Page.Body>
    </>
  )
}
