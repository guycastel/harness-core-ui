/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useModalHook } from '@harness/use-modal'
import { SelectOption, Text } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { Dialog } from '@blueprintjs/core'
import { pick } from 'lodash-es'
import cx from 'classnames'
import { useStrings } from 'framework/strings'
import { getReference } from '@common/utils/utils'
import type { SecretReference } from '@secrets/components/CreateOrSelectSecret/CreateOrSelectSecret'
import CreateOrSelectSecret from '@secrets/components/CreateOrSelectSecret/CreateOrSelectSecret'
import { SecretRef, SecretTypeEnum } from '@secrets/components/SecretReference/SecretReference'
import type { ConnectorInfoDTO, ResponsePageSecretResponseWrapper, SecretResponseWrapper } from 'services/cd-ng'
import { ReferenceSelectDialogTitle } from '@common/components/ReferenceSelect/ReferenceSelect'
import { getScopeFromDTO } from '@common/components/EntityReference/EntityReference'
import type { SecretFormData } from '@secrets/components/CreateUpdateSecret/CreateUpdateSecret'
import { SecretMultiSelectProps, useShouldPassSecretManagerIdentifiers } from '@secrets/utils/SecretField'
import type { ScopedObjectDTO } from '@common/components/EntityReference/EntityReference'
import type { ScopeAndIdentifier } from '@common/components/MultiSelectEntityReference/MultiSelectEntityReference'
import useCreateUpdateSecretModal from '../CreateSecretModal/useCreateUpdateSecretModal'
import css from './useCreateOrSelectSecretModal.module.scss'

export interface UseCreateOrSelectSecretModalProps extends SecretMultiSelectProps {
  type?: SecretResponseWrapper['secret']['type']
  onSuccess?: (secret: SecretReference) => void
  secretsListMockData?: ResponsePageSecretResponseWrapper
  connectorTypeContext?: ConnectorInfoDTO['type']
  handleInlineSSHSecretCreation?: (secret?: SecretRef) => void
  handleInlineWinRmSecretCreation?: (secret?: SecretRef) => void
  scope?: ScopedObjectDTO
  identifiersFilter?: ScopeAndIdentifier[]
}

export interface UseCreateOrSelectSecretModalReturn {
  openCreateOrSelectSecretModal: () => void
  closeCreateOrSelectSecretModal: () => void
}

const useCreateOrSelectSecretModal = (
  props: UseCreateOrSelectSecretModalProps,
  inputs?: any[],
  selectedSecret?: string
): UseCreateOrSelectSecretModalReturn => {
  const { isMultiSelect = false, selectedSecrets = [], onMultiSelect, identifiersFilter, connectorTypeContext } = props
  const { getString } = useStrings()

  const { shouldPassSecretManagerIdentifiers } = useShouldPassSecretManagerIdentifiers({
    connectorTypeContext,
    secretType: props.type
  })

  const secretTypeOptions: SelectOption[] = [
    {
      label: getString('platform.secrets.secret.labelText'),
      value: 'SecretText'
    },
    {
      label: getString('platform.secrets.secret.labelFile'),
      value: 'SecretFile'
    }
  ]

  const defaultSecretType = secretTypeOptions.findIndex(val => val.value === props.type)
  // defaultSecretType is -1 i.e. the type in props does not match the secretTypeOptions
  const [secretType, setSecretType] = React.useState<SelectOption>(
    secretTypeOptions[defaultSecretType === -1 ? 0 : defaultSecretType]
  )

  const inputDependencies = inputs?.length ? inputs.concat([secretType]) : [secretType]

  const { openCreateSecretModal } = useCreateUpdateSecretModal({
    onSuccess: data => {
      if (isMultiSelect) return

      const secret = {
        ...data,
        scope: getScopeFromDTO<SecretFormData>(data)
      }

      /* istanbul ignore next */
      props.onSuccess?.({
        ...pick(secret, ['name', 'identifier', 'orgIdentifier', 'projectIdentifier', 'type']),
        referenceString: getReference(secret.scope, secret.identifier) as string
      })
      hideModal()
    },
    connectorTypeContext
  })

  const getLabelByType = (type: SecretTypeEnum): string => {
    switch (true) {
      case type === SecretTypeEnum.SSH_KEY:
        return getString('platform.secrets.secret.newSSHCredential')
      case type === SecretTypeEnum.WINRM:
        return getString('platform.secrets.secret.newWinRmCredential')
      case type === SecretTypeEnum.SECRET_TEXT:
      case secretType.value === SecretTypeEnum.SECRET_TEXT:
        return getString('platform.secrets.secret.newSecretText')
      default:
        return getString('platform.secrets.secret.newSecretFile')
    }
  }

  const getDisclaimerMessage = (): JSX.Element | undefined => {
    if (shouldPassSecretManagerIdentifiers) {
      return (
        <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_500}>
          {getString('platform.secretManagerConnectorSecretSelectorDisclaimer')}
        </Text>
      )
    }
  }

  const [showModal, hideModal] = useModalHook(() => {
    return (
      <Dialog
        isOpen={true}
        enforceFocus={false}
        onClose={() => {
          hideModal()
        }}
        title={ReferenceSelectDialogTitle({
          componentName: getString('secretType'),
          createNewLabel: getLabelByType(props.type as SecretTypeEnum),
          createNewHandler: () => {
            if (props.type === SecretTypeEnum.SSH_KEY) {
              props.handleInlineSSHSecretCreation?.()
              hideModal()
            } else if (props.type === SecretTypeEnum.WINRM) {
              props.handleInlineWinRmSecretCreation?.()
              hideModal()
            } else {
              openCreateSecretModal(
                props.type === SecretTypeEnum.SECRET_TEXT || secretType.value === SecretTypeEnum.SECRET_TEXT
                  ? SecretTypeEnum.SECRET_TEXT
                  : SecretTypeEnum.SECRET_FILE
              )
            }
          },
          disclaimerMessage: getDisclaimerMessage(),
          ...(isMultiSelect && {
            title: getString('platform.secrets.selectSecrets'),
            isNewConnectorLabelVisible: false
          })
        })}
        className={cx(css.createSelectSecret, css.dialog)}
      >
        <CreateOrSelectSecret
          {...props}
          onCancel={hideModal}
          onSuccess={data => {
            const secret = {
              ...pick(data, ['name', 'identifier', 'orgIdentifier', 'projectIdentifier', 'type']),
              referenceString: getReference(getScopeFromDTO(data), data.identifier) as string
            }
            /* istanbul ignore next */
            props.onSuccess?.(secret)
            hideModal()
          }}
          connectorTypeContext={props.connectorTypeContext}
          handleInlineSSHSecretCreation={secret => {
            props.handleInlineSSHSecretCreation?.(secret)
            hideModal()
          }}
          handleInlineWinRmSecretCreation={secret => {
            props.handleInlineWinRmSecretCreation?.(secret)
            hideModal()
          }}
          secretType={secretType}
          setSecretType={setSecretType}
          scope={props.scope}
          selectedSecret={selectedSecret}
          isMultiSelect={isMultiSelect}
          selectedSecrets={selectedSecrets}
          onMultiSelect={(...args) => {
            onMultiSelect?.(...args)
            hideModal()
          }}
          identifiersFilter={identifiersFilter}
        />
      </Dialog>
    )
  }, [...inputDependencies, selectedSecret])

  return {
    openCreateOrSelectSecretModal: () => {
      showModal()
    },
    closeCreateOrSelectSecretModal: hideModal
  }
}

export default useCreateOrSelectSecretModal
