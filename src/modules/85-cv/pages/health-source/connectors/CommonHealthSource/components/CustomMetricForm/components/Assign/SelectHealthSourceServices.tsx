/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Container } from '@harness/uicore'
import { RiskProfile } from './components/RiskProfile/RiskProfile'
import type { SelectHealthSourceServicesProps } from './SelectHealthSourceServices.types'
import AssignSection from './components/AssignSection/AssignSection'
import css from './SelectHealthSourceServices.module.scss'

export default function SelectHealthSourceServices({
  values,
  hideServiceIdentifier = false,
  hideCV,
  hideSLIAndHealthScore,
  showOnlySLI = false,
  riskProfileResponse
}: SelectHealthSourceServicesProps): JSX.Element {
  const { continuousVerification, healthScore, serviceInstance, riskCategory } = values

  return (
    <Container className={css.main}>
      <AssignSection hideCV={hideCV} showOnlySLI={showOnlySLI} hideSLIAndHealthScore={hideSLIAndHealthScore} />
      {(continuousVerification || healthScore) && (
        <RiskProfile
          continuousVerificationEnabled={continuousVerification && !hideServiceIdentifier}
          serviceInstance={typeof serviceInstance === 'string' ? serviceInstance : (serviceInstance?.value as string)}
          riskCategory={riskCategory}
          riskProfileResponse={riskProfileResponse}
        />
      )}
    </Container>
  )
}