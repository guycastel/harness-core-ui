/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { StepWizard, Icon, AllowedTypes } from '@harness/uicore'
import type { IconProps } from '@harness/icons'
import { String, StringKeys, useStrings } from 'framework/strings'
import ConnectorDetailsStep from '@platform/connectors/components/CreateConnector/commonSteps/ConnectorDetailsStep'
import ConnectorTestConnection from '@platform/connectors/common/ConnectorTestConnection/ConnectorTestConnection'
import DelegateSelectorStep from '@platform/connectors/components/CreateConnector/commonSteps/DelegateSelectorStep/DelegateSelectorStep'
import StepDockerAuthentication from '@platform/connectors/components/CreateConnector/DockerConnector/StepAuth/StepDockerAuthentication'
import StepAWSAuthentication from '@platform/connectors/components/CreateConnector/AWSConnector/StepAuth/StepAWSAuthentication'
import StepNexusAuthentication from '@platform/connectors/components/CreateConnector/NexusConnector/StepAuth/StepNexusAuthentication'
import GcrAuthentication from '@platform/connectors/components/CreateConnector/GcrConnector/StepAuth/GcrAuthentication'
import StepArtifactoryAuthentication from '@platform/connectors/components/CreateConnector/ArtifactoryConnector/StepAuth/StepArtifactoryAuthentication'
import AzureAuthentication from '@platform/connectors/components/CreateConnector/AzureConnector/StepAuth/AzureAuthentication'
import GcpAuthentication from '@platform/connectors/components/CreateConnector/GcpConnector/StepAuth/GcpAuthentication'
import StepGithubAuthentication from '@platform/connectors/components/CreateConnector/GithubConnector/StepAuth/StepGithubAuthentication'
import StepJenkinsAuthentication from '@platform/connectors/components/CreateConnector/JenkinsConnector/StepAuth/StepJenkinsAuthentication'
import {
  buildArtifactoryPayload,
  buildAWSPayload,
  buildAzureArtifactsPayload,
  buildAzurePayload,
  buildDockerPayload,
  buildGcpPayload,
  buildJenkinsPayload,
  buildGithubPayload,
  buildNexusPayload,
  buildBambooPayload
} from '@platform/connectors/pages/connectors/utils/ConnectorUtils'
import ConnectivityModeStep from '@platform/connectors/components/CreateConnector/commonSteps/ConnectivityModeStep/ConnectivityModeStep'
import { ConnectivityModeType } from '@common/components/ConnectivityMode/ConnectivityMode'
import GitDetailsStep from '@platform/connectors/components/CreateConnector/commonSteps/GitDetailsStep'
import StepAzureArtifactAuthentication from '@platform/connectors/components/CreateConnector/AzureArtifactConnector/StepAuth/StepAzureArtifactAuthentication'
import StepBambooAuthentication from '@platform/connectors/components/CreateConnector/BambooConnector/StepAuth/StepBambooAuthentication'

import { ArtifactoryRepoType } from '../ArtifactRepository/ArtifactoryRepoType'
import { ArtifactConnector } from '../ArtifactRepository/ArtifactConnector'
import type { InitialArtifactDataType, ConnectorRefLabelType, ArtifactType } from '../ArtifactInterface'
import { ArtifactTitleIdByType, ArtifactToConnectorMap, ENABLED_ARTIFACT_TYPES } from '../ArtifactHelper'

import css from './ArtifactWizard.module.scss'

interface StepChangeData<SharedObject> {
  prevStep?: number
  nextStep?: number
  prevStepData: SharedObject
}
interface ArtifactWizardProps {
  handleViewChange: (isConnectorView: boolean) => void
  artifactInitialValue: InitialArtifactDataType
  types: Array<ArtifactType>
  lastSteps: JSX.Element
  newConnectorSteps?: any
  expressions: string[]
  labels: ConnectorRefLabelType
  selectedArtifact: ArtifactType | null
  changeArtifactType: (data: ArtifactType | null) => void
  newConnectorView: boolean
  iconsProps: IconProps | undefined
  isReadonly: boolean
  allowableTypes: AllowedTypes
  showConnectorStep: boolean
  newConnectorProps: any
  artifactWizardInitialStep: number
  showArtifactSelectionStep: boolean
}

function ArtifactWizard({
  types,
  labels,
  expressions,
  allowableTypes,
  selectedArtifact,
  changeArtifactType,
  handleViewChange,
  artifactInitialValue,
  newConnectorView,
  newConnectorProps,
  lastSteps,
  iconsProps,
  showConnectorStep,
  isReadonly,
  artifactWizardInitialStep,
  showArtifactSelectionStep
}: ArtifactWizardProps): React.ReactElement {
  const { getString } = useStrings()

  const [connectivityMode, setConnectivityMode] = React.useState<ConnectivityModeType>()

  const onStepChange = (arg: StepChangeData<any>): void => {
    if (arg?.prevStep && arg?.nextStep && arg.prevStep > arg.nextStep && arg.nextStep <= 2) {
      handleViewChange(false)
    }
  }

  const renderSubtitle = (): JSX.Element | undefined => {
    const stringId = selectedArtifact && ArtifactTitleIdByType[selectedArtifact]
    if (selectedArtifact) {
      return (
        <div className={css.subtitle} style={{ display: 'flex' }}>
          <Icon size={26} {...(iconsProps as IconProps)} />
          <String
            style={{ alignSelf: 'center', marginLeft: 'var(--spacing-small)' }}
            stringID={stringId as StringKeys}
          />
        </div>
      )
    }
    return undefined
  }

  const connectorAuthStep = (): JSX.Element => {
    switch (selectedArtifact) {
      case ENABLED_ARTIFACT_TYPES.DockerRegistry:
        return <StepDockerAuthentication name={getString('details')} {...newConnectorProps.auth} />
      case ENABLED_ARTIFACT_TYPES.Gcr:
        return <GcrAuthentication name={getString('details')} {...newConnectorProps.auth} />
      case ENABLED_ARTIFACT_TYPES.Jenkins:
        return <StepJenkinsAuthentication name={getString('details')} {...newConnectorProps.auth} />
      case ENABLED_ARTIFACT_TYPES.Bamboo:
        return <StepBambooAuthentication name={getString('details')} {...newConnectorProps.auth} />
      case ENABLED_ARTIFACT_TYPES.Ecr:
      case ENABLED_ARTIFACT_TYPES.AmazonS3:
      case ENABLED_ARTIFACT_TYPES.AmazonMachineImage:
        return <StepAWSAuthentication name={getString('credentials')} {...newConnectorProps.auth} />
      case ENABLED_ARTIFACT_TYPES.Nexus3Registry:
      case ENABLED_ARTIFACT_TYPES.Nexus2Registry:
        return (
          <StepNexusAuthentication
            name={getString('details')}
            {...newConnectorProps.auth}
            selectedArtifact={selectedArtifact}
          />
        )
      case ENABLED_ARTIFACT_TYPES.ArtifactoryRegistry:
        return <StepArtifactoryAuthentication name={getString('details')} {...newConnectorProps.auth} />
      case ENABLED_ARTIFACT_TYPES.Acr:
        return <AzureAuthentication name={getString('details')} {...newConnectorProps.auth} />
      case ENABLED_ARTIFACT_TYPES.GoogleArtifactRegistry:
      case ENABLED_ARTIFACT_TYPES.GoogleCloudStorage:
      case ENABLED_ARTIFACT_TYPES.GoogleCloudSource:
        return <GcpAuthentication name={getString('details')} {...newConnectorProps.auth} />
      case ENABLED_ARTIFACT_TYPES.AzureArtifacts:
        return <StepAzureArtifactAuthentication name={getString('details')} {...newConnectorProps.auth} />
      case ENABLED_ARTIFACT_TYPES.GithubPackageRegistry:
        return <StepGithubAuthentication name={getString('credentials')} {...newConnectorProps.auth} />
      default:
        return <></>
    }
  }

  const connectorAccountDetailsStep = (): JSX.Element => {
    switch (selectedArtifact) {
      case ENABLED_ARTIFACT_TYPES.GithubPackageRegistry:
        return (
          <GitDetailsStep
            type={ArtifactToConnectorMap[selectedArtifact]}
            {...newConnectorProps.connector}
            name={getString('details')}
          />
        )
      default:
        return <></>
    }
  }

  const getBuildPayload = () => {
    switch (selectedArtifact) {
      case ENABLED_ARTIFACT_TYPES.DockerRegistry:
        return buildDockerPayload
      case ENABLED_ARTIFACT_TYPES.GoogleArtifactRegistry:
      case ENABLED_ARTIFACT_TYPES.Gcr:
      case ENABLED_ARTIFACT_TYPES.GoogleCloudStorage:
      case ENABLED_ARTIFACT_TYPES.GoogleCloudSource:
        return buildGcpPayload
      case ENABLED_ARTIFACT_TYPES.Ecr:
      case ENABLED_ARTIFACT_TYPES.AmazonS3:
      case ENABLED_ARTIFACT_TYPES.AmazonMachineImage:
        return buildAWSPayload
      case ENABLED_ARTIFACT_TYPES.Nexus3Registry:
      case ENABLED_ARTIFACT_TYPES.Nexus2Registry:
        return buildNexusPayload
      case ENABLED_ARTIFACT_TYPES.ArtifactoryRegistry:
        return buildArtifactoryPayload
      case ENABLED_ARTIFACT_TYPES.Acr:
        return buildAzurePayload
      case ENABLED_ARTIFACT_TYPES.Jenkins:
        return buildJenkinsPayload
      case ENABLED_ARTIFACT_TYPES.Bamboo:
        return buildBambooPayload
      case ENABLED_ARTIFACT_TYPES.GithubPackageRegistry:
        return buildGithubPayload
      case ENABLED_ARTIFACT_TYPES.AzureArtifacts:
        return buildAzureArtifactsPayload
      default:
        return <></>
    }
  }

  const hasConnectivityModeStep = (): boolean => {
    switch (selectedArtifact) {
      case ENABLED_ARTIFACT_TYPES.DockerRegistry:
      case ENABLED_ARTIFACT_TYPES.GoogleArtifactRegistry:
      case ENABLED_ARTIFACT_TYPES.Ecr:
      case ENABLED_ARTIFACT_TYPES.AmazonS3:
      case ENABLED_ARTIFACT_TYPES.AmazonMachineImage:
      case ENABLED_ARTIFACT_TYPES.Acr:
      case ENABLED_ARTIFACT_TYPES.ArtifactoryRegistry:
      case ENABLED_ARTIFACT_TYPES.GoogleCloudStorage:
      case ENABLED_ARTIFACT_TYPES.GoogleCloudSource:
        return true
      default:
        return false
    }
  }

  return (
    <StepWizard
      className={css.existingDocker}
      subtitle={renderSubtitle()}
      onStepChange={onStepChange}
      initialStep={artifactWizardInitialStep}
    >
      {showArtifactSelectionStep ? (
        <ArtifactoryRepoType
          artifactTypes={types}
          name={getString('platform.connectors.artifactRepoType')}
          stepName={labels.firstStepName}
          selectedArtifact={selectedArtifact}
          artifactInitialValue={artifactInitialValue}
          changeArtifactType={changeArtifactType}
        />
      ) : null}
      {showConnectorStep ? (
        <ArtifactConnector
          name={getString('platform.connectors.artifactRepository')}
          stepName={labels.secondStepName}
          expressions={expressions}
          isReadonly={isReadonly}
          handleViewChange={() => handleViewChange(true)}
          initialValues={artifactInitialValue}
          selectedArtifact={selectedArtifact}
          allowableTypes={allowableTypes}
          showArtifactSelectionStep={showArtifactSelectionStep}
        />
      ) : null}

      {newConnectorView && selectedArtifact ? (
        <StepWizard title={getString('platform.connectors.createNewConnector')}>
          <ConnectorDetailsStep type={ArtifactToConnectorMap[selectedArtifact]} {...newConnectorProps.connector} />
          {selectedArtifact === ENABLED_ARTIFACT_TYPES.GithubPackageRegistry ? connectorAccountDetailsStep() : null}
          {connectorAuthStep()}
          {hasConnectivityModeStep() ? (
            <ConnectivityModeStep
              name={getString('platform.connectors.selectConnectivityMode')}
              type={ArtifactToConnectorMap[selectedArtifact]}
              {...newConnectorProps?.connectivity}
              buildPayload={getBuildPayload()}
              connectivityMode={connectivityMode}
              setConnectivityMode={setConnectivityMode}
            />
          ) : null}
          {connectivityMode === ConnectivityModeType.Delegate || !hasConnectivityModeStep() ? (
            <DelegateSelectorStep buildPayload={getBuildPayload()} {...newConnectorProps.delegate} />
          ) : null}
          <ConnectorTestConnection type={ArtifactToConnectorMap[selectedArtifact]} {...newConnectorProps.verify} />
        </StepWizard>
      ) : null}

      {lastSteps}
    </StepWizard>
  )
}

export default ArtifactWizard
