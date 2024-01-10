/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import {
  templatesListRoute,
  gitSyncEnabledCall,
  pipelinesRoute,
  featureFlagsCall
} from '../../support/70-pipeline/constants'
import {
  versionLabel,
  pipelineTemplateName,
  pipelineMadeFromTemplate,
  incompleteTemplateCreationResponse,
  pipelineTemplatePublishResponse,
  selectedPipelineTemplateResponse,
  selectedTemplateListFromPipeline,
  templateListCallAfterSelectionResponse,
  afterUseTemplateEndpointResponse,
  afterUseTemplatePipelineTemplateNameResponse,
  afterUseTemplateApplyTemplateResponse,
  afterUseTemplatePipelineTemplateInputsResponse,
  getResolvedTemplateResponse,
  templateUsedForPipeline
} from '../../support/72-templates-library/constants'

describe('Pipeline Template creation and assertion', () => {
  const templateDetailsCall =
    '/template/api/templates/templateInputs/testPipelineTemplate?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&versionLabel=v1.0&getDefaultFromOtherRepo=true'
  const pipelineTemplatePublishCall =
    '/template/api/templates/applyTemplates?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&getDefaultFromOtherRepo=true'
  const pipelineTemplateCreationCall =
    '/template/api/templates?accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&comments=&isNewTemplate=true'
  const templateMetadataCall = `/template/api/templates/list-metadata?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&templateListType=Stable&searchTerm=&page=0&size=20&includeAllTemplatesAvailableAtScope=true`
  const templateMetadataCallAfterSelection =
    '/template/api/templates/list-metadata?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&module=cd&templateListType=All&size=100'

  const afterUseTemplateEndPoint =
    '/template/api/templates/list?accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&templateListType=Stable&getDefaultFromOtherRepo=true'
  const afterUseTemplatePipelineTemplateName =
    '/template/api/templates/testPipelineTemplate?routingId=accountId&accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&versionLabel=v1.0&getDefaultFromOtherRepo=true'
  const afterUseTemplateApplyTemplateEndpoint =
    '/template/api/templates/applyTemplates?routingId=accountId&accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&pipelineIdentifier=Pipeline_From_Template_Test&getDefaultFromOtherRepo=true'
  const afterUseTemplatePipelineTemplateInputsEndpoint =
    '/template/api/templates/templateInputs/testPipelineTemplate?routingId=accountId&accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&versionLabel=v1.0&getDefaultFromOtherRepo=true'
  const getResolvedTemplate =
    '/template/api/templates/get-resolved-template/testPipelineTemplate?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&versionLabel=v1.0&getDefaultFromOtherRepo=true'
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
      cy.initializeRoute()
    })
    cy.initializeRoute()
  })

  it('asserting error when creating a pipeline template', () => {
    cy.visit(templatesListRoute, {
      timeout: 30000
    })

    cy.intercept('POST', pipelineTemplateCreationCall, incompleteTemplateCreationResponse).as(
      'pipelineTemplateCreation'
    )
    cy.intercept('POST', pipelineTemplatePublishCall, pipelineTemplatePublishResponse).as('pipelineTemplatePublish')

    cy.visitPageAssertion('[class*=TemplatesPage-module_templatesPageBody]')

    cy.contains('span', 'New Template').click()
    cy.get('.bp3-menu > :nth-child(4)').click() // querying "Pipeline" in "New Template" menu and clicking it

    cy.contains('p', 'Create New Pipeline Template').should('be.visible')
    cy.contains('p', 'PIPELINE').should('be.visible') //
    //clicking "Start" without entering version label assertion
    cy.get('button[type="submit"]').click()
    cy.contains('span', 'Version Label is required').should('be.visible') //

    cy.get('input[name="name"]').clear().type(pipelineTemplateName)
    cy.get('input[name="versionLabel"]').clear().type(versionLabel)
    cy.get('button[type="submit"]').click()

    cy.contains('p', pipelineTemplateName).should('be.visible') //
    cy.contains('span', 'Unsaved changes').should('be.visible') //

    cy.contains('span', 'Save').click()
    cy.get('button[type="submit"]').click()

    cy.contains('span', 'yamlNode provided does not have root yaml field: pipeline').should('be.visible') //
  })

  it('create pipeline with pipeline template', () => {
    cy.intercept('POST', templateMetadataCall, selectedTemplateListFromPipeline).as('templateListCallPipelineTemplate')
    cy.intercept('GET', templateDetailsCall, selectedPipelineTemplateResponse).as('selectedPipelineTemplateResponse')
    cy.intercept('POST', templateMetadataCallAfterSelection, templateListCallAfterSelectionResponse).as(
      'templateListCallAfterSelection'
    )
    cy.intercept('POST', afterUseTemplateEndPoint, afterUseTemplateEndpointResponse).as('afterUseTemplate')
    cy.intercept('GET', afterUseTemplatePipelineTemplateName, afterUseTemplatePipelineTemplateNameResponse).as(
      'afterUseTemplatePipelineTemplateName'
    )
    cy.intercept('POST', afterUseTemplateApplyTemplateEndpoint, afterUseTemplateApplyTemplateResponse).as(
      'afterUseTemplateApplyTemplate'
    )
    cy.intercept('GET', afterUseTemplatePipelineTemplateInputsEndpoint, afterUseTemplatePipelineTemplateInputsResponse)
    cy.intercept('POST', getResolvedTemplate, getResolvedTemplateResponse).as('getResolvedTemplate')

    cy.visit(pipelinesRoute, {
      timeout: 30000
    })
    cy.visitPageAssertion('[class*="PageHeader--container"]')

    cy.get('div[class*="PageSubHeader--container"]').within(() => {
      cy.contains('span', 'Create a Pipeline').should('be.visible').click()
      cy.wait(1000)
    })
    cy.contains('span', 'Start with Template').should('be.visible').click()
    cy.contains('span', 'Pipeline Name is a required field').should('be.visible')

    cy.fillField('name', pipelineMadeFromTemplate)
    cy.contains('span', 'Start with Template').click()

    // Select template
    cy.get(`p[data-testid="${templateUsedForPipeline}"]`).click({ force: true })

    cy.contains('p', templateUsedForPipeline).should('be.visible')
    cy.contains('p', 'Type').should('be.visible')
    cy.contains('p', 'Tags').should('be.visible')
    cy.contains('p', 'Description').should('be.visible')
    cy.contains('p', 'Version Label').should('be.visible')
    cy.contains('p', `${templateUsedForPipeline} (v1.0)`).should('be.visible')
    cy.contains('p', /^Stage:/).should('have.text', 'Stage: teststage')
    cy.contains('span', 'Select Service').should('be.visible')
    cy.get('input[name="service.serviceRef"]').should('have.value', '<+input>')
    cy.contains('span', 'Specify Environment').should('be.visible')
    cy.get('input[name="environment.environmentRef"]').should('have.value', '<+input>')

    cy.contains('span', 'Use Template').click()

    cy.contains('div', 'Pipeline Studio').should('be.visible')
    cy.contains('a', 'Pipeline Studio').should('be.visible')
    cy.contains('p', /^Using Template:/).should('have.text', 'Using Template: testPipelineTemplate')
    cy.contains('p', pipelineMadeFromTemplate).should('be.visible')
    cy.contains('div', 'Unsaved changes').should('be.visible')
    cy.contains('span', 'Run').should('be.visible')
    cy.contains('teststage').should('be.visible')
    cy.contains('p', /^Stage:/).should('have.text', 'Stage: teststage')

    cy.contains('span', 'Save').click()
    cy.contains('span', 'Pipeline published successfully').should('be.visible')
  })
})
