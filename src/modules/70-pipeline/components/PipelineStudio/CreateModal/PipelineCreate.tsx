/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useRef } from 'react'
import cx from 'classnames'
import { useParams } from 'react-router-dom'
import { get, omit, pick } from 'lodash-es'
import produce from 'immer'
import * as Yup from 'yup'
import { Container, Formik, FormikForm, Button, ButtonVariation, Text } from '@harness/uicore'
import { FontVariation } from '@harness/design-system'
import { Divider } from '@blueprintjs/core'

import { FormikProps } from 'formik'
import { useStrings } from 'framework/strings'
import { loggerFor } from 'framework/logging/logging'
import { ModuleName } from 'framework/types/ModuleName'
import { IdentifierSchema, NameSchema } from '@common/utils/Validation'
import { NameIdDescriptionTags } from '@common/components'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import GitContextForm, { IGitContextFormProps } from '@common/components/GitContextForm/GitContextForm'
import type { EntityGitDetails, PipelineInfoConfig } from 'services/pipeline-ng'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { Category, PipelineActions } from '@common/constants/TrackingConstants'
import { GitSyncForm, gitSyncFormSchema } from '@gitsync/components/GitSyncForm/GitSyncForm'
import { useQueryParams, useUpdateQueryParams } from '@common/hooks'
import type { GitQueryParams } from '@common/interfaces/RouteInterfaces'
import { StoreMetadata, StoreType } from '@common/constants/GitSyncTypes'
import { InlineRemoteSelect } from '@common/components/InlineRemoteSelect/InlineRemoteSelect'
import RbacButton from '@rbac/components/Button/Button'
import { FeatureIdentifier } from 'framework/featureStore/FeatureIdentifier'
import { errorCheck } from '@common/utils/formikHelpers'
import VersionSelector from '@pipeline/components/CreatePipelineButton/VersionSelector/VersionSelector'
import { YamlVersion, useYamlVersion } from '@pipeline/common/hooks/useYamlVersion'
import { ProviderInterface } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect'
import { isHarnessCodeRepoEntity } from '@modules/10-common/components/GitProviderSelect/GitProviderSelect.utils'
import { DefaultNewPipelineId } from '../PipelineContext/PipelineActions'
import css from './PipelineCreate.module.scss'

const logger = loggerFor(ModuleName.CD)

interface UseTemplate {
  useTemplate?: boolean
}

interface PipelineInfoConfigWithGitDetails extends PipelineInfoConfig {
  provider?: ProviderInterface
  repo?: string
  branch: string
  connectorRef?: string
  storeType?: string
  importYaml?: string
  filePath?: string
}

type CreatePipelinesValue = PipelineInfoConfigWithGitDetails & UseTemplate

export interface PipelineCreateProps {
  afterSave?: (
    values: PipelineInfoConfig,
    storeMetadata: StoreMetadata,
    gitDetails?: EntityGitDetails,
    useTemplate?: boolean,
    version?: YamlVersion
  ) => void
  initialValues?: CreatePipelinesValue
  closeModal?: () => void
  gitDetails?: IGitContextFormProps
  primaryButtonText: string
  isReadonly: boolean
  modalMode?: 'edit' | 'create'
  isGitXEnforced?: boolean
  canSelectVersion?: boolean
}

export default function CreatePipelines({
  afterSave,
  isGitXEnforced,
  initialValues = {
    identifier: DefaultNewPipelineId,
    name: '',
    description: '',
    tags: {},
    repo: '',
    branch: '',
    storeType: isGitXEnforced ? StoreType.REMOTE : StoreType.INLINE,
    stages: [],
    connectorRef: ''
  },
  closeModal,
  gitDetails,
  primaryButtonText,
  isReadonly,
  modalMode,
  canSelectVersion = false
}: PipelineCreateProps): JSX.Element {
  const { getString } = useStrings()
  const { yamlVersion: yamlVersionValue } = useYamlVersion()
  const { pipelineIdentifier } = useParams<{ pipelineIdentifier: string }>()

  const resolvedPipelineIdentifier = canSelectVersion ? DefaultNewPipelineId : pipelineIdentifier

  const { storeType: storeTypeParam = isGitXEnforced ? StoreType.REMOTE : StoreType.INLINE } =
    useQueryParams<GitQueryParams>()
  const { updateQueryParams } = useUpdateQueryParams()
  const { isGitSyncEnabled, gitSyncEnabledOnlyForFF, supportingGitSimplification } = useAppStore()
  const oldGitSyncEnabled = isGitSyncEnabled && !gitSyncEnabledOnlyForFF
  const { trackEvent } = useTelemetry()
  const [yamlVersion, setYamlVersion] = React.useState<YamlVersion>(YamlVersion[1])
  const formikRef = useRef<FormikProps<CreatePipelinesValue>>()

  const newInitialValues = React.useMemo(() => {
    return produce(initialValues, draft => {
      if (draft.identifier === DefaultNewPipelineId) {
        draft.identifier = ''
      }
    })
  }, [initialValues])

  const getGitValidationSchema = () => {
    if (supportingGitSimplification && storeTypeParam === StoreType.REMOTE) {
      return gitSyncFormSchema(getString)
    } else if (oldGitSyncEnabled) {
      return {
        repo: Yup.string().trim().required(getString('common.git.validation.repoRequired')),
        branch: Yup.string().trim().required(getString('common.git.validation.branchRequired'))
      }
    } else {
      return {}
    }
  }

  const validationSchema = React.useMemo(
    () =>
      Yup.object().shape({
        name: NameSchema(getString, { requiredErrorMsg: getString('createPipeline.pipelineNameRequired') }),
        identifier: IdentifierSchema(getString),
        ...getGitValidationSchema()
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getString, supportingGitSimplification, oldGitSyncEnabled, storeTypeParam]
  )

  const isEdit = React.useMemo(() => {
    return !isReadonly || supportingGitSimplification
      ? resolvedPipelineIdentifier !== DefaultNewPipelineId
      : initialValues.identifier !== DefaultNewPipelineId
  }, [initialValues.identifier, supportingGitSimplification, resolvedPipelineIdentifier, isReadonly])

  useEffect(() => {
    if (!isEdit) {
      // Intitially setting INLINE storeType in queryParam forGitX
      if (supportingGitSimplification && initialValues?.identifier === DefaultNewPipelineId) {
        updateQueryParams({ storeType: initialValues.storeType as string })
      }
      trackEvent(PipelineActions.LoadCreateNewPipeline, {
        category: Category.PIPELINE
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initialValues.storeType])

  const handleSubmit = (values: CreatePipelinesValue): void => {
    logger.info(JSON.stringify(values))
    const isHarnessCodeRepo = isHarnessCodeRepoEntity(values.provider?.type)
    const formGitDetails =
      supportingGitSimplification && values.storeType === StoreType.REMOTE
        ? { repoName: values.repo, branch: values.branch, filePath: values.filePath, isHarnessCodeRepo }
        : values.repo && values.repo.trim().length > 0
        ? { repoIdentifier: values.repo, branch: values.branch, isHarnessCodeRepo }
        : undefined

    afterSave?.(
      omit(values, 'storeType', 'provider', 'connectorRef', 'repo', 'branch', 'filePath', 'useTemplate'),
      {
        storeType: values.storeType as StoreMetadata['storeType'],
        provider: values.provider,
        connectorRef:
          typeof values.connectorRef !== 'string' ? (values.connectorRef as any)?.value : values.connectorRef
      },
      formGitDetails,
      values.useTemplate,
      yamlVersion
    )
  }

  useEffect(() => {
    formikRef.current?.setFieldValue('storeType', initialValues.storeType)
  }, [initialValues.storeType])

  return (
    <Container className={css.pipelineCreateForm}>
      <Formik<CreatePipelinesValue>
        initialValues={newInitialValues}
        formName="pipelineCreate"
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {formikProps => {
          formikRef.current = formikProps
          return (
            <FormikForm>
              <NameIdDescriptionTags
                formikProps={formikProps}
                identifierProps={{
                  isIdentifierEditable: resolvedPipelineIdentifier === DefaultNewPipelineId
                }}
                tooltipProps={{ dataTooltipId: 'pipelineCreate' }}
                inputGroupProps={{
                  ...(!(errorCheck('name', formikProps) || get(formikProps, `errors.identifier`)) && {
                    className: css.zeroMargin
                  }),
                  disabled: isReadonly
                }}
                descriptionProps={{
                  disabled: isReadonly
                }}
                tagsProps={{
                  disabled: isReadonly
                }}
              />
              {(canSelectVersion || yamlVersionValue === YamlVersion[1]) && (
                <VersionSelector
                  selectedVersion={yamlVersion}
                  onChange={setYamlVersion}
                  disabled={modalMode === 'edit'}
                />
              )}
              {oldGitSyncEnabled && (
                <GitSyncStoreProvider>
                  <GitContextForm formikProps={formikProps as any} gitDetails={gitDetails} />
                </GitSyncStoreProvider>
              )}

              {supportingGitSimplification ? (
                <>
                  <Divider />
                  <Text
                    font={{ variation: FontVariation.H6 }}
                    className={css.choosePipelineSetupHeader}
                    data-tooltip-id="pipeline-InlineRemoteSelect-label"
                  >
                    {getString('pipeline.createPipeline.choosePipelineSetupHeader')}
                  </Text>
                  <InlineRemoteSelect
                    className={css.pipelineCardWrapper}
                    selected={storeTypeParam}
                    getCardDisabledStatus={(current, selected) => {
                      return resolvedPipelineIdentifier !== DefaultNewPipelineId
                        ? current !== selected
                        : Boolean(isGitXEnforced && current === StoreType.INLINE)
                    }}
                    onChange={item => {
                      if (resolvedPipelineIdentifier === DefaultNewPipelineId) {
                        formikProps?.setFieldValue('storeType', item.type)
                        updateQueryParams({ storeType: item.type })
                      }
                    }}
                  />
                </>
              ) : null}
              {storeTypeParam === StoreType.REMOTE ? (
                <GitSyncForm
                  formikProps={formikProps as any}
                  isEdit={isEdit}
                  initialValues={pick(newInitialValues, 'repo', 'branch', 'filePath', 'connectorRef')}
                  shouldRenderRepositoryLocationCard
                />
              ) : null}

              {supportingGitSimplification ? (
                <Divider className={cx({ [css.gitSimplificationDivider]: storeTypeParam === StoreType.INLINE })} />
              ) : null}

              {(!isEdit || canSelectVersion) && (
                <Container padding={{ top: 'large' }}>
                  <RbacButton
                    text={getString('common.templateStartLabel')}
                    icon={'template-library'}
                    iconProps={{
                      size: 12
                    }}
                    variation={ButtonVariation.SECONDARY}
                    onClick={() => {
                      formikProps.setFieldValue('useTemplate', true)
                      window.requestAnimationFrame(() => {
                        formikProps.submitForm()
                      })
                    }}
                    featuresProps={{
                      featuresRequest: {
                        featureNames: [FeatureIdentifier.TEMPLATE_SERVICE]
                      }
                    }}
                  />
                </Container>
              )}

              <Container className={css.createPipelineButtons}>
                <Button
                  variation={ButtonVariation.PRIMARY}
                  type="submit"
                  text={primaryButtonText}
                  disabled={gitDetails?.remoteFetchFailed}
                />
                &nbsp; &nbsp;
                <Button
                  variation={ButtonVariation.TERTIARY}
                  text={getString('cancel')}
                  onClick={() => {
                    trackEvent(PipelineActions.CancelCreateNewPipeline, {
                      category: Category.PIPELINE
                    })
                    closeModal?.()
                  }}
                />
              </Container>
            </FormikForm>
          )
        }}
      </Formik>
    </Container>
  )
}
