import { Connectors } from '../../../utils/connctors-utils'

export const servicesCallV1 = '/ng/api/services?*'
export const environmentsV1 = '/ng/api/environments?*'
export const saveTemplateCall = '/template/api/templates?*'
export const templateListCall = '/template/api/templates/list?*'
export const templateDataCall = '/template/api/templates/AppD_Template?*'
export const resolvedTemplateDataCall = '/template/api/templates/get-resolved-template/AppD_Template?*'
export const templateInputSetCall = '/template/api/templates/templateInputs/AppD_Template?*'
export const RuntimeValue = '<+input>'
export const variablesResponse = {
  status: 'SUCCESS',
  data: {
    yaml: '---\nmonitoredService:\n  serviceRef: "yV7lZdxoSnuJya6CEjzP2Q"\n  environmentRef: "vf0Yge11TpSmd1Xw1fUJMA"\n  type: "Application"\n  sources:\n    changeSources:\n    - name: "o5aCu8i0RpiMJXNEwnjpmQ"\n      identifier: "harness_cd_next_gen"\n      type: "HarnessCDNextGen"\n      enabled: "awpnBdvYRp6zHAMuOqIjRw"\n      category: "7wDnQoQfSSmqKeyM7Q_aqw"\n      spec:\n        __uuid: "hcOtxbXyQ8iAy6Grp0pmWg"\n      __uuid: "4izqJpgoT5CxFB0i56VFmA"\n    healthSources: []\n    __uuid: "4RGGJxY-QzaL0KPAVNX6Pw"\n  identifier: "templateInputs"\n  name: "go1Yyvu4RwOdKc6lzkLJ3A"\n  __uuid: "55eHRk5cSO6HNixCGlmIGg"\n__uuid: "DB6MR5zoSQS2vTGc8yGQ_A"\n',
    metadataMap: {
      vf0Yge11TpSmd1Xw1fUJMA: {
        yamlProperties: {
          fqn: 'monitoredService.environmentRef',
          localName: '',
          variableName: 'environmentRef',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      },
      '7wDnQoQfSSmqKeyM7Q_aqw': {
        yamlProperties: {
          fqn: 'monitoredService.sources.changeSources.harness_cd_next_gen.category',
          localName: '',
          variableName: 'category',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      },
      o5aCu8i0RpiMJXNEwnjpmQ: {
        yamlProperties: {
          fqn: 'monitoredService.sources.changeSources.harness_cd_next_gen.name',
          localName: '',
          variableName: 'name',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      },
      awpnBdvYRp6zHAMuOqIjRw: {
        yamlProperties: {
          fqn: 'monitoredService.sources.changeSources.harness_cd_next_gen.enabled',
          localName: '',
          variableName: 'enabled',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      },
      yV7lZdxoSnuJya6CEjzP2Q: {
        yamlProperties: {
          fqn: 'monitoredService.serviceRef',
          localName: '',
          variableName: 'serviceRef',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      },
      go1Yyvu4RwOdKc6lzkLJ3A: {
        yamlProperties: {
          fqn: 'monitoredService.name',
          localName: '',
          variableName: 'name',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      }
    },
    errorResponses: null,
    serviceExpressionPropertiesList: null
  },
  metaData: null,
  correlationId: 'a47a5f45-1f52-412a-bdc7-899149ca2d3f'
}

export const variablesResponseWithAppDVariable = {
  status: 'SUCCESS',
  data: {
    yaml: '---\nmonitoredService:\n  serviceRef: "S_xIYtBVQeStt67cjt3inw"\n  environmentRef: "JUWxU1vYQYSxy40qTMVStw"\n  type: "Application"\n  sources:\n    changeSources:\n    - name: "7xMmnoNMT6euWiAcQlj0pw"\n      identifier: "harness_cd_next_gen"\n      type: "HarnessCDNextGen"\n      enabled: "BGxpyQbYRCKpxEWzlnxbuA"\n      category: "FbEQKrQ6S6i7hAqDs8YTDg"\n      spec:\n        __uuid: "jNS2AgL1QLGhiSDfHxXMoA"\n      __uuid: "cvTFtJMaRamUv6x_bR-71g"\n    healthSources: []\n    __uuid: "rufpeRsvRdStrv0jvyk1VQ"\n  variables:\n  - name: "AppDApplication"\n    type: "String"\n    value: "pLodmwW0SSGxtW355BYNKw"\n    __uuid: "_wYRa4rUTBWnPCGP2bd9Lw"\n  identifier: "templateInputs"\n  name: "zX5DeYecQLSye0ob8zH8_A"\n  __uuid: "d429MQruQNCWxyxr5fUPRQ"\n__uuid: "R9VDGCPxQh6ODeXPY3ZG5g"\n',
    metadataMap: {
      JUWxU1vYQYSxy40qTMVStw: {
        yamlProperties: {
          fqn: 'monitoredService.environmentRef',
          localName: '',
          variableName: 'environmentRef',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      },
      '7xMmnoNMT6euWiAcQlj0pw': {
        yamlProperties: {
          fqn: 'monitoredService.sources.changeSources.harness_cd_next_gen.name',
          localName: '',
          variableName: 'name',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      },
      FbEQKrQ6S6i7hAqDs8YTDg: {
        yamlProperties: {
          fqn: 'monitoredService.sources.changeSources.harness_cd_next_gen.category',
          localName: '',
          variableName: 'category',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      },
      BGxpyQbYRCKpxEWzlnxbuA: {
        yamlProperties: {
          fqn: 'monitoredService.sources.changeSources.harness_cd_next_gen.enabled',
          localName: '',
          variableName: 'enabled',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      },
      zX5DeYecQLSye0ob8zH8_A: {
        yamlProperties: {
          fqn: 'monitoredService.name',
          localName: '',
          variableName: 'name',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      },
      pLodmwW0SSGxtW355BYNKw: {
        yamlProperties: {
          fqn: 'monitoredService.variables.AppDApplication',
          localName: '',
          variableName: 'AppDApplication',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      },
      S_xIYtBVQeStt67cjt3inw: {
        yamlProperties: {
          fqn: 'monitoredService.serviceRef',
          localName: '',
          variableName: 'serviceRef',
          aliasFQN: '',
          visible: true
        },
        yamlOutputProperties: null,
        yamlExtraProperties: null
      }
    },
    errorResponses: null,
    serviceExpressionPropertiesList: null
  },
  metaData: null,
  correlationId: 'a63bd126-2dc6-4f02-8708-84895e4db7bf'
}

export const HealthSourceDetails = {
  template: {
    name: 'AppD Template',
    identifier: 'AppD_Template',
    version: '1'
  },
  name: 'AppD',
  connector: Connectors.APP_DYNAMICS,
  group: 'Group 1',
  metricName: 'appdMetric'
}

export const yamlTemplate = `template:
  name: AppD Template
  identifier: AppD_Template
  versionLabel: "1"
  type: MonitoredService
  projectIdentifier: project1
  orgIdentifier: default
  tags: {}
  spec:
    serviceRef: <+input>
    environmentRef: <+input>
    type: Application
    sources:
      healthSources:
        - name: AppD
          identifier: AppD
          type: AppDynamics
          spec:
            applicationName: <+input>
            tierName: <+input>
            metricData:
              Errors: true
              Performance: true
            metricDefinitions:
              - identifier: appdMetric
                metricName: appdMetric
                completeMetricPath: <+input>
                groupName: Group 1
                completeServiceInstanceMetricPath: <+input>
                sli:
                  enabled: true
                analysis:
                  riskProfile:
                    riskCategory: Errors
                    thresholdTypes:
                      - ACT_WHEN_HIGHER
                  liveMonitoring:
                    enabled: false
                  deploymentVerification:
                    enabled: true
            feature: Application Monitoring
            connectorRef: <+input>
            metricPacks:
              - identifier: Errors
                metricThresholds: []
              - identifier: Performance
                metricThresholds: []
`
export const templateListValue = {
  status: 'SUCCESS',
  data: {
    content: [
      {
        accountId: 'accountId',
        orgIdentifier: 'default',
        projectIdentifier: 'project1',
        identifier: HealthSourceDetails.template.identifier,
        name: HealthSourceDetails.template.name,
        description: '',
        tags: {},
        yaml: yamlTemplate.toString(),
        versionLabel: HealthSourceDetails.template.version,
        templateEntityType: 'MonitoredService',
        childType: 'Application',
        templateScope: 'project',
        version: 0,
        gitDetails: {
          objectId: null,
          branch: null,
          repoIdentifier: null,
          rootFolder: null,
          filePath: null,
          repoName: null,
          commitId: null,
          fileUrl: null,
          repoUrl: null
        },
        entityValidityDetails: { valid: true, invalidYaml: null },
        lastUpdatedAt: 1661838047936,
        createdAt: 1661838047936,
        stableTemplate: true
      }
    ],
    pageable: {
      sort: { sorted: true, unsorted: false, empty: false },
      pageSize: 20,
      pageNumber: 0,
      offset: 0,
      paged: true,
      unpaged: false
    },
    totalElements: 1,
    last: true,
    totalPages: 1,
    sort: { sorted: true, unsorted: false, empty: false },
    number: 0,
    first: true,
    numberOfElements: 1,
    size: 20,
    empty: false
  },
  metaData: null,
  correlationId: '02ba45bb-c4e4-4885-a3ed-08ea2ef7ea8b'
}
