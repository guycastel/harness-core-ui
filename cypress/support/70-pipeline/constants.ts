/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

export const projectId = 'project1'
export const accountId = 'accountId'
export const orgIdentifier = 'default'
export const pipelineIdentifier = 'testPipeline_Cypress'
export const executionId = 'executionId'
export const delegateExecutionId = 'delegate-executionId'
export const stageNodeId = 'nodeId'
export const pageHeaderClassName = '.PageHeader--container'
export const activeTabClassName = '.TabNavigation--active'
export const serviceName = 'testServiceV2'
const connectorRef = 'org.connector'
const connectorName = 'testConnector'
const anotherConnectorName = 'testConnector2'
const repositoryType = 'generic'
const artifactPath = '/'
const repository = 'lambda'
const serverlessLambdaServiceDefinitionType = 'ServerlessAwsLambda'
const strategyType = 'Basic'
const parentJob = 'alex-pipeline-test'

// APIs
export const pipelineListAPI = `/pipeline/api/pipelines/list?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&page=0&sort=lastUpdatedAt%2CDESC&size=20`
export const pipelineSummaryAPI = `/pipeline/api/pipelines/summary/appdtest?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const pipelineDetailsAPI = `/pipeline/api/pipelines/appdtest?accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const executionSummaryAPI = `/pipeline/api/pipelines/execution/summary?routingId=accountId&accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&page=0&size=20&sort=startTs%2CDESC&module=cd`
export const executionSummaryCIAPI = `pipeline/api/pipelines/execution/summary?routingId=accountId&accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&page=0&size=20&sort=startTs%2CDESC&module=ci`
export const pipelineExecutionSummaryAPI = `/pipeline/api/pipelines/execution/summary?routingId=accountId&accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&pipelineIdentifier=*&*`
export const executionMetadata = `/pipeline/api/pipelines/execution/*/metadata?routingId=${accountId}&accountIdentifier=${accountId}`
export const pipelineExecutionAPI = `/pipeline/api/pipelines/execution/v2/C9mgNjxSS7-B-qQek27iuA?routingId=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&accountIdentifier=${accountId}`
export const pipelineExecutionForNodeAPI = `/pipeline/api/pipelines/execution/v2/C9mgNjxSS7-B-qQek27iuA?routingId=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&accountIdentifier=${accountId}&stageNodeId=g_LkakmWRPm-wC6rfC2ufg`
export const servicesCallV2 = `/ng/api/servicesV2/list/access?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const delegateSelectionExecutionAPI = `/pipeline/api/pipelines/execution/v2/${delegateExecutionId}?routingId=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&accountIdentifier=${accountId}`
export const delegateSelectionStageAPI = `/pipeline/api/pipelines/execution/v2/${delegateExecutionId}?routingId=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&accountIdentifier=${accountId}&stageNodeId=Dswl1Ln8T8aBx-8BEbunpQ`
export const pipelineVariablesCall = `/pipeline/api/pipelines/v2/variables?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const shouldDisableDeploymentAPI = `ng/api/freeze/evaluate/shouldDisableDeployment?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`

export const gitSyncEnabledCall = `/ng/api/git-sync/git-sync-enabled?accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const pipelineSaveCall = `/pipeline/api/pipelines?accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}`
export const pipelineSaveCallWithStoreType = `/pipeline/api/pipelines/v2?accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&storeType=INLINE*`
export const gitSyncMetaCall = `/ng/api/git-sync?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const gitSyncBranchCall = `/ng/api/git-sync-branch/listBranchesWithStatus?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&yamlGitConfigIdentifier=&page=0&size=20&searchTerm=`
export const executionStrategies = `ng/api/pipelines/configuration/strategies?routingId=${accountId}`
export const strategiesYamlSnippets = 'ng/api/pipelines/configuration/strategies/yaml-snippets*'
export const azureStrategiesYamlSnippets =
  'ng/api/pipelines/configuration/strategies/yaml-snippets?routingId=accountId&serviceDefinitionType=AzureWebApp&strategyType=Rolling'
export const approvalStageYamlSnippet = `/pipeline/api/approvals/stage-yaml-snippet?routingId=${accountId}&approvalType=HarnessApproval`
export const jiraApprovalStageYamlSnippet = `/pipeline/api/approvals/stage-yaml-snippet?routingId=${accountId}&approvalType=JiraApproval`
export const snowApprovalStageYamlSnippet = `/pipeline/api/approvals/stage-yaml-snippet?routingId=${accountId}&approvalType=SERVICENOW_APPROVAL`
export const stepLibrary = `/pipeline/api/pipelines/v2/steps?routingId=${accountId}&accountId=${accountId}`
export const inputSetsTemplateCall = `/pipeline/api/inputSets/template?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&pipelineIdentifier=${pipelineIdentifier}&projectIdentifier=${projectId}*`
export const pipelineDetails = `/pipeline/api/pipelines/testPipeline_Cypress?accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}*`
export const applyTemplatesCall = `/template/api/templates/applyTemplates?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&getDefaultFromOtherRepo=true`
export const inputSetsCall = `/pipeline/api/inputSets?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&pipelineIdentifier=${pipelineIdentifier}&pageIndex=0&pageSize=20&searchTerm=&sortOrders=createdAt%2CDESC`
export const pipelineDetailsWithRoutingIdCall = `/pipeline/api/pipelines/testPipeline_Cypress?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&getTemplatesResolvedPipeline=true`
export const pipelineInputSetTemplate = `template/api/templates/applyTemplates?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&pipelineIdentifier=${pipelineIdentifier}&projectIdentifier=${projectId}&getDefaultFromOtherRepo=true`
export const environmentsCall = `/ng/api/environmentsV2?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&page=0&size=10`
export const servicesCall = `/ng/api/servicesV2?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&size=10&page=0&sort=lastModifiedAt%2CDESC&includeVersionInfo=false`
export const servicesDetailV2 = `ng/api/dashboard/serviceDetailsV2?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&startTime=*&endTime=*&sort=*`
export const executePipeline = `/pipeline/api/pipeline/execute/${pipelineIdentifier}?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&moduleType=cd`
export const serviceStepAPI = `/pipeline/api/pipelines/execution/v2/${executionId}?routingId=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&accountIdentifier=${accountId}`
export const serviceStepStageID = `/pipeline/api/pipelines/execution/v2/${executionId}?routingId=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&accountIdentifier=${accountId}&stageNodeId=${stageNodeId}`
export const routingDataAPI = `ng/api/projects/${projectId}?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}`
export const pipelineSummaryCallAPI = `/pipeline/api/pipelines/summary/${pipelineIdentifier}?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const pipelineYAMLAPI = `/pipeline/api/pipelines/testPipeline_Cypress?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const pipelineSummaryCallAPIWIthMetadataOnly = `/pipeline/api/pipelines/summary/${pipelineIdentifier}?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&getMetadataOnly=true`
export const triggersAPI = `pipeline/api/triggers?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&targetIdentifier=${pipelineIdentifier}*`
export const triggerPipelineDetails = `pipeline/api/pipelines/${pipelineIdentifier}?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&getTemplatesResolvedPipeline=true`
export const inputSetListAPI = `pipeline/api/inputSets?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&pipelineIdentifier=${pipelineIdentifier}&sort=createdAt%2CDESC`
export const inputSetListAPIWithoutSort = `pipeline/api/inputSets?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&pipelineIdentifier=${pipelineIdentifier}*`
export const featureFlagsCall = `/api/users/feature-flags/accountId?routingId=${accountId}`
export const cdFailureStrategiesYaml = `/ng/api/pipelines/configuration/cd-stage-yaml-snippet?routingId=${accountId}`
export const servicesUpsertCall = `/ng/api/servicesV2/upsert?routingId=${accountId}&accountIdentifier=${accountId}`
export const serviceCreationCall = `/ng/api/servicesV2?routingId=${accountId}&accountIdentifier=${accountId}`
export const envUpsertCall = `/ng/api/environmentsV2/upsert?routingId=${accountId}&accountIdentifier=${accountId}`
export const connectorList = `/ng/api/connectors/connector?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const serverlessRepositoriesDetails = `/ng/api/artifacts/artifactory/repositoriesDetails?routingId=${accountId}&connectorRef=${connectorRef}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&repositoryType=${repositoryType}`
export const serverlessBuildDetails = `/ng/api/artifacts/artifactory/getBuildDetails?routingId=${accountId}&artifactPath=${artifactPath}&repository=${repository}&repositoryFormat=${repositoryType}&connectorRef=${connectorRef}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const pipelineHealthCall = `/pipeline/api/dashboard/pipelineHealth?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}*`
export const pipelineExecutionCall = `/pipeline/api/dashboard/pipelineExecution?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}*`
export const abortPipelineCall = `pipeline/api/pipeline/execute/interrupt/${executionId}?routingId=${accountId}&orgIdentifier=${orgIdentifier}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&interruptType=AbortAll`
export const serverlessLambdaYamlSnippet = `/ng/api/pipelines/configuration/strategies/yaml-snippets?routingId=${accountId}&accountIdentifier=${accountId}&serviceDefinitionType=${serverlessLambdaServiceDefinitionType}&strategyType=${strategyType}`
export const servicesV2 = `/ng/api/servicesV2?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}*`
export const postServiceCall = `ng/api/servicesV2?routingId=${accountId}&accountIdentifier=${accountId}`
export const jobDetailsCall = `/ng/api/artifacts/jenkins/jobs?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&connectorRef=${anotherConnectorName}`
export const jobDetailsCallAfterConnectorChange = `/ng/api/artifacts/jenkins/jobs?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&connectorRef=${anotherConnectorName}`
export const jobDetailsForParentJob = `/ng/api/artifacts/jenkins/jobs?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&connectorRef=${anotherConnectorName}&parentJobName=${parentJob}`
export const jobParametersList = `/ng/api/artifacts/jenkins/job/alex-pipeline-test%252FAutomationQATest/details?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&connectorRef=${anotherConnectorName}`
export const pipelineDetailsAPIRoute = `/pipeline/api/pipelines/PipelineTest?accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const templatesListCall = `/template/api/templates/list?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&templateListType=LastUpdated&page=0&sort=lastUpdatedAt%2CDESC&size=20`
export const templateMetadataCall = `/template/api/templates/list-metadata?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&templateListType=LastUpdated&page=0&sort=lastUpdatedAt%2CDESC&size=20`
export const getTemplateReferencesCall = (project = projectId): string =>
  `/template/api/templates/entitySetupUsage/Cypress_Template_Example_1?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${project}&orgIdentifier=${orgIdentifier}&isStableTemplate=true&versionLabel=Version1&searchTerm=&pageSize=4&pageIndex=0`
export const templatesListCallWithListType = `/template/api/templates/list?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&module=cd&templateListType=All`
export const templateListMetaDataWithListType = `/template/api/templates/list-metadata?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&module=cd&templateListType=All`
export const templateListMetaDataWithListTypeAndSize = `/template/api/templates/list-metadata?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&module=cd&templateListType=All&size=100`
export const inputSetsTemplateCallWithCypressProject = `/pipeline/api/inputSets/template?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&pipelineIdentifier=${pipelineIdentifier}&projectIdentifier=${projectId}`
export const inputSetTemplate = `/pipeline/api/pipelines/${pipelineIdentifier}?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&getTemplatesResolvedPipeline=true`
export const runPipelineTemplateCall = `/pipeline/api/inputSets/template?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&pipelineIdentifier=${pipelineIdentifier}`
export const s3bucketData = `/ng/api/buckets/s3/v2/getBuckets?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&connectorRef=${connectorName}&pipelineIdentifier=${pipelineIdentifier}&fqnPath=pipeline.stages.s1.spec.serviceConfig.serviceDefinition.spec.artifacts.primary.spec.bucketName`
export const stagesExecutionList = `pipeline/execute/stagesExecutionList?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&pipelineIdentifier=${pipelineIdentifier}`
export const getArtifactPaths = `/ng/api/artifacts/jenkins/job/AutomationQA/paths?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&connectorRef=${connectorName}`
export const azureSubscriptions = `/ng/api/azure/subscriptions?routingId=${accountId}&connectorRef=${connectorRef}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const azureResourceGroups = `/ng/api/azure/subscriptions/1111-1111-1111-1111-1111/resourceGroups?routingId=${accountId}&connectorRef=${connectorRef}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}`
export const stepTemplateSchemaEndpoint = `/template/api/templates/schema/templateSchema?routingId=${accountId}&templateEntityType=Step&entityType=ShellScript&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&accountIdentifier=${accountId}&scope=project`
export const canvasExecutionPipelineCall =
  '/pipeline/api/pipelines/execution/v2/testParallelNodesPipeline?routingId=accountId&orgIdentifier=default&projectIdentifier=project1&accountIdentifier=accountId'
export const canvasExecutionStageNodeCall =
  '/pipeline/api/pipelines/execution/v2/testParallelNodesPipeline?routingId=accountId&orgIdentifier=default&projectIdentifier=project1&accountIdentifier=accountId&stageNodeId=y2b4qTE6QPu2wkd4z5vRfg'
export const saveTemplateCall = `/template/api/templates?accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=default`
// Routes

export const updatedPipelineExecutionEndpoint = `/pipeline/api/pipeline/execute/${pipelineIdentifier}?routingId=${accountId}&accountIdentifier=${accountId}&projectIdentifier=${projectId}&orgIdentifier=${orgIdentifier}&moduleType=cd&notifyOnlyUser=false`
export const executionListRoute = `account/${accountId}/cd/orgs/${orgIdentifier}/projects/${projectId}/deployments`
export const executionListCIRoute = `account/${accountId}/ci/orgs/${orgIdentifier}/projects/${projectId}/deployments`
export const pipelinesExecutionDelegateRoute = `account/${accountId}/cd/orgs/${orgIdentifier}/projects/${projectId}/pipelines/${pipelineIdentifier}/executions/${delegateExecutionId}/pipeline`
export const executionHistoryRoute = `account/accountId/cd/orgs/default/projects/${projectId}/pipelines/${pipelineIdentifier}/executions`
export const pipelineStudioRoute = `account/accountId/cd/orgs/default/projects/${projectId}/pipelines/${pipelineIdentifier}/pipeline-studio/?stageId=j&sectionId=SERVICE`
export const newPipelineRoute = `account/accountId/cd/orgs/default/projects/${projectId}/pipelines/-1/pipeline-studio/`
export const inputSetsRoute = `account/accountId/cd/orgs/default/projects/${projectId}/pipelines/${pipelineIdentifier}/input-sets`
export const environmentRoute = `account/${accountId}/cd/orgs/${orgIdentifier}/projects/${projectId}/environments`
export const servicesRoute = `account/${accountId}/cd/orgs/${orgIdentifier}/projects/${projectId}/services`
export const pipelinesRoute = `account/${accountId}/cd/orgs/${orgIdentifier}/projects/${projectId}/pipelines`
export const triggersRoute = `account/${accountId}/cd/orgs/${orgIdentifier}/projects/${projectId}/pipelines/${pipelineIdentifier}/triggers`
export const triggerRoute = (triggerIdentifier: string): string =>
  `account/${accountId}/cd/orgs/${orgIdentifier}/projects/${projectId}/pipelines/${pipelineIdentifier}/triggers/${triggerIdentifier}`
export const newTriggerRoute = `account/${accountId}/home/orgs/${orgIdentifier}/projects/${projectId}/pipelines/${pipelineIdentifier}/triggers/new?storeType=INLINE&triggerType=Webhook&sourceRepo=Custom`
export const templatesListRoute = `account/${accountId}/cd/orgs/${orgIdentifier}/projects/${projectId}/setup/resources/templates`
export const testParallelNodesPipelineRoute = `account/accountId/cd/orgs/default/projects/project1/pipelines/sad/executions/testParallelNodesPipeline/pipeline`
export const triggersMergeCall =
  '/pipeline/api/inputSets/merge?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&pipelineIdentifier=testPipeline_Cypress'

export const resolvedPipelineDetailsCall =
  '/template/api/templates/applyTemplates?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&pipelineIdentifier=testPipeline_Cypress&projectIdentifier=project1&getDefaultFromOtherRepo=true'
export const servicesCallRunPipeline =
  '/ng/api/servicesV2/list/access?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&type=Kubernetes&gitOpsEnabled=false'

export const servicesV2CallWithPageAndTemplateFilter =
  '/ng/api/servicesV2/list/access?page=0&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&searchTerm=&type=Kubernetes&gitOpsEnabled=false&deploymentTemplateIdentifier='

export const environmentV2CallWithPage =
  '/ng/api/environmentsV2/list/access?page=0&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&searchTerm='

export const servicesYaml =
  '/ng/api/servicesV2/servicesYamlMetadata?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1'
export const environmentsCallRunPipeline =
  '/ng/api/environmentsV2/list/access?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1'
export const connectorsCall =
  '/ng/api/connectors?accountIdentifier=accountId&type=K8sCluster&searchTerm=&projectIdentifier=project1&orgIdentifier=default'

export const templateMetadataUpdatedCall = `/template/api/templates/list-metadata?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&templateListType=Stable&searchTerm=&page=0&size=20&includeAllTemplatesAvailableAtScope=true`

export const templateValueCall = `/template/api/templates/Cypress_Step_Template?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&versionLabel=1&getDefaultFromOtherRepo=true`

export const templateInputsCall =
  '/template/api/templates/templateInputs/Cypress_Step_Template?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&versionLabel=1&getDefaultFromOtherRepo=true'

export const getResolvedTemplateCall = (identifier: string, version: string): string =>
  `/template/api/templates/get-resolved-template/${identifier}?routingId=${accountId}&accountIdentifier=${accountId}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectId}&versionLabel=${version}&getDefaultFromOtherRepo=true*`

export const templateMetadataCallAfterSelection =
  '/template/api/templates/list-metadata?routingId=accountId&accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&module=cd&templateListType=All&size=100'

export const selectedTemplateCall =
  '/template/api/templates/Cypress_Step_Template?accountIdentifier=accountId&orgIdentifier=default&projectIdentifier=project1&getDefaultFromOtherRepo=true'

export const saveStepAsTemplateCall =
  '/template/api/templates?accountIdentifier=accountId&projectIdentifier=project1&orgIdentifier=default&isNewTemplate=true&storeType=INLINE'

export const shellScriptProvisionerYamlSnippetsCall =
  '/ng/api/pipelines/configuration/strategies/provisioner-yaml-snippets?provisionerType=SHELL_SCRIPT_PROVISIONER&routingId=accountId'
export interface ValidObject {
  resourceName: StepResourceObject[]
  warningCheck?: boolean
}

export interface StepResourceObject {
  type: string
  name: string
  value: string
}
export interface StepConfigObject {
  [name: string]: { [name: string]: StepResourceObject | boolean }
}

export const pipelinesListCallResponse = {
  status: 'SUCCESS',
  data: {
    content: [
      {
        name: 'Parallel Pipelines',
        identifier: 'Parallel_Pipelines',
        tags: {},
        version: 33,
        numOfStages: 7,
        createdAt: 1643729398277,
        lastUpdatedAt: 1643729619074,
        modules: ['cd'],
        recentExecutionsInfo: [],
        filters: {
          cd: {
            deploymentTypes: ['Kubernetes'],
            environmentNames: ['prod environment'],
            serviceNames: ['Normal Service'],
            infrastructureTypes: ['KubernetesDirect']
          }
        },
        stageNames: ['Stage1', 'Stage2', 'Stage3', 'Stage4', 'Stage5', 'Stage6', 'Stage7'],
        gitDetails: {
          objectId: null,
          branch: null,
          repoIdentifier: null,
          rootFolder: null,
          filePath: null,
          repoName: null
        },
        entityValidityDetails: {
          valid: true,
          invalidYaml: null
        }
      },
      {
        name: 'ParallStage',
        identifier: 'ParallStage',
        tags: {},
        version: 154,
        numOfStages: 6,
        createdAt: 1641473199732,
        lastUpdatedAt: 1643184469790,
        modules: ['cd', 'ci'],
        recentExecutionsInfo: [],
        filters: {
          cd: {
            deploymentTypes: ['Kubernetes'],
            environmentNames: [
              'test',
              'Devsf',
              'Very Long Env asd asd asd Kapil',
              'fdsggg',
              'asdasd',
              'prod environment'
            ],
            serviceNames: ['Newdds', 'test', 'Very Big Service Name Really', 'web', 'Normal Service', 'gfgfgf asdsad'],
            infrastructureTypes: ['KubernetesDirect']
          },
          ci: {
            repoNames: ['CCD']
          }
        },
        stageNames: ['Stage 5', 'Stage 6', 'Stage 3', 'Stage 4', 'Stage 1', 'Stage 2'],
        gitDetails: {
          objectId: null,
          branch: null,
          repoIdentifier: null,
          rootFolder: null,
          filePath: null,
          repoName: null
        },
        entityValidityDetails: {
          valid: true,
          invalidYaml: null
        }
      },
      {
        name: 'Pipeline 1911',
        identifier: 'Pipeline_1911',
        tags: {
          tag1: ''
        },
        version: 14,
        numOfStages: 1,
        createdAt: 1637310118606,
        lastUpdatedAt: 1640093470460,
        modules: ['cd'],
        recentExecutionsInfo: [],
        filters: {
          cd: {
            deploymentTypes: ['Kubernetes'],
            environmentNames: ['env 2'],
            serviceNames: ['service 4'],
            infrastructureTypes: ['KubernetesDirect']
          }
        },
        stageNames: ['s1'],
        gitDetails: {
          objectId: '40d8e60d7e4b46f1a41deba2af7ee9c324726c13',
          branch: 'main',
          repoIdentifier: 'Git_Sync_Cypress',
          rootFolder: 'cypressQAResources/.harness/',
          filePath: 'Pipeline_1911.yaml',
          repoName: null
        },
        entityValidityDetails: {
          valid: false,
          invalidYaml:
            'pipeline:\n    name: Pipeline 1911\n    identifier: Pipeline_1911\n    projectIdentifier: Cypress_Git_Sync_Saas\n    orgIdentifier: default\n    tags:\n        tag1: ""\n    stages:\n        - stage:\n              name: s1\n              identifier: s1\n              description: ""\n              type: Deployme\n              spec:\n                  serviceConfig:\n                      serviceRef: service_4\n                      serviceDefinition:\n                          type: Kubernetes\n                          spec:\n                              variables: []\n                              manifests:\n                                  - manifest:\n                                        identifier: test\n                                        type: HelmChart\n                                        spec:\n                                            store:\n                                                type: Http\n                                                spec:\n                                                    connectorRef: account.puthrayahelm\n                                            chartName: test do\n                                            chartVersion: <+input>\n                                            helmVersion: V2\n                                            skipResourceVersioning: false\n                  infrastructure:\n                      environmentRef: env_2\n                      infrastructureDefinition:\n                          type: KubernetesDirect\n                          spec:\n                              connectorRef: <+input>\n                              namespace: <+input>\n                              releaseName: release-<+INFRA_KEY>\n                      allowSimultaneousDeployments: false\n                  execution:\n                      steps:\n                          - step:\n                                type: ShellScript\n                                name: test1\n                                identifier: test1\n                                spec:\n                                    shell: Bash\n                                    onDelegate: true\n                                    source:\n                                        type: Inline\n                                        spec:\n                                            script: <+input>\n                                    environmentVariables: []\n                                    outputVariables: []\n                                    executionTarget: {}\n                                timeout: 10m\n                      rollbackSteps: []\n              tags: {}\n              failureStrategies:\n                  - onFailure:\n                        errors:\n                            - AllErrors\n                        action:\n                            type: StageRollback\n    variables:\n        - name: var2411\n          type: Number\n          value: ""\n'
        }
      }
    ],
    pageable: {
      sort: {
        sorted: true,
        unsorted: false,
        empty: false
      },
      pageNumber: 0,
      pageSize: 20,
      offset: 0,
      paged: true,
      unpaged: false
    },
    last: false,
    totalPages: 1,
    totalElements: 3,
    first: true,
    sort: {
      sorted: true,
      unsorted: false,
      empty: false
    },
    numberOfElements: 3,
    size: 20,
    number: 0,
    empty: false
  },
  metaData: null,
  correlationId: 'f8b4e248-f6ba-47eb-938f-b205e6de5d4b'
}

export const servicesV2AccessResponse = {
  status: 'SUCCESS',
  data: [
    {
      service: {
        accountId: 'zEaak-FLS425IEO7OLzMUg',
        identifier: 'testService',
        orgIdentifier: 'CVNG',
        projectIdentifier: 'Dummy_Pipeline',
        name: 'testService',
        description: null,
        deleted: false,
        tags: {},
        version: 18,
        yaml: null
      },
      createdAt: 1643080660753,
      lastModifiedAt: 1645703389065
    },
    {
      service: {
        accountId: 'zEaak-FLS425IEO7OLzMUg',
        identifier: 'testService2',
        orgIdentifier: 'CVNG',
        projectIdentifier: 'Dummy_Pipeline',
        name: 'testService2',
        description: null,
        deleted: false,
        tags: {},
        version: 18,
        yaml: null
      },
      createdAt: 1643080660753,
      lastModifiedAt: 1645703389065
    },
    {
      service: {
        accountId: 'zEaak-FLS425IEO7OLzMUg',
        identifier: 'testService3',
        orgIdentifier: 'CVNG',
        projectIdentifier: 'Dummy_Pipeline',
        name: 'testService3',
        description: null,
        deleted: false,
        tags: {},
        version: 18
      },
      createdAt: 1643080660753,
      lastModifiedAt: 1645703389065
    }
  ],
  metaData: null,
  correlationId: 'dbfcc921-47f3-4841-b67a-7a4f85b7d5f3'
}

export const stepsData = {
  'BG Swap Services': { resourceName: [] },
  'Stage Deployment': { resourceName: [] },
  Apply: {
    resourceName: [{ type: 'resource', name: 'spec.filePaths[0].value', value: 'resource' }],
    warningCheck: true
  },
  Delete: {
    resourceName: [{ type: 'resource', name: 'spec.deleteResources.spec.resourceNames[0].value', value: 'resource' }]
  },
  'Canary Delete': { resourceName: [] },
  'Rolling Deployment': { resourceName: [] },
  'Canary Deployment': { resourceName: [] },
  Scale: { resourceName: [{ type: 'resource', name: 'spec.workload', value: 'resource' }] },
  'Rolling Rollback': { resourceName: [] },
  'Shell Script': {
    resourceName: [{ type: 'className', name: '.monaco-editor textarea:first', value: 'echo 1' }]
  },
  HTTP: {
    resourceName: [
      { type: 'resource', name: 'spec.url', value: 'https://abc.com' },
      { type: 'resource', name: 'spec.requestBody', value: 'resource' }
    ]
  }
}

export const artifactRepoTypes = [
  'Custom',
  'Artifactory',
  'Jenkins',
  'Nexus3',
  'Amazon',
  'S3',
  'Docker Registry',
  'ECR',
  'GCR',
  'ACR'
]

export const invalidYAMLErrorMsgOnEmptyStageSave =
  'Invalid yaml: $.pipeline.stages[0].stage.spec.execution: is missing but it is required\n$.pipeline.stages[0].stage.spec.infrastructure.infrastructureDefinition: is missing but it is required\n$.pipeline.stages[0].stage.tags: is not defined in the schema and the schema does not allow additional properties\n$.pipeline.stages[0].stage.spec.infrastructure.useFromStage: is missing but it is required\n$.pipeline.stages[0].stage.type: is not defined in the schema and the schema does not allow additional properties\n$.pipeline.stages[0].stage.spec: is not defined in the schema and the schema does not allow additional properties\n$.pipeline.stages[0].stage.spec.infrastructure.environmentRef: is missing but it is required\n$.pipeline.stages[0].stage.spec.infrastructure.environment: is missing but it is required\n$.pipeline.stages[0].stage.type: does not have a value in the enumeration [CI, Approval, FeatureFlag]'

export const afterSaveServiceResponse = {
  status: 'SUCCESS',
  data: {
    service: {
      accountId: 'accountId',
      identifier: serviceName,
      orgIdentifier: 'default',
      projectIdentifier: 'project1',
      name: serviceName,
      description: null,
      deleted: false,
      tags: {},
      yaml: 'service:\n  name: "testServiceV2"\n  identifier: "testServiceV2"\n  tags: {}\n'
    },
    createdAt: 1662015990367,
    lastModifiedAt: 1662015990367
  },
  metaData: null,
  correlationId: '8fd410f5-f323-4405-aa4e-822a90ebb2e6'
}

export const afterSaveServiceNameResponse = {
  status: 'SUCCESS',
  data: {
    service: {
      accountId: 'accountId',
      identifier: serviceName,
      orgIdentifier: 'default',
      projectIdentifier: 'project1',
      name: serviceName,
      description: null,
      deleted: false,
      tags: {},
      yaml: 'service:\n  name: "testServiceV2"\n  identifier: "testServiceV2"\n  tags: {}\n'
    },
    createdAt: 1662015990367,
    lastModifiedAt: 1662015990367
  },
  metaData: null,
  correlationId: '800b0d74-d639-4056-b279-8f2990b2aef1'
}
export const afterFinalSaveServiceNameResponse = {
  status: 'SUCCESS',
  data: {
    service: {
      accountId: 'accountId',
      identifier: serviceName,
      orgIdentifier: 'default',
      projectIdentifier: 'project1',
      name: serviceName,
      description: null,
      deleted: false,
      tags: {},
      yaml: 'service:\n  name: testServiceV2\n  identifier: testServiceV2\n  tags: {}\n  serviceDefinition:\n    spec:\n      artifacts:\n        primary:\n          spec:\n            connectorRef: <+input>\n            artifactDirectory: <+input>\n            artifactPath: <+input>\n            repository: <+input>\n            repositoryFormat: generic\n          type: ArtifactoryRegistry\n      configFiles:\n        - configFile:\n            identifier: testConfigFileIdentifier\n            spec:\n              store:\n                type: Harness\n                spec:\n                  files: <+input>\n    type: Ssh\n'
    },
    createdAt: 1662360916500,
    lastModifiedAt: 1662364088534
  },
  metaData: null,
  correlationId: 'acbab7ab-7322-4ded-a1cb-1a0d55ba4059'
}
export const afterFinalServiceNameWinrmResponse = {
  status: 'SUCCESS',
  data: {
    service: {
      accountId: 'accountId',
      identifier: serviceName,
      orgIdentifier: 'default',
      projectIdentifier: 'project1',
      name: serviceName,
      description: null,
      deleted: false,
      tags: {},
      yaml: 'service:\n  name: testServiceV2\n  identifier: testServiceV2\n  tags: {}\n  serviceDefinition:\n    spec:\n      artifacts:\n        primary:\n          spec:\n            connectorRef: <+input>\n            artifactDirectory: <+input>\n            artifactPath: <+input>\n            repository: <+input>\n            repositoryFormat: generic\n          type: ArtifactoryRegistry\n      configFiles:\n        - configFile:\n            identifier: testConfigFileIdentifier\n            spec:\n              store:\n                type: Harness\n                spec:\n                  files: <+input>\n    type: WinRm\n'
    },
    createdAt: 1662360916500,
    lastModifiedAt: 1662364088534
  },
  metaData: null,
  correlationId: 'acbab7ab-7322-4ded-a1cb-1a0d55ba4059'
}

export const afterSaveServiceHeaderResponse = {
  status: 'SUCCESS',
  data: {
    name: serviceName,
    identifier: serviceName,
    description: null,
    deploymentTypes: [],
    createdAt: 1662015990367,
    lastModifiedAt: 1662015990367
  },
  metaData: null,
  correlationId: '980e9edf-fa13-484a-bd7e-f5b1e79aaaa9'
}

export const finalSaveServiceResponse = {
  status: 'SUCCESS',
  data: {
    service: {
      accountId: 'accountId',
      identifier: serviceName,
      orgIdentifier: 'default',
      projectIdentifier: 'project1',
      name: serviceName,
      description: null,
      deleted: false,
      tags: {},
      yaml: 'service:\n  name: testServiceV2\n  identifier: testServiceV2\n  tags: {}\n  serviceDefinition:\n    spec:\n      manifests:\n        - manifest:\n            identifier: testManifestName\n            type: K8sManifest\n            spec:\n              store:\n                type: Github\n                spec:\n                  connectorRef: <+input>\n                  gitFetchType: Branch\n                  paths:\n                    - root/bin/\n                  repoName: <+input>\n                  branch: master\n              skipResourceVersioning: false\n    type: Kubernetes\n  gitOpsEnabled: false\n'
    },
    createdAt: 1662099973244,
    lastModifiedAt: 1662100039989
  },
  metaData: null,
  correlationId: 'c1b8dcd8-37d5-490e-8a41-3feb5ccb54d5'
}
export const finalSaveServiceNameResponse = {
  status: 'SUCCESS',
  data: {
    service: {
      accountId: 'accountId',
      identifier: serviceName,
      orgIdentifier: 'default',
      projectIdentifier: 'project1',
      name: serviceName,
      description: null,
      deleted: false,
      tags: {},
      yaml: 'service:\n  name: testServiceV2\n  identifier: testServiceV2\n  tags: {}\n  serviceDefinition:\n    spec:\n      manifests:\n        - manifest:\n            identifier: testManifestName\n            type: K8sManifest\n            spec:\n              store:\n                type: Github\n                spec:\n                  connectorRef: <+input>\n                  gitFetchType: Branch\n                  paths:\n                    - root/bin/\n                  repoName: <+input>\n                  branch: master\n              skipResourceVersioning: false\n      artifacts:\n        primary:\n          spec:\n            connectorRef: <+input>\n            imagePath: <+input>\n            tag: <+input>\n          type: DockerRegistry\n    type: Kubernetes\n  gitOpsEnabled: false\n'
    },
    createdAt: 1662099973244,
    lastModifiedAt: 1662101517118
  },
  metaData: null,
  correlationId: 'c2d087e6-f449-417d-9ca3-fb2d13daab46'
}

export const servicesV2Response = {
  status: 'SUCCESS',
  data: [
    {
      service: {
        accountId: 'px7xd_BFRCi-pfWPYXVjvw',
        identifier: 'DockerServicetest',
        orgIdentifier: 'default',
        projectIdentifier: 'KanikaTest',
        name: 'DockerServicetest',
        deleted: false,
        tags: {},
        v2Service: false
      },
      createdAt: 1658998955970,
      lastModifiedAt: 1685363737824
    }
  ],
  metaData: null,
  correlationId: '60596984-4550-4a28-ab45-32ce5d65052a'
}

export const environmentV2Response = {
  status: 'SUCCESS',
  data: [
    {
      environment: {
        accountId: 'px7xd_BFRCi-pfWPYXVjvw',
        orgIdentifier: 'default',
        projectIdentifier: 'KanikaTest',
        identifier: 'EnvironmentTest',
        name: 'EnvironmentTest',
        color: '#0063F7',
        type: 'Production',
        deleted: false,
        tags: {},
        yaml: 'environment:\n  orgIdentifier: "default"\n  projectIdentifier: "KanikaTest"\n  identifier: "EnvironmentTest"\n  tags: {}\n  name: "EnvironmentTest"\n  type: "Production"\n'
      },
      createdAt: 1658999432548,
      lastModifiedAt: 1658999432548
    }
  ],
  metaData: null,
  correlationId: '020cfb58-7e19-42bb-bd2f-e764300e55d9'
}

export const serviceV2YamlInput = {
  status: 'SUCCESS',
  data: {
    serviceV2YamlMetadataList: [
      {
        serviceIdentifier: 'DockerServicetest',
        serviceYaml:
          'service:\n  name: DockerServicetest\n  identifier: DockerServicetest\n  tags: {}\n  serviceDefinition:\n    spec:\n      manifests:\n        - manifest:\n            identifier: testManifestName\n            type: K8sManifest\n            spec:\n              store:\n                type: Github\n                spec:\n                  connectorRef: <+input>\n                  gitFetchType: Branch\n                  paths:\n                    - root/bin/\n                  repoName: <+input>\n                  branch: master\n              skipResourceVersioning: false\n      artifacts:\n        primary:\n          spec:\n            connectorRef: <+input>\n            imagePath: <+input>\n            tag: <+input>\n          type: DockerRegistry\n    type: Kubernetes\n  gitOpsEnabled: false\n',
        inputSetTemplateYaml:
          'serviceInputs:\n  serviceDefinition:\n    type: "Kubernetes"\n    spec:\n      manifests:\n      - manifest:\n          identifier: "testManifestName"\n          type: "K8sManifest"\n          spec:\n            store:\n              type: "Github"\n              spec:\n                connectorRef: "<+input>"\n                repoName: "<+input>"\n      artifacts:\n        primary:\n          type: "DockerRegistry"\n          spec:\n            connectorRef: "<+input>"\n            imagePath: "<+input>"\n            tag: "<+input>"\n',
        orgIdentifier: 'default',
        projectIdentifier: 'default'
      }
    ]
  },
  metaData: null,
  correlationId: '49aeb88d-c4fe-40d1-81d0-c3179e09dfd8'
}

export const afterFinalSaveConnectorsListResponse = {
  status: 'SUCCESS',
  data: {
    totalPages: 0,
    totalItems: 0,
    pageItemCount: 0,
    pageSize: 10,
    content: [],
    pageIndex: 0,
    empty: true
  },
  metaData: null,
  correlationId: 'cea537e0-859e-43ee-93fd-224f3259c6c2'
}

//function to drag element vertically
export function dragElementVerticallyBy(el, pageYDragAmount): void {
  const rect = el[0].getBoundingClientRect()

  cy.window().then(window => {
    const pageY = rect.top + window.pageYOffset

    cy.wrap(el)
      .trigger('mousedown', {
        which: 1,
        clientX: rect.left,
        clientY: pageY,
        force: true
      })
      .trigger('mousemove', {
        clientX: rect.left,
        clientY: pageY + pageYDragAmount,
        force: true
      })
      .trigger('mousemove', { force: true })
      .trigger('mouseup', {
        which: 1,
        force: true
      })
  })
}
