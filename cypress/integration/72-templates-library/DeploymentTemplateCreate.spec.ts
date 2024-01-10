/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
import {
  templatesListRoute,
  gitSyncEnabledCall,
  featureFlagsCall,
  getResolvedTemplateCall
} from '../../support/70-pipeline/constants'
import {
  incompleteTemplateCreationResponse,
  stepTemplateListCallAfterSelectionResponse,
  deploymentTemplateInputCallAfterSelectionResponse,
  getResolvedTemplateResponse,
  templateUsedForPipeline,
  afterUseTemplatePipelineTemplateInputsResponse,
  deploymentResolveTemplateResponse
} from '../../support/72-templates-library/constants'

describe('Deployment Template creation and assertion', () => {
  const templateCreationCall =
    '/template/api/templates?accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&comments=&isNewTemplate=true'

  const templateMetadataCall = `/template/api/templates/list-metadata?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&templateListType=Stable&searchTerm=&page=0&size=20&includeAllTemplatesAvailableAtScope=true`

  const templateMetadataCallAfterSelection =
    '/template/api/templates/list-metadata?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&module=cd&templateListType=All&size=100'

  const templateInputsCallAfterSelection = `/template/api/templates/templateInputs/${templateUsedForPipeline}?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&versionLabel=v1.0*`
  const connectorsListCall =
    '/ng/api/connectors/listV2?accountIdentifier=accountId&searchTerm=&projectIdentifier=project1&orgIdentifier=default&pageIndex=0&pageSize=10'
  const accountLicense = 'ng/api/licenses/account?routingId=accountId&accountIdentifier=accountId'
  beforeEach(() => {
    cy.intercept('GET', gitSyncEnabledCall, { connectivityMode: null, gitSyncEnabled: false })
    cy.intercept('GET', accountLicense, { fixture: 'pipeline/api/approvals/accountLicense' })
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
          },
          {
            uuid: null,
            name: 'NG_DEPLOYMENT_TEMPLATE',
            enabled: true,
            lastUpdatedAt: 0
          }
        ]
      }).as('enableFeatureFlag')
      cy.intercept('POST', templateMetadataCall, { fixture: '/ng/api/deploymentTemplate/stepTemplateList' }).as(
        'stepTemplateListCallDeploymentTemplates'
      )

      cy.initializeRoute()
    })
  })
  it('asserting error when creating a deployment template', () => {
    cy.visit(templatesListRoute, {
      timeout: 30000
    })
    cy.intercept('POST', templateCreationCall, incompleteTemplateCreationResponse).as('templateCreation')
    cy.intercept('POST', templateMetadataCallAfterSelection, stepTemplateListCallAfterSelectionResponse).as(
      'stepListCall'
    )
    cy.intercept(templateInputsCallAfterSelection, deploymentTemplateInputCallAfterSelectionResponse).as(
      'stepTemplateInput'
    )
    cy.intercept(
      'POST',
      getResolvedTemplateCall(templateUsedForPipeline, 'v1.0'),
      deploymentResolveTemplateResponse
    ).as('getResolvedTemplate')
    cy.intercept('POST', connectorsListCall, { fixture: 'ng/api/connectors' })
    cy.visitPageAssertion('[class*=TemplatesPage-module_templatesPageBody]')
    cy.contains('span', 'New Template').click()
    cy.get('.bp3-menu').within(() => {
      cy.contains('p', 'Deployment').click({ force: true })
    })

    cy.contains('p', 'Create New Deployment Template').should('be.visible')
    cy.contains('p', 'DEPLOYMENT').should('be.visible') //
    //clicking "Start" without entering version label assertion
    cy.get('button[type="submit"]').click()
    cy.contains('span', 'Version Label is required').should('be.visible') //

    cy.get('input[name="name"]').clear().type('deploymentTemplate_cypress')
    cy.get('input[name="versionLabel"]').clear().type('v1.0')
    cy.get('button[type="submit"]').click()

    //Infrastructure Tab View
    cy.contains('p', 'Variables').should('be.visible')
    cy.contains('span', 'Define the variables to be used in your infrastructure').should('be.visible')

    //adding String variable
    cy.contains('span', 'New Variable').should('be.visible')
    cy.contains('span', 'New Variable').click()
    cy.get('input[name="name"]').clear().type('var1')
    cy.get('button[data-testid="addVariableSave"]').click()

    cy.get('span[data-icon="fixed-input"]').eq(0).click()
    cy.contains('span', 'Fixed value').should('be.visible')
    cy.contains('span', 'Runtime input').should('be.visible')
    cy.contains('span', 'Runtime input').click()

    //adding Connector Variable
    cy.contains('span', 'New Variable').click()
    cy.get('input[name="name"]').clear().type('connnectorVar')
    cy.get('textarea[name="description"]').clear().type('description')
    cy.get('input[type="text"][name="type"]').click()
    cy.get('.bp3-menu').within(() => {
      cy.contains('p', 'Connector').should('be.visible')
      cy.contains('p', 'Connector').click()
    })
    cy.get('button[data-testid="addVariableSave"]').click()
    cy.get('span[data-icon="description"]').scrollIntoView().should('be.visible').trigger('mouseover')
    cy.contains('div', 'description').should('be.visible')
    cy.contains('span', 'Select').should('be.visible').click()
    cy.contains('span', 'New Connector').click()

    cy.contains('h2', 'Connectors').should('be.visible')
    cy.contains('p', 'Connectors').isChildVisible()
    cy.contains('div', 'Cloud Providers').should('be.visible')
    cy.contains('div', 'Artifact Repositories').should('be.visible')
    cy.contains('div', 'Code Repositories').should('be.visible')
    cy.contains('div', 'Ticketing Systems').should('be.visible')
    cy.contains('div', 'Monitoring and Logging Systems').should('be.visible')
    cy.contains('div', 'Secret Managers').scrollIntoView().should('be.visible')
    cy.get('span[icon="cross"]').should('be.visible').click()

    cy.contains('p', 'test1111').should('be.visible')
    cy.contains('p', 'test1111').click()
    cy.contains('span', 'Apply Selected').click()
    cy.contains('p', 'test1111').should('be.visible')
    //
    cy.contains('p', 'Fetch Instance Script').should('be.visible')
    cy.get('input[name="fetchInstancesScript.store.type"]').click({ force: true })
    cy.contains('p', 'Inline').isChildVisible()
    cy.contains('p', 'File Store').isChildVisible()
    cy.get('.view-lines')
      .should('be.visible')
      .within(() => {
        // Default Text present in fetch Instance Script
        cy.get('div[class="view-line"]').its('length').should('be.greaterThan', 0)
      })

    cy.contains('p', 'Instance Object Array Path').should('be.visible')
    cy.get('input[name="instancesListPath"]').type('root/bin/')

    cy.contains('p', 'Instance Attributes').should('be.visible')
    cy.contains('span', 'New Attribute').should('be.visible')
    cy.get('input[name="instanceAttributes[0].description"]').type('for hosting')
    cy.get('input[name="instanceAttributes[0].jsonPath"]').type('jsonPath1')
    cy.wait(1000)
    cy.contains('span', 'Execution').click()

    // Execution Tab View
    cy.contains('span', 'Previous').click()
    cy.contains('span', 'Continue').click()

    cy.get('span[icon="plus"]').click()
    cy.get('span[data-icon="template-library"]').eq(1).click()
    cy.wait('@stepTemplateListCallDeploymentTemplates')
    cy.get(`p[data-testid="${templateUsedForPipeline}"]`).click()

    cy.wait('@stepTemplateInput')
    cy.wait('@getResolvedTemplate')
    cy.contains('p', `${templateUsedForPipeline} (v1.0)`).should('be.visible')
    cy.get('input[name="data.spec.url"]').should('have.value', '<+input>')
    cy.contains('span', 'Use Template').click()

    cy.contains('p', templateUsedForPipeline).should('be.visible')

    cy.get('[data-name="toggle-option-two"]').click({ force: true })
    //YAML view
    cy.contains('span', 'deploymentTemplate_cypress.yaml').should('be.visible')
    cy.contains('div', 'Unsaved changes').should('be.visible')
    cy.get('.view-lines').within(() => {
      cy.contains('span', 'deploymentTemplate_cypress').should('be.visible')
      cy.contains('span', 'CustomDeployment').should('be.visible')

      cy.contains('span', 'infrastructure').should('be.visible')
      cy.contains('span', 'var1').should('be.visible')
      cy.contains('span', 'connnectorVar').should('be.visible')
      cy.contains('span', 'test1111').should('be.visible')
      cy.contains('span', 'description').should('be.visible')
      cy.contains('span', 'fetchInstancesScript').should('be.visible')
      cy.contains('span', '$INSTANCE_OUTPUT_PATH file path').should('be.visible')
      cy.contains('span', 'instanceAttributes').should('be.visible')
      cy.contains('span', 'jsonPath').should('be.visible')
      cy.contains('span', 'jsonPath1').should('be.visible')
      cy.contains('span', 'for hosting').should('be.visible')
      cy.contains('span', 'instancesListPath').should('be.visible')
      cy.contains('span', 'root/bin/').should('be.visible')
    })

    cy.get('span[data-icon="send-data"]').click()
    cy.clickSubmit()
    cy.contains('span', 'yamlNode provided does not have root yaml field: pipeline').should('be.visible') //
  })
})
