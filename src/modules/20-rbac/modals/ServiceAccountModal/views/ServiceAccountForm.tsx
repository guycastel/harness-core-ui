/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import {
  Button,
  Container,
  Formik,
  FormikForm as Form,
  FormInput,
  Layout,
  ModalErrorHandler,
  ModalErrorHandlerBinding,
  ButtonVariation
} from '@harness/uicore'
import * as Yup from 'yup'
import { useParams } from 'react-router-dom'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { useToaster } from '@common/components'
import { DescriptionTags } from '@common/components/NameIdDescriptionTags/NameIdDescriptionTags'
import { useStrings } from 'framework/strings'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { NameSchema, IdentifierSchema, EmailSchema } from '@common/utils/Validation'
import { ServiceAccountDTO, useCreateServiceAccount, useUpdateServiceAccount } from 'services/cd-ng'
import css from '@rbac/modals/ServiceAccountModal/useServiceAccountModal.module.scss'

interface ServiceAccountModalData {
  data?: ServiceAccountDTO
  isEdit?: boolean
  onSubmit?: (serviceAccount: ServiceAccountDTO) => void
  onClose?: () => void
}

const DEFAULT_EMAIL_DOMAIN = '@service.harness.io'

const ServiceAccountForm: React.FC<ServiceAccountModalData> = props => {
  const { data: serviceAccountData, onSubmit, isEdit, onClose } = props
  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()
  const { getRBACErrorMessage } = useRBACError()
  const { getString } = useStrings()
  const { showSuccess } = useToaster()
  const [modalErrorHandler, setModalErrorHandler] = useState<ModalErrorHandlerBinding>()

  const { mutate: createServiceAccount, loading: saving } = useCreateServiceAccount({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    }
  })

  const { mutate: editServiceAccount, loading: updating } = useUpdateServiceAccount({
    identifier: serviceAccountData?.identifier || '',
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    }
  })

  const handleSubmit = async (values: ServiceAccountDTO): Promise<void> => {
    const dataToSubmit = values
    try {
      if (isEdit) {
        const updated = await editServiceAccount(dataToSubmit)
        /* istanbul ignore else */ if (updated) {
          showSuccess(getString('rbac.serviceAccounts.form.editSuccess', { name: values.name }))
          onSubmit?.(values)
        }
      } else {
        const created = await createServiceAccount(dataToSubmit)
        /* istanbul ignore else */ if (created) {
          showSuccess(getString('rbac.serviceAccounts.form.createSuccess', { name: values.name }))
          onSubmit?.(values)
        }
      }
    } catch (e) {
      /* istanbul ignore next */
      modalErrorHandler?.showDanger(getRBACErrorMessage(e))
    }
  }

  return (
    <Formik
      initialValues={{
        identifier: '',
        name: '',
        description: '',
        email: DEFAULT_EMAIL_DOMAIN,
        tags: {},
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        ...serviceAccountData
      }}
      formName="serviceAccountForm"
      validationSchema={Yup.object().shape({
        name: NameSchema(getString),
        identifier: IdentifierSchema(getString),
        email: EmailSchema(getString)
      })}
      onSubmit={values => {
        modalErrorHandler?.hide()
        handleSubmit(values)
      }}
    >
      {formikProps => {
        return (
          <Form>
            <Container className={css.form}>
              <ModalErrorHandler bind={setModalErrorHandler} />
              <FormInput.InputWithIdentifier
                isIdentifierEditable={!isEdit}
                onIdentifierChangeCallback={identifier => {
                  if (!formikProps.touched.email) {
                    formikProps.setFieldValue('email', `${identifier.toLowerCase()}${DEFAULT_EMAIL_DOMAIN}`)
                  }
                }}
              />
              <FormInput.Text name="email" label={getString('email')} disabled={isEdit} />
              <DescriptionTags formikProps={formikProps} />
            </Container>
            <Layout.Horizontal spacing="small">
              <Button
                variation={ButtonVariation.PRIMARY}
                text={getString('save')}
                type="submit"
                disabled={saving || updating}
              />
              <Button text={getString('cancel')} onClick={onClose} variation={ButtonVariation.TERTIARY} />
            </Layout.Horizontal>
          </Form>
        )
      }}
    </Formik>
  )
}

export default ServiceAccountForm
