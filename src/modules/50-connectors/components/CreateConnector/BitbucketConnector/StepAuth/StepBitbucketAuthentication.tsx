import React, { useState, useEffect } from 'react'
import {
  Layout,
  Button,
  Formik,
  FormInput,
  Text,
  ModalErrorHandler,
  ModalErrorHandlerBinding,
  FormikForm as Form,
  StepProps,
  Color,
  Container,
  SelectOption
} from '@wings-software/uicore'
import * as Yup from 'yup'
import type { FormikProps } from 'formik'
import {
  buildBitbucketPayload,
  SecretReferenceInterface,
  setupBitbucketFormData,
  GitConnectionType
} from '@connectors/pages/connectors/utils/ConnectorUtils'
import { useToaster } from '@common/exports'
import {
  useCreateConnector,
  useUpdateConnector,
  ConnectorConfigDTO,
  ConnectorRequestBody,
  ConnectorInfoDTO
} from 'services/cd-ng'

import SecretInput from '@secrets/components/SecretInput/SecretInput'
import { useStrings } from 'framework/exports'
import { GitAuthTypes } from '@connectors/pages/connectors/utils/ConnectorHelper'
import { PageSpinner } from '@common/components/Page/PageSpinner'
import css from './StepBitbucketAuthentication.module.scss'

interface StepBitbucketAuthenticationProps extends ConnectorInfoDTO {
  name: string
  isEditMode?: boolean
}

interface BitbucketAuthenticationProps {
  onConnectorCreated: (data?: ConnectorRequestBody) => void | Promise<void>
  isEditMode: boolean
  setIsEditMode: (val: boolean) => void
  connectorInfo: ConnectorInfoDTO | void
  accountId: string
  orgIdentifier: string
  projectIdentifier: string
}

interface BitbucketFormInterface {
  connectionType: string
  authType: string
  username: string
  password: SecretReferenceInterface | void
  sshKey: SecretReferenceInterface | void
  enableAPIAccess: boolean
  apiAuthType: string
  accessToken: SecretReferenceInterface | void
}

const defaultInitialFormData: BitbucketFormInterface = {
  connectionType: GitConnectionType.HTTPS,
  authType: GitAuthTypes.USER_PASSWORD,
  username: '',
  password: undefined,
  sshKey: undefined,
  enableAPIAccess: false,
  apiAuthType: GitAuthTypes.USER_TOKEN,
  accessToken: undefined
}

const RenderBitbucketAuthForm: React.FC<FormikProps<BitbucketFormInterface>> = () => {
  const { getString } = useStrings()
  return (
    <>
      <FormInput.Text name="username" label={getString('username')} />
      <SecretInput name="password" label={getString('password')} />
    </>
  )
}

const RenderAPIAccessFormWrapper: React.FC<FormikProps<BitbucketFormInterface>> = () => {
  const { getString } = useStrings()

  const apiAuthOptions: Array<SelectOption> = [
    {
      label: getString('usernameToken'),
      value: GitAuthTypes.USER_TOKEN
    }
  ]

  return (
    <>
      <Text font="small" margin={{ bottom: 'small' }}>
        {getString('connectors.git.APIAccessDescriptipn')}
      </Text>
      <Container className={css.authHeaderRow}>
        <Text className={css.authTitle} inline>
          {getString('connectors.git.APIAuthentication')}
        </Text>
        <FormInput.Select name="apiAuthType" items={apiAuthOptions} />
      </Container>
      <FormInput.Text name="username" label={getString('username')} />
      <SecretInput name="accessToken" label={getString('connectors.git.accessToken')} />
    </>
  )
}

const StepBitbucketAuthentication: React.FC<
  StepProps<StepBitbucketAuthenticationProps> & BitbucketAuthenticationProps
> = props => {
  const { getString } = useStrings()
  const { showSuccess } = useToaster()
  const { prevStepData, nextStep } = props
  const { accountId, projectIdentifier, orgIdentifier } = props
  const [modalErrorHandler, setModalErrorHandler] = useState<ModalErrorHandlerBinding | undefined>()
  const { mutate: createConnector } = useCreateConnector({ queryParams: { accountIdentifier: accountId } })
  const { mutate: updateConnector } = useUpdateConnector({ queryParams: { accountIdentifier: accountId } })
  const [loadConnector, setLoadConnector] = useState(false)
  const [initialValues, setInitialValues] = useState(defaultInitialFormData)
  const [loadingConnectorSecrets, setLoadingConnectorSecrets] = useState(true && props.isEditMode)

  const authOptions: Array<SelectOption> = [
    {
      label: getString('usernamePassword'),
      value: GitAuthTypes.USER_PASSWORD
    }
  ]

  const handleCreate = async (data: ConnectorRequestBody, stepData: ConnectorConfigDTO): Promise<void> => {
    try {
      modalErrorHandler?.hide()
      setLoadConnector(true)
      const response = await createConnector(data)
      showSuccess(getString('connectors.successfullCreate', { name: data.connector?.name }))
      setLoadConnector(false)
      nextStep?.({ ...prevStepData, ...stepData } as StepBitbucketAuthenticationProps)
      props.onConnectorCreated(response.data)
      props.setIsEditMode(true)
    } catch (e) {
      setLoadConnector(false)
      modalErrorHandler?.showDanger(e.data?.message || e.message)
    }
  }

  const handleUpdate = async (data: ConnectorRequestBody, stepData: ConnectorConfigDTO): Promise<void> => {
    try {
      modalErrorHandler?.hide()
      setLoadConnector(true)
      const response = await updateConnector(data)
      showSuccess(getString('connectors.successfullUpdate', { name: data.connector?.name }))
      setLoadConnector(false)
      nextStep?.({ ...prevStepData, ...stepData } as StepBitbucketAuthenticationProps)
      props.onConnectorCreated(response.data)
    } catch (error) {
      setLoadConnector(false)
      modalErrorHandler?.showDanger(error.data?.message || error.message)
    }
  }

  useEffect(() => {
    if (loadingConnectorSecrets) {
      if (props.isEditMode) {
        if (props.connectorInfo) {
          setupBitbucketFormData(props.connectorInfo, accountId).then(data => {
            setInitialValues(data as BitbucketFormInterface)
            setLoadingConnectorSecrets(false)
          })
        } else {
          setLoadingConnectorSecrets(false)
        }
      }
    }
  }, [loadingConnectorSecrets])

  return loadingConnectorSecrets ? (
    <PageSpinner />
  ) : (
    <Layout.Vertical height={'inherit'} spacing="medium" className={css.secondStep}>
      <Text font="medium" margin={{ top: 'small' }} color={Color.BLACK}>
        {getString('connectors.git.bitbucketStepTwoName')}
      </Text>

      <Formik
        initialValues={{
          ...initialValues,
          ...prevStepData
        }}
        validationSchema={Yup.object().shape({
          username: Yup.string().when(['connectionType', 'enableAPIAccess'], {
            is: (connectionType, enableAPIAccess) => connectionType === GitConnectionType.HTTPS || enableAPIAccess,
            then: Yup.string().trim().required(getString('validation.username')),
            otherwise: Yup.string().nullable()
          }),
          authType: Yup.string().when('connectionType', {
            is: val => val === GitConnectionType.HTTPS,
            then: Yup.string().trim().required(getString('validation.authType'))
          }),
          sshKey: Yup.object().when('connectionType', {
            is: val => val === GitConnectionType.SSH,
            then: Yup.object().required(getString('validation.sshKey')),
            otherwise: Yup.object().nullable()
          }),
          password: Yup.object().when(['connectionType', 'authType'], {
            is: (connectionType, authType) =>
              connectionType === GitConnectionType.HTTPS && authType === GitAuthTypes.USER_PASSWORD,
            then: Yup.object().required(getString('validation.password')),
            otherwise: Yup.object().nullable()
          }),
          apiAuthType: Yup.string().when('enableAPIAccess', {
            is: val => val,
            then: Yup.string().trim().required(getString('validation.authType')),
            otherwise: Yup.string().nullable()
          }),
          accessToken: Yup.object().when(['enableAPIAccess', 'apiAuthType'], {
            is: (enableAPIAccess, apiAuthType) => enableAPIAccess && apiAuthType === GitAuthTypes.USER_TOKEN,
            then: Yup.object().required(getString('validation.accessToken')),
            otherwise: Yup.object().nullable()
          })
        })}
        onSubmit={stepData => {
          const connectorData = {
            ...prevStepData,
            ...stepData,
            projectIdentifier: projectIdentifier,
            orgIdentifier: orgIdentifier
          }
          const data = buildBitbucketPayload(connectorData)

          if (props.isEditMode) {
            handleUpdate(data, stepData)
          } else {
            handleCreate(data, stepData)
          }
        }}
      >
        {formikProps => (
          <Form>
            <ModalErrorHandler bind={setModalErrorHandler} />
            <Container className={css.stepFormWrapper}>
              {formikProps.values.connectionType === GitConnectionType.SSH ? (
                <>
                  <Text font={{ weight: 'bold' }} className={css.authTitle}>
                    {getString('connectors.authTitle')}
                  </Text>
                  <SecretInput name="sshKey" type="SSHKey" label={getString('SSH_KEY')} />
                </>
              ) : (
                <>
                  <Container className={css.authHeaderRow}>
                    <Text className={css.authTitle} inline>
                      {getString('connectors.authTitle')}
                    </Text>
                    <FormInput.Select name="authType" items={authOptions} disabled={false} />
                  </Container>

                  <RenderBitbucketAuthForm {...formikProps} />
                </>
              )}

              <FormInput.CheckBox
                name="enableAPIAccess"
                label={getString('connectors.git.enableAPIAccess')}
                padding={{ left: 'xxlarge' }}
              />
              {formikProps.values.enableAPIAccess ? <RenderAPIAccessFormWrapper {...formikProps} /> : null}
            </Container>

            <Button
              type="submit"
              intent="primary"
              text={getString('saveAndContinue')}
              rightIcon="chevron-right"
              disabled={loadConnector}
            />
          </Form>
        )}
      </Formik>
    </Layout.Vertical>
  )
}

export default StepBitbucketAuthentication
