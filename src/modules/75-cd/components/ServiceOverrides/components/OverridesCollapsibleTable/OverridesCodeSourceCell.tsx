import { CellProps, ColumnInstance, Renderer } from 'react-table'
import React, { useEffect, useState } from 'react'
import {
  Icon,
  Layout,
  ModalDialog,
  Popover,
  Text,
  FormInput,
  Button,
  ButtonVariation,
  useToggleOpen,
  FormikForm,
  Formik,
  SelectOption
} from '@harness/uicore'
import * as Yup from 'yup'
import { Classes, PopoverInteractionKind, Position } from '@blueprintjs/core'
import { Color, FontVariation } from '@harness/design-system'
import { get, isEmpty } from 'lodash-es'
import { FormikProps } from 'formik'
import { useParams } from 'react-router-dom'
import { useStrings } from 'framework/strings'
import { CodeSourceWrapper } from '@modules/70-pipeline/components/CommonPipelineStages/PipelineStage/utils'
import { GitSyncForm, gitSyncFormSchema } from '@modules/40-gitsync/components/GitSyncForm/GitSyncForm'
import { getConnectorValue } from '@modules/27-platform/connectors/components/ConnectorReferenceField/ConnectorReferenceField'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { StoreMetadata, StoreType } from '@modules/10-common/constants/GitSyncTypes'
import { GitContextProps } from '@modules/10-common/components/GitContextForm/GitContextForm'
import { ProjectPathProps } from '@modules/10-common/interfaces/RouteInterfaces'
import { getServiceOverridesV2Promise } from 'services/cd-ng'
import {
  EntityCachedCopy,
  EntityCachedCopyHandle
} from '@modules/70-pipeline/components/PipelineStudio/PipelineCanvas/EntityCachedCopy/EntityCachedCopy'
import { ServiceOverrideSectionProps, ServiceOverridesResponseDTOV2 } from '../../ServiceOverridesUtils'
import { useServiceOverridesContext } from '../../context/ServiceOverrideContext'
import { RemoteOverrideMetadata } from './OverridesCollapsibleTable'
import css from './OverridesCollapsibleTable.module.scss'

interface CodeSourceCellProps {
  remoteOverrideMetadataMap: Map<string, RemoteOverrideMetadata>
  setRemoteOverrideMetadataMap: React.Dispatch<React.SetStateAction<Map<string, RemoteOverrideMetadata>>>
  setExpandedRows: React.Dispatch<React.SetStateAction<Set<string>>>
}

export const OverridesCodeSourceCell: Renderer<CellProps<ServiceOverrideSectionProps>> = ({ row, column }) => {
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { remoteOverrideMetadataMap, setRemoteOverrideMetadataMap, setExpandedRows } =
    column as ColumnInstance<ServiceOverrideSectionProps> & CodeSourceCellProps
  const { entityGitInfo, storeType, identifier } = (row.original?.overrideResponse ||
    {}) as ServiceOverridesResponseDTOV2
  const isRemote = storeType === 'REMOTE'
  const { getString } = useStrings()
  const { CDS_OVERRIDES_GITX } = useFeatureFlags()

  const inlineWrapper: CodeSourceWrapper = {
    textName: getString('inline'),
    iconName: 'repository',
    size: 10
  }
  const remoteWrapper: CodeSourceWrapper = {
    textName: getString('repository'),
    iconName: 'remote-setup',
    size: 12
  }
  const formikRef = React.useRef<FormikProps<GitContextProps & StoreMetadata>>()
  const {
    newRemoteOverrideGitDetailsRef,
    serviceOverrideType,
    newOverrideEnvironmentInputRef,
    newOverrideInfraInputRef,
    newOverrideServiceInputRef
  } = useServiceOverridesContext()

  const [codeSource, setCodeSource] = useState<SelectOption>({
    label: getString('inline'),
    value: StoreType.INLINE
  })
  const [remoteSelectCount, setRemoteSelectCount] = useState(0)
  const { close, open, isOpen } = useToggleOpen()

  const envRef = newOverrideEnvironmentInputRef.current?.values?.['environmentRef']
  const serviceRef = newOverrideServiceInputRef.current?.values?.['serviceRef']
  const infraRef = newOverrideInfraInputRef.current?.values?.['infraIdentifier']
  const overrideCachedCopyRef = React.useRef<EntityCachedCopyHandle | null>(null)

  useEffect(() => {
    let filePathValue = ''
    if (row.original?.isNew && codeSource?.value === 'REMOTE') {
      if (serviceOverrideType === 'ENV_GLOBAL_OVERRIDE' && envRef) {
        filePathValue = `.harness/overrides/${envRef}.yaml`
      } else if (serviceOverrideType === 'ENV_SERVICE_OVERRIDE' && envRef && serviceRef) {
        filePathValue = `.harness/overrides/${envRef}_${serviceRef}.yaml`
      } else if (serviceOverrideType === 'INFRA_GLOBAL_OVERRIDE' && envRef && infraRef) {
        filePathValue = `.harness/overrides/${envRef}_${infraRef}.yaml`
      } else if (serviceOverrideType === 'INFRA_SERVICE_OVERRIDE' && envRef && serviceRef && infraRef) {
        filePathValue = `.harness/overrides/${envRef}_${serviceRef}_${infraRef}.yaml`
      }
      formikRef.current?.setFieldValue('filePath', filePathValue)
    }
  }, [envRef, serviceRef, infraRef, serviceOverrideType, codeSource?.value, row.original?.isNew])

  const handleSubmit = (values: GitContextProps & StoreMetadata): void => {
    newRemoteOverrideGitDetailsRef.current?.setFieldValue('storeType', StoreType.REMOTE)
    newRemoteOverrideGitDetailsRef.current?.setFieldValue(
      'connectorRef',
      getConnectorValue(values?.connectorRef as string)
    )
    newRemoteOverrideGitDetailsRef.current?.setFieldValue('repo', values?.repo)
    newRemoteOverrideGitDetailsRef.current?.setFieldValue('branch', values?.branch)
    newRemoteOverrideGitDetailsRef.current?.setFieldValue('filePath', values?.filePath)
  }

  const fetchRemoteOverrideData = async (id: string): Promise<void> => {
    try {
      const response = await getServiceOverridesV2Promise({
        queryParams: {
          accountIdentifier: accountId,
          orgIdentifier,
          projectIdentifier,
          repoName: entityGitInfo?.repoName,
          loadFromFallbackBranch: true
        },
        identifier: identifier as string,
        requestOptions: {
          headers: {
            'Load-From-Cache': 'false'
          }
        }
      })
      if (response) {
        setRemoteOverrideMetadataMap(
          (map: Map<string, RemoteOverrideMetadata>) =>
            new Map(
              map.set(id, {
                isLoading: false,
                remoteOverrideResponse: response
              })
            )
        )
      }
    } catch (err) {
      setRemoteOverrideMetadataMap(
        (map: Map<string, RemoteOverrideMetadata>) =>
          new Map(
            map.set(id, {
              isLoading: false
            })
          )
      )
    }
  }
  const remoteOverrideResponseData = remoteOverrideMetadataMap?.get(identifier)?.remoteOverrideResponse

  function handleReloadFromCache(): void {
    setRemoteOverrideMetadataMap(
      (map: Map<string, RemoteOverrideMetadata>) =>
        new Map(
          map.set(identifier as string, {
            isLoading: true
          })
        )
    )
    fetchRemoteOverrideData(identifier as string)
    setExpandedRows((prevExpandedRows: Set<string>) => {
      if (row.original?.id) {
        const isRowExpanded = prevExpandedRows.has(row.original?.id)
        if (!isRowExpanded) {
          prevExpandedRows.add(row.original?.id)
        } else {
          prevExpandedRows.delete(row.original?.id)
        }
      }
      return new Set(prevExpandedRows)
    })
  }

  useEffect(() => {
    if (row.original?.isNew) {
      setCodeSource({
        label: getString('inline'),
        value: StoreType.INLINE
      })
    }
  }, [getString, row.original?.isNew])

  if (CDS_OVERRIDES_GITX && row.original?.isNew) {
    return (
      <>
        <Layout.Horizontal margin={{ top: 'medium' }} key={row.original?.id}>
          <FormInput.Select
            name={'codeSource'}
            items={[
              { label: getString('inline'), value: StoreType.INLINE },
              { label: getString('remote'), value: StoreType.REMOTE }
            ]}
            onChange={val => {
              setCodeSource(val)
              formikRef.current?.setFieldValue('storeType', val.value)
              if (val.value === StoreType.REMOTE && remoteSelectCount === 0) {
                open()
                setRemoteSelectCount(1)
              }
            }}
            value={codeSource}
          />
          {codeSource?.value === StoreType.REMOTE && (
            <Button
              icon="Edit"
              variation={ButtonVariation.ICON}
              font={{ variation: FontVariation.BODY1 }}
              disabled={remoteSelectCount === 0}
              onClick={() => {
                open()
              }}
            />
          )}
        </Layout.Horizontal>
        {codeSource?.value === StoreType.REMOTE && !isEmpty(newRemoteOverrideGitDetailsRef.current?.errors) && (
          <Text
            icon="circle-cross"
            margin={{ right: 'medium' }}
            font={{ size: 'small' }}
            iconProps={{ size: 12, color: Color.RED_600 }}
            color={Color.RED_600}
            width={200}
            className={css.gitSyncErrorMessage}
          >
            {getString('cd.overrideValidations.overrideGitDetailsRequired')}
          </Text>
        )}
        <Formik
          onSubmit={handleSubmit}
          formName="remoteOverrideForm"
          initialValues={{
            connectorRef: '',
            repo: '',
            filePath: '',
            branch: '',
            storeType: 'INLINE'
          }}
          validationSchema={Yup.object().shape({
            ...gitSyncFormSchema(getString)
          })}
          innerRef={
            newRemoteOverrideGitDetailsRef as React.MutableRefObject<FormikProps<GitContextProps & StoreMetadata>>
          }
        >
          {formikProps => {
            formikRef.current = formikProps
            return (
              <ModalDialog
                isOpen={isOpen}
                onClose={close}
                enforceFocus={false}
                title={getString('cd.override.gitDetails')}
                width={800}
                footer={
                  <Layout.Horizontal spacing="small">
                    <Button
                      variation={ButtonVariation.PRIMARY}
                      text={getString('save')}
                      intent="primary"
                      onClick={() => {
                        formikProps?.submitForm()
                        if (isEmpty(formikProps?.errors)) {
                          close()
                        }
                      }}
                    />
                    <Button variation={ButtonVariation.TERTIARY} text={getString('cancel')} onClick={() => close()} />
                  </Layout.Horizontal>
                }
              >
                <FormikForm style={{ overflowX: 'hidden' }}>
                  <GitSyncForm formikProps={formikProps} isEdit={false} className={css.gitSyncForm} />
                </FormikForm>
              </ModalDialog>
            )
          }}
        </Formik>
      </>
    )
  }

  return (
    <Layout.Horizontal flex>
      <Popover
        disabled={!isRemote}
        position={Position.TOP}
        interactionKind={PopoverInteractionKind.HOVER}
        className={Classes.DARK}
        content={
          <Layout.Vertical spacing="small" padding="large" className={css.contentWrapper}>
            <Layout.Horizontal spacing="small" flex={{ alignItems: 'center', justifyContent: 'start' }}>
              <Icon name="github" size={14} color={Color.GREY_200} />
              <Text color={Color.WHITE} font={{ variation: FontVariation.SMALL }}>
                {get(entityGitInfo, 'repoName', get(entityGitInfo, 'repoIdentifier'))}
              </Text>
            </Layout.Horizontal>
            {entityGitInfo?.filePath && (
              <Layout.Horizontal spacing="small" flex={{ alignItems: 'center', justifyContent: 'start' }}>
                <Icon name="remotefile" size={14} color={Color.GREY_200} />
                <Text lineClamp={1} color={Color.WHITE} font={{ variation: FontVariation.SMALL }}>
                  {entityGitInfo.filePath}
                </Text>
              </Layout.Horizontal>
            )}
          </Layout.Vertical>
        }
      >
        <Layout.Horizontal
          spacing="small"
          padding="small"
          border={{ radius: 3 }}
          background={Color.GREY_100}
          width={90}
        >
          <Icon
            name={isRemote ? remoteWrapper.iconName : inlineWrapper.iconName}
            size={isRemote ? remoteWrapper.size : inlineWrapper.size}
            color={Color.GREY_600}
          />
          <Text margin={{ left: 'xsmall' }} font={{ variation: FontVariation.TINY_SEMI }} color={Color.GREY_600}>
            {isRemote ? remoteWrapper.textName : inlineWrapper.textName}
          </Text>
        </Layout.Horizontal>
      </Popover>

      {remoteOverrideResponseData?.status === 'SUCCESS' && row?.isExpanded && (
        <EntityCachedCopy
          ref={overrideCachedCopyRef}
          reloadContent={getString('common.override')}
          cacheResponse={get(remoteOverrideResponseData?.data, 'cacheResponseMetadataDTO')}
          reloadFromCache={handleReloadFromCache}
          filePath={remoteOverrideResponseData?.data?.entityGitInfo?.filePath || ''}
          repo={remoteOverrideResponseData?.data?.entityGitInfo?.repoName || ''}
        />
      )}
    </Layout.Horizontal>
  )
}
