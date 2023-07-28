/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import {
  Container,
  StepProps,
  Layout,
  Button,
  ButtonVariation,
  Label,
  TextInput,
  FormInput,
  Text,
  FormikForm
} from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { Formik } from 'formik'
import { useParams } from 'react-router-dom'
import * as yup from 'yup'
import { useStrings } from 'framework/strings'
import { CopyText } from '@common/components/CopyText/CopyText'
import { getSamlEndpoint } from '@auth-settings/constants/utils'
import type { AccountPathProps } from '@common/interfaces/RouteInterfaces'
import type { SAMLSettings } from 'services/cd-ng'
import type { FormValues } from '../utils'
import css from '../useSAMLProvider.module.scss'

type IdentityProviderForm = Pick<FormValues, 'logoutUrl'> & { files: any }
type IdentityProviderFormValues = FormValues & { files: any }

interface IdentityProviderProps extends StepProps<FormValues> {
  files?: any
  samlProvider?: SAMLSettings
}

const IdentityProvider: React.FC<IdentityProviderProps> = props => {
  const { getString } = useStrings()
  const { accountId } = useParams<AccountPathProps>()

  const filesValidation = props.samlProvider
    ? yup.array()
    : yup.array().required(getString('common.validation.fileIsRequired'))

  const selectedSAMLProviderText =
    props.prevStepData?.samlProviderType || getString('platform.authSettings.SAMLProvider')
  return (
    <Formik<IdentityProviderForm>
      initialValues={{ ...props.prevStepData } as IdentityProviderFormValues}
      validationSchema={yup.object().shape({
        files: filesValidation
      })}
      onSubmit={values => {
        props.nextStep?.({ ...props.prevStepData, ...values } as IdentityProviderFormValues)
      }}
    >
      {() => (
        <FormikForm className={css.form}>
          <Layout.Vertical flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Layout.Vertical className={css.flex}>
              <Text margin={{ bottom: 'large' }} font={{ variation: FontVariation.H3 }}>
                {getString('platform.authSettings.urlIdentityProvider')}
              </Text>
              <Layout.Vertical>
                <Label>{getString('platform.authSettings.enterSAMLEndPoint')}</Label>
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
              </Layout.Vertical>
              <Container margin={{ bottom: 'xxxlarge' }}>
                <FormInput.FileInput
                  name="files"
                  label={`${getString(
                    props.samlProvider
                      ? 'platform.authSettings.identityProvider'
                      : 'platform.authSettings.uploadIdentityProvider',
                    {
                      selectedSAMLProvider: selectedSAMLProviderText
                    }
                  )}`}
                  buttonText={getString('upload')}
                  placeholder={getString('platform.authSettings.chooseFile')}
                  multiple
                />
                <FormInput.Text name="logoutUrl" label={getString('platform.authSettings.logoutUrl')} />
              </Container>
            </Layout.Vertical>
            <Layout.Horizontal padding={{ top: 'small' }} spacing="medium">
              <Button
                text={getString('back')}
                icon="chevron-left"
                variation={ButtonVariation.SECONDARY}
                onClick={() => props?.previousStep?.({ ...props.prevStepData } as IdentityProviderFormValues)}
                data-name="awsBackButton"
              />
              <Button
                type="submit"
                variation={ButtonVariation.PRIMARY}
                text={getString('continue')}
                rightIcon="chevron-right"
              />
            </Layout.Horizontal>
          </Layout.Vertical>
        </FormikForm>
      )}
    </Formik>
  )
}

export default IdentityProvider