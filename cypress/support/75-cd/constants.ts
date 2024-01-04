export const accountIdentifier = 'accountId'
export const orgIdentifier = 'default'
export const projectIdentifier = 'project1'
export const module1 = 'cd'
export const environmentIdentifier = 'testEnvConfig'
const secretText = 'SecretText'

// APIs
export const environmentsCall = `/ng/api/environmentsV2?routingId=${accountIdentifier}&accountIdentifier=${accountIdentifier}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectIdentifier}&page=0&size=10`
export const environmentGroupsCall = `/ng/api/environmentGroup/list?routingId=${accountIdentifier}&accountIdentifier=${accountIdentifier}&projectIdentifier=${projectIdentifier}&orgIdentifier=${orgIdentifier}&size=10&page=0&sort=lastModifiedAt%2CDESC`
export const createEnvironmentGroupsCall = `/ng/api/environmentGroup?accountIdentifier=${accountIdentifier}`
export const environmentGroupDetailsCall = `/ng/api/environmentGroup/testEnvGroup?routingId=${accountIdentifier}&accountIdentifier=${accountIdentifier}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectIdentifier}`
export const environmentGroupYamlSchemaCall = `/ng/api/yaml-schema?routingId=${accountIdentifier}&entityType=EnvironmentGroup&projectIdentifier=${projectIdentifier}&orgIdentifier=${orgIdentifier}&accountIdentifier=${accountIdentifier}&scope=project`
export const environmentConfigurationCall = `/ng/api/environmentsV2/${environmentIdentifier}?routingId=${accountIdentifier}&accountIdentifier=${accountIdentifier}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectIdentifier}`
export const environmentFetchCall = `/ng/api/environmentsV2?routingId=${accountIdentifier}&accountIdentifier=${accountIdentifier}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectIdentifier}`
export const environmentSaveCall = `/ng/api/environmentsV2?routingId=${accountIdentifier}&accountIdentifier=${accountIdentifier}`
export const infrastructureListCall = `/ng/api/infrastructures?routingId=${accountIdentifier}&accountIdentifier=${accountIdentifier}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectIdentifier}&environmentIdentifier=${environmentIdentifier}&page=0&size=10&searchTerm=`

export const environmentConfigurationSecretCall = `/ng/api/v2/secrets?accountIdentifier=${accountIdentifier}&type=${secretText}&searchTerm=&projectIdentifier=${projectIdentifier}&orgIdentifier=${orgIdentifier}&pageIndex=0&pageSize=10&includeAllSecretsAccessibleAtScope=true`
export const infrastructureDefinitionSaveCall = `/ng/api/infrastructures?routingId=${accountIdentifier}&accountIdentifier=${accountIdentifier}`
export const pipelineCreationCall = `/pipeline/api/pipelines/v2?accountIdentifier=${accountIdentifier}&orgIdentifier=${orgIdentifier}&projectIdentifier=${projectIdentifier}`
export const listAllReposByConnector = `/ng/api/scm/list-all-repos-by-connector?routingId=${accountIdentifier}&accountIdentifier=${accountIdentifier}&projectIdentifier=${projectIdentifier}&orgIdentifier=${orgIdentifier}&connectorRef=account.Github`
export const trialConnectorCall = `/ng/api/trial-signup/create-scm-connector?routingId=accountId&accountIdentifier=${accountIdentifier}`

// BROWSER ROUTES
export const environmentGroupRoute = `account/${accountIdentifier}/${module1}/orgs/${orgIdentifier}/projects/${projectIdentifier}/environments/groups`
export const environmentRoute = `account/${accountIdentifier}/cd/orgs/${orgIdentifier}/projects/${projectIdentifier}/environments`
export const environmentConfigurationRoute = `account/${accountIdentifier}/cd/orgs/${orgIdentifier}/projects/${projectIdentifier}/environments/${environmentIdentifier}/details?sectionId=CONFIGURATION`
export const projectDashboardRoute = `account/${accountIdentifier}/cd/orgs/${orgIdentifier}/projects/${projectIdentifier}/dashboard`
export const infrastructureDetailsDrawerRoute = `account/${accountIdentifier}/cd/orgs/${orgIdentifier}/projects/${projectIdentifier}/environments/${environmentIdentifier}/details?sectionId=INFRASTRUCTURE&infraDetailsTab=CONFIGURATION&infrastructureId=infra1`
