/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import { useFormikContext } from 'formik'
import { defaultTo, get, isEmpty, isNil, pick, set } from 'lodash-es'

import { Container, SelectOption, EXECUTION_TIME_INPUT_VALUE, Text } from '@harness/uicore'
import { useStrings } from 'framework/strings'

import type { DeploymentStageConfig, ServiceSpec } from 'services/cd-ng'
import type { StageElementWrapperConfig } from 'services/pipeline-ng'

import { isValueRuntimeInput } from '@common/utils/utils'

import { StepWidget } from '@pipeline/components/AbstractSteps/StepWidget'
import factory from '@pipeline/components/PipelineSteps/PipelineStepFactory'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { getStepTypeByDeploymentType, StageType } from '@pipeline/utils/stageHelpers'
import {
  getFlattenedStages,
  getStageIndexFromPipeline
} from '@pipeline/components/PipelineStudio/StageBuilder/StageBuilderUtil'
import type { DeploymentStageElementConfig } from '@pipeline/utils/pipelineTypes'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'

// eslint-disable-next-line no-restricted-imports
import PropagateFromServiceV2 from '@cd/components/PipelineStudio/DeployServiceSpecifications/PropagateWidget/PropagateFromServiceV2'
// eslint-disable-next-line no-restricted-imports
import { setupMode } from '@cd/components/PipelineSteps/PipelineStepsUtil'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'

import type { StageInputSetFormProps } from '../StageInputSetForm'
import type { DeployServiceEntityData } from './ServicesInputSetForm'

import css from '../PipelineInputSetForm.module.scss'

export default function SingleServiceInputSetForm({
  // This is the resolved merged pipeline yaml
  deploymentStage,
  // This is the resolved/updated template yaml
  deploymentStageTemplate,
  // This is the resolved pipeline yaml
  resolvedStage,
  path,
  readonly,
  viewType,
  stageIdentifier,
  allowableTypes,
  childPipelineMetadata,
  viewTypeMetadata
}: Omit<StageInputSetFormProps, 'formik' | 'executionIdentifier' | 'stageType'>): React.ReactElement | null {
  const {
    state: { pipeline, templateTypes },
    isReadonly
  } = usePipelineContext()

  const { index: stageIndex } = getStageIndexFromPipeline(pipeline, stageIdentifier)

  const { getString } = useStrings()
  const formik = useFormikContext<DeploymentStageConfig>()
  const { CDS_SUPPORT_SERVICE_INPUTS_AS_EXECUTION_INPUTS: areServiceInputsSupportedAsExecutionInputs } =
    useFeatureFlags()

  const areServiceInputsExecutionTimeInputs =
    (deploymentStageTemplate.service?.serviceInputs as unknown as string) === EXECUTION_TIME_INPUT_VALUE &&
    !deploymentStageTemplate.service?.serviceRef

  // This is the value of AllValues
  const deploymentStageInputSet = get(formik?.values, path, {})
  const deploymentStageServiceIdentifier = defaultTo(
    deploymentStageInputSet?.service?.serviceRef,
    deploymentStage?.service?.serviceRef
  )

  /*
     'resolvedStage' will be visible exclusively when dealing with a chained pipeline. 
      In situations where the service is included in the child pipeline, there are three possible scenarios:
      * When the serviceId is not runtime, and the service inputs are runtime, the serviceId is set to deploymentStageServiceIdentifier
      * When the serviceId is runtime ->
          - If configured before opening the run pipeline form, specifically on the chained pipeline inputs tab,
            and the serviceId is now fixed while the service inputs remain runtime, then the serviceId is assigned as resolvedStage?.service?.serviceRef
          - If configured on the run pipeline form     
  */

  const serviceIdentifier = isValueRuntimeInput(resolvedStage?.service?.serviceRef)
    ? deploymentStageServiceIdentifier
    : defaultTo(resolvedStage?.service?.serviceRef, deploymentStageServiceIdentifier)

  const useFromStageInputSetValue = get(deploymentStageInputSet, 'service.useFromStage.stage')

  const [setupModeType, setSetupMode] = useState(
    // Do not add isEmpty check here. This will move to DIFFERENT when propagate is selected and focus moved away
    isNil(useFromStageInputSetValue) ? setupMode.DIFFERENT : setupMode.PROPAGATE
  )

  const getStagesAllowedforPropogate = useCallback(
    (stageItem: StageElementWrapperConfig): boolean => {
      if (stageItem?.stage?.template) {
        const stageType = get(templateTypes, stageItem.stage.template.templateRef)
        return (
          stageType === StageType.DEPLOY &&
          !(stageItem?.stage?.template?.templateInputs?.spec as DeploymentStageConfig)?.service?.useFromStage &&
          !(stageItem?.stage?.template?.templateInputs?.spec as DeploymentStageConfig)?.services?.useFromStage
        )
      } else {
        const stageType = stageItem?.stage?.type
        return (
          stageType === StageType.DEPLOY &&
          !(stageItem?.stage?.spec as DeploymentStageConfig)?.service?.useFromStage &&
          !(stageItem?.stage?.spec as DeploymentStageConfig)?.services?.useFromStage
        )
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const previousStageList = useMemo(() => {
    const { stages } = getFlattenedStages(pipeline)
    if (stages.length && stageIndex > 0) {
      // all stages are allowed
      const filteredStages = stages.slice(0, stageIndex).filter(getStagesAllowedforPropogate)

      return filteredStages.map(stageItem => {
        if (stageItem.stage?.template) {
          return {
            label: `Stage [${stageItem.stage?.name}] - Template [${stageItem.stage.template.templateRef}]`,
            value: defaultTo(stageItem.stage?.identifier, '')
          }
        } else {
          const singleServiceRef = (stageItem.stage as DeploymentStageElementConfig)?.spec?.service?.serviceRef
          const isMultiServiceConfigurationPresent = !isEmpty(
            (stageItem.stage as DeploymentStageElementConfig)?.spec?.services?.values
          )
          const serviceLabelVal =
            isEmpty(singleServiceRef) && isMultiServiceConfigurationPresent
              ? getString('multipleService')
              : `Service [${singleServiceRef}]`

          return {
            label: `Stage [${stageItem.stage?.name}] - ${serviceLabelVal}`,
            value: stageItem.stage?.identifier
          }
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageIndex])

  // This is for prefilling the selected value in the field
  const [selectedPropagatedState, setSelectedPropagatedState] = useState<SelectOption | string>(
    previousStageList?.find(v => v?.value === useFromStageInputSetValue) as SelectOption
  )

  const onPropogatedStageSelect = (value: SelectOption): void => {
    setSelectedPropagatedState(value)
    formik.setFieldValue(`${path}.service`, { useFromStage: { stage: value.value } })
  }

  const onStageServiceChange = (mode: string): void => {
    if (!isReadonly) {
      setSetupMode(mode)
      setSelectedPropagatedState('')

      if (mode === setupMode.DIFFERENT) {
        formik.setFieldValue(`${path}.service`, { serviceRef: '' })
      } else {
        formik.setFieldValue(`${path}.service`, {
          useFromStage: {
            stage: ''
          }
        })
      }
    }
  }

  const shouldShowPropagateFromStage =
    !isEmpty(previousStageList) &&
    // using deploymentStage as deploymentStageTemplate is not reliable in case of optional fields
    (isValueRuntimeInput(deploymentStage?.service?.serviceRef) ||
      isValueRuntimeInput(deploymentStage?.service?.useFromStage as unknown as string))

  return (
    <div id={`Stage.${path}.${stageIdentifier}.Service`} className={cx(css.accordionSummary)}>
      <div className={css.inputheader}>{getString('service')}</div>
      {shouldShowPropagateFromStage && (
        <Container margin={{ left: 'xxlarge', bottom: 'large' }}>
          {/* The above container margin is required to push the propagate buttons. Propagate needs some refactor to fix the css issues */}
          <PropagateFromServiceV2
            setupModeType={setupModeType}
            selectedPropagatedState={selectedPropagatedState}
            previousStageList={previousStageList as SelectOption[]}
            isReadonly={!!readonly}
            onStageServiceChange={onStageServiceChange}
            onPropogatedStageSelect={onPropogatedStageSelect}
            subscribeToForm={false}
          />
        </Container>
      )}
      {areServiceInputsExecutionTimeInputs && areServiceInputsSupportedAsExecutionInputs && (
        <Text padding={{ bottom: 'medium' }}>{getString('pipeline.noRuntimeServiceInputsAreRequired')}</Text>
      )}

      {deploymentStageTemplate.service && setupModeType === setupMode.DIFFERENT && (
        <div className={css.nestedAccordions}>
          {deploymentStageTemplate.service?.serviceRef && (
            <StepWidget<DeployServiceEntityData>
              factory={factory}
              initialValues={pick(deploymentStageInputSet, ['service'])}
              template={pick(deploymentStageTemplate, ['service'])}
              type={StepType.DeployServiceEntity}
              stepViewType={viewType}
              path={`${path}.service`}
              allowableTypes={allowableTypes}
              readonly={readonly}
              customStepProps={{
                stageIdentifier,
                deploymentType: deploymentStage?.deploymentType,
                gitOpsEnabled: deploymentStage?.gitOpsEnabled,
                deploymentMetadata: deploymentStage?.deploymentMetadata,
                allValues: pick(deploymentStage, ['service']),
                customDeploymentData: deploymentStage?.customDeploymentRef,
                childPipelineMetadata
              }}
              onUpdate={data => formik?.setFieldValue(`${path}.service`, get(data, 'service'))}
              viewTypeMetadata={viewTypeMetadata}
            />
          )}

          {!isNil(deploymentStage?.deploymentType) && serviceIdentifier && !isValueRuntimeInput(serviceIdentifier) && (
            <StepWidget<ServiceSpec>
              factory={factory}
              initialValues={deploymentStageInputSet?.service?.serviceInputs?.serviceDefinition?.spec || {}}
              allowableTypes={allowableTypes}
              template={deploymentStageTemplate?.service?.serviceInputs?.serviceDefinition?.spec || {}}
              type={getStepTypeByDeploymentType(defaultTo(deploymentStage?.deploymentType, ''))}
              stepViewType={viewType}
              path={`${path}.service.serviceInputs.serviceDefinition.spec`}
              readonly={readonly}
              customStepProps={{
                stageIdentifier,
                serviceBranch: deploymentStageInputSet?.service?.gitBranch,
                serviceIdentifier,
                allValues: deploymentStage?.service?.serviceInputs?.serviceDefinition?.spec,
                resolvedValues: resolvedStage?.service?.serviceInputs?.serviceDefinition?.spec,
                childPipelineMetadata
              }}
              onUpdate={(data: any) => {
                /* istanbul ignore next */
                if (deploymentStageInputSet?.service?.serviceInputs?.serviceDefinition?.spec) {
                  deploymentStageInputSet.service.serviceInputs.serviceDefinition.spec = data
                  formik?.setValues(set(formik?.values, path, deploymentStageInputSet))
                }
              }}
              viewTypeMetadata={viewTypeMetadata}
            />
          )}
        </div>
      )}
    </div>
  )
}
