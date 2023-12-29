/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import {
  Checkbox,
  FormInput,
  FormikForm,
  MultiTypeInputType,
  SelectOption,
  getMultiTypeFromValue,
  Icon,
  Container,
  Text
} from '@harness/uicore'
import { Color, FontVariation, Intent } from '@harness/design-system'
import { get } from 'lodash-es'
import { useStrings, UseStringsReturn } from 'framework/strings'
import { FormMultiTypeTextAreaField } from '@common/components'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import type { AcceptableValue } from '@pipeline/components/PipelineInputSetForm/CICodebaseInputSetForm'
import { FormMultiTypeDateTimePickerField } from '@common/components/MultiTypeDateTimePicker/MultiTypeDateTimePicker'
import { ALL_TIME_ZONES, convertDateTimeBasedOnTimezone } from '@common/utils/dateUtils'
import { DATE_PARSE_FORMAT } from '@common/components/DateTimePicker/DateTimePicker'
import { isApprovalStepFieldDisabled } from '../Common/ApprovalCommons'
import type { HarnessApprovalFormContentProps } from './types'
import { ApproveAction } from './helper'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'
import css from './HarnessApproval.module.scss'

const showAutoApproveScheduleTimeoutWarning = (getString: UseStringsReturn['getString']): JSX.Element => (
  <div className={cx(stepCss.formGroup, css.scheduleTimeoutWarningContainer)}>
    <Container intent="warning" flex={{ justifyContent: 'flex-start' }}>
      <Icon name="warning-icon" intent={Intent.WARNING} margin={{ right: 'small' }} />
      <Text font={{ variation: FontVariation.FORM_HELP }} color={Color.ORANGE_900}>
        {getString('pipeline.approvalStep.validation.autoApproveScheduleTimeout')}
      </Text>
    </Container>
  </div>
)

export default function ScheduleAutoApproval({
  formik,
  readonly,
  allowableTypes = [MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION, MultiTypeInputType.RUNTIME]
}: Partial<HarnessApprovalFormContentProps>): JSX.Element {
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const autoApprovalSpec = formik?.values.spec?.autoApproval
  const isApproveActionChecked = autoApprovalSpec?.action === ApproveAction.Approve
  const timeZoneList: SelectOption[] = ALL_TIME_ZONES.map(timeZone => ({ value: timeZone, label: timeZone }))

  return (
    <FormikForm>
      <Checkbox
        name="AutoApprove"
        label={getString('pipeline.approvalStep.autoApproveLabel')}
        checked={isApproveActionChecked}
        disabled={isApprovalStepFieldDisabled(readonly)}
        onChange={val => {
          if (val.currentTarget.checked && !isApproveActionChecked) {
            formik?.setFieldValue('spec.autoApproval.action', ApproveAction.Approve)
          } else {
            formik?.setFieldValue('spec.autoApproval.action', ApproveAction.Reject)
          }
        }}
        width={120}
        margin={{ bottom: 'medium', top: 'small' }}
      />
      <div className={cx(stepCss.formGroup, stepCss.lg)}>
        <FormInput.MultiTypeInput
          label={getString('common.timezone')}
          name="spec.autoApproval.scheduledDeadline.timeZone"
          disabled={isApprovalStepFieldDisabled(readonly) || !isApproveActionChecked}
          useValue
          multiTypeInputProps={{
            onChange: (timeZone: AcceptableValue | undefined) => {
              const formValue = get(formik?.values, 'spec.autoApproval.scheduledDeadline.time')
              if (getMultiTypeFromValue(formValue) === MultiTypeInputType.FIXED) {
                const prevTimezone = get(formik?.values, 'spec.autoApproval.scheduledDeadline.timeZone')

                const adjustedTimeFromEpoch = convertDateTimeBasedOnTimezone(
                  prevTimezone,
                  get(timeZone, 'value', '') as string,
                  formValue,
                  DATE_PARSE_FORMAT
                )

                formik?.setFieldValue('spec.autoApproval.scheduledDeadline.time', adjustedTimeFromEpoch)
              }
            },
            expressions,
            selectProps: {
              usePortal: true,
              items: timeZoneList
            },
            allowableTypes
          }}
          selectItems={timeZoneList}
        />
      </div>
      <div className={cx(stepCss.formGroup, stepCss.lg)}>
        <FormMultiTypeDateTimePickerField
          label={getString('timeLabel')}
          name="spec.autoApproval.scheduledDeadline.time"
          placeholder={getString('pipeline.approvalStep.autoApproveDeadline')}
          disabled={isApprovalStepFieldDisabled(readonly) || !isApproveActionChecked}
          defaultToCurrentTime
          defaultValueToReset={Date.now().toString()}
          multiTypeDateTimePicker={{
            expressions,
            allowableTypes: allowableTypes,
            placeholder: getString('pipeline.approvalStep.autoApproveDeadline'),
            dateInputProps: {
              dateProps: {
                defaultValue: undefined
              }
            }
          }}
        />
      </div>
      {getMultiTypeFromValue(formik?.values.timeout) === MultiTypeInputType.RUNTIME &&
        showAutoApproveScheduleTimeoutWarning(getString)}
      <div className={cx(stepCss.formGroup)}>
        <FormMultiTypeTextAreaField
          name="spec.autoApproval.comments"
          label={getString('message')}
          className={css.approvalMessage}
          multiTypeTextArea={{ enableConfigureOptions: false, expressions, allowableTypes: [MultiTypeInputType.FIXED] }}
          placeholder="Please add relevant information for this step"
          disabled={isApprovalStepFieldDisabled(readonly) || !isApproveActionChecked}
        />
      </div>
    </FormikForm>
  )
}
