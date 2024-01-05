/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import type { Asset } from 'contentful'
import { Layout, Text } from '@harness/uicore'
import { Icon } from '@harness/icons'
import { FontVariation, Color } from '@harness/design-system'
import useNavModuleInfo, { NavModuleName } from '@common/hooks/useNavModuleInfo'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import css from './CarousellmageAndDescription.module.scss'

interface CarouselImageAndDescriptionProps {
  activeModule: NavModuleName
  image: Asset
  primaryText: string
  secondaryText: string
}

const CarouselImageAndDescription: React.FC<CarouselImageAndDescriptionProps> = ({
  image,
  primaryText,
  secondaryText,
  activeModule
}) => {
  const { icon } = useNavModuleInfo(activeModule)
  const { isNewNavEnabled: isLightThemed } = useAppStore()

  return (
    <Layout.Vertical flex={{ justifyContent: 'center' }} height="100%">
      <img className={css.image} src={`https:${image.fields.file.url}`} />
      {primaryText && (
        <Text
          className={css.primaryText}
          color={Color.PRIMARY_5}
          font={{ variation: FontVariation.H1_SEMI }}
          padding={{ top: 'xlarge', bottom: 'small', left: 'huge', right: 'huge' }}
        >
          {primaryText}
        </Text>
      )}
      {secondaryText && (
        <Text
          className={css.secondaryText}
          color={isLightThemed ? Color.GREY_800 : Color.WHITE}
          font={{ variation: FontVariation.BODY1 }}
          padding={{ left: 'huge', right: 'huge' }}
        >
          {secondaryText}
        </Text>
      )}

      {icon && <Icon name={icon} size={540} className={css.backgroundModuleImage} />}
    </Layout.Vertical>
  )
}

export default CarouselImageAndDescription
