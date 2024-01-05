/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
/* istanbul ignore file */

import { SelectOption } from '@harness/uicore'
import { RadioButtonProps } from '@harness/uicore/dist/components/RadioButton/RadioButton'
import { StringKeys } from 'framework/strings'
import { SbomOrchestrationTool, SyftSbomOrchestration } from 'services/ci'

export type GetSelectOptions = (getString: (key: StringKeys) => string) => SelectOption[]
export type GetRadioGroupOptions = (getString: (key: StringKeys) => string) => RadioButtonProps[]
export const TypedOptions = <T extends string>(input: T[]): { label: string; value: string }[] => {
  return input.map(item => ({ label: item, value: item }))
}

export const getSbomSourcingModes: GetRadioGroupOptions = getString => {
  return [
    { label: getString('ssca.generation'), value: 'generation' },
    { label: getString('ssca.ingestion'), value: 'ingestion' }
  ]
}

export const sbomGenerationTools = TypedOptions<SbomOrchestrationTool['type']>(['Syft'])

export const sbomFormats: { label: string; value: SyftSbomOrchestration['format'] }[] = [
  { label: 'SPDX', value: 'spdx-json' },
  { label: 'CycloneDX', value: 'cyclonedx-json' }
]

export const getArtifactTypes = (
  getString: (key: StringKeys) => string,
  repoArtifactEnabled = false
): RadioButtonProps[] => {
  return [
    { label: getString('ssca.container'), value: 'image' },
    { label: getString('repository'), value: 'repository', disabled: !repoArtifactEnabled }
  ]
}

export const getGitVariants: GetRadioGroupOptions = getString => {
  return [
    { label: getString('gitBranch'), value: 'git-branch' },
    { label: getString('gitTag'), value: 'git-tag' },
    { label: getString('common.git.gitSHACommit'), value: 'commit' }
  ]
}

export const getSbomDriftModes: GetRadioGroupOptions = getString => {
  return [
    { label: getString('ssca.orchestrationStep.detectDriftFrom.lastExecution'), value: 'last_generated_sbom' },
    { label: getString('ssca.orchestrationStep.detectDriftFrom.baseline'), value: 'baseline' }
  ]
}
