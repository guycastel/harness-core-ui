/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import * as Yup from 'yup'
import { isEmpty } from 'lodash-es'
import type { SelectOption } from '@harness/uicore'
import type { UseStringsReturn } from 'framework/strings'
import type { ShellScriptStepInfo, StepElementConfig } from 'services/pipeline-ng'
import { StepType } from '@modules/70-pipeline/components/PipelineSteps/PipelineStepInterface'
import { isValueExpression, isValueRuntimeInput } from '@modules/10-common/utils/utils'

export const scriptInputType: SelectOption[] = [
  { label: 'String', value: 'String' },
  { label: 'Number', value: 'Number' }
]

export const shellScriptInputType: SelectOption[] = [
  { label: 'String', value: 'String' },
  { label: 'Number', value: 'Number' },
  { label: 'Secret', value: 'Secret' }
]

export const variableSchema = (
  getString: UseStringsReturn['getString'],
  type?: string
): Yup.NotRequiredArraySchema<
  | {
      name: string
      value?: string
      type: string
    }
  | undefined
> =>
  Yup.array().of(
    Yup.object({
      name: Yup.string().required(getString('common.validation.nameIsRequired')),
      value: Yup.string()
        .when('type', {
          is: val => val === 'Secret' && type === StepType.SHELLSCRIPT,
          then: Yup.string().trim().required(getString('common.validation.valueIsRequired'))
        })
        .when('type', {
          is: typeVal => typeVal === 'Number' && type === StepType.SHELLSCRIPT,
          then: Yup.string()
            .trim()
            .test('validate-for-number', getString('common.validation.valueMustBeANumber'), val => {
              if (isEmpty(val)) return true
              if (isValueRuntimeInput(val)) return true
              if (isValueExpression(val)) return true
              if (isNaN(val)) return false
              return true
            })
        }),
      type: Yup.string().trim().required(getString('common.validation.typeIsRequired'))
    })
  )

export const scriptOutputType: SelectOption[] = [
  { label: 'String', value: 'String' },
  { label: 'Secret', value: 'Secret' }
]

export interface ScriptStepVariable<T = 'String' | 'Number'> {
  value: number | string
  id: string
  name?: string
  type?: T
}

export type ScriptOutputStepVariable = ScriptStepVariable<'String'>

export type ShellScriptStepVariable = ScriptStepVariable<'String' | 'Number' | 'Secret'>

export type ShellScriptOutputStepVariable = ScriptStepVariable<'String' | 'Secret'>

interface ShellScriptSource {
  type?: string
  spec?: ShellScriptInline
}
export interface ShellScriptInline {
  script?: string
  file?: string
}
export interface ShellScriptData extends StepElementConfig {
  spec: Omit<ShellScriptStepInfo, 'environmentVariables' | 'outputVariables' | 'source'> & {
    environmentVariables?: Array<Omit<ShellScriptStepVariable, 'id'>>
    outputVariables?: Array<Omit<ShellScriptOutputStepVariable, 'id'>>
    source?: ShellScriptSource
  }
}

export interface ShellScriptFormData extends StepElementConfig {
  spec: Omit<ShellScriptStepInfo, 'environmentVariables' | 'outputVariables' | 'source'> & {
    environmentVariables?: Array<ShellScriptStepVariable>
    outputVariables?: Array<ShellScriptOutputStepVariable>
    source?: ShellScriptSource
  }
}
