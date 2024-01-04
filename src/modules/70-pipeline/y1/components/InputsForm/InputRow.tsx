/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { Container, Layout, MultiTypeInputType, Text } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { Position } from '@blueprintjs/core'
import { isEmpty } from 'lodash-es'
import { useStrings } from 'framework/strings'
import { UIRuntimeInput } from './types'
import { InputComponentRenderer } from '../InputFactory/InputComponentRenderer'
import inputComponentFactory from '../InputFactory/InputComponentFactory'
import css from './InputsForm.module.scss'

export interface InputRowProps {
  input: UIRuntimeInput
}

export function InputRow({ input }: InputRowProps): React.ReactElement {
  const { name, type, desc } = input

  return (
    <div className={css.inputRow}>
      <Container>
        <Layout.Horizontal flex={{ justifyContent: 'start' }}>
          <Text lineClamp={1} color={Color.BLACK}>
            {name}
          </Text>
          {!isEmpty(desc) && (
            <Text
              icon="description"
              inline
              padding={'small'}
              iconProps={{ size: 16 }}
              tooltip={desc}
              tooltipProps={{
                position: Position.TOP,
                isDark: true
              }}
            />
          )}
        </Layout.Horizontal>
        <Text color={Color.GREY_350}>{type}</Text>
      </Container>
      <Container>
        <InputComponentRenderer
          path={input.name}
          allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION]}
          factory={inputComponentFactory}
          readonly={false}
          input={input}
        />
      </Container>
    </div>
  )
}

export function InputRowHeader(): React.ReactElement {
  const { getString } = useStrings()

  return (
    <div className={cx(css.inputRow, css.inputRowHeader)}>
      <Text font={{ variation: FontVariation.TABLE_HEADERS }}>{getString('pipeline.inputs.name')}</Text>
      <Text font={{ variation: FontVariation.TABLE_HEADERS }}>{getString('pipeline.inputs.value')}</Text>
    </div>
  )
}
