/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useRef, useState } from 'react'
import type { FormikContextType } from 'formik'
import { defaultTo, isEmpty } from 'lodash-es'
import { useParams } from 'react-router-dom'
import * as Yup from 'yup'
import cx from 'classnames'
import { Container, FormInput, Layout, SelectOption, useToaster, Radio, Icon, Text } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { Divider } from '@blueprintjs/core'
import { useStrings, UseStringsReturn } from 'framework/strings'
import {
  ConnectorReferenceField,
  ConnectorSelectedValue
} from '@platform/connectors/components/ConnectorReferenceField/ConnectorReferenceField'

import type { GitQueryParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { Scope } from '@common/interfaces/SecretsInterface'
import { useQueryParams } from '@common/hooks'
import RepositorySelect from '@common/components/RepositorySelect/RepositorySelect'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import RepoBranchSelectV2 from '@common/components/RepoBranchSelectV2/RepoBranchSelectV2'
import { ErrorHandler, ResponseMessage } from '@common/components/ErrorHandler/ErrorHandler'
import { getSettingValue } from '@platform/default-settings/utils/utils'
import { Connectors } from '@platform/connectors/constants'
import { getConnectorIdentifierWithScope } from '@platform/connectors/utils/utils'
import { yamlPathRegex } from '@common/utils/StringUtils'
import {
  ConnectorInfoDTO,
  GetConnectorQueryParams,
  useGetConnector,
  useGetSettingsList,
  validateRepoPromise
} from 'services/cd-ng'
import { SettingType } from '@common/constants/Utils'
import { getIdentifierFromValue, getScopeFromValue } from '@common/components/EntityReference/EntityReference'
import {
  CardSelectInterface,
  GitProviderSelect,
  getGitProviderCards
} from '@modules/10-common/components/GitProviderSelect/GitProviderSelect'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { isHarnessCodeRepoEntity } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect.utils'
import { SourceCodeTypes } from '@modules/10-common/components/AccessTokenOAuth/AccessTokenOAuth'
import css from './GitSyncForm.module.scss'

export interface GitSyncFormFields {
  identifier?: string
  provider?: CardSelectInterface
  connectorRef?: ConnectorSelectedValue | string
  repo?: string
  branch?: string
  baseBranch?: string
  filePath?: string
  versionLabel?: string
}
interface GitSyncFormProps<T> {
  formikProps: FormikContextType<T>
  isEdit: boolean
  disableFields?: {
    provider?: boolean
    connectorRef?: boolean
    repoName?: boolean
    branch?: boolean
    filePath?: boolean
  }
  initialValues?: StoreMetadata
  errorData?: ResponseMessage[]
  entityScope?: Scope
  className?: string
  filePathPrefix?: string
  differentRepoAllowedSettings?: boolean
  skipDefaultConnectorSetting?: boolean
  skipBranch?: boolean
  supportNewBranch?: boolean
  shouldRenderRepositoryLocationCard?: boolean
}

interface NewGitBranchProps<T> {
  formikProps: FormikContextType<T>
}

export const gitSyncFormSchema = (
  getString: UseStringsReturn['getString']
): {
  repo: Yup.MixedSchema
  branch: Yup.MixedSchema
  connectorRef: Yup.MixedSchema
  filePath: Yup.MixedSchema
} => ({
  repo: Yup.mixed().when('storeType', {
    is: StoreType.REMOTE,
    then: Yup.string().trim().required(getString('common.git.validation.repoRequired'))
  }),
  branch: Yup.mixed().when('storeType', {
    is: StoreType.REMOTE,
    then: Yup.string().trim().required(getString('common.git.validation.branchRequired'))
  }),
  connectorRef: Yup.mixed().when(['storeType', 'provider'], {
    is: (storeType, provider) => storeType === StoreType.REMOTE && !isHarnessCodeRepoEntity(provider?.type),
    then: Yup.string().trim().required(getString('validation.sshConnectorRequired'))
  }),
  filePath: Yup.mixed().when('storeType', {
    is: StoreType.REMOTE,
    then: Yup.string()
      .trim()
      .required(getString('gitsync.gitSyncForm.yamlPathRequired'))
      .matches(yamlPathRegex, getString('gitsync.gitSyncForm.yamlPathInvalid'))
  })
})

export const getSupportedProviders = (): Array<ConnectorInfoDTO['type']> => {
  const supportedRepoProviders = [Connectors.GITHUB, Connectors.BITBUCKET, Connectors.AZURE_REPO, Connectors.GITLAB]
  return supportedRepoProviders
}

function NewGitBranch<T extends GitSyncFormFields = GitSyncFormFields>(
  props: NewGitBranchProps<T>
): React.ReactElement {
  const { formikProps } = props
  const { getString } = useStrings()
  const [isNewBranch, setIsNewBranch] = React.useState(Boolean(formikProps.values?.baseBranch))

  const handleBranchTypeChange = (isNew: boolean, formik: FormikContextType<T>): void => {
    if (isNewBranch !== isNew) {
      setIsNewBranch(isNew)
      formik.setFieldValue('branch', '')
      formik.setFieldValue('baseBranch', '')
      formik.setFieldTouched('branch', false)
      formik.setFieldTouched('baseBranch', false)
    }
  }

  return (
    <Layout.Vertical spacing="medium">
      <Container
        className={css.branchSection}
        padding={{
          top: 'xSmall',
          bottom: 'xSmall'
        }}
      >
        <Radio large onChange={() => handleBranchTypeChange(false, formikProps)} checked={!isNewBranch}>
          <Icon name="git-branch-existing"></Icon>
          <Text margin={{ left: 'small' }} inline font={{ variation: FontVariation.BODY }}>
            {getString('common.git.existingBranchCommitLabel')}
          </Text>
        </Radio>
        {!isNewBranch && (
          <RepoBranchSelectV2
            key={formikProps?.values?.repo}
            gitProviderType={formikProps.values.provider?.type}
            connectorIdentifierRef={(formikProps?.values?.connectorRef as unknown as ConnectorSelectedValue)?.value}
            repoName={formikProps?.values?.repo}
            onChange={(selected: SelectOption) => {
              // This is to handle auto fill after default selection, without it form validation will fail
              if (formikProps.values.branch !== selected.value) {
                formikProps.setFieldValue?.('branch', selected.value)
              }
            }}
            selectedValue={formikProps.values.branch}
            noLabel
          />
        )}
      </Container>
      <Container
        className={css.branchSection}
        padding={{
          top: 'xSmall',
          bottom: 'xSmall'
        }}
        margin={{ bottom: 'large' }}
      >
        <Radio
          data-test="newBranchRadioBtn"
          large
          onChange={() => handleBranchTypeChange(true, formikProps)}
          checked={isNewBranch}
        >
          <Icon name="git-new-branch" color={Color.GREY_700}></Icon>
          <Text inline margin={{ left: 'small' }} font={{ variation: FontVariation.BODY }}>
            {getString('common.git.newBranchCommitLabel')}
          </Text>
        </Radio>
        {isNewBranch && (
          <Container>
            <FormInput.Text name="branch" placeholder={getString('common.git.branchName')} />
            <RepoBranchSelectV2
              key={formikProps?.values?.repo}
              gitProviderType={formikProps.values.provider?.type}
              name="baseBranch"
              connectorIdentifierRef={(formikProps?.values?.connectorRef as unknown as ConnectorSelectedValue)?.value}
              repoName={formikProps?.values?.repo}
              onChange={(selected: SelectOption) => {
                // This is to handle auto fill after default selection, without it form validation will fail
                if (formikProps.values.baseBranch !== selected.value) {
                  formikProps.setFieldValue?.('baseBranch', selected.value)
                }
              }}
              selectedValue={formikProps.values.baseBranch}
              label={getString('gitsync.baseBranchToFork')}
            />
          </Container>
        )}
      </Container>
    </Layout.Vertical>
  )
}

export function GitSyncForm<T extends GitSyncFormFields = GitSyncFormFields>(
  props: GitSyncFormProps<T>
): React.ReactElement {
  const {
    formikProps,
    isEdit,
    disableFields = {},
    initialValues,
    errorData,
    entityScope = Scope.PROJECT,
    className = '',
    filePathPrefix,
    skipDefaultConnectorSetting = false,
    differentRepoAllowedSettings,
    skipBranch = false,
    supportNewBranch = false,
    shouldRenderRepositoryLocationCard = false
  } = props
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { connectorRef, branch, repoName } = useQueryParams<GitQueryParams>()
  const { CODE_ENABLED } = useFeatureFlags()
  const { getString } = useStrings()
  const { showError } = useToaster()
  const [errorResponse, setErrorResponse] = useState<ResponseMessage[]>(errorData ?? [])
  const [filePathTouched, setFilePathTouched] = useState<boolean>()
  const formikConnectorRef =
    typeof formikProps.values.connectorRef === 'string'
      ? formikProps.values.connectorRef
      : formikProps.values.connectorRef?.value

  const defaultSettingConnector = useRef<string>('')
  const getConnectorScope = (): Scope => getScopeFromValue(defaultSettingConnector.current || '')
  const getConnectorId = (): string => getIdentifierFromValue(defaultSettingConnector.current || '')
  const getConnectorQueryParams = (): GetConnectorQueryParams => {
    return {
      accountIdentifier: accountId,
      orgIdentifier:
        getConnectorScope() === Scope.ORG || getConnectorScope() === Scope.PROJECT ? orgIdentifier : undefined,
      projectIdentifier: getConnectorScope() === Scope.PROJECT ? projectIdentifier : undefined
    }
  }

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
    lazy: !!(formikProps.values.connectorRef || connectorRef) || skipDefaultConnectorSetting
  })

  const {
    data: connectorData,
    loading: loadingDefaultConnector,
    error: connectorFetchError,
    refetch
  } = useGetConnector({
    identifier: '',
    queryParams: getConnectorQueryParams(),
    lazy: true
  })

  useEffect(() => {
    if (!loadingSetting) {
      if (gitXSettingError) {
        showError(gitXSettingError.message)
      } else if (
        getSettingValue(gitXSetting, SettingType.DEFAULT_CONNECTOR_FOR_GIT_EXPERIENCE) &&
        !(formikConnectorRef || connectorRef) &&
        formikProps.values.provider?.type !== SourceCodeTypes.HARNESS
      ) {
        defaultSettingConnector.current =
          getSettingValue(gitXSetting, SettingType.DEFAULT_CONNECTOR_FOR_GIT_EXPERIENCE) || ''
        refetch({
          pathParams: { identifier: getConnectorId() },
          queryParams: getConnectorQueryParams()
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gitXSettingError, loadingSetting, formikProps.values.provider?.type])

  const preSelectedConnector =
    connectorRef ||
    (skipDefaultConnectorSetting
      ? undefined
      : getSettingValue(gitXSetting, SettingType.DEFAULT_CONNECTOR_FOR_GIT_EXPERIENCE))

  const validateAndSetRepo = async (settingRepoName: string): Promise<void> => {
    const validateRepoResponse = await validateRepoPromise({
      queryParams: {
        connectorRef: preSelectedConnector,
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        repoName: settingRepoName
      }
    })

    if (validateRepoResponse.data?.isValid) {
      // No need to select or show error if setting repo is not in allowed list
      formikProps.setFieldValue?.('repo', settingRepoName)
      return
    }
  }

  useEffect(() => {
    if (!formikProps.values.provider && shouldRenderRepositoryLocationCard) {
      if (CODE_ENABLED && isEmpty(formikConnectorRef)) {
        formikProps.setFieldValue('provider', getGitProviderCards(getString)[0])
      } else {
        formikProps.setFieldValue('provider', getGitProviderCards(getString)[1])
      }
    }
  }, [formikProps?.values?.provider, shouldRenderRepositoryLocationCard])

  useEffect(() => {
    if (!loadingDefaultConnector && connectorData?.data?.connector) {
      const value = connectorData?.data?.connector
      formikProps.setFieldValue('connectorRef', {
        label: defaultTo(value?.name, ''),
        value: defaultSettingConnector.current,
        scope: getConnectorScope(),
        live: connectorData?.data?.status?.status === 'SUCCESS',
        connector: value
      })
      // Prefilling repo from setting only if setting has connector too
      const repoNameInSetting = getSettingValue(gitXSetting, SettingType.DEFAULT_REPO_FOR_GIT_EXPERIENCE)
      repoNameInSetting && validateAndSetRepo(repoNameInSetting)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorFetchError, loadingDefaultConnector])

  useEffect(() => {
    setErrorResponse(errorData as ResponseMessage[])
  }, [errorData])

  useEffect(() => {
    if (!isEdit && formikProps?.values?.identifier && isEmpty(initialValues?.filePath) && !filePathTouched) {
      let versionLabel = ''
      if (formikProps.values.versionLabel?.trim()) {
        versionLabel = '_' + formikProps.values.versionLabel.trim().split(' ').join('_')
      }
      const pathPrefix = filePathPrefix || '.harness'
      formikProps.setFieldValue('filePath', `${pathPrefix}/${formikProps.values.identifier}${versionLabel}.yaml`)
    }
  }, [formikProps?.values?.identifier, formikProps?.values?.versionLabel, isEdit, filePathTouched, filePathPrefix])

  useEffect(() => {
    if (!filePathTouched && formikProps.touched.filePath) {
      setFilePathTouched(true)
    }
  }, [filePathTouched, formikProps.touched.filePath])

  useEffect(() => {
    setErrorResponse([])
  }, [formikProps.values.connectorRef])

  return (
    <Container padding={{ top: 'large' }} className={cx(css.gitSyncForm, className)}>
      {CODE_ENABLED && shouldRenderRepositoryLocationCard ? (
        <>
          <Divider />
          <Text font={{ variation: FontVariation.H6 }} className={css.gitRepoLocationHeader}>
            {getString('common.git.gitRepositoryLocation')}
          </Text>
          <GitProviderSelect
            gitProvider={formikProps.values.provider}
            setFieldValue={formikProps.setFieldValue}
            connectorFieldName={'connectorRef'}
            repoNameFieldName={'repo'}
            branchFieldName={'branch'}
            showDescription
            className={css.gitProviderCardWrapper}
            getCardDisabledStatus={(current, selected) => {
              if (differentRepoAllowedSettings && !isEdit) {
                return false
              }
              return (isEdit || !!disableFields.provider) && current !== selected
            }}
          />
        </>
      ) : null}
      <Layout.Horizontal>
        <Layout.Vertical>
          {!isHarnessCodeRepoEntity(formikProps.values.provider?.type) ? (
            <ConnectorReferenceField
              name="connectorRef"
              width={350}
              type={getSupportedProviders()}
              selected={defaultTo(formikProps.values.connectorRef, connectorRef)}
              error={formikProps.submitCount > 0 ? (formikProps?.errors?.connectorRef as string) : undefined}
              label={getString('platform.connectors.title.gitConnector')}
              placeholder={
                loadingSetting
                  ? getString('platform.defaultSettings.fetchingDefaultConnector')
                  : `- ${getString('select')} -`
              }
              accountIdentifier={accountId}
              {...(entityScope === Scope.ACCOUNT ? {} : { orgIdentifier })}
              {...(entityScope === Scope.PROJECT ? { projectIdentifier } : {})}
              onChange={(value, scope) => {
                const connectorRefWithScope = getConnectorIdentifierWithScope(scope, value?.identifier)

                formikProps.setFieldValue('connectorRef', {
                  label: defaultTo(value.name, ''),
                  value: connectorRefWithScope,
                  scope: scope,
                  live: value?.status?.status === 'SUCCESS',
                  connector: value
                })
                formikProps.setFieldValue?.('repo', '')
                formikProps.setFieldValue?.('branch', '')
              }}
              disabled={isEdit || disableFields.connectorRef || loadingSetting}
            />
          ) : null}

          <RepositorySelect
            formikProps={formikProps}
            gitProviderType={formikProps.values.provider?.type}
            connectorRef={formikConnectorRef || preSelectedConnector}
            onChange={() => {
              if (errorResponse?.length === 0) {
                formikProps.setFieldValue?.('branch', '')
              }
            }}
            selectedValue={defaultTo(formikProps?.values?.repo, repoName)}
            disabled={isEdit || disableFields.repoName}
            setErrorResponse={setErrorResponse}
          />
          {skipBranch ? null : supportNewBranch ? (
            <NewGitBranch formikProps={formikProps} />
          ) : (
            <RepoBranchSelectV2
              key={formikProps?.values?.repo}
              gitProviderType={formikProps.values.provider?.type}
              connectorIdentifierRef={formikConnectorRef || preSelectedConnector}
              repoName={formikProps?.values?.repo}
              onChange={(selected: SelectOption) => {
                // This is to handle auto fill after default selection, without it form validation will fail
                if (formikProps.values.branch !== selected.value) {
                  formikProps.setFieldValue?.('branch', selected.value)
                }
              }}
              selectedValue={defaultTo(formikProps.values.branch, branch)}
              disabled={isEdit || disableFields.branch}
              setErrorResponse={setErrorResponse}
            />
          )}
          <FormInput.Text
            name="filePath"
            label={getString('gitsync.gitSyncForm.yamlPathLabel')}
            placeholder={getString('gitsync.gitSyncForm.enterYamlPath')}
            disabled={isEdit || disableFields.filePath}
          />
        </Layout.Vertical>
        {errorResponse?.length > 0 && (
          <Layout.Vertical style={{ flexShrink: 1 }} padding={{ left: 'xlarge' }}>
            <ErrorHandler responseMessages={errorResponse} />
          </Layout.Vertical>
        )}
      </Layout.Horizontal>
    </Container>
  )
}
