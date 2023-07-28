/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useState } from 'react'
import { Dialog } from '@blueprintjs/core'
import { Button } from '@harness/uicore'
import { useModalHook } from '@harness/use-modal'

import { pick } from 'lodash-es'
import { useParams } from 'react-router-dom'
import type {
  KerberosConfigDTO,
  SecretDTOV2,
  SSHConfigDTO,
  SSHKeyPathCredentialDTO,
  SSHKeyReferenceCredentialDTO,
  SSHKeySpecDTO
} from 'services/cd-ng'
import { getSecretReferencesForSSH } from '@secrets/utils/SSHAuthUtils'
import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import CreateSSHCredWizard, { SSHCredSharedObj } from './CreateSSHCredWizard'
import css from './useCreateSSHCredModal.module.scss'

export interface UseCreateSSHCredModalProps {
  onSuccess?: (secret: SecretDTOV2) => void
  onClose?: () => void
}

export interface UseCreateSSHCredModalReturn {
  openCreateSSHCredModal: (secret?: SecretDTOV2) => void
  closeCreateSSHCredModal: () => void
}

export enum Views {
  CREATE,
  EDIT
}

const useCreateSSHCredModal = (props: UseCreateSSHCredModalProps): UseCreateSSHCredModalReturn => {
  const projectPathParams = useParams<ProjectPathProps>()
  const [view, setView] = useState(Views.CREATE)
  const [sshData, setSSHData] = useState<SSHCredSharedObj>()
  const [loading, setLoading] = useState(false)

  const [showModal, hideModal] = useModalHook(
    () => (
      <Dialog
        className={css.dialog}
        enforceFocus={false}
        isOpen={true}
        onClose={() => {
          setView(Views.CREATE)
          hideModal()
        }}
      >
        {view === Views.CREATE ? (
          <CreateSSHCredWizard
            {...props}
            hideModal={() => {
              props.onClose?.()
              hideModal()
            }}
          />
        ) : (
          <CreateSSHCredWizard
            {...props}
            loading={loading}
            params={sshData?.params}
            isEdit={true}
            detailsData={sshData?.detailsData}
            authData={sshData?.authData}
            hideModal={() => {
              props.onClose?.()
              hideModal()
            }}
          />
        )}
        <Button minimal icon="cross" iconProps={{ size: 18 }} onClick={hideModal} className={css.crossIcon} />
      </Dialog>
    ),
    [view, sshData, loading]
  )

  const open = useCallback(
    async (_sshData?: SecretDTOV2) => {
      showModal()

      if (_sshData) {
        setView(Views.EDIT)
        setLoading(true)
        const response = await getSecretReferencesForSSH(_sshData, projectPathParams)
        setSSHData({
          detailsData: {
            ...pick(_sshData, 'name', 'identifier', 'description', 'tags')
          },
          authData: {
            authScheme: (_sshData.spec as SSHKeySpecDTO)?.auth.type,
            credentialType: ((_sshData.spec as SSHKeySpecDTO)?.auth.spec as SSHConfigDTO)?.credentialType,
            tgtGenerationMethod:
              ((_sshData.spec as SSHKeySpecDTO)?.auth.spec as KerberosConfigDTO).tgtGenerationMethod || 'None',
            userName: (
              ((_sshData.spec as SSHKeySpecDTO)?.auth.spec as SSHConfigDTO)?.spec as SSHKeyReferenceCredentialDTO
            )?.userName,
            principal: ((_sshData.spec as SSHKeySpecDTO)?.auth.spec as KerberosConfigDTO)?.principal,
            realm: ((_sshData.spec as SSHKeySpecDTO)?.auth.spec as KerberosConfigDTO)?.realm,
            keyPath:
              ((_sshData.spec as SSHKeySpecDTO)?.auth.spec as KerberosConfigDTO)?.keyPath ||
              (((_sshData.spec as SSHKeySpecDTO)?.auth.spec as SSHConfigDTO)?.spec as SSHKeyPathCredentialDTO)?.keyPath,
            port: (_sshData.spec as SSHKeySpecDTO)?.port || 22,
            key: response.keySecret,
            password: response.passwordSecret,
            encryptedPassphrase: response.encryptedPassphraseSecret
          },
          params: {
            orgIdentifier: _sshData?.orgIdentifier,
            projectIdentifier: _sshData?.projectIdentifier
          }
        })
        setLoading(false)
      } else setView(Views.CREATE)
    },
    [showModal]
  )
  return {
    openCreateSSHCredModal: (secret?: SecretDTOV2) => open(secret),
    closeCreateSSHCredModal: hideModal
  }
}

export default useCreateSSHCredModal