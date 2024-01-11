import React, { useEffect } from 'react'
import type { Row } from 'react-table'
import cx from 'classnames'
import { Container, Layout, Text } from '@harness/uicore'
import { Spinner } from '@blueprintjs/core'
import produce from 'immer'
import { set } from 'lodash-es'
import { Color } from '@harness/design-system'
import { useStrings } from 'framework/strings'
import { OverrideSpecDetailsForm } from '@cd/components/ServiceOverrides/components/ListRows/Editable/OverrideSpecDetailsForm'
import type { Error, Failure } from 'services/cd-ng'
import { ErrorHandler, ResponseMessage } from '@modules/10-common/components/ErrorHandler/ErrorHandler'
import { RemoteOverrideMetadata } from './OverridesCollapsibleTable'
import { useServiceOverridesContext } from '../../context/ServiceOverrideContext'
import { formListSectionItem } from '../../context/ServiceOverrideContextUtils'
import {
  ServiceOverrideSectionProps,
  ServiceOverridesResponseDTOV2,
  OverrideDetails
} from '../../ServiceOverridesUtils'
import css from './OverridesCollapsibleTable.module.scss'

interface OverrideSpecDetailsSectionProps {
  row: Row<ServiceOverrideSectionProps>
  remoteOverrideMetadataMap?: Map<string, RemoteOverrideMetadata>
}

export const OverrideSpecDetailsSection = (props: OverrideSpecDetailsSectionProps): JSX.Element => {
  const { setListSectionItems, listSectionItems } = useServiceOverridesContext()
  const { getString } = useStrings()
  const {
    sectionIndex,
    id,
    isNew: isSectionNew,
    isEdit: isSectionEdit,
    overrideResponse,
    overrideSpecDetails
  } = props.row.original
  const remoteOverrideMetadata = props.remoteOverrideMetadataMap?.get(overrideResponse?.identifier as string)
  const isAddNewOverride = listSectionItems.some(item => item?.isNew && item?.sectionIndex === -1)
  useEffect(() => {
    if (
      !isAddNewOverride &&
      remoteOverrideMetadata &&
      !remoteOverrideMetadata.isLoading &&
      remoteOverrideMetadata.remoteOverrideResponse?.data
    ) {
      const updatedListSectionItem = formListSectionItem(
        remoteOverrideMetadata?.remoteOverrideResponse?.data as ServiceOverridesResponseDTOV2,
        sectionIndex
      )
      setListSectionItems?.(prevSectionList => {
        return produce(prevSectionList, draft => {
          set(draft, sectionIndex, updatedListSectionItem)
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    remoteOverrideMetadata?.isLoading,
    remoteOverrideMetadata?.remoteOverrideResponse?.data,
    sectionIndex,
    isAddNewOverride
  ])

  if (remoteOverrideMetadata?.isLoading) {
    return (
      <Container padding={'medium'}>
        <Spinner size={Spinner.SIZE_SMALL} />
      </Container>
    )
  }
  if (remoteOverrideMetadata?.remoteOverrideResponse?.status === 'ERROR') {
    return (
      <ErrorHandler
        responseMessages={
          (remoteOverrideMetadata.remoteOverrideResponse as Error)?.responseMessages as ResponseMessage[]
        }
        className={css.errorHandler}
      />
    )
  } else if (remoteOverrideMetadata?.remoteOverrideResponse?.status === 'FAILURE') {
    return (
      <Layout.Vertical background={Color.RED_100} padding={'small'} className={cx(css.container, css.shrink)}>
        <Text font={{ size: 'small', weight: 'bold' }} className={css.errorHandler} color={Color.RED_700}>
          {(remoteOverrideMetadata?.remoteOverrideResponse as Failure)?.message}
        </Text>
      </Layout.Vertical>
    )
  }

  return (
    <Layout.Vertical spacing="none" className={'check container'}>
      <Layout.Horizontal spacing="none" padding={{ top: 'medium', bottom: 'medium' }}>
        <Text font={{ size: 'small', weight: 'bold' }} width={300} key={'common.serviceOverrides.overrideType'}>
          {getString('common.serviceOverrides.overrideType').toUpperCase()}
        </Text>
        <Text font={{ size: 'small', weight: 'bold' }} width={300} key={'common.serviceOverrides.overrideInfo'}>
          {getString('common.serviceOverrides.overrideInfo').toUpperCase()}
        </Text>
      </Layout.Horizontal>
      <React.Fragment key={id}>
        <OverrideSpecDetailsForm
          overrideSpecDetails={overrideSpecDetails as OverrideDetails[]}
          sectionIndex={sectionIndex}
          isSectionNew={isSectionNew}
          isSectionEdit={isSectionEdit}
          overrideResponse={overrideResponse as ServiceOverridesResponseDTOV2}
        />
      </React.Fragment>
    </Layout.Vertical>
  )
}
