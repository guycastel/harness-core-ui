/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { IconName } from '@harness/uicore'
import { getConnectorIconByType } from '@platform/connectors/pages/connectors/utils/ConnectorHelper'
import type { ChangeSourceDTO } from 'services/cv'
import { ChangeSourceTypes } from './ChangeSourceDrawer/ChangeSourceDrawer.constants'

export const getIconBySource = (source: ChangeSourceDTO['type']): IconName => {
  switch (source) {
    case ChangeSourceTypes.HarnessCDNextGen:
      return 'cd-main' as IconName
    case ChangeSourceTypes.HarnessCD:
      return 'harness' as IconName
    case ChangeSourceTypes.HarnessCE:
      return 'chaos-main' as IconName
    case ChangeSourceTypes.CustomFF:
    case ChangeSourceTypes.CustomDeploy:
    case ChangeSourceTypes.CustomIncident:
    case ChangeSourceTypes.CustomInfrastructure:
      return 'service-custom-connector'
    default:
      return getConnectorIconByType(source || '')
  }
}
