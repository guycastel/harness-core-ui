/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { defaultTo, set, get, pick } from 'lodash-es'
import produce from 'immer'
import { useHistory, useParams } from 'react-router-dom'
import type { FormikProps } from 'formik'
import {
  Button,
  Dialog,
  Formik,
  FormikForm,
  FormInput,
  Layout,
  SelectOption,
  useToaster,
  Text,
  Icon,
  ModalDialog,
  OverlaySpinner
} from '@harness/uicore'
import { Divider } from '@blueprintjs/core'
import { FontVariation, Color } from '@harness/design-system'
import { useStrings } from 'framework/strings'
import { NameIdDescriptionTags } from '@common/components'
import { PMSPipelineSummaryResponse, useClonePipeline } from 'services/pipeline-ng'
import {
  OrganizationResponse,
  ProjectAggregateDTO,
  useGetOrganizationList,
  useGetProjectAggregateDTOList,
  useGetSettingsList
} from 'services/cd-ng'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import type { PipelineType, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { DEFAULT_PAGE_SIZE_OPTION } from '@modules/10-common/constants/Pagination'
import RbacButton from '@rbac/components/Button/Button'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import useRBACError, { RBACError } from '@rbac/utils/useRBACError/useRBACError'
import routes from '@common/RouteDefinitions'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { InlineRemoteSelect } from '@common/components/InlineRemoteSelect/InlineRemoteSelect'
import { StoreType } from '@common/constants/GitSyncTypes'
import { GitSyncForm } from '@gitsync/components/GitSyncForm/GitSyncForm'
import { isSimplifiedYAMLEnabledForCI } from '@pipeline/utils/CIUtils'

import type { Evaluation } from 'services/pm'
import { PolicyManagementEvaluationView } from '@governance/PolicyManagementEvaluationView'
import { SettingType } from '@common/constants/Utils'
import { getDefaultStoreType, getSettingValue } from '@default-settings/utils/utils'
import { getValidationSchema, FormState, getInitialValues, processFormData } from './ClonePipelineFormUtils'

import css from './ClonePipelineForm.module.scss'

export interface ClonePipelineFormProps {
  isOpen: boolean
  onClose(e?: React.SyntheticEvent): void
  originalPipeline: PMSPipelineSummaryResponse
}

export function ClonePipelineForm(props: ClonePipelineFormProps): React.ReactElement {
  const { isOpen, onClose } = props
  const { getString } = useStrings()

  return (
    <Dialog
      isOpen={isOpen}
      title={getString('pipeline.clone')}
      className={css.cloneForm}
      enforceFocus={false}
      onClose={onClose}
      canOutsideClickClose={false}
      lazy
    >
      <ClonePipelineFormInternal {...props} />
    </Dialog>
  )
}

export function ClonePipelineFormInternal(props: ClonePipelineFormProps): React.ReactElement {
  const { isOpen, onClose, originalPipeline } = props
  const { getString } = useStrings()
  const formikRef = React.useRef<FormikProps<FormState>>()
  const history = useHistory()
  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<PipelineType<ProjectPathProps>>()
  const { showSuccess, showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const { supportingGitSimplification, selectedProject } = useAppStore()
  const [projectsQuery, setProjectsQuery] = React.useState('')
  const [orgsQuery, setOrgsQuery] = React.useState('')
  const [selectedOrg, setSelectedOrg] = React.useState(orgIdentifier)
  const [governanceMetadata, setGovernanceMetadata] = useState<Evaluation | undefined>()
  const { CI_YAML_VERSIONING } = useFeatureFlags()

  const { mutate: clonePipeline } = useClonePipeline({})
  const { data: orgData, loading: orgDataLoading } = useGetOrganizationList({
    queryParams: {
      accountIdentifier: accountId,
      searchTerm: orgsQuery || undefined,
      pageSize: 200
    },
    debounce: 400,
    lazy: !isOpen
  })
  const { data: projectData, loading: projectDataLoading } = useGetProjectAggregateDTOList({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier: selectedOrg,
      searchTerm: projectsQuery || undefined,
      pageSize: DEFAULT_PAGE_SIZE_OPTION
    },
    debounce: 400,
    lazy: !isOpen
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
    lazy: false
  })

  React.useEffect(() => {
    if (!loadingSetting && gitXSettingError) {
      showError(getRBACErrorMessage(gitXSettingError))
    }
  }, [gitXSettingError, showError, loadingSetting])

  const organizations: SelectOption[] = React.useMemo(() => {
    const data: OrganizationResponse[] = get(orgData, 'data.content', [])
    return data.map(org => {
      return {
        label: org.organization.name,
        value: org.organization.identifier
      }
    })
  }, [orgData])

  const projects: SelectOption[] = React.useMemo(() => {
    const data: ProjectAggregateDTO[] = get(projectData, 'data.content', [])
    let isSelectedProjectPresent = false

    const options = data.map(project => {
      isSelectedProjectPresent =
        isSelectedProjectPresent || project.projectResponse.project.identifier === selectedProject?.identifier

      return {
        label: project.projectResponse.project.name,
        value: project.projectResponse.project.identifier
      }
    })

    if (
      !isSelectedProjectPresent && // selected project not present in list
      selectedProject && // selected project is defined
      selectedProject.orgIdentifier === selectedOrg && // selected project belongs to selected org
      !projectsQuery // project searchTerm is not set
    ) {
      options.unshift({
        label: selectedProject.name,
        value: selectedProject.identifier
      })
    }

    return options
  }, [projectData, selectedProject, projectsQuery, selectedOrg])

  function handleOrgChange(item: SelectOption): void {
    setSelectedOrg(item.value as string)

    /* istanbul ignore else */
    if (formikRef.current) {
      const newValues = produce(formikRef.current.values, draft => {
        set(draft, 'destinationConfig.orgIdentifier', item.value)
        set(draft, 'destinationConfig.projectIdentifier', '')
      })
      formikRef.current.setValues(newValues)
    }
  }

  async function handleSubmit(formData: FormState): Promise<void> {
    try {
      const [data, queryParams] = processFormData(formData, accountId)
      const cloneResponse = await clonePipeline(data, { queryParams })
      const governanceMetadataFromResponse = cloneResponse?.data?.governanceMetadata as Evaluation | undefined

      if (governanceMetadataFromResponse?.status === 'error') {
        setGovernanceMetadata(governanceMetadataFromResponse)
        return
      }

      showSuccess(
        getString('pipeline.cloneSuccess', {
          name: originalPipeline.name,
          cloneName: formData.name
        })
      )

      history.push(
        (isSimplifiedYAMLEnabledForCI(module, CI_YAML_VERSIONING)
          ? routes.toPipelineStudioV1
          : routes.toPipelineStudio)({
          module,
          pipelineIdentifier: defaultTo(data.destinationConfig.pipelineIdentifier, ''),
          orgIdentifier: defaultTo(data.destinationConfig.orgIdentifier, ''),
          projectIdentifier: defaultTo(data.destinationConfig.projectIdentifier, ''),
          accountId,
          ...pick(queryParams, 'storeType', 'repoName', 'branch', 'connectorRef')
        })
      )

      onClose()
    } catch (e: unknown) {
      showError(getRBACErrorMessage(e as RBACError))
    }
  }

  const isGitXEnforced = (): boolean => getSettingValue(gitXSetting, SettingType.ENFORCE_GIT_EXPERIENCE) === 'true'

  const initialvalues: FormState = React.useMemo(
    () => {
      if (isGitXEnforced() || getDefaultStoreType(gitXSetting) === StoreType.REMOTE) {
        formikRef.current?.setFieldValue('storeType', StoreType.REMOTE)
      }

      return getInitialValues({
        originalPipeline,
        orgIdentifier,
        projectIdentifier,
        supportingGitSimplification,
        isGitXEnforced: isGitXEnforced(),
        defaultStoreTypeSetting: getDefaultStoreType(gitXSetting)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [originalPipeline, orgIdentifier, projectIdentifier, supportingGitSimplification, gitXSetting?.data]
  )

  return (
    <>
      <OverlaySpinner show={loadingSetting}>
        <div data-testid="clone-pipeline-form">
          <Formik<FormState>
            formName="clone-pipeline"
            initialValues={initialvalues}
            onSubmit={handleSubmit}
            validationSchema={getValidationSchema(getString)}
          >
            {formikProps => {
              formikRef.current = formikProps
              const { storeType } = formikProps.values

              return (
                <FormikForm className={css.form}>
                  <div className={css.container}>
                    <NameIdDescriptionTags inputGroupProps={{ className: css.zeroMargin }} formikProps={formikProps} />
                  </div>
                  {supportingGitSimplification ? (
                    <>
                      <Divider />
                      <Text font={{ variation: FontVariation.H6 }} className={css.choosePipelineSetupHeader}>
                        {getString('pipeline.createPipeline.choosePipelineSetupHeader')}
                      </Text>
                      <InlineRemoteSelect
                        className={css.inlineRemoteSelect}
                        selected={formikProps.values.storeType}
                        onChange={item => formikProps.setFieldValue('storeType', item.type)}
                        getCardDisabledStatus={current => Boolean(isGitXEnforced() && current === StoreType.INLINE)}
                      />
                    </>
                  ) : null}
                  {storeType === StoreType.INLINE ? (
                    <div className={css.container}>
                      <div className={css.inputWithSpinner}>
                        <FormInput.Select
                          selectProps={{ usePortal: true }}
                          label={getString('orgLabel')}
                          name="destinationConfig.orgIdentifier"
                          items={organizations}
                          value={{ label: selectedOrg, value: selectedOrg }}
                          onChange={handleOrgChange}
                          onQueryChange={setOrgsQuery}
                        />
                        {orgDataLoading ? <Icon name="steps-spinner" size={18} color={Color.PRIMARY_7} /> : null}
                      </div>
                      <div className={css.inputWithSpinner}>
                        <FormInput.Select
                          key={get(formikProps.values, 'destinationConfig.orgIdentifier')}
                          selectProps={{ usePortal: true }}
                          label={getString('projectLabel')}
                          name="destinationConfig.projectIdentifier"
                          items={projects}
                          onQueryChange={setProjectsQuery}
                        />
                        {projectDataLoading ? <Icon name="steps-spinner" size={18} color={Color.PRIMARY_7} /> : null}
                      </div>
                    </div>
                  ) : null}
                  {storeType === StoreType.REMOTE ? (
                    <React.Fragment>
                      <GitSyncForm
                        formikProps={formikProps as any}
                        isEdit={false}
                        initialValues={{}}
                        shouldRenderRepositoryLocationCard
                      />
                      <div className={css.container}>
                        <FormInput.TextArea label={getString('common.git.commitMessage')} name="commitMsg" />
                      </div>
                    </React.Fragment>
                  ) : null}
                  <Layout.Horizontal className={css.createPipelineButtons} spacing="medium">
                    <RbacButton
                      permission={{
                        resource: { resourceType: ResourceType.PIPELINE },
                        permission: PermissionIdentifier.EDIT_PIPELINE
                      }}
                      intent="primary"
                      text={getString('projectCard.clone')}
                      type="submit"
                      data-testid="clone"
                    />
                    <Button intent="none" text={getString('cancel')} type="reset" onClick={onClose} />
                  </Layout.Horizontal>
                </FormikForm>
              )
            }}
          </Formik>
        </div>

        <ModalDialog
          isOpen={Boolean(governanceMetadata)}
          onClose={() => {
            setGovernanceMetadata(undefined)
            onClose()
          }}
          title={getString('common.policiesSets.evaluations')}
          enforceFocus={false}
          width={900}
        >
          <PolicyManagementEvaluationView
            metadata={governanceMetadata}
            accountId={accountId}
            module={module}
            headingErrorMessage={getString('pipeline.policyEvaluations.failureHeadingEvaluationDetail')}
            headingWarningMessage={getString('pipeline.policyEvaluations.warningHeadingEvaluationDetail')}
            className={css.policyEvalContainer}
          />
        </ModalDialog>
      </OverlaySpinner>
    </>
  )
}
