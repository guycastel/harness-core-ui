/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
import React, { useState } from 'react'
import {
  StepProps,
  Layout,
  Text,
  Container,
  FormInput,
  Formik,
  Button,
  ButtonVariation,
  PageSpinner,
  FormikForm,
  MultiTypeInputType,
  ModalErrorHandler,
  ModalErrorHandlerBinding,
  getErrorInfoFromErrorObject,
  TextInput,
  HarnessDocTooltip,
  FormError
} from '@harness/uicore'

import * as Yup from 'yup'
import { FontVariation } from '@harness/design-system'
import { parse } from 'yaml'
import type { FormikContextType } from 'formik'
import type { ConnectorInfoDTO, ConnectorConfigDTO, JsonNode } from 'services/cd-ng'

import { useStrings } from 'framework/strings'
import { useTelemetry, useTrackEvent } from '@common/hooks/useTelemetry'
import { Category, ConnectorActions } from '@common/constants/TrackingConstants'
import { VariableSchema } from '@common/utils/Validation'
import { Connectors } from '@platform/connectors/constants'

import type {
  GetTemplateProps,
  GetTemplateResponse
} from 'framework/Templates/TemplateSelectorContext/useTemplateSelector'
import RbacButton from '@rbac/components/Button/Button'
import { getTemplateInputSetYamlPromise } from 'services/template-ng'
import { ScriptVariablesRuntimeInput } from '@secrets/components/ScriptVariableRuntimeInput/ScriptVariablesRuntimeInput'
import { MultiTypeSecretInput } from '@secrets/components/MutiTypeSecretInput/MultiTypeSecretInput'
import {
  getRefFromIdAndScopeParams,
  setupCustomSMFormData
} from '@platform/connectors/pages/connectors/utils/ConnectorUtils'
import type { CustomSMFormInterface } from '@platform/connectors/interfaces/ConnectorInterface'
import commonStyles from '@platform/connectors/components/CreateConnector/commonSteps/ConnectorCommonStyles.module.scss'

interface StepCustomSMConfigStepProps extends ConnectorInfoDTO {
  name: string
  environmentVariables?: []
  templateInputs?: JsonNode
}

interface StepCustomSMConfigProps {
  hideModal: () => void
  isEditMode: boolean
  setIsEditMode: (val: boolean) => void
  setFormData?: (formData: ConnectorConfigDTO) => void
  connectorInfo: ConnectorInfoDTO | void
  accountId: string
  orgIdentifier: string
  projectIdentifier: string
  getTemplate: (data: GetTemplateProps) => Promise<GetTemplateResponse>
}

const CustomSMConfigStep: React.FC<StepProps<StepCustomSMConfigStepProps> & StepCustomSMConfigProps> = ({
  prevStepData,
  previousStep,
  nextStep,
  isEditMode,
  connectorInfo,
  accountId,
  getTemplate
}) => {
  const { getString } = useStrings()
  const minimumTimeoutInSeconds = 1
  const maximumTimeoutInSeconds = 3600

  const defaultInitialFormData: CustomSMFormInterface = {
    template: undefined,
    templateInputs: {},
    timeout: '20',
    onDelegate: true,
    executionTarget: {
      host: '',
      connectorRef: '',
      workingDirectory: ''
    },
    templateJson: {}
  }

  const [initialValues, setInitialValues] = useState(defaultInitialFormData)
  const [loadingFormData, setLoadingFormData] = useState(isEditMode)
  const [modalErrorHandler, setModalErrorHandler] = React.useState<ModalErrorHandlerBinding>()

  React.useEffect(() => {
    if (prevStepData?.templateInputs) {
      setTemplateInputSets(prevStepData.templateInputs)
    } else if (isEditMode) {
      if (connectorInfo) {
        setupCustomSMFormData(connectorInfo).then(data => {
          setInitialValues(data as CustomSMFormInterface)
          setTemplateInputSets(data.templateInputs)
        })
      }
    }
    setLoadingFormData(false)
  }, [isEditMode, connectorInfo, prevStepData])

  const { trackEvent } = useTelemetry()

  useTrackEvent(ConnectorActions.ConfigLoad, {
    category: Category.CONNECTOR,
    connector_type: Connectors.Vault
  })

  const [templateInputSets, setTemplateInputSets] = React.useState<JsonNode>()
  const onUseTemplate = async (formik: FormikContextType<CustomSMFormInterface>) => {
    if (getTemplate) {
      const { template } = await getTemplate({ templateType: 'SecretManager' })
      formik.setFieldValue('template', {
        ...template,
        versionLabel: template.versionLabel,
        templateRef: getRefFromIdAndScopeParams(
          template.identifier as string,
          template.orgIdentifier,
          template.projectIdentifier
        )
      })
      const templateJSON = parse(template.yaml || '').template
      formik.setFieldValue('templateJson', templateJSON)
      formik.setFieldValue('onDelegate', templateJSON.spec.onDelegate)

      try {
        const templateInputYaml = await getTemplateInputSetYamlPromise({
          templateIdentifier: template.identifier as string,
          queryParams: {
            accountIdentifier: accountId,
            orgIdentifier: template.orgIdentifier,
            projectIdentifier: template.projectIdentifier,
            versionLabel: template.versionLabel || ''
          },
          requestOptions: { headers: { 'Load-From-Cache': 'true' } }
        })

        let inputSet: JsonNode = {}
        if (templateInputYaml.data) {
          inputSet = parse(templateInputYaml.data.replace(/"<\+input>"/g, '""'))
          formik.setFieldValue('templateInputs', inputSet)
          setTemplateInputSets(inputSet)
        } else {
          formik.setFieldValue('templateInputs', {})
          setTemplateInputSets({})
        }

        if (templateJSON.spec.onDelegate !== true) {
          if (!Object.prototype.hasOwnProperty.call(inputSet, 'executionTarget')) {
            formik.setFieldValue('executionTarget', templateJSON.spec.executionTarget)
          } else {
            formik.setFieldValue('executionTarget', {
              ...templateJSON.spec.executionTarget,
              ...inputSet.executionTarget
            })
          }
        }
      } catch (e) {
        /* istanbul ignore next */ modalErrorHandler?.showDanger(getErrorInfoFromErrorObject(e))
      }
    }
  }

  return loadingFormData ? (
    <PageSpinner />
  ) : (
    <Container padding={{ top: 'medium' }} height="100%">
      <ModalErrorHandler bind={setModalErrorHandler} />
      <Text font={{ variation: FontVariation.H3 }} padding={{ bottom: 'xlarge' }}>
        {getString('platform.connectors.customSM.details')}
      </Text>
      <Formik<CustomSMFormInterface>
        enableReinitialize
        initialValues={{ ...initialValues, ...prevStepData }}
        formName="customSMForm"
        validationSchema={Yup.object().shape({
          template: Yup.object().required(getString('platform.connectors.customSM.validation.template')),
          onDelegate: Yup.boolean(),
          timeout: Yup.number()
            .integer()
            .typeError(getString('platform.connectors.customSM.timeoutNumberTypeRequiredError'))
            .min(
              minimumTimeoutInSeconds,
              getString('platform.connectors.customSM.minTimeoutExceedError', {
                minimum: minimumTimeoutInSeconds
              })
            )
            .max(
              maximumTimeoutInSeconds,
              getString('platform.connectors.customSM.maxTimeoutExceedError', {
                maximum: maximumTimeoutInSeconds
              })
            ),
          executionTarget: Yup.mixed().when('onDelegate', (value: boolean) => {
            if (value !== true)
              return Yup.object().shape({
                host: Yup.string().trim().required(getString('validation.targethostRequired')),
                connectorRef: Yup.string().trim().required(getString('validation.sshConnectorRequired')),
                workingDirectory: Yup.string().trim().required(getString('validation.workingDirRequired'))
              })
          }),
          templateInputs: Yup.object().shape({
            environmentVariables: VariableSchema(getString)
          })
        })}
        onSubmit={formData => {
          trackEvent(ConnectorActions.ConfigSubmit, {
            category: Category.CONNECTOR,
            connector_type: Connectors.CUSTOM_SECRET_MANAGER
          })
          /* istanbul ignore next */ nextStep?.({ ...connectorInfo, ...prevStepData, ...formData } as ConnectorInfoDTO)
        }}
      >
        {formik => {
          return (
            <FormikForm>
              <Container style={{ minHeight: '450px' }}>
                <FormInput.CustomRender
                  name="template"
                  label="Shell Script"
                  render={() => {
                    return (
                      <Layout.Vertical spacing="medium">
                        <RbacButton
                          text={
                            formik.values.template ? (
                              <Layout.Horizontal>
                                <Text color="white">Selected: </Text>
                                <Text lineClamp={1} color="white">
                                  {formik.values.template.templateRef}({formik.values.template.versionLabel})
                                </Text>
                              </Layout.Horizontal>
                            ) : (
                              getString('platform.connectors.customSM.selectTemplate')
                            )
                          }
                          variation={ButtonVariation.PRIMARY}
                          icon="template-library"
                          style={{ width: 'fit-content', maxWidth: '400px' }}
                          onClick={() => onUseTemplate(formik)}
                        />
                      </Layout.Vertical>
                    )
                  }}
                />
                {formik.values.templateInputs ? (
                  <ScriptVariablesRuntimeInput
                    allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION]}
                    template={templateInputSets}
                    path={'templateInputs'}
                    enableFixed
                    className={commonStyles.maxHeightScroll}
                  />
                ) : null}
                <FormInput.CheckBox
                  label="Execute on Delegate"
                  name="onDelegate"
                  placeholder={getString('typeLabel')}
                />
                <Layout.Horizontal>
                  <Text
                    data-tooltip-id={'customSMForm_timeout'}
                    margin={{ top: 'small' }}
                    font={{ variation: FontVariation.FORM_LABEL, weight: 'semi-bold', size: 'normal' }}
                  >
                    {getString('platform.connectors.customSM.timeout')}
                    {<HarnessDocTooltip useStandAlone={true} tooltipId={'customSMForm_timeout'} />}
                  </Text>
                  <TextInput
                    wrapperClassName={commonStyles.textInput}
                    type="number"
                    value={formik.values.timeout}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      formik.setFieldValue('timeout', event.target?.value)
                    }}
                    min={minimumTimeoutInSeconds}
                    max={maximumTimeoutInSeconds}
                    name="timeout"
                  />
                </Layout.Horizontal>
                {formik.errors.timeout && <FormError name="timeoutErrorMsg" errorMessage={formik.errors.timeout} />}
                {formik.values.onDelegate !== true ? (
                  <>
                    <FormInput.Text
                      name="executionTarget.host"
                      placeholder={getString('common.hostLabel')}
                      label={getString('targetHost')}
                      style={{ marginTop: 'var(--spacing-small)' }}
                      disabled={false}
                    />

                    <MultiTypeSecretInput
                      type="SSHKey"
                      name="executionTarget.connectorRef"
                      label={getString('sshConnector')}
                      disabled={false}
                      formik={formik}
                      allowableTypes={[]}
                      connectorTypeContext={'CustomSecretManager'}
                    />

                    <FormInput.Text
                      name="executionTarget.workingDirectory"
                      placeholder={getString('workingDirectory')}
                      label={getString('workingDirectory')}
                      style={{ marginTop: 'var(--spacing-medium)' }}
                      disabled={false}
                    />
                  </>
                ) : null}
              </Container>

              <Layout.Horizontal spacing="medium">
                <Button
                  variation={ButtonVariation.SECONDARY}
                  icon="chevron-left"
                  text={getString('back')}
                  onClick={() => previousStep?.(prevStepData)}
                />
                <Button type="submit" intent="primary" rightIcon="chevron-right" text={getString('continue')} />
              </Layout.Horizontal>
            </FormikForm>
          )
        }}
      </Formik>
    </Container>
  )
}

export default CustomSMConfigStep
