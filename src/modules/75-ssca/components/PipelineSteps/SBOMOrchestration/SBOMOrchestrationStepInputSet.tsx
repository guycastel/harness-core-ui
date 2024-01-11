/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import cx from 'classnames'
import { defaultTo, get, isEmpty } from 'lodash-es'
import React from 'react'
import { useParams } from 'react-router-dom'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { isExecutionTimeFieldDisabled } from '@pipeline/utils/runPipelineUtils'
import MultiTypeSecretInput from '@secrets/components/MutiTypeSecretInput/MultiTypeSecretInput'
import { useStrings } from 'framework/strings'
import { isValueRuntimeInput } from '@common/utils/utils'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { Connectors } from '@platform/connectors/constants'
import type { GitQueryParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useQueryParams } from '@common/hooks/useQueryParams'
import { TextFieldInputSetView } from '@pipeline/components/InputSetView/TextFieldInputSetView/TextFieldInputSetView'
import { SBOMOrchestrationCdStepData, SBOMOrchestrationStepData, SscaStepProps } from '../common/types'
import { CommonInputSet } from '../common/CommonInputSet'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

export function SBOMOrchestrationStepInputSet(
  props: SscaStepProps<SBOMOrchestrationCdStepData | SBOMOrchestrationStepData>
): React.ReactElement {
  const { template, path, readonly, stepViewType, allowableTypes, stepType } = props
  const { getString } = useStrings()
  const prefix = isEmpty(path) ? '' : `${path}.`
  const { expressions } = useVariablesExpression()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()

  const textFieldInputSetViewCommonProps = {
    disabled: readonly,
    template,
    multiTextInputProps: {
      expressions,
      allowableTypes
    },
    configureOptionsProps: {
      isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
    },
    className: cx(stepCss.formGroup, stepCss.md)
  }

  return (
    <>
      {isValueRuntimeInput(get(template, 'spec.attestation.privateKey', '')) && (
        <div className={cx(stepCss.formGroup, stepCss.md)}>
          <MultiTypeSecretInput
            type="SecretFile"
            expressions={expressions}
            name={`${prefix}spec.attestation.privateKey`}
            label={getString('platform.connectors.serviceNow.privateKey')}
            disabled={readonly}
          />
        </div>
      )}

      {stepType === StepType.SBOMOrchestrationCd ? (
        <>
          {isValueRuntimeInput(get(template, 'spec.infrastructure.spec.connectorRef')) && (
            <div className={cx(stepCss.formGroup, stepCss.md)}>
              <FormMultiTypeConnectorField
                accountIdentifier={accountId}
                projectIdentifier={projectIdentifier}
                orgIdentifier={orgIdentifier}
                name={`${path}.spec.infrastructure.spec.connectorRef`}
                label={getString('connector')}
                placeholder={getString('common.entityPlaceholderText')}
                disabled={readonly}
                multiTypeProps={{ allowableTypes, expressions }}
                type={Connectors.K8sCluster}
                setRefValue
                gitScope={{ repo: defaultTo(repoIdentifier, ''), branch, getDefaultFromOtherRepo: true }}
                templateProps={{
                  isTemplatizedView: true,
                  templateValue: get(template, 'spec.infrastructure.spec.connectorRef')
                }}
                width={388}
              />
            </div>
          )}

          {isValueRuntimeInput(get(template, 'spec.infrastructure.spec.namespace')) && (
            <TextFieldInputSetView
              name={`${path}.spec.infrastructure.spec.namespace`}
              fieldPath="spec.infrastructure.spec.namespace"
              label={getString('common.namespace')}
              placeholder={getString('pipeline.infraSpecifications.namespacePlaceholder')}
              {...textFieldInputSetViewCommonProps}
            />
          )}

          {isValueRuntimeInput(get(template, 'spec.infrastructure.spec.resources.limits.cpu')) && (
            <TextFieldInputSetView
              name={`${path}spec.infrastructure.spec.resources.limits.cpu`}
              fieldPath="spec.infrastructure.spec.resources.limits.cpu"
              placeholder={getString('imagePlaceholder')}
              label={getString('pipelineSteps.limitCPULabel')}
              {...textFieldInputSetViewCommonProps}
            />
          )}

          {isValueRuntimeInput(get(template, 'spec.infrastructure.spec.resources.limits.memory')) && (
            <TextFieldInputSetView
              name={`${path}spec.infrastructure.spec.resources.limits.memory`}
              fieldPath="spec.infrastructure.spec.resources.limits.memory"
              placeholder={getString('imagePlaceholder')}
              label={getString('pipelineSteps.limitMemoryLabel')}
              {...textFieldInputSetViewCommonProps}
            />
          )}
        </>
      ) : (
        <>
          {isValueRuntimeInput(get(template, 'spec.ingestion.file')) && (
            <TextFieldInputSetView
              name={`${path}spec.ingestion.file`}
              fieldPath="spec.ingestion.file"
              label={getString('ssca.orchestrationStep.ingestion.file')}
              {...textFieldInputSetViewCommonProps}
            />
          )}

          {isValueRuntimeInput(get(template, 'spec.resources.limits.cpu')) && (
            <TextFieldInputSetView
              name={`${path}spec.resources.limits.cpu`}
              fieldPath="spec.resources.limits.cpu"
              label={getString('pipelineSteps.limitCPULabel')}
              placeholder={getString('imagePlaceholder')}
              {...textFieldInputSetViewCommonProps}
            />
          )}

          {isValueRuntimeInput(get(template, 'spec.resources.limits.memory')) && (
            <TextFieldInputSetView
              name={`${path}spec.resources.limits.memory`}
              fieldPath="spec.resources.limits.memory"
              placeholder={getString('imagePlaceholder')}
              label={getString('pipelineSteps.limitMemoryLabel')}
              {...textFieldInputSetViewCommonProps}
            />
          )}
        </>
      )}

      {isValueRuntimeInput(get(template, 'spec.sbom_drift.spec.variant')) && (
        <TextFieldInputSetView
          name={`${path}spec.sbom_drift.spec.variant`}
          fieldPath="spec.sbom_drift.spec.variant"
          label={getString('ssca.variantValue')}
          {...textFieldInputSetViewCommonProps}
        />
      )}

      <CommonInputSet {...props} />
    </>
  )
}
