/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useMemo } from 'react'
import * as Yup from 'yup'
import { RUNTIME_INPUT_VALUE } from '@harness/uicore'
import { useFormikContext } from 'formik'
import { UseStringsReturn } from 'framework/strings'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import {
  CFPipelineInstructionType,
  FeatureFlagConfigurationInstruction
} from '@cf/components/PipelineSteps/FlagConfigurationStep/types'
import { getPercentageRolloutVariationsArrayTest } from '@cf/hooks/usePercentageRolloutValidationSchema'
import type { SubSectionComponent } from '../../subSection.types'
import { useFlagChanges } from '../../../FlagChangesContextProvider'
import { withPrefix } from '../../utils/withPrefix'
import SubSection from '../../SubSection'
import TargetGroupField from './TargetGroupField'
import PercentageRolloutField from './PercentageRolloutField'

export const servePercentageRolloutToTargetGroupSchema = (
  getString: UseStringsReturn['getString']
): Yup.Schema<unknown> =>
  Yup.object({
    spec: Yup.object({
      distribution: Yup.object({
        clauses: Yup.array()
          .default([{ values: [''] }])
          .of(
            Yup.object({
              values: Yup.array()
                .default([''])
                .of(
                  Yup.string()
                    .trim()
                    .min(1, getString('cf.featureFlags.flagPipeline.validation.servePercentageRollout.targetGroup'))
                )
            })
          ),
        variations: Yup.lazy(variations => {
          if (Array.isArray(variations)) {
            return getPercentageRolloutVariationsArrayTest(getString)
          } else {
            return Yup.string().required(
              getString('cf.featureFlags.flagPipeline.validation.servePercentageRollout.variations')
            )
          }
        })
      })
    })
  })

const hasPercentageRolloutRuntime = (instruction: FeatureFlagConfigurationInstruction): boolean =>
  instruction.type === CFPipelineInstructionType.ADD_RULE &&
  instruction.spec.distribution.variations === RUNTIME_INPUT_VALUE

const hasTargetGroupRuntime = (instruction: FeatureFlagConfigurationInstruction): boolean =>
  instruction.type === CFPipelineInstructionType.ADD_RULE &&
  instruction.spec.distribution.clauses[0].values[0] === RUNTIME_INPUT_VALUE

export const hasServePercentageRolloutToTargetGroupRuntime = (
  instruction: FeatureFlagConfigurationInstruction
): boolean => hasPercentageRolloutRuntime(instruction) || hasTargetGroupRuntime(instruction)

const ServePercentageRolloutToTargetGroup: SubSectionComponent = ({ prefixPath, ...props }) => {
  const { setFieldValue } = useFormikContext()
  const { mode, initialInstructions } = useFlagChanges()

  useEffect(() => {
    setFieldValue(withPrefix(prefixPath, 'identifier'), `${CFPipelineInstructionType.ADD_RULE}Identifier`)
    setFieldValue(withPrefix(prefixPath, 'type'), CFPipelineInstructionType.ADD_RULE)
    setFieldValue(withPrefix(prefixPath, 'spec.priority'), 100)
    setFieldValue(withPrefix(prefixPath, 'spec.bucketBy'), 'identifier')
    setFieldValue(withPrefix(prefixPath, 'spec.distribution.clauses[0].op'), 'segmentMatch')
    setFieldValue(withPrefix(prefixPath, 'spec.distribution.clauses[0].attribute'), '')
  }, [prefixPath, setFieldValue])

  const displayTargetGroupField = useMemo<boolean>(
    () =>
      mode !== StepViewType.DeploymentForm ||
      !!initialInstructions?.some(instruction => hasTargetGroupRuntime(instruction)),
    [initialInstructions, mode]
  )

  const displayPercentageRolloutField = useMemo<boolean>(
    () =>
      mode !== StepViewType.DeploymentForm ||
      !!initialInstructions?.some(instruction => hasPercentageRolloutRuntime(instruction)),
    [initialInstructions, mode]
  )

  return (
    <SubSection data-testid="flagChanges-servePercentageRolloutToTargetGroup" {...props}>
      {displayTargetGroupField && <TargetGroupField prefixPath={prefixPath} />}
      {displayPercentageRolloutField && <PercentageRolloutField prefixPath={prefixPath} />}
    </SubSection>
  )
}

export default ServePercentageRolloutToTargetGroup
