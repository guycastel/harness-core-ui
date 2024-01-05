/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import {
  FormikForm,
  FormInput,
  Button,
  Layout,
  Formik,
  ButtonVariation,
  MultiTypeInputType,
  getMultiTypeFromValue
} from '@harness/uicore'
import * as Yup from 'yup'
import { get, isEmpty } from 'lodash-es'
import { URLValidationSchema } from '@common/utils/Validation'
import { NotificationType, WebhookNotificationConfiguration } from '@rbac/interfaces/Notifications'
import { useStrings } from 'framework/strings'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import MultiTypeMap from '@common/components/MultiTypeMap/MultiTypeMap'
import { MapUIType, MultiTypeMapType } from '@modules/10-common/components/Map/Map'
import { processMapValues } from '@modules/10-common/utils/utils'
import { TestWebhookNotifications } from './TestWebhookNotification'
import css from '../../ConfigureNotificationsModal.module.scss'

interface ConfigureWebhookNotificationsProps {
  onSuccess: (config: WebhookNotificationConfiguration) => void
  hideModal: () => void
  withoutHeading?: boolean
  isStep?: boolean
  onBack?: (config?: WebhookNotificationConfiguration) => void
  submitButtonText?: string
  config?: WebhookNotificationConfiguration
  expressions?: string[]
}

export interface WebhookNotificationData {
  webhookUrl: string
  headers?: MultiTypeMapType
}

const ConfigureWebhookNotifications: React.FC<ConfigureWebhookNotificationsProps> = props => {
  const [webhookUrlType, setWebhookUrlType] = useState<MultiTypeInputType>(
    getMultiTypeFromValue(props.config?.webhookUrl)
  )
  const { getString } = useStrings()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const handleSubmit = (formData: WebhookNotificationData): void => {
    props.onSuccess(convertFormData(formData))
  }

  const convertFormData = (formData: WebhookNotificationData): WebhookNotificationData & { type: NotificationType } => {
    const headersData = processMapValues(formData.headers as unknown as MapUIType)
    return {
      type: NotificationType.Webhook,
      webhookUrl: formData.webhookUrl,
      ...(!isEmpty(headersData) && { headers: headersData })
    }
  }

  return (
    <div className={css.body}>
      <Layout.Vertical spacing="large">
        <Formik
          onSubmit={handleSubmit}
          formName="configureWebhookNotifications"
          validationSchema={Yup.object().shape({
            // TODO: Create global validation function for url validation
            webhookUrl:
              webhookUrlType === MultiTypeInputType.EXPRESSION
                ? Yup.string().required()
                : URLValidationSchema(getString),
            headers: Yup.lazy((formikHeaderValues): Yup.Schema<unknown> => {
              return Yup.array().of(
                Yup.object().shape({
                  key: Yup.string()
                    .trim()
                    .required(getString('common.validation.nameIsRequired'))
                    .test(
                      'Check Duplicate Header Name',
                      getString('common.validation.headerAlreadyExists'),
                      headerName => {
                        let count = 0
                        if (Array.isArray(formikHeaderValues)) {
                          formikHeaderValues.forEach(val => {
                            if (get(val, 'key') === headerName) count++
                          })
                        }
                        return count <= 1
                      }
                    )
                })
              )
            })
          })}
          initialValues={{
            webhookUrl: '',
            ...props.config
          }}
        >
          {formik => {
            return (
              <FormikForm>
                {props.expressions ? (
                  <FormInput.MultiTextInput
                    name={'webhookUrl'}
                    label={getString('rbac.notifications.webhookUrl')}
                    multiTextInputProps={{
                      expressions: props.expressions,
                      allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION],
                      onTypeChange: setWebhookUrlType,
                      newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                    }}
                  />
                ) : (
                  <FormInput.Text name={'webhookUrl'} label={getString('rbac.notifications.webhookUrl')} />
                )}

                <Layout.Horizontal margin={{ bottom: 'xxlarge' }} style={{ alignItems: 'center' }}>
                  <TestWebhookNotifications
                    data={formik.values}
                    buttonProps={{ disabled: webhookUrlType === MultiTypeInputType.EXPRESSION }}
                  />
                </Layout.Horizontal>
                <div className={css.headers}>
                  <MultiTypeMap
                    name={'headers'}
                    valueMultiTextInputProps={{
                      expressions: props.expressions,
                      allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION],
                      newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                    }}
                    multiTypeFieldSelectorProps={{
                      label: '',
                      disableTypeSelection: true
                    }}
                    configureOptionsProps={{
                      hideExecutionTimeField: true
                    }}
                    keyLabel={getString('name')}
                    alwaysShowKeyValueLabel
                    keyValuePlaceholders={[getString('name'), getString('valueLabel')]}
                    addButtonLabel={getString('common.plusAddName', { name: getString('common.headers') })}
                  />
                </div>
                {props.isStep ? (
                  <Layout.Horizontal spacing="large" className={css.buttonGroupSlack}>
                    <Button
                      text={getString('back')}
                      variation={ButtonVariation.SECONDARY}
                      onClick={() => {
                        props.onBack?.(convertFormData(formik.values))
                      }}
                    />
                    <Button
                      text={props.submitButtonText || getString('next')}
                      disabled={!formik.values.webhookUrl?.length}
                      variation={ButtonVariation.PRIMARY}
                      type="submit"
                    />
                  </Layout.Horizontal>
                ) : (
                  <Layout.Horizontal spacing={'medium'} margin={{ top: 'xxlarge' }}>
                    <Button
                      type={'submit'}
                      variation={ButtonVariation.PRIMARY}
                      text={props.submitButtonText || getString('submit')}
                    />
                    <Button
                      text={getString('cancel')}
                      variation={ButtonVariation.SECONDARY}
                      onClick={props.hideModal}
                    />
                  </Layout.Horizontal>
                )}
              </FormikForm>
            )
          }}
        </Formik>
      </Layout.Vertical>
    </div>
  )
}

export default ConfigureWebhookNotifications
