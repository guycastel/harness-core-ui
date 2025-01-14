import type { IconName } from '@harness/icons'
import type { DelegateCommonProblemTypes } from '@delegates/constants'
import type { StringsMap } from 'stringTypes'
import { Servicev1HealthStatus, V1Agent } from 'services/gitops'
export interface EntityType {
  id: string
  label: string
  icon?: IconName
  className?: string
}
export interface DeploymentStrategyTypes extends EntityType {
  subtitle?: keyof StringsMap
  steps?: { title: string; description: keyof StringsMap }[]
  pipelineCommand: keyof StringsMap
  pipelineName?: string
}
export interface EntityMap {
  [key: string]: EntityType
}
export interface DeploymentFlowType extends EntityType {
  subtitle: string
}

export enum CDOnboardingSteps {
  WHAT_TO_DEPLOY = 'whatToDeploy',
  HOW_N_WHERE_TO_DEPLOY = 'howNwhere',
  DEPLOYMENT_STEPS = 'deploymentSteps',
  REVIEW_AND_RUN_PIPELINE = 'reviewAndRunPipeline'
}
export interface WhatToDeployType {
  svcType?: EntityType
  artifactType?: EntityType
  artifactSubType?: EntityType
}
export type DelegateStatus = 'PENDING' | 'TRYING' | 'SUCCESS' | 'FAILED'
export interface WhereAndHowToDeployType {
  type?: DeploymentFlowType
  delegateName?: string
  delegateType?: DelegateCommonProblemTypes
  delegateProblemType?: string
  isDelegateVerified?: boolean
  installDelegateTried?: boolean
  delegateStatus: DelegateStatus
  agentInfo?: V1Agent
  installAgentTried?: boolean
  agentStatus?: Servicev1HealthStatus
}

export interface PipelineSetupState {
  apiKey: string
  githubUsername?: string
  githubPat?: string
  strategyId?: string
  pipelineVerified?: boolean
  gitopsEntitiesVerified?: boolean
  infraInfo?: {
    svcKeyOrSecretKey?: string
    region?: string
    projectName?: string
    awsArn?: string
    bucketName?: string
    functionPath?: string
    accessKey?: string
    username?: string
    password?: string
    port?: string
    hostIP?: string
    privateKeyFile?: string
    domain?: string
    instanceName?: string
  }
}

export interface ApiKeySetupProps {
  onKeyGenerate: (data: PipelineSetupState) => void
}

export enum CLOUD_FUNCTION_TYPES {
  GCPGen1 = 'GCPGen1',
  GCPGen2 = 'GCPGen2',
  ServerLessLambda = 'ServerLessLambda',
  NativeAWSLambda = 'NativeAWSLambda'
}

export enum SERVERLESS_FUNCTIONS {
  AWS_LAMBDA_FUNCTION = 'AwsLambdaFunction',
  GOOGLE_CLOUD_FUNCTION = 'GCPFunction'
}
