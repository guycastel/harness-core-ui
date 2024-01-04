/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { PipelineInputSchemaDetailsResponseBody } from '@harnessio/react-pipeline-service-client'
import { UIInputs } from '../types'

export const pipelineInputsSchema1API: PipelineInputSchemaDetailsResponseBody = {
  inputs: [
    {
      details: {
        name: 'input-1',
        type: 'String',
        desc: '',
        required: false
      },
      metadata: {
        field_properties: [
          {
            input_type: 'string',
            internal_type: 'jira_projects'
          }
        ],
        dependencies: {
          required_runtime_inputs: [
            {
              field_name: 'runtimeField1',
              input_name: 'input-2'
            }
          ],
          required_fixed_values: [
            {
              field_name: 'fixedField1',
              field_input_type: 'string',
              field_value: { key: 'value' }
            }
          ]
        }
      }
    }
  ]
}

export const pipelineInputsSchema1UI: UIInputs = {
  hasInputs: true,
  inputs: [
    {
      allMetadata: [
        {
          internal_type: 'jira_projects',
          type: 'string'
        }
      ],
      dependencies: [
        {
          input_name: 'input-2',
          field_name: 'runtimeField1',
          isFixedValue: false
        },
        {
          field_input_type: 'string',
          field_name: 'fixedField1',
          field_value: {
            key: 'value'
          },
          isFixedValue: true
        }
      ],
      desc: '',
      hasMultiUsage: false,
      metadata: {
        internal_type: 'jira_projects',
        type: 'string'
      },
      name: 'input-1',
      required: false,
      type: 'String',
      default: undefined
    }
  ]
}
