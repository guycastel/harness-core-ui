/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { clone } from 'lodash-es'
import { DefaultNewPipelineId } from '@templates-library/components/TemplateStudio/PipelineTemplateCanvas/PipelineTemplateCanvasWrapper'
import type { PipelineInfoConfig } from 'services/pipeline-ng'
import type { EnvironmentRequestDTO } from 'services/cd-ng'
import type { Servicev1Application, V1Agent } from 'services/gitops'
import {
  newServiceState as initialServiceState,
  newEnvironmentState as initialEnvironmentState,
  newRepositoryData as initialRepositoryData,
  ServiceDataType,
  InfrastructureDataType,
  newDelegateState,
  DelegateDataType,
  RepositoryInterface,
  intialClusterData,
  ClusterInterface,
  initialApplicationData
} from './CDOnboardingUtils'

export const DefaultPipeline: PipelineInfoConfig = {
  name: '',
  identifier: DefaultNewPipelineId
}

export interface CDOnboardingReducerState {
  pipeline?: PipelineInfoConfig
  service?: ServiceDataType
  environment?: EnvironmentRequestDTO
  infrastructure?: InfrastructureDataType
  repository?: RepositoryInterface
  agent?: V1Agent
  application?: Servicev1Application
  cluster?: ClusterInterface
  delegate?: DelegateDataType
  error?: string
  schemaErrors?: boolean
  isLoading?: boolean
  isInitialized?: boolean
  isUpdated?: boolean
}

export enum CDOnboardingActions {
  Initialize = 'Initialize',
  Fetching = 'Fetching',
  UpdatePipeline = 'UpdatePipeline',
  UpdateRepository = 'UpdateRepository',
  UpdateApplication = 'UpdateApplication',
  UpdateAgent = 'UpdateAgent',
  UpdateCluster = 'UpdateCluster',
  UpdateService = 'UpdateService',
  UpdateEnvironment = 'UpdateEnvironment',
  UpdateInfrastructure = 'UpdateInfrastructure',
  UpdateDelegate = 'UpdateDelegate',
  Success = 'Success',
  Error = 'Error'
}

export interface ActionResponse {
  error?: string
  schemaErrors?: boolean
  isUpdated?: boolean
  pipeline?: PipelineInfoConfig
  service?: ServiceDataType
  repository?: RepositoryInterface
  application?: Servicev1Application
  cluster?: ClusterInterface
  agent?: V1Agent
  environment?: EnvironmentRequestDTO
  infrastructure?: InfrastructureDataType
  delegate?: DelegateDataType
}

export interface ActionReturnType {
  type: CDOnboardingActions
  response?: ActionResponse
}

const initialized = (): ActionReturnType => ({ type: CDOnboardingActions.Initialize })
const updatePipeline = (): ActionReturnType => ({ type: CDOnboardingActions.UpdatePipeline })
const updateService = (response: ActionResponse): ActionReturnType => ({
  type: CDOnboardingActions.UpdateService,
  response
})
const updateEnvironment = (response: ActionResponse): ActionReturnType => ({
  type: CDOnboardingActions.UpdateEnvironment,
  response
})
const updateInfrastructure = (response: ActionResponse): ActionReturnType => ({
  type: CDOnboardingActions.UpdateInfrastructure,
  response
})

const updateDelegate = (response: ActionResponse): ActionReturnType => ({
  type: CDOnboardingActions.UpdateDelegate,
  response
})

const UpdateRepository = (response: ActionResponse): ActionReturnType => ({
  type: CDOnboardingActions.UpdateRepository,
  response
})

const UpdateCluster = (response: ActionResponse): ActionReturnType => ({
  type: CDOnboardingActions.UpdateCluster,
  response
})

const updateApplication = (response: ActionResponse): ActionReturnType => ({
  type: CDOnboardingActions.UpdateApplication,
  response
})

const updateAgent = (response: ActionResponse): ActionReturnType => ({
  type: CDOnboardingActions.UpdateAgent,
  response
})

const fetching = (): ActionReturnType => ({ type: CDOnboardingActions.Fetching })
const success = (response: ActionResponse): ActionReturnType => ({ type: CDOnboardingActions.Success, response })
const error = (response: ActionResponse): ActionReturnType => ({ type: CDOnboardingActions.Error, response })

export const CDOnboardingContextActions = {
  initialized,
  updatePipeline,
  updateService,
  updateEnvironment,
  updateInfrastructure,
  updateApplication,
  updateAgent,
  updateDelegate,
  UpdateRepository,
  UpdateCluster,
  fetching,
  success,
  error
}

export const initialState: CDOnboardingReducerState = {
  pipeline: { ...DefaultPipeline },
  service: initialServiceState,
  repository: initialRepositoryData,
  agent: {},
  cluster: intialClusterData,
  application: initialApplicationData,
  environment: initialEnvironmentState.environment,
  infrastructure: initialEnvironmentState.infrastructure,
  delegate: newDelegateState.delegate,
  schemaErrors: false,
  isLoading: false,
  isUpdated: false,
  isInitialized: false
}

export const CDOnboardingReducer = (state = initialState, data: ActionReturnType): CDOnboardingReducerState => {
  const { type, response } = data

  switch (type) {
    case CDOnboardingActions.Initialize:
      return {
        ...state,
        isInitialized: true
      }
    case CDOnboardingActions.UpdatePipeline:
      return {
        ...state,
        isUpdated: response?.isUpdated ?? true,
        pipeline: response?.pipeline ? clone(response?.pipeline) : state.pipeline
      }
    case CDOnboardingActions.UpdateRepository:
      return {
        ...state,
        isUpdated: response?.isUpdated ?? true,
        repository: response?.repository ? clone(response?.repository) : state.repository
      }
    case CDOnboardingActions.UpdateCluster:
      return {
        ...state,
        isUpdated: response?.isUpdated ?? true,
        cluster: response?.cluster ? clone(response?.cluster) : state.cluster
      }
    case CDOnboardingActions.UpdateService:
      return {
        ...state,
        isUpdated: response?.isUpdated ?? true,
        service: response?.service ? clone(response?.service) : state.service
      }
    case CDOnboardingActions.UpdateEnvironment:
      return {
        ...state,
        environment: response?.environment ? clone(response?.environment) : state.environment
      }
    case CDOnboardingActions.UpdateInfrastructure:
      return {
        ...state,
        infrastructure: response?.infrastructure ? clone(response?.infrastructure) : state.infrastructure
      }

    case CDOnboardingActions.UpdateDelegate:
      return {
        ...state,
        delegate: response?.delegate ? clone(response?.delegate) : state.delegate
      }
    case CDOnboardingActions.UpdateApplication:
      return {
        ...state,
        application: response?.application ? clone(response?.application) : state.application
      }
    case CDOnboardingActions.UpdateAgent:
      return {
        ...state,
        agent: response?.agent ? clone(response?.agent) : state.agent
      }
    case CDOnboardingActions.Fetching:
      return {
        ...state,
        isLoading: true,
        isUpdated: false
      }
    case CDOnboardingActions.Success:
    case CDOnboardingActions.Error:
      return { ...state, isLoading: false, ...response }
    default:
      return state
  }
}
