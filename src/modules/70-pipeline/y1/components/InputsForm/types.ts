/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Validation } from '@common/components/ConfigureOptions/ConfigureOptionsUtils'

export interface UIInputs {
  hasInputs: boolean
  inputs: UIRuntimeInput[]
}

export interface RuntimeInput {
  type: string
  desc?: string
  required?: boolean
  default?: unknown
  validator?: {
    allowed?: string[] | number[] | boolean[]
    regex?: string
  }
}

export interface UIRuntimeInput extends RuntimeInput {
  name: string
  dependencies: UIInputDependency[]
  metadata: UIInputMetadata
  allMetadata: UIInputMetadata[]
  hasMultiUsage: boolean
  label?: string
  internal_type?: string
}

export interface UIInputMetadata {
  type: InputFieldType
  internal_type: InputInternalType
}

export type InputInternalType = string // TODO
export type InputFieldType = 'string' | 'number' | string // TODO

export interface UIInputDependency {
  field_name?: string
  input_name?: string
  field_input_type?: InputFieldType
  isFixedValue: boolean
  field_value?: unknown
}

/* props type for inputs components */
export interface InputComponentProps {
  name: string
}

/* interface for formik extra fields */
export interface RuntimeInputField extends UIRuntimeInput {
  id: string
  selected: boolean
  validator?: UIRuntimeInput['validator'] & {
    validation?: Validation
  }
}

export interface UIInputReferences {
  [variableName: string]: string[]
}

// TODO: temporary interface for inputs in the pipeline
export type PipelineInputs = {
  [key: string]: RuntimeInput
}

export enum RuntimeInputType {
  string = 'string',
  number = 'number',
  boolean = 'boolean',
  object = 'object',
  secret = 'secret',
  array = 'array'
}
