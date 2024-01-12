/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { IconName } from '@harness/icons'
import type { StoreType } from '@common/constants/GitSyncTypes'
import type {
  NodeRunInfo,
  EntityGitDetails,
  EntityValidityDetails,
  InputSetResponse,
  PipelineInfoConfig,
  StringNGVariable,
  NumberNGVariable,
  SecretNGVariable,
  StepElementConfig
} from 'services/pipeline-ng'
import { ProviderInterface } from '@common/components/GitProviderSelect/GitProviderSelect'

export type AllNGVariables = StringNGVariable | NumberNGVariable | SecretNGVariable

export interface ExecutionPageQueryParams {
  view?: 'log' | 'graph'
  stage?: string
  step?: string
  retryStep?: string
  stageExecId?: string // strategy nodes require stageExecId + stageID
  childStage?: string
  collapsedNode?: string
  type?: string
}

export interface ExpressionBlock {
  expression?: string
  expressionValue?: string
}

export interface ConditionalExecutionNodeRunInfo extends NodeRunInfo {
  expressions?: ExpressionBlock[]
}

export type StatusType = 'SUCCESS' | 'FAILURE' | 'ERROR'

export type CreateUpdateInputSetsReturnType = Promise<{
  status?: StatusType
  nextCallback: () => void
}>

export interface InputSetType {
  name: string
  tags?: { [key: string]: string }
  identifier: string
  description: string
  orgIdentifier: string
  projectIdentifier: string
  pipeline: PipelineInfoConfig
  gitDetails: EntityGitDetails
  connectorRef?: string
  entityValidityDetails: EntityValidityDetails
  outdated?: boolean
  storeType?: StoreType.INLINE | StoreType.REMOTE
}

export interface InputSetDTO extends Omit<InputSetResponse, 'identifier' | 'pipeline'> {
  pipeline?: PipelineInfoConfig
  identifier?: string
  repo?: string
  branch?: string
  provider?: ProviderInterface
}

export interface SaveInputSetDTO {
  inputSet: InputSetDTO
}

export interface Pipeline {
  pipeline: PipelineInfoConfig
}

export interface InputSet {
  inputSet: InputSetDTO
}

export interface ECSRollingDeployStepElementConfig extends StepElementConfig {
  spec: {
    sameAsAlreadyRunningInstances: boolean | string
    forceNewDeployment: boolean | string
  }
}

export type TemplateIcons = { [K: string]: string | undefined | TemplateIcons }

export type TriggerTypeIconAndExecutionText = {
  iconName: IconName
  getText: (startTs?: number, triggeredBy?: string) => string
}

export interface CloudFunctionExecutionStepInitialValues extends StepElementConfig {
  spec: {
    updateFieldMask: string
  }
}

export interface CloudFunctionTrafficShiftExecutionStepInitialValues extends StepElementConfig {
  spec: {
    trafficPercent: number
  }
}

export interface AwsSamDeployStepInitialValues extends StepElementConfig {
  spec: {
    connectorRef: string
    image?: string
    samVersion?: string
    deployCommandOptions?: string | string[]
    stackName?: string
    privileged?: boolean
    imagePullPolicy?: string
    runAsUser?: string
    envVariables?: { [key: string]: string }
    resources?: {
      limits?: {
        memory?: string
        cpu?: string
      }
    }
  }
}

export interface AwsSamBuildStepInitialValues extends StepElementConfig {
  spec: {
    connectorRef: string
    samBuildDockerRegistryConnectorRef?: string
    image?: string
    samVersion?: string
    buildCommandOptions?: string | string[]
    privileged?: boolean
    imagePullPolicy?: string
    runAsUser?: string
    envVariables?: { [key: string]: string }
    resources?: {
      limits?: {
        memory?: string
        cpu?: string
      }
    }
  }
}

export interface AwsCDKDiffStepInitialValues extends StepElementConfig {
  spec: {
    connectorRef: string
    image?: string
    commandOptions?: string | string[]
    stackNames?: string | string[]
    privileged?: boolean
    imagePullPolicy?: string
    runAsUser?: string
    envVariables?: { [key: string]: string }
    appPath?: string
    resources?: {
      limits?: {
        memory?: string
        cpu?: string
      }
    }
  }
}

export interface AwsCDKRollBackStepInitialValues extends StepElementConfig {
  spec: {
    provisionerIdentifier: string
    envVariables?: { [key: string]: string }
  }
}

export interface AwsCDKBootstrapStepInitialValues extends StepElementConfig {
  spec: {
    connectorRef: string
    image?: string
    commandOptions?: string | string[]
    privileged?: boolean
    imagePullPolicy?: string
    runAsUser?: string
    appPath?: string
    envVariables?: { [key: string]: string }
    resources?: {
      limits?: {
        memory?: string
        cpu?: string
      }
    }
  }
}

export interface AwsCDKDeployStepInitialValues extends StepElementConfig {
  spec: {
    connectorRef: string
    image?: string
    commandOptions?: string | string[]
    stackNames?: string | string[]
    privileged?: boolean
    imagePullPolicy?: string
    runAsUser?: string
    envVariables?: { [key: string]: string }
    parameters?: { [key: string]: string }
    provisionerIdentifier?: string
    appPath?: string
    resources?: {
      limits?: {
        memory?: string
        cpu?: string
      }
    }
  }
}

export interface ServerlessAwsLambdaPrepareRollbackV2StepInitialValues extends StepElementConfig {
  spec: {
    connectorRef: string
    image?: string
    serverlessVersion?: string
    privileged?: boolean
    imagePullPolicy?: string
    runAsUser?: string
    resources?: {
      limits?: {
        memory?: string
        cpu?: string
      }
    }
    envVariables?: { [key: string]: string }
  }
}

export interface ServerlessAwsLambdaPackageV2StepInitialValues extends StepElementConfig {
  spec: {
    connectorRef: string
    image?: string
    privileged?: boolean
    imagePullPolicy?: string
    resources?: {
      limits?: {
        memory?: string
        cpu?: string
      }
    }
    packageCommandOptions?: string | string[]
    serverlessVersion?: string
    runAsUser?: string
    envVariables?: { [key: string]: string }
  }
}

export interface ServerlessAwsLambdaDeployV2StepInitialValues extends StepElementConfig {
  spec: {
    connectorRef: string
    image?: string
    privileged?: boolean
    imagePullPolicy?: string
    resources?: {
      limits?: {
        memory?: string
        cpu?: string
      }
    }
    deployCommandOptions?: string | string[]
    serverlessVersion?: string
    runAsUser?: string
    envVariables?: { [key: string]: string }
  }
}

export interface ServerlessAwsLambdaRollbackV2StepInitialValues extends StepElementConfig {
  spec: {
    connectorRef: string
    image?: string
    privileged?: boolean
    imagePullPolicy?: string
    resources?: {
      limits?: {
        memory?: string
        cpu?: string
      }
    }
    serverlessVersion?: string
    runAsUser?: string
    envVariables?: { [key: string]: string }
  }
}

export interface ECSServiceSetupStepElementConfig extends StepElementConfig {
  spec: {
    resizeStrategy?: 'RESIZE_NEW_FIRST' | 'DOWNSIZE_OLD_FIRST'
    sameAsAlreadyRunningInstances?: boolean | string
  }
}

export enum InstanceUnit {
  Count = 'Count',
  Percentage = 'Percentage'
}

export interface ECSUpgradeContainerStepElementConfig extends StepElementConfig {
  spec: {
    newServiceInstanceCount: number | string
    newServiceInstanceUnit: InstanceUnit.Percentage | InstanceUnit.Count
    downsizeOldServiceInstanceCount?: number | string
    downsizeOldServiceInstanceUnit?: InstanceUnit.Percentage | InstanceUnit.Count
  }
}
