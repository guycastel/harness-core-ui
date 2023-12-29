/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { isEmpty, get } from 'lodash-es'
import { getMultiTypeFromValue, MultiTypeInputType, SelectOption } from '@harness/uicore'
import { useStrings } from 'framework/strings'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { SelectInputSetView } from '@pipeline/components/InputSetView/SelectInputSetView/SelectInputSetView'
import { FormMultiTypeTextAreaField } from '@common/components'
import { FormMultiTypeUserGroupInput } from '@rbac/components/UserGroupsInput/FormMultitypeUserGroupInput'
import { TimeoutFieldInputSetView } from '@pipeline/components/InputSetView/TimeoutFieldInputSetView/TimeoutFieldInputSetView'
import { TextFieldInputSetView } from '@pipeline/components/InputSetView/TextFieldInputSetView/TextFieldInputSetView'
import { FormMultiTypeDateTimePickerField } from '@common/components/MultiTypeDateTimePicker/MultiTypeDateTimePicker'
import { ALL_TIME_ZONES } from '@common/utils/dateUtils'
import { isExecutionTimeFieldDisabled } from '@pipeline/utils/runPipelineUtils'
import UserGroupsInput from '@rbac/components/UserGroupsInput/UserGroupsInput'
import { ALLOWED_VALUES_TYPE } from '@common/components/ConfigureOptions/constants'
import { isApprovalStepFieldDisabled } from '../Common/ApprovalCommons'
import type { HarnessApprovalDeploymentModeProps } from './types'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'
import css from './HarnessApproval.module.scss'

/*
Used for input sets and deployment form
Provide values for all runtime fields in approval step
Open the same form in readonly view while viewing already run executions
*/

interface ScheduledDeadlineObj {
  time: string
  timeZone: string
}

export default function HarnessApprovalDeploymentMode(props: HarnessApprovalDeploymentModeProps): JSX.Element {
  const { inputSetData, allowableTypes, formik, stepViewType } = props
  const template = inputSetData?.template
  const path = inputSetData?.path
  const prefix = isEmpty(path) ? '' : `${path}.`
  const readonly = inputSetData?.readonly
  const { getString } = useStrings()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()
  const { expressions } = useVariablesExpression()
  const timeZoneList: SelectOption[] = ALL_TIME_ZONES.map(timeZone => ({ value: timeZone, label: timeZone }))
  const autoApprovalDetailsFromTemplate = get(
    template,
    'spec.autoApproval.scheduledDeadline',
    {}
  ) as ScheduledDeadlineObj
  const { time: timeValueFromTemplate, timeZone: timeZoneValueFromTemplate } = autoApprovalDetailsFromTemplate || {}

  return (
    <React.Fragment>
      {getMultiTypeFromValue(template?.timeout) === MultiTypeInputType.RUNTIME ? (
        <TimeoutFieldInputSetView
          name={`${prefix}timeout`}
          label={getString('pipelineSteps.timeoutLabel')}
          className={css.deploymentViewMedium}
          multiTypeDurationProps={{
            configureOptionsProps: {
              isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
            },
            allowableTypes,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
            expressions,
            disabled: isApprovalStepFieldDisabled(readonly)
          }}
          disabled={isApprovalStepFieldDisabled(readonly)}
          fieldPath={'timeout'}
          template={template}
        />
      ) : null}

      {getMultiTypeFromValue(template?.spec?.approvalMessage) === MultiTypeInputType.RUNTIME ? (
        <FormMultiTypeTextAreaField
          className={cx(css.approvalMessage, css.deploymentViewMedium)}
          label={getString('pipeline.approvalStep.message')}
          name={`${prefix}spec.approvalMessage`}
          disabled={isApprovalStepFieldDisabled(readonly)}
          multiTypeTextArea={{
            configureOptionsProps: {
              isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
            },
            expressions,
            allowableTypes
          }}
        />
      ) : null}

      {getMultiTypeFromValue(template?.spec?.callbackId) === MultiTypeInputType.RUNTIME ? (
        <TextFieldInputSetView
          name={`${prefix}spec.callbackId`}
          label={getString('pipeline.approvalStep.approvalCallback')}
          multiTextInputProps={{
            disabled: isApprovalStepFieldDisabled(readonly),
            expressions,
            allowableTypes
          }}
          disabled={isApprovalStepFieldDisabled(readonly)}
          template={template}
          fieldPath="spec.callbackId"
          className={css.deploymentViewMedium}
          isOptional={true}
        />
      ) : null}

      {typeof template?.spec?.approvers?.userGroups === 'string' &&
      getMultiTypeFromValue(template?.spec?.approvers?.userGroups) === MultiTypeInputType.RUNTIME ? (
        <div className={css.deploymentViewMedium}>
          <FormMultiTypeUserGroupInput
            expressions={expressions}
            formik={formik}
            allowableTypes={allowableTypes}
            enableConfigureOptions={true}
            configureOptionsProps={{
              getAllowedValuesCustomComponent: () => (
                <UserGroupsInput name="allowedValues" label={getString('allowedValues')} />
              ),
              isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
            }}
            name={`${prefix}spec.approvers.userGroups`}
            label={getString('common.userGroups')}
            disabled={isApprovalStepFieldDisabled(readonly)}
            tooltipProps={{ dataTooltipId: 'harnessApprovalRuntime_userGroups' }}
            templateProps={{
              isTemplatizedView: true,
              templateValue: template.spec.approvers.userGroups
            }}
          />
        </div>
      ) : null}

      {typeof template?.spec?.approvers?.minimumCount === 'string' &&
      getMultiTypeFromValue(template?.spec?.approvers?.minimumCount) === MultiTypeInputType.RUNTIME ? (
        <TextFieldInputSetView
          label={getString('pipeline.approvalStep.minimumCount')}
          name={`${prefix}spec.approvers.minimumCount`}
          multiTextInputProps={{
            disabled: isApprovalStepFieldDisabled(readonly),
            expressions,
            allowableTypes,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
            textProps: { type: 'number' }
          }}
          disabled={isApprovalStepFieldDisabled(readonly)}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType),
            allowedValuesType: ALLOWED_VALUES_TYPE.NUMBER
          }}
          className={css.deploymentViewMedium}
          fieldPath="spec.approvers.minimumCount"
          template={template}
        />
      ) : null}
      {getMultiTypeFromValue(timeZoneValueFromTemplate) === MultiTypeInputType.RUNTIME ? (
        <SelectInputSetView
          label={getString('common.timezone')}
          name={`${prefix}spec.autoApproval.scheduledDeadline.timeZone`}
          useValue={true}
          fieldPath={'spec.autoApproval.scheduledDeadline.timeZone'}
          template={template}
          selectItems={timeZoneList}
          multiTypeInputProps={{
            expressions,
            disabled: isApprovalStepFieldDisabled(readonly),
            allowableTypes
          }}
          disabled={isApprovalStepFieldDisabled(readonly)}
          className={cx(stepCss.formGroup, stepCss.sm)}
        />
      ) : null}
      {getMultiTypeFromValue(timeValueFromTemplate) === MultiTypeInputType.RUNTIME ? (
        <div className={css.deploymentViewMedium}>
          <FormMultiTypeDateTimePickerField
            label={getString('timeLabel')}
            name={`${prefix}spec.autoApproval.scheduledDeadline.time`}
            placeholder={getString('pipeline.approvalStep.autoApproveDeadline')}
            disabled={isApprovalStepFieldDisabled(readonly)}
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
      ) : null}
    </React.Fragment>
  )
}
