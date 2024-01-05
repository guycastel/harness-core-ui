/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { Color, FontVariation } from '@harness/design-system'
import { FormInput, Text } from '@harness/uicore'
import cx from 'classnames'
import { get } from 'lodash-es'
import React from 'react'
import { useParams } from 'react-router-dom'
import { useFormikContext } from 'formik'
import { MultiTypeTextField } from '@common/components/MultiTypeText/MultiTypeText'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { Connectors } from '@platform/connectors/constants'
import { useStrings } from 'framework/strings'
import { ProjectPathProps } from '@modules/10-common/interfaces/RouteInterfaces'
import { useVariablesExpression } from '@modules/70-pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { useGitScope } from '@modules/70-pipeline/utils/CIUtils'
import { isExecutionTimeFieldDisabled } from '@modules/70-pipeline/utils/runPipelineUtils'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { AllMultiTypeInputTypesForStep } from './default-values'
import { getArtifactTypes, getGitVariants } from './select-options'
import { SscaStepProps } from './types'
import css from '../SscaStep.module.scss'

export const ArtifactSourceSection: React.FC<SscaStepProps<unknown>> = props => {
  const { readonly, stepViewType } = props
  const formik = useFormikContext()

  const { getString } = useStrings()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { expressions } = useVariablesExpression()
  const gitScope = useGitScope()
  const isExecutionTimeFieldDisabledForStep = isExecutionTimeFieldDisabled(stepViewType)
  const { SSCA_REPO_ARTIFACT } = useFeatureFlags()

  const multiTypeTextFieldCommmonProps: Pick<
    React.ComponentProps<typeof MultiTypeTextField>,
    'multiTextInputProps' | 'configureOptionsProps'
  > = {
    multiTextInputProps: {
      disabled: readonly,
      multiTextInputProps: {
        expressions,
        allowableTypes: AllMultiTypeInputTypesForStep
      }
    },
    configureOptionsProps: {
      hideExecutionTimeField: isExecutionTimeFieldDisabledForStep
    }
  }

  return (
    <>
      <Text font={{ variation: FontVariation.FORM_SUB_SECTION }} color={Color.GREY_900} margin={{ top: 'small' }}>
        {getString('ssca.orchestrationStep.artifactSource')}
      </Text>

      <FormInput.RadioGroup
        items={getArtifactTypes(getString, SSCA_REPO_ARTIFACT)}
        name="spec.source.type"
        label={getString('pipeline.artifactsSelection.artifactType')}
        disabled={readonly}
        radioGroup={{ inline: true }}
        onChange={(e): void => {
          formik.setFieldValue('spec.source.spec', {
            variant_type: e.currentTarget.value === 'repository' ? 'git-branch' : undefined
          })
        }}
      />

      {get(formik.values, 'spec.source.type') === 'image' ? (
        <>
          <FormMultiTypeConnectorField
            label={getString('pipelineSteps.connectorLabel')}
            type={[Connectors.GCP, Connectors.AWS, Connectors.DOCKER, Connectors.AZURE]}
            name="spec.source.spec.connector"
            placeholder={getString('select')}
            accountIdentifier={accountId}
            projectIdentifier={projectIdentifier}
            orgIdentifier={orgIdentifier}
            multiTypeProps={{
              expressions,
              allowableTypes: AllMultiTypeInputTypesForStep,
              disabled: readonly
            }}
            gitScope={gitScope}
            setRefValue
            configureOptionsProps={{
              hideExecutionTimeField: isExecutionTimeFieldDisabledForStep
            }}
          />

          <MultiTypeTextField
            name="spec.source.spec.image"
            label={
              <Text className={css.formLabel} tooltipProps={{ dataTooltipId: 'image' }}>
                {getString('imageLabel')}
              </Text>
            }
            {...multiTypeTextFieldCommmonProps}
          />
        </>
      ) : (
        <>
          <MultiTypeTextField
            name="spec.source.spec.url"
            label={
              <Text className={css.formLabel} tooltipProps={{ dataTooltipId: 'repoUrl' }}>
                {getString('repositoryUrlLabel')}
              </Text>
            }
          />
          <MultiTypeTextField
            name="spec.source.spec.path"
            label={
              <Text className={css.formLabel} tooltipProps={{ dataTooltipId: 'sourcePath' }}>
                {getString('pipelineSteps.sourcePathLabel')}
              </Text>
            }
            {...multiTypeTextFieldCommmonProps}
          />

          <FormInput.RadioGroup
            items={getGitVariants(getString)}
            name="spec.source.spec.variant_type"
            label={getString('ssca.variantType')}
            disabled={readonly}
            radioGroup={{ inline: true }}
            className={cx(css.variantType)}
          />
          <MultiTypeTextField
            name="spec.source.spec.variant"
            label={
              <Text className={css.formLabel} tooltipProps={{ dataTooltipId: 'variant' }}>
                {
                  getGitVariants(getString).find(
                    item => item.value === get(formik?.values, 'spec.source.spec.variant_type')
                  )?.label
                }
              </Text>
            }
            {...multiTypeTextFieldCommmonProps}
          />
          <MultiTypeTextField
            name="spec.source.spec.cloned_codebase"
            label={
              <Text className={css.formLabel} tooltipProps={{ dataTooltipId: 'TargetWorkspace' }}>
                {getString('pipelineSteps.workspace')}
                <span style={{ color: 'var(--grey-400)' }}>{getString('common.optionalLabel')}</span>
              </Text>
            }
            {...multiTypeTextFieldCommmonProps}
          />
        </>
      )}
    </>
  )
}
