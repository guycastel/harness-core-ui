/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { StepWizard } from '@harness/uicore'
import { Connectors, CreateConnectorModalProps } from '@platform/connectors/constants'
import {
  getConnectorIconByType,
  getConnectorTitleIdByType
} from '@platform/connectors/pages/connectors/utils/ConnectorHelper'
import { useStrings } from 'framework/strings'

import ConnectorTestConnection from '@platform/connectors/common/ConnectorTestConnection/ConnectorTestConnection'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { CCM_CONNECTOR_SAVE_EVENT, CCM_CONNECTOR_SAVE_SUCCESS } from '@platform/connectors/trackingConstants'
import Overview, { CEAzureDTO } from './Steps/Overview/AzureConnectorOverview'
import Billing from './Steps/Billing/AzureConnectorBilling'
import ModalExtension from './ModalExtension'
import AzureConnectorBillingExtension from './Steps/Billing/AzureConnectorBillingExtension'
import ChooseRequirements from './Steps/CreateServicePrincipal/ChooseRequirements'
import CreateServicePrincipal from './Steps/CreateServicePrincipal/CreateServicePrincipal'
import css from './CreateCeAzureConnector_new.module.scss'

const CreateCeAzureConnector: React.FC<CreateConnectorModalProps> = props => {
  const { getString } = useStrings()
  const { trackEvent } = useTelemetry()
  return (
    <ModalExtension renderExtension={AzureConnectorBillingExtension}>
      <StepWizard
        icon={getConnectorIconByType(Connectors.CE_AZURE)}
        iconProps={{ size: 40 }}
        title={getString(getConnectorTitleIdByType(Connectors.CE_AZURE))}
        className={css.azureConnector}
      >
        <Overview
          type={Connectors.CE_AZURE}
          name={getString('platform.connectors.ceAzure.steps.overview')}
          isEditMode={props.isEditMode}
          connectorInfo={props.connectorInfo as CEAzureDTO}
          gitDetails={props.gitDetails}
        />
        <Billing name={getString('platform.connectors.ceAzure.steps.billingExports')} />
        <ChooseRequirements name={getString('platform.connectors.ceAzure.steps.requirements')} />
        <CreateServicePrincipal name={getString('platform.connectors.ceAzure.steps.servicePrincipal')} />
        <ConnectorTestConnection
          name={getString('platform.connectors.ceAzure.testConnection.heading')}
          connectorInfo={props.connectorInfo}
          isStep={true}
          isLastStep={true}
          type={Connectors.CE_AZURE}
          onClose={() => {
            trackEvent(CCM_CONNECTOR_SAVE_EVENT, { type: Connectors.CE_AZURE })
            props.onClose()
          }}
          onTestConnectionSuccess={() => trackEvent(CCM_CONNECTOR_SAVE_SUCCESS, { type: Connectors.CE_AZURE })}
        />
      </StepWizard>
    </ModalExtension>
  )
}

export default CreateCeAzureConnector