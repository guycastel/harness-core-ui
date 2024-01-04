/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo, useEffect, useState } from 'react'
import { defaultTo, get, memoize, set } from 'lodash-es'

import { Layout, MultiTypeInputType, SelectOption } from '@harness/uicore'
import produce from 'immer'
import { IItemRendererProps } from '@blueprintjs/select'
import { ArtifactSourceBase, ArtifactSourceRenderProps } from '@cd/factory/ArtifactSourceFactory/ArtifactSourceBase'
import { ArtifactToConnectorMap, ENABLED_ARTIFACT_TYPES } from '@pipeline/components/ArtifactsSelection/ArtifactHelper'
import { useStrings } from 'framework/strings'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { FormMultiTypeConnectorField } from '@platform/connectors/components/ConnectorReferenceField/FormMultiTypeConnectorField'
import {
  ArtifactSource,
  GARBuildDetailsDTO,
  GARPackageDTO,
  GarRepositoryDTO,
  RegionGar,
  SidecarArtifact,
  useGetBuildDetailsForGoogleArtifactRegistry,
  useGetBuildDetailsForGoogleArtifactRegistryV2,
  useGetPackagesForGoogleArtifactRegistry,
  useGetPackagesForGoogleArtifactRegistryV2,
  useGetRegionsForGoogleArtifactRegistry,
  useGetRepositoriesForGoogleArtifactRegistry,
  useGetRepositoriesForGoogleArtifactRegistryV2
} from 'services/cd-ng'
import { NoTagResults } from '@pipeline/components/ArtifactsSelection/ArtifactRepository/ArtifactLastSteps/ArtifactImagePathTagView/ArtifactImagePathTagView'
import { TriggerDefaultFieldList } from '@triggers/components/Triggers/utils'
import { useMutateAsGet } from '@common/hooks'
import type { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { EXPRESSION_STRING } from '@pipeline/utils/constants'
import { TextFieldInputSetView } from '@pipeline/components/InputSetView/TextFieldInputSetView/TextFieldInputSetView'
import { SelectInputSetView } from '@pipeline/components/InputSetView/SelectInputSetView/SelectInputSetView'
import {
  isAllFieldsAreFixedForFetchingPackages,
  isAllFieldsAreFixedForFetchRepos,
  isAllFieldsAreFixedInGAR,
  isArtifactInMultiService,
  isFieldFixedAndNonEmpty
} from '@pipeline/components/ArtifactsSelection/ArtifactUtils'
import { useIsTagRegex } from '@pipeline/hooks/useIsTagRegex'
import ItemRendererWithMenuItem from '@modules/10-common/components/ItemRenderer/ItemRendererWithMenuItem'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { isFieldRuntime } from '../../K8sServiceSpecHelper'
import {
  getDefaultQueryParam,
  getFinalQueryParamValue,
  getFqnPath,
  getValidInitialValueFromArrayOfValues,
  getYamlData,
  isFieldfromTriggerTabDisabled,
  isNewServiceEnvEntity
} from '../artifactSourceUtils'
import DigestField from '../ArtifactSourceRuntimeFields/DigestField'
import { useGetDigestDetailsForGar } from './useGetDigestDetailsForGar'
import css from '../../../Common/GenericServiceSpec/GenericServiceSpec.module.scss'
interface JenkinsRenderContent extends ArtifactSourceRenderProps {
  isTagsSelectionDisabled: (data: ArtifactSourceRenderProps) => boolean
}
const Content = (props: JenkinsRenderContent): React.ReactElement => {
  const {
    isPrimaryArtifactsRuntime,
    isSidecarRuntime,
    template,
    formik,
    path,
    readonly,
    allowableTypes,
    artifactPath,
    initialValues,
    accountId,
    stageIdentifier,
    projectIdentifier,
    orgIdentifier,
    artifact,
    repoIdentifier,
    branch,
    fromTrigger,
    isSidecar,
    serviceIdentifier,
    gitMetadata,
    stepViewType,
    pipelineIdentifier,
    serviceBranch,
    artifacts,
    resolvedArtifacts,
    useArtifactV1Data = false
  } = props

  const { getString } = useStrings()
  const [regions, setRegions] = useState<SelectOption[]>([])
  const [repoSelectItems, setRepoSelectItems] = useState<SelectOption[]>([])
  const [packageSelectItems, setPackageSelectItems] = useState<SelectOption[]>([])
  const { expressions } = useVariablesExpression()
  const { NG_EXPRESSIONS_NEW_INPUT_ELEMENT } = useFeatureFlags()
  const commonParams = {
    accountIdentifier: accountId,
    projectIdentifier,
    orgIdentifier,
    repoIdentifier,
    branch
  }

  const serviceId = isNewServiceEnvEntity(path as string) ? serviceIdentifier : undefined
  const isPropagatedStage = path?.includes('serviceConfig.stageOverrides')

  // when some runtime input provided in nested pipeline and remaining runtime values depend on this value,
  // we need to pick the correct value from resolved artifact instead of artifact.
  // sequence should be artifacts, resolvedArtifacts, artifact, initialValues
  const connectorRefValue = getDefaultQueryParam(
    getValidInitialValueFromArrayOfValues(
      [artifacts, resolvedArtifacts],
      `${artifactPath}.spec.connectorRef`,
      artifact?.spec?.connectorRef
    ),
    get(initialValues?.artifacts, `${artifactPath}.spec.connectorRef`, '')
  )
  const packageValue = getDefaultQueryParam(
    getValidInitialValueFromArrayOfValues(
      [artifacts, resolvedArtifacts],
      `${artifactPath}.spec.package`,
      artifact?.spec?.package
    ),
    get(initialValues?.artifacts, `${artifactPath}.spec.package`)
  )
  const projectValue = getDefaultQueryParam(
    getValidInitialValueFromArrayOfValues(
      [artifacts, resolvedArtifacts],
      `${artifactPath}.spec.project`,
      artifact?.spec?.project
    ),
    get(initialValues?.artifacts, `${artifactPath}.spec.project`)
  )
  const regionValue = getDefaultQueryParam(
    getValidInitialValueFromArrayOfValues(
      [artifacts, resolvedArtifacts],
      `${artifactPath}.spec.region`,
      artifact?.spec?.region
    ),
    get(initialValues?.artifacts, `${artifactPath}.spec.region`)
  )
  const repositoryNameValue = getDefaultQueryParam(
    getValidInitialValueFromArrayOfValues(
      [artifacts, resolvedArtifacts],
      `${artifactPath}.spec.repositoryName`,
      artifact?.spec?.repositoryName
    ),
    get(initialValues?.artifacts, `${artifactPath}.spec.repositoryName`)
  )

  const versionValue = getDefaultQueryParam(
    getValidInitialValueFromArrayOfValues(
      [artifacts, resolvedArtifacts],
      `${artifactPath}.spec.version`,
      artifact?.spec?.version
    ),
    get(initialValues?.artifacts, `${artifactPath}.spec.version`)
  )

  const { isTagRegex: isVersionRegex, isServiceLoading } = useIsTagRegex({
    serviceIdentifier: serviceIdentifier!,
    gitMetadata,
    serviceBranch,
    artifact: artifact as ArtifactSource,
    artifactPath: artifactPath!,
    tagOrVersionRegexKey: 'versionRegex'
  })
  // v1 tags api is required to fetch tags for artifact source template usage while linking to service
  // Here v2 api cannot be used to get the builds because of unavailability of complete yaml during creation.
  const {
    data: buildsV1Detail,
    refetch: refetchBuildV1Details,
    loading: fetchingV1Builds,
    error: fetchingV1BuildsError
  } = useGetBuildDetailsForGoogleArtifactRegistry({
    lazy: true,
    queryParams: {
      ...commonParams,
      connectorRef: getFinalQueryParamValue(connectorRefValue),
      package: getFinalQueryParamValue(packageValue),
      project: getFinalQueryParamValue(projectValue),
      region: getFinalQueryParamValue(regionValue),
      repositoryName: getFinalQueryParamValue(repositoryNameValue)
    }
  })

  // v1 tags api is required to fetch tags for artifact source template usage while linking to service
  // Here v2 api cannot be used to get the builds because of unavailability of complete yaml during creation.
  const {
    data: reposV1Detail,
    refetch: refetchReposV1Details,
    loading: fetchingV1Repos,
    error: fetchingV1ReposError
  } = useGetRepositoriesForGoogleArtifactRegistry({
    lazy: true,
    queryParams: {
      ...commonParams,
      connectorRef: getFinalQueryParamValue(connectorRefValue),
      project: getFinalQueryParamValue(projectValue),
      region: getFinalQueryParamValue(regionValue)
    }
  })

  const {
    data: packagesV1Detail,
    refetch: refetchPackagesV1Details,
    loading: fetchingV1Packages,
    error: fetchingV1PackagesError
  } = useGetPackagesForGoogleArtifactRegistry({
    lazy: true,
    queryParams: {
      ...commonParams,
      connectorRef: getFinalQueryParamValue(connectorRefValue),
      project: getFinalQueryParamValue(projectValue),
      region: getFinalQueryParamValue(regionValue),
      repositoryName: getFinalQueryParamValue(repositoryNameValue)
    }
  })

  const isMultiService = isArtifactInMultiService(formik?.values?.services, path)
  const pipelineRuntimeYaml = getYamlData(formik?.values, stepViewType as StepViewType, path as string)

  const {
    data: buildsV2Detail,
    refetch: refetchBuildV2Details,
    loading: fetchingV2Builds,
    error: fetchingV2BuildsError
  } = useMutateAsGet(useGetBuildDetailsForGoogleArtifactRegistryV2, {
    lazy: true,
    body: pipelineRuntimeYaml,
    requestOptions: {
      headers: {
        'content-type': 'application/json'
      }
    },
    queryParams: {
      ...commonParams,
      connectorRef: getFinalQueryParamValue(connectorRefValue),
      package: getFinalQueryParamValue(packageValue),
      project: getFinalQueryParamValue(projectValue),
      region: getFinalQueryParamValue(regionValue),
      repositoryName: getFinalQueryParamValue(repositoryNameValue),
      pipelineIdentifier: defaultTo(pipelineIdentifier, formik?.values?.identifier),
      serviceId: isNewServiceEnvEntity(path as string) ? serviceIdentifier : undefined,
      fqnPath: getFqnPath(
        path as string,
        !!isPropagatedStage,
        stageIdentifier,
        defaultTo(
          isSidecar
            ? artifactPath?.split('[')[0].concat(`.${get(initialValues?.artifacts, `${artifactPath}.identifier`)}`)
            : artifactPath,
          ''
        ),
        'version',
        serviceIdentifier as string,
        isMultiService
      )
    }
  })

  const {
    data: reposV2Detail,
    refetch: refetchReposV2Details,
    loading: fetchingV2Repos,
    error: fetchingV2ReposError
  } = useMutateAsGet(useGetRepositoriesForGoogleArtifactRegistryV2, {
    lazy: true,
    body: pipelineRuntimeYaml,
    requestOptions: {
      headers: {
        'content-type': 'application/json'
      }
    },
    queryParams: {
      ...commonParams,
      connectorRef: getFinalQueryParamValue(connectorRefValue),
      project: getFinalQueryParamValue(projectValue),
      region: getFinalQueryParamValue(regionValue),
      pipelineIdentifier: defaultTo(pipelineIdentifier, formik?.values?.identifier),
      serviceId: isNewServiceEnvEntity(path as string) ? serviceIdentifier : undefined,
      fqnPath: getFqnPath(
        path as string,
        !!isPropagatedStage,
        stageIdentifier,
        defaultTo(
          isSidecar
            ? artifactPath?.split('[')[0].concat(`.${get(initialValues?.artifacts, `${artifactPath}.identifier`)}`)
            : artifactPath,
          ''
        ),
        'repositoryName',
        serviceIdentifier as string,
        isMultiService
      )
    }
  })

  const {
    data: packagesV2Detail,
    refetch: refetchPackagesV2Details,
    loading: fetchingV2Packages,
    error: fetchingV2PackagesError
  } = useMutateAsGet(useGetPackagesForGoogleArtifactRegistryV2, {
    lazy: true,
    body: pipelineRuntimeYaml,
    requestOptions: {
      headers: {
        'content-type': 'application/json'
      }
    },
    queryParams: {
      ...commonParams,
      connectorRef: getFinalQueryParamValue(connectorRefValue),
      project: getFinalQueryParamValue(projectValue),
      region: getFinalQueryParamValue(regionValue),
      repositoryName: getFinalQueryParamValue(repositoryNameValue),
      pipelineIdentifier: defaultTo(pipelineIdentifier, formik?.values?.identifier),
      serviceId: isNewServiceEnvEntity(path as string) ? serviceIdentifier : undefined,
      fqnPath: getFqnPath(
        path as string,
        !!isPropagatedStage,
        stageIdentifier,
        defaultTo(
          isSidecar
            ? artifactPath?.split('[')[0].concat(`.${get(initialValues?.artifacts, `${artifactPath}.identifier`)}`)
            : artifactPath,
          ''
        ),
        'package',
        serviceIdentifier as string,
        isMultiService
      )
    }
  })

  const { refetchBuildDetails, fetchingBuilds, error, buildsDetail } = useArtifactV1Data
    ? {
        refetchBuildDetails: refetchBuildV1Details,
        fetchingBuilds: fetchingV1Builds,
        error: fetchingV1BuildsError,
        buildsDetail: buildsV1Detail
      }
    : {
        refetchBuildDetails: refetchBuildV2Details,
        fetchingBuilds: fetchingV2Builds,
        error: fetchingV2BuildsError,
        buildsDetail: buildsV2Detail
      }

  const { refetchRepoDetails, fetchingRepos, errorFetchingRepos, reposDetail } = useArtifactV1Data
    ? {
        refetchRepoDetails: refetchReposV1Details,
        fetchingRepos: fetchingV1Repos,
        errorFetchingRepos: fetchingV1ReposError,
        reposDetail: reposV1Detail
      }
    : {
        refetchRepoDetails: refetchReposV2Details,
        fetchingRepos: fetchingV2Repos,
        errorFetchingRepos: fetchingV2ReposError,
        reposDetail: reposV2Detail
      }

  const { refetchPackageDetails, fetchingPackages, errorFetchingPackages, packageDetails } = useArtifactV1Data
    ? {
        refetchPackageDetails: refetchPackagesV1Details,
        fetchingPackages: fetchingV1Packages,
        errorFetchingPackages: fetchingV1PackagesError,
        packageDetails: packagesV1Detail
      }
    : {
        refetchPackageDetails: refetchPackagesV2Details,
        fetchingPackages: fetchingV2Packages,
        errorFetchingPackages: fetchingV2PackagesError,
        packageDetails: packagesV2Detail
      }

  const {
    fetchDigest,
    fetchingDigest,
    fetchDigestError: digestError,
    garDigestData: digestData
  } = useGetDigestDetailsForGar({
    connectorRef: getFinalQueryParamValue(connectorRefValue),
    version: getFinalQueryParamValue(versionValue),
    project: getFinalQueryParamValue(projectValue),
    region: getFinalQueryParamValue(regionValue),
    repositoryName: getFinalQueryParamValue(repositoryNameValue),
    packageValue: getFinalQueryParamValue(packageValue), // field name is 'package'
    accountId,
    projectIdentifier,
    orgIdentifier,
    repoIdentifier,
    branch,
    useArtifactV1Data,
    formik,
    path,
    initialValues,
    isPropagatedStage,
    serviceId,
    isSidecar,
    artifactPath,
    stageIdentifier,
    pipelineIdentifier,
    stepViewType
  })

  const itemRendererForRepo = memoize((item: SelectOption, itemProps: IItemRendererProps) => (
    <ItemRendererWithMenuItem item={item} itemProps={itemProps} disabled={fetchingRepos} />
  ))
  const itemRendererForPackage = memoize((item: SelectOption, itemProps: IItemRendererProps) => (
    <ItemRendererWithMenuItem item={item} itemProps={itemProps} disabled={fetchingPackages} />
  ))
  const itemRendererForBuild = memoize((item: SelectOption, itemProps: IItemRendererProps) => (
    <ItemRendererWithMenuItem item={item} itemProps={itemProps} disabled={fetchingBuilds} />
  ))

  const selectItems = useMemo(() => {
    return buildsDetail?.data?.buildDetailsList?.map((builds: GARBuildDetailsDTO) => ({
      value: defaultTo(builds.version, ''),
      label: defaultTo(builds.version, '')
    }))
  }, [buildsDetail?.data])

  const getBuildDetails = (): { label: string; value: string }[] => {
    if (fetchingBuilds) {
      return [
        {
          label: getString('common.loadingFieldOptions', {
            fieldName: getString('buildText')
          }),
          value: getString('common.loadingFieldOptions', {
            fieldName: getString('buildText')
          })
        }
      ]
    }
    return defaultTo(selectItems, [])
  }

  useEffect(() => {
    if (errorFetchingRepos) {
      setRepoSelectItems([])
      return
    }
    const repoItems =
      reposDetail?.data?.garRepositoryDTOList?.map((repo: GarRepositoryDTO) => ({
        value: defaultTo(repo.repository, ''),
        label: defaultTo(repo.repository, '')
      })) || []
    setRepoSelectItems(repoItems)
  }, [reposDetail?.data, errorFetchingRepos])

  useEffect(() => {
    if (errorFetchingPackages) {
      setPackageSelectItems([])
      return
    }
    const packageItems =
      packageDetails?.data?.garPackageDTOList?.map((repo: GARPackageDTO) => ({
        value: defaultTo(repo.packageName, ''),
        label: defaultTo(repo.packageName, '')
      })) || []
    setPackageSelectItems(packageItems)
  }, [packageDetails?.data, errorFetchingPackages])

  const getRepoDetails = (): SelectOption[] => {
    if (fetchingRepos) {
      return [
        {
          label: getString('common.loadingFieldOptionsSingular', {
            fieldName: getString('repositories')
          }),
          value: getString('common.loadingFieldOptionsSingular', {
            fieldName: getString('repositories')
          })
        }
      ]
    }
    return defaultTo(repoSelectItems, [])
  }

  const getPackageDetails = (): SelectOption[] => {
    if (fetchingPackages) {
      return [
        {
          label: getString('common.loadingFieldOptionsSingular', {
            fieldName: getString('packagesLabel')
          }),
          value: getString('common.loadingFieldOptionsSingular', {
            fieldName: getString('packagesLabel')
          })
        }
      ]
    }
    return defaultTo(packageSelectItems, [])
  }

  const { data: regionData } = useGetRegionsForGoogleArtifactRegistry({})

  useEffect(() => {
    if (regionData?.data) {
      setRegions(
        regionData?.data?.map((item: RegionGar) => {
          return { label: item.name, value: item.value } as SelectOption
        })
      )
    }
  }, [regionData])

  const isFieldDisabled = (fieldName: string): boolean => {
    /* instanbul ignore else */
    if (
      readonly ||
      isServiceLoading ||
      isFieldfromTriggerTabDisabled(
        fieldName,
        formik,
        stageIdentifier,
        fromTrigger,
        isSidecar ? (artifact as SidecarArtifact)?.identifier : undefined
      )
    ) {
      return true
    }
    return false
  }

  const isRuntime = isPrimaryArtifactsRuntime || isSidecarRuntime
  return (
    <>
      {isRuntime && (
        <Layout.Vertical key={artifactPath} className={css.inputWidth}>
          {isFieldRuntime(`artifacts.${artifactPath}.spec.connectorRef`, template) && (
            <FormMultiTypeConnectorField
              name={`${path}.artifacts.${artifactPath}.spec.connectorRef`}
              label={getString('pipelineSteps.deploy.inputSet.artifactServer')}
              selected={get(initialValues, `artifacts.${artifactPath}.spec.connectorRef`, '')}
              placeholder={''}
              accountIdentifier={accountId}
              projectIdentifier={projectIdentifier}
              orgIdentifier={orgIdentifier}
              setRefValue
              disabled={isFieldDisabled(`artifacts.${artifactPath}.spec.connectorRef`)}
              multiTypeProps={{
                allowableTypes,
                expressions,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              }}
              type={ArtifactToConnectorMap[defaultTo(artifact?.type, '')]}
              gitScope={{
                repo: defaultTo(repoIdentifier, ''),
                branch: defaultTo(branch, ''),
                getDefaultFromOtherRepo: true
              }}
              templateProps={{
                isTemplatizedView: true,
                templateValue: get(template, `artifacts.${artifactPath}.spec.connectorRef`)
              }}
            />
          )}
          {isFieldRuntime(`artifacts.${artifactPath}.spec.project`, template) && (
            <TextFieldInputSetView
              fieldPath={`artifacts.${artifactPath}.spec.project`}
              template={template}
              name={`${path}.artifacts.${artifactPath}.spec.project`}
              label={getString('pipelineSteps.projectIDLabel')}
              placeholder={getString('pipeline.artifactsSelection.projectIDPlaceholder')}
              disabled={isFieldDisabled(`artifacts.${artifactPath}.spec.project`)}
              onChange={value => {
                formik.setValues(
                  produce(formik.values, (draft: any) => {
                    set(draft, `${path}.artifacts.${artifactPath}.spec.project`, value)
                    set(draft, `${path}.artifacts.${artifactPath}.spec.repositoryName`, '')
                  })
                )
                setRepoSelectItems([])
                setPackageSelectItems([])
              }}
              multiTextInputProps={{
                expressions,
                allowableTypes,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              }}
            />
          )}
          {isFieldRuntime(`artifacts.${artifactPath}.spec.region`, template) && (
            <SelectInputSetView
              fieldPath={`artifacts.${artifactPath}.spec.region`}
              template={template}
              label={getString('regionLabel')}
              name={`${path}.artifacts.${artifactPath}.spec.region`}
              useValue
              placeholder={getString('pipeline.regionPlaceholder')}
              disabled={isFieldDisabled(`artifacts.${artifactPath}.spec.region`)}
              multiTypeInputProps={{
                onChange: value => {
                  setRepoSelectItems([])
                  setPackageSelectItems([])
                  formik.setValues(
                    produce(formik.values, (draft: any) => {
                      set(
                        draft,
                        `${path}.artifacts.${artifactPath}.spec.region`,
                        defaultTo((value as SelectOption)?.value, value)
                      )
                      if (
                        isFieldRuntime(`artifacts.${artifactPath}.spec.repositoryName`, template) &&
                        isFieldFixedAndNonEmpty(repositoryNameValue)
                      )
                        set(draft, `${path}.artifacts.${artifactPath}.spec.repositoryName`, '')
                      if (
                        isFieldRuntime(`artifacts.${artifactPath}.spec.package`, template) &&
                        isFieldFixedAndNonEmpty(packageValue)
                      )
                        set(draft, `${path}.artifacts.${artifactPath}.spec.package`, '')
                    })
                  )
                },
                onTypeChange: (type: MultiTypeInputType) =>
                  formik.setFieldValue(`${path}.artifacts.${artifactPath}.spec.region`, type),
                expressions,
                selectProps: {
                  allowCreatingNewItems: true,
                  addClearBtn: !readonly,
                  items: defaultTo(regions, [])
                },
                allowableTypes,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              }}
              selectItems={regions}
            />
          )}
          {isFieldRuntime(`artifacts.${artifactPath}.spec.repositoryName`, template) && (
            <SelectInputSetView
              fieldPath={`artifacts.${artifactPath}.spec.repositoryName`}
              template={template}
              selectItems={getRepoDetails()}
              name={`${path}.artifacts.${artifactPath}.spec.repositoryName`}
              label={getString('common.repositoryName')}
              placeholder={getString('pipeline.manifestType.repoNamePlaceholder')}
              useValue
              disabled={isFieldDisabled(`artifacts.${artifactPath}.spec.repositoryName`)}
              multiTypeInputProps={{
                onChange: value => {
                  setPackageSelectItems([])
                  formik.setValues(
                    produce(formik.values, (draft: any) => {
                      set(
                        draft,
                        `${path}.artifacts.${artifactPath}.spec.repositoryName`,
                        defaultTo((value as SelectOption)?.value, value)
                      )
                      if (
                        isFieldRuntime(`artifacts.${artifactPath}.spec.package`, template) &&
                        isFieldFixedAndNonEmpty(packageValue)
                      )
                        set(draft, `${path}.artifacts.${artifactPath}.spec.package`, '')
                    })
                  )
                },
                expressions,
                allowableTypes,
                selectProps: {
                  noResults: (
                    <NoTagResults
                      tagError={errorFetchingRepos}
                      isServerlessDeploymentTypeSelected={false}
                      defaultErrorText={getString('pipeline.artifactsSelection.validation.noRepo')}
                    />
                  ),
                  itemRenderer: itemRendererForRepo,
                  items: getRepoDetails(),
                  allowCreatingNewItems: true
                },
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
                  if (
                    e?.target?.type !== 'text' ||
                    (e?.target?.type === 'text' && e?.target?.placeholder === EXPRESSION_STRING)
                  ) {
                    return
                  }
                  if (isAllFieldsAreFixedForFetchRepos(projectValue, regionValue, connectorRefValue))
                    refetchRepoDetails()
                }
              }}
            />
          )}
          {isFieldRuntime(`artifacts.${artifactPath}.spec.package`, template) && (
            <SelectInputSetView
              fieldPath={`artifacts.${artifactPath}.spec.package`}
              template={template}
              selectItems={getPackageDetails()}
              name={`${path}.artifacts.${artifactPath}.spec.package`}
              label={getString('pipeline.testsReports.callgraphField.package')}
              placeholder={getString('pipeline.manifestType.packagePlaceholder')}
              useValue
              disabled={isFieldDisabled(`artifacts.${artifactPath}.spec.package`)}
              multiTypeInputProps={{
                expressions,
                allowableTypes,
                selectProps: {
                  noResults: (
                    <NoTagResults
                      tagError={errorFetchingPackages}
                      isServerlessDeploymentTypeSelected={false}
                      defaultErrorText={getString('pipeline.artifactsSelection.validation.noPackage')}
                    />
                  ),
                  itemRenderer: itemRendererForPackage,
                  items: getPackageDetails(),
                  allowCreatingNewItems: true
                },
                onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
                  if (
                    e?.target?.type !== 'text' ||
                    (e?.target?.type === 'text' && e?.target?.placeholder === EXPRESSION_STRING)
                  ) {
                    return
                  }
                  if (
                    isAllFieldsAreFixedForFetchingPackages(
                      projectValue,
                      regionValue,
                      repositoryNameValue,
                      connectorRefValue
                    )
                  )
                    refetchPackageDetails()
                },
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              }}
            />
          )}
          {!fromTrigger && isFieldRuntime(`artifacts.${artifactPath}.spec.version`, template) && (
            <SelectInputSetView
              fieldPath={`artifacts.${artifactPath}.spec.version`}
              template={template}
              selectItems={getBuildDetails()}
              disabled={isFieldDisabled(`artifacts.${artifactPath}.spec.version`)}
              name={`${path}.artifacts.${artifactPath}.spec.version`}
              label={getString('version')}
              placeholder={getString('pipeline.artifactsSelection.versionPlaceholder')}
              useValue
              multiTypeInputProps={{
                expressions,
                allowableTypes,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT,
                selectProps: {
                  noResults: (
                    <NoTagResults
                      tagError={error}
                      isServerlessDeploymentTypeSelected={false}
                      defaultErrorText={getString('pipeline.artifactsSelection.validation.noBuild')}
                    />
                  ),
                  itemRenderer: itemRendererForBuild,
                  items: getBuildDetails(),
                  allowCreatingNewItems: true
                },
                onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
                  if (
                    e?.target?.type !== 'text' ||
                    (e?.target?.type === 'text' && e?.target?.placeholder === EXPRESSION_STRING)
                  ) {
                    return
                  }
                  if (
                    isAllFieldsAreFixedInGAR(
                      projectValue,
                      regionValue,
                      repositoryNameValue,
                      packageValue,
                      connectorRefValue
                    )
                  )
                    refetchBuildDetails()
                }
              }}
            />
          )}

          {!!fromTrigger && isFieldRuntime(`artifacts.${artifactPath}.spec.version`, template) && (
            <TextFieldInputSetView
              fieldPath={`artifacts.${artifactPath}.spec.version`}
              template={template}
              label={getString('version')}
              multiTextInputProps={{
                expressions,
                value: TriggerDefaultFieldList.build,
                allowableTypes,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              }}
              disabled={true}
              name={`${path}.artifacts.${artifactPath}.spec.version`}
            />
          )}
          {isFieldRuntime(`artifacts.${artifactPath}.spec.versionRegex`, template) && (
            <TextFieldInputSetView
              fieldPath={`artifacts.${artifactPath}.spec.versionRegex`}
              template={template}
              name={`${path}.artifacts.${artifactPath}.spec.versionRegex`}
              label={getString('pipeline.artifactsSelection.versionRegex')}
              placeholder={getString('pipeline.artifactsSelection.versionRegexPlaceholder')}
              disabled={readonly}
              multiTextInputProps={{
                expressions,
                allowableTypes,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              }}
            />
          )}

          {!fromTrigger && !isVersionRegex && isFieldRuntime(`artifacts.${artifactPath}.spec.digest`, template) && (
            <div className={css.inputFieldLayout}>
              <DigestField
                {...props}
                fetchingDigest={fetchingDigest}
                fetchDigestError={digestError}
                fetchDigest={fetchDigest}
                expressions={expressions}
                stageIdentifier={stageIdentifier}
                digestData={digestData}
                disabled={isFieldDisabled(`artifacts.${artifactPath}.spec.digest`)}
              />
            </div>
          )}

          {!fromTrigger && isVersionRegex && isFieldRuntime(`artifacts.${artifactPath}.spec.digest`, template) && (
            <TextFieldInputSetView
              tooltipProps={{
                dataTooltipId: 'artifactDigestTooltip'
              }}
              disabled={isFieldDisabled(`artifacts.${artifactPath}.spec.digest`)}
              placeholder={getString('pipeline.artifactsSelection.digestPlaceholder')}
              multiTextInputProps={{
                expressions,
                allowableTypes,
                newExpressionComponent: NG_EXPRESSIONS_NEW_INPUT_ELEMENT
              }}
              label={getString('pipeline.digest')}
              name={`${path}.artifacts.${artifactPath}.spec.digest`}
              fieldPath={`artifacts.${artifactPath}.spec.digest`}
              template={template}
            />
          )}
        </Layout.Vertical>
      )}
    </>
  )
}

export class GoogleArtifactRegistrySource extends ArtifactSourceBase<ArtifactSourceRenderProps> {
  protected artifactType = ENABLED_ARTIFACT_TYPES.GoogleArtifactRegistry
  protected isSidecar = false

  isTagsSelectionDisabled(_props: ArtifactSourceRenderProps): boolean {
    return false
  }

  renderContent(props: ArtifactSourceRenderProps): JSX.Element | null {
    if (!props.isArtifactsRuntime) {
      return null
    }

    this.isSidecar = defaultTo(props.isSidecar, false)

    return <Content {...props} isTagsSelectionDisabled={this.isTagsSelectionDisabled.bind(this)} />
  }
}
