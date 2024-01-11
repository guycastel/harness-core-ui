/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useFormikContext } from 'formik'
import { get } from 'lodash-es'
import { Container, FormInput, MultiTypeInputType } from '@harness/uicore'

import { useStrings } from 'framework/strings'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import MultiTypeSecretInput from '@secrets/components/MutiTypeSecretInput/MultiTypeSecretInput'
import {
  VariableType,
  labelStringMap
} from '@pipeline/components/PipelineSteps/Steps/CustomVariables/CustomVariableUtils'
import { useVariablesExpression } from '@modules/70-pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import type { ServiceOverrideRowFormState } from '@cd/components/ServiceOverrides/ServiceOverridesUtils'
import { useServiceOverridesContext } from '@cd/components/ServiceOverrides/context/ServiceOverrideContext'
import css from './VariableOverrideEditable.module.scss'

export function VariableOverrideEditable({ overrideDetailIndex }: { overrideDetailIndex: number }): React.ReactElement {
  const { getString } = useStrings()
  const { values } = useFormikContext<ServiceOverrideRowFormState[]>()
  const { serviceOverrideType } = useServiceOverridesContext()
  const { expressions } = useVariablesExpression()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const variableType = values[overrideDetailIndex]?.variables?.[0]?.type

  const uniqueRowId = get(values, `${overrideDetailIndex}.id`)

  return (
    <Container key={uniqueRowId} className={css.variableOverrideContainer}>
      <FormInput.Text
        className={css.overrideVariableInput}
        name={`${overrideDetailIndex}.variables.0.name`}
        placeholder={getString('name')}
      />
      <FormInput.Select
        name={`${overrideDetailIndex}.variables.0.type`}
        usePortal
        items={[
          { label: getString(labelStringMap[VariableType.String]), value: VariableType.String },
          { label: getString(labelStringMap[VariableType.Number]), value: VariableType.Number },
          { label: getString(labelStringMap[VariableType.Secret]), value: VariableType.Secret }
        ]}
        placeholder={getString('typeLabel')}
        className={css.overrideVariableInput}
      />
      {variableType === VariableType.Secret ? (
        <MultiTypeSecretInput name={`${overrideDetailIndex}.variables.0.value`} label="" disabled={false} />
      ) : (
        <FormInput.MultiTextInput
          name={`${overrideDetailIndex}.variables.0.value`}
          placeholder={getString('valueLabel')}
          label=""
          disabled={false}
          multiTextInputProps={{
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
            expressions,
            defaultValueToReset: '',
            textProps: {
              type: variableType === VariableType.Number ? 'number' : 'text'
            },
            allowableTypes:
              serviceOverrideType === 'ENV_GLOBAL_OVERRIDE' || serviceOverrideType === 'ENV_SERVICE_OVERRIDE'
                ? [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]
                : [MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION]
          }}
        />
      )}
    </Container>
  )
}
