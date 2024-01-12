/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { Color } from '@harness/design-system'
import { SelectOption, MultiTypeInputType, Text } from '@harness/uicore'
import { connect } from 'formik'
import { MultiTypeSelectField } from '@common/components/MultiTypeSelect/MultiTypeSelect'

import { useStrings } from 'framework/strings'
import type { ExecutionWrapperConfig } from 'services/cd-ng'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'

interface ProvisionerSelectFieldProps {
  provisioners?: ExecutionWrapperConfig[]
  name: string
  formik?: any
  isReadonly?: boolean
  path: string
}

function ProvisionerSelectField(props: ProvisionerSelectFieldProps): React.ReactElement {
  const { name, isReadonly = false, provisioners } = props

  const [options, setOptions] = useState<SelectOption[]>([])

  const { getString } = useStrings()

  const includeProvisioner = [
    StepType.TerraformApply,
    StepType.ShellScriptProvision,
    StepType.TerragruntApply,
    StepType.CloudFormationCreateStack,
    StepType.CreateAzureARMResource,
    StepType.AwsCdkDeploy
  ]

  const getProvisionerSteps = (arr: ExecutionWrapperConfig[]): ExecutionWrapperConfig[] => {
    let result: ExecutionWrapperConfig[] = []
    arr?.forEach((obj: ExecutionWrapperConfig) => {
      if (obj?.step) {
        result.push(obj)
      } else if (obj.parallel) {
        result = result.concat(getProvisionerSteps(obj.parallel))
      } else if (obj.stepGroup) {
        const steps = obj?.stepGroup?.steps || obj?.stepGroup?.template?.templateInputs?.steps || []

        result = result.concat(getProvisionerSteps(steps as ExecutionWrapperConfig[]))
      }
    })
    return result.filter(({ step }) => step?.type && includeProvisioner.includes(step.type as StepType))
  }

  React.useEffect(() => {
    if (provisioners) {
      setOptions(
        getProvisionerSteps(provisioners).map(({ step }: ExecutionWrapperConfig) => {
          return {
            label: /* istanbul ignore next */ step?.name || step?.identifier,
            value: /* istanbul ignore next */ step?.identifier
          }
        }) as SelectOption[]
      )
    }
  }, [provisioners])

  return (
    <>
      <MultiTypeSelectField
        label={
          <Text color={Color.GREY_600} font={{ size: 'small', weight: 'semi-bold' }} margin={{ bottom: 'xsmall' }}>
            {getString('common.provisioner')}
          </Text>
        }
        name={name}
        useValue
        data-testid="provisioner-select"
        enableConfigureOptions={false}
        multiTypeInputProps={{
          selectItems: options,
          placeholder: getString('select'),
          multiTypeInputProps: {
            allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME]
          }
        }}
        disabled={isReadonly}
      />
    </>
  )
}

export default connect(ProvisionerSelectField)
