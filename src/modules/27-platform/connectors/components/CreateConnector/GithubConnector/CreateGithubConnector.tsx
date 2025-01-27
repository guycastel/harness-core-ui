/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { StepWizard } from '@harness/uicore'
import { Color } from '@harness/design-system'
import { pick } from 'lodash-es'
import {
  Connectors,
  CONNECTOR_CREDENTIALS_STEP_IDENTIFIER,
  CreateConnectorModalProps,
  GIT_TESTCONNECTION_STEP_INDEX
} from '@platform/connectors/constants'
import ConnectorTestConnection from '@platform/connectors/common/ConnectorTestConnection/ConnectorTestConnection'
import { useStrings } from 'framework/strings'
import {
  getConnectorIconByType,
  getConnectorTitleIdByType
} from '@platform/connectors/pages/connectors/utils/ConnectorHelper'
import { buildGithubPayload } from '@platform/connectors/pages/connectors/utils/ConnectorUtils'
import { ConnectivityModeType } from '@common/components/ConnectivityMode/ConnectivityMode'
import ConnectorDetailsStep from '../commonSteps/ConnectorDetailsStep'
import GitDetailsStep from '../commonSteps/GitDetailsStep'
import StepGithubAuthentication from './StepAuth/StepGithubAuthentication'
import DelegateSelectorStep from '../commonSteps/DelegateSelectorStep/DelegateSelectorStep'
import ConnectivityModeStep from '../commonSteps/ConnectivityModeStep/ConnectivityModeStep'

const CreateGithubConnector = (props: CreateConnectorModalProps): JSX.Element => {
  const { getString } = useStrings()
  const commonProps = pick(props, [
    'isEditMode',
    'connectorInfo',
    'gitDetails',
    'status',
    'setIsEditMode',
    'accountId',
    'orgIdentifier',
    'projectIdentifier',
    'connectivityMode',
    'setConnectivityMode'
  ])

  return (
    <StepWizard
      icon={getConnectorIconByType(Connectors.GITHUB)}
      iconProps={{ size: 37, color: Color.BLACK }}
      title={getString(getConnectorTitleIdByType(Connectors.GITHUB))}
    >
      <ConnectorDetailsStep
        type={Connectors.GITHUB}
        name={getString('overview')}
        isEditMode={props.isEditMode}
        connectorInfo={props.connectorInfo}
        gitDetails={props.gitDetails}
        mock={props.mock}
        helpPanelReferenceId="gitHubConnectorOverview"
      />
      <GitDetailsStep
        type={Connectors.GITHUB}
        name={getString('details')}
        isEditMode={props.isEditMode}
        connectorInfo={props.connectorInfo}
        mock={props.mock}
        helpPanelReferenceId="gitHubConnectorDetails"
      />
      <StepGithubAuthentication
        name={getString('credentials')}
        identifier={CONNECTOR_CREDENTIALS_STEP_IDENTIFIER}
        {...commonProps}
        onConnectorCreated={props.onSuccess}
        helpPanelReferenceId="gitHubConnectorCredentials"
      />

      <ConnectivityModeStep
        name={getString('platform.connectors.selectConnectivityMode')}
        type={Connectors.GITHUB}
        gitDetails={props.gitDetails}
        connectorInfo={props.connectorInfo}
        isEditMode={props.isEditMode}
        setIsEditMode={props.setIsEditMode}
        buildPayload={buildGithubPayload}
        connectivityMode={props.connectivityMode}
        setConnectivityMode={props.setConnectivityMode}
        hideModal={props.onClose}
        onConnectorCreated={props.onSuccess}
        helpPanelReferenceId="ConnectorConnectToTheProvider"
      />

      {props.connectivityMode === ConnectivityModeType.Delegate ? (
        <DelegateSelectorStep
          name={getString('delegate.DelegateselectionLabel')}
          isEditMode={props.isEditMode}
          setIsEditMode={props.setIsEditMode}
          buildPayload={buildGithubPayload}
          hideModal={props.onClose}
          onConnectorCreated={props.onSuccess}
          connectorInfo={props.connectorInfo}
          gitDetails={props.gitDetails}
          helpPanelReferenceId="ConnectorDelegatesSetup"
        />
      ) : null}

      <ConnectorTestConnection
        name={getString('platform.connectors.stepThreeName')}
        connectorInfo={props.connectorInfo}
        isStep={true}
        isLastStep={true}
        type={Connectors.GITHUB}
        onClose={props.onClose}
        stepIndex={GIT_TESTCONNECTION_STEP_INDEX}
        helpPanelReferenceId="ConnectorTest"
      />
    </StepWizard>
  )
}

export default CreateGithubConnector
