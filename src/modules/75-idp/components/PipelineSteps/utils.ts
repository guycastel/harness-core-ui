/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { v4 as nameSpace, v5 as uuid } from 'uuid'
import { get, set } from 'lodash-es'
import { ThumbnailSelectProps } from '@harness/uicore'
import { isRuntimeInput } from '@pipeline/utils/CIUtils'
import { ConnectorReferenceFieldProps } from '@modules/27-platform/connectors/components/ConnectorReferenceField/ConnectorReferenceField'
import { removeEmptyKeys } from '@modules/70-pipeline/components/PipelineSteps/Steps/StepsTransformValuesUtils'

type MapUIType = { id: string; name: string; value: string }[]
type MultiTypeMapUIType = MapUIType | string
type ConnectorRef = ConnectorReferenceFieldProps['selected']
type MultiTypeConnectorRef = ConnectorRef | string
type MapType = { [name: string]: string }

export enum Types {
  Text,
  Map,
  ConnectorRef,
  Boolean,
  Numeric
}

interface Field {
  name: string
  type: Types
}

export function getInitialValuesInCorrectFormat<T, U>(initialValues: T, fields: Field[]): U {
  const values = set(
    set({}, 'strategy', get(initialValues, 'strategy', {})),
    'failureStrategies',
    get(initialValues, 'failureStrategies', {})
  )

  fields.forEach(({ name, type }) => {
    const value = get(initialValues, name)

    if (type === Types.Text || type === Types.ConnectorRef || type === Types.Boolean || type === Types.Numeric) {
      set(values, name, value)
    }

    if (type === Types.Map) {
      const map =
        typeof value === 'string'
          ? value
          : Object.keys(value || {}).map(key => ({
              id: uuid('', nameSpace()),
              name: key,
              value: value[key]
            }))

      set(values, name, map)
    }
  })

  return values as U
}

export function getFormValuesInCorrectFormat<T, U>(
  formValues: T,
  fields: Field[],
  keysWithAllowedEmptyValues?: Array<string>
): U {
  const values = set(
    set({}, 'strategy', get(formValues, 'strategy', {})),
    'failureStrategies',
    get(formValues, 'failureStrategies', {})
  )

  fields.forEach(({ name, type }) => {
    if (type === Types.Text || type === Types.Boolean) {
      const value = get(formValues, name)
      set(values, name, value)
    }

    if (type === Types.Map) {
      const value = get(formValues, name) as MultiTypeMapUIType

      const map: MapType = {}
      if (Array.isArray(value)) {
        value.forEach(mapValue => {
          if (mapValue.name) {
            map[mapValue.name] = mapValue.value
          }
        })
      }

      set(values, name, typeof value === 'string' ? value : map)
    }

    if (type === Types.ConnectorRef) {
      const value = get(formValues, name) as MultiTypeConnectorRef

      const connectorRef = typeof value === 'string' ? value : value?.value
      set(values, name, connectorRef)
    }

    if (type === Types.Numeric) {
      const value = get(formValues, name)
      if (isRuntimeInput(value)) {
        set(values, name, value)
      } else {
        const numericValue = parseInt(value)
        set(values, name, numericValue)
      }
    }
  })

  return removeEmptyKeys<U>(values, keysWithAllowedEmptyValues)
}

export const gitStoreTypes: ThumbnailSelectProps['items'] = [
  {
    label: 'GitHub',
    value: 'Github',
    icon: 'github'
  },
  {
    label: 'GitLab',
    value: 'Gitlab',
    icon: 'service-gotlab'
  },
  {
    label: 'Bitbucket',
    value: 'Bitbucket',
    icon: 'bitbucket'
  },
  {
    label: 'Azure Repo',
    value: 'AzureRepo',
    icon: 'service-azure'
  }
]
