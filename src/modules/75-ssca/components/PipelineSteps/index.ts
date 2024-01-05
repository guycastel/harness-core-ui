/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import factory from '@pipeline/components/PipelineSteps/PipelineStepFactory'
import { PolicyEnforcementCdStep } from './PolicyEnforcement/PolicyEnforcementCdStep'
import { SBOMOrchestrationCdStep } from './SBOMOrchestration/SBOMOrchestrationCdStep'
import { SLSAVerificationStep } from './SLSAVerification/SLSAVerificationStep'
import { PolicyEnforcement } from './PolicyEnforcement/PolicyEnforcementStep'
import { SBOMOrchestrationStep } from './SBOMOrchestration/SBOMOrchestrationStep'

factory.registerStep(new SLSAVerificationStep())
factory.registerStep(new SBOMOrchestrationStep())
factory.registerStep(new PolicyEnforcement())

//TODO: to be removed after no customer usage
factory.registerStep(new SBOMOrchestrationCdStep())
factory.registerStep(new PolicyEnforcementCdStep())
