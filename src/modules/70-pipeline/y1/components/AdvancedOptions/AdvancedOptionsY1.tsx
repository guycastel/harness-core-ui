/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import {
  Button,
  ButtonSize,
  ButtonVariation,
  Card,
  Container,
  Formik,
  HarnessDocTooltip,
  Heading,
  Icon,
  Layout,
  MultiTypeInputType,
  Text
} from '@harness/uicore'
import { FontVariation, Color } from '@harness/design-system'
import * as Yup from 'yup'
import { defaultTo, isEmpty, omit, set, unset } from 'lodash-es'
import { v4 as nameSpace, v5 as uuid } from 'uuid'
import { Page } from '@common/exports'
import { useStrings } from 'framework/strings'
import type { PipelineInfoConfig } from 'services/pipeline-ng'
import {
  FormMultiTypeDurationField,
  getDurationValidationSchema
} from '@common/components/MultiTypeDuration/MultiTypeDuration'
import { PublicAccessResponseType } from '@modules/70-pipeline/components/PipelineStudio/PipelineContext/PipelineActions'
import { useVariablesExpression } from '@modules/70-pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import DelegateSelectorPanel from '@modules/70-pipeline/components/PipelineSteps/AdvancedSteps/DelegateSelectorPanel/DelegateSelectorPanel'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { MapValue } from '@modules/10-common/components/MultiTypeCustomMap/MultiTypeCustomMap'
import MultiTypeMap from '@common/components/MultiTypeMap/MultiTypeMap'
import { useRuntimeInput } from '../../hooks/useRuntimeInput'
import { RuntimeInputType } from '../InputsForm/types'
import { usePipelineContextY1 } from '../PipelineContext/PipelineContextY1'
import css from './AdvancedOptionsY1.module.scss'
interface PipelineY1InfoConfig extends Omit<PipelineInfoConfig, 'name' | 'identifier'> {
  labels?: {
    [key: string]: string
  }
  name?: string
  identifier?: string
}
interface AdvancedOptionsProps {
  onApplyChanges: (data: AdvancedOptionFormProps) => void
  onDiscard: () => void
  pipeline: PipelineY1InfoConfig // TODO:: replace with V1 interface from BE
}
interface AdvancedOptionFormProps extends Omit<PipelineY1InfoConfig, 'labels'> {
  timeout?: string
  options?: {
    delegates?: string[]
  }
  labels?: MapValue
  publicAccessResponse?: PublicAccessResponseType
}

export function AdvancedOptionsY1({ onApplyChanges, onDiscard, pipeline }: AdvancedOptionsProps): React.ReactElement {
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const { renderRuntimeInput: renderRuntimeInputDelegate } = useRuntimeInput({
    type: RuntimeInputType.string,
    standalone: true
  })
  const { renderRuntimeInput } = useRuntimeInput({ type: RuntimeInputType.string })
  const { isReadonly } = usePipelineContextY1()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()

  const onSubmit = React.useCallback(
    async (data: AdvancedOptionFormProps) => {
      if (isEmpty(data.timeout)) {
        unset(data, 'timeout')
      }

      if (isEmpty(data?.options?.delegates) || data?.options?.delegates?.[0] === '') {
        unset(data, 'delegateSelectors')
      }
      // Sanitize execution labels
      let executionLabels
      if (data?.labels && !isEmpty(data.labels)) {
        executionLabels = data.labels.reduce(
          (agg: { [key: string]: string }, listValue: { key: string; value: string }) => ({
            ...agg,
            [listValue.key]: listValue.value
          }),
          {}
        )
      }
      set(data, 'labels', executionLabels)
      onApplyChanges(omit(data, 'publicAccessResponse'))
    },
    [onApplyChanges]
  )

  const executionLabels = React.useMemo(
    () =>
      Object.keys(defaultTo(pipeline?.labels, {}))?.map((key: string) => {
        const value = pipeline?.labels?.[key]
        return {
          id: uuid('', nameSpace()),
          key: key,
          value: defaultTo(value, '')
        }
      }),
    [pipeline?.labels]
  )

  return (
    <Formik<AdvancedOptionFormProps>
      formName="pipelineAdvancedOptions"
      validationSchema={Yup.object().shape({
        timeout: getDurationValidationSchema({ minimum: '10s' })
      })}
      initialValues={{
        ...pipeline,
        labels: executionLabels
      }}
      onSubmit={onSubmit}
    >
      {formikProps => (
        <>
          <Page.Header
            title={
              <Layout.Horizontal spacing="small" flex={{ justifyContent: 'center' }}>
                <Icon name="pipeline-advanced" color={Color.PRIMARY_7} size={24} />
                <Text font={{ variation: FontVariation.H4 }}>{getString('pipeline.advancedOptions')}</Text>
              </Layout.Horizontal>
            }
            toolbar={
              <Layout.Horizontal>
                <Button variation={ButtonVariation.SECONDARY} size={ButtonSize.SMALL} onClick={formikProps.submitForm}>
                  {getString('applyChanges')}
                </Button>
                <Button variation={ButtonVariation.LINK} size={ButtonSize.SMALL} onClick={onDiscard}>
                  {getString('common.discard')}
                </Button>
              </Layout.Horizontal>
            }
          />
          <Page.Body>
            <Container padding={'xlarge'}>
              <Layout.Vertical spacing="small" margin={{ bottom: 'large' }}>
                <Heading level={5} color={Color.GREY_900} data-tooltip-id="pipeline_execution_settings">
                  {getString('pipeline.executionSettings')}
                  <HarnessDocTooltip useStandAlone={true} tooltipId="pipeline_execution_settings" />
                </Heading>

                <Card>
                  <Layout.Vertical flex={{ justifyContent: 'flex-start' }}>
                    <Container className={css.container} margin={{ bottom: 'medium' }}>
                      <Text
                        color={Color.GREY_500}
                        style={{ marginBottom: 4 }}
                        font={{ variation: FontVariation.TABLE_HEADERS }}
                        className={css.uppercase}
                      >
                        {getString('name')}
                      </Text>
                      <Text
                        color={Color.GREY_500}
                        style={{ marginBottom: 4 }}
                        font={{ variation: FontVariation.TABLE_HEADERS }}
                        className={css.uppercase}
                      >
                        {getString('valueLabel')}
                      </Text>
                    </Container>
                    <Container className={css.container}>
                      <Text style={{ marginBottom: 4 }} font={{ variation: FontVariation.FORM_HELP }}>
                        {getString('optionalField', { name: getString('pipelineSteps.timeoutLabel') })}
                      </Text>
                      <FormMultiTypeDurationField
                        name="timeout"
                        style={{ width: 320 }}
                        label={''}
                        multiTypeDurationProps={{ enableConfigureOptions: true, expressions }}
                      />
                    </Container>
                    <Container className={css.container}>
                      <Text style={{ marginBottom: 4 }} font={{ variation: FontVariation.FORM_HELP }}>
                        {getString('pipeline.delegate.DelegateSelectorOptional')}
                      </Text>
                      <DelegateSelectorPanel
                        showLabelText={false}
                        multiTypeFieldSelectorProps={{ renderRuntimeInput: renderRuntimeInputDelegate }}
                        isReadonly={isReadonly}
                        name={'options.delegates'}
                      />
                    </Container>
                    <Container className={css.container}>
                      <Text style={{ marginBottom: 4 }} font={{ variation: FontVariation.FORM_HELP }}>
                        {getString('optionalField', { name: getString('pipeline.executionLabel') })}
                      </Text>
                      <MultiTypeMap
                        name={'labels'}
                        multiTypeFieldSelectorProps={{
                          disableTypeSelection: true,
                          label: '',
                          renderRuntimeInput
                        }}
                        valueMultiTextInputProps={{
                          allowableTypes: [
                            MultiTypeInputType.FIXED,
                            MultiTypeInputType.RUNTIMEV1,
                            MultiTypeInputType.EXPRESSION
                          ],
                          expressions,
                          newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
                        }}
                        keyValuePlaceholders={[
                          getString('common.namePlaceholder'),
                          getString('common.valuePlaceholder')
                        ]}
                        disabled={isReadonly}
                      />
                    </Container>
                  </Layout.Vertical>
                </Card>
              </Layout.Vertical>
            </Container>
          </Page.Body>
        </>
      )}
    </Formik>
  )
}
