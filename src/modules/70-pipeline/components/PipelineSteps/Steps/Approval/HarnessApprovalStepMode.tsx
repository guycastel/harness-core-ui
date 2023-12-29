/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import cx from 'classnames'
import { produce } from 'immer'
import { isEmpty, compact, isArray, has, defaultTo, get } from 'lodash-es'
import * as Yup from 'yup'
import { FieldArray, FormikProps } from 'formik'
import {
  Accordion,
  Button,
  Formik,
  FormikForm,
  FormInput,
  getMultiTypeFromValue,
  HarnessDocTooltip,
  MultiTypeInputType,
  Container,
  AllowedTypes,
  useToaster,
  Layout,
  Text
} from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { useParams } from 'react-router-dom'
import { setFormikRef, StepFormikFowardRef, StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { String, useStrings } from 'framework/strings'
import {
  FormMultiTypeDurationField,
  getDurationValidationSchema
} from '@common/components/MultiTypeDuration/MultiTypeDuration'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { ALLOWED_VALUES_TYPE, ConfigureOptions } from '@common/components/ConfigureOptions/ConfigureOptions'
import { FormMultiTypeTextAreaField } from '@common/components/MultiTypeTextArea/MultiTypeTextArea'
import { FormMultiTypeUserGroupInput } from '@rbac/components/UserGroupsInput/FormMultitypeUserGroupInput'
import { regexPositiveNumbers } from '@common/utils/StringUtils'
import { isMultiTypeRuntime, isValueFixed } from '@common/utils/utils'
import { UserGroupConfigureOptions } from '@rbac/components/UserGroupConfigureOptions/UserGroupConfigureOptions'

import { getIdentifierFromValue, getScopeFromValue } from '@common/components/EntityReference/EntityReference'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { getBatchUserGroupListPromise } from 'services/cd-ng'
import { Scope } from '@common/interfaces/SecretsInterface'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { isApprovalStepFieldDisabled } from '../Common/ApprovalCommons'
import type {
  ApproverInputsSubmitCallInterface,
  HarnessApprovalData,
  HarnessApprovalFormContentProps,
  HarnessApprovalStepModeProps
} from './types'
import { getNameAndIdentifierSchema } from '../StepsValidateUtils'
import ScheduleAutoApproval from './ScheduleAutoApproval'
import { ApproveAction, getIsAutoApprovalMinimumTimeValidationApplicable } from './helper'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'
import css from './HarnessApproval.module.scss'

function FormContent({
  formik,
  isNewStep,
  readonly,
  allowableTypes,
  stepViewType
}: HarnessApprovalFormContentProps): React.ReactElement {
  const { getString } = useStrings()
  const { showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const { expressions } = useVariablesExpression()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()
  const formikUserGroups = formik.values.spec?.approvers?.userGroups
  const [scopeCountMap, setScopeCountMap] = useState<Map<Scope, string[]>>(new Map<Scope, string[]>())
  const showAutoApproval = useFeatureFlag(FeatureFlag.CDS_AUTO_APPROVAL)

  const userGroupMap = React.useMemo(() => {
    const _userGroupMap = new Map<Scope, string[]>()
    if (Array.isArray(formikUserGroups) && getMultiTypeFromValue(formikUserGroups) === MultiTypeInputType.FIXED) {
      formikUserGroups?.forEach((userGroup: any) => {
        const userGroupScope = getScopeFromValue(userGroup as string)
        if (_userGroupMap.has(userGroupScope)) {
          _userGroupMap.get(userGroupScope)?.push(getIdentifierFromValue(userGroup))
        } else {
          _userGroupMap.set(userGroupScope, [getIdentifierFromValue(userGroup)])
        }
      })
    }
    return _userGroupMap
  }, [formikUserGroups])

  const getScopeCountMap = React.useCallback(async (): Promise<void> => {
    const scopeArray = [Scope.ACCOUNT, Scope.ORG, Scope.PROJECT]
    const promises = scopeArray.map((scope: Scope) => {
      return getBatchUserGroupListPromise({
        queryParams: {
          accountIdentifier: accountId
        },
        body: {
          accountIdentifier: accountId,
          ...((scope === Scope.ORG || scope === Scope.PROJECT) && { orgIdentifier }),
          ...(scope === Scope.PROJECT && { projectIdentifier }),
          identifierFilter: defaultTo(userGroupMap?.get(scope), ['@'])
        }
      })
    })
    return Promise.all(promises)
      .then(responses => {
        const _scopeCountMap = new Map<Scope, string[]>()
        responses.map((response, idx: number) => {
          if (response?.data)
            _scopeCountMap.set(
              scopeArray[idx],
              defaultTo(
                response.data?.map(userGroups => userGroups.identifier),
                []
              )
            )
        })
        if (!isEmpty(_scopeCountMap)) {
          setScopeCountMap(_scopeCountMap)
        }
      })
      .catch(e => {
        showError(getRBACErrorMessage(e))
      })
  }, [userGroupMap, accountId, orgIdentifier, projectIdentifier])

  useEffect(() => {
    if (!isEmpty(userGroupMap)) getScopeCountMap()
  }, [userGroupMap, getScopeCountMap])

  return (
    <React.Fragment>
      {stepViewType !== StepViewType.Template && (
        <div className={cx(stepCss.formGroup, stepCss.lg)}>
          <FormInput.InputWithIdentifier
            inputLabel={getString('name')}
            isIdentifierEditable={isNewStep}
            inputGroupProps={{
              placeholder: getString('pipeline.stepNamePlaceholder'),
              disabled: isApprovalStepFieldDisabled(readonly)
            }}
          />
        </div>
      )}
      <div className={cx(stepCss.formGroup, stepCss.sm)}>
        <FormMultiTypeDurationField
          name="timeout"
          className={stepCss.sm}
          label={getString('pipelineSteps.timeoutLabel')}
          disabled={isApprovalStepFieldDisabled(readonly)}
          multiTypeDurationProps={{
            expressions,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
            enableConfigureOptions: true,
            allowableTypes
          }}
        />
      </div>

      <div className={stepCss.stepSubSectionHeading}>Approval Message</div>
      <div className={cx(stepCss.formGroup)}>
        <FormMultiTypeTextAreaField
          name="spec.approvalMessage"
          label={getString('message')}
          className={css.approvalMessage}
          multiTypeTextArea={{ enableConfigureOptions: false, expressions, allowableTypes }}
          placeholder="Please add relevant information for this step"
          disabled={isApprovalStepFieldDisabled(readonly)}
        />
        {getMultiTypeFromValue(formik.values.spec.approvalMessage) === MultiTypeInputType.RUNTIME && (
          <ConfigureOptions
            value={formik.values.spec.approvalMessage as string}
            type="String"
            variableName="spec.approvalMessage"
            showRequiredField={false}
            showDefaultField={false}
            onChange={value => formik.setFieldValue('spec.approvalMessage', value)}
            isReadonly={readonly}
          />
        )}
      </div>
      <FormInput.CheckBox
        name="spec.includePipelineExecutionHistory"
        label={getString('pipeline.approvalStep.includeStageExecutionDetails')}
        disabled={isApprovalStepFieldDisabled(readonly)}
      />
      <FormInput.CheckBox
        tooltipProps={{ dataTooltipId: 'autoRejectPreviousDeploymentsTooltip' }}
        name="spec.isAutoRejectEnabled"
        label={getString('pipeline.approvalStep.isAutoRejectEnabled')}
        disabled={isApprovalStepFieldDisabled(readonly)}
      />
      <div className={cx(stepCss.formGroup, stepCss.lg)}>
        <FormInput.MultiTextInput
          name="spec.callbackId"
          label={getString('pipeline.approvalStep.approvalCallback')}
          multiTextInputProps={{
            expressions,
            allowableTypes
          }}
          disabled={isApprovalStepFieldDisabled(readonly)}
          isOptional={true}
          tooltipProps={{ dataTooltipId: 'harnessApproval_spec.callbackId' }}
          placeholder=""
        />
      </div>
      <div className={stepCss.stepSubSectionHeading}>Approvers</div>
      <div className={cx(stepCss.formGroup, stepCss.lg)}>
        <FormMultiTypeUserGroupInput
          name="spec.approvers.userGroups"
          label={getString('common.userGroups')}
          formik={formik}
          tooltipProps={{ dataTooltipId: 'harnessApproval_spec.approvers.userGroups' }}
          disabled={isApprovalStepFieldDisabled(readonly)}
          expressions={expressions}
          allowableTypes={allowableTypes}
          scopeCountMap={scopeCountMap}
        />
        {getMultiTypeFromValue(formik.values.spec.approvers.userGroups) === MultiTypeInputType.RUNTIME && (
          <Container margin={{ top: 'medium' }}>
            <UserGroupConfigureOptions
              value={formik.values.spec.approvers.userGroups as string}
              type="String"
              variableName="spec.approvers.userGroups"
              showRequiredField={false}
              showDefaultField={false}
              onChange={value => formik.setFieldValue('spec.approvers.userGroups', value)}
              isReadonly={readonly}
              userGroupsInputProps={{
                tooltipProps: { dataTooltipId: 'harnessApproval_spec.approvers.userGroups' },
                disabled: isApprovalStepFieldDisabled(readonly)
              }}
            />
          </Container>
        )}
      </div>

      <div className={cx(stepCss.formGroup, stepCss.lg)}>
        <FormInput.MultiTextInput
          name="spec.approvers.minimumCount"
          label={getString('pipeline.approvalStep.minimumCount')}
          multiTextInputProps={{
            expressions,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
            textProps: {
              type: 'number'
            },
            allowableTypes
          }}
          disabled={isApprovalStepFieldDisabled(readonly)}
        />
        {getMultiTypeFromValue(formik.values.spec.approvers?.minimumCount as string) === MultiTypeInputType.RUNTIME && (
          <ConfigureOptions
            value={formik.values.spec.approvers?.minimumCount as string}
            type="Number"
            variableName="spec.approvers.minimumCount"
            showRequiredField={false}
            showDefaultField={false}
            onChange={value => formik.setFieldValue('spec.approvers.minimumCount', value)}
            isReadonly={readonly}
            allowedValuesType={ALLOWED_VALUES_TYPE.NUMBER}
          />
        )}
      </div>
      <FormInput.CheckBox
        name="spec.approvers.disallowPipelineExecutor"
        label={getString('pipeline.approvalStep.disallowPipelineExecutor')}
        disabled={isApprovalStepFieldDisabled(readonly)}
      />

      <div className={stepCss.noLookDivider} />

      <Accordion className={cx(stepCss.accordion, css.accordionStyle)}>
        {showAutoApproval ? (
          <Accordion.Panel
            id="schedule-autoApproval"
            summary={
              <Layout.Horizontal
                spacing="xsmall"
                data-tooltip-id="scheduleAutoApproval"
                margin={{ right: 'small' }}
                flex={{ alignItems: 'flex-end' }}
              >
                <Text font={{ variation: FontVariation.H6 }}>
                  {getString('pipeline.approvalStep.scheduleAutoApprovalOptional')}
                </Text>
                <HarnessDocTooltip tooltipId="scheduleAutoApproval" useStandAlone={true} />
              </Layout.Horizontal>
            }
            details={
              <FormikForm>
                <ScheduleAutoApproval allowableTypes={allowableTypes} formik={formik} readonly={readonly} />
              </FormikForm>
            }
          />
        ) : null}
        <Accordion.Panel
          id="approver-inputs"
          summary={
            <Layout.Horizontal
              spacing="xsmall"
              data-tooltip-id="approverInputs"
              margin={{ right: 'small' }}
              flex={{ alignItems: 'flex-end' }}
            >
              <Text font={{ variation: FontVariation.H6 }}>
                {getString('pipeline.approvalStep.approverInputsOptional')}
              </Text>
              <HarnessDocTooltip tooltipId="approverInputs" useStandAlone={true} />
            </Layout.Horizontal>
          }
          details={
            <div className={stepCss.formGroup}>
              <FieldArray
                name="spec.approverInputs"
                validateOnChange={false}
                render={({ push, remove }) => {
                  return (
                    <div>
                      {isEmpty(formik.values.spec.approverInputs) ? null : (
                        <>
                          <div className={css.headerRow}>
                            <String className={css.label} stringID="variableNameLabel" />
                            <String className={css.label} stringID="valueLabel" />
                          </div>
                          {(formik.values.spec.approverInputs as ApproverInputsSubmitCallInterface[]).map(
                            (_unused: ApproverInputsSubmitCallInterface, i: number) => (
                              <div className={css.headerRow} key={i}>
                                <FormInput.Text
                                  name={`spec.approverInputs[${i}].name`}
                                  disabled={isApprovalStepFieldDisabled(readonly)}
                                  placeholder={getString('name')}
                                />
                                <FormInput.MultiTextInput
                                  name={`spec.approverInputs[${i}].defaultValue`}
                                  disabled={isApprovalStepFieldDisabled(readonly)}
                                  label=""
                                  placeholder={getString('valueLabel')}
                                  multiTextInputProps={{
                                    allowableTypes: (allowableTypes as MultiTypeInputType[]).filter(
                                      item => !isMultiTypeRuntime(item)
                                    ) as AllowedTypes,
                                    newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                                    expressions
                                  }}
                                />
                                <Button
                                  minimal
                                  icon="main-trash"
                                  data-testid={`remove-approverInputs-${i}`}
                                  disabled={isApprovalStepFieldDisabled(readonly)}
                                  onClick={() => remove(i)}
                                />
                              </div>
                            )
                          )}
                        </>
                      )}
                      <Button
                        icon="plus"
                        minimal
                        intent="primary"
                        data-testid="add-approverInput"
                        disabled={isApprovalStepFieldDisabled(readonly)}
                        onClick={() => push({ name: '', defaultValue: '' })}
                      >
                        {getString('pipeline.approvalStep.addApproverInputs')}
                      </Button>
                    </div>
                  )
                }}
              />
            </div>
          }
        />
      </Accordion>
    </React.Fragment>
  )
}

/*
functional component as this component doesn't need a state of it's own.
everything is governed from the parent
*/
function HarnessApprovalStepMode(
  props: HarnessApprovalStepModeProps,
  formikRef: StepFormikFowardRef<HarnessApprovalData>
) {
  const { onUpdate, isNewStep = true, readonly, stepViewType, onChange, allowableTypes } = props
  const { getString } = useStrings()

  const handleOnSubmit = (values: HarnessApprovalData) => {
    onUpdate?.(
      produce(values, draft => {
        const userGroupValues = draft.spec.approvers?.userGroups

        if (isArray(userGroupValues) && userGroupValues.length > 0) {
          draft.spec.approvers.userGroups = compact(userGroupValues as string[])
        }
        if (has(draft, 'userGroupExpression')) {
          delete draft['userGroupExpression']
        }
      })
    )
  }

  return (
    <Formik<HarnessApprovalData>
      onSubmit={handleOnSubmit}
      initialValues={props.initialValues}
      formName="harnessApproval"
      validate={data => {
        onChange?.(data)
      }}
      validationSchema={Yup.object().shape({
        ...getNameAndIdentifierSchema(getString, stepViewType),
        timeout: getDurationValidationSchema({ minimum: '10s' }).required(getString('validation.timeout10SecMinimum')),
        spec: Yup.object().shape({
          approvalMessage: Yup.string().trim().required(getString('pipeline.approvalStep.validation.approvalMessage')),
          approvers: Yup.object().shape({
            userGroups: Yup.mixed()
              .required(getString('pipeline.approvalStep.validation.userGroups'))
              .test({
                test(value: string | string[]) {
                  if (Array.isArray(value) && isEmpty(compact(value))) {
                    return this.createError({
                      message: getString('pipeline.approvalStep.validation.userGroups')
                    })
                  }

                  return true
                }
              }),
            minimumCount: Yup.string()
              .required(getString('pipeline.approvalStep.validation.minimumCountRequired'))
              .test({
                test(value: string) {
                  if (getMultiTypeFromValue(value) === MultiTypeInputType.FIXED && !value.match(regexPositiveNumbers)) {
                    if (value !== '0' && value.includes('.'))
                      return this.createError({
                        message: getString('pipeline.approvalStep.validation.minimumCountDecimal')
                      })
                    else
                      return this.createError({
                        message: getString('pipeline.approvalStep.validation.minimumCountOne')
                      })
                  }

                  return true
                }
              })
          }),
          autoApproval: Yup.object().shape({
            action: Yup.string().nullable(),
            scheduledDeadline: Yup.object().when('action', {
              is: val => val === ApproveAction.Approve,
              then: Yup.object({
                time: Yup.string()
                  .required(getString('common.validation.fieldIsRequired', { name: 'Time' }))
                  .test({
                    test(val: string): boolean | Yup.ValidationError {
                      const currentTimezone = get(
                        formikRef,
                        'current.values.spec.autoApproval.scheduledDeadline.timeZone'
                      ) as string
                      if (currentTimezone && isValueFixed(currentTimezone)) {
                        return getIsAutoApprovalMinimumTimeValidationApplicable(val, currentTimezone)
                          ? this.createError({
                              message: getString('pipeline.approvalStep.validation.autoApproveScheduleCurrentTime')
                            })
                          : true
                      }
                      return true
                    }
                  }),
                timeZone: Yup.string().required(
                  getString('common.validation.fieldIsRequired', { name: getString('common.timezone') })
                )
              })
            })
          })
        })
      })}
    >
      {(formik: FormikProps<HarnessApprovalData>) => {
        /*
        this is required - so that validatios work while switching basic to advanced forms.
        i.e. if the current form is invalid, we should not allow the switch to advanced tab
        */
        setFormikRef(formikRef, formik)
        return (
          <FormikForm>
            <FormContent
              formik={formik}
              stepViewType={stepViewType}
              allowableTypes={allowableTypes}
              isNewStep={isNewStep}
              readonly={readonly}
            />
          </FormikForm>
        )
      }}
    </Formik>
  )
}

const HarnessApprovalStepModeWithRef = React.forwardRef(HarnessApprovalStepMode)
export default HarnessApprovalStepModeWithRef
