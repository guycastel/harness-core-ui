/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Color, FontVariation } from '@harness/design-system'
import { Card, FormInput, Formik, FormikForm, Text, ThumbnailSelect } from '@harness/uicore'
import { useParams } from 'react-router-dom'
import { StepFormikFowardRef, StepViewType, setFormikRef } from '@pipeline/components/AbstractSteps/Step'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { isExecutionTimeFieldDisabled } from '@pipeline/utils/runPipelineUtils'
import { useStrings } from 'framework/strings'
import { MultiTypeTextField } from '@common/components/MultiTypeText/MultiTypeText'
import { validate } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { usePipelineContext } from '@modules/70-pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { BuildStageElementConfig } from '@modules/70-pipeline/utils/pipelineTypes'
import { ProjectPathProps } from '@modules/10-common/interfaces/RouteInterfaces'
import { FormMultiTypeConnectorField } from '@modules/27-platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { useGitScope } from '@modules/70-pipeline/utils/CIUtils'
import { ConnectorInfoDTO } from 'services/cd-ng'
import { editViewValidateFieldsConfig, transformValuesFieldsConfig } from './CreateRepoStepFunctionConfigs'
import { getFormValuesInCorrectFormat, getInitialValuesInCorrectFormat, gitStoreTypes } from '../utils'
import GitHubFields from '../GitHubFields'
import GitLabFields from '../GitLabFields'
import BitbucketFields from '../BitbucketFields'
import AzureRepoFields from '../AzureRepoFields'
import { CreateRepoStepData, CreateRepoStepEditProps } from './types'
import css from '../IDPSteps.module.scss'

const CreateRepoStepEdit = (
  props: CreateRepoStepEditProps,
  formikRef: StepFormikFowardRef<CreateRepoStepData>
): JSX.Element => {
  const { initialValues, onUpdate, isNewStep = true, readonly, stepViewType, onChange, allowableTypes } = props
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const gitScope = useGitScope()

  const isExecutionTimeFieldDisabledForStep = isExecutionTimeFieldDisabled(stepViewType)

  const { getStageFromPipeline, state } = usePipelineContext()
  const { stage: currentStage } = getStageFromPipeline<BuildStageElementConfig>(
    state.selectionState.selectedStageId || ''
  )

  const gitProviderProps = {
    readonly,
    stepViewType,
    allowableTypes
  }

  function renderGitProviderSpecificFields(connectorType: ConnectorInfoDTO['type']): React.ReactElement {
    switch (connectorType) {
      case 'Github':
        return <GitHubFields {...gitProviderProps} />
      case 'Gitlab':
        return <GitLabFields {...gitProviderProps} />
      case 'Bitbucket':
        return <BitbucketFields {...gitProviderProps} />
      case 'AzureRepo':
        return <AzureRepoFields {...gitProviderProps} />
      default:
        return <></>
    }
  }

  return (
    <Formik<CreateRepoStepData>
      initialValues={getInitialValuesInCorrectFormat(initialValues, transformValuesFieldsConfig)}
      formName="CreateRepoStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<CreateRepoStepData, CreateRepoStepData>(
          valuesToValidate,
          transformValuesFieldsConfig
        )
        onChange?.(schemaValues)

        return validate(
          valuesToValidate,
          editViewValidateFieldsConfig,
          {
            initialValues,
            steps: currentStage?.stage?.spec?.execution?.steps || {},
            serviceDependencies: currentStage?.stage?.spec?.serviceDependencies || {},
            getString
          },
          stepViewType
        )
      }}
      onSubmit={(_values: CreateRepoStepData) => {
        const schemaValues = getFormValuesInCorrectFormat<CreateRepoStepData, CreateRepoStepData>(
          _values,
          transformValuesFieldsConfig
        )
        onUpdate?.(schemaValues)
      }}
    >
      {formik => {
        setFormikRef?.(formikRef, formik)

        return (
          <FormikForm>
            {stepViewType !== StepViewType.Template && (
              <FormInput.InputWithIdentifier
                inputName="name"
                idName="identifier"
                inputLabel={getString('pipelineSteps.stepNameLabel')}
                isIdentifierEditable={isNewStep}
                inputGroupProps={{ disabled: readonly }}
              />
            )}

            <Text
              font={{ variation: FontVariation.FORM_SUB_SECTION }}
              color={Color.GREY_800}
              margin={{ bottom: 'small' }}
            >
              {getString('idp.createRepoStep.createRepoinGit')}
            </Text>

            <Card className={css.repoDetails}>
              <FormInput.RadioGroup
                name="spec.repoType"
                label={getString('repositoryType')}
                items={[
                  {
                    label: getString('idp.cookieCutterStep.public'),
                    value: 'public'
                  },
                  {
                    label: getString('idp.cookieCutterStep.private'),
                    value: 'private'
                  }
                ]}
                radioGroup={{ inline: true }}
                disabled={readonly}
              />
              <ThumbnailSelect
                name="spec.connectorType"
                items={gitStoreTypes}
                staticItems
                onChange={connectorSelected => {
                  if (connectorSelected !== formik?.values?.spec.connectorType) {
                    formik?.setFieldValue('spec.connectorRef', undefined)
                    formik?.setFieldValue('spec.description', '')
                    formik?.setFieldValue('spec.defaultBranch', '')
                    formik?.setFieldValue('spec.organization', '')
                    formik?.setFieldValue('spec.repository', '')
                    formik?.setFieldValue('spec.project', '')
                    formik?.setFieldValue('spec.workspace', '')
                  }
                  formik?.setFieldValue('spec.connectorType', connectorSelected)
                }}
              />

              <FormMultiTypeConnectorField
                label={getString('idp.createRepoStep.selectRepoConnector')}
                type={formik.values.spec.connectorType}
                name="spec.connectorRef"
                placeholder={getString('select')}
                accountIdentifier={accountId}
                projectIdentifier={projectIdentifier}
                orgIdentifier={orgIdentifier}
                multiTypeProps={{
                  expressions,
                  allowableTypes,
                  disabled: readonly
                }}
                gitScope={gitScope}
                setRefValue
                configureOptionsProps={{
                  hideExecutionTimeField: isExecutionTimeFieldDisabledForStep
                }}
              />

              {renderGitProviderSpecificFields(formik.values.spec.connectorType)}

              <MultiTypeTextField
                name="spec.description"
                className={css.publicTemplateUrl}
                label={
                  <Text
                    tooltipProps={{ dataTooltipId: 'description' }}
                    className={css.formLabel}
                    margin={{ bottom: 'medium' }}
                  >
                    {`${getString('idp.createRepoStep.repoDescription')} ${getString('common.optionalLabel')}`}
                  </Text>
                }
                multiTextInputProps={{
                  disabled: readonly,
                  placeholder: getString('idp.createRepoStep.repoDescPlaceholder'),
                  multiTextInputProps: {
                    expressions,
                    allowableTypes
                  }
                }}
                configureOptionsProps={{
                  hideExecutionTimeField: isExecutionTimeFieldDisabledForStep
                }}
              />
              <MultiTypeTextField
                name="spec.defaultBranch"
                className={css.publicTemplateUrl}
                label={
                  <Text
                    tooltipProps={{ dataTooltipId: 'defaultBranch' }}
                    className={css.formLabel}
                    margin={{ bottom: 'medium' }}
                  >
                    {getString('gitsync.defaultBranch')}
                  </Text>
                }
                multiTextInputProps={{
                  disabled: readonly,
                  placeholder: getString('pipeline.manifestType.branchPlaceholder'),
                  multiTextInputProps: {
                    expressions,
                    allowableTypes
                  }
                }}
                configureOptionsProps={{
                  hideExecutionTimeField: isExecutionTimeFieldDisabledForStep
                }}
              />
            </Card>
          </FormikForm>
        )
      }}
    </Formik>
  )
}

export const CreateRepoStepEditWithRef = React.forwardRef(CreateRepoStepEdit)
