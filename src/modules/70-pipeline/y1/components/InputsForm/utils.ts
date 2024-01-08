/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import {
  InputDetailsPerFieldDto,
  PipelineInputSchemaDetailsResponseBody,
  YamlInputDependencyDetailsDto
} from '@harnessio/react-pipeline-service-client'
import { isEmpty, isObject, isString, isUndefined, omitBy } from 'lodash-es'
import { JsonNode } from 'services/cd-ng'
import { Validation } from '@common/components/ConfigureOptions/ConfigureOptionsUtils'
import {
  RuntimeInputField,
  PipelineInputs,
  UIRuntimeInput,
  UIInputDependency,
  UIInputMetadata,
  UIInputReferences,
  UIInputs,
  RuntimeInput
} from './types'

const defaultInputMetadata: UIInputMetadata = { type: 'string', internal_type: 'string' }
const multiFieldPropertyDefaultInputMetadata: UIInputMetadata = { type: 'string', internal_type: 'text_area' }

export function generateInputsFromMetadataResponse(
  data: PipelineInputSchemaDetailsResponseBody | undefined,
  options?: { readonly?: boolean }
): UIInputs {
  const runtimeInputs = data?.inputs
  if (!runtimeInputs || runtimeInputs.length === 0) {
    return { inputs: [], hasInputs: false }
  }

  const inputs = runtimeInputs.map((runtimeInput): UIRuntimeInput => {
    const metadataData = processMetadata(
      runtimeInput.metadata?.field_properties ?? [],
      (runtimeInput.details?.type as string) ?? defaultInputMetadata.type
    )
    return {
      name: runtimeInput.details?.name ?? '',
      desc: runtimeInput.details?.desc,
      default: runtimeInput.details?.default,
      type: (runtimeInput.details?.type as string) ?? defaultInputMetadata.type,
      required: runtimeInput.details?.required,
      dependencies: processDependencies(runtimeInput.metadata?.dependencies),
      metadata: metadataData.metadata,
      allMetadata: metadataData.allMetadata,
      hasMultiUsage: metadataData.hasMultiUsage,
      readonly: options?.readonly
    }
  })

  return { inputs, hasInputs: true }
}

function processMetadata(
  fieldProperties: InputDetailsPerFieldDto[],
  defaultType: string
): {
  allMetadata: UIInputMetadata[]
  metadata: UIInputMetadata
  hasMultiUsage: boolean
} {
  const allMetadata = fieldProperties.map((fieldProperty): UIInputMetadata => {
    return {
      type: fieldProperty.input_type ?? defaultType,
      internal_type: fieldProperty.internal_type ?? defaultType
    }
  })

  const metadata: UIInputMetadata =
    allMetadata.length === 1 ? allMetadata[0] : { ...multiFieldPropertyDefaultInputMetadata }

  return { metadata, allMetadata, hasMultiUsage: allMetadata.length > 1 }
}

function processDependencies(inputDetails: YamlInputDependencyDetailsDto | undefined): UIInputDependency[] {
  const uiInputDependenciesRI: UIInputDependency[] =
    inputDetails?.required_runtime_inputs?.map((required_runtime_inputs): UIInputDependency => {
      return {
        field_name: required_runtime_inputs.field_name,
        input_name: required_runtime_inputs.input_name ?? '',
        isFixedValue: false
      }
    }) ?? []

  const uiInputDependenciesFixed: UIInputDependency[] =
    inputDetails?.required_fixed_values?.map((required_fixed_values): UIInputDependency => {
      return {
        field_name: required_fixed_values.field_name,
        field_input_type: required_fixed_values.field_input_type ?? '',
        field_value: required_fixed_values.field_value,
        isFixedValue: true
      }
    }) ?? []

  return [...uiInputDependenciesRI, ...uiInputDependenciesFixed]
}

export function getInputDotNotations(obj: JsonNode, path = '', result = {} as UIInputReferences): UIInputReferences {
  if (isString(obj)) {
    const matches = obj.match(/<\+inputs\.(\w+)>/)
    if (matches) {
      const variableName = matches[1]
      ;(result[variableName] || (result[variableName] = [])).push(path)
    }
  } else if (isObject(obj)) {
    for (const key in obj) {
      const newPath = path ? `${path}.${key}` : key
      getInputDotNotations(obj[key], newPath, result)
    }
  }
  return result
}

export function transformDataToUIInput(inputObject?: RuntimeInputField[]): PipelineInputs {
  const uiInput = (inputObject || []).reduce((acc, input) => {
    const { name, type, desc, required, validator, default: defaultValue } = input
    const transformedInput = {
      type,
      desc,
      required,
      default: defaultValue,
      ...(validator?.validation !== Validation.None && {
        validator: {
          ...(!isEmpty(validator?.allowed) && { allowed: validator?.allowed }),
          ...(validator?.regex && { regex: validator?.regex })
        }
      })
    }
    acc[name] = omitBy(transformedInput, isUndefined) as unknown as RuntimeInput
    return acc
  }, {} as PipelineInputs)

  return uiInput
}

export function generateInputsFromPipelineInputs(pipelineInputs: PipelineInputs): UIInputs {
  if (!pipelineInputs) return { inputs: [], hasInputs: false }

  const inputsNames = Object.keys(pipelineInputs)
  const uiInputArr: UIRuntimeInput[] = inputsNames.map(name => {
    const data = pipelineInputs[name]
    return {
      name,
      ...data,
      dependencies: [],
      metadata: { type: data.type, internal_type: data.type },
      allMetadata: [{ type: data.type, internal_type: data.type }],
      hasMultiUsage: false
    }
  })

  return { inputs: uiInputArr, hasInputs: uiInputArr.length > 0 }
}
