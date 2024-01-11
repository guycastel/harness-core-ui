import type { StringKeys } from 'framework/strings'
import { overridesLabelStringMap } from './ServiceOverridesUtils'

interface RowConfig {
  headerWidth?: string | number
  rowWidth?: number
  value: StringKeys
  accessKey?: 'environmentRef' | 'infraIdentifier' | 'serviceRef' | 'overrideType'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapper?: Record<any, any>
}

type OverrideTypes = 'ENV_GLOBAL_OVERRIDE' | 'ENV_SERVICE_OVERRIDE' | 'INFRA_GLOBAL_OVERRIDE' | 'INFRA_SERVICE_OVERRIDE'

export const serviceOverridesConfig: Record<OverrideTypes, RowConfig[]> = {
  ENV_GLOBAL_OVERRIDE: [
    {
      headerWidth: 158,
      rowWidth: 220,
      value: 'common.serviceOverrides.overrideType',
      accessKey: 'overrideType',
      mapper: overridesLabelStringMap
    },
    {
      value: 'common.serviceOverrides.overrideInfo'
    }
  ],
  ENV_SERVICE_OVERRIDE: [
    {
      headerWidth: 158,
      rowWidth: 220,
      value: 'common.serviceOverrides.overrideType',
      accessKey: 'overrideType',
      mapper: overridesLabelStringMap
    },
    {
      value: 'common.serviceOverrides.overrideInfo'
    }
  ],
  INFRA_GLOBAL_OVERRIDE: [
    {
      headerWidth: 158,
      rowWidth: 220,
      value: 'common.serviceOverrides.overrideType',
      accessKey: 'overrideType',
      mapper: overridesLabelStringMap
    },
    {
      value: 'common.serviceOverrides.overrideInfo'
    }
  ],
  INFRA_SERVICE_OVERRIDE: [
    {
      headerWidth: 136,
      rowWidth: 220,
      value: 'common.serviceOverrides.overrideType',
      accessKey: 'overrideType',
      mapper: overridesLabelStringMap
    },
    {
      value: 'common.serviceOverrides.overrideInfo'
    }
  ]
}
