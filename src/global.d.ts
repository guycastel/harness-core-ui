/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-duplicate-imports */
declare const __DEV__: boolean
declare const Bugsnag: any
declare const __BUGSNAG_RELEASE_VERSION__: string
declare const DEV_FF: Record<string, boolean>
declare const Canny: any
declare module '*.png' {
  const value: string
  export default value
}
declare module '*.jpg' {
  const value: string
  export default value
}
declare module '*.svg' {
  const value: string
  export default value
}

declare module '*.gif' {
  const value: string
  export default value
}

declare module '*.mp4' {
  const value: string
  export default value
}
declare module '*.yaml' {
  const value: Record<string, any>
  export default value
}

declare module '*.yml' {
  const value: Record<string, any>
  export default value
}

declare module '*.gql' {
  const query: string
  export default query
}

declare interface Window {
  apiUrl: string
  segmentToken?: string
  HARNESS_ENABLE_NG_AUTH_UI: boolean
  HARNESS_ENABLE_CDN: boolean
  HARNESS_PLG_FF_SDK_KEY: string
  bugsnagClient: any
  bugsnagToken: string
  cannyAppId: string
  Harness: {
    openNgTooltipEditor: () => void
    openTooltipEditor: () => void
  }
  getApiBaseUrl: (str: string) => string
  MktoForms2: any
  TOUR_GUIDE_USER_ID: string
  deploymentType: 'SAAS' | 'ON_PREM' | 'COMMUNITY'
  resourceBasePath: string
  refinerProjectToken: string
  refinerFeedbackToken: string
  hj: any
  helpPanelAccessToken: string
  helpPanelSpace: string
  helpPanelEnvironment: 'QA' | 'master'
  newNavContentfulAccessToken: string
  newNavContetfulSpace: string
  newNavContentfulEnvironment: 'master'
  stripeApiKey: string
  featureFlagsConfig: {
    useLegacyFeatureFlags: boolean
    baseUrl: string
    eventUrl: string
    enableStream: boolean
    sdkKey: string
    async: boolean
    cache: boolean
  }
  noAuthHeader: boolean
  YT?: any
  onYouTubeIframeAPIReady?: () => void
  getIP?: (ipJson: { ip: string }) => void
  currentIP?: string | undefined
  publicAccessOnAccount?: boolean
  releaseNotesLink: string
  sscaPathPrefix?: string
  Canny: any
}

declare interface WindowEventMap {
  PROMISE_API_RESPONSE: CustomEvent
  USE_CACHE_UPDATED: CustomEvent
}

declare interface Document {
  msHidden: string
  webkitHidden: string
  // these types are present in later versions on TS
  fonts: {
    check(opt: string): boolean
    ready: Promise<void>
  }
}

declare module 'refiner-js'

declare module 'monaco-editor/esm/vs/editor/common/services/languageFeatures.js' {
  export const ILanguageFeaturesService: { documentSymbolProvider: unknown }
}

declare module 'monaco-editor/esm/vs/editor/contrib/documentSymbols/browser/outlineModel.js' {
  import type { editor, languages } from 'monaco-editor'

  export abstract class OutlineModel {
    static create(registry: unknown, model: editor.ITextModel): Promise<OutlineModel>

    asListOfDocumentSymbols(): languages.DocumentSymbol[]
  }
}

declare module 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices.js' {
  export const StandaloneServices: {
    get: (id: unknown) => { documentSymbolProvider: unknown }
  }
}

declare module 'gitopsui/MicroFrontendApp' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}
declare module 'gitopsui/CreateGitOpsAgent' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}
declare module 'gitopsui/VerifyGitopsAgent' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}
declare module 'chaos/MicroFrontendApp' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'chaos/SelectPipelineExperiment' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'idp/MicroFrontendApp' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}
declare module 'idpadmin/MicroFrontendApp' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}
declare module 'chaos/ExperimentPreview' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'chaos/ChaosStepExecution' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'chaos/ResilienceViewContent' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'chaos/ResilienceViewCTA' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'ffui/MicroFrontendApp' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'sei/MicroFrontendApp' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'sei/CollectionResourceModalBody' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'sei/CollectionResourcesRenderer' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'sei/InsightsResourceModalBody' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'sei/InsightsResourceRenderer' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'errortracking/App' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'sto/App' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}
declare module 'stoV2/App' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'ccmui/MicroFrontendApp' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'cdbui/MicroFrontendApp' {
  import type { ChildAppComponent } from './microfrontends'
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'ciui/MicroFrontendApp' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'tiui/MicroFrontendApp' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}
declare module 'srmui/MicroFrontendApp' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'sto/PipelineSecurityView' {
  import type { PipelineSecurityViewProps } from '@pipeline/interfaces/STOApp'
  const ChildApp: React.ComponentType<PipelineSecurityViewProps>
  export default ChildApp
}
declare module 'stoV2/PipelineSecurityView' {
  const ChildApp: React.ComponentType<PipelineSecurityViewProps>
  export default ChildApp
}

declare module 'iacm/MicroFrontendApp' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'iacm/IACMStage' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'iacm/IACMStageInputSet' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'iacm/IACMPipelineResources' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}
declare module 'iacm/IACMApproval' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}
declare module 'iacm/IACMApprovalConsoleView' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'ssca/MicroFrontendApp' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'ssca/DriftDrawer' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'ssca/SBOMScoreSummary' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'governance/App' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'governance/EvaluationModal' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'governance/PipelineGovernanceView' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'governance/EvaluationView' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'governance/PolicySetWizard' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'governance/PolicyResourceModalBody' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'governance/PolicyResourceRenderer' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'governance/PolicySetsResourceModalBody' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare module 'governance/PolicySetResourceRenderer' {
  const ChildApp: ChildAppComponent
  export default ChildApp
}

declare type Optional<T, K extends keyof T = keyof T> = Omit<T, K> & Partial<Pick<T, K>>

declare type RequiredPick<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

declare type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
}

declare type ValueOf<T> = T[keyof T]
