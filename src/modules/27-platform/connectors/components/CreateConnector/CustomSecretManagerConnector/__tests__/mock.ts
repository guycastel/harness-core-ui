/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

export const getTemplateMockWithDelegateFalse = {
  accountId: 'accountId',
  orgIdentifier: 'default',
  projectIdentifier: 'Templates_Variable',
  identifier: 'Template_Name_3',
  name: 'Template Name 3',
  description: '',
  tags: {},
  yaml: 'template:\n  name: Template Name 3\n  identifier: Template_Name_3\n  versionLabel: "1"\n  type: SecretManager\n  projectIdentifier: Templates_Variable\n  orgIdentifier: default\n  tags: {}\n  spec:\n    executionTarget:\n      workingDirectory: hjgjj\n      connectorRef: account.sds\n      host: host\n    shell: Bash\n    source:\n      spec:\n        script: |-\n          curl -o secret.json -X GET <+spec.environmentVariables.url>/<+spec.environmentVariables.engineName>/<+spec.environmentVariables.namespace> -H \'X-Vault-Token: <+secrets.getValue("vaulttoken")>\'\n          secret=$(jq -r \'.data."<+spec.environmentVariables.key>"\' secret.json)\n        type: Inline\n    onDelegate: false\n    environmentVariables:\n      - name: key\n        type: String\n        value: <+input>\n      - name: url\n        type: String\n        value: <+input>\n      - name: namespace\n        type: String\n        value: <+input>\n',
  versionLabel: '1',
  templateEntityType: 'SecretManager',
  templateScope: 'project',
  version: 6,
  gitDetails: {
    objectId: null,
    branch: null,
    repoIdentifier: null,
    rootFolder: null,
    filePath: null,
    repoName: null,
    commitId: null,
    fileUrl: null
  },
  entityValidityDetails: { valid: true, invalidYaml: null },
  lastUpdatedAt: 1660854378386,
  createdAt: 1660212324926,
  stableTemplate: true
}

export const inputSetWithExecutionTarget = {
  status: 'SUCCESS',
  data: 'executionTarget:\n  host: "<+input>"\nenvironmentVariables:\n- name: "key"\n  type: "String"\n  value: "<+input>"\n- name: "url"\n  type: "String"\n  value: "<+input>"\n- name: "namespace"\n  type: "String"\n  value: "<+input>"\n',
  metaData: null,
  correlationId: 'ed26c81f-a701-4294-8a68-61e1c132b248'
}

export const inputSet = {
  status: 'SUCCESS',
  data: 'environmentVariables:\n- name: "key"\n  type: "String"\n  value: "<+input>"\n- name: "engine"\n  type: "String"\n  value: "<+input>"\n',
  metaData: null,
  correlationId: '9a4ce344-ac48-42e3-9466-ffdca5677d61'
}

export const inputSetEmpty = {
  status: 'SUCCESS',
  data: null,
  metaData: null,
  correlationId: '9a4ce344-ac48-42e3-9466-ffdca5677d61'
}

export const CustomSMConnector = {
  name: 'hello',
  identifier: 'hello',
  description: '',
  orgIdentifier: 'default',
  projectIdentifier: 'Templates_Variable',
  tags: {},
  type: 'CustomSecretManager',
  spec: {
    delegateSelectors: [],
    onDelegate: false,
    connectorRef: 'account.sds',
    host: 'changes',
    workingDirectory: 'working directory',
    timeout: '20',
    template: {
      templateRef: 'Template_Name_3',
      versionLabel: '1',
      templateInputs: {
        executionTarget: { host: '' },
        environmentVariables: [
          { name: 'key', type: 'String', value: 'dsf' },
          { name: 'url', type: 'String', value: 'dsf' },
          { name: 'namespace', type: 'String', value: 'dfsd' }
        ]
      }
    },
    testVariables: null,
    default: false
  }
}

export const smConfigStepDataToSubmit = {
  name: 'hello',
  identifier: 'hello',
  description: '',
  orgIdentifier: 'default',
  projectIdentifier: 'Templates_Variable',
  tags: {},
  type: 'CustomSecretManager',
  spec: {
    delegateSelectors: [],
    onDelegate: false,
    connectorRef: 'account.sds',
    host: 'changes',
    workingDirectory: 'working directory',
    template: {
      templateRef: 'Template_Name_3',
      versionLabel: '1',
      templateInputs: {
        executionTarget: { host: '' },
        environmentVariables: [
          { name: 'key', type: 'String', value: 'dsf' },
          { name: 'url', type: 'String', value: 'dsf' },
          { name: 'namespace', type: 'String', value: 'dfsd' }
        ]
      }
    },
    timeout: '20',
    testVariables: null,
    default: false
  },
  template: {
    templateRef: 'Template_Name_3',
    versionLabel: '1',
    templateInputs: {
      executionTarget: { host: '' },
      environmentVariables: [
        { name: 'key', type: 'String', value: 'dsf' },
        { name: 'url', type: 'String', value: 'dsf' },
        { name: 'namespace', type: 'String', value: 'dfsd' }
      ]
    }
  },
  templateInputs: {
    executionTarget: { host: '' },
    environmentVariables: [
      { name: 'key', type: 'String', value: 'dsf' },
      { name: 'url', type: 'String', value: 'dsf' },
      { name: 'namespace', type: 'String', value: 'dfsd' }
    ]
  },
  executionTarget: { host: 'changes', workingDirectory: 'working directory', connectorRef: 'account.sds' },
  templateJson: {},
  onDelegate: '',
  timeout: '22'
}
