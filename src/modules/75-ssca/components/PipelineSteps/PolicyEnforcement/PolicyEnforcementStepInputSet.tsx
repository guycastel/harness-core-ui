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
import { TimeoutFieldInputSetView } from '@pipeline/components/InputSetView/TimeoutFieldInputSetView/TimeoutFieldInputSetView'
import { isValueRuntimeInput } from '@common/utils/utils'
import { TextFieldInputSetView } from '@pipeline/components/InputSetView/TextFieldInputSetView/TextFieldInputSetView'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { Connectors } from '@platform/connectors/constants'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { useQueryParams } from '@common/hooks'
import type { ProjectPathProps, GitQueryParams } from '@common/interfaces/RouteInterfaces'
import MultiTypePolicySetSelector from '@modules/70-pipeline/components/PipelineSteps/Common/PolicySets/MultiTypePolicySetSelector/MultiTypePolicySetSelector'
import { SscaStepProps, PolicyEnforcementCdStepData, PolicyEnforcementStepData } from '../common/types'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

export function SBOMEnforceStepInputSet(
  props: SscaStepProps<PolicyEnforcementCdStepData | PolicyEnforcementStepData>
): React.ReactElement {
  const { template, path, readonly, stepViewType, allowableTypes, stepType } = props
  const { getString } = useStrings()
  const prefix = isEmpty(path) ? '' : `${path}.`
  const { expressions } = useVariablesExpression()

  const { accountId, projectIdentifier, orgIdentifier } = useParams<ProjectPathProps>()
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()

  return (
    <>
      {isValueRuntimeInput(template?.timeout) && (
        <TimeoutFieldInputSetView
          label={getString('pipelineSteps.timeoutLabel')}
          name={`${prefix}timeout`}
          disabled={readonly}
          multiTypeDurationProps={{
            configureOptionsProps: {
              isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
            },
            allowableTypes,
            expressions,
            disabled: readonly
          }}
          fieldPath={'timeout'}
          template={template}
          className={cx(stepCss.formGroup, stepCss.sm)}
        />
      )}

      {isValueRuntimeInput(get(template, 'spec.verifyAttestation.spec.publicKey', '')) && (
        <div className={cx(stepCss.formGroup, stepCss.md)}>
          <MultiTypeSecretInput
            type="SecretFile"
            expressions={expressions}
            name={`${prefix}spec.verifyAttestation.publicKey`}
            label={getString('ssca.publicKey')}
            disabled={readonly}
          />
        </div>
      )}

      {isValueRuntimeInput(get(template, 'spec.policy.policySets', '')) && (
        <div className={cx(stepCss.formGroup, stepCss.md)}>
          <MultiTypePolicySetSelector
            name={`${prefix}spec.policy.policySets`}
            label={getString('common.policiesSets.policyset')}
            expressions={expressions}
            allowableTypes={allowableTypes}
            disabled={readonly}
          />
        </div>
      )}

      {stepType === StepType.PolicyEnforcement ? (
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
              label={getString('common.namespace')}
              disabled={readonly}
              multiTextInputProps={{
                allowableTypes,
                expressions
              }}
              configureOptionsProps={{
                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
              }}
              placeholder={getString('pipeline.infraSpecifications.namespacePlaceholder')}
              fieldPath="spec.infrastructure.spec.namespace"
              template={template}
              className={cx(stepCss.formGroup, stepCss.md)}
            />
          )}

          {isValueRuntimeInput(get(template, 'spec.infrastructure.spec.resources.limits.cpu')) && (
            <TextFieldInputSetView
              name={`${path}spec.infrastructure.spec.resources.limits.cpu`}
              placeholder={getString('imagePlaceholder')}
              label={getString('pipelineSteps.limitCPULabel')}
              disabled={readonly}
              fieldPath={'spec.infrastructure.spec.resources.limits.cpu'}
              template={template}
              multiTextInputProps={{
                expressions,
                allowableTypes
              }}
              configureOptionsProps={{
                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
              }}
              className={cx(stepCss.formGroup, stepCss.md)}
            />
          )}

          {isValueRuntimeInput(get(template, 'spec.infrastructure.spec.resources.limits.memory')) && (
            <TextFieldInputSetView
              name={`${path}spec.infrastructure.spec.resources.limits.memory`}
              placeholder={getString('imagePlaceholder')}
              label={getString('pipelineSteps.limitMemoryLabel')}
              disabled={readonly}
              fieldPath={'spec.infrastructure.spec.resources.limits.memory'}
              template={template}
              multiTextInputProps={{
                expressions,
                allowableTypes
              }}
              configureOptionsProps={{
                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
              }}
              className={cx(stepCss.formGroup, stepCss.md)}
            />
          )}
        </>
      ) : (
        <>
          {isValueRuntimeInput(get(template, 'spec.resources.limits.cpu')) && (
            <TextFieldInputSetView
              name={`${path}spec.resources.limits.cpu`}
              placeholder={getString('imagePlaceholder')}
              label={getString('pipelineSteps.limitCPULabel')}
              disabled={readonly}
              fieldPath={'spec.resources.limits.cpu'}
              template={template}
              multiTextInputProps={{
                expressions,
                allowableTypes
              }}
              configureOptionsProps={{
                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
              }}
              className={cx(stepCss.formGroup, stepCss.md)}
            />
          )}

          {isValueRuntimeInput(get(template, 'spec.resources.limits.memory')) && (
            <TextFieldInputSetView
              name={`${path}spec.resources.limits.memory`}
              placeholder={getString('imagePlaceholder')}
              label={getString('pipelineSteps.limitMemoryLabel')}
              disabled={readonly}
              fieldPath={'spec.resources.limits.memory'}
              template={template}
              multiTextInputProps={{
                expressions,
                allowableTypes
              }}
              configureOptionsProps={{
                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
              }}
              className={cx(stepCss.formGroup, stepCss.md)}
            />
          )}
        </>
      )}
    </>
  )
}
