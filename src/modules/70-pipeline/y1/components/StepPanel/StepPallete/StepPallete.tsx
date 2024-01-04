/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { defaultTo, isEmpty, uniqBy } from 'lodash-es'
import cx from 'classnames'
import { Container, Icon, Layout, Text, ExpandingSearchInput } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { StepCategory, StepData, StepPalleteModuleInfo, useGetStepsV2 } from 'services/pipeline-ng'
import { useMutateAsGet } from '@modules/10-common/hooks'
import { StageType } from '@modules/70-pipeline/utils/stageHelpers'
import { useStrings } from 'framework/strings'
import { PluginMetadataResponse } from 'services/ci'
import { usePipelineContextY1 } from '../../PipelineContext/PipelineContextY1'
import css from '../StepPanel.module.scss'

export interface StepPaletteProps {
  onSelect: (item: StepListData) => void
  stepPaletteModuleInfos: StepPalleteModuleInfo[]
  stageType: StageType
}

export type StepListData = StepData & PluginMetadataResponse

interface NoDataSectionProps {
  stepsList: StepData[]
  stepsDataLoading: boolean
}

function NoDataSection({ stepsDataLoading = false, stepsList }: NoDataSectionProps): React.ReactElement | null {
  const { getString } = useStrings()
  const message = stepsDataLoading
    ? getString('stepPalette.loadingSteps')
    : isEmpty(stepsList)
    ? getString('stepPalette.noSearchResultsFound')
    : ''
  return message ? (
    <Container flex={{ justifyContent: 'center', alignItems: 'center' }} padding={{ top: 'huge' }}>
      {message}
    </Container>
  ) : null
}

function StepPallete(props: StepPaletteProps): JSX.Element {
  const { onSelect } = props
  const { stepsFactory } = usePipelineContextY1()
  const { accountId } = useParams<{ module: string; accountId: string }>()
  const [stepsList, setStepsList] = useState<StepData[]>([])
  const [originalStepList, setOriginalStepList] = useState<StepData[]>([])

  const { data: stepsData, loading: stepsDataLoading } = useMutateAsGet(useGetStepsV2, {
    queryParams: {
      accountId
    },
    body: { stepPalleteModuleInfos: [] }
  })

  useEffect(() => {
    const allStepDataCategorised = stepsData?.data?.stepCategories
    const allStepsData: StepData[] = []
    allStepDataCategorised?.forEach(stepCat => {
      if (stepCat?.stepCategories?.length) {
        stepCat.stepCategories.forEach(stepCategory => {
          // Each category has steps data inside it
          defaultTo(stepCategory.stepCategories, [])?.forEach((nestedStepCategory: StepCategory) => {
            allStepsData.push(...defaultTo(nestedStepCategory?.stepsData, []))
          })
          allStepsData.push(...defaultTo(stepCategory?.stepsData, []))
        })
      }
    })

    setStepsList(allStepsData)
    setOriginalStepList(allStepsData)
  }, [stepsData?.data?.stepCategories])

  const renderEntityDetails = useCallback(
    (step: StepListData, index?: number): JSX.Element => {
      const { name, description, type } = step
      const icon = stepsFactory.getStepIcon(defaultTo(type, ''))
      return (
        <Layout.Vertical
          className={css.stepList}
          width="100%"
          flex={{ justifyContent: 'space-between' }}
          onClick={() => {
            onSelect({
              name: defaultTo(step.name, ''),
              type: defaultTo(step.type, '')
            })
          }}
          key={index}
        >
          <Layout.Horizontal width="100%" flex={{ alignItems: 'center' }}>
            <Icon name={icon} size={20} className={css.stepIcon} />
            <Text font={{ variation: FontVariation.BODY2 }} width="100%" padding={{ left: 'small' }}>
              {name}
            </Text>
          </Layout.Horizontal>
          <Text padding={{ top: 'small' }} font={{ variation: FontVariation.TINY }} lineClamp={1} width="85%">
            {description}
          </Text>
        </Layout.Vertical>
      )
    },
    [onSelect, stepsFactory]
  )

  const filterSteps = (stepName: string): void => {
    const name = stepName.toLowerCase()

    const filteredData = originalStepList.filter(step => {
      return step.name?.toLowerCase().indexOf(name) !== -1
    })

    const uniqueData: StepData[] = uniqBy(filteredData, 'name')
    setStepsList(uniqueData)
  }

  return (
    <Container className={css.tabContentWrapper}>
      <Layout.Vertical padding={{ bottom: 'xlarge' }} spacing="large">
        <Container padding={{ bottom: 'large' }} className={css.expandingSearch}>
          <ExpandingSearchInput
            alwaysExpanded
            autoFocus
            throttle={200}
            onChange={(text: string) => filterSteps(text)}
            width={'90%'}
          />
        </Container>
        <NoDataSection stepsDataLoading={stepsDataLoading} stepsList={stepsList} />
        <Container className={cx(css.overflow, css.zeroMargin, css.stepContentPanel)}>
          {stepsList?.map((stepData, index) => {
            return renderEntityDetails(stepData, index)
          })}
        </Container>
      </Layout.Vertical>
    </Container>
  )
}

export default StepPallete
