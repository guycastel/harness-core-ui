/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { featureFlagsCall } from '../../../support/85-cv/common'
import {
  validations,
  countOfServiceAPI,
  monitoredServiceListCall,
  monitoredServiceListResponse,
  newRelicServiceResponse,
  newrelicURL,
  parseSampleDataResponse,
  parseSampleDataURL,
  riskCategoryMock
} from '../../../support/85-cv/monitoredService/constants'
import { riskCategoryCall } from '../../../support/85-cv/monitoredService/health-sources/CloudWatch/constants'
import {
  metricPackCall,
  metricPackResponse,
  applicationCall,
  applicationResponse,
  metricDataCall,
  metricDataResponse,
  sampleDataResponse,
  sampleDataCall
} from '../../../support/85-cv/monitoredService/health-sources/NewRelic/constants'
import { Connectors } from '../../../utils/connctors-utils'

describe('Create empty monitored service', () => {
  beforeEach(() => {
    cy.login('test', 'test')
    cy.intercept('GET', monitoredServiceListCall, monitoredServiceListResponse)
    cy.intercept('GET', countOfServiceAPI, { allServicesCount: 1, servicesAtRiskCount: 0 })
    cy.visitChangeIntelligence()
    cy.visitSRMMonitoredServicePage()
  })

  it('Add new NewRelic monitored service ', () => {
    cy.intercept('GET', applicationCall, applicationResponse).as('ApplicationCall')
    cy.intercept('GET', metricPackCall, metricPackResponse).as('MetricPackCall')
    cy.intercept('GET', riskCategoryCall, riskCategoryMock).as('riskCategoryCall')
    cy.intercept('GET', metricDataCall, metricDataResponse).as('MetricDataCall')

    cy.addNewMonitoredServiceWithServiceAndEnv()

    // Fill Define HealthSource Tab with NewRelic
    cy.populateDefineHealthSource(Connectors.NEW_RELIC, 'NewRelicConn', 'NewRelic HS')
    cy.contains('span', 'Next').click()

    // Fill Customise HealthSource Tab for NewRelic
    cy.wait('@ApplicationCall')
    cy.wait('@MetricPackCall')
    cy.wait(1000)

    cy.get('input[name="Performance"]').should('be.checked')
    cy.get('input[name="Performance"]').uncheck({ force: true })

    // Validation
    cy.contains('span', 'Submit').click({ force: true })

    cy.contains('span', validations.metricPack).should('be.visible')

    cy.get('input[name="Performance"]').check({ force: true })
    cy.contains('span', validations.metricPack).should('not.exist')

    cy.contains('span', 'Please select application').should('be.visible')

    cy.findByTestId('applicationIdDropdown').should('exist').scrollIntoView().click()
    cy.contains('p', 'My Application').click({ force: true })
    cy.contains('span', 'Please select applications').should('not.exist')

    cy.contains('span', 'Submit').click({ force: true })

    cy.contains('div', 'NewRelic HS').click({ force: true })
    cy.contains('span', 'Next').click()

    cy.findByTestId('newRelicApplicationValue').should('have.text', '107019083')
    cy.get('input[name="Performance"]').should('be.checked')
    cy.contains('span', 'Submit').click({ force: true })

    // Creating the monitored service.
    cy.findByRole('button', { name: /Save/i }).click()
    cy.findByText('Monitored Service created').should('be.visible')
  })

  it('Add new NewRelic monitored service with custom metric', () => {
    cy.intercept('GET', applicationCall, applicationResponse).as('ApplicationCall')
    cy.intercept('GET', metricPackCall, metricPackResponse).as('MetricPackCall')
    cy.intercept('GET', metricDataCall, metricDataResponse).as('MetricDataCall')
    cy.intercept('GET', riskCategoryCall, riskCategoryMock).as('riskCategoryCall')
    cy.intercept('GET', sampleDataCall, sampleDataResponse).as('SampleDataCall')

    cy.addNewMonitoredServiceWithServiceAndEnv()

    // Fill Define HealthSource Tab with NewRelic
    cy.populateDefineHealthSource(Connectors.NEW_RELIC, 'NewRelicConn', 'NewRelic HS')
    cy.contains('span', 'Next').click()

    // Fill Customise HealthSource Tab for NewRelic
    cy.wait('@ApplicationCall')
    cy.wait('@MetricPackCall')

    cy.contains('span', 'Add Metric').click()

    // Custom validation
    cy.contains('span', 'Submit').click({ force: true })
    cy.contains('span', validations.groupName).scrollIntoView().should('be.visible')

    cy.get('input[name="groupName"]').click()
    cy.contains('p', '+ Add New').click({ force: true })
    cy.get('.bp3-overlay input[name="name"]').type('group 1')
    cy.get('.bp3-overlay button[type="submit"]').click({ force: true })

    cy.contains('div', 'Query Specifications and mapping').click({ force: true })
    cy.get('textarea[name="query"]')
      .click({ force: true })
      .type(
        "SELECT average(`apm.service.transaction.duration`) FROM Metric WHERE appName = 'My Application' TIMESERIES"
      )
    cy.contains('span', 'Fetch records').click()

    cy.contains('div', 'Metric values and charts').click({ force: true })

    cy.contains('span', 'Select path for Metric value').click({ force: true })
    cy.wait(1000)
    cy.get('[class*="JsonSelector-module_selectableKey"]').first().click({ force: true })

    cy.contains('span', 'Select path for timestamp field').click({ force: true })
    cy.wait(1000)
    cy.get('[class*="JsonSelector-module_selectableKey"]').first().click({ force: true })

    cy.contains('div', 'Assign').click({ force: true })
    cy.get('input[name="sli"]').click({ force: true })

    cy.findByTestId('applicationIdDropdown').should('exist').scrollIntoView().click({ force: true })
    cy.contains('p', '107019083').click({ force: true })

    cy.findByTestId('newRelicApplicationValue').should('have.text', '107019083')

    cy.contains('span', 'Submit').click({ force: true })

    // Open again
    cy.contains('div', 'NewRelic HS').click({ force: true })
    cy.wait(1000)
    cy.contains('span', 'Next').click({ force: true })

    // Delete all custom metric
    cy.get('span[data-icon="main-delete"]').click({ multiple: true })
    cy.contains('span', 'Add Metric').should('be.visible')

    cy.contains('span', 'Submit').click({ force: true })

    // Creating the monitored service.
    cy.findByRole('button', { name: /Save/i }).click()
    cy.findByText('Monitored Service created').should('be.visible')

    cy.intercept('GET', newrelicURL, newRelicServiceResponse).as('newrelicServiceCall')
    cy.intercept('POST', parseSampleDataURL, parseSampleDataResponse).as('parseSampleDataCall')

    cy.findByText(/service-1/i).click()

    cy.wait('@newrelicServiceCall')

    cy.findByText(/Configurations/i).click({ force: true })

    cy.get('#bp3-tab-title_monitoredServiceConfigurations_healthSource').click()
    cy.get('.TableV2--clickable').scrollIntoView().click()

    cy.findByText(/Next/i).click()

    cy.wait('@SampleDataCall').then(interception => {
      expect(interception.request.url).contains(
        'nrql=SELECT%20average%28%60apm.service.transaction.duration%60%29%20FROM%20Metric%20WHERE%20appName%20%3D%20%27My%20Application%27%20TIMESERIES'
      )
    })

    cy.get('div[data-testid="metricChart-summary"]').scrollIntoView().should('be.visible')
    cy.findByText(/Metric values and charts/i).click()
    cy.get('button[aria-label="Build Chart"]').scrollIntoView().should('be.visible')
    cy.findByRole('button', { name: /Build Chart/i }).click()

    cy.wait('@parseSampleDataCall')
  })

  describe('NewRelic metric thresholds', () => {
    beforeEach(() => {
      cy.fixture('api/users/feature-flags/accountId').then(featureFlagsData => {
        cy.intercept('GET', featureFlagsCall, {
          ...featureFlagsData,
          resource: [
            ...featureFlagsData.resource,
            {
              uuid: null,
              name: 'CVNG_METRIC_THRESHOLD',
              enabled: true,
              lastUpdatedAt: 0
            }
          ]
        })
      })

      cy.login('test', 'test')
      cy.intercept('GET', monitoredServiceListCall, monitoredServiceListResponse)
      cy.intercept('GET', countOfServiceAPI, { allServicesCount: 1, servicesAtRiskCount: 0 })
      cy.visitChangeIntelligence()
      cy.visitSRMMonitoredServicePage()
    })

    it('should test metric thresholds renders correctly and should hide metric thresholds if no metric packs are selected', () => {
      cy.intercept('GET', applicationCall, applicationResponse).as('ApplicationCall')
      cy.intercept('GET', metricPackCall, metricPackResponse).as('MetricPackCall')
      cy.intercept('GET', metricDataCall, metricDataResponse).as('MetricDataCall')
      cy.intercept('GET', riskCategoryCall, riskCategoryMock).as('riskCategoryCall')
      cy.intercept('GET', sampleDataCall, sampleDataResponse).as('SampleDataCall')

      cy.addNewMonitoredServiceWithServiceAndEnv()

      // Fill Define HealthSource Tab with AppDynamics
      cy.populateDefineHealthSource(Connectors.NEW_RELIC, 'NewRelicConn', 'NewRelic HS')
      cy.wait(1000)
      cy.contains('span', 'Next').click({ force: true })

      // Fill Customise HealthSource Tab for AppDynamics
      cy.wait('@ApplicationCall')
      cy.wait('@MetricPackCall')

      cy.contains('.Accordion--label', 'Advanced (Optional)').should('exist')

      // If no metric pack is selected, metric thresholds should be hidden
      cy.get('input[name="Performance"]').uncheck({ force: true })

      cy.contains('.Accordion--label', 'Advanced (Optional)').should('not.exist')
    })

    it('should add thresholds and do all the operations as expected', () => {
      cy.intercept('GET', applicationCall, applicationResponse).as('ApplicationCall')
      cy.intercept('GET', metricPackCall, metricPackResponse).as('MetricPackCall')
      cy.intercept('GET', metricDataCall, metricDataResponse).as('MetricDataCall')
      cy.intercept('GET', riskCategoryCall, riskCategoryMock).as('riskCategoryCall')
      cy.intercept('GET', sampleDataCall, sampleDataResponse).as('SampleDataCall')

      cy.addNewMonitoredServiceWithServiceAndEnv()

      // Fill Define HealthSource Tab with AppDynamics
      cy.populateDefineHealthSource(Connectors.NEW_RELIC, 'NewRelicConn', 'NewRelic HS')
      cy.wait(1000)
      cy.contains('span', 'Next').click({ force: true })

      // Fill Customise HealthSource Tab for AppDynamics
      cy.wait('@ApplicationCall')
      cy.wait('@MetricPackCall')

      cy.contains('.Accordion--label', 'Advanced (Optional)').should('exist')

      cy.findByTestId('AddThresholdButton').click()

      cy.contains('div', 'Ignore Thresholds (1)').should('exist')

      cy.get("input[name='ignoreThresholds.0.metricType']").should('have.value', 'Performance')

      // validations
      cy.findByRole('button', { name: /Submit/i }).click()
      cy.findAllByText('Required').should('have.length', 4)

      cy.get("input[name='ignoreThresholds.0.groupName']").type('*')
      cy.get("input[name='ignoreThresholds.0.metricName']").click()

      cy.contains('p', 'Calls per Minute').click()

      cy.get("input[name='ignoreThresholds.0.metricName']").should('have.value', 'Calls per Minute')

      // testing criteria

      cy.get("input[name='ignoreThresholds.0.criteria.type']").should('have.value', 'Absolute Value')
      cy.get("input[name='ignoreThresholds.0.criteria.spec.greaterThan']").should('exist')
      cy.get("input[name='ignoreThresholds.0.criteria.spec.lessThan']").should('exist')

      // greater than should be smaller than lesser than value
      cy.get("input[name='ignoreThresholds.0.criteria.spec.greaterThan']").type('12')
      cy.get("input[name='ignoreThresholds.0.criteria.spec.lessThan']").type('1')

      cy.get("input[name='ignoreThresholds.0.criteria.type']").click()
      cy.contains('p', 'Percentage Deviation').click()

      cy.get("input[name='ignoreThresholds.0.criteria.spec.greaterThan']").should('not.exist')
      cy.get("input[name='ignoreThresholds.0.criteria.spec.lessThan']").should('exist')

      cy.get("input[name='ignoreThresholds.0.groupName']").type('*')
      cy.get("input[name='ignoreThresholds.0.metricName']").click()

      cy.contains('p', 'Calls per Minute').click()

      cy.get("input[name='ignoreThresholds.0.criteria.spec.lessThan']").type('12')

      // Fail fast thresholds
      cy.contains('div', 'Fail-Fast Thresholds (0)').click()

      cy.findByTestId('AddThresholdButton').click()

      cy.get("input[name='failFastThresholds.0.groupName']").type('*')

      cy.get("input[name='failFastThresholds.0.metricName']").click()
      cy.contains('p', 'Calls per Minute').click()

      cy.get("input[name='failFastThresholds.0.spec.spec.count']").should('be.disabled')

      cy.get("input[name='failFastThresholds.0.spec.action']").click()
      cy.contains('p', 'Fail after multiple occurrences').click()
      cy.get("input[name='failFastThresholds.0.spec.spec.count']").should('not.be.disabled')
      cy.get("input[name='failFastThresholds.0.spec.spec.count']").type('4')

      cy.get("input[name='failFastThresholds.0.criteria.spec.greaterThan']").type('21')
      cy.get("input[name='failFastThresholds.0.criteria.spec.lessThan']").type('78')

      // Adding custom metrics
      cy.contains('span', 'Add Metric').click()

      cy.get('input[name="groupName"]').click()
      cy.contains('p', '+ Add New').click({ force: true })
      cy.get('.bp3-overlay input[name="name"]').type('group 1')
      cy.get('.bp3-overlay button[type="submit"]').click({ force: true })

      cy.contains('div', 'Assign').click({ force: true })
      cy.contains('span', 'Continuous Verification').click()

      cy.get("input[name='failFastThresholds.0.metricType']").scrollIntoView().click()

      cy.wait(1000)

      cy.get('.Select--menuItem:nth-child(2)').should('have.text', 'Custom')
      cy.get('.Select--menuItem:nth-child(2)').click()

      // group name should have created group name option
      cy.get("input[name='failFastThresholds.0.groupName']").click()

      cy.get('.Select--menuItem:nth-child(1)').should('have.text', 'group 1').scrollIntoView()
      cy.get('.Select--menuItem:nth-child(1)').click()

      // Selected group's metric name must be listed
      cy.get("input[name='failFastThresholds.0.metricName']").click()
      cy.get('.Select--menuItem:nth-child(1)').should('have.text', 'New Relic Metric')
      cy.get('.Select--menuItem:nth-child(1)').click()
    })

    it('should show prompt, if metric packs containing metric thresholds are being removed', () => {
      cy.intercept('GET', applicationCall, applicationResponse).as('ApplicationCall')
      cy.intercept('GET', metricPackCall, metricPackResponse).as('MetricPackCall')
      cy.intercept('GET', metricDataCall, metricDataResponse).as('MetricDataCall')
      cy.intercept('GET', riskCategoryCall, riskCategoryMock).as('riskCategoryCall')
      cy.intercept('GET', sampleDataCall, sampleDataResponse).as('SampleDataCall')

      cy.addNewMonitoredServiceWithServiceAndEnv()

      // Fill Define HealthSource Tab with AppDynamics
      cy.populateDefineHealthSource(Connectors.NEW_RELIC, 'NewRelicConn', 'NewRelic HS')
      cy.wait(1000)
      cy.contains('span', 'Next').click({ force: true })

      // Fill Customise HealthSource Tab for AppDynamics
      cy.wait('@ApplicationCall')
      cy.wait('@MetricPackCall')

      cy.contains('.Accordion--label', 'Advanced (Optional)').should('exist')

      cy.findByTestId('AddThresholdButton').click()

      cy.contains('div', 'Ignore Thresholds (1)').should('exist')

      cy.get("input[name='ignoreThresholds.0.metricType']").should('have.value', 'Performance')

      cy.get('input[name="Performance"]').scrollIntoView().click({ force: true })

      cy.contains('p', 'Warning').should('be.visible')

      cy.contains('button', 'Confirm').should('be.visible')
      cy.contains('button', 'Confirm').click()

      cy.contains('.Accordion--label', 'Advanced (Optional)').should('not.exist')
    })

    it('should show prompt, if custom metrics containing metric thresholds are being deleted', () => {
      cy.intercept('GET', applicationCall, applicationResponse).as('ApplicationCall')
      cy.intercept('GET', metricPackCall, metricPackResponse).as('MetricPackCall')
      cy.intercept('GET', metricDataCall, metricDataResponse).as('MetricDataCall')
      cy.intercept('GET', riskCategoryCall, riskCategoryMock).as('riskCategoryCall')
      cy.intercept('GET', sampleDataCall, sampleDataResponse).as('SampleDataCall')

      cy.addNewMonitoredServiceWithServiceAndEnv()

      // Fill Define HealthSource Tab with AppDynamics
      cy.populateDefineHealthSource(Connectors.NEW_RELIC, 'NewRelicConn', 'NewRelic HS')
      cy.wait(1000)
      cy.contains('span', 'Next').click({ force: true })

      // Fill Customise HealthSource Tab for AppDynamics
      cy.wait('@ApplicationCall')
      cy.wait('@MetricPackCall')

      // Adding custom metrics
      cy.contains('span', 'Add Metric').click()

      cy.get('input[name="groupName"]').click()
      cy.contains('p', '+ Add New').click({ force: true })
      cy.get('.bp3-overlay input[name="name"]').type('group 1')
      cy.get('.bp3-overlay button[type="submit"]').click({ force: true })

      cy.contains('div', 'Assign').click({ force: true })
      cy.contains('span', 'Continuous Verification').click()

      cy.findByTestId('AddThresholdButton').click()

      cy.contains('div', 'Ignore Thresholds (1)').should('exist')

      cy.get("input[name='ignoreThresholds.0.metricType']").scrollIntoView().click()

      cy.wait(1000)

      cy.get('.Select--menuItem:nth-child(2)').should('have.text', 'Custom')
      cy.get('.Select--menuItem:nth-child(2)').click()

      // group name should have created group name option
      cy.get("input[name='ignoreThresholds.0.groupName']").click()

      cy.get('.Select--menuItem:nth-child(1)').should('have.text', 'group 1').scrollIntoView()
      cy.get('.Select--menuItem:nth-child(1)').click()

      // Selected group's metric name must be listed
      cy.get("input[name='ignoreThresholds.0.metricName']").click()
      cy.get('.Select--menuItem:nth-child(1)').should('have.text', 'New Relic Metric')
      cy.get('.Select--menuItem:nth-child(1)').click()

      cy.get('span[data-icon="main-delete"]').should('exist').scrollIntoView().click()

      cy.contains('p', 'Warning').should('be.visible')

      cy.contains('button', 'Confirm').should('be.visible')
      cy.contains('button', 'Confirm').click()

      cy.contains('div', 'Ignore Thresholds (0)').should('exist')
    })
  })
})
