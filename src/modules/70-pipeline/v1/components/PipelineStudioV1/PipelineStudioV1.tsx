/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useHistory, useParams } from 'react-router-dom'
import factory from '@pipeline/components/PipelineSteps/PipelineStepFactory'
import { stagesCollection } from '@pipeline/components/PipelineStudio/Stages/StagesCollection'
import routesv1 from '@common/RouteDefinitions'
import routesv2 from '@common/RouteDefinitionsV2'
import { useFeatureFlags } from '@common/hooks/useFeatureFlag'
import type {
  AccountPathProps,
  GitQueryParams,
  PipelinePathProps,
  PipelineType
} from '@common/interfaces/RouteInterfaces'
import { useStrings } from 'framework/strings'
import { LICENSE_STATE_VALUES } from 'framework/LicenseStore/licenseStoreUtil'
import { TrialType } from '@pipeline/components/TrialModalTemplate/trialModalUtils'
import type { PipelineInfoConfig } from 'services/pipeline-ng'
import { useQueryParams } from '@common/hooks'
import { useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import type { ModuleLicenseType } from '@common/constants/SubscriptionTypes'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { getCITrialDialog } from '../../../components/PipelineStudio/CITrial/useCITrialModal'
import { getPipelineStages } from '../../../components/PipelineStudio/PipelineStagesUtils'
import { PipelineStudioInternalV1 } from '../PipelineStudioInternalV1/PipelineStudioInternalV1'
import { PipelineProviderV1 } from './PipelineContextV1/PipelineContextV1'

import css from '../../../components/PipelineStudio/PipelineStudio.module.scss'

export default function PipelineStudioV1(): React.ReactElement {
  const { accountId, projectIdentifier, orgIdentifier, pipelineIdentifier, module } =
    useParams<PipelineType<PipelinePathProps & AccountPathProps>>()
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesv2 : routesv1

  const { branch, repoIdentifier, repoName, connectorRef, storeType } = useQueryParams<GitQueryParams>()

  const history = useHistory()

  const getTrialPipelineCreateForm = (
    onSubmit: (values: PipelineInfoConfig) => void,
    onClose: () => void
  ): React.ReactElement => {
    if (module === 'ci') {
      return getCITrialDialog({
        actionProps: { onSuccess: onSubmit },
        trialType: TrialType.SET_UP_PIPELINE,
        onCloseModal: onClose
      })
    } else {
      return <>/</>
    }
  }

  const { modal } = useQueryParams<{ modal?: ModuleLicenseType }>()

  const getOtherModal = modal ? getTrialPipelineCreateForm : undefined
  const handleRunPipeline = (): void => {
    history.push(
      routes.toPipelineStudio({
        accountId,
        orgIdentifier,
        projectIdentifier,
        pipelineIdentifier,
        module,
        branch,
        repoIdentifier,
        repoName,
        connectorRef,
        storeType,
        runPipeline: true
      })
    )
  }
  const { licenseInformation } = useLicenseStore()
  const { IACM_ENABLED } = useFeatureFlags()

  const { getString } = useStrings()
  return (
    <PipelineProviderV1
      stagesMap={stagesCollection.getAllStagesAttributes(getString)}
      queryParams={{
        accountIdentifier: accountId,
        orgIdentifier,
        projectIdentifier,
        repoIdentifier,
        branch,
        repoName,
        connectorRef,
        storeType
      }}
      pipelineIdentifier={pipelineIdentifier}
      renderPipelineStage={args =>
        getPipelineStages({
          args,
          getString,
          module,
          isCIEnabled: licenseInformation['CI']?.status === LICENSE_STATE_VALUES.ACTIVE,
          isIACMEnabled: IACM_ENABLED,
          isApprovalStageEnabled: true,
          isPipelineChainingEnabled: true
        })
      }
      stepsFactory={factory}
      runPipeline={handleRunPipeline}
    >
      <PipelineStudioInternalV1
        className={css.container}
        routePipelineStudio={routes.toPipelineStudioV1}
        routePipelineProject={routes.toDeployments}
        routePipelineDetail={routes.toPipelineDetail}
        routePipelineList={routes.toPipelines}
        getOtherModal={getOtherModal}
      />
    </PipelineProviderV1>
  )
}
