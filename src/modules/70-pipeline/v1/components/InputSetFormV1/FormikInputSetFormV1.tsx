/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo } from 'react'
import * as Yup from 'yup'
import { defaultTo, isEmpty, omit } from 'lodash-es'
import { Button, Container, Formik, FormikForm, Layout, ButtonVariation } from '@harness/uicore'
import { useHistory, useParams } from 'react-router-dom'
import cx from 'classnames'
import type { FormikProps } from 'formik'
import type { InputsResponseBody } from '@harnessio/react-pipeline-service-client'
import type { EntityGitDetails } from 'services/pipeline-ng'
import { useGetSettingValue } from 'services/cd-ng'
import { useToaster } from '@common/exports'
import { SettingType } from '@common/constants/Utils'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import type {
  AccountPathProps,
  InputSetGitQueryParams,
  InputSetPathProps,
  PipelineType
} from '@common/interfaces/RouteInterfaces'
import { NameIdDescriptionTags } from '@common/components'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { useStrings } from 'framework/strings'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import { usePermission } from '@rbac/hooks/usePermission'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { useQueryParams } from '@common/hooks'
import GitContextForm, { GitContextProps } from '@common/components/GitContextForm/GitContextForm'
import { IdentifierSchema, NameSchema } from '@common/utils/Validation'
import { GitSyncForm } from '@gitsync/components/GitSyncForm/GitSyncForm'
import type { InputSetDTO } from '@pipeline/utils/types'
import {
  hasStoreTypeMismatch,
  getInputSetGitDetails,
  shouldDisableGitDetailsFields
} from '@pipeline/utils/inputSetUtils'
import { ErrorsStrip } from '@pipeline/components/ErrorsStrip/ErrorsStrip'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { PipelineInputSetFormV1 } from '../RunPipelineModalV1/PipelineInputSetFormV1'
import type { InputsYaml } from '../RunPipelineModalV1/useInputSetsV1'
import type { PipelineV1InfoConfig } from '../RunPipelineModalV1/RunPipelineFormV1'
import type { InputSetV1DTO } from './InputSetFormV1'
import css from '../../../components/InputSetForm/InputSetForm.module.scss'

type InputSetDTOGitDetails = InputSetDTO & GitContextProps & StoreMetadata
interface FormikInputSetFormV1Props {
  inputSet: InputSetV1DTO
  resolvedPipeline?: PipelineV1InfoConfig
  handleSubmit: (
    inputSetObjWithGitInfo: InputSetDTO,
    gitDetails?: EntityGitDetails,
    storeMetadata?: StoreMetadata
  ) => Promise<void>
  formErrors: Record<string, unknown>
  formikRef: React.MutableRefObject<FormikProps<InputSetDTOGitDetails> | undefined>
  isExecutionView?: boolean
  isEdit: boolean
  isGitSyncEnabled?: boolean
  supportingGitSimplification?: boolean
  className?: string
  onCancel?: () => void
  filePath?: string
  hasRuntimeInputs: boolean
  hasCodebaseInputs: boolean
  pipelineInputs?: InputsResponseBody | null
  inputSetYaml?: InputsYaml
}

export default function FormikInputSetFormV1(props: FormikInputSetFormV1Props): React.ReactElement {
  const {
    inputSet,
    resolvedPipeline,
    handleSubmit,
    formErrors,
    formikRef,
    isExecutionView,
    isEdit,
    isGitSyncEnabled,
    supportingGitSimplification,
    className,
    onCancel,
    filePath,
    hasRuntimeInputs,
    hasCodebaseInputs,
    pipelineInputs,
    inputSetYaml
  } = props
  const { getString } = useStrings()
  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier } = useParams<
    PipelineType<InputSetPathProps> & AccountPathProps
  >()
  const { showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const queryParams = useQueryParams<InputSetGitQueryParams>()
  const repoIdentifier = queryParams.repoIdentifier
  const { branch, connectorRef, storeType, repoName } = getInputSetGitDetails(queryParams, {
    ...inputSet?.gitDetails,
    connectorRef: inputSet?.connectorRef
  })

  const inputSetStoreType = isGitSyncEnabled ? undefined : inputSet.storeType
  const history = useHistory()
  const { data: allowDifferentRepoSettings, error: allowDifferentRepoSettingsError } = useGetSettingValue({
    identifier: SettingType.ALLOW_DIFFERENT_REPO_FOR_INPUT_SETS,
    queryParams: { accountIdentifier: accountId },
    lazy: false
  })

  React.useEffect(() => {
    if (allowDifferentRepoSettingsError) {
      showError(getRBACErrorMessage(allowDifferentRepoSettingsError))
    }
  }, [allowDifferentRepoSettingsError, getRBACErrorMessage, showError])

  const [hasEditPermission] = usePermission(
    {
      resourceScope: {
        projectIdentifier,
        orgIdentifier,
        accountIdentifier: accountId
      },
      resource: {
        resourceType: ResourceType.PIPELINE,
        resourceIdentifier: pipelineIdentifier
      },
      permissions: [PermissionIdentifier.EDIT_PIPELINE],
      options: {
        skipCache: true
      }
    },
    [projectIdentifier, orgIdentifier, accountId, pipelineIdentifier]
  )

  const NameIdSchema = Yup.object({
    name: NameSchema(getString),
    identifier: IdentifierSchema(getString)
  })

  const isEditable =
    hasEditPermission && (isGitSyncEnabled || !hasStoreTypeMismatch(storeType, inputSetStoreType, isEdit))

  const formRefDom = React.useRef<HTMLElement | undefined>()

  const getPipelineData = (inputSetYAML: InputsYaml | undefined) => {
    const omittedInputSet = omit(inputSet, 'gitDetails', 'entityValidityDetails', 'outdated', 'inputSetErrorWrapper')
    omittedInputSet.version = 1
    omittedInputSet.data = inputSetYAML
    return omittedInputSet
  }
  const inputSetV1FormInitialValues = React.useMemo(() => {
    return !isEmpty(inputSet.data?.options) || !isEmpty(inputSet.data?.inputs)
      ? getPipelineData(inputSet.data)
      : getPipelineData(inputSetYaml)
  }, [inputSet.data, inputSetYaml])

  const hasError = useMemo(() => {
    return formErrors && Object.keys(formErrors).length > 0
  }, [formErrors])

  const storeMetadata = {
    repo: isGitSyncEnabled ? defaultTo(repoIdentifier, '') : defaultTo(repoName, ''),
    branch: defaultTo(branch, ''),
    connectorRef: defaultTo(connectorRef, ''),
    repoName: defaultTo(repoName, ''),
    storeType: defaultTo(storeType, StoreType.INLINE),
    filePath: defaultTo(inputSet.gitDetails?.filePath, filePath)
  }

  const isPipelineRemote = supportingGitSimplification && storeType === StoreType.REMOTE

  return (
    <Container className={cx(css.inputSetForm, className, hasError ? css.withError : '')}>
      <Layout.Vertical
        spacing="medium"
        ref={ref => {
          formRefDom.current = ref as HTMLElement
        }}
      >
        <Formik<InputSetDTO & GitContextProps & StoreMetadata>
          initialValues={{
            ...inputSetV1FormInitialValues,
            ...storeMetadata
          }}
          formName="inputSetV1Form"
          validationSchema={NameIdSchema}
          onSubmit={values => {
            handleSubmit(
              values,
              {
                repoIdentifier: values.repo,
                branch: values.branch,
                repoName: values.repo
              },
              {
                connectorRef: values.connectorRef,
                repoName: values.repo,
                branch: values.branch,
                filePath: values.filePath,
                storeType: values.storeType
              }
            )
          }}
        >
          {formikProps => {
            formikRef.current = formikProps
            return (
              <div className={css.inputsetGrid}>
                <div>
                  <ErrorsStrip formErrors={formErrors} domRef={formRefDom} />
                  <FormikForm>
                    {isExecutionView ? null : (
                      <Layout.Vertical className={css.content} padding="xlarge">
                        <NameIdDescriptionTags
                          className={css.nameiddescription}
                          identifierProps={{
                            inputLabel: getString('name'),
                            isIdentifierEditable: !isEdit && isEditable,
                            inputGroupProps: {
                              disabled: !isEditable
                            }
                          }}
                          descriptionProps={{ disabled: !isEditable }}
                          tagsProps={{
                            disabled: !isEditable
                          }}
                          formikProps={formikProps}
                        />
                        {isGitSyncEnabled && (
                          <GitSyncStoreProvider>
                            <GitContextForm
                              formikProps={formikProps}
                              gitDetails={
                                isEdit
                                  ? { ...inputSet.gitDetails, getDefaultFromOtherRepo: true }
                                  : { repoIdentifier, branch, getDefaultFromOtherRepo: true }
                              }
                              className={css.gitContextForm}
                            />
                          </GitSyncStoreProvider>
                        )}
                        {isPipelineRemote && (
                          <Container className={css.gitRemoteDetailsForm}>
                            <GitSyncForm
                              formikProps={formikProps as any}
                              isEdit={isEdit}
                              initialValues={storeMetadata}
                              disableFields={
                                shouldDisableGitDetailsFields(isEdit, allowDifferentRepoSettings?.data?.value)
                                  ? {
                                      provider: true,
                                      connectorRef: true,
                                      repoName: true,
                                      branch: true,
                                      filePath: false
                                    }
                                  : {}
                              }
                              shouldRenderRepositoryLocationCard
                            ></GitSyncForm>
                          </Container>
                        )}
                        {(hasRuntimeInputs || hasCodebaseInputs) && (
                          <PipelineInputSetFormV1
                            path="data"
                            inputSets={pipelineInputs}
                            hasRuntimeInputs={hasRuntimeInputs}
                            hasCodebaseInputs={hasCodebaseInputs}
                            readonly={isExecutionView}
                            viewType={StepViewType.DeploymentForm}
                            isRunPipelineForm
                            originalPipeline={resolvedPipeline}
                            disableRuntimeInputConfigureOptions
                            connectorRef={connectorRef}
                            repoIdentifier={repoIdentifier}
                            formik={formikRef.current}
                          />
                        )}
                      </Layout.Vertical>
                    )}
                    <Layout.Horizontal className={css.footer} padding="xlarge">
                      <Button
                        variation={ButtonVariation.PRIMARY}
                        type="submit"
                        text={getString('save')}
                        disabled={!isEditable}
                        className={css.saveCancelBtn}
                      />
                      <Button
                        variation={ButtonVariation.TERTIARY}
                        onClick={onCancel || history.goBack}
                        text={getString('cancel')}
                        className={css.saveCancelBtn}
                      />
                    </Layout.Horizontal>
                  </FormikForm>
                </div>
              </div>
            )
          }}
        </Formik>
      </Layout.Vertical>
    </Container>
  )
}
