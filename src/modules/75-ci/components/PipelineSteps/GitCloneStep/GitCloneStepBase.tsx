/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Formik, FormikForm, Accordion, Container } from '@harness/uicore'
import type { FormikProps } from 'formik'
import { get, isEmpty } from 'lodash-es'
import { useParams } from 'react-router-dom'
import { getImagePullPolicyOptions } from '@common/utils/ContainerRunStepUtils'
import type { StepFormikFowardRef } from '@pipeline/components/AbstractSteps/Step'
import { setFormikRef } from '@pipeline/components/AbstractSteps/Step'
import { useQueryParams } from '@common/hooks'
import type { GitQueryParams, PipelineType } from '@common/interfaces/RouteInterfaces'
import { getGitProviderCards } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { useStrings } from 'framework/strings'
import StepCommonFields from '@ci/components/PipelineSteps/StepCommonFields/StepCommonFields'
import { getConnectorRefWidth, isRuntimeInput } from '@pipeline/utils/CIUtils'
import {
  getInitialValuesInCorrectFormat,
  getFormValuesInCorrectFormat
} from '@pipeline/components/PipelineSteps/Steps/StepsTransformValuesUtils'
import { validate } from '@pipeline/components/PipelineSteps/Steps/StepsValidateUtils'
import {
  runtimeInputGearWidth,
  CodebaseRuntimeInputsInterface
} from '@pipeline/components/PipelineStudio/RightBar/RightBarUtils'
import { useGetConnector, ConnectorInfoDTO } from 'services/cd-ng'
import { getScopeFromValue, getIdentifierFromValue } from '@common/components/EntityReference/EntityReference'
import { Scope } from '@common/interfaces/SecretsInterface'
import { Connectors } from '@platform/connectors/constants'
import type { CIBuildInfrastructureType } from '@pipeline/utils/constants'
import { CIStepOptionalConfig } from '../CIStep/CIStepOptionalConfig'
import { transformValuesFieldsConfig, getEditViewValidateFieldsConfig } from './GitCloneStepFunctionConfigs'
import type { GitCloneStepProps, GitCloneStepData, GitCloneStepDataUI } from './GitCloneStep'
import { CIStep } from '../CIStep/CIStep'
import { getIsRepoNameRequired, useGetPropagatedStageById } from '../CIStep/StepUtils'
import css from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

export const GitCloneStepBase = (
  { initialValues, onUpdate, isNewStep = true, readonly, stepViewType, onChange }: GitCloneStepProps,
  formikRef: StepFormikFowardRef<GitCloneStepData>
): JSX.Element => {
  const {
    state: {
      selectionState: { selectedStageId }
    },
    isReadonly
  } = usePipelineContext()
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()

  const { getString } = useStrings()

  const currentStage = useGetPropagatedStageById(selectedStageId || '')

  const buildInfrastructureType: CIBuildInfrastructureType = get(currentStage, 'stage.spec.infrastructure.type')
  const [connectionType, setConnectionType] = React.useState('')
  const [connectorUrl, setConnectorUrl] = React.useState('')
  const [codebaseConnector, setCodebaseConnector] = React.useState<ConnectorInfoDTO>()
  const [codebaseRuntimeInputs, setCodebaseRuntimeInputs] = React.useState<CodebaseRuntimeInputsInterface>({
    ...(isRuntimeInput(initialValues?.spec?.connectorRef) ? { connectorRef: true, repoName: true } : {})
  })
  const { accountId, projectIdentifier, orgIdentifier } = useParams<
    PipelineType<{
      orgIdentifier: string
      projectIdentifier: string
      pipelineIdentifier: string
      accountId: string
    }>
  >()

  const connectorId = getIdentifierFromValue(initialValues.spec?.connectorRef || '')
  const initialScope = getScopeFromValue(initialValues.spec?.connectorRef || '')
  const { CODE_ENABLED } = useFeatureFlags()
  const initialValuesWithProvider = Object.assign({}, initialValues, {
    provider:
      !CODE_ENABLED || initialValues?.spec?.connectorRef
        ? getGitProviderCards(getString)[1]
        : getGitProviderCards(getString)[0]
  })

  const {
    data: connector,
    loading,
    refetch
  } = useGetConnector({
    identifier: connectorId,
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier: initialScope === Scope.ORG || initialScope === Scope.PROJECT ? orgIdentifier : undefined,
      projectIdentifier: initialScope === Scope.PROJECT ? projectIdentifier : undefined,
      ...(repoIdentifier && branch ? { repoIdentifier, branch, getDefaultFromOtherRepo: true } : {})
    },
    lazy: true,
    debounce: 300
  })

  React.useEffect(() => {
    if (!isEmpty(initialValues.spec?.connectorRef) && !isRuntimeInput(initialValues.spec.connectorRef)) {
      refetch()
    }
  }, [initialValues.spec?.connectorRef])
  // should move below to render
  React.useEffect(() => {
    if (connector?.data?.connector) {
      setConnectionType(
        connector?.data?.connector?.type === Connectors.GIT
          ? connector?.data?.connector.spec.connectionType
          : connector?.data?.connector.spec.type
      )
      setConnectorUrl(connector?.data?.connector.spec.url)
      setCodebaseConnector(connector.data.connector)
    }
  }, [
    connector?.data?.connector,
    connector?.data?.connector?.spec.type,
    connector?.data?.connector?.spec.url,
    setConnectionType,
    setConnectorUrl
  ])
  return (
    <Formik
      initialValues={getInitialValuesInCorrectFormat<GitCloneStepData, GitCloneStepDataUI>(
        initialValuesWithProvider,
        transformValuesFieldsConfig,
        { imagePullPolicyOptions: getImagePullPolicyOptions(getString) }
      )}
      formName="GitCloneStep"
      validate={valuesToValidate => {
        const schemaValues = getFormValuesInCorrectFormat<GitCloneStepDataUI, GitCloneStepData>(
          valuesToValidate,
          transformValuesFieldsConfig
        )
        onChange?.(schemaValues)
        return validate(
          valuesToValidate,
          getEditViewValidateFieldsConfig({
            isRepoNameRequired: getIsRepoNameRequired({
              connectorRef: valuesToValidate.spec?.connectorRef,
              connectorType: codebaseConnector?.spec?.type
            })
          }),
          {
            initialValues,
            steps: currentStage?.stage?.spec?.execution?.steps || {},
            serviceDependencies: currentStage?.stage?.spec?.serviceDependencies || {},
            getString
          },
          stepViewType
        )
      }}
      onSubmit={(_values: GitCloneStepDataUI) => {
        const schemaValues = getFormValuesInCorrectFormat<GitCloneStepDataUI, GitCloneStepData>(
          _values,
          transformValuesFieldsConfig
        )
        onUpdate?.(schemaValues)
      }}
    >
      {(formik: FormikProps<GitCloneStepData>) => {
        setFormikRef?.(formikRef, formik)
        const connectorWidth = getConnectorRefWidth('DefaultView')
        const connectorRefValue = formik.values.spec?.connectorRef
        const isConnectorRuntimeInput = isRuntimeInput(connectorRefValue)
        return (
          <FormikForm>
            <CIStep
              isNewStep={isNewStep}
              readonly={readonly}
              stepViewType={stepViewType}
              enableFields={{
                name: {},
                description: {},
                ['spec.connectorAndRepo']: {
                  connectorUrl,
                  connectionType,
                  connectorWidth: isConnectorRuntimeInput ? connectorWidth - runtimeInputGearWidth : connectorWidth,
                  setConnectionType,
                  loading,
                  setConnectorUrl,
                  repoIdentifier,
                  branch,
                  isReadonly,
                  setCodebaseRuntimeInputs,
                  codebaseRuntimeInputs,
                  connector: codebaseConnector,
                  onConnectorChange: setCodebaseConnector
                },
                ['spec.build']: {},
                ['spec.cloneDirectory']: { tooltipId: 'cloneDirectory', optional: true }
              }}
              formik={formik}
            />
            <Accordion className={css.accordion}>
              <Accordion.Panel
                id="optional-config"
                summary={getString('pipeline.additionalConfiguration')}
                details={
                  <Container margin={{ top: 'medium' }}>
                    <CIStepOptionalConfig
                      stepViewType={stepViewType}
                      readonly={readonly}
                      enableFields={{
                        'spec.depth': {},
                        'spec.sslVerify': {}
                      }}
                    />
                    <StepCommonFields disabled={readonly} buildInfrastructureType={buildInfrastructureType} />
                  </Container>
                }
              />
            </Accordion>
          </FormikForm>
        )
      }}
    </Formik>
  )
}

export const GitCloneStepBaseWithRef = React.forwardRef(GitCloneStepBase)
