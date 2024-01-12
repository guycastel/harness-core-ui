/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
import React, { useState } from 'react'
import { Classes, FormGroup, IFormGroupProps, Intent } from '@blueprintjs/core'
import cx from 'classnames'
import { FormikProps, useFormikContext } from 'formik'
import { Color } from '@harness/design-system'
import {
  ButtonVariation,
  Container,
  DataTooltipInterface,
  errorCheck,
  ExpressionAndRuntimeTypeProps,
  FormError,
  FormikTooltipContext,
  HarnessDocTooltip,
  Layout,
  MultiTypeInputType,
  MultiTypeInputValue,
  SelectOption,
  Tag,
  Text
} from '@harness/uicore'
import { cloneDeep, defaultTo, get, isArray, set } from 'lodash-es'
import { useParams } from 'react-router-dom'
import produce from 'immer'
import type { EnvironmentResponseDTO, ResponsePageServiceResponse } from 'services/cd-ng'
import RbacButton from '@rbac/components/Button/Button'
import { Scope } from '@common/interfaces/SecretsInterface'
import { getScopeFromValue } from '@common/components/EntityReference/EntityReference'
import {
  Item,
  MultiTypeReferenceInput,
  MultiTypeReferenceInputProps,
  ReferenceSelectProps
} from '@common/components/ReferenceSelect/ReferenceSelect'
import { useStrings } from 'framework/strings'
import type { PipelinePathProps } from '@common/interfaces/RouteInterfaces'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { getIdentifierFromScopedRef } from '@common/utils/utils'
import { EntitySelectionGitData } from '@modules/10-common/constants/GitSyncTypes'
import { defaultGitContextBranchPlaceholder } from '@modules/10-common/utils/gitSyncUtils'
import { getConnectorIdentifierWithScope } from '@modules/27-platform/connectors/utils/utils'
import { getReferenceFieldProps } from './Utils'
import css from './FormMultiTypeEnvironmentField.module.scss'

export interface EnvironmentReferenceFieldProps extends Omit<IFormGroupProps, 'label'> {
  name: string
  label?: string | React.ReactElement
  placeholder: string
  tooltipProps?: DataTooltipInterface
  style?: React.CSSProperties
  openAddNewModal?: () => void
  disabled?: boolean
  createNewLabel?: string
  isDrawerMode?: boolean
  multitypeInputValue?: MultiTypeInputType
  multiTypeProps?: Omit<MultiTypeReferenceInputProps<EnvironmentResponseDTO>, 'name' | 'referenceSelectProps'>
  setRefValue?: boolean
  onChange?: (
    environment: ExpressionAndRuntimeTypeProps['value'],
    valueType?: MultiTypeInputValue,
    type?: MultiTypeInputType,
    environmentGitMetadata?: Record<string, string | undefined>
  ) => void
  selected?: string
  defaultScope?: Scope
  width?: number
  error?: string
  isMultiSelect?: boolean
  onMultiSelectChange?: (
    environments: SelectOption[],
    environmentGitMetadata?: Record<string, string | undefined>
  ) => void
  isOnlyFixedType?: boolean
  isNewConnectorLabelVisible?: boolean
  labelClass?: string
  envTypeFilter?: ('PreProduction' | 'Production')[]
  formikProps?: FormikProps<any>
  parentGitMetadata?: EntitySelectionGitData
  hideRemoteDetails?: boolean
}

export function getSelectedRenderer(selected: any): JSX.Element {
  return (
    <Layout.Horizontal spacing="small" flex={{ distribution: 'space-between' }} className={css.selectWrapper}>
      <Text tooltip={defaultTo(selected?.name, selected)} color={Color.GREY_800} className={css.label}>
        {getIdentifierFromScopedRef(defaultTo(defaultTo(selected?.label, selected), ''))}
      </Text>
      <Tag minimal id={css.tag}>
        {getScopeFromValue(selected?.value || selected)}
      </Tag>
    </Layout.Horizontal>
  )
}

function generateInitialValues(selected: SelectOption[] | string): (string | Item)[] | string {
  if (isArray(selected)) {
    return selected
      .filter(env => env.label !== 'All')
      .map((svc: SelectOption) => ({
        label: svc.value as string,
        value: svc.value as string,
        scope: getScopeFromValue(svc.value as string)
      }))
  }
  return selected
}

export function MultiTypeEnvironmentField(props: EnvironmentReferenceFieldProps): React.ReactElement {
  const {
    name,
    style,
    createNewLabel,
    multitypeInputValue,
    multiTypeProps = {},
    setRefValue = false,
    onChange,
    defaultScope,
    isMultiSelect,
    onMultiSelectChange,
    openAddNewModal,
    isNewConnectorLabelVisible,
    isOnlyFixedType = false,
    placeholder,
    labelClass: labelClassFromProps = '',
    disabled,
    width,
    envTypeFilter = [],
    formikProps,
    parentGitMetadata,
    hideRemoteDetails,
    ...restProps
  } = props
  const formik = useFormikContext() || formikProps
  const { getString } = useStrings()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<PipelinePathProps>()
  const [page, setPage] = useState(0)
  const [pagedEnvironmentData, setPagedEnvironmentData] = useState<ResponsePageServiceResponse>({})
  const [hideModal, setHideModal] = useState(false)
  const selected = generateInitialValues(get(formik?.values, name, isMultiSelect ? [] : ''))
  const [selectedValue, setSelectedValue] = React.useState<any>(selected)
  const [userSelectedBranches, setUserSelectedBranches] = React.useState<Record<string, string | undefined>>(
    cloneDeep(get(formik?.initialValues, 'gitMetadata', {}))
  )
  const hasError = errorCheck(name, formik)
  const {
    intent = hasError ? Intent.DANGER : Intent.NONE,
    helperText = hasError ? <FormError name={name} errorMessage={get(formik?.errors, name)} /> : null,
    label,
    ...rest
  } = restProps
  const tooltipContext = React.useContext(FormikTooltipContext)
  const dataTooltipId =
    props.tooltipProps?.dataTooltipId || (tooltipContext?.formName ? `${tooltipContext?.formName}_${name}` : '')
  const getReferenceFieldPropsValues = getReferenceFieldProps({
    defaultScope,
    accountIdentifier: accountId,
    projectIdentifier,
    orgIdentifier,
    name,
    width,
    selected,
    placeholder,
    isMultiSelect,
    setPagedEnvironmentData,
    selectedEnvironments: Array.isArray(selected) ? selected : [],
    getString,
    envTypeFilter,
    userSelectedBranches,
    setUserSelectedBranches,
    hideRemoteDetails
  })
  const handleMultiSelectChange = (envs: any): void => {
    const gitMetadata: Record<string, string | undefined> = {}
    const environments = envs.map((env: any) => {
      const envId = getConnectorIdentifierWithScope(env.scope, env.identifier || '')
      const branch = userSelectedBranches[envId]
      const selectedEnvironmentBranch = branch && branch !== defaultGitContextBranchPlaceholder ? branch : undefined
      gitMetadata[envId] = selectedEnvironmentBranch
      return {
        label: env.identifier,
        value: envId
      }
    })
    formik.setValues(
      produce(formik.values, draft => {
        set(draft as unknown as any, 'gitMetadata', gitMetadata)
        set(draft as unknown as any, name, environments)
      })
    )
    onMultiSelectChange?.(environments, gitMetadata)
  }
  return (
    <div style={style} className={cx(css.environmentLabel, labelClassFromProps)}>
      <Container data-testid="environmentTooltip">
        <HarnessDocTooltip tooltipId={dataTooltipId} labelText={label} className={Classes.LABEL} />
      </Container>
      <FormGroup {...rest} labelFor={name} helperText={helperText} intent={intent}>
        <MultiTypeReferenceInput<EnvironmentResponseDTO>
          name={name}
          disabled={disabled}
          referenceSelectProps={
            {
              ...getReferenceFieldPropsValues,
              isNewConnectorLabelVisible: isNewConnectorLabelVisible,
              placeholderClass: css.placeholderClass,
              createNewLabel: createNewLabel || 'Environment',
              disabled: disabled,
              disableCollapse: true,
              selectedRenderer: getSelectedRenderer(selected),
              hideModal: hideModal,
              isOnlyFixedtype: isOnlyFixedType,
              onMultiSelectChange: handleMultiSelectChange,
              isMultiSelect: isMultiSelect,
              pagination: {
                itemCount: pagedEnvironmentData?.data?.totalItems || 0,
                pageSize: pagedEnvironmentData?.data?.pageSize || 10,
                pageCount: pagedEnvironmentData?.data?.totalPages || -1,
                pageIndex: page || 0,
                gotoPage: pageIndex => setPage(pageIndex)
              },
              createNewBtnComponent: isNewConnectorLabelVisible ? (
                <RbacButton
                  variation={ButtonVariation.SECONDARY}
                  onClick={() => {
                    openAddNewModal?.()
                    setHideModal(true)
                  }}
                  text={`+ ${createNewLabel || 'Environment'}`}
                  margin={{ right: 'small' }}
                  permission={{
                    resource: {
                      resourceType: ResourceType.ENVIRONMENT
                    },
                    resourceScope: { accountIdentifier: accountId, orgIdentifier, projectIdentifier },
                    permission: PermissionIdentifier.EDIT_ENVIRONMENT
                  }}
                ></RbacButton>
              ) : null
            } as ReferenceSelectProps<EnvironmentResponseDTO>
          }
          onChange={(val, _valueType, type1) => {
            if (val && type1 === MultiTypeInputType.FIXED) {
              const { record, scope } = val as unknown as { record: EnvironmentResponseDTO; scope: Scope }
              const value = {
                label: record.name,
                value: getConnectorIdentifierWithScope(scope, record.identifier || ''),
                scope
              }
              const environmentId = value.value || ''
              const branch = userSelectedBranches[environmentId]
              const environmentGitBranch = branch && branch !== defaultGitContextBranchPlaceholder ? branch : undefined
              const gitMetadata = environmentGitBranch
                ? {
                    [environmentId]: environmentGitBranch
                  }
                : undefined
              formik.setValues(
                produce(formik.values, (draft: EnvironmentResponseDTO): void => {
                  set(draft, 'gitMetadata', gitMetadata)
                  set(draft, name, setRefValue ? value.value : value)
                })
              )
              onChange?.(setRefValue ? value.value : (value as unknown as string), undefined, undefined, gitMetadata)
              setSelectedValue(value)
            } else {
              formik?.setFieldValue(name, defaultTo(val, ''))
              setSelectedValue(defaultTo(val, ''))
              onChange?.(val, undefined, type1)
            }
          }}
          value={Array.isArray(selectedValue) ? '' : selectedValue}
          multitypeInputValue={multitypeInputValue}
          resetExpressionOnFixedTypeChange
          {...multiTypeProps}
        />
      </FormGroup>
    </div>
  )
}
