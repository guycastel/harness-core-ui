import React, { useState } from 'react'
import {
  Layout,
  SelectOption,
  MultiSelectTypeInput,
  MultiSelectOption,
  Label,
  MultiTypeInputType,
  getMultiTypeFromValue
} from '@harness/uicore'
import type { AllowedTypes } from '@harness/uicore'
import { Color } from '@harness/design-system'

import { useParams } from 'react-router-dom'
import { get, defaultTo, isArray, isEmpty } from 'lodash-es'

import { FormikContextType, connect } from 'formik'

import { useStrings } from 'framework/strings'
import { useVpcs, AwsVPC } from 'services/cd-ng'
import { isMultiTypeFixed } from '@common/utils/utils'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'

export interface Vpcs {
  name: string
  id: string
}

interface VpcsListProps {
  name: string
  formik?: FormikContextType<unknown>
  readonly?: boolean
  allowableTypes?: AllowedTypes
  envId?: string
  infraId?: string
}

const VpcsList = ({ allowableTypes, readonly, formik, name, envId, infraId }: VpcsListProps): JSX.Element => {
  const { accountId, projectIdentifier, orgIdentifier } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
  }>()

  const formValues = formik?.values
  const connectorValue = defaultTo(get(formValues, 'connectorRef.value', undefined), '')
  const region = defaultTo(get(formValues, 'region.value', undefined), '')
  const vpcsValue = get(formValues, name)
  const vpcsDefaultValue = isArray(vpcsValue)
    ? defaultTo(get(formValues, name), []).map((vpc: string) => ({
        label: vpc,
        value: vpc
      }))
    : vpcsValue

  const { expressions } = useVariablesExpression()
  const { getString } = useStrings()

  const [vpcs, setVpcs] = useState<SelectOption[]>([])
  const [selectedVpcs, setSelectedVpcs] = useState<MultiSelectOption[] | string>(defaultTo(vpcsDefaultValue, []))
  const formValue = get(formValues, name, '')
  const [multiType, setMultiType] = React.useState<MultiTypeInputType>(getMultiTypeFromValue(formValue))
  const { data: vpcsData, refetch } = useVpcs({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier,
      orgIdentifier,
      region: defaultTo(region, undefined),
      awsConnectorRef: defaultTo(connectorValue, undefined),
      infraDefinitionId: infraId,
      envId
    }
  })

  React.useEffect(() => {
    if (vpcsData?.data?.length) {
      setVpcs(
        vpcsData.data.map(
          (vpcsItem: AwsVPC): SelectOption => ({
            value: vpcsItem.id as string,
            label: defaultTo(vpcsItem.name, vpcsItem.id) as string
          })
        )
      )
    }
  }, [vpcsData])

  React.useEffect(() => {
    if (vpcs.length && isMultiTypeFixed(multiType) && isArray(selectedVpcs)) {
      const savedVpcs: MultiSelectOption[] = []
      selectedVpcs.forEach((selectedVpc: MultiSelectOption) => {
        const foundVpc = vpcs.find(({ value }: MultiSelectOption) => value === selectedVpc.value)

        if (foundVpc) {
          savedVpcs.push(foundVpc)
        }
      })
      setSelectedVpcs(savedVpcs as MultiSelectOption[])
    }
  }, [vpcs, multiType])

  return (
    <Layout.Vertical spacing="medium" margin={{ bottom: 'medium' }}>
      <Label style={{ color: Color.GREY_900 }}>{getString('cd.steps.awsInfraStep.labels.vpcs')}</Label>
      {formik && (
        <MultiSelectTypeInput
          name={name}
          key={name}
          disabled={readonly}
          allowableTypes={allowableTypes}
          expressions={expressions}
          value={selectedVpcs || []}
          onTypeChange={type => {
            if (type === 'EXPRESSION') {
              formik.setFieldValue(name, '')
              setSelectedVpcs('')
            }
            setMultiType(type)
          }}
          onChange={(values, _, type) => {
            if (isMultiTypeFixed(type)) {
              setSelectedVpcs(values as MultiSelectOption[])
              const parsedValues = (values as MultiSelectOption[])?.map(({ value }: MultiSelectOption) => value)
              formik.setFieldValue(name, parsedValues)
            } else {
              setSelectedVpcs(values as MultiSelectOption[])
              formik.setFieldValue(name, values)
            }
          }}
          onFocus={() => {
            /* istanbul ignore next */
            if (isEmpty(vpcs)) {
              refetch()
            }
          }}
          multiSelectProps={{ items: vpcs, usePortal: true, placeholder: '' }}
          data-testid="aws-infra-vpcs"
          resetExpressionOnFixedTypeChange
        />
      )}
    </Layout.Vertical>
  )
}

export default connect(VpcsList)
