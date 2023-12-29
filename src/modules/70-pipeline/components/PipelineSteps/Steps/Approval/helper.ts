/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { getMultiTypeFromValue, MultiTypeInputType, parseStringToTime, RUNTIME_INPUT_VALUE } from '@harness/uicore'
import * as Yup from 'yup'
import moment from 'moment'
import { set } from 'lodash-es'
import type { UseStringsReturn } from 'framework/strings'
import { DATE_PARSE_FORMAT } from '@common/components/DateTimePicker/DateTimePicker'
import { getTimeZoneOffsetInMinutes } from '@common/utils/dateUtils'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import type { ApproverInputsSubmitCallInterface, HarnessApprovalData } from './types'

export enum ApproveAction {
  Approve = 'APPROVE',
  Reject = 'REJECT'
}

const getInitialValueForMinCount = (valueFromData: string | number): string | number => {
  if (getMultiTypeFromValue(valueFromData) === MultiTypeInputType.FIXED) {
    // type is FIXED
    if (valueFromData) {
      // type is FIXED and value exists i.e. user has typed some numbers, convert them to number and return
      return Number(valueFromData)
    }
    // If the type is FIXED but the value doesn't exist i.e. opening the form for the first time
    // return the default value of 1
    return 1
  }
  // if the type is not FIXED i.e. runtime or expression, return the string as it is
  return valueFromData
}

export const processFormData = (data: HarnessApprovalData): HarnessApprovalData => {
  const toReturn: HarnessApprovalData = { ...data }

  // remove autoApproval spec if unchecked
  if (data.spec?.autoApproval?.action === ApproveAction.Reject) {
    set(toReturn, 'spec.autoApproval', undefined)
  }

  if (data.spec.approverInputs) {
    if (getMultiTypeFromValue(data.spec.approverInputs as string) === MultiTypeInputType.RUNTIME) {
      toReturn.spec.approverInputs = data.spec.approverInputs
    } else if (Array.isArray(data.spec.approverInputs)) {
      toReturn.spec.approverInputs = (data.spec.approverInputs as ApproverInputsSubmitCallInterface[])
        ?.filter(input => input.name)
        ?.map(
          (input: ApproverInputsSubmitCallInterface) =>
            ({
              name: input.name,
              defaultValue: input.defaultValue
            } as ApproverInputsSubmitCallInterface)
        )
    }
  }
  if (data.spec.callbackId) {
    toReturn.spec.callbackId = data.spec.callbackId.trim()
  }
  return toReturn
}

// Converting API call data for formik values, to populate while editing the step
export const processForInitialValues = (data: HarnessApprovalData): HarnessApprovalData => {
  const toReturn: HarnessApprovalData = {
    ...data,
    spec: {
      ...data.spec,
      approvers: {
        ...data.spec?.approvers,
        minimumCount: getInitialValueForMinCount(data.spec?.approvers?.minimumCount)
      }
    }
  }

  if (data.spec?.approverInputs) {
    if (getMultiTypeFromValue(data.spec?.approverInputs as string) === MultiTypeInputType.RUNTIME) {
      toReturn.spec.approverInputs = data.spec?.approverInputs
    } else if (Array.isArray(data.spec?.approverInputs)) {
      toReturn.spec.approverInputs = (data.spec?.approverInputs as ApproverInputsSubmitCallInterface[])?.map(
        (input: ApproverInputsSubmitCallInterface) =>
          ({
            name: input.name,
            defaultValue: input.defaultValue
          } as ApproverInputsSubmitCallInterface)
      )
    }
  }

  return toReturn
}

export const scheduleAutoApprovalValidationSchema = (
  getString: UseStringsReturn['getString'],
  viewType?: StepViewType
): Yup.Schema<string | undefined> => {
  return Yup.lazy((value): Yup.Schema<string> => {
    if (getMultiTypeFromValue(value as any) === MultiTypeInputType.FIXED) {
      return Yup.string()
        .trim()
        .required(getString('common.validation.fieldIsRequired', { name: 'Time' }))
        .test({
          test(val: string): boolean | Yup.ValidationError {
            const timeout: string = (this as any).from[3].value.timeout
            const isTimeoutFieldRuntime = timeout === RUNTIME_INPUT_VALUE
            // check only 2nd condition if timeout field is not present in deployment view
            const isTimeoutUnavailableInDeploymentView = viewType === StepViewType.DeploymentForm && !timeout
            const parsedTime = parseStringToTime(timeout ?? '')

            const maxApprovalTime: number = Date.now() + (isTimeoutFieldRuntime ? 0 : parsedTime)
            const minApprovalTime: number = Date.now() + parseStringToTime('15m')
            const formValue = moment(val, DATE_PARSE_FORMAT).valueOf()

            if (!isTimeoutFieldRuntime && !isTimeoutUnavailableInDeploymentView && formValue > maxApprovalTime)
              return this.createError({
                message: getString('pipeline.approvalStep.validation.autoApproveScheduleTimeout')
              })

            if (
              (isTimeoutFieldRuntime ||
                parsedTime > parseStringToTime('15m') ||
                isTimeoutUnavailableInDeploymentView) &&
              formValue < minApprovalTime
            )
              return this.createError({
                message: getString('pipeline.approvalStep.validation.autoApproveScheduleCurrentTime')
              })

            return true
          }
        })
    }
    return Yup.string().required(getString('common.validation.fieldIsRequired', { name: 'Time' }))
  })
}

export const getIsAutoApprovalMinimumTimeValidationApplicable = (
  currentTime: string,
  currentTimezone: string
): boolean => {
  const currentDate = new Date()
  const currentTimeOffset = getTimeZoneOffsetInMinutes(currentTimezone)

  const currentTimeBasedOnTimezone = moment.utc(currentDate.getTime()).utcOffset(currentTimeOffset).valueOf()

  const formValueTimeBasedOnTimezone =
    moment.utc(currentTime, DATE_PARSE_FORMAT).utcOffset(currentTimeOffset).valueOf() - currentTimeOffset * 60000

  const minApprovalTime: number = currentTimeBasedOnTimezone + parseStringToTime('15m')

  return formValueTimeBasedOnTimezone < minApprovalTime
}
