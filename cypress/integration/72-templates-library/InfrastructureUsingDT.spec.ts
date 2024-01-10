import { featureFlagsCall } from '../../support/70-pipeline/constants'
import { environmentConfigurationRoute, environmentConfigurationCall } from '../../support/75-cd/constants'
import {
  infraCall,
  selectInfraCall,
  validateInfraDtYamlCall,
  getUpdatedYamlCall,
  useTemplateResponse,
  afterUseTemplateListCall,
  afterUseTemplateListResponse,
  getUpdatedYamlResponse,
  validateInfraDtYamlResponse,
  selectInfraResponse,
  infraResponse,
  depTempTestVariables,
  recentDeploymentTemplatesUrl,
  useResolvedTemplateCall,
  useTemplateCall
} from '../../support/72-templates-library/constants'

describe('Deployment Template - Infrastructures Page', () => {
  beforeEach(() => {
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
      })
    })

    cy.initializeRoute()
    cy.visit(environmentConfigurationRoute, {
      timeout: 30000
    })
  })
  it('Creating Infrastructure using Deployment Template', () => {
    cy.intercept('GET', environmentConfigurationCall, {
      fixture: 'ng/api/environmentConfiguration/environmentConfiguration.json'
    })
    cy.intercept('POST', recentDeploymentTemplatesUrl, {
      fixture: '/ng/api/deploymentTemplate/recentDeploymentTemplates'
    })
    cy.intercept('GET', useTemplateCall, useTemplateResponse).as('useTemplate')
    cy.intercept('POST', useResolvedTemplateCall, useTemplateResponse).as('useResolvedTemplate')
    cy.intercept('POST', afterUseTemplateListCall, afterUseTemplateListResponse).as('afterUseTemplateList')

    cy.visitPageAssertion('[id*="bp3-tab-title_environmentDetails_CONFIGURATION"]')

    cy.get('.bp3-tab-list').within(() => {
      cy.contains('div', 'Infrastructure Definitions').click({ force: true })
    })

    cy.contains('span', 'Infrastructure Definition').click()
    cy.fillField('name', 'testInfra_Cypress')

    cy.get('input[value="dep_temp_test"]').click({ force: true })

    cy.get('[data-template-id="dep_temp_test"]').should('be.visible')
    cy.contains('span', 'Use Template').click()
    cy.contains('p', 'Using Template: dep temp test (1)').click()
    cy.get('span[icon="more"]').should('be.visible').click()
    cy.contains('p', 'Change Template').should('be.visible')
    cy.contains('p', 'Preview Template YAML').should('be.visible')
    cy.contains('p', 'Open Template in new tab').should('be.visible')

    cy.contains('p', 'Infrastructure Properties').should('be.visible')
    cy.contains('p', 'Update values for variables defined as part of used template').should('be.visible')

    depTempTestVariables.forEach(item => {
      cy.get(`input[value=${item}]`).scrollIntoView().should('be.visible')
    })
    cy.contains('span', 'Save').should('be.visible').click()
    cy.contains('span', 'Successfully created Infrastructure').should('be.visible')
  })

  it('Asserting Reconcile feature', () => {
    cy.intercept('GET', environmentConfigurationCall, {
      fixture: 'ng/api/environmentConfiguration/environmentConfiguration.json'
    })

    cy.intercept('GET', infraCall, infraResponse).as('infra')
    cy.wait(3000)
    cy.intercept('GET', selectInfraCall, selectInfraResponse).as('selectInfra')
    cy.intercept('GET', validateInfraDtYamlCall, validateInfraDtYamlResponse).as('validateInfraDT')
    cy.intercept('POST', getUpdatedYamlCall, getUpdatedYamlResponse).as('updatedYaml')

    cy.visitPageAssertion('[id*="bp3-tab-title_environmentDetails_CONFIGURATION"]')

    cy.get('.bp3-tab-list').within(() => {
      cy.contains('div', 'Infrastructure Definitions').click({ force: true })
    })
    cy.contains('p', 'testReconcileInfra').click()

    cy.get('span[icon="warning-sign"]').should('be.visible')
    cy.contains('p', 'Some of the entities referenced in this infrastructure have been updated.').should('be.visible')

    cy.get('[value="stringUpdated"]').should('not.exist')
    cy.get('[value="Hi, I am Updated"]').should('not.exist')
    cy.contains('p', 'Infrastructure Details').should('be.visible')
    cy.contains('span', 'Reconcile').should('be.visible').click()
    cy.contains('p', 'Original').should('be.visible')
    cy.contains('p', 'Refreshed').should('be.visible')
    cy.contains('p', 'Template Error Inspection').should('be.visible')
    cy.contains('span', 'Hi, I am Updated').should('be.visible')
    cy.contains('span', 'Update').should('be.visible').click()

    cy.get('[value="stringUpdated"]').scrollIntoView().should('be.visible')
    cy.get('[value="Hi, I am Updated"]').scrollIntoView().should('be.visible')
    cy.contains('span', 'Save').should('be.visible').click()
    cy.contains('span', 'Successfully updated Infrastructure').should('be.visible')
  })
})
