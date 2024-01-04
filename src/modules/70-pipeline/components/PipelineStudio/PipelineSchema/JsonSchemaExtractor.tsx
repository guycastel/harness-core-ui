/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import produce from 'immer'
import { cloneDeep, get, merge, omit } from 'lodash-es'
import { UIInputDependency } from '@modules/70-pipeline/y1/components/InputsForm/types'
import { JsonNode } from 'services/pipeline-ng'
import { generateReadableLabel } from '@modules/70-pipeline/y1/components/InputFactory/Inputs/utils'

export function resolveAndMergeSchema(schema = {}, dotPath?: string, isStepGroup = false): JsonNode {
  const currentSchema = dotPath ? get(schema, dotPath as string) : schema

  // Recursively resolve any $ref references
  function resolveReferences(obj: JsonNode): JsonNode {
    if (typeof obj === 'object' && obj !== null) {
      if ('allOf' in obj) {
        // Merge allOf properties
        const allOfSchemas = obj.allOf
        allOfSchemas.forEach((allOfSchema: JsonNode) => {
          merge(obj, resolveReferences(allOfSchema))
        })
        delete obj.allOf
      }

      if ('$ref' in obj) {
        // Extract the reference path after #
        const refPath = obj.$ref.split('#/')[1]
        const dotNotationRefPath = refPath.replace(/\//g, '.') // Replace all slashes with dots
        const referencedSchema = resolveAndMergeSchema(schema, dotNotationRefPath)
        return referencedSchema
      } else {
        for (const key in obj) {
          // For stepGroup schema - steps key in the schema is not a property
          if (isStepGroup && key === 'steps') continue
          obj[key] = resolveReferences(obj[key])
        }
      }
    }
    return obj
  }

  if (currentSchema !== undefined) {
    // Clone the current schema to avoid modifying the original
    const resolvedSchema = cloneDeep(currentSchema)

    // Resolve any $ref references in the schema
    let mergedSchema = resolveReferences(resolvedSchema)

    // Merge spec StepInfo properties
    mergedSchema = produce(mergedSchema, draft => {
      if (draft.if && draft.then) {
        // Merge "then" properties into "properties"
        Object.assign(draft.properties, draft.then.properties)
        // Delete "if" and "then" properties
        delete draft.if
        delete draft.then
      }
    })

    return mergedSchema
  } else {
    throw new Error(`Invalid path: ${dotPath}`)
  }
}

const keysToBeOmitted = ['discriminator', 'description', 'metadata', '$schema', 'desc']

const getDependencyArray = (dependencies: string[], newSchema: JsonNode): UIInputDependency[] => {
  const result = [] as UIInputDependency[]

  dependencies.forEach(fieldName => {
    for (const key in newSchema) {
      if (newSchema?.[key]?.entityName === fieldName) {
        result.push({
          field_name: fieldName,
          input_name: key,
          isFixedValue: false
        })
        break // Assuming entityName is unique, breaking loop once a match is found
      }
    }
  })

  return result
}

export function removeInternalTypePropertiesWithModifications(
  schema: JsonNode,
  path = '',
  schemaObject?: JsonNode
): JsonNode {
  const newSchema: JsonNode = schemaObject ?? {
    properties: {}
  }

  for (const propertyName in schema.properties) {
    const propertySchema = schema.properties[propertyName]
    const currentPath = path ? `${path}.${propertyName}` : propertyName

    if (!keysToBeOmitted.includes(propertyName)) {
      if (propertySchema.metadata && propertySchema.metadata.inputProperties) {
        const internal_type = propertySchema.metadata.inputProperties.internalType

        if (internal_type) {
          newSchema.properties[currentPath] = {
            ...propertySchema,
            internal_type,
            entityName: propertyName,
            label: generateReadableLabel(propertyName),
            mandatory: schema.required?.includes(propertyName) ?? false,
            path: currentPath,
            dependencies: getDependencyArray(
              propertySchema.metadata.inputProperties?.dependsOn || [],
              newSchema?.properties
            )
          }
        } else {
          const flattenedProperties = removeInternalTypePropertiesWithModifications(propertySchema)

          for (const flattenedPropertyName in flattenedProperties.properties) {
            const flattenedPropertySchema = flattenedProperties.properties[flattenedPropertyName]

            const flattenedPath = `${currentPath}.${flattenedPropertyName}`

            newSchema.properties[flattenedPath] = flattenedPropertySchema
          }
        }
      } else if (propertySchema.oneOf) {
        const oneOfObjectWithInternalType = propertySchema.oneOf?.find(
          (oneOfSchema: JsonNode) => oneOfSchema.metadata?.inputProperties?.internalType
        )

        if (oneOfObjectWithInternalType) {
          const schemaObjectBasedOnType =
            oneOfObjectWithInternalType.type === 'array'
              ? oneOfObjectWithInternalType.items
              : oneOfObjectWithInternalType
          // Merge oneOf schema with internal type details
          newSchema.properties[propertyName] = {
            internal_type: schemaObjectBasedOnType?.metadata?.inputProperties?.internalType,
            entityName: propertyName,
            label: generateReadableLabel(propertyName),
            mandatory: schema.required?.includes(propertyName) ?? false,
            path: currentPath,
            dependencies: getDependencyArray(
              propertySchema.metadata?.inputProperties?.dependsOn || [],
              newSchema.properties
            ),
            ...(oneOfObjectWithInternalType?.items || oneOfObjectWithInternalType)
          }
        } else {
          const flattenedProperties = propertySchema.oneOf.map((oneOfSchema: JsonNode) =>
            removeInternalTypePropertiesWithModifications(oneOfSchema, currentPath)
          )

          let isNestedPropertyAdded = false
          for (const flattenedPropertyName in flattenedProperties[0].properties) {
            const flattenedPropertySchema = flattenedProperties[0].properties[flattenedPropertyName]

            const flattenedPath = `${currentPath}.${flattenedPropertyName}`

            newSchema.properties[flattenedPath] = flattenedPropertySchema
            isNestedPropertyAdded = true
          }
          // If nested properties is not added, then add primitive type
          if (!isNestedPropertyAdded) {
            newSchema.properties[currentPath] = {
              ...propertySchema.oneOf?.[0],
              entityName: propertyName,
              label: generateReadableLabel(propertyName),
              mandatory: schema?.required?.includes(propertyName) ?? false,
              path: currentPath,
              dependencies: getDependencyArray(
                propertySchema?.metadata?.inputProperties?.dependsOn || [],
                newSchema?.properties
              )
            }
          }
        }
      } else {
        const internal_type = propertySchema.metadata?.inputProperties.internalType
        // Recursively call the function for nested properties
        if (typeof propertySchema === 'object' && !Array.isArray(propertySchema) && propertySchema?.properties) {
          const nestedSchema = removeInternalTypePropertiesWithModifications(propertySchema, currentPath)
          merge(newSchema, nestedSchema)
        } else if (propertyName === 'type' && propertySchema?.enum) {
          newSchema.properties[currentPath] = omit(
            {
              ...propertySchema,
              path: currentPath,
              type: propertySchema.enum,
              internal_type,
              entityName: propertyName,
              label: generateReadableLabel(propertyName),
              mandatory: schema.required?.includes(propertyName) ?? false,
              dependencies: getDependencyArray(
                propertySchema?.metadata?.inputProperties?.dependsOn || [],
                newSchema?.properties
              )
            },
            keysToBeOmitted
          )
        } else {
          newSchema.properties[currentPath] = omit(
            {
              ...propertySchema,
              path: currentPath,
              internal_type,
              entityName: propertyName,
              label: generateReadableLabel(propertyName),
              mandatory: schema.required?.includes(propertyName) ?? false,
              dependencies: getDependencyArray(
                propertySchema?.metadata?.inputProperties?.dependsOn || [],
                newSchema?.properties
              )
            },
            keysToBeOmitted
          )
        }
      }
    }
  }

  return newSchema
}

export const getStepPropertiesFromSchema = (schema: JsonNode, isStepGroup = false): JsonNode => {
  const extractedSchema = resolveAndMergeSchema(schema, undefined, isStepGroup)
  return removeInternalTypePropertiesWithModifications(extractedSchema)
}
