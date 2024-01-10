/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import {
  templatesListRoute,
  gitSyncEnabledCall,
  templateListMetaDataWithListTypeAndSize,
  getTemplateReferencesCall,
  templateMetadataCall,
  getResolvedTemplateCall
} from '../../support/70-pipeline/constants'

describe('Template Reference By', () => {
  beforeEach(() => {
    cy.intercept('GET', gitSyncEnabledCall, {
      connectivityMode: null,
      gitSyncEnabled: false,
      gitSimplificationEnabled: false
    })
    cy.intercept('POST', templateMetadataCall, { fixture: 'template/api/templatesList' }).as('templateMetadataCall')
    cy.intercept('POST', templateListMetaDataWithListTypeAndSize, { fixture: 'template/api/templatesList' }).as(
      'templatesListMetadataCallForDrawer'
    )
    cy.intercept('POST', getResolvedTemplateCall('Cypress_Template_Example_1', 'Version1'), {
      fixture: 'template/api/getResolvedTemplate'
    }).as('resolvedTemplateCall')
    cy.initializeRoute()
    cy.visit(templatesListRoute, {
      timeout: 30000
    })
    cy.wait(2000)
    cy.visitPageAssertion('[class*=TemplatesPage-module_templatesPageBody]')
    cy.wait('@templateMetadataCall', { timeout: 10000 })

    cy.contains('p', 'Cypress Template Example 1').click()

    cy.wait('@templatesListMetadataCallForDrawer', { timeout: 10000 })
    cy.wait('@resolvedTemplateCall', { timeout: 10000 })
    cy.get('div[data-tab-id="INPUTS"]').should('be.visible')
    cy.get('div[data-tab-id="YAML"]').should('be.visible')
  })

  it('when no references are present', () => {
    cy.get('div[data-tab-id="REFERENCEDBY"]').should('be.visible').click()
    cy.get('[data-icon="nav-project"]').should('be.visible')
    cy.contains('p', 'No references found').should('be.visible')
  })

  it('when pipeline and template references are present', () => {
    cy.intercept('GET', getTemplateReferencesCall('Kapil'), { fixture: 'ng/api/entitySetupUsageV2' }).as(
      'templateReferencesCall'
    )
    cy.get('div[data-tab-id="REFERENCEDBY"]').should('be.visible').click()
    cy.wait('@templateReferencesCall', { timeout: 10000 })
    cy.get('[id=bp3-tab-panel_template-details_REFERENCEDBY]').within(() => {
      cy.contains('stage temp (v34)').should('be.visible')
      cy.contains('Template').should('be.visible')
      cy.contains('pipeline temp latest (32)').should('be.visible')
      cy.contains('original pipeline').should('be.visible')
      cy.contains('Pipelines').should('be.visible')
    })
  })
})
