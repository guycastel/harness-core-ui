/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { getResolvedTemplateCall } from '../../support/70-pipeline/constants'

describe('Template Stage Selection', () => {
  const gitSyncEnabledCall =
    '/ng/api/git-sync/git-sync-enabled?accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1'
  const templateMetadataCall = `/template/api/templates/list-metadata?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&templateListType=Stable&searchTerm=&page=0&size=20&includeAllTemplatesAvailableAtScope=true`
  const pipelineVariablesCall =
    '/pipeline/api/pipelines/variables?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1'
  const templateDetailsCall =
    '/template/api/templates/Cypress_Template_Example_1?routingId=accountId&accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&versionLabel=Version1&getDefaultFromOtherRepo=true'
  const templateInputsCall =
    '/template/api/templates/templateInputs/Cypress_Template_Example_1?routingId=accountId&accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&versionLabel=Version1&getDefaultFromOtherRepo=true'

  describe('Tests template stage configuration', () => {
    beforeEach(() => {
      cy.intercept('GET', gitSyncEnabledCall, { connectivityMode: null, gitSyncEnabled: false })
      cy.intercept('POST', templateMetadataCall, { fixture: 'template/api/templatesList' })
      cy.login('test', 'test')

      cy.visitCreatePipeline()

      cy.fillName('testPipeline_Cypress')

      cy.clickSubmit()

      cy.get('[icon="plus"]').click()

      cy.get('[data-icon="template-library"]').click()
    })

    it('test template stage selection and configuration', () => {
      cy.intercept('POST', pipelineVariablesCall, { fixture: 'template/api/pipelines.variables' })
      cy.intercept('POST', getResolvedTemplateCall('Cypress_Template_Example_1', 'Version1'), {
        fixture: 'template/api/getResolvedTemplate'
      })
      cy.intercept('GET', templateDetailsCall, { fixture: 'template/api/templateDetails' })
      cy.intercept('GET', templateInputsCall, { fixture: 'template/api/templateInputs' })
      cy.wait(1000)

      cy.contains('p', 'Cypress Template Example 1').should('be.visible')
      cy.contains('p', 'Cypress_Template_Example_1').should('be.visible')
      cy.contains('p', 'Cypress Template Example 1').click()

      cy.wait(1000)
      cy.contains('span', 'Use Template').click()

      cy.fillField('name', 'cypress stage')
      cy.clickSubmit()

      cy.contains('span', 'Stage Name').should('be.visible')

      cy.get('input[name="name"]').should('have.value', 'cypress stage')

      cy.get('[data-icon="more"]').click()

      cy.contains('p', 'Change Template').should('be.visible')
      cy.contains('p', 'Remove Template').should('be.visible')
      cy.contains('p', 'Open Template in new tab').should('be.visible')
      cy.contains('p', 'Preview Template YAML').should('be.visible')

      cy.contains('p', 'Preview Template YAML').click()

      cy.contains('h4', 'template.yaml').should('be.visible')
      cy.contains('span', 'Cypress Template Example 1').should('be.visible')
      cy.contains('span', 'Cypress_Template_Example_1').should('be.visible')
    })
  })
})
