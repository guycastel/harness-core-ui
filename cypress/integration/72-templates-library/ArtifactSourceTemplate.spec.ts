/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
import { templatesListRoute, gitSyncEnabledCall, featureFlagsCall } from '../../support/70-pipeline/constants'
import {
  incompleteTemplateCreationResponse,
  stepTemplateListCallAfterSelectionResponse
} from '../../support/72-templates-library/constants'

describe('Artifact Source Template creation and assertion', () => {
  const templateCreationCall =
    '/template/api/templates?accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&comments=&isNewTemplate=true'
  const templatesListCall =
    '/template/api/templates/list?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&templateListType=Stable&searchTerm=&page=0&size=20&includeAllTemplatesAvailableAtScope=true'
  const templateListCallAfterSelection =
    '/template/api/templates/list?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&module=cd&templateListType=All'
  beforeEach(() => {
    cy.intercept('GET', gitSyncEnabledCall, { connectivityMode: null, gitSyncEnabled: false })
    cy.fixture('api/users/feature-flags/accountId').then(featureFlagsData => {
      cy.intercept('GET', featureFlagsCall, {
        ...featureFlagsData,
        resource: [
          ...featureFlagsData.resource,
          {
            uuid: null,
            name: 'NG_SVC_ENV_REDESIGN',
            enabled: true,
            lastUpdatedAt: 0
          }
        ]
      }).as('enableFeatureFlag')
      cy.intercept('POST', templatesListCall, { fixture: '/ng/api/deploymentTemplate/stepTemplateList' }).as(
        'stepTemplateListCallTemplates'
      )

      cy.initializeRoute()
    })
  })
  it('asserting error when creating a artifact source template', () => {
    cy.visit(templatesListRoute, {
      timeout: 30000
    })
    cy.intercept('POST', templateCreationCall, incompleteTemplateCreationResponse).as('templateCreation')
    cy.intercept('POST', templateListCallAfterSelection, stepTemplateListCallAfterSelectionResponse).as('stepListCall')
    cy.visitPageAssertion('[class*=TemplatesPage-module_templatesPageBody]')

    cy.contains('span', 'New Template').click()
    cy.get('.bp3-menu').within(() => {
      cy.contains('p', 'Artifact Source').click({ force: true })
    })

    cy.contains('p', 'Create New Artifact Source Template').should('be.visible')
    cy.contains('p', 'ARTIFACT SOURCE').should('be.visible') //
    //clicking "Start" without entering version label assertion
    cy.get('button[type="submit"]').click()
    cy.contains('span', 'Version Label is required').should('be.visible') //

    cy.get('input[name="name"]').clear().type('artifactSourceTemplate_cypress')
    cy.get('input[name="versionLabel"]').clear().type('1122')
    cy.get('button[type="submit"]').click()

    cy.contains('p', 'Docker Registry').click()
    cy.contains('p', 'Artifact Source Template').should('be.visible')
    cy.contains('p', 'Artifact Repository Type').should('be.visible')
    cy.contains('p', 'Docker Registry Repository').should('be.visible')
    cy.contains('p', 'Artifact Details').should('be.visible')

    cy.contains('span', 'Change').should('be.visible').click()

    cy.contains('p', 'GCR').should('be.visible')
    cy.contains('p', 'ECR').should('be.visible')
    cy.contains('p', 'Nexus3').should('be.visible')
    cy.contains('p', 'Nexus2').should('be.visible')
    cy.contains('p', 'Artifactory').should('be.visible')
    cy.contains('p', 'ACR').should('be.visible')
    cy.contains('p', 'Amazon S3').should('be.visible')

    cy.contains('span', 'Close').should('be.visible').click()

    cy.contains('span', 'Select Docker Registry Connector').should('be.visible').click({ force: true })
    cy.contains('p', 'test1111').should('be.visible')
    cy.contains('p', 'test1111').click()
    cy.contains('span', 'Apply Selected').click()
    cy.contains('p', 'test1111').should('be.visible')
    cy.contains('span', 'project').should('be.visible')

    cy.contains('label', 'Value').should('be.visible')
    cy.contains('label', 'Regex').should('be.visible')

    cy.get('span[data-icon="fixed-input"]').eq(1).click()
    cy.contains('span', 'Fixed value').should('be.visible')
    cy.contains('span', 'Expression').should('be.visible')
    cy.contains('span', 'Runtime input').should('be.visible')
    cy.contains('span', 'Runtime input').click()
    cy.contains('span', 'Image Path').should('be.visible')

    cy.get('[data-name="toggle-option-two"]').click({ force: true })

    cy.contains('span', 'Unsaved changes').should('be.visible')
    cy.get('.view-lines').within(() => {
      cy.contains('span', 'artifactSourceTemplate_cypress').should('be.visible')
      cy.contains('span', 'ArtifactSource').should('be.visible')
      cy.contains('span', '1122').should('be.visible')
      cy.contains('span', 'DockerRegistry').should('be.visible')
      cy.contains('span', 'test1111').should('be.visible')
      cy.contains('span', '<+input>').should('be.visible')
    })

    cy.get('span[data-icon="send-data"]').click()
    cy.clickSubmit()
    cy.contains('span', 'yamlNode provided does not have root yaml field: pipeline').should('be.visible') //
  })
})
