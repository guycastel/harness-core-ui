/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Text } from '@harness/uicore'
import { MultiTypeTextField } from '@common/components/MultiTypeText/MultiTypeText'
import { useStrings } from 'framework/strings'
import { useVariablesExpression } from '@modules/70-pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { isExecutionTimeFieldDisabled } from '@pipeline/utils/runPipelineUtils'
import { GitProviderFieldProps } from './CreateRepoStep/types'
import css from './IDPSteps.module.scss'

function AzureRepoFields({ readonly, stepViewType, allowableTypes }: GitProviderFieldProps): React.ReactElement {
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()

  const isExecutionTimeFieldDisabledForStep = isExecutionTimeFieldDisabled(stepViewType)

  return (
    <>
      <MultiTypeTextField
        name="spec.organization"
        className={css.publicTemplateUrl}
        label={
          <Text
            tooltipProps={{ dataTooltipId: 'organization' }}
            className={css.formLabel}
            margin={{ bottom: 'medium' }}
          >
            {getString('orgLabel')}
          </Text>
        }
        multiTextInputProps={{
          disabled: readonly,
          placeholder: getString('pipeline.artifactsSelection.organizationPlaceholder'),
          multiTextInputProps: {
            expressions,
            allowableTypes
          }
        }}
        configureOptionsProps={{
          hideExecutionTimeField: isExecutionTimeFieldDisabledForStep
        }}
      />
      <MultiTypeTextField
        name="spec.project"
        className={css.publicTemplateUrl}
        label={
          <Text className={css.formLabel} margin={{ bottom: 'medium' }}>
            {getString('projectLabel')}
          </Text>
        }
        multiTextInputProps={{
          disabled: readonly,
          placeholder: getString('pipeline.artifactsSelection.projectPlaceholder'),
          multiTextInputProps: {
            expressions,
            allowableTypes
          }
        }}
        configureOptionsProps={{
          hideExecutionTimeField: isExecutionTimeFieldDisabledForStep
        }}
      />
      <MultiTypeTextField
        name="spec.repository"
        className={css.publicTemplateUrl}
        label={
          <Text tooltipProps={{ dataTooltipId: 'repository' }} className={css.formLabel} margin={{ bottom: 'medium' }}>
            {getString('common.repositoryName')}
          </Text>
        }
        multiTextInputProps={{
          disabled: readonly,
          placeholder: getString('pipeline.manifestType.repoNamePlaceholder'),
          multiTextInputProps: {
            expressions,
            allowableTypes
          }
        }}
        configureOptionsProps={{
          hideExecutionTimeField: isExecutionTimeFieldDisabledForStep
        }}
      />
    </>
  )
}

export default AzureRepoFields
