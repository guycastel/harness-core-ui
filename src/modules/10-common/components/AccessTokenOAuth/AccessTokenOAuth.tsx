/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Text, Layout, DropDown, getErrorInfoFromErrorObject, useToaster } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { useStrings } from 'framework/strings'
import {
  ConnectorInfoDTO,
  useSaveUserSourceCodeManager,
  UserSourceCodeManagerRequestDTO,
  UserSourceCodeManagerResponseDTO
} from 'services/cd-ng'
import type { AccountPathProps } from '@common/interfaces/RouteInterfaces'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import type { StringsMap } from 'stringTypes'
import { ConnectViaOAuth } from '@common/components/ConnectViaOAuth/ConnectViaOAuth'
import { Status } from '@common/utils/Constants'
import { OAuthEventProcessingResponse, handleOAuthEventProcessing } from '@common/components/ConnectViaOAuth/OAuthUtils'
import css from './AccessTokenOAuth.module.scss'

export enum SourceCodeTypes {
  BITBUCKET = 'BITBUCKET',
  GITHUB = 'GITHUB',
  GITLAB = 'GITLAB',
  AZURE_REPO = 'AZURE_REPO',
  AWS_CODE_COMMIT = 'AWS_CODE_COMMIT',
  HARNESS = 'Harness'
}

export const getRepoProviderLabelKey = (gitProviderType: string): keyof StringsMap => {
  switch (gitProviderType) {
    case SourceCodeTypes.GITHUB:
      return 'common.repo_provider.githubLabel'
    case SourceCodeTypes.GITLAB:
      return 'common.repo_provider.gitlabLabel'
    case SourceCodeTypes.BITBUCKET:
      return 'common.repo_provider.bitbucketLabel'
    case SourceCodeTypes.AZURE_REPO:
      return 'common.repo_provider.azureRepos'
    case SourceCodeTypes.AWS_CODE_COMMIT:
      return 'common.repo_provider.awscodecommit'
    default:
      return 'common.repo_provider.customLabel'
  }
}

export const supportedProviders = [SourceCodeTypes.GITHUB, SourceCodeTypes.GITLAB, SourceCodeTypes.BITBUCKET]

const AccessTokenOAuth: React.FC<{
  refetch: () => Promise<void>
  providersWithTokenAvailble?: Array<UserSourceCodeManagerResponseDTO['type']>
  selectedProvider?: UserSourceCodeManagerResponseDTO['type']
  errorHandler?: () => void
}> = props => {
  const { refetch, providersWithTokenAvailble, selectedProvider, errorHandler } = props
  const { accountId } = useParams<AccountPathProps>()
  const { currentUserInfo } = useAppStore()
  const { getString } = useStrings()
  const { showSuccess, showError } = useToaster()
  const [oAuthStatus, setOAuthStatus] = useState<Status>(Status.TO_DO)
  const oAuthSecretIntercepted = useRef<boolean>(false)
  const [forceFailOAuthTimeoutId, setForceFailOAuthTimeoutId] = useState<NodeJS.Timeout>()
  const [gitProviderType, setGitProviderType] = useState<UserSourceCodeManagerRequestDTO['type']>(selectedProvider)
  const [showOAuthStatus, setShowOAuthStatus] = useState<boolean>(true)

  const supportedProvidersSelectOptions = supportedProviders.map(provider => {
    return { label: getString(getRepoProviderLabelKey(provider)), value: provider }
  })

  const getOAuthError = useCallback((): JSX.Element => {
    return (
      <Text icon="circle-cross" iconProps={{ size: 24, color: Color.RED_500 }} color={Color.RED_500}>
        {getString('common.OAuthTryAgain')}
      </Text>
    )
  }, [getString])

  const { loading, mutate: createUserSCM } = useSaveUserSourceCodeManager({})
  // This is handler for event dispatched by the other window
  /* istanbul ignore next */
  const handleOAuthServerEvent = useCallback(
    (event: MessageEvent): void => {
      handleOAuthEventProcessing({
        event,
        oAuthStatus,
        setOAuthStatus,
        oAuthSecretIntercepted,
        onSuccessCallback: ({ accessTokenRef, refreshTokenRef }: OAuthEventProcessingResponse) => {
          if (forceFailOAuthTimeoutId) {
            clearTimeout(forceFailOAuthTimeoutId)
          }
          createUserSCM({
            accountIdentifier: accountId,
            type: gitProviderType,
            userIdentifier: currentUserInfo?.uuid,
            authentication: {
              apiAccessDTO: {
                spec: { tokenRef: accessTokenRef, refreshTokenRef },
                type: 'OAuth'
              }
            }
          })
            .then(() => {
              showSuccess(getString('common.oAuth.accessTokenCreateSuccess'))
              refetch()
            })
            .catch(error => {
              setOAuthStatus(Status.TO_DO)
              showError(getErrorInfoFromErrorObject(error))
            })
        }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [oAuthStatus, forceFailOAuthTimeoutId]
  )

  useEffect(() => {
    window.addEventListener('message', handleOAuthServerEvent)
    return () => {
      window.removeEventListener('message', handleOAuthServerEvent)
    }
  }, [handleOAuthServerEvent])

  return (
    <Layout.Vertical spacing="large">
      {!selectedProvider && (
        <Text font={{ variation: FontVariation.H5 }}>{getString('common.oAuth.connectToGitProviderLabel')}</Text>
      )}
      <Layout.Horizontal spacing="medium">
        {!selectedProvider && (
          <DropDown
            className={css.oauthDropDown}
            buttonTestId={'oAuth-provider-select'}
            value={gitProviderType}
            onChange={item => {
              if (providersWithTokenAvailble?.includes(item?.value as UserSourceCodeManagerResponseDTO['type'])) {
                setShowOAuthStatus(false)
                showSuccess(getString('common.oAuth.accessTokenAlredyAdded'))
              } else {
                setShowOAuthStatus(true)
                setOAuthStatus(Status.TO_DO)
              }
              setGitProviderType(item?.value as UserSourceCodeManagerRequestDTO['type'])
            }}
            items={supportedProvidersSelectOptions}
            placeholder={getString('common.oAuth.connectToGitProviderPlaceholder')}
            usePortal={true}
            addClearBtn={true}
            disabled={loading}
          />
        )}
        {gitProviderType && showOAuthStatus && (
          <>
            <ConnectViaOAuth
              labelText={getString('common.connect')}
              showLinkButtonAsMinimal={!!selectedProvider}
              isPrivateSecret={true}
              key={gitProviderType}
              gitProviderType={gitProviderType as ConnectorInfoDTO['type']}
              accountId={accountId}
              status={oAuthStatus}
              setOAuthStatus={setOAuthStatus}
              isOAuthAccessRevoked={false}
              isExistingConnectionHealthy={false}
              oAuthSecretIntercepted={oAuthSecretIntercepted}
              forceFailOAuthTimeoutId={forceFailOAuthTimeoutId}
              setForceFailOAuthTimeoutId={setForceFailOAuthTimeoutId}
              hideOauthLinkButton={oAuthStatus === Status.SUCCESS || oAuthStatus === Status.IN_PROGRESS}
              hideOauthStatus={oAuthStatus === Status.FAILURE}
            />
            {oAuthStatus === Status.FAILURE && (errorHandler ? errorHandler() : getOAuthError())}
          </>
        )}
      </Layout.Horizontal>
    </Layout.Vertical>
  )
}

export default AccessTokenOAuth
