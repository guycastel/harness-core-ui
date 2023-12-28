/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  IconName,
  Layout,
  Formik,
  FormikForm,
  FormInput,
  MultiTypeInputType,
  SelectOption,
  getMultiTypeFromValue,
  Text,
  RUNTIME_INPUT_VALUE,
  Container
} from '@harness/uicore'
import type { AllowedTypes } from '@harness/uicore'
import { parse } from 'yaml'
import * as Yup from 'yup'
import { useParams } from 'react-router-dom'
import { noop, isEmpty, get, debounce, set, defaultTo } from 'lodash-es'
import type { IOptionProps } from '@blueprintjs/core'

import type { FormikContextType, FormikErrors, FormikProps } from 'formik'
import { CompletionItemKind } from 'vscode-languageserver-types'
import { loggerFor } from 'framework/logging/logging'
import { ModuleName } from 'framework/types/ModuleName'
import { useStrings, UseStringsReturn } from 'framework/strings'
import {
  getConnectorListV2Promise,
  listSecretsV2Promise,
  ConnectorResponse,
  SecretResponseWrapper,
  SshWinRmAwsInfrastructure,
  useRegionsForAws,
  useTags,
  ExecutionElementConfig,
  AwsInstanceFilter
} from 'services/cd-ng'
import { Connectors } from '@platform/connectors/constants'
import type { VariableMergeServiceResponse } from 'services/pipeline-ng'
import type { CompletionItemInterface } from '@common/interfaces/YAMLBuilderProps'
import { Scope } from '@common/interfaces/SecretsInterface'
import MultiTypeTagSelector from '@common/components/MultiTypeTagSelector/MultiTypeTagSelector'
import MultiTypeSecretInput, {
  getMultiTypeSecretInputType
} from '@secrets/components/MutiTypeSecretInput/MultiTypeSecretInput'
import { ConfigureOptions } from '@common/components/ConfigureOptions/ConfigureOptions'

import { StepViewType, StepProps, ValidateInputSetProps } from '@pipeline/components/AbstractSteps/Step'
import { getConnectorName, getConnectorValue } from '@pipeline/components/PipelineSteps/Steps/StepsHelper'
import { VariablesListTable } from '@pipeline/components/VariablesListTable/VariablesListTable'
import {
  ConnectorReferenceDTO,
  FormMultiTypeConnectorField
} from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { isRuntimeInput } from '@pipeline/utils/CIUtils'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { PipelineStep } from '@pipeline/components/PipelineSteps/PipelineStep'
import { DeployTabs } from '@pipeline/components/PipelineStudio/CommonUtils/DeployStageSetupShellUtils'
import { StageErrorContext } from '@pipeline/context/StageErrorContext'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import ProvisionerField from '@pipeline/components/Provisioner/ProvisionerField'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { InfraDeploymentType, getValue } from '../PipelineStepsUtil'
import { SshWimRmAwsInfrastructureSpecInputForm } from './SshWimRmAwsInfrastructureSpecInputForm'
import VpcsList from './VpcsList'
import AsgAutoScalingGroup from './AsgAutoScalingGroup'

import css from './SshWinRmAwsInfrastructureSpec.module.scss'

const logger = loggerFor(ModuleName.CD)

const errorMessage = 'data.message'

const hostConnectionTypes = ['PublicIP', 'PrivateIP'] as SshWinRmAwsInfrastructure['hostConnectionType'][]
const hostConnectionTypeOptions = hostConnectionTypes.map(type => ({
  value: type,
  label: type
}))

export enum InstanceFilter {
  AWS = 'Aws',
  ASG = 'Asg'
}

export type SshWinRmAwsInfrastructureTemplate = { [key in keyof SshWinRmAwsInfrastructure]: string }

function getValidationSchema(getString: UseStringsReturn['getString']): Yup.ObjectSchema {
  return Yup.object().shape({
    credentialsRef: Yup.string().required(getString('fieldRequired', { field: getString('cd.credentialsRef') })),
    connectorRef: Yup.string().required(getString('validation.password')),
    region: Yup.string().required(getString('validation.regionRequired'))
  })
}
interface SshWinRmAwsInfrastructureSpecEditableProps {
  initialValues: SshWinRmAwsInfrastructure
  allValues?: SshWinRmAwsInfrastructure
  onUpdate?: (data: SshWinRmAwsInfrastructure) => void
  stepViewType?: StepViewType
  readonly?: boolean
  template?: SshWinRmAwsInfrastructureTemplate
  metadataMap: Required<VariableMergeServiceResponse>['metadataMap']
  variablesData: SshWinRmAwsInfrastructure
  allowableTypes: AllowedTypes
  provisioner?: ExecutionElementConfig['steps']
  isSingleEnv?: boolean
}

const SshWinRmAwsInfrastructureSpecEditable: React.FC<SshWinRmAwsInfrastructureSpecEditableProps> = ({
  initialValues,
  onUpdate,
  allowableTypes,
  isSingleEnv,
  readonly
}): JSX.Element => {
  const { accountId, projectIdentifier, orgIdentifier } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
  }>()
  const formikRef = useRef<FormikContextType<any> | null>(null)
  const delayedOnUpdate = useRef(debounce(onUpdate || noop, 300)).current
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const { subscribeForm, unSubscribeForm } = React.useContext(StageErrorContext)

  React.useEffect(() => {
    subscribeForm({ tab: DeployTabs.INFRASTRUCTURE, form: formikRef })
    return () => unSubscribeForm({ tab: DeployTabs.INFRASTRUCTURE, form: formikRef })
  }, [subscribeForm, unSubscribeForm])

  const { expressions } = useVariablesExpression()
  const { getString } = useStrings()

  const [regions, setRegions] = useState<SelectOption[]>([])

  const [tags, setTags] = useState<SelectOption[]>([])
  // allow tags to be fixed inputs only if dependant fields are fixed also
  const [canTagsHaveFixedValue, setCanTagsHaveFixedValue] = useState(
    getMultiTypeFromValue(initialValues.region) === MultiTypeInputType.FIXED &&
      getMultiTypeFromValue(initialValues.connectorRef) === MultiTypeInputType.FIXED
  )

  useEffect(() => {
    if (
      !canTagsHaveFixedValue &&
      getMultiTypeFromValue(get(formikRef, 'current.values.awsInstanceFilter.tags', undefined)) ===
        MultiTypeInputType.FIXED
    ) {
      formikRef.current?.setFieldValue('awsInstanceFilter.tags', RUNTIME_INPUT_VALUE)
    }
  }, [canTagsHaveFixedValue])

  const parsedInitialValues = useMemo(() => {
    const initials = {
      ...initialValues
    }
    if (initialValues.region) {
      if (getMultiTypeFromValue(initialValues.region) === MultiTypeInputType.FIXED) {
        set(initials, 'region', { label: initialValues.region, value: initialValues.region })
      } else {
        set(initials, 'region', initialValues.region)
      }
    }
    return initials
  }, [initialValues])

  const { data: regionsData, loading: isRegionsLoading, error: regionsError } = useRegionsForAws({})

  useEffect(() => {
    const regionOptions = Object.entries(get(regionsData, 'data', {})).map(regEntry => ({
      value: regEntry[0],
      label: regEntry[1]
    }))
    setRegions(regionOptions)
  }, [regionsData])

  const {
    data: tagsData,
    refetch: refetchTags,
    loading: isTagsLoading,
    error: tagsError
  } = useTags({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      region: get(initialValues, 'region', ''),
      awsConnectorRef: get(initialValues, 'connectorRef', '')
    },
    lazy: true
  })

  useEffect(() => {
    const tagOptions = get(tagsData, 'data', []).map((tagItem: string) => ({
      value: tagItem,
      label: tagItem
    }))
    setTags(tagOptions)
  }, [tagsData])

  const refetchTagsValues = useCallback((values: SshWinRmAwsInfrastructure) => {
    if (
      values.region &&
      getMultiTypeFromValue(values.region) === MultiTypeInputType.FIXED &&
      values.connectorRef &&
      getMultiTypeFromValue(getValue(values.connectorRef)) === MultiTypeInputType.FIXED
    ) {
      refetchTags({
        queryParams: {
          accountIdentifier: accountId,
          projectIdentifier,
          orgIdentifier,
          region: getValue(get(values, 'region', '')),
          awsConnectorRef: getValue(values.connectorRef)
        }
      })
    }
  }, [])

  const instanceFilterItems: IOptionProps[] = [
    {
      label: getString('cd.steps.awsInfraStep.labels.useAutoScallingGroup'),
      value: InstanceFilter.ASG
    },
    {
      label: getString('cd.steps.awsInfraStep.labels.useAwsInstanceFilter'),
      value: InstanceFilter.AWS
    }
  ]

  useEffect(() => {
    if (
      getMultiTypeFromValue(get(formikRef, 'current.values.region', undefined)) === MultiTypeInputType.FIXED &&
      getMultiTypeFromValue(get(formikRef, 'current.values.connectorRef', undefined)) === MultiTypeInputType.FIXED
    ) {
      refetchTagsValues(get(formikRef, 'current.values', {}))
    }
  }, [formikRef.current?.values.region, formikRef.current?.values.connectorRef])

  return (
    <Layout.Vertical spacing="medium">
      <>
        <Formik<SshWinRmAwsInfrastructure>
          formName="sshWinRmAWSInfra"
          initialValues={parsedInitialValues as SshWinRmAwsInfrastructure}
          validationSchema={getValidationSchema(getString) as Partial<SshWinRmAwsInfrastructure>}
          validate={value => {
            let awsInstanceFilterValue: AwsInstanceFilter | undefined = {}
            let asgNameValue: string | undefined = ''
            const existInstanceType = !!value?.instanceType
            if (existInstanceType) {
              if (value?.instanceType === InstanceFilter.ASG) {
                awsInstanceFilterValue = undefined
                asgNameValue = value?.asgName
              } else {
                awsInstanceFilterValue = value?.awsInstanceFilter
                asgNameValue = undefined
              }
            }

            const data: Partial<SshWinRmAwsInfrastructure> = {
              connectorRef:
                typeof value.connectorRef === 'string' ? value.connectorRef : get(value, 'connectorRef.value', ''),
              credentialsRef:
                typeof get(value, 'credentialsRef', '') === 'string'
                  ? get(value, 'credentialsRef', '')
                  : get(value, 'credentialsRef.referenceString', ''),
              region: typeof value.region === 'string' ? value.region : get(value, 'region.value', ''),
              awsInstanceFilter: awsInstanceFilterValue,
              hostConnectionType: value.hostConnectionType,
              allowSimultaneousDeployments: value.allowSimultaneousDeployments,
              provisioner: value?.provisioner,
              instanceType: defaultTo(value?.instanceType, undefined),
              asgName: asgNameValue
            }

            delayedOnUpdate(data as SshWinRmAwsInfrastructure)
          }}
          onSubmit={noop}
        >
          {formik => {
            window.dispatchEvent(new CustomEvent('UPDATE_ERRORS_STRIP', { detail: DeployTabs.INFRASTRUCTURE }))
            formikRef.current = formik as FormikProps<unknown> | null
            return (
              <FormikForm>
                {isSingleEnv ? (
                  <Layout.Horizontal className={css.formRow} spacing="medium">
                    <ProvisionerField name="provisioner" isReadonly />
                  </Layout.Horizontal>
                ) : null}
                <Layout.Vertical className={css.formRow} spacing="medium" margin={{ bottom: 'large' }}>
                  <Layout.Vertical>
                    <FormMultiTypeConnectorField
                      error={get(formik, 'errors.connectorRef', undefined)}
                      name="connectorRef"
                      type={Connectors.AWS}
                      label={getString('connector')}
                      width={490}
                      placeholder={getString('common.entityPlaceholderText')}
                      accountIdentifier={accountId}
                      projectIdentifier={projectIdentifier}
                      orgIdentifier={orgIdentifier}
                      multiTypeProps={{
                        allowableTypes,
                        expressions,
                        onTypeChange: type => {
                          setCanTagsHaveFixedValue(
                            getMultiTypeFromValue(formik.values.region) === MultiTypeInputType.FIXED &&
                              type === MultiTypeInputType.FIXED
                          )
                        }
                      }}
                      onChange={
                        /* istanbul ignore next */ (selected, _typeValue, type) => {
                          const item = selected as unknown as { record?: ConnectorReferenceDTO; scope: Scope }
                          if (type === MultiTypeInputType.FIXED) {
                            const connectorRef =
                              item.scope === Scope.ORG || item.scope === Scope.ACCOUNT
                                ? `${item.scope}.${get(item, 'record.identifier', '')}`
                                : get(item, 'record.identifier', '')
                            /* istanbul ignore next */
                            formik.setFieldValue('connectorRef', connectorRef)
                          }
                        }
                      }
                    />
                  </Layout.Vertical>
                  <Layout.Vertical className={css.regionWrapper}>
                    <FormInput.MultiTypeInput
                      name="region"
                      className={`${css.inputWidth}`}
                      selectItems={regions}
                      placeholder={isRegionsLoading ? getString('loading') : getString('pipeline.regionPlaceholder')}
                      label={getString('regionLabel')}
                      multiTypeInputProps={{
                        allowableTypes,
                        expressions,
                        newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                        className: `regionId-select ${css.regionInput}`,
                        onTypeChange: type => {
                          setCanTagsHaveFixedValue(
                            type === MultiTypeInputType.FIXED &&
                              getMultiTypeFromValue(getValue(formik.values.connectorRef)) === MultiTypeInputType.FIXED
                          )
                        },
                        onChange: /* istanbul ignore next */ option => {
                          const { value } = option as SelectOption
                          if (value) {
                            formik.setFieldValue('region', option)
                          }
                          if (formik.values.region) {
                            formik.setFieldValue('awsInstanceFilter.tags', undefined)
                          }
                        },
                        selectProps: {
                          items: regions,
                          noResults: (
                            <Text padding={'small'}>
                              {isRegionsLoading
                                ? getString('loading')
                                : get(regionsError, errorMessage, null) || getString('pipeline.ACR.subscriptionError')}
                            </Text>
                          )
                        }
                      }}
                    />
                    {isRuntimeInput(get(formik.values, 'region')) && (
                      <Container className={css.regionConfig}>
                        <ConfigureOptions
                          value={(get(formik.values, 'region') || '') as string}
                          type={'String'}
                          variableName={'region'}
                          showRequiredField={false}
                          showDefaultField={false}
                          onChange={val => formik?.setFieldValue('region', val)}
                        />
                      </Container>
                    )}
                  </Layout.Vertical>

                  <Layout.Vertical className={css.inputWidth}>
                    <MultiTypeSecretInput
                      name="credentialsRef"
                      type={getMultiTypeSecretInputType(initialValues.serviceType)}
                      label={getString('cd.steps.common.specifyCredentials')}
                      onSuccess={secret => {
                        if (secret) {
                          /* istanbul ignore next */
                          formikRef.current?.setFieldValue('credentialsRef', secret.referenceString)
                        }
                      }}
                      expressions={expressions}
                    />
                  </Layout.Vertical>
                  <Layout.Vertical className={css.inputWidth}>
                    <FormInput.Select
                      items={hostConnectionTypeOptions}
                      tooltipProps={{
                        dataTooltipId: 'sshWinrmAzureHostConnectionType'
                      }}
                      name={'hostConnectionType'}
                      label={getString('cd.infrastructure.sshWinRmAzure.hostConnectionType')}
                    />
                  </Layout.Vertical>
                  <Layout.Vertical>
                    <FormInput.RadioGroup
                      name="instanceType"
                      items={instanceFilterItems}
                      radioGroup={{ inline: true }}
                      onChange={e => {
                        const instanceValue = get(e.target, 'value')
                        if (instanceValue === InstanceFilter.ASG) {
                          formik.setFieldValue('awsInstanceFilter', undefined)
                          formik.setFieldValue('asgName', '')
                        } else {
                          formik.setFieldValue('asgName', undefined)
                          formik.setFieldValue('awsInstanceFilter', {
                            vpcs: [],
                            tags: {}
                          })
                        }
                        formik.setFieldValue('instanceType', instanceValue)
                      }}
                    />
                  </Layout.Vertical>
                  {formik?.values?.instanceType === InstanceFilter.AWS && (
                    <>
                      <Layout.Vertical className={css.inputWidth}>
                        <VpcsList name={'awsInstanceFilter.vpcs'} />
                      </Layout.Vertical>
                      <Layout.Vertical className={css.inputWidth} margin={{ bottom: 'medium' }}>
                        <MultiTypeTagSelector
                          name="awsInstanceFilter.tags"
                          expressions={expressions}
                          allowableTypes={
                            canTagsHaveFixedValue
                              ? [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]
                              : [MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]
                          }
                          tags={tags}
                          isLoadingTags={isTagsLoading}
                          initialTags={initialValues?.awsInstanceFilter?.tags}
                          errorMessage={get(tagsError, 'data.message', '')}
                        />
                      </Layout.Vertical>
                    </>
                  )}
                  {formik?.values?.instanceType === InstanceFilter.ASG && (
                    <AsgAutoScalingGroup name={'asgName'} allowableTypes={allowableTypes} />
                  )}
                </Layout.Vertical>

                <Layout.Vertical className={css.simultaneousDeployment}>
                  <FormInput.CheckBox
                    tooltipProps={{
                      dataTooltipId: 'sshWinRmAwsInfraAllowSimultaneousDeployments'
                    }}
                    name={'allowSimultaneousDeployments'}
                    label={getString('cd.allowSimultaneousDeployments')}
                    disabled={readonly}
                  />
                </Layout.Vertical>
              </FormikForm>
            )
          }}
        </Formik>
      </>
    </Layout.Vertical>
  )
}

const SshWinRmAwsInfraSpecVariablesForm: React.FC<SshWinRmAwsInfrastructure> = ({
  metadataMap,
  variablesData,
  initialValues
}) => {
  const infraVariables = get(variablesData, 'infrastructureDefinition.spec', null)
  return infraVariables ? (
    <VariablesListTable
      data={infraVariables}
      originalData={get(initialValues, 'infrastructureDefinition.spec', initialValues)}
      metadataMap={metadataMap}
    />
  ) : null
}

interface SshWinRmAwsInfrastructureStep extends SshWinRmAwsInfrastructure {
  name?: string
  identifier?: string
}

export const ConnectorRefRegex = /^.+stage\.spec\.infrastructure\.infrastructureDefinition\.spec\.connectorRef$/
export const CredentialsRefRegex = /^.+stage\.spec\.infrastructure\.infrastructureDefinition\.spec\.credentialsRef$/
export class SshWinRmAwsInfrastructureSpec extends PipelineStep<SshWinRmAwsInfrastructureStep> {
  /* istanbul ignore next */
  protected type = StepType.SshWinRmAws
  /* istanbul ignore next */
  protected defaultValues: SshWinRmAwsInfrastructure = {
    connectorRef: '',
    credentialsRef: '',
    region: '',
    hostConnectionType: hostConnectionTypes[0],
    allowSimultaneousDeployments: false,
    instanceType: ''
  }

  /* istanbul ignore next */
  protected stepIcon: IconName = 'service-aws'
  /* istanbul ignore next */
  protected stepName = 'Specify your AWS Infrastructure'
  /* istanbul ignore next */
  protected stepPaletteVisible = false
  /* istanbul ignore next */
  protected invocationMap: Map<
    RegExp,
    (path: string, yaml: string, params: Record<string, unknown>) => Promise<CompletionItemInterface[]>
  > = new Map()

  constructor() {
    super()
    this.invocationMap.set(ConnectorRefRegex, this.getConnectorsListForYaml.bind(this))
    this.invocationMap.set(CredentialsRefRegex, this.getCredentialsRefListForYaml.bind(this))

    this._hasStepVariables = true
  }

  protected getConnectorsListForYaml(
    path: string,
    yaml: string,
    params: Record<string, unknown>
  ): Promise<CompletionItemInterface[]> {
    let pipelineObj
    try {
      pipelineObj = parse(yaml)
    } catch (err) {
      logger.error('Error while parsing the yaml', err as any)
    }
    const { accountId, projectIdentifier, orgIdentifier } = params as {
      accountId: string
      orgIdentifier: string
      projectIdentifier: string
    }
    if (pipelineObj) {
      const connectorRef = get(pipelineObj, path.replace('.spec.connectorRef', ''))
      if (connectorRef) {
        /* istanbul ignore next */
        return getConnectorListV2Promise({
          queryParams: {
            accountIdentifier: accountId,
            orgIdentifier,
            projectIdentifier,
            includeAllConnectorsAvailableAtScope: true
          },
          body: { types: ['Pdc'], filterType: 'Connector' }
        }).then(response =>
          get(response, 'data.content', []).map((connector: ConnectorResponse) => ({
            label: getConnectorName(connector),
            insertText: getConnectorValue(connector),
            kind: CompletionItemKind.Field
          }))
        )
      }
    }

    return new Promise(resolve => {
      resolve([])
    })
  }

  protected getCredentialsRefListForYaml(
    path: string,
    yaml: string,
    params: Record<string, unknown>
  ): Promise<CompletionItemInterface[]> {
    let pipelineObj
    try {
      pipelineObj = parse(yaml)
    } catch (err) {
      logger.error('Error while parsing the yaml', err as any)
    }
    const { accountId } = params as {
      accountId: string
    }
    if (pipelineObj) {
      const obj = get(pipelineObj, path.replace('.spec.credentialsRef', ''))
      if (obj.type === InfraDeploymentType.SshWinRmAws) {
        /* istanbul ignore next */
        return listSecretsV2Promise({
          queryParams: {
            accountIdentifier: accountId,
            includeSecretsFromEverySubScope: true,
            types: ['SSHKey'],
            pageIndex: 0,
            pageSize: 100
          }
        }).then(response =>
          get(response, 'data.content', []).map((secret: SecretResponseWrapper) => ({
            label: secret.secret.name,
            insertText: secret.secret.identifier,
            kind: CompletionItemKind.Field
          }))
        )
      }
    }

    return new Promise(resolve => {
      resolve([])
    })
  }

  validateInputSet({
    data,
    getString,
    viewType,
    template
  }: ValidateInputSetProps<SshWinRmAwsInfrastructure>): FormikErrors<SshWinRmAwsInfrastructure> {
    const errors: FormikErrors<SshWinRmAwsInfrastructure> = {}
    /* istanbul ignore else */
    const isRequired = viewType === StepViewType.DeploymentForm || viewType === StepViewType.TriggerForm
    if (
      isEmpty(data.credentialsRef) &&
      isRequired &&
      getMultiTypeFromValue(template?.credentialsRef) === MultiTypeInputType.RUNTIME
    ) {
      /* istanbul ignore next */
      errors.credentialsRef = getString?.('common.validation.fieldIsRequired', {
        name: getString('credentials')
      })
    }
    if (
      isEmpty(data.connectorRef) &&
      isRequired &&
      getMultiTypeFromValue(template?.connectorRef) === MultiTypeInputType.RUNTIME
    ) {
      /* istanbul ignore next */ errors.connectorRef = getString?.('common.validation.fieldIsRequired', {
        name: getString('connector')
      })
    }
    if (isEmpty(data.region) && isRequired && getMultiTypeFromValue(template?.region) === MultiTypeInputType.RUNTIME) {
      /* istanbul ignore next */ errors.region = getString?.('validation.regionRequired')
    }
    return errors
  }

  renderStep(props: StepProps<SshWinRmAwsInfrastructure>): JSX.Element {
    const { initialValues, onUpdate, stepViewType, customStepProps, readonly, allowableTypes, inputSetData } = props

    if (this.isTemplatizedView(stepViewType)) {
      return (
        <SshWimRmAwsInfrastructureSpecInputForm
          {...(customStepProps as SshWinRmAwsInfrastructureSpecEditableProps)}
          initialValues={initialValues}
          path={inputSetData?.path || ''}
          readonly={get(inputSetData, 'readonly', undefined)}
          template={get(inputSetData, 'template', undefined) as SshWinRmAwsInfrastructureTemplate}
          allValues={get(inputSetData, 'allValues', undefined)}
          allowableTypes={allowableTypes}
        />
      )
    } else if (stepViewType === StepViewType.InputVariable) {
      return (
        <SshWinRmAwsInfraSpecVariablesForm
          onUpdate={onUpdate}
          stepViewType={stepViewType}
          template={get(inputSetData, 'template', undefined)}
          {...(customStepProps as SshWinRmAwsInfrastructure)}
          initialValues={initialValues}
        />
      )
    }
    return (
      <SshWinRmAwsInfrastructureSpecEditable
        onUpdate={onUpdate}
        readonly={readonly}
        stepViewType={stepViewType}
        {...(customStepProps as SshWinRmAwsInfrastructureSpecEditableProps)}
        initialValues={initialValues}
        allowableTypes={allowableTypes}
      />
    )
  }
}
