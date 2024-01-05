/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { shouldIgnoreEvent } from '../Utils'

describe('shouldIgnoreEvent function', () => {
  test('should return true when errors array includes ignored error class', () => {
    const event = {
      errors: [{ errorClass: 'YAMLSyntaxError' }]
    }
    expect(shouldIgnoreEvent(event)).toBe(true)
  })

  test('should return true when originalError stack includes monaco worker filenames', () => {
    const event = {
      originalError: {
        stack: 'Sample stack trace with editorsimpleworker mentioned'
      }
    }
    expect(shouldIgnoreEvent(event)).toBe(true)
  })

  test('should return true when errors.0.errorMessage includes monaco worker filenames', () => {
    const event = {
      errors: [
        {
          errorMessage: 'Sample error message with yaml.worker.foo123 mentioned'
        }
      ]
    }
    expect(shouldIgnoreEvent(event)).toBe(true)
  })

  test('should return false when errors array does not include ignored error class', () => {
    const event = {
      errors: [{ errorClass: 'SomeOtherError' }]
    }
    expect(shouldIgnoreEvent(event)).toBe(false)
  })

  test('should return false when originalError stack does not include monaco worker filenames', () => {
    const event = {
      originalError: {
        stack: 'Sample stack trace without relevant string'
      }
    }
    expect(shouldIgnoreEvent(event)).toBe(false)
  })

  test('should return false when event has no errors or originalError', () => {
    const event = {}
    expect(shouldIgnoreEvent(event)).toBe(false)
  })

  test('should return true when errors.originalError includes ResizeObserver loop completed', () => {
    const event = {
      originalError: 'ResizeObserver loop completed with undelivered notifications.'
    }
    expect(shouldIgnoreEvent(event)).toBe(true)
  })
})
