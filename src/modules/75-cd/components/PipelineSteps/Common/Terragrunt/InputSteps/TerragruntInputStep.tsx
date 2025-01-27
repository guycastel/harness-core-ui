/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { Fragment } from 'react'
import cx from 'classnames'
import { FormikForm, Label, Text } from '@harness/uicore'
import { get } from 'lodash-es'
import type { FormikContextType } from 'formik'
import { useStrings } from 'framework/strings'
import type { TerraformBackendConfigSpec, TerragruntVarFileWrapper } from 'services/cd-ng'
import List from '@pipeline/components/List/List'
import { MonacoTextField } from '@common/components/MonacoTextField/MonacoTextField'
import MultiTypeFieldSelector from '@common/components/MultiTypeFieldSelector/MultiTypeFieldSelector'
import { isValueRuntimeInput } from '@common/utils/utils'
import { TimeoutFieldInputSetView } from '@pipeline/components/InputSetView/TimeoutFieldInputSetView/TimeoutFieldInputSetView'
import { TextFieldInputSetView } from '@pipeline/components/InputSetView/TextFieldInputSetView/TextFieldInputSetView'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { isExecutionTimeFieldDisabled } from '@pipeline/utils/runPipelineUtils'
import { CommandFlags } from '@pipeline/components/ManifestSelection/ManifestInterface'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import type { TerragruntData, TerragruntProps } from '../TerragruntInterface'
import ConfigInputs from './ConfigSection'
import { TerraformStoreTypes } from '../../Terraform/TerraformInterfaces'
import TgRemoteSection from './TGRemoteSection'
import InlineVarFileInputSet from '../../VarFile/InlineVarFileInputSet'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'
import css from '../../Terraform/TerraformStep.module.scss'

export default function TerragruntInputStep<T extends TerragruntData = TerragruntData>(
  props: TerragruntProps<T> & { formik?: FormikContextType<any> }
): React.ReactElement {
  const { getString } = useStrings()
  const { inputSetData, readonly, path, allowableTypes, stepViewType, onUpdate, onChange } = props
  const { expressions } = useVariablesExpression()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()
  const template = get(inputSetData, 'template')
  const config = get(template, 'spec.configuration')
  /* istanbul ignore next */
  const onUpdateRef = (arg: TerragruntData): void => {
    onUpdate?.(arg as T)
  }
  /* istanbul ignore next */
  const onChangeRef = (arg: TerragruntData): void => {
    onChange?.(arg as T)
  }
  return (
    <FormikForm className={stepCss.inputWidth}>
      {isValueRuntimeInput(get(template, 'timeout')) && (
        <div className={cx(stepCss.formGroup, stepCss.sm)}>
          <TimeoutFieldInputSetView
            label={getString('pipelineSteps.timeoutLabel')}
            name={`${path}.timeout`}
            disabled={readonly}
            multiTypeDurationProps={{
              configureOptionsProps: {
                isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
              },
              allowableTypes,
              expressions,
              disabled: readonly,
              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            }}
            fieldPath={'timeout'}
            template={template}
          />
        </div>
      )}

      {isValueRuntimeInput(get(template, 'spec.provisionerIdentifier')) && (
        <TextFieldInputSetView
          name={`${path}.spec.provisionerIdentifier`}
          placeholder={getString('pipeline.terraformStep.provisionerIdentifier')}
          label={getString('pipelineSteps.provisionerIdentifier')}
          disabled={readonly}
          multiTextInputProps={{
            expressions,
            allowableTypes,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
          }}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
          }}
          fieldPath={'spec.provisionerIdentifier'}
          template={template}
        />
      )}

      {isValueRuntimeInput(get(config, 'spec.moduleConfig.path')) && (
        <TextFieldInputSetView
          placeholder={'Enter path'}
          label={getString('common.path')}
          name={`${path}.spec.configuration.spec.moduleConfig.path`}
          disabled={readonly}
          template={template}
          fieldPath={'spec.configuration.spec.moduleConfig.path'}
          multiTextInputProps={{
            expressions,
            allowableTypes,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
          }}
        />
      )}

      <ConfigInputs {...props} onUpdate={onUpdateRef} onChange={onChangeRef} />

      {get(config, 'spec.varFiles')?.length && <Label className={css.label}>{getString('cd.terraformVarFiles')}</Label>}

      {get(config, 'spec.varFiles')?.map((varFile: TerragruntVarFileWrapper, index: number) => {
        if (varFile.varFile?.type === TerraformStoreTypes.Inline) {
          return (
            <InlineVarFileInputSet<TerragruntVarFileWrapper>
              readonly={readonly}
              stepViewType={stepViewType}
              allowableTypes={allowableTypes}
              varFilePath={`${path}.spec.configuration.spec.varFiles[${index}]`}
              inlineVarFile={varFile}
            />
          )
        } else if (varFile.varFile?.type === TerraformStoreTypes.Remote) {
          return (
            <TgRemoteSection
              remoteVar={varFile}
              index={index}
              {...props}
              onUpdate={onUpdateRef}
              onChange={onChangeRef}
            />
          )
        }
        return <></>
      })}

      {isValueRuntimeInput(get(config, 'spec.workspace')) && (
        <TextFieldInputSetView
          name={`${path}.spec.configuration.spec.workspace`}
          placeholder={getString('pipeline.terraformStep.workspace')}
          label={getString('pipelineSteps.workspace')}
          disabled={readonly}
          multiTextInputProps={{
            expressions,
            allowableTypes,
            newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
          }}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
          }}
          template={template}
          fieldPath={`spec.configuration.spec.workspace`}
        />
      )}

      {isValueRuntimeInput((config?.spec?.backendConfig?.spec as TerraformBackendConfigSpec)?.content) && (
        <div
          onKeyDown={
            /* istanbul ignore next */ e => {
              e.stopPropagation()
            }
          }
        >
          <MultiTypeFieldSelector
            name={`${path}.spec.configuration.spec.backendConfig.spec.content`}
            label={getString('cd.backEndConfig')}
            defaultValueToReset=""
            allowedTypes={allowableTypes}
            skipRenderValueInExpressionLabel
            disabled={readonly}
            configureOptionsProps={{
              isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
            }}
            expressionRender={
              /* istanbul ignore next */ () => {
                return (
                  <MonacoTextField
                    name={`${path}.spec.configuration.spec.backendConfig.spec.content`}
                    expressions={expressions}
                    height={300}
                    disabled={readonly}
                    fullScreenAllowed
                    fullScreenTitle={getString('cd.backEndConfig')}
                  />
                )
              }
            }
          >
            <MonacoTextField
              name={`${path}.spec.configuration.spec.backendConfig.spec.content`}
              expressions={expressions}
              height={300}
              fullScreenAllowed
              fullScreenTitle={getString('cd.backEndConfig')}
            />
          </MultiTypeFieldSelector>
        </div>
      )}

      <ConfigInputs {...props} isBackendConfig={true} onUpdate={onUpdateRef} onChange={onChangeRef} />

      {isValueRuntimeInput(get(config, 'spec.targets') as string) && (
        <List
          name={`${path}.spec.configuration.spec.targets`}
          label={<Text style={{ display: 'flex', alignItems: 'center' }}>{getString('pipeline.targets.title')}</Text>}
          disabled={readonly}
          style={{ marginBottom: 'var(--spacing-small)' }}
          expressions={expressions}
          isNameOfArrayType
        />
      )}

      {config?.commandFlags?.map((terragruntCommandFlag: CommandFlags, terragruntFlagIdx: number) => {
        if (isValueRuntimeInput(get(config, `commandFlags[${terragruntFlagIdx}].flag`))) {
          return (
            <Fragment key={terragruntFlagIdx}>
              <Label className={css.label}>{getString('cd.commandLineOptions')}</Label>
              <TextFieldInputSetView
                name={`${path}.spec.configuration.commandFlags[${terragruntFlagIdx}].flag`}
                multiTextInputProps={{
                  expressions,
                  allowableTypes,
                  newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                }}
                label={`${terragruntCommandFlag.commandType}: ${getString('flag')}`}
                fieldPath={`spec.configuration.commandFlags[${terragruntFlagIdx}].flag`}
                template={template}
              />
            </Fragment>
          )
        }
      })}
    </FormikForm>
  )
}
