/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type { FormikProps } from 'formik'
import { VisualYamlSelectedView as SelectedView } from '@harness/uicore'
import { GitContextProps } from '@common/components/GitContextForm/GitContextForm'
import { StoreMetadata } from '@common/constants/GitSyncTypes'
import { InputSetOnCreateUpdate } from '@pipeline/utils/inputSetUtils'
import type {
  PipelineInfoConfig,
  ResponsePMSPipelineResponseDTO,
  EntityGitDetails,
  ResponseInputSetTemplateWithReplacedExpressionsResponse
} from 'services/pipeline-ng'
import type { YamlBuilderHandlerBinding } from '@common/interfaces/YAMLBuilderProps'
import type { InputSetDTO, InputSetType } from '@pipeline/utils/types'

export type InputSetDTOGitDetails = InputSetDTO & GitContextProps & StoreMetadata

export interface InputSetFormProps<T = unknown> extends InputSetOnCreateUpdate<T> {
  executionView?: boolean

  // Props to support embedding InputSetForm (create new) in a modal (NewInputSetModal)
  inputSetInitialValue?: InputSetDTO
}

export interface FormikInputSetFormProps {
  inputSet: InputSetDTO | InputSetType
  template: ResponseInputSetTemplateWithReplacedExpressionsResponse | null
  pipeline: ResponsePMSPipelineResponseDTO | null
  resolvedPipeline?: PipelineInfoConfig
  handleSubmit: (
    inputSetObjWithGitInfo: InputSetDTO,
    gitDetails?: EntityGitDetails,
    storeMetadata?: StoreMetadata
  ) => Promise<void>
  formErrors: Record<string, unknown>
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  formikRef: React.MutableRefObject<FormikProps<InputSetDTOGitDetails> | undefined>
  selectedView: SelectedView
  executionView?: boolean
  isEdit: boolean
  isGitSyncEnabled?: boolean
  supportingGitSimplification?: boolean
  yamlHandler?: YamlBuilderHandlerBinding
  setYamlHandler: React.Dispatch<React.SetStateAction<YamlBuilderHandlerBinding | undefined>>
  className?: string
  onCancel?: () => void
  filePath?: string
  handleFormDirty: (dirty: boolean) => void
  setIsSaveEnabled: (enabled: boolean) => void
}
