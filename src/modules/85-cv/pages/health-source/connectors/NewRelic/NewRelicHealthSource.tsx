/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Text,
  Container,
  Formik,
  FormikForm,
  Layout,
  SelectOption,
  Utils,
  useToaster,
  Button,
  getMultiTypeFromValue,
  MultiTypeInputType,
  FormError,
  ExpressionAndRuntimeType,
  RUNTIME_INPUT_VALUE
} from '@harness/uicore'
import { defaultTo, noop } from 'lodash-es'
import { PopoverInteractionKind } from '@blueprintjs/core'
import { Color } from '@harness/design-system'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useGetNewRelicApplications, MetricPackValidationResponse, TimeSeriesMetricPackDTO } from 'services/cv'
import { getErrorMessage } from '@cv/utils/CommonUtils'
import { useStrings } from 'framework/strings'
import DrawerFooter from '@cv/pages/health-source/common/DrawerFooter/DrawerFooter'
import ValidationStatus from '@cv/pages/components/ValidationStatus/ValidationStatus'
import { StatusOfValidation } from '@cv/pages/components/ValidationStatus/ValidationStatus.constants'
import useGroupedSideNaveHook from '@cv/hooks/GroupedSideNaveHook/useGroupedSideNaveHook'
import CardWithOuterTitle from '@common/components/CardWithOuterTitle/CardWithOuterTitle'
import { isMultiTypeRuntime } from '@modules/10-common/utils/utils'
import {
  getOptions,
  validateMetrics,
  createMetricDataFormik,
  getUpdatedNonCustomFields,
  getMetricNameFilteredNonCustomFields
} from '../MonitoredServiceConnector.utils'

import { HealthSoureSupportedConnectorTypes } from '../MonitoredServiceConnector.constants'
import {
  createNewRelicFormData,
  createNewRelicPayloadBeforeSubmission,
  initializeNonCustomFields,
  persistCustomMetric,
  setApplicationIfConnectorIsInput,
  shouldRunValidation,
  validateMapping
} from './NewRelicHealthSource.utils'
import CustomMetric from '../../common/CustomMetric/CustomMetric'
import MetricThresholdProvider from './components/MetricThresholds/MetricThresholdProvider'
import NewRelicCustomMetricForm from './components/NewRelicCustomMetricForm/NewRelicCustomMetricForm'
import { initNewRelicCustomFormValue } from './components/NewRelicCustomMetricForm/NewRelicCustomMetricForm.utils'
import { getTypeOfInput } from '../AppDynamics/AppDHealthSource.utils'
import { getIsMetricThresholdCanBeShown } from '../../common/MetricThresholds/MetricThresholds.utils'
import type { NonCustomMetricFields } from './NewRelicHealthSource.types'
import ApplicationIdDropdown, {
  ApplicationIdDropdownProps
} from './components/ApplicationIdDropdown/ApplicationIdDropdown'
import { MetricPacks } from './components/MetricPacks/MetricPacks'
import css from './NewrelicMonitoredSource.module.scss'

const guid = Utils.randomId()

export default function NewRelicHealthSource({
  data: newRelicData,
  onSubmit,
  onPrevious,
  isTemplate,
  expressions
}: {
  data: any
  onSubmit: (healthSourcePayload: any) => void
  onPrevious: () => void
  isTemplate?: boolean
  expressions?: string[]
}): JSX.Element {
  const { getString } = useStrings()
  const { showError, showPrimary } = useToaster()
  const defailtMetricName = getString('cv.monitoringSources.newRelic.defaultNewRelicMetricName')
  const [selectedMetricPacks, setSelectedMetricPacks] = useState<TimeSeriesMetricPackDTO[]>([])
  const [validationResultData, setValidationResultData] = useState<MetricPackValidationResponse[]>()
  const [applicationNameForEdit, setApplicationNameForEdit] = useState(newRelicData?.applicationId)
  const [newRelicValidation, setNewRelicValidation] = useState<{
    status: string
    result: MetricPackValidationResponse[] | []
  }>({
    status: '',
    result: []
  })

  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()
  const [showCustomMetric, setShowCustomMetric] = useState(!!Array.from(newRelicData?.mappedServicesAndEnvs)?.length)
  const connectorIdentifier = (newRelicData?.connectorRef?.value || newRelicData?.connectorRef) as string
  const isConnectorRuntimeOrExpression = getMultiTypeFromValue(connectorIdentifier) !== MultiTypeInputType.FIXED

  const {
    createdMetrics,
    mappedMetrics,
    selectedMetric,
    groupedCreatedMetrics,
    groupedCreatedMetricsList,
    setMappedMetrics,
    setCreatedMetrics,
    setGroupedCreatedMetrics
  } = useGroupedSideNaveHook({
    defaultCustomMetricName: defailtMetricName,
    initCustomMetricData: initNewRelicCustomFormValue(),
    mappedServicesAndEnvs: showCustomMetric ? newRelicData?.mappedServicesAndEnvs : new Map()
  })

  const [nonCustomFeilds, setNonCustomFeilds] = useState(() => initializeNonCustomFields(newRelicData))

  const {
    data: applicationsData,
    loading: applicationLoading,
    error: applicationError,
    refetch: fetchApplication
  } = useGetNewRelicApplications({
    lazy: true,
    queryParams: {
      accountId,
      connectorIdentifier,
      orgIdentifier,
      projectIdentifier,
      filter: '',
      tracingId: guid
    }
  })

  useEffect(() => {
    if (!isConnectorRuntimeOrExpression) {
      fetchApplication()
    }
  }, [fetchApplication, isConnectorRuntimeOrExpression])

  const onValidate = useCallback(
    async (appName: string, appId: string, metricObject: { [key: string]: any }): Promise<void> => {
      setNewRelicValidation({ status: StatusOfValidation.IN_PROGRESS, result: [] })
      const filteredMetricPack = selectedMetricPacks?.filter(item => metricObject[item.identifier as string])
      const { validationStatus, validationResult } = await validateMetrics(
        filteredMetricPack || [],
        {
          appId,
          appName,
          accountId,
          connectorIdentifier: connectorIdentifier,
          orgIdentifier,
          projectIdentifier,
          requestGuid: guid
        },
        HealthSoureSupportedConnectorTypes.NEW_RELIC
      )
      setNewRelicValidation({
        status: validationStatus as string,
        result: validationResult as MetricPackValidationResponse[]
      })
    },
    [accountId, connectorIdentifier, orgIdentifier, projectIdentifier, selectedMetricPacks]
  )

  const applicationOptions: SelectOption[] = useMemo(
    () =>
      getOptions(applicationLoading, applicationsData?.data, HealthSoureSupportedConnectorTypes.NEW_RELIC, getString),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applicationLoading]
  )

  useEffect(() => {
    if (!selectedMetric && !mappedMetrics.size) {
      setShowCustomMetric(false)
    }
  }, [mappedMetrics, selectedMetric])

  const runValidation = useMemo(
    () =>
      shouldRunValidation({
        isEdit: newRelicData.isEdit,
        hasMetricPacks: Boolean(selectedMetricPacks.length),
        validationStatus: newRelicValidation.status,
        isConnectorRuntimeOrExpression
      }),
    [newRelicData.isEdit, selectedMetricPacks.length, newRelicValidation.status, isConnectorRuntimeOrExpression]
  )

  useEffect(() => {
    if (runValidation) {
      onValidate(
        newRelicData?.applicationName,
        newRelicData?.applicationId,
        createMetricDataFormik(newRelicData?.metricPacks)
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMetricPacks, applicationLoading, newRelicData.isEdit])

  const initPayload = useMemo(
    () => createNewRelicFormData(newRelicData, mappedMetrics, selectedMetric, nonCustomFeilds, showCustomMetric),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [newRelicData, mappedMetrics, selectedMetric, nonCustomFeilds, showCustomMetric, isTemplate]
  )

  if (applicationError) {
    showError(getErrorMessage(applicationError))
  }

  useEffect(() => {
    if (!newRelicData.isEdit) {
      setApplicationIfConnectorIsInput(isConnectorRuntimeOrExpression, nonCustomFeilds, setNonCustomFeilds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [inputType, setInputType] = React.useState<MultiTypeInputType | undefined>(() =>
    getTypeOfInput(applicationNameForEdit)
  )

  const handleMetricPackUpdate = useCallback(
    async (metricPackIdentifier: string, updatedValue: boolean, appName: string, appId: string) => {
      if (typeof metricPackIdentifier === 'string') {
        const updatedNonCustomFields = getUpdatedNonCustomFields<NonCustomMetricFields>(
          nonCustomFeilds,
          metricPackIdentifier,
          updatedValue
        )

        setNonCustomFeilds(updatedNonCustomFields)

        if (appName && appId) {
          await onValidate(appName, appId, updatedNonCustomFields.metricData)
        }
      }
    },
    [nonCustomFeilds, onValidate]
  )

  const filterRemovedMetricNameThresholds = useCallback(
    (deletedMetricName: string) => {
      if (deletedMetricName) {
        const updatedNonCustomFields = getMetricNameFilteredNonCustomFields<NonCustomMetricFields>(
          nonCustomFeilds,
          deletedMetricName
        )

        setNonCustomFeilds(updatedNonCustomFields)
      }
    },
    [nonCustomFeilds]
  )

  React.useEffect(() => {
    if (
      getTypeOfInput(connectorIdentifier) !== MultiTypeInputType.FIXED &&
      getTypeOfInput(nonCustomFeilds.newRelicApplication as string) !== MultiTypeInputType.FIXED
    ) {
      setInputType(getTypeOfInput(nonCustomFeilds.newRelicApplication as string))
    }
  }, [connectorIdentifier, nonCustomFeilds.newRelicApplication])

  return (
    <Formik
      enableReinitialize
      formName={'newRelicHealthSourceform'}
      isInitialValid={(args: any) =>
        Object.keys(
          validateMapping(
            args.initialValues,
            groupedCreatedMetricsList,
            groupedCreatedMetricsList.indexOf(selectedMetric),
            getString
          )
        ).length === 0
      }
      validate={values => {
        return validateMapping(
          values,
          groupedCreatedMetricsList,
          groupedCreatedMetricsList.indexOf(selectedMetric),
          getString
        )
      }}
      initialValues={initPayload}
      onSubmit={noop}
    >
      {formik => {
        // This is a temporary fix to persist data
        persistCustomMetric({
          mappedMetrics,
          selectedMetric,
          nonCustomFeilds,
          formikValues: formik.values,
          setMappedMetrics
        })

        const canShowApplicationId = formik?.values?.metricData?.Performance

        return (
          <FormikForm className={css.formFullheight}>
            <MetricPacks
              handleMetricPackUpdate={handleMetricPackUpdate}
              setNonCustomFeilds={setNonCustomFeilds}
              nonCustomFeilds={nonCustomFeilds}
              setSelectedMetricPacks={setSelectedMetricPacks}
              validationResultData={validationResultData}
              guid={guid}
              setValidationResultData={setValidationResultData}
              setInputType={setInputType}
              isTemplate={isTemplate}
              onValidate={onValidate}
              connectorIdentifier={isConnectorRuntimeOrExpression ? undefined : connectorIdentifier}
            />

            {canShowApplicationId && (
              <CardWithOuterTitle title={'Application'}>
                <Layout.Horizontal spacing={'large'} className={css.horizontalCenterAlign}>
                  <Container margin={{ bottom: 'small' }} width={'300px'} color={Color.BLACK}>
                    <Text color={Color.BLACK} margin={{ bottom: 'small' }}>
                      {getString('cv.healthSource.connectors.NewRelic.applicationLabel')}
                    </Text>
                    {isTemplate ? (
                      <>
                        <ExpressionAndRuntimeType<ApplicationIdDropdownProps>
                          key={inputType}
                          data-testid="newRelicApplication"
                          fixedTypeComponentProps={{ applicationLoading, applicationOptions, isTemplate: true }}
                          fixedTypeComponent={ApplicationIdDropdown as () => JSX.Element}
                          name={'newRelicApplication'}
                          expressions={expressions}
                          onTypeChange={type => {
                            setInputType(type)
                            setApplicationNameForEdit(null)
                            if (isMultiTypeRuntime(type)) {
                              setNonCustomFeilds({
                                ...nonCustomFeilds,
                                newRelicApplication: RUNTIME_INPUT_VALUE
                              })
                            } else {
                              formik.setValues((currentValues: any) => {
                                return {
                                  ...currentValues,
                                  newRelicApplication: undefined
                                }
                              })
                            }
                          }}
                          allowableTypes={
                            isConnectorRuntimeOrExpression
                              ? [MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]
                              : [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]
                          }
                          multitypeInputValue={inputType}
                          value={formik.values?.newRelicApplication?.value || formik.values?.newRelicApplication}
                          onChange={(item, _valueType, type) => {
                            if (type === MultiTypeInputType.FIXED) {
                              const applicationItem = item as SelectOption
                              setNonCustomFeilds({
                                ...nonCustomFeilds,
                                newRelicApplication: {
                                  label: applicationItem?.label as string,
                                  value: applicationItem?.value as string
                                }
                              })
                              onValidate(
                                formik?.values?.newRelicApplication?.label,
                                formik?.values?.newRelicApplication?.value,
                                formik.values.metricData
                              )
                            } else {
                              formik.setValues((currentValues: any) => {
                                return {
                                  ...currentValues,
                                  newRelicApplication: defaultTo(item, undefined) as string
                                }
                              })
                            }
                          }}
                        />
                      </>
                    ) : (
                      <ApplicationIdDropdown
                        applicationOptions={applicationOptions}
                        applicationLoading={applicationLoading}
                      />
                    )}
                    {formik?.errors?.newRelicApplication && (
                      <FormError name="newRelicApplication" errorMessage={formik?.errors?.newRelicApplication} />
                    )}
                  </Container>
                  <Container width={'300px'} color={Color.BLACK}>
                    {formik.values?.newRelicApplication?.label && formik.values.newRelicApplication?.value && (
                      <ValidationStatus
                        validationStatus={newRelicValidation?.status as StatusOfValidation}
                        onClick={
                          newRelicValidation.result?.length
                            ? () => setValidationResultData(newRelicValidation.result)
                            : undefined
                        }
                        onRetry={() =>
                          onValidate(
                            formik?.values?.newRelicApplication?.label,
                            formik?.values?.newRelicApplication?.value,
                            formik.values.metricData
                          )
                        }
                      />
                    )}
                  </Container>
                </Layout.Horizontal>
              </CardWithOuterTitle>
            )}
            {showCustomMetric ? (
              <CustomMetric
                isValidInput={formik.isValid}
                setMappedMetrics={setMappedMetrics}
                selectedMetric={selectedMetric}
                formikValues={formik.values}
                mappedMetrics={mappedMetrics}
                createdMetrics={createdMetrics}
                groupedCreatedMetrics={groupedCreatedMetrics}
                setCreatedMetrics={setCreatedMetrics}
                setGroupedCreatedMetrics={setGroupedCreatedMetrics}
                defaultMetricName={defailtMetricName}
                tooptipMessage={getString('cv.monitoringSources.gcoLogs.addQueryTooltip')}
                addFieldLabel={getString('cv.monitoringSources.addMetric')}
                initCustomForm={initNewRelicCustomFormValue()}
                shouldBeAbleToDeleteLastMetric
                filterRemovedMetricNameThresholds={filterRemovedMetricNameThresholds}
              >
                <NewRelicCustomMetricForm
                  connectorIdentifier={connectorIdentifier}
                  mappedMetrics={mappedMetrics}
                  selectedMetric={selectedMetric}
                  formikValues={formik.values}
                  formikSetField={formik.setFieldValue}
                  isTemplate={isTemplate}
                  expressions={expressions}
                />
              </CustomMetric>
            ) : (
              <CardWithOuterTitle
                title={getString('cv.healthSource.connectors.customMetrics')}
                dataTooltipId={'customMetricsTitle'}
              >
                <Button
                  icon="plus"
                  minimal
                  margin={{ left: 'medium' }}
                  intent="primary"
                  tooltip={getString('cv.healthSource.connectors.customMetricsTooltip')}
                  tooltipProps={{ interactionKind: PopoverInteractionKind.HOVER_TARGET_ONLY }}
                  onClick={() => setShowCustomMetric(true)}
                >
                  {getString('cv.monitoringSources.addMetric')}
                </Button>
              </CardWithOuterTitle>
            )}

            {getIsMetricThresholdCanBeShown(formik.values.metricData, groupedCreatedMetrics) && (
              <MetricThresholdProvider
                groupedCreatedMetrics={groupedCreatedMetrics}
                formikValues={formik.values}
                metricPacks={selectedMetricPacks}
                setThresholdState={setNonCustomFeilds}
              />
            )}
            <Container style={{ marginBottom: '120px' }} />
            <DrawerFooter
              isSubmit
              onPrevious={onPrevious}
              onNext={() => {
                formik.submitForm()
                if (formik.isValid) {
                  createNewRelicPayloadBeforeSubmission(
                    formik,
                    mappedMetrics,
                    selectedMetric,
                    onSubmit,
                    groupedCreatedMetrics
                  )
                } else {
                  showPrimary(getString('cv.monitoredServices.changeCustomMetricTooltip'))
                }
              }}
            />
          </FormikForm>
        )
      }}
    </Formik>
  )
}
