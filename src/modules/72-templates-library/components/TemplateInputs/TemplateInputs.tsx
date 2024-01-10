/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import {
  Container,
  MultiTypeInputType,
  Text,
  Layout,
  Formik,
  PageError,
  AllowedTypesWithRunTime
} from '@harness/uicore'
import { parse } from 'yaml'
import { Color } from '@harness/design-system'
import { defaultTo, noop } from 'lodash-es'
import type { UseGetReturn } from 'restful-react'
import type {
  Failure,
  GetTemplateInputSetYamlQueryParams,
  ResponseString,
  TemplateSummaryResponse,
  TemplateResponse
} from 'services/template-ng'
import useRBACError, { RBACError } from '@rbac/utils/useRBACError/useRBACError'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { PageSpinner, useToaster } from '@common/components'
import {
  SecretManagerTemplateInputSet,
  ScriptVariablesRuntimeInput
} from '@secrets/components/ScriptVariableRuntimeInput/ScriptVariablesRuntimeInput'
import type {
  StageElementConfig,
  StepElementConfig,
  PipelineInfoConfig,
  StepGroupElementConfig
} from 'services/pipeline-ng'
import type { NGTemplateInfoConfigWithGitDetails } from 'framework/Templates/TemplateConfigModal/TemplateConfigModal'
import { useStrings } from 'framework/strings'
import { DeploymentConfigRuntimeInputs } from '@pipeline/components/DeploymentConfigRuntimeInputs/DeploymentConfigRuntimeInputs'
import {
  ArtifactSourceConfigDetails,
  ArtifactSourceConfigRuntimeInputs
} from '@pipeline/components/ArtifactSourceConfigRuntimeInputs/ArtifactSourceConfigRuntimeInputs'
import { PipelineInputSetFormInternal, StageForm } from '@pipeline/components/PipelineInputSetForm/PipelineInputSetForm'
import type { DeploymentConfig } from '@pipeline/components/PipelineStudio/PipelineVariables/types'
import { TemplateType } from '@templates-library/utils/templatesUtils'
import NoResultsView from '@templates-library/pages/TemplatesPage/views/NoResultsView/NoResultsView'
import { getTemplateNameWithLabel } from '@pipeline/utils/templateUtils'
import { StepForm } from '@pipeline/components/PipelineInputSetForm/StepInputSetForm'
import { StepGroupForm } from '@pipeline/components/PipelineInputSetForm/StepGroupInputSetForm'
import css from './TemplateInputs.module.scss'

export interface TemplateInputsProps {
  template: TemplateSummaryResponse | NGTemplateInfoConfigWithGitDetails
  templateInputSetFetchParams: UseGetReturn<
    ResponseString,
    Failure | Error,
    GetTemplateInputSetYamlQueryParams,
    unknown
  >
  shouldUtilizeFullWidth?: boolean
}

type TemplateInputsFormData =
  | StepElementConfig
  | StageElementConfig
  | PipelineInfoConfig
  | SecretManagerTemplateInputSet
  | DeploymentConfig
  | ArtifactSourceConfigDetails
  | StepGroupElementConfig

export const TemplateInputs: React.FC<TemplateInputsProps> = ({
  template,
  templateInputSetFetchParams,
  shouldUtilizeFullWidth
}) => {
  const templateSpec =
    parse((template as TemplateSummaryResponse).yaml || '')?.template?.spec ||
    (template as NGTemplateInfoConfigWithGitDetails).spec
  const resolvedTemplateSpec =
    parse((template as TemplateResponse).mergedYaml || '')?.template?.spec ||
    (template as NGTemplateInfoConfigWithGitDetails).spec
  const [inputSetTemplate, setInputSetTemplate] = React.useState<
    StepElementConfig | StageElementConfig | PipelineInfoConfig | DeploymentConfig | StepGroupElementConfig
  >()
  const { showError } = useToaster()
  const { getRBACErrorMessage } = useRBACError()
  const { getString } = useStrings()
  const allowableTypes = [
    MultiTypeInputType.FIXED,
    MultiTypeInputType.EXPRESSION,
    MultiTypeInputType.RUNTIME
  ] as AllowedTypesWithRunTime[]
  const templateEntityType =
    (template as TemplateSummaryResponse).templateEntityType || (template as NGTemplateInfoConfigWithGitDetails).type

  const { data: templateInputYaml, error: inputSetError, refetch, loading } = templateInputSetFetchParams

  React.useEffect(() => {
    try {
      const templateInput = parse(templateInputYaml?.data || '')
      setInputSetTemplate(templateInput)
    } catch (error) {
      showError(getRBACErrorMessage(error as RBACError), undefined, 'template.parse.inputSet.error')
    }
  }, [templateInputYaml])

  React.useEffect(() => {
    if (loading) {
      setInputSetTemplate(undefined)
    }
  }, [loading])

  return (
    <Container
      style={{ overflow: 'auto' }}
      padding={{ top: 'xlarge', left: 'xxlarge', right: 'xxlarge' }}
      className={css.container}
    >
      <Layout.Vertical>
        {loading && <PageSpinner />}
        {!loading && inputSetError && (
          <Container height={300}>
            <PageError
              message={defaultTo((inputSetError.data as Error)?.message, inputSetError.message)}
              onClick={() => refetch()}
            />
          </Container>
        )}
        {!loading && !inputSetError && !inputSetTemplate && (
          <Container flex height={300}>
            <NoResultsView minimal={true} text={getString('templatesLibrary.noInputsRequired')} />
          </Container>
        )}
        {!loading && !inputSetError && inputSetTemplate && (
          <Container className={css.inputsContainer}>
            <Layout.Vertical spacing={'xlarge'}>
              <Text font={{ size: 'normal', weight: 'bold' }} color={Color.GREY_800}>
                {getTemplateNameWithLabel(template)}
              </Text>
              <Formik<{
                data: TemplateInputsFormData
              }>
                onSubmit={noop}
                initialValues={{ data: templateSpec }}
                formName="templateInputs"
                enableReinitialize={true}
              >
                {formikProps => {
                  return (
                    <>
                      {templateEntityType === TemplateType.Pipeline && (
                        <PipelineInputSetFormInternal
                          template={inputSetTemplate as PipelineInfoConfig}
                          originalPipeline={resolvedTemplateSpec as PipelineInfoConfig}
                          path={'data'}
                          viewType={StepViewType.TemplateUsage}
                          readonly={true}
                          allowableTypes={allowableTypes}
                          viewTypeMetadata={{ isTemplateDetailDrawer: true }}
                        />
                      )}
                      {templateEntityType === TemplateType.Stage && (
                        <StageForm
                          template={{ stage: inputSetTemplate as StageElementConfig }}
                          allValues={{ stage: resolvedTemplateSpec as StageElementConfig }}
                          path={'data'}
                          viewType={StepViewType.TemplateUsage}
                          readonly={true}
                          allowableTypes={allowableTypes}
                          hideTitle={true}
                          stageClassName={css.stageCard}
                        />
                      )}
                      {templateEntityType === TemplateType.Step && (
                        <Container
                          className={css.inputsCard}
                          background={Color.WHITE}
                          padding={'large'}
                          margin={{ bottom: 'xxlarge' }}
                        >
                          <StepForm
                            template={{ step: inputSetTemplate as StepElementConfig }}
                            allValues={{ step: formikProps.values.data as StepElementConfig }}
                            path={'data'}
                            viewType={StepViewType.TemplateUsage}
                            readonly={true}
                            allowableTypes={allowableTypes}
                            hideTitle={true}
                            onUpdate={noop}
                          />
                        </Container>
                      )}
                      {templateEntityType === TemplateType.SecretManager && (
                        <ScriptVariablesRuntimeInput
                          template={inputSetTemplate as SecretManagerTemplateInputSet['templateInputs']}
                          allowableTypes={[]}
                          readonly
                          enabledExecutionDetails
                          path={'data'}
                        />
                      )}
                      {templateEntityType === TemplateType.CustomDeployment && (
                        <Container
                          className={css.inputsCard}
                          background={Color.WHITE}
                          padding={'large'}
                          margin={{ bottom: 'xxlarge' }}
                        >
                          <DeploymentConfigRuntimeInputs
                            template={inputSetTemplate as DeploymentConfig}
                            allowableTypes={allowableTypes}
                            readonly
                            path={'data'}
                          />
                        </Container>
                      )}
                      {templateEntityType === TemplateType.ArtifactSource && (
                        <Container
                          className={css.inputsCard}
                          background={Color.WHITE}
                          padding={'large'}
                          margin={{ bottom: 'xxlarge' }}
                        >
                          <ArtifactSourceConfigRuntimeInputs
                            template={inputSetTemplate as ArtifactSourceConfigDetails}
                            allValues={formikProps.values?.data as ArtifactSourceConfigDetails}
                            allowableTypes={allowableTypes}
                            readonly
                            path={'data'}
                            shouldUtilizeFullWidth={shouldUtilizeFullWidth}
                          />
                        </Container>
                      )}
                      {templateEntityType === TemplateType.StepGroup && (
                        <Container
                          className={css.inputsCard}
                          background={Color.WHITE}
                          padding={'large'}
                          margin={{ bottom: 'xxlarge' }}
                        >
                          <StepGroupForm
                            template={inputSetTemplate as StepGroupElementConfig}
                            allValues={formikProps.values?.data}
                            path={'data'}
                            viewType={StepViewType.TemplateUsage}
                            readonly={true}
                            allowableTypes={allowableTypes}
                            values={formikProps.values?.data}
                            formik={formikProps}
                          />
                        </Container>
                      )}
                    </>
                  )
                }}
              </Formik>
            </Layout.Vertical>
          </Container>
        )}
      </Layout.Vertical>
    </Container>
  )
}
