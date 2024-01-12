/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AllowedTypes,
  Button,
  ButtonSize,
  ButtonVariation,
  Checkbox,
  Formik,
  FormikForm,
  FormInput,
  getMultiTypeFromValue,
  IconName,
  Label,
  Layout,
  MultiTypeInputType,
  Table,
  Text,
  RUNTIME_INPUT_VALUE
} from '@harness/uicore'
import { FontVariation } from '@harness/design-system'

import type { ObjectSchema } from 'yup'
import type { Column } from 'react-table'
import { Radio, RadioGroup } from '@blueprintjs/core'
import { parse } from 'yaml'
import { useParams } from 'react-router-dom'
import { compact, debounce, defaultTo, get, isArray, isEmpty, isString, lowerCase, noop, set, some } from 'lodash-es'
import type { FormikErrors, FormikProps } from 'formik'
import { CompletionItemKind } from 'vscode-languageserver-types'
import { loggerFor } from 'framework/logging/logging'
import { ModuleName } from 'framework/types/ModuleName'
import { useStrings } from 'framework/strings'
import {
  ConnectorResponse,
  ErrorDetail,
  getConnectorListV2Promise,
  HostAttributesFilter,
  HostDTO,
  HostNamesFilter,
  HostValidationDTO,
  listSecretsV2Promise,
  PdcInfrastructure,
  SecretResponseWrapper,
  useFilterHostsByConnector,
  useValidateHosts
} from 'services/cd-ng'
import type { VariableMergeServiceResponse } from 'services/pipeline-ng'
import { useToaster } from '@common/exports'
import { ErrorHandler } from '@common/components/ErrorHandler/ErrorHandler'
import type { CompletionItemInterface } from '@common/interfaces/YAMLBuilderProps'
import type { GitQueryParams } from '@common/interfaces/RouteInterfaces'
import { useQueryParams } from '@common/hooks'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { Connectors } from '@platform/connectors/constants'
import { StepProps, StepViewType, ValidateInputSetProps } from '@pipeline/components/AbstractSteps/Step'
import { getConnectorName, getConnectorValue } from '@pipeline/components/PipelineSteps/Steps/StepsHelper'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { VariablesListTable } from '@pipeline/components/VariablesListTable/VariablesListTable'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { PipelineStep } from '@pipeline/components/PipelineSteps/PipelineStep'
import { DeployTabs } from '@pipeline/components/PipelineStudio/CommonUtils/DeployStageSetupShellUtils'
import { DelegateSelectors } from '@common/components/DelegateSelectors/DelegateSelectors'
import { FormMultiTypeTextAreaField } from '@common/components'
import MultiTypeSecretInput, {
  getMultiTypeSecretInputType
} from '@secrets/components/MutiTypeSecretInput/MultiTypeSecretInput'
import { isMultiTypeRuntime, isValueRuntimeInput } from '@common/utils/utils'
import { StageErrorContext } from '@pipeline/context/StageErrorContext'
import MultiTypeMap from '@common/components/MultiTypeMap/MultiTypeMap'
import type { MapUIType } from '@common/components/Map/Map'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import ConnectivityStatus from './connectivityStatus/ConnectivityStatus'
import {
  getAttributeFilters,
  getHostAttributes,
  getHostNames,
  PDCInfrastructureSpecInputForm
} from './PDCInfrastructureSpecInputForm'
import {
  getKeyValueHostAttributes,
  getValidationSchemaAll,
  getValidationSchemaAttributeFilters,
  getValidationSchemaDynamic,
  getValidationSchemaHostFilters,
  getValidationSchemaNoPreconfiguredHosts,
  HOSTS_TYPE,
  HostScope,
  parseAttributes,
  parseHosts,
  PDCInfrastructureUI,
  PDCInfrastructureYAML,
  PdcInfraTemplate
} from './PDCInfrastructureInterface'
import pipelineVariableCss from '@pipeline/components/PipelineStudio/PipelineVariables/PipelineVariables.module.scss'
import css from './PDCInfrastructureSpec.module.scss'

const logger = loggerFor(ModuleName.CD)

const PdcType = 'Pdc'
interface PDCInfrastructureSpecEditableProps {
  initialValues: PdcInfrastructure
  allValues?: PdcInfrastructure
  onUpdate?: (data: PdcInfrastructure) => void
  stepViewType?: StepViewType
  readonly?: boolean
  template?: PdcInfraTemplate
  metadataMap: Required<VariableMergeServiceResponse>['metadataMap']
  variablesData: PdcInfrastructure
  allowableTypes: AllowedTypes
}

const PDCInfrastructureSpecEditable: React.FC<PDCInfrastructureSpecEditableProps> = ({
  initialValues,
  onUpdate,
  readonly,
  allowableTypes
}): JSX.Element => {
  const { accountId, projectIdentifier, orgIdentifier } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
  }>()
  const delayedOnUpdate = React.useRef(debounce(onUpdate || noop, 300)).current
  const { expressions } = useVariablesExpression()
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()
  const { getString } = useStrings()
  const { showError } = useToaster()
  const [formikInitialValues, setFormikInitialValues] = useState<PDCInfrastructureUI>()
  const [selectionType, setSelectionType] = useState<HOSTS_TYPE>(
    initialValues.provisioner
      ? HOSTS_TYPE.DYNAMIC
      : initialValues.hosts
      ? HOSTS_TYPE.SPECIFIED
      : HOSTS_TYPE.PRECONFIGURED
  )
  const [showPreviewHostBtn, setShowPreviewHostBtn] = useState(!initialValues.provisioner)
  const [hostsScope, setHostsScope] = useState(defaultTo(initialValues.hostFilter?.type, 'All'))

  //table states
  const [detailHosts, setDetailHosts] = useState<HostValidationDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState([])
  const [hostsToTest, setHostsToTest] = useState<any[]>([])

  const { mutate: getFilteredHosts } = useFilterHostsByConnector({
    queryParams: {
      pageIndex: 0,
      pageSize: 100,
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    }
  })

  const { mutate: validateHosts } = useValidateHosts({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      identifier: ''
    }
  })

  useEffect(() => {
    const setInitial = async () => {
      const values = {
        ...initialValues,
        hosts: isArray(initialValues.hosts) ? initialValues.hosts.join(', ') : defaultTo(initialValues.hosts, ''),
        hostFilters: getHostNames(initialValues),
        attributeFilters: getAttributeFilters(initialValues),
        hostAttributes: getHostAttributes(initialValues),
        hostArrayPath: initialValues?.hostArrayPath
      }
      set(values, 'sshKey', initialValues.credentialsRef)
      setFormikInitialValues(values as PDCInfrastructureUI)
    }
    setInitial()
  }, [])

  const formikRef = React.useRef<FormikProps<unknown> | null>(null)

  const { subscribeForm, unSubscribeForm } = React.useContext(StageErrorContext)

  React.useEffect(() => {
    subscribeForm({ tab: DeployTabs.INFRASTRUCTURE, form: formikRef })
    return () => unSubscribeForm({ tab: DeployTabs.INFRASTRUCTURE, form: formikRef })
  }, [subscribeForm, unSubscribeForm])

  useEffect(() => {
    const data: Partial<PDCInfrastructureYAML> = {}

    data.hostFilter = {
      type: 'All',
      spec: {}
    }

    if (selectionType === HOSTS_TYPE.PRECONFIGURED) {
      data.hosts = undefined
      data.connectorRef = get(initialValues, 'connectorRef', '')
    }
    if (selectionType === HOSTS_TYPE.SPECIFIED) {
      data.hosts = get(initialValues, 'hosts', '')
      data.connectorRef = undefined
    }
    if (selectionType === HOSTS_TYPE.DYNAMIC) {
      data.hostAttributes = getHostAttributes(initialValues) as MapUIType
      data.hostArrayPath = get(initialValues, 'hostArrayPath', '') as string
      data.provisioner = RUNTIME_INPUT_VALUE
    }

    formikRef.current?.setValues({ ...initialValues, ...data })
  }, [selectionType])

  useEffect(() => {
    const data: Partial<PDCInfrastructureYAML> = {}
    if (selectionType === HOSTS_TYPE.DYNAMIC) {
      data.hostAttributes = getHostAttributes(initialValues) as MapUIType
    }
    if (hostsScope === HostScope.ALL) {
      data.hostFilter = {
        type: hostsScope,
        spec: {}
      }
    } else if (hostsScope === HostScope.HOST_ATTRIBUTES) {
      data.hostFilter = {
        type: hostsScope,
        spec: {
          value:
            getMultiTypeFromValue(getAttributeFilters(initialValues)) === MultiTypeInputType.FIXED
              ? parseAttributes(getAttributeFilters(initialValues))
              : getAttributeFilters(initialValues)
        } as HostAttributesFilter
      }
    } else {
      data.hostFilter = {
        type: hostsScope,
        spec: {
          value:
            getMultiTypeFromValue(getHostNames(initialValues)) === MultiTypeInputType.FIXED
              ? parseHosts(getHostNames(initialValues))
              : getHostNames(initialValues)
        } as HostNamesFilter
      }
    }
    formikRef.current?.setValues({ ...initialValues, ...data })
  }, [hostsScope])

  const fetchHosts = async () => {
    const formikValues = get(formikRef.current, 'values', {}) as PDCInfrastructureUI
    if (selectionType === HOSTS_TYPE.SPECIFIED) {
      /* istanbul ignore next */
      return new Promise(resolve => resolve(parseHosts(formikValues.hosts)))
    }
    let filterData = {}
    if (hostsScope === HostScope.HOST_NAME) {
      filterData = { type: HostScope.HOST_NAME, filter: formikValues.hostFilters }
    } else if (hostsScope === HostScope.HOST_ATTRIBUTES) {
      /* istanbul ignore next */
      filterData = { type: HostScope.HOST_ATTRIBUTES, filter: formikValues.attributeFilters }
    }
    const identifier =
      typeof formikValues.connectorRef === 'string'
        ? formikValues.connectorRef
        : get(formikValues, 'connectorRef.connector.identifier', '')
    const hostsResponse = await getFilteredHosts(filterData, { queryParams: { identifier } })
    return get(hostsResponse, 'data.content', []).map((item: HostDTO) => item.hostname)
  }

  const getHosts = () => {
    setIsLoading(true)
    setErrors([])
    setHostsToTest([])
    const getData = async () => {
      try {
        const hosts = (await fetchHosts()) as []
        setDetailHosts(
          hosts?.map((host: string) => ({
            host,
            parsedHost: host.split(':')[0],
            error: undefined
          }))
        )
      } catch (e) {
        /* istanbul ignore next */
        showError(e.data?.message || e.message)
      } finally {
        setIsLoading(false)
      }
    }
    getData()
  }

  const onCheckboxSelect = useCallback((event: FormEvent<HTMLInputElement>, item: HostValidationDTO) => {
    const identifier = item.host
    if ((event.target as any).checked && identifier) {
      setHostsToTest(prevHosts => [...defaultTo(prevHosts, []), item])
    } else {
      setHostsToTest(prevHosts =>
        prevHosts.filter((selectedHost: HostValidationDTO) => selectedHost.host !== identifier)
      )
    }
  }, [])

  const testConnection = useCallback(async () => {
    setErrors([])
    try {
      const hostResults = await validateHosts(
        {
          hosts: hostsToTest.map(host => get(host, 'host', '')),
          tags: get(formikRef, 'current.values.delegateSelectors', [])
        },
        {
          queryParams: {
            accountIdentifier: accountId,
            projectIdentifier,
            orgIdentifier,
            identifier: get(formikRef, 'current.values.credentialsRef', '')
          }
        }
      )
      if (hostResults.status === 'SUCCESS') {
        const tempMap: any = {}
        detailHosts.forEach(hostItem => {
          tempMap[get(hostItem, 'parsedHost', '')] = hostItem
        }, {})

        get(hostResults, 'data', []).forEach((hostRes: HostValidationDTO) => {
          tempMap[get(hostRes, 'host', '')] = {
            ...tempMap[get(hostRes, 'host', '')],
            ...hostRes
          }
        })

        setDetailHosts(Object.values(tempMap) as [])
      } else {
        /* istanbul ignore next */
        setErrors(get(hostResults, 'responseMessages', []))
      }
    } catch (e: any) {
      /* istanbul ignore next */
      if (e.data?.responseMessages) {
        setErrors(e.data?.responseMessages)
      } else {
        showError(e.data?.message || e.message)
      }
    }
  }, [accountId, orgIdentifier, projectIdentifier, detailHosts, hostsToTest, showError, validateHosts])

  const columns: Column<HostValidationDTO>[] = useMemo(
    () => [
      {
        Header: getString('cd.steps.pdcStep.no').toUpperCase(),
        accessor: 'host',
        id: 'no',
        width: '6',
        Cell: ({ row }) => row.index + 1
      },
      {
        Header: getString('common.hostLabel').toUpperCase(),
        accessor: 'host',
        id: 'host',
        width: '40%',
        Cell: ({ row }) => row.original.host
      },
      {
        Header: '',
        accessor: 'status',
        id: 'status',
        width: '20%',
        Cell: ({ row }) => (
          <ConnectivityStatus
            identifier={get(formikRef.current, 'values.credentialsRef', '')}
            tags={get(formikRef.current, 'values.delegateSelectors', [])}
            error={row.original.error as ErrorDetail}
            host={get(row.original, 'host', '')}
            status={row.original.status}
            resetError={(status: string) => {
              set(row.original, 'status', defaultTo(status, 'UNKNOWN'))
              if (!isEmpty(errors)) {
                setErrors([])
              }
            }}
          />
        )
      },
      {
        Header: (
          <Checkbox
            data-testid={'selectAll'}
            onClick={(event: FormEvent<HTMLInputElement>) => {
              if ((event.target as any).checked) {
                setHostsToTest(detailHosts)
              } else {
                setHostsToTest([])
              }
            }}
          />
        ),
        id: 'selectHosts',
        width: '20%',
        Cell: ({ row, column }: any) => (
          <Checkbox
            data-testid={`select-host-${get(row, 'original.host', '')}`}
            onClick={event => column.onCheckboxSelect(event, get(row, 'original', ''))}
            checked={column.hostsToTest.some(
              (selectedHost: HostValidationDTO) => selectedHost?.host === get(row, 'original.host', '')
            )}
          />
        ),
        onCheckboxSelect,
        hostsToTest
      },
      {
        Header: (
          <Button
            onClick={() => testConnection()}
            size={ButtonSize.SMALL}
            variation={ButtonVariation.SECONDARY}
            disabled={hostsToTest.length === 0 || !get(formikRef, 'current.values.credentialsRef', '')}
          >
            {getString('common.smtp.testConnection')}
          </Button>
        ),
        id: 'testConnection',
        width: '20%'
      }
    ],
    [detailHosts, hostsToTest, errors, getString, onCheckboxSelect, testConnection]
  )

  const isPreviewDisable = (value: PDCInfrastructureUI): boolean => {
    if (isEmpty(value)) return false
    if (getMultiTypeFromValue(value.credentialsRef) !== MultiTypeInputType.FIXED) return true
    if (selectionType === HOSTS_TYPE.SPECIFIED) {
      return isString(value.hosts) && getMultiTypeFromValue(value.hosts) !== MultiTypeInputType.FIXED
    } else {
      let returnBool = getMultiTypeFromValue(value.connectorRef) !== MultiTypeInputType.FIXED
      if (hostsScope === HostScope.HOST_NAME) {
        returnBool =
          returnBool ||
          (isString(value.hostFilters) && getMultiTypeFromValue(value.hostFilters) !== MultiTypeInputType.FIXED)
      } else if (hostsScope === HostScope.HOST_ATTRIBUTES) {
        returnBool =
          returnBool ||
          (isString(value.attributeFilters) &&
            getMultiTypeFromValue(value.attributeFilters) !== MultiTypeInputType.FIXED)
      }
      return returnBool
    }
  }

  const getValidations = (type: HOSTS_TYPE, hostScope: string): ObjectSchema<object | undefined> => {
    let validationSchema = getValidationSchemaNoPreconfiguredHosts(getString)
    if (type === HOSTS_TYPE.PRECONFIGURED) {
      if (hostScope === HostScope.HOST_NAME) {
        validationSchema = getValidationSchemaHostFilters(getString)
      } else if (hostScope === HostScope.HOST_ATTRIBUTES) {
        validationSchema = getValidationSchemaAttributeFilters(getString)
      } else {
        validationSchema = getValidationSchemaAll(getString)
      }
    }
    if (type === HOSTS_TYPE.DYNAMIC) {
      validationSchema = getValidationSchemaDynamic(getString, hostScope === HostScope.HOST_ATTRIBUTES)
    }
    return validationSchema
  }

  return (
    <Layout.Vertical spacing="medium" className={css.pdcInfraContainer}>
      {formikInitialValues && (
        <>
          <Text font={{ variation: FontVariation.FORM_TITLE }}>{getString('cd.steps.pdcStep.title')}</Text>

          <RadioGroup
            className={css.specifyHostsRadioGroup}
            selectedValue={selectionType}
            onChange={(e: FormEvent<HTMLInputElement>) => {
              const type = e.currentTarget.value as HOSTS_TYPE
              setSelectionType(type)
              setShowPreviewHostBtn(!(type === HOSTS_TYPE.DYNAMIC))
              if (type === HOSTS_TYPE.DYNAMIC && !get(formikRef.current?.values, 'provisioner')) {
                formikRef.current?.setFieldValue('provisioner', RUNTIME_INPUT_VALUE)
              }
            }}
          >
            <Radio value={HOSTS_TYPE.SPECIFIED} label={getString('cd.steps.pdcStep.specifyHostsOption')} />
            <Radio value={HOSTS_TYPE.PRECONFIGURED} label={getString('cd.steps.pdcStep.preconfiguredHostsOption')} />
            <Radio value={HOSTS_TYPE.DYNAMIC} label={getString('cd.steps.pdcStep.dynamicProvision')} />
          </RadioGroup>

          <Formik<PDCInfrastructureUI>
            formName="pdcInfra"
            initialValues={formikInitialValues}
            validationSchema={getValidations(selectionType, hostsScope)}
            validate={value => {
              const data: Partial<PDCInfrastructureYAML> = {
                allowSimultaneousDeployments: value.allowSimultaneousDeployments,
                delegateSelectors: value.delegateSelectors,
                sshKey: value.sshKey,
                credentialsRef: (value.credentialsRef || value.sshKey) as string
              }
              if (selectionType === HOSTS_TYPE.SPECIFIED) {
                data.hosts =
                  getMultiTypeFromValue(value.hosts) === MultiTypeInputType.FIXED
                    ? parseHosts(value.hosts)
                    : value.hosts
                data.hostFilter = {
                  type: 'All',
                  spec: {}
                }
              }
              if (selectionType === HOSTS_TYPE.PRECONFIGURED) {
                data.connectorRef = value.connectorRef
                data.hostFilter = {
                  type: hostsScope as 'All' | 'HostNames' | 'HostAttributes',
                  spec:
                    hostsScope !== HostScope.ALL
                      ? ({
                          value:
                            hostsScope === HostScope.HOST_NAME
                              ? getMultiTypeFromValue(value.hostFilters) === MultiTypeInputType.FIXED
                                ? parseHosts(value.hostFilters || '')
                                : value.hostFilters
                              : getMultiTypeFromValue(value.attributeFilters) === MultiTypeInputType.FIXED
                              ? parseAttributes(value.attributeFilters || '')
                              : value.attributeFilters
                        } as HostNamesFilter | HostAttributesFilter)
                      : {}
                }
              }
              if (selectionType === HOSTS_TYPE.DYNAMIC) {
                data.hostArrayPath = value.hostArrayPath
                data.provisioner = RUNTIME_INPUT_VALUE
                data.hostAttributes = !isValueRuntimeInput(value.hostAttributes as unknown as string)
                  ? getKeyValueHostAttributes(value.hostAttributes)
                  : value.hostAttributes
                data.hostFilter = {
                  type: hostsScope as 'All' | 'HostAttributes',
                  spec:
                    hostsScope === HostScope.HOST_ATTRIBUTES
                      ? ({
                          value:
                            hostsScope === HostScope.HOST_NAME
                              ? getMultiTypeFromValue(value.hostFilters) === MultiTypeInputType.FIXED
                                ? parseHosts(value.hostFilters || '')
                                : value.hostFilters
                              : getMultiTypeFromValue(value.attributeFilters) === MultiTypeInputType.FIXED
                              ? parseAttributes(value.attributeFilters || '')
                              : value.attributeFilters
                        } as HostNamesFilter | HostAttributesFilter)
                      : {}
                }
              }
              delayedOnUpdate(data)
            }}
            onSubmit={noop}
          >
            {formik => {
              window.dispatchEvent(new CustomEvent('UPDATE_ERRORS_STRIP', { detail: DeployTabs.INFRASTRUCTURE }))
              formikRef.current = formik as FormikProps<unknown> | null

              return (
                <FormikForm>
                  <Layout.Vertical className={css.formRow} spacing="none">
                    {selectionType === HOSTS_TYPE.SPECIFIED && (
                      <FormMultiTypeTextAreaField
                        key="hosts"
                        name="hosts"
                        className={`${css.hostsTextArea} ${css.inputWidth}`}
                        label={getString('platform.connectors.pdc.hosts')}
                        multiTypeTextArea={{
                          expressions,
                          allowableTypes,
                          newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                        }}
                      />
                    )}
                    {selectionType === HOSTS_TYPE.PRECONFIGURED && (
                      <>
                        <FormMultiTypeConnectorField
                          error={get(formik, 'errors.connectorRef', undefined)}
                          name="connectorRef"
                          className={css.connectorRef}
                          label={getString('connector')}
                          placeholder={getString('common.entityPlaceholderText')}
                          disabled={readonly}
                          accountIdentifier={accountId}
                          projectIdentifier={projectIdentifier}
                          orgIdentifier={orgIdentifier}
                          type={Connectors.PDC}
                          width={433}
                          selected={formik.values.connectorRef}
                          setRefValue
                          multiTypeProps={{
                            allowableTypes,
                            expressions,
                            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                          }}
                          gitScope={{ repo: repoIdentifier || '', branch, getDefaultFromOtherRepo: true }}
                          onChange={(value, _valueType, connectorRefType) => {
                            if (isMultiTypeRuntime(connectorRefType)) {
                              formikRef.current?.setFieldValue('connectorRef', value)
                            }
                            setShowPreviewHostBtn(true)
                          }}
                        />
                        <RadioGroup
                          className={css.specifyFilterRadioGroup}
                          selectedValue={hostsScope}
                          onChange={(e: any) => {
                            setShowPreviewHostBtn(true)
                            setHostsScope(e.target.value)
                            if (e.target.value === HostScope.ALL) {
                              formik.setFieldValue('attributeFilters', '')
                              formik.setFieldValue('hostFilters', '')
                            }
                          }}
                        >
                          <Radio value={HostScope.ALL} label={getString('cd.steps.pdcStep.includeAllHosts')} />
                          <Radio value={HostScope.HOST_NAME} label={getString('cd.steps.pdcStep.filterHostName')} />
                          <Radio
                            value={HostScope.HOST_ATTRIBUTES}
                            label={getString('cd.steps.pdcStep.filterHostAttributes')}
                          />
                        </RadioGroup>
                        {hostsScope === HostScope.HOST_NAME ? (
                          <FormMultiTypeTextAreaField
                            key="hostFilters"
                            name="hostFilters"
                            label={getString('cd.steps.pdcStep.specificHosts')}
                            placeholder={getString('cd.steps.pdcStep.specificHostsPlaceholder')}
                            className={`${css.hostsTextArea} ${css.inputWidth}`}
                            tooltipProps={{
                              dataTooltipId: 'pdcSpecificHosts'
                            }}
                            multiTypeTextArea={{
                              expressions,
                              allowableTypes,
                              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                            }}
                          />
                        ) : hostsScope === HostScope.HOST_ATTRIBUTES ? (
                          <Layout.Vertical spacing="medium">
                            <FormMultiTypeTextAreaField
                              key="attributeFilters"
                              name="attributeFilters"
                              label={getString('cd.steps.pdcStep.specificAttributes')}
                              placeholder={getString('cd.steps.pdcStep.attributesPlaceholder')}
                              className={`${css.hostsTextArea} ${css.inputWidth}`}
                              tooltipProps={{
                                dataTooltipId: 'pdcSpecificAttributes'
                              }}
                              multiTypeTextArea={{
                                expressions,
                                allowableTypes,
                                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                              }}
                            />
                          </Layout.Vertical>
                        ) : null}
                      </>
                    )}
                    {selectionType === HOSTS_TYPE.DYNAMIC && (
                      <>
                        <div className={css.inputWrapper}>
                          <FormInput.MultiTextInput
                            multiTextInputProps={{
                              allowableTypes: [MultiTypeInputType.RUNTIME],
                              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                            }}
                            data-testid="provisioner-field"
                            label={getString('common.provisioner')}
                            disabled
                            name="provisioner"
                          />
                        </div>
                        <div className={css.inputWrapper}>
                          <FormInput.MultiTextInput
                            name="hostArrayPath"
                            placeholder={getString('cd.steps.pdcStep.hostObjectPathPlaceholder')}
                            multiTextInputProps={{
                              allowableTypes: [MultiTypeInputType.EXPRESSION, MultiTypeInputType.RUNTIME],
                              expressions,
                              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                              multitypeInputValue:
                                formik.values.hostArrayPath !== RUNTIME_INPUT_VALUE
                                  ? MultiTypeInputType.EXPRESSION
                                  : MultiTypeInputType.RUNTIME
                            }}
                            label={getString('cd.steps.pdcStep.hostArrayPath')}
                          />
                        </div>
                        <div className={css.panel}>
                          <MultiTypeMap
                            name="hostAttributes"
                            enableConfigureOptions={false}
                            valueMultiTextInputProps={{
                              expressions,
                              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                              allowableTypes: (allowableTypes as MultiTypeInputType[]).filter(
                                item => !isMultiTypeRuntime(item)
                              ) as AllowedTypes
                            }}
                            multiTypeFieldSelectorProps={{
                              label: (
                                <Text style={{ color: 'rgb(11, 11, 13)' }}>
                                  {getString('cd.steps.pdcStep.hostDataMapping')}
                                </Text>
                              )
                            }}
                            disableValueTypeSelection
                            disabled={readonly}
                          />
                        </div>
                        <RadioGroup
                          className={css.specifyFilterRadioGroup}
                          selectedValue={hostsScope}
                          onChange={(e: any) => {
                            setHostsScope(e.target.value)
                            if (e.target.value === HostScope.ALL) {
                              formik.setFieldValue('attributeFilters', '')
                              formik.setFieldValue('hostFilters', '')
                            }
                          }}
                        >
                          <Radio value={HostScope.ALL} label={getString('cd.steps.pdcStep.includeAllHosts')} />
                          <Radio
                            value={HostScope.HOST_ATTRIBUTES}
                            label={getString('cd.steps.pdcStep.filterHostAttributes')}
                          />
                        </RadioGroup>
                        {hostsScope === HostScope.HOST_ATTRIBUTES && (
                          <Layout.Vertical spacing="medium" className={css.noMarginTop}>
                            <FormMultiTypeTextAreaField
                              key="attributeFilters"
                              name="attributeFilters"
                              label={getString('cd.steps.pdcStep.specificAttributes')}
                              placeholder={getString('cd.steps.pdcStep.attributesPlaceholder')}
                              className={`${css.hostsTextArea} ${css.inputWidth}`}
                              tooltipProps={{
                                dataTooltipId: 'pdcSpecificAttributes'
                              }}
                              multiTypeTextArea={{
                                expressions,
                                allowableTypes,
                                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                              }}
                            />
                          </Layout.Vertical>
                        )}
                      </>
                    )}
                    <div className={css.inputWrapper}>
                      <MultiTypeSecretInput
                        name="credentialsRef"
                        type={getMultiTypeSecretInputType(defaultTo(formikInitialValues.serviceType, 'SSHKey'))}
                        expressions={expressions}
                        allowableTypes={allowableTypes}
                        label={getString('cd.steps.common.specifyCredentials')}
                        onSuccess={secret => {
                          if (secret) {
                            formikRef.current?.setFieldValue('credentialsRef', secret.referenceString)
                          }
                        }}
                      />
                    </div>
                    {showPreviewHostBtn && (
                      <Button
                        onClick={() => {
                          setShowPreviewHostBtn(false)
                          getHosts()
                        }}
                        className={css.previewHostsButton}
                        size={ButtonSize.SMALL}
                        variation={ButtonVariation.SECONDARY}
                        width={140}
                        disabled={isPreviewDisable(formik.values)}
                      >
                        {getString('cd.steps.pdcStep.previewHosts')}
                      </Button>
                    )}
                    {selectionType !== HOSTS_TYPE.DYNAMIC && !showPreviewHostBtn && (
                      <Layout.Vertical margin={{ top: 'large' }}>
                        <Layout.Horizontal
                          flex={{ alignItems: 'center' }}
                          margin={{ bottom: 'small' }}
                          spacing="small"
                          className={css.hostsControls}
                        >
                          <Label className={'bp3-label ' + css.previewHostsLabel}>Preview Hosts</Label>
                          <Button
                            intent="primary"
                            icon="refresh"
                            iconProps={{ size: 12, margin: { right: 8 } }}
                            onClick={() => getHosts()}
                            size={ButtonSize.SMALL}
                            variation={ButtonVariation.LINK}
                          >
                            {getString('common.refresh')}
                          </Button>
                          <Button
                            intent="none"
                            icon="main-close"
                            iconProps={{ size: 12, margin: { right: 8 } }}
                            onClick={() => setShowPreviewHostBtn(true)}
                            size={ButtonSize.SMALL}
                            variation={ButtonVariation.LINK}
                          >
                            Close preview
                          </Button>
                        </Layout.Horizontal>
                        <Layout.Horizontal
                          flex={{ alignItems: 'center', justifyContent: 'flex-start' }}
                          spacing="medium"
                          margin={{ bottom: 'small', top: 'small' }}
                        >
                          {selectionType === HOSTS_TYPE.SPECIFIED ? (
                            <div className={css.inputWidth}>
                              <Label className={'bp3-label'} style={{ marginBottom: 'small' }}>
                                {getString('delegate.DelegateSelector')}
                              </Label>
                              <DelegateSelectors
                                accountId={accountId}
                                projectIdentifier={projectIdentifier}
                                orgIdentifier={orgIdentifier}
                                selectedItems={formik.values?.delegateSelectors}
                                onTagInputChange={delegateSelectors => {
                                  formikRef.current?.setFieldValue('delegateSelectors', delegateSelectors)
                                }}
                              />
                            </div>
                          ) : null}
                        </Layout.Horizontal>
                        {/* istanbul ignore next */}
                        {errors.length > 0 && <ErrorHandler responseMessages={errors} />}
                        {isLoading ? (
                          <Label className={'bp3-label'} style={{ margin: 'auto' }}>
                            Loading...
                          </Label>
                        ) : detailHosts.length > 0 ? (
                          <Table columns={columns} data={detailHosts} bpTableProps={{}} />
                        ) : (
                          <Label className={'bp3-label'} style={{ margin: '0 auto 25px' }}>
                            {getString('cd.steps.pdcStep.noHosts')}
                          </Label>
                        )}
                      </Layout.Vertical>
                    )}
                  </Layout.Vertical>
                  <Layout.Vertical className={css.simultaneousDeployment}>
                    <FormInput.CheckBox
                      style={{ margin: 0 }}
                      tooltipProps={{
                        dataTooltipId: 'pdcInfraAllowSimultaneousDeployments'
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
      )}
    </Layout.Vertical>
  )
}

interface PDCInfrastructureSpecEditableProps {
  initialValues: PdcInfrastructure
  allValues?: PdcInfrastructure
  onUpdate?: (data: PdcInfrastructure) => void
  stepViewType?: StepViewType
  readonly?: boolean
  template?: PdcInfraTemplate
  metadataMap: Required<VariableMergeServiceResponse>['metadataMap']
  variablesData: PdcInfrastructure
  allowableTypes: AllowedTypes
}

const PDCInfrastructureSpecVariablesForm: React.FC<PDCInfrastructureSpecEditableProps> = ({
  metadataMap,
  variablesData,
  initialValues
}) => {
  const infraVariables = variablesData?.infrastructureDefinition?.spec
  return infraVariables ? (
    /* istanbul ignore next */ <VariablesListTable
      data={infraVariables}
      originalData={initialValues?.infrastructureDefinition?.spec || initialValues}
      metadataMap={metadataMap}
      className={pipelineVariableCss.variablePaddingL1}
    />
  ) : null
}

interface PDCInfrastructureSpecStep extends PdcInfrastructure {
  name?: string
  identifier?: string
}

export const PdcRegex = /^.+stage\.spec\.infrastructure\.infrastructureDefinition\.spec\.connectorRef$/
export const SshKeyRegex = /^.+stage\.spec\.infrastructure\.infrastructureDefinition\.spec\.sshKeyRef$/
export class PDCInfrastructureSpec extends PipelineStep<PDCInfrastructureSpecStep> {
  /* istanbul ignore next */
  protected type = StepType.PDC
  /* istanbul ignore next */
  protected defaultValues: PdcInfrastructure = {
    credentialsRef: '',
    hostFilter: {
      type: 'All',
      spec: {}
    }
  }

  /* istanbul ignore next */
  protected stepIcon: IconName = 'pdc'
  /* istanbul ignore next */
  protected stepName = 'Specify your PDC Connector'
  /* istanbul ignore next */
  protected stepPaletteVisible = false
  /* istanbul ignore next */
  protected invocationMap: Map<
    RegExp,
    (path: string, yaml: string, params: Record<string, unknown>) => Promise<CompletionItemInterface[]>
  > = new Map()

  constructor() {
    super()
    this.invocationMap.set(PdcRegex, this.getConnectorsListForYaml.bind(this))
    this.invocationMap.set(SshKeyRegex, this.getSshKeyListForYaml.bind(this))

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

  protected getSshKeyListForYaml(
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
      const obj = get(pipelineObj, path.replace('.spec.sshKey', ''))
      if (obj.type === PdcType) {
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
    template,
    getString,
    viewType
  }: ValidateInputSetProps<PdcInfrastructure>): FormikErrors<PdcInfrastructure> {
    const errors: Partial<PdcInfraTemplate> = {}
    /* istanbul ignore else */
    const isRequired = viewType === StepViewType.DeploymentForm || viewType === StepViewType.TriggerForm

    if (
      !data.credentialsRef &&
      isRequired &&
      getMultiTypeFromValue(get(template, 'credentialsRef', undefined)) === MultiTypeInputType.RUNTIME
    ) {
      errors.credentialsRef = getString?.('fieldRequired', { field: getString('cd.credentialsRef') })
    }
    if (
      isEmpty(data.connectorRef) &&
      isRequired &&
      getMultiTypeFromValue(template?.connectorRef) === MultiTypeInputType.RUNTIME
    ) {
      errors.connectorRef = getString?.('common.validation.fieldIsRequired', { name: getString('connector') })
    }
    if (
      isEmpty(data.hostArrayPath) &&
      isRequired &&
      typeof template?.hostArrayPath === 'string' &&
      getMultiTypeFromValue(template?.hostArrayPath) === MultiTypeInputType.RUNTIME
    ) {
      errors.hostArrayPath = getString?.('common.validation.fieldIsRequired', {
        name: getString('cd.steps.pdcStep.hostArrayPath')
      })
    }
    if (
      isArray(data?.hostAttributes) &&
      isEmpty(compact(data.hostAttributes)) &&
      isRequired &&
      typeof template?.hostAttributes === 'string' &&
      getMultiTypeFromValue(template?.hostAttributes) === MultiTypeInputType.RUNTIME
    ) {
      errors.hostAttributes = getString?.('common.validation.fieldIsRequired', {
        name: getString('cd.steps.pdcStep.hostDataMapping')
      })
    }
    if (isArray(data?.hostAttributes) && data?.hostAttributes.length > 0) {
      const hasHostNameField = some(data?.hostAttributes, val => lowerCase(val.key) === 'hostname')
      const hasEmptyKey = some(data?.hostAttributes, val => isEmpty(val.key))
      if (!hasHostNameField) {
        set(errors, 'hostAttributes', getString?.('cd.steps.pdcStep.hostnameRqrd'))
      }
      if (hasEmptyKey) {
        set(errors, 'hostAttributes', getString?.('cd.steps.pdcStep.hostDataMappingEmptyKey'))
      }
    }
    if (isEmpty(data.hosts) && isRequired && getMultiTypeFromValue(template?.hosts) === MultiTypeInputType.RUNTIME) {
      errors.hosts = getString?.('common.validation.fieldIsRequired', { name: getString('cd.hosts') })
    }
    if (
      data.hostFilter?.type === HostScope.HOST_NAME &&
      isEmpty((data.hostFilter.spec as HostNamesFilter)?.value) &&
      isRequired &&
      getMultiTypeFromValue((template?.hostFilter?.spec as HostNamesFilter)?.value) === MultiTypeInputType.RUNTIME
    ) {
      set(errors, 'hostFilter.spec.value', getString?.('cd.validation.specifyFilter'))
    }
    if (
      data.hostFilter?.type === HostScope.HOST_ATTRIBUTES &&
      isEmpty((data.hostFilter.spec as HostAttributesFilter)?.value) &&
      isRequired &&
      getMultiTypeFromValue((template?.hostFilter?.spec as HostAttributesFilter)?.value as any) ===
        MultiTypeInputType.RUNTIME
    ) {
      set(errors, 'hostFilter.spec.value', getString?.('cd.validation.specifyFilter'))
    }
    return errors as any
  }

  renderStep(props: StepProps<PdcInfrastructure>): JSX.Element {
    const { initialValues, onUpdate, stepViewType, customStepProps, readonly, allowableTypes, inputSetData } = props

    if (this.isTemplatizedView(stepViewType)) {
      return (
        <PDCInfrastructureSpecInputForm
          {...(customStepProps as PDCInfrastructureSpecEditableProps)}
          initialValues={initialValues}
          onUpdate={onUpdate}
          stepViewType={stepViewType}
          readonly={readonly}
          template={inputSetData?.template as unknown as PdcInfraTemplate}
          allValues={inputSetData?.allValues}
          allowableTypes={allowableTypes}
          path={inputSetData?.path || ''}
        />
      )
    } else if (stepViewType === StepViewType.InputVariable) {
      return (
        <PDCInfrastructureSpecVariablesForm
          onUpdate={onUpdate}
          stepViewType={stepViewType}
          template={inputSetData?.template as unknown as PdcInfraTemplate}
          {...(customStepProps as PDCInfrastructureSpecEditableProps)}
          initialValues={initialValues}
        />
      )
    }

    return (
      <PDCInfrastructureSpecEditable
        onUpdate={onUpdate}
        readonly={readonly}
        stepViewType={stepViewType}
        {...(customStepProps as PDCInfrastructureSpecEditableProps)}
        initialValues={initialValues}
        allowableTypes={allowableTypes}
      />
    )
  }
}
