/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { NestedAccordionProvider } from '@harness/uicore'
import { useParams } from 'react-router-dom'
import { useQueryParams } from '@modules/10-common/hooks'
import { InputSetGitQueryParams, InputSetPathProps, PipelineType } from '@modules/10-common/interfaces/RouteInterfaces'
import { withInputSetsOnCreateUpdateSuccess } from '@pipeline/utils/withInputSetsOnCreateUpdateSuccess'
import { useGetPipelineSummary } from 'services/pipeline-ng'
import { ContainerSpinner } from '@modules/10-common/components/ContainerSpinner/ContainerSpinner'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { InputSetFormProps } from './types'
import { InputSetForm } from './InputSetForm'
import { InputSetFormY1 } from '../InputSetFormY1/InputSetFormY1'

function EnhancedInputSetFormInner(props: InputSetFormProps): React.ReactElement {
  const { projectIdentifier, orgIdentifier, accountId, pipelineIdentifier } = useParams<
    PipelineType<InputSetPathProps> & { accountId: string }
  >()
  const { repoIdentifier, branch, connectorRef, repoName } = useQueryParams<InputSetGitQueryParams>()

  const { data, loading } = useGetPipelineSummary({
    pipelineIdentifier,
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier,
      repoIdentifier,
      branch,
      parentEntityConnectorRef: connectorRef,
      parentEntityRepoName: repoName
    }
  })

  if (loading) {
    return <ContainerSpinner height={'100vh'} flex={{ align: 'center-center' }} />
  }

  const yamlVersion = data?.data?.yamlVersion
  const pipelineName = data?.data?.name ?? ''

  return (
    <NestedAccordionProvider>
      {yamlVersion === '1' ? <InputSetFormY1 {...props} pipelineName={pipelineName} /> : <InputSetForm {...props} />}
    </NestedAccordionProvider>
  )
}

export function EnhancedInputSetForm(props: InputSetFormProps): React.ReactElement {
  const { CDS_YAML_SIMPLIFICATION } = useFeatureFlags()

  return CDS_YAML_SIMPLIFICATION ? (
    <EnhancedInputSetFormInner {...props} />
  ) : (
    <NestedAccordionProvider>
      <InputSetForm {...props} />
    </NestedAccordionProvider>
  )
}

export const EnhancedInputSetFormForRoute = withInputSetsOnCreateUpdateSuccess<InputSetFormProps>(EnhancedInputSetForm)
