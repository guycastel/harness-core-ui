/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { ObjectSchema, string, TestContext, ValidationError } from 'yup'
import { isEmpty } from 'lodash-es'
import { illegalIdentifiers, regexIdentifier } from '@common/utils/StringUtils'
import { CronFormat, isCronValid } from '@common/components/SchedulePanel/components/utils'
import type { StringKeys, UseStringsReturn } from 'framework/strings'
import type { PipelineInfoConfig } from 'services/pipeline-ng'
import type { PanelInterface } from '@triggers/components/TabWizard/TabWizard'
import { NameIdentifierSchema } from '@common/utils/Validation'
import type { ScheduleType, TriggerBaseType, TriggerType } from '../TriggerInterface'

export interface ScheduledInitialValuesInterface {
  triggerType: TriggerBaseType
  scheduleType: ScheduleType
}

export interface FlatInitialValuesInterface {
  triggerType: TriggerType
  identifier?: string
  tags?: {
    [key: string]: string
  }
  pipeline?: string | PipelineInfoConfig
  originalPipeline?: PipelineInfoConfig
  resolvedPipeline?: PipelineInfoConfig
  inputSetTemplateYamlObj?: {
    pipeline: PipelineInfoConfig | Record<string, never>
  }
  name?: string
  selectedScheduleTab?: string
  pipelineBranchName?: string
  inputSetRefs?: string[]
  cronFormat?: CronFormat
  stagesToExecute?: string[]
}

export interface FlatOnEditValuesInterface {
  name?: string
  identifier?: string
  // targetIdentifier: string
  description?: string
  tags?: {
    [key: string]: string
  }
  pipeline?: PipelineInfoConfig
  pipelineOverride?: PipelineInfoConfig
  triggerType: TriggerType
  manifestType?: string
  artifactType?: string
  originalPipeline?: PipelineInfoConfig
  resolvedPipeline?: PipelineInfoConfig
  selectedScheduleTab?: string
  minutes?: string
  expression?: string
  stageId?: string
  inputSetTemplateYamlObj?: {
    pipeline: PipelineInfoConfig | Record<string, never>
  }
  versionValue?: string
  versionOperator?: string
  buildValue?: string
  buildOperator?: string
  pipelineBranchName?: string
  inputSetRefs?: string[]
  cronFormat?: CronFormat
  stagesToExecute?: string[]
}

export interface FlatValidScheduleFormikValuesInterface {
  name: string
  identifier: string
  description?: string
  tags?: {
    [key: string]: string
  }
  target?: string
  targetIdentifier?: string
  pipeline: PipelineInfoConfig
  pipelineOverride?: PipelineInfoConfig
  resolvedPipeline?: PipelineInfoConfig
  sourceRepo: string
  triggerType: TriggerType
  expression: string
  pipelineBranchName?: string
  inputSetRefs?: string[]
  stagesToExecute?: string[]
  cronFormat: CronFormat
}

const isIdentifierIllegal = (identifier: string): boolean =>
  regexIdentifier.test(identifier) && illegalIdentifiers.includes(identifier)

const checkValidOverview = ({ formikValues }: { formikValues: { [key: string]: any } }): boolean =>
  isIdentifierIllegal(formikValues?.identifier) ? false : true

const checkValidCronExpression = ({ formikValues }: { formikValues: { [key: string]: any } }): boolean =>
  isCronValid(formikValues?.expression || '', formikValues?.cronFormat === CronFormat.QUARTZ)

const checkValidPipelineInput = ({ formikErrors }: { formikErrors: { [key: string]: any } }): boolean => {
  if (!isEmpty(formikErrors?.pipeline) || !isEmpty(formikErrors?.stages)) {
    return false
  }
  return true
}

export const getPanels = (getString: UseStringsReturn['getString']): PanelInterface[] | [] => {
  return [
    {
      id: 'Trigger Overview',
      tabTitle: getString('overview'),
      checkValidPanel: checkValidOverview,
      requiredFields: ['name', 'identifier'] // conditional required validations checkValidTriggerConfiguration
    },
    {
      id: 'Schedule',
      tabTitle: getString('common.schedule'),
      checkValidPanel: checkValidCronExpression,
      requiredFields: ['expression']
    },
    {
      id: 'Pipeline Input',
      tabTitle: getString('triggers.pipelineInputLabel'),
      checkValidPanel: checkValidPipelineInput
    }
  ]
}
function getCronExpressionValidationError(
  this: TestContext,
  isValidCron: boolean,
  getString: UseStringsReturn['getString']
): boolean | ValidationError {
  if (isValidCron) {
    return true
  } else {
    return this.createError({
      message: getString('triggers.validation.cronExpression')
    })
  }
}

export const getValidationSchema = (
  getString: (key: StringKeys, params?: any) => string
): ObjectSchema<Record<string, any> | undefined> => {
  return NameIdentifierSchema(getString, {
    nameRequiredErrorMsg: getString('triggers.validation.triggerName')
  }).shape({
    expression: string().when('cronFormat', {
      is: val => val === CronFormat.QUARTZ,
      then: string().test({
        test(val: string): boolean | ValidationError {
          const isValidCron = isCronValid(val || '', true)
          return getCronExpressionValidationError.call(this, isValidCron, getString)
        }
      }),
      otherwise: string().test({
        test(val: string): boolean | ValidationError {
          const isValidCron = isCronValid(val || '', false)
          return getCronExpressionValidationError.call(this, isValidCron, getString)
        }
      })
    })
  })
}
