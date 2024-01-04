/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { groupBy, isEmpty, omit, pick } from 'lodash-es'
import { FontVariation } from '@harness/design-system'
import { Accordion, Container, FormInput, Icon, Layout, MultiTypeInputType, Text } from '@harness/uicore'
import { JsonNode } from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import { InputComponentRenderer } from '../InputFactory/InputComponentRenderer'
import inputComponentFactory from '../InputFactory/InputComponentFactory'
import { UIRuntimeInput } from '../InputsForm/types'
import css from './StepPanel.module.scss'

interface StepRendererProps {
  stepParamters: JsonNode | undefined
  isReadonly: boolean
  isNewStep: boolean
}
interface EntityInput extends UIRuntimeInput {
  path: string
}

const metadataKeys = ['name', 'identifier', 'type', 'id']
const advancedKeys = ['enforce', 'failureStrategies', 'strategy', 'when']

function StepRenderer({ stepParamters, isReadonly, isNewStep }: StepRendererProps): JSX.Element {
  const { getString } = useStrings()

  const renderEntityForm = React.useMemo(() => {
    const metaDataProperties = pick(stepParamters, metadataKeys) as JsonNode
    const advancedProperties = pick(stepParamters, advancedKeys) as JsonNode
    const entityProperties = omit(stepParamters, [...metadataKeys, ...advancedKeys]) as JsonNode

    const separatedSchema = groupBy(entityProperties, 'mandatory')
    const requiredFields = separatedSchema['true'] || []
    const optionalFields = separatedSchema['false'] || []

    const optionalFieldsSection = (): JSX.Element => {
      return (
        <>
          {optionalFields.map((input: EntityInput) => {
            return (
              <InputComponentRenderer
                key={input.path}
                path={input.path}
                allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIMEV1, MultiTypeInputType.EXPRESSION]} // TODO:: fetch from context or prop
                factory={inputComponentFactory}
                readonly={isReadonly}
                input={input}
              />
            )
          })}
          {/*  Advanced Properties */}
          {Object.entries(advancedProperties)?.map(([key, value]) => {
            return (
              <InputComponentRenderer
                key={key}
                path={value.path}
                allowableTypes={[MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIMEV1, MultiTypeInputType.EXPRESSION]} // TODO:: fetch from context or prop
                factory={inputComponentFactory}
                readonly={isReadonly}
                input={value}
              />
            )
          })}
        </>
      )
    }

    return (
      <Layout.Vertical width="100%" height="100%" className={cx(css.overflow)} padding={{ right: 'medium' }}>
        <Container margin={0} padding={{ left: 'large' }} width={'90%'}>
          {!isEmpty(metaDataProperties) && (
            <>
              {/* NAME_IDENTIFIER FIELD */}
              <FormInput.InputWithIdentifier
                inputLabel={getString('pipelineSteps.stepNameLabel')}
                isIdentifierEditable={isNewStep && !isReadonly}
                idName="id"
                inputGroupProps={{
                  placeholder: getString('pipeline.stepNamePlaceholder'),
                  disabled: isReadonly
                }}
              />
              {/* DESCRIPTION FIELD */}
              <FormInput.TextArea label="Description" name={'description'} disabled={false} />
            </>
          )}
          {/* REQUIRED FIELDS */}
          {requiredFields.length > 0 ? (
            requiredFields.map((input: EntityInput) => {
              return (
                <InputComponentRenderer
                  key={input.path}
                  path={input.path}
                  allowableTypes={[
                    MultiTypeInputType.FIXED,
                    MultiTypeInputType.RUNTIMEV1,
                    MultiTypeInputType.EXPRESSION
                  ]} // TODO:: fetch from context or prop
                  factory={inputComponentFactory}
                  readonly={isReadonly}
                  input={input}
                />
              )
            })
          ) : (
            <></>
          )}
          {/* OPTIONAL FIELDS */}
          {requiredFields.length > 0 && optionalFields.length > 0 ? (
            <Accordion>
              <Accordion.Panel
                id="optional-config"
                summary={getString('common.optionalConfig')}
                details={optionalFieldsSection()}
              />
            </Accordion>
          ) : optionalFields.length > 0 ? (
            optionalFieldsSection()
          ) : (
            <></>
          )}
        </Container>
      </Layout.Vertical>
    )
  }, [getString, isNewStep, isReadonly, stepParamters])

  return isEmpty(stepParamters) ? (
    <Layout.Vertical flex={{ justifyContent: 'center' }} spacing="large" height="100%" width="100%">
      <Icon name="plugin-inputs" size={35} />
      <Text font={{ variation: FontVariation.BODY2 }}>{getString('pipeline.stepPanel.noPropertiesFound')}</Text>
    </Layout.Vertical>
  ) : (
    renderEntityForm
  )
}

export default StepRenderer
