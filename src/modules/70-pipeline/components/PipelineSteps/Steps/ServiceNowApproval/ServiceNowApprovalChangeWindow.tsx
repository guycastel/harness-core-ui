/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Color, Intent } from '@harness/design-system'
import { FormInput, Icon, Layout, SelectOption, Text } from '@harness/uicore'
import type { FormikContextType } from 'formik'
import React, { ReactElement, useMemo } from 'react'
import type { UseGetReturn } from 'restful-react'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { useStrings } from 'framework/strings'
import type {
  Failure,
  GetServiceNowIssueCreateMetadataQueryParams,
  ResponseListServiceNowFieldNG,
  ServiceNowFieldNG
} from 'services/cd-ng'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import type { ServiceNowApprovalData } from './types'
import css from '../Common/ApprovalRejectionCriteria.module.scss'

interface ServiceNowApprovalChangeWindowProps {
  formik: FormikContextType<ServiceNowApprovalData>
  readonly: boolean
  fieldList: ServiceNowFieldNG[]
  getServiceNowIssueCreateMetadataQuery: UseGetReturn<
    ResponseListServiceNowFieldNG,
    Failure | Error,
    GetServiceNowIssueCreateMetadataQueryParams,
    unknown
  >
}

export const getDateTimeOptions = (serviceNowIssueCreateMetadataFields?: ServiceNowFieldNG[]) => {
  const dateTimeSelectOptions: SelectOption[] = []
  serviceNowIssueCreateMetadataFields?.forEach(field => {
    if (field.schema.type === 'glide_date_time') {
      dateTimeSelectOptions.push({ label: field.name, value: field.key })
    }
  })

  return dateTimeSelectOptions
}

export function ServiceNowApprovalChangeWindow({
  readonly,
  fieldList,
  getServiceNowIssueCreateMetadataQuery
}: ServiceNowApprovalChangeWindowProps): ReactElement {
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const selectOptions = useMemo(() => {
    return getDateTimeOptions(fieldList)
  }, [fieldList])

  const { getRBACErrorMessage } = useRBACError()

  const createMetadataError = getServiceNowIssueCreateMetadataQuery.error

  const commonMultiTypeInputProps = (placeholder: string) => ({
    disabled: readonly,
    selectItems: selectOptions,
    placeholder: getServiceNowIssueCreateMetadataQuery.loading
      ? getString('pipeline.serviceNowApprovalStep.fetching')
      : `${getString('select')} ${placeholder}`,
    useValue: true,
    multiTypeInputProps: {
      newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
      selectProps: {
        addClearBtn: true,
        items: selectOptions
      },
      expressions
    }
  })

  return (
    <div className={css.approvalChangeWindow}>
      <Text
        color={Color.GREY_800}
        font={{ weight: 'semi-bold', size: 'normal' }}
        tooltipProps={{
          dataTooltipId: 'serviceNowApprovalChangeWindow'
        }}
      >
        {getString('pipeline.serviceNowApprovalStep.approvalChangeWindow')}
      </Text>

      <Layout.Vertical spacing="xsmall" className={css.windowSelection}>
        <Layout.Horizontal spacing="medium">
          <FormInput.MultiTypeInput
            name="spec.changeWindow.startField"
            label={getString('pipeline.serviceNowApprovalStep.windowStart')}
            {...commonMultiTypeInputProps(getString('pipeline.serviceNowApprovalStep.windowStart'))}
          />
          <FormInput.MultiTypeInput
            name="spec.changeWindow.endField"
            label={getString('pipeline.serviceNowApprovalStep.windowEnd')}
            {...commonMultiTypeInputProps(getString('pipeline.serviceNowApprovalStep.windowEnd'))}
          />
        </Layout.Horizontal>
        {createMetadataError && (
          <Layout.Horizontal spacing="small">
            <Icon name="error" intent={Intent.DANGER} />
            <Text intent={Intent.DANGER}>{getRBACErrorMessage(createMetadataError)}</Text>
          </Layout.Horizontal>
        )}
      </Layout.Vertical>
    </div>
  )
}
