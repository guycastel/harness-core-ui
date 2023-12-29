import {
  executionListRoute,
  executionListCIRoute,
  executionSummaryAPI,
  pageHeaderClassName,
  executionSummaryCIAPI,
  featureFlagsCall
} from '../../support/70-pipeline/constants'

describe('RETRY FAILED PIPELINE', () => {
  const gitSyncCall =
    '/ng/api/git-sync/git-sync-enabled?accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1'
  beforeEach(() => {
    cy.initializeRoute()
    cy.intercept('GET', gitSyncCall, { connectivityMode: null, gitSyncEnabled: false })

    cy.visit(`${executionListRoute}`, {
      timeout: 30000
    })
    cy.intercept('POST', executionSummaryAPI, {
      fixture: '/pipeline/api/pipelineExecution/pipelineExecutionSummary'
    }).as('pipelineExecutionSummary')
    cy.wait(2000)
  })

  it('should be able to retry failed/aborted execution', () => {
    cy.visitPageAssertion(pageHeaderClassName)
    cy.wait('@pipelineExecutionSummary')
    cy.get('[role="row"]').get('[data-icon="Options"]').eq(3).scrollIntoView().click({ force: true })
    cy.contains('div', 'Re-run from Stage').click()

    // Modal header for retry failed pipeline dialog should be Re-run From Specific Stage
    cy.contains('h2', 'Re-run From Specific Stage').should('be.visible')

    // Select stage option should be present by default
    cy.contains('div', 'Select the stage(s) that you would like to resume from').should('be.visible')
    cy.get('button[data-testid="retry-failed-pipeline"]').should('be.visible')

    //Retry Button should be disabled if no stages are selected
    cy.get('button[data-testid="retry-failed-pipeline"]').should('be.disabled')
  })

  it('should not have retry option on successful execution', () => {
    cy.visitPageAssertion(pageHeaderClassName)
    cy.wait('@pipelineExecutionSummary')
    cy.get('[role="row"]').get('[data-icon="Options"]').eq(0).scrollIntoView().click({ force: true })
    cy.get('div[data-testid="retry-pipeline-menu"]').should('not.exist')
  })
})

describe('RETRY FAILED PIPELINE in DEBUG MODE', () => {
  const gitSyncCall =
    '/ng/api/git-sync/git-sync-enabled?accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1'
  beforeEach(() => {
    cy.fixture('api/users/feature-flags/accountId').then(featureFlagsData => {
      cy.intercept('GET', featureFlagsCall, {
        ...featureFlagsData,
        resource: [
          ...featureFlagsData.resource,
          {
            uuid: null,
            name: 'CI_REMOTE_DEBUG',
            enabled: true,
            lastUpdatedAt: 0
          }
        ]
      }).as('enableFeatureFlag')
      cy.initializeRoute()
    })
    cy.intercept('GET', gitSyncCall, { connectivityMode: null, gitSyncEnabled: false })

    cy.visit(`${executionListCIRoute}`, {
      timeout: 30000
    })
    cy.intercept('POST', executionSummaryCIAPI, {
      fixture: '/pipeline/api/pipelineExecution/pipelineExecutionSummaryCI'
    }).as('pipelineExecutionSummary')
    cy.wait(2000)
  })

  it('should have re-run in debug mode option on execution ', () => {
    cy.visitPageAssertion(pageHeaderClassName)
    cy.wait('@pipelineExecutionSummary')
    cy.get('[role="row"]').get('[data-icon="Options"]').eq(3).scrollIntoView().click({ force: true })
    cy.contains('div', 'Re-run in Debug Mode').should('be.visible')
  })
})
