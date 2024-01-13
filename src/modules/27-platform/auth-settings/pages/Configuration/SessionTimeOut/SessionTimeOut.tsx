/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import {
  Layout,
  Text,
  Button,
  useToaster,
  getErrorInfoFromErrorObject,
  Card,
  Formik,
  FormikForm,
  ButtonVariation,
  TextInput,
  FormError,
  PageSpinner,
  Container,
  HarnessDocTooltip
} from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import * as Yup from 'yup'
import { useSetSessionTimeoutAtAccountLevel } from 'services/cd-ng'

import { useStrings } from 'framework/strings'
import { formatMinutesToHigherDimensions } from '@auth-settings/utils'
import type { AccountPathProps } from '@common/interfaces/RouteInterfaces'
import css from './SessionTimeOut.module.scss'

interface SessionTimeOutProps {
  sessionInactivityTimeout: number | undefined
  absoluteSessionTimeout?: number
}

type FromikSessionTimeOut = Omit<SessionTimeOutProps, 'onSaveStart' | 'onSaveComplete'>

// session inactivity timeout limits
export const MINIMUM_SESSION_INACTIVITY_TIMEOUT_IN_MINUTES = 30 // 30 minutes
export const MAXIMUM_SESSION_INACTIVITY_TIMEOUT_IN_MINUTES = 4320 // 72 hours (3 days)

// absolute session timeout limits
export const MINIMUM_ABSOLUTE_SESSION_TIMEOUT_IN_MINUTES = 0 // 0 means unset
export const MAXIMUM_ABSOLUTE_SESSION_TIMEOUT_IN_MINUTES = 4320 // 72 hours (3 days)

const SessionTimeOut: React.FC<SessionTimeOutProps> = ({ sessionInactivityTimeout, absoluteSessionTimeout = 0 }) => {
  const params = useParams<AccountPathProps>()
  const { accountId } = params
  const { getString } = useStrings()
  const { showError, showSuccess } = useToaster()
  const {
    mutate: saveSessionTimeout,
    error,
    loading
  } = useSetSessionTimeoutAtAccountLevel({
    queryParams: { accountIdentifier: accountId }
  })

  useEffect(() => {
    if (error) {
      showError(getErrorInfoFromErrorObject(error))
    }
  }, [error])

  const submitData = async (values: FromikSessionTimeOut) => {
    if (values.sessionInactivityTimeout) {
      const { resource } = await saveSessionTimeout({
        sessionTimeOutInMinutes: values.sessionInactivityTimeout,
        absoluteSessionTimeOutInMinutes: values.absoluteSessionTimeout || 0
      })
      if (resource) {
        showSuccess(getString('common.savedSuccessfully'))
      }
    }
  }

  return (
    <Formik<FromikSessionTimeOut>
      initialValues={{
        sessionInactivityTimeout,
        absoluteSessionTimeout
      }}
      onSubmit={values => {
        submitData(values)
      }}
      formName="sessionTimeOut"
      validationSchema={Yup.object().shape({
        sessionInactivityTimeout: Yup.number()
          .integer()
          .required(
            getString('platform.authSettings.timeoutRequired', {
              timeoutType: getString('platform.authSettings.sessionInactivityTimeout')
            })
          )
          .typeError(getString('platform.authSettings.timeoutNumberRequired'))
          .min(
            MINIMUM_SESSION_INACTIVITY_TIMEOUT_IN_MINUTES,
            getString('platform.authSettings.sessionTimeOutErrorMessage', {
              timeoutType: getString('platform.authSettings.sessionInactivityTimeout'),
              minimum: MINIMUM_SESSION_INACTIVITY_TIMEOUT_IN_MINUTES
            })
          )
          .max(
            MAXIMUM_SESSION_INACTIVITY_TIMEOUT_IN_MINUTES,
            getString('platform.authSettings.sessionTimeOutErrorMaxMessage', {
              timeoutType: getString('platform.authSettings.sessionInactivityTimeout'),
              maximum: MAXIMUM_SESSION_INACTIVITY_TIMEOUT_IN_MINUTES
            })
          ),
        absoluteSessionTimeout: Yup.number()
          .integer()
          .typeError(getString('platform.authSettings.timeoutNumberRequired'))
          .min(
            MINIMUM_ABSOLUTE_SESSION_TIMEOUT_IN_MINUTES,
            getString('platform.authSettings.sessionTimeOutErrorMessage', {
              timeoutType: getString('platform.authSettings.absoluteSessionTimeout'),
              minimum: MINIMUM_ABSOLUTE_SESSION_TIMEOUT_IN_MINUTES
            })
          )
          .max(
            MAXIMUM_ABSOLUTE_SESSION_TIMEOUT_IN_MINUTES,
            getString('platform.authSettings.sessionTimeOutErrorMaxMessage', {
              timeoutType: getString('platform.authSettings.absoluteSessionTimeout'),
              maximum: MAXIMUM_ABSOLUTE_SESSION_TIMEOUT_IN_MINUTES
            })
          )
      })}
    >
      {formik => {
        return (
          <>
            {loading && <PageSpinner message={getString('common.saving')} />}
            <FormikForm>
              <Container margin="xlarge">
                <Card className={css.card}>
                  <Layout.Vertical spacing="xlarge">
                    <Layout.Horizontal className={css.sessionTimeoutLayout} margin={{ bottom: 'large' }}>
                      <Layout.Vertical className={css.label}>
                        <Text color={Color.BLACK} font={{ variation: FontVariation.LEAD }}>
                          {getString('platform.authSettings.sessionTimeoutLabel', {
                            timeoutType: getString('platform.authSettings.sessionInactivityTimeout')
                          })}
                          <HarnessDocTooltip tooltipId="sessionInactivityTimeout" useStandAlone={true} />
                        </Text>
                      </Layout.Vertical>
                      <Layout.Vertical spacing="small">
                        <TextInput
                          type="number"
                          value={formik.values.sessionInactivityTimeout as any}
                          min={MINIMUM_SESSION_INACTIVITY_TIMEOUT_IN_MINUTES}
                          max={MAXIMUM_SESSION_INACTIVITY_TIMEOUT_IN_MINUTES}
                          wrapperClassName={css.textInpt}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            formik.setFieldValue('sessionInactivityTimeout', e.target.value)
                          }
                          name="sessionInactivityTimeout"
                        />
                        {formik.errors.sessionInactivityTimeout ? (
                          <FormError
                            name="sessionInactivityTimeoutErrorMsg"
                            errorMessage={formik.errors.sessionInactivityTimeout}
                          />
                        ) : (
                          <Text>{formatMinutesToHigherDimensions(formik.values.sessionInactivityTimeout)}</Text>
                        )}
                      </Layout.Vertical>
                    </Layout.Horizontal>
                    <Layout.Horizontal className={css.sessionTimeoutLayout}>
                      <Layout.Vertical className={css.label}>
                        <Text color={Color.BLACK} font={{ variation: FontVariation.LEAD }}>
                          {getString('platform.authSettings.sessionTimeoutLabel', {
                            timeoutType: getString('platform.authSettings.absoluteSessionTimeout')
                          })}
                          <HarnessDocTooltip tooltipId="absoluteSessionTimeout" useStandAlone={true} />
                        </Text>
                        <Text color={Color.BLACK} font={{ variation: FontVariation.LEAD }}>
                          {getString('common.optionalLabel')}
                        </Text>
                      </Layout.Vertical>
                      <Layout.Vertical spacing="small">
                        <Layout.Horizontal spacing="xxxlarge" flex={{ justifyContent: 'flex-start' }}>
                          <TextInput
                            type="number"
                            value={formik.values.absoluteSessionTimeout as any}
                            min={MINIMUM_ABSOLUTE_SESSION_TIMEOUT_IN_MINUTES}
                            max={MAXIMUM_ABSOLUTE_SESSION_TIMEOUT_IN_MINUTES}
                            wrapperClassName={css.textInpt}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              formik.setFieldValue('absoluteSessionTimeout', e.target.value)
                            }
                            name="absoluteSessionTimeout"
                          />
                          <Button
                            type="submit"
                            text={getString('save')}
                            variation={ButtonVariation.SECONDARY}
                            disabled={
                              loading ||
                              !!formik.errors.sessionInactivityTimeout ||
                              !!formik.errors.absoluteSessionTimeout
                            }
                          />
                        </Layout.Horizontal>
                        {formik.errors.absoluteSessionTimeout ? (
                          <FormError
                            name="absoluteSessionTimeoutErrorMsg"
                            errorMessage={formik.errors.absoluteSessionTimeout}
                          />
                        ) : (
                          <Text>{formatMinutesToHigherDimensions(formik.values.absoluteSessionTimeout)}</Text>
                        )}
                      </Layout.Vertical>
                    </Layout.Horizontal>
                  </Layout.Vertical>
                </Card>
              </Container>
            </FormikForm>
          </>
        )
      }}
    </Formik>
  )
}
export default SessionTimeOut
