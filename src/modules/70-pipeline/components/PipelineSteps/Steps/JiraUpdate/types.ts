/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Free Trial 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/05/PolyForm-Free-Trial-1.0.0.txt.
 */

import type { FormikProps } from 'formik'
import type { GetDataError } from 'restful-react'
import type { AllowedTypes, SelectOption, MultiSelectOption } from '@harness/uicore'
import type { InputSetData, StepViewType } from '@pipeline/components/AbstractSteps/Step'
import type {
  Failure,
  ResponseJiraIssueCreateMetadataNG,
  ResponseJiraIssueUpdateMetadataNG,
  ResponseListJiraIssueTransitionNG,
  ResponseListJiraStatusNG,
  StepElementConfig,
  UseGetJiraIssueCreateMetadataProps,
  UseGetIssueTransitionsProps,
  UseGetJiraIssueUpdateMetadataProps,
  UseGetJiraStatusesProps
} from 'services/cd-ng'
import type { VariableMergeServiceResponse } from 'services/pipeline-ng'
import type { JiraFieldNGWithValue } from '../JiraCreate/types'
import { JiraProjectSelectOption } from '../JiraApproval/types'

export interface JiraUpdateFieldType {
  name: string
  value: string | number | SelectOption | MultiSelectOption[]
}

export interface JiraUpdateData extends StepElementConfig {
  spec: {
    connectorRef: string | SelectOption
    projectKey?: string | JiraProjectSelectOption
    issueType?: string | JiraProjectSelectOption
    issueKey: string
    transitionTo?: {
      status: string | SelectOption
      transitionName: string
    }
    fields: JiraUpdateFieldType[]
    selectedOptionalFields?: JiraFieldNGWithValue[]
    delegateSelectors?: string[]
  }
}

export interface JiraUpdateVariableListModeProps {
  variablesData: JiraUpdateData
  metadataMap: Required<VariableMergeServiceResponse>['metadataMap']
}

export interface JiraUpdateStepModeProps {
  stepViewType: StepViewType
  initialValues: JiraUpdateData
  onUpdate?: (data: JiraUpdateData) => void
  onChange?: (data: JiraUpdateData) => void
  allowableTypes: AllowedTypes
  isNewStep?: boolean
  readonly?: boolean
}

export interface JiraUpdateFormContentInterface {
  formik: FormikProps<JiraUpdateData>
  stepViewType: StepViewType
  allowableTypes: AllowedTypes
  refetchStatuses: (props: UseGetJiraStatusesProps) => Promise<void>
  fetchingStatuses: boolean
  statusResponse: ResponseListJiraStatusNG | null
  statusFetchError?: GetDataError<Failure | Error> | null
  isNewStep?: boolean
  readonly?: boolean
  issueUpdateMetadataResponse?: ResponseJiraIssueUpdateMetadataNG | null
  refetchIssueUpdateMetadata: (props: UseGetJiraIssueUpdateMetadataProps) => Promise<void>
  refetchIssueTransitions: (props: UseGetIssueTransitionsProps) => Promise<void>
  issueTransitionsResponse: ResponseListJiraIssueTransitionNG | null
  refetchProjectMetadata: (props: UseGetJiraIssueCreateMetadataProps) => Promise<void>
  refetchIssueMetadata: (props: UseGetJiraIssueCreateMetadataProps) => Promise<void>
  projectMetaResponse: ResponseJiraIssueCreateMetadataNG | null
  projectMetadataFetchError?: GetDataError<Failure | Error> | null
  issueMetadataFetchError?: GetDataError<Failure | Error> | null
  issueMetaResponse: ResponseJiraIssueCreateMetadataNG | null
  fetchingProjectMetadata: boolean
  issueUpdateMetadataFetchError?: GetDataError<Failure | Error> | null
  issueTransitionsFetchError?: GetDataError<Failure | Error> | null
  issueUpdateMetadataLoading?: boolean
  fetchingIssueMetadata: boolean
  issueTransitionsLoading?: boolean
}

export interface JiraUpdateDeploymentModeProps {
  stepViewType: StepViewType
  initialValues: JiraUpdateData
  onUpdate?: (data: JiraUpdateData) => void
  inputSetData?: InputSetData<JiraUpdateData>
  allowableTypes: AllowedTypes
  formik?: any
}

export interface JiraUpdateDeploymentModeFormContentInterface extends JiraUpdateDeploymentModeProps {
  refetchStatuses: (props: UseGetJiraStatusesProps) => Promise<void>
  fetchingStatuses: boolean
  statusResponse: ResponseListJiraStatusNG | null
  statusFetchError?: GetDataError<Failure | Error> | null
  isNewStep?: boolean
  refetchIssueUpdateMetadata: (props: UseGetJiraIssueUpdateMetadataProps) => Promise<void>
  issueUpdateMetadataLoading: boolean
  issueUpdateMetadataFetchError?: GetDataError<Failure | Error> | null
  issueUpdateMetadataResponse: ResponseJiraIssueUpdateMetadataNG | null
  refetchIssueTransitions: (props: UseGetIssueTransitionsProps) => Promise<void>
  issueTransitionsResponse: ResponseListJiraIssueTransitionNG | null
  issueTransitionsLoading?: boolean
  issueTransitionsFetchError?: GetDataError<Failure | Error> | null
}
