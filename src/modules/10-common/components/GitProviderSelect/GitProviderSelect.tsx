/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import { CardSelect, Container, Icon, IconName, IconProps, Layout, MultiTypeInputType, Text } from '@harness/uicore'
import { FontVariation, Color } from '@harness/design-system'
import { UseStringsReturn, useStrings } from 'framework/strings'
import { AcceptableValue } from '@modules/70-pipeline/components/PipelineInputSetForm/CICodebaseInputSetForm'
import { SourceCodeTypes } from '../AccessTokenOAuth/AccessTokenOAuth'

export interface ProviderInterface {
  type: SourceCodeTypes | string
  title: string
  info: string
  icon: IconName
  size: number
  disabled?: boolean
}

export function getGitProviderCards(
  getString: UseStringsReturn['getString'],
  isDisabled?: (current: SourceCodeTypes | string) => boolean
): ProviderInterface[] {
  return [
    {
      type: SourceCodeTypes.HARNESS,
      title: getString('common.harnessCodeRepo'),
      info: getString('common.harnessCodeRepoInfo'),
      icon: 'code',
      size: 22,
      disabled: isDisabled?.(SourceCodeTypes.HARNESS) || false
    },
    {
      type: getString('stepPalette.others'),
      title: getString('common.thirdPartyGitProvider'),
      info: getString('common.thirdPartyGitProviderInfo'),
      icon: 'service-github',
      size: 20,
      disabled: isDisabled?.(getString('stepPalette.others')) || false
    }
  ]
}

export const GitProviderSelect = ({
  gitProvider,
  setFieldValue,
  providerFieldName = 'provider',
  connectorFieldName,
  repoNameFieldName,
  branchFieldName,
  handleChange,
  className,
  getCardDisabledStatus = () => false,
  showDescription
}: {
  gitProvider?: ProviderInterface
  setFieldValue: (field: string, value: unknown) => void
  providerFieldName?: string
  connectorFieldName: string
  repoNameFieldName: string
  branchFieldName?: string
  handleChange?: (value: AcceptableValue, type: MultiTypeInputType) => void
  className?: string
  getCardDisabledStatus?(current: SourceCodeTypes | string, selected: SourceCodeTypes | string): boolean
  showDescription?: boolean
}): JSX.Element => {
  const { getString } = useStrings()
  const [selectedProvider, setSelectedProvider] = useState(getGitProviderCards(getString)[0])
  const getIconProps = (item: ProviderInterface, isSelected: boolean): IconProps => ({
    name: item.icon as IconName,
    size: item.size,
    ...(item.type !== SourceCodeTypes.HARNESS ? { color: isSelected ? Color.PRIMARY_7 : Color.GREY_600 } : {})
  })
  const cards = getGitProviderCards(getString, current => getCardDisabledStatus(current, selectedProvider.type))
  const disabledState: boolean = cards.some(card => card.disabled)

  useEffect(() => {
    if (gitProvider) {
      setSelectedProvider(gitProvider)
    }
  }, [gitProvider])

  return (
    <Container padding={{ bottom: 'medium' }}>
      {!showDescription && (
        <Text font={{ variation: FontVariation.FORM_LABEL }} margin={{ bottom: 'small' }}>
          {getString('common.gitProvider')}
        </Text>
      )}
      <CardSelect
        data={cards}
        cornerSelected
        className={className}
        renderItem={(item: ProviderInterface) => (
          <Layout.Horizontal flex={{ justifyContent: 'start' }} spacing={showDescription ? 'small' : 'xsmall'}>
            <Icon {...getIconProps(item, selectedProvider.type === item.type)} />
            <Container>
              <Text
                font={{ variation: showDescription ? FontVariation.CARD_TITLE : FontVariation.SMALL }}
                color={selectedProvider.type === item.type ? Color.PRIMARY_7 : Color.GREY_800}
              >
                {item.title}
              </Text>
              {showDescription && (
                <Text font={{ variation: FontVariation.SMALL }} color={Color.GREY_500}>
                  {item.info}
                </Text>
              )}
            </Container>
          </Layout.Horizontal>
        )}
        selected={selectedProvider}
        onChange={value => {
          if (disabledState) return
          setSelectedProvider(value)
          setFieldValue(providerFieldName, value)
          setFieldValue(repoNameFieldName, '')
          branchFieldName && setFieldValue(branchFieldName, '')
          if (value.type === SourceCodeTypes.HARNESS) {
            setFieldValue(connectorFieldName, '')
            handleChange?.('', MultiTypeInputType.FIXED)
          }
        }}
      />
    </Container>
  )
}
