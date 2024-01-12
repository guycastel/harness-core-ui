/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Color, FontVariation } from '@harness/design-system'
import { get, upperCase } from 'lodash-es'
import { FormInput, Layout, SelectOption, Text } from '@harness/uicore'
import { MultiTypeEnvironmentField } from '@pipeline/components/FormMultiTypeEnvironmentField/FormMultiTypeEnvironmentField'
import { FIELD_KEYS } from '@freeze-windows/types'
import { allEnvironmentsObj, isAllOptionSelected } from '@freeze-windows/utils/FreezeWindowStudioUtil'
import {
  EnvironmentTypeRenderer,
  ServiceEnvironmentFieldCommonPropsInterface
} from './FreezeStudioConfigSectionRenderers'
import css from './FreezeWindowStudioConfigSection.module.scss'

interface EnvironmentFieldPropsInterface extends ServiceEnvironmentFieldCommonPropsInterface {
  envTypeFilter: ('PreProduction' | 'Production')[] | undefined
  visibleOnlyAtProject?: boolean
  allEnvChecked: boolean | undefined
  setAllEnvChecked: React.Dispatch<React.SetStateAction<boolean | undefined>>
  setEnvTypeFilter: React.Dispatch<React.SetStateAction<('PreProduction' | 'Production')[] | undefined>>
}
export const EnvironmentField: React.FC<EnvironmentFieldPropsInterface> = ({
  index,
  getString,
  formikProps,
  allEnvChecked,
  setAllEnvChecked,
  visibleOnlyAtProject,
  setEnvTypeFilter,
  envTypeFilter
}) => {
  const { setFieldValue } = formikProps

  // Env Field variables
  const envEntityPath = `entity[${index}].${FIELD_KEYS.Environment}`
  const excludeEnvironmentCheckbox = `entity[${index}].${FIELD_KEYS.ExcludeEnvironmentCheckbox}`
  const excludeEnvironmentsField = `entity[${index}].${FIELD_KEYS.ExcludeEnvironment}`
  const envPath = !isAllOptionSelected(get(formikProps.values, envEntityPath)) ? envEntityPath : ''
  const [excludeSpecficEnvironments, setExcludeSpecificEnvironments] = React.useState<boolean>(
    get(formikProps.values, excludeEnvironmentCheckbox, false)
  )

  const onMultiSelectChangeForEnvironments = (items: SelectOption[]): void => {
    if (!excludeSpecficEnvironments) {
      setFieldValue(envEntityPath, items)
    } else {
      setFieldValue(excludeEnvironmentsField, items)
    }
  }
  return (
    <Layout.Vertical>
      <Layout.Horizontal
        spacing="medium"
        className={css.allScvEnvCheckbox}
        flex={{ alignItems: 'center', justifyContent: 'flex-start' }}
      >
        {visibleOnlyAtProject && (
          <EnvironmentTypeRenderer
            getString={getString}
            name={`entity[${index}].${FIELD_KEYS.EnvType}`}
            setEnvTypeFilter={setEnvTypeFilter}
          />
        )}
        <MultiTypeEnvironmentField
          labelClass={visibleOnlyAtProject ? css.selectEnvironment : undefined}
          label={getString('environments')}
          name={envPath}
          placeholder={getString('environments')}
          style={{ width: 400 }}
          disabled={allEnvChecked}
          isNewConnectorLabelVisible={false}
          isOnlyFixedType
          onMultiSelectChange={onMultiSelectChangeForEnvironments}
          isMultiSelect={true}
          onChange={item => {
            onMultiSelectChangeForEnvironments(item as SelectOption[])
          }}
          envTypeFilter={visibleOnlyAtProject ? envTypeFilter : undefined}
          hideRemoteDetails={true}
        />
        <Text font={{ variation: FontVariation.YAML }} margin={{ rigt: 'xsmall' }} color={Color.GREY_500}>
          {upperCase(getString('or'))}
        </Text>
        <FormInput.CheckBox
          name={`${envEntityPath}__${index}_allEnvironments`}
          label={getString('common.allEnvironments')}
          defaultChecked={allEnvChecked}
          onClick={val => {
            if (val.currentTarget.checked) {
              setFieldValue(envEntityPath, [allEnvironmentsObj(getString)])
              setAllEnvChecked(true)
            } else {
              setFieldValue(envEntityPath, undefined)
              setAllEnvChecked(false)
              // Exclude Environments Fields
              setFieldValue(excludeEnvironmentCheckbox, false)
              setFieldValue(excludeEnvironmentsField, undefined)
              setExcludeSpecificEnvironments(false)
            }
          }}
        />
      </Layout.Horizontal>
      <Layout.Vertical>
        <FormInput.CheckBox
          contentClassName={css.excludeServiceEnvCheckbox}
          name={excludeEnvironmentCheckbox}
          label={getString('freezeWindows.freezeStudio.excludeEnvironments')}
          disabled={!allEnvChecked}
          onChange={() => {
            setExcludeSpecificEnvironments(value => !value)
            setFieldValue(excludeEnvironmentsField, undefined)
          }}
        />
        {excludeSpecficEnvironments && (
          <MultiTypeEnvironmentField
            name={excludeEnvironmentsField}
            placeholder={getString('environments')}
            style={{ width: 400 }}
            disabled={!excludeSpecficEnvironments}
            isNewConnectorLabelVisible={false}
            isOnlyFixedType
            onMultiSelectChange={onMultiSelectChangeForEnvironments}
            isMultiSelect={true}
            onChange={item => {
              onMultiSelectChangeForEnvironments(item as SelectOption[])
            }}
          />
        )}
      </Layout.Vertical>
    </Layout.Vertical>
  )
}
