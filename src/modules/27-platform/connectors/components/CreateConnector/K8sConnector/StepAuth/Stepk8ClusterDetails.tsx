/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import {
  StepProps,
  Layout,
  Text,
  Container,
  FormInput,
  Formik,
  Button,
  SelectOption,
  ButtonVariation,
  PageSpinner,
  ThumbnailSelect
} from '@harness/uicore'
import React, { useState, useEffect } from 'react'
import * as Yup from 'yup'
import { FontVariation, Color } from '@harness/design-system'
import type { FormikProps } from 'formik'
import type { ConnectorInfoDTO, ConnectorRequestBody, ConnectorConfigDTO } from 'services/cd-ng'
import SecretInput from '@secrets/components/SecretInput/SecretInput'
import { setupKubFormData, DelegateCardInterface } from '@platform/connectors/pages/connectors/utils/ConnectorUtils'
import { DelegateTypes } from '@common/components/ConnectivityMode/ConnectivityMode'
import type { SecretReferenceInterface } from '@secrets/utils/SecretField'
import { useStrings } from 'framework/strings'
import { useTelemetry, useTrackEvent } from '@common/hooks/useTelemetry'
import { Category, ConnectorActions } from '@common/constants/TrackingConstants'
import { Connectors } from '@platform/connectors/constants'
import { AuthTypes } from '@platform/connectors/pages/connectors/utils/ConnectorHelper'
import TextReference, { ValueType, TextReferenceInterface } from '@secrets/components/TextReference/TextReference'
import { URLValidationSchema } from '@common/utils/Validation'
import type { ScopedObjectDTO } from '@common/components/EntityReference/EntityReference'
import { useConnectorWizard } from '../../../CreateConnectorWizard/ConnectorWizardContext'
import css from './Stepk8ClusterDetails.module.scss'

interface Stepk8ClusterDetailsProps extends ConnectorInfoDTO {
  name: string
}

interface K8ClusterDetailsProps {
  onConnectorCreated: (data?: ConnectorRequestBody) => void | Promise<void>
  hideModal: () => void
  isEditMode: boolean
  setIsEditMode: (val: boolean) => void
  setFormData?: (formData: ConnectorConfigDTO) => void
  connectorInfo: ConnectorInfoDTO | void
  accountId: string
  orgIdentifier: string
  projectIdentifier: string
}

interface KubeFormInterface {
  delegateType?: string
  authType: string
  username: TextReferenceInterface | void
  password: SecretReferenceInterface | void
  serviceAccountToken: SecretReferenceInterface | void
  oidcIssuerUrl: string
  oidcUsername: TextReferenceInterface | void
  oidcPassword: SecretReferenceInterface | void
  oidcCleintId: SecretReferenceInterface | void
  oidcCleintSecret: SecretReferenceInterface | void
  oidcScopes: string
  clientKey: SecretReferenceInterface | void
  clientKeyPassphrase: SecretReferenceInterface | void
  clientKeyCertificate: SecretReferenceInterface | void
  clientKeyAlgo: string
  clientKeyCACertificate: SecretReferenceInterface | void
  delegateSelectors: Array<string>
  skipDefaultValidation: boolean
}

const defaultInitialFormData: KubeFormInterface = {
  authType: AuthTypes.USER_PASSWORD,
  username: undefined,
  password: undefined,
  serviceAccountToken: undefined,
  oidcIssuerUrl: '',
  oidcUsername: undefined,
  oidcPassword: undefined,
  oidcCleintId: undefined,
  oidcCleintSecret: undefined,
  oidcScopes: '',
  clientKey: undefined,
  clientKeyCertificate: undefined,
  clientKeyPassphrase: undefined,
  clientKeyAlgo: '',
  clientKeyCACertificate: undefined,
  delegateSelectors: [],
  skipDefaultValidation: false
}

interface AuthOptionInterface {
  label: string
  value: string
}

enum CLIENT_KEY_ALGO {
  RSA = 'RSA',
  EC = 'EC'
}

const CLIENT_KEY_ALGO_OPTIONS: SelectOption[] = [
  {
    label: CLIENT_KEY_ALGO.RSA,
    value: CLIENT_KEY_ALGO.RSA
  },
  {
    label: CLIENT_KEY_ALGO.EC,
    value: CLIENT_KEY_ALGO.EC
  }
]

const RenderK8AuthForm: React.FC<FormikProps<KubeFormInterface> & { isEditMode: boolean } & ScopedObjectDTO> =
  props => {
    const { orgIdentifier, projectIdentifier } = props
    const { getString } = useStrings()
    const scope = props.isEditMode ? { orgIdentifier, projectIdentifier } : undefined

    switch (props.values.authType) {
      case AuthTypes.USER_PASSWORD:
        return (
          <Container width={'42%'}>
            <TextReference
              name="username"
              stringId="username"
              type={props.values.username ? props.values.username?.type : ValueType.TEXT}
            />
            <SecretInput name={'password'} label={getString('password')} scope={scope} />
          </Container>
        )
      case AuthTypes.SERVICE_ACCOUNT:
        return (
          <Container className={css.formFieldWidth}>
            <SecretInput
              name={'serviceAccountToken'}
              label={getString('platform.connectors.k8.serviceAccountToken')}
              scope={scope}
            />
            <SecretInput
              name={'clientKeyCACertificate'}
              label={getString('platform.connectors.k8.clientKeyCACertificate')}
              scope={scope}
            />
          </Container>
        )
      case AuthTypes.OIDC:
        return (
          <>
            <FormInput.Text
              name="oidcIssuerUrl"
              label={getString('platform.connectors.k8.OIDCIssuerUrl')}
              className={css.formFieldWidth}
            />
            <Container flex={{ justifyContent: 'flex-start' }}>
              <Container width={'42%'}>
                <TextReference
                  name="oidcUsername"
                  stringId="platform.connectors.k8.OIDCUsername"
                  type={props.values.oidcUsername ? props.values.oidcUsername.type : ValueType.TEXT}
                />

                <SecretInput
                  name={'oidcPassword'}
                  label={getString('platform.connectors.k8.OIDCPassword')}
                  scope={scope}
                />
              </Container>

              <Container width={'42%'} margin={{ top: 'medium', left: 'xxlarge' }}>
                <SecretInput
                  name={'oidcCleintId'}
                  label={getString('platform.connectors.k8.OIDCClientId')}
                  scope={scope}
                />
                <SecretInput
                  name={'oidcCleintSecret'}
                  label={getString('platform.connectors.k8.clientSecretOptional')}
                  scope={scope}
                />
              </Container>
            </Container>

            <FormInput.Text
              name="oidcScopes"
              label={getString('platform.connectors.k8.OIDCScopes')}
              className={css.formFieldWidth}
            />
          </>
        )

      case AuthTypes.CLIENT_KEY_CERT:
        return (
          <>
            <Container flex={{ justifyContent: 'flex-start' }}>
              <Container className={css.formFieldWidth}>
                <SecretInput name={'clientKey'} label={getString('platform.connectors.k8.clientKey')} scope={scope} />
                <SecretInput
                  name={'clientKeyCertificate'}
                  label={getString('platform.connectors.k8.clientCertificate')}
                  scope={scope}
                />
              </Container>

              <Container className={css.formFieldWidth} margin={{ left: 'xxlarge' }}>
                <SecretInput
                  name={'clientKeyPassphrase'}
                  label={getString('platform.connectors.k8.clientKeyPassphrase')}
                  scope={scope}
                />
                <FormInput.Select
                  items={CLIENT_KEY_ALGO_OPTIONS}
                  name="clientKeyAlgo"
                  label={getString('platform.connectors.k8.clientKeyAlgorithm')}
                  value={
                    // If we pass the value as undefined, formik will kick in and value will be updated as per uicore logic
                    // If we've added a custom value, then just add it as a label value pair
                    CLIENT_KEY_ALGO_OPTIONS.find(opt => opt.value === props.values.clientKeyAlgo)
                      ? undefined
                      : { label: props.values.clientKeyAlgo, value: props.values.clientKeyAlgo }
                  }
                  selectProps={{
                    allowCreatingNewItems: true,
                    inputProps: {
                      placeholder: getString('platform.connectors.k8.clientKeyAlgorithmPlaceholder')
                    }
                  }}
                />
              </Container>
            </Container>
            <Container className={css.formFieldWidth}>
              <SecretInput
                name={'clientKeyCACertificate'}
                label={getString('platform.connectors.k8.clientKeyCACertificate')}
                scope={scope}
              />
            </Container>
          </>
        )
      default:
        return null
    }
  }

const Stepk8ClusterDetails: React.FC<StepProps<Stepk8ClusterDetailsProps> & K8ClusterDetailsProps> = props => {
  const { accountId, prevStepData, nextStep } = props
  const { getString } = useStrings()

  const DelegateCards: DelegateCardInterface[] = [
    {
      type: DelegateTypes.DELEGATE_OUT_CLUSTER,
      info: getString('platform.connectors.k8.delegateOutClusterInfo'),
      icon: 'app-kubernetes'
    },
    {
      type: DelegateTypes.DELEGATE_IN_CLUSTER,
      info: getString('platform.connectors.k8.delegateInClusterInfo'),
      icon: 'delegates-blue'
    }
  ]

  const authOptions: Array<AuthOptionInterface> = [
    {
      label: getString('usernamePassword'),
      value: AuthTypes.USER_PASSWORD
    },
    {
      label: getString('serviceAccount'),
      value: AuthTypes.SERVICE_ACCOUNT
    },
    {
      label: getString('platform.connectors.k8.authLabels.OIDC'),
      value: AuthTypes.OIDC
    },
    {
      label: getString('platform.connectors.k8.authLabels.clientKeyCertificate'),
      value: AuthTypes.CLIENT_KEY_CERT
    }
  ]

  const validationSchema = Yup.object().shape({
    //todo: add validation for delegate

    masterUrl: Yup.string()
      .nullable()
      .when('delegateType', {
        is: delegateType => delegateType === DelegateTypes.DELEGATE_OUT_CLUSTER,
        then: URLValidationSchema(getString, { requiredMessage: getString('validation.masterUrl') })
      }),
    delegateType: Yup.string().required(
      getString('platform.connectors.chooseMethodForConnection', {
        name: getString('platform.connectors.k8sConnection')
      })
    ),
    authType: Yup.string()
      .nullable()
      .when('delegateType', {
        is: delegateType => delegateType === DelegateTypes.DELEGATE_OUT_CLUSTER,
        then: Yup.string().required(getString('validation.authType'))
      }),
    usernametextField: Yup.string()
      .nullable()
      .when('authType', {
        is: authType => authType === AuthTypes.USER_PASSWORD,
        then: Yup.string().required(getString('validation.username'))
      }),
    password: Yup.object().when('authType', {
      is: authType => authType === AuthTypes.USER_PASSWORD,
      then: Yup.object().required(getString('validation.password')),
      otherwise: Yup.object().nullable()
    }),
    serviceAccountToken: Yup.object().when('authType', {
      is: authType => authType === AuthTypes.SERVICE_ACCOUNT,
      then: Yup.object().required(getString('validation.serviceAccountToken')),
      otherwise: Yup.object().nullable()
    }),
    oidcIssuerUrl: Yup.string().when('authType', {
      is: authType => authType === AuthTypes.OIDC,
      then: Yup.string().required(getString('validation.OIDCIssuerUrl')),
      otherwise: Yup.string().nullable()
    }),
    oidcUsername: Yup.string()
      .nullable()
      .when('authType', {
        is: authType => authType === AuthTypes.OIDC,
        then: Yup.string().required(getString('validation.OIDCUsername'))
      }),
    oidcPassword: Yup.object().when('authType', {
      is: authType => authType === AuthTypes.OIDC,
      then: Yup.object().required(getString('validation.OIDCPassword')),
      otherwise: Yup.object().nullable()
    }),
    oidcCleintId: Yup.object().when('authType', {
      is: authType => authType === AuthTypes.OIDC,
      then: Yup.object().required(getString('validation.OIDCClientId')),
      otherwise: Yup.object().nullable()
    }),
    clientKey: Yup.object().when('authType', {
      is: authType => authType === AuthTypes.CLIENT_KEY_CERT,
      then: Yup.object().required(getString('validation.clientKey')),
      otherwise: Yup.object().nullable()
    }),

    clientKeyCertificate: Yup.object().when('authType', {
      is: authType => authType === AuthTypes.CLIENT_KEY_CERT,
      then: Yup.object().required(getString('validation.clientCertificate')),
      otherwise: Yup.object().nullable()
    }),
    clientKeyAlgo: Yup.string()
      .nullable()
      .when('authType', {
        is: authType => authType === AuthTypes.CLIENT_KEY_CERT,
        then: Yup.string().required(getString('platform.connectors.k8.validation.clientKeyAlgo'))
      })
  })

  const [initialValues, setInitialValues] = useState(defaultInitialFormData)
  const [loadingConnectorSecrets, setLoadingConnectorSecrets] = useState(true && props.isEditMode)

  useEffect(() => {
    if (loadingConnectorSecrets) {
      if (props.isEditMode) {
        if (props.connectorInfo) {
          setupKubFormData(props.connectorInfo, accountId).then(data => {
            setInitialValues(data as KubeFormInterface)
            setLoadingConnectorSecrets(false)
          })
        } else {
          setLoadingConnectorSecrets(false)
        }
      }
    }
  }, [loadingConnectorSecrets])

  const handleSubmit = (formData: ConnectorConfigDTO): void => {
    trackEvent(ConnectorActions.DetailsStepSubmit, {
      category: Category.CONNECTOR,
      connector_type: Connectors.K8
    })
    nextStep?.({
      ...props.connectorInfo,
      ...prevStepData,
      ...formData,
      ...(typeof formData.masterUrl === 'string' && { masterUrl: formData.masterUrl.trim() })
    } as Stepk8ClusterDetailsProps)
  }
  useConnectorWizard({ helpPanel: { referenceId: 'KubernetesConnectorDetails', contentWidth: 1100 } })
  const { trackEvent } = useTelemetry()

  useTrackEvent(ConnectorActions.DetailsStepLoad, {
    category: Category.CONNECTOR,
    connector_type: Connectors.K8
  })

  return loadingConnectorSecrets ? (
    <PageSpinner />
  ) : (
    <Layout.Vertical spacing="medium" className={css.secondStep}>
      <Text
        font={{ variation: FontVariation.H3 }}
        color={Color.BLACK}
        tooltipProps={{ dataTooltipId: 'K8sConnectorDetails' }}
      >
        {getString('details')}
      </Text>
      <Text font={{ variation: FontVariation.H6, weight: 'semi-bold' }} color={Color.GREY_600}>
        {getString('platform.connectors.k8.delegateSelector')}
      </Text>
      <Formik
        initialValues={{
          ...initialValues,
          ...props.prevStepData
        }}
        validationSchema={validationSchema}
        formName="k8ClusterForm"
        onSubmit={handleSubmit}
      >
        {formikProps => (
          <>
            <Container className={css.clusterWrapper}>
              <ThumbnailSelect
                items={DelegateCards.map(card => ({
                  label: (
                    <Text
                      font={{ size: 'small', weight: 'bold' }}
                      icon={card.icon}
                      iconProps={{ size: 23, margin: { right: 'xsmall' } }}
                    >
                      {card.info}
                    </Text>
                  ),
                  value: card.type
                }))}
                name="delegateType"
                size="large"
                onChange={type => {
                  formikProps?.setFieldValue('delegateType', type)
                  formikProps?.setFieldValue(
                    'authType',
                    type === DelegateTypes.DELEGATE_OUT_CLUSTER ? AuthTypes.USER_PASSWORD : ''
                  )
                }}
                className={css.delegateCard}
              />

              {DelegateTypes.DELEGATE_OUT_CLUSTER === formikProps.values.delegateType ? (
                <>
                  <FormInput.Text
                    label={getString('platform.connectors.k8.masterUrlLabel')}
                    placeholder={getString('UrlLabel')}
                    name="masterUrl"
                    className={css.formFieldWidth}
                  />

                  <Container className={css.authHeaderRow}>
                    <Text
                      font={{ variation: FontVariation.H6 }}
                      inline
                      tooltipProps={{ dataTooltipId: 'K8sAuthenticationTooltip' }}
                    >
                      {getString('authentication')}
                    </Text>
                    <FormInput.DropDown
                      name="authType"
                      items={authOptions}
                      disabled={false}
                      dropDownProps={{
                        isLabel: true,
                        filterable: false,
                        minWidth: 'unset'
                      }}
                    />
                  </Container>

                  <RenderK8AuthForm
                    {...formikProps}
                    isEditMode={props.isEditMode}
                    orgIdentifier={prevStepData?.orgIdentifier}
                    projectIdentifier={prevStepData?.projectIdentifier}
                  />
                </>
              ) : (
                <></>
              )}
            </Container>
            <Layout.Horizontal padding={{ top: 'small' }} spacing="medium">
              <Button
                text={getString('back')}
                icon="chevron-left"
                variation={ButtonVariation.SECONDARY}
                onClick={() => props?.previousStep?.(props?.prevStepData)}
                data-name="k8sBackButton"
              />
              <Button
                type="submit"
                variation={ButtonVariation.PRIMARY}
                text={getString('continue')}
                rightIcon="chevron-right"
                onClick={formikProps.submitForm}
                margin={{ left: 'medium' }}
              />
            </Layout.Horizontal>
          </>
        )}
      </Formik>
    </Layout.Vertical>
  )
}

export default Stepk8ClusterDetails