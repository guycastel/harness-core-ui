/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Button, ButtonVariation, Container, Layout } from '@harness/uicore'
import { useHistory, useParams } from 'react-router-dom'
import routesv1 from '@common/RouteDefinitions'
import routesv2 from '@common/RouteDefinitionsV2'
import type { ProjectPathProps, ServicePathProps } from '@common/interfaces/RouteInterfaces'
import { useStrings } from 'framework/strings'
import orImg from '@common/images/orImg.svg'
import { useTelemetry } from '@common/hooks/useTelemetry'
import { CDOnboardingActions } from '@common/constants/TrackingConstants'
import { useAppStore } from 'framework/AppStore/AppStoreContext'

export interface GetStartedWithCDButtonProps {
  hideOrSection?: boolean
  className?: string
}

export function GetStartedWithCDButton({ hideOrSection, className = '' }: GetStartedWithCDButtonProps): JSX.Element {
  const history = useHistory()
  const { getString } = useStrings()
  const { trackEvent } = useTelemetry()
  const { accountId, orgIdentifier, projectIdentifier } = useParams<ProjectPathProps & ServicePathProps>()

  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesv2 : routesv1

  const clickHandler = (): void => {
    trackEvent(CDOnboardingActions.GetStartedClicked, { is_from_secondary_page: true })
    history.push(routes.toCDOnboardingWizard({ accountId, orgIdentifier, projectIdentifier, module: 'cd' }))
  }

  return (
    <Container padding={{ bottom: 'large' }} className={className}>
      <Layout.Vertical flex={{ align: 'center-center' }} spacing={'xlarge'}>
        <Button
          intent="primary"
          variation={ButtonVariation.PRIMARY}
          text={getString('pipeline.guidedCDK8sGetStarted')}
          onClick={clickHandler}
          tooltipProps={{
            dataTooltipId: 'guidedCDOnboardingFlow'
          }}
        />
        {!hideOrSection && <img src={orImg} width={270} height={24} alt="" data-testid="or-image" />}
      </Layout.Vertical>
    </Container>
  )
}

export default GetStartedWithCDButton
