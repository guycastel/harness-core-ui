/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useRef } from 'react'
import { FormikErrors, FormikProps, useFormikContext } from 'formik'
import produce from 'immer'
import { v4 as uuid } from 'uuid'
import { isEmpty, isNil, set, get, defaultTo, findIndex } from 'lodash-es'
import {
  AllowedTypes,
  Button,
  ButtonSize,
  ButtonVariation,
  Container,
  Formik,
  FormikForm,
  Layout,
  MultiTypeInputType,
  Text,
  useToaster
} from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { useParams } from 'react-router-dom'

import type {
  ApplicationSettingsConfiguration,
  ConfigFileWrapper,
  ConnectionStringsConfiguration,
  ManifestConfigWrapper
} from 'services/cd-ng'
import { useStrings } from 'framework/strings'

import type { RequiredField } from '@common/interfaces/RouteInterfaces'
import { useServiceOverridesContext } from '@cd/components/ServiceOverrides/context/ServiceOverrideContext'
import {
  ApplicationSettingsOverrideDetails,
  ConfigFileOverrideDetails,
  ConnectionStringsOverrideDetails,
  ManifestOverrideDetails,
  OverrideDetails,
  OverrideTypes,
  ServiceOverrideRowFormState,
  ServiceOverridesResponseDTOV2,
  VariableOverrideDetails
} from '@cd/components/ServiceOverrides/ServiceOverridesUtils'
import { serviceOverridesConfig } from '@cd/components/ServiceOverrides/ServiceOverridesConfig'
import type {
  OverrideManifestStoresTypes,
  OverrideManifestTypes
} from '@cd/components/EnvironmentsV2/EnvironmentDetails/ServiceOverrides/ServiceManifestOverride/ServiceManifestOverrideUtils'
import RbacButton from '@rbac/components/Button/Button'
import ViewOnlyRow from '@cd/components/ServiceOverrides/components/ListRows/ViewOnly/ViewOnlyRow'
import { killEvent } from '@common/utils/eventUtils'
import { useServiceOverridesButtonPermission } from '@cd/components/ServiceOverrides/useServiceOverridesButtonPermission'
import { PipelinePathProps } from '@common/interfaces/RouteInterfaces'
import { AllNGVariables } from '@pipeline/utils/types'

import RowItemFromValue from './RowItemFromValue/RowItemFromValue'
import { VariableOverrideEditable } from './VariableOverrideEditable/VariableOverrideEditable'
import RowActionButtons from './RowActionButtons'
import ManifestOverrideInfo from '../ViewOnly/ManifestOverrideInfo'
import ConfigFileOverrideInfo from '../ViewOnly/ConfigFileOverrideInfo'
import ApplicationSettingOverrideInfo from '../ViewOnly/ApplicationSettingOverrideInfo'
import ConnectionStringOverrideInfo from '../ViewOnly/ConnectionStringOverrideInfo'
import useServiceManifestOverride from './useManifestOverride'
import useConfigFileOverride from './useConfigFileOverride'
import useApplicationSettingOverride from './useApplicationSettingOverride'
import useConnectionStringOverride from './useConnectionStringOverride'
import { scrollToOverrideSpecRowByIndex } from './editableRowUtils'

import css from './OverrideSpecDetailsForm.module.scss'

interface OverrideSpecDetailsFormProps {
  isSectionNew: boolean
  isSectionEdit: boolean
  overrideSpecDetails: OverrideDetails[]
  sectionIndex: number
  overrideResponse: ServiceOverridesResponseDTOV2
}

export function OverrideSpecDetailsForm({
  isSectionNew,
  isSectionEdit,
  overrideSpecDetails,
  sectionIndex,
  overrideResponse
}: OverrideSpecDetailsFormProps): React.ReactElement {
  const { getString } = useStrings()
  const { showError, clear } = useToaster()

  const {
    onAddOverrideSection,
    onUpdate,
    serviceOverrideType,
    addNewChildOverrideRow,
    currentEditableSectionRef,
    newOverrideEnvironmentInputRef,
    newOverrideServiceInputRef,
    newOverrideInfraInputRef
  } = useServiceOverridesContext()

  const overridesListEndRef = useRef<HTMLDivElement | null>(null)

  const { accountId, projectIdentifier, orgIdentifier } = useParams<PipelinePathProps>()

  const buttonPermission = useServiceOverridesButtonPermission({
    accountId,
    projectIdentifier,
    orgIdentifier,
    serviceOverrideType,
    environmentRef: defaultTo(overrideResponse?.['environmentRef'], ''),
    serviceRef: defaultTo(overrideResponse?.['serviceRef'], '')
  })

  const handleAddNewOverrideRowClick = (formikProps: FormikProps<ServiceOverrideRowFormState[]>): void => {
    addNewChildOverrideRow(sectionIndex)
      .then(() => {
        formikProps.setValues(
          produce(formikProps.values, draft => {
            draft.push({
              id: uuid(),
              overrideType: undefined
            })
          })
        )
        setTimeout(
          () =>
            overridesListEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }),
          100
        )
      })
      .catch(() => {
        // do nothing
        // Error handling is already taken care of by displaying warning
      })
  }

  const validateSpecSectionAndSetErrors = (): FormikErrors<ServiceOverrideRowFormState[]> => {
    const specFormValues = (currentEditableSectionRef?.current?.values || []) as ServiceOverrideRowFormState[]

    const errors = [] as FormikErrors<ServiceOverrideRowFormState[]>

    specFormValues.forEach((overrideSpecRow: ServiceOverrideRowFormState | undefined | null, overrideSpecRowIndex) => {
      if (!overrideSpecRow || !overrideSpecRow.overrideType) {
        set(
          errors,
          `${overrideSpecRowIndex}.overrideType`,
          getString('cd.overrideValidations.overrideTypeAndInfoRequired')
        )
      }

      if (overrideSpecRow?.overrideType === OverrideTypes.VARIABLE) {
        const varNameValue = overrideSpecRow?.variables?.[0]?.name
        const varTypeValue = overrideSpecRow?.variables?.[0]?.type
        const varValue = overrideSpecRow?.variables?.[0]?.value
        if (!varNameValue || !varTypeValue || !varValue) {
          const errorObj = {
            name: !varNameValue ? getString('common.validation.nameIsRequired') : undefined,
            type: !varTypeValue ? getString('common.validation.typeIsRequired') : undefined,
            value: !varValue ? getString('common.validation.valueIsRequired') : undefined
          }

          set(errors, `${overrideSpecRowIndex}.variables`, [errorObj])
          return
        }
      }

      if (
        [
          OverrideTypes.MANIFEST,
          OverrideTypes.CONFIG,
          OverrideTypes.APPLICATIONSETTING,
          OverrideTypes.CONNECTIONSTRING
        ].includes(overrideSpecRow?.overrideType as OverrideTypes)
      ) {
        if (overrideSpecRow?.overrideType === OverrideTypes.MANIFEST && !overrideSpecRow?.manifests) {
          set(
            errors,
            `${overrideSpecRowIndex}.overrideInfoError`,
            getString('cd.overrideValidations.overrideInfoIsRequired')
          )
          return
        }

        if (overrideSpecRow?.overrideType === OverrideTypes.CONFIG && !overrideSpecRow?.configFiles) {
          set(
            errors,
            `${overrideSpecRowIndex}.overrideInfoError`,
            getString('cd.overrideValidations.overrideInfoIsRequired')
          )
          return
        }

        if (
          overrideSpecRow?.overrideType === OverrideTypes.APPLICATIONSETTING &&
          !overrideSpecRow?.applicationSettings
        ) {
          set(
            errors,
            `${overrideSpecRowIndex}.overrideInfoError`,
            getString('cd.overrideValidations.overrideInfoIsRequired')
          )
          return
        }

        if (overrideSpecRow?.overrideType === OverrideTypes.CONNECTIONSTRING && !overrideSpecRow?.connectionStrings) {
          set(
            errors,
            `${overrideSpecRowIndex}.overrideInfoError`,
            getString('cd.overrideValidations.overrideInfoIsRequired')
          )
          return
        }
      }
    })

    // Set Errors to the form
    currentEditableSectionRef?.current?.setErrors(errors)

    return errors
  }

  const handleSubmit = (values: ServiceOverrideRowFormState[]): void => {
    // check errors for Env,Infra, Service field & spec section

    if (isSectionNew) {
      const environmentRefValue = newOverrideEnvironmentInputRef.current?.values?.['environmentRef']
      const serviceRefValue = newOverrideServiceInputRef.current?.values?.['serviceRef']
      const infraIdentifierValue = newOverrideInfraInputRef.current?.values?.['infraIdentifier']

      const envError = newOverrideEnvironmentInputRef.current?.errors?.['environmentRef']
      const svcError = newOverrideServiceInputRef.current?.errors?.['serviceRef']
      const infraError = newOverrideInfraInputRef.current?.errors?.['infraIdentifier']

      const specErrorsList = validateSpecSectionAndSetErrors()

      if (!envError && !svcError && !infraError && isEmpty(specErrorsList)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const specDetails = values.reduce((accumulator: any, currentVal: ServiceOverrideRowFormState) => {
          if (currentVal.overrideType === OverrideTypes.VARIABLE) {
            if (!accumulator.variables) {
              accumulator.variables = []
            }
            accumulator.variables = [
              ...accumulator.variables,
              ...(currentVal.variables as RequiredField<AllNGVariables, 'type' | 'name'>[])
            ]
            return accumulator
          }

          if (currentVal.overrideType === OverrideTypes.MANIFEST) {
            if (!accumulator.manifests) {
              accumulator.manifests = []
            }
            accumulator.manifests = [
              ...accumulator.manifests,
              ...(currentVal.manifests as Required<ManifestConfigWrapper>[])
            ]
            return accumulator
          }

          if (currentVal.overrideType === OverrideTypes.CONFIG) {
            if (!accumulator.configFiles) {
              accumulator.configFiles = []
            }
            accumulator.configFiles = [
              ...accumulator.configFiles,
              ...(currentVal.configFiles as Required<ConfigFileWrapper>[])
            ]
            return accumulator
          }

          if (currentVal.overrideType === OverrideTypes.APPLICATIONSETTING) {
            if (!accumulator.applicationSettings) {
              accumulator.applicationSettings = {}
            }
            accumulator.applicationSettings = currentVal.applicationSettings
            return accumulator
          }

          if (currentVal.overrideType === OverrideTypes.CONNECTIONSTRING) {
            if (!accumulator.connectionStrings) {
              accumulator.connectionStrings = {}
            }
            accumulator.connectionStrings = currentVal.connectionStrings
            return accumulator
          }
        }, {})

        if (!isEmpty(specDetails)) {
          const updatedValues = {
            environmentRef: environmentRefValue,
            serviceRef: serviceRefValue,
            infraIdentifier: infraIdentifierValue,
            ...specDetails
          }
          clear()
          onAddOverrideSection?.(updatedValues)
        } else {
          clear()
          showError(getString('cd.overrideEmptySpecError'))
        }
      } else {
        clear()
        showError(getString('cd.overrideValidations.overrideFormContainsErrors'))
        if (!isEmpty(specErrorsList)) {
          const rowIndexToScrollTo = findIndex(specErrorsList, errorObj => !isEmpty(errorObj))
          scrollToOverrideSpecRowByIndex(rowIndexToScrollTo)
        }
      }
    } else {
      // check validations and error handling
      const specErrorsList = validateSpecSectionAndSetErrors()

      if (isEmpty(specErrorsList)) {
        onUpdate?.(sectionIndex, values as ServiceOverrideRowFormState[])
      } else {
        clear()
        showError(getString('cd.overrideValidations.overrideFormContainsErrors'))
        const rowIndexToScrollTo = findIndex(specErrorsList, errorObj => !isEmpty(errorObj))
        scrollToOverrideSpecRowByIndex(rowIndexToScrollTo)
      }
    }
  }

  const getRowComponent = (
    overrideDetailsObj: OverrideDetails,
    overrideDetailIndex: number
  ): JSX.Element | undefined => {
    const { isNew, isEdit, isClone } = overrideDetailsObj || {}

    if (isNew) {
      return (
        <EditableRowInternal isEdit={false} isClone={isClone} overrideDetailIndex={overrideDetailIndex} isNew={isNew} />
      )
    } else if (overrideDetailsObj) {
      if (isEdit) {
        return (
          <EditableRowInternal
            overrideDetails={overrideDetailsObj}
            isEdit={isEdit}
            isClone={isClone}
            overrideDetailIndex={overrideDetailIndex}
            isNew={isNew}
          />
        )
      } else {
        return (
          <ViewOnlyRow
            rowIndex={overrideDetailIndex}
            overrideDetails={overrideDetailsObj}
            sectionIndex={sectionIndex}
          />
        )
      }
    }
  }

  const initialValues = React.useMemo(() => {
    // New override section
    if (sectionIndex < 0) {
      return []
    }

    if (isNil(overrideSpecDetails)) {
      return []
    }

    return overrideSpecDetails.map(overrideDetails => {
      const variableValue = (overrideDetails as VariableOverrideDetails).variableValue
      const manifestValue = (overrideDetails as ManifestOverrideDetails).manifestValue
      const configFileValue = (overrideDetails as ConfigFileOverrideDetails).configFileValue
      const applicationSettingsValue = (overrideDetails as ApplicationSettingsOverrideDetails).applicationSettingsValue
      const connectionStringsValue = (overrideDetails as ConnectionStringsOverrideDetails).connectionStringsValue

      const { overrideType } = overrideDetails || ({} as OverrideDetails)

      return {
        id: uuid(),
        overrideType,
        ...(!isNil(variableValue) && { variables: [{ ...variableValue }] }),
        ...(!isNil(manifestValue) && { manifests: [{ ...manifestValue }] }),
        ...(!isNil(configFileValue) && { configFiles: [{ ...configFileValue }] }),
        ...(!isNil(applicationSettingsValue) && { applicationSettings: { ...applicationSettingsValue } }),
        ...(!isNil(connectionStringsValue) && { connectionStrings: { ...connectionStringsValue } })
      }
    })
  }, []) as ServiceOverrideRowFormState[]

  return (
    <Formik<ServiceOverrideRowFormState[]>
      formName="editableServiceOverrideSection"
      initialValues={initialValues}
      onSubmit={handleSubmit}
      innerRef={
        isSectionEdit || isSectionNew
          ? (currentEditableSectionRef as React.MutableRefObject<FormikProps<ServiceOverrideRowFormState[]>>)
          : null
      }
    >
      {(formik: FormikProps<ServiceOverrideRowFormState[]>) => {
        return (
          <FormikForm>
            <Container className={css.specDetailsRowContainer}>
              {overrideSpecDetails?.map((overrideDetails, overrideDetailIndex) => {
                return (
                  <Container
                    className={css.specDetailsRow}
                    id={`override-spec-detail-row-${overrideDetailIndex}`}
                    key={overrideDetailIndex}
                  >
                    {getRowComponent(overrideDetails, overrideDetailIndex)}
                  </Container>
                )
              })}
              <div ref={overridesListEndRef} />
            </Container>
            <Container onClick={killEvent} className={css.addNewOverrideRowContainer}>
              <RbacButton
                id="add-override-spec-row"
                size={ButtonSize.SMALL}
                variation={ButtonVariation.LINK}
                padding={0}
                data-test-id="addOverrideSpecRow"
                onClick={() => handleAddNewOverrideRowClick(formik)}
                icon="plus"
                text={getString('newLabel')}
                permission={buttonPermission}
              />
            </Container>
          </FormikForm>
        )
      }}
    </Formik>
  )
}

function EditableRowInternal({
  overrideDetails,
  isEdit,
  isClone,
  overrideDetailIndex,
  isNew
}: {
  isEdit: boolean
  isClone: boolean
  isNew: boolean
  overrideDetails?: OverrideDetails
  overrideDetailIndex: number
}): React.ReactElement {
  const { values, setFieldValue, errors } = useFormikContext<ServiceOverrideRowFormState[]>()

  const { serviceOverrideType } = useServiceOverridesContext()
  const rowConfigs = serviceOverridesConfig[serviceOverrideType]

  const overrideFormData = values[overrideDetailIndex] || {}

  const handleOverrideSubmit = useCallback(
    (
      overrideObj:
        | ManifestConfigWrapper
        | ConfigFileWrapper
        | ApplicationSettingsConfiguration
        | ConnectionStringsConfiguration,
      type: string
    ): void => {
      switch (type) {
        case 'applicationSettings':
        case 'connectionStrings':
          setFieldValue(`${overrideDetailIndex}.${type}`, overrideObj)
          break
        default:
          setFieldValue(`${overrideDetailIndex}.${type}.0`, overrideObj)
      }
    },
    []
  )

  const allowableTypes: AllowedTypes =
    serviceOverrideType === 'ENV_GLOBAL_OVERRIDE' || serviceOverrideType === 'ENV_SERVICE_OVERRIDE'
      ? [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME, MultiTypeInputType.EXPRESSION]
      : [MultiTypeInputType.FIXED, MultiTypeInputType.EXPRESSION]

  const { editManifestOverride, createNewManifestOverride } = useServiceManifestOverride({
    manifestOverrides: overrideFormData.manifests?.[0] ? [overrideFormData.manifests?.[0]] : [],
    isReadonly: false,
    handleManifestOverrideSubmit: manifestObj => handleOverrideSubmit(manifestObj, 'manifests'),
    fromEnvConfigPage: true,
    expressions: [],
    allowableTypes
  })

  const { editFileOverride, createNewFileOverride } = useConfigFileOverride({
    fileOverrides: overrideFormData.configFiles?.[0] ? [overrideFormData.configFiles?.[0]] : [],
    isReadonly: false,
    fromEnvConfigPage: true,
    handleConfigFileOverrideSubmit: filesObj => handleOverrideSubmit(filesObj, 'configFiles'),
    expressions: [],
    allowableTypes
  })

  const { editApplicationConfig, showApplicationSettingModal } = useApplicationSettingOverride({
    applicationSettings: overrideFormData.applicationSettings,
    isReadonly: false,
    allowableTypes,
    handleSubmitConfig: config => handleOverrideSubmit(config, 'applicationSettings')
  })

  const { editConnectionString, showConnectionStringModal } = useConnectionStringOverride({
    connectionStrings: overrideFormData.connectionStrings,
    isReadonly: false,
    allowableTypes,
    handleSubmitConfig: config => handleOverrideSubmit(config, 'connectionStrings')
  })

  return (
    <Layout.Horizontal
      flex={{ justifyContent: 'flex-start', alignItems: 'center' }}
      padding={{ top: 'small', bottom: 'small' }}
      className={css.editableRow}
    >
      {rowConfigs.map(rowConfig => {
        if (rowConfig.accessKey) {
          return (
            <Container className={css.overrideTypeInputContainer} width={rowConfig.rowWidth} key={rowConfig.value}>
              <RowItemFromValue
                value={rowConfig.value}
                isEdit={isEdit}
                isClone={isClone}
                overrideDetailIndex={overrideDetailIndex}
              />
            </Container>
          )
        } else {
          const overrideTypeValue = overrideFormData?.overrideType
          const manifestValue = overrideFormData.manifests?.[0]
          const configFileValue = overrideFormData.configFiles?.[0]
          const applicationSettingsValue = overrideFormData.applicationSettings as RequiredField<
            ApplicationSettingsConfiguration,
            'store'
          >
          const connectionStringsValue = overrideFormData.connectionStrings as RequiredField<
            ConnectionStringsConfiguration,
            'store'
          >

          const overrideInfoError = get(errors, `${overrideDetailIndex}.overrideInfoError`)

          return (
            <Layout.Horizontal
              key={rowConfig.value}
              flex={{ justifyContent: 'space-between' }}
              className={css.flexGrow}
            >
              <Layout.Horizontal
                padding={{ left: 'none', right: 'small' }}
                flex={{ justifyContent: 'flex-start', alignItems: 'center' }}
                className={css.flexWrap}
              >
                {overrideTypeValue === OverrideTypes.VARIABLE && (
                  <VariableOverrideEditable overrideDetailIndex={overrideDetailIndex} />
                )}
                {overrideTypeValue === OverrideTypes.MANIFEST && !isEmpty(manifestValue) && (
                  <ManifestOverrideInfo {...manifestValue} />
                )}
                {overrideTypeValue === OverrideTypes.CONFIG && !isEmpty(configFileValue) && (
                  <ConfigFileOverrideInfo {...configFileValue} />
                )}
                {overrideTypeValue === OverrideTypes.APPLICATIONSETTING && !isEmpty(applicationSettingsValue) && (
                  <ApplicationSettingOverrideInfo {...applicationSettingsValue} />
                )}
                {overrideTypeValue === OverrideTypes.CONNECTIONSTRING && !isEmpty(connectionStringsValue) && (
                  <ConnectionStringOverrideInfo {...connectionStringsValue} />
                )}
                {overrideInfoError && (
                  <Text
                    icon="circle-cross"
                    margin={{ right: 'medium' }}
                    font={{ size: 'small' }}
                    iconProps={{ size: 12, color: Color.RED_600 }}
                    color={Color.RED_600}
                  >
                    {overrideInfoError}
                  </Text>
                )}
                {(overrideDetails || overrideFormData) &&
                  overrideTypeValue &&
                  overrideTypeValue !== OverrideTypes.VARIABLE && (
                    <Button
                      icon="Edit"
                      variation={ButtonVariation.ICON}
                      font={{ variation: FontVariation.BODY1 }}
                      onClick={() => {
                        if (overrideTypeValue === OverrideTypes.MANIFEST) {
                          const manifestType = manifestValue?.manifest?.type as OverrideManifestTypes

                          const manifestStore = manifestValue?.manifest?.spec?.store
                            ?.type as OverrideManifestStoresTypes

                          if (manifestValue) {
                            editManifestOverride(manifestType, manifestStore)
                          } else {
                            createNewManifestOverride()
                          }
                        } else if (overrideTypeValue === OverrideTypes.CONFIG) {
                          if (configFileValue) {
                            editFileOverride()
                          } else {
                            createNewFileOverride()
                          }
                        } else if (overrideTypeValue === OverrideTypes.APPLICATIONSETTING) {
                          if (applicationSettingsValue) {
                            editApplicationConfig()
                          } else {
                            showApplicationSettingModal()
                          }
                        } else if (overrideTypeValue === OverrideTypes.CONNECTIONSTRING) {
                          if (connectionStringsValue) {
                            editConnectionString()
                          } else {
                            showConnectionStringModal()
                          }
                        }
                      }}
                    />
                  )}
              </Layout.Horizontal>
              <RowActionButtons
                isNewRow={isNew}
                isCloneRow={isClone}
                isEditRow={isEdit}
                childRowIndex={overrideDetailIndex}
              />
            </Layout.Horizontal>
          )
        }
      })}
    </Layout.Horizontal>
  )
}
