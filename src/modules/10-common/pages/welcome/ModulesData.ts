/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { IconName } from '@harness/icons'
import type { StringKeys } from 'framework/strings'
export interface ModuleInfoValue {
  module: string
  icon: IconName
  title: StringKeys
  subTitle: StringKeys
  bodyText: StringKeys
  points?: StringKeys
  hasPoints?: boolean
  helpURL: string
}
export interface ModulesInfoMap {
  [key: string]: ModuleInfoValue
}
const modulesInfo = {
  ci: {
    module: 'ci',
    icon: 'ci-main',
    title: 'common.welcomePage.ci.title',
    subTitle: 'common.welcomePage.ci.subTitle',
    bodyText: 'common.welcomePage.ci.bodyText',
    points: 'common.welcomePage.ci.points',
    helpURL: 'https://developer.harness.io/tutorials/build-code',
    hasPoints: true
  },
  cd: {
    module: 'cd',
    icon: 'cd-main',
    title: 'common.cdAndGitops',
    subTitle: 'common.welcomePage.cd.subTitle',
    bodyText: 'common.welcomePage.cd.bodyText',
    points: 'common.welcomePage.cd.points',
    helpURL: 'https://developer.harness.io/tutorials/deploy-services',
    hasPoints: true
  },
  code: {
    module: 'code',
    icon: 'code',
    title: 'common.welcomePage.code.title',
    subTitle: 'common.welcomePage.code.subTitle',
    bodyText: 'common.welcomePage.code.bodyText',
    points: 'common.welcomePage.code.points',
    helpURL: 'https://developer.harness.io/docs/category/get-started-with-code',
    hasPoints: true
  },
  ce: {
    module: 'ce',
    icon: 'ce-main',
    title: 'common.welcomePage.ce.title',
    subTitle: 'common.welcomePage.ce.subTitle',
    bodyText: 'common.welcomePage.ce.bodyText',
    helpURL: 'https://developer.harness.io/tutorials/manage-cloud-costs'
  },
  cf: {
    module: 'cf',
    icon: 'cf-main',
    title: 'common.welcomePage.cf.title',
    subTitle: 'common.welcomePage.cf.subTitle',
    bodyText: 'common.welcomePage.cf.bodyText',
    helpURL: 'https://developer.harness.io/tutorials/manage-feature-flags'
  },
  cv: {
    module: 'cv',
    icon: 'cv-main',
    title: 'common.welcomePage.cv.title',
    subTitle: 'common.welcomePage.cv.subTitle',
    bodyText: 'common.welcomePage.cv.bodyText',
    helpURL: 'https://developer.harness.io/tutorials/manage-service-reliability'
  },
  chaos: {
    module: 'chaos',
    icon: 'chaos-main',
    title: 'common.welcomePage.chaos.title',
    subTitle: 'common.welcomePage.chaos.subTitle',
    bodyText: 'common.welcomePage.chaos.bodyText',
    helpURL: 'https://developer.harness.io/tutorials/run-chaos-experiments'
  }
} as ModulesInfoMap

export { modulesInfo }
