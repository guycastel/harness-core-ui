/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

export const manifestsDefaultProps = {
  connectors: {
    totalPages: 1,
    totalItems: 1,
    pageItemCount: 1,
    pageSize: 10,
    content: [
      {
        connector: {
          name: 'id1',
          identifier: 'id1',
          description: '',
          accountIdentifier: 'acc1',
          orgIdentifier: 'org1',
          projectIdentifier: 'p1',
          tags: {},
          type: 'Github',
          spec: {
            url: 'https://github.com/test/p.git',
            validationRepo: '',
            authentication: {
              type: 'Http',
              spec: {
                type: 'UsernameToken',
                spec: {
                  username: 'autouser@ha.io',
                  usernameRef: '',
                  tokenRef: 'account.token'
                }
              }
            },
            apiAccess: {
              type: 'Token',
              spec: {
                tokenRef: 'account.token'
              }
            },
            delegateSelectors: [],
            executeOnDelegate: true,
            proxy: false,
            type: 'Repo'
          }
        },
        createdAt: 1702557975641,
        lastModifiedAt: 1702557975637,
        status: {
          status: 'SUCCESS',
          errorSummary: '',
          testedAt: 1702594186715,
          lastTestedAt: 0,
          lastConnectedAt: 1702594186715
        },
        activityDetails: {
          lastActivityTime: 1702557975751
        },
        harnessManaged: false,
        gitDetails: {
          objectId: '',
          branch: '',
          repoIdentifier: '',
          rootFolder: '',
          filePath: '',
          repoName: '',
          commitId: '',
          fileUrl: '',
          repoUrl: '',
          parentEntityConnectorRef: '',
          parentEntityRepoName: ''
        },
        entityValidityDetails: {
          valid: true,
          invalidYaml: ''
        },
        isFavorite: false
      }
    ],
    pageIndex: 0,
    empty: false,
    pageToken: ''
  },
  listOfManifests: [
    {
      manifest: {
        identifier: 'id1',
        type: 'K8sManifest',
        spec: {
          store: {
            type: 'Github',
            spec: {
              connectorRef: 'account.CDNGAuto_1',
              gitFetchType: 'Branch',
              paths: ['f1'],
              branch: 'b1'
            }
          },
          valuesPaths: ['v1'],
          skipResourceVersioning: false,
          enableDeclarativeRollback: false
        }
      }
    },
    {
      manifest: {
        identifier: 'g11',
        type: 'Values',
        spec: {
          store: {
            type: 'Git',
            spec: {
              connectorRef: 'account.GitConnectorgJDa4slveI',
              gitFetchType: 'Branch',
              paths: ['f1'],
              branch: 'b1'
            }
          }
        }
      }
    },
    {
      manifest: {
        identifier: 'h1',
        type: 'OpenshiftParam',
        spec: {
          store: {
            type: 'Harness',
            spec: {
              files: ['/nginx.yaml']
            }
          }
        }
      }
    },
    {
      manifest: {
        identifier: 'v1',
        type: 'KustomizePatches',
        spec: {
          store: {
            type: 'GitLab',
            spec: {
              connectorRef: 'org.GitLabHelmConnectorForAutomationTest',
              gitFetchType: 'Branch',
              paths: ['f1'],
              branch: 'b1'
            }
          }
        }
      }
    }
  ],
  deploymentType: 'Kubernetes',
  isReadonly: false,
  allowableTypes: ['FIXED', 'RUNTIME', 'EXPRESSION'],
  allowOnlyOneManifest: false,
  availableManifestTypes: [
    'K8sManifest',
    'Values',
    'HelmChart',
    'OpenshiftTemplate',
    'OpenshiftParam',
    'Kustomize',
    'KustomizePatches'
  ]
}

export const manifestsPropsForServerlessLambda = {
  connectors: {
    content: []
  },
  listOfManifests: [],
  deploymentType: 'ServerlessAwsLambda',
  isReadonly: false,
  allowableTypes: ['FIXED', 'RUNTIME', 'EXPRESSION'],
  allowOnlyOneManifest: false,
  availableManifestTypes: ['ServerlessAwsLambda', 'Values']
}

export const manifestsPropsForServerlessLambdaWithExistingList = {
  connectors: {
    totalPages: 1,
    totalItems: 1,
    pageItemCount: 1,
    pageSize: 10,
    content: [
      {
        connector: {
          name: 'asws_Account',
          identifier: 'asws_Account',
          description: '',
          accountIdentifier: 'acc1',
          orgIdentifier: 'org1',
          projectIdentifier: 'p1',
          tags: {},
          type: 'Aws',
          spec: {
            credential: {
              crossAccountAccess: null,
              type: 'ManualConfig',
              spec: {
                accessKey: 'test',
                accessKeyRef: null,
                secretKeyRef: 'test'
              },
              region: null
            },
            awsSdkClientBackOffStrategyOverride: null,
            delegateSelectors: [],
            executeOnDelegate: true,
            proxy: false
          }
        },
        createdAt: 1691746395436,
        lastModifiedAt: 1702017558923,
        status: {
          status: 'SUCCESS',
          errorSummary: '',
          testedAt: 1703126100137,
          lastTestedAt: 0,
          lastConnectedAt: 1703126100137
        },
        activityDetails: {
          lastActivityTime: 1702017559051
        },
        harnessManaged: false,
        gitDetails: {
          objectId: '',
          branch: '',
          repoIdentifier: '',
          rootFolder: '',
          filePath: '',
          repoName: '',
          commitId: '',
          fileUrl: '',
          repoUrl: '',
          parentEntityConnectorRef: '',
          parentEntityRepoName: ''
        },
        entityValidityDetails: {
          valid: true,
          invalidYaml: ''
        },
        isFavorite: false
      }
    ],
    pageIndex: 0,
    empty: false,
    pageToken: ''
  },
  isReadonly: false,
  deploymentType: 'ServerlessAwsLambda',
  listOfManifests: [
    {
      manifest: {
        identifier: 'ServerlessAwsLambdaManifest',
        type: 'ServerlessAwsLambda',
        spec: {
          store: {
            type: 'S3',
            spec: {
              connectorRef: 'account.asws_Account',
              region: 'us-east-1',
              bucketName: 'my-first-serverless-proj-serverlessdeploymentbuck-pos1c8m0h4fh',
              paths: ['path.zip']
            }
          },
          configOverridePath: 'test/path.yaml'
        }
      }
    },
    {
      manifest: {
        identifier: 'ValuesManifest',
        type: 'Values',
        spec: {
          store: {
            type: 'S3',
            spec: {
              connectorRef: 'account.asws_Account',
              region: 'us-east-1',
              bucketName: 'my-first-serverless-proj-serverlessdeploymentbuck-pos1c8m0h4fh',
              paths: ['path.zip']
            }
          }
        }
      }
    }
  ],
  allowableTypes: ['FIXED', 'RUNTIME', 'EXPRESSION'],
  allowOnlyOneManifest: false,
  availableManifestTypes: ['ServerlessAwsLambda', 'Values']
}

export const dummyBucketListResponse = {
  data: [{ bucketName: 'bucket1' }, { bucketName: 'my-first-serverless-proj-serverlessdeploymentbuck-pos1c8m0h4fh' }]
}

export const awsRegionListResponse = {
  resource: [
    { name: 'region1', value: 'region1' },
    { name: 'us-east-1', value: 'us-east-1' }
  ]
}
