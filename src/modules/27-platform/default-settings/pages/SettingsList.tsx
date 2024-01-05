/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { ButtonVariation, FormikForm, getErrorInfoFromErrorObject, Layout, useToaster } from '@harness/uicore'
import { Formik } from 'formik'
import * as Yup from 'yup'
import { NGBreadcrumbs } from '@common/components/NGBreadcrumbs/NGBreadcrumbs'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import ScopedTitle from '@common/components/Title/ScopedTitle'
import { NavigationCheck, Page } from '@common/exports'
import type { ModulePathParams, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { getLinkForAccountResources } from '@common/utils/BreadcrumbUtils'
import { useStrings } from 'framework/strings'
import { Scope } from '@common/interfaces/SecretsInterface'
import DefaultSettingsFactory from '@default-settings/factories/DefaultSettingsFactory'
import { SettingDTO, SettingRequestDTO, useUpdateSettingValue } from 'services/cd-ng'
import RbacButton from '@rbac/components/Button/Button'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { useModuleInfo } from '@common/hooks/useModuleInfo'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import type { SettingType } from '@common/constants/Utils'
import type { SettingCategory, SettingYupValidation } from '../interfaces/SettingType.types'
import SettingsCategorySection from '../components/SettingsCategorySection'
import css from './SettingsList.module.scss'

const SettingsList = () => {
  const { getString } = useStrings()
  const { projectIdentifier, orgIdentifier, accountId } = useParams<ProjectPathProps & ModulePathParams>()
  let defaultSettingsCategory: SettingCategory[] = DefaultSettingsFactory.getCategoryNamesList()
  const [changedSettings, updateChangedSettings] = useState<Map<SettingType, SettingRequestDTO>>(new Map())
  const [settingErrorMessage, updateSettingErrorMessage] = useState<Map<SettingType, string>>(new Map())
  const [disableSave, updateDisableSave] = useState<boolean>(true)
  const { showError } = useToaster()
  const [savedSettings, updateSavedSettings] = useState<Map<SettingType, SettingDTO>>(new Map())
  const { module } = useModuleInfo()

  useDocumentTitle(getString('common.defaultSettings'))

  if (module) {
    const refinedSettingsCategory: SettingCategory[] = []
    const categoriesToBeDisplayedAtAModule = DefaultSettingsFactory.getCategoriesToBeDisplayedInAModule(module)
    defaultSettingsCategory.forEach(catg => {
      if (
        categoriesToBeDisplayedAtAModule?.has(catg.toUpperCase() as SettingCategory) ||
        categoriesToBeDisplayedAtAModule?.has(catg.toLowerCase() as SettingCategory)
      ) {
        refinedSettingsCategory.push(catg)
      }
    })
    defaultSettingsCategory = refinedSettingsCategory
  }
  const onSettingChange = (
    settingType: SettingType,
    settingDTO: SettingDTO,
    updateType: SettingRequestDTO['updateType']
  ): void => {
    if (disableSave) {
      updateDisableSave(false)
    }
    const exisitingChangedSettings = new Map(changedSettings)
    const { allowOverrides, identifier, value } = settingDTO
    exisitingChangedSettings.set(settingType, { allowOverrides, updateType, identifier, value })
    updateChangedSettings(exisitingChangedSettings)
  }
  const {
    loading: savingSettingInProgress,
    mutate: updateSettingValue,
    error: savingError
  } = useUpdateSettingValue({
    queryParams: { projectIdentifier: projectIdentifier, accountIdentifier: accountId, orgIdentifier }
  })
  if (savingError) {
    showError(savingError)
  }
  const saveSettings = () => {
    updateSettingErrorMessage(new Map())
    try {
      updateSettingValue(Array.from(changedSettings.values())).then(data => {
        const errorMap = new Map()
        const savedSettingsLocal: Map<SettingType, SettingDTO> = new Map()
        data.data?.forEach(setting => {
          if (!setting.updateStatus && setting.errorMessage) {
            errorMap.set(setting.identifier, setting.errorMessage)
          } else {
            savedSettingsLocal.set(setting.identifier as SettingType, setting.setting)
          }
        })
        updateSettingErrorMessage(errorMap)
        if (!errorMap.size) {
          updateDisableSave(true)
          updateChangedSettings(new Map())
          updateSavedSettings(savedSettingsLocal)
        }
      })
    } catch (error) {
      showError(getErrorInfoFromErrorObject(error))
    }
  }
  const [validationScheme, updateValidationScheme] = useState<SettingYupValidation>({})
  const updateValidation = (val: SettingYupValidation) => {
    updateValidationScheme({ ...validationScheme, ...val })
  }
  const { isNewNavEnabled } = useAppStore()
  const history = useHistory()
  return (
    <>
      <NavigationCheck
        when={true}
        shouldBlockNavigation={() => !!changedSettings.size}
        navigate={newPath => {
          history.push(newPath)
        }}
      />
      {
        <Formik
          formName="defaultSettingsForm"
          initialValues={{}}
          validationSchema={Yup.object(validationScheme as any)}
          onSubmit={saveSettings}
        >
          {() => {
            return (
              <FormikForm>
                <Page.Header
                  title={
                    <ScopedTitle
                      title={{
                        [Scope.PROJECT]: getString('common.defaultSettings'),
                        [Scope.ORG]: getString('common.defaultSettings'),
                        [Scope.ACCOUNT]: getString('common.defaultSettings')
                      }}
                    />
                  }
                  toolbar={
                    <RbacButton
                      text={getString('save')}
                      disabled={disableSave}
                      variation={ButtonVariation.PRIMARY}
                      type="submit"
                      permission={{
                        permission: PermissionIdentifier.EDIT_CORE_SETTING,
                        resource: {
                          resourceType: ResourceType.SETTING
                        }
                      }}
                    />
                  }
                  breadcrumbs={
                    isNewNavEnabled ? (
                      <NGBreadcrumbs />
                    ) : (
                      <NGBreadcrumbs
                        links={getLinkForAccountResources({ accountId, orgIdentifier, projectIdentifier, getString })}
                      />
                    )
                  }
                />
                {savingSettingInProgress && <Page.Spinner message={getString('common.saving')}></Page.Spinner>}
                <Page.Body>
                  <Layout.Vertical className={css.settingList}>
                    {defaultSettingsCategory.map(categ => {
                      return (
                        <SettingsCategorySection
                          settingCategory={categ}
                          onSettingChange={onSettingChange}
                          settingErrorMessages={settingErrorMessage}
                          updateValidationSchema={updateValidation}
                          savedSettings={savedSettings}
                          key={categ}
                        />
                      )
                    })}
                  </Layout.Vertical>
                </Page.Body>
              </FormikForm>
            )
          }}
        </Formik>
      }
    </>
  )
}

export default SettingsList
