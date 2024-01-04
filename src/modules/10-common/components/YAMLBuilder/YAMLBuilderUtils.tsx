/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useMemo, useState, RefObject } from 'react'
import type { DetailedReactHTMLElement } from 'react'
import * as monaco from 'monaco-editor'
import type { Diagnostic } from 'vscode-languageserver-types'
import { parse } from 'yaml'
import { debounce, get, isEmpty, noop, pick } from 'lodash-es'
import { Range } from 'monaco-editor'
import type { editor, Position, languages, IRange } from 'monaco-editor'
import { ILanguageFeaturesService } from 'monaco-editor/esm/vs/editor/common/services/languageFeatures.js'
import { OutlineModel } from 'monaco-editor/esm/vs/editor/contrib/documentSymbols/browser/outlineModel.js'
import { StandaloneServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices.js'
import type { Module } from 'framework/types/ModuleName'
import type { CodeLensCommand, CodeLensConfig, YamlBuilderProps } from '@common/interfaces/YAMLBuilderProps'
import { findLeafToParentPath } from '../../utils/YamlUtils'

/**
 * Get YAML from editor with placeholder added at current position in editor
 * @param editor
 * @param shouldAddPlaceholder whether to add a placeholder at current position in editor during yaml->json conversion
 */
const getYAMLFromEditor = (editor: any, shouldAddPlaceholder: boolean): string | null => {
  const currentPositionInEditor = editor?.getPosition(),
    textInCurrentEditorLine = editor?.getValue(currentPositionInEditor)?.trim(),
    currentLineNumber = currentPositionInEditor?.lineNumber,
    splitedText = textInCurrentEditorLine?.split('\n').slice(0, currentLineNumber),
    currentLineContent = splitedText?.[currentLineNumber - 1]
  const lengthOfCurrentText = textInCurrentEditorLine?.length
  if (lengthOfCurrentText > 0) {
    let textToInsert = ''
    if (shouldAddPlaceholder) {
      textToInsert = textInCurrentEditorLine[lengthOfCurrentText - 1] === ':' ? '' : ': ' + 'placeholder'
    }
    splitedText[currentLineNumber - 1] = [
      currentLineContent?.slice(0, currentPositionInEditor.column - 1),
      textToInsert,
      currentLineContent?.slice(currentPositionInEditor.column - 1)
    ].join('')
    editor.setPosition(currentPositionInEditor)
    return splitedText.join('\n')
  }
  return null
}

/**
 * Get current property to parent json path
 * @param editor
 * @param onErrorCallback
 * @param shouldAddPlaceholder
 */
const getMetaDataForKeyboardEventProcessing = ({
  editor,
  onErrorCallback,
  shouldAddPlaceholder = false
}: {
  editor: any
  onErrorCallback?: YamlBuilderProps['onErrorCallback']
  shouldAddPlaceholder?: boolean
}): Record<string, string | undefined> | undefined => {
  const yamlInEditor = getYAMLFromEditor(editor, shouldAddPlaceholder)
  if (yamlInEditor) {
    try {
      const jsonEquivalentOfYAMLInEditor = parse(yamlInEditor)
      const textInCurrentEditorLine = editor.getModel()?.getLineContent(editor.getPosition().lineNumber)
      const currentProperty = textInCurrentEditorLine?.split(':').map((item: string) => item.trim())[0]
      const parentToCurrentPropertyPath = findLeafToParentPath(jsonEquivalentOfYAMLInEditor, currentProperty)
      return { currentProperty, yamlInEditor, parentToCurrentPropertyPath }
    } catch (e) {
      onErrorCallback?.(e)
    }
  }
}

/**
 * Get mapping of json path of a property to all errors on the value at that property
 * @param currentYaml
 * @param validationErrors
 * @param editor
 */
const getYAMLValidationErrors = (validationErrors: Diagnostic[]): Map<number, string> => {
  const errorMap = new Map<number, string>()
  validationErrors.forEach(valError => {
    const errorIndex = valError?.range?.end?.line
    errorMap.set(errorIndex, valError?.message)
  })
  return errorMap
}

/**
 * Get formatted HTML of list items
 * @param errorMap yaml path to validation error map
 */
const getValidationErrorMessagesForToaster = (
  errorMap: Map<string, string[]>
): DetailedReactHTMLElement<{ id: string }, HTMLElement> => {
  const errorRenderItemList: JSX.Element[] = []
  errorMap?.forEach((values: string[], key: string) => {
    errorRenderItemList.push(
      <li key={key}>
        In{' '}
        <b>
          <i>{key}</i>
        </b>
        , {values?.map((value: string) => value.charAt(0).toLowerCase() + value.slice(1))?.join(', ')}
      </li>
    )
  })
  return React.createElement('ul', { id: 'ul-errors' }, errorRenderItemList)
}

/*  Find all (x: lineNumber, y: colNumber) coordinates for matching keys in editor content */
const findPositionsForMatchingKeys = (editor: editor.IStandaloneCodeEditor, textToFind: string): Position[] => {
  const matches = editor?.getModel()?.findMatches(textToFind, true, true, false, null, true) as editor.FindMatch[]
  return matches?.map((match: editor.FindMatch) => {
    const { endLineNumber, endColumn } = match.range
    return { lineNumber: endLineNumber, column: endColumn } as Position
  })
}

/*  Get root to node '.' separated path for steps array inside a given stage */
const getStageYAMLPathForStageIndex = (stageIndex: number): string => `stages.${stageIndex}.spec.steps`

/*  Get root to node '.' separated path for a certain step inside a given stage */
const getStepYAMLPathForStepInsideAStage = (stageIndex: number, stepIndex: number): string =>
  `${getStageYAMLPathForStageIndex(stageIndex)}.${stepIndex}`

const getDefaultStageForModule = (module?: Module): Record<string, any> => {
  return {
    name: 'stage',
    // Project/Org level pipeline to default add custom stage
    type: `${(module ?? 'custom').valueOf().toLowerCase()}`,
    spec: {
      steps: []
    }
  }
}

const getValidStepPositions = (editor: editor.IStandaloneCodeEditor): Position[] => {
  const allStageMatches = findPositionsForMatchingKeys(editor, StageMatchRegex) || []
  const allStepMatches = findPositionsForMatchingKeys(editor, StepMatchRegex) || []
  const currentYAML = editor.getValue()
  if (currentYAML && allStageMatches.length && allStepMatches.length) {
    let currentYAMLAsJSON = {}
    try {
      currentYAMLAsJSON = parse(currentYAML)
    } catch (e) {
      // ignore error
    }
    if (currentYAMLAsJSON && !isEmpty(currentYAMLAsJSON)) {
      let stepMatchItr = 0
      const stepMatchesToRemove: number[] = []
      for (let stageIdx = 0; stageIdx < allStageMatches.length; stageIdx++) {
        // find the number of steps in a stage
        const stepCountInCurrentStage = (
          extractStepsFromStage(currentYAMLAsJSON, getStageYAMLPathForStageIndex(stageIdx)) as unknown[]
        )?.length
        const nextStageIdx = stepMatchItr + stepCountInCurrentStage + 1
        if (!isNaN(stepCountInCurrentStage) && nextStageIdx <= allStepMatches.length) {
          stepMatchesToRemove.push(stepMatchItr)
          stepMatchItr += nextStageIdx
        }
      }
      if (stepMatchesToRemove.length) {
        return allStepMatches.filter(function (_val, index) {
          return stepMatchesToRemove.indexOf(index) === -1
        })
      }
    }
  }
  return []
}

/* Get stage/step index closest to stage/step location in editor content */
const getArrayIndexClosestToCurrentCursor = ({
  editor,
  sourcePosition,
  searchToken,
  startIdxForLookup,
  noOfResultsToBeIncludedInLookup
}: {
  editor: editor.IStandaloneCodeEditor
  sourcePosition: Position
  searchToken: string
  startIdxForLookup?: number
  noOfResultsToBeIncludedInLookup?: number
}): number => {
  if (editor) {
    const { lineNumber: currentCursorLineNum } = sourcePosition || {}
    if (currentCursorLineNum) {
      const allMatchesFound =
        searchToken === StepMatchRegex
          ? getValidStepPositions(editor)
          : searchToken === StageMatchRegex
          ? findPositionsForMatchingKeys(editor, StageMatchRegex)
          : []
      const relevantMatches = (
        startIdxForLookup && noOfResultsToBeIncludedInLookup
          ? allMatchesFound.slice(startIdxForLookup, noOfResultsToBeIncludedInLookup)
          : allMatchesFound
      )
        .map((position: Position) => position.lineNumber)
        ?.sort(function (location1, location2) {
          return location1 - location2
        })
      let closestPosition = -1
      for (let matchItr = 0; matchItr < relevantMatches.length; matchItr++) {
        if (matchItr === relevantMatches.length - 1 && currentCursorLineNum >= relevantMatches[matchItr]) {
          closestPosition = matchItr
          break
        } else if (
          currentCursorLineNum < relevantMatches[matchItr] ||
          (currentCursorLineNum >= relevantMatches[matchItr] && currentCursorLineNum < relevantMatches[matchItr + 1])
        ) {
          closestPosition = matchItr
          break
        }
      }
      return closestPosition
    }
  }
  return 0
}

/* Get all steps in a stage */
const extractStepsFromStage = (pipelineJSONObj: Record<string, unknown>, jsonPath: string): unknown | unknown[] => {
  if (!jsonPath) {
    return ''
  }
  const tokensInJSONPath: string[] = jsonPath.split('.')
  let targetValue: unknown | Record<string, unknown>
  for (let i = 0; i < tokensInJSONPath.length; i++) {
    const currentToken = tokensInJSONPath[i]
    // regex '*' wildcard match could endup with multiple matches in the json
    if (currentToken === '*' && Array.isArray(targetValue)) {
      const matchingValues: string[] = []
      for (let j = 0; j < targetValue.length; j++) {
        matchingValues.push(
          extractStepsFromStage(pipelineJSONObj, `pipeline.stages.${j}.stage.spec.execution`) as string
        )
      }
      return matchingValues
    } else {
      targetValue =
        i === 0 ? get(pipelineJSONObj, currentToken, '') : get(targetValue as Record<string, unknown>, currentToken, '')
      if (!targetValue) {
        // break if there's no value on the current path
        break
      }
    }
  }
  return targetValue
}

const getClosestStepIndexInCurrentStage = ({
  editor,
  cursorPosition,
  precedingStageStepsCount,
  currentStageStepsCount
}: {
  editor: editor.IStandaloneCodeEditor
  cursorPosition: Position
  precedingStageStepsCount: number
  currentStageStepsCount: number
}): number => {
  let closestStepIndex = -1
  if (editor) {
    if (precedingStageStepsCount > 0) {
      closestStepIndex = getArrayIndexClosestToCurrentCursor({
        editor,
        sourcePosition: cursorPosition,
        searchToken: StepMatchRegex,
        startIdxForLookup: precedingStageStepsCount,
        noOfResultsToBeIncludedInLookup: precedingStageStepsCount + currentStageStepsCount
      })
    } else {
      closestStepIndex = getArrayIndexClosestToCurrentCursor({
        editor,
        sourcePosition: cursorPosition,
        searchToken: StepMatchRegex,
        startIdxForLookup: 0,
        noOfResultsToBeIncludedInLookup: currentStageStepsCount
      })
    }
  }
  return closestStepIndex === -1 ? 0 : closestStepIndex
}

export const StepMatchRegex = '-\\sname:'
export const StageMatchRegex = 'steps:'

const getValidationErrorMapFromMarkers = (markers: editor.IMarker[]): Map<number, string> => {
  return markers.reduce((map, marker) => {
    return map.set(marker.endLineNumber, marker.message)
  }, new Map<number, string>())
}

const getDocumentSymbols = async (model: editor.ITextModel): Promise<languages.DocumentSymbol[]> => {
  const { documentSymbolProvider } = StandaloneServices.get(ILanguageFeaturesService)
  const outline = await OutlineModel.create(documentSymbolProvider, model)
  return outline.asListOfDocumentSymbols()
}

const getPathFromRange = (range: IRange, symbols: languages.DocumentSymbol[]): string[] => {
  const path: string[] = []
  for (const symbol of symbols) {
    if (!Range.containsRange(symbol.range, range)) continue
    path.push(symbol.name)
    if (Range.equalsRange(symbol.range, range)) break
    if (!symbol.children) continue
    path.push(...getPathFromRange(range, symbol.children))
  }
  return path
}

const getPathFromPosition = (symbols: languages.DocumentSymbol[], currentPosition: monaco.Position): string[] => {
  const { lineNumber } = currentPosition

  const symbolsIntersectingWithCursor = symbols.filter(symbol => Range.containsPosition(symbol.range, currentPosition))

  const currentCursorSymbol =
    symbolsIntersectingWithCursor.length > 0
      ? symbolsIntersectingWithCursor[symbolsIntersectingWithCursor.length - 1]
      : symbols[lineNumber - 1]

  return getPathFromRange(currentCursorSymbol.range, symbols)
}

const getRangeFromPath = (path: string[], symbols: languages.DocumentSymbol[]): IRange | undefined => {
  if (!path.length) return undefined

  let pathIndex = 0

  return symbols.find(symbol => {
    if (symbol.name !== path[pathIndex]) return false
    if (pathIndex++ === path.length - 1) return true
  })?.range
}

interface CommandArg extends Pick<CodeLensCommand, 'onClick' | 'args'> {
  range: monaco.IRange
  symbols: monaco.languages.DocumentSymbol[]
}

export type UseCodeLenses = (arg: {
  editorRef?: RefObject<monaco.editor.IStandaloneCodeEditor>
  codeLensConfigs?: CodeLensConfig[]
}) => void

const useCodeLenses: UseCodeLenses = ({ editorRef, codeLensConfigs }): void => {
  useEffect(() => {
    if (!codeLensConfigs) return

    const commandId = editorRef?.current?.addCommand(0, (_, { range, symbols, onClick, args }: CommandArg) => {
      const path = getPathFromRange(range, symbols)
      onClick({ path, range }, ...(args ? args : []))
    })

    if (!commandId) return

    const disposable = monaco.languages.registerCodeLensProvider('yaml', {
      provideCodeLenses: async model => {
        const symbols = await getDocumentSymbols(model)
        const lenses = symbols.reduce<monaco.languages.CodeLens[]>((acc, symbol) => {
          const codeLensConfig = codeLensConfigs.find(config => {
            const configSymbolProps = pick(config, ['name', 'containerName', 'kind'])

            return (Object.keys(configSymbolProps) as ('name' | 'containerName' | 'kind')[]).every(
              key => symbol[key] === config[key]
            )
          })

          if (!codeLensConfig) return acc

          const { range } = symbol

          acc.push(
            ...codeLensConfig.commands.map(({ title, onClick, args }) => {
              const commandArg: CommandArg = {
                range,
                symbols,
                onClick,
                args
              }

              return {
                range,
                command: {
                  id: commandId,
                  title,
                  arguments: [commandArg]
                }
              }
            })
          )

          return acc
        }, [])

        return {
          lenses,
          dispose: noop
        }
      }
    })

    return disposable.dispose
  }, [codeLensConfigs, editorRef])
}

async function getCursorPath(editor?: editor.IStandaloneCodeEditor): Promise<{
  path: string[]
}> {
  const currentPosition = editor?.getPosition()
  const model = editor?.getModel()
  if (!model || !currentPosition) return { path: [] }
  const symbols = await getDocumentSymbols(model)
  const currentCursorPath = getPathFromPosition(symbols, currentPosition)

  return { path: currentCursorPath }
}

type UseDecoration = (arg: {
  editorRef?: RefObject<monaco.editor.IStandaloneCodeEditor>
  yaml: string
  path?: string[]
  modelMarkers: editor.IMarker[]
  invalidClassName: string
  validClassName: string
  theme: editor.BuiltinTheme
}) => void

const useDecoration: UseDecoration = ({
  editorRef,
  yaml,
  path,
  modelMarkers,
  theme,
  invalidClassName,
  validClassName
}) => {
  const [range, setRange] = useState<IRange>()

  const computeRange = useMemo(
    () =>
      debounce(
        async (_editorRef?: RefObject<monaco.editor.IStandaloneCodeEditor>, _path?: string[]) => {
          const model = editorRef?.current?.getModel()
          if (!model || !_path) return setRange(undefined)

          const symbols = await getDocumentSymbols(model)
          const rangeFromPath = getRangeFromPath(_path, symbols)

          if (rangeFromPath) setRange(rangeFromPath)
        },
        300,
        {
          leading: true,
          trailing: true
        }
      ),
    []
  )

  useEffect(() => {
    computeRange(editorRef, path)
  }, [path, editorRef, yaml, computeRange])

  useEffect(() => computeRange.cancel, [computeRange])

  const isSelectedRangeInvalid = useMemo(() => {
    if (!range) return false

    return modelMarkers.some(({ startLineNumber, startColumn, endLineNumber, endColumn }) =>
      monaco.Range.areIntersectingOrTouching(range, { startLineNumber, startColumn, endLineNumber, endColumn })
    )
  }, [modelMarkers, range])

  useEffect(() => {
    if (!range) return

    const decorations = editorRef?.current?.createDecorationsCollection([
      {
        range,
        options: {
          overviewRuler: {
            position: monaco.editor.OverviewRulerLane.Left,
            color: theme
          },
          isWholeLine: false,
          className: isSelectedRangeInvalid ? invalidClassName : validClassName
        }
      }
    ])
    return () => decorations?.clear()
  }, [range, theme, editorRef, invalidClassName, validClassName, isSelectedRangeInvalid])
}

export {
  getYAMLFromEditor,
  getMetaDataForKeyboardEventProcessing,
  getYAMLValidationErrors,
  getValidationErrorMapFromMarkers,
  getValidationErrorMessagesForToaster,
  findPositionsForMatchingKeys,
  getStageYAMLPathForStageIndex,
  getStepYAMLPathForStepInsideAStage,
  getDefaultStageForModule,
  getArrayIndexClosestToCurrentCursor,
  getValidStepPositions,
  extractStepsFromStage,
  getClosestStepIndexInCurrentStage,
  getDocumentSymbols,
  getPathFromRange,
  useCodeLenses,
  useDecoration,
  getCursorPath
}
