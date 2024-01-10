/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import cx from 'classnames'
import { get } from 'lodash-es'
import {
  Text,
  Icon,
  Layout,
  Button,
  ButtonVariation,
  IconName,
  Container,
  ButtonSize,
  PageSpinner,
  useToaster,
  getErrorInfoFromErrorObject
} from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import type { IconProps } from '@harness/icons'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import {
  ConnectorFilterProperties,
  ConnectorInfoDTO,
  ConnectorResponse,
  getSecretV2Promise,
  ResponsePageConnectorResponse,
  ResponseSecretResponseWrapper,
  SecretDTOV2,
  useGetConnectorListV2,
  useHasAValidCard
} from 'services/cd-ng'
import { useGetAccountTrustLevel } from 'services/portal'
import { useStrings } from 'framework/strings'
import { isFreePlan, useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { ModuleName } from 'framework/types/ModuleName'
import type { StringsMap } from 'stringTypes'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { Status } from '@common/utils/Constants'
import { getIdentifierFromValue } from '@common/components/EntityReference/EntityReference'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { CIOnboardingActions } from '@common/constants/TrackingConstants'
import { Connectors } from '@platform/connectors/constants'
import { useCreditCardWidget } from '@platform/auth-settings/pages/Billing/CreditCardWidget'
import { InfraProvisioningWizard } from './InfraProvisioningWizard/InfraProvisioningWizard'
import { InfraProvisiongWizardStepId, LocalRunnerOsArchTypes } from './InfraProvisioningWizard/Constants'
import { sortConnectorsByLastConnectedAtTsDescOrder } from '../../utils/HostedBuildsUtils'
import { CreditCardOnboarding, LocalInfraOnboarding } from './GetStartedWithCICreditCard'

import buildImgURL from './build.svg'
import css from './GetStartedWithCI.module.scss'

export enum GetStartedInfraTypes {
  HOSTED = 'HOSTED',
  LOCAL = 'LOCAL'
}

export default function GetStartedWithCI(): React.ReactElement {
  const { trackEvent } = useTelemetry()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { getString } = useStrings()
  const { CODE_ENABLED, CI_CREDIT_CARD_ONBOARDING } = useFeatureFlags()
  const [showWizard, setShowWizard] = useState<boolean>(false)
  const [preSelectedGitConnector, setPreselectedGitConnector] = useState<ConnectorInfoDTO>()
  const [connectorsEligibleForPreSelection, setConnectorsEligibleForPreSelection] = useState<ConnectorInfoDTO[]>()
  const [secretForPreSelectedConnector, setSecretForPreSelectedConnector] = useState<SecretDTOV2>()
  const { mutate: fetchGitConnectors, loading: fetchingGitConnectors } = useGetConnectorListV2({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      includeAllConnectorsAvailableAtScope: true
    }
  })
  const [isFetchingSecret, setIsFetchingSecret] = useState<boolean>()
  const scrollRef = useRef<Element>()
  const { showError } = useToaster()

  const [showCreditCardFlow, setShowCreditCardFlow] = useState<boolean>(false)
  const [showLocalInfraSetup, setShowLocalInfraSetup] = useState<boolean>(false)
  const [useLocalRunnerInfra, setUseLocalRunnerInfra] = useState<boolean>(false)
  const [localRunnerOsArch, setLocalRunnerOsArch] = useState<LocalRunnerOsArchTypes>()
  const [creditCardModalOpenedOnce, setCreditCardModalOpenedOnce] = useState<boolean>(false)
  const { licenseInformation } = useLicenseStore()
  const isFreeEdition = isFreePlan(licenseInformation, ModuleName.CI)

  const dummyGitnessHarnessConnector: ConnectorInfoDTO = {
    accountIdentifier: accountId,
    description: '',
    identifier: 'Gitness-Harness',
    name: getString('harness'),
    orgIdentifier: orgIdentifier,
    projectIdentifier: projectIdentifier,
    spec: {},
    type: Connectors.Harness
  }

  const {
    data: validCard,
    loading: fetchingCards,
    refetch: refetchValidCard,
    error
  } = useHasAValidCard({
    queryParams: { accountIdentifier: accountId }
  })

  const { openSubscribeModal } = useCreditCardWidget({
    onClose: () => {
      refetchValidCard()
      trackEvent(CIOnboardingActions.CreditCardValidated, {})
    }
  })

  const openCreditCardModal = () => {
    openSubscribeModal()
    setCreditCardModalOpenedOnce(true)
  }

  useEffect(() => {
    if (error) {
      showError(getErrorInfoFromErrorObject(error))
    }
  }, [error])

  const { data: trustLevelData, loading: fetchingTrustLevel } = useGetAccountTrustLevel({
    queryParams: { accountId: accountId }
  })

  useEffect(() => {
    if (
      CI_CREDIT_CARD_ONBOARDING &&
      isFreeEdition &&
      (trustLevelData?.resource === 0 || trustLevelData?.resource === -1) &&
      !fetchingTrustLevel &&
      !fetchingCards &&
      !validCard?.data?.hasAtleastOneValidCreditCard
    ) {
      setShowCreditCardFlow(true)
    } else {
      setShowCreditCardFlow(false)
    }
  }, [validCard, trustLevelData, fetchingCards, fetchingTrustLevel])

  useEffect(() => {
    if (creditCardModalOpenedOnce && validCard?.data?.hasAtleastOneValidCreditCard) {
      trackEvent(CIOnboardingActions.ValidCreditCardEntered, {})
    } else if (creditCardModalOpenedOnce && !validCard?.data?.hasAtleastOneValidCreditCard) {
      trackEvent(CIOnboardingActions.InvalidCreditCardEntered, {})
    }
  }, [validCard])

  useEffect(() => {
    if (showWizard) {
      fetchGitConnectors({
        types: [Connectors.GITHUB, Connectors.GITLAB, Connectors.BITBUCKET],
        connectivityStatuses: [Status.SUCCESS],
        filterType: 'Connector'
      } as ConnectorFilterProperties).then((response: ResponsePageConnectorResponse) => {
        const { status, data } = response
        if (status === Status.SUCCESS && Array.isArray(data?.content) && data?.content && data.content.length > 0) {
          const connectors = data.content
          const filteredConnectors = connectors.filter(connector => connector?.connector?.spec?.type !== 'Repo')
          const connectorsListForSelection = connectors.map(
            (item: ConnectorResponse) => item.connector
          ) as ConnectorInfoDTO[]
          const filteredConnectorsListForSelection = connectorsListForSelection.filter(
            connector => connector?.spec?.type !== 'Repo'
          )
          if (CODE_ENABLED) {
            filteredConnectorsListForSelection.unshift(dummyGitnessHarnessConnector)
          }
          setConnectorsEligibleForPreSelection(filteredConnectorsListForSelection)
          const sortedConnectors = sortConnectorsByLastConnectedAtTsDescOrder(filteredConnectors)
          const selectedConnector =
            sortedConnectors.find(
              (item: ConnectorResponse) =>
                get(item, 'connector.spec.apiAccess.spec.tokenRef') && item.status?.status === Status.SUCCESS
            ) || sortedConnectors[0]
          if (selectedConnector?.connector) {
            setPreselectedGitConnector(selectedConnector?.connector)
            const secretIdentifier = getIdentifierFromValue(
              get(selectedConnector, 'connector.spec.apiAccess.spec.tokenRef')
            )
            if (secretIdentifier) {
              setIsFetchingSecret(true)
              try {
                getSecretV2Promise({
                  identifier: secretIdentifier,
                  queryParams: {
                    accountIdentifier: accountId
                  }
                })
                  .then((secretResponse: ResponseSecretResponseWrapper) => {
                    setIsFetchingSecret(false)
                    const { status: fetchSecretStatus, data: secretResponseData } = secretResponse
                    if (fetchSecretStatus === Status.SUCCESS && secretResponseData?.secret) {
                      setSecretForPreSelectedConnector(secretResponseData?.secret)
                    }
                  })
                  .catch(_e => {
                    setIsFetchingSecret(false)
                  })
              } catch (e) {
                setIsFetchingSecret(false)
              }
            }
          }
        } else if (CODE_ENABLED) {
          setConnectorsEligibleForPreSelection([dummyGitnessHarnessConnector])
        }
      })
    }
  }, [showWizard])

  const renderBuildPipelineStep = React.useCallback(
    ({ iconProps, label, isLastStep }: { iconProps: IconProps; label: keyof StringsMap; isLastStep?: boolean }) => (
      <Layout.Horizontal flex padding={{ right: 'xsmall' }} spacing="xsmall">
        <Icon name={iconProps.name} size={iconProps.size} className={iconProps.className} />
        <Text font={{ variation: FontVariation.TINY }} padding={{ left: 'xsmall', right: 'xsmall' }}>
          {getString(label)}
        </Text>
        {!isLastStep ? <Icon name="arrow-right" size={10} className={css.arrow} /> : null}
      </Layout.Horizontal>
    ),
    []
  )

  const CI_CATALOGUE_ITEMS: { icon: IconName; label: keyof StringsMap; helptext: keyof StringsMap }[][] = [
    [
      {
        icon: 'ci-ti',
        label: 'ci.getStartedWithCI.ti',
        helptext: 'ci.getStartedWithCI.tiHelpText'
      },
      {
        icon: 'ci-infra-support',
        label: 'ci.getStartedWithCI.flexibleInfra',
        helptext: 'ci.getStartedWithCI.flexibleInfraHelpText'
      }
    ],
    [
      {
        icon: 'ci-language',
        label: 'ci.getStartedWithCI.languageAgnostic',
        helptext: 'ci.getStartedWithCI.languageAgnosticHelpText'
      },
      {
        icon: 'ci-dev-exp',
        label: 'ci.getStartedWithCI.devFriendly',
        helptext: 'ci.getStartedWithCI.devFriendlyHelpText'
      }
    ],
    [
      {
        icon: 'ci-parameterization',
        label: 'ci.getStartedWithCI.parameterization',
        helptext: 'ci.getStartedWithCI.parameterizationHelpText'
      },
      {
        icon: 'ci-gov',
        label: 'ci.getStartedWithCI.security',
        helptext: 'ci.getStartedWithCI.securityHelpText'
      }
    ],
    [
      {
        icon: 'ci-execution',
        label: 'ci.getStartedWithCI.parallelization',
        helptext: 'ci.getStartedWithCI.parallelizationHelpText'
      },
      {
        icon: 'ci-integrated',
        label: 'ci.getStartedWithCI.integratedCICD',
        helptext: 'ci.getStartedWithCI.integratedCICDHelpText'
      }
    ]
  ]

  const renderCatalogueItem = React.useCallback(
    ({ icon, label, helptext }: { icon: IconName; label: keyof StringsMap; helptext: keyof StringsMap }) => (
      <Layout.Vertical
        key={label}
        width="45%"
        margin={{ left: 'huge', right: 'huge' }}
        padding={{ left: 'medium', right: 'medium' }}
      >
        <Icon name={icon} size={50} />
        <Text font={{ variation: FontVariation.CARD_TITLE }}>{getString(label)}</Text>
        <Text font={{ variation: FontVariation.SMALL }}>{getString(helptext)}</Text>
      </Layout.Vertical>
    ),
    []
  )

  const Divider = <div className={css.divider}></div>

  const showPageLoader = fetchingGitConnectors || isFetchingSecret || fetchingCards || fetchingTrustLevel

  return (
    <Container className={css.main}>
      {showWizard && !showPageLoader ? (
        <InfraProvisioningWizard
          precursorData={{
            preSelectedGitConnector,
            connectorsEligibleForPreSelection,
            secretForPreSelectedConnector
          }}
          lastConfiguredWizardStepId={
            preSelectedGitConnector
              ? InfraProvisiongWizardStepId.SelectRepository
              : InfraProvisiongWizardStepId.SelectGitProvider
          }
          dummyGitnessHarnessConnector={dummyGitnessHarnessConnector}
          useLocalRunnerInfra={useLocalRunnerInfra}
          localRunnerOsArch={localRunnerOsArch}
        />
      ) : (
        <>
          {showCreditCardFlow && !showLocalInfraSetup && !showPageLoader ? (
            <CreditCardOnboarding
              setShowLocalInfraSetup={setShowLocalInfraSetup}
              openCreditCardModal={openCreditCardModal}
            />
          ) : showLocalInfraSetup ? (
            <LocalInfraOnboarding
              accountId={accountId}
              setShowLocalInfraSetup={setShowLocalInfraSetup}
              setShowCreditCardFlow={setShowCreditCardFlow}
              setUseLocalRunnerInfra={setUseLocalRunnerInfra}
              setLocalRunnerOsArch={setLocalRunnerOsArch}
            />
          ) : (
            <Layout.Vertical flex>
              <Container className={css.topPage}>
                <Container className={css.buildYourOwnPipeline}>
                  <Container>
                    <Layout.Horizontal flex className={css.ciLogo}>
                      <Icon name="ci-main" size={42} />
                      <Layout.Vertical flex padding={{ left: 'xsmall' }}>
                        <Text font={{ variation: FontVariation.BODY2 }} className={css.label}>
                          {getString('common.purpose.ci.continuousLabel')}
                        </Text>
                        <Text font={{ variation: FontVariation.BODY2 }} className={css.label}>
                          {getString('common.purpose.ci.integration')}
                        </Text>
                      </Layout.Vertical>
                    </Layout.Horizontal>
                  </Container>
                  <Layout.Vertical>
                    <Text font={{ variation: FontVariation.H2 }}>{getString('common.getStarted.firstPipeline')}</Text>
                    <Text font={{ variation: FontVariation.SMALL }} padding={{ top: 'small' }}>
                      {getString('common.purpose.ci.descriptionOnly')}
                    </Text>
                    <Layout.Horizontal padding={{ top: 'xxlarge', bottom: 'huge' }}>
                      {renderBuildPipelineStep({
                        iconProps: { name: 'scm', size: 18, className: cx(css.icon, css.paddingXSmall) },
                        label: 'common.connectGitRepo'
                      })}
                      {renderBuildPipelineStep({
                        iconProps: {
                          name: 'repository',
                          size: 14,
                          className: cx(css.icon, css.iconPadding)
                        },
                        label: 'common.selectRepository'
                      })}
                      {renderBuildPipelineStep({
                        iconProps: {
                          name: 'ci-build-pipeline',
                          size: 20,
                          className: cx(css.icon, css.iconPaddingSmall)
                        },
                        label: 'common.getStarted.buildPipeline',
                        isLastStep: true
                      })}
                    </Layout.Horizontal>
                    <Container className={css.buttonRow}>
                      <Button
                        variation={ButtonVariation.PRIMARY}
                        size={ButtonSize.LARGE}
                        text={getString('getStarted')}
                        onClick={() => {
                          try {
                            if (creditCardModalOpenedOnce && validCard?.data?.hasAtleastOneValidCreditCard) {
                              trackEvent(CIOnboardingActions.GetStartedWithValidCardClicked, {})
                            } else if (useLocalRunnerInfra) {
                              trackEvent(CIOnboardingActions.GetStartedWithLocalRunnerClicked, {})
                            } else {
                              trackEvent(CIOnboardingActions.GetStartedClicked, {})
                            }
                          } catch (e) {
                            // ignore error
                          }
                          setShowWizard(true)
                        }}
                      />
                    </Container>
                  </Layout.Vertical>
                  <img
                    className={css.buildImg}
                    title={getString('common.getStarted.buildPipeline')}
                    src={buildImgURL}
                    width={413}
                    height={260}
                  />
                </Container>
                <Container className={css.learnMore}>
                  <Button
                    variation={ButtonVariation.SECONDARY}
                    round
                    rightIcon="double-chevron-down"
                    iconProps={{ size: 12 }}
                    text={getString('ci.getStartedWithCI.learnMoreAboutCI')}
                    onClick={() => {
                      // Note: Without setTimeout, scrollIntoView does not work!
                      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 0)
                    }}
                  />
                </Container>
              </Container>
              <Container ref={scrollRef}>
                <Layout.Horizontal flex padding={{ top: 'huge' }}>
                  <Icon name="ci-main" size={42} />
                  <Layout.Vertical flex padding={{ left: 'xsmall' }}>
                    <Text font={{ variation: FontVariation.H5 }} className={css.label}>
                      {getString('common.purpose.ci.continuousLabel')}
                    </Text>
                    <Text font={{ variation: FontVariation.H5 }} className={css.label}>
                      {getString('common.purpose.ci.integration')}
                    </Text>
                  </Layout.Vertical>
                </Layout.Horizontal>
              </Container>
              <Text
                font={{ variation: FontVariation.H3 }}
                className={css.nextLevel}
                padding={{ top: 'large', bottom: 'xxxlarge' }}
              >
                {getString('ci.getStartedWithCI.takeToTheNextLevel')}
              </Text>
              {Divider}
              <Layout.Vertical width="70%" padding={{ top: 'huge', bottom: 'xxlarge' }}>
                {CI_CATALOGUE_ITEMS.map(
                  (item: { icon: IconName; label: keyof StringsMap; helptext: keyof StringsMap }[], index: number) => {
                    return (
                      <Layout.Horizontal padding="xlarge" key={index}>
                        {renderCatalogueItem(item[0])}
                        {renderCatalogueItem(item[1])}
                      </Layout.Horizontal>
                    )
                  }
                )}
              </Layout.Vertical>
              {Divider}
              <Container padding={{ top: 'xxxlarge', bottom: 'huge' }}>
                <Button
                  variation={ButtonVariation.PRIMARY}
                  href="https://docs.harness.io/category/zgffarnh1m-ci-category"
                  target="_blank"
                >
                  {getString('pipeline.createPipeline.learnMore')}
                </Button>
              </Container>
            </Layout.Vertical>
          )}
        </>
      )}
      {showPageLoader ? <PageSpinner /> : <></>}
    </Container>
  )
}
