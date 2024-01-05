/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Button, FormInput, Layout, TextInput, Text, Icon, Container } from '@harness/uicore'
import { Formik } from 'formik'
import cx from 'classnames'
import { Color } from '@harness/design-system'
import { Link } from 'react-router-dom'
import { isEmpty } from 'lodash-es'
import {
  useAddHarnessApprovalActivity,
  ApprovalInstanceResponse,
  HarnessApprovalActivityRequest,
  HarnessApprovalInstanceDetails,
  ResponseHarnessApprovalInstanceAuthorization,
  ApprovalUserGroupDTO,
  ExecutionGraph,
  ScheduledDeadlineDTO,
  AutoApprovalDTO
} from 'services/pipeline-ng'
import { String, useStrings } from 'framework/strings'
import { Duration } from '@common/exports'
import { isApprovalWaiting } from '@pipeline/utils/approvalUtils'
import { StepDetails } from '@pipeline/components/execution/StepDetails/common/StepDetails/StepDetails'
import routes from '@common/RouteDefinitions'
import { getPrincipalScopeFromDTO } from '@common/components/EntityReference/EntityReference'
import { LinkifyText } from '@modules/10-common/components/LinkifyText/LinkifyText'
import { HarnessApprover } from './HarnessApprover/HarnessApprover'
import css from './HarnessApprovalTab.module.scss'

export type ApprovalData =
  | (ApprovalInstanceResponse & {
      details: HarnessApprovalInstanceDetails
    })
  | null

export interface HarnessApprovalTabProps {
  approvalInstanceId: string
  approvalData: ApprovalData
  isWaiting: boolean
  updateState(data: ApprovalData): void
  authData: ResponseHarnessApprovalInstanceAuthorization | null
  stepParameters?: { [key: string]: { [key: string]: any } }
  showBannerInfo?: boolean
  showInputsHeader?: boolean
  approvalBoxClassName?: string
  startTs?: number
  endTs?: number
  executionMetadata: ExecutionGraph['executionMetadata']
}

export function HarnessApprovalTab(props: HarnessApprovalTabProps): React.ReactElement {
  const {
    approvalData,
    approvalInstanceId,
    isWaiting,
    updateState,
    startTs,
    endTs,
    authData,
    showBannerInfo = true,
    showInputsHeader = true,
    approvalBoxClassName = '',
    executionMetadata
  } = props
  const { mutate: submitApproval, loading: submitting } = useAddHarnessApprovalActivity({
    approvalInstanceId,
    queryParams: { accountIdentifier: executionMetadata?.accountId }
  })
  const action = React.useRef<HarnessApprovalActivityRequest['action']>('APPROVE')
  const isCurrentUserAuthorized = !!authData?.data?.authorized
  const currentUserUnAuthorizedReason = authData?.data?.reason
  const isWaitingAll = isWaiting && approvalData && isApprovalWaiting(approvalData.status)
  async function handleSubmit(data: HarnessApprovalActivityRequest): Promise<void> {
    const newState = await submitApproval({ ...data, action: action.current })
    updateState(newState?.data as ApprovalData)
  }
  const autoApprovalParams = (approvalData?.details?.autoApprovalParams || {}) as AutoApprovalDTO
  const { time, timeZone } = (autoApprovalParams.scheduledDeadline || {}) as ScheduledDeadlineDTO
  const isAutoApprovalScheduled = !isEmpty(autoApprovalParams)

  const generateUserGroupsLinkElements = React.useCallback((): JSX.Element[] => {
    const userGroups: JSX.Element[] = []
    approvalData?.details?.approvers?.userGroups?.forEach(userGroup => {
      const userGroupDetails = approvalData?.details?.validatedApprovalUserGroups?.find(
        (userGroupObject: { identifier: string }) => {
          const userGroupIdentifier = userGroup.indexOf('.') < 0 ? userGroup : userGroup.split('.')[1]
          return userGroupObject.identifier === userGroupIdentifier
        }
      )
      userGroupDetails &&
        userGroups.push(
          <Link
            to={{
              pathname: routes.toUserGroupDetails({
                accountId: userGroupDetails?.accountIdentifier as string,
                orgIdentifier: userGroupDetails?.orgIdentifier,
                projectIdentifier: userGroupDetails?.projectIdentifier,
                userGroupIdentifier: userGroupDetails?.identifier,
                module: 'cd'
              }),
              search: `?parentScope=${getPrincipalScopeFromDTO(userGroupDetails as ApprovalUserGroupDTO)}`
            }}
          >
            {userGroupDetails?.name}
          </Link>
        )
    })
    return userGroups
  }, [approvalData])

  const { getString } = useStrings()

  const labelsListToDisplay = React.useMemo(() => {
    const labelsListDefault = [
      { label: getString('common.userGroups'), value: generateUserGroupsLinkElements() },
      {
        label: getString('pipeline.approvalStep.autoApprovalScheduled'),
        value: isAutoApprovalScheduled ? getString('yes') : getString('no')
      }
    ]

    return isAutoApprovalScheduled && timeZone && time
      ? [
          ...labelsListDefault,
          { label: getString('common.timezone'), value: timeZone },
          { label: getString('timeLabel'), value: time }
        ]
      : labelsListDefault
  }, [getString, generateUserGroupsLinkElements, isAutoApprovalScheduled, time, timeZone])

  return (
    <React.Fragment>
      {showBannerInfo ? (
        <React.Fragment>
          {isWaiting && (
            <div className={css.info} data-type="harness">
              <div className={css.infoHeader}>
                <String
                  tagName="div"
                  className={css.statusMsg}
                  stringID="pipeline.approvalStep.execution.statusMsg"
                  vars={{
                    count: approvalData?.details?.approvalActivities?.length || 0,
                    total: approvalData?.details?.approvers?.minimumCount || 1
                  }}
                />
                <div className={css.timer}>
                  <Duration
                    className={css.duration}
                    durationText=""
                    icon="hourglass"
                    startTime={approvalData?.deadline}
                    iconProps={{ size: 12 }}
                  />
                  <String stringID="pipeline.timeRemainingSuffix" />
                </div>
              </div>
              <Layout.Horizontal spacing="small" flex={{ alignItems: 'flex-start' }}>
                <Icon name="code-info" />
                <Container>
                  <LinkifyText
                    content={approvalData?.details?.approvalMessage}
                    textProps={{
                      style: { wordBreak: 'break-word', whiteSpace: 'pre-wrap' },
                      intent: 'none',
                      font: { align: 'left' },
                      color: Color.GREY_700
                    }}
                    linkStyles={css.link}
                  />
                </Container>
              </Layout.Horizontal>
            </div>
          )}
          <StepDetails
            step={{
              startTs: startTs,
              endTs: endTs,
              stepParameters: props.stepParameters
            }}
            executionMetadata={executionMetadata}
            labels={labelsListToDisplay}
          />
        </React.Fragment>
      ) : null}
      <div className={cx(css.harnessApproval, approvalBoxClassName, { [css.completed]: !isWaitingAll })}>
        {Array.isArray(approvalData?.details?.approvalActivities) &&
        (approvalData?.details?.approvalActivities?.length || 0) > 0 ? (
          <React.Fragment>
            <String
              className={css.approversHeading}
              tagName="div"
              stringID="pipeline.approvalStep.approversWithColon"
            />
            {(approvalData?.details?.approvalActivities || []).map((row, i) => (
              <HarnessApprover key={i} approvalActivity={row} />
            ))}
          </React.Fragment>
        ) : null}
        {isWaitingAll && isCurrentUserAuthorized ? (
          <Formik<HarnessApprovalActivityRequest>
            initialValues={{
              approverInputs: (approvalData?.details?.approverInputs || []).map(({ name, defaultValue }) => ({
                name,
                value: defaultValue || ''
              })),
              comments: '',
              action: 'APPROVE'
            }}
            enableReinitialize
            onSubmit={handleSubmit}
          >
            {({ values, submitForm }) => {
              function handleApproveClick(): void {
                action.current = 'APPROVE'
                submitForm()
              }

              function handleRejectClick(): void {
                action.current = 'REJECT'
                submitForm()
              }

              return (
                <div className={css.inputs}>
                  {Array.isArray(values.approverInputs) && values.approverInputs.length > 0 ? (
                    <React.Fragment>
                      {showInputsHeader ? (
                        <String
                          tagName="div"
                          className={css.heading}
                          stringID="pipeline.approvalStep.execution.inputsTitle"
                        />
                      ) : null}
                      <div className={cx(css.formRow, css.labels)}>
                        <String stringID="variableNameLabel" />
                        <String stringID="common.configureOptions.defaultValue" />
                      </div>
                      {values.approverInputs?.map((row, i) => (
                        <div className={css.formRow} key={i}>
                          <TextInput name={`approverInputs[${i}].name`} value={row.name} disabled />
                          <FormInput.Text name={`approverInputs[${i}].value`} disabled={submitting} />
                        </div>
                      ))}
                    </React.Fragment>
                  ) : null}
                  <FormInput.TextArea label="Comments" name="comments" disabled={submitting} className={css.heading} />
                  <div className={css.actions}>
                    <Button icon="tick" intent="primary" onClick={handleApproveClick} disabled={submitting}>
                      <String stringID="common.approve" />
                    </Button>
                    <Button icon="cross" onClick={handleRejectClick} disabled={submitting}>
                      <String stringID="common.reject" />
                    </Button>
                  </div>
                </div>
              )
            }}
          </Formik>
        ) : null}
        {isWaitingAll && !isCurrentUserAuthorized ? (
          <Layout.Vertical padding={{ top: 'medium', bottom: 'medium', left: 'large', right: 'large' }}>
            <Text color={Color.ORANGE_700} font={{ align: 'center' }}>
              {currentUserUnAuthorizedReason
                ? currentUserUnAuthorizedReason
                : approvalData?.details?.approvers?.disallowPipelineExecutor
                ? getString('pipeline.approvalStep.disallowedApproverExecution')
                : getString('pipeline.approvalStep.notAuthorizedExecution')}
            </Text>
          </Layout.Vertical>
        ) : null}
      </div>
    </React.Fragment>
  )
}
