/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Color, FontVariation } from '@harness/design-system'
import {
  Accordion,
  Checkbox,
  Container,
  Formik,
  FormikForm,
  FormInput,
  Icon,
  Layout,
  SelectOption,
  Text
} from '@harness/uicore'
import cx from 'classnames'
import type { FormikProps } from 'formik'
import { get, set } from 'lodash-es'
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Divider } from '@blueprintjs/core'
import { ALLOWED_VALUES_TYPE, ConfigureOptions } from '@common/components/ConfigureOptions/ConfigureOptions'
import { FormMultiTypeDurationField } from '@common/components/MultiTypeDuration/MultiTypeDuration'
import { MultiTypeTextField } from '@common/components/MultiTypeText/MultiTypeText'
import { useQueryParams } from '@common/hooks'
import type { GitQueryParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { ConnectorConfigureOptions } from '@platform/connectors/components/ConnectorConfigureOptions/ConnectorConfigureOptions'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { getIconByType } from '@platform/connectors/pages/connectors/utils/ConnectorUtils'
import { setFormikRef, StepFormikFowardRef, StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import {
  getFormValuesInCorrectFormat,
  getInitialValuesInCorrectFormat
} from '@pipeline/components/PipelineSteps/Steps/StepsTransformValuesUtils'
import { validate } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import type { BuildStageElementConfig } from '@pipeline/utils/pipelineTypes'
import MultiTypeSecretInput from '@secrets/components/MutiTypeSecretInput/MultiTypeSecretInput'
import { useStrings } from 'framework/strings'
import type {} from 'services/ci'
import { isExecutionTimeFieldDisabled } from '@pipeline/utils/runPipelineUtils'
import { isValueRuntimeInput } from '@common/utils/utils'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { SettingType } from '@modules/10-common/constants/Utils'
import { SettingValueResponseDTO, useGetSettingValue } from 'services/cd-ng'
import { editViewValidateFieldsConfig, transformValuesFieldsConfig } from './SBOMOrchestrationStepFunctionConfigs'
import { SBOMOrchestrationStepData, SBOMOrchestrationCdStepData, SscaStepProps } from '../common/types'
import { AllMultiTypeInputTypesForStep } from '../common/default-values'
import { sbomFormats, getSbomDriftModes, getSbomSourcingModes, sbomGenerationTools } from '../common/select-options'
import { ArtifactSourceSection } from '../common/ArtifactSourceSection'
import css from '../SscaStep.module.scss'

const _SBOMOrchestrationStepBase = <T extends SBOMOrchestrationStepData | SBOMOrchestrationCdStepData>(
  props: SscaStepProps<T>,
  formikRef: StepFormikFowardRef<T>
): JSX.Element => {
  const {
    initialValues,
    onUpdate,
    isNewStep = true,
    readonly,
    stepViewType,
    onChange,
    allowableTypes,
    stepType
  } = props
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const { SSCA_SBOM_DRIFT } = useFeatureFlags()

  const [detectSbomDrift, setDetectSbomDrift] = useState(
    isNewStep ? SSCA_SBOM_DRIFT : SSCA_SBOM_DRIFT && !!get(initialValues, 'spec.sbom_drift.base')
  )

  const isExecutionTimeFieldDisabledForStep = isExecutionTimeFieldDisabled(stepViewType)
  const { getStageFromPipeline, state } = usePipelineContext()
  const { stage: currentStage } = getStageFromPipeline<BuildStageElementConfig>(
    state.selectionState.selectedStageId || ''
  )
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()

  const _initialValues = getInitialValuesInCorrectFormat<T, T>(
    initialValues,
    transformValuesFieldsConfig(stepType, initialValues)
  )

  if (isNewStep && detectSbomDrift && !get(_initialValues, 'spec.sbom_drift.base')) {
    set(_initialValues, 'spec.sbom_drift.base', 'last_generated_sbom')
  }

  const { data: enableBase64Encoding } = useGetSettingValue({
    identifier: SettingType.USE_BASE64_ENCODED_SECRETS_FOR_ATTESTATION,
    queryParams: { accountIdentifier: accountId, orgIdentifier, projectIdentifier }
  })

  const getBase64EncodingEnabled = (data?: SettingValueResponseDTO): boolean => data?.value === 'true'

  return (
    <Formik
      initialValues={_initialValues}
      formName={stepType}
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<T, T>(
          valuesToValidate,
          transformValuesFieldsConfig(stepType, valuesToValidate)
        )
        onChange?.(schemaValues)
        return validate(
          valuesToValidate,
          editViewValidateFieldsConfig({
            stepType,
            isRepoArtifact: get(valuesToValidate, 'spec.source.type') === 'repository'
          }),
          {
            initialValues,
            steps: currentStage?.stage?.spec?.execution?.steps || {},
            serviceDependencies: currentStage?.stage?.spec?.serviceDependencies || {},
            getString
          },
          stepViewType
        )
      }}
      onSubmit={(_values: T) => {
        const schemaValues = getFormValuesInCorrectFormat<T, T>(_values, transformValuesFieldsConfig(stepType, _values))
        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<T>) => {
        // This is required
        setFormikRef?.(formikRef, formik)

        return (
          <FormikForm>
            <div className={css.stepContainer}>
              {stepViewType !== StepViewType.Template && (
                <div>
                  <FormInput.InputWithIdentifier
                    inputName="name"
                    idName="identifier"
                    inputLabel={getString('pipelineSteps.stepNameLabel')}
                    isIdentifierEditable={isNewStep}
                    inputGroupProps={{ disabled: readonly }}
                  />

                  <Divider />
                </div>
              )}

              <Text
                font={{ variation: FontVariation.FORM_SUB_SECTION }}
                color={Color.GREY_900}
                margin={{ top: 'small' }}
              >
                {getString('ssca.orchestrationStep.sbomMethod')}
              </Text>

              <FormInput.RadioGroup
                items={getSbomSourcingModes(getString)}
                name="spec.mode"
                label={getString('ssca.orchestrationStep.Mode')}
                disabled={readonly}
                radioGroup={{ inline: true }}
              />

              {get(formik.values, 'spec.mode') === 'ingestion' ? (
                <>
                  <MultiTypeTextField
                    name="spec.ingestion.file"
                    label={<Text className={css.formLabel}>{getString('ssca.orchestrationStep.ingestion.file')}</Text>}
                    multiTextInputProps={{
                      disabled: readonly,
                      multiTextInputProps: {
                        expressions,
                        allowableTypes: AllMultiTypeInputTypesForStep
                      }
                    }}
                    configureOptionsProps={{
                      hideExecutionTimeField: isExecutionTimeFieldDisabledForStep
                    }}
                  />
                </>
              ) : (
                <>
                  <FormInput.Select
                    items={sbomGenerationTools}
                    name="spec.tool.type"
                    label={getString('ssca.orchestrationStep.sbomTool')}
                    placeholder={getString('select')}
                    disabled={readonly}
                  />

                  <FormInput.Select
                    items={sbomFormats as SelectOption[]}
                    name="spec.tool.spec.format"
                    label={getString('ssca.orchestrationStep.sbomFormat')}
                    placeholder={getString('select')}
                    disabled={readonly}
                  />
                </>
              )}

              <Divider style={{ marginBottom: 'var(--spacing-small)' }} />
              <ArtifactSourceSection {...props} />
              <Divider style={{ marginTop: 'var(--spacing-large)' }} />

              <Text
                font={{ variation: FontVariation.FORM_SUB_SECTION }}
                color={Color.GREY_900}
                margin={{ top: 'small' }}
              >
                {getString('ssca.orchestrationStep.sbomAttestation')}
              </Text>

              <MultiTypeSecretInput
                type={getBase64EncodingEnabled(enableBase64Encoding?.data) ? undefined : 'SecretFile'}
                name="spec.attestation.spec.privateKey"
                label={getString('platform.connectors.serviceNow.privateKey')}
                expressions={expressions}
                allowableTypes={allowableTypes}
                enableConfigureOptions
                configureOptionsProps={{
                  isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
                }}
                disabled={readonly}
              />

              <MultiTypeSecretInput
                name="spec.attestation.spec.password"
                label={getString('password')}
                expressions={expressions}
                allowableTypes={allowableTypes}
                enableConfigureOptions
                configureOptionsProps={{
                  isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
                }}
                disabled={readonly}
              />

              {SSCA_SBOM_DRIFT && (
                <>
                  <Divider />

                  <Text
                    font={{ variation: FontVariation.FORM_SUB_SECTION }}
                    color={Color.GREY_900}
                    margin={{ top: 'small' }}
                  >
                    {getString('ssca.orchestrationStep.sbomDrift')}
                  </Text>
                  <Checkbox
                    label={getString('ssca.orchestrationStep.detectSbomDrift')}
                    checked={detectSbomDrift}
                    onChange={e => {
                      const isChecked = e.currentTarget.checked
                      setDetectSbomDrift(isChecked)

                      if (isChecked) {
                        set(formik.values, 'spec.sbom_drift.base', 'last_generated_sbom')
                      } else {
                        set(formik.values, 'spec.sbom_drift', undefined)
                      }
                    }}
                  />
                  {detectSbomDrift && (
                    <Container margin={{ left: 'xlarge' }}>
                      <FormInput.RadioGroup
                        items={getSbomDriftModes(getString)}
                        name="spec.sbom_drift.base"
                        disabled={readonly}
                      />
                    </Container>
                  )}
                </>
              )}

              {stepType === StepType.SBOMOrchestrationCd && (
                <>
                  <Divider />

                  <Text
                    font={{ variation: FontVariation.FORM_SUB_SECTION }}
                    color={Color.GREY_900}
                    margin={{ top: 'small' }}
                  >
                    {getString('infrastructureText')}
                  </Text>

                  <div className={css.formGroup}>
                    <FormMultiTypeConnectorField
                      name="spec.infrastructure.spec.connectorRef"
                      label={getString('connector')}
                      placeholder={getString('common.entityPlaceholderText')}
                      disabled={readonly}
                      accountIdentifier={accountId}
                      multiTypeProps={{ expressions, disabled: readonly, allowableTypes }}
                      projectIdentifier={projectIdentifier}
                      orgIdentifier={orgIdentifier}
                      enableConfigureOptions={false}
                      setRefValue
                      gitScope={{ repo: repoIdentifier || '', branch, getDefaultFromOtherRepo: true }}
                    />
                    {isValueRuntimeInput(get(formik.values, 'spec.infrastructure.spec.connectorRef')) && !readonly && (
                      <ConnectorConfigureOptions
                        style={{ marginTop: 10 }}
                        value={get(formik.values, 'spec.infrastructure.spec.connectorRef')}
                        type={
                          <Layout.Horizontal spacing="medium" style={{ alignItems: 'center' }}>
                            <Icon name={getIconByType('K8sCluster')}></Icon>
                            <Text>{getString('pipelineSteps.kubernetesInfraStep.kubernetesConnector')}</Text>
                          </Layout.Horizontal>
                        }
                        variableName="spec.infrastructure.spec.connector"
                        showRequiredField={false}
                        showDefaultField={false}
                        onChange={value => {
                          formik.setFieldValue('spec.infrastructure.spec.connector', value)
                        }}
                        isReadonly={readonly}
                        connectorReferenceFieldProps={{
                          accountIdentifier: accountId,
                          projectIdentifier,
                          orgIdentifier,
                          label: getString('connector'),
                          disabled: readonly,
                          gitScope: { repo: repoIdentifier || '', branch, getDefaultFromOtherRepo: true },
                          tooltipProps: {
                            dataTooltipId: 'k8InfraConnector'
                          }
                        }}
                      />
                    )}
                  </div>
                  <div className={css.formGroup}>
                    <FormInput.MultiTextInput
                      name="spec.infrastructure.spec.namespace"
                      style={{ width: '400px' }}
                      disabled={readonly}
                      label={getString('common.namespace')}
                      placeholder={getString('pipeline.infraSpecifications.namespacePlaceholder')}
                      multiTextInputProps={{ expressions, textProps: { disabled: readonly }, allowableTypes }}
                    />
                    {isValueRuntimeInput(get(formik.values, 'spec.infrastructure.spec.namespace')) && !readonly && (
                      <ConfigureOptions
                        value={get(formik.values, 'spec.infrastructure.spec.namespace')}
                        type="String"
                        variableName="spec.infrastructure.spec.namespace"
                        showRequiredField={false}
                        showDefaultField={false}
                        onChange={value => {
                          formik.setFieldValue('spec.infrastructure.spec.namespace', value)
                        }}
                        isReadonly={readonly}
                        allowedValuesType={ALLOWED_VALUES_TYPE.TEXT}
                      />
                    )}
                  </div>

                  <Layout.Horizontal spacing="small">
                    <FormInput.MultiTextInput
                      name="spec.infrastructure.spec.resources.limits.memory"
                      label={getString('pipelineSteps.limitMemoryLabel')}
                      multiTextInputProps={{
                        expressions,
                        textProps: { disabled: readonly },
                        allowableTypes
                      }}
                      tooltipProps={{ dataTooltipId: 'setContainerResources' }}
                    />
                    {isValueRuntimeInput(get(formik.values, 'spec.infrastructure.spec.resources.limits.memory')) &&
                      !readonly && (
                        <ConfigureOptions
                          style={{ marginTop: 18 }}
                          value={get(formik.values, 'spec.infrastructure.spec.resources.limits.memory ')}
                          type="String"
                          variableName="spec.infrastructure.spec.resources.limits.memory"
                          showRequiredField={false}
                          showDefaultField={false}
                          onChange={value => {
                            formik.setFieldValue('spec.infrastructure.spec.resources.limits.memory', value)
                          }}
                          isReadonly={readonly}
                          allowedValuesType={ALLOWED_VALUES_TYPE.TEXT}
                        />
                      )}

                    <FormInput.MultiTextInput
                      name="spec.infrastructure.spec.resources.limits.cpu"
                      label={getString('pipelineSteps.limitCPULabel')}
                      multiTextInputProps={{
                        expressions,
                        allowableTypes,
                        disabled: readonly
                      }}
                      tooltipProps={{ dataTooltipId: 'setContainerResources' }}
                    />
                    {isValueRuntimeInput(get(formik.values, 'spec.infrastructure.spec.resources.limits.cpu')) &&
                      !readonly && (
                        <ConfigureOptions
                          style={{ marginTop: 18 }}
                          value={get(formik.values, 'spec.infrastructure.spec.resources.limits.cpu')}
                          type="String"
                          variableName="spec.infrastructure.spec.resources.limits.cpu"
                          showRequiredField={false}
                          showDefaultField={false}
                          onChange={value => {
                            formik.setFieldValue('spec.infrastructure.spec.resources.limits.cpu', value)
                          }}
                          isReadonly={readonly}
                          allowedValuesType={ALLOWED_VALUES_TYPE.TEXT}
                        />
                      )}
                  </Layout.Horizontal>
                </>
              )}

              <Accordion>
                <Accordion.Panel
                  id="optional-config"
                  summary={getString('common.optionalConfig')}
                  details={
                    <div className={cx(css.stepContainer)}>
                      <FormMultiTypeDurationField
                        name="timeout"
                        label={getString('pipelineSteps.timeoutLabel')}
                        multiTypeDurationProps={{ enableConfigureOptions: true, expressions, allowableTypes }}
                        disabled={readonly}
                      />
                      {stepType === StepType.SBOMOrchestration && (
                        <Layout.Horizontal spacing="small">
                          <FormInput.MultiTextInput
                            name="spec.resources.limits.memory"
                            label={getString('pipelineSteps.limitMemoryLabel')}
                            multiTextInputProps={{
                              expressions,
                              textProps: { disabled: readonly },
                              allowableTypes
                            }}
                            tooltipProps={{ dataTooltipId: 'setContainerResources' }}
                          />
                          {isValueRuntimeInput(get(formik.values, 'spec.resources.limits.memory')) && !readonly && (
                            <ConfigureOptions
                              style={{ marginTop: 18 }}
                              value={get(formik.values, 'spec.resources.limits.memory')}
                              type="String"
                              variableName="spec.resources.limits.memory"
                              showRequiredField={false}
                              showDefaultField={false}
                              onChange={value => {
                                formik.setFieldValue('spec.resources.limits.memory', value)
                              }}
                              isReadonly={readonly}
                              allowedValuesType={ALLOWED_VALUES_TYPE.TEXT}
                            />
                          )}
                          <FormInput.MultiTextInput
                            name="spec.resources.limits.cpu"
                            label={getString('pipelineSteps.limitCPULabel')}
                            multiTextInputProps={{
                              expressions,
                              allowableTypes,
                              disabled: readonly
                            }}
                            tooltipProps={{ dataTooltipId: 'setContainerResources' }}
                          />
                          {isValueRuntimeInput(get(formik.values, 'spec.resources.limits.cpu')) && !readonly && (
                            <ConfigureOptions
                              style={{ marginTop: 18 }}
                              value={get(formik.values, 'spec.resources.limits.cpu')}
                              type="String"
                              variableName="spec.resources.limits.cpu"
                              showRequiredField={false}
                              showDefaultField={false}
                              onChange={value => {
                                formik.setFieldValue('spec.resources.limits.cpu', value)
                              }}
                              isReadonly={readonly}
                              allowedValuesType={ALLOWED_VALUES_TYPE.TEXT}
                            />
                          )}
                        </Layout.Horizontal>
                      )}
                    </div>
                  }
                />
              </Accordion>
            </div>
          </FormikForm>
        )
      }}
    </Formik>
  )
}

export const SBOMOrchestrationStepBase = React.forwardRef(_SBOMOrchestrationStepBase)
