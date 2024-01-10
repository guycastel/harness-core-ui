/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Layout, Button, Formik, FormInput, Text, StepProps, ButtonVariation } from '@harness/uicore'
import * as Yup from 'yup'
import cx from 'classnames'
import { Color, FontVariation } from '@harness/design-system'
import { useStrings } from 'framework/strings'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { setupAWSFormData } from '@platform/connectors/pages/connectors/utils/ConnectorUtils'
import { CredentialType, DelegateTypes } from '@common/components/ConnectivityMode/ConnectivityMode'
import type { SecretReferenceInterface } from '@secrets/utils/SecretField'
import { PageSpinner } from '@common/components'
import type { ConnectorConfigDTO, ConnectorInfoDTO } from 'services/cd-ng'
import SecretInput from '@secrets/components/SecretInput/SecretInput'
import TextReference, { TextReferenceInterface, ValueType } from '@secrets/components/TextReference/TextReference'
import type { ConnectorDetailsProps } from '@platform/connectors/interfaces/ConnectorInterface'
import { useTelemetry, useTrackEvent } from '@common/hooks/useTelemetry'
import { Category, ConnectorActions } from '@common/constants/TrackingConstants'
import { Connectors } from '@platform/connectors/constants'
import type { ScopedObjectDTO } from '@common/components/EntityReference/EntityReference'
import { useConnectorWizard } from '../../../CreateConnectorWizard/ConnectorWizardContext'
import { shouldHideHeaderAndNavBtns } from '../../CreateConnectorUtils'
import { regionValues } from './StepAuthConstants'
import css from './StepAWSAuthentication.module.scss'
interface StepAWSAuthenticationProps extends ConnectorInfoDTO {
  name: string
}

export interface AWSFormInterface {
  delegateType: CredentialType['key']
  accessKey: TextReferenceInterface | void
  secretKeyRef: SecretReferenceInterface | void
  crossAccountAccess: boolean
  crossAccountRoleArn: string
  externalId: string
  region: string
}

const defaultInitialFormData: AWSFormInterface = {
  delegateType: DelegateTypes.DELEGATE_OUT_CLUSTER,
  accessKey: undefined,
  secretKeyRef: undefined,
  crossAccountAccess: false,
  crossAccountRoleArn: '',
  externalId: '',
  region: ''
}

const StepAWSAuthentication: React.FC<StepProps<StepAWSAuthenticationProps> & ConnectorDetailsProps> = props => {
  const { prevStepData, nextStep, context, formClassName = '' } = props
  const { accountId } = useParams<{ accountId: string }>()
  const { getString } = useStrings()
  const { CDS_AWS_OIDC_AUTHENTICATION } = useFeatureFlags()
  const [initialValues, setInitialValues] = useState(defaultInitialFormData)
  const [loadingConnectorSecrets, setLoadingConnectorSecrets] = useState(props.isEditMode)
  const hideHeaderAndNavBtns = shouldHideHeaderAndNavBtns(context)
  useConnectorWizard({
    helpPanel: props.helpPanelReferenceId ? { referenceId: props.helpPanelReferenceId, contentWidth: 900 } : undefined
  })

  const getShouldShowCrossAccountAccess = (delegateType: CredentialType['key']) => {
    return delegateType !== DelegateTypes.DELEGATE_OIDC
  }

  const radioGroupItems = useMemo(() => {
    const options = [
      {
        label: getString('platform.connectors.aws.awsAccessKey'),
        value: DelegateTypes.DELEGATE_OUT_CLUSTER
      },
      {
        label: getString('platform.connectors.aws.assumeIAMRole'),
        value: DelegateTypes.DELEGATE_IN_CLUSTER
      },
      {
        label: getString('platform.connectors.aws.useIRSA'),
        value: DelegateTypes.DELEGATE_IN_CLUSTER_IRSA
      }
    ]

    if (CDS_AWS_OIDC_AUTHENTICATION) {
      options.push({
        label: getString('platform.connectors.aws.useOIDC'),
        value: DelegateTypes.DELEGATE_OIDC
      })
    }
    return options
  }, [CDS_AWS_OIDC_AUTHENTICATION])

  useEffect(() => {
    if (loadingConnectorSecrets) {
      if (props.isEditMode) {
        if (props.connectorInfo) {
          setupAWSFormData(props.connectorInfo as any, accountId).then(data => {
            setInitialValues(data as AWSFormInterface)
            setLoadingConnectorSecrets(false)
          })
        } else {
          setLoadingConnectorSecrets(false)
        }
      }
    }
  }, [loadingConnectorSecrets])

  const handleSubmit = (formData: ConnectorConfigDTO) => {
    trackEvent(ConnectorActions.AuthenticationStepSubmit, {
      category: Category.CONNECTOR,
      connector_type: Connectors.AWS
    })
    nextStep?.({ ...props.connectorInfo, ...prevStepData, ...formData } as StepAWSAuthenticationProps)
  }
  const handleValidate = (formData: ConnectorConfigDTO): void => {
    if (hideHeaderAndNavBtns) {
      handleSubmit({
        ...formData
      })
    }
  }
  const { trackEvent } = useTelemetry()

  useTrackEvent(ConnectorActions.AuthenticationStepLoad, {
    category: Category.CONNECTOR,
    connector_type: Connectors.AWS
  })

  const scope: ScopedObjectDTO | undefined = props.isEditMode
    ? {
        orgIdentifier: prevStepData?.orgIdentifier,
        projectIdentifier: prevStepData?.projectIdentifier
      }
    : undefined

  return loadingConnectorSecrets ? (
    <PageSpinner />
  ) : (
    <Layout.Vertical className={css.formCredentials}>
      {!hideHeaderAndNavBtns && <Text font={{ variation: FontVariation.H3 }}>{getString('credentials')}</Text>}
      <Formik
        initialValues={{
          ...initialValues,
          ...prevStepData
        }}
        formName="stepAwsAuthForm"
        validationSchema={Yup.object().shape({
          accessKey: Yup.string()
            .nullable()
            .when('delegateType', {
              is: DelegateTypes.DELEGATE_OUT_CLUSTER,
              then: Yup.string().trim().required(getString('platform.connectors.aws.validation.accessKey'))
            }),
          secretKeyRef: Yup.object().when('delegateType', {
            is: DelegateTypes.DELEGATE_OUT_CLUSTER,
            then: Yup.object().required(getString('platform.connectors.aws.validation.secretKeyRef'))
          }),
          iamRoleArn: Yup.string().when('delegateType', {
            is: DelegateTypes.DELEGATE_OIDC,
            then: Yup.string().trim().required(getString('platform.connectors.aws.validation.iamRoleArn'))
          }),
          crossAccountRoleArn: Yup.string().when('crossAccountAccess', {
            is: true,
            then: Yup.string().trim().required(getString('platform.connectors.aws.validation.crossAccountRoleArn'))
          })
        })}
        validate={handleValidate}
        onSubmit={handleSubmit}
      >
        {formikProps => (
          <>
            <Layout.Vertical
              padding={{ top: 'xxlarge', bottom: 'large' }}
              className={cx(css.formDataAws, formClassName)}
            >
              <FormInput.RadioGroup name="delegateType" items={radioGroupItems} className={css.radioGroup} />
              {formikProps.values.delegateType === DelegateTypes.DELEGATE_OUT_CLUSTER ? (
                <Layout.Vertical width={'56%'} spacing="large">
                  <Text color={Color.BLACK} tooltipProps={{ dataTooltipId: 'awsAuthentication' }}>
                    {getString('authentication')}
                  </Text>
                  <div>
                    <TextReference
                      name="accessKey"
                      stringId="platform.connectors.aws.accessKey"
                      type={formikProps.values.accessKey ? formikProps.values.accessKey?.type : ValueType.TEXT}
                    />
                    <SecretInput
                      name="secretKeyRef"
                      label={getString('platform.connectors.aws.secretKey')}
                      scope={scope}
                    />
                  </div>
                </Layout.Vertical>
              ) : (
                <></>
              )}

              {formikProps.values.delegateType === DelegateTypes.DELEGATE_OIDC && (
                <FormInput.Text
                  className={css.formInput}
                  name="iamRoleArn"
                  label={getString('platform.connectors.aws.iamRoleArn')}
                  placeholder={getString('platform.connectors.aws.iamRoleArnPlaceholder')}
                  tooltipProps={{
                    dataTooltipId: 'stepAwsAuthForm_crossAccountRoleArn'
                  }}
                />
              )}

              {getShouldShowCrossAccountAccess(formikProps.values.delegateType) && (
                <Layout.Vertical spacing="small">
                  <FormInput.CheckBox
                    name="crossAccountAccess"
                    label={getString('platform.connectors.aws.enableCrossAcc')}
                  />
                  {formikProps.values?.crossAccountAccess ? (
                    <>
                      <FormInput.Text
                        className={css.formInput}
                        name="crossAccountRoleArn"
                        label={getString('platform.connectors.aws.crossAccURN')}
                      />
                      <FormInput.Text
                        className={css.formInput}
                        name="externalId"
                        label={getString('platform.connectors.aws.externalId')}
                      />
                    </>
                  ) : null}
                </Layout.Vertical>
              )}
              <Layout.Vertical spacing="small">
                <FormInput.Select
                  name="region"
                  items={regionValues}
                  label={getString('platform.connectors.aws.testRegion')}
                  className={css.dropdownAws}
                />
              </Layout.Vertical>
            </Layout.Vertical>
            {!hideHeaderAndNavBtns && (
              <Layout.Horizontal padding={{ top: 'small' }} spacing="medium">
                <Button
                  text={getString('back')}
                  icon="chevron-left"
                  variation={ButtonVariation.SECONDARY}
                  onClick={() => props?.previousStep?.(props?.prevStepData)}
                  data-name="awsBackButton"
                />
                <Button
                  type="submit"
                  variation={ButtonVariation.PRIMARY}
                  onClick={formikProps.submitForm}
                  text={getString('continue')}
                  rightIcon="chevron-right"
                />
              </Layout.Horizontal>
            )}
          </>
        )}
      </Formik>
    </Layout.Vertical>
  )
}

export default StepAWSAuthentication
