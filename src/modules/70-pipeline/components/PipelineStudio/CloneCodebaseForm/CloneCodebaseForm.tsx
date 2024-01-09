/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { SetStateAction, Dispatch, useMemo } from 'react'
import cx from 'classnames'
import {
  TextInput,
  Text,
  MultiTypeInputType,
  Container,
  AllowedTypes,
  MultiTypeInputValue,
  FormInput
} from '@harness/uicore'
import { get } from 'lodash-es'
import { FontVariation } from '@harness/design-system'
import type { ConnectorInfoDTO } from 'services/cd-ng'
import type { UseStringsReturn } from 'framework/strings'
import { MultiTypeTextField } from '@common/components/MultiTypeText/MultiTypeText'
import {
  handleCIConnectorRefOnChange,
  ConnectionType,
  ConnectorRefInterface,
  AcceptableValue
} from '@pipeline/components/PipelineInputSetForm/CICodebaseInputSetForm'
import { isRuntimeInput } from '@pipeline/utils/CIUtils'
import { Connectors } from '@platform/connectors/constants'
import { getCompleteConnectorUrl } from '@platform/connectors/pages/connectors/utils/ConnectorUtils'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import { isMultiTypeRuntime } from '@common/utils/utils'
import type { ConfigureOptionsProps } from '@common/components/ConfigureOptions/ConfigureOptions'
import {
  GitProviderSelect,
  getGitProviderCards
} from '@modules/10-common/components/GitProviderSelect/GitProviderSelect'
import { useListRepos } from 'services/code'
import { isHarnessCodeRepoEntity } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect.utils'
import { CodebaseRuntimeInputsInterface } from '../RightBar/RightBarUtils'
import { getConnectorWidth, getRepositoryOptions, runtimeInputGearWidth } from './CloneCodebaseForm.utils'
import css from './CloneCodebaseForm.module.scss'

export default function CloneCodebaseForm({
  values,
  setFieldValue,
  connectorUrl,
  connectionType,
  setConnectionType,
  setConnectorUrl,
  connector,
  getString,
  errors,
  loading,
  accountId,
  projectIdentifier,
  orgIdentifier,
  repoIdentifier,
  branch,
  expressions,
  isReadonly,
  setCodebaseRuntimeInputs,
  codebaseRuntimeInputs,
  connectorWidth,
  connectorAndRepoNamePath,
  allowableTypes,
  codeBaseInputFieldFormName,
  onConnectorChange,
  setConnectorType,
  connectorType,
  fixRepoNameWidth,
  configureOptionsProps,
  isCodeEnabled
}: {
  values: { [key: string]: any }
  setFieldValue: (field: string, value: unknown) => void
  connectorUrl: string
  connectionType: string
  setConnectionType: Dispatch<SetStateAction<string>>
  setConnectorUrl: Dispatch<SetStateAction<string>>
  connector?: ConnectorInfoDTO
  getString: UseStringsReturn['getString']
  errors: { [key: string]: any }
  loading: boolean
  accountId: string
  projectIdentifier: string
  orgIdentifier: string
  repoIdentifier?: string
  branch?: string
  expressions: string[]
  isReadonly: boolean
  setCodebaseRuntimeInputs: Dispatch<SetStateAction<CodebaseRuntimeInputsInterface>>
  codebaseRuntimeInputs: CodebaseRuntimeInputsInterface
  connectorWidth?: number
  connectorAndRepoNamePath?: string // coming from step / input set
  allowableTypes: AllowedTypes // expression can be used for repoName
  codeBaseInputFieldFormName?: { [key: string]: string }
  onConnectorChange?: () => void // refetch onEdit connector
  setConnectorType?: Dispatch<SetStateAction<string>>
  connectorType?: string // required for getCompleteConnectorUrl on initial Add CI Stage
  fixRepoNameWidth?: boolean
  configureOptionsProps?: Partial<ConfigureOptionsProps>
  isCodeEnabled?: boolean
}): JSX.Element {
  const { data: gitnessRepositoriesData, loading: fetchingGitnessRepos } = useListRepos({
    space_ref: `${accountId}/${orgIdentifier}/${projectIdentifier}/+`
  })
  const gitProvider =
    get(values, 'provider') ??
    (isCodeEnabled && !values?.spec?.connectorRef
      ? getGitProviderCards(getString)[0]
      : getGitProviderCards(getString)[1])
  const connectorFieldName = connectorAndRepoNamePath ? `${connectorAndRepoNamePath}.connectorRef` : 'connectorRef'
  const connectorValue = get(values, connectorFieldName)
  const repoNameFieldName = connectorAndRepoNamePath ? `${connectorAndRepoNamePath}.repoName` : 'repoName'
  const repoNameValue = get(values, repoNameFieldName)
  const repoNameWidth =
    connectorWidth && isRuntimeInput(repoNameValue) && !fixRepoNameWidth
      ? connectorWidth + runtimeInputGearWidth
      : connectorWidth
  const repositoryOptions = useMemo(
    () => getRepositoryOptions({ gitnessRepositoriesData, fetchingGitnessRepos, getString }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gitnessRepositoriesData, fetchingGitnessRepos]
  )

  const renderConnectorField = (): JSX.Element => {
    const args = {
      name: connectorFieldName,
      width: getConnectorWidth({ connectorWidth, connectorRef: values.connectorRef }),
      error: errors?.connectorRef,
      type: [
        Connectors.GIT,
        Connectors.GITHUB,
        Connectors.GITLAB,
        Connectors.BITBUCKET,
        Connectors.AWS_CODECOMMIT,
        Connectors.AZURE_REPO
      ],
      placeholder: loading ? getString('loading') : getString('common.entityPlaceholderText'),
      accountIdentifier: accountId,
      projectIdentifier: projectIdentifier,
      orgIdentifier: orgIdentifier,
      gitScope: { repo: repoIdentifier || '', branch, getDefaultFromOtherRepo: true },
      multiTypeProps: {
        expressions,
        disabled: isReadonly,
        allowableTypes
      },
      configureOptionsProps: configureOptionsProps,
      onChange: (value: unknown, _valueType: MultiTypeInputValue, connectorRefType: MultiTypeInputType) => {
        handleCIConnectorRefOnChange({
          value: value as ConnectorRefInterface,
          connectorRefType,
          setConnectionType,
          setConnectorUrl,
          setConnectorType,
          setFieldValue,
          codeBaseInputFieldFormName,
          onConnectorChange
        })
        setCodebaseRuntimeInputs({
          ...codebaseRuntimeInputs,
          connectorRef: isRuntimeInput(value),
          repoName: isMultiTypeRuntime(connectorRefType)
        })
      }
    }
    return (
      <FormMultiTypeConnectorField
        label={getString('connector')}
        setRefValue
        tooltipProps={{ dataTooltipId: 'rightBarForm_connectorRef' }}
        {...args}
      />
    )
  }

  return (
    <>
      {isCodeEnabled && (
        <GitProviderSelect
          gitProvider={gitProvider}
          setFieldValue={setFieldValue}
          connectorFieldName={connectorFieldName}
          repoNameFieldName={repoNameFieldName}
          handleChange={(value: AcceptableValue, connectorRefType: MultiTypeInputType) => {
            handleCIConnectorRefOnChange({
              value: value as ConnectorRefInterface,
              connectorRefType,
              setConnectionType,
              setConnectorUrl,
              setConnectorType,
              setFieldValue,
              codeBaseInputFieldFormName,
              onConnectorChange
            })
          }}
          className={css.gitProviderSelect}
        />
      )}
      {!isHarnessCodeRepoEntity(gitProvider.type) && (
        <Container className={cx(css.bottomMargin3)}>{renderConnectorField()}</Container>
      )}
      {isHarnessCodeRepoEntity(gitProvider.type) ? (
        <FormInput.MultiTypeInput
          name="repositoryName"
          selectItems={repositoryOptions}
          multiTypeInputProps={{
            onChange: (value: any, _typeValue, _type) => {
              if (_type === MultiTypeInputType.FIXED) {
                setFieldValue(repoNameFieldName, value.value)
              } else {
                setFieldValue(repoNameFieldName, value)
              }
            },
            selectProps: {
              items: getRepositoryOptions({ gitnessRepositoriesData, fetchingGitnessRepos, getString }),
              addClearBtn: false,
              popoverClassName: css.popover,
              allowCreatingNewItems: true
            }
          }}
          label={getString('common.selectRepository')}
        />
      ) : !isRuntimeInput(connectorValue) && connectionType === ConnectionType.Repo ? (
        <Container width={repoNameWidth}>
          <Text
            font={{ variation: FontVariation.FORM_LABEL }}
            margin={{ bottom: 'xsmall' }}
            tooltipProps={{ dataTooltipId: 'rightBarForm_repoName' }}
          >
            {getString('common.repositoryName')}
          </Text>
          <TextInput name={repoNameFieldName} value={connectorUrl} style={{ flexGrow: 1 }} disabled />
        </Container>
      ) : (
        <>
          <Container width={repoNameWidth} className={cx(css.bottomMargin3)}>
            <MultiTypeTextField
              key={`connector-runtimeinput-${codebaseRuntimeInputs.connectorRef}_${isRuntimeInput(connectorValue)}`}
              label={
                <Text
                  font={{ variation: FontVariation.FORM_LABEL }}
                  margin={{ bottom: 'xsmall' }}
                  tooltipProps={{ dataTooltipId: 'rightBarForm_repoName' }}
                >
                  {getString('common.repositoryName')}
                </Text>
              }
              name={repoNameFieldName}
              multiTextInputProps={{
                multiTextInputProps: {
                  expressions,
                  allowableTypes
                },
                disabled:
                  (!repoNameValue && loading) ||
                  isReadonly ||
                  (isRuntimeInput(connectorValue) && isRuntimeInput(repoNameValue)) // connector is a runtime input
              }}
              configureOptionsProps={configureOptionsProps}
            />
          </Container>
          {!isRuntimeInput(connectorValue) && !isRuntimeInput(repoNameValue) && connectorUrl?.length > 0 && (
            <div className={css.predefinedValue}>
              <Text lineClamp={1}>
                {getCompleteConnectorUrl({
                  partialUrl: connectorUrl,
                  repoName: repoNameValue,
                  connectorType: get(connector, 'type') || connectorType,
                  gitAuthProtocol: get(connector, 'spec.authentication.type')
                })}
              </Text>
            </div>
          )}
        </>
      )}
    </>
  )
}
