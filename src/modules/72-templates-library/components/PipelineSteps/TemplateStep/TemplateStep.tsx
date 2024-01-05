/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import type { FormikErrors } from 'formik'
import type { IconName } from '@harness/uicore'
import { parse } from 'yaml'
import { defaultTo, get } from 'lodash-es'
import { CompletionItemKind } from 'vscode-languageserver-types'
import { StepProps, StepViewType, ValidateInputSetProps } from '@pipeline/components/AbstractSteps/Step'
import { PipelineStep } from '@pipeline/components/PipelineSteps/PipelineStep'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import TemplateInputSetStep from '@templates-library/components/PipelineSteps/TemplateStep/TemplateInputSetStep'
import type { CompletionItemInterface } from '@common/interfaces/YAMLBuilderProps'
import { loggerFor } from 'framework/logging/logging'
import { ModuleName } from 'framework/types/ModuleName'
import { Scope } from '@common/interfaces/SecretsInterface'
import { getTemplateListPromise, TemplateSummaryResponse } from 'services/template-ng'
import { TemplateListType } from '@templates-library/pages/TemplatesPage/TemplatesPageUtils'
import { TemplateType } from '@templates-library/utils/templatesUtils'
import stepFactory from '@pipeline/components/PipelineSteps/PipelineStepFactory'
import type { TemplateStepNode } from 'services/pipeline-ng'
import type { StepElementConfig } from 'services/cd-ng'
import { StepWidget } from '@pipeline/components/AbstractSteps/StepWidget'
import { TemplateStepWidgetProps, TemplateStepWidgetWithRef } from './TemplateStepWidget/TemplateStepWidget'

const logger = loggerFor(ModuleName.TEMPLATES)

export const TemplateRegex = /^.+step\.template\.templateRef$/
export const VersionLabelRegex = /^.+step\.template\.versionLabel$/

const getTemplateValue = (template: TemplateSummaryResponse): string => {
  if (template.projectIdentifier) {
    return `${template.identifier}`
  } else if (template.orgIdentifier) {
    return `${Scope.ORG}.${template.identifier}`
  } else {
    return `${Scope.ACCOUNT}.${template.identifier}`
  }
}

const getTemplateName = (template: TemplateSummaryResponse): string => {
  const templateType = defaultTo(template.childType, '')
  if (template.projectIdentifier) {
    return `${templateType}: ${template.name}`
  } else if (template.orgIdentifier) {
    return `${templateType}['Org']: ${template.name}`
  } else {
    return `${templateType}['Account']: ${template.name}`
  }
}

export class TemplateStep extends PipelineStep<TemplateStepNode> {
  protected invocationMap: Map<
    RegExp,
    (path: string, yaml: string, params: Record<string, unknown>) => Promise<CompletionItemInterface[]>
  > = new Map()
  constructor() {
    super()
    this.invocationMap.set(TemplateRegex, this.getTemplatesListForYaml.bind(this))
    this.invocationMap.set(VersionLabelRegex, this.getVersionsListForYaml.bind(this))
    this._hasStepVariables = true
  }

  protected type = StepType.Template
  protected stepName = 'Template step'
  protected stepIcon: IconName = 'template-library'

  protected defaultValues: TemplateStepNode = {
    identifier: '',
    name: '',
    template: {} as any
  }

  protected getTemplatesListForYaml(
    _path: string,
    _yaml: string,
    params: Record<string, unknown>
  ): Promise<CompletionItemInterface[]> {
    const { accountId, projectIdentifier, orgIdentifier } = params as {
      accountId: string
      orgIdentifier: string
      projectIdentifier: string
    }
    return getTemplateListPromise({
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        includeAllTemplatesAvailableAtScope: true,
        templateListType: TemplateListType.Stable
      },
      body: { templateEntityTypes: [TemplateType.Step], filterType: 'Template' }
    }).then(response => {
      return defaultTo(
        response?.data?.content?.map(template => ({
          label: getTemplateName(template),
          insertText: getTemplateValue(template),
          kind: CompletionItemKind.Field
        })),
        []
      )
    })
  }

  protected getVersionsListForYaml(
    path: string,
    yaml: string,
    params: Record<string, unknown>
  ): Promise<CompletionItemInterface[]> {
    let pipelineObj
    try {
      pipelineObj = parse(yaml)
    } catch (err) {
      /* istanbul ignore next */
      logger.error('Error while parsing the yaml', err)
    }
    const { accountId, projectIdentifier, orgIdentifier } = params as {
      accountId: string
      orgIdentifier: string
      projectIdentifier: string
    }
    const templateIdentifier = get(pipelineObj, path.replace('versionLabel', 'templateRef'))
    return getTemplateListPromise({
      queryParams: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        includeAllTemplatesAvailableAtScope: true,
        templateListType: TemplateListType.All
      },
      body: {
        templateEntityTypes: [TemplateType.Step],
        filterType: 'Template',
        templateIdentifiers: [templateIdentifier]
      }
    }).then(response => {
      return defaultTo(
        response?.data?.content?.map(template => ({
          label: defaultTo(template.versionLabel, ''),
          insertText: defaultTo(template.versionLabel, ''),
          kind: CompletionItemKind.Field
        })),
        []
      )
    })
  }

  validateInputSet({
    data: data,
    template: template,
    getString: getString,
    viewType: viewType
  }: ValidateInputSetProps<TemplateStepNode>): FormikErrors<TemplateStepNode> {
    const stepType = (data.template.templateInputs as StepElementConfig)?.type
    const step = stepFactory.getStep(stepType)
    if (step) {
      return step.validateInputSet({
        data: data.template.templateInputs,
        template: template?.template?.templateInputs,
        getString,
        viewType
      })
    }
    return {}
  }

  processFormData(values: TemplateStepNode): TemplateStepNode {
    return values //processFormData(values)
  }

  renderStep(
    this: TemplateStep,
    props: StepProps<TemplateStepNode, TemplateStepWidgetProps['customStepProps']>
  ): JSX.Element {
    const {
      initialValues,
      onUpdate,
      stepViewType,
      formikRef,
      isNewStep,
      readonly,
      factory,
      inputSetData,
      allowableTypes,
      customStepProps
    } = props

    if (this.isTemplatizedView(stepViewType)) {
      return (
        <TemplateInputSetStep
          initialValues={initialValues}
          onUpdate={data => onUpdate?.(this.processFormData(data))}
          stepViewType={stepViewType}
          readonly={!!inputSetData?.readonly}
          template={inputSetData?.template}
          path={inputSetData?.path || ''}
          allowableTypes={allowableTypes}
        />
      )
    } else if (stepViewType === StepViewType.InputVariable) {
      return (
        <StepWidget<StepElementConfig>
          factory={factory}
          initialValues={initialValues.template?.templateInputs as StepElementConfig}
          allowableTypes={allowableTypes}
          type={(initialValues.template?.templateInputs as StepElementConfig)?.type as StepType}
          stepViewType={stepViewType}
          onUpdate={onUpdate}
          readonly={readonly}
          customStepProps={customStepProps}
        />
      )
    }
    return (
      <TemplateStepWidgetWithRef
        ref={formikRef}
        stepViewType={stepViewType}
        initialValues={initialValues}
        onUpdate={data => onUpdate?.(this.processFormData(data))}
        isNewStep={isNewStep}
        readonly={readonly}
        factory={factory}
        allowableTypes={allowableTypes}
        customStepProps={customStepProps}
      />
    )
  }
}
