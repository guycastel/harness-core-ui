import React from 'react'
import { Layout, Text } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { StringKeys, useStrings } from 'framework/strings'
import { labelStringMap } from '@pipeline/components/PipelineSteps/Steps/CustomVariables/CustomVariableUtils'
import type { AllNGVariables } from '@pipeline/utils/types'
import type { RequiredField } from '@common/interfaces/RouteInterfaces'

export default function VariableOverrideInfo({
  name,
  type,
  value
}: RequiredField<AllNGVariables, 'name' | 'type'>): React.ReactElement {
  const { getString } = useStrings()

  return (
    <React.Fragment>
      <VariableOverrideInfoCell name="variableNameLabel" value={name} />
      <VariableOverrideInfoCell name="common.variableType" value={getString(labelStringMap[type])} />
      <VariableOverrideInfoCell name="cd.overrideValue" value={value} />
    </React.Fragment>
  )
}

function VariableOverrideInfoCell({ name, value }: { name: StringKeys; value: string | number }): React.ReactElement {
  const { getString } = useStrings()

  return (
    <Layout.Vertical width={180} height={40} flex={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Text font={{ variation: FontVariation.TABLE_HEADERS }}>{getString(name).toUpperCase()}</Text>
      <Text color={Color.GREY_450} lineClamp={1}>
        {value}
      </Text>
    </Layout.Vertical>
  )
}
