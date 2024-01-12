/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { FormikContextType } from 'formik'
import { get } from 'lodash-es'
import { useParams } from 'react-router-dom'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { isExecutionTimeFieldDisabled } from '@pipeline/utils/runPipelineUtils'
import { useStrings } from 'framework/strings'
import { isValueRuntimeInput } from '@common/utils/utils'
import { TextFieldInputSetView } from '@modules/70-pipeline/components/InputSetView/TextFieldInputSetView/TextFieldInputSetView'
import { FormMultiTypeConnectorField } from '@modules/27-platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { Connectors } from '@modules/27-platform/connectors/constants'
import { useGitScope } from '@modules/70-pipeline/utils/CIUtils'
import { RegisterCatalogStepData, RegisterCatalogStepEditProps } from './types'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

export default function RegisterCatalogStepInputSet(
  props: RegisterCatalogStepEditProps & { formik?: FormikContextType<RegisterCatalogStepData> }
): React.ReactElement {
  const { template, path, readonly, stepViewType, allowableTypes } = props
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
  }>()
  const gitScope = useGitScope()

  return (
    <>
      {isValueRuntimeInput(get(template, 'spec.organization')) && (
        <TextFieldInputSetView
          name={`${path}.spec.organization`}
          label={getString('orgLabel')}
          disabled={readonly}
          multiTextInputProps={{
            allowableTypes,
            expressions
          }}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
          }}
          placeholder={getString('pipeline.artifactsSelection.organizationPlaceholder')}
          fieldPath="spec.organization"
          template={template}
          className={cx(stepCss.formGroup, stepCss.md)}
        />
      )}

      {isValueRuntimeInput(get(template, 'spec.connectorRef')) && (
        <FormMultiTypeConnectorField
          accountIdentifier={accountId}
          projectIdentifier={projectIdentifier}
          orgIdentifier={orgIdentifier}
          type={Connectors.GITHUB}
          setRefValue
          name={`${path}.spec.connectorRef`}
          label={getString('platform.connectors.selectConnector')}
          enableConfigureOptions={false}
          placeholder={getString('select')}
          disabled={readonly}
          multiTypeProps={{ allowableTypes, expressions }}
          gitScope={gitScope}
        />
      )}

      {isValueRuntimeInput(get(template, 'spec.project')) && (
        <TextFieldInputSetView
          name={`${path}.spec.project`}
          label={getString('projectLabel')}
          disabled={readonly}
          multiTextInputProps={{
            allowableTypes,
            expressions
          }}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
          }}
          placeholder={getString('pipeline.artifactsSelection.projectPlaceholder')}
          fieldPath="spec.project"
          template={template}
          className={cx(stepCss.formGroup, stepCss.md)}
        />
      )}
      {isValueRuntimeInput(get(template, 'spec.workspace')) && (
        <TextFieldInputSetView
          name={`${path}.spec.workspace`}
          label={getString('pipelineSteps.workspace')}
          disabled={readonly}
          multiTextInputProps={{
            allowableTypes,
            expressions
          }}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
          }}
          placeholder={getString('pipeline.terraformStep.workspacePlaceholder')}
          fieldPath="spec.workspace"
          template={template}
          className={cx(stepCss.formGroup, stepCss.md)}
        />
      )}

      {isValueRuntimeInput(get(template, 'spec.repository')) && (
        <TextFieldInputSetView
          name={`${path}.spec.repository`}
          label={getString('common.repositoryName')}
          disabled={readonly}
          multiTextInputProps={{
            allowableTypes,
            expressions
          }}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
          }}
          placeholder={getString('pipeline.manifestType.repoNamePlaceholder')}
          fieldPath="spec.repository"
          template={template}
          className={cx(stepCss.formGroup, stepCss.md)}
        />
      )}
      {isValueRuntimeInput(get(template, 'spec.filePath')) && (
        <TextFieldInputSetView
          name={`${path}.spec.filePath`}
          label={getString('common.git.filePath')}
          disabled={readonly}
          multiTextInputProps={{
            allowableTypes,
            expressions
          }}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
          }}
          placeholder={getString('pipeline.manifestType.pathPlaceholder')}
          fieldPath="spec.filePath"
          template={template}
          className={cx(stepCss.formGroup, stepCss.md)}
        />
      )}
      {isValueRuntimeInput(get(template, 'spec.branch')) && (
        <TextFieldInputSetView
          name={`${path}.spec.branch`}
          label={getString('common.git.branchName')}
          disabled={readonly}
          multiTextInputProps={{
            allowableTypes,
            expressions
          }}
          configureOptionsProps={{
            isExecutionTimeFieldDisabled: isExecutionTimeFieldDisabled(stepViewType)
          }}
          placeholder={getString('pipeline.manifestType.branchPlaceholder')}
          fieldPath="spec.branch"
          template={template}
          className={cx(stepCss.formGroup, stepCss.md)}
        />
      )}
    </>
  )
}
