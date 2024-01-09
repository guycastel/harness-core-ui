/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import type { VariableMergeServiceResponse } from 'services/pipeline-ng'
import { VariablesListTable } from '@pipeline/components/VariablesListTable/VariablesListTable'
import { flatObject } from '@ci/components/PipelineSteps/StepsFlatObject'
import type { OsvScannerStepData } from './OsvScannerStep'

export interface OsvScannerStepVariablesProps {
  initialValues: OsvScannerStepData
  stageIdentifier: string
  onUpdate?(data: OsvScannerStepData): void
  metadataMap: Required<VariableMergeServiceResponse>['metadataMap']
  variablesData: OsvScannerStepData
}

export const OsvScannerStepVariables: React.FC<OsvScannerStepVariablesProps> = ({
  variablesData,
  metadataMap,
  initialValues
}) => <VariablesListTable data={flatObject(variablesData)} originalData={initialValues} metadataMap={metadataMap} />
