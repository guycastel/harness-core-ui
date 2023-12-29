/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { ModalDialog } from '@harness/uicore'
import { useStrings } from 'framework/strings'
import type { EnvironmentResponseDTO, ServiceYaml } from 'services/cd-ng'
import { NewEditServiceModal } from '@cd/components/PipelineSteps/DeployServiceStep/NewEditServiceModal'
import AddEditEnvironmentModal from '@cd/components/PipelineSteps/DeployEnvironmentEntityStep/AddEditEnvironmentModal'
import { DIALOG_PROPS, ENV_DIALOG_PROPS } from './OrgAccountLevelServiceEnvField.constants'
import type { ServiceEnvModalProps } from './OrgAccountLevelServiceEnvField.types'
import css from './OrgAccountLevelServiceEnvField.module.scss'

export const ServiceEnvModal = ({ service, environment }: ServiceEnvModalProps) => {
  const { getString } = useStrings()
  const [showOverlay, setShowOverlay] = useState(false)
  const { isModalOpen: isAddServiceModalOpen, closeModal: closeAddServiceModal, onSelect: serviceOnSelect } = service
  const { isModalOpen: isAddEnvModalOpen, closeModal: closeAddEnvModal, onSelect: environmentOnSelect } = environment

  const onServiceCreate = (svc: ServiceYaml): void => {
    serviceOnSelect({
      label: svc.name,
      value: svc.identifier
    })
    closeAddServiceModal()
  }

  const onEnvironmentCreate = (env: EnvironmentResponseDTO): void => {
    environmentOnSelect({
      label: env.name as string,
      value: env.identifier as string
    })
    closeAddEnvModal()
  }

  return (
    <>
      <ModalDialog
        isOpen={isAddServiceModalOpen}
        onClose={closeAddServiceModal}
        title={getString('newService')}
        showOverlay={showOverlay}
        {...DIALOG_PROPS}
      >
        <NewEditServiceModal
          data={{}}
          isGitXEnforced={false}
          isEdit={false}
          isService={false}
          onCreateOrUpdate={onServiceCreate}
          closeModal={closeAddServiceModal}
          setShowOverlay={setShowOverlay}
        />
      </ModalDialog>
      <ModalDialog
        isOpen={isAddEnvModalOpen}
        onClose={closeAddEnvModal}
        title={getString('newEnvironment')}
        className={css.editEnvDialog}
        {...ENV_DIALOG_PROPS}
      >
        <AddEditEnvironmentModal
          data={{}}
          onCreateOrUpdate={onEnvironmentCreate}
          closeModal={closeAddEnvModal}
          isEdit={false}
        />
      </ModalDialog>
    </>
  )
}
