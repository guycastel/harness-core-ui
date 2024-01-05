/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useRef, useContext, useEffect, useMemo } from 'react'
import cx from 'classnames'
import * as Yup from 'yup'
import { Formik, FormikProps } from 'formik'
import { debounce, noop, get, defaultTo } from 'lodash-es'
import { Accordion, Card, Container, Text, FormikForm, HarnessDocTooltip, Icon } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { useParams } from 'react-router-dom'
import produce from 'immer'
import { NameIdDescriptionTags } from '@common/components/NameIdDescriptionTags/NameIdDescriptionTags'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { useStrings } from 'framework/strings'
import { usePipelineContext } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { isDuplicateStageId } from '@pipeline/components/PipelineStudio/StageBuilder/StageBuilderUtil'
import type { StringNGVariable } from 'services/cd-ng'
import type { PipelineStageElementConfig } from '@pipeline/utils/pipelineTypes'
import { getNameAndIdentifierSchema } from '@pipeline/utils/tempates'
import { isContextTypeNotStageTemplate } from '@pipeline/components/PipelineStudio/PipelineUtils'
import { StageErrorContext } from '@pipeline/context/StageErrorContext'
import ErrorsStripBinded from '@pipeline/components/ErrorsStrip/ErrorsStripBinded'
import { StepType } from '@pipeline/components/PipelineSteps/PipelineStepInterface'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import type { CustomVariablesData } from '@pipeline/components/PipelineSteps/Steps/CustomVariables/CustomVariableInputSet'
import type { CustomVariableEditableExtraProps } from '@pipeline/components/PipelineSteps/Steps/CustomVariables/CustomVariableEditable'
import { StepWidget } from '@pipeline/components/AbstractSteps/StepWidget'
import { usePipelineVariables } from '@pipeline/components/PipelineVariablesContext/PipelineVariablesContext'
import type { AllNGVariables } from '@pipeline/utils/types'
import type { AccountPathProps, ModulePathParams } from '@common/interfaces/RouteInterfaces'
import { useGetEntityMetadata } from '@common/hooks/useGetEntityMetadata'
import { EntityType } from '@common/pages/entityUsage/EntityConstants'
import { getWindowLocationUrl } from 'framework/utils/WindowLocation'
import { StageTimeout } from '@modules/75-cd/components/PipelineStudio/StageTimeout/StageTimeout'
import { PipelineStageTabs } from './utils'
import css from './PipelineStageOverview.module.scss'

export interface PipelineStageOverviewProps {
  children: React.ReactElement
}

export function PipelineStageOverview(props: PipelineStageOverviewProps): React.ReactElement {
  const {
    state: {
      pipeline: { stages },
      selectionState: { selectedStageId }
    },
    contextType,
    allowableTypes,
    stepsFactory,
    isReadonly,
    updateStage,
    getStageFromPipeline
  } = usePipelineContext()
  const { accountId } = useParams<AccountPathProps & ModulePathParams>()
  const { variablesPipeline, metadataMap } = usePipelineVariables()
  const { isNewNavEnabled } = useAppStore()
  const { stage } = getStageFromPipeline<PipelineStageElementConfig>(defaultTo(selectedStageId, ''))
  const { stage: stageFromVariablesPipeline } = getStageFromPipeline(
    get(stage, 'stage.identifier', ''),
    variablesPipeline
  )
  const allNGVariables = get(stage, 'stage.variables', []) as AllNGVariables[]
  const { getString } = useStrings()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const formikRef = useRef<FormikProps<unknown> | null>(null)
  const { subscribeForm, unSubscribeForm } = useContext(StageErrorContext)

  const pipelineIdentifier = get(stage, 'stage.spec.pipeline', '')
  const projectIdentifier = get(stage, 'stage.spec.project', '')
  const orgIdentifier = get(stage, 'stage.spec.org', '')

  const entityData = useGetEntityMetadata({
    entityInfo: {
      entityRef: {
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        identifier: pipelineIdentifier
      },
      type: EntityType.Pipelines
    },
    isNewNav: !!isNewNavEnabled
  })

  const updateStageDebounced = useMemo(() => debounce(updateStage, 300), [updateStage])

  useEffect(() => {
    subscribeForm({ tab: PipelineStageTabs.OVERVIEW, form: formikRef })
    return () => unSubscribeForm({ tab: PipelineStageTabs.OVERVIEW, form: formikRef })
  }, [])

  return (
    <div className={css.pipelineStageOverviewWrapper}>
      <ErrorsStripBinded domRef={scrollRef as React.MutableRefObject<HTMLElement | undefined>} />
      <div className={css.content} ref={scrollRef}>
        <Text font={{ variation: FontVariation.H5 }} margin={{ bottom: 'small' }} id="stageOverview">
          {getString('stageOverview')}
        </Text>
        <Container id="stageOverview">
          <Formik
            initialValues={{
              identifier: get(stage, 'stage.identifier'),
              name: get(stage, 'stage.name'),
              description: get(stage, 'stage.description'),
              tags: get(stage, 'stage.tags', {})
            }}
            validationSchema={Yup.object().shape(getNameAndIdentifierSchema(getString, contextType))}
            validate={values => {
              const errors: { name?: string } = {}
              /* istanbul ignore next */ if (
                isDuplicateStageId(get(values, 'identifier', ''), defaultTo(stages, []), true)
              ) {
                errors.name = getString('validation.identifierDuplicate')
              }
              /* istanbul ignore else */ if (stage?.stage) {
                updateStageDebounced(
                  produce(stage.stage, draft => {
                    ;(draft.name = get(values, 'name', '')),
                      (draft.identifier = get(values, 'identifier', '')),
                      (draft.description = get(values, 'description', '')),
                      (draft.tags = get(values, 'tags', {}))
                  })
                )
              }

              return errors
            }}
            onSubmit={noop}
          >
            {formikProps => {
              window.dispatchEvent(new CustomEvent('UPDATE_ERRORS_STRIP', { detail: PipelineStageTabs.OVERVIEW })) // to remove the error strip when there is no error
              formikRef.current = formikProps as FormikProps<unknown> | null

              return (
                <FormikForm>
                  {isContextTypeNotStageTemplate(contextType) && (
                    <Card className={css.sectionCard}>
                      <NameIdDescriptionTags
                        formikProps={formikProps}
                        descriptionProps={{
                          disabled: isReadonly
                        }}
                        identifierProps={{
                          isIdentifierEditable: false,
                          inputGroupProps: { disabled: isReadonly }
                        }}
                        tagsProps={{
                          disabled: isReadonly
                        }}
                      />
                    </Card>
                  )}
                </FormikForm>
              )
            }}
          </Formik>
        </Container>
        <Text font={{ variation: FontVariation.H5 }} margin={{ bottom: 'small', top: 'medium', left: 'small' }}>
          {getString('common.pipeline')}
        </Text>
        <Card className={css.sectionCard}>
          <a
            className={css.childPipelineDetails}
            rel="noreferrer"
            onClick={async e => {
              e.preventDefault()
              e.stopPropagation()
              const targetUrl = await entityData.getEntityURL()
              window.open(`${getWindowLocationUrl()}${targetUrl}`, '_blank')
            }}
          >
            <Icon name="chained-pipeline" color={Color.PRIMARY_7} size={20} margin={{ right: 'xsmall' }} />
            <Text font={{ variation: FontVariation.LEAD }} color={Color.PRIMARY_7} lineClamp={1}>
              {`${getString('common.pipeline')}: ${pipelineIdentifier}`}
            </Text>
            <Icon name="launch" color={Color.PRIMARY_7} size={16} margin={{ left: 'small' }} />
          </a>
        </Card>
        <Accordion
          activeId={/* istanbul ignore next */ allNGVariables.length > 0 ? 'advanced' : ''}
          className={css.accordion}
        >
          <Accordion.Panel
            id="advanced"
            addDomId={true}
            summary={
              <Text margin={{ right: 'small', left: 'small' }} font={{ variation: FontVariation.H5 }}>
                {getString('advancedTitle')}
              </Text>
            }
            details={
              <Card className={css.variableSectionCard} id="variables">
                <StageTimeout<PipelineStageElementConfig>
                  data={stage}
                  onChange={updateStageDebounced}
                  isReadonly={isReadonly}
                />
                <div className={cx(css.tabSubHeading, 'ng-tooltip-native')} data-tooltip-id="overviewStageVariables">
                  {getString('pipeline.stageVariables')}
                  <HarnessDocTooltip tooltipId="overviewStageVariables" useStandAlone={true} />
                </div>
                <StepWidget<CustomVariablesData, CustomVariableEditableExtraProps>
                  factory={stepsFactory}
                  initialValues={{
                    variables: allNGVariables,
                    canAddVariable: true
                  }}
                  readonly={isReadonly}
                  type={StepType.CustomVariable}
                  stepViewType={StepViewType.StageVariable}
                  allowableTypes={allowableTypes}
                  onUpdate={
                    /* istanbul ignore next */ ({ variables }: CustomVariablesData) => {
                      if (!stage?.stage) {
                        return
                      }
                      updateStageDebounced(
                        produce(stage.stage, draft => {
                          draft.variables = variables
                        })
                      )
                    }
                  }
                  customStepProps={{
                    tabName: PipelineStageTabs.OVERVIEW,
                    formName: 'addEditStageCustomVariableForm',
                    yamlProperties: defaultTo(
                      (get(stageFromVariablesPipeline, 'stage.variables', []) as AllNGVariables[])?.map?.(variable =>
                        get(metadataMap[defaultTo((variable as StringNGVariable).value, '')], 'yamlProperties', {})
                      ),
                      []
                    ),
                    enableValidation: true
                  }}
                />
              </Card>
            }
          />
        </Accordion>
        <Container margin={{ top: 'xxlarge' }} className={css.actionButtons}>
          {props.children}
        </Container>
      </div>
    </div>
  )
}
