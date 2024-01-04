/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import type * as monaco from 'monaco-editor'
import type { GetYamlSchemaQueryParams } from 'services/cd-ng'
import type { PluginMetadataResponse } from 'services/ci'
import type { Status } from '@common/utils/Constants'

export interface YamlBuilderHandlerBinding {
  getLatestYaml: () => string
  setLatestYaml?: (json: Record<string, any>) => void
  getYAMLValidationErrorMap: () => Map<number, string>
  addUpdatePluginIntoExistingYAML?: (pluginMetadata: PluginAddUpdateMetadata, isPluginUpdate: boolean) => void
  getCursorPath?: () => Promise<{ path: string[] }>
}

export type InvocationMapFunction = (
  matchingPath: string,
  currentYaml: string,
  params: Record<string, unknown>
) => Promise<CompletionItemInterface[]>

export interface YamlSanityConfig {
  removeEmptyString?: boolean
  removeEmptyArray?: boolean
  removeEmptyObject?: boolean
  removeNull?: boolean
}

export interface CodeLensCommand {
  title: string
  onClick: (arg: { path: string[]; range: monaco.IRange }, ...args: unknown[]) => void
  args?: unknown[]
}

export interface CodeLensConfig
  extends Partial<Pick<monaco.languages.DocumentSymbol, 'name' | 'containerName' | 'kind'>> {
  commands: CodeLensCommand[]
}

export interface YamlBuilderProps {
  /* Only YAMLBuilder related props */
  height?: React.CSSProperties['height']
  width?: React.CSSProperties['width']
  fileName: string
  existingJSON?: Record<string, any>
  existingYaml?: string
  entityType?: GetYamlSchemaQueryParams['entityType']
  bind?: (dynamicPopoverHandler?: YamlBuilderHandlerBinding) => void
  invocationMap?: Map<RegExp, InvocationMapFunction>
  isReadOnlyMode?: boolean
  isEditModeSupported?: boolean
  isHarnessManaged?: boolean
  hideErrorMesageOnReadOnlyMode?: boolean
  onExpressionTrigger?: (yamlPath: string, currentExpression: string) => Promise<CompletionItemInterface[]>
  schema?: Record<string, string | any>
  onEnableEditMode?: (didConfirm?: boolean) => void
  theme?: Theme
  yamlSanityConfig?: YamlSanityConfig
  /* Snippet section related props */
  onChange?: (isEditorDirty: boolean, updatedYaml: string) => void
  onErrorCallback?: (error: Record<string, any>) => void
  renderCustomHeader?: () => React.ReactElement | null
  openDialogProp?: () => void
  showCopyIcon?: boolean
  comparableYaml?: string //this is the actual Yaml that we enter at studio level and is used in Yaml builder to get the value of a field by comparing the Yaml with the given regex/yamlPath
  displayBorder?: boolean
  shouldShowPluginsPanel?: boolean
  onEditorResize?: (isExpanded: boolean) => void
  customCss?: React.HTMLAttributes<HTMLDivElement>['className']
  setPlugin?: (plugin: Record<string, any>) => void
  setPluginOpnStatus?: (status: Status) => void
  /* onValidate gets called every time errors in the editor change */
  onValidate?: (errorMap?: Map<number, string>) => void
  codeLensConfigs?: CodeLensConfig[]
  /* Used for decorating the code in `selectedPath` */
  selectedPath?: string[]
  shouldValidate?: boolean
}

// `range` in `monaco.languages.CompletionItem` is not optional in the latest version,
// but existing functions don't return `range` for completion items (suggestions), so making it optional here
export type CompletionItemInterface = Optional<monaco.languages.CompletionItem, 'range'>

interface SchemaInterace {
  fileMatch: string[]
  schema: string
}
export interface LanguageSettingInterface {
  validate: boolean
  enableSchemaRequest?: boolean
  hover: boolean
  completion: boolean
  schemas: SchemaInterace[]
}

export type Theme = 'LIGHT' | 'DARK'

export interface SnippetFetchResponse {
  snippet: string
  error?: any
  loading: boolean
}

export enum PluginType {
  Script = 'script',
  Plugin = 'plugin',
  Bitrise = 'bitrise',
  Action = 'action'
}

export interface PluginAddUpdateMetadata {
  pluginType: PluginType
  pluginData: Record<string, any>
  pluginName: PluginMetadataResponse['name']
  pluginUses?: PluginMetadataResponse['uses']
  pluginImage?: PluginMetadataResponse['image']
  shouldInsertYAML: boolean
}
