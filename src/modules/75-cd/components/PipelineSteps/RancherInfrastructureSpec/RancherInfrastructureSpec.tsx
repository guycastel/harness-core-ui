/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useMemo, useState } from 'react'
import {
  IconName,
  Layout,
  Formik,
  FormikForm,
  getMultiTypeFromValue,
  MultiTypeInputType,
  SelectOption,
  AllowedTypes
} from '@harness/uicore'
import * as Yup from 'yup'
import { useParams } from 'react-router-dom'
import type { GetDataError } from 'restful-react'
import { debounce, noop, isEmpty, get, set, defaultTo } from 'lodash-es'
import { parse } from 'yaml'
import { CompletionItemKind } from 'vscode-languageserver-types'

import { FormikErrors, FormikProps, yupToFormErrors } from 'formik'
import {
  useListAccountScopedRancherClustersUsingConnectorRefQuery,
  listAccountScopedRancherClustersUsingConnectorRef,
  useListAccountScopedRancherClustersUsingEnvAndInfraRefQuery,
  RancherListClustersResponseResponse
} from '@harnessio/react-ng-manager-client'

import { getConnectorListV2Promise, K8sRancherInfrastructure, Failure, ExecutionElementConfig } from 'services/cd-ng'

import type { VariableMergeServiceResponse } from 'services/pipeline-ng'

import type { CompletionItemInterface } from '@common/interfaces/YAMLBuilderProps'
import { useStrings } from 'framework/strings'
import { loggerFor } from 'framework/logging/logging'
import { ModuleName } from 'framework/types/ModuleName'
import { VariablesListTable } from '@pipeline/components/VariablesListTable/VariablesListTable'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { PipelineStep } from '@pipeline/components/PipelineSteps/PipelineStep'
import { Connectors } from '@platform/connectors/constants'
import { StageErrorContext } from '@pipeline/context/StageErrorContext'
import { DeployTabs } from '@pipeline/components/PipelineStudio/CommonUtils/DeployStageSetupShellUtils'
import { getConnectorName, getConnectorValue } from '@pipeline/components/PipelineSteps/Steps/StepsHelper'
import { StepViewType, StepProps, ValidateInputSetProps } from '@pipeline/components/AbstractSteps/Step'

import { getNameSpaceSchema, getReleaseNameSchema } from '../PipelineStepsUtil'
import {
  CommonKuberetesInfraSpecEditable,
  getValidationSchema,
  getClusterValue,
  K8sRancherInfrastructureUI
} from '../Common/CommonKuberetesInfraSpec/CommonKuberetesInfraSpecEditable'
import {
  CommonKuberetesInfraInputForm,
  K8sRancherInfrastructureTemplate
} from '../Common/CommonKuberetesInfraSpec/CommonKuberetesInfraInputForm'

import pipelineVariableCss from '@pipeline/components/PipelineStudio/PipelineVariables/PipelineVariables.module.scss'

const logger = loggerFor(ModuleName.CD)

interface RancherListResponse extends RancherListClustersResponseResponse {
  clusters: string[]
}

type CommonConnector = 'Rancher'

type ClusterError = GetDataError<Failure | Error>
interface RancherInfrastructureSpecEditableProps {
  initialValues: K8sRancherInfrastructure
  allValues?: K8sRancherInfrastructure
  onUpdate?: (data: K8sRancherInfrastructure) => void
  stepViewType?: StepViewType
  readonly?: boolean
  template?: K8sRancherInfrastructureTemplate
  metadataMap: Required<VariableMergeServiceResponse>['metadataMap']
  variablesData: K8sRancherInfrastructure
  allowableTypes: AllowedTypes
  provisioner?: ExecutionElementConfig['steps']
  isSingleEnv?: boolean
}

const RancherInfrastructureSpecEditable: React.FC<RancherInfrastructureSpecEditableProps> = ({
  initialValues,
  onUpdate,
  readonly,
  allowableTypes,
  isSingleEnv
}): JSX.Element => {
  const { projectIdentifier, orgIdentifier } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
  }>()
  const [clusterOptions, setClusterOptions] = useState<SelectOption[]>([])
  const delayedOnUpdate = React.useRef(debounce(onUpdate || noop, 300)).current
  const [loadingClusterNames, setLoadingClusterNames] = useState<boolean>(false)
  const [clusterError, setClusterError] = useState({})
  const { getString } = useStrings()
  /* istanbul ignore next */
  const connectorRef = defaultTo(initialValues?.connectorRef, '')

  useEffect(() => {
    if (
      initialValues.connectorRef &&
      getMultiTypeFromValue(initialValues.connectorRef) === MultiTypeInputType.FIXED &&
      getMultiTypeFromValue(initialValues.cluster) === MultiTypeInputType.FIXED
    ) {
      listAccountScopedRancherClustersUsingConnectorRef({
        pathParams: {
          project: projectIdentifier,
          org: orgIdentifier,
          connector: connectorRef,
          queryParams: {}
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues.connectorRef])

  const getInitialValues = (): K8sRancherInfrastructureUI => {
    const values: K8sRancherInfrastructureUI = {
      ...initialValues
    }

    if (getMultiTypeFromValue(initialValues.cluster) === MultiTypeInputType.FIXED) {
      values.cluster = { label: initialValues.cluster, value: initialValues.cluster }
    }

    return values
  }

  const { subscribeForm, unSubscribeForm } = React.useContext(StageErrorContext)

  const formikRef = React.useRef<FormikProps<unknown> | null>(null)

  React.useEffect(() => {
    subscribeForm({ tab: DeployTabs.INFRASTRUCTURE, form: formikRef })
    return () => unSubscribeForm({ tab: DeployTabs.INFRASTRUCTURE, form: formikRef })
  }, [])

  return (
    <Layout.Vertical spacing="medium">
      <Formik<K8sRancherInfrastructureUI>
        formName="rancherInfra"
        initialValues={getInitialValues()}
        validate={value => {
          const data: Partial<K8sRancherInfrastructure> = {
            namespace: value.namespace === '' ? undefined : value.namespace,
            releaseName: value.releaseName === '' ? undefined : value.releaseName,
            connectorRef: undefined,
            cluster: getClusterValue(value.cluster) === '' ? undefined : getClusterValue(value.cluster),
            allowSimultaneousDeployments: value.allowSimultaneousDeployments,
            provisioner: value?.provisioner || undefined
          }
          /* istanbul ignore next */
          if (value.connectorRef) {
            data.connectorRef = defaultTo(value.connectorRef?.value, value.connectorRef)
          }
          delayedOnUpdate(data)
        }}
        validationSchema={getValidationSchema(getString)}
        onSubmit={noop}
      >
        {formik => {
          window.dispatchEvent(new CustomEvent('UPDATE_ERRORS_STRIP', { detail: DeployTabs.INFRASTRUCTURE }))
          formikRef.current = formik as FormikProps<unknown> | null
          return (
            <FormikForm>
              <CommonKuberetesInfraSpecEditable
                readonly={readonly}
                allowableTypes={allowableTypes}
                connectorType={Connectors.Rancher as CommonConnector}
                clusterError={clusterError as ClusterError}
                clusterLoading={loadingClusterNames}
                clusterOptions={clusterOptions}
                setClusterOptions={setClusterOptions}
                fetchClusters={() => {
                  setLoadingClusterNames(true)
                  listAccountScopedRancherClustersUsingConnectorRef({
                    pathParams: {
                      org: orgIdentifier,
                      project: projectIdentifier,
                      connector: formik?.values?.connectorRef?.value
                    }
                  })
                    .then(res => {
                      /* istanbul ignore next */
                      const options = (res?.content as RancherListResponse)?.clusters?.map((name: string) => ({
                        label: name,
                        value: name
                      }))
                      setClusterOptions(defaultTo(options, []))
                    })
                    .catch(e => {
                      setClusterOptions([])
                      setClusterError(e)
                    })
                    .finally(() => {
                      setLoadingClusterNames(false)
                    })
                }}
                isSingleEnv={isSingleEnv}
              />
            </FormikForm>
          )
        }}
      </Formik>
    </Layout.Vertical>
  )
}

const RancherInfrastructureSpecInputForm: React.FC<RancherInfrastructureSpecEditableProps & { path: string }> = ({
  template,
  initialValues,
  readonly = false,
  path,
  onUpdate,
  allowableTypes,
  allValues,
  stepViewType,
  provisioner
}) => {
  const { projectIdentifier, orgIdentifier } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
  }>()
  const [clusterOptions, setClusterOptions] = useState<SelectOption[]>([])
  /* istanbul ignore next */
  const connectorRef = useMemo(
    () => defaultTo(initialValues.connectorRef, allValues?.connectorRef),
    [initialValues.connectorRef, allValues?.connectorRef]
  )
  /* istanbul ignore next */
  const environmentRef = useMemo(
    () => defaultTo(initialValues.environmentRef, allValues?.environmentRef),
    [initialValues.environmentRef, allValues?.environmentRef]
  )
  /* istanbul ignore next */
  const infrastructureRef = useMemo(
    () => defaultTo(initialValues.infrastructureRef, allValues?.infrastructureRef),
    [initialValues.infrastructureRef, allValues?.infrastructureRef]
  )

  const {
    data: clusterNamesData,
    isLoading: loadingClusterNames,
    refetch: refetchClusterNames,
    error: clusterError
  } = useListAccountScopedRancherClustersUsingConnectorRefQuery({
    pathParams: {
      project: projectIdentifier,
      org: orgIdentifier,
      connector: connectorRef as string,
      queryParams: {}
    }
  })

  const {
    data: clusterNamesForInfraData,
    isLoading: loadingClusterNamesForInfra,
    refetch: refetchClusterNamesForInfra,
    error: clustersForInfraError
  } = useListAccountScopedRancherClustersUsingEnvAndInfraRefQuery({
    pathParams: {
      project: projectIdentifier,
      org: orgIdentifier,
      environment: environmentRef,
      'infrastructure-definition': infrastructureRef
    }
  })

  /* istanbul ignore next */
  useEffect(() => {
    const options = defaultTo(
      (clusterNamesData?.content as RancherListResponse)?.clusters,
      (!connectorRef && (clusterNamesForInfraData?.content as RancherListResponse)?.clusters) || []
    ).map((name: string) => ({
      label: name,
      value: name
    }))
    setClusterOptions(defaultTo(options, []))
  }, [clusterNamesData, clusterNamesForInfraData, connectorRef])

  useEffect(() => {
    /* istanbul ignore next */
    const templateCluster = defaultTo(template?.cluster, '')
    const cluster = defaultTo(initialValues.cluster, '')
    if (connectorRef && getMultiTypeFromValue(connectorRef) === MultiTypeInputType.FIXED) {
      refetchClusterNames()

      if (
        getMultiTypeFromValue(templateCluster) === MultiTypeInputType.RUNTIME &&
        getMultiTypeFromValue(cluster) !== MultiTypeInputType.RUNTIME
      ) {
        set(initialValues, 'cluster', '')
        onUpdate?.(initialValues)
      }
    } else if (
      getMultiTypeFromValue(connectorRef) !== MultiTypeInputType.RUNTIME &&
      environmentRef &&
      getMultiTypeFromValue(environmentRef) === MultiTypeInputType.FIXED &&
      infrastructureRef &&
      getMultiTypeFromValue(infrastructureRef) === MultiTypeInputType.FIXED
    ) {
      refetchClusterNamesForInfra({})
      if (
        getMultiTypeFromValue(templateCluster) === MultiTypeInputType.RUNTIME &&
        getMultiTypeFromValue(cluster) !== MultiTypeInputType.RUNTIME
      ) {
        set(initialValues, 'cluster', '')
        /* istanbul ignore next */
        onUpdate?.(initialValues)
      }
    } else {
      setClusterOptions([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorRef, environmentRef, infrastructureRef])

  const fetchClusterNames = (connectorRefValue = ''): void => {
    /* istanbul ignore next */
    if (connectorRefValue && getMultiTypeFromValue(connectorRefValue) === MultiTypeInputType.FIXED) {
      refetchClusterNames()
    } else {
      refetchClusterNamesForInfra()
    }
  }

  return (
    <CommonKuberetesInfraInputForm
      template={template}
      allowableTypes={allowableTypes}
      clusterError={(clusterError || clustersForInfraError) as ClusterError}
      clusterLoading={loadingClusterNames || loadingClusterNamesForInfra}
      clusterOptions={clusterOptions}
      setClusterOptions={setClusterOptions}
      path={path}
      readonly={readonly}
      stepViewType={stepViewType}
      fetchClusters={fetchClusterNames}
      connectorType={Connectors.Rancher}
      provisioner={provisioner}
    />
  )
}

const RancherInfrastructureSpecVariablesForm: React.FC<RancherInfrastructureSpecEditableProps> = ({
  metadataMap,
  variablesData,
  initialValues
}) => {
  /* istanbul ignore next */
  const infraVariables = variablesData?.infrastructureDefinition?.spec
  /* istanbul ignore next */
  return infraVariables ? (
    <VariablesListTable
      data={infraVariables}
      originalData={initialValues?.infrastructureDefinition?.spec || initialValues}
      metadataMap={metadataMap}
      className={pipelineVariableCss.variablePaddingL1}
    />
  ) : null
}

interface RancherInfrastructureSpecStep extends K8sRancherInfrastructure {
  name?: string
  identifier?: string
}

const KubernetesRancherConnectorRegex = /^.+infrastructure\.infrastructureDefinition\.spec\.connectorRef$/
const KubernetesRancherClusterRegex = /^.+infrastructure\.infrastructureDefinition\.spec\.cluster$/
const KubernetesRancherType = 'Rancher'
export class RancherInfrastructureSpec extends PipelineStep<RancherInfrastructureSpecStep> {
  lastFetched: number
  protected type = StepType.KubernetesRancher
  protected defaultValues: K8sRancherInfrastructure = {
    cluster: '',
    connectorRef: '',
    namespace: '',
    releaseName: '',
    provisioner: ''
  }

  protected stepIcon: IconName = 'rancher'
  protected stepName = 'Specify your Rancher Connector'
  protected stepPaletteVisible = false
  protected invocationMap: Map<
    RegExp,
    (path: string, yaml: string, params: Record<string, unknown>) => Promise<CompletionItemInterface[]>
  > = new Map()

  constructor() {
    super()
    this.lastFetched = new Date().getTime()
    this.invocationMap.set(KubernetesRancherConnectorRegex, this.getConnectorsListForYaml.bind(this))
    this.invocationMap.set(KubernetesRancherClusterRegex, this.getClusterListForYaml.bind(this))

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
      /* istanbul ignore next */ logger.error('Error while parsing the yaml', err)
    }
    const { accountId, projectIdentifier, orgIdentifier } = params as {
      accountId: string
      orgIdentifier: string
      projectIdentifier: string
    }
    if (pipelineObj) {
      const obj = get(pipelineObj, path.replace('.spec.connectorRef', ''))
      if (obj?.type === KubernetesRancherType) {
        return getConnectorListV2Promise({
          queryParams: {
            accountIdentifier: accountId,
            orgIdentifier,
            projectIdentifier,
            includeAllConnectorsAvailableAtScope: true
          },
          body: { types: [Connectors.Rancher], filterType: 'Connector' }
        }).then(response => {
          /* istanbul ignore next */
          const data = response?.data?.content?.map(connector => ({
            label: getConnectorName(connector),
            insertText: getConnectorValue(connector),
            kind: CompletionItemKind.Field
          }))
          return defaultTo(data, [])
        })
      }
    }

    return new Promise(resolve => {
      resolve([])
    })
  }

  protected getClusterListForYaml(
    path: string,
    yaml: string,
    params: Record<string, unknown>
  ): Promise<CompletionItemInterface[]> {
    let pipelineObj
    try {
      pipelineObj = parse(yaml)
    } catch (err) {
      /* istanbul ignore next */ logger.error('Error while parsing the yaml', err)
    }
    const { projectIdentifier, orgIdentifier } = params as {
      accountId: string
      orgIdentifier: string
      projectIdentifier: string
    }
    if (pipelineObj) {
      const obj = get(pipelineObj, path.replace('.spec.cluster', ''))
      const connectorRef = defaultTo(obj?.spec?.connectorRef, '')

      if (
        obj?.type === KubernetesRancherType &&
        connectorRef &&
        getMultiTypeFromValue(connectorRef) === MultiTypeInputType.FIXED
      ) {
        return listAccountScopedRancherClustersUsingConnectorRef({
          pathParams: {
            org: orgIdentifier,
            project: projectIdentifier,
            connector: connectorRef
          }
        }).then(response => {
          const data = (response?.content as RancherListResponse)?.clusters?.map((clusterName: string) => ({
            label: clusterName,
            insertText: clusterName,
            kind: CompletionItemKind.Field
          }))
          return defaultTo(data, [])
        })
      }
    }

    return new Promise(resolve => {
      resolve([])
    })
  }

  validateInputSet({
    data,
    template,
    getString,
    viewType
  }: ValidateInputSetProps<K8sRancherInfrastructure>): FormikErrors<K8sRancherInfrastructure> {
    const errors: Partial<K8sRancherInfrastructureTemplate> = {}
    const isRequired = viewType === StepViewType.DeploymentForm || viewType === StepViewType.TriggerForm
    if (
      isEmpty(data.connectorRef) &&
      isRequired &&
      getMultiTypeFromValue(template?.connectorRef) === MultiTypeInputType.RUNTIME
    ) {
      /* istanbul ignore next */
      errors.connectorRef = getString?.('fieldRequired', { field: getString('connector') })
    }

    if (
      isEmpty(data.cluster) &&
      isRequired &&
      getMultiTypeFromValue(template?.cluster) === MultiTypeInputType.RUNTIME
    ) {
      /* istanbul ignore next */
      errors.cluster = getString?.('fieldRequired', { field: getString('common.cluster') })
    }
    /* istanbul ignore next */
    if (getString && getMultiTypeFromValue(template?.namespace) === MultiTypeInputType.RUNTIME) {
      const namespace = Yup.object().shape({
        namespace: getNameSpaceSchema(getString, isRequired)
      })

      try {
        namespace.validateSync(data)
      } catch (e) {
        if (e instanceof Yup.ValidationError) {
          const err = yupToFormErrors(e)

          Object.assign(errors, err)
        }
      }
    }
    if (getString && getMultiTypeFromValue(template?.releaseName) === MultiTypeInputType.RUNTIME) {
      const releaseName = Yup.object().shape({
        releaseName: getReleaseNameSchema(getString, isRequired)
      })

      try {
        releaseName.validateSync(data)
      } catch (e) {
        /* istanbul ignore next */
        if (e instanceof Yup.ValidationError) {
          const err = yupToFormErrors(e)

          Object.assign(errors, err)
        }
      }
    }
    return errors
  }
  /* istanbul ignore next */
  renderStep(props: StepProps<K8sRancherInfrastructure>): JSX.Element {
    const { initialValues, onUpdate, stepViewType, inputSetData, customStepProps, readonly, allowableTypes } = props
    if (this.isTemplatizedView(stepViewType)) {
      return (
        <RancherInfrastructureSpecInputForm
          {...(customStepProps as RancherInfrastructureSpecEditableProps)}
          initialValues={initialValues}
          onUpdate={onUpdate}
          stepViewType={stepViewType}
          readonly={inputSetData?.readonly}
          template={inputSetData?.template}
          allValues={inputSetData?.allValues}
          path={inputSetData?.path || ''}
          allowableTypes={allowableTypes}
        />
      )
    } else if (stepViewType === StepViewType.InputVariable) {
      return (
        <RancherInfrastructureSpecVariablesForm
          onUpdate={onUpdate}
          stepViewType={stepViewType}
          template={inputSetData?.template}
          {...(customStepProps as RancherInfrastructureSpecEditableProps)}
          initialValues={initialValues}
        />
      )
    }

    return (
      <RancherInfrastructureSpecEditable
        onUpdate={onUpdate}
        readonly={readonly}
        stepViewType={stepViewType}
        {...(customStepProps as RancherInfrastructureSpecEditableProps)}
        initialValues={initialValues}
        allowableTypes={allowableTypes}
      />
    )
  }
}
