/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Free Trial 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/05/PolyForm-Free-Trial-1.0.0.txt.
 */

import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import * as yup from 'yup'
import {
  Layout,
  Heading,
  Formik,
  FormikForm,
  Container,
  FormInput,
  Text,
  Button,
  Checkbox,
  ModalErrorHandler,
  ModalErrorHandlerBinding,
  TextInput,
  ButtonVariation,
  ThumbnailSelect,
  Label,
  Page
} from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { defaultTo } from 'lodash-es'
import type { ToasterProps } from '@harness/uicore/dist/hooks/useToaster/useToaster'
import { useStrings } from 'framework/strings'
import { useToaster } from '@common/components'
import { CopyText } from '@common/components/CopyText/CopyText'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import { useUploadSamlMetaData, useUpdateSamlMetaData, SAMLSettings } from 'services/cd-ng'
import { getSamlEndpoint } from '@auth-settings/constants/utils'
import type { AccountPathProps } from '@common/interfaces/RouteInterfaces'
import {
  createFormData,
  FormValues,
  SAMLProviderType,
  Providers,
  getSelectedSAMLProvider
} from '@auth-settings/modals/SAMLProvider/utils'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import css from '../useSAMLProvider.module.scss'

interface Props {
  onSubmit?: () => void
  onCancel: () => void
  samlProvider?: SAMLSettings
}

const handleSuccess = (
  successCallback: ToasterProps['showSuccess'],
  isCreate: boolean,
  createText: string,
  updateText: string
): void => {
  successCallback(isCreate ? createText : updateText, 5000)
}
const defaultInitialData = {
  displayName: '',
  authorizationEnabled: true,
  groupMembershipAttr: '',
  entityIdEnabled: false,
  entityIdentifier: '',
  enableClientIdAndSecret: false,
  clientSecret: undefined,
  clientId: '',
  samlProviderType: undefined,
  jitEnabled: false,
  jitValidationKey: '',
  jitValidationValue: ''
}
const SAMLProviderForm: React.FC<Props> = ({ onSubmit, onCancel, samlProvider }) => {
  const { getRBACErrorMessage } = useRBACError()
  const { getString } = useStrings()
  const { showSuccess } = useToaster()
  const { accountId } = useParams<AccountPathProps>()
  const { PL_ENABLE_JIT_USER_PROVISION } = useFeatureFlags()
  const [initialValues, setInitialValues] = React.useState<FormValues>(defaultInitialData)
  const [initialLoading, setIntitalLoading] = React.useState<boolean>(!!samlProvider)
  const [selected, setSelected] = React.useState<SAMLProviderType>()
  const [modalErrorHandler, setModalErrorHandler] = React.useState<ModalErrorHandlerBinding>()
  const hasSamlProvider = selected || samlProvider
  const setupInitialData = async (): Promise<FormValues> => {
    return {
      displayName: defaultTo(samlProvider?.displayName, ''),
      authorizationEnabled: samlProvider ? !!samlProvider?.authorizationEnabled : true,
      logoutUrl: samlProvider?.logoutUrl,
      groupMembershipAttr: defaultTo(samlProvider?.groupMembershipAttr, ''),
      entityIdEnabled: samlProvider ? !!samlProvider?.entityIdentifier : false,
      entityIdentifier: defaultTo(samlProvider?.entityIdentifier, ''),
      enableClientIdAndSecret: samlProvider ? !!samlProvider?.clientSecret || !!samlProvider?.clientId : false,
      clientSecret: defaultTo(samlProvider?.clientSecret, ''),
      clientId: defaultTo(samlProvider?.clientId, ''),
      samlProviderType:
        samlProvider && samlProvider?.samlProviderType ? (samlProvider?.samlProviderType as Providers) : undefined,
      ...(PL_ENABLE_JIT_USER_PROVISION
        ? {
            jitEnabled: samlProvider ? !!samlProvider?.jitEnabled : false,
            jitValidationKey: defaultTo(samlProvider?.jitValidationKey, ''),
            jitValidationValue: defaultTo(samlProvider?.jitValidationValue, '')
          }
        : {})
    }
  }
  useEffect(() => {
    if (samlProvider) {
      setIntitalLoading(true)
      setupInitialData().then(data => {
        setInitialValues(data)
        setIntitalLoading(false)
      })
    }
  }, [samlProvider])
  const SAMLProviderTypes: SAMLProviderType[] = [
    {
      value: Providers.AZURE,
      label: getString('platform.authSettings.azure'),
      icon: 'service-azure'
    },
    {
      value: Providers.OKTA,
      label: getString('platform.authSettings.okta'),
      icon: 'service-okta'
    },
    {
      value: Providers.ONE_LOGIN,
      label: getString('platform.authSettings.oneLogin'),
      icon: 'service-onelogin'
    },
    {
      value: Providers.OTHER,
      label: getString('common.other'),
      icon: 'main-more'
    }
  ]

  const selectedSAMLProvider = getSelectedSAMLProvider(selected, getString)
  const { mutate: uploadSamlSettings, loading: uploadingSamlSettings } = useUploadSamlMetaData({
    queryParams: {
      accountId
    }
  })

  const { mutate: updateSamlSettings, loading: updatingSamlSettings } = useUpdateSamlMetaData({
    queryParams: {
      accountId
    }
  })

  const handleSubmit = async (values: FormValues): Promise<void> => {
    try {
      let response

      if (samlProvider) {
        response = await updateSamlSettings(createFormData(values) as any)
      } else {
        response = await uploadSamlSettings(createFormData(values) as any)
      }

      if (response) {
        handleSuccess(
          showSuccess,
          !samlProvider,
          getString('platform.authSettings.samlProviderAddedSuccessfully'),
          getString('platform.authSettings.samlProviderUpdatedSuccessfully')
        )
        onSubmit?.()
      }
    } catch (e) {
      /* istanbul ignore next */ modalErrorHandler?.showDanger(getRBACErrorMessage(e))
    }
  }

  const filesValidation = samlProvider
    ? yup.array()
    : yup.array().required(getString('common.validation.fileIsRequired'))
  return (
    <Layout.Horizontal>
      <Layout.Vertical width={660} padding={{ right: 'xxxlarge' }}>
        {initialLoading ? (
          <Page.Spinner />
        ) : (
          <Formik<FormValues>
            formName="samlProviderForm"
            initialValues={initialValues}
            validationSchema={yup.object().shape({
              displayName: yup.string().trim().required(getString('common.validation.nameIsRequired')),
              files: filesValidation,
              groupMembershipAttr: yup.string().when('authorizationEnabled', {
                is: val => val,
                then: yup.string().trim().required(getString('common.validation.groupAttributeIsRequired'))
              }),
              entityIdentifier: yup.string().when('entityIdEnabled', {
                is: val => val,
                then: yup.string().trim().required(getString('common.validation.entityIdIsRequired'))
              }),
              clientId: yup.string().when('enableClientIdAndSecret', {
                is: val => val,
                then: yup.string().trim().required(getString('common.validation.clientIdIsRequired'))
              }),
              clientSecret: yup.string().when('enableClientIdAndSecret', {
                is: val => val,
                then: yup.string().trim().required(getString('common.validation.clientSecretRequired'))
              })
            })}
            onSubmit={values => {
              handleSubmit({ ...values })
            }}
          >
            {({ values, setFieldValue }) => (
              <FormikForm>
                <Container width={474} margin={{ bottom: 'large' }}>
                  <ModalErrorHandler bind={setModalErrorHandler} />
                  <FormInput.Text name="displayName" label={getString('name')} />
                </Container>
                {!samlProvider && (
                  <Layout.Vertical spacing="small" padding={{ bottom: 'medium' }}>
                    <Label>{getString('platform.authSettings.selectSAMLProvider')}</Label>
                    <ThumbnailSelect
                      name="samlProviderType"
                      items={SAMLProviderTypes}
                      onChange={(value: unknown) => {
                        setSelected(value as SAMLProviderType)
                      }}
                    />
                  </Layout.Vertical>
                )}
                {hasSamlProvider && (
                  <React.Fragment>
                    <Label>
                      {getString('platform.authSettings.enterSAMLEndPoint', {
                        selectedSAMLProvider
                      })}
                    </Label>
                    <TextInput
                      value={getSamlEndpoint(accountId)}
                      rightElement={
                        (
                          <CopyText
                            className={css.copy}
                            iconName="duplicate"
                            textToCopy={getSamlEndpoint(accountId)}
                            iconAlwaysVisible
                          />
                        ) as any
                      }
                      readOnly
                    />
                    <Container margin={{ bottom: 'xxxlarge' }}>
                      <FormInput.FileInput
                        name="files"
                        label={`${getString(
                          samlProvider
                            ? 'platform.authSettings.identityProvider'
                            : 'platform.authSettings.uploadIdentityProvider',
                          {
                            selectedSAMLProvider
                          }
                        )}`}
                        buttonText={getString('upload')}
                        placeholder={getString('platform.authSettings.chooseFile')}
                        multiple
                      />
                      <FormInput.Text name="logoutUrl" label={getString('platform.authSettings.logoutUrl')} />
                    </Container>
                    <Container className={css.additionalFieldsContainer}>
                      <Container>
                        <Checkbox
                          name="authorization"
                          label={getString('platform.authSettings.enableAuthorization')}
                          font={{ weight: 'semi-bold' }}
                          color={Color.GREY_600}
                          checked={values.authorizationEnabled}
                          onChange={e => setFieldValue('authorizationEnabled', e.currentTarget.checked)}
                        />
                        {values.authorizationEnabled && (
                          <Container width={300} margin={{ top: 'medium' }}>
                            <FormInput.Text
                              name="groupMembershipAttr"
                              label={getString('platform.authSettings.groupAttributeName')}
                            />
                            {Providers.AZURE === values?.samlProviderType && (
                              <>
                                <Checkbox
                                  name="clientIdAndSecret"
                                  label={getString('platform.authSettings.enableClientIdAndSecret')}
                                  font={{ weight: 'semi-bold' }}
                                  color={Color.GREY_600}
                                  checked={values.enableClientIdAndSecret}
                                  onChange={e => setFieldValue('enableClientIdAndSecret', e.currentTarget.checked)}
                                />

                                {Providers.AZURE === values?.samlProviderType && values.enableClientIdAndSecret && (
                                  <Container width={300} margin={{ top: 'medium' }}>
                                    <FormInput.Text name="clientId" label={getString('common.clientId')} />
                                    <FormInput.Text
                                      name="clientSecret"
                                      inputGroup={{ type: 'password' }}
                                      label={getString('common.clientSecret')}
                                    />
                                  </Container>
                                )}
                              </>
                            )}
                          </Container>
                        )}
                      </Container>
                      <Container margin={{ top: 'large' }}>
                        <Checkbox
                          name="enableEntityId"
                          label={getString('platform.authSettings.enableEntityIdLabel')}
                          font={{ variation: FontVariation.FORM_LABEL }}
                          color={Color.GREY_600}
                          checked={values.entityIdEnabled}
                          onChange={e => setFieldValue('entityIdEnabled', e.currentTarget.checked)}
                        />
                        {values.entityIdEnabled && (
                          <Container width={300} margin={{ top: 'medium' }}>
                            <FormInput.Text
                              name="entityIdentifier"
                              label={getString('platform.authSettings.entityIdLabel')}
                            />
                          </Container>
                        )}
                      </Container>
                      {PL_ENABLE_JIT_USER_PROVISION && (
                        <Container margin={{ top: 'large' }}>
                          <FormInput.CheckBox
                            tooltipProps={{ dataTooltipId: 'enableJITProvisioning' }}
                            name="jitEnabled"
                            label={`${getString('enable')} ${getString('platform.authSettings.jitProvisioning')}`}
                            font={{ variation: FontVariation.FORM_LABEL }}
                            color={Color.GREY_600}
                          />
                          {values.jitEnabled && (
                            <Container width={300} margin={{ top: 'medium' }}>
                              <FormInput.Text
                                name="jitValidationKey"
                                label={getString('platform.authSettings.jitValidationKey')}
                                tooltipProps={{ dataTooltipId: 'jitProvisioningKey' }}
                              />
                              <FormInput.Text
                                name="jitValidationValue"
                                label={getString('platform.authSettings.jitValidationValue')}
                                tooltipProps={{ dataTooltipId: 'jitProvisioningValue' }}
                              />
                            </Container>
                          )}
                        </Container>
                      )}
                    </Container>
                  </React.Fragment>
                )}
                <Layout.Horizontal spacing="small" padding={{ top: 'xxxlarge' }}>
                  <Button
                    variation={ButtonVariation.PRIMARY}
                    text={getString(samlProvider ? 'save' : 'add')}
                    type="submit"
                    disabled={uploadingSamlSettings || updatingSamlSettings}
                  />
                  <Button text={getString('cancel')} onClick={onCancel} variation={ButtonVariation.TERTIARY} />
                </Layout.Horizontal>
              </FormikForm>
            )}
          </Formik>
        )}
      </Layout.Vertical>
      <Layout.Vertical width={290} padding={{ left: 'xxxlarge' }} margin={{ bottom: 'large' }} border={{ left: true }}>
        <Heading level={6} color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 'medium' }}>
          {getString('platform.authSettings.friendlyReminder')}
        </Heading>
        <Text color={Color.GREY_800} font={{ size: 'small' }} margin={{ bottom: 'xxlarge' }} className={css.notes}>
          {getString('platform.authSettings.friendlyReminderDescription')}
        </Text>
        {hasSamlProvider && (
          <React.Fragment>
            <Heading level={6} color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 'medium' }}>
              {getString('platform.authSettings.enablingAuthorization')}
            </Heading>
            <Text color={Color.GREY_800} font={{ size: 'small' }} margin={{ bottom: 'xxlarge' }} className={css.notes}>
              {getString('platform.authSettings.enablingAuthorizationDescription', {
                selectedSAMLProvider
              })}
            </Text>
            <Heading level={6} color={Color.BLACK} font={{ weight: 'semi-bold' }} margin={{ bottom: 'medium' }}>
              {getString('platform.authSettings.testingSSO')}
            </Heading>
            <Text color={Color.GREY_800} font={{ size: 'small' }} margin={{ bottom: 'xxlarge' }} className={css.notes}>
              {getString('platform.authSettings.testingSSODescription')}
            </Text>
          </React.Fragment>
        )}
      </Layout.Vertical>
    </Layout.Horizontal>
  )
}

export default SAMLProviderForm