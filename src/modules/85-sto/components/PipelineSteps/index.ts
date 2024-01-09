/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import factory from '@pipeline/components/PipelineSteps/PipelineStepFactory'
import { ZeroNorthStep } from './ZeroNorthStep/ZeroNorthStep'
import { AquatrivyStep } from './AquatrivyStep/AquatrivyStep'
import { BanditStep } from './BanditStep/BanditStep'
import { BlackduckStep } from './Blackduck/BlackduckStep'
import { GrypeStep } from './GrypeStep/GrypeStep'
import { GitleaksStep } from './GitleaksStep/GitleaksStep'
import { SnykStep } from './SnykStep/SnykStep'
import { SysdigStep } from './SysdigStep/SysdigStep'
import { SonarqubeStep } from './SonarqubeStep/SonarqubeStep'
import { ZapStep } from './ZapStep/ZapStep'
import { PrismaCloudStep } from './PrismaCloudStep/PrismaCloudStep'
import { CheckmarxStep } from './CheckmarxStep/CheckmarxStep'
import { MendStep } from './MendStep/MendStep'
import { CodeqlStep } from './CodeqlStep/CodeqlStep'
import { CustomIngestionStep } from './CustomIngestionStep/CustomIngestionStep'
import { AWSSecurityHubStep } from './AWSSecurityHubStep/AWSSecurityHubStep'
import { AWSECRStep } from './AWSECRStep/AWSECRStep'
import { NiktoStep } from './NiktoStep/NiktoStep'
import { NmapStep } from './NmapStep/NmapStep'
import { OWASPStep } from './OWASPStep/OWASPStep'
import { ProwlerStep } from './ProwlerStep/ProwlerStep'
import { MetasploitStep } from './MetasploitStep/MetasploitStep'
import { BrakemanStep } from './BrakemanStep/BrakemanStep'
import { BurpStep } from './BurpStep/BurpStep'
import { FossaStep } from './FossaStep/FossaStep'
import { SemgrepStep } from './SemgrepStep/SemgrepStep'
import { CoverityStep } from './CoverityStep/CoverityStep'
import { AnchoreStep } from './AnchoreStep/AnchoreStep'
import { AquaSecurityStep } from './AquaSecurityStep/AquaSecurityStep'
import { OsvScannerStep } from './OsvScannerStep/OsvScannerStep'

factory.registerStep(new ZeroNorthStep())
factory.registerStep(new AquatrivyStep())
factory.registerStep(new BlackduckStep())
factory.registerStep(new BanditStep())
factory.registerStep(new BurpStep())
factory.registerStep(new GrypeStep())
factory.registerStep(new GitleaksStep())
factory.registerStep(new SnykStep())
factory.registerStep(new SysdigStep())
factory.registerStep(new SonarqubeStep())
factory.registerStep(new ZapStep())
factory.registerStep(new PrismaCloudStep())
factory.registerStep(new CheckmarxStep())
factory.registerStep(new MendStep())
factory.registerStep(new FossaStep())
factory.registerStep(new SemgrepStep())
factory.registerStep(new CodeqlStep())
factory.registerStep(new CustomIngestionStep())
factory.registerStep(new AWSSecurityHubStep())
factory.registerStep(new AWSECRStep())
factory.registerStep(new NiktoStep())
factory.registerStep(new NmapStep())
factory.registerStep(new OWASPStep())
factory.registerStep(new ProwlerStep())
factory.registerStep(new MetasploitStep())
factory.registerStep(new BrakemanStep())
factory.registerStep(new CoverityStep())
factory.registerStep(new AnchoreStep())
factory.registerStep(new AquaSecurityStep())
factory.registerStep(new OsvScannerStep())
