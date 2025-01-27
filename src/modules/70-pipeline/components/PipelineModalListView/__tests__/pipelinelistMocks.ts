/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { ResponsePagePMSPipelineSummaryResponse } from 'services/pipeline-ng'

export const pipelines = {
  status: 'SUCCESS',
  data: {
    content: [
      {
        name: 'Sonar Develop',
        identifier: 'Sonar_Develop',
        tags: {},
        version: 2971,
        numOfStages: 3,
        createdAt: 1651205219105,
        lastUpdatedAt: 1658832561590,
        modules: ['ci', 'pms'],
        recentExecutionsInfo: [
          {
            executorInfo: {
              triggerType: 'WEBHOOK',
              username: 'udayvunnam',
              email: null
            },
            planExecutionId: 'uBrIkDHwTU2lv4o7ri7iCQ',
            status: 'Running',
            startTs: 1660018359933,
            endTs: 1660018368141
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK',
              username: 'bot-harness',
              email: null
            },
            planExecutionId: '7FEd0ajSTmOzibwxR0Z1Og',
            status: 'Aborted',
            startTs: 1660015771989,
            endTs: 1660018360645
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK',
              username: 'bot-harness',
              email: null
            },
            planExecutionId: 'UkKbsF32TJy5XbGYKC24pA',
            status: 'Expired',
            startTs: 1660015120695,
            endTs: 1660018872245
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK',
              username: 'bot-harness',
              email: null
            },
            planExecutionId: '6f_Cx_GZTdSDg0eTOVPihg',
            status: 'Aborted',
            startTs: 1660014983467,
            endTs: 1660015126969
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK',
              username: 'jenil-harness',
              email: null
            },
            planExecutionId: 'TefM6JBgR8uTJ7a2DBTmKg',
            status: 'Success',
            startTs: 1660013739073,
            endTs: 1660015553868
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK',
              username: 'VikasMaddukuriHarness',
              email: null
            },
            planExecutionId: '6RZFnHoGQNmGSI140H4Ypg',
            status: 'Failed',
            startTs: 1659979678677,
            endTs: 1659980250004
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK',
              username: 'upadhyay-an',
              email: null
            },
            planExecutionId: '5JCNuxIDQYqXz1vh5CA25A',
            status: 'Aborted',
            startTs: 1659978031684,
            endTs: 1659979679314
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK',
              username: 'mbatchelor',
              email: null
            },
            planExecutionId: '3kmzmUrsSOCE5jCRPm9JTw',
            status: 'Aborted',
            startTs: 1659977392012,
            endTs: 1659978032408
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK',
              username: 'pbarapatre10',
              email: null
            },
            planExecutionId: 'sMQVhx67RVK7vyw37IfAUw',
            status: 'Success',
            startTs: 1659965594074,
            endTs: 1659967497888
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK',
              username: 'deepesh-ui',
              email: null
            },
            planExecutionId: 'm0yO3AuUSsCt6p1YJKKLhQ',
            status: 'Failed',
            startTs: 1659959051577,
            endTs: 1659960426070
          }
        ],
        filters: {
          ci: {
            repoNames: ['harness-core-ui']
          },
          pms: {
            stageTypes: [],
            featureFlagStepCount: 0
          }
        },
        stageNames: ['Sonar'],
        entityValidityDetails: {
          valid: true,
          invalidYaml: null
        },
        storeType: 'INLINE'
      },
      {
        name: 'NG Docker Image',
        identifier: 'NG_Docker_Image',
        description: '',
        tags: {},
        version: 3900,
        numOfStages: 4,
        createdAt: 1622694239113,
        lastUpdatedAt: 1658999091443,
        modules: ['ci', 'pms'],
        recentExecutionsInfo: [
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'sunnykesh.shandilya@harness.io',
              email: 'sunnykesh.shandilya@harness.io'
            },
            planExecutionId: 'yrfNWoyERfu6wOzdI3A3KQ',
            status: 'Success',
            startTs: 1659988014599,
            endTs: 1659988559397
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'sunnykesh.shandilya@harness.io',
              email: 'sunnykesh.shandilya@harness.io'
            },
            planExecutionId: 'cCrz_JToTFimFefCLKHw1A',
            status: 'Running',
            startTs: 1659955156658,
            endTs: 1659955600965
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'Depanshu Dhiman',
              email: 'depanshu.dhiman@harness.io'
            },
            planExecutionId: 'G48hXQ5oRDuqMpfVeKHeFA',
            status: 'Success',
            startTs: 1659952362208,
            endTs: 1659952893510
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'Reetika Mallavarapu',
              email: 'mallavarapu.reetika@harness.io'
            },
            planExecutionId: '4YR0JW99QIajZ2-bH3fPaw',
            status: 'Success',
            startTs: 1659951988346,
            endTs: 1659952553514
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'Reetika Mallavarapu',
              email: 'mallavarapu.reetika@harness.io'
            },
            planExecutionId: 'rvrG4AtdTHqExXNPhE1gqA',
            status: 'Failed',
            startTs: 1659951898452,
            endTs: 1659951900550
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'satyam.srivastava',
              email: 'satyam.srivastava@harness.io'
            },
            planExecutionId: 'DuZDxi1ATQ6L128JC9idjg',
            status: 'Success',
            startTs: 1659947237533,
            endTs: 1659947668423
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'Bhavya Sinha',
              email: 'bhavya.sinha@harness.io'
            },
            planExecutionId: 'dY8nWMzZRhu3VBKY-WLvug',
            status: 'Success',
            startTs: 1659933710164,
            endTs: 1659934123659
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'Rajarshee Chatterjee',
              email: 'rajarshee.chatterjee@harness.io'
            },
            planExecutionId: 'wKIvXHFST8OHdNnvz-NRBQ',
            status: 'Success',
            startTs: 1659713011235,
            endTs: 1659713505263
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'sunnykesh.shandilya@harness.io',
              email: 'sunnykesh.shandilya@harness.io'
            },
            planExecutionId: 'izVPnjfGQE-E1--ivTpskA',
            status: 'Success',
            startTs: 1659700476051,
            endTs: 1659700900068
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'Yogesh Chaudhary',
              email: 'yogesh.chaudhary@harness.io'
            },
            planExecutionId: 'Yxme0QePRge-rt_uUgMG5Q',
            status: 'Success',
            startTs: 1659699890744,
            endTs: 1659700364260
          }
        ],
        filters: {
          ci: {
            repoNames: ['harness-core-ui']
          },
          pms: {
            stageTypes: [],
            featureFlagStepCount: 0
          }
        },
        stageNames: ['Build'],
        entityValidityDetails: {
          valid: true,
          invalidYaml: null
        },
        storeType: 'INLINE'
      },
      {
        name: 'Microfrontends Publish Package',
        identifier: 'Microfrontends_Publish_Package',
        description: 'Builds and publishes the microfrontends package from NGUI/src/microfrontends',
        tags: {},
        version: 56,
        numOfStages: 1,
        createdAt: 1655843514970,
        lastUpdatedAt: 1658585512911,
        modules: ['ci', 'pms'],

        recentExecutionsInfo: [
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'Jyoti Arora',
              email: 'jyoti.arora@harness.io'
            },
            planExecutionId: 'xgGsoK7MTr2LKua1QcR7iA',
            status: 'Success',
            startTs: 1659693488900,
            endTs: 1659693967975
          }
        ],
        filters: {
          ci: {
            repoNames: ['harness-core-ui']
          },
          pms: {
            stageTypes: [],
            featureFlagStepCount: 0
          }
        },
        stageNames: ['Build'],
        entityValidityDetails: {
          valid: true,
          invalidYaml: null
        },
        storeType: 'INLINE'
      },
      {
        name: 'mb-gh-work',
        identifier: 'mbghwork',
        tags: {},
        version: 58,
        numOfStages: 1,
        createdAt: 1658411394681,
        lastUpdatedAt: 1658424604926,
        modules: ['ci', 'pms'],
        recentExecutionsInfo: [],
        filters: {
          ci: {
            repoNames: []
          },
          pms: {
            stageTypes: [],
            featureFlagStepCount: 0
          }
        },
        stageNames: ['ReadRepos'],
        entityValidityDetails: {
          valid: true,
          invalidYaml: null
        },
        storeType: 'INLINE'
      },
      {
        name: 'NG UI - Pre QA',
        identifier: 'NG_UI_Pre_QA',
        tags: {},
        version: 230,
        numOfStages: 3,
        createdAt: 1648619837536,
        lastUpdatedAt: 1658397966203,
        modules: ['ci', 'pms'],
        recentExecutionsInfo: [
          {
            executorInfo: {
              triggerType: 'WEBHOOK_CUSTOM',
              username: 'customtriggerngui',
              email: null
            },
            planExecutionId: 'oUFj-rzTTo-oCR7DLF7lww',
            status: 'Success',
            startTs: 1659932295387,
            endTs: 1659932863014
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK_CUSTOM',
              username: 'customtriggerngui',
              email: null
            },
            planExecutionId: 'JVAxJJsbQEiOQ1sL_Z3fdQ',
            status: 'Success',
            startTs: 1659766179051,
            endTs: 1659766805918
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK_CUSTOM',
              username: 'customtriggerngui',
              email: null
            },
            planExecutionId: 'OZOH2ptOQX-9Qnp8ttDagw',
            status: 'Success',
            startTs: 1659677430254,
            endTs: 1659677902668
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK_CUSTOM',
              username: 'customtriggerngui',
              email: null
            },
            planExecutionId: 'X-1Qr9KXSkWrC0GX6Y36Og',
            status: 'Success',
            startTs: 1659588546375,
            endTs: 1659588998358
          },
          {
            executorInfo: {
              triggerType: 'WEBHOOK_CUSTOM',
              username: 'customtriggerngui',
              email: null
            },
            planExecutionId: '8nynCNa0Q0mvoiecu2jJow',
            status: 'Success',
            startTs: 1659501891862,
            endTs: 1659502467854
          }
        ],
        filters: {
          ci: {
            repoNames: ['harness-core-ui']
          },
          pms: {
            stageTypes: [],
            featureFlagStepCount: 0
          }
        },
        stageNames: ['Build'],
        entityValidityDetails: {
          valid: true,
          invalidYaml: null
        },
        storeType: 'INLINE'
      },
      {
        name: 'mb-gh-work-abcd',
        identifier: 'mbghworkabcd',
        tags: {},
        version: 518,
        numOfStages: 12,
        createdAt: 1658411394681,
        lastUpdatedAt: 1658424604926,
        modules: ['ci', 'pms'],
        recentExecutionsInfo: [],
        filters: {
          ci: {
            repoNames: []
          },
          pms: {
            stageTypes: [],
            featureFlagStepCount: 0
          }
        },
        stageNames: ['ReadRepos'],
        entityValidityDetails: {
          valid: true,
          invalidYaml: null
        },
        storeType: 'REMOTE',
        connectorRef: 'Connector1',
        gitDetails: {
          repoName: 'Repo1'
        }
      },
      {
        name: 'CDP-NG-PROD-3 PostProd Sanity',
        identifier: 'Prod3NGSanity',
        description: '',
        tags: {
          ngPipelines: ''
        },
        version: 14,
        numOfStages: 5,
        createdAt: 1658919105239,
        lastUpdatedAt: 1660885226101,
        modules: ['ci', 'pms'],
        recentExecutionsInfo: [
          {
            executorInfo: {
              triggerType: 'WEBHOOK_CUSTOM',
              username: 'CDPNGProd3_Sanity',
              email: null
            },
            planExecutionId: 'K72MyTHBQ06Q7FPheF0ibw',
            status: 'Failed',
            startTs: 1660866303431,
            endTs: 1660866690050
          }
        ],
        filters: {
          ci: {
            repoNames: ['Automation']
          },
          pms: {
            stageTypes: ['CI', 'Approval'],
            featureFlagStepCount: 0
          }
        },
        stageNames: [
          'Jira-Update-Execution',
          'CDP-NG Post Prod Pass Notification',
          'Stage1',
          'CDP-NG Post Prod Fail Notification',
          'Jira-Update-Status'
        ],
        entityValidityDetails: {
          valid: true,
          invalidYaml: null
        },
        storeType: 'INLINE',
        isDraft: false
      },
      {
        name: 'DB-Alerting-Pre-QA',
        identifier: 'DBAlertingPreQA',
        tags: {},
        version: 60,
        numOfStages: 1,
        createdAt: 1658726733161,
        lastUpdatedAt: 1660821469562,
        modules: ['pms'],
        recentExecutionsInfo: [
          {
            executorInfo: {
              triggerType: 'SCHEDULER_CRON',
              username: 'preqaeverymonday',
              email: null
            },
            planExecutionId: 'tO3g8bzlRMyaz0gF92FzpQ',
            status: 'Success',
            startTs: 1661133609940,
            endTs: 1661133639441
          },
          {
            executorInfo: {
              triggerType: 'SCHEDULER_CRON',
              username: 'preqaeverymonday',
              email: null
            },
            planExecutionId: 'i8SMVrogRR6wq8hca1ruaQ',
            status: 'Success',
            startTs: 1660528823976,
            endTs: 1660528983965
          },
          {
            executorInfo: {
              triggerType: 'SCHEDULER_CRON',
              username: 'preqaeverymonday',
              email: null
            },
            planExecutionId: 'HDxgaY8NQG-Hd_CEugfabQ',
            status: 'Success',
            startTs: 1659924012457,
            endTs: 1659924040452
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'devesh.mishra@harness.io',
              email: 'devesh.mishra@harness.io'
            },
            planExecutionId: 'u5HQSgr_Q86gW9cYwuJxQA',
            status: 'Success',
            startTs: 1659516471172,
            endTs: 1659516489891
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'devesh.mishra@harness.io',
              email: 'devesh.mishra@harness.io'
            },
            planExecutionId: '-GaSxWVcRM-d8K2Vg4EJCg',
            status: 'Success',
            startTs: 1659516273630,
            endTs: 1659516295860
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'devesh.mishra@harness.io',
              email: 'devesh.mishra@harness.io'
            },
            planExecutionId: 'b0RzH0dyShe_9jCP39Yerw',
            status: 'Success',
            startTs: 1659506290212,
            endTs: 1659506303998
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'devesh.mishra@harness.io',
              email: 'devesh.mishra@harness.io'
            },
            planExecutionId: 'PeMei3mgT5OsgNdNrRt3rg',
            status: 'Success',
            startTs: 1659506157559,
            endTs: 1659506171883
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'devesh.mishra@harness.io',
              email: 'devesh.mishra@harness.io'
            },
            planExecutionId: 'DxxUPe5SQ5WnGfShbGjLMA',
            status: 'Success',
            startTs: 1659505883708,
            endTs: 1659505891651
          },
          {
            executorInfo: {
              triggerType: 'MANUAL',
              username: 'devesh.mishra@harness.io',
              email: 'devesh.mishra@harness.io'
            },
            planExecutionId: 'wZ8KOW5_RCiJEdEqBeaRLA',
            status: 'Success',
            startTs: 1659505756599,
            endTs: 1659505775499
          }
        ],
        filters: {
          pms: {
            stageTypes: ['Approval'],
            featureFlagStepCount: 0
          }
        },
        stageNames: ['DB-Alert'],
        entityValidityDetails: {
          valid: true,
          invalidYaml: null
        },
        storeType: 'INLINE',
        isDraft: false
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
    totalElements: 8,
    first: true,
    sort: {
      sorted: true,
      unsorted: false,
      empty: false
    },
    number: 0,
    numberOfElements: 8,
    size: 20,
    empty: false
  },
  metaData: null,
  correlationId: '80fe297b-e613-426d-8ee3-9a57d7f05b4e'
}

export const pipelinesWithGitDetails: ResponsePagePMSPipelineSummaryResponse = {
  status: 'SUCCESS',
  data: {
    content: [
      {
        name: 'pipeline1',
        identifier: 'pipeline1',
        description: 'pipeline1 description',
        tags: { asdd: 'asd', test: '' },
        numOfStages: 2,
        gitDetails: {
          repoIdentifier: 'repoId',
          branch: 'branch'
        }
      },
      {
        name: 'pipeline2',
        identifier: 'pipeline2',
        description: 'pipeline2 description',
        numOfStages: 2,
        gitDetails: {
          repoIdentifier: 'repoId',
          branch: 'branch'
        }
      }
    ],
    pageable: {
      sort: { sorted: false, unsorted: true, empty: true },
      pageSize: 25,
      offset: 0,
      pageNumber: 0,
      paged: true,
      unpaged: false
    },
    totalElements: 4,
    last: true,
    totalPages: 1,
    numberOfElements: 4,
    size: 25,
    number: 0,
    first: true,
    sort: { sorted: false, unsorted: true, empty: true },
    empty: false
  }
}

export const pipelinesEmpty: ResponsePagePMSPipelineSummaryResponse = {
  status: 'SUCCESS',
  data: {
    content: [],
    pageable: {
      sort: { sorted: false, unsorted: true, empty: true },
      pageSize: 25,
      offset: 0,
      pageNumber: 0,
      paged: true,
      unpaged: false
    },
    totalElements: 0,
    last: true,
    totalPages: 1,
    numberOfElements: 0,
    size: 25,
    number: 0,
    first: true,
    sort: { sorted: false, unsorted: true, empty: true },
    empty: false
  }
}
