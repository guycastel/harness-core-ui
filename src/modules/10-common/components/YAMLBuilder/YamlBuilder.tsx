/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react'
import * as monaco from 'monaco-editor'
import { IKeyboardEvent, IDisposable, Position } from 'monaco-editor/esm/vs/editor/editor.api'
import { CompletionItemKind } from 'vscode-languageserver-types'
import {
  debounce,
  isEmpty,
  throttle,
  defaultTo,
  attempt,
  every,
  isEqualWith,
  isNil,
  get,
  set,
  truncate,
  omitBy,
  isUndefined,
  isNull
} from 'lodash-es'
import { useParams } from 'react-router-dom'
import { setDiagnosticsOptions } from 'monaco-yaml'
import { Intent, Popover, PopoverInteractionKind, Position as PopoverPosition } from '@blueprintjs/core'
import cx from 'classnames'
import { scalarOptions, defaultOptions, parse } from 'yaml'
import { Icon, Layout, Tag, Container, useConfirmationDialog } from '@harness/uicore'
import MonacoEditor, { MonacoCodeEditorRef } from '@common/components/MonacoEditor/MonacoEditor'
import { useStrings } from 'framework/strings'
import type { Module } from 'framework/types/ModuleName'
import { useToaster } from '@common/exports'
import type {
  YamlBuilderProps,
  YamlBuilderHandlerBinding,
  CompletionItemInterface,
  Theme
} from '@common/interfaces/YAMLBuilderProps'
import { PluginAddUpdateMetadata, PluginType } from '@common/interfaces/YAMLBuilderProps'
import { getDiagnosticsOptions } from '@common/utils/YamlUtils'
import { sanitize } from '@common/utils/JSONUtils'
import { Status } from '@common/utils/Constants'
import { yamlStringify } from '@common/utils/YamlHelperMethods'
import { countAllKeysInObject } from '@common/utils/utils'
import { useTrackedRef } from '@common/hooks/useTrackedRef'
import {
  getYAMLFromEditor,
  getMetaDataForKeyboardEventProcessing,
  findPositionsForMatchingKeys,
  getStageYAMLPathForStageIndex,
  getStepYAMLPathForStepInsideAStage,
  getDefaultStageForModule,
  StageMatchRegex,
  getArrayIndexClosestToCurrentCursor,
  getValidStepPositions,
  extractStepsFromStage,
  getClosestStepIndexInCurrentStage,
  getValidationErrorMapFromMarkers,
  useCodeLenses,
  useDecoration,
  getCursorPath
} from './YAMLBuilderUtils'
import {
  DEFAULT_EDITOR_HEIGHT,
  EditorTheme,
  EDITOR_BASE_DARK_THEME,
  EDITOR_BASE_LIGHT_THEME,
  EDITOR_DARK_BG,
  EDITOR_DARK_FG,
  EDITOR_DARK_SELECTION,
  EDITOR_LIGHT_BG,
  EDITOR_WHITESPACE,
  TRIGGER_CHARS_FOR_NEW_EXPR,
  TRIGGER_CHAR_FOR_PARTIAL_EXPR,
  ANGULAR_BRACKET_CHAR,
  KEY_CODE_FOR_SEMI_COLON,
  KEY_CODE_FOR_PERIOD,
  KEY_CODE_FOR_SPACE,
  KEY_CODE_FOR_CHAR_Z,
  CONTROL_EVENT_KEY_CODE,
  META_EVENT_KEY_CODE,
  SHIFT_EVENT_KEY_CODE,
  navigationKeysMap,
  allowedKeysInEditModeMap,
  MAX_ERR_MSSG_LENGTH,
  allowedKeysInReadOnlyModeMap,
  PLUS,
  VAR_REGEX
} from './YAMLBuilderConstants'
import CopyToClipboard from '../CopyToClipBoard/CopyToClipBoard'
import { parseInput } from '../ConfigureOptions/ConfigureOptionsUtils'

import css from './YamlBuilder.module.scss'
import './resizer.scss'

// Please do not remove this, read this https://eemeli.org/yaml/#scalar-options
scalarOptions.str.fold.lineWidth = 100000
defaultOptions.indent = 4

const getTheme = (theme: Theme): monaco.editor.BuiltinTheme =>
  theme === 'DARK' ? EDITOR_BASE_DARK_THEME : EDITOR_BASE_LIGHT_THEME

const setUpEditor = (theme: Theme): void => {
  monaco.editor.defineTheme(getTheme(theme), {
    base: getTheme(theme),
    inherit: theme === 'DARK',
    rules: theme === 'DARK' ? EditorTheme.DARK : EditorTheme.LIGHT,
    colors:
      theme === 'DARK'
        ? {
            'editor.background': `#${EDITOR_DARK_BG}`,
            'editor.foreground': `#${EDITOR_DARK_FG}`,
            'editor.selectionBackground': `#${EDITOR_DARK_SELECTION}`,
            'editor.lineHighlightBackground': `#${EDITOR_DARK_SELECTION}`,
            'editorCursor.foreground': `#${EDITOR_DARK_FG}`,
            'editorWhitespace.foreground': `#${EDITOR_WHITESPACE}`
          }
        : { 'editor.background': `#${EDITOR_LIGHT_BG}` }
  })
}

const ErrorSummary = memo(({ errorMap }: { errorMap?: Map<number, string> }): JSX.Element => {
  const { getString } = useStrings()
  const errors: JSX.Element[] = []

  errorMap?.forEach((value, key) => {
    const error = (
      <li className={css.item} title={value} key={key}>
        {getString('yamlBuilder.lineNumberLabel')}&nbsp;
        {key},&nbsp;
        {truncate(value, { length: MAX_ERR_MSSG_LENGTH })}
      </li>
    )
    errors.push(error)
  })

  return (
    <div className={css.errorSummary}>
      <ol className={css.errorList}>{errors}</ol>
    </div>
  )
})

ErrorSummary.displayName = 'ErrorSummary'

const YAMLBuilder: React.FC<YamlBuilderProps> = (props: YamlBuilderProps): JSX.Element => {
  const {
    height,
    width,
    fileName = '',
    entityType,
    existingJSON,
    existingYaml,
    isReadOnlyMode,
    isEditModeSupported = true,
    isHarnessManaged = false,
    hideErrorMesageOnReadOnlyMode = false,
    invocationMap,
    bind,
    onExpressionTrigger,
    schema,
    onEnableEditMode,
    theme = 'LIGHT',
    yamlSanityConfig,
    onChange,
    onErrorCallback,
    renderCustomHeader,
    openDialogProp,
    showCopyIcon = true,
    comparableYaml,
    displayBorder = true,
    shouldShowPluginsPanel = false,
    onEditorResize,
    customCss,
    setPlugin,
    setPluginOpnStatus,
    onValidate,
    codeLensConfigs,
    selectedPath,
    shouldValidate = true
  } = props
  const comparableYamlJson = parse(defaultTo(comparableYaml, ''))

  setUpEditor(theme)
  const params = useParams()
  const [currentYaml, setCurrentYaml] = useState<string>(defaultTo(existingYaml, ''))
  const currentYamlRef = useRef<string>(defaultTo(existingYaml, ''))
  const [initialSelectionRemoved, setInitialSelectionRemoved] = useState<boolean>(
    !defaultTo(existingYaml, existingJSON)
  )
  const [yamlValidationErrors, setYamlValidationErrors] = useState<Map<number, string>>(new Map())
  const [modelMarkers, setModelMarkers] = useState<monaco.editor.IMarker[]>([])

  const editorRef = useRef<MonacoCodeEditorRef>(null)
  const onValidateRef = useTrackedRef(onValidate)
  const onChangeRef = useTrackedRef(onChange)
  const yamlValidationErrorsRef = useTrackedRef(yamlValidationErrors)
  const editorVersionRef = useRef<number>()
  const currentCursorPosition = useRef<Position>()
  const codeLensRegistrations = useRef<Map<number, IDisposable>>(new Map<number, IDisposable>())
  const readonlyRef = useTrackedRef(isReadOnlyMode)
  const [isEditorExpanded, setIsEditorExpanded] = useState<boolean>(true)
  const { module } = useParams<{
    module: Module
  }>()

  let expressionCompletionDisposer: { dispose: () => void }
  let runTimeCompletionDisposer: { dispose: () => void }
  let allowedValuesCompletionDisposer: { dispose: () => void }

  const { showError } = useToaster()
  const { getString } = useStrings()

  const yamlError = getString('yamlBuilder.yamlError')

  const handler = React.useMemo(
    () =>
      ({
        getLatestYaml: () => currentYamlRef.current,
        setLatestYaml: (json: Record<string, any>) => {
          attempt(verifyIncomingJSON, json)
        },
        getYAMLValidationErrorMap: () => yamlValidationErrorsRef.current,
        addUpdatePluginIntoExistingYAML: (pluginMetadata: PluginAddUpdateMetadata, isPluginUpdate: boolean) =>
          addUpdatePluginIntoExistingYAML(pluginMetadata, isPluginUpdate),
        getCursorPath: async () => {
          if (editorRef.current) {
            const cursorPath = await getCursorPath(editorRef.current)
            return cursorPath
          }
          return { path: [] }
        }
      } as YamlBuilderHandlerBinding),
    [yamlValidationErrorsRef]
  )

  useEffect(() => {
    bind?.(handler)

    return () => {
      bind?.(undefined)
    }
  }, [bind, handler])

  const getEditorCurrentVersion = (): number | undefined => {
    return editorRef.current?.getModel()?.getAlternativeVersionId()
  }

  const verifyIncomingJSON = (jsonObj?: Record<string, any>): void => {
    const sanitizedJSONObj = jsonObj ? sanitize(jsonObj, yamlSanityConfig) : null
    if (sanitizedJSONObj && Object.keys(sanitizedJSONObj).length > 0) {
      const yamlEqOfJSON = yamlStringify(sanitizedJSONObj)
      const sanitizedYAML =
        yamlSanityConfig?.removeNull ?? true ? yamlEqOfJSON.replace(': null\n', ': \n') : yamlEqOfJSON

      setCurrentYaml(sanitizedYAML)
      currentYamlRef.current = sanitizedYAML
    } else {
      setCurrentYaml('')
      currentYamlRef.current = ''
      setYamlValidationErrors(new Map())
    }
  }

  /* #region Bootstrap editor with schema */

  useEffect(() => {
    verifyIncomingJSON(existingJSON)
  }, [JSON.stringify(existingJSON)])

  useEffect(() => {
    if (existingYaml) {
      const sanitizedYAML = existingYaml.replace(': null\n', ': \n')
      setCurrentYaml(sanitizedYAML)
      currentYamlRef.current = sanitizedYAML
    }
  }, [existingYaml])

  useEffect(() => {
    setDiagnosticsOptions({ ...getDiagnosticsOptions(schema), validate: shouldValidate })
  }, [schema, shouldValidate])

  /* #endregion */

  /* #region Handle various interactions with the editor */

  const onYamlChange = useMemo(
    () =>
      debounce((updatedYaml: string): void => {
        setCurrentYaml(updatedYaml)
        currentYamlRef.current = updatedYaml

        onChangeRef.current?.(!(updatedYaml === ''), updatedYaml)
      }, 500),
    [onChangeRef]
  )

  const showNoPermissionError = useMemo(
    () =>
      throttle(() => {
        showError(getString('noPermission'), 5000)
      }, 5000),
    [getString, showError]
  )

  const showHarnessManagedError = useMemo(
    () =>
      throttle(() => {
        showError(getString('common.showHarnessManagedError'), 5000)
      }, 5000),
    [getString, showError]
  )

  const changeMarkersListener = useRef<IDisposable>()

  // updates yamlValidationErrors when markers change and calls onValidate
  const validate = useCallback(() => {
    changeMarkersListener.current = monaco.editor.onDidChangeMarkers(uris => {
      const editorUri = editorRef.current?.getModel()?.uri
      if (!editorUri) return

      const currentEditorHasMarkerChanges = uris.some(uri => uri.path === editorUri.path)
      if (!currentEditorHasMarkerChanges) return

      const markers = monaco.editor.getModelMarkers({
        resource: editorUri
      })
      const errorMap = getValidationErrorMapFromMarkers(markers)

      setModelMarkers(markers)
      setYamlValidationErrors(errorMap)
      onValidateRef.current?.(errorMap)
    })
  }, [onValidateRef])

  useEffect(() => changeMarkersListener.current?.dispose, [])

  // focus editor when it is not readonly
  useEffect(() => {
    if (isReadOnlyMode) return

    editorRef.current?.focus()
  }, [isReadOnlyMode])

  const editorDidMount = (editor: monaco.editor.IStandaloneCodeEditor): void => {
    // editor.addAction({
    //   id: 'Paste',
    //   label: getString('common.paste'),
    //   keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_V],
    //   contextMenuGroupId: '9_cutcopypaste',
    //   run: async (editor: editor.IStandaloneCodeEditor) => {
    //     try {
    //       const response = await navigator?.clipboard?.readText()
    //       const line = editor.getPosition()
    //       editor.executeEdits('', [
    //         {
    //           range: new monaco.Range(line?.lineNumber, line?.column, line?.lineNumber, line?.column),
    //           text: response ?? ''
    //         }
    //       ])
    //     } catch (e) {
    //       showError(e)
    //     }
    //   }
    // })
    editorVersionRef.current = editor.getModel()?.getAlternativeVersionId()
    currentCursorPosition.current = new Position(0, 0)
    editor.onKeyDown((event: IKeyboardEvent) => handleEditorKeyDownEvent(event, editor))
    editor.onDidChangeCursorPosition((event: monaco.editor.ICursorPositionChangedEvent) => {
      currentCursorPosition.current = event.position
    })

    validate()
  }

  const disposePreviousSuggestions = (): void => {
    if (expressionCompletionDisposer) {
      expressionCompletionDisposer.dispose()
    }
    if (runTimeCompletionDisposer) {
      runTimeCompletionDisposer.dispose()
    }
    if (allowedValuesCompletionDisposer) {
      allowedValuesCompletionDisposer.dispose()
    }
  }

  /* #endregion */

  /* #region Custom invocations */

  /** Expressions support */
  const getEditorContentInCurrentLine = (editor: monaco.editor.IStandaloneCodeEditor): string | undefined => {
    const currentLineNum = editor.getPosition()?.lineNumber
    if (currentLineNum) {
      return editor.getModel()?.getLineContent(currentLineNum)
    }
  }

  const getExpressionFromCurrentLine = (editor: monaco.editor.IStandaloneCodeEditor): string | undefined => {
    const expression = getEditorContentInCurrentLine(editor)
      ?.split(':')
      .map((item: string) => item.trim())?.[1]
    return expression
  }

  function registerCompletionItemProviderForExpressions(
    editor: monaco.editor.IStandaloneCodeEditor,
    triggerCharacters: string[],
    matchingPath: string | undefined,
    currentExpression: string | undefined = ''
  ): void {
    if (editor && matchingPath) {
      const suggestionsPromise = onExpressionTrigger ? onExpressionTrigger(matchingPath, currentExpression) : null
      if (suggestionsPromise) {
        suggestionsPromise.then(suggestions => {
          expressionCompletionDisposer = monaco?.languages?.registerCompletionItemProvider('yaml', {
            triggerCharacters,
            provideCompletionItems: (model, position) => {
              const startRange = model.findPreviousMatch('+', position, false, true, null, false)?.range
              const endRange = model.findNextMatch('>', position, false, true, null, false)?.range
              const useRange =
                startRange?.startLineNumber === position.lineNumber && endRange?.startLineNumber === position.lineNumber

              if (!useRange) {
                return { suggestions: suggestions as monaco.languages.CompletionItem[] }
              }

              const range: monaco.IRange = {
                startLineNumber: startRange.startLineNumber,
                endLineNumber: endRange.endLineNumber,
                startColumn: startRange.endColumn,
                endColumn: endRange.endColumn
              }
              return {
                suggestions: suggestions.map(suggestion => {
                  return {
                    ...suggestion,
                    range
                  }
                })
              }
            }
          })
        })
      }
    }
  }

  /** Run-time Inputs support */
  function registerCompletionItemProviderForRTInputs(
    editor: monaco.editor.IStandaloneCodeEditor,
    suggestionsPromise: Promise<CompletionItemInterface[]>
  ): void {
    if (editor) {
      suggestionsPromise.then(suggestions => {
        disposePreviousSuggestions()
        runTimeCompletionDisposer = monaco?.languages?.registerCompletionItemProvider('yaml', {
          triggerCharacters: [' '],
          provideCompletionItems: () => {
            return { suggestions: suggestions as monaco.languages.CompletionItem[] }
          }
        })
      })
    }
  }

  function isAllowedValues(input: string): boolean {
    const regex = /<\+input>\.allowedValues\([^)]*\)/i
    return regex.test(input)
  }

  const getAllowedValuesFromString = (inputValue: string, range: monaco.IRange): CompletionItemInterface[] => {
    const parsedInput = parseInput(inputValue)
    const items: CompletionItemInterface[] = defaultTo(parsedInput?.allowedValues?.values, []).map(item => ({
      label: item,
      insertText: item,
      kind: CompletionItemKind.Field,
      range
    }))

    return items
  }

  /** Run-time Allowed values Inputs support */
  function registerCompletionItemProviderForAllowedValues(
    editor: monaco.editor.IStandaloneCodeEditor,
    currentPathValue: string
  ): void {
    if (isAllowedValues(currentPathValue)) {
      if (editor) {
        disposePreviousSuggestions()
        allowedValuesCompletionDisposer = monaco?.languages?.registerCompletionItemProvider('yaml', {
          triggerCharacters: [' '],
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position)
            const range: monaco.IRange = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn
            }
            const suggestedValues = getAllowedValuesFromString(
              currentPathValue,
              range
            ) as monaco.languages.CompletionItem[]
            return { suggestions: suggestedValues }
          }
        })
      }
    }
  }

  const invokeCallBackForMatchingYAMLPaths = (
    editor: monaco.editor.IStandaloneCodeEditor,
    matchingPath: string | undefined
  ): void => {
    if (editor && matchingPath) {
      invocationMap?.forEach((callBackFunc, yamlPath) => {
        if (matchingPath.match(yamlPath) && typeof callBackFunc === 'function') {
          const yamlFromEditor = getYAMLFromEditor(editor, true) as string
          const suggestionsPromise = callBackFunc(matchingPath, yamlFromEditor, params)
          registerCompletionItemProviderForRTInputs(editor, suggestionsPromise)
        }
      })
    }
  }

  const shouldInvokeExpressions = (
    editor: monaco.editor.IStandaloneCodeEditor,
    event: IKeyboardEvent,
    isWidgetClosed: boolean
  ): boolean => {
    const currentLineContent = getEditorContentInCurrentLine(editor)
    const { browserEvent, code, ctrlKey } = event

    if (!currentLineContent) return false

    // when user tries to open suggest widget using ctrl+space
    if (ctrlKey && code === KEY_CODE_FOR_SPACE && isWidgetClosed) {
      return VAR_REGEX.test(currentLineContent)
    }

    // when last character is < and + is entered
    const lastCharacter = currentLineContent.slice(-1)
    return lastCharacter === ANGULAR_BRACKET_CHAR && browserEvent.key === PLUS
  }

  /* #endregion */

  const useConfirmationDialogReturn = useConfirmationDialog({
    contentText: getString('yamlBuilder.enableEditContext'),
    titleText: getString('confirm'),
    confirmButtonText: getString('enable'),
    cancelButtonText: getString('cancel'),
    intent: Intent.WARNING,
    onCloseDialog: async didConfirm => {
      if (didConfirm) {
        onEnableEditMode?.()
      }
    }
  })
  const openDialog = openDialogProp ?? useConfirmationDialogReturn.openDialog

  const handleEditorKeyDownEvent = (event: IKeyboardEvent, editor: monaco.editor.IStandaloneCodeEditor): void => {
    const { keyCode, code, ctrlKey, metaKey, shiftKey, browserEvent } = event
    const isMetaOrControlKeyPressed = [CONTROL_EVENT_KEY_CODE, META_EVENT_KEY_CODE, SHIFT_EVENT_KEY_CODE].includes(
      keyCode
    )
    const navigationKeysPressed = navigationKeysMap.includes(code)
    if (isHarnessManaged) {
      showHarnessManagedError()
    } else if (readonlyRef.current && isEditModeSupported) {
      const isMetaOrControlKeyPressedForCopyPaste =
        (ctrlKey || metaKey || shiftKey) && allowedKeysInEditModeMap.includes(code)
      if (!(isMetaOrControlKeyPressed || isMetaOrControlKeyPressedForCopyPaste || navigationKeysPressed)) {
        // this is to avoid showing warning dialog if user just wants to copy paste
        openDialog()
      }
    } else if (readonlyRef.current && !isEditModeSupported && !hideErrorMesageOnReadOnlyMode) {
      const isMetaOrControlKeyPressedForCopy =
        (ctrlKey || metaKey || shiftKey) && allowedKeysInReadOnlyModeMap.includes(code)
      if (!(isMetaOrControlKeyPressed || isMetaOrControlKeyPressedForCopy || navigationKeysPressed)) {
        // this is to avoid showing warning dialog if user just wants to copy paste
        showNoPermissionError()
      }
    }
    try {
      //TODO Need to check hotkey for cross browser/cross OS compatibility

      // this is to prevent reset of the editor to empty when there is no undo history
      if ((ctrlKey || metaKey) && code === KEY_CODE_FOR_CHAR_Z) {
        if (editorVersionRef.current && editorVersionRef.current + 1 === getEditorCurrentVersion()) {
          event.stopPropagation()
          event.preventDefault()
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const suggestWidgetState = (editor.getContribution('editor.contrib.suggestController') as any)?.model?.state
      const isSuggestWidgetClosed = suggestWidgetState === 0

      // dispose previous suggestions when opening suggest widget using ^space
      if (ctrlKey && code === KEY_CODE_FOR_SPACE && isSuggestWidgetClosed) {
        disposePreviousSuggestions()
      }

      // dispose expressionCompletion if (+) sign is not preceding with (<)
      if (browserEvent.key === PLUS) {
        const lastKeyStrokeCharacter = getEditorContentInCurrentLine(editor)?.slice(-1)
        if (lastKeyStrokeCharacter !== ANGULAR_BRACKET_CHAR) {
          expressionCompletionDisposer?.dispose()
        }
      }

      if (code === KEY_CODE_FOR_SPACE || code === KEY_CODE_FOR_SEMI_COLON) {
        const yamlPathForAllowedValues = getMetaDataForKeyboardEventProcessing({
          editor,
          onErrorCallback
        })?.parentToCurrentPropertyPath

        //currently working with Pipelines and InputSets entityTypes only as these are the only ones which support runtime inputs
        const currentPathWithoutEntityType =
          //for runPipelineForm we don't need to remove the entityType as it already starts from 'pipeline.[something]'
          entityType === 'Pipelines'
            ? defaultTo(yamlPathForAllowedValues, '')
            : entityType === 'InputSets'
            ? defaultTo(yamlPathForAllowedValues?.split('inputSet.').pop(), '')
            : ''
        const currentPathValue = get(comparableYamlJson, currentPathWithoutEntityType)

        //disposing values
        if (isAllowedValues(currentPathValue)) {
          runTimeCompletionDisposer?.dispose()
          expressionCompletionDisposer?.dispose()
        } else {
          allowedValuesCompletionDisposer?.dispose()
        }

        // this is to invoke allowedValues inputs as suggestions
        if (isAllowedValues(currentPathValue)) {
          registerCompletionItemProviderForAllowedValues(editor, currentPathValue)
        }

        // this is to invoke run-time inputs as suggestions
        // also these are restricted to specific keystrokes as these action make api calls
        if ((ctrlKey && code === KEY_CODE_FOR_SPACE) || (shiftKey && code === KEY_CODE_FOR_SEMI_COLON)) {
          if (invocationMap && invocationMap.size > 0 && !isAllowedValues(currentPathValue)) {
            const yamlPathForNonAllowedValued = getMetaDataForKeyboardEventProcessing({
              editor,
              onErrorCallback,
              shouldAddPlaceholder: true
            })?.parentToCurrentPropertyPath
            invokeCallBackForMatchingYAMLPaths(editor, yamlPathForNonAllowedValued)
          }
        }
      }

      if (shouldInvokeExpressions(editor, event, isSuggestWidgetClosed)) {
        const yamlPath = getMetaDataForKeyboardEventProcessing({
          editor,
          onErrorCallback
        })?.parentToCurrentPropertyPath
        disposePreviousSuggestions()
        registerCompletionItemProviderForExpressions(editor, TRIGGER_CHARS_FOR_NEW_EXPR, yamlPath)
      }

      // this is to invoke partial expressions callback e.g. invoke expressions callback on hitting a period(.) after an expression: expr1.expr2. <-
      if (code === KEY_CODE_FOR_PERIOD) {
        const yamlPath = getMetaDataForKeyboardEventProcessing({ editor, onErrorCallback })?.parentToCurrentPropertyPath
        disposePreviousSuggestions()
        registerCompletionItemProviderForExpressions(
          editor,
          [TRIGGER_CHAR_FOR_PARTIAL_EXPR],
          yamlPath,
          getExpressionFromCurrentLine(editor)
        )
      }
    } catch (err) {
      showError(yamlError)
    }
  }

  const editorControls = useMemo((): React.ReactElement => {
    return (
      <Layout.Horizontal spacing="small">
        {showCopyIcon && <CopyToClipboard content={defaultTo(currentYaml, '')} showFeedback={true} />}
        {shouldShowPluginsPanel ? (
          <Icon
            className={css.resizeIcon}
            name="main-minimize"
            onClick={() => {
              setIsEditorExpanded(isExpanded => !isExpanded)
            }}
          />
        ) : null}
      </Layout.Horizontal>
    )
  }, [showCopyIcon, shouldShowPluginsPanel, currentYaml])

  const renderHeader = useCallback((): JSX.Element => {
    const showEntityDetails = fileName && entityType
    return (
      <Layout.Horizontal
        spacing="small"
        flex={{
          alignItems: 'center',
          justifyContent: showEntityDetails ? 'space-between' : 'flex-end'
        }}
        className={css.header}
        width="100%"
      >
        <Layout.Horizontal spacing="small" flex={{ alignItems: 'center' }}>
          {showEntityDetails ? (
            <>
              <span className={cx(css.filePath, css.flexCenter, { [css.lightBg]: theme === 'DARK' })}>{fileName}</span>
              <Tag className={css.entityTag}>{entityType}</Tag>
            </>
          ) : null}
          <Container padding={{ left: 'small' }}>{editorControls}</Container>
        </Layout.Horizontal>
        {!isReadOnlyMode && yamlValidationErrors && yamlValidationErrors.size > 0 && (
          <div className={cx(css.flexCenter, css.validationStatus)}>
            <Popover
              interactionKind={PopoverInteractionKind.HOVER}
              position={PopoverPosition.TOP}
              content={<ErrorSummary errorMap={yamlValidationErrors} />}
              popoverClassName={css.summaryPopover}
            >
              <Layout.Horizontal flex spacing="xsmall">
                <Icon name="main-issue-filled" size={14} className={css.validationIcon} />
                <span className={css.invalidYaml}>{getString('invalidText')}</span>
              </Layout.Horizontal>
            </Popover>
          </div>
        )}
      </Layout.Horizontal>
    )
  }, [yamlValidationErrors, fileName, entityType, theme, isReadOnlyMode, editorControls, getString])

  // used to remove initial selection that appears when yaml builder is loaded with an initial value
  useEffect(() => {
    if (every([!initialSelectionRemoved, editorRef.current?.getValue()])) {
      editorRef.current?.setSelection(new monaco.Range(0, 0, 0, 0))
      setInitialSelectionRemoved(true)
    }
  }, [initialSelectionRemoved])

  const renderEditor = (): JSX.Element => (
    <MonacoEditor
      width={width}
      height={defaultTo(height, DEFAULT_EDITOR_HEIGHT)}
      language="yaml"
      value={currentYaml}
      onChange={onYamlChange}
      editorDidMount={editorDidMount}
      options={{
        readOnly: defaultTo(isReadOnlyMode, !isEditModeSupported),
        wordBasedSuggestions: false,
        scrollBeyondLastLine: false,
        fontFamily: "'Roboto Mono', monospace",
        fontSize: 13,
        minimap: {
          enabled: false
        },
        codeLens: true,
        tabSize: 2,
        theme: getTheme(theme)
      }}
      ref={editorRef}
    />
  )

  const throttledOnResize = useMemo(
    () =>
      throttle(() => {
        editorRef.current?.layout()
      }, 500),
    []
  )

  useEffect(() => {
    window.addEventListener('resize', throttledOnResize)
    return () => {
      window.removeEventListener('resize', throttledOnResize)
      disposePreviousSuggestions()
    }
  }, [])

  const addCodeLensRegistration = useCallback(
    ({
      fromLine,
      toLineNum,
      cursorPosition
    }: {
      fromLine: number
      toLineNum: number
      cursorPosition: Position
    }): IDisposable | undefined => {
      const commandId = editorRef.current?.addCommand(
        0,
        () => {
          setPluginOpnStatus?.(Status.TO_DO)
          try {
            const numberOfLinesInSelection = getSelectionRangeOnSettingsBtnClick(cursorPosition, currentYaml)
            if (numberOfLinesInSelection) {
              currentCursorPosition.current = cursorPosition
              highlightInsertedYAML(fromLine, toLineNum + numberOfLinesInSelection - 1)
            }
          } catch (e) {
            //ignore error
          }
        },
        ''
      )

      if (!commandId) return

      const registrationId: IDisposable = monaco.languages.registerCodeLensProvider('yaml', {
        provideCodeLenses: function (_model: unknown, _token: unknown) {
          return {
            lenses: [
              {
                range: {
                  startLineNumber: fromLine,
                  startColumn: 1,
                  endLineNumber: toLineNum,
                  endColumn: 1
                },
                id: 'plugin-settings',
                command: {
                  id: commandId,
                  title: 'Settings'
                }
              }
            ],
            dispose: () => {
              try {
                registrationId.dispose()
              } catch (e) {
                // ignore error
              }
            }
          }
        }
      })
      return registrationId
    },
    [currentYaml]
  )

  const spotLightInsertedYAML = useCallback(
    ({
      noOflinesInserted,
      closestStageIndex,
      isPluginUpdate,
      closestStepIndex,
      startStepIndex
    }: {
      noOflinesInserted: number
      closestStageIndex: number
      isPluginUpdate: boolean
      closestStepIndex: number
      startStepIndex: number
    }): void => {
      const editor = editorRef.current
      if (editor) {
        let position: Position
        if (isPluginUpdate && editorRef.current) {
          const stepMatchingPositions = getValidStepPositions(editorRef.current)
          const allMatchesInClosestStageIndex = stepMatchingPositions.slice(startStepIndex)
          position = allMatchesInClosestStageIndex[closestStepIndex]
          const { lineNumber: startingLineNum } = position
          const endingLineNum = startingLineNum + noOflinesInserted > 0 ? startingLineNum + noOflinesInserted - 1 : 0
          const contentInEndingLine = editor.getModel()?.getLineContent(endingLineNum) || ''

          // highlight the inserted text
          highlightInsertedYAML(startingLineNum, endingLineNum + 1)

          // Scroll to the end of the inserted text
          editor.setPosition({ column: contentInEndingLine.length + 1, lineNumber: endingLineNum })
          editor.revealLineInCenter(endingLineNum)
          editor.focus()
        } else {
          position = findPositionsForMatchingKeys(editor, 'steps')[closestStageIndex]
          const endingLineForCursorPosition = position.lineNumber + noOflinesInserted
          const contentInStartingLine = editor.getModel()?.getLineContent(position.lineNumber)?.trim() || ''
          const contentInEndingLine = editor.getModel()?.getLineContent(endingLineForCursorPosition) || ''
          const startingLineNum = position.lineNumber + (contentInStartingLine ? 1 : 0)
          const endingLineNum = contentInStartingLine ? endingLineForCursorPosition + 1 : endingLineForCursorPosition

          // highlight the inserted text
          highlightInsertedYAML(startingLineNum, endingLineNum)

          // Scroll to the end of the inserted text
          editor.setPosition({ column: contentInEndingLine.length + 1, lineNumber: endingLineForCursorPosition })
          editor.revealLineInCenter(endingLineForCursorPosition)
          editor.focus()
        }
      }
    },
    []
  )

  const getSelectionRangeOnSettingsBtnClick = useCallback((cursorPosition: Position, latestYAML: string): number => {
    if (cursorPosition && editorRef.current) {
      try {
        const currentYAMLAsJSON = parse(latestYAML)
        const closestStageIndex = getArrayIndexClosestToCurrentCursor({
          editor: editorRef.current,
          sourcePosition: cursorPosition,
          searchToken: StageMatchRegex
        })
        const stageStepsForTheClosestIndex = extractStepsFromStage(
          currentYAMLAsJSON,
          getStageYAMLPathForStageIndex(closestStageIndex)
        ) as unknown[]
        const stageStepsForThePrecedingIndex =
          closestStageIndex > 0
            ? (extractStepsFromStage(
                currentYAMLAsJSON,
                getStageYAMLPathForStageIndex(closestStageIndex - 1)
              ) as unknown[])
            : []
        const stageStepsCountForThePrecedingIndex = (stageStepsForThePrecedingIndex as unknown[]).length
        const closestStepIndex = getClosestStepIndexInCurrentStage({
          editor: editorRef.current,
          cursorPosition,
          precedingStageStepsCount: stageStepsCountForThePrecedingIndex,
          currentStageStepsCount: stageStepsForTheClosestIndex.length
        })
        const stepYAMLPath = getStepYAMLPathForStepInsideAStage(closestStageIndex, closestStepIndex)
        const pluginAsStep = get(currentYAMLAsJSON, stepYAMLPath) as Record<string, any>
        setPlugin?.(pluginAsStep)
        const stepValueTokens = yamlStringify(pluginAsStep).split('\n').length
        return stepValueTokens
      } catch (e) {
        // ignore error
      }
    }
    return 0
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (shouldShowPluginsPanel && editor) {
      const stepMatchingPositions = getValidStepPositions(editor)
      if (stepMatchingPositions.length) {
        stepMatchingPositions.map((matchingPosition: Position) => {
          const { lineNumber } = matchingPosition
          if (codeLensRegistrations.current.has(lineNumber)) {
            const existingRegistrationId = codeLensRegistrations.current.get(lineNumber)
            if (existingRegistrationId) {
              try {
                existingRegistrationId.dispose()
              } catch (ex) {
                //ignore excetion
              }
              codeLensRegistrations.current.delete(lineNumber)
            }
          }
          const registrationId = addCodeLensRegistration({
            fromLine: lineNumber,
            toLineNum: lineNumber,
            cursorPosition: matchingPosition
          })
          if (registrationId) {
            codeLensRegistrations.current.set(lineNumber, registrationId)
          }
        })
      } else {
        codeLensRegistrations.current.clear()
      }
    }
  }, [currentYaml, shouldShowPluginsPanel])

  useEffect(() => {
    onEditorResize?.(isEditorExpanded)
  }, [isEditorExpanded])

  const highlightInsertedYAML = useCallback((fromLine: number, toLineNum: number): void => {
    const pluginInputDecoration: monaco.editor.IModelDeltaDecoration = {
      range: new monaco.Range(fromLine, 1, toLineNum, 1),
      options: {
        isWholeLine: false,
        className: css.pluginDecorator
      }
    }
    const decorations = editorRef.current?.deltaDecorations([], [pluginInputDecoration])
    if (decorations) {
      setTimeout(() => editorRef.current?.deltaDecorations(decorations, []), 10000)
    }
  }, [])

  const wrapPlugInputInAStep = useCallback((pluginMetadata: PluginAddUpdateMetadata): Record<string, any> => {
    const { pluginData, pluginType, pluginName, pluginUses, pluginImage } = pluginMetadata
    const sanitizedPluginData = omitBy(omitBy(sanitizePluginValues(pluginData), isUndefined), isNull)
    return {
      name: pluginName,
      spec:
        pluginType === PluginType.Script
          ? sanitizedPluginData
          : {
              ...(!isEmpty(sanitizedPluginData) && { with: sanitizedPluginData }),
              ...(pluginUses && { uses: pluginUses }),
              ...(pluginImage && { image: pluginImage })
            },
      type: pluginType
    }
  }, [])

  const sanitizePluginValues = useCallback((unSanitizedObj: Record<string, any>): Record<string, any> => {
    try {
      return JSON.parse(JSON.stringify(unSanitizedObj).replace(/:null/gi, ':""'))
    } catch (e) {
      return unSanitizedObj
    }
  }, [])

  const addUpdatePluginIntoExistingYAML = useCallback(
    (pluginMetadata: PluginAddUpdateMetadata, isPluginUpdate: boolean): void => {
      const { shouldInsertYAML } = pluginMetadata
      const cursorPosition = currentCursorPosition.current

      if (shouldInsertYAML && cursorPosition && editorRef.current) {
        let updatedYAML = currentYamlRef.current
        try {
          let closestStageIndex = getArrayIndexClosestToCurrentCursor({
            editor: editorRef.current,
            sourcePosition: cursorPosition,
            searchToken: StageMatchRegex
          })
          if (closestStageIndex < 0) {
            updatedYAML = yamlStringify({ ...parse(updatedYAML), stages: [getDefaultStageForModule(module)] })
            onYamlChange(updatedYAML)
            setCurrentYaml(updatedYAML)
            currentYamlRef.current = updatedYAML
            closestStageIndex = 0
          }
          const yamlStepToBeInsertedAt = getStageYAMLPathForStageIndex(closestStageIndex)
          const currentPipelineJSON = parse(updatedYAML)
          const existingSteps = (extractStepsFromStage(currentPipelineJSON, yamlStepToBeInsertedAt) as unknown[]) || []
          let updatedSteps = existingSteps.slice(0) as unknown[]
          const pluginValuesAsStep = wrapPlugInputInAStep(pluginMetadata)
          const stepCountInPrecedingStage = (
            closestStageIndex > 0
              ? (extractStepsFromStage(
                  currentPipelineJSON,
                  getStageYAMLPathForStageIndex(closestStageIndex - 1)
                ) as unknown[])
              : []
          ).length
          let closestStepIndexInCurrentStage = 0
          if (isPluginUpdate) {
            const currentStageIndex = getArrayIndexClosestToCurrentCursor({
              editor: editorRef.current,
              sourcePosition: cursorPosition,
              searchToken: StageMatchRegex
            })
            const stepsInCurrentStage = extractStepsFromStage(
              currentPipelineJSON,
              getStageYAMLPathForStageIndex(currentStageIndex)
            ) as unknown[]
            closestStepIndexInCurrentStage = getClosestStepIndexInCurrentStage({
              editor: editorRef.current,
              cursorPosition,
              precedingStageStepsCount: stepCountInPrecedingStage,
              currentStageStepsCount: stepsInCurrentStage.length
            })
            updatedSteps[closestStepIndexInCurrentStage] = pluginValuesAsStep
          } else {
            if (Array.isArray(existingSteps) && existingSteps.length > 0) {
              updatedSteps.unshift(pluginValuesAsStep)
            } else {
              updatedSteps = [pluginValuesAsStep]
            }
          }
          updatedYAML = yamlStringify(set(currentPipelineJSON, yamlStepToBeInsertedAt, updatedSteps))
          onYamlChange(updatedYAML)
          setCurrentYaml(updatedYAML)
          currentYamlRef.current = updatedYAML
          setPluginOpnStatus?.(Status.SUCCESS)
          spotLightInsertedYAML({
            noOflinesInserted: countAllKeysInObject(pluginValuesAsStep),
            closestStageIndex,
            isPluginUpdate,
            closestStepIndex: closestStepIndexInCurrentStage,
            startStepIndex: stepCountInPrecedingStage
          })
        } catch (e) {
          // ignore error
        }
      }
    },
    [currentCursorPosition]
  )

  useCodeLenses({ editorRef, codeLensConfigs })

  useDecoration({
    editorRef,
    yaml: currentYaml,
    path: selectedPath,
    theme: getTheme(theme),
    validClassName: css.validDecoration,
    invalidClassName: css.invalidDecoration,
    modelMarkers
  })

  return shouldShowPluginsPanel ? (
    <Layout.Horizontal>
      <Layout.Vertical>
        <div
          className={cx(css.borderWithPluginsPanel, {
            [css.darkBg]: theme === 'DARK'
          })}
        >
          <div className={css.editor}>
            <Container
              flex={{ justifyContent: 'space-between' }}
              className={css.headerBorder}
              padding={
                renderCustomHeader
                  ? { top: 'small', right: 'medium', bottom: 'small', left: 'xlarge' }
                  : { right: 'medium' }
              }
            >
              {defaultTo(renderCustomHeader, renderHeader)()}
            </Container>
            {renderEditor()}
          </div>
        </div>
      </Layout.Vertical>
    </Layout.Horizontal>
  ) : (
    <div className={cx(customCss, { [css.main]: displayBorder }, { [css.darkBg]: theme === 'DARK' })}>
      <div className={css.editor}>
        <Container margin={{ left: 'xxlarge', right: 'xlarge' }}>
          {defaultTo(renderCustomHeader, renderHeader)()}
        </Container>
        {renderEditor()}
      </div>
    </div>
  )
}

export default YAMLBuilder

export const YamlBuilderMemo = React.memo(YAMLBuilder, (prevProps, nextProps) => {
  if (isNil(prevProps.schema) && !isNil(nextProps.schema)) {
    return false
  }
  return isEqualWith(nextProps, prevProps, (_arg1, _arg2, key) => {
    if (
      ['existingJSON', 'onExpressionTrigger', 'schema', 'onEnableEditMode', 'openDialogProp'].indexOf(key as string) >
      -1
    ) {
      return true
    }
  })
})
