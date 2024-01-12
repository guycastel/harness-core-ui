/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Color, FontVariation } from '@harness/design-system'
import { FormInput, Layout, SelectOption, Text } from '@harness/uicore'
import { get, upperCase } from 'lodash-es'
import { FIELD_KEYS } from '@freeze-windows/types'
import { allServicesObj, isAllOptionSelected } from '@freeze-windows/utils/FreezeWindowStudioUtil'
import { MultiTypeServiceField } from '@pipeline/components/FormMultiTypeServiceFeild/FormMultiTypeServiceFeild'
import { ServiceEnvironmentFieldCommonPropsInterface } from './FreezeStudioConfigSectionRenderers'
import css from './FreezeWindowStudioConfigSection.module.scss'

interface ServiceFieldPropsInterface extends ServiceEnvironmentFieldCommonPropsInterface {
  allServiceChecked: boolean | undefined
  setAllServicesChecked: React.Dispatch<React.SetStateAction<boolean | undefined>>
}
export const ServiceField: React.FC<ServiceFieldPropsInterface> = ({
  index,
  getString,
  formikProps,
  allServiceChecked,
  setAllServicesChecked
}) => {
  const { setFieldValue } = formikProps

  // Service Field variables
  const serviceEntityPath = `entity[${index}].${FIELD_KEYS.Service}`
  const excludeServiceCheckbox = `entity[${index}].${FIELD_KEYS.ExcludeServiceCheckbox}`
  const excludeServicesField = `entity[${index}].${FIELD_KEYS.ExcludeService}`
  const servicePath = !isAllOptionSelected(get(formikProps.values, serviceEntityPath)) ? serviceEntityPath : ''
  const [excludeSpecficServices, setExcludeSpecificServices] = React.useState<boolean>(
    get(formikProps.values, excludeServiceCheckbox, false)
  )

  const onMultiSelectChangeForServices = (items: SelectOption[]): void => {
    if (!excludeSpecficServices) {
      setFieldValue(serviceEntityPath, items)
    } else {
      setFieldValue(excludeServicesField, items)
    }
  }

  return (
    <Layout.Vertical>
      <Layout.Horizontal
        flex={{ alignItems: 'center', justifyContent: 'flex-start' }}
        className={css.allScvEnvCheckbox}
        spacing="medium"
      >
        <MultiTypeServiceField
          name={servicePath}
          label={getString('services')}
          disabled={allServiceChecked}
          placeholder={getString('services')}
          style={{ width: 400 }}
          isNewConnectorLabelVisible={false}
          isOnlyFixedType
          isMultiSelect={true}
          onMultiSelectChange={onMultiSelectChangeForServices}
          onChange={item => {
            onMultiSelectChangeForServices(item as SelectOption[])
          }}
          hideRemoteDetails={true}
        />
        <Text font={{ variation: FontVariation.YAML }} margin={{ rigt: 'xsmall' }} color={Color.GREY_500}>
          {upperCase(getString('or'))}
        </Text>
        <FormInput.CheckBox
          label={getString('common.allServices')}
          name={`${serviceEntityPath}__${index}_allServices`}
          defaultChecked={allServiceChecked}
          onClick={val => {
            if (val.currentTarget.checked) {
              setAllServicesChecked(true)
              setFieldValue(serviceEntityPath, [allServicesObj(getString)])
            } else {
              setAllServicesChecked(false)
              setFieldValue(serviceEntityPath, undefined)
              // Exclude Services Fields
              setFieldValue(excludeServiceCheckbox, false)
              setFieldValue(excludeServicesField, undefined)
              setExcludeSpecificServices(false)
            }
          }}
        />
      </Layout.Horizontal>
      <FormInput.CheckBox
        contentClassName={css.excludeServiceEnvCheckbox}
        name={excludeServiceCheckbox}
        label={getString('freezeWindows.freezeStudio.excludeServices')}
        disabled={!allServiceChecked}
        onChange={() => {
          setExcludeSpecificServices(value => !value)
          setFieldValue(excludeServicesField, undefined)
        }}
      />
      {excludeSpecficServices && (
        <MultiTypeServiceField
          name={excludeServicesField}
          disabled={!excludeSpecficServices}
          placeholder={getString('services')}
          style={{ width: 400 }}
          isNewConnectorLabelVisible={false}
          isOnlyFixedType
          isMultiSelect={true}
          onMultiSelectChange={onMultiSelectChangeForServices}
          onChange={item => {
            onMultiSelectChangeForServices(item as SelectOption[])
          }}
        />
      )}
    </Layout.Vertical>
  )
}
