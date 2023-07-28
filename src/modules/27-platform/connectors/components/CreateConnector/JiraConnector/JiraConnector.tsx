/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'

import { StepWizard } from '@harness/uicore'
import { pick } from 'lodash-es'
import {
  Connectors,
  CONNECTOR_CREDENTIALS_STEP_IDENTIFIER,
  TESTCONNECTION_STEP_INDEX
} from '@platform/connectors/constants'
import type { ConnectorConfigDTO, ConnectorInfoDTO, ResponseBoolean } from 'services/cd-ng'
import ConnectorTestConnection from '@platform/connectors/common/ConnectorTestConnection/ConnectorTestConnection'

import {
  getConnectorTitleIdByType,
  getConnectorIconByType
} from '@platform/connectors/pages/connectors/utils/ConnectorHelper'
import { useStrings } from 'framework/strings'
import { buildJiraPayload } from '@platform/connectors/pages/connectors/utils/ConnectorUtils'
import type { IGitContextFormProps } from '@common/components/GitContextForm/GitContextForm'
import DelegateSelectorStep from '../commonSteps/DelegateSelectorStep/DelegateSelectorStep'
import ConnectorDetailsStep from '../commonSteps/ConnectorDetailsStep'
import JiraDetailsForm from './JiraDetailsForm'

interface CreateJiraConnectorProps {
  onSuccess?: (data?: ConnectorConfigDTO) => void | Promise<void>
  mock?: ResponseBoolean
  onClose: () => void
  isEditMode?: boolean
  connectorInfo?: ConnectorInfoDTO | void
  gitDetails?: IGitContextFormProps
  context?: number
  accountId: string
  orgIdentifier: string
  projectIdentifier: string
}
const JiraConnector: React.FC<CreateJiraConnectorProps> = props => {
  const { getString } = useStrings()
  const commonProps = pick(props, ['accountId', 'orgIdentifier', 'projectIdentifier'])

  const [isEditMode, setIsEditMode] = React.useState(props?.isEditMode || false)
  return (
    <StepWizard
      icon={getConnectorIconByType(Connectors.Jira)}
      iconProps={{ size: 50 }}
      title={getString(getConnectorTitleIdByType(Connectors.Jira))}
    >
      <ConnectorDetailsStep
        type={Connectors.Jira}
        name={getString('overview')}
        isEditMode={props.isEditMode}
        connectorInfo={props.connectorInfo}
        gitDetails={props.gitDetails}
        mock={props.mock}
        helpPanelReferenceId="JiraConnectorOverview"
      />
      <JiraDetailsForm
        name={getString('details')}
        identifier={CONNECTOR_CREDENTIALS_STEP_IDENTIFIER}
        {...commonProps}
        onConnectorCreated={props.onSuccess}
        isEditMode={isEditMode}
        connectorInfo={props.connectorInfo}
        setIsEditMode={setIsEditMode}
      />
      <DelegateSelectorStep
        name={getString('delegate.DelegateselectionLabel')}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        buildPayload={buildJiraPayload}
        hideModal={props.onClose}
        onConnectorCreated={props.onSuccess}
        connectorInfo={props.connectorInfo}
        gitDetails={props.gitDetails}
        helpPanelReferenceId="ConnectorDelegatesSetup"
      />
      <ConnectorTestConnection
        name={getString('platform.connectors.stepThreeName')}
        connectorInfo={props.connectorInfo}
        isStep={true}
        isLastStep={true}
        type={Connectors.Jira}
        onClose={props.onClose}
        stepIndex={TESTCONNECTION_STEP_INDEX}
        helpPanelReferenceId="ConnectorTest"
      />
    </StepWizard>
  )
}

export default JiraConnector