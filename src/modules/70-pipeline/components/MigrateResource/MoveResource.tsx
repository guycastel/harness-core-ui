/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { get, isEmpty, omit } from 'lodash-es'
import * as Yup from 'yup'
import {
  Container,
  Formik,
  FormikForm,
  Button,
  ButtonVariation,
  useToaster,
  PageSpinner,
  FormInput,
  Text
} from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import type { HideModal } from '@harness/use-modal'
import type { FormikProps } from 'formik'
import { Callout } from '@blueprintjs/core'
import { useStrings } from 'framework/strings'
import {
  Error,
  inputSetMoveConfigPromise,
  moveConfigsPromise,
  MoveConfigsQueryParams,
  ResponseMoveConfigResponse,
  ResponseInputSetMoveConfigResponseDTO
} from 'services/pipeline-ng'
import { GitSyncForm } from '@gitsync/components/GitSyncForm/GitSyncForm'
import type { ResponseMessage } from '@common/components/ErrorHandler/ErrorHandler'
import type { PipelinePathProps } from '@common/interfaces/RouteInterfaces'
import { ResourceType } from '@common/interfaces/GitSyncInterface'
import { NameId } from '@common/components/NameIdDescriptionTags/NameIdDescriptionTags'
import { yamlPathRegex } from '@common/utils/StringUtils'
import useRBACError, { RBACError } from '@rbac/utils/useRBACError/useRBACError'
import {
  MoveEnvironmentConfigsQueryParams,
  MoveInfraConfigsQueryParams,
  ResponseServiceMoveConfigResponse,
  moveEnvironmentConfigsPromise,
  moveInfraConfigsPromise,
  moveServiceConfigsPromise
} from 'services/cd-ng'
import {
  ExtraQueryParams,
  getDisableFields,
  InitialValuesType,
  MigrationType,
  ModifiedInitialValuesType
} from './MigrateUtils'
import css from './MigrateResource.module.scss'

export interface MoveResourceProps {
  migrationType: MigrationType
  resourceType: ResourceType
  initialValues?: InitialValuesType
  onCancelClick?: HideModal
  onSuccess?: () => void
  onFailure?: () => void
  extraQueryParams?: ExtraQueryParams
}

export default function MoveResource({
  initialValues = {
    identifier: '',
    name: '',
    description: '',
    tags: {},
    repoName: '',
    branch: '',
    connectorRef: ''
  },
  migrationType,
  resourceType,
  onCancelClick,
  onSuccess,
  onFailure,
  extraQueryParams
}: MoveResourceProps): JSX.Element {
  const [errorResponse, setErrorResponse] = useState<ResponseMessage[]>()
  const [isLoading, setIsLoading] = useState<boolean>()
  const { accountId, orgIdentifier, projectIdentifier } = useParams<PipelinePathProps>()
  const pipelineIdentifier = extraQueryParams?.pipelineIdentifier
  const environmentIdentifier = get(extraQueryParams, 'environmentIdentifier', '')
  const { showError, clear, showSuccess } = useToaster()
  const { getString } = useStrings()
  const formikRef = useRef<FormikProps<ModifiedInitialValuesType>>(null)
  const { getRBACErrorMessage } = useRBACError()
  const getReourceTypeText = useCallback((): string => {
    switch (resourceType) {
      case ResourceType.PIPELINES:
        return getString('common.pipeline')
      case ResourceType.INPUT_SETS:
        return getString('common.pipeline')
      case ResourceType.SERVICE:
        return getString('service')
      case ResourceType.ENVIRONMENT:
        return getString('environment')
      case ResourceType.INFRASTRUCTURE:
        return getString('infrastructureText')
      default:
        return getString('common.resourceLabel')
    }
  }, [getString, resourceType])

  const handleResponse = (
    response: ResponseMoveConfigResponse | ResponseInputSetMoveConfigResponseDTO | ResponseServiceMoveConfigResponse
  ): void => {
    if (response.status === 'SUCCESS') {
      setIsLoading(false)
      showSuccess(getString('pipeline.moveSuccessMessage', { resourceType: getReourceTypeText() }))
      onSuccess?.()
    } else {
      handleError(response)
    }
  }

  const handleError = (err: Error): void => {
    setIsLoading(false)
    if (!isEmpty(err.responseMessages)) {
      setErrorResponse(err.responseMessages)
      onFailure?.()
    } else {
      clear()
      showError(getRBACErrorMessage(err as RBACError) || getString('somethingWentWrong'))
      onFailure?.()
    }
  }

  const movePipeline = (formValues: ModifiedInitialValuesType): void => {
    const { identifier, connectorRef, repo, branch, filePath, commitMsg, baseBranch } = formValues
    setIsLoading(true)
    moveConfigsPromise({
      pipelineIdentifier: identifier,
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        connectorRef: typeof connectorRef === 'string' ? connectorRef : (connectorRef as any).value,
        repoName: repo,
        branch,
        filePath,
        moveConfigType: migrationType as MoveConfigsQueryParams['moveConfigType'],
        ...(baseBranch ? { isNewBranch: true, baseBranch } : { isNewBranch: false }),
        commitMsg,
        pipelineIdentifier: identifier
      },
      requestOptions: {
        headers: {
          'content-type': 'application/json'
        }
      },
      body: undefined
    })
      .then(handleResponse)
      .catch(handleError)
  }

  const moveInputSet = (formValues: ModifiedInitialValuesType): void => {
    const { identifier, connectorRef, repo, branch, filePath, commitMsg, baseBranch } = formValues
    setIsLoading(true)
    inputSetMoveConfigPromise({
      inputSetIdentifier: identifier,
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        connectorRef: typeof connectorRef === 'string' ? connectorRef : (connectorRef as any).value,
        repoName: repo,
        branch,
        filePath,
        moveConfigType: migrationType as MoveConfigsQueryParams['moveConfigType'],
        ...(baseBranch ? { isNewBranch: true, baseBranch } : { isNewBranch: false }),
        commitMsg,
        pipelineIdentifier: pipelineIdentifier,
        inputSetIdentifier: identifier
      },
      requestOptions: {
        headers: {
          'content-type': 'application/json'
        }
      },
      body: undefined
    })
      .then(handleResponse)
      .catch(handleError)
  }

  const moveService = (formValues: ModifiedInitialValuesType): void => {
    const { identifier, connectorRef, repo, branch, filePath, commitMsg, baseBranch } = formValues
    setIsLoading(true)
    moveServiceConfigsPromise({
      serviceIdentifier: identifier,
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        connectorRef: typeof connectorRef === 'string' ? connectorRef : (connectorRef as any).value,
        repoName: repo,
        branch,
        filePath,
        moveConfigType: migrationType as MoveConfigsQueryParams['moveConfigType'],
        ...(baseBranch ? { isNewBranch: true, baseBranch } : { isNewBranch: false }),
        commitMsg
      },
      requestOptions: {
        headers: {
          'content-type': 'application/json'
        }
      },
      body: undefined
    })
      .then(handleResponse)
      .catch(handleError)
  }

  const moveEnvironment = (formValues: ModifiedInitialValuesType): void => {
    const { identifier, connectorRef, repo, branch, filePath, commitMsg, baseBranch } = formValues
    setIsLoading(true)
    moveEnvironmentConfigsPromise({
      environmentIdentifier: identifier,
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        connectorRef: typeof connectorRef === 'string' ? connectorRef : (connectorRef as any).value,
        repoName: repo,
        branch,
        filePath,
        moveConfigType: migrationType as MoveEnvironmentConfigsQueryParams['moveConfigType'],
        ...(baseBranch ? { isNewBranch: true, baseBranch } : { isNewBranch: false }),
        commitMsg
      },
      requestOptions: {
        headers: {
          'content-type': 'application/json'
        }
      },
      body: undefined
    })
      .then(handleResponse)
      .catch(handleError)
  }

  const moveInfra = (formValues: ModifiedInitialValuesType): void => {
    const { identifier, connectorRef, repo, branch, filePath, commitMsg, baseBranch } = formValues
    setIsLoading(true)
    moveInfraConfigsPromise({
      infraIdentifier: identifier,
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        environmentIdentifier,
        connectorRef: typeof connectorRef === 'string' ? connectorRef : (connectorRef as any).value,
        repoName: repo,
        branch,
        filePath,
        moveConfigType: migrationType as MoveInfraConfigsQueryParams['moveConfigType'],
        ...(baseBranch ? { isNewBranch: true, baseBranch } : { isNewBranch: false }),
        commitMsg
      },
      requestOptions: {
        headers: {
          'content-type': 'application/json'
        }
      },
      body: undefined
    })
      .then(handleResponse)
      .catch(handleError)
  }

  const moveEntity = (formValues: ModifiedInitialValuesType): void => {
    switch (resourceType) {
      case ResourceType.PIPELINES:
        movePipeline(formValues)
        break
      case ResourceType.INPUT_SETS:
        moveInputSet(formValues)
        break
      case ResourceType.SERVICE:
        moveService(formValues)
        break
      case ResourceType.ENVIRONMENT:
        moveEnvironment(formValues)
        break
      case ResourceType.INFRASTRUCTURE:
        moveInfra(formValues)
        break
    }
  }

  const validationSchema = Yup.object().shape({
    repo: Yup.string().trim().required(getString('common.git.validation.repoRequired')),
    branch: Yup.string().trim().required(getString('common.git.validation.branchRequired')),
    connectorRef: Yup.string().trim().required(getString('validation.sshConnectorRequired')),
    filePath: Yup.mixed().when([], {
      is: migrationType === MigrationType.INLINE_TO_REMOTE,
      then: Yup.string()
        .trim()
        .required(getString('gitsync.gitSyncForm.yamlPathRequired'))
        .matches(yamlPathRegex, getString('gitsync.gitSyncForm.yamlPathInvalid'))
    }),
    commitMsg: Yup.mixed().when([], {
      is: migrationType === MigrationType.INLINE_TO_REMOTE,
      then: Yup.string().trim().required(getString('common.git.validation.commitMessage'))
    })
  })

  const modifiedInitialValues = React.useMemo(() => {
    return {
      ...omit(initialValues, 'repoName'),
      repo: initialValues.repoName,
      commitMsg: getString('pipeline.defaultMoveCommitMsg', {
        resourceType: getReourceTypeText(),
        name: initialValues.name
      })
    }
  }, [initialValues, getString, getReourceTypeText])

  return (
    <Container className={css.migrateResourceForm}>
      {resourceType === ResourceType.PIPELINES ? (
        <Callout className={css.migrateResourceWarning} intent="warning" icon={null}>
          <Text font={{ variation: FontVariation.BODY2 }}>
            Please make sure you move associated input sets to Git as well and
            <a
              href="https://developer.harness.io/docs/platform/Git-Experience/move-inline-entities-to-git"
              target="_blank"
              rel="noreferrer"
            >
              <b>&nbsp;update your existing triggers&nbsp;</b>
            </a>
            to work with remote pipelines.
          </Text>
        </Callout>
      ) : null}
      <Formik<ModifiedInitialValuesType>
        initialValues={modifiedInitialValues}
        formName="moveConfig"
        validationSchema={validationSchema}
        onSubmit={moveEntity}
        innerRef={formikRef}
      >
        {formikProps => (
          <FormikForm>
            {isLoading ? (
              <PageSpinner message={getString('loading')} />
            ) : (
              <>
                <NameId inputGroupProps={{ disabled: true }} identifierProps={{ isIdentifierEditable: false }} />
                <GitSyncForm
                  formikProps={formikProps as any}
                  initialValues={{
                    filePath: formikProps.submitCount > 0 ? formikProps.values?.filePath : ''
                  }}
                  isEdit={false}
                  errorData={errorResponse}
                  disableFields={getDisableFields(resourceType)}
                  className={css.gitSyncForm}
                  supportNewBranch
                />
                <FormInput.TextArea
                  className={css.commitMessage}
                  label={getString('common.git.commitMessage')}
                  name="commitMsg"
                />

                <Container padding={{ top: 'xlarge' }}>
                  <Button variation={ButtonVariation.PRIMARY} type="submit" text={getString('common.moveToGit')} />
                  &nbsp; &nbsp;
                  <Button
                    variation={ButtonVariation.TERTIARY}
                    text={getString('cancel')}
                    onClick={() => {
                      onCancelClick?.()
                    }}
                  />
                </Container>
              </>
            )}
          </FormikForm>
        )}
      </Formik>
    </Container>
  )
}
