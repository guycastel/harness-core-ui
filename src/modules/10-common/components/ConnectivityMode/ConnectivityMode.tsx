/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import cx from 'classnames'
import { Text, FormikCollapsableSelect, CollapsableSelectType, CollapsableSelectOptions } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import type { FormikContextType } from 'formik'
import DelegatesGit from '@common/icons/DelegatesGit.svg'
import PlatformGit from '@common/icons/PlatformGit.svg'
import { useStrings } from 'framework/strings'
import type { AwsCredential, GcpConnectorCredential } from 'services/cd-ng'

export enum ConnectivityModeType {
  Manager = 'Manager',
  Delegate = 'Delegate'
}

export interface CredentialType {
  [key: string]: AwsCredential['type'] | GcpConnectorCredential['type']
}

export const DelegateTypes: CredentialType = {
  DELEGATE_IN_CLUSTER: 'InheritFromDelegate',
  DELEGATE_IN_CLUSTER_IRSA: 'Irsa',
  DELEGATE_OUT_CLUSTER: 'ManualConfig',
  DELEGATE_OIDC: 'OidcAuthentication'
}

export interface ConnectivityCardItem extends CollapsableSelectOptions {
  type: ConnectivityModeType
  title: string
  info: string
  icon: JSX.Element
}

export interface ConnectivityModeForm {
  connectivityMode: ConnectivityModeType | undefined
  proxy?: boolean
}

interface ConnectivityModeProps {
  formik: FormikContextType<ConnectivityModeForm>
  className?: string
  onChange: (val: ConnectivityCardItem) => void
  connectorLabel?: string
  delegateImage?: string
  platformImage?: string
  delegateType?: CredentialType['key']
}

const hideConnectThroughPlatformCard = (delegateType?: CredentialType['key']): boolean =>
  !!delegateType && [DelegateTypes.DELEGATE_IN_CLUSTER, DelegateTypes.DELEGATE_IN_CLUSTER_IRSA].includes(delegateType)

const hideConnectThroughDelegateCard = (delegateType?: CredentialType['key']): boolean =>
  !!delegateType && [DelegateTypes.DELEGATE_OIDC].includes(delegateType)

const ConnectivityMode: React.FC<ConnectivityModeProps> = props => {
  const { delegateImage = DelegatesGit, platformImage = PlatformGit, delegateType, formik } = props
  const { values, setFieldValue } = formik
  const { getString } = useStrings()
  const ConnectivityCard: ConnectivityCardItem[] = [
    ...(!hideConnectThroughPlatformCard(delegateType)
      ? [
          {
            type: ConnectivityModeType.Manager,
            title: getString('common.connectThroughPlatform'),
            info: getString('common.connectThroughPlatformInfo', { connectorType: props.connectorLabel }),
            icon: <img src={platformImage} width="100%" />,
            value: ConnectivityModeType.Manager
          }
        ]
      : []),
    // Added for GCP OIDC authentication method, will be removed once BE starts supporting it
    ...(!hideConnectThroughDelegateCard(delegateType)
      ? [
          {
            type: ConnectivityModeType.Delegate,
            title: getString('common.connectThroughDelegate'),
            info: getString('common.connectThroughDelegateInfo', { connectorType: props.connectorLabel }),
            icon: <img src={delegateImage} width="100%" />,
            value: ConnectivityModeType.Delegate
          }
        ]
      : [])
  ]

  React.useEffect(() => {
    // reset fieldValue for validations
    if (hideConnectThroughPlatformCard(delegateType)) {
      values.connectivityMode === ConnectivityModeType.Manager && setFieldValue('connectivityMode', undefined)
    }
  }, [delegateType])

  return (
    <FormikCollapsableSelect<ConnectivityCardItem>
      name="connectivityMode"
      items={ConnectivityCard}
      itemClassName={cx(props.className)}
      renderItem={(item: ConnectivityCardItem) => {
        return (
          <>
            <Text font={{ variation: FontVariation.H6 }} color={Color.GREY_900} margin={{ bottom: 'small' }}>
              {item.title}
            </Text>

            <Text color={Color.BLACK} font={{ variation: FontVariation.SMALL }}>
              {item.info}
            </Text>
            {item.icon}
          </>
        )
      }}
      onChange={props.onChange}
      type={CollapsableSelectType.CardView}
      selected={
        ConnectivityCard[ConnectivityCard.findIndex(card => card.type === props.formik.values.connectivityMode)]
      }
    />
  )
}

export default ConnectivityMode
