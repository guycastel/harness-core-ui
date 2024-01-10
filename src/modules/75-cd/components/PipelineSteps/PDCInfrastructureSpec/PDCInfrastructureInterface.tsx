/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { defaultTo, lowerCase, set, some } from 'lodash-es'
import * as Yup from 'yup'
import { getMultiTypeFromValue, MultiTypeInputType } from '@harness/uicore'
import type { UseStringsReturn } from 'framework/strings'
import type { SecretReferenceInterface } from '@secrets/utils/SecretField'
import type { HostFilter, HostFilterSpec } from 'services/cd-ng'
import type { MapUIType } from '@common/components/Map/Map'
import { getConnectorSchema } from '../PipelineStepsUtil'

export interface PDCInfrastructureYAML {
  hostsType: number
  allowSimultaneousDeployments: boolean
  attributeFilters?: string | { [key: string]: string }
  hosts: string | string[]
  connectorRef?: string
  delegateSelectors?: string[]
  hostFilters?: string | string[]
  hostFilter: HostFilter
  sshKey: SecretReferenceInterface | void
  credentialsRef: string
  hostObjectArray?: string
  hostAttributes?: MapUIType
  provisioner?: string
  hostArrayPath?: string
}

export interface PDCInfrastructureUI {
  hostsType?: number
  allowSimultaneousDeployments?: boolean
  attributeFilters?: string
  hostFilter?: HostFilter
  hosts: string
  connectorRef?: string
  delegateSelectors?: string[]
  hostFilters: string
  sshKey?: SecretReferenceInterface | void
  credentialsRef: string
  serviceType?: string
  hostObjectArray?: string
  hostAttributes?: MapUIType
  hostArrayPath?: string
}

export interface HostAttribute {
  key: string
  value: string
}

export enum HOSTS_TYPE {
  SPECIFIED = 'specified',
  PRECONFIGURED = 'preconfigured',
  DYNAMIC = 'dynamic'
}

export const HostScope = {
  ALL: 'All',
  HOST_NAME: 'HostNames',
  HOST_ATTRIBUTES: 'HostAttributes'
}

export const parseByComma = (data: string): Array<string> =>
  typeof data === 'string'
    ? defaultTo(
        data
          ?.replace(/,/g, '\n')
          .split('\n')
          .filter(part => part.length)
          .map(part => part.trim()),
        []
      )
    : []

export const parseHosts = (hosts: string) => parseByComma(hosts)

export const getKeyValueHostAttributes = (hostAttributes?: HostAttribute[]) => {
  const result: any = {}

  hostAttributes?.forEach(attribute => {
    if (!attribute.key) {
      return
    } else {
      result[attribute.key] = attribute.value
    }
  })

  return result
}

export const parseAttributes = (attributes: string) =>
  parseByComma(attributes).reduce((prev, current) => {
    const [key, value] = current.split(':')
    /* istanbul ignore else */
    if (key && value) {
      set(prev, key, value.trim())
    }
    return prev
  }, {})

export type PdcInfraTemplate = {
  connectorRef?: string
  credentialsRef: string
  delegateSelectors?: string
  hostFilter?: {
    type: HostFilterSpec
    spec?: {
      value: string
    }
  }
  hosts?: string
  hostFilters?: string
  hostAttributes?: string
  hostObjectArray?: string
  attributeFilters?: string
  provisioner?: string
  hostArrayPath?: string
}

export function getValidationSchemaNoPreconfiguredHosts(getString: UseStringsReturn['getString']): Yup.ObjectSchema {
  return Yup.object().shape({
    credentialsRef: Yup.string().required(getString('fieldRequired', { field: getString('credentials') })),
    hosts: Yup.string().required(
      getString('common.validation.fieldIsRequired', { name: getString('platform.connectors.pdc.hosts') })
    )
  })
}

export function getValidationSchemaDynamic(
  getString: UseStringsReturn['getString'],
  withFilters: boolean
): Yup.ObjectSchema {
  return Yup.object().shape({
    credentialsRef: Yup.string().required(getString('fieldRequired', { field: getString('credentials') })),

    hostArrayPath: Yup.string().required(
      getString('common.validation.fieldIsRequired', { name: getString('cd.steps.pdcStep.hostArrayPath') })
    ),
    hostAttributes: Yup.lazy(value =>
      getMultiTypeFromValue(value as boolean) === MultiTypeInputType.FIXED
        ? Yup.array()
            .of(
              Yup.object().shape({
                key: Yup.string().required(getString('common.validation.fieldIsRequired', { name: 'Field' })),
                value: Yup.string().trim().required(getString('common.validation.valueIsRequired'))
              })
            )
            .test('shouldContainHostName', getString('cd.steps.pdcStep.hostnameRqrd'), values => {
              if (!values) return true
              return some(values, val => lowerCase(val.key) === 'hostname')
            })
            .min(
              1,
              getString('common.validation.fieldIsRequired', { name: getString('cd.steps.pdcStep.hostDataMapping') })
            )
            .ensure()
        : Yup.string()
    ),
    ...(withFilters && {
      attributeFilters: Yup.string().required(getString('cd.validation.specifyFilter'))
    })
  })
}

export function getValidationSchemaHostFilters(getString: UseStringsReturn['getString']): Yup.ObjectSchema {
  return Yup.object().shape({
    connectorRef: getConnectorSchema(getString),
    credentialsRef: Yup.string().required(getString('fieldRequired', { field: getString('credentials') })),
    hostFilters: Yup.string().required(getString('cd.validation.specifyFilter'))
  })
}

export function getValidationSchemaAttributeFilters(getString: UseStringsReturn['getString']): Yup.ObjectSchema {
  return Yup.object().shape({
    connectorRef: getConnectorSchema(getString),
    credentialsRef: Yup.string().required(getString('fieldRequired', { field: getString('credentials') })),
    attributeFilters: Yup.string().required(getString('cd.validation.specifyFilter'))
  })
}

export function getValidationSchemaAll(getString: UseStringsReturn['getString']): Yup.ObjectSchema {
  return Yup.object().shape({
    connectorRef: getConnectorSchema(getString),
    credentialsRef: Yup.string().required(getString('fieldRequired', { field: getString('credentials') }))
  })
}
