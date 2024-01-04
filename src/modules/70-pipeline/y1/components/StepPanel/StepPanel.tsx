/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useState } from 'react'
import {
  Button,
  ButtonVariation,
  Card,
  Container,
  Formik,
  FormikForm,
  Heading,
  Icon,
  Layout,
  Tab,
  Tabs,
  Text,
  useConfirmationDialog
} from '@harness/uicore'
import { Color, FontVariation, Intent } from '@harness/design-system'
import { isEmpty, isEqual } from 'lodash-es'
import { useGetIndividualStaticSchemaQuery } from '@harnessio/react-pipeline-service-client'
import { Spinner } from '@blueprintjs/core'
import { useStrings } from 'framework/strings'
import { StageType } from '@modules/70-pipeline/utils/stageHelpers'
import { getStepPaletteModuleInfosFromStage } from '@modules/70-pipeline/utils/stepUtils'
import { getStepPropertiesFromSchema } from '@modules/70-pipeline/components/PipelineStudio/PipelineSchema/JsonSchemaExtractor'
import { JsonNode } from 'services/cd-ng'
import { useGlobalEventListener } from '@modules/10-common/hooks'
import StepPallete, { StepListData } from './StepPallete/StepPallete'
import StepRenderer from './StepRenderer'
import { usePipelineContextY1 } from '../PipelineContext/PipelineContextY1'
import { CategoryData, StepPanelCategory } from './types'
import css from './StepPanel.module.scss'

declare global {
  interface WindowEventMap {
    RESET_STEP_PANEL: CustomEvent<{ reset: boolean }>
  }
}

enum StepPanelView {
  Category = 'CATEGORY',
  List = 'LIST',
  Configuration = 'CONFIGURATION'
}

interface StepPanelProps {
  selectedStepDataFromYAMLView?: JsonNode
  onStepAddUpdate?: (pluginMetadata: JsonNode) => void
  setSelectedEntityPath: React.Dispatch<React.SetStateAction<string[] | undefined>>
}

function StepPanel(props: StepPanelProps): JSX.Element {
  const { selectedStepDataFromYAMLView, onStepAddUpdate, setSelectedEntityPath } = props
  const { getString } = useStrings()
  const { isReadonly } = usePipelineContextY1()
  const [stepPanelView, setStepPanelView] = useState<StepPanelView>(StepPanelView.Category)
  const [stepCategory, setStepCategory] = useState<StepPanelCategory>(StepPanelCategory.AddStep)

  const [selectedStepType, setSelectedStepType] = useState<string>()
  const [stepInitialValues, setStepInitialValue] = useState<JsonNode>({})
  const [selectedStepSchemaProperties, setSelectedStepSchemaProperties] = useState<JsonNode>()
  const [isStepUpdateAction, setIsStepUpdateAction] = useState<boolean>(false)
  const [isFormInSyncWithYAML, setIsFormInSyncWithYAML] = useState(true)

  const { data, isLoading } = useGetIndividualStaticSchemaQuery(
    {
      queryParams: {
        version: 'v1',
        ...(selectedStepType === 'group'
          ? {
              node_group: 'step_group',
              node_group_differentiator: 'cd' // TODO:: Add stage_type from YAML - BE support added for cd only
            }
          : { node_group: 'step', node_type: selectedStepType })
      }
    },
    {
      enabled: !!selectedStepType
    }
  )

  const setStepPanelBasedOnCurrentConfiguration = useCallback((): void => {
    if (stepPanelView === StepPanelView.Configuration) {
      if (stepCategory !== StepPanelCategory.AddStep) {
        setStepPanelView(StepPanelView.Category)
      } else {
        setStepPanelView(StepPanelView.List)
      }
    } else if (stepPanelView === StepPanelView.List) {
      setStepPanelView(StepPanelView.Category)
    }
  }, [stepCategory, stepPanelView])

  const { openDialog: openConfirmationOfStepUpdate } = useConfirmationDialog({
    contentText: getString('pipeline.stepPanel.discardPopover.subtitle'),
    titleText: getString('pipeline.stepPanel.discardPopover.title'),
    confirmButtonText: getString('confirm'),
    cancelButtonText: getString('cancel'),
    intent: Intent.WARNING,
    onCloseDialog: isConfirmed => {
      if (isConfirmed) {
        // close step panel and move to home page
        setStepPanelBasedOnCurrentConfiguration()
        resetStates()
      }
    },
    className: css.dialogWrapper
  })

  useEffect(() => {
    if (data?.content?.data) {
      // Set schema properties for form on step type change
      const isTypeStepGroup = selectedStepType === 'group'
      const structuredData = getStepPropertiesFromSchema(data.content.data, isTypeStepGroup)
      if (structuredData?.properties) {
        setSelectedStepSchemaProperties(structuredData.properties)
      }
    }
  }, [data?.content?.data, selectedStepType])

  const resetStates = useCallback((): void => {
    setSelectedEntityPath(undefined)
    setIsStepUpdateAction(false)
    setSelectedStepType(undefined)
    setSelectedStepSchemaProperties(undefined)
  }, [setSelectedEntityPath])

  useGlobalEventListener('RESET_STEP_PANEL', event => {
    const { detail } = event

    if (detail.reset) {
      resetStates()
      setStepPanelBasedOnCurrentConfiguration()
    }
  })

  const handleBackArrowClick = useCallback((): void => {
    setStepPanelBasedOnCurrentConfiguration()
    resetStates()
  }, [resetStates, setStepPanelBasedOnCurrentConfiguration])

  React.useEffect(() => {
    // If step data exists from parent for selected path -> Update mode of form
    !isEmpty(selectedStepDataFromYAMLView) && setIsStepUpdateAction(true)
  }, [selectedStepDataFromYAMLView])

  React.useEffect(() => {
    // Updating form from the YAML data only if in update mode
    if (selectedStepDataFromYAMLView && !isEmpty(selectedStepDataFromYAMLView) && isStepUpdateAction) {
      setSelectedStepType(selectedStepDataFromYAMLView.type)
      setStepPanelView(StepPanelView.Configuration)
      setStepInitialValue(selectedStepDataFromYAMLView)
      setIsFormInSyncWithYAML(true)
    }
  }, [isStepUpdateAction, selectedStepDataFromYAMLView])

  const onStepSelection = useCallback(
    (step: StepListData): void => {
      const stepInitialValue = {
        type: step.type,
        spec: {}
      }
      setSelectedStepType(step.type)
      setStepInitialValue(stepInitialValue)
      setStepPanelView(StepPanelView.Configuration)
      // Add boilerplate code on step selection
      try {
        onStepAddUpdate?.(stepInitialValue)
      } catch (e) {
        //ignore error
      }
    },
    [onStepAddUpdate]
  )

  const onStepGroupStepSelection = useCallback((): void => {
    const stepInitialValue = {
      type: 'group',
      spec: { steps: [] }
    }
    setSelectedStepType('group')
    setStepInitialValue(stepInitialValue)
    setStepPanelView(StepPanelView.Configuration)
    // Add boilerplate code on stepGroup selection
    try {
      onStepAddUpdate?.(stepInitialValue)
    } catch (e) {
      //ignore error
    }
  }, [onStepAddUpdate])

  const renderStepPanelCategoryView = useCallback((): JSX.Element => {
    const categories: CategoryData[] = [
      {
        category: StepPanelCategory.AddStep,
        label: getString('addStep'),
        description: getString('pipeline.stepPanel.runHarnessStep'),
        iconName: 'chained-pipeline'
      },
      {
        category: StepPanelCategory.AddStepGroup,
        label: getString('addStepGroup'),
        iconName: 'step-group',
        description: getString('pipeline.stepPanel.runHarnessStepGroup')
      },
      {
        category: StepPanelCategory.UseStepTemplate,
        label: getString('pipeline.stepPanel.useStepTemplate'),
        iconName: 'template-library',
        disabled: true
      },
      {
        category: StepPanelCategory.Harness,
        label: `${getString('harness')} ${getString('common.plugins')}`,
        description: getString('common.plugin.harnessPluginsDesc'),
        iconName: 'harness-plugin',
        disabled: true
      },
      {
        category: StepPanelCategory.Bitrise,
        label: `${getString('common.bitrise')} ${getString('common.plugins')}`,
        description: getString('common.plugin.bitrisePluginsDesc'),
        iconName: 'bitrise-plugin',
        disabled: true
      },
      {
        category: StepPanelCategory.GithubActions,
        label: `${getString('common.gitHubActions')}`,
        description: getString('common.plugin.gitHubActionsPluginsDesc'),
        iconName: 'github-action-plugin',
        disabled: true
      }
    ]
    return (
      <Layout.Vertical>
        <Heading
          level={2}
          color={Color.GREY_900}
          padding={{ top: 'xxxlarge', bottom: 'xlarge', left: 'large', right: 'large' }}
          className={css.stepCategoryHeader}
        >
          {getString('pipeline.stepPanel.steps')}
        </Heading>
        <Container padding={{ left: 0, top: 'large', bottom: 'large', right: 'large' }}>
          {categories.map((item: CategoryData) => {
            const { category, label, description, iconName, disabled } = item
            return (
              <Container key={category} padding={{ bottom: 'small' }}>
                <Card
                  className={css.stepCategory}
                  disabled={!!disabled}
                  onClick={() => {
                    setStepCategory(category)
                    if (category === StepPanelCategory.AddStepGroup) {
                      onStepGroupStepSelection()
                    } else {
                      setStepPanelView(StepPanelView.List)
                    }
                  }}
                >
                  <Layout.Horizontal flex={{ justifyContent: 'space-between' }}>
                    <Container flex>
                      <Icon name={iconName} color={Color.PRIMARY_7} size={22} />
                      <Layout.Vertical spacing="small" padding={{ left: 'small' }}>
                        <Text font={{ variation: FontVariation.BODY2 }}>{label}</Text>
                        {description && <Text font={{ variation: FontVariation.TINY }}>{description}</Text>}
                      </Layout.Vertical>
                    </Container>
                    <Icon name={'arrow-right'} color={Color.GREY_500} size={20} />
                  </Layout.Horizontal>
                </Card>
              </Container>
            )
          })}
        </Container>
      </Layout.Vertical>
    )
  }, [getString, onStepGroupStepSelection])

  const renderStepPanelListView = useCallback((): JSX.Element => {
    return (
      <Layout.Vertical>
        <Container className={css.listHeader}>
          <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} spacing="small">
            <Icon name="arrow-left" onClick={handleBackArrowClick} className={css.backBtn} />
            <Text font={{ variation: FontVariation.H5 }}>{`${getString('select')} ${getString('addStep')}`}</Text>
          </Layout.Horizontal>
        </Container>
        <StepPallete
          onSelect={onStepSelection}
          stageType={StageType.CUSTOM}
          stepPaletteModuleInfos={getStepPaletteModuleInfosFromStage()}
        />
      </Layout.Vertical>
    )
  }, [handleBackArrowClick, getString, onStepSelection])

  const renderStepPanelConfigurationView = useCallback((): JSX.Element => {
    return (
      <>
        <Layout.Vertical spacing="medium" margin={{ top: 'large', bottom: 'xxlarge' }}>
          <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} spacing="small">
            <Icon name="arrow-left" onClick={handleBackArrowClick} className={css.backBtn} />
            <Text font={{ variation: FontVariation.H5 }}>{selectedStepType}</Text>
          </Layout.Horizontal>

          <Tabs id={'stepPanel'} defaultSelectedTabId={'configuration'} className={css.tabs}>
            <Tab
              id="configuration"
              title={
                <Text
                  font={{ variation: FontVariation.BODY2 }}
                  padding={{ left: 'small', bottom: 'xsmall', top: 'xsmall' }}
                  color={Color.PRIMARY_7}
                >
                  {getString('configuration')}
                </Text>
              }
              panel={
                <Container>
                  {isLoading ? (
                    <Spinner size={Spinner.SIZE_SMALL} />
                  ) : (
                    <Formik
                      initialValues={stepInitialValues}
                      enableReinitialize={true}
                      formName="stepsConfigurationForm"
                      validate={values => {
                        if (selectedStepDataFromYAMLView) {
                          setIsFormInSyncWithYAML(isEqual(selectedStepDataFromYAMLView, values))
                        }
                      }}
                      onSubmit={formValues => {
                        try {
                          onStepAddUpdate?.(formValues)
                        } catch (e) {
                          //ignore error
                        }
                      }}
                    >
                      {_formikProps => {
                        return (
                          <FormikForm>
                            <Layout.Vertical
                              height="70vh"
                              flex={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                              spacing="small"
                              margin={{ bottom: 'xlarge' }}
                            >
                              <StepRenderer
                                stepParamters={selectedStepSchemaProperties}
                                isReadonly={isReadonly}
                                isNewStep={!isStepUpdateAction}
                              />
                              <Layout.Vertical padding={{ top: 'medium', left: 'large' }}>
                                <Container>
                                  <Button
                                    text={isStepUpdateAction ? getString('update') : getString('add')}
                                    variation={ButtonVariation.PRIMARY}
                                    disabled={isFormInSyncWithYAML && isStepUpdateAction}
                                    type="submit"
                                  />
                                  <Button
                                    margin={{ left: 'large' }}
                                    onClick={() => {
                                      if (isFormInSyncWithYAML) {
                                        // go to home if no unsaved changes
                                        setSelectedEntityPath(undefined)
                                        setStepPanelView(StepPanelView.Category)
                                      } else {
                                        openConfirmationOfStepUpdate()
                                      }
                                    }}
                                    variation={ButtonVariation.SECONDARY}
                                    text={getString('cancel')}
                                  />
                                </Container>
                              </Layout.Vertical>
                            </Layout.Vertical>
                          </FormikForm>
                        )
                      }}
                    </Formik>
                  )}
                </Container>
              }
            />
          </Tabs>
        </Layout.Vertical>
      </>
    )
  }, [
    handleBackArrowClick,
    selectedStepType,
    getString,
    isLoading,
    stepInitialValues,
    selectedStepDataFromYAMLView,
    onStepAddUpdate,
    selectedStepSchemaProperties,
    isReadonly,
    isStepUpdateAction,
    isFormInSyncWithYAML,
    setSelectedEntityPath,
    openConfirmationOfStepUpdate
  ])

  const renderStepsPanel = useCallback((): JSX.Element => {
    switch (stepPanelView) {
      case StepPanelView.Category:
        return renderStepPanelCategoryView()
      case StepPanelView.Configuration:
        return renderStepPanelConfigurationView()
      case StepPanelView.List:
        return renderStepPanelListView()
      default:
        return <></>
    }
  }, [renderStepPanelCategoryView, renderStepPanelConfigurationView, renderStepPanelListView, stepPanelView])

  return <Container className={css.tabs}>{renderStepsPanel()}</Container>
}

export default StepPanel
