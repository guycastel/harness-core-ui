/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { Types as TransformValuesTypes } from '@pipeline/components/PipelineSteps/Steps/StepsTransformValuesUtils'
import { Types as ValidationFieldTypes } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import { StringKeys } from 'framework/strings'

export const transformValuesFieldsConfig = (stepType?: StepType) => [
  {
    name: 'identifier',
    type: TransformValuesTypes.Text
  },
  {
    name: 'name',
    type: TransformValuesTypes.Text
  },
  {
    name: 'spec.source.type',
    type: TransformValuesTypes.List
  },
  {
    name: 'spec.source.spec.connector',
    type: TransformValuesTypes.ConnectorRef
  },
  {
    name: 'spec.source.spec.image',
    type: TransformValuesTypes.Text
  },
  {
    name: 'spec.source.spec.url',
    type: TransformValuesTypes.Text
  },
  {
    name: 'spec.source.spec.path',
    type: TransformValuesTypes.Text
  },
  {
    name: 'spec.source.spec.variant_type',
    type: TransformValuesTypes.Text
  },
  {
    name: 'spec.source.spec.variant',
    type: TransformValuesTypes.Text
  },
  {
    name: 'spec.source.spec.cloned_codebase',
    type: TransformValuesTypes.Text
  },
  {
    name: 'spec.verifyAttestation.type',
    type: TransformValuesTypes.Text
  },
  {
    name: 'spec.verifyAttestation.spec.publicKey',
    type: TransformValuesTypes.Text
  },
  {
    name: 'spec.policy.store.type',
    type: TransformValuesTypes.Text
  },
  {
    name: 'spec.policy.store.spec.file',
    type: TransformValuesTypes.Text
  },
  {
    name: 'spec.policy.policySets',
    type: TransformValuesTypes.Text
  },
  ...(stepType === StepType.PolicyEnforcementCd
    ? [
        {
          name: 'spec.infrastructure.type',
          type: TransformValuesTypes.Text
        },
        {
          name: 'spec.infrastructure.spec.connectorRef',
          type: TransformValuesTypes.ConnectorRef
        },
        {
          name: 'spec.infrastructure.spec.namespace',
          type: TransformValuesTypes.Text
        },
        {
          name: 'spec.infrastructure.spec.resources.limits.memory',
          type: TransformValuesTypes.Text
        },
        {
          name: 'spec.infrastructure.spec.resources.limits.cpu',
          type: TransformValuesTypes.Text
        }
      ]
    : [
        {
          name: 'spec.resources.limits.memory',
          type: TransformValuesTypes.Text
        },
        {
          name: 'spec.resources.limits.cpu',
          type: TransformValuesTypes.Text
        }
      ]),
  {
    name: 'timeout',
    type: TransformValuesTypes.Text
  }
]

export const editViewValidateFieldsConfig = ({
  stepType,
  isRepoArtifact,
  isOpa
}: {
  stepType: StepType
  isOpa: boolean
  isRepoArtifact: boolean
}) => [
  {
    name: 'identifier',
    type: ValidationFieldTypes.Identifier,
    label: 'identifier',
    isRequired: true
  },
  {
    name: 'name',
    type: ValidationFieldTypes.Name,
    label: 'pipelineSteps.stepNameLabel',
    isRequired: true
  },
  {
    name: 'spec.verifyAttestation.spec.publicKey',
    type: ValidationFieldTypes.Text,
    label: 'ssca.publicKey'
  },
  {
    name: 'spec.source.type',
    type: ValidationFieldTypes.List,
    label: 'pipeline.artifactsSelection.artifactType',
    isRequired: true
  },
  {
    name: 'spec.source.spec.connector',
    type: ValidationFieldTypes.Text,
    label: 'pipelineSteps.connectorLabel',
    isRequired: !isRepoArtifact
  },
  {
    name: 'spec.source.spec.image',
    type: ValidationFieldTypes.Text,
    label: 'imageLabel',
    isRequired: !isRepoArtifact
  },
  {
    name: 'spec.source.spec.url',
    type: ValidationFieldTypes.Text,
    label: 'repositoryUrlLabel',
    isRequired: isRepoArtifact
  },
  {
    name: 'spec.source.spec.path',
    type: ValidationFieldTypes.Text,
    label: 'pipelineSteps.sourcePathLabel',
    isRequired: isRepoArtifact
  },
  {
    name: 'spec.source.spec.variant_type',
    type: ValidationFieldTypes.List,
    label: 'ssca.variantType',
    isRequired: isRepoArtifact
  },
  {
    name: 'spec.source.spec.variant',
    type: ValidationFieldTypes.Text,
    label: 'ssca.variantValue',
    isRequired: isRepoArtifact
  },
  {
    name: 'spec.source.spec.cloned_codebase',
    type: ValidationFieldTypes.Text,
    label: 'pipelineSteps.workspace'
  },
  {
    name: 'spec.policy.store.spec.file',
    type: ValidationFieldTypes.Text,
    label: 'common.git.filePath',
    isRequired: !isOpa
  },
  {
    name: 'spec.policy.policySets',
    type: ValidationFieldTypes.Text,
    label: 'common.policy.policysets',
    isRequired: isOpa
  },
  ...(stepType === StepType.PolicyEnforcementCd
    ? [
        {
          name: 'spec.infrastructure.type',
          type: ValidationFieldTypes.Text
        },
        {
          name: 'spec.infrastructure.spec.connectorRef',
          type: ValidationFieldTypes.Text,
          label: 'connector',
          isRequired: true
        },
        {
          name: 'spec.infrastructure.spec.namespace',
          type: ValidationFieldTypes.Text,
          label: 'common.namespace',
          isRequired: true
        },
        {
          name: 'spec.infrastructure.spec.resources.limits.memory',
          type: ValidationFieldTypes.LimitMemory,
          label: 'pipelineSteps.limitMemoryLabel',
          isRequired: true
        },
        {
          name: 'spec.infrastructure.spec.resources.limits.cpu',
          type: ValidationFieldTypes.LimitCPU,
          label: 'pipelineSteps.limitCPULabel',
          isRequired: true
        }
      ]
    : [
        {
          name: 'spec.resources.limits.memory',
          type: ValidationFieldTypes.LimitMemory,
          label: 'pipelineSteps.limitMemoryLabel'
        },
        {
          name: 'spec.resources.limits.cpu',
          type: ValidationFieldTypes.LimitCPU,
          label: 'pipelineSteps.limitCPULabel'
        }
      ]),
  {
    name: 'timeout',
    type: ValidationFieldTypes.Timeout,
    label: 'pipelineSteps.timeoutLabel'
  }
]

type InputSetViewValidateFieldsConfig = Array<{
  name: string
  type: ValidationFieldTypes
  label?: StringKeys
  isRequired?: boolean
}>

export const getInputSetViewValidateFieldsConfig =
  (stepType: StepType) =>
  (
    // Called only with required
    /* istanbul ignore next */
    isRequired = true
  ): InputSetViewValidateFieldsConfig => {
    return [
      {
        name: 'spec.source.spec.connector',
        type: ValidationFieldTypes.Text,
        label: 'pipelineSteps.connectorLabel',
        isRequired
      },
      {
        name: 'spec.source.spec.image',
        type: ValidationFieldTypes.Text,
        label: 'imageLabel',
        isRequired
      },
      {
        name: 'spec.verifyAttestation.spec.publicKey',
        type: ValidationFieldTypes.Text,
        label: 'ssca.publicKey'
      },
      {
        name: 'spec.policy.policySets',
        type: ValidationFieldTypes.Text,
        label: 'common.policy.policysets'
      },
      ...((stepType === StepType.PolicyEnforcementCd
        ? [
            {
              name: 'spec.infrastructure.spec.connectorRef',
              type: ValidationFieldTypes.Text,
              label: 'connector',
              isRequired
            },
            {
              name: 'spec.infrastructure.spec.namespace',
              type: ValidationFieldTypes.Namespace,
              label: 'common.namespace',
              isRequired
            },
            {
              name: 'spec.infrastructure.spec.resources.limits.memory',
              type: ValidationFieldTypes.LimitMemory,
              label: 'pipelineSteps.limitMemoryLabel',
              isRequired
            },
            {
              name: 'spec.infrastructure.spec.resources.limits.cpu',
              type: ValidationFieldTypes.LimitCPU,
              label: 'pipelineSteps.limitCPULabel',
              isRequired
            }
          ]
        : [
            {
              name: 'spec.resources.limits.memory',
              type: ValidationFieldTypes.LimitMemory,
              label: 'pipelineSteps.limitMemoryLabel'
            },
            {
              name: 'spec.resources.limits.cpu',
              type: ValidationFieldTypes.LimitCPU,
              label: 'pipelineSteps.limitCPULabel'
            }
          ]) as InputSetViewValidateFieldsConfig),
      {
        name: 'timeout',
        type: ValidationFieldTypes.Timeout,
        label: 'pipelineSteps.timeoutLabel'
      }
    ]
  }
