/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { MultiTypeInputType } from '@harness/uicore'
import type { ModalDialogProps } from '@harness/uicore/dist/components/ModalDialog/ModalDialog'
import type { EnvironmentReferenceFieldProps } from '@pipeline/components/FormMultiTypeEnvironmentField/FormMultiTypeEnvironmentField'
import type { ServiceReferenceFieldProps } from '@pipeline/components/FormMultiTypeServiceFeild/FormMultiTypeServiceFeild'

export const DIALOG_PROPS: Omit<ModalDialogProps, 'isOpen'> = {
  usePortal: true,
  autoFocus: true,
  canEscapeKeyClose: false,
  canOutsideClickClose: false,
  enforceFocus: false,
  lazy: true
}

export const ENV_DIALOG_PROPS: Omit<ModalDialogProps, 'isOpen'> = {
  ...DIALOG_PROPS,
  width: 1128,
  height: 840
}

export const COMMON_FIELDS_PROPS: Partial<ServiceReferenceFieldProps | EnvironmentReferenceFieldProps> = {
  width: 400,
  multiTypeProps: {
    allowableTypes: [MultiTypeInputType.FIXED, MultiTypeInputType.RUNTIME]
  },
  isNewConnectorLabelVisible: true,
  hideRemoteDetails: true
}

export const DefaultShowServiceEnvironment = {
  showService: true,
  showEnvironment: true
}
