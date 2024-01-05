/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { pick, isString, get, defaultTo } from 'lodash-es'
import type { IconName, StepProps, SelectOption } from '@harness/uicore'

import type {
  ConnectorInfoDTO,
  GetSecretV2QueryParams,
  ConnectorConfigDTO,
  ErrorDetail,
  Connector,
  AppDynamicsConnectorDTO,
  AwsKmsConnectorDTO,
  ConnectorRequestBody,
  AwsSecretManagerDTO,
  AwsSecretManagerCredential,
  AwsSMCredentialSpecManualConfig,
  AwsSMCredentialSpecAssumeSTS,
  VaultConnectorDTO,
  AzureKeyVaultConnectorDTO,
  GcpKmsConnectorDTO,
  ErrorTrackingConnectorDTO,
  ELKConnectorDTO,
  TasConnector,
  TerraformCloudConnector,
  AzureKeyVaultMetadataRequestSpecDTO,
  SecretManagerMetadataRequestDTO
} from 'services/cd-ng'
import { useStrings, UseStringsReturn } from 'framework/strings'
import { getWindowLocationUrl } from 'framework/utils/WindowLocation'
import { ConnectivityModeType, DelegateTypes } from '@common/components/ConnectivityMode/ConnectivityMode'
import type { CategoryInterface, ItemInterface } from '@common/components/AddDrawer/AddDrawer'
import type { SecretReferenceInterface } from '@secrets/utils/SecretField'
import { ValueType } from '@secrets/components/TextReference/TextReference'
import { setSecretField } from '@secrets/utils/SecretField'
import { Connectors, EntityTypes } from '@platform/connectors/constants'
import { FormData, CredTypeValues, HashiCorpVaultAccessTypes } from '@platform/connectors/interfaces/ConnectorInterface'
import { transformStepHeadersAndParamsForPayloadForPrometheus } from '@platform/connectors/components/CreateConnector/PrometheusConnector/utils'
import { transformStepHeadersAndParamsForPayload } from '@platform/connectors/components/CreateConnector/CustomHealthConnector/components/CustomHealthHeadersAndParams/CustomHealthHeadersAndParams.utils'
import type { BambooFormInterface } from '@platform/connectors/components/CreateConnector/BambooConnector/StepAuth/StepBambooAuthentication'
import type { AWSBackOffStrategyValues } from '@platform/connectors/components/CreateConnector/AWSConnector/StepBackOffStrategy/StepBackOffStrategy'
import { AuthTypes, GitAuthTypes, GitAPIAuthTypes, BackOffStrategy } from './ConnectorHelper'
import { useConnectorWizard } from '../../../components/CreateConnectorWizard/ConnectorWizardContext'
export interface DelegateCardInterface {
  type: string
  info: string
  icon?: IconName
  disabled?: boolean
}
export enum VaultType {
  MANUAL = 'manual',
  FETCH = 'fetch'
}

export enum AzureSecretKeyType {
  SECRET = 'Secret',
  CERT = 'Certificate'
}

export enum AzureManagedIdentityTypes {
  USER_MANAGED = 'UserAssignedManagedIdentity',
  SYSTEM_MANAGED = 'SystemAssignedManagedIdentity'
}

export enum AzureEnvironments {
  AZURE_GLOBAL = 'AZURE',
  US_GOVERNMENT = 'AZURE_US_GOVERNMENT'
}

export const getAzureEnvironmentOptions = (getString: UseStringsReturn['getString']): SelectOption[] => {
  return [
    { label: getString('platform.connectors.azure.environments.azureGlobal'), value: AzureEnvironments.AZURE_GLOBAL },
    { label: getString('platform.connectors.azure.environments.usGov'), value: AzureEnvironments.US_GOVERNMENT }
  ]
}

export const getAzureManagedIdentityOptions = (getString: UseStringsReturn['getString']): SelectOption[] => {
  return [
    {
      label: getString('platform.connectors.azure.managedIdentities.systemAssigned'),
      value: AzureManagedIdentityTypes.SYSTEM_MANAGED
    },
    {
      label: getString('platform.connectors.azure.managedIdentities.userAssigned'),
      value: AzureManagedIdentityTypes.USER_MANAGED
    }
  ]
}

export const GCP_AUTH_TYPE = {
  DELEGATE: 'delegate',
  ENCRYPTED_KEY: 'encryptedKey'
}

export const getDelegateCards = (getString: UseStringsReturn['getString']): DelegateCardInterface[] => {
  const delegateCards = [
    {
      type: DelegateTypes.DELEGATE_OUT_CLUSTER,
      info: getString('platform.connectors.GCP.delegateOutClusterInfo')
    },
    {
      type: DelegateTypes.DELEGATE_IN_CLUSTER,
      info: getString('platform.connectors.azure.delegateInClusterInfo')
    }
  ]
  return delegateCards
}

export const DelegateInClusterType = {
  useExistingDelegate: 'useExistingDelegate',
  addNewDelegate: 'addnewDelegate'
}

export const DockerProviderType = {
  DOCKERHUB: 'DockerHub',
  HARBOR: 'Harbor',
  QUAY: 'Quay',
  OTHER: 'Other'
}

export const GitUrlType = {
  ACCOUNT: 'Account',
  PROJECT: 'Project', // Used in Azure Repos
  REPO: 'Repo'
}

export const GitConnectionType = {
  HTTP: 'Http',
  SSH: 'Ssh'
}

export const AppDynamicsAuthType = {
  USERNAME_PASSWORD: 'UsernamePassword',
  API_CLIENT_TOKEN: 'ApiClientToken'
}

export const getRefFromIdAndScopeParams = (id: string, orgIdentifier?: string, projectIdentifier?: string) => {
  let ref = ''
  if (projectIdentifier) {
    ref = id
  } else if (orgIdentifier) {
    ref = `org.` + id
  } else {
    ref = 'account.' + id
  }
  return ref
}

export const getExecuteOnDelegateValue = (type: ConnectivityModeType) => {
  return type === undefined ? true : type === ConnectivityModeType.Delegate
}

export const getConnectivityMode = (executeOnDelegate = true) => {
  return executeOnDelegate === false ? ConnectivityModeType.Manager : ConnectivityModeType.Delegate
}

const buildAuthTypePayload = (formData: FormData) => {
  const { authType = '' } = formData

  switch (authType) {
    case AuthTypes.USER_PASSWORD:
      return {
        username: formData.username?.type === ValueType.TEXT ? formData.username?.value : undefined,
        usernameRef: formData.username?.type === ValueType.ENCRYPTED ? formData.username?.value : undefined,
        passwordRef: formData.password.referenceString
      }
    case AuthTypes.SERVICE_ACCOUNT:
      return {
        serviceAccountTokenRef: formData.serviceAccountToken.referenceString,
        caCertRef: formData.clientKeyCACertificate?.referenceString // optional
      }
    case AuthTypes.OIDC:
      return {
        oidcIssuerUrl: formData.oidcIssuerUrl,
        oidcUsername: formData.oidcUsername.type === ValueType.TEXT ? formData.oidcUsername.value : undefined,
        oidcUsernameRef: formData.oidcUsername.type === ValueType.ENCRYPTED ? formData.oidcUsername.value : undefined,
        oidcPasswordRef: formData.oidcPassword?.referenceString,
        oidcClientIdRef: formData.oidcCleintId?.referenceString,
        oidcSecretRef: formData.oidcCleintSecret?.referenceString,
        oidcScopes: formData.oidcScopes
      }

    case AuthTypes.CLIENT_KEY_CERT:
      return {
        clientKeyRef: formData.clientKey.referenceString,
        clientCertRef: formData.clientKeyCertificate.referenceString,
        clientKeyPassphraseRef: formData.clientKeyPassphrase?.referenceString,
        caCertRef: formData.clientKeyCACertificate?.referenceString, // optional
        clientKeyAlgo: formData.clientKeyAlgo
      }
    case AuthTypes.BEARER_TOKEN_RANCHER:
      return {
        passwordRef: formData.passwordRef.referenceString
      }
    default:
      return {}
  }
}

export const getSpecForDelegateType = (formData: FormData) => {
  if (formData?.delegateType === DelegateTypes.DELEGATE_OUT_CLUSTER) {
    return {
      masterUrl: formData?.masterUrl,
      auth: {
        type: formData?.authType,
        spec: buildAuthTypePayload(formData)
      }
    }
  }
  return null
}

export const buildKubPayload = (formData: FormData) => {
  const savedData = {
    name: formData?.name,
    description: formData?.description,
    projectIdentifier: formData?.projectIdentifier,
    orgIdentifier: formData?.orgIdentifier,
    identifier: formData?.identifier,
    tags: formData?.tags,
    type: Connectors.KUBERNETES_CLUSTER,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      credential: {
        type: formData?.delegateType,
        spec: getSpecForDelegateType(formData)
      }
    }
  }
  return { connector: savedData }
}

export const buildCustomSMPayload = (formData: FormData) => {
  const savedData = {
    name: formData?.name,
    description: formData?.description,
    projectIdentifier: formData?.projectIdentifier,
    orgIdentifier: formData?.orgIdentifier,
    identifier: formData?.identifier,
    tags: formData?.tags,
    type: Connectors.CUSTOM_SECRET_MANAGER,
    spec: {
      onDelegate: formData.onDelegate,
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      host: !formData.onDelegate ? formData.executionTarget.host : undefined,
      workingDirectory: !formData.onDelegate ? formData.executionTarget.workingDirectory : undefined,
      connectorRef: !formData.onDelegate ? formData.executionTarget.connectorRef : undefined,
      timeout: formData?.timeout,
      template: {
        templateRef: formData.template.templateRef,
        versionLabel: formData.template.versionLabel,
        templateInputs: { environmentVariables: formData.templateInputs?.environmentVariables }
      }
    }
  }
  return { connector: savedData }
}

export const setupCustomSMFormData = async (connectorInfo: ConnectorInfoDTO): Promise<FormData> => {
  const connectorInfoSpec = connectorInfo?.spec

  return {
    template: connectorInfoSpec.template,
    templateInputs: connectorInfoSpec.template.templateInputs,
    timeout: connectorInfoSpec?.timeout || '',
    executionTarget: {
      host: connectorInfoSpec?.host || '',
      workingDirectory: connectorInfoSpec?.workingDirectory || '',
      connectorRef: connectorInfoSpec?.connectorRef
    },
    templateJson: {},
    onDelegate: connectorInfoSpec?.onDelegate || ''
  }
}

export const useGetHelpPanel = (refernceId: string, width: number) => {
  return useConnectorWizard({ helpPanel: { referenceId: refernceId, contentWidth: width } })
}
const getGitAuthSpec = (formData: FormData) => {
  const { authType = '' } = formData
  const oAuthAccessTokenRef = formData.oAuthAccessTokenRef || get(formData, 'spec.authentication.spec.spec.tokenRef')
  const oAuthRefreshTokenRef =
    formData.oAuthRefreshTokenRef || get(formData, 'spec.authentication.spec.spec.refreshTokenRef')
  switch (authType) {
    case GitAuthTypes.USER_PASSWORD:
      return {
        username: formData.username?.type === ValueType.TEXT ? formData.username?.value : undefined,
        usernameRef: formData.username?.type === ValueType.ENCRYPTED ? formData.username?.value : undefined,
        passwordRef: formData.password.referenceString
      }
    case GitAuthTypes.USER_TOKEN:
      return {
        username: formData.username?.type === ValueType.TEXT ? formData.username?.value : undefined,
        usernameRef: formData.username?.type === ValueType.ENCRYPTED ? formData.username?.value : undefined,
        tokenRef: formData.accessToken.referenceString
      }
    case GitAuthTypes.KERBEROS:
      return {
        kerberosKeyRef: formData.kerberosKey.referenceString
      }
    case GitAuthTypes.OAUTH:
      return {
        tokenRef: oAuthAccessTokenRef,
        ...(oAuthRefreshTokenRef && {
          refreshTokenRef: oAuthRefreshTokenRef
        })
      }
    case GitAuthTypes.GITHUB_APP:
      return {
        installationId: formData.installationId?.type === ValueType.TEXT ? formData.installationId?.value : undefined,
        installationIdRef:
          formData.installationId?.type === ValueType.ENCRYPTED ? formData.installationId?.value : undefined,
        applicationId: formData.applicationId?.type === ValueType.TEXT ? formData.applicationId?.value : undefined,
        applicationIdRef:
          formData.applicationId?.type === ValueType.ENCRYPTED ? formData.applicationId?.value : undefined,
        privateKeyRef: formData.privateKey
      }
    default:
      return {}
  }
}

const getGitApiAccessSpec = (formData: FormData): Record<string, any> => {
  const { authType = '' } = formData
  switch (authType) {
    case GitAuthTypes.OAUTH:
      return getGitAuthSpec(formData)
    case GitAuthTypes.USER_PASSWORD:
    case GitAuthTypes.USER_TOKEN:
    case GitAuthTypes.KERBEROS:
    default:
      return {}
  }
}

export const buildSpotPayload = (formData: FormData) => {
  const savedData: any = {
    name: formData.name,
    description: formData?.description,
    projectIdentifier: formData?.projectIdentifier,
    orgIdentifier: formData?.orgIdentifier,
    identifier: formData.identifier,
    tags: formData?.tags,
    type: Connectors.SPOT,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      credential: {
        type: CredTypeValues.PermanentTokenConfig,
        spec: {
          [formData.spotAccountId.type === ValueType.TEXT ? 'spotAccountId' : 'spotAccountIdRef']:
            formData.spotAccountId.value,
          apiTokenRef: formData.apiTokenRef.referenceString
        }
      }
    }
  }

  return { connector: savedData }
}

export const buildTasPayload = (formData: FormData): ConnectorRequestBody => {
  const savedData: ConnectorInfoDTO = {
    name: formData.name,
    description: formData?.description,
    projectIdentifier: formData?.projectIdentifier,
    orgIdentifier: formData?.orgIdentifier,
    identifier: formData.identifier,
    tags: formData?.tags,
    type: Connectors.TAS,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      credential: {
        type: CredTypeValues.ManualConfig,
        spec: {
          endpointUrl: formData.endpointUrl.trim(),
          [formData.username?.type === ValueType.TEXT ? 'username' : 'usernameRef']: formData.username?.value,
          passwordRef: formData.passwordRef.referenceString,
          refreshTokenRef: formData?.refreshTokenRef?.referenceString
        }
      }
    } as TasConnector
  }

  return { connector: savedData }
}

const getGitHubAppAuthenticationPayload = (formData: FormData) => {
  return {
    installationId: formData.installationId?.type === ValueType.TEXT ? formData.installationId?.value : undefined,
    installationIdRef:
      formData.installationId?.type === ValueType.ENCRYPTED ? formData.installationId?.value : undefined,
    applicationId: formData.applicationId?.type === ValueType.TEXT ? formData.applicationId?.value : undefined,
    applicationIdRef: formData.applicationId?.type === ValueType.ENCRYPTED ? formData.applicationId?.value : undefined,
    privateKeyRef: formData.privateKey
  }
}

export const buildGithubPayload = (formData: FormData) => {
  const savedData: any = {
    name: formData.name,
    description: formData?.description,
    projectIdentifier: formData?.projectIdentifier,
    orgIdentifier: formData?.orgIdentifier,
    identifier: formData.identifier,
    tags: formData?.tags,
    type: Connectors.GITHUB,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      type: formData.urlType,
      url: formData.url,
      ...(formData.validationRepo ? { validationRepo: formData.validationRepo } : {}),
      authentication: {
        type: formData.connectionType,
        spec:
          formData.connectionType === GitConnectionType.SSH
            ? { sshKeyRef: formData.sshKey.referenceString }
            : {
                type: formData.authType,
                spec: getGitAuthSpec(formData)
              }
      },
      apiAccess: {
        type: formData.apiAuthType,
        spec: {}
      }
    }
  }

  if (formData.enableAPIAccess) {
    savedData.spec.apiAccess.spec =
      formData.apiAuthType === GitAPIAuthTypes.OAUTH
        ? getGitApiAccessSpec(formData)
        : formData.apiAuthType === GitAPIAuthTypes.TOKEN
        ? {
            tokenRef: formData.apiAccessToken.referenceString
          }
        : getGitHubAppAuthenticationPayload(formData)
  } else {
    delete savedData.spec.apiAccess
  }
  if (formData.connectionType === GitConnectionType.HTTP) {
    savedData.spec.proxy = formData.proxy
  }
  return { connector: savedData }
}

export const buildGitlabPayload = (formData: FormData) => {
  const savedData: any = {
    name: formData.name,
    description: formData?.description,
    projectIdentifier: formData?.projectIdentifier,
    orgIdentifier: formData?.orgIdentifier,
    identifier: formData.identifier,
    tags: formData?.tags,
    type: Connectors.GITLAB,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      type: formData.urlType,
      url: formData.url,
      ...(formData.validationRepo ? { validationRepo: formData.validationRepo } : {}),
      authentication: {
        type: formData.connectionType,
        spec:
          formData.connectionType === GitConnectionType.SSH
            ? { sshKeyRef: formData.sshKey?.referenceString }
            : {
                type: formData.authType,
                spec: getGitAuthSpec(formData)
              }
      },
      apiAccess: {
        type: formData.apiAuthType,
        spec: {}
      }
    }
  }

  if (formData.enableAPIAccess) {
    savedData.spec.apiAccess.spec =
      formData.apiAuthType === GitAPIAuthTypes.OAUTH
        ? getGitApiAccessSpec(formData)
        : formData.apiAuthType === GitAPIAuthTypes.TOKEN
        ? {
            tokenRef: formData.apiAccessToken?.referenceString,
            apiUrl: formData.apiUrl
          }
        : {
            installationId: formData.installationId,
            applicationId: formData.applicationId,
            privateKeyRef: formData.privateKey.referenceString
          }
  } else {
    delete savedData.spec.apiAccess
  }

  if (formData.connectionType === GitConnectionType.HTTP) {
    savedData.spec.proxy = formData.proxy
  }
  return { connector: savedData }
}

export const buildBitbucketPayload = (formData: FormData) => {
  const savedData: any = {
    name: formData.name,
    description: formData?.description,
    projectIdentifier: formData?.projectIdentifier,
    orgIdentifier: formData?.orgIdentifier,
    identifier: formData.identifier,
    tags: formData?.tags,
    type: Connectors.BITBUCKET,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      type: formData.urlType,
      url: formData.url,
      ...(formData.validationRepo ? { validationRepo: formData.validationRepo } : {}),
      authentication: {
        type: formData.connectionType,
        spec:
          formData.connectionType === GitConnectionType.SSH
            ? { sshKeyRef: formData.sshKey.referenceString }
            : {
                type: formData.authType,
                spec: getGitAuthSpec(formData)
              }
      },
      apiAccess: { type: formData.apiAuthType, spec: {} }
    }
  }

  if (formData.enableAPIAccess) {
    savedData.spec.apiAccess.spec = {
      username: formData.apiAccessUsername.type === ValueType.TEXT ? formData.apiAccessUsername.value : undefined,
      usernameRef:
        formData.apiAccessUsername.type === ValueType.ENCRYPTED ? formData.apiAccessUsername.value : undefined,
      tokenRef: formData.accessToken.referenceString
    }
  } else {
    delete savedData.spec.apiAccess
  }

  if (formData.connectionType === GitConnectionType.HTTP) {
    savedData.spec.proxy = formData.proxy
  }
  return { connector: savedData }
}

export const buildAzureRepoPayload = (formData: FormData) => {
  const savedData: any = {
    name: formData.name,
    description: formData?.description,
    projectIdentifier: formData?.projectIdentifier,
    orgIdentifier: formData?.orgIdentifier,
    identifier: formData.identifier,
    tags: formData?.tags,
    type: Connectors.AZURE_REPO,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      type: formData.urlType,
      url: formData.url,
      ...(formData.validationRepo ? { validationRepo: formData.validationRepo } : {}),
      authentication: {
        type: formData.connectionType,
        spec:
          formData.connectionType === GitConnectionType.SSH
            ? { sshKeyRef: formData.sshKey.referenceString }
            : {
                type: formData.authType,
                spec: getGitAuthSpec(formData)
              }
      },
      apiAccess: { type: formData.apiAuthType, spec: {} }
    }
  }

  if (formData.enableAPIAccess) {
    savedData.spec.apiAccess.spec = {
      tokenRef: formData.apiAccessToken.referenceString
    }
  } else {
    delete savedData.spec.apiAccess
  }

  return { connector: savedData }
}

export const buildTerraformCloudPayload = (formData: FormData): ConnectorRequestBody => {
  const savedData: ConnectorInfoDTO = {
    name: formData.name,
    description: formData?.description,
    projectIdentifier: formData?.projectIdentifier,
    orgIdentifier: formData?.orgIdentifier,
    identifier: formData.identifier,
    tags: formData?.tags,
    type: Connectors.TERRAFORM_CLOUD,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      terraformCloudUrl: formData.terraformCloudUrl.trim(),
      credential: {
        type: AuthTypes.API_TOKEN,
        spec: {
          apiToken: formData.apiToken.referenceString
        }
      }
    } as TerraformCloudConnector
  }

  return { connector: savedData }
}

export const setupGitFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const formData = {
    sshKey: await setSecretField(
      connectorInfo?.spec?.sshKeyRef || connectorInfo?.spec?.spec?.sshKeyRef, // for git, sshKeyRef looks to be nested in spec twice
      scopeQueryParams
    ),
    username:
      connectorInfo?.spec?.spec?.username || connectorInfo?.spec?.spec?.usernameRef
        ? {
            value: connectorInfo?.spec?.spec?.username || connectorInfo?.spec?.spec?.usernameRef,
            type: connectorInfo?.spec?.spec?.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    password: await setSecretField(connectorInfo?.spec?.spec?.passwordRef, scopeQueryParams),
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate)
  }

  return formData
}

export const setupGithubFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const authData = connectorInfo?.spec?.authentication
  const installationId = authData?.spec?.spec?.installationId || connectorInfo?.spec?.apiAccess?.spec?.installationId
  const installationIdRef =
    authData?.spec?.spec?.installationIdRef || connectorInfo?.spec?.apiAccess?.spec?.installationIdRef
  const applicationId = authData?.spec?.spec?.applicationId || connectorInfo?.spec?.apiAccess?.spec?.applicationId
  const applicationIdRef =
    authData?.spec?.spec?.applicationIdRef || connectorInfo?.spec?.apiAccess?.spec?.applicationIdRef
  return {
    sshKey: await setSecretField(authData?.spec?.sshKeyRef, scopeQueryParams),
    authType: authData?.spec?.type,
    username:
      authData?.spec?.spec?.username || authData?.spec?.spec?.usernameRef
        ? {
            value: authData?.spec?.spec?.username || authData?.spec?.spec?.usernameRef,
            type: authData?.spec?.spec?.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    password: await setSecretField(authData?.spec?.spec?.passwordRef, scopeQueryParams),
    accessToken: await setSecretField(
      authData?.spec?.spec?.tokenRef || connectorInfo?.spec?.apiAccess?.spec?.tokenRef,
      scopeQueryParams
    ),
    apiAccessToken: await setSecretField(connectorInfo?.spec?.apiAccess?.spec?.tokenRef, scopeQueryParams),
    kerberosKey: await setSecretField(authData?.spec?.spec?.kerberosKeyRef, scopeQueryParams),
    enableAPIAccess: !!connectorInfo?.spec?.apiAccess,
    apiAuthType: connectorInfo?.spec?.apiAccess?.type,
    installationId:
      installationId || installationIdRef
        ? {
            value: installationId || installationIdRef,
            type: installationIdRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,
    applicationId:
      applicationId || applicationIdRef
        ? {
            value: applicationId || applicationIdRef,
            type: applicationIdRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    privateKey: authData?.spec?.spec?.privateKeyRef || connectorInfo?.spec?.apiAccess?.spec?.privateKeyRef,
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate)
  }
}

export const setupGitlabFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const authData = connectorInfo?.spec?.authentication
  const installationId = connectorInfo?.spec?.apiAccess?.spec?.installationId
  const installationIdRef = connectorInfo?.spec?.apiAccess?.spec?.installationIdRef
  const applicationId = connectorInfo?.spec?.apiAccess?.spec?.applicationId
  const applicationIdRef = connectorInfo?.spec?.apiAccess?.spec?.applicationIdRef
  const { username, usernameRef } = authData?.spec?.spec || {}
  return {
    sshKey: await setSecretField(authData?.spec?.sshKeyRef, scopeQueryParams),
    authType: authData?.spec?.type,
    username:
      username || usernameRef
        ? {
            value: username || usernameRef,
            type: usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    password: await setSecretField(authData?.spec?.spec?.passwordRef, scopeQueryParams),
    accessToken: await setSecretField(
      authData?.spec?.spec?.tokenRef || connectorInfo?.spec?.apiAccess?.spec?.tokenRef,
      scopeQueryParams
    ),
    apiAccessToken: await setSecretField(connectorInfo?.spec?.apiAccess?.spec?.tokenRef, scopeQueryParams),
    kerberosKey: await setSecretField(authData?.spec?.spec?.kerberosKeyRef, scopeQueryParams),
    enableAPIAccess: !!connectorInfo?.spec?.apiAccess,
    apiAuthType: connectorInfo?.spec?.apiAccess?.type,
    installationId:
      installationId || installationIdRef
        ? {
            value: installationId || installationIdRef,
            type: installationIdRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,
    applicationId:
      applicationId || applicationIdRef
        ? {
            value: applicationId || applicationIdRef,
            type: applicationIdRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    privateKey: connectorInfo?.spec?.apiAccess?.spec?.privateKeyRef,
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate),
    apiUrl: connectorInfo?.spec?.apiAccess?.spec?.apiUrl || ''
  }
}

export const setupBitbucketFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const authData = connectorInfo?.spec?.authentication
  const formData = {
    sshKey: await setSecretField(authData?.spec?.sshKeyRef, scopeQueryParams),
    authType: authData?.spec?.type,
    username:
      authData?.spec?.spec?.username || authData?.spec?.spec?.usernameRef
        ? {
            value: authData?.spec?.spec?.username || authData?.spec?.spec?.usernameRef,
            type: authData?.spec?.spec?.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,
    password: await setSecretField(authData?.spec?.spec?.passwordRef, scopeQueryParams),
    enableAPIAccess: !!connectorInfo?.spec?.apiAccess,
    apiAccessUsername:
      connectorInfo?.spec?.apiAccess?.spec?.username || connectorInfo?.spec?.apiAccess?.spec?.usernameRef
        ? {
            value: connectorInfo?.spec?.apiAccess?.spec?.username || connectorInfo?.spec?.apiAccess?.spec?.usernameRef,
            type: connectorInfo?.spec?.apiAccess?.spec?.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    apiAuthType: connectorInfo?.spec?.apiAccess?.type,
    accessToken: await setSecretField(connectorInfo?.spec?.apiAccess?.spec?.tokenRef, scopeQueryParams),
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate)
  }

  return formData
}

export const setupAzureRepoFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const authData = connectorInfo?.spec?.authentication
  const formData = {
    sshKey: await setSecretField(authData?.spec?.sshKeyRef, scopeQueryParams),
    authType: authData?.spec?.type,
    username:
      authData?.spec?.spec?.username || authData?.spec?.spec?.usernameRef
        ? {
            value: authData?.spec?.spec?.username || authData?.spec?.spec?.usernameRef,
            type: authData?.spec?.spec?.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,
    password: await setSecretField(authData?.spec?.spec?.passwordRef, scopeQueryParams),
    accessToken: await setSecretField(
      authData?.spec?.spec?.tokenRef || connectorInfo?.spec?.apiAccess?.spec?.tokenRef,
      scopeQueryParams
    ),
    enableAPIAccess: !!connectorInfo?.spec?.apiAccess,
    apiAuthType: connectorInfo?.spec?.apiAccess?.type,
    apiAccessToken: await setSecretField(connectorInfo?.spec?.apiAccess?.spec?.tokenRef, scopeQueryParams),
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate)
  }
  return formData
}

export const getK8AuthFormFields = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }
  const authdata = connectorInfo.spec.credential?.spec?.auth?.spec
  return {
    username:
      authdata?.username || authdata?.usernameRef
        ? {
            value: authdata.username || authdata.usernameRef,
            type: authdata.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,
    password: await setSecretField(authdata?.passwordRef, scopeQueryParams),
    serviceAccountToken: await setSecretField(authdata?.serviceAccountTokenRef, scopeQueryParams),
    oidcIssuerUrl: authdata?.oidcIssuerUrl,
    oidcUsername:
      authdata?.oidcUsername || authdata?.oidcUsernameRef
        ? {
            value: authdata.oidcUsername || authdata.oidcUsernameRef,
            type: authdata.oidcUsernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,
    oidcPassword: await setSecretField(authdata?.oidcPasswordRef, scopeQueryParams),
    oidcCleintId: await setSecretField(authdata?.oidcClientIdRef, scopeQueryParams),
    oidcCleintSecret: await setSecretField(authdata?.oidcSecretRef, scopeQueryParams),
    oidcScopes: authdata?.oidcScopes,
    clientKey: await setSecretField(authdata?.clientKeyRef, scopeQueryParams),
    clientKeyCertificate: await setSecretField(authdata?.clientCertRef, scopeQueryParams),
    clientKeyPassphrase: await setSecretField(authdata?.clientKeyPassphraseRef, scopeQueryParams),
    clientKeyCACertificate: await setSecretField(authdata?.caCertRef, scopeQueryParams),
    clientKeyAlgo: authdata?.clientKeyAlgo
  }
}

export const setupKubFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const authData = await getK8AuthFormFields(connectorInfo, accountId)
  const formData = {
    delegateType: connectorInfo.spec.credential.type,
    delegateName: connectorInfo.spec.credential?.spec?.delegateName || '',
    masterUrl: connectorInfo.spec.credential?.spec?.masterUrl || '',
    authType: connectorInfo.spec.credential?.spec?.auth?.type || '',
    skipDefaultValidation: false,

    ...authData
  }

  return formData
}

export const setupSpotFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo?.projectIdentifier,
    orgIdentifier: connectorInfo?.orgIdentifier
  }

  const authdata = connectorInfo?.spec?.credential?.spec
  const formData = {
    spotAccountId:
      authdata?.spotAccountId || authdata?.spotAccountIdRef
        ? {
            value: authdata.spotAccountId || authdata.spotAccountIdRef,
            type: authdata.spotAccountIdRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,
    apiTokenRef: await setSecretField(authdata?.apiTokenRef, scopeQueryParams),
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate),
    delegate: connectorInfo?.spec?.delegateSelectors || undefined
  }

  return formData
}

export const setupGCPFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const formData = {
    delegateType: connectorInfo.spec.credential.type,
    password: await setSecretField(connectorInfo.spec.credential?.spec?.secretKeyRef, scopeQueryParams),
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate),
    workloadPoolId: connectorInfo.spec.credential?.spec?.workloadPoolId,
    providerId: connectorInfo.spec.credential?.spec?.providerId,
    gcpProjectId: connectorInfo.spec.credential?.spec?.gcpProjectId,
    serviceAccountEmail: connectorInfo.spec.credential?.spec?.serviceAccountEmail
  }

  return formData
}

export const setupTasFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo?.projectIdentifier,
    orgIdentifier: connectorInfo?.orgIdentifier
  }

  const authdata = connectorInfo?.spec?.credential?.spec
  const formData = {
    username:
      authdata?.username || authdata?.usernameRef
        ? {
            value: authdata.username || authdata.usernameRef,
            type: authdata.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,
    passwordRef: await setSecretField(authdata?.passwordRef, scopeQueryParams),
    refreshTokenRef: await setSecretField(authdata?.refreshTokenRef, scopeQueryParams),
    endpointUrl: authdata.endpointUrl || '',
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate),
    delegate: connectorInfo?.spec?.delegateSelectors
  }

  return formData
}

export const setupAWSFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const formData = {
    delegateType: connectorInfo.spec.credential.type,
    accessKey:
      connectorInfo.spec.credential.spec?.accessKey || connectorInfo.spec.credential.spec?.accessKeyRef
        ? {
            value: connectorInfo.spec.credential.spec.accessKey || connectorInfo.spec.credential.spec.accessKeyRef,
            type: connectorInfo.spec.credential.spec.accessKeyRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    secretKeyRef: await setSecretField(connectorInfo.spec.credential.spec?.secretKeyRef, scopeQueryParams),
    region: connectorInfo.spec.credential.region,
    crossAccountAccess: !!connectorInfo.spec.credential?.crossAccountAccess,
    crossAccountRoleArn: connectorInfo.spec.credential.crossAccountAccess?.crossAccountRoleArn,
    externalId: connectorInfo.spec.credential.crossAccountAccess?.externalId,
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate)
  }

  return formData
}

export const setupBackOffStrategyFormData = (connectorInfo: ConnectorInfoDTO): AWSBackOffStrategyValues => {
  const backOffStategyType = connectorInfo.spec.awsSdkClientBackOffStrategyOverride?.type as BackOffStrategy

  let specObj: AWSBackOffStrategyValues['spec'] = {
    fixedBackoff: connectorInfo.spec.awsSdkClientBackOffStrategyOverride?.spec?.fixedBackoff,
    retryCount: connectorInfo.spec.awsSdkClientBackOffStrategyOverride?.spec?.retryCount
  }

  const formData: AWSBackOffStrategyValues = {
    type: backOffStategyType,
    spec: specObj
  }

  if (
    backOffStategyType === BackOffStrategy.EqualJitterBackoffStrategy ||
    backOffStategyType === BackOffStrategy.FullJitterBackoffStrategy
  ) {
    specObj = {
      baseDelay: connectorInfo.spec.awsSdkClientBackOffStrategyOverride?.spec?.baseDelay,
      maxBackoffTime: connectorInfo.spec.awsSdkClientBackOffStrategyOverride?.spec?.maxBackoffTime,
      retryCount: connectorInfo.spec.awsSdkClientBackOffStrategyOverride?.spec?.retryCount
    }
  }

  formData.spec = specObj

  return formData
}

export const setupDockerFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const formData = {
    dockerRegistryUrl: connectorInfo.spec.dockerRegistryUrl,
    authType: connectorInfo.spec.auth.type,
    dockerProviderType: connectorInfo.spec.providerType,
    username:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD &&
      (connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef)
        ? {
            value: connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef,
            type: connectorInfo.spec.auth.spec.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    password:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD
        ? await setSecretField(connectorInfo.spec.auth.spec.passwordRef, scopeQueryParams)
        : undefined,
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate)
  }
  return formData
}

export const setupJenkinsFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const formData = {
    jenkinsUrl: connectorInfo.spec.jenkinsUrl,
    authType: connectorInfo.spec.auth.type,
    username:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD &&
      (connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef)
        ? {
            value: connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef,
            type: connectorInfo.spec.auth.spec.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    password:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD
        ? await setSecretField(connectorInfo.spec.auth.spec.passwordRef, scopeQueryParams)
        : undefined,
    bearerToken:
      connectorInfo.spec.auth.type === AuthTypes.BEARER_TOKEN ? connectorInfo.spec.auth.spec.tokenRef : undefined
  }
  return formData
}

export const setupBambooFormData = async (
  connectorInfo: ConnectorInfoDTO,
  accountId: string
): Promise<BambooFormInterface> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const formData = {
    bambooUrl: connectorInfo.spec.bambooUrl,
    username:
      connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef
        ? {
            value: connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef,
            type: connectorInfo.spec.auth.spec.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    password:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD
        ? await setSecretField(connectorInfo.spec.auth.spec.passwordRef, scopeQueryParams)
        : undefined
  }
  return formData
}
export const setupAzureArtifactsFormData = async (
  connectorInfo: ConnectorInfoDTO,
  accountId: string
): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }
  const formData = {
    azureArtifactsUrl: connectorInfo.spec.azureArtifactsUrl,
    authType: connectorInfo.spec.auth.spec.type,
    tokenRef: await setSecretField(connectorInfo.spec.auth.spec.spec.tokenRef, scopeQueryParams)
  }
  return formData
}

export const setupHelmFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const formData = {
    helmRepoUrl: connectorInfo.spec.helmRepoUrl,
    authType: connectorInfo.spec.auth.type,
    username:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD &&
      (connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef)
        ? {
            value: connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef,
            type: connectorInfo.spec.auth.spec.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    password:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD
        ? await setSecretField(connectorInfo.spec.auth.spec.passwordRef, scopeQueryParams)
        : undefined
  }
  return formData
}

export const setupNexusFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const formData = {
    nexusServerUrl: connectorInfo.spec.nexusServerUrl,
    nexusVersion: connectorInfo.spec.version,
    authType: connectorInfo.spec.auth.type,
    username:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD &&
      (connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef)
        ? {
            value: connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef,
            type: connectorInfo.spec.auth.spec.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    password:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD
        ? await setSecretField(connectorInfo.spec.auth.spec.passwordRef, scopeQueryParams)
        : undefined
  }

  return formData
}

export const setupArtifactoryFormData = async (
  connectorInfo: ConnectorInfoDTO,
  accountId: string
): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const formData = {
    artifactoryServerUrl: connectorInfo.spec.artifactoryServerUrl,
    authType: connectorInfo.spec.auth.type,
    username:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD &&
      (connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef)
        ? {
            value: connectorInfo.spec.auth.spec.username || connectorInfo.spec.auth.spec.usernameRef,
            type: connectorInfo.spec.auth.spec.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    password:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD
        ? await setSecretField(connectorInfo.spec.auth.spec.passwordRef, scopeQueryParams)
        : undefined,
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate)
  }

  return formData
}

export const setupAzureFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const connectorInfoSpec = connectorInfo?.spec
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const delegateInCluster = connectorInfoSpec.credential.type === DelegateTypes.DELEGATE_IN_CLUSTER
  const authType = connectorInfoSpec.credential.spec.auth.type
  const secretKey =
    !delegateInCluster &&
    (await setSecretField(
      authType === AzureSecretKeyType.SECRET
        ? connectorInfoSpec.credential.spec.auth.spec.secretRef
        : connectorInfoSpec.credential.spec.auth.spec.certificateRef,
      scopeQueryParams
    ))

  return {
    azureEnvironmentType: connectorInfoSpec.azureEnvironmentType,
    delegateType: connectorInfoSpec.credential.type,
    applicationId: connectorInfoSpec.credential.spec.applicationId,
    managedIdentity: delegateInCluster && authType,
    tenantId: connectorInfoSpec.credential.spec.tenantId,
    secretType: !delegateInCluster && authType,
    secretText: !delegateInCluster && authType === AzureSecretKeyType.SECRET ? secretKey : undefined,
    secretFile: !delegateInCluster && authType === AzureSecretKeyType.CERT ? secretKey : undefined,
    clientId:
      delegateInCluster && authType === AzureManagedIdentityTypes.USER_MANAGED
        ? connectorInfoSpec.credential.spec.auth.spec.clientId
        : undefined,
    connectivityMode: getConnectivityMode(connectorInfo?.spec?.executeOnDelegate)
  }
}
export const setupGCPSecretManagerFormData = async (
  connectorInfo: ConnectorInfoDTO,
  accountId: string
): Promise<FormData> => {
  const connectorInfoSpec = connectorInfo?.spec
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }
  const credentials = await setSecretField(connectorInfoSpec?.credentialsRef, scopeQueryParams)
  let delegateType = undefined
  if (credentials) {
    delegateType = DelegateTypes.DELEGATE_OUT_CLUSTER
  }
  if (connectorInfoSpec.assumeCredentialsOnDelegate) {
    delegateType = DelegateTypes.DELEGATE_IN_CLUSTER
  }
  return {
    credentialsRef: credentials || undefined,
    delegate: connectorInfoSpec?.delegateSelectors || undefined,
    default: connectorInfoSpec?.default || false,
    assumeCredentialsOnDelegate: !!connectorInfoSpec.assumeCredentialsOnDelegate,
    delegateType
  }
}

export const setupAwsKmsFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const connectorInfoSpec = connectorInfo?.spec
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }
  const accessKey = await setSecretField(connectorInfoSpec?.credential?.spec?.accessKey, scopeQueryParams)
  const secretKey = await setSecretField(connectorInfoSpec?.credential?.spec?.secretKey, scopeQueryParams)
  const awsArn = await setSecretField(connectorInfoSpec?.kmsArn, scopeQueryParams)
  return {
    accessKey: accessKey || undefined,
    secretKey: secretKey || undefined,
    awsArn: awsArn || undefined,
    region: connectorInfoSpec?.region || undefined,
    credType: connectorInfoSpec?.credential?.type,
    delegate: connectorInfoSpec?.credential?.spec?.delegateSelectors || undefined,
    roleArn: connectorInfoSpec?.credential?.spec?.roleArn || undefined,
    externalName: connectorInfoSpec?.credential?.spec?.externalName || undefined,
    assumeStsRoleDuration: connectorInfoSpec?.credential?.spec?.assumeStsRoleDuration || undefined,
    default: (connectorInfoSpec as AwsKmsConnectorDTO)?.default || false
  }
}
export const setupAwsSecretManagerFormData = async (
  connectorInfo: ConnectorInfoDTO,
  accountId: string
): Promise<FormData> => {
  const connectorInfoSpec = connectorInfo?.spec
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }
  const accessKey = await setSecretField(connectorInfoSpec?.credential?.spec?.accessKey, scopeQueryParams)
  const secretKey = await setSecretField(connectorInfoSpec?.credential?.spec?.secretKey, scopeQueryParams)

  return {
    accessKey: accessKey || undefined,
    secretKey: secretKey || undefined,
    secretNamePrefix: connectorInfoSpec?.secretNamePrefix,
    region: connectorInfoSpec?.region || undefined,
    credType: connectorInfoSpec?.credential?.type,
    delegate: connectorInfoSpec?.credential?.spec?.delegateSelectors || undefined,
    roleArn: connectorInfoSpec?.credential?.spec?.roleArn || undefined,
    externalId: connectorInfoSpec?.credential?.spec?.externalId || undefined,
    assumeStsRoleDuration: connectorInfoSpec?.credential?.spec?.assumeStsRoleDuration || undefined,
    default: (connectorInfoSpec as AwsKmsConnectorDTO)?.default || false
  }
}

export const setupGcpKmsFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const connectorInfoSpec = connectorInfo?.spec as GcpKmsConnectorDTO
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }
  const credentials = await setSecretField(connectorInfoSpec.credentials, scopeQueryParams)

  return {
    projectId: connectorInfoSpec.projectId,
    region: connectorInfoSpec.region,
    keyRing: connectorInfoSpec.keyRing,
    keyName: connectorInfoSpec.keyName,
    credentials,
    default: connectorInfoSpec.default
  }
}

export const setupTerraformCloudFormData = async (
  connectorInfo: ConnectorInfoDTO,
  accountId: string
): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo?.projectIdentifier,
    orgIdentifier: connectorInfo?.orgIdentifier
  }
  const data = connectorInfo?.spec
  const formData = {
    terraformCloudUrl: data?.terraformCloudUrl,
    type: data?.credential?.type,
    apiToken: await setSecretField(data?.credential?.spec?.apiToken, scopeQueryParams),
    connectivityMode: getConnectivityMode(data?.executeOnDelegate),
    delegate: data?.delegateSelectors
  }

  return formData
}

export const buildAWSPayload = (formData: FormData) => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.AWS,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      credential: {
        type: formData.delegateType,
        ...(formData.region && { region: formData.region }),
        spec:
          formData.delegateType === DelegateTypes.DELEGATE_OUT_CLUSTER
            ? {
                accessKey: formData.accessKey.type === ValueType.TEXT ? formData.accessKey.value : undefined,
                accessKeyRef: formData.accessKey.type === ValueType.ENCRYPTED ? formData.accessKey.value : undefined,

                secretKeyRef: formData.secretKeyRef.referenceString
              }
            : null,
        crossAccountAccess: formData.crossAccountAccess
          ? {
              crossAccountRoleArn: formData.crossAccountRoleArn,
              externalId: formData.externalId?.length ? formData.externalId : null
            }
          : null
      },
      awsSdkClientBackOffStrategyOverride: formData.awsSdkClientBackOffStrategyOverride?.type
        ? formData.awsSdkClientBackOffStrategyOverride
        : undefined,
      proxy: formData?.proxy
    }
  }

  return { connector: savedData }
}

export const buildAWSKmsSMPayload = (formData: FormData): ConnectorRequestBody => {
  let specData = {}

  switch (formData?.credType) {
    case CredTypeValues.ManualConfig:
      specData = {
        accessKey: formData?.accessKey?.referenceString,
        secretKey: formData?.secretKey?.referenceString
      }
      break
    case CredTypeValues.AssumeIAMRole:
      specData = { delegateSelectors: formData.delegateSelectors }
      break
    case CredTypeValues.AssumeRoleSTS:
      specData = {
        delegateSelectors: formData.delegateSelectors,
        roleArn: formData.roleArn?.trim(),
        externalName: formData.externalName?.trim() || undefined,
        assumeStsRoleDuration: formData.assumeStsRoleDuration
          ? typeof formData.assumeStsRoleDuration === 'string'
            ? parseInt(formData.assumeStsRoleDuration.trim())
            : formData.assumeStsRoleDuration
          : undefined
      }
  }

  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.AWS_KMS,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      credential: {
        type: formData?.credType,
        spec: specData
      },
      kmsArn: formData?.awsArn?.referenceString,
      region: formData?.region,
      default: formData.default
    }
  }
  return { connector: savedData }
}

export const buildGcpSMPayload = (formData: FormData): ConnectorRequestBody => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.GcpSecretManager,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      credentialsRef: formData?.credentialsRef?.referenceString,
      assumeCredentialsOnDelegate: formData?.assumeCredentialsOnDelegate,
      default: formData.default
    }
  }
  return { connector: savedData }
}

interface BuildVaultPayloadReturnType {
  connector: Omit<ConnectorInfoDTO, 'spec'> & {
    spec: VaultConnectorDTO
  }
}

export const buildVaultPayload = (formData: FormData): BuildVaultPayloadReturnType => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.VAULT,
    spec: {
      ...pick(formData, [
        'basePath',
        'vaultUrl',
        'namespace',
        'readOnly',
        'default',
        'delegateSelectors',
        'xvaultAwsIamServerId',
        'vaultAwsIamRole',
        'awsRegion'
      ]),
      xvaultAwsIamServerId:
        formData.accessType === HashiCorpVaultAccessTypes.AWS_IAM
          ? formData.xvaultAwsIamServerId?.referenceString
          : undefined,
      useAwsIam: formData.accessType === HashiCorpVaultAccessTypes.AWS_IAM,
      renewalIntervalMinutes:
        formData.accessType !== HashiCorpVaultAccessTypes.VAULT_AGENT &&
        formData.accessType !== HashiCorpVaultAccessTypes.AWS_IAM
          ? formData.renewalIntervalMinutes
          : 10,
      authToken:
        formData.accessType === HashiCorpVaultAccessTypes.TOKEN ? formData.authToken?.referenceString : undefined,
      appRoleId: formData.accessType === HashiCorpVaultAccessTypes.APP_ROLE ? formData.appRoleId : undefined,
      enableCache: formData.accessType === HashiCorpVaultAccessTypes.APP_ROLE ? formData.enableCache : undefined,
      secretId:
        formData.accessType === HashiCorpVaultAccessTypes.APP_ROLE ? formData.secretId?.referenceString : undefined,
      useVaultAgent: formData.accessType === HashiCorpVaultAccessTypes.VAULT_AGENT,
      sinkPath: formData.accessType === HashiCorpVaultAccessTypes.VAULT_AGENT ? formData.sinkPath : undefined,
      secretEngineManuallyConfigured: formData.engineType === 'manual',
      secretEngineName:
        formData.engineType === 'manual' ? formData.secretEngineName : formData.secretEngine?.split('@@@')[0],
      secretEngineVersion:
        formData.engineType === 'manual' ? formData.secretEngineVersion : formData.secretEngine?.split('@@@')[1],
      k8sAuthEndpoint:
        formData.accessType === HashiCorpVaultAccessTypes.K8s_AUTH ? formData.k8sAuthEndpoint : undefined,
      vaultK8sAuthRole:
        formData.accessType === HashiCorpVaultAccessTypes.K8s_AUTH ? formData?.vaultK8sAuthRole : undefined,
      serviceAccountTokenPath:
        formData.accessType === HashiCorpVaultAccessTypes.K8s_AUTH ? formData?.serviceAccountTokenPath : undefined,
      useK8sAuth: formData.accessType === HashiCorpVaultAccessTypes.K8s_AUTH
    }
  }

  return { connector: savedData }
}

export const buildAWSCodeCommitPayload = (formData: FormData) => {
  const connector = {
    name: formData.name,
    identifier: formData.identifier,
    description: formData.description,
    tags: formData.tags,
    orgIdentifier: formData.orgIdentifier,
    projectIdentifier: formData.projectIdentifier,
    type: Connectors.AWS_CODECOMMIT,
    spec: {
      type: formData.urlType,
      url: formData.url,
      authentication: {
        type: 'HTTPS',
        spec: {
          type: 'AWSCredentials',
          spec: {
            ...(formData.accessKey.type === ValueType.ENCRYPTED
              ? {
                  accessKeyRef: formData.accessKey.value
                }
              : {
                  accessKey: formData.accessKey.value
                }),
            secretKeyRef: formData.secretKey?.referenceString
          }
        }
      }
    }
  }
  return { connector }
}

export const buildDockerPayload = (formData: FormData) => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.DOCKER,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      dockerRegistryUrl: formData.dockerRegistryUrl.trim(),
      providerType: formData.dockerProviderType,
      auth:
        formData.authType === AuthTypes.USER_PASSWORD
          ? {
              type: formData.authType,
              spec: {
                username: formData.username?.type === ValueType.TEXT ? formData.username?.value : undefined,
                usernameRef: formData.username?.type === ValueType.ENCRYPTED ? formData.username?.value : undefined,
                passwordRef: formData.password.referenceString
              }
            }
          : {
              type: formData.authType
            },
      proxy: formData?.proxy
    }
  }
  return { connector: savedData }
}

export const buildJenkinsPayload = (formData: FormData) => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.JENKINS,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      jenkinsUrl: formData.jenkinsUrl.trim(),
      auth:
        formData.authType === AuthTypes.USER_PASSWORD
          ? {
              type: formData.authType,
              spec: {
                username: formData.username?.type === ValueType.TEXT ? formData.username?.value : undefined,
                usernameRef: formData.username?.type === ValueType.ENCRYPTED ? formData.username?.value : undefined,
                passwordRef: formData.password.referenceString
              }
            }
          : {
              type: formData.authType,
              spec: {
                tokenRef: formData.bearerToken.referenceString
              }
            }
    }
  }
  return { connector: savedData }
}

export const buildBambooPayload = (formData: FormData) => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.Bamboo,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      bambooUrl: formData.bambooUrl.trim(),
      auth: {
        type: 'UsernamePassword',
        spec: {
          username: formData.username.type === ValueType.TEXT ? formData.username.value : undefined,
          usernameRef: formData.username.type === ValueType.ENCRYPTED ? formData.username.value : undefined,
          passwordRef: formData.password.referenceString
        }
      }
    }
  }
  return { connector: savedData }
}

export const buildAzureArtifactsPayload = (formData: FormData) => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.AZURE_ARTIFACTS,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      azureArtifactsUrl: formData.azureArtifactsUrl.trim(),
      auth: {
        spec: {
          type: 'PersonalAccessToken',
          spec: {
            tokenRef: formData.tokenRef.referenceString
          }
        }
      }
    }
  }
  return { connector: savedData }
}

export const buildJiraPayload = (formData: FormData) => {
  const savedData = {
    ...pick(formData, ['name', 'identifier', 'orgIdentifier', 'projectIdentifier', 'description', 'tags']),
    type: Connectors.Jira,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      jiraUrl: formData.jiraUrl,

      auth: {
        type: formData.authType,
        spec: {
          username: formData?.username?.type === ValueType.TEXT ? formData?.username?.value : undefined,
          usernameRef: formData?.username?.type === ValueType.ENCRYPTED ? formData?.username?.value : undefined,
          passwordRef: formData?.passwordRef?.referenceString,
          patRef: formData?.patRef?.referenceString
        }
      }
    }
  }
  if (formData.authType === AuthTypes.USER_PASSWORD) {
    delete savedData.spec.auth.spec.patRef
  } else {
    delete savedData.spec.auth.spec.username
    delete savedData.spec.auth.spec.usernameRef
    delete savedData.spec.auth.spec.passwordRef
  }
  return { connector: savedData }
}

export const setupJiraFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }

  const formData = {
    jiraUrl: connectorInfo.spec.jiraUrl,
    authType: connectorInfo.spec.auth.type,

    username:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD &&
      (connectorInfo.spec.auth.spec?.username || connectorInfo.spec.auth.spec?.usernameRef)
        ? {
            value: connectorInfo.spec.auth.spec?.username || connectorInfo.spec.auth.spec?.usernameRef,
            type: connectorInfo.spec.auth.spec?.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,

    passwordRef:
      connectorInfo.spec.auth.type === AuthTypes.USER_PASSWORD
        ? await setSecretField(connectorInfo.spec.auth.spec?.passwordRef, scopeQueryParams)
        : undefined,
    patRef:
      connectorInfo.spec.auth.type === AuthTypes.PERSONAL_ACCESS_TOKEN
        ? await setSecretField(connectorInfo.spec.auth.spec?.patRef, scopeQueryParams)
        : undefined
  }
  return formData
}

export const buildHelmPayload = (formData: FormData) => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    identifier: formData.identifier,
    projectIdentifier: formData.projectIdentifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.HttpHelmRepo,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      helmRepoUrl: formData.helmRepoUrl,
      auth:
        formData.authType === AuthTypes.USER_PASSWORD
          ? {
              type: formData.authType,
              spec: {
                username: formData.username?.type === ValueType.TEXT ? formData.username?.value : undefined,
                usernameRef: formData.username?.type === ValueType.ENCRYPTED ? formData.username?.value : undefined,
                passwordRef: formData.password.referenceString
              }
            }
          : {
              type: formData.authType
            }
    }
  }
  return { connector: savedData }
}

export const buildOCIHelmPayload = (formData: FormData) => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    identifier: formData.identifier,
    projectIdentifier: formData.projectIdentifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.OciHelmRepo,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      helmRepoUrl: formData.helmRepoUrl,
      auth:
        formData.authType === AuthTypes.USER_PASSWORD
          ? {
              type: formData.authType,
              spec: {
                username: formData.username?.type === ValueType.TEXT ? formData.username?.value : undefined,
                usernameRef: formData.username?.type === ValueType.ENCRYPTED ? formData.username?.value : undefined,
                passwordRef: formData.password.referenceString
              }
            }
          : {
              type: formData.authType
            }
    }
  }
  return { connector: savedData }
}

export const buildPdcPayload = (formData: FormData) => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.PDC,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      hosts: formData.hosts,
      sshKeyRef: formData.sshKeyRef
    }
  }

  return { connector: savedData }
}

export const buildGcpPayload = (formData: FormData) => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.GCP,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      credential: {
        type: formData?.delegateType,
        spec:
          formData?.delegateType === DelegateTypes.DELEGATE_OUT_CLUSTER
            ? {
                secretKeyRef: formData.password.referenceString
              }
            : formData?.delegateType === DelegateTypes.DELEGATE_OIDC
            ? {
                workloadPoolId: formData.workloadPoolId,
                providerId: formData.providerId,
                gcpProjectId: formData.gcpProjectId,
                serviceAccountEmail: formData.serviceAccountEmail
              }
            : null
      },
      proxy: formData?.proxy
    }
  }

  return { connector: savedData }
}

export const buildAzurePayload = (formData: FormData): ConnectorRequestBody => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.AZURE,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      credential:
        formData?.delegateType === DelegateTypes.DELEGATE_OUT_CLUSTER
          ? {
              type: formData.delegateType,
              spec: {
                applicationId: formData.applicationId,
                tenantId: formData.tenantId,
                auth: {
                  type: formData.secretType,
                  spec:
                    formData.secretType === AzureSecretKeyType.SECRET
                      ? {
                          secretRef: formData.secretText.referenceString
                        }
                      : {
                          certificateRef: formData.secretFile.referenceString
                        }
                }
              }
            }
          : {
              type: formData.delegateType,
              spec: {
                auth: {
                  type: formData.managedIdentity,
                  ...(formData.managedIdentity === AzureManagedIdentityTypes.USER_MANAGED
                    ? {
                        spec: {
                          clientId: formData.clientId
                        }
                      }
                    : {})
                }
              },
              clientId: formData.clientId
            },
      azureEnvironmentType: formData.azureEnvironmentType
    }
  }

  return { connector: savedData }
}

interface BuildAWSSecretManagerPayloadReturnType {
  connector: Omit<ConnectorInfoDTO, 'spec'> & {
    spec: Omit<AwsSecretManagerDTO, 'credential'> & {
      credential: Omit<AwsSecretManagerCredential, 'spec'> & {
        spec?: AwsSMCredentialSpecManualConfig | AwsSMCredentialSpecAssumeSTS
      }
    }
  }
}

export const buildAWSSecretManagerPayload = (formData: FormData): BuildAWSSecretManagerPayloadReturnType => {
  const credTypeValue = formData?.credType

  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.AWS_SECRET_MANAGER,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      region: formData.region,
      secretNamePrefix: formData.secretNamePrefix,
      default: formData.default,
      credential: {
        type: credTypeValue,
        spec:
          credTypeValue === CredTypeValues.ManualConfig
            ? {
                accessKey: formData?.accessKey?.referenceString,
                secretKey: formData?.secretKey?.referenceString
              }
            : credTypeValue === CredTypeValues.AssumeRoleSTS
            ? {
                roleArn: formData.roleArn.trim(),
                externalId: formData.externalId?.trim(),
                assumeStsRoleDuration: formData.assumeStsRoleDuration
                  ? isString(formData.assumeStsRoleDuration)
                    ? parseInt(formData.assumeStsRoleDuration.trim())
                    : formData.assumeStsRoleDuration
                  : undefined
              }
            : undefined
      }
    }
  }

  return { connector: savedData }
}

interface BuildGcpKmsPayloadReturnType {
  connector: Omit<ConnectorInfoDTO, 'spec'> & {
    spec: GcpKmsConnectorDTO
  }
}

export const buildGcpKmsPayload = (formData: FormData): BuildGcpKmsPayloadReturnType => {
  const savedData = {
    type: Connectors.GCP_KMS,
    name: formData.name,
    description: formData.description,
    tags: formData.tags,
    identifier: formData.identifier,
    projectIdentifier: formData.projectIdentifier,
    orgIdentifier: formData.orgIdentifier,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      credentials: formData.credentials.referenceString,
      default: formData.default,
      keyName: formData.keyName,
      keyRing: formData.keyRing,
      projectId: formData.projectId,
      region: formData.region
    }
  }
  return { connector: savedData }
}

interface BuildAzureKeyVaultPayloadReturnType {
  connector: Omit<ConnectorInfoDTO, 'spec'> & {
    spec: AzureKeyVaultConnectorDTO
  }
}

export const buildAzureKeyVaultMetadataPayload = (
  formData: FormData,
  connectorInfo: ConnectorInfoDTO | void
): SecretManagerMetadataRequestDTO => {
  const delegateType = formData?.delegateType
  const isDelegateOutCluster = delegateType === DelegateTypes.DELEGATE_OUT_CLUSTER
  const isDelegateInCluster = delegateType === DelegateTypes.DELEGATE_IN_CLUSTER
  const delegateOutClusterFields = isDelegateOutCluster
    ? {
        secretKey: formData.secretKey?.referenceString || (connectorInfo as any)?.spec?.secretKey,
        clientId: formData.clientId?.trim()
      }
    : {}
  const delegateInClusterFields = isDelegateInCluster
    ? {
        useManagedIdentity: true,
        azureManagedIdentityType: formData.managedIdentity,
        managedClientId:
          formData.managedIdentity === AzureManagedIdentityTypes.USER_MANAGED ? formData.clientId : undefined,
        azureEnvironmentType: formData.azureEnvironmentType
      }
    : {}
  return {
    identifier: formData.identifier,
    encryptionType: 'AZURE_VAULT',
    orgIdentifier: formData.orgIdentifier,
    projectIdentifier: formData.projectIdentifier,
    spec: {
      tenantId: formData.tenantId?.trim(),
      subscription: formData.subscription?.trim(),
      delegateSelectors: formData.delegateSelectors,
      enablePurge: formData?.enablePurge,
      ...delegateOutClusterFields,
      ...delegateInClusterFields
    } as AzureKeyVaultMetadataRequestSpecDTO
  }
}

export const buildAzureKeyVaultPayload = (formData: FormData): BuildAzureKeyVaultPayloadReturnType => {
  const delegateType = formData?.delegateType
  const isDelegateOutCluster = delegateType === DelegateTypes.DELEGATE_OUT_CLUSTER
  const isDelegateInCluster = delegateType === DelegateTypes.DELEGATE_IN_CLUSTER
  const delegateOutClusterFields = isDelegateOutCluster
    ? {
        secretKey: formData.secretKey?.referenceString,
        clientId: formData.clientId
      }
    : {}
  const delegateInClusterFields = isDelegateInCluster
    ? {
        useManagedIdentity: true,
        azureManagedIdentityType: formData.managedIdentity,
        managedClientId:
          formData.managedIdentity === AzureManagedIdentityTypes.USER_MANAGED ? formData.clientId : undefined,
        azureEnvironmentType: formData.azureEnvironmentType
      }
    : {}
  const savedData = {
    ...pick(formData, ['name', 'description', 'projectIdentifier', 'identifier', 'orgIdentifier', 'tags']),
    type: Connectors.AZURE_KEY_VAULT,
    spec: {
      ...pick(formData, ['tenantId', 'default', 'subscription', 'vaultName', 'delegateSelectors', 'enablePurge']),
      ...delegateOutClusterFields,
      ...delegateInClusterFields,
      vaultConfiguredManually: formData.vaultType === VaultType.MANUAL
    }
  }

  return { connector: savedData }
}

export const buildGitPayload = (formData: FormData) => {
  const savedData = {
    name: formData.name,
    description: formData.description,
    projectIdentifier: formData.projectIdentifier,
    identifier: formData.identifier,
    orgIdentifier: formData.orgIdentifier,
    tags: formData.tags,
    type: Connectors.GIT,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      connectionType: formData.urlType,
      url: formData.url,
      type: formData.connectionType,
      ...(formData.validationRepo ? { validationRepo: formData.validationRepo } : {}),
      proxy: formData.connectionType === GitConnectionType.HTTP ? formData.proxy : null,
      spec:
        formData.connectionType === GitConnectionType.SSH
          ? { sshKeyRef: formData.sshKey.referenceString }
          : {
              username: formData.username?.type === ValueType.TEXT ? formData.username?.value : undefined,
              usernameRef: formData.username?.type === ValueType.ENCRYPTED ? formData.username?.value : undefined,
              passwordRef: formData.password.referenceString
            }

      // mocked data untill UX is not provided
      // gitSync: {
      //   enabled: true,
      //   customCommitAttributes: {
      //     authorName: 'deepak',
      //     authorEmail: 'deepak.patankar@harness.io',
      //     commitMessage: '[GITSYNC-0]: Pushing Changes'
      //   }
      // }
    }
  }
  return { connector: savedData }
}

export const buildKubFormData = (connector: ConnectorInfoDTO) => {
  return {
    name: connector?.name,
    description: connector?.description,
    identifier: connector?.identifier,
    tags: connector?.tags,
    delegateType: connector?.spec?.credential?.type,
    delegateName: connector?.spec?.credential?.spec?.delegateName,
    masterUrl: connector?.spec?.credential?.spec?.masterUrl,
    authType: connector?.spec?.credential?.spec?.auth?.type,
    ...connector?.spec?.credential?.spec?.auth?.spec
  }
}

export const buildNexusPayload = (formData: FormData) => {
  const savedData = {
    type: Connectors.NEXUS,

    ...pick(formData, ['name', 'identifier', 'orgIdentifier', 'projectIdentifier', 'description', 'tags']),
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      nexusServerUrl: formData?.nexusServerUrl,
      version: formData?.nexusVersion,
      auth: {
        type: formData.authType,
        spec:
          formData.authType === AuthTypes.USER_PASSWORD
            ? {
                username: formData.username?.type === ValueType.TEXT ? formData.username?.value : undefined,
                usernameRef: formData.username?.type === ValueType.ENCRYPTED ? formData.username?.value : undefined,
                passwordRef: formData.password.referenceString
              }
            : null
      }
    }
  }

  return { connector: savedData }
}

export const buildArtifactoryPayload = (formData: FormData) => {
  const savedData = {
    type: Connectors.ARTIFACTORY,
    ...pick(formData, ['name', 'identifier', 'orgIdentifier', 'projectIdentifier', 'description', 'tags']),
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      executeOnDelegate: getExecuteOnDelegateValue(formData.connectivityMode),
      artifactoryServerUrl: formData?.artifactoryServerUrl,
      auth: {
        type: formData.authType,
        spec:
          formData.authType === AuthTypes.USER_PASSWORD
            ? {
                username: formData.username?.type === ValueType.TEXT ? formData.username?.value : undefined,
                usernameRef: formData.username?.type === ValueType.ENCRYPTED ? formData.username?.value : undefined,
                passwordRef: formData.password.referenceString
              }
            : null
      }
    }
  }

  return { connector: savedData }
}

export const buildAppDynamicsPayload = (formData: FormData): Connector => {
  const payload: Connector = {
    connector: {
      ...pick(formData, ['name', 'identifier', 'orgIdentifier', 'projectIdentifier', 'description', 'tags']),
      type: Connectors.APP_DYNAMICS,
      spec: {
        delegateSelectors: formData.delegateSelectors ?? {},
        authType: formData.authType,
        accountname: formData.accountName,
        controllerUrl: formData.url,
        accountId: formData.accountId
      } as AppDynamicsConnectorDTO
    }
  }

  if (formData.authType === AppDynamicsAuthType.USERNAME_PASSWORD) {
    payload.connector!.spec.username = formData.username
    payload.connector!.spec.passwordRef = formData.password.referenceString
  } else if (formData.authType === AppDynamicsAuthType.API_CLIENT_TOKEN) {
    payload.connector!.spec.clientId = formData.clientId
    payload.connector!.spec.clientSecretRef = formData.clientSecretRef.referenceString
  }

  return payload
}

export const buildELKPayload = (formData: FormData): Connector => {
  const payload: Connector = {
    connector: {
      ...pick(formData, ['name', 'identifier', 'orgIdentifier', 'projectIdentifier', 'description', 'tags']),
      type: Connectors.ELK,
      spec: {
        delegateSelectors: formData.delegateSelectors ?? {},
        authType: formData.authType,
        url: formData.url
      } as ELKConnectorDTO
    }
  }

  if (formData.authType === AuthTypes.USER_PASSWORD) {
    payload.connector!.spec.username = formData.username
    payload.connector!.spec.passwordRef = formData.password.referenceString
  } else if (formData.authType === AuthTypes.API_CLIENT_TOKEN) {
    payload.connector!.spec.apiKeyId = formData.apiKeyId
    payload.connector!.spec.apiKeyRef = formData.apiKeyRef.referenceString
  } else if (formData.authType === AuthTypes.BEARER_TOKEN) {
    payload.connector!.spec.apiKeyRef = formData.apiKeyRef.referenceString
  }

  return payload
}

export const buildNewRelicPayload = (formData: FormData) => ({
  connector: {
    name: formData.name,
    identifier: formData.identifier,
    type: Connectors.NEW_RELIC,
    projectIdentifier: formData.projectIdentifier,
    orgIdentifier: formData.orgIdentifier,
    spec: {
      delegateSelectors: formData.delegateSelectors || {},
      newRelicAccountId: formData.newRelicAccountId,
      apiKeyRef: formData.apiKeyRef.referenceString,
      url: formData.url?.value,
      accountId: formData.accountId
    }
  }
})

export const buildCustomHealthPayload = (formData: FormData) => {
  return {
    connector: {
      name: formData.name,
      identifier: formData.identifier,
      projectIdentifier: formData.projectIdentifier,
      orgIdentifier: formData.orgIdentifier,
      accountId: formData.accountId,
      type: Connectors.CUSTOM,
      spec: {
        ...transformStepHeadersAndParamsForPayload(formData.headers, formData.params),
        delegateSelectors: formData.delegateSelectors,
        baseURL: formData.baseURL,
        validationPath: formData.validationPath,
        validationBody: formData.requestBody,
        method: formData.requestMethod
      }
    }
  }
}

export const buildPrometheusPayload = (formData: FormData) => {
  return {
    connector: {
      name: formData.name,
      identifier: formData.identifier,
      type: Connectors.PROMETHEUS,
      projectIdentifier: formData.projectIdentifier,
      orgIdentifier: formData.orgIdentifier,
      spec: {
        ...transformStepHeadersAndParamsForPayloadForPrometheus(formData.headers),
        delegateSelectors: formData.delegateSelectors || {},
        url: formData.url,
        accountId: formData.accountId,
        username: formData.username,
        passwordRef: formData?.passwordRef?.referenceString
      }
    }
  }
}

export const buildSignalFXPayload = (formData: FormData) => {
  const { name, identifier, projectIdentifier, orgIdentifier, delegateSelectors, url, apiTokenRef, accountId } =
    formData
  return {
    connector: {
      name,
      identifier,
      type: Connectors.SignalFX,
      projectIdentifier,
      orgIdentifier,
      spec: {
        delegateSelectors: delegateSelectors || {},
        url,
        apiTokenRef: apiTokenRef?.referenceString,
        accountId
      }
    }
  }
}

export interface DatadogInitialValue {
  apiKeyRef?: SecretReferenceInterface | void
  applicationKeyRef?: SecretReferenceInterface | void
  accountId?: string | undefined
  projectIdentifier?: string
  orgIdentifier?: string
  loading?: boolean
}

export interface ErrorTrackingInitialValue {
  apiKeyRef?: SecretReferenceInterface | void
  accountId?: string
  projectIdentifier?: string
  orgIdentifier?: string
  loading?: boolean
}

export interface PagerDutyInitialValue {
  apiTokenRef?: SecretReferenceInterface | void
  accountId?: string | undefined
  projectIdentifier?: string
  orgIdentifier?: string
  loading?: boolean
}

export const buildPagerDutyPayload = (formData: FormData) => {
  const {
    name,
    identifier,
    projectIdentifier,
    orgIdentifier,
    delegateSelectors,
    description,
    tags,
    apiTokenRef: { referenceString: apiReferenceKey }
  } = formData
  return {
    connector: {
      name,
      identifier,
      type: Connectors.PAGER_DUTY,
      projectIdentifier,
      orgIdentifier,
      description,
      tags,
      spec: {
        apiTokenRef: apiReferenceKey,
        delegateSelectors: delegateSelectors || {}
      }
    }
  }
}

export const buildDatadogPayload = (formData: FormData) => {
  const {
    name,
    identifier,
    projectIdentifier,
    orgIdentifier,
    delegateSelectors,
    url,
    description,
    tags,
    apiKeyRef: { referenceString: apiReferenceKey },
    applicationKeyRef: { referenceString: appReferenceKey }
  } = formData
  return {
    connector: {
      name,
      identifier,
      type: Connectors.DATADOG,
      projectIdentifier,
      orgIdentifier,
      description,
      tags,
      spec: {
        url,
        apiKeyRef: apiReferenceKey,
        applicationKeyRef: appReferenceKey,
        delegateSelectors: delegateSelectors || {}
      }
    }
  }
}

export const buildErrorTrackingPayload = (formData: FormData): Connector => {
  const {
    name,
    identifier,
    projectIdentifier,
    orgIdentifier,
    delegateSelectors,
    apiKeyRef: { referenceString: apiReferenceKey },
    description,
    tags
  } = formData
  return {
    connector: {
      name,
      identifier,
      type: Connectors.ERROR_TRACKING,
      projectIdentifier,
      orgIdentifier,
      description,
      tags,
      spec: {
        url: getWindowLocationUrl(),
        apiKeyRef: apiReferenceKey,
        delegateSelectors: delegateSelectors || {}
      } as ErrorTrackingConnectorDTO
    }
  }
}

export interface SumoLogicInitialValue {
  accessIdRef?: SecretReferenceInterface | void
  accessKeyRef?: SecretReferenceInterface | void
  accountId?: string | undefined
  projectIdentifier?: string
  orgIdentifier?: string
  loading?: boolean
}

export const buildSumoLogicPayload = (formData: FormData) => {
  const {
    name,
    identifier,
    projectIdentifier,
    orgIdentifier,
    delegateSelectors,
    url,
    description,
    tags,
    accessIdRef: { referenceString: accessIdRef },
    accessKeyRef: { referenceString: accesskeyRef }
  } = formData
  return {
    connector: {
      name,
      identifier,
      type: Connectors.SUMOLOGIC,
      projectIdentifier,
      orgIdentifier,
      description,
      tags,
      spec: {
        url,
        accessIdRef: accessIdRef,
        accessKeyRef: accesskeyRef,
        delegateSelectors: delegateSelectors || {}
      }
    }
  }
}

export const buildSplunkPayload = (formData: FormData) => ({
  connector: {
    ...pick(formData, ['name', 'identifier', 'orgIdentifier', 'projectIdentifier', 'description', 'tags']),
    type: Connectors.SPLUNK,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      accountname: formData.accountName,
      username: formData.authType === AuthTypes.USER_PASSWORD ? formData.username : undefined,
      passwordRef: formData.authType === AuthTypes.USER_PASSWORD ? formData.passwordRef?.referenceString : undefined,
      splunkUrl: formData.url,
      accountId: formData.accountId,
      type: formData.authType,
      tokenRef: formData.authType === AuthTypes.BEARER_TOKEN ? formData.tokenRef?.referenceString : undefined
    }
  }
})

export const buildDynatracePayload = (formData: FormData) => {
  return {
    connector: {
      name: formData.name,
      identifier: formData.identifier,
      type: Connectors.DYNATRACE,
      projectIdentifier: formData.projectIdentifier,
      orgIdentifier: formData.orgIdentifier,
      spec: {
        delegateSelectors: formData.delegateSelectors || {},
        url: formData.url,
        apiTokenRef: formData.apiTokenRef?.referenceString,
        accountId: formData.accountId
      }
    }
  }
}

const AUTH_TYPE_VS_PAYLOAD_GETTER = {
  [AuthTypes.USER_PASSWORD]: (formData: FormData) => ({
    username: formData?.username?.type === ValueType.TEXT ? formData.username?.value : undefined,
    usernameRef: formData?.username?.type === ValueType.ENCRYPTED ? formData.username?.value : undefined,
    passwordRef: formData?.passwordRef?.referenceString
  }),
  [AuthTypes.ADFS]: (formData: FormData) => ({
    resourceIdRef: formData?.resourceIdRef?.referenceString,
    clientIdRef: formData?.clientIdRef?.referenceString,
    certificateRef: formData?.certificateRef?.referenceString,
    privateKeyRef: formData?.privateKeyRef?.referenceString,
    adfsUrl: formData?.adfsUrl
  }),
  [AuthTypes.REFRESH_TOKEN]: (formData: FormData) => ({
    tokenUrl: formData?.tokenUrl,
    clientIdRef: formData?.clientIdRef?.referenceString,
    refreshTokenRef: formData?.refreshTokenRef?.referenceString,
    clientSecretRef: formData?.clientSecretRef?.referenceString,
    scope: formData?.scope
  })
}

export const buildServiceNowPayload = (formData: FormData) => {
  const savedData = {
    ...pick(formData, ['name', 'identifier', 'orgIdentifier', 'projectIdentifier', 'description', 'tags']),
    type: Connectors.SERVICE_NOW,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      serviceNowUrl: formData.serviceNowUrl,
      auth: {
        type: formData.authType,
        spec: defaultTo(AUTH_TYPE_VS_PAYLOAD_GETTER[formData.authType]?.(formData), {})
      }
    }
  }

  return { connector: savedData }
}

const AUTH_TYPE_VS_FORM_DATA_GETTER = {
  [AuthTypes.USER_PASSWORD]: async (connectorInfo: ConnectorInfoDTO, scopeQueryParams: GetSecretV2QueryParams) => ({
    username:
      connectorInfo.spec.auth.spec?.username || connectorInfo.spec.auth.spec?.usernameRef
        ? {
            value: connectorInfo.spec.auth.spec?.username || connectorInfo.spec.auth.spec?.usernameRef,
            type: connectorInfo.spec.auth.spec?.usernameRef ? ValueType.ENCRYPTED : ValueType.TEXT
          }
        : undefined,
    passwordRef: await setSecretField(connectorInfo.spec.auth.spec?.passwordRef, scopeQueryParams)
  }),
  [AuthTypes.ADFS]: async (connectorInfo: ConnectorInfoDTO, scopeQueryParams: GetSecretV2QueryParams) => ({
    resourceIdRef: await setSecretField(connectorInfo.spec.auth.spec?.resourceIdRef, scopeQueryParams),
    clientIdRef: await setSecretField(connectorInfo.spec.auth.spec?.clientIdRef, scopeQueryParams),
    certificateRef: await setSecretField(connectorInfo.spec.auth.spec?.certificateRef, scopeQueryParams),
    privateKeyRef: await setSecretField(connectorInfo.spec.auth.spec?.privateKeyRef, scopeQueryParams),
    adfsUrl: connectorInfo.spec.auth.spec?.adfsUrl
  }),
  [AuthTypes.REFRESH_TOKEN]: async (connectorInfo: ConnectorInfoDTO, scopeQueryParams: GetSecretV2QueryParams) => ({
    clientIdRef: await setSecretField(connectorInfo.spec.auth.spec?.clientIdRef, scopeQueryParams),
    clientSecretRef: await setSecretField(connectorInfo.spec.auth.spec?.clientSecretRef, scopeQueryParams),
    refreshTokenRef: await setSecretField(connectorInfo.spec.auth.spec?.refreshTokenRef, scopeQueryParams),
    tokenUrl: connectorInfo.spec.auth.spec?.tokenUrl,
    scope: connectorInfo.spec.auth.spec?.scope
  })
}
export const setupServiceNowFormData = async (
  connectorInfo: ConnectorInfoDTO,
  accountId: string
): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }
  const formDataGetter = AUTH_TYPE_VS_FORM_DATA_GETTER[connectorInfo.spec.auth.type]

  return {
    serviceNowUrl: connectorInfo.spec.serviceNowUrl,
    authType: connectorInfo.spec.auth.type,
    ...(await formDataGetter?.(connectorInfo, scopeQueryParams))
  }
}

export const setupAzureKeyVaultFormData = async (
  connectorInfo: ConnectorInfoDTO,
  accountId: string
): Promise<FormData> => {
  const connectorInfoSpec = connectorInfo?.spec
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }
  const secretKey = await setSecretField(connectorInfoSpec?.secretKey, scopeQueryParams)
  const useManagedIdentity = connectorInfoSpec?.useManagedIdentity
  const delegateInClusterFields = useManagedIdentity
    ? {
        delegateType: DelegateTypes.DELEGATE_IN_CLUSTER,
        managedIdentity: connectorInfoSpec?.azureManagedIdentityType || undefined,
        clientId:
          connectorInfoSpec?.azureManagedIdentityType === AzureManagedIdentityTypes.USER_MANAGED
            ? defaultTo(connectorInfoSpec?.managedClientId, undefined)
            : undefined,
        azureEnvironmentType: connectorInfoSpec?.azureEnvironmentType || undefined
      }
    : {}
  return {
    clientId: connectorInfoSpec?.clientId || undefined,
    secretKey: secretKey || undefined,
    tenantId: connectorInfoSpec?.tenantId || undefined,
    subscription: connectorInfoSpec?.subscription || undefined,
    default: connectorInfoSpec?.default || false,
    delegateType: DelegateTypes.DELEGATE_OUT_CLUSTER,
    enablePurge: defaultTo(connectorInfoSpec?.enablePurge, true),
    ...delegateInClusterFields
  }
}

export const setupAzureKeyVaultNameFormData = async (connectorInfo: ConnectorInfoDTO): Promise<FormData> => {
  return {
    vaultName: connectorInfo?.spec?.vaultName,
    vaultType: !connectorInfo?.spec?.vaultConfiguredManually ? VaultType.FETCH : VaultType.MANUAL
  }
}

export const setupVaultFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const connectorInfoSpec = connectorInfo?.spec
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }
  const secretId = await setSecretField(connectorInfoSpec?.secretId, scopeQueryParams)
  const authToken = await setSecretField(connectorInfoSpec?.authToken, scopeQueryParams)
  const xvaultAwsIamServerId = await setSecretField(connectorInfoSpec.xvaultAwsIamServerId, scopeQueryParams)
  return {
    vaultUrl: connectorInfoSpec?.vaultUrl || '',
    basePath: connectorInfoSpec?.basePath || '',
    namespace: connectorInfoSpec?.namespace,
    readOnly: connectorInfoSpec?.readOnly || false,
    default: connectorInfoSpec?.default || false,
    accessType: connectorInfoSpec?.accessType || HashiCorpVaultAccessTypes.APP_ROLE,
    appRoleId: connectorInfoSpec?.appRoleId || '',
    secretId: secretId || undefined,
    enableCache: connectorInfoSpec?.enableCache,
    authToken: authToken || undefined,
    sinkPath: connectorInfoSpec?.sinkPath || '',
    renewalIntervalMinutes: connectorInfoSpec?.renewalIntervalMinutes,
    vaultAwsIamRole: connectorInfoSpec.vaultAwsIamRole,
    xvaultAwsIamServerId,
    useAwsIam: connectorInfoSpec.useAwsIam,
    awsRegion: connectorInfoSpec.awsRegion,
    useK8sAuth: connectorInfoSpec.useK8sAuth,
    k8sAuthEndpoint: connectorInfoSpec?.k8sAuthEndpoint || '',
    vaultK8sAuthRole: connectorInfoSpec?.vaultK8sAuthRole || '',
    serviceAccountTokenPath: connectorInfoSpec?.serviceAccountTokenPath || ''
  }
}

export const setupEngineFormData = async (connectorInfo: ConnectorInfoDTO): Promise<FormData> => {
  const connectorInfoSpec = connectorInfo?.spec

  return {
    secretEngine: `${connectorInfoSpec?.secretEngineName || ''}@@@${connectorInfoSpec?.secretEngineVersion || 2}`,
    engineType: connectorInfoSpec?.secretEngineManuallyConfigured ? 'manual' : 'fetch',
    secretEngineName: connectorInfoSpec?.secretEngineName || '',
    secretEngineVersion: connectorInfoSpec?.secretEngineVersion || 2
  }
}

export const getIconByType = (type: ConnectorInfoDTO['type'] | undefined): IconName => {
  switch (type) {
    case Connectors.KUBERNETES_CLUSTER:
      return 'service-kubernetes'
    case Connectors.GIT:
      return 'service-github'
    case Connectors.HttpHelmRepo:
      return 'service-helm'
    case Connectors.OciHelmRepo:
      return 'helm-oci'
    case Connectors.GITHUB:
      return 'github'
    case Connectors.GITLAB:
      return 'service-gotlab'
    case Connectors.BITBUCKET:
      return 'bitbucket-selected'
    case Connectors.AZURE_REPO:
      return 'service-azure'
    case Connectors.VAULT: // TODO: use enum when backend fixes it
      return 'hashiCorpVault'
    case Connectors.LOCAL: // TODO: use enum when backend fixes it
      return 'secret-manager'
    case Connectors.APP_DYNAMICS:
      return 'service-appdynamics'
    case Connectors.SPLUNK:
    case Connectors.SignalFX:
      return 'service-splunk'
    case Connectors.NEW_RELIC:
      return 'service-newrelic'
    case Connectors.PROMETHEUS:
      return 'service-prometheus'
    case Connectors.DOCKER:
      return 'service-dockerhub'
    case Connectors.AWS:
    case Connectors.CEAWS:
      return 'service-aws'
    case Connectors.AWS_CODECOMMIT:
      return 'service-aws-code-deploy'
    case Connectors.NEXUS:
      return 'service-nexus'
    case Connectors.ARTIFACTORY:
      return 'service-artifactory'
    case Connectors.GCP:
      return 'service-gcp'
    case Connectors.PDC:
      return 'pdc'
    case Connectors.Jira:
      return 'service-jira'
    case Connectors.AWS_KMS:
      return 'aws-kms'
    case Connectors.AWS_SECRET_MANAGER:
      return 'aws-secret-manager'
    case Connectors.CE_AZURE:
      return 'service-azure'
    case Connectors.DATADOG:
      return 'service-datadog'
    case Connectors.SUMOLOGIC:
      return 'service-sumologic'
    case Connectors.AZURE_KEY_VAULT:
      return 'azure-key-vault'
    case Connectors.DYNATRACE:
      return 'service-dynatrace'
    case Connectors.CE_KUBERNETES:
      return 'service-kubernetes'
    case Connectors.CE_GCP:
      return 'service-gcp'
    case Connectors.PAGER_DUTY:
      return 'service-pagerduty'
    case Connectors.GCP_KMS:
      return 'gcp-kms'
    case Connectors.SERVICE_NOW:
      return 'service-servicenow'
    case Connectors.CUSTOM_HEALTH:
      return 'service-custom-connector'
    case Connectors.ELK:
      return 'service-elk'
    case Connectors.ERROR_TRACKING:
      return 'error-tracking'
    case Connectors.AZURE:
      return 'microsoft-azure'
    case Connectors.JENKINS:
      return 'service-jenkins'
    case Connectors.Bamboo:
      return 'service-bamboo'
    case Connectors.AZURE_ARTIFACTS:
      return 'service-azure-artifacts'
    case Connectors.CUSTOM_SECRET_MANAGER:
      return 'custom-sm'
    case Connectors.GcpSecretManager:
      return 'gcp-secret-manager'
    case Connectors.SPOT:
      return 'spot'
    case Connectors.TAS:
      return 'tas'
    case Connectors.TERRAFORM_CLOUD:
      return 'terraform-cloud'
    case Connectors.Rancher:
      return 'rancher' as IconName
    default:
      return 'cog'
  }
}

export const getConnectorDisplayName = (type: string): string => {
  switch (type) {
    case Connectors.KUBERNETES_CLUSTER:
      return 'Kubernetes cluster'
    case Connectors.GIT:
      return 'Git'
    case Connectors.GITHUB:
      return 'GitHub'
    case Connectors.GITLAB:
      return 'GitLab'
    case Connectors.BITBUCKET:
      return 'Bitbucket'
    case Connectors.AZURE_REPO:
      return 'Azure Repos'
    case Connectors.DOCKER:
      return 'Docker Registry'
    case Connectors.GCP:
      return 'GCP'
    case Connectors.PDC:
      return 'Physical Data Center'
    case Connectors.APP_DYNAMICS:
      return 'AppDynamics'
    case Connectors.SPLUNK:
      return 'Splunk'
    case Connectors.NEW_RELIC:
      return 'New Relic'
    case Connectors.PROMETHEUS:
      return 'Prometheus'
    case Connectors.AWS:
      return 'AWS'
    case Connectors.AWS_CODECOMMIT:
      return 'AWS CodeCommit'
    case Connectors.NEXUS:
      return 'Nexus'
    case Connectors.LOCAL:
      return 'Local Secret Manager'
    case Connectors.VAULT:
      return 'HashiCorp Vault'
    case Connectors.GCP_KMS:
      return 'GCP KMS'
    case Connectors.AZUREVAULT:
      return 'Azure Vault'
    case Connectors.HttpHelmRepo:
      return 'HTTP Helm Repo'
    case Connectors.OciHelmRepo:
      return 'OCI Helm Registry'
    case Connectors.AWSSM:
      return 'AWS Secret Manager'
    case Connectors.AWS_KMS:
      return 'AWS KMS'
    case Connectors.AZURE_KEY_VAULT:
      return 'Azure Key Vault'
    case Connectors.DYNATRACE:
      return 'Dynatrace'
    case Connectors.CEAWS:
      return 'AWS'
    case Connectors.AWS_SECRET_MANAGER:
      return 'AWS Secrets Manager'
    case Connectors.CE_AZURE:
      return 'Azure'
    case Connectors.CE_KUBERNETES:
      return 'Kubernetes'
    case Connectors.CE_GCP:
      return 'GCP'
    case Connectors.AZURE:
      return 'Azure'
    case Connectors.ERROR_TRACKING:
      return 'Error Tracking'
    case Connectors.CUSTOM_SECRET_MANAGER:
      return 'Custom Secrets Manager'
    case Connectors.GcpSecretManager:
      return 'GCP Secrets Manager'
    case Connectors.SPOT:
      return 'Spot'
    case Connectors.AZURE_ARTIFACTS:
      return 'Azure Artifacts'
    case Connectors.TAS:
      return 'Tanzu Application Service'
    case Connectors.TERRAFORM_CLOUD:
      return 'Terraform Cloud'
    case Connectors.SignalFX:
      return 'Splunk Observability [SignalFX]'
    case Connectors.Rancher:
      return 'Rancher cluster'
    default:
      return ''
  }
}

export const getIconByEntityType = (type: string) => {
  switch (type) {
    case EntityTypes.PROJECT:
      return 'nav-project'
    case EntityTypes.PIPELINE:
      return 'pipeline'
    case EntityTypes.SECRET:
      return 'key-main'
    case EntityTypes.CV_CONFIG:
      return 'desktop'
    case EntityTypes.CV_K8_ACTIVITY_SOURCE:
      return 'square'
    case EntityTypes.CV_VERIFICATION_JOB:
      return 'confirm'

    default:
      return ''
  }
}

export const getReferredEntityLabelByType = (type: string) => {
  switch (type) {
    case EntityTypes.PROJECT:
      return 'Project'
    case EntityTypes.PIPELINE:
      return 'Pipeline'
    case EntityTypes.SECRET:
      return 'Secret'
    case EntityTypes.CV_CONFIG:
      return 'Monitoring Source'
    case EntityTypes.CV_K8_ACTIVITY_SOURCE:
      return 'Change Source'
    case EntityTypes.CV_VERIFICATION_JOB:
      return 'Verification Job'
    case EntityTypes.default:
      return ''
  }
}

export function GetTestConnectionValidationTextByType(type: ConnectorConfigDTO['type']): string {
  const { getString } = useStrings()
  switch (type) {
    case Connectors.DOCKER:
      return getString('platform.connectors.testConnectionStep.validationText.docker')
    case Connectors.AWS:
      return getString('platform.connectors.testConnectionStep.validationText.aws')
    case Connectors.Jira:
      return getString('platform.connectors.testConnectionStep.validationText.jira')
    case Connectors.NEXUS:
      return getString('platform.connectors.testConnectionStep.validationText.nexus')
    case Connectors.ARTIFACTORY:
      return getString('platform.connectors.testConnectionStep.validationText.artifactory')
    case Connectors.GCP:
      return getString('platform.connectors.testConnectionStep.validationText.gcp')
    case 'Gcr':
      return getString('platform.connectors.testConnectionStep.validationText.gcr')
    case Connectors.APP_DYNAMICS:
      return getString('platform.connectors.testConnectionStep.validationText.appD')
    case Connectors.ELK:
      return getString('platform.connectors.elk.testConnectionStepValidation')
    case Connectors.SPLUNK:
      return getString('platform.connectors.testConnectionStep.validationText.splunk')
    case Connectors.VAULT:
      return getString('platform.connectors.testConnectionStep.validationText.vault')
    case Connectors.AWS_SECRET_MANAGER:
      return getString('platform.connectors.testConnectionStep.validationText.awsSecretManager')
    case Connectors.GCP_KMS:
      return getString('platform.connectors.testConnectionStep.validationText.gcpKms')
    case Connectors.BITBUCKET:
      return getString('platform.connectors.testConnectionStep.validationText.bitbucket')
    case Connectors.AZURE_REPO:
      return getString('platform.connectors.testConnectionStep.validationText.azureRepos')
    case Connectors.GITLAB:
      return getString('platform.connectors.testConnectionStep.validationText.gitlab')
    case Connectors.GITHUB:
      return getString('platform.connectors.testConnectionStep.validationText.github')
    case Connectors.GIT:
      return getString('platform.connectors.testConnectionStep.validationText.git')
    case Connectors.CE_AZURE:
      return getString('platform.connectors.testConnectionStep.validationText.azure')
    case Connectors.DATADOG:
      return getString('platform.connectors.testConnectionStep.validationText.datadog')
    case Connectors.SUMOLOGIC:
      return getString('platform.connectors.testConnectionStep.validationText.sumologic')
    case Connectors.AZURE_KEY_VAULT:
      return getString('platform.connectors.testConnectionStep.validationText.azureKeyVault')
    case Connectors.PAGER_DUTY:
      return getString('platform.connectors.testConnectionStep.validationText.pagerduty')
    case Connectors.PDC:
      return getString('platform.connectors.testConnectionStep.validationText.pdc')
    case Connectors.SERVICE_NOW:
      return getString('platform.connectors.testConnectionStep.validationText.serviceNow')
    case Connectors.AZURE:
      return getString('platform.connectors.testConnectionStep.validationText.azure')
    case Connectors.CUSTOM_SECRET_MANAGER:
      return getString('platform.connectors.testConnectionStep.validationText.customSM')
    case Connectors.GcpSecretManager:
      return getString('platform.connectors.testConnectionStep.validationText.gcpSM')
    case Connectors.SPOT:
      return getString('platform.connectors.testConnectionStep.validationText.spot')
    case Connectors.TAS:
      return getString('platform.connectors.testConnectionStep.validationText.tas')
    case Connectors.TERRAFORM_CLOUD:
      return getString('platform.connectors.testConnectionStep.validationText.terraform')

    default:
      return ''
  }
}

export const getUrlValueByType = (type: ConnectorInfoDTO['type'], connector: ConnectorInfoDTO): string => {
  switch (type) {
    case Connectors.KUBERNETES_CLUSTER:
      return connector.spec.credential.spec?.masterUrl
    case Connectors.Rancher:
      return connector.spec.credential.spec?.rancherUrl
    case Connectors.DOCKER:
      return connector.spec.dockerRegistryUrl
    case Connectors.JENKINS:
      return connector.spec.jenkinsUrl
    case Connectors.NEXUS:
      return connector.spec.nexusServerUrl

    case Connectors.ARTIFACTORY:
      return connector.spec.artifactoryServerUrl

    case Connectors.APP_DYNAMICS:
      return connector.spec.controllerUrl
    case Connectors.NEW_RELIC:
      return connector.spec.url?.value
    case Connectors.PROMETHUS:
      return connector.spec.url
    case Connectors.SPLUNK:
      return connector.spec.splunkUrl
    case Connectors.DYNATRACE:
      return connector.spec.url
    case Connectors.VAULT:
      return connector.spec.vaultUrl
    case Connectors.BITBUCKET:
    case Connectors.GITLAB:
    case Connectors.GITHUB:
    case Connectors.GIT:
      return connector.spec.url

    default:
      return ''
  }
}

// No usages: enable when used
/* istanbul ignore next */
export const getInvocationPathsForSecrets = (type: ConnectorInfoDTO['type'] | 'Unknown'): Set<RegExp> => {
  switch (type) {
    case 'K8sCluster':
      return new Set([
        /^.+\.passwordRef$/,
        /^.+\.usernameRef$/,
        /^.+\.serviceAccountTokenRef$/,
        /^.+\.oidcUsernameRef$/,
        /^.+\.oidcClientIdRef$/,
        /^.+\.oidcPasswordRef$/,
        /^.+\.oidcSecretRef$/,
        /^.+\.caCertRef$/,
        /^.+\.clientCertRef$/,
        /^.+\.clientKeyRef$/,
        /^.+\.clientKeyPassphraseRef$/
      ])
    case 'DockerRegistry':
      return new Set([/^.+\.passwordRef$/, /^.+\.usernameRef$/])
    case 'Nexus':
      return new Set([/^.+\.passwordRef$/, /^.+\.usernameRef$/])
    case 'Git':
      return new Set([/^.+\.passwordRef$/, /^.+\.usernameRef$/, /^.+\.encryptedSshKey$/])
    case 'Splunk':
      return new Set([/^.+\.passwordRef$/])
    case 'AppDynamics':
      return new Set([/^.+\.passwordRef$/])
    case 'Gcp':
      return new Set([/^.+\.secretKeyRef$/])
    case 'Aws':
      return new Set([/^.+\.accessKeyRef$/, /^.+\.secretKeyRef$/])
    case 'Pdc':
      return new Set([/^.+\.connectorRef$/, /^.+\.sshKeyRef$/])
    case 'Github':
      return new Set([
        /^.+\.usernameRef$/,
        /^.+\.passwordRef$/,
        /^.+\.tokenRef$/,
        /^.+\.sshKeyRef$/,
        /^.+\.privateKeyRef$/
      ])
    case 'Gitlab':
      return new Set([
        /^.+\.usernameRef$/,
        /^.+\.passwordRef$/,
        /^.+\.tokenRef$/,
        /^.+\.sshKeyRef$/,
        /^.+\.kerberosKeyRef$/
      ])
    case 'Bitbucket':
      return new Set([/^.+\.usernameRef$/, /^.+\.passwordRef$/, /^.+\.tokenRef$/, /^.+\.sshKeyRef$/])
    case 'Unknown':
      return new Set([/^.+\.Ref$/])
    default:
      return new Set([])
  }
}

export const removeErrorCode = (errors: ErrorDetail[] = []) => {
  errors.forEach(item => delete item.code)
  return errors
}

export const saveCurrentStepData = <T>(getCurrentStepData: StepProps<T>['getCurrentStepData'], values: T): void => {
  if (getCurrentStepData) {
    getCurrentStepData.current = () => {
      return values
    }
  }
}

export const isSMConnector = (type?: ConnectorInfoDTO['type']): boolean | undefined => {
  if (!type) return
  return (['AwsKms', 'AzureKeyVault', 'Vault', 'AwsSecretManager', 'GcpKms'] as ConnectorInfoDTO['type'][]).includes(
    type
  )
}

export const showCustomErrorSuggestion = (connectorType: string) => {
  const connectorsList: string[] = [Connectors.CE_KUBERNETES, Connectors.CEAWS, Connectors.CE_AZURE, Connectors.CE_GCP]
  return Boolean(connectorsList.includes(connectorType))
}

export const showEditAndViewPermission = (connectorType: string) => {
  const connectorsList: string[] = [Connectors.CE_KUBERNETES, Connectors.CEAWS, Connectors.CE_AZURE, Connectors.CE_GCP]
  return Boolean(connectorsList.includes(connectorType))
}

export enum GitAuthenticationProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  SSH = 'ssh'
}

export const getCompleteConnectorUrl = ({
  partialUrl,
  repoName,
  connectorType,
  gitAuthProtocol
}: {
  partialUrl: string
  repoName: string
  connectorType: ConnectorConfigDTO['type']
  gitAuthProtocol: GitAuthenticationProtocol
}): string => {
  if (!partialUrl || !repoName || !connectorType) {
    return ''
  }
  return (partialUrl[partialUrl.length - 1] === '/' ? partialUrl : partialUrl + '/')
    .concat(
      connectorType === Connectors.AZURE_REPO && gitAuthProtocol.toLowerCase() !== GitAuthenticationProtocol.SSH
        ? '_git/'
        : ''
    )
    .concat(repoName)
}

export const buildRancherPayload = (formData: FormData) => {
  const savedData = {
    name: formData?.name,
    description: formData?.description,
    projectIdentifier: formData?.projectIdentifier,
    orgIdentifier: formData?.orgIdentifier,
    identifier: formData?.identifier,
    tags: formData?.tags,
    type: Connectors.Rancher,
    spec: {
      ...(formData?.delegateSelectors ? { delegateSelectors: formData.delegateSelectors } : {}),
      credential: {
        type: formData?.delegateType,
        spec: getRancherSpecForDelegateType(formData)
      }
    }
  }
  return { connector: savedData }
}

export const getRancherSpecForDelegateType = (formData: FormData) => {
  if (formData?.delegateType === DelegateTypes.DELEGATE_OUT_CLUSTER) {
    return {
      rancherUrl: formData?.rancherUrl,
      auth: {
        type: formData?.authType,
        spec: buildAuthTypePayload(formData)
      }
    }
  }
  return null
}

export const filterRancherConnector = (categories: CategoryInterface[]): CategoryInterface[] => {
  return categories.map((category: CategoryInterface) => {
    if (category.categoryLabel === 'Cloud Providers') {
      return {
        ...category,
        items: category.items?.filter((item: ItemInterface) => {
          return item.value !== Connectors.Rancher
        })
      }
    }
    return category
  })
}

export const setupRancherFormData = async (connectorInfo: ConnectorInfoDTO, accountId: string): Promise<FormData> => {
  const scopeQueryParams: GetSecretV2QueryParams = {
    accountIdentifier: accountId,
    projectIdentifier: connectorInfo.projectIdentifier,
    orgIdentifier: connectorInfo.orgIdentifier
  }
  const formData = {
    delegateType: connectorInfo.spec.credential.type,
    delegateName: connectorInfo.spec.credential?.spec?.delegateName || '',
    rancherUrl: connectorInfo.spec.credential?.spec?.rancherUrl || '',
    authType: connectorInfo.spec.credential?.spec?.auth?.type || '',
    skipDefaultValidation: false,
    passwordRef: await setSecretField(connectorInfo?.spec?.credential.spec?.auth.spec.passwordRef, scopeQueryParams)
  }

  return formData
}
