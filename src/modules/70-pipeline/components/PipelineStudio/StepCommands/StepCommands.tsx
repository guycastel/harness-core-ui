import React from 'react'
import { ButtonSize, ButtonVariation, Color, Container, Tab, Tabs } from '@wings-software/uicore'
import { Expander } from '@blueprintjs/core'
import cx from 'classnames'
import type { FormikProps } from 'formik'
import { isEmpty, noop } from 'lodash-es'
import { useStrings } from 'framework/strings'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import { StepWidgetWithFormikRef } from '@pipeline/components/AbstractSteps/StepWidget'
import { AdvancedStepsWithRef } from '@pipeline/components/PipelineSteps/AdvancedSteps/AdvancedSteps'
import type { PipelineStep } from '@pipeline/components/PipelineSteps/PipelineStep'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { StageType } from '@pipeline/utils/stageHelpers'
import type { StepElementConfig } from 'services/cd-ng'
import type { TemplateStepData } from '@pipeline/utils/tempates'
import RbacButton from '@rbac/components/Button/Button'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { TemplateBar } from '@pipeline/components/PipelineStudio/StepCommands/TemplateBar/TemplateBar'
import useCurrentModule from '@common/hooks/useCurrentModule'
import { ModuleName } from 'framework/types/ModuleName'
import { StepCommandsProps, StepCommandsViews } from './StepCommandTypes'
import css from './StepCommands.module.scss'

export type StepFormikRef<T = unknown> = {
  isDirty(): FormikProps<T>['dirty'] | undefined
  submitForm: FormikProps<T>['submitForm']
  getErrors(): FormikProps<T>['errors']
  setFieldError(key: string, error: string): void
  getValues(): T
  resetForm: FormikProps<T>['resetForm']
}

export type StepCommandsRef<T = unknown> =
  | ((instance: StepFormikRef<T> | null) => void)
  | React.MutableRefObject<StepFormikRef<T> | null>
  | null

enum StepCommandTabs {
  StepConfiguration = 'StepConfiguration',
  Advanced = 'Advanced'
}

export function StepCommands(
  props: StepCommandsProps & { checkDuplicateStep?: () => boolean },
  ref: StepCommandsRef
): React.ReactElement {
  const {
    step,
    onChange,
    onUpdate,
    onUseTemplate,
    onSaveAsTemplate,
    onRemoveTemplate,
    isStepGroup,
    isReadonly,
    stepsFactory,
    hiddenPanels,
    checkDuplicateStep,
    hasStepGroupAncestor,
    withoutTabs,
    isNewStep = true,
    stageType = StageType.DEPLOY,
    stepViewType,
    className = '',
    viewType,
    allowableTypes
  } = props
  const { getString } = useStrings()
  const templatesEnabled = useFeatureFlag(FeatureFlag.NG_TEMPLATES)
  const [activeTab, setActiveTab] = React.useState(StepCommandTabs.StepConfiguration)
  const stepRef = React.useRef<FormikProps<unknown> | null>(null)
  const advancedConfRef = React.useRef<FormikProps<unknown> | null>(null)
  const isTemplateStep = !!(step as TemplateStepData)?.template

  const { isModule } = useCurrentModule()

  async function handleTabChange(newTab: StepCommandTabs, prevTab: StepCommandTabs): Promise<void> {
    if (prevTab === StepCommandTabs.StepConfiguration && stepRef.current) {
      if (checkDuplicateStep?.()) {
        return Promise.resolve()
      }
      // please do not remove the await below.
      // This is required for errors to be populated correctly
      await stepRef.current.submitForm()

      if (isEmpty(stepRef.current.errors)) {
        setActiveTab(newTab)
      }
    } else if (prevTab === StepCommandTabs.Advanced && advancedConfRef.current) {
      // please do not remove the await below.
      // This is required for errors to be populated correctly
      await advancedConfRef.current.submitForm()

      if (isEmpty(advancedConfRef.current.errors)) {
        setActiveTab(newTab)
      }
    }
  }

  const stepType: StepType = isStepGroup
    ? StepType.StepGroup
    : isTemplateStep
    ? StepType.Template
    : ((step as StepElementConfig).type as StepType)

  React.useImperativeHandle(ref, () => ({
    setFieldError(fieldName: string, error: string) {
      if (activeTab === StepCommandTabs.StepConfiguration && stepRef.current) {
        stepRef.current.setFieldError(fieldName, error)
      }
    },
    isDirty() {
      if (activeTab === StepCommandTabs.StepConfiguration && stepRef.current) {
        return stepRef.current.dirty
      }

      if (activeTab === StepCommandTabs.Advanced && advancedConfRef.current) {
        return advancedConfRef.current.dirty
      }
    },
    submitForm() {
      if (activeTab === StepCommandTabs.StepConfiguration && stepRef.current) {
        return stepRef.current.submitForm()
      }

      if (activeTab === StepCommandTabs.Advanced && advancedConfRef.current) {
        return advancedConfRef.current.submitForm()
      }
    },
    getErrors() {
      return activeTab === StepCommandTabs.StepConfiguration && stepRef.current
        ? stepRef.current.errors
        : activeTab === StepCommandTabs.Advanced && advancedConfRef.current
        ? advancedConfRef.current.errors
        : {}
    },
    getValues() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stepObj = isStepGroup
        ? (stepsFactory.getStep(StepType.StepGroup) as PipelineStep<any>)
        : stepType === StepType.Template
        ? (stepsFactory.getStep(StepType.Template) as PipelineStep<any>)
        : (stepsFactory.getStep((step as StepElementConfig).type) as PipelineStep<any>)
      return activeTab === StepCommandTabs.StepConfiguration && stepRef.current
        ? stepObj.processFormData(stepRef.current.values)
        : activeTab === StepCommandTabs.Advanced && advancedConfRef.current
        ? advancedConfRef.current.values
        : {}
    },
    resetForm() {
      if (activeTab === StepCommandTabs.StepConfiguration && stepRef.current) {
        return stepRef.current?.resetForm()
      }
      if (activeTab === StepCommandTabs.Advanced && advancedConfRef.current) {
        return advancedConfRef.current.resetForm()
      }
      return noop
    }
  }))

  const getStepWidgetWithFormikRef = () => {
    return (
      <StepWidgetWithFormikRef
        factory={stepsFactory}
        initialValues={step}
        readonly={isReadonly}
        isNewStep={isNewStep}
        onChange={onChange}
        onUpdate={onUpdate}
        type={stepType}
        stepViewType={stepViewType}
        ref={stepRef}
        allowableTypes={allowableTypes}
      />
    )
  }

  if (withoutTabs) {
    return <div className={cx(css.stepCommand, css.withoutTabs)}>{getStepWidgetWithFormikRef()}</div>
  }

  return (
    <div className={cx(css.stepCommand, className)}>
      {stepType === StepType.Template ? (
        <>
          <TemplateBar step={step} onChangeTemplate={onUseTemplate} onRemoveTemplate={onRemoveTemplate} />
          <Container padding={'large'}>{getStepWidgetWithFormikRef()}</Container>
        </>
      ) : (
        <div className={cx(css.stepTabs, { stepTabsAdvanced: activeTab === StepCommandTabs.Advanced })}>
          <Tabs id="step-commands" selectedTabId={activeTab} onChange={handleTabChange}>
            <Tab
              id={StepCommandTabs.StepConfiguration}
              title={isStepGroup ? getString('stepGroupConfiguration') : getString('stepConfiguration')}
              panel={getStepWidgetWithFormikRef()}
            />
            {!isModule(ModuleName.CF) && (
              <Tab
                id={StepCommandTabs.Advanced}
                title={getString('advancedTitle')}
                panel={
                  <AdvancedStepsWithRef
                    step={step}
                    isReadonly={isReadonly}
                    stepsFactory={stepsFactory}
                    allowableTypes={allowableTypes}
                    onChange={onChange}
                    onUpdate={onUpdate}
                    hiddenPanels={hiddenPanels}
                    isStepGroup={isStepGroup}
                    hasStepGroupAncestor={hasStepGroupAncestor}
                    ref={advancedConfRef}
                    stageType={stageType}
                    stepType={stepType}
                  />
                }
              />
            )}

            {templatesEnabled && !isStepGroup && viewType === StepCommandsViews.Pipeline ? (
              <>
                <Expander />
                <div>
                  <RbacButton
                    text={getString('common.useTemplate')}
                    variation={ButtonVariation.SECONDARY}
                    size={ButtonSize.SMALL}
                    icon="template-library"
                    iconProps={{ size: 12 }}
                    onClick={() => {
                      onUseTemplate?.(step)
                    }}
                    margin={{ right: 'small' }}
                    permission={{
                      permission: PermissionIdentifier.ACCESS_TEMPLATE,
                      resource: {
                        resourceType: ResourceType.TEMPLATE
                      }
                    }}
                  />
                  <RbacButton
                    withoutCurrentColor
                    variation={ButtonVariation.ICON}
                    icon="upload-box"
                    iconProps={{ color: Color.PRIMARY_7 }}
                    size={ButtonSize.SMALL}
                    onClick={() => onSaveAsTemplate?.(step)}
                    className={css.saveButton}
                    permission={{
                      permission: PermissionIdentifier.EDIT_TEMPLATE,
                      resource: {
                        resourceType: ResourceType.TEMPLATE
                      }
                    }}
                  />
                </div>
              </>
            ) : null}
          </Tabs>
        </div>
      )}
    </div>
  )
}

export const StepCommandsWithRef = React.forwardRef(StepCommands)
