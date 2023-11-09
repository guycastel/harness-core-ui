/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { defaultTo, noop } from 'lodash-es'
import { Button, Container, FormikForm, Text } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { Formik } from 'formik'
import * as Yup from 'yup'
import { useStrings } from 'framework/strings'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { isContextTypeNotStageTemplate } from '@pipeline/components/PipelineStudio/PipelineUtils'
import { NameId, NameIdDescriptionTags } from '@common/components/NameIdDescriptionTags/NameIdDescriptionTags'
import type { IDPStageElementConfig, StageElementWrapper } from '@pipeline/utils/pipelineTypes'
import { isDuplicateStageId } from '@pipeline/components/PipelineStudio/StageBuilder/StageBuilderUtil'
import { getNameAndIdentifierSchema } from '@pipeline/utils/tempates'
import { createTemplate } from '@pipeline/utils/templateUtils'
import type { GitQueryParams } from '@common/interfaces/RouteInterfaces'
import { useQueryParams } from '@common/hooks/useQueryParams'
import type { IDPStageMinimalModeProps, IDPStageMinimalValues } from './types'
import css from './IDPStage.module.scss'

const getInitialValues = (data?: StageElementWrapper<IDPStageElementConfig>): IDPStageMinimalValues => {
  return {
    identifier: data?.stage?.identifier || '',
    name: data?.stage?.name || '',
    description: data?.stage?.description,
    tags: data?.stage?.tags || {}
  }
}

export function IDPStageMinimalMode(props: IDPStageMinimalModeProps): React.ReactElement {
  const { getString } = useStrings()
  const { onChange, onSubmit = noop, data, template } = props

  const {
    state: { pipeline, gitDetails },
    contextType
  } = usePipelineContext()

  const { branch, repoName } = useQueryParams<GitQueryParams>()
  const parentTemplateBranch = defaultTo(gitDetails?.branch, branch)
  //repoName is for pipelines and repoIdentifier for templates
  const parentTemplateRepo = defaultTo(defaultTo(gitDetails?.repoName, gitDetails?.repoIdentifier), repoName)

  const handleValidate = (values: IDPStageMinimalValues): Record<string, string | undefined> | undefined => {
    const errors: { name?: string } = {}
    /* istanbul ignore next */
    if (isDuplicateStageId(values.identifier, pipeline?.stages || [])) {
      errors.name = getString('validation.identifierDuplicate')
    }
    /* istanbul ignore next */
    if (data) {
      /* istanbul ignore next */
      onChange?.(values)
    }
    return errors
  }

  const handleSubmit = (values: IDPStageMinimalValues): void => {
    /* istanbul ignore next */
    if (data?.stage) {
      /* istanbul ignore next */
      if (template) {
        onSubmit(
          { stage: createTemplate(values, template, parentTemplateBranch, parentTemplateRepo) },
          values.identifier
        )
      } else {
        data.stage.identifier = values.identifier
        data.stage.name = values.name
        data.stage.description = values.description
        data.stage.tags = values.tags
        onSubmit(data, values.identifier)
      }
    }
  }

  return (
    <Container padding="xxlarge" className={css.idpStagePopover}>
      <Formik
        enableReinitialize
        initialValues={getInitialValues(data)}
        validationSchema={Yup.object().shape({
          ...getNameAndIdentifierSchema(getString, contextType)
        })}
        validate={handleValidate}
        onSubmit={values => handleSubmit(values)}
      >
        {formikProps => (
          <FormikForm>
            <Text
              icon="idp"
              iconProps={{ size: 16 }}
              margin={{ bottom: 'medium' }}
              className={css.addStageHeading}
              style={{ fontVariant: FontVariation.H5, color: Color.GREY_800 }}
            >
              {getString('pipelineSteps.build.create.aboutYourStage')}
            </Text>

            {isContextTypeNotStageTemplate(contextType) &&
              (template ? (
                <NameId
                  identifierProps={{
                    inputLabel: getString('stageNameLabel')
                  }}
                />
              ) : (
                <NameIdDescriptionTags
                  formikProps={formikProps}
                  identifierProps={{
                    inputLabel: getString('stageNameLabel')
                  }}
                />
              ))}
            <Button
              type="submit"
              intent="primary"
              text={getString('pipelineSteps.build.create.setupStage')}
              margin={{ top: 'small' }}
            />
          </FormikForm>
        )}
      </Formik>
    </Container>
  )
}