import React from 'react'
import {
  Text,
  Layout,
  FormInput,
  getMultiTypeFromValue,
  MultiTypeInputType,
  AllowedTypes,
  SelectOption
} from '@harness/uicore'
import { useParams } from 'react-router-dom'
import { defaultTo, get } from 'lodash-es'
import { connect, FormikContextType } from 'formik'

import { useAutoScalingGroups } from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import { ConfigureOptions } from '@common/components/ConfigureOptions/ConfigureOptions'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'

import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'

import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import css from './SshWinRmAwsInfrastructureSpec.module.scss'

export interface AsgAutoScalingGroupProps {
  readonly?: boolean
  allowableTypes: AllowedTypes
  formik?: FormikContextType<unknown>
  name: string
  envId?: string
  infraId?: string
  connector?: string
  region?: string
}

const AsgAutoScalingGroup = (props: AsgAutoScalingGroupProps): JSX.Element => {
  const { readonly, formik, name, envId, infraId, connector = '', region = '' } = props

  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { expressions } = useVariablesExpression()
  const { getString } = useStrings()
  const formValues = get(formik, 'values')

  const connectorValue = defaultTo(get(formValues, 'connectorRef.value'), connector)
  const regionValue = defaultTo(get(formValues, 'region.value'), region)
  const [asgBaseNames, setAsgBaseNames] = React.useState<SelectOption[]>([])

  const {
    data: awsAutoScalingData,
    refetch,
    loading,
    error
  } = useAutoScalingGroups({
    queryParams: {
      accountIdentifier: accountId,
      region: regionValue,
      awsConnectorRef: connectorValue,
      projectIdentifier,
      orgIdentifier,
      envId: defaultTo(envId, ''),
      infraDefinitionId: defaultTo(infraId, '')
    },
    lazy: true
  })

  React.useEffect(() => {
    setAsgBaseNames(
      defaultTo(awsAutoScalingData?.data, []).map((asgBaseOption: string) => ({
        value: asgBaseOption,
        label: asgBaseOption
      }))
    )
  }, [awsAutoScalingData])

  React.useEffect(() => {
    setAsgBaseNames([])
  }, [error])

  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const getItems = (isFetching: boolean, items: SelectOption[]): SelectOption[] => {
    if (isFetching) {
      const labelStr = getString('common.loadingFieldOptions', { fieldName: 'Asg Base Names' })
      return [{ label: labelStr, value: labelStr }]
    }
    return defaultTo(items, [])
  }

  return (
    <Layout.Horizontal className={css.regionWrapper} spacing="medium">
      <FormInput.MultiTypeInput
        name={name}
        selectItems={getItems(loading, asgBaseNames)}
        useValue
        className={css.inputWidth}
        multiTypeInputProps={{
          expressions,
          newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
          selectProps: {
            items: asgBaseNames,
            allowCreatingNewItems: true,
            loadingItems: loading,
            noResults: (
              <Text padding={'small'}>
                {loading
                  ? getString('common.loadingFieldOptions', { fieldName: getString('cd.baseAsgName') })
                  : defaultTo(get(error, 'data.message'), getString('common.filters.noResultsFound'))}
              </Text>
            )
          },
          onClick: () => {
            refetch({
              queryParams: {
                accountIdentifier: accountId,
                region: regionValue,
                awsConnectorRef: connectorValue,
                projectIdentifier,
                orgIdentifier,
                envId: defaultTo(envId, ''),
                infraDefinitionId: defaultTo(infraId, '')
              }
            })
          }
        }}
        label={getString('cd.steps.common.asg')}
        placeholder={`${getString('select')} ${getString('cd.steps.common.asg')}`}
        disabled={readonly}
      />
      {getMultiTypeFromValue(get(formValues, name)) === MultiTypeInputType.RUNTIME && (
        <ConfigureOptions
          value={get(formValues, name) as string}
          type="String"
          variableName={name}
          showRequiredField={false}
          showDefaultField={false}
          onChange={value => {
            formik?.setFieldValue(name, value)
          }}
          isReadonly={readonly}
          className={css.marginTop}
        />
      )}
    </Layout.Horizontal>
  )
}

export default connect(AsgAutoScalingGroup)
