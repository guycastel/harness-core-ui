/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Accordion, AllowedTypes, Container, MultiTypeInputType, SelectOption } from '@harness/uicore'
import { Divider } from '@blueprintjs/core'
import type { FormikProps } from 'formik'
import { get, isEmpty } from 'lodash-es'
import type { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { useStrings } from 'framework/strings'
import { CIStepOptionalConfig } from '@ci/components/PipelineSteps/CIStep/CIStepOptionalConfig'
import { CIBuildInfrastructureType } from '@pipeline/utils/constants'
import StepCommonFields from '@ci/components/PipelineSteps/StepCommonFields/StepCommonFields'
import type { BuildStageElementConfig, StageElementWrapper } from '@pipeline/utils/pipelineTypes'
import { useFeatureFlag } from '@common/hooks/useFeatureFlag'
import { FeatureFlag } from '@common/featureFlags'
import type { SecurityStepData, SecurityStepSpec } from './types'
import SecurityField, { CustomTooltipFieldProps } from './SecurityField'

import {
  API_KEY_AUTH_TYPE,
  API_VERSION_4_1_0,
  API_VERSION_4_2_0,
  API_VERSION_5_0_2,
  detectionModeRadioOptions,
  AWS_ECR_CONTAINER_TYPE,
  dividerBottomMargin,
  DOCKER_V2_CONTAINER_TYPE,
  inputSetAdvancedFields,
  inputSetAuthFields,
  inputSetImageFields,
  inputSetIngestionFields,
  inputSetInstanceFields,
  inputSetSbomFields,
  inputSetScanFields,
  inputSetTargetFields,
  inputSetToolFields,
  instanceProtocolSelectItems,
  JFROG_ARTIFACTORY_CONTAINER_TYPE,
  LOCAL_IMAGE_CONTAINER_TYPE,
  logLevelOptions,
  SBOM_CYCLONEDX,
  SBOM_SPDX,
  severityOptions,
  tooltipIds,
  USER_PASSWORD_AUTH_TYPE
} from './constants'
import css from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'
interface SelectItems extends SelectOption {
  disabled?: boolean
}

type SecurityFieldsProps<T> = {
  allowableTypes: AllowedTypes
  formik: FormikProps<T>
  toolTipOverrides?: CustomTooltipFieldProps
  readonly?: boolean
}

interface ISecurityScanFields extends SecurityFieldsProps<SecurityStepData<SecurityStepSpec>> {
  scanModeSelectItems: SelectItems[]
  scanConfigReadonly?: boolean
  scanConfigSelectItems?: SelectItems[]
}

interface ISecurityTargetFields extends SecurityFieldsProps<SecurityStepData<SecurityStepSpec>> {
  targetTypeSelectItems: SelectItems[]
}

export function SecurityScanFields(props: ISecurityScanFields) {
  const {
    allowableTypes,
    formik,
    scanModeSelectItems,
    scanConfigReadonly,
    toolTipOverrides,
    scanConfigSelectItems,
    readonly
  } = props

  return (
    <>
      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik as unknown as FormikProps<ISecurityScanFields>}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          'spec.mode': {
            label: 'sto.stepField.mode',
            fieldType: 'dropdown',
            inputProps: {
              disabled: scanModeSelectItems.length === 1
            },
            selectItems: scanModeSelectItems,
            tooltipId: tooltipIds.mode
          },
          'spec.config': {
            label: 'sto.stepField.config',
            inputProps: { disabled: scanConfigReadonly },
            tooltipId: tooltipIds.config,
            fieldType: scanConfigSelectItems ? 'dropdown' : 'input',
            selectItems: scanConfigSelectItems ?? scanConfigSelectItems
          }
        }}
      />
      <Divider style={{ marginBottom: dividerBottomMargin }} />
    </>
  )
}

export function SecurityTargetFields(props: ISecurityTargetFields) {
  const { getString } = useStrings()
  const { allowableTypes, formik, targetTypeSelectItems, toolTipOverrides, readonly } = props
  const detectionFeatureOn = useFeatureFlag(FeatureFlag.STO_AUTO_TARGET_NAME_VARIANT)

  // Target Type dependant Auto Detect support
  // Add more target types as they become supported
  const supportsDetectionMode = (): boolean => {
    return (
      detectionFeatureOn &&
      (formik.values.spec.target.type === 'repository' ||
        formik.values.spec.target.type === 'container' ||
        formik.values.spec.target.type === 'instance')
    )
  }

  // Set detection to false if name and variant are set in order to be backwards compatible
  if (supportsDetectionMode()) {
    if (
      !formik.values.spec.target?.name &&
      !formik.values.spec.target?.variant &&
      formik.values.spec.target?.detection === undefined
    ) {
      formik.setFieldValue('spec.target.detection', 'auto')
    }
  }

  if (
    (formik.values.spec.target?.type === 'instance' || formik.values.spec.target?.type === 'container') &&
    formik.values.spec.mode === 'ingestion' &&
    formik.values.spec.target?.detection === 'auto'
  ) {
    formik.setFieldValue('spec.target.detection', 'manual')
  }

  const getDetectionModeToolTip = () => {
    switch (formik.values.spec.target.type) {
      case 'repository':
        return tooltipIds.targetDetectionModeRepo
      case 'container':
        return tooltipIds.targetDetectionModeContainer
      case 'instance':
        return tooltipIds.targetDetectionModeInstance
      default:
        return tooltipIds.targetDetectionMode
    }
  }

  return (
    <>
      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik as unknown as FormikProps<ISecurityTargetFields>}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          header: {
            label: 'pipelineSteps.targetLabel'
          },
          'spec.target.type': {
            fieldType: 'dropdown',
            label: 'typeLabel',
            selectItems: targetTypeSelectItems,
            inputProps: { disabled: targetTypeSelectItems?.length === 1 },
            tooltipId: tooltipIds.targetType,
            hide: !targetTypeSelectItems?.length
          },
          'spec.target.detection': {
            label: 'sto.stepField.target.detection',
            fieldType: 'radio',
            hide: !supportsDetectionMode(),
            tooltipId: getDetectionModeToolTip(),
            radioItems: detectionModeRadioOptions(getString, {
              autoDisabled:
                (formik.values.spec.target?.type === 'instance' || formik.values.spec.target?.type === 'container') &&
                formik.values.spec.mode === 'ingestion'
            })
          },
          'spec.target.name': {
            label: 'name',
            tooltipId: tooltipIds.targetName,
            hide: formik.values.spec.target?.detection === 'auto'
          },
          'spec.target.variant': {
            label: 'sto.stepField.target.variant',
            tooltipId: tooltipIds.targetVariant,
            hide: formik.values.spec.target?.detection === 'auto'
          },
          'spec.target.workspace': {
            optional: true,
            label: 'pipelineSteps.workspace',
            hide:
              formik.values.spec.target.type === 'instance' ||
              formik.values.spec.target.type === 'container' ||
              formik.values.spec.mode === 'extraction' ||
              formik.values.spec.mode === 'ingestion',
            inputProps: { placeholder: '/harness' },
            tooltipId: tooltipIds.targetWorkspace
          }
        }}
      />
      <Divider style={{ marginBottom: dividerBottomMargin }} />
    </>
  )
}

export function SecurityIngestionFields(props: SecurityFieldsProps<SecurityStepData<SecurityStepSpec>>) {
  const { allowableTypes, formik, toolTipOverrides, readonly } = props
  if (formik.values.spec.mode !== 'ingestion') return null
  return (
    <>
      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik as unknown as FormikProps<SecurityFieldsProps<SecurityStepData<SecurityStepSpec>>>}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          'spec.ingestion.file': {
            label: 'sto.stepField.ingestion.file',
            tooltipId: tooltipIds.ingestionFile
          }
        }}
      />
      <Divider style={{ marginBottom: dividerBottomMargin }} />
    </>
  )
}

export function SecurityAdvancedFields(props: SecurityFieldsProps<SecurityStepData<SecurityStepSpec>>) {
  const { allowableTypes, formik, toolTipOverrides, readonly } = props
  const { getString } = useStrings()

  return (
    <>
      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik as unknown as FormikProps<SecurityFieldsProps<SecurityStepData<SecurityStepSpec>>>}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          'spec.advanced.log.level': {
            optional: true,
            fieldType: 'dropdown',
            label: 'sto.stepField.advanced.logLevel',
            selectItems: logLevelOptions(getString),
            tooltipId: tooltipIds.logLevel
          },
          'spec.advanced.args.cli': {
            optional: true,
            label: 'sto.stepField.advanced.cli',
            hide: formik.values.spec.mode !== 'orchestration',
            tooltipId: tooltipIds.argsCli
          },
          'spec.advanced.fail_on_severity': {
            optional: true,
            fieldType: 'dropdown',
            label: 'sto.stepField.advanced.failOnSeverity',
            selectItems: severityOptions(getString),
            tooltipId: tooltipIds.failOnSeverity
          }
        }}
      />
      <Divider style={{ marginBottom: dividerBottomMargin }} />
    </>
  )
}

interface ISecurityAuthFields extends SecurityFieldsProps<SecurityStepData<SecurityStepSpec>> {
  initialAuthDomain?: string
  showFields?: {
    type?: boolean
    ssl?: boolean
    domain?: boolean
    access_id?: boolean
    version?: boolean
    region?: boolean
  }
  authDomainPlaceHolder?: string
  authTypes?: SelectItems[]
}

export function SecurityAuthFields(props: ISecurityAuthFields) {
  const {
    allowableTypes,
    formik,
    initialAuthDomain,
    showFields,
    authDomainPlaceHolder,
    toolTipOverrides,
    authTypes,
    readonly
  } = props
  if (formik.values.spec.mode === 'ingestion') return null
  return (
    <>
      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik as unknown as FormikProps<SecurityFieldsProps<SecurityStepData<SecurityStepSpec>>>}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          header: {
            label: 'authentication'
          },
          'spec.auth.domain': {
            label: 'platform.secrets.winRmAuthFormFields.domain',
            hide: !showFields?.domain,
            inputProps: { placeholder: authDomainPlaceHolder },
            tooltipId: tooltipIds.authDomain
          },
          'spec.auth.ssl': {
            label: 'sto.stepField.authSsl',
            fieldType: 'checkbox',
            hide:
              !showFields?.ssl ||
              (!isEmpty(formik.values.spec.auth?.domain) && formik.values.spec.auth?.domain === initialAuthDomain),
            tooltipId: tooltipIds.authSSL
          },
          'spec.auth.version': {
            label: 'sto.stepField.authVersion',
            fieldType: 'dropdown',
            optional: false,
            hide: !showFields?.version,
            selectItems: [API_VERSION_5_0_2, API_VERSION_4_2_0, API_VERSION_4_1_0],
            tooltipId: tooltipIds.authVersion
          },
          'spec.auth.type': {
            label: 'typeLabel',
            hide: !showFields?.type,
            fieldType: 'dropdown',
            selectItems: authTypes ? authTypes : [API_KEY_AUTH_TYPE, USER_PASSWORD_AUTH_TYPE],
            tooltipId: tooltipIds.authType
          },
          'spec.auth.access_id': {
            label: 'sto.stepField.authAccessId',
            hide: !showFields?.access_id || formik.values.spec.auth?.type === API_KEY_AUTH_TYPE.value,
            inputProps: { placeholder: '<+secrets.getValue("project.access_id")>' },
            tooltipId: tooltipIds.authAccessId
          },
          'spec.auth.access_token': {
            label: 'common.getStarted.accessTokenLabel',
            inputProps: { placeholder: '<+secrets.getValue("project.access_token")>' },
            tooltipId: tooltipIds.authAccessToken
          },
          'spec.auth.region': {
            label: 'sto.stepField.authRegion',
            inputProps: { placeholder: '<+secrets.getValue("project.access_region")>' },
            tooltipId: tooltipIds.authAccessRegion,
            hide: !showFields?.region
          }
        }}
      />
      <Divider style={{ marginBottom: dividerBottomMargin }} />
    </>
  )
}

export function SecurityImageFields(props: SecurityFieldsProps<SecurityStepData<SecurityStepSpec>>) {
  const { allowableTypes, formik, toolTipOverrides, readonly } = props
  if (!(formik.values.spec.target.type === 'container' && formik.values.spec.mode === 'orchestration')) return null
  const hideNonLocalImageFields = !(
    formik.values.spec.target.type === 'container' && formik.values.spec.image?.type !== 'local_image'
  )

  return (
    <>
      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik as unknown as FormikProps<SecurityFieldsProps<SecurityStepData<SecurityStepSpec>>>}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          header: {
            label: 'sto.stepField.image.fieldsHeading'
          },
          'spec.image.type': {
            label: 'typeLabel',

            fieldType: 'dropdown',
            selectItems: [
              LOCAL_IMAGE_CONTAINER_TYPE,
              DOCKER_V2_CONTAINER_TYPE,
              JFROG_ARTIFACTORY_CONTAINER_TYPE,
              AWS_ECR_CONTAINER_TYPE
            ],
            tooltipId: tooltipIds.imageType
          },
          'spec.image.domain': {
            label: 'platform.secrets.winRmAuthFormFields.domain',
            optional: true,
            inputProps: { placeholder: 'docker.io' },
            tooltipId: tooltipIds.imageDomain
          },
          'spec.image.name': {
            label: 'name',
            inputProps: { placeholder: 'harness/todolist-sample' },
            tooltipId: tooltipIds.imageName
          },
          'spec.image.tag': {
            label: 'tagLabel',
            inputProps: { placeholder: 'latest' },
            tooltipId: tooltipIds.imageTag
          },
          'spec.image.access_id': {
            label: 'sto.stepField.authAccessId',
            optional: true,
            hide: hideNonLocalImageFields,
            inputProps: { placeholder: '<+secrets.getValue("project.access_id")>' },
            tooltipId: tooltipIds.imageAccessId
          },
          'spec.image.access_token': {
            label: 'common.getStarted.accessTokenLabel',
            hide: hideNonLocalImageFields,
            optional: true,
            inputProps: { placeholder: '<+secrets.getValue("project.access_token")>' },
            tooltipId: tooltipIds.imageAccessToken
          },
          'spec.image.region': {
            label: 'regionLabel',
            hide: formik.values.spec.image?.type !== 'aws_ecr',
            inputProps: { placeholder: 'us-east-1' },
            tooltipId: tooltipIds.imageRegion
          }
        }}
      />
      <Divider style={{ marginBottom: dividerBottomMargin }} />
    </>
  )
}

type AdditionalFieldsProps = {
  currentStage: StageElementWrapper<BuildStageElementConfig> | undefined
  readonly?: boolean
  stepViewType: StepViewType
  allowableTypes: AllowedTypes
  formik: FormikProps<SecurityStepData<SecurityStepSpec>>
  showAdvancedFields?: boolean
}

export const AdditionalFields = (props: AdditionalFieldsProps) => {
  const { currentStage, readonly, stepViewType, allowableTypes, formik, showAdvancedFields = true } = props
  const { getString } = useStrings()
  const buildInfrastructureType =
    (get(currentStage, 'stage.spec.infrastructure.type') as CIBuildInfrastructureType) ||
    (get(currentStage, 'stage.spec.runtime.type') as CIBuildInfrastructureType)

  return (
    <>
      {showAdvancedFields && (
        <SecurityAdvancedFields allowableTypes={allowableTypes} formik={formik} readonly={readonly} />
      )}

      <CIStepOptionalConfig
        readonly={readonly}
        stepViewType={stepViewType}
        enableFields={{
          'spec.settings': {}
        }}
        allowableTypes={allowableTypes}
      />
      <Accordion className={css.accordion}>
        <Accordion.Panel
          id="additional-config"
          summary={getString('pipeline.additionalConfiguration')}
          details={
            <Container margin={{ top: 'medium' }}>
              <CIStepOptionalConfig
                readonly={readonly}
                stepViewType={stepViewType}
                enableFields={{
                  'spec.privileged': {
                    shouldHide: [
                      CIBuildInfrastructureType.Cloud,
                      CIBuildInfrastructureType.VM,
                      CIBuildInfrastructureType.KubernetesHosted,
                      CIBuildInfrastructureType.Docker
                    ].includes(buildInfrastructureType)
                  }
                }}
                allowableTypes={allowableTypes}
              />
              <StepCommonFields
                enableFields={['spec.imagePullPolicy']}
                disabled={readonly}
                allowableTypes={allowableTypes}
                buildInfrastructureType={buildInfrastructureType}
              />
            </Container>
          }
        />
      </Accordion>
    </>
  )
}

interface SecurityInstanceFieldsProps extends SecurityFieldsProps<SecurityStepData<SecurityStepSpec>> {
  showFields?: {
    domain?: boolean
    protocol?: boolean
    port?: boolean
    path?: boolean
    username?: boolean
    password?: boolean
  }
}

export function SecurityInstanceFields(props: SecurityInstanceFieldsProps) {
  const { allowableTypes, formik, toolTipOverrides, showFields, readonly } = props

  if (formik.values.spec.mode !== 'orchestration') {
    return null
  }

  return (
    <>
      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik as unknown as FormikProps<SecurityFieldsProps<SecurityStepData<SecurityStepSpec>>>}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          header: {
            label: 'ce.co.gatewayReview.instance'
          },
          'spec.instance.domain': {
            label: 'platform.secrets.winRmAuthFormFields.domain',
            inputProps: { placeholder: 'app.harness.io' },
            tooltipId: tooltipIds.instanceDomain,
            hide: !showFields?.domain
          },
          'spec.instance.protocol': {
            label: 'ce.common.protocol',
            fieldType: 'dropdown',
            selectItems: instanceProtocolSelectItems,
            tooltipId: tooltipIds.instanceProtocol,
            hide: !showFields?.protocol
          },
          'spec.instance.port': {
            label: 'common.smtp.port',
            optional: true,
            inputProps: { placeholder: '443' },
            tooltipId: tooltipIds.instancePort,
            hide: !showFields?.port
          },
          'spec.instance.path': {
            label: 'common.path',
            optional: true,
            tooltipId: tooltipIds.instancePath,
            hide: !showFields?.path
          },
          'spec.instance.username': {
            label: 'username',
            optional: true,
            // TODO add tool tip for instance username
            tooltipId: tooltipIds.instanceUsername,
            hide: !showFields?.username
          },
          'spec.instance.password': {
            label: 'password',
            optional: true,
            // TODO add tool tip for instance password
            tooltipId: tooltipIds.instancePassword,
            hide: !showFields?.password
          }
        }}
      />
      <Divider style={{ marginBottom: dividerBottomMargin }} />
    </>
  )
}

type InputSetFieldsProps<T> = {
  prefix: string
  template?: SecurityStepData<SecurityStepSpec>
  allowableTypes: AllowedTypes
  formik: FormikProps<T>
  toolTipOverrides?: CustomTooltipFieldProps
  readonly?: boolean
}
export function InputSetFields(props: InputSetFieldsProps<SecurityStepData<SecurityStepSpec>>) {
  const { allowableTypes, formik, template, prefix, toolTipOverrides, readonly } = props
  const { getString } = useStrings()
  return (
    <>
      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik}
        customTooltipFields={toolTipOverrides}
        enableFields={inputSetScanFields(prefix, template)}
      />

      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          header: {
            label: 'pipelineSteps.targetLabel',
            hide: !template?.spec?.target
          },
          ...inputSetTargetFields(prefix, getString, template)
        }}
      />

      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          ...inputSetIngestionFields(prefix, template)
        }}
      />

      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          header: {
            label: 'imageLabel',
            hide: !template?.spec?.image
          },
          ...inputSetImageFields(prefix, template)
        }}
      />

      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          header: {
            label: 'ce.co.gatewayReview.instance',
            hide: !template?.spec?.instance
          },
          ...inputSetInstanceFields(prefix, template)
        }}
      />

      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          header: {
            label: 'sto.stepField.tool.fieldsHeading',
            hide: !template?.spec?.tool
          },
          ...inputSetToolFields(prefix, template)
        }}
      />

      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          header: {
            label: 'authentication',
            hide: !template?.spec?.auth
          },
          ...inputSetAuthFields(prefix, template)
        }}
      />

      <SecurityField
        readonly={readonly}
        allowableTypes={[MultiTypeInputType.FIXED]}
        formik={formik}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          ...inputSetSbomFields(prefix, template)
        }}
      />

      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          ...inputSetAdvancedFields(getString, prefix, template)
        }}
      />
    </>
  )
}

type SbomFieldsProps = {
  readonly?: boolean
  allowableTypes: AllowedTypes
  formik: FormikProps<SecurityStepData<SecurityStepSpec>>
  toolTipOverrides?: CustomTooltipFieldProps
}

export const SbomFields = (props: SbomFieldsProps) => {
  const SSCA_ENABLED = useFeatureFlag(FeatureFlag.SSCA_ENABLED)
  const { allowableTypes, formik, toolTipOverrides, readonly } = props

  if (formik.values.spec.mode === 'ingestion') return null
  if (!SSCA_ENABLED) return null

  if (formik.initialValues.spec.sbom && formik.initialValues.spec.sbom?.format === undefined) {
    formik.initialValues.spec.sbom.format = 'spdx-json'
    formik.setFieldValue('spec.sbom.format', SBOM_SPDX.value)
  }

  return (
    <>
      <SecurityField
        readonly={readonly}
        allowableTypes={allowableTypes}
        formik={formik as unknown as FormikProps<SecurityFieldsProps<SecurityStepData<SecurityStepSpec>>>}
        customTooltipFields={toolTipOverrides}
        enableFields={{
          header: {
            label: 'sto.sbom.fieldsHeading'
          },
          'spec.sbom.generate': {
            label: 'sto.sbom.generateSbom',
            fieldType: 'checkbox',
            optional: true
          },
          'spec.sbom.format': {
            label: 'ssca.orchestrationStep.sbomFormat',
            fieldType: 'dropdown',
            optional: false,
            selectItems: [SBOM_SPDX, SBOM_CYCLONEDX]
          }
        }}
      />
      <Divider style={{ marginBottom: dividerBottomMargin }} />
    </>
  )
}
