import React, { useEffect, useRef } from 'react'
import { Layout, MultiTypeInputType, SelectOption, Text, getMultiTypeFromValue } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { useFormikContext } from 'formik'
import { Connectors } from '@platform/connectors/constants'
import CardWithOuterTitle from '@modules/10-common/components/CardWithOuterTitle/CardWithOuterTitle'
import { useStrings } from 'framework/strings'
import MetricsVerificationModal from '@modules/85-cv/components/MetricsVerificationModal/MetricsVerificationModal'
import { MetricPackValidationResponse, TimeSeriesMetricPackDTO } from 'services/cv'
import MetricPackCustom from '../../../MetricPackCustom'
import type { NonCustomMetricFields } from '../../NewRelicHealthSource.types'
import { HealthSoureSupportedConnectorTypes } from '../../../MonitoredServiceConnector.constants'
import css from '../../NewrelicMonitoredSource.module.scss'

interface MetricPacksProps {
  setNonCustomFeilds: React.Dispatch<React.SetStateAction<NonCustomMetricFields>>
  nonCustomFeilds: NonCustomMetricFields
  handleMetricPackUpdate: (
    metricPackIdentifier: string,
    updatedValue: boolean,
    appName: string,
    appId: string
  ) => Promise<void>
  setSelectedMetricPacks: React.Dispatch<React.SetStateAction<TimeSeriesMetricPackDTO[]>>
  validationResultData?: MetricPackValidationResponse[]
  guid: string
  connectorIdentifier?: string
  setValidationResultData: React.Dispatch<React.SetStateAction<MetricPackValidationResponse[] | undefined>>
  isTemplate?: boolean
  setInputType: (type: MultiTypeInputType) => void
  onValidate: (
    appName: string,
    appId: string,
    metricObject: {
      [key: string]: boolean
    }
  ) => Promise<void>
}

export function MetricPacks({
  setNonCustomFeilds,
  nonCustomFeilds,
  handleMetricPackUpdate,
  setSelectedMetricPacks,
  validationResultData,
  guid,
  setValidationResultData,
  setInputType,
  isTemplate,
  onValidate,
  connectorIdentifier
}: MetricPacksProps): JSX.Element {
  const { getString } = useStrings()

  const formik = useFormikContext<NonCustomMetricFields>()

  const isMounted = useRef<boolean>(false)

  useEffect(() => {
    if (!isTemplate || getMultiTypeFromValue(formik?.values?.newRelicApplication) === MultiTypeInputType.FIXED)
      onValidate(
        (formik?.values?.newRelicApplication as SelectOption)?.label,
        (formik?.values?.newRelicApplication as SelectOption)?.value as string,
        formik.values.metricData
      )
  }, [])

  useEffect(() => {
    if (!nonCustomFeilds.metricData?.Performance && isMounted.current) {
      formik.setValues(currentValues => {
        return {
          ...currentValues,
          newRelicApplication: undefined
        }
      })

      setNonCustomFeilds(currentValues => {
        return {
          ...currentValues,
          newRelicApplication: undefined
        }
      })

      if (isTemplate) {
        setInputType(MultiTypeInputType.FIXED)
      }
    }
    isMounted.current = true
  }, [nonCustomFeilds.metricData?.Performance])

  return (
    <CardWithOuterTitle title={getString('metricPacks')}>
      <Layout.Vertical>
        <Text color={Color.BLACK}>{getString('cv.healthSource.connectors.AppDynamics.metricPackLabel')}</Text>
        <Layout.Horizontal spacing={'large'} className={css.horizontalCenterAlign}>
          <MetricPackCustom
            setMetricDataValue={value => {
              setNonCustomFeilds({
                ...nonCustomFeilds,
                metricData: value
              })
            }}
            metricPackValue={formik.values.metricPacks}
            metricDataValue={formik.values.metricData}
            setSelectedMetricPacks={
              setSelectedMetricPacks as React.Dispatch<React.SetStateAction<TimeSeriesMetricPackDTO[]>>
            }
            connectorIdentifier={connectorIdentifier}
            connector={HealthSoureSupportedConnectorTypes.NEW_RELIC}
            onChange={(metricPackIdentifier, updatedValue) =>
              handleMetricPackUpdate(
                metricPackIdentifier,
                updatedValue,
                (formik?.values?.newRelicApplication as SelectOption)?.label,
                (formik?.values?.newRelicApplication as SelectOption)?.value as string
              )
            }
          />
          {validationResultData && (
            <MetricsVerificationModal
              verificationData={validationResultData}
              guid={guid}
              onHide={setValidationResultData as () => void}
              verificationType={Connectors.NEW_RELIC}
            />
          )}
        </Layout.Horizontal>
      </Layout.Vertical>
    </CardWithOuterTitle>
  )
}
