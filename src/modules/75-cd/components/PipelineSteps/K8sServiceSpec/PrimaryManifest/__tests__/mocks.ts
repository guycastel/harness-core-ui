/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

export const templatewithRuntime = {
  manifests: [
    {
      manifest: {
        identifier: 'a1',
        type: 'HelmChart',
        spec: {
          store: {
            type: 'OciHelmChart',
            spec: {
              basePath: '<+input>'
            }
          },
          chartName: '<+input>',
          subChartPath: '<+input>',
          chartVersion: '<+input>'
        }
      }
    },
    {
      manifest: {
        identifier: 'a2',
        type: 'HelmChart',
        spec: {
          store: {
            type: 'OciHelmChart',
            spec: {
              config: {
                type: 'Generic',
                spec: {
                  connectorRef: '<+input>'
                }
              },
              basePath: '<+input>'
            }
          },
          chartName: '<+input>',
          chartVersion: '<+input>'
        }
      }
    },
    {
      manifest: {
        identifier: 'a3',
        type: 'HelmChart',
        spec: {
          store: {
            type: 'OciHelmChart',
            spec: {
              config: {
                type: 'Generic',
                spec: {
                  connectorRef: '<+input>'
                }
              },
              basePath: '<+input>'
            }
          },
          chartName: '<+input>',
          chartVersion: '<+input>'
        }
      }
    }
  ],
  manifestConfigurations: {
    primaryManifestRef: '<+input>'
  }
}
export const templateWithoutRuntime = {
  artifacts: {
    primary: {
      primaryArtifactRef: '<+input>',
      sources: '<+input>'
    }
  }
}

export const initialValuesWithRuntime = {
  artifacts: {
    primary: {
      primaryArtifactRef: 'source1',
      sources: [
        {
          identifier: 'source1',
          type: 'DockerRegistry',
          spec: {
            tag: ''
          }
        }
      ]
    }
  }
}

export const stageContextValue = {
  getStageFormTemplate: jest.fn(() => '<+input>'),
  updateStageFormTemplate: jest.fn()
}

export const inputSetFormikInitialValues = {
  name: 'helm',
  identifier: 'helm',
  tags: {},
  template: {
    templateRef: 'helmstagetemplatemanifest',
    versionLabel: 'v1',
    templateInputs: {
      type: 'Deployment',
      spec: {
        environment: {
          environmentRef: '<+input>',
          environmentInputs: '<+input>',
          serviceOverrideInputs: '<+input>',
          infrastructureDefinitions: '<+input>'
        },
        service: {
          serviceRef: 'helmmanifest',
          serviceInputs: {
            serviceDefinition: {
              type: 'NativeHelm',
              spec: {
                manifests: [
                  {
                    manifest: {
                      identifier: 'a1',
                      type: 'HelmChart',
                      spec: {
                        store: {
                          type: 'OciHelmChart',
                          spec: {
                            basePath: ''
                          }
                        },
                        chartName: '',
                        subChartPath: '',
                        chartVersion: ''
                      }
                    }
                  },
                  {
                    manifest: {
                      identifier: 'a2',
                      type: 'HelmChart',
                      spec: {
                        store: {
                          type: 'OciHelmChart',
                          spec: {
                            config: {
                              type: 'Generic',
                              spec: {
                                connectorRef: ''
                              }
                            },
                            basePath: ''
                          }
                        },
                        chartName: '',
                        chartVersion: ''
                      }
                    }
                  },
                  {
                    manifest: {
                      identifier: 'a3',
                      type: 'HelmChart',
                      spec: {
                        store: {
                          type: 'OciHelmChart',
                          spec: {
                            config: {
                              type: 'Generic',
                              spec: {
                                connectorRef: ''
                              }
                            },
                            basePath: ''
                          }
                        },
                        chartName: '',
                        chartVersion: ''
                      }
                    }
                  }
                ],
                manifestConfigurations: {
                  primaryManifestRef: ''
                }
              }
            }
          }
        }
      }
    }
  }
}

export const serviceMetadata = {
  serviceV2YamlMetadataList: [
    {
      serviceIdentifier: 'helmmanifest',
      serviceYaml:
        'service:\n  name: helm-manifest\n  identifier: helmmanifest\n  orgIdentifier: default\n  projectIdentifier: tudors_DoNotDelete\n  serviceDefinition:\n    spec:\n      release:\n        name: release-<+INFRA_KEY_SHORT_ID>\n      manifests:\n        - manifest:\n            identifier: a1\n            type: HelmChart\n            spec:\n              store:\n                type: OciHelmChart\n                spec:\n                  config:\n                    type: Generic\n                    spec:\n                      connectorRef: org.OciHelmConnectorForAutomationTest\n                  basePath: <+input>\n              chartName: <+input>\n              subChartPath: <+input>\n              chartVersion: <+input>\n              helmVersion: V380\n              skipResourceVersioning: false\n              enableDeclarativeRollback: false\n              fetchHelmChartMetadata: false\n        - manifest:\n            identifier: a2\n            type: HelmChart\n            spec:\n              store:\n                type: OciHelmChart\n                spec:\n                  config:\n                    type: Generic\n                    spec:\n                      connectorRef: <+input>\n                  basePath: <+input>\n              chartName: <+input>\n              subChartPath: ""\n              chartVersion: <+input>\n              helmVersion: V380\n              skipResourceVersioning: false\n              enableDeclarativeRollback: false\n              fetchHelmChartMetadata: false\n        - manifest:\n            identifier: a3\n            type: HelmChart\n            spec:\n              store:\n                type: OciHelmChart\n                spec:\n                  config:\n                    type: Generic\n                    spec:\n                      connectorRef: <+input>\n                  basePath: <+input>\n              chartName: <+input>\n              subChartPath: ""\n              chartVersion: <+input>\n              helmVersion: V380\n              skipResourceVersioning: false\n              enableDeclarativeRollback: false\n              fetchHelmChartMetadata: false\n      manifestConfigurations:\n        primaryManifestRef: <+input>\n      artifacts:\n        primary:\n          primaryArtifactRef: <+input>\n          sources:\n            - spec:\n                connectorRef: <+input>\n                imagePath: <+input>\n                tag: <+input>\n                digest: a\n              identifier: a\n              type: DockerRegistry\n            - spec:\n                connectorRef: <+input>\n                imagePath: a\n                tag: <+input>\n                digest: ""\n              identifier: a2\n              type: DockerRegistry\n    type: NativeHelm\n',
      inputSetTemplateYaml:
        'serviceInputs:\n  serviceDefinition:\n    type: NativeHelm\n    spec:\n      manifests:\n        - manifest:\n            identifier: a1\n            type: HelmChart\n            spec:\n              store:\n                type: OciHelmChart\n                spec:\n                  basePath: <+input>\n              chartName: <+input>\n              subChartPath: <+input>\n              chartVersion: <+input>\n        - manifest:\n            identifier: a2\n            type: HelmChart\n            spec:\n              store:\n                type: OciHelmChart\n                spec:\n                  config:\n                    type: Generic\n                    spec:\n                      connectorRef: <+input>\n                  basePath: <+input>\n              chartName: <+input>\n              chartVersion: <+input>\n        - manifest:\n            identifier: a3\n            type: HelmChart\n            spec:\n              store:\n                type: OciHelmChart\n                spec:\n                  config:\n                    type: Generic\n                    spec:\n                      connectorRef: <+input>\n                  basePath: <+input>\n              chartName: <+input>\n              chartVersion: <+input>\n      manifestConfigurations:\n        primaryManifestRef: <+input>\n      artifacts:\n        primary:\n          primaryArtifactRef: <+input>\n          sources: <+input>\n',
      orgIdentifier: 'default',
      projectIdentifier: 'tudors_DoNotDelete',
      storeType: 'INLINE'
    }
  ]
}

export const services = [
  {
    service: {
      identifier: 'helmmanifest',
      name: 'helmmanifest'
    }
  },
  {
    service: {
      identifier: 'svc_2',
      name: 'Service 2'
    }
  }
]
