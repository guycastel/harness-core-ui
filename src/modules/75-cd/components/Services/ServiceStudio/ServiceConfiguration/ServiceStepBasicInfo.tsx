/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback } from 'react'
import { Card, Formik, FormikForm, Text } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { Divider } from '@blueprintjs/core'
import { debounce, defaultTo, isEmpty, noop } from 'lodash-es'
import * as Yup from 'yup'
import { NameIdDescriptionTags } from '@common/components'
import { NameSchema } from '@common/utils/Validation'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import type { NGServiceV2InfoConfig } from 'services/cd-ng'
import { GitSyncForm, GitSyncFormFields } from '@gitsync/components/GitSyncForm/GitSyncForm'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { useServiceContext } from '@cd/context/ServiceContext'
import { useStrings } from 'framework/strings'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { InlineRemoteSelect } from '@modules/10-common/components/InlineRemoteSelect/InlineRemoteSelect'
import { getConnectorValue } from '@modules/27-platform/connectors/components/ConnectorReferenceField/ConnectorReferenceField'
import css from './ServiceConfiguration.module.scss'

function ServiceStepBasicInfo(): React.ReactElement {
  const { getString } = useStrings()
  const isGitXEnabledForServices = useFeatureFlag(FeatureFlag.CDS_SERVICE_GITX)

  const {
    state: { pipeline, storeMetadata, gitDetails },
    isReadonly,
    updatePipeline,
    updatePipelineStoreMetadata
  } = usePipelineContext()

  const { isServiceCreateModalView, isGitXEnforced } = useServiceContext()
  const [gitConnector, setGitConnector] = React.useState(storeMetadata?.connectorRef)

  const initialGitFormValue = {
    connectorRef: gitConnector || storeMetadata?.connectorRef,
    repo: gitDetails?.repoName,
    filePath: gitDetails?.filePath,
    storeType: storeMetadata?.storeType || (isGitXEnabledForServices ? StoreType.INLINE : undefined)
  }
  const onUpdate = useCallback(
    (value: NGServiceV2InfoConfig & GitSyncFormFields & StoreMetadata): void => {
      updatePipeline({ ...value })

      if (value.storeType) {
        updatePipelineStoreMetadata(
          {
            storeType: value.storeType,
            connectorRef: value.connectorRef ? getConnectorValue(value.connectorRef) : undefined
          },
          { repoName: value?.repo, branch: value?.branch, filePath: value?.filePath }
        )
      }
    },
    [pipeline]
  )
  const delayedOnUpdate = React.useRef(debounce(onUpdate || noop, 1000)).current

  return (
    <div className={css.serviceStepBasicInfo}>
      <Formik
        enableReinitialize
        initialValues={{ ...pipeline, ...initialGitFormValue }}
        validate={values => {
          if (isEmpty(values.name)) {
            return
          }

          const selectedConnector = values.connectorRef ? getConnectorValue(values.connectorRef) : undefined
          if (values.storeType === StoreType.REMOTE && selectedConnector !== gitConnector) {
            // enableReinitialize will reset the connector before it is saved in context
            setGitConnector(selectedConnector)
          }
          delayedOnUpdate(values)
        }}
        validationSchema={Yup.object().shape({
          name: NameSchema(getString)
        })}
        formName="service-entity"
        onSubmit={noop}
      >
        {formikProps => (
          <FormikForm>
            <div className={css.tabHeading} id="serviceBasicInfo">
              {getString('cd.pipelineSteps.serviceTab.aboutYourService')}
            </div>
            <Card className={css.sectionCard}>
              <NameIdDescriptionTags
                className={css.nameIdDescriptionTags}
                formikProps={formikProps}
                identifierProps={{
                  isIdentifierEditable: isServiceCreateModalView,
                  inputGroupProps: {
                    disabled: isReadonly
                  }
                }}
                descriptionProps={{ disabled: isReadonly }}
                tagsProps={{ disabled: isReadonly }}
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
                      return isServiceCreateModalView
                        ? Boolean(isGitXEnforced && current === StoreType.INLINE)
                        : current !== selected
                    }}
                    onChange={item => {
                      if (isServiceCreateModalView) {
                        formikProps?.setFieldValue('storeType', item.type)
                      }
                    }}
                  />
                </>
              ) : null}
              {formikProps?.values?.storeType === StoreType.REMOTE ? (
                <GitSyncForm
                  formikProps={formikProps}
                  isEdit={!isServiceCreateModalView}
                  skipBranch={!isServiceCreateModalView}
                  disableFields={
                    isServiceCreateModalView
                      ? {}
                      : {
                          provider: true,
                          connectorRef: true,
                          repoName: true,
                          filePath: false
                        }
                  }
                  initialValues={initialGitFormValue}
                />
              ) : null}
            </Card>
          </FormikForm>
        )}
      </Formik>
    </div>
  )
}

export default ServiceStepBasicInfo
