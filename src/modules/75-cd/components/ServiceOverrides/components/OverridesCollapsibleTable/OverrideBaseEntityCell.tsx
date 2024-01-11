/*
 * Copyright 2024 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { ColumnInstance, Renderer, Row, UseExpandedRowProps } from 'react-table'
import React from 'react'
import { noop } from 'lodash-es'
import { Formik, FormikForm, Text, Container } from '@harness/uicore'
import * as Yup from 'yup'
import type { FormikProps } from 'formik'
import { killEvent } from '@common/utils/eventUtils'
import { useStrings } from 'framework/strings'
import InfrastructureSelect from '@cd/components/ServiceOverrides/components/ListRows/Editable/RowItemFromValue/InfrastructureSelect'
import ScopedEntitySelect from '@cd/components/ServiceOverrides/components/ListRows/Editable/RowItemFromValue/ScopedEntitySelect/ScopedEntitySelect'
import {
  EnvironmentRefFormState,
  InfraIdentifierFormState,
  ServiceOverrideSectionProps,
  ServiceOverridesResponseDTOV2,
  ServiceRefFormState
} from '@cd/components/ServiceOverrides/ServiceOverridesUtils'
import { useServiceOverridesContext } from '@cd/components/ServiceOverrides/context/ServiceOverrideContext'
import css from './OverridesCollapsibleTable.module.scss'

interface OverrideBaseEntityCellProps {
  headerConfigAccessKey: 'environmentRef' | 'serviceRef' | 'infraIdentifier'
}

export const OverrideBaseEntityCell: Renderer<{
  row: UseExpandedRowProps<ServiceOverrideSectionProps> & Row<ServiceOverrideSectionProps>
  column: ColumnInstance<ServiceOverrideSectionProps> & OverrideBaseEntityCellProps
}> = ({ row, column }) => {
  const overrideResponseData = (row.original?.overrideResponse || {}) as ServiceOverridesResponseDTOV2
  const { headerConfigAccessKey, width } = column
  const isNewOverrideSection = row.original?.isNew
  const {
    newOverrideEnvironmentInputRef,
    newOverrideServiceInputRef,
    newOverrideInfraInputRef,
    newOverrideEnvironmentInputValue
  } = useServiceOverridesContext()
  const { getString } = useStrings()

  if (isNewOverrideSection) {
    if (headerConfigAccessKey === 'environmentRef') {
      return (
        <Formik<EnvironmentRefFormState>
          initialValues={{ environmentRef: '' }}
          onSubmit={noop}
          innerRef={newOverrideEnvironmentInputRef as React.MutableRefObject<FormikProps<EnvironmentRefFormState>>}
          validationSchema={Yup.object().shape({
            environmentRef: Yup.string().required(getString('fieldRequired', { field: getString('environment') }))
          })}
          formName="environmentRef-input"
        >
          <FormikForm>
            <ScopedEntitySelect fieldKey="environmentRef" width={240} />
          </FormikForm>
        </Formik>
      )
    } else if (headerConfigAccessKey === 'serviceRef') {
      return (
        <Formik<ServiceRefFormState>
          initialValues={{ serviceRef: '' }}
          onSubmit={noop}
          innerRef={newOverrideServiceInputRef as React.MutableRefObject<FormikProps<ServiceRefFormState>>}
          validationSchema={Yup.object().shape({
            serviceRef: Yup.string().required(getString('fieldRequired', { field: getString('service') }))
          })}
          formName="serviceRef-input"
        >
          <FormikForm>
            <ScopedEntitySelect fieldKey="serviceRef" width={240} />
          </FormikForm>
        </Formik>
      )
    } else if (headerConfigAccessKey === 'infraIdentifier') {
      return (
        <React.Fragment key={newOverrideEnvironmentInputValue}>
          <Formik<InfraIdentifierFormState>
            initialValues={{ infraIdentifier: '' }}
            onSubmit={noop}
            innerRef={newOverrideInfraInputRef as React.MutableRefObject<FormikProps<InfraIdentifierFormState>>}
            validationSchema={Yup.object().shape({
              infraIdentifier: Yup.string().required(
                getString('fieldRequired', { field: getString('infrastructureText') })
              )
            })}
            formName="infraIdentifier-input"
          >
            <FormikForm>
              <Container className={css.infraIdentifierInputContainer} width={240}>
                <InfrastructureSelect />
              </Container>
            </FormikForm>
          </Formik>
        </React.Fragment>
      )
    }
  } else {
    return (
      <div onClick={killEvent}>
        <Text lineClamp={1} width={width} padding={{ right: 'medium' }}>
          {overrideResponseData[headerConfigAccessKey]}
        </Text>
      </div>
    )
  }
}
