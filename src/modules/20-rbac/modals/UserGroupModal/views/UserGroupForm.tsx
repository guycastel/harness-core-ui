/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import {
  Button,
  Container,
  Formik,
  FormikForm as Form,
  Layout,
  ModalErrorHandler,
  ModalErrorHandlerBinding,
  MultiSelectOption,
  FormInput,
  ButtonVariation
} from '@harness/uicore'
import * as Yup from 'yup'
import { useParams } from 'react-router-dom'
import { pick, cloneDeep, isEmpty } from 'lodash-es'
import { NameIdDescriptionTags, useToaster } from '@common/components'
import { useStrings } from 'framework/strings'
import { UserGroupAggregateDTO, UserGroupDTO, usePostUserGroupV2, usePutUserGroupV2, useGetUsers } from 'services/cd-ng'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { useMutateAsGet } from '@common/hooks'
import { IdentifierSchema, NameSchema } from '@common/utils/Validation'
import UserItemRenderer, { UserItem } from '@common/components/UserItemRenderer/UserItemRenderer'
import UserTagRenderer from '@common/components/UserTagRenderer/UserTagRenderer'
import useRBACError from '@rbac/utils/useRBACError/useRBACError'
import type { ScopeAndIdentifier } from '@common/components/MultiSelectEntityReference/MultiSelectEntityReference'
import { getScopeFromDTO, ScopedObjectDTO } from '@common/components/EntityReference/EntityReference.types'
import css from '@rbac/modals/UserGroupModal/useUserGroupModal.module.scss'

interface UserGroupModalData {
  data?: UserGroupAggregateDTO
  isEdit?: boolean
  isAddMember?: boolean
  onSubmit?: (data?: ScopeAndIdentifier) => void
  onCancel?: () => void
}

interface UserGroupFormDTO extends UserGroupDTO {
  userList?: MultiSelectOption[]
}

const UserGroupForm: React.FC<UserGroupModalData> = props => {
  const { data: userGroupAggregateData, onSubmit, isEdit, isAddMember, onCancel } = props
  const userGroupData = userGroupAggregateData?.userGroupDTO
  const isNotificationsDataPresent = !isEmpty(userGroupData?.notificationConfigs)
  const isSsoLinked = !!userGroupData?.ssoLinked

  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps>()
  const { getRBACErrorMessage } = useRBACError()
  const { getString } = useStrings()
  const { showSuccess } = useToaster()
  const [search, setSearch] = useState<string>()
  const [modalErrorHandler, setModalErrorHandler] = useState<ModalErrorHandlerBinding>()

  const { mutate: createUserGroup, loading: saving } = usePostUserGroupV2({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    }
  })

  const { mutate: editUserGroup, loading: updating } = usePutUserGroupV2({
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    }
  })

  const { data: userList } = useMutateAsGet(useGetUsers, {
    body: { searchTerm: search },
    queryParams: {
      accountIdentifier: accountId,
      orgIdentifier,
      projectIdentifier
    }
  })

  const users: UserItem[] =
    userList?.data?.content?.map(value => {
      return {
        label: value.name || '',
        value: value.email,
        uuid: value.uuid
      }
    }) || []

  const handleEdit = async (formData: UserGroupFormDTO): Promise<void> => {
    const values = cloneDeep(formData)
    const userDetails = values.userList?.map((user: MultiSelectOption) => user.value as string)
    delete values.userList

    let dataToSubmit: UserGroupDTO = values
    if (userDetails) dataToSubmit['users']?.push(...userDetails)
    if (isNotificationsDataPresent) {
      dataToSubmit['notificationConfigs'] = userGroupData?.notificationConfigs
    }
    if (isSsoLinked) {
      const { ssoLinked, ssoGroupName, ssoGroupId, linkedSsoType, linkedSsoId, linkedSsoDisplayName } = userGroupData
      dataToSubmit = {
        ...dataToSubmit,
        ssoLinked,
        ssoGroupName,
        ssoGroupId,
        linkedSsoType,
        linkedSsoId,
        linkedSsoDisplayName
      }
    }

    try {
      const edited = await editUserGroup(dataToSubmit)
      /* istanbul ignore else */ if (edited) {
        showSuccess(
          isEdit
            ? getString('rbac.userGroupForm.editSuccess', { name: edited.data?.name })
            : getString('rbac.userGroupForm.addMemberSuccess')
        )

        onSubmit?.()
      }
    } catch (e) {
      /* istanbul ignore next */
      modalErrorHandler?.showDanger(getRBACErrorMessage(e))
    }
  }

  const handleCreate = async (values: UserGroupFormDTO): Promise<void> => {
    const dataToSubmit: UserGroupDTO = pick(values, ['name', 'identifier', 'description', 'tags'])
    dataToSubmit['users'] = values.userList?.map((user: MultiSelectOption) => user.value as string)
    try {
      const created = await createUserGroup(dataToSubmit)
      /* istanbul ignore else */ if (created) {
        showSuccess(getString('rbac.userGroupForm.createSuccess', { name: created.data?.name }))
        onSubmit?.({
          identifier: created?.data?.identifier || '',
          scope: getScopeFromDTO(created.data as ScopedObjectDTO)
        })
      }
    } catch (e) {
      /* istanbul ignore next */
      modalErrorHandler?.showDanger(getRBACErrorMessage(e))
    }
  }

  const usersWithEmail = userGroupAggregateData?.users?.map(item => item.email)

  return (
    <Formik<UserGroupFormDTO>
      initialValues={{
        identifier: userGroupData?.identifier || '',
        name: userGroupData?.name || '',
        description: userGroupData?.description || '',
        tags: userGroupData?.tags || {},
        users: usersWithEmail
      }}
      formName="userGroupForm"
      validationSchema={Yup.object().shape({
        name: NameSchema(getString),
        identifier: IdentifierSchema(getString)
      })}
      onSubmit={values => {
        modalErrorHandler?.hide()
        if (isEdit || isAddMember) handleEdit(values)
        else handleCreate(values)
      }}
    >
      {formikProps => {
        return (
          <Form>
            <Container className={css.form}>
              <ModalErrorHandler bind={setModalErrorHandler} />
              {isAddMember ? null : (
                <NameIdDescriptionTags formikProps={formikProps} identifierProps={{ isIdentifierEditable: !isEdit }} />
              )}
              {isEdit ? null : (
                <FormInput.MultiSelect
                  name="userList"
                  label={getString('rbac.userGroupPage.addUsers')}
                  items={users}
                  className={css.input}
                  multiSelectProps={{
                    allowCreatingNewItems: false,
                    allowCommaSeparatedList: true,
                    resetOnQuery: false,
                    resetOnSelect: false,
                    onQueryChange: (query: string) => {
                      setSearch(query)
                    },
                    tagRenderer: (item: MultiSelectOption) => (
                      <UserTagRenderer key={item.value.toString()} item={item} />
                    ),
                    itemRender: (item, { handleClick }) => (
                      <UserItemRenderer key={item.value.toString()} item={item} handleClick={handleClick} />
                    ),
                    itemListPredicate: (query, items) =>
                      items.filter(
                        (item: UserItem) =>
                          item.label.toString().toLowerCase().includes(query.toLowerCase()) ||
                          item.email?.toString().toLowerCase().includes(query.toLowerCase())
                      )
                  }}
                />
              )}
            </Container>
            <Layout.Horizontal spacing="small">
              <Button
                variation={ButtonVariation.PRIMARY}
                text={getString('save')}
                type="submit"
                disabled={saving || updating}
              />
              <Button text={getString('cancel')} variation={ButtonVariation.TERTIARY} onClick={onCancel} />
            </Layout.Horizontal>
          </Form>
        )
      }}
    </Formik>
  )
}

export default UserGroupForm
