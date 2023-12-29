/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Divider } from '@blueprintjs/core'
import type { FormikProps } from 'formik'
import { Button, ButtonVariation, FormikForm, Container, Layout, Text } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { defaultTo } from 'lodash-es'
import { useStrings } from 'framework/strings'
import { InlineRemoteSelect } from '@common/components/InlineRemoteSelect/InlineRemoteSelect'
import { NameIdDescriptionTags } from '@common/components'
import { ServiceResponseDTO } from 'services/cd-ng'
import { StoreType } from '@common/constants/GitSyncTypes'
import { GitSyncForm, GitSyncFormFields } from '@gitsync/components/GitSyncForm/GitSyncForm'
import css from './DeployServiceStep.module.scss'

interface NewEditServiceFormProps {
  isEdit: boolean
  isGitXEnforced: boolean
  formikProps: FormikProps<ServiceResponseDTO & GitSyncFormFields>
  isGitXEnabledForServices: boolean
  closeModal?: () => void
}

const NewEditServiceForm: React.FC<NewEditServiceFormProps> = props => {
  const { isEdit, isGitXEnforced, formikProps, closeModal, isGitXEnabledForServices } = props
  const { getString } = useStrings()

  return (
    <FormikForm className={css.serviceForm}>
      <Container className={css.serviceFormBody}>
        <NameIdDescriptionTags
          formikProps={formikProps}
          className={css.nameIdDescriptionTags}
          identifierProps={{
            inputLabel: getString('name'),
            inputGroupProps: {
              inputGroup: {
                autoFocus: true
              }
            },
            isIdentifierEditable: !isEdit
          }}
        />

        {isGitXEnabledForServices ? (
          <>
            <Divider />
            <Text
              font={{ variation: FontVariation.FORM_SUB_SECTION }}
              margin={{ top: 'medium', bottom: 'medium' }}
              data-tooltip-id="service-InlineRemoteSelect-label"
            >
              {getString('cd.pipelineSteps.serviceTab.chooseServiceSetupHeader')}
            </Text>
            <InlineRemoteSelect
              className={css.serviceCardWrapper}
              entityType={'Service'}
              selected={defaultTo(formikProps?.values?.storeType, StoreType.INLINE)}
              getCardDisabledStatus={(current, selected) => {
                return isEdit ? current !== selected : Boolean(isGitXEnforced && current === StoreType.INLINE)
              }}
              onChange={item => {
                if (!isEdit) {
                  formikProps?.setFieldValue('storeType', item.type)
                }
              }}
            />
          </>
        ) : null}

        {formikProps?.values?.storeType === StoreType.REMOTE ? (
          <GitSyncForm formikProps={formikProps} isEdit={isEdit} />
        ) : null}
      </Container>
      <Layout.Horizontal spacing="small" padding={{ top: 'xlarge' }}>
        <Button variation={ButtonVariation.PRIMARY} type={'submit'} text={getString('save')} data-id="service-save" />
        <Button variation={ButtonVariation.TERTIARY} text={getString('cancel')} onClick={closeModal} />
      </Layout.Horizontal>
    </FormikForm>
  )
}

export default NewEditServiceForm
