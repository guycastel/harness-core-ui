/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import produce from 'immer'
import { useParams } from 'react-router-dom'
import * as Yup from 'yup'
import type { FormikContextType } from 'formik'
import { noop, set } from 'lodash-es'
import {
  Text,
  Layout,
  Card,
  Icon,
  IconName,
  Container,
  FormError,
  Formik,
  FormikForm,
  FormInput,
  SelectOption,
  Collapse
} from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import {
  ConnectorInfoDTO,
  getListOfBranchesByRefConnectorV2Promise,
  ResponseGitBranchesResponseDTO
} from 'services/cd-ng'
import { useStrings } from 'framework/strings'
import { Separator } from '@common/components'
import RepoBranchSelectV2 from '@common/components/RepoBranchSelectV2/RepoBranchSelectV2'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { getScopedValueFromDTO, ScopedValueObjectDTO } from '@common/components/EntityReference/EntityReference.types'
import { Status } from '@common/utils/Constants'
import { isValidYAMLFilePath } from '@common/constants/Utils'
import { getIdentifierFromValue } from '@common/components/EntityReference/EntityReference'
import { isHarnessCodeRepoEntity } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect.utils'
import { SupportedGitProvidersForCIOnboarding } from './SelectGitProvider'
import { getRepoNameForDefaultBranchFetch, getValidRepoName } from '../../../utils/HostedBuildsUtils'
import css from './InfraProvisioningWizard.module.scss'

export enum PipelineConfigurationOption {
  StarterPipeline = 'STARTER_PIPELINE',
  GenerateYAML = 'GENERATE_YAML',
  ChooseExistingYAML = 'CHOOSE_EXISTING_YAML',
  ChooseStarterConfig_DotNetCore = 'CHOOSE_STARTER_CONFIG_DOT_NET_CORE',
  ChooseStarterConfig_JavenWithMaven = 'CHOOSE_STARTER_CONFIG_JAVA_WITH_MAVEN',
  ChooseStarterConfig_Go = 'CHOOSE_STARTER_CONFIG_GO',
  ChooseStarterConfig_NodeJS = 'CHOOSE_STARTER_CONFIG_NODE_JS',
  ChooseStarterConfig_Python = 'CHOOSE_STARTER_CONFIG_PYTHON'
}

export const StarterConfigurations = [
  PipelineConfigurationOption.ChooseStarterConfig_DotNetCore,
  PipelineConfigurationOption.ChooseStarterConfig_JavenWithMaven,
  PipelineConfigurationOption.ChooseStarterConfig_Go,
  PipelineConfigurationOption.ChooseStarterConfig_NodeJS,
  PipelineConfigurationOption.ChooseStarterConfig_Python
]

export const StarterConfigIdToOptionMap: { [key: string]: PipelineConfigurationOption } = {
  'starter-pipeline': PipelineConfigurationOption.StarterPipeline,
  'generate-yaml': PipelineConfigurationOption.GenerateYAML,
  'choose-existing-yaml': PipelineConfigurationOption.ChooseExistingYAML,
  'dot-net-core': PipelineConfigurationOption.ChooseStarterConfig_DotNetCore,
  'java-with-maven': PipelineConfigurationOption.ChooseStarterConfig_JavenWithMaven,
  go: PipelineConfigurationOption.ChooseStarterConfig_Go,
  nodejs: PipelineConfigurationOption.ChooseStarterConfig_NodeJS,
  python: PipelineConfigurationOption.ChooseStarterConfig_Python
}

export interface ImportPipelineYAMLInterface {
  branch?: string
  yamlPath?: string
}

export interface SavePipelineToRemoteInterface {
  pipelineName: string
  yamlPath: string
  storeInGit: boolean
  createBranchIfNotExists: boolean
  branch?: string
  defaultBranch?: string
}

export interface ConfigurePipelineRef {
  values?: ImportPipelineYAMLInterface | SavePipelineToRemoteInterface
  configuredOption?: StarterTemplate
  showValidationErrors: () => void
}

export type ConfigurePipelineForwardRef =
  | ((instance: ConfigurePipelineRef | null) => void)
  | React.MutableRefObject<ConfigurePipelineRef | null>
  | null

interface ConfigurePipelineProps {
  configuredGitConnector: ConnectorInfoDTO | undefined
  repoName: string
  showError?: boolean
  disableNextBtn: () => void
  enableNextBtn: () => void
  enableImportYAMLOption?: boolean
}

interface StarterTemplate {
  name: string
  label?: string
  description: string
  pipelineYaml?: string
  icon: IconName
  id: string
  isRecommended?: boolean
}

const HARNESS_FOLDER_PREFIX = '.harness'

const ConfigurePipelineRef = (props: ConfigurePipelineProps, forwardRef: ConfigurePipelineForwardRef) => {
  const { orgIdentifier, projectIdentifier, accountId } = useParams<ProjectPathProps>()
  const { showError, configuredGitConnector, repoName, enableImportYAMLOption, disableNextBtn, enableNextBtn } = props
  const { getString } = useStrings()
  const importYAMLFormikRef = useRef<FormikContextType<ImportPipelineYAMLInterface>>()
  const saveToGitFormikRef = useRef<FormikContextType<SavePipelineToRemoteInterface>>()
  const generatePipelineConfig: StarterTemplate = {
    name: getString('ci.getStartedWithCI.generatePipelineConfig'),
    description: getString('ci.getStartedWithCI.generatePipelineHelpText'),
    icon: 'create-via-pipeline-template',
    id: 'generate-yaml',
    isRecommended: true
  }
  const starterMinimumPipelineConfig: StarterTemplate = {
    name: getString('ci.getStartedWithCI.starterPipelineConfig'),
    description: getString('ci.getStartedWithCI.starterPipelineConfigHelptext'),
    icon: 'create-via-starter-pipeline',
    id: 'starter-pipeline'
  }
  const [selectedConfigOption, setSelectedConfigOption] = useState<StarterTemplate>(generatePipelineConfig)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false)
  const [isFetchingDefaultBranch, setIsFetchingDefaultBranch] = useState<boolean>(false)
  const enableSavePipelinetoRemoteOption =
    configuredGitConnector && SupportedGitProvidersForCIOnboarding.includes(configuredGitConnector.type)

  const markFieldsTouchedToShowValidationErrors = React.useCallback((): void => {
    if (
      [PipelineConfigurationOption.StarterPipeline, PipelineConfigurationOption.GenerateYAML].includes(
        StarterConfigIdToOptionMap[selectedConfigOption.id]
      )
    ) {
      const { values, setFieldTouched } = saveToGitFormikRef.current || {}
      const { branch, yamlPath, pipelineName: _pipelineName } = values || {}
      if (!_pipelineName) {
        setFieldTouched?.('pipelineName', true)
      }
      if (!branch) {
        setFieldTouched?.('branch', true)
      }
      if (!yamlPath) {
        setFieldTouched?.('yamlPath', true)
      }
    } else if (StarterConfigIdToOptionMap[selectedConfigOption.id] === PipelineConfigurationOption.ChooseExistingYAML) {
      const { values, setFieldTouched } = importYAMLFormikRef.current || {}
      const { branch, yamlPath } = values || {}
      if (!branch) {
        setFieldTouched?.('branch', true)
      }
      if (!yamlPath) {
        setFieldTouched?.('yamlPath', true)
      }
    }
  }, [importYAMLFormikRef.current, saveToGitFormikRef.current, selectedConfigOption])

  const setForwardRef = ({ values, configuredOption }: Omit<ConfigurePipelineRef, 'showValidationErrors'>): void => {
    if (!forwardRef || typeof forwardRef === 'function') {
      return
    }

    forwardRef.current = {
      values,
      configuredOption,
      showValidationErrors: markFieldsTouchedToShowValidationErrors
    }
  }

  useEffect(() => {
    if (selectedConfigOption) {
      // add importYAMLFormikRef when import yaml is integrated
      setForwardRef({
        configuredOption: selectedConfigOption,
        values: [PipelineConfigurationOption.StarterPipeline, PipelineConfigurationOption.GenerateYAML].includes(
          StarterConfigIdToOptionMap[selectedConfigOption.id]
        )
          ? saveToGitFormikRef.current?.values
          : {}
      })
    }
  }, [
    selectedConfigOption,
    orgIdentifier,
    projectIdentifier,
    configuredGitConnector,
    repoName,
    saveToGitFormikRef.current
  ])

  const renderCard = useCallback(
    (item: StarterTemplate): JSX.Element => {
      const { name, description, icon, id, label, isRecommended } = item
      const isCurrentOptionSelected = item.id === selectedConfigOption?.id
      return (
        <Card
          onClick={() => setSelectedConfigOption(item)}
          selected={isCurrentOptionSelected}
          cornerSelected={true}
          className={css.configOptionCard}
          key={item.id}
        >
          <Layout.Horizontal flex>
            <Layout.Horizontal flex={{ justifyContent: 'flex-start' }} spacing="medium">
              <Icon name={icon} size={30} />
              <Layout.Vertical padding={{ left: 'medium' }} spacing="xsmall" width="100%">
                <Text font={{ variation: FontVariation.BODY2 }}>{label ?? name}</Text>
                <Text font={{ variation: FontVariation.TINY }}>{description}</Text>
                {isCurrentOptionSelected &&
                StarterConfigIdToOptionMap[id] === PipelineConfigurationOption.ChooseExistingYAML ? (
                  <Layout.Vertical>
                    <Container width="90%">
                      <Separator />
                    </Container>
                    <Container width="60%">
                      <Formik<ImportPipelineYAMLInterface>
                        initialValues={{}}
                        onSubmit={noop}
                        formName="importYAMLForm"
                        validationSchema={Yup.object().shape({
                          branch: Yup.string().trim().required(getString('common.git.validation.baseBranchRequired')),
                          yamlPath: Yup.string()
                            .trim()
                            .required(getString('gitsync.gitSyncForm.yamlPathRequired'))
                            .test('is-valid-yaml-file', getString('ci.getStartedWithCI.validYAMLFile'), value => {
                              return value && isValidYAMLFilePath(value as string)
                            })
                        })}
                      >
                        {formikProps => {
                          importYAMLFormikRef.current = formikProps
                          setForwardRef({
                            values: formikProps.values,
                            configuredOption: selectedConfigOption
                          })
                          return (
                            <FormikForm>
                              <Layout.Vertical
                                spacing="xsmall"
                                padding={formikProps.errors.yamlPath ? { bottom: 'large' } : {}}
                              >
                                <Container>
                                  <Text font={{ variation: FontVariation.FORM_LABEL }} padding={{ bottom: 'xsmall' }}>
                                    {getString('gitsync.selectBranchTitle')}
                                  </Text>
                                  <RepoBranchSelectV2
                                    name="branch"
                                    noLabel={true}
                                    connectorIdentifierRef={
                                      configuredGitConnector && !isHarnessCodeRepoEntity(configuredGitConnector.type)
                                        ? getScopedValueFromDTO(configuredGitConnector)
                                        : ''
                                    }
                                    repoName={repoName}
                                    onChange={(selected: SelectOption) => {
                                      if (formikProps.values.branch !== selected.value) {
                                        formikProps.setFieldValue?.('branch', selected.value)
                                      }
                                    }}
                                    branchSelectorClassName={css.branchSelector}
                                  />
                                </Container>
                                <FormInput.Text
                                  name="yamlPath"
                                  label={
                                    <Text font={{ variation: FontVariation.FORM_LABEL }}>
                                      {getString('gitsync.gitSyncForm.yamlPathLabel')}
                                    </Text>
                                  }
                                  placeholder={getString('gitsync.gitSyncForm.enterYamlPath')}
                                  className={css.yamlPathField}
                                />
                                {showError && !formikProps.values.yamlPath ? (
                                  <Container padding={{ top: 'xsmall' }}>
                                    <FormError
                                      name={'yamlPath'}
                                      errorMessage={getString(
                                        'platform.connectors.cdng.runTimeMonitoredService.pleaseSpecify',
                                        {
                                          field: `a ${getString('gitsync.gitSyncForm.yamlPathLabel').toLowerCase()}`
                                        }
                                      )}
                                    />
                                  </Container>
                                ) : null}
                              </Layout.Vertical>
                            </FormikForm>
                          )
                        }}
                      </Formik>
                    </Container>
                  </Layout.Vertical>
                ) : null}
              </Layout.Vertical>
            </Layout.Horizontal>
            {isRecommended ? (
              <Container className={css.recommendedTag}>
                <Text font={{ variation: FontVariation.SMALL_SEMI }} color={Color.WHITE}>
                  {getString('common.recommended')}
                </Text>
              </Container>
            ) : null}
          </Layout.Horizontal>
        </Card>
      )
    },
    [selectedConfigOption, showError]
  )

  useEffect(() => {
    if (enableSavePipelinetoRemoteOption) {
      fetchDefaultBranch()
    }
  }, [enableSavePipelinetoRemoteOption])

  const fetchDefaultBranch = useCallback((): void => {
    disableNextBtn()
    try {
      setIsFetchingDefaultBranch(true)
      getListOfBranchesByRefConnectorV2Promise({
        queryParams: {
          connectorRef:
            configuredGitConnector && !isHarnessCodeRepoEntity(configuredGitConnector.type)
              ? getScopedValueFromDTO(configuredGitConnector as ScopedValueObjectDTO)
              : undefined,
          accountIdentifier: accountId,
          orgIdentifier,
          projectIdentifier,
          repoName: configuredGitConnector && getRepoNameForDefaultBranchFetch(configuredGitConnector, repoName),
          size: 1
        }
      })
        .then((result: ResponseGitBranchesResponseDTO) => {
          const { data, status } = result
          if (status === Status.SUCCESS) {
            const { defaultBranch } = data || {}
            if (defaultBranch?.name && saveToGitFormikRef.current) {
              saveToGitFormikRef.current.setValues(
                produce(saveToGitFormikRef.current.values, (draft: SavePipelineToRemoteInterface) => {
                  return set(set(draft, 'branch', defaultBranch.name), 'defaultBranch', defaultBranch.name)
                })
              )
            }
          } else {
            setShowAdvancedOptions(true)
            saveToGitFormikRef.current?.setFieldTouched('branch', true)
          }
          setIsFetchingDefaultBranch(false)
          saveToGitFormikRef.current?.setFieldTouched('branch', true)
        })
        .catch((_e: unknown) => {
          setIsFetchingDefaultBranch(false)
          setShowAdvancedOptions(true)
          saveToGitFormikRef.current?.setFieldTouched('branch', true)
        })
    } catch (e) {
      setIsFetchingDefaultBranch(false)
      setShowAdvancedOptions(true)
      saveToGitFormikRef.current?.setFieldTouched('branch', true)
    }
    enableNextBtn()
  }, [configuredGitConnector?.type, saveToGitFormikRef.current])

  const defaultYAMLPath = useMemo((): string => {
    return `${HARNESS_FOLDER_PREFIX}/pipelines/${getIdentifierFromValue(
      getValidRepoName(repoName)
    )}-${new Date().getTime()}.yaml`
  }, [repoName])

  return (
    <Layout.Horizontal spacing="huge">
      <Layout.Vertical width="40%" spacing="medium">
        <Text font={{ variation: FontVariation.H4 }}>{getString('ci.getStartedWithCI.configurePipeline')}</Text>
        <Layout.Vertical spacing="medium" padding={{ bottom: 'medium' }}>
          {[generatePipelineConfig, starterMinimumPipelineConfig].map(item => renderCard(item))}
        </Layout.Vertical>
        {/* Enable this once limitations related to import yaml api are resolved. */}
        {enableImportYAMLOption
          ? renderCard({
              name: getString('ci.getStartedWithCI.importExistingYAML'),
              description: getString('ci.getStartedWithCI.importExistingYAMLHelptext'),
              icon: 'create-via-pipeline-template',
              id: 'choose-existing-yaml'
            })
          : null}
        {enableSavePipelinetoRemoteOption ? (
          <Collapse
            isOpen={showAdvancedOptions}
            heading={
              <Container padding={{ top: 'small' }}>
                <Text font={{ variation: FontVariation.SMALL }}>{getString('common.seeAdvancedOptions')}</Text>
              </Container>
            }
            iconProps={{
              name: showAdvancedOptions ? 'chevron-down' : 'chevron-right',
              size: 20,
              padding: { top: 'small', right: 'xsmall' }
            }}
            collapseClassName={css.advancedOptions}
            keepChildrenMounted={true}
            onToggleOpen={isOpen => setShowAdvancedOptions(isOpen)}
          >
            <Formik<SavePipelineToRemoteInterface>
              onSubmit={noop}
              formName="configure-pipeline-advanced-options"
              validationSchema={Yup.object().shape({
                pipelineName: Yup.string().trim().required(getString('createPipeline.pipelineNameRequired')),
                branch: Yup.string()
                  .trim()
                  .when('storeInGit', {
                    is: val => !!val,
                    then: Yup.string().required(getString('common.git.validation.branchRequired'))
                  }),
                yamlPath: Yup.string()
                  .trim()
                  .required(getString('gitsync.gitSyncForm.yamlPathRequired'))
                  .test('is-valid-yaml-file', getString('ci.getStartedWithCI.validYAMLFile'), value => {
                    return value && isValidYAMLFilePath(value as string)
                  })
              })}
              initialValues={{
                pipelineName: `Build ${getValidRepoName(repoName)}`,
                yamlPath: defaultYAMLPath,
                storeInGit: true,
                createBranchIfNotExists: true
              }}
              enableReinitialize={true}
            >
              {_formikProps => {
                saveToGitFormikRef.current = _formikProps
                setForwardRef({
                  values: _formikProps.values,
                  configuredOption: selectedConfigOption
                })
                return (
                  <FormikForm>
                    <Layout.Vertical className={css.advancedOptionFormFields}>
                      <Layout.Vertical>
                        <FormInput.Text
                          name="pipelineName"
                          label={
                            <Text font={{ variation: FontVariation.FORM_LABEL }}>
                              {getString('filters.executions.pipelineName')}
                            </Text>
                          }
                          placeholder={getString('pipeline.filters.pipelineNamePlaceholder')}
                        />
                        <FormInput.CheckBox
                          name="storeInGit"
                          label={getString('ci.getStartedWithCI.storeInGit')}
                          defaultChecked={true}
                          onChange={event => {
                            const isChecked = event.currentTarget.checked
                            saveToGitFormikRef.current?.setValues(
                              produce(saveToGitFormikRef.current.values, (draft: SavePipelineToRemoteInterface) => {
                                return set(set(draft, 'storeInGit', isChecked), 'createBranchIfNotExists', isChecked)
                              })
                            )
                          }}
                        />
                      </Layout.Vertical>
                      <Container padding={{ top: 'medium', bottom: 'medium' }}>
                        <FormInput.Text
                          name="yamlPath"
                          label={
                            <Text font={{ variation: FontVariation.FORM_LABEL }}>
                              {getString('gitsync.gitSyncForm.yamlPathLabel')}
                            </Text>
                          }
                          placeholder={getString('gitsync.gitSyncForm.enterYamlPath')}
                        />
                      </Container>
                      <Layout.Vertical>
                        <Layout.Horizontal
                          flex={{ justifyContent: 'flex-start', alignItems: 'center' }}
                          spacing="medium"
                        >
                          <FormInput.Text
                            name="branch"
                            label={
                              <Text font={{ variation: FontVariation.FORM_LABEL }}>
                                {getString('pipelineSteps.deploy.inputSet.branch')}
                              </Text>
                            }
                            placeholder={getString('ci.getStartedWithCI.enterBranch')}
                            disabled={isFetchingDefaultBranch}
                          />
                          {isFetchingDefaultBranch ? (
                            <Icon name="steps-spinner" color={Color.PRIMARY_7} size={20} padding={{ top: 'medium' }} />
                          ) : null}
                        </Layout.Horizontal>
                        <FormInput.CheckBox
                          name="createBranchIfNotExists"
                          label={getString('ci.getStartedWithCI.createBranchIfNotExists')}
                          defaultChecked={true}
                        />
                      </Layout.Vertical>
                    </Layout.Vertical>
                  </FormikForm>
                )
              }}
            </Formik>
          </Collapse>
        ) : null}
      </Layout.Vertical>
    </Layout.Horizontal>
  )
}

export const ConfigurePipeline = React.forwardRef(ConfigurePipelineRef)
