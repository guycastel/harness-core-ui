/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import {
  Text,
  Icon,
  Layout,
  Button,
  ButtonVariation,
  Container,
  ButtonSize,
  Card,
  PageSpinner,
  useToaster,
  getErrorInfoFromErrorObject
} from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { noop } from 'lodash-es'
import { useStrings } from 'framework/strings'
import { useDockerRunnerCommand } from 'services/ci'
import { RestResponseDelegateGroupDetails, getDelegateGroupByIdentifierPromise } from 'services/portal'
import CommandBlock from '@modules/10-common/CommandBlock/CommandBlock'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { CIOnboardingActions } from '@common/constants/TrackingConstants'
import VerifyDelegateConnection from '@modules/27-platform/delegates/pages/delegates/delegateCommandLineCreation/components/VerifyDelegateConnection'
import { DelegateCommonProblemTypes } from '@modules/27-platform/delegates/constants'
import { getOsArchFromDelegateTags } from '@modules/75-ci/utils/HostedBuildsUtils'
import { LocalRunnerOsArchTypes } from './InfraProvisioningWizard/Constants'
import css from './GetStartedWithCI.module.scss'

export enum GetStartedInfraTypes {
  HOSTED = 'HOSTED',
  LOCAL = 'LOCAL'
}

interface CreditCardOnboardingProps {
  setShowLocalInfraSetup: (value: boolean) => void
  openCreditCardModal: () => void
}
const DefaultDockerDelegateIdentifier = '_docker_delegate'

export const CreditCardOnboarding = (props: CreditCardOnboardingProps): React.ReactElement => {
  const [selectedInfra, setSelectedInfra] = useState<GetStartedInfraTypes>()
  const { getString } = useStrings()
  const { trackEvent } = useTelemetry()
  return (
    <Layout.Vertical flex>
      <Container className={css.creditCardPage}>
        <Text font={{ variation: FontVariation.H3 }} padding={{ top: 'xxxlarge', bottom: 'small', left: 'xxxlarge' }}>
          {getString('platform.authSettings.choosePlan')}
        </Text>
        <Text padding={{ top: 'small', bottom: 'medium', left: 'xxxlarge' }}>
          {getString('ci.getStartedWithCI.choosePlan')}
        </Text>
        <Layout.Horizontal>
          <Card
            className={css.getStartedInfraCard}
            onClick={() => setSelectedInfra(GetStartedInfraTypes.HOSTED)}
            selected={selectedInfra === GetStartedInfraTypes.HOSTED}
          >
            <Container className={css.recommended}>
              <Text font={{ variation: FontVariation.SMALL }} color={Color.WHITE}>
                {getString('common.recommended').toUpperCase()}
              </Text>
            </Container>
            <Text font={{ variation: FontVariation.CARD_TITLE }} padding={{ top: 'large', bottom: 'xxxlarge' }}>
              {getString('ci.getStartedWithCI.runOnHarnessCloud')}
            </Text>
            <Text font={{ variation: FontVariation.SMALL }} padding={{ top: 'large', bottom: 'xxxlarge' }}>
              {getString('ci.getStartedWithCI.harnessCloudCard')}
            </Text>
            <Layout.Horizontal>
              {selectedInfra === GetStartedInfraTypes.HOSTED && (
                <Button
                  text={getString('continue')}
                  intent="primary"
                  rightIcon="chevron-right"
                  onClick={() => {
                    props.openCreditCardModal()
                  }}
                  variation={ButtonVariation.PRIMARY}
                />
              )}
              <Icon name="harness-grey" size={100} className={css.cardIcon} />
            </Layout.Horizontal>
          </Card>
          <Card
            className={css.getStartedInfraCard}
            onClick={() => setSelectedInfra(GetStartedInfraTypes.LOCAL)}
            selected={selectedInfra === GetStartedInfraTypes.LOCAL}
          >
            <Text font={{ variation: FontVariation.CARD_TITLE }} padding={{ top: 'large', bottom: 'xxxlarge' }}>
              {getString('ci.getStartedWithCI.runOnLocal')}
            </Text>
            <Text font={{ variation: FontVariation.SMALL }} padding={{ top: 'large', bottom: 'xxxlarge' }}>
              {getString('ci.getStartedWithCI.runOnLocalCard')}
            </Text>
            <Layout.Horizontal>
              {selectedInfra === GetStartedInfraTypes.LOCAL && (
                <Button
                  text={getString('continue')}
                  intent="primary"
                  rightIcon="chevron-right"
                  onClick={() => {
                    props.setShowLocalInfraSetup(true)
                    trackEvent(CIOnboardingActions.LocalRunnerSetup, {})
                  }}
                  variation={ButtonVariation.PRIMARY}
                />
              )}
              <Icon name="docker-grey" size={100} className={css.cardIcon} />
            </Layout.Horizontal>
          </Card>
        </Layout.Horizontal>
      </Container>
    </Layout.Vertical>
  )
}

interface LocalInfraOnboardingProps {
  accountId: string
  setShowLocalInfraSetup: (value: boolean) => void
  setShowCreditCardFlow: (value: boolean) => void
  setUseLocalRunnerInfra: (value: boolean) => void
  setLocalRunnerOsArch: (value: LocalRunnerOsArchTypes) => void
}

export const LocalInfraOnboarding = (props: LocalInfraOnboardingProps): React.ReactElement => {
  const { getString } = useStrings()
  const [verifyButtonClicked, setVerifyButtonClicked] = useState<boolean>(false)
  const [isLocalInfraVerified, setIsLocalInfraVerified] = useState<boolean>(false)
  const [isTestInfraEnabled, setIsTestInfraEnabled] = useState<boolean>(true)
  const [commandSnippet, setCommandSnippet] = useState<string>('')
  const [isFinishEnabled, setIsFinishEnabled] = useState<boolean>(false)

  const { showError } = useToaster()
  const { trackEvent } = useTelemetry()

  const {
    data: infraSnippet,
    loading,
    error
  } = useDockerRunnerCommand({
    queryParams: {
      accountId: props.accountId,
      os: 'linux',
      arch: 'amd64'
    }
  })

  useEffect(() => {
    infraSnippet?.resource && setCommandSnippet(infraSnippet?.resource)
  }, [infraSnippet])

  useEffect(() => {
    if (error) {
      showError(getErrorInfoFromErrorObject(error))
    }
  }, [error])

  return loading ? (
    <PageSpinner />
  ) : (
    <Layout.Vertical flex>
      <Container className={css.topPage}>
        <Text font={{ variation: FontVariation.H3 }} padding={{ top: 'xxxlarge', bottom: 'small' }}>
          {getString('ci.getStartedWithCI.setupInfra')}
        </Text>
        <Layout.Vertical spacing="small">
          <Layout.Horizontal className={css.numberedList} spacing={'medium'} padding={{ bottom: 'medium' }}>
            <div>
              <div className={css.bulletIndex}>{1}</div>
              <div className={css.line} />
            </div>
            <Layout.Vertical className={css.content}>
              <Layout.Horizontal padding={{ bottom: 'medium', left: 'medium' }}>
                <Text>{getString('ci.getStartedWithCI.installHarnessOnLocal')}</Text>
              </Layout.Horizontal>
              <Layout.Vertical padding={{ bottom: 'medium', left: 'medium' }}>
                <CommandBlock
                  ignoreWhiteSpaces={false}
                  commandSnippet={commandSnippet}
                  allowCopy={true}
                  telemetryProps={{
                    copyTelemetryProps: {
                      eventName: CIOnboardingActions.LocalRunnerSetupCopied,
                      properties: {}
                    }
                  }}
                />
              </Layout.Vertical>
            </Layout.Vertical>
          </Layout.Horizontal>
          <Layout.Horizontal className={css.numberedList} spacing={'medium'} padding={{ bottom: 'medium' }}>
            <div>
              <div className={css.bulletIndex}>{2}</div>
            </div>
            <Layout.Vertical className={css.content}>
              <Layout.Horizontal padding={{ bottom: 'medium', left: 'medium' }}>
                <Button
                  variation={ButtonVariation.SECONDARY}
                  text={getString('ci.getStartedWithCI.testInfra')}
                  minimal
                  size={ButtonSize.SMALL}
                  disabled={!isTestInfraEnabled}
                  onClick={() => setVerifyButtonClicked(true)}
                />
                {isLocalInfraVerified && (
                  <Text
                    padding={{ left: 'small', bottom: 'small' }}
                    iconProps={{ color: Color.GREEN_500 }}
                    icon="tick"
                    color={Color.GREEN_500}
                  >
                    {getString('ci.getStartedWithCI.infraSetupSuccess')}
                  </Text>
                )}
              </Layout.Horizontal>
              {verifyButtonClicked && (
                <VerifyDelegateConnection
                  onSuccessHandler={() => {
                    setIsLocalInfraVerified(true)
                    props.setUseLocalRunnerInfra(true)
                    setIsTestInfraEnabled(true)
                    setIsFinishEnabled(true)
                    trackEvent(CIOnboardingActions.LocalRunnerSetupSuccessful, {})
                    try {
                      getDelegateGroupByIdentifierPromise({
                        identifier: DefaultDockerDelegateIdentifier,
                        queryParams: { accountId: props.accountId }
                      }).then((response: RestResponseDelegateGroupDetails) => {
                        if (response?.resource) {
                          const OsArch = getOsArchFromDelegateTags(response.resource)
                          props.setLocalRunnerOsArch(OsArch)
                        }
                      })
                    } catch (e) {
                      // ignore error
                    }
                  }}
                  onErrorHandler={() => {
                    setIsLocalInfraVerified(false)
                    props.setUseLocalRunnerInfra(true)
                    setIsTestInfraEnabled(true)
                    setIsFinishEnabled(true)
                  }}
                  onDone={noop}
                  name={'docker-delegate'}
                  delegateType={DelegateCommonProblemTypes.DOCKER}
                  showDoneButton={false}
                  verificationInProgressLabel={'delegate.successVerification.checkDelegateInstalled'}
                  onVerificationStart={() => setIsTestInfraEnabled(false)}
                  showDelegateErrorPanel={false}
                />
              )}
              {isFinishEnabled && (
                <Text padding={{ top: 'small', left: 'medium' }}>{getString('ci.getStartedWithCI.setupFinish')}</Text>
              )}
            </Layout.Vertical>
          </Layout.Horizontal>
        </Layout.Vertical>
        <Layout.Horizontal spacing="medium" padding={{ top: 'large' }} className={css.footer} width="100%">
          <Button
            variation={ButtonVariation.SECONDARY}
            text={getString('back')}
            icon="chevron-left"
            minimal
            onClick={() => props.setShowLocalInfraSetup(false)}
          />
          <Button
            text={getString('finish')}
            variation={ButtonVariation.PRIMARY}
            rightIcon="chevron-right"
            onClick={() => {
              props.setUseLocalRunnerInfra(true)
              props.setShowCreditCardFlow(false)
              props.setShowLocalInfraSetup(false)
            }}
            disabled={!isFinishEnabled}
          />
        </Layout.Horizontal>
      </Container>
    </Layout.Vertical>
  )
}
