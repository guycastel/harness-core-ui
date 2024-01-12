/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { NGTemplateInfoConfig } from 'services/template-ng'

export const templateTypeToY1TypeMap: Map<string, NGTemplateInfoConfig['type']> = new Map([
  ['step', 'Step'],
  ['stage', 'Stage'],
  ['pipeline', 'Pipeline'],
  ['customdeployment', 'CustomDeployment'],
  ['monitoredservice', 'MonitoredService'],
  ['secretmanager', 'SecretManager'],
  ['artifactsource', 'ArtifactSource'],
  ['group', 'StepGroup']
])
