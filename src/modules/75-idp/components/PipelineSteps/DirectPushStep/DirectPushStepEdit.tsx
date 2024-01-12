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
import { useGitScope } from '@modules/70-pipeline/utils/CIUtils'
import { FormMultiTypeConnectorField } from '@modules/27-platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { ConnectorInfoDTO } from 'services/cd-ng'
import { editViewValidateFieldsConfig, transformValuesFieldsConfig } from './DirectPushStepFunctionConfigs'
import { getFormValuesInCorrectFormat, getInitialValuesInCorrectFormat, gitStoreTypes } from '../utils'
import { DirectPushStepData, DirectPushStepEditProps } from './types'
import GitHubFields from '../GitHubFields'
import GitLabFields from '../GitLabFields'
import BitbucketFields from '../BitbucketFields'
import AzureRepoFields from '../AzureRepoFields'
import css from '../IDPSteps.module.scss'

const DirectPushStepEdit = (
  props: DirectPushStepEditProps,
  formikRef: StepFormikFowardRef<DirectPushStepData>
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
    <Formik<DirectPushStepData>
      initialValues={getInitialValuesInCorrectFormat(initialValues, transformValuesFieldsConfig)}
      formName="DirectPushStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<DirectPushStepData, DirectPushStepData>(
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
      onSubmit={(_values: DirectPushStepData) => {
        const schemaValues = getFormValuesInCorrectFormat<DirectPushStepData, DirectPushStepData>(
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
              {getString('idp.directPushStep.provideRepoDetailstoPublish')}
            </Text>

            <Card className={css.repoDetails}>
              <ThumbnailSelect
                name="spec.connectorType"
                items={gitStoreTypes}
                staticItems
                onChange={connectorSelected => {
                  if (connectorSelected !== formik?.values?.spec.connectorType) {
                    formik?.setFieldValue('spec.connectorRef', undefined)
                    formik?.setFieldValue('spec.codeDirectory', '')
                    formik?.setFieldValue('spec.branch', '')
                    formik?.setFieldValue('spec.codeOutputDirectory', '')
                    formik?.setFieldValue('spec.organization', '')
                    formik?.setFieldValue('spec.repository', '')
                    formik?.setFieldValue('spec.project', '')
                    formik?.setFieldValue('spec.workspace', '')
                  }
                  formik?.setFieldValue('spec.connectorType', connectorSelected)
                }}
              />
              <FormMultiTypeConnectorField
                label={getString('idp.directPushStep.codebaseRepoConnector')}
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
                name="spec.codeDirectory"
                className={css.publicTemplateUrl}
                label={
                  <Text
                    tooltipProps={{ dataTooltipId: 'codeDirectory' }}
                    className={css.formLabel}
                    margin={{ bottom: 'medium' }}
                  >
                    {getString('idp.directPushStep.codeDirectory')}
                  </Text>
                }
                multiTextInputProps={{
                  disabled: readonly,
                  placeholder: getString('idp.directPushStep.codeDirectoryPlaceholder'),
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
                name="spec.branch"
                className={css.publicTemplateUrl}
                label={
                  <Text
                    tooltipProps={{ dataTooltipId: 'branch' }}
                    className={css.formLabel}
                    margin={{ bottom: 'medium' }}
                  >
                    {getString('common.git.branchName')}
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
            <Text
              font={{ variation: FontVariation.FORM_SUB_SECTION }}
              color={Color.GREY_800}
              margin={{ top: 'xlarge', bottom: 'small' }}
            >
              {getString('advancedTitle')}
            </Text>

            <Card className={css.repoDetails}>
              <MultiTypeTextField
                name="spec.codeOutputDirectory"
                label={
                  <Text tooltipProps={{ dataTooltipId: 'codeOutputDirectory' }} className={css.formLabel}>
                    {`${getString('idp.directPushStep.outputCodeDir')} ${getString('common.optionalLabel')}`}
                  </Text>
                }
                multiTextInputProps={{
                  disabled: readonly,
                  placeholder: getString('idp.directPushStep.outputCodeDirPlaceholder'),
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

export const DirectPushStepEditWithRef = React.forwardRef(DirectPushStepEdit)
