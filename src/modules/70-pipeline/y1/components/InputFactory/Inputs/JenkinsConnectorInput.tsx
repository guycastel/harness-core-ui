/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useParams } from 'react-router-dom'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { GitQueryParams } from '@common/interfaces/RouteInterfaces'
import { useStrings } from 'framework/strings'
import { useRuntimeInput } from '@modules/70-pipeline/y1/hooks/useRuntimeInput'
import { useQueryParams } from '@common/hooks'
import { InputsFormValues } from '../../InputsForm/InputsForm'
import { InputComponent, InputProps } from '../InputComponent'
import { DerivedInputType } from '../InputComponentType'
import { RuntimeInputType } from '../../InputsForm/types'

function JenkinsConnectorInputInternal(props: InputProps<InputsFormValues>): JSX.Element {
  const { allowableTypes, readonly, path, input } = props
  const { label = '' } = input
  const { getString } = useStrings()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
  }>()
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()
  const { renderRuntimeInput } = useRuntimeInput({ type: RuntimeInputType.string })

  return (
    <FormMultiTypeConnectorField
      name={path}
      label={label}
      placeholder={getString('common.entityPlaceholderText')}
      accountIdentifier={accountId}
      projectIdentifier={projectIdentifier}
      orgIdentifier={orgIdentifier}
      width="100%"
      setRefValue
      disabled={readonly}
      enableConfigureOptions={false}
      multiTypeProps={{
        allowableTypes,
        expressions: [],
        renderRuntimeInput
      }}
      type="Jenkins"
      gitScope={{ repo: repoIdentifier || '', branch, getDefaultFromOtherRepo: true }}
    />
  )
}

export class JenkinsConnectorInput extends InputComponent<InputsFormValues> {
  public internalType = DerivedInputType.jenkins_connector

  constructor() {
    super()
  }

  renderComponent(props: InputProps<InputsFormValues>): JSX.Element {
    return <JenkinsConnectorInputInternal {...props} />
  }
}
