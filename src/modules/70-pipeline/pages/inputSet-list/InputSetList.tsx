/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultTo, isEmpty, pick } from 'lodash-es'
import {
  Popover,
  Layout,
  TextInput,
  Text,
  ButtonVariation,
  useToaster,
  ListHeader,
  sortByCreated,
  sortByName,
  SortMethod
} from '@harness/uicore'
import { useModalHook } from '@harness/use-modal'
import { Color } from '@harness/design-system'
import { Menu, MenuItem, Position } from '@blueprintjs/core'
import { useHistory, useParams } from 'react-router-dom'
import { HelpPanel, HelpPanelType } from '@harness/help-panel'
import { getPipelineInputs, InputsResponseBody } from '@harnessio/react-pipeline-service-client'
import { Page } from '@common/exports'
import {
  InputSetSummaryResponse,
  useDeleteInputSetForPipeline,
  useGetInputSetsListForPipeline,
  useGetTemplateFromPipeline
} from 'services/pipeline-ng'
import type { Error } from 'services/template-ng'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { OverlayInputSetForm } from '@pipeline/components/OverlayInputSetForm/OverlayInputSetForm'
import routes from '@common/RouteDefinitions'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { isSimplifiedYAMLEnabled } from '@common/utils/utils'
import type { PipelinePathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { useStrings } from 'framework/strings'
import RbacButton from '@rbac/components/Button/Button'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { usePermission } from '@rbac/hooks/usePermission'
import NoEntityFound from '@pipeline/pages/utils/NoEntityFound/NoEntityFound'
import useMigrateResource from '@pipeline/components/MigrateResource/useMigrateResource'
import { StoreType } from '@common/constants/GitSyncTypes'
import { ResourceType as ImportResourceType } from '@common/interfaces/GitSyncInterface'
import { useMutateAsGet, useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { useGetPipelineSummaryQuery } from 'services/pipeline-rq'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import { PAGE_NAME } from '@common/pages/pageContext/PageName'
import { YamlVersion } from '@modules/70-pipeline/common/hooks/useYamlVersion'
import { InputSetListView } from './InputSetListView'
import { InputSetListQueryParams, useInputSetListQueryParamOptions } from './Util'
import css from './InputSetList.module.scss'

function InputSetList(): React.ReactElement {
  const { preference: sortPreference = SortMethod.Newest, setPreference: setSortPreference } =
    usePreferenceStore<SortMethod>(PreferenceScope.USER, `sort-${PAGE_NAME.InputSetList}`)
  const queryParamOptions = useInputSetListQueryParamOptions()
  const { connectorRef, repoIdentifier, repoName, branch, storeType, page, size, searchTerm } =
    useQueryParams(queryParamOptions)
  const { updateQueryParams } = useUpdateQueryParams<InputSetListQueryParams>()
  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier, module } = useParams<
    PipelineType<PipelinePathProps> & { accountId: string }
  >()
  const { showSuccess, showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { getString } = useStrings()
  const [inputSetToDelete, setInputSetToDelete] = useState<InputSetSummaryResponse>()
  const [pipelineInputs, setPipelineInputs] = useState<InputsResponseBody>({})

  const {
    data: inputSet,
    loading,
    refetch,
    error
  } = useGetInputSetsListForPipeline({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      pipelineIdentifier,
      pageIndex: page,
      pageSize: size,
      searchTerm: searchTerm?.trim(),
      ...(!isEmpty(repoIdentifier) && !isEmpty(branch)
        ? {
            repoIdentifier,
            branch,
            getDefaultFromOtherRepo: true
          }
        : {}),
      sortOrders: [sortPreference]
    },
    queryParamStringifyOptions: { arrayFormat: 'repeat' },
    debounce: !isEmpty(searchTerm) ? 300 : false
  })

  const { showMigrateResourceModal: showImportResourceModal } = useMigrateResource({
    resourceType: ImportResourceType.INPUT_SETS,
    modalTitle: getString('common.importEntityFromGit', { resourceType: getString('inputSets.inputSetLabel') }),
    onSuccess: refetch,
    extraQueryParams: { pipelineIdentifier: pipelineIdentifier }
  })

  const { data: template, error: templateError } = useMutateAsGet(useGetTemplateFromPipeline, {
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      pipelineIdentifier,
      projectIdentifier,
      repoIdentifier,
      branch,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoName
    },
    body: {
      stageIdentifiers: []
    },
    requestOptions: { headers: { 'Load-From-Cache': 'true' } }
  })

  const { CI_YAML_VERSIONING, CDS_YAML_SIMPLIFICATION, PIE_INPUTSET_RBAC_PERMISSIONS } = useFeatureFlags()

  let inputsError: { data: Error }

  const {
    data: pipelineMetadata,
    isFetching: loadingPipelineSummary,
    error: pipelineSummaryFetchError
  } = useGetPipelineSummaryQuery(
    {
      pipelineIdentifier,
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        repoIdentifier,
        branch,
        getMetadataOnly: true
      }
    },
    { staleTime: 5 * 60 * 1000 }
  )

  useEffect(() => {
    if (pipelineMetadata) {
      if (
        isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING) ||
        (CDS_YAML_SIMPLIFICATION && pipelineMetadata?.data?.yamlVersion === '1')
      ) {
        setIsLoading(true)
        getPipelineInputs({
          org: orgIdentifier,
          project: projectIdentifier,
          pipeline: pipelineIdentifier,
          queryParams: {
            repo_name: repoIdentifier,
            branch_name: branch,
            connector_ref: connectorRef
          }
        })
          .then(response => {
            setPipelineInputs(response.content)
          })
          .catch(err => (inputsError = err))
          .finally(() => setIsLoading(false))
      }
    }
  }, [pipelineMetadata])

  const isPipelineInvalid = useMemo(() => {
    if (pipelineMetadata?.data && !pipelineMetadata?.data?.entityValidityDetails?.valid) {
      return true
    }
    if ((templateError?.data as Error)?.status === 'ERROR' || (inputsError?.data as Error)?.status === 'ERROR') {
      return true
    }
    return false
  }, [pipelineMetadata, templateError])

  const { mutate: deleteInputSet } = useDeleteInputSetForPipeline({
    queryParams: { accountIdentifier: accountId, orgIdentifier, projectIdentifier, pipelineIdentifier }
  })

  // These flags will be used to disable the Add Input set buttons in the page.
  const [pipelineHasRuntimeInputs, setPipelineHasRuntimeInputs] = useState(true)
  useEffect(() => {
    let pipelineHasNoRuntimeInputs
    if (CDS_YAML_SIMPLIFICATION && pipelineMetadata?.data?.yamlVersion === YamlVersion[1]) {
      // TODO: replace with api call
      pipelineHasNoRuntimeInputs = false
    } else {
      pipelineHasNoRuntimeInputs =
        (!isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING) && !template?.data?.inputSetTemplateYaml) ||
        (isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING) &&
          isEmpty(pipelineInputs?.inputs) &&
          isEmpty(pipelineInputs.options?.clone))
    }

    setPipelineHasRuntimeInputs(!pipelineHasNoRuntimeInputs)
  }, [template, pipelineInputs])

  const [selectedInputSet, setSelectedInputSet] = React.useState<{
    identifier?: string
    repoIdentifier?: string
    branch?: string
    inputSetRepoName?: string
    inputSetConnectorRef?: string
  }>()
  const history = useHistory()

  // Using Identifier if pipeline is not found in any branch
  useDocumentTitle([
    pipelineMetadata?.data?.name || pipelineIdentifier || getString('pipelines'),
    getString('inputSetsText')
  ])

  const goToInputSetForm = React.useCallback(
    (inputSetTemp?: InputSetSummaryResponse) => {
      history.push(
        routes.toInputSetForm({
          accountId,
          orgIdentifier,
          projectIdentifier,
          pipelineIdentifier,
          inputSetIdentifier: typeof inputSetTemp?.identifier !== 'string' ? '-1' : inputSetTemp.identifier,
          module,
          inputSetRepoIdentifier: inputSetTemp?.gitDetails?.repoIdentifier,
          inputSetRepoName: inputSetTemp?.gitDetails?.repoName,
          inputSetBranch: inputSetTemp?.gitDetails?.branch,
          inputSetConnectorRef: inputSetTemp?.connectorRef, //InputSet connector
          connectorRef, //Pipeline connector
          repoIdentifier,
          repoName,
          branch,
          storeType
        })
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountId, orgIdentifier, projectIdentifier, pipelineIdentifier, module, history, repoIdentifier, branch]
  )

  const goToInputSetFormV1 = React.useCallback(
    (inputSetTemp?: InputSetSummaryResponse) => {
      history.push(
        routes.toInputSetFormV1({
          accountId,
          orgIdentifier,
          projectIdentifier,
          pipelineIdentifier,
          inputSetIdentifier: typeof inputSetTemp?.identifier !== 'string' ? '-1' : inputSetTemp.identifier,
          module,
          inputSetRepoIdentifier: inputSetTemp?.gitDetails?.repoIdentifier,
          inputSetRepoName: inputSetTemp?.gitDetails?.repoName,
          inputSetBranch: inputSetTemp?.gitDetails?.branch,
          inputSetConnectorRef: inputSetTemp?.connectorRef, //InputSet connector
          connectorRef, //Pipeline connector
          repoIdentifier,
          repoName,
          branch,
          storeType
        })
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountId, orgIdentifier, projectIdentifier, pipelineIdentifier, module, history, repoIdentifier, branch]
  )

  const [canUpdateInputSet] = usePermission(
    {
      resourceScope: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier
      },
      resource: PIE_INPUTSET_RBAC_PERMISSIONS
        ? {
            resourceType: ResourceType.INPUT_SET
          }
        : {
            resourceType: ResourceType.PIPELINE,
            resourceIdentifier: pipelineIdentifier
          },
      permissions: PIE_INPUTSET_RBAC_PERMISSIONS
        ? [PermissionIdentifier.EDIT_INPUTSET]
        : [PermissionIdentifier.EDIT_PIPELINE]
    },
    [accountId, orgIdentifier, projectIdentifier, pipelineIdentifier, PIE_INPUTSET_RBAC_PERMISSIONS]
  )

  const [showOverlayInputSetForm, hideOverlayInputSetForm] = useModalHook(
    () => (
      <OverlayInputSetForm
        identifier={selectedInputSet?.identifier}
        overlayInputSetRepoIdentifier={selectedInputSet?.repoIdentifier}
        overlayInputSetBranch={selectedInputSet?.branch}
        overlayInputSetRepoName={selectedInputSet?.inputSetRepoName}
        overlayInputSetConnectorRef={selectedInputSet?.inputSetConnectorRef}
        hideForm={() => {
          refetch()
          hideOverlayInputSetForm()
        }}
        isReadOnly={!canUpdateInputSet}
      />
    ),
    [selectedInputSet]
  )

  const onDeleteInputSet = async (commitMsg: string): Promise<void> => {
    try {
      setIsLoading(true)
      const gitParams = inputSetToDelete?.gitDetails?.objectId
        ? {
            ...pick(inputSetToDelete?.gitDetails, ['branch', 'repoIdentifier', 'filePath', 'rootFolder']),
            commitMsg,
            lastObjectId: inputSetToDelete?.gitDetails?.objectId
          }
        : {}

      const deleted = await deleteInputSet(defaultTo(inputSetToDelete?.identifier, ''), {
        queryParams: {
          accountIdentifier: accountId,
          orgIdentifier,
          projectIdentifier,
          pipelineIdentifier: defaultTo(inputSetToDelete?.pipelineIdentifier, ''),
          ...gitParams
        },
        headers: { 'content-type': 'application/json' }
      })
      setIsLoading(false)

      /* istanbul ignore else */
      if (deleted?.status === 'SUCCESS') {
        showSuccess(getString('inputSets.inputSetDeleted', { name: inputSetToDelete?.name }))
      } else {
        throw getString('somethingWentWrong')
      }
      refetch()
    } catch (err) {
      setIsLoading(false)
      /* istanbul ignore next */
      showError(getRBACErrorMessage(err), undefined, 'pipeline.delete.inputset.error')
    }
  }

  const getTooltipText: () => JSX.Element | undefined = useCallback((): JSX.Element | undefined => {
    if (isPipelineInvalid) {
      return <Text padding="medium">{getString('pipeline.cannotAddInputSetInvalidPipeline')}</Text>
    }

    if (!pipelineHasRuntimeInputs) {
      return <Text padding="medium">{getString('pipeline.inputSets.noRuntimeInputsCurrently')}</Text>
    }
  }, [isPipelineInvalid, pipelineHasRuntimeInputs])

  const NewInputSetButtonPopover = (
    <Popover
      minimal
      content={
        <Menu className={css.menuList}>
          <MenuItem
            text={getString('inputSets.inputSetLabel')}
            onClick={() => {
              isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING) ? goToInputSetFormV1() : goToInputSetForm()
            }}
          />
          {(inputSet?.data?.content as InputSetSummaryResponse[])?.length > 0 &&
            defaultTo(pipelineMetadata?.data?.yamlVersion, '0') === '0' && (
              <MenuItem
                text={getString('inputSets.overlayInputSet')}
                onClick={() => {
                  setSelectedInputSet({ identifier: '', repoIdentifier, branch })
                  showOverlayInputSetForm()
                }}
              />
            )}

          {storeType === StoreType.REMOTE && (
            <MenuItem text={getString('common.importFromGit')} onClick={showImportResourceModal} />
          )}
        </Menu>
      }
      position={Position.BOTTOM}
      disabled={
        !canUpdateInputSet || !pipelineHasRuntimeInputs || isPipelineInvalid || Boolean(pipelineSummaryFetchError)
      }
    >
      <RbacButton
        text={getString('inputSets.newInputSet')}
        rightIcon="caret-down"
        variation={ButtonVariation.PRIMARY}
        permission={
          PIE_INPUTSET_RBAC_PERMISSIONS
            ? {
                resource: {
                  resourceType: ResourceType.INPUT_SET
                },
                permission: PermissionIdentifier.EDIT_INPUTSET
              }
            : {
                resource: {
                  resourceType: ResourceType.PIPELINE,
                  resourceIdentifier: pipelineIdentifier
                },
                permission: PermissionIdentifier.EDIT_PIPELINE
              }
        }
        disabled={!pipelineHasRuntimeInputs || isPipelineInvalid}
        tooltip={getTooltipText()}
      />
    </Popover>
  )

  return (
    <>
      <HelpPanel referenceId="InputSet" type={HelpPanelType.FLOATING_CONTAINER} />
      <Page.SubHeader>
        <Layout.Horizontal>{NewInputSetButtonPopover}</Layout.Horizontal>

        <Layout.Horizontal spacing="small">
          <TextInput
            leftIcon={'thinner-search'}
            leftIconProps={{ name: 'thinner-search', size: 14, color: Color.GREY_700 }}
            placeholder={getString('inputSets.searchInputSet')}
            wrapperClassName={css.searchWrapper}
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              updateQueryParams({ searchTerm: e.target.value || undefined })
            }}
          />
        </Layout.Horizontal>
      </Page.SubHeader>

      <Page.Body
        loading={loading || isLoading || loadingPipelineSummary}
        error={error?.message}
        retryOnError={/* istanbul ignore next */ () => refetch()}
        noData={{
          when: () => !inputSet?.data?.content?.length,
          icon: 'yaml-builder-input-sets',
          message: getString('pipeline.inputSets.aboutInputSets'),
          button: NewInputSetButtonPopover,
          buttonDisabled: !canUpdateInputSet || !pipelineHasRuntimeInputs || isPipelineInvalid,
          buttonDisabledTooltip: isPipelineInvalid
            ? getString('pipeline.cannotAddInputSetInvalidPipeline')
            : !pipelineHasRuntimeInputs
            ? getString('pipeline.inputSets.noRuntimeInputsCurrently')
            : undefined
        }}
      >
        {pipelineSummaryFetchError ? (
          <NoEntityFound identifier={pipelineIdentifier} entityType={'inputSet'} errorObj={pipelineSummaryFetchError} />
        ) : (
          <>
            <ListHeader
              selectedSortMethod={sortPreference}
              sortOptions={[...sortByCreated, ...sortByName]}
              onSortMethodChange={option => {
                setSortPreference(option.value as SortMethod)
              }}
              totalCount={inputSet?.data?.totalItems}
              className={css.listHeader}
            />
            <InputSetListView
              data={inputSet?.data}
              pipelineHasRuntimeInputs={pipelineHasRuntimeInputs}
              isPipelineInvalid={isPipelineInvalid}
              pipelineStoreType={pipelineMetadata?.data?.storeType as StoreType}
              goToInputSetDetail={inputSetTemp => {
                setSelectedInputSet({
                  identifier: inputSetTemp?.identifier,
                  repoIdentifier: inputSetTemp?.gitDetails?.repoIdentifier,
                  branch: inputSetTemp?.gitDetails?.branch,
                  inputSetRepoName: inputSetTemp?.gitDetails?.repoName,
                  inputSetConnectorRef: inputSetTemp?.connectorRef
                })
                if (inputSetTemp?.inputSetType === 'INPUT_SET') {
                  isSimplifiedYAMLEnabled(module, CI_YAML_VERSIONING)
                    ? goToInputSetFormV1(inputSetTemp)
                    : goToInputSetForm(inputSetTemp)
                } else {
                  showOverlayInputSetForm()
                }
              }}
              refetchInputSet={refetch}
              template={template}
              canUpdate={canUpdateInputSet}
              onDeleteInputSet={onDeleteInputSet}
              onDelete={(inputSetSelected: InputSetSummaryResponse) => {
                setInputSetToDelete(inputSetSelected)
              }}
            />
          </>
        )}
      </Page.Body>
    </>
  )
}

export default InputSetList
