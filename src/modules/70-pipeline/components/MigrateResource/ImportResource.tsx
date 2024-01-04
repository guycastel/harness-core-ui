/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { defaultTo, isEmpty, omit } from 'lodash-es'
import * as Yup from 'yup'
import {
  Container,
  Formik,
  FormikForm,
  Button,
  ButtonVariation,
  useToaster,
  PageSpinner,
  useConfirmationDialog,
  FormInput
} from '@harness/uicore'
import { Intent } from '@harness/design-system'
import type { HideModal } from '@harness/use-modal'

import type { FormikProps } from 'formik'
import { useStrings } from 'framework/strings'
import {
  Error,
  importInputSetPromise,
  importPipelineWithoutIdPromise,
  ResponsePipelineSaveResponse
} from 'services/pipeline-ng'
import { importTemplatePromise, ResponseTemplateImportSaveResponse } from 'services/template-ng'
import { IdentifierSchema, NameSchema, TemplateVersionLabelSchema } from '@common/utils/Validation'
import { GitSyncForm } from '@gitsync/components/GitSyncForm/GitSyncForm'
import { yamlPathRegex } from '@common/utils/StringUtils'
import type { ResponseMessage } from '@common/components/ErrorHandler/ErrorHandler'
import type { PipelinePathProps } from '@common/interfaces/RouteInterfaces'
import { ResourceType } from '@common/interfaces/GitSyncInterface'
import { NameId } from '@common/components/NameIdDescriptionTags/NameIdDescriptionTags'
import useRBACError, { RBACError } from '@rbac/utils/useRBACError/useRBACError'
import type { ExtraQueryParams, InitialValuesType, ModifiedInitialValuesType } from './MigrateUtils'
import css from './MigrateResource.module.scss'

export interface ImportResourceProps {
  resourceType: ResourceType
  initialValues?: InitialValuesType
  onCancelClick?: HideModal
  onSuccess?: () => void
  onFailure?: () => void
  extraQueryParams?: ExtraQueryParams
}

export default function ImportResource({
  initialValues = {
    identifier: '',
    name: '',
    description: '',
    tags: {},
    repoName: '',
    branch: '',
    connectorRef: ''
  },
  resourceType,
  onCancelClick,
  onSuccess,
  onFailure,
  extraQueryParams
}: ImportResourceProps): JSX.Element {
  const [errorResponse, setErrorResponse] = useState<ResponseMessage[]>()
  const [isLoading, setIsLoading] = useState<boolean>()
  const { accountId, orgIdentifier, projectIdentifier, pipelineIdentifier } = useParams<PipelinePathProps>()
  const { showError, clear, showSuccess } = useToaster()
  const { getString } = useStrings()
  const formikRef = useRef<FormikProps<ModifiedInitialValuesType>>(null)
  const [isForceImport, setIsForceImport] = useState<boolean>()
  const { getRBACErrorMessage } = useRBACError()
  const getReourceTypeText = (): string => {
    if (resourceType === ResourceType.PIPELINES) {
      return getString('common.pipeline')
    }
    if (resourceType === ResourceType.INPUT_SETS) {
      return getString('inputSets.inputSetLabel')
    }
    if (resourceType === ResourceType.TEMPLATE) {
      return getString('common.templates')
    }
    return getString('common.resourceLabel')
  }

  const getForceImportText = (): string => {
    if (resourceType === ResourceType.PIPELINES) {
      return getString('pipeline.duplicateImportPipeline')
    }
    if (resourceType === ResourceType.INPUT_SETS) {
      return getString('pipeline.duplicateImportInputset')
    }
    if (resourceType === ResourceType.TEMPLATE) {
      return getString('pipeline.duplicateImportTemplate')
    }
    return getString('pipeline.duplicateImport')
  }

  const handleResponse = (response: ResponsePipelineSaveResponse | ResponseTemplateImportSaveResponse): void => {
    setIsLoading(false)
    if (response.status === 'SUCCESS') {
      showSuccess(getString('pipeline.importSuccessMessage', { resourceType: getReourceTypeText() }))
      onSuccess?.()
    } else if (!isEmpty((response as Error).responseMessages)) {
      if ((response as Error).code === 'DUPLICATE_FILE_IMPORT') {
        openForceImportDialog()
      } else {
        setErrorResponse((response as Error).responseMessages)
      }
      onFailure?.()
    } else {
      clear()
      showError(getRBACErrorMessage(response as any) || getString('somethingWentWrong'))
      onFailure?.()
    }
  }

  const handleError = (err: Error): void => {
    if (!isEmpty(err.responseMessages)) {
      setIsLoading(false)
      setErrorResponse(err.responseMessages)
      onFailure?.()
    } else {
      setIsLoading(false)
      showError(getRBACErrorMessage(err as RBACError) || getString('somethingWentWrong'))
      onFailure?.()
    }
  }

  const { openDialog: openForceImportDialog } = useConfirmationDialog({
    contentText: getForceImportText(),
    titleText: getString('common.importFromGit'),
    confirmButtonText: getString('common.import'),
    cancelButtonText: getString('cancel'),
    intent: Intent.PRIMARY,
    buttonIntent: Intent.PRIMARY,
    onCloseDialog: async (isConfirmed: boolean) => {
      if (isConfirmed) {
        setIsForceImport(true)
        formikRef.current?.submitForm()
      }
    }
  })

  const importPipeline = (formValues: ModifiedInitialValuesType): void => {
    const { description, connectorRef, repo, branch, filePath } = formValues
    setIsLoading(true)
    importPipelineWithoutIdPromise({
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        connectorRef: typeof connectorRef === 'string' ? connectorRef : (connectorRef as any).value,
        repoName: repo,
        branch,
        filePath,
        isForceImport
      },
      requestOptions: {
        headers: {
          'content-type': 'application/json'
        }
      },
      body: {
        pipelineDescription: description
      }
    })
      .then(handleResponse)
      .catch(handleError)
  }

  const importInputSet = (formValues: ModifiedInitialValuesType): void => {
    const { identifier, name, description, connectorRef, repo, branch, filePath } = formValues
    setIsLoading(true)
    importInputSetPromise({
      inputSetIdentifier: identifier,
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier: defaultTo(extraQueryParams?.pipelineIdentifier, defaultTo(pipelineIdentifier, '')),
        connectorRef: typeof connectorRef === 'string' ? connectorRef : (connectorRef as any).value,
        repoName: repo,
        branch,
        filePath,
        isForceImport
      },
      requestOptions: {
        headers: {
          'content-type': 'application/json'
        }
      },
      body: {
        inputSetName: name,
        inputSetDescription: description
      }
    })
      .then(handleResponse)
      .catch(handleError)
  }

  const importTemplate = (formValues: ModifiedInitialValuesType): void => {
    const { identifier, name, description, connectorRef, repo, branch, filePath, versionLabel } = formValues
    setIsLoading(true)
    importTemplatePromise({
      templateIdentifier: identifier,
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        connectorRef: typeof connectorRef === 'string' ? connectorRef : (connectorRef as any).value,
        repoName: repo,
        branch,
        filePath,
        isForceImport
      },
      requestOptions: {
        headers: {
          'content-type': 'application/json'
        }
      },
      body: {
        templateDescription: description,
        templateVersion: versionLabel,
        templateName: name
      }
    })
      .then(handleResponse)
      .catch(handleError)
  }

  const importEntity = (formValues: ModifiedInitialValuesType): void => {
    switch (resourceType) {
      case ResourceType.PIPELINES:
        importPipeline(formValues)
        break
      case ResourceType.INPUT_SETS:
        importInputSet(formValues)
        break
      case ResourceType.TEMPLATE:
        importTemplate(formValues)
    }
  }

  const getVersionLabelSchema =
    resourceType === ResourceType.TEMPLATE
      ? {
          versionLabel: TemplateVersionLabelSchema(getString)
        }
      : {}

  const nameIdSchema =
    resourceType !== ResourceType.PIPELINES
      ? {
          name: NameSchema(getString, { requiredErrorMsg: getString('createPipeline.pipelineNameRequired') }),
          identifier: IdentifierSchema(getString)
        }
      : {}

  const validationSchema = Yup.object().shape({
    ...nameIdSchema,
    ...getVersionLabelSchema,
    repo: Yup.string().trim().required(getString('common.git.validation.repoRequired')),
    branch: Yup.string().trim().required(getString('common.git.validation.branchRequired')),
    connectorRef: Yup.string().trim().required(getString('validation.sshConnectorRequired')),
    filePath: Yup.string()
      .trim()
      .required(getString('gitsync.gitSyncForm.yamlPathRequired'))
      .matches(yamlPathRegex, getString('gitsync.gitSyncForm.yamlPathInvalid'))
  })

  const modifiedInitialValues = React.useMemo(() => {
    return {
      ...omit(initialValues, 'repoName'),
      repo: initialValues.repoName
    }
  }, [initialValues])

  return (
    <Container className={css.migrateResourceForm}>
      <Formik<ModifiedInitialValuesType>
        initialValues={modifiedInitialValues}
        formName="importResource"
        validationSchema={validationSchema}
        onSubmit={importEntity}
        innerRef={formikRef}
      >
        {formikProps => (
          <FormikForm>
            {isLoading ? (
              <PageSpinner message={getString('loading')} />
            ) : (
              <>
                {resourceType !== ResourceType.PIPELINES && <NameId />}
                {resourceType === ResourceType.TEMPLATE && (
                  <FormInput.Text
                    name="versionLabel"
                    placeholder={getString('common.template.createNewModal.versionPlaceholder')}
                    label={getString('common.versionLabel')}
                  />
                )}
                <GitSyncForm
                  formikProps={formikProps as any}
                  initialValues={{
                    filePath: formikProps.submitCount > 0 ? formikProps.values?.filePath : ''
                  }}
                  isEdit={false}
                  errorData={errorResponse}
                  disableFields={
                    resourceType === ResourceType.INPUT_SETS
                      ? {
                          provider: true,
                          connectorRef: true,
                          repoName: true,
                          branch: true
                        }
                      : undefined
                  }
                  className={css.gitSyncForm}
                />

                <Container padding={{ top: 'xlarge' }}>
                  <Button variation={ButtonVariation.PRIMARY} type="submit" text={getString('common.import')} />
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
