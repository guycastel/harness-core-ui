/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Color, FontVariation } from '@harness/design-system'
import { Accordion, FormInput, Formik, FormikForm, Icon, Layout, Text } from '@harness/uicore'
import cx from 'classnames'
import type { FormikProps } from 'formik'
import { get, set } from 'lodash-es'
import React from 'react'
import { useParams } from 'react-router-dom'
import { Divider } from '@blueprintjs/core'
import { ConfigureOptions } from '@common/components/ConfigureOptions/ConfigureOptions'
import { ALLOWED_VALUES_TYPE } from '@common/components/ConfigureOptions/constants'
import { FormMultiTypeDurationField } from '@common/components/MultiTypeDuration/MultiTypeDuration'
import { useQueryParams } from '@common/hooks'
import type { GitQueryParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { ConnectorConfigureOptions } from '@platform/connectors/components/ConnectorConfigureOptions/ConnectorConfigureOptions'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { getIconByType } from '@platform/connectors/pages/connectors/utils/ConnectorUtils'
import FileStoreSelectField from '@filestore/components/MultiTypeFileSelect/FileStoreSelect/FileStoreSelectField'
import { StepFormikFowardRef, StepViewType, setFormikRef } from '@pipeline/components/AbstractSteps/Step'
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
import { isExecutionTimeFieldDisabled } from '@pipeline/utils/runPipelineUtils'
import { isValueRuntimeInput } from '@common/utils/utils'
import MultiTypePolicySetSelector from '@modules/70-pipeline/components/PipelineSteps/Common/PolicySets/MultiTypePolicySetSelector/MultiTypePolicySetSelector'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { SettingType } from '@modules/10-common/constants/Utils'
import { SettingValueResponseDTO, useGetSettingValue } from 'services/cd-ng'
import { editViewValidateFieldsConfig, transformValuesFieldsConfig } from './PolicyEnforcementStepFunctionConfigs'
import { PolicyEnforcementCdStepData, PolicyEnforcementStepData, SscaStepProps } from '../common/types'
import { commonDefaultEnforcementSpecValues } from '../common/default-values'
import { ArtifactSourceSection } from '../common/ArtifactSourceSection'
import { getArtifactTypes } from '../common/select-options'
import css from '../SscaStep.module.scss'

const setFormikField = (formik: FormikProps<any>, field: string) => (value: unknown) => {
  formik.setFieldValue(field, value)
}

const _PolicyEnforcementStepBase = <T extends PolicyEnforcementStepData | PolicyEnforcementCdStepData>(
  props: SscaStepProps<T>,
  formikRef: StepFormikFowardRef<T>
): JSX.Element => {
  const { initialValues, onUpdate, isNewStep, readonly, stepViewType, onChange, allowableTypes, stepType } = props
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const isExecutionTimeFieldDisabledForStep = isExecutionTimeFieldDisabled(stepViewType)
  const { SSCA_ENFORCEMENT_OPA, SSCA_REPO_ARTIFACT } = useFeatureFlags()

  const { getStageFromPipeline, state } = usePipelineContext()
  const { stage: currentStage } = getStageFromPipeline<BuildStageElementConfig>(
    state.selectionState.selectedStageId || ''
  )
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()

  const _initialValues = getInitialValuesInCorrectFormat<T, T>(initialValues, transformValuesFieldsConfig(stepType))

  // for an existing step set opa true if there isn't a filestore
  if (SSCA_ENFORCEMENT_OPA && !get(_initialValues, 'spec.policy.store.spec.file')) {
    set(_initialValues, 'spec.policy.opa', true)
    set(_initialValues, 'spec.policy.store', undefined)
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
        const schemaValues = getFormValuesInCorrectFormat<T, T>(valuesToValidate, transformValuesFieldsConfig(stepType))
        onChange?.(schemaValues)
        return validate(
          valuesToValidate,
          editViewValidateFieldsConfig({
            stepType,
            isOpa: !!get(valuesToValidate, 'spec.policy.opa'),
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
        const schemaValues = getFormValuesInCorrectFormat<T, T>(_values, transformValuesFieldsConfig(stepType))
        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<T>) => {
        // This is required
        setFormikRef?.(formikRef, formik)
        const isRepoArtifact = get(formik.values, 'spec.source.type') === 'repository'

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
                {getString('ssca.orchestrationStep.artifactSource')}
              </Text>

              <FormInput.RadioGroup
                items={getArtifactTypes(getString, SSCA_REPO_ARTIFACT)}
                name="spec.source.type"
                label={getString('pipeline.artifactsSelection.artifactType')}
                disabled={readonly}
                radioGroup={{ inline: true }}
                onChange={(e): void => {
                  const _isRepoArtifact = e.currentTarget.value === 'repository'
                  formik.setFieldValue('spec.source.spec', { variant_type: _isRepoArtifact ? 'git-branch' : undefined })
                  formik.setFieldValue(
                    'spec.verifyAttestation',
                    _isRepoArtifact ? undefined : commonDefaultEnforcementSpecValues.verifyAttestation
                  )
                }}
              />

              <ArtifactSourceSection {...props} />

              {!isRepoArtifact && (
                <>
                  <Divider style={{ marginTop: 'var(--spacing-large)' }} />

                  <Text
                    font={{ variation: FontVariation.FORM_SUB_SECTION }}
                    color={Color.GREY_900}
                    margin={{ top: 'small' }}
                  >
                    {getString('ssca.enforcementStep.verifyAttestation')}
                  </Text>

                  <MultiTypeSecretInput
                    type={getBase64EncodingEnabled(enableBase64Encoding?.data) ? undefined : 'SecretFile'}
                    name="spec.verifyAttestation.spec.publicKey"
                    label={getString('ssca.publicKey')}
                    expressions={expressions}
                    allowableTypes={allowableTypes}
                    enableConfigureOptions
                    configureOptionsProps={{
                      isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabledForStep
                    }}
                    disabled={readonly}
                  />
                </>
              )}
              <Divider style={{ marginTop: 'var(--spacing-small)' }} />

              <Text
                font={{ variation: FontVariation.FORM_SUB_SECTION }}
                color={Color.GREY_900}
                margin={{ top: 'small' }}
              >
                {getString('ssca.enforcementStep.policyConfiguration')}
              </Text>

              {SSCA_ENFORCEMENT_OPA && (
                <FormInput.Toggle
                  name="spec.policy.opa"
                  label={getString('ssca.useOpaPolicy')}
                  onToggle={enabled => {
                    if (enabled) {
                      set(formik, 'values.spec.policy.store', undefined)
                    } else {
                      set(formik, 'values.spec.policy.policySets', undefined)
                      set(formik, 'values.spec.policy.store', commonDefaultEnforcementSpecValues.policy.store)
                    }
                  }}
                />
              )}

              {get(formik.values, 'spec.policy.opa') ? (
                <MultiTypePolicySetSelector
                  name={'spec.policy.policySets'}
                  label={getString('common.policy.policysets')}
                  disabled={readonly}
                  expressions={expressions}
                  policyType="sbom"
                />
              ) : (
                <FileStoreSelectField
                  label={getString('common.git.filePath')}
                  name="spec.policy.store.spec.file"
                  onChange={setFormikField(formik, 'spec.policy.store.spec.file')}
                />
              )}

              {stepType === StepType.PolicyEnforcementCd && (
                <>
                  <Text
                    font={{ variation: FontVariation.FORM_SUB_SECTION }}
                    color={Color.GREY_900}
                    margin={{ top: 'medium' }}
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
                        onChange={setFormikField(formik, 'spec.infrastructure.spec.connector')}
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
                        onChange={setFormikField(formik, 'spec.infrastructure.spec.namespace')}
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
                          value={get(formik.values, 'spec.infrastructure.spec.resources.limits.memory')}
                          type="String"
                          variableName="spec.infrastructure.spec.resources.limits.memory"
                          showRequiredField={false}
                          showDefaultField={false}
                          onChange={setFormikField(formik, 'spec.infrastructure.spec.resources.limits.memory')}
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
                          onChange={setFormikField(formik, 'spec.infrastructure.spec.resources.limits.cpu')}
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
                      {stepType === StepType.PolicyEnforcement && (
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
                              onChange={setFormikField(formik, 'spec.resources.limits.memory')}
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
                              onChange={setFormikField(formik, 'spec.resources.limits.cpu')}
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

export const PolicyEnforcementStepBase = React.forwardRef(_PolicyEnforcementStepBase)
