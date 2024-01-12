/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { BaseSyntheticEvent, useEffect, useRef, useState } from 'react'
import { isEmpty, noop, set } from 'lodash-es'
import { FormikProps } from 'formik'
import produce from 'immer'
import * as Yup from 'yup'

import {
  AllowedTypes,
  ConfirmationDialog,
  Formik,
  getMultiTypeFromValue,
  MultiTypeInputType,
  RUNTIME_INPUT_VALUE,
  useToggleOpen
} from '@harness/uicore'
import { Intent } from '@harness/design-system'

import { StringKeys, useStrings } from 'framework/strings'

import { Scope } from '@common/interfaces/SecretsInterface'
import { isMultiTypeExpression } from '@common/utils/utils'

import { useStageErrorContext } from '@pipeline/context/StageErrorContext'
import { DeployTabs } from '@pipeline/components/PipelineStudio/CommonUtils/DeployStageSetupShellUtils'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { DeploymentStageElementConfig } from '@pipeline/utils/pipelineTypes'
import { StageType } from '@pipeline/utils/stageHelpers'

import type { DeployEnvironmentEntityCustomStepProps, DeployEnvironmentEntityFormState } from './types'
import { getValidationSchema } from './utils/utils'

import { InlineEntityFiltersRadioType } from './components/InlineEntityFilters/InlineEntityFiltersUtils'
import BaseDeployEnvironmentEntityStep from './BaseDeployEnvironmentEntityStep'

export interface DeployEnvironmentEntityWidgetProps extends Required<DeployEnvironmentEntityCustomStepProps> {
  initialValues: DeployEnvironmentEntityFormState
  readonly: boolean
  allowableTypes: AllowedTypes
  onUpdate?: (data: DeployEnvironmentEntityFormState) => void
}

function getRadioValueFromInitialValues(initialValues: DeployEnvironmentEntityFormState): StringKeys {
  if (initialValues.environmentGroup) {
    return 'common.environmentGroup.label'
  } else {
    return 'environments'
  }
}

export default function DeployEnvironmentEntityWidget({
  initialValues,
  readonly,
  allowableTypes,
  onUpdate,
  serviceIdentifiers,
  stageIdentifier,
  deploymentType,
  customDeploymentRef,
  gitOpsEnabled
}: DeployEnvironmentEntityWidgetProps): JSX.Element {
  const { getString } = useStrings()
  const [radioValue, setRadioValue] = useState<string>(getString(getRadioValueFromInitialValues(initialValues)))
  const {
    state: {
      selectionState: { selectedStageId }
    },
    scope,
    getStageFromPipeline
  } = usePipelineContext()

  const formikRef = useRef<FormikProps<DeployEnvironmentEntityFormState> | null>(null)
  const environmentsTypeRef = useRef<MultiTypeInputType | null>(null)
  const { stage } = getStageFromPipeline<DeploymentStageElementConfig>(selectedStageId || '')
  const isCustomStage = stage?.stage?.type === StageType.CUSTOM

  const {
    isOpen: isSwitchToMultiEnvironmentDialogOpen,
    open: openSwitchToMultiEnvironmentDialog,
    close: closeSwitchToMultiEnvironmentDialog
  } = useToggleOpen()

  const {
    isOpen: isSwitchToMultiEnvironmentClearDialogOpen,
    open: openSwitchToMultiEnvironmentClearDialog,
    close: closeSwitchToMultiEnvironmentClearDialog
  } = useToggleOpen()

  const {
    isOpen: isSwitchToSingleEnvironmentDialogOpen,
    open: openSwitchToSingleEnvironmentDialog,
    close: closeSwitchToSingleEnvironmentDialog
  } = useToggleOpen()

  const {
    isOpen: isSwitchToEnvironmentGroupDialogOpen,
    open: openSwitchToEnvironmentGroupDialog,
    close: closeSwitchToEnvironmentGroupDialog
  } = useToggleOpen()

  const { subscribeForm, unSubscribeForm } = useStageErrorContext<DeployEnvironmentEntityFormState>()
  useEffect(() => {
    subscribeForm({ tab: DeployTabs.ENVIRONMENT, form: formikRef })
    return () => unSubscribeForm({ tab: DeployTabs.ENVIRONMENT, form: formikRef })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateValuesInFormikAndPropogate(values: DeployEnvironmentEntityFormState): void {
    /* istanbul ignore else */
    if (formikRef.current) {
      formikRef.current.setTouched({ environment: true, environments: true, environmentGroup: true })
      formikRef.current.setValues(values)
    }
  }

  function handleSwitchToMultiEnvironmentConfirmation(confirmed: boolean): void {
    /* istanbul ignore else */
    if (formikRef.current && confirmed) {
      const environment = formikRef.current.values.environment
      const environmentGroup = formikRef.current.values.environmentGroup
      const infrastructure = formikRef.current.values.infrastructure
      const cluster = formikRef.current.values.cluster

      const newValues = produce(formikRef.current.values, draft => {
        draft.category = 'multi'
        draft.parallel = true

        draft.environments =
          environment && !environmentGroup
            ? getMultiTypeFromValue(environment) === MultiTypeInputType.RUNTIME
              ? (RUNTIME_INPUT_VALUE as any)
              : [{ label: environment, value: environment }]
            : []

        draft.environmentFilters = {}

        delete draft.environment
        delete draft.environmentGroup

        delete draft.infrastructure
        delete draft.infrastructures

        delete draft.cluster
        delete draft.clusters

        if (environment) {
          if (gitOpsEnabled) {
            set(
              draft,
              `clusters.${environment}`,
              cluster
                ? getMultiTypeFromValue(cluster) === MultiTypeInputType.RUNTIME
                  ? RUNTIME_INPUT_VALUE
                  : [{ label: cluster, value: cluster }]
                : []
            )
          } else {
            set(
              draft,
              `infrastructures.${environment}`,
              infrastructure
                ? getMultiTypeFromValue(infrastructure) === MultiTypeInputType.RUNTIME
                  ? RUNTIME_INPUT_VALUE
                  : [{ label: infrastructure, value: infrastructure }]
                : undefined
            )
          }
        }
      })
      updateValuesInFormikAndPropogate(
        scope === Scope.PROJECT
          ? newValues
          : {
              environments: RUNTIME_INPUT_VALUE as any,
              category: 'multi',
              parallel: true
            }
      )
      setRadioValue(getString('environments'))
    }

    closeSwitchToMultiEnvironmentDialog()
  }

  function handleSwitchToMultiEnvironmentClearConfirmation(confirmed: boolean): void {
    /* istanbul ignore else */
    if (formikRef.current && confirmed) {
      const newValues = produce(formikRef.current.values, draft => {
        draft.category = 'multi'
        draft.parallel = true

        draft.environments = []

        draft.environmentFilters = {}

        delete draft.environment
        delete draft.environmentGroup

        delete draft.infrastructure
        delete draft.infrastructures

        delete draft.cluster
        delete draft.clusters
      })

      updateValuesInFormikAndPropogate(newValues)
      setRadioValue(getString('environments'))
    }

    closeSwitchToMultiEnvironmentClearDialog()
  }

  function handleSwitchToSingleEnvironmentConfirmation(confirmed: boolean): void {
    /* istanbul ignore else */
    if (formikRef.current && confirmed) {
      const newValues = produce(formikRef.current.values, draft => {
        draft.category = 'single'
        draft.environment = ''
        delete draft.environments
        delete draft.infrastructures
        delete draft.clusters
        delete draft.environmentGroup
      })
      updateValuesInFormikAndPropogate(
        scope === Scope.PROJECT
          ? newValues
          : {
              environment: RUNTIME_INPUT_VALUE,
              category: 'single'
            }
      )
      setRadioValue(getString('environments'))
    }

    closeSwitchToSingleEnvironmentDialog()
  }

  function handleSwitchToEnvironmentGroupConfirmation(confirmed: boolean): void {
    /* istanbul ignore else */
    if (formikRef.current && confirmed) {
      const newValues = produce(formikRef.current.values, draft => {
        draft.category = 'group'
        draft.environmentGroup = ''
        delete draft.environment
        delete draft.environments
      })
      updateValuesInFormikAndPropogate(
        scope === Scope.PROJECT
          ? newValues
          : {
              environmentGroup: RUNTIME_INPUT_VALUE,
              category: 'group'
            }
      )
      setRadioValue(getString('common.environmentGroup.label'))
    }

    closeSwitchToEnvironmentGroupDialog()
  }

  function handleMultiEnvironmentToggle(checked: boolean): void {
    // istanbul ignore else
    if (formikRef.current) {
      const formValues = formikRef.current.values
      if (checked) {
        if (formValues.environment && scope === Scope.PROJECT) {
          if (isMultiTypeExpression(environmentsTypeRef.current as MultiTypeInputType)) {
            // We need to clear the data in case of expressions as multi environments do not support it
            openSwitchToMultiEnvironmentClearDialog()
          } else {
            openSwitchToMultiEnvironmentDialog()
          }
        } else {
          handleSwitchToMultiEnvironmentConfirmation(true)
        }
      } else {
        if ((!isEmpty(formValues.environments) || !isEmpty(formValues.environmentGroup)) && scope === Scope.PROJECT) {
          openSwitchToSingleEnvironmentDialog()
        } else {
          handleSwitchToSingleEnvironmentConfirmation(true)
        }
      }
    }
  }

  function handleEnvironmentGroupToggle(event: BaseSyntheticEvent): void {
    if (event.target.value === getString('environments')) {
      if (formikRef.current?.values.environmentGroup && scope === Scope.PROJECT) {
        openSwitchToMultiEnvironmentDialog()
      } else {
        handleSwitchToMultiEnvironmentConfirmation(true)
        setRadioValue(event?.target.value)
      }
    } else {
      if (formikRef.current?.values.environments && scope === Scope.PROJECT) {
        openSwitchToEnvironmentGroupDialog()
      } else {
        handleSwitchToEnvironmentGroupConfirmation(true)
        setRadioValue(event?.target.value)
      }
    }
  }

  function handleFilterRadio(selectedRadioValue: InlineEntityFiltersRadioType): void {
    if (selectedRadioValue === InlineEntityFiltersRadioType.MANUAL) {
      formikRef.current?.setFieldValue('environmentFilters.fixedScenario', undefined)
    }
  }

  const isSingleEnvEnabled = React.useMemo(() => {
    return formikRef.current?.values.category === 'single'
  }, [formikRef.current?.values.category])

  return (
    <>
      <Formik<DeployEnvironmentEntityFormState>
        // ! Do not set enableReinitialize to true.
        enableReinitialize={!!isSingleEnvEnabled}
        formName="deployEnvironmentEntityWidgetForm"
        onSubmit={noop}
        validate={(values: DeployEnvironmentEntityFormState) => {
          onUpdate?.({ ...values })
        }}
        initialValues={initialValues}
        validationSchema={isCustomStage ? Yup.object() : getValidationSchema(getString, gitOpsEnabled)}
      >
        {formik => {
          window.dispatchEvent(new CustomEvent('UPDATE_ERRORS_STRIP', { detail: DeployTabs.ENVIRONMENT }))
          formikRef.current = formik

          return (
            <BaseDeployEnvironmentEntityStep
              serviceIdentifiers={serviceIdentifiers}
              stageIdentifier={stageIdentifier}
              deploymentType={deploymentType}
              gitOpsEnabled={gitOpsEnabled}
              customDeploymentRef={customDeploymentRef}
              initialValues={initialValues}
              readonly={readonly}
              allowableTypes={allowableTypes}
              handleMultiEnvironmentToggle={handleMultiEnvironmentToggle}
              handleEnvironmentGroupToggle={handleEnvironmentGroupToggle}
              radioValue={radioValue}
              handleFilterRadio={handleFilterRadio}
              environmentsTypeRef={environmentsTypeRef}
            />
          )
        }}
      </Formik>

      <ConfirmationDialog
        isOpen={isSwitchToMultiEnvironmentDialogOpen}
        titleText={getString('cd.pipelineSteps.environmentTab.multiEnvironmentsDialogTitleText')}
        contentText={getString('cd.pipelineSteps.environmentTab.multiEnvironmentsConfirmationText')}
        confirmButtonText={getString('applyChanges')}
        cancelButtonText={getString('cancel')}
        onClose={handleSwitchToMultiEnvironmentConfirmation}
        intent={Intent.WARNING}
      />

      <ConfirmationDialog
        isOpen={isSwitchToMultiEnvironmentClearDialogOpen}
        titleText={getString('cd.pipelineSteps.environmentTab.multiEnvironmentsDialogTitleText')}
        contentText={getString('cd.pipelineSteps.environmentTab.multiEnvironmentsClearConfirmationText')}
        confirmButtonText={getString('applyChanges')}
        cancelButtonText={getString('cancel')}
        onClose={handleSwitchToMultiEnvironmentClearConfirmation}
        intent={Intent.WARNING}
      />

      <ConfirmationDialog
        isOpen={isSwitchToSingleEnvironmentDialogOpen}
        titleText={getString('cd.pipelineSteps.environmentTab.singleEnvironmentDialogTitleText')}
        contentText={getString('cd.pipelineSteps.environmentTab.singleEnvironmentConfirmationText')}
        confirmButtonText={getString('applyChanges')}
        cancelButtonText={getString('cancel')}
        onClose={handleSwitchToSingleEnvironmentConfirmation}
        intent={Intent.WARNING}
      />

      <ConfirmationDialog
        isOpen={isSwitchToEnvironmentGroupDialogOpen}
        titleText={getString('cd.pipelineSteps.environmentTab.environmentGroupDialogTitleText')}
        contentText={getString('cd.pipelineSteps.environmentTab.environmentGroupConfirmationText')}
        confirmButtonText={getString('applyChanges')}
        cancelButtonText={getString('cancel')}
        onClose={handleSwitchToEnvironmentGroupConfirmation}
        intent={Intent.WARNING}
      />
    </>
  )
}
