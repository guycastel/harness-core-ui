/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { isEmpty, get } from 'lodash-es'
import { useParams } from 'react-router-dom'
import cx from 'classnames'
import type { FormikProps } from 'formik'
import { FormInput, Text, Container, AllowedTypes } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { MultiTypeTextField, MultiTypeTextProps } from '@common/components/MultiTypeText/MultiTypeText'
import MultiTypeList from '@common/components/MultiTypeList/MultiTypeList'
import { FormMultiTypeCheckboxField, FormMultiTypeTextAreaField } from '@common/components'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import {
  useGitScope,
  shouldRenderRunTimeInputViewWithAllowedValues,
  getConnectorRefWidth,
  isRuntimeInput,
  CodebaseTypes
} from '@pipeline/utils/CIUtils'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { useStrings } from 'framework/strings'
import type { StringsMap } from 'stringTypes'
import { runtimeInputGearWidth } from '@pipeline/components/PipelineStudio/RightBar/RightBarUtils'
import type { ConfigureOptionsProps } from '@common/components/ConfigureOptions/ConfigureOptions'
import CloneCodebaseForm from '@modules/70-pipeline/components/PipelineStudio/CloneCodebaseForm/CloneCodebaseForm'
import {
  AllMultiTypeInputTypesForInputSet,
  AllMultiTypeInputTypesForStep,
  SupportedInputTypesForListItems,
  SupportedInputTypesForListTypeField,
  SupportedInputTypesForListTypeFieldInInputSetView,
  RenderBuild,
  renderBuildTypeInputField,
  renderOptionalWrapper
} from './StepUtils'
import { renderMultiTypeInputWithAllowedValues, renderMultiTypeListInputSet } from './CIStepOptionalConfig'
import css from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

interface CIStepProps {
  isNewStep?: boolean
  readonly?: boolean
  stepLabel?: string
  enableFields: {
    [key: string]: { [key: string]: any }
  }
  formik?: FormikProps<any>
  stepViewType: StepViewType
  path?: string
  isInputSetView?: boolean
  allowableTypes?: AllowedTypes
  template?: Record<string, any>
}

export const CIStep: React.FC<CIStepProps> = props => {
  const { isNewStep, readonly, stepLabel, enableFields, stepViewType, path, isInputSetView, formik, template } = props
  const { accountId, projectIdentifier, orgIdentifier, triggerIdentifier } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
    triggerIdentifier: string
  }>()

  const { getString } = useStrings()
  const gitScope = useGitScope()
  const { expressions } = useVariablesExpression()
  const prefix = isEmpty(path) ? '' : `${path}.`
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const { CODE_ENABLED } = useFeatureFlags()

  const stepCss = stepViewType === StepViewType.DeploymentForm ? css.sm : css.lg
  // connectorAndRepoName inherently has margin
  const connectorAndRepoNameCss =
    isRuntimeInput(formik?.values?.spec?.connectorRef) || isRuntimeInput(formik?.values?.spec?.repoName)
      ? css.bottomMargin2
      : css.bottomMargin5
  const isTemplateConnectorRefPanel = isInputSetView && template?.spec?.connectorRef
  // build or build.type as runtime inherently has margin
  const buildCss =
    isRuntimeInput(formik?.values?.spec?.build) || isRuntimeInput(formik?.values?.spec?.build?.type)
      ? css.bottomMargin2
      : css.bottomMargin5

  const renderMultiTypeTextField = React.useCallback(
    ({
      name,
      tooltipId,
      labelKey,
      inputProps,
      fieldPath,
      optional,
      configureOptionsProps
    }: {
      name: string
      tooltipId: string
      labelKey: keyof StringsMap
      inputProps: MultiTypeTextProps['multiTextInputProps']
      fieldPath: string
      optional?: boolean
      configureOptionsProps?: Partial<ConfigureOptionsProps>
    }) => {
      if (isInputSetView && shouldRenderRunTimeInputViewWithAllowedValues(fieldPath, template)) {
        return renderMultiTypeInputWithAllowedValues({
          name,
          tooltipId,
          labelKey,
          fieldPath,
          getString,
          readonly,
          expressions,
          template,
          NG_EXPRESSIONS_NEW_INPUT_ELEMENT
        })
      }
      return (
        <MultiTypeTextField
          name={name}
          label={renderOptionalWrapper({
            label: (
              <Text
                className={css.inpLabel}
                color={Color.GREY_600}
                font={{ size: 'small', weight: 'semi-bold' }}
                {...(optional
                  ? {}
                  : {
                      tooltipProps: {
                        dataTooltipId: tooltipId
                      }
                    })}
              >
                {getString(labelKey)}
              </Text>
            ),
            optional,
            getString,
            tooltipId
          })}
          multiTextInputProps={inputProps}
          configureOptionsProps={configureOptionsProps}
        />
      )
    },
    [template, isInputSetView]
  )

  const renderMultiTypeList = React.useCallback(
    ({
      name,
      labelKey,
      allowedTypes,
      allowedTypesForEntries
    }: {
      name: string
      labelKey: keyof StringsMap
      allowedTypes: AllowedTypes
      allowedTypesForEntries: AllowedTypes
    }) => (
      <MultiTypeList
        name={name}
        multiTextInputProps={{
          expressions,
          allowableTypes: allowedTypesForEntries,
          newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
        }}
        multiTypeFieldSelectorProps={{
          label: (
            <Text
              className={css.inpLabel}
              color={Color.GREY_600}
              font={{ size: 'small', weight: 'semi-bold' }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              {getString(labelKey)}
            </Text>
          ),
          allowedTypes
        }}
        disabled={readonly}
      />
    ),
    [expressions]
  )

  const renderLabel = React.useCallback(
    ({ labelKey, tooltipId }: { labelKey: keyof StringsMap; tooltipId?: string }) => {
      return (
        <Text
          className={css.inpLabel}
          color={Color.GREY_600}
          font={{ size: 'small', weight: 'semi-bold' }}
          style={{ display: 'flex', alignItems: 'center' }}
          tooltipProps={{ dataTooltipId: tooltipId ?? '' }}
        >
          {getString(labelKey)}
        </Text>
      )
    },
    []
  )

  return (
    <>
      {stepViewType !== StepViewType.Template && get(enableFields, 'name') ? (
        <Container className={cx(css.formGroup, stepCss, css.nameIdLabel)}>
          <FormInput.InputWithIdentifier
            inputName="name"
            idName="identifier"
            isIdentifierEditable={isNewStep && !readonly}
            inputGroupProps={{ disabled: readonly }}
            inputLabel={stepLabel ?? getString('pipelineSteps.stepNameLabel')}
          />
        </Container>
      ) : null}
      <Container className={cx(css.formGroup, stepCss)}>
        {get(enableFields, 'description') ? (
          isInputSetView && shouldRenderRunTimeInputViewWithAllowedValues('description', template) ? (
            renderMultiTypeInputWithAllowedValues({
              name: `${prefix}description`,
              labelKey: 'description',
              fieldPath: 'description',
              getString,
              readonly,
              expressions,
              template,
              NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            })
          ) : (
            <FormMultiTypeTextAreaField
              name={`${prefix}description`}
              label={
                <Text color={Color.GREY_600} font={{ size: 'small', weight: 'semi-bold' }}>
                  {getString('description')}
                </Text>
              }
              multiTypeTextArea={{
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                disabled: readonly,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              }}
              configureOptionsProps={{ hideExecutionTimeField: true }}
            />
          )
        ) : null}
      </Container>
      {!enableFields['spec.connectorRef']?.shouldHide && get(enableFields, 'spec.connectorRef') ? (
        isInputSetView && shouldRenderRunTimeInputViewWithAllowedValues('spec.connectorRef', template) ? (
          <Container className={cx(css.formGroup, stepCss, css.bottomMargin3)}>
            {renderMultiTypeInputWithAllowedValues({
              name: `${prefix}spec.connectorRef`,
              labelKey: enableFields['spec.connectorRef'].label.labelKey,
              tooltipId: enableFields['spec.connectorRef'].label?.tooltipId,
              fieldPath: 'spec.connectorRef',
              getString,
              readonly,
              expressions,
              template,
              NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            })}
          </Container>
        ) : (
          <Container className={css.bottomMargin3}>
            <FormMultiTypeConnectorField
              label={renderLabel(enableFields['spec.connectorRef'].label)}
              type={enableFields['spec.connectorRef'].type}
              width={getConnectorRefWidth(stepViewType)}
              name={`${prefix}spec.connectorRef`}
              placeholder={getString('select')}
              accountIdentifier={accountId}
              projectIdentifier={projectIdentifier}
              orgIdentifier={orgIdentifier}
              multiTypeProps={{
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                disabled: readonly,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                ...enableFields['spec.connectorRef'].multiTypeProps
              }}
              gitScope={gitScope}
              setRefValue
              configureOptionsProps={{ hideExecutionTimeField: true }}
            />
          </Container>
        )
      ) : null}
      {get(enableFields, 'spec.connectorAndRepo') && formik && (
        <Container className={(css.formGroup, stepCss, connectorAndRepoNameCss)}>
          <CloneCodebaseForm
            {...{
              values: formik.values,
              setFieldValue: formik.setFieldValue,
              connectorUrl: enableFields['spec.connectorAndRepo'].connectorUrl,
              connectionType: enableFields['spec.connectorAndRepo'].connectionType,
              connectorWidth: isTemplateConnectorRefPanel
                ? enableFields['spec.connectorAndRepo'].connectorWidth - runtimeInputGearWidth
                : enableFields['spec.connectorAndRepo'].connectorWidth,
              setConnectionType: enableFields['spec.connectorAndRepo'].setConnectionType,
              setConnectorUrl: enableFields['spec.connectorAndRepo'].setConnectorUrl,
              connector: enableFields['spec.connectorAndRepo'].connector,
              onConnectorChange: enableFields['spec.connectorAndRepo'].onConnectorChange,
              getString,
              errors: formik.errors,
              loading: enableFields['spec.connectorAndRepo'].loading,
              accountId,
              projectIdentifier,
              orgIdentifier,
              repoIdentifier: enableFields['spec.connectorAndRepo'].repoIdentifier,
              branch: enableFields['spec.connectorAndRepo'].branch,
              expressions,
              isReadonly: enableFields['spec.connectorAndRepo'].isReadonly,
              setCodebaseRuntimeInputs: enableFields['spec.connectorAndRepo'].setCodebaseRuntimeInputs,
              codebaseRuntimeInputs: enableFields['spec.connectorAndRepo'].codebaseRuntimeInputs,
              connectorAndRepoNamePath: `${prefix}spec`,
              allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
              codeBaseInputFieldFormName: { repoName: `${prefix}spec.repoName` },
              configureOptionsProps: { hideExecutionTimeField: true },
              isCodeEnabled: CODE_ENABLED
            }}
          />
        </Container>
      )}
      {get(enableFields, 'spec.repoName') && (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.repoName`,
            tooltipId: enableFields['spec.repoName'].tooltipId,
            labelKey: 'common.repositoryName',
            inputProps: {
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.repoName'
          })}
        </Container>
      )}
      {!enableFields['spec.connectorRef']?.shouldHide && get(enableFields, 'spec.image') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.image`,
            tooltipId: enableFields['spec.image'].tooltipId,
            labelKey: 'imageLabel',
            inputProps: enableFields['spec.image'].multiTextInputProps,
            fieldPath: 'spec.image',
            configureOptionsProps: { hideExecutionTimeField: true }
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.uses') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.uses`,
            tooltipId: enableFields['spec.uses'].tooltipId,
            labelKey: 'ci.usesLabel',
            inputProps: enableFields['spec.uses'].multiTextInputProps,
            fieldPath: 'spec.uses'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.build') && formik && (
        <Container className={cx(css.formGroup, stepCss, buildCss)}>
          {RenderBuild({
            expressions,
            readonly,
            getString,
            formik,
            path,
            triggerIdentifier,
            allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
            stepViewType,
            isTemplatePreview: enableFields['spec.build'].isTemplatePreview
          })}
        </Container>
      )}
      {get(enableFields, 'spec.build.spec.branch') && formik && (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderBuildTypeInputField({
            getString,
            type: CodebaseTypes.BRANCH,
            readonly,
            allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
            prefix
          })}
        </Container>
      )}
      {get(enableFields, 'spec.build.spec.commitSha') && formik && (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderBuildTypeInputField({
            getString,
            type: CodebaseTypes.COMMIT,
            readonly,
            allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
            prefix
          })}
        </Container>
      )}
      {get(enableFields, 'spec.build.spec.tag') && formik && (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderBuildTypeInputField({
            getString,
            type: CodebaseTypes.TAG,
            readonly,
            allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
            prefix
          })}
        </Container>
      )}
      {get(enableFields, 'spec.cloneDirectory') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.cloneDirectory`,
            tooltipId: enableFields['spec.cloneDirectory'].tooltipId,
            optional: enableFields['spec.cloneDirectory'].optional,
            labelKey: 'pipeline.gitCloneStep.cloneDirectory',
            inputProps: {
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly,
              placeholder: '/harness/<insert_repo_to_clone>'
            },
            fieldPath: 'spec.cloneDirectory'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.target') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.target`,
            tooltipId: enableFields['spec.target'].tooltipId,
            labelKey: 'pipelineSteps.targetLabel',
            inputProps: {
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.target'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.repo') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.repo`,
            tooltipId: 'dockerHubRepository',
            labelKey: 'platform.connectors.docker.dockerRepository',
            inputProps: {
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.repo'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.host') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.host`,
            tooltipId: 'gcrHost',
            labelKey: 'common.hostLabel',
            inputProps: {
              placeholder: getString('pipelineSteps.hostPlaceholder'),
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.host'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.projectID') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.projectID`,
            tooltipId: 'gcrProjectID',
            labelKey: 'pipelineSteps.projectIDLabel',
            inputProps: {
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.projectID'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.region') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.region`,
            tooltipId: 'region',
            labelKey: 'regionLabel',
            inputProps: {
              placeholder: getString('pipelineSteps.regionPlaceholder'),
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep
              },
              disabled: readonly
            },
            fieldPath: 'spec.region'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.bucket') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.bucket`,
            tooltipId: enableFields['spec.bucket'].tooltipId,
            labelKey: 'pipelineSteps.bucketLabel',
            inputProps: {
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.bucket'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.key') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.key`,
            tooltipId: enableFields['spec.key'].tooltipId,
            labelKey: 'keyLabel',
            inputProps: {
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.key'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.sourcePaths') ? (
        isInputSetView ? (
          <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
            {renderMultiTypeListInputSet({
              name: `${prefix}spec.sourcePaths`,
              tooltipId: 'sourcePaths',
              labelKey: 'pipelineSteps.sourcePathsLabel',
              allowedTypes: SupportedInputTypesForListTypeFieldInInputSetView,
              allowedTypesForEntries: SupportedInputTypesForListItems,
              expressions,
              getString,
              readonly,
              formik
            })}
          </Container>
        ) : (
          <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
            {renderMultiTypeList({
              name: `${prefix}spec.sourcePaths`,
              labelKey: 'pipelineSteps.sourcePathsLabel',
              allowedTypes: SupportedInputTypesForListTypeField,
              allowedTypesForEntries: SupportedInputTypesForListItems
            })}
          </Container>
        )
      ) : null}
      {get(enableFields, 'spec.sourcePath') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.sourcePath`,
            tooltipId: 'sourcePath',
            labelKey: 'pipelineSteps.sourcePathLabel',
            inputProps: {
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.sourcePath'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.account') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.account`,
            tooltipId: 'ecrAccount',
            labelKey: 'common.accountId',
            inputProps: {
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.account'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.imageName') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.imageName`,
            tooltipId: 'imageName',
            labelKey: 'imageNameLabel',
            inputProps: {
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.imageName',
            configureOptionsProps: { hideExecutionTimeField: true }
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.repository') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.repository`,
            tooltipId: 'repository',
            labelKey: 'repository',
            inputProps: {
              placeholder: getString('pipeline.repositoryPlaceholder'),
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.repository'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.subscriptionId') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {renderMultiTypeTextField({
            name: `${prefix}spec.subscriptionId`,
            tooltipId: 'subscriptionId',
            optional: true,
            labelKey: 'common.subscriptionId',
            inputProps: {
              multiTextInputProps: {
                expressions,
                allowableTypes: isInputSetView ? AllMultiTypeInputTypesForInputSet : AllMultiTypeInputTypesForStep,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              },
              disabled: readonly
            },
            fieldPath: 'spec.subscriptionId'
          })}
        </Container>
      ) : null}
      {get(enableFields, 'spec.tags') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {/* Corresponding input set view is handled in ArtifactStepCommon.tsx */}
          {!isInputSetView
            ? renderMultiTypeList({
                name: `${prefix}spec.tags`,
                labelKey: 'tagsLabel',
                allowedTypes: SupportedInputTypesForListTypeField,
                allowedTypesForEntries: SupportedInputTypesForListItems
              })
            : null}
        </Container>
      ) : null}
      {get(enableFields, 'spec.depth') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          {!isInputSetView
            ? renderMultiTypeList({
                name: `${prefix}spec.depth`,
                labelKey: 'pipeline.depth',
                allowedTypes: SupportedInputTypesForListTypeField,
                allowedTypesForEntries: SupportedInputTypesForListItems
              })
            : null}
        </Container>
      ) : null}
      {get(enableFields, 'spec.caching') ? (
        <Container className={cx(css.formGroup, stepCss, css.bottomMargin5)}>
          <FormMultiTypeCheckboxField
            name={`${prefix}spec.caching`}
            label={getString('ci.enableDLC')}
            multiTypeTextbox={{
              expressions,
              disabled: readonly,
              allowableTypes: AllMultiTypeInputTypesForStep,
              newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
            }}
            style={{ marginBottom: 'var(--spacing-small)' }}
            disabled={readonly}
          />
        </Container>
      ) : null}
    </>
  )
}
