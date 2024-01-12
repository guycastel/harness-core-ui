/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { Dispatch, SetStateAction, useContext, useMemo, useRef, useState } from 'react'
import * as Yup from 'yup'
import { defaultTo, isEmpty, isEqual, omit, omitBy, pick, unset } from 'lodash-es'
import type { FormikProps } from 'formik'
import {
  Button,
  ButtonVariation,
  Container,
  Formik,
  FormikForm,
  FormInput,
  Icon,
  Layout,
  OverlaySpinner,
  Select,
  SelectOption,
  Text,
  useToaster
} from '@harness/uicore'
import produce from 'immer'
import { Classes, Divider } from '@blueprintjs/core'
import { Color, FontVariation } from '@harness/design-system'
import classNames from 'classnames'
import { useParams } from 'react-router-dom'
import { useStrings } from 'framework/strings'
import { NameIdDescriptionTags } from '@common/components/NameIdDescriptionTags/NameIdDescriptionTags'
import RbacButton from '@rbac/components/Button/Button'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import type { EntityGitDetails, NGTemplateInfoConfig } from 'services/template-ng'
import { TemplatePreview } from '@templates-library/components/TemplatePreview/TemplatePreview'
import { TemplateContext } from '@templates-library/components/TemplateStudio/TemplateContext/TemplateContext'
import { PageSpinner } from '@common/components'
import type { UseSaveSuccessResponse } from '@common/modals/SaveToGitDialog/useSaveToGitDialog'
import GitContextForm from '@common/components/GitContextForm/GitContextForm'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { GitSyncStoreProvider } from 'framework/GitRepoStore/GitSyncStoreContext'
import { IdentifierSchema, NameSchema, TemplateVersionLabelSchema } from '@common/utils/Validation'
import { Scope } from '@common/interfaces/SecretsInterface'
import { getScopeFromDTO, getScopeLabelfromScope } from '@common/components/EntityReference/EntityReference'
import { useTemplateAlreadyExistsDialog } from '@templates-library/hooks/useTemplateAlreadyExistsDialog'
import { GitSyncForm, gitSyncFormSchema } from '@gitsync/components/GitSyncForm/GitSyncForm'
import { CardInterface, InlineRemoteSelect } from '@common/components/InlineRemoteSelect/InlineRemoteSelect'
import { SaveTemplateAsType, StoreMetadata, StoreType as GitStoreType } from '@common/constants/GitSyncTypes'
import type { ProjectPathProps, TemplateStudioPathProps } from '@common/interfaces/RouteInterfaces'
import type { ConnectorSelectedValue } from '@platform/connectors/components/ConnectorReferenceField/ConnectorReferenceField'
import templateFactory from '@templates-library/components/Templates/TemplatesFactory'
import { parse } from '@common/utils/YamlHelperMethods'
import { toBase64 } from '@common/utils/utils'
import LogoInput from '@common/components/LogoInput/LogoInput'
import { useGetSettingsList } from 'services/cd-ng'
import { SettingType } from '@common/constants/Utils'
import { getDefaultStoreType, getSettingValue } from '@default-settings/utils/utils'
import { isNewTemplate } from '@templates-library/components/TemplateStudio/TemplateStudioUtils'
import { YamlVersion } from '@pipeline/common/hooks/useYamlVersion'
import VersionSelector from '@pipeline/components/CreatePipelineButton/VersionSelector/VersionSelector'
import { templateTypeToY1TypeMap } from 'framework/utils/templateY1Util'
import {
  DefaultNewTemplateId,
  DefaultNewVersionLabel,
  ICON_FILE_MAX_DIMENSION,
  ICON_FILE_MAX_SIZE,
  ICON_FILE_MAX_SIZE_IN_KB,
  ICON_FILE_SUPPORTED_TYPES
} from '../templates'
import css from './TemplateConfigModal.module.scss'

export enum Fields {
  Name = 'name',
  Identifier = 'identifier',
  Description = 'description',
  Tags = 'tags',
  VersionLabel = 'versionLabel',
  Repo = 'repo',
  RepoName = 'repoName',
  Branch = 'branch',
  ConnectorRef = 'connectorRef',
  StoreType = 'storeType',
  FilePath = 'filePath'
}

export interface PromiseExtraArgs {
  isEdit?: boolean
  updatedGitDetails?: EntityGitDetails
  comment?: string
  storeMetadata?: StoreMetadata
  disableCreatingNewBranch?: boolean
  saveAsType?: SaveTemplateAsType.NEW_LABEL_VERSION | SaveTemplateAsType.NEW_TEMPALTE
  saveAsNewVersionOfExistingTemplate?: boolean
  yamlSyntax?: YamlVersion
}

export enum Intent {
  START = 'Start',
  EDIT = 'Edit',
  SAVE = 'SAVE'
}

export interface ModalProps {
  initialValues: NGTemplateInfoConfig
  promise: (values: NGTemplateInfoConfig, extraInfo: PromiseExtraArgs) => Promise<UseSaveSuccessResponse>
  gitDetails?: EntityGitDetails
  storeMetadata?: StoreMetadata
  title: string
  intent: Intent
  disabledFields?: Fields[]
  allowScopeChange?: boolean
  lastPublishedVersion?: string
  disableCreatingNewBranch?: boolean
  isGitXEnforced?: boolean
  onFailure?: (error: any, latestTemplate: NGTemplateInfoConfig) => void
  saveAsType?: SaveTemplateAsType.NEW_LABEL_VERSION | SaveTemplateAsType.NEW_TEMPALTE
  canSelectVersion?: boolean
}

export interface TemplateConfigValues extends NGTemplateInfoConfigWithGitDetails {
  comment?: string
  iconFile?: File
  yamlVersion?: YamlVersion
}

export interface NGTemplateInfoConfigWithGitDetails extends NGTemplateInfoConfig {
  connectorRef?: string
  repo?: string
  branch?: string
  storeType?: 'INLINE' | 'REMOTE'
  filePath?: string
}

export interface ConfigModalProps extends ModalProps {
  onClose: () => void
}

interface BasicDetailsInterface extends ConfigModalProps {
  setPreviewValues: Dispatch<SetStateAction<NGTemplateInfoConfigWithGitDetails>>
}

export type TemplateConfigModalHandle = {
  updateTemplate: (templateYaml: string) => Promise<void>
}

export type BasicTemplateDetailsHandle = {
  updateTemplate: (templateYaml: string) => Promise<void>
}

const BasicTemplateDetails = (
  props: BasicDetailsInterface,
  ref: React.ForwardedRef<BasicTemplateDetailsHandle>
): JSX.Element => {
  const { getString } = useStrings()

  const {
    initialValues,
    setPreviewValues,
    onClose,
    gitDetails,
    isGitXEnforced = false,
    storeMetadata,
    allowScopeChange = false,
    title,
    intent,
    disabledFields = [],
    promise,
    lastPublishedVersion,
    onFailure,
    disableCreatingNewBranch,
    saveAsType,
    canSelectVersion
  } = props
  const pathParams = useParams<TemplateStudioPathProps>()
  const { orgIdentifier, projectIdentifier } = pathParams
  const {
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF,
    supportingTemplatesGitx
  } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const [loading, setLoading] = React.useState<boolean>()
  const [filePathPrefix, setFilePathPrefix] = React.useState<string>('')
  const { isReadonly } = useContext(TemplateContext)
  const scope = getScopeFromDTO(pathParams)
  const [selectedScope, setSelectedScope] = React.useState<Scope>(scope)
  const [savedTemplateConfigValues, setSavedTemplateConfigValues] = React.useState<TemplateConfigValues>()
  const [saveAsNewVersionOfExistingTemplate, setSaveAsNewVersionOfExistingTemplate] = React.useState<boolean>(false)
  const templateType = templateTypeToY1TypeMap.get(initialValues.type) || initialValues.type
  const allowedScopes = templateFactory.getTemplateAllowedScopes(templateType)
  const isInlineRemoteSelectionApplicable = templateFactory.getTemplateIsRemoteEnabled(templateType)
  const formikRef = useRef<FormikProps<TemplateConfigValues>>()
  const scopeOptions = React.useMemo(
    () =>
      (allowedScopes || []).map(item => ({
        value: item,
        label: getScopeLabelfromScope(item, getString)
      })),
    [allowedScopes]
  )

  const { openTemplateAlreadyExistsDialog } = useTemplateAlreadyExistsDialog({
    onConfirmationCallback: async () => {
      onSubmit(savedTemplateConfigValues!)

      return Promise.resolve()
    },
    onCloseCallback: () => {
      setSaveAsNewVersionOfExistingTemplate(false)
      setSavedTemplateConfigValues(undefined)
    },
    dialogClassName: css.templateAlreadyExistsWarningDialog
  })

  const cardDisabledStatus = React.useMemo(
    () => intent === Intent.EDIT || !!disabledFields?.includes(Fields.StoreType),
    [intent, disabledFields]
  )

  const gitDisabledFields = pick(
    disabledFields?.reduce((fields: Record<string, boolean>, field: string) => {
      fields[field] = true
      return fields
    }, {}),
    Fields.ConnectorRef,
    Fields.RepoName,
    Fields.Branch,
    Fields.FilePath
  )

  React.useImperativeHandle(
    ref,
    () => ({
      updateTemplate: async (templateYaml: string) => {
        const template = (parse(templateYaml) as { template: NGTemplateInfoConfig })?.template
        formikRef.current?.setFieldValue('spec', template.spec)
        await formikRef.current?.submitForm()
      }
    }),
    [formikRef.current]
  )

  const formInitialValues = React.useMemo(
    () =>
      produce(initialValues as TemplateConfigValues, draft => {
        if (isEqual(initialValues.identifier, DefaultNewTemplateId)) {
          unset(draft, 'identifier')
        }
        if (isEqual(initialValues.versionLabel, DefaultNewVersionLabel)) {
          unset(draft, 'versionLabel')
        }
        if (isGitSyncEnabled) {
          draft.repo = gitDetails?.repoIdentifier
          draft.branch = gitDetails?.branch
        } else if (supportingTemplatesGitx) {
          draft.connectorRef = defaultTo(storeMetadata?.connectorRef, '')
          draft.repo = defaultTo(storeMetadata?.repoName, '')
          draft.branch = defaultTo(storeMetadata?.branch, '')
          draft.storeType = isGitXEnforced
            ? GitStoreType.REMOTE
            : defaultTo(storeMetadata?.storeType, GitStoreType.INLINE)
          draft.filePath = intent === Intent.SAVE ? '' : defaultTo(storeMetadata?.filePath, '')
          formikRef.current?.setFieldValue('storeType', draft.storeType)
          if (saveAsType && saveAsType === SaveTemplateAsType.NEW_LABEL_VERSION && intent === Intent.SAVE) {
            const paths = defaultTo(storeMetadata?.filePath, '').split('/')
            if (paths.length > 1) {
              setFilePathPrefix(paths.slice(0, paths.length - 1).join('/'))
            }
          }
        }
        draft.iconFile = undefined
        if (canSelectVersion) {
          draft.yamlVersion = canSelectVersion ? '1' : '0'
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialValues, storeMetadata, gitDetails, saveAsType, isGitXEnforced]
  )

  const submitButtonLabel = React.useMemo(() => {
    if (intent === Intent.EDIT) {
      return getString('continue')
    } else {
      if (intent === Intent.START) {
        return getString('start')
      } else {
        if (isGitSyncEnabled && getScopeFromDTO(formikRef.current?.values || {}) === Scope.PROJECT) {
          return getString('continue')
        } else {
          return getString('save')
        }
      }
    }
  }, [intent, isGitSyncEnabled, formikRef.current])

  const onSubmit = React.useCallback(
    (values: TemplateConfigValues) => {
      setLoading(true)
      // Remove the empty value as these are part of API queryParams
      const storeMetadataValues = omitBy(
        {
          storeType: values.storeType,
          connectorRef:
            typeof values.connectorRef === 'string'
              ? values.connectorRef
              : (values.connectorRef as unknown as ConnectorSelectedValue)?.value,
          repoName: values.repo,
          branch: values.branch,
          filePath: values.filePath
        },
        isEmpty
      ) as StoreMetadata
      const newTemplate = omit(
        values,
        'repo',
        'branch',
        'comment',
        'provider',
        'connectorRef',
        'storeType',
        'filePath',
        'iconFile'
      )

      promise(newTemplate, {
        isEdit: intent === Intent.EDIT,
        saveAsType,
        disableCreatingNewBranch,
        ...(!isEmpty(values.repo) && {
          updatedGitDetails: { ...gitDetails, repoIdentifier: values.repo, branch: values.branch }
        }),
        // Pass storeMetadata only if template is Remote Enabled & supportingTemplatesGitx
        ...(supportingTemplatesGitx && isInlineRemoteSelectionApplicable ? { storeMetadata: storeMetadataValues } : {}),
        ...(!isEmpty(values.comment?.trim()) && { comment: values.comment?.trim() }),
        saveAsNewVersionOfExistingTemplate,
        yamlSyntax: values.yamlVersion
      })
        .then(response => {
          setLoading(false)
          if (response && response.status === 'SUCCESS') {
            onClose()
          } else {
            throw response
          }
        })
        .catch(error => {
          setLoading(false)
          if (error?.code === 'TEMPLATE_ALREADY_EXISTS_EXCEPTION') {
            setSavedTemplateConfigValues(values)
            setSaveAsNewVersionOfExistingTemplate(true)
            openTemplateAlreadyExistsDialog()
          } else {
            onFailure?.(error, newTemplate)
          }
        })
    },
    [
      setLoading,
      promise,
      gitDetails,
      onClose,
      saveAsType,
      saveAsNewVersionOfExistingTemplate,
      setSavedTemplateConfigValues,
      openTemplateAlreadyExistsDialog
    ]
  )

  const onScopeChange = ({ value }: SelectOption) => {
    setSelectedScope(value as Scope)
    formikRef.current?.setValues(
      produce(formikRef.current?.values, draft => {
        draft.projectIdentifier = value === Scope.PROJECT ? projectIdentifier : undefined
        draft.orgIdentifier = value === Scope.ACCOUNT ? undefined : orgIdentifier
        if (isGitSyncEnabled) {
          if (value === Scope.PROJECT) {
            draft.repo = gitDetails?.repoIdentifier
            draft.branch = gitDetails?.branch
          } else {
            unset(draft, 'repo')
            unset(draft, 'branch')
          }
        }
      })
    )
  }

  const onInlineRemoteChange = (item: CardInterface): void => {
    formikRef.current?.setValues(
      produce(formikRef.current?.values, draft => {
        draft.storeType = item.type as GitStoreType
        if (item.type === GitStoreType.INLINE) {
          unset(draft, 'connectorRef')
          unset(draft, 'repo')
          unset(draft, 'branch')
          unset(draft, 'filePath')
        } else {
          Object.assign(draft, pick(formInitialValues, 'connectorRef', 'repo', 'branch', 'filePath'))
        }
      })
    )
    if (item.type === GitStoreType.REMOTE) {
      setTimeout(() => {
        const elem = document.getElementsByClassName(css.gitFormWrapper)[0]
        elem?.scrollTo(0, elem.scrollHeight)
      }, 0)
    }
  }

  React.useEffect(() => {
    setPreviewValues(formInitialValues)
  }, [formInitialValues])

  const gitxValidationSchema = supportingTemplatesGitx ? gitSyncFormSchema(getString) : {}
  const gitsyncValidationSchema =
    isGitSyncEnabled && selectedScope === Scope.PROJECT
      ? {
          repo: Yup.string().trim().required(getString('common.git.validation.repoRequired')),
          branch: Yup.string().trim().required(getString('common.git.validation.branchRequired'))
        }
      : {}

  const iconFileValidationSchema = Yup.mixed()
    .test(
      'iconSize',
      getString('templatesLibrary.createNewModal.iconSizeError'),
      value => !value || value?.size <= ICON_FILE_MAX_SIZE
    )
    .test(
      'iconType',
      getString('templatesLibrary.createNewModal.iconTypeError'),
      value => !value || ICON_FILE_SUPPORTED_TYPES.includes(value?.type)
    )
  // TODO: confirm dimensions and use validation
  // .test(
  //   'iconDimensions',
  //   getString('templatesLibrary.createNewModal.iconDimensionsError', { dimension: ICON_FILE_MAX_DIMENSION }),
  //   async value => {
  //     if (!value) return true
  //     try {
  //       const { width, height } = await getImageDimensions(await toBase64(value))
  //       return width <= ICON_FILE_MAX_DIMENSION && height <= ICON_FILE_MAX_DIMENSION
  //     } catch (_) {
  //       return false
  //     }
  //   }
  // )

  const onIconFileChange: React.FormEventHandler<HTMLInputElement> = async e => {
    const file = e.currentTarget?.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      await iconFileValidationSchema.validate(file)
      const base64 = await toBase64(file)
      formikRef.current?.setFieldValue('icon', base64, true)
    } catch (error) {
      // setting the value to 'invalid-image' shows a broken image which can be removed
      formikRef.current?.setFieldValue('icon', 'invalid-image', true)
    } finally {
      setLoading(false)
    }
  }

  const onIconRemove = (): void => {
    formikRef.current?.setValues(prev => ({ ...prev, icon: undefined, iconFile: undefined }), true)
  }

  return (
    <Container
      width={'55%'}
      className={classNames(css.basicDetails, {
        [css.gitBasicDetails]: supportingTemplatesGitx
      })}
      background={Color.FORM_BG}
      padding={'huge'}
    >
      {loading && <PageSpinner />}
      <Text
        color={Color.GREY_800}
        font={{ weight: 'bold', size: 'medium' }}
        margin={{ bottom: 'xlarge', left: 0, right: 0 }}
      >
        {defaultTo(title, '')}
      </Text>
      <Formik<TemplateConfigValues>
        initialValues={formInitialValues}
        onSubmit={onSubmit}
        validate={setPreviewValues}
        formName={`create${templateType}Template`}
        validationSchema={Yup.object().shape({
          name: NameSchema(getString, {
            requiredErrorMsg: getString('common.validation.fieldIsRequired', {
              name: getString('templatesLibrary.createNewModal.nameError')
            })
          }),
          identifier: IdentifierSchema(getString),
          versionLabel: TemplateVersionLabelSchema(getString),
          iconFile: iconFileValidationSchema,
          ...gitxValidationSchema,
          ...gitsyncValidationSchema
        })}
      >
        {(formik: FormikProps<TemplateConfigValues>) => {
          formikRef.current = formik
          return (
            <FormikForm>
              <Layout.Vertical spacing={'huge'}>
                <Container className={css.gitFormWrapper}>
                  <Layout.Vertical spacing={'small'}>
                    <Container>
                      <Layout.Vertical>
                        <NameIdDescriptionTags
                          tooltipProps={{ dataTooltipId: `create${templateType}Template` }}
                          formikProps={formik}
                          identifierProps={{
                            isIdentifierEditable: !disabledFields.includes(Fields.Identifier) && !isReadonly,
                            inputGroupProps: {
                              disabled: disabledFields.includes(Fields.Name) || isReadonly,
                              placeholder: getString('templatesLibrary.createNewModal.namePlaceholder', {
                                entity: templateFactory.getTemplateLabel(formik.values.type)
                              })
                            }
                          }}
                          className={css.nameIdDescriptionTags}
                          descriptionProps={{
                            disabled: disabledFields.includes(Fields.Description) || isReadonly
                          }}
                          tagsProps={{
                            disabled: disabledFields.includes(Fields.Tags) || isReadonly
                          }}
                        />

                        {canSelectVersion && (
                          <VersionSelector
                            selectedVersion={defaultTo(formik.values?.yamlVersion, '1')}
                            onChange={newYamlVersion => {
                              formik.setFieldValue('yamlVersion', newYamlVersion)
                            }}
                            disabled={intent === Intent.EDIT}
                          />
                        )}
                        <FormInput.Text
                          name="versionLabel"
                          placeholder={getString('common.template.createNewModal.versionPlaceholder')}
                          label={getString('common.versionLabel')}
                          disabled={disabledFields.includes(Fields.VersionLabel) || isReadonly}
                          className={css.gitFormFieldWidth}
                        />
                        {lastPublishedVersion && (
                          <Container
                            border={{ radius: 4, color: Color.BLUE_100 }}
                            background={Color.BLUE_100}
                            flex={{ alignItems: 'center' }}
                            padding={'small'}
                            margin={{ bottom: 'medium' }}
                            className={css.gitFormFieldWidth}
                          >
                            <Layout.Horizontal spacing="small" flex={{ justifyContent: 'start' }} width={'100%'}>
                              <Icon name="info-messaging" size={18} />
                              <Text
                                color={Color.BLACK}
                                font={{ weight: 'semi-bold', size: 'small' }}
                                className={css.lastPublishedVersionLabel}
                              >
                                {getString('templatesLibrary.createNewModal.lastPublishedVersion')}
                              </Text>
                              <Text
                                lineClamp={1}
                                color={Color.BLACK}
                                font={{ size: 'small' }}
                                margin={{ left: 'none' }}
                              >
                                {lastPublishedVersion}
                              </Text>
                            </Layout.Horizontal>
                          </Container>
                        )}
                        <LogoInput
                          label={`${getString('templatesLibrary.createNewModal.logo')} ${getString(
                            'common.optionalLabel'
                          )}`}
                          name="iconFile"
                          logo={formik.values.icon}
                          accept={ICON_FILE_SUPPORTED_TYPES.join()}
                          onChange={onIconFileChange}
                          onRemove={onIconRemove}
                          disabled={isReadonly}
                          helperText={
                            <Layout.Horizontal spacing={'xsmall'}>
                              <Icon name="info" size={16} />
                              <Text font={{ size: 'small' }} color={Color.GREY_800}>
                                {getString('templatesLibrary.createNewModal.logoHelpText', {
                                  size: ICON_FILE_MAX_SIZE_IN_KB,
                                  dimension: ICON_FILE_MAX_DIMENSION
                                })}
                              </Text>
                            </Layout.Horizontal>
                          }
                        />
                        {allowScopeChange && scope === Scope.PROJECT && (
                          <Container className={Classes.FORM_GROUP} width={160} margin={{ bottom: 'medium' }}>
                            <label className={Classes.LABEL}>
                              {getString('templatesLibrary.templateSettingsModal.scopeLabel')}
                            </label>
                            <Select
                              value={scopeOptions.find(item => item.value === getScopeFromDTO(formik.values))}
                              items={scopeOptions}
                              onChange={onScopeChange}
                            />
                          </Container>
                        )}
                        {intent === Intent.SAVE &&
                          (!isGitSyncEnabled || isEmpty(formik.values.repo)) &&
                          (!supportingTemplatesGitx || formik.values?.storeType === GitStoreType.INLINE) && (
                            <FormInput.TextArea
                              name="comment"
                              label={getString('optionalField', {
                                name: getString('common.commentModal.commentLabel')
                              })}
                              textArea={{
                                className: css.comment
                              }}
                            />
                          )}
                      </Layout.Vertical>
                    </Container>
                    {supportingTemplatesGitx && isInlineRemoteSelectionApplicable && (
                      <>
                        <Divider />
                        <Text font={{ variation: FontVariation.H6 }} className={css.choosePipelineSetupHeader}>
                          {getString('templatesLibrary.chooseTemplateSetupHeader')}
                        </Text>
                        <InlineRemoteSelect
                          entityType={'Template'}
                          className={css.inlineRemoteWrapper}
                          selected={defaultTo(formik.values?.storeType, GitStoreType.INLINE)}
                          onChange={onInlineRemoteChange}
                          getCardDisabledStatus={current =>
                            Boolean((isGitXEnforced && current === GitStoreType.INLINE) || cardDisabledStatus)
                          }
                        />
                        {formik.values?.storeType === GitStoreType.REMOTE && (
                          <GitSyncForm
                            formikProps={formik}
                            isEdit={intent === Intent.EDIT}
                            initialValues={formInitialValues}
                            entityScope={getScopeFromDTO(formik.values)}
                            disableFields={gitDisabledFields}
                            filePathPrefix={filePathPrefix}
                          />
                        )}
                      </>
                    )}
                    {isGitSyncEnabled && isEmpty(gitDetails) && getScopeFromDTO(formik.values) === Scope.PROJECT && (
                      <GitSyncStoreProvider>
                        <GitContextForm formikProps={formik as any} />
                      </GitSyncStoreProvider>
                    )}
                  </Layout.Vertical>
                </Container>
                <Container>
                  <Layout.Horizontal spacing="small" flex={{ alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                    <RbacButton
                      text={submitButtonLabel}
                      type="submit"
                      variation={ButtonVariation.PRIMARY}
                      permission={{
                        permission: PermissionIdentifier.EDIT_TEMPLATE,
                        resource: {
                          resourceType: ResourceType.TEMPLATE
                        }
                      }}
                    />
                    <Button text={getString('cancel')} variation={ButtonVariation.TERTIARY} onClick={onClose} />
                  </Layout.Horizontal>
                </Container>
              </Layout.Vertical>
            </FormikForm>
          )
        }}
      </Formik>
    </Container>
  )
}

const BasicTemplateDetailsWithRef = React.forwardRef(BasicTemplateDetails)

const TemplateConfigModal = (
  props: ConfigModalProps,
  ref: React.ForwardedRef<TemplateConfigModalHandle>
): JSX.Element => {
  const { initialValues, storeMetadata, ...rest } = props
  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()

  const templateType = templateTypeToY1TypeMap.get(initialValues.type) || initialValues.type
  const isInlineRemoteSelectionApplicable = templateFactory.getTemplateIsRemoteEnabled(templateType)
  const { showError } = useToaster()
  const [previewValues, setPreviewValues] = useState<NGTemplateInfoConfigWithGitDetails>({
    ...initialValues,
    repo: defaultTo(rest.gitDetails?.repoName, rest.gitDetails?.repoIdentifier),
    branch: rest.gitDetails?.branch
  })
  const { isGitSyncEnabled: isGitSyncEnabledForProject, gitSyncEnabledOnlyForFF } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const basicTemplateDetailsHandle = React.useRef<BasicTemplateDetailsHandle>(null)

  React.useImperativeHandle(
    ref,
    () => ({
      updateTemplate: async (templateYaml: string) => {
        await basicTemplateDetailsHandle.current?.updateTemplate(templateYaml)
      }
    }),
    [basicTemplateDetailsHandle.current]
  )

  const {
    data: gitXSetting,
    error: gitXSettingError,
    loading: loadingSetting
  } = useGetSettingsList({
    queryParams: {
      category: 'GIT_EXPERIENCE',
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    },
    lazy: !(isInlineRemoteSelectionApplicable && isNewTemplate(initialValues?.identifier))
  })

  React.useEffect(() => {
    if (!loadingSetting && gitXSettingError) {
      showError(gitXSettingError.message)
    }
  }, [gitXSettingError, showError, loadingSetting])

  const isGitXEnforced = getSettingValue(gitXSetting, SettingType.ENFORCE_GIT_EXPERIENCE) === 'true'

  const defaultStoreType = getDefaultStoreType(gitXSetting)

  const modifiedStoreMetadata = useMemo(
    () =>
      isNewTemplate(initialValues?.identifier) && !isGitXEnforced
        ? {
            ...storeMetadata,
            storeType: defaultStoreType
          }
        : storeMetadata,
    [isGitXEnforced, defaultStoreType, storeMetadata, initialValues?.identifier]
  )

  const content = (
    <Layout.Horizontal>
      <BasicTemplateDetailsWithRef
        initialValues={initialValues}
        setPreviewValues={setPreviewValues}
        isGitXEnforced={isGitXEnforced}
        ref={basicTemplateDetailsHandle}
        storeMetadata={modifiedStoreMetadata}
        {...rest}
      />
      <TemplatePreview previewValues={previewValues} />
      <Button
        className={css.closeIcon}
        iconProps={{ size: 24, color: Color.GREY_500 }}
        icon="cross"
        variation={ButtonVariation.ICON}
        onClick={props.onClose}
      />
    </Layout.Horizontal>
  )
  return isGitSyncEnabled ? (
    <GitSyncStoreProvider>{content}</GitSyncStoreProvider>
  ) : (
    <OverlaySpinner show={loadingSetting}>{content}</OverlaySpinner>
  )
}

export const TemplateConfigModalWithRef = React.forwardRef(TemplateConfigModal)
