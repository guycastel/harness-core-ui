/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { get } from 'lodash-es'

const ignoredErrorClasses = ['YAMLSemanticError', 'YAMLSyntaxError', 'AbortError']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const shouldIgnoreEvent = (event: any): boolean => {
  if (Array.isArray(event.errors) && ignoredErrorClasses.includes(event.errors[0]?.errorClass)) {
    return true
  }

  // Ignore ResizeObserver loop completed with undelivered notifications caused due to plugins or library in chromium browsers
  if (
    typeof event.originalError === 'string' &&
    event.originalError.includes('ResizeObserver loop completed with undelivered notifications.')
  ) {
    return true
  }

  // Ignore errors from monaco-editor workers caused due to network issues.

  const isMonacoWorkerError = [get(event, 'originalError.stack'), get(event, 'errors.0.errorMessage')].some(text =>
    /editorsimpleworker|yaml\.worker/i.test(text)
  )
  if (isMonacoWorkerError) {
    return true
  }

  return false
}
