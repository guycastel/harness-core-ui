/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { flushSync } from 'react-dom'
import { defaultTo, get, isEmpty, merge, noop } from 'lodash-es'
import {
  Layout,
  NestedAccordionProvider,
  Text,
  PageHeader,
  PageBody,
  Popover,
  Button,
  ButtonVariation,
  Container
} from '@harness/uicore'
import { FontVariation, Color } from '@harness/design-system'
import cx from 'classnames'
import { Classes, Menu, Position } from '@blueprintjs/core'
import type { InputsResponseBody } from '@harnessio/react-pipeline-service-client'
import type { FormikProps } from 'formik'
import {
  ResponseInputSetResponse,
  useGetPipeline,
  useGetInputSetForPipeline,
  useCreateInputSetForPipeline,
  useUpdateInputSetForPipeline,
  ResponsePMSPipelineResponseDTO
} from 'services/pipeline-ng'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import type {
  AccountPathProps,
  GitQueryParams,
  InputSetGitQueryParams,
  InputSetPathProps,
  PipelineType
} from '@common/interfaces/RouteInterfaces'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import { parse, yamlParse } from '@common/utils/YamlHelperMethods'
import type { InputSetDTO, Pipeline } from '@pipeline/utils/types'
import { useStrings } from 'framework/strings'
import { AppStoreContext } from 'framework/AppStore/AppStoreContext'
import { ContainerSpinner } from '@common/components/ContainerSpinner/ContainerSpinner'
import NoEntityFound from '@pipeline/pages/utils/NoEntityFound/NoEntityFound'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import GitPopover from '@pipeline/components/GitPopover/GitPopover'
import GitRemoteDetails from '@common/components/GitRemoteDetails/GitRemoteDetails'
import {
  EntityCachedCopy,
  EntityCachedCopyHandle
} from '@pipeline/components/PipelineStudio/PipelineCanvas/EntityCachedCopy/EntityCachedCopy'
import { OutOfSyncErrorStrip } from '@pipeline/components/InputSetErrorHandling/OutOfSyncErrorStrip/OutOfSyncErrorStrip'
import RbacMenuItem from '@rbac/components/MenuItem/MenuItem'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import routes from '@common/RouteDefinitions'
import type { GitContextProps } from '@common/components/GitContextForm/GitContextForm'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { withInputSetsOnCreateUpdateSuccess } from '@pipeline/utils/withInputSetsOnCreateUpdateSuccess'
import { InputSetOnCreateUpdate } from '@pipeline/utils/inputSetUtils'
import { useSaveInputSetV1 } from './useSaveInputSetV1'
import { InputsYaml, useInputSetsV1 } from '../RunPipelineModalV1/useInputSetsV1'
import FormikInputSetFormV1 from './FormikInputSetFormV1'
import type { PipelineV1InfoConfig } from '../RunPipelineModalV1/RunPipelineFormV1'
import css from '../../../components/InputSetFormHeader/InputSetFormHeader.module.scss'

const getDefaultInputSet = (orgIdentifier: string, projectIdentifier: string) => ({
  name: '',
  data: {
    options: {}
  },
  version: 1,
  identifier: '',
  description: undefined,
  orgIdentifier,
  projectIdentifier,
  repo: '',
  branch: ''
})

interface InputSetV1FormProps extends InputSetOnCreateUpdate {
  isExecutionView?: boolean

  // Props to support embedding InputSetForm (create new) in a modal
  // @see src/modules/70-pipeline/components/InputSetForm/NewInputSetModal.tsx
  inputSetInitialValue?: InputsResponseBody
}

export interface InputSetV1DTO extends InputSetDTO {
  data: InputsYaml | undefined
  version: number
}

const getInputSet = (
  orgIdentifier: string,
  projectIdentifier: string,
  inputSetResponse: ResponseInputSetResponse | null,
  isGitSyncEnabled = false
): InputSetV1DTO => {
  if (inputSetResponse?.data) {
    const inputSetObj = inputSetResponse?.data

    const parsedInputSetObj = parse<InputSetV1DTO>(defaultTo(inputSetObj?.inputSetYaml, ''))

    if (isGitSyncEnabled && !isEmpty(parsedInputSetObj)) {
      return {
        name: parsedInputSetObj.name,
        identifier: parsedInputSetObj.identifier,
        description: parsedInputSetObj.description,
        orgIdentifier: parsedInputSetObj.orgIdentifier,
        projectIdentifier: parsedInputSetObj.projectIdentifier,
        connectorRef: defaultTo(inputSetObj.connectorRef, ''),
        gitDetails: defaultTo(inputSetObj.gitDetails, {}),
        inputSetErrorWrapper: defaultTo(inputSetObj.inputSetErrorWrapper, {}),
        entityValidityDetails: defaultTo(inputSetObj.entityValidityDetails, {}),
        outdated: inputSetObj.outdated,
        data: parsedInputSetObj.data,
        version: parsedInputSetObj.version
      }
    }
    return {
      name: inputSetObj.name,
      identifier: defaultTo(inputSetObj.identifier, ''),
      description: inputSetObj?.description,
      orgIdentifier,
      projectIdentifier,
      connectorRef: defaultTo(inputSetObj.connectorRef, ''),
      gitDetails: defaultTo(inputSetObj.gitDetails, {}),
      inputSetErrorWrapper: defaultTo(inputSetObj.inputSetErrorWrapper, {}),
      entityValidityDetails: defaultTo(inputSetObj.entityValidityDetails, {}),
      outdated: inputSetObj.outdated,
      cacheResponse: inputSetObj.cacheResponse,
      storeType: inputSetObj.storeType,
      data: parsedInputSetObj.data,
      version: parsedInputSetObj.version
    }
  }
  return getDefaultInputSet(orgIdentifier, projectIdentifier)
}

function InputSetV1FormInternal(props: InputSetV1FormProps): React.ReactElement {
  const { isExecutionView, inputSetInitialValue, isNewInModal, className, onCancel, onCreateUpdateSuccess } = props
  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier, inputSetIdentifier } = useParams<
    PipelineType<InputSetPathProps> & AccountPathProps
  >()

  const {
    repoIdentifier,
    branch,
    inputSetRepoIdentifier,
    inputSetBranch,
    connectorRef,
    inputSetConnectorRef,
    repoName,
    inputSetRepoName,
    storeType
  } = useQueryParams<InputSetGitQueryParams>()
  const { getString } = useStrings()
  const [isEdit, setIsEdit] = React.useState(false)
  const [formErrors, setFormErrors] = React.useState<Record<string, any>>({})
  const [resolvedPipeline, setResolvedPipeline] = React.useState<PipelineV1InfoConfig | undefined>()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const defaultLoadFromCacheHeader = Boolean(inputSetRepoName).toString()
  const [loadFromCache, setLoadFromCache] = React.useState<string>(defaultLoadFromCacheHeader)
  const [filePath, setFilePath] = React.useState<string>()

  const {
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF,
    supportingGitSimplification
  } = React.useContext(AppStoreContext)

  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF

  const getBranchQueryParams = (isMerge?: boolean): { branch?: string; loadFromFallbackBranch?: boolean } => {
    if (isGitSyncEnabled) {
      return { branch: inputSetBranch }
    } else if (repoName === inputSetRepoName) {
      // Even for same repo, while coming from NoEntityFound InputSet and pipeline branch may be different for 1st render too
      return isMerge ? { branch } : { branch: inputSetBranch || branch }
    } else {
      return inputSetBranch ? { branch: inputSetBranch } : { loadFromFallbackBranch: true }
    }
  }

  const getInputSetDefaultQueryParam = () => {
    return {
      accountIdentifier: accountId,
      orgIdentifier,
      pipelineIdentifier,
      projectIdentifier,
      ...(isGitSyncEnabled
        ? {
            pipelineRepoID: repoIdentifier,
            pipelineBranch: branch
          }
        : {}),
      repoIdentifier: isGitSyncEnabled ? inputSetRepoIdentifier : inputSetRepoName,
      ...getBranchQueryParams()
    }
  }
  const {
    data: inputSetResponse,
    refetch,
    loading: loadingInputSet,
    error: inputSetError
  } = useGetInputSetForPipeline({
    queryParams: getInputSetDefaultQueryParam(),
    inputSetIdentifier: defaultTo(inputSetIdentifier, ''),
    lazy: true
  })

  const getQueryParamsForCreateUpdateInputSet = useMemo(() => {
    return {
      accountIdentifier: accountId,
      orgIdentifier,
      pipelineIdentifier,
      projectIdentifier,
      pipelineRepoID: repoIdentifier,
      pipelineBranch: branch
    }
  }, [accountId, repoIdentifier, branch])

  const { mutate: createInputSet, loading: createInputSetLoading } = useCreateInputSetForPipeline({
    queryParams: getQueryParamsForCreateUpdateInputSet,
    requestOptions: { headers: { 'content-type': 'application/yaml' } }
  })

  const { mutate: updateInputSet, loading: updateInputSetLoading } = useUpdateInputSetForPipeline({
    queryParams: getQueryParamsForCreateUpdateInputSet,
    inputSetIdentifier: '',
    requestOptions: { headers: { 'content-type': 'application/yaml' } }
  })

  const { handleSubmit } = useSaveInputSetV1({
    createInputSet,
    updateInputSet,
    inputSetResponse,
    isEdit,
    setFormErrors,
    onCreateUpdateSuccess
  })

  const handleMenu = (state: boolean): void => {
    setMenuOpen(state)
  }

  const inputSet: InputSetV1DTO = React.useMemo(() => {
    return getInputSet(orgIdentifier, projectIdentifier, inputSetResponse, isGitSyncEnabled)
  }, [inputSetResponse?.data, isGitSyncEnabled])

  const formikRef = React.useRef<FormikProps<InputSetDTO & GitContextProps & StoreMetadata>>()

  const {
    data: pipeline,
    loading: loadingPipeline,
    refetch: refetchPipeline
  } = useGetPipeline({
    pipelineIdentifier,
    lazy: true,
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      getTemplatesResolvedPipeline: true,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoName
    }
  })

  React.useEffect(() => {
    setResolvedPipeline(yamlParse<PipelineV1InfoConfig>(defaultTo(pipeline?.data?.resolvedTemplatesPipelineYaml, '')))
  }, [pipeline?.data?.resolvedTemplatesPipelineYaml])

  React.useEffect(() => {
    if (!isEmpty(inputSet)) setFilePath(getFilePath(inputSet))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputSet, inputSet.entityValidityDetails?.valid, storeType, isEdit])

  const {
    inputSets,
    inputSetYaml,
    hasRuntimeInputs,
    hasCodebaseInputs,
    isLoading: loadingInputSets
  } = useInputSetsV1({
    accountId,
    projectIdentifier,
    orgIdentifier,
    pipelineIdentifier,
    branch,
    repoIdentifier,
    connectorRef
  })

  React.useEffect(() => {
    if (inputSetIdentifier !== '-1' && !isNewInModal) {
      setIsEdit(true)
      refetch({
        pathParams: { inputSetIdentifier: inputSetIdentifier },
        requestOptions: { headers: { 'Load-From-Cache': loadFromCache } }
      })
      refetchPipeline()
    } else {
      refetchPipeline()

      setIsEdit(false)
    }
  }, [inputSetIdentifier])

  useDocumentTitle(
    isNewInModal
      ? document.title
      : [
          defaultTo(
            parse<Pipeline>(defaultTo(pipeline?.data?.yamlPipeline, ''))?.pipeline?.name,
            getString('pipelines')
          ),
          isEdit ? defaultTo(inputSetResponse?.data?.name, '') : getString('inputSets.newInputSetLabel')
        ]
  )

  const getFilePath = React.useCallback(
    (inputSetYamlVisual: InputSetDTO) => {
      if (inputSet.gitDetails?.filePath) {
        return inputSet.gitDetails?.filePath
      }
      if (filePath) {
        return filePath
      }
      return inputSetYamlVisual.identifier ? `.harness/${inputSetYamlVisual.identifier}.yaml` : ''
    },
    [inputSet, filePath]
  )

  const child = React.useCallback(
    () => (
      <FormikInputSetFormV1
        inputSet={isNewInModal && inputSetInitialValue ? merge(inputSet, inputSetInitialValue) : inputSet}
        resolvedPipeline={resolvedPipeline}
        handleSubmit={handleSubmit}
        formErrors={formErrors}
        formikRef={formikRef}
        isExecutionView={isExecutionView}
        isEdit={isEdit}
        isGitSyncEnabled={isGitSyncEnabled}
        supportingGitSimplification={supportingGitSimplification}
        className={className}
        onCancel={onCancel}
        filePath={filePath}
        pipelineInputs={inputSets}
        inputSetYaml={inputSetYaml}
        hasRuntimeInputs={hasRuntimeInputs}
        hasCodebaseInputs={hasCodebaseInputs}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      inputSet,
      pipeline,
      handleSubmit,
      formErrors,
      formikRef,
      isExecutionView,
      isEdit,
      isGitSyncEnabled,
      updateInputSetLoading,
      filePath
    ]
  )

  if (isExecutionView) {
    return child()
  }

  const branchChangeHandler = (selectedBranch?: string): void => {
    if (selectedBranch) {
      refetch({
        pathParams: { inputSetIdentifier: inputSetIdentifier },
        queryParams: {
          ...getInputSetDefaultQueryParam(),
          loadFromFallbackBranch: false,
          branch: selectedBranch
        },
        requestOptions: { headers: { 'Load-From-Cache': loadFromCache } }
      })
    }
  }

  function handleReloadFromCache(): void {
    flushSync(() => {
      setLoadFromCache('false')
    })
    refetch({
      pathParams: { inputSetIdentifier: inputSetIdentifier },
      requestOptions: { headers: { 'Load-From-Cache': 'false' } }
    })
    // refetchTemplate({ requestOptions: { headers: { 'Load-From-Cache': 'false' } } })
    refetchPipeline({ requestOptions: { headers: { 'Load-From-Cache': 'false' } } })
  }

  if (supportingGitSimplification && !loadingInputSet && inputSetError) {
    return (
      <NoEntityFound
        identifier={inputSetIdentifier}
        entityType={'inputSet'}
        entityConnectorRef={inputSetConnectorRef}
        gitDetails={{ ...inputSet?.gitDetails, repoName: inputSetRepoName, branch: inputSetBranch }}
        errorObj={inputSetError.data as Error}
      />
    )
  }

  if (loadingInputSet || loadingPipeline || loadingInputSets) {
    return <ContainerSpinner height={'100vh'} flex={{ align: 'center-center' }} />
  }

  return (
    <InputSetV1FormWrapper
      loading={!isGitSyncEnabled && (createInputSetLoading || updateInputSetLoading)}
      isEdit={isEdit}
      inputSet={inputSet}
      pipeline={pipeline}
      isGitSyncEnabled={isGitSyncEnabled}
      menuOpen={menuOpen}
      handleMenu={handleMenu}
      onBranchChange={branchChangeHandler}
      handleReloadFromCache={handleReloadFromCache}
    >
      {child()}
    </InputSetV1FormWrapper>
  )
}

interface InputSetV1FormWrapperProps {
  isEdit: boolean
  children: React.ReactNode
  loading: boolean
  inputSet: InputSetDTO
  pipeline: ResponsePMSPipelineResponseDTO | null
  isGitSyncEnabled?: boolean
  menuOpen: boolean
  handleMenu: (state: boolean) => void
  onBranchChange?: (branch?: string) => void
  handleReloadFromCache?: (loadFromCache?: boolean) => void
}

function InputSetV1FormWrapper(props: InputSetV1FormWrapperProps): React.ReactElement {
  const {
    isEdit,
    children,
    loading,
    inputSet,
    pipeline,
    isGitSyncEnabled,
    menuOpen,
    handleMenu,
    onBranchChange,
    handleReloadFromCache = noop
  } = props
  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier, module } = useParams<
    PipelineType<InputSetPathProps> & AccountPathProps
  >()
  const { connectorRef, repoIdentifier, repoName, branch, storeType } = useQueryParams<GitQueryParams>()
  const { getString } = useStrings()
  const { updateQueryParams } = useUpdateQueryParams()
  const inputCachedCopyRef = React.useRef<EntityCachedCopyHandle | null>(null)

  function showReloadFromGitoption(): boolean {
    return Boolean(inputSet?.storeType === StoreType.REMOTE)
  }

  function handleReloadFromGitClick(): void {
    inputCachedCopyRef.current?.showConfirmationModal()
  }

  return (
    <React.Fragment>
      <GitSyncStoreProvider>
        <PageHeader
          className={css.pageHeaderStyles}
          title={
            <Layout.Horizontal width="42%">
              <Text
                lineClamp={1}
                color={Color.GREY_800}
                font={{ weight: 'bold', variation: FontVariation.H4 }}
                margin={{ right: 'medium' }}
              >
                {isEdit
                  ? getString('inputSets.editTitle', { name: inputSet.name })
                  : getString('inputSets.newInputSetLabel')}
              </Text>
              {isGitSyncEnabled && isEdit && (
                <GitPopover
                  data={defaultTo(inputSet.gitDetails, {})}
                  iconProps={{ margin: { left: 'small', top: 'xsmall' } }}
                />
              )}
              {isEdit && inputSet?.storeType === StoreType.REMOTE && (
                <Container className={css.gitRemoteDetails}>
                  <GitRemoteDetails
                    connectorRef={inputSet?.connectorRef}
                    repoName={inputSet?.gitDetails?.repoName}
                    branch={inputSet?.gitDetails?.branch}
                    flags={{ borderless: true, showRepo: false, normalInputStyle: true }}
                    onBranchChange={item => {
                      flushSync(() => {
                        updateQueryParams({ inputSetBranch: item?.branch })
                      })
                      onBranchChange?.(item?.branch)
                    }}
                  />

                  {!loading && (
                    <EntityCachedCopy
                      ref={inputCachedCopyRef}
                      reloadContent={getString('inputSets.inputSetLabel')}
                      cacheResponse={inputSet?.cacheResponse}
                      reloadFromCache={handleReloadFromCache}
                      repo={inputSet?.gitDetails?.repoName}
                      filePath={inputSet?.gitDetails?.filePath}
                    />
                  )}
                </Container>
              )}
              <Popover
                className={cx(Classes.DARK, css.reconcileMenu)}
                position={Position.LEFT}
                isOpen={menuOpen}
                onInteraction={nextOpenState => {
                  handleMenu(nextOpenState)
                }}
              >
                <Button
                  variation={ButtonVariation.ICON}
                  icon="Options"
                  aria-label="input set menu actions"
                  onClick={() => handleMenu(true)}
                />
                <Menu style={{ backgroundColor: 'unset' }}>
                  <OutOfSyncErrorStrip
                    inputSet={inputSet}
                    pipelineGitDetails={get(pipeline, 'data.gitDetails')}
                    fromInputSetForm
                    closeReconcileMenu={() => handleMenu(false)}
                  />

                  {showReloadFromGitoption() ? (
                    <RbacMenuItem
                      icon="repeat"
                      text={getString('common.reloadFromGit')}
                      onClick={handleReloadFromGitClick}
                      permission={{
                        resourceScope: {
                          accountIdentifier: accountId,
                          orgIdentifier,
                          projectIdentifier
                        },
                        resource: {
                          resourceType: ResourceType.PIPELINE,
                          resourceIdentifier: inputSet?.identifier
                        },
                        permission: PermissionIdentifier.VIEW_PIPELINE
                      }}
                    />
                  ) : null}
                </Menu>
              </Popover>
            </Layout.Horizontal>
          }
          breadcrumbs={
            <NGBreadcrumbs
              links={[
                {
                  url: routes.toPipelines({ orgIdentifier, projectIdentifier, accountId, module }),
                  label: getString('pipelines')
                },
                {
                  url: routes.toInputSetList({
                    orgIdentifier,
                    projectIdentifier,
                    accountId,
                    pipelineIdentifier,
                    module,
                    connectorRef,
                    repoIdentifier: isGitSyncEnabled ? pipeline?.data?.gitDetails?.repoIdentifier : repoIdentifier,
                    repoName,
                    branch: isGitSyncEnabled ? pipeline?.data?.gitDetails?.branch : branch,
                    storeType
                  }),
                  label: defaultTo(parse<Pipeline>(defaultTo(pipeline?.data?.yamlPipeline, ''))?.pipeline?.name, '')
                }
              ]}
            />
          }
        />
      </GitSyncStoreProvider>
      <PageBody loading={loading}>{children}</PageBody>
    </React.Fragment>
  )
}

export default function InputSetFormV1(props: InputSetV1FormProps): React.ReactElement {
  return (
    <NestedAccordionProvider>
      <InputSetV1FormInternal {...props} />
    </NestedAccordionProvider>
  )
}

export const InputSetFormV1ForRoute = withInputSetsOnCreateUpdateSuccess<InputSetV1FormProps>(InputSetFormV1)
