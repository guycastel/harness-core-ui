/* eslint-disable @typescript-eslint/no-explicit-any */
import { AllowedTypes } from '@harness/uicore'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import type { Types } from '@pipeline/components/PipelineSteps/Steps/StepsTransformValuesUtils'
import {
  Attestation,
  ContainerStepInfra,
  CosignAttestation,
  CosignVerifyAttestation,
  HarnessStore,
  ImageSbomSource,
  PolicyStore,
  SbomOrchestrationTool,
  SbomSource,
  SyftSbomOrchestration,
  VerifyAttestation
} from 'services/pipeline-ng'

export interface SBOMOrchestrationCdStepData extends SscaCommonStepData {
  spec: CommonSscaOrchestrationStepSpec & CdResourcesSpec
}

export interface SBOMOrchestrationStepData extends SscaCommonStepData {
  spec: CommonSscaOrchestrationStepSpec & CiResourcesSpec
}

export interface PolicyEnforcementCdStepData extends SscaCommonStepData {
  spec: CommonSscaEnforcementStepSpec & CdResourcesSpec
}

export interface PolicyEnforcementStepData extends SscaCommonStepData {
  spec: CommonSscaEnforcementStepSpec & CiResourcesSpec
}

export interface SscaStepProps<T> {
  initialValues: T
  template?: T
  path?: string
  isNewStep?: boolean
  readonly?: boolean
  stepViewType: StepViewType
  onUpdate?: (data: any) => void
  onChange?: (data: any) => void
  allowableTypes: AllowedTypes
  formik?: any
  stepType: StepType
}

export interface SscaCommonStepData {
  name?: string
  identifier: string
  type: string
  timeout?: string
}

export interface CommonSscaOrchestrationStepSpec {
  mode: string
  tool: {
    type: SbomOrchestrationTool['type']
    spec: SyftSbomOrchestration
  }
  source: {
    type: SbomSource['type']
    spec: ImageSbomSource
  }
  attestation: {
    type: Attestation['type']
    spec: CosignAttestation
  }
  sbom_drift?: {
    base?: 'baseline' | 'last_generated_sbom'
  }
}

export interface Field {
  name: string
  type: Types
}

export interface CommonSscaEnforcementStepSpec {
  source: {
    type: SbomSource['type']
    spec: ImageSbomSource
  }
  verifyAttestation: {
    type: VerifyAttestation['type']
    spec: CosignVerifyAttestation
  }
  policy: {
    store?: {
      type: PolicyStore['type']
      spec: HarnessStore
    }
    policySets?: string[] | string
    opa?: boolean
  }
}

export interface CdResourcesSpec {
  infrastructure: {
    type: ContainerStepInfra['type']
    spec: {
      connectorRef: string
      namespace: string
      resources: {
        limits: {
          memory?: string
          cpu?: string
        }
      }
    }
  }
}

export interface CiResourcesSpec {
  resources: {
    limits: {
      memory?: string
      cpu?: string
    }
  }
}
