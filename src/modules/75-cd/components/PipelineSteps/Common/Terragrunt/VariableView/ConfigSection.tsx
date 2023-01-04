/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Text } from '@harness/uicore'
import { useStrings } from 'framework/strings'
import { VariablesListTable } from '@pipeline/components/VariablesListTable/VariablesListTable'
import type { RemoteTerragruntVarFileSpec } from 'services/cd-ng'
import type { TerragruntData, TerragruntVariableStepProps } from '../TerragruntInterface'
import pipelineVariableCss from '@pipeline/components/PipelineStudio/PipelineVariables/PipelineVariables.module.scss'
import css from '@cd/components/PipelineSteps/Common/Terraform/TerraformStep.module.scss'

export function ConfigVariables(props: TerragruntVariableStepProps): React.ReactElement {
  const { variablesData = {} as TerragruntData, metadataMap, initialValues } = props
  const { getString } = useStrings()

  return (
    <>
      <VariablesListTable
        data={variablesData?.spec?.configuration?.spec}
        originalData={initialValues.spec?.configuration?.spec}
        metadataMap={metadataMap}
        className={pipelineVariableCss.variablePaddingL3}
      />
      {variablesData?.spec?.configuration?.spec?.configFiles?.store?.spec && (
        <>
          <Text className={css.stepTitle}>{getString('pipelineSteps.configFiles')}</Text>
          <VariablesListTable
            data={variablesData?.spec?.configuration?.spec?.configFiles?.store?.spec}
            originalData={initialValues.spec?.configuration?.spec?.configFiles?.store?.spec}
            metadataMap={metadataMap}
            className={pipelineVariableCss.variablePaddingL3}
          />
        </>
      )}
      {variablesData?.spec?.configuration?.spec?.varFiles?.length && (
        <>
          <Text className={css.stepTitle}>{getString('cd.terraformVarFiles')}</Text>
          {variablesData?.spec?.configuration?.spec?.varFiles?.map((varFile, index) => {
            if (varFile?.varFile?.type === 'Inline') {
              return (
                <VariablesListTable
                  key={index}
                  data={variablesData?.spec?.configuration?.spec?.varFiles?.[index]?.varFile?.spec}
                  originalData={
                    initialValues?.spec?.configuration?.spec?.varFiles?.[index]?.varFile?.spec || ({} as any)
                  }
                  metadataMap={metadataMap}
                  className={pipelineVariableCss.variablePaddingL4}
                />
              )
            } else if (varFile?.varFile?.type === 'Remote') {
              const remoteSpec = variablesData?.spec?.configuration?.spec?.varFiles?.[index]?.varFile
                ?.spec as RemoteTerragruntVarFileSpec
              const initVarSpec = initialValues?.spec?.configuration?.spec?.varFiles?.[index]?.varFile
                ?.spec as RemoteTerragruntVarFileSpec
              return (
                <VariablesListTable
                  key={index}
                  data={remoteSpec?.store?.spec}
                  originalData={initVarSpec?.store?.spec || ({} as any)}
                  metadataMap={metadataMap}
                  className={pipelineVariableCss.variablePaddingL4}
                />
              )
            }
          })}
        </>
      )}
    </>
  )
}