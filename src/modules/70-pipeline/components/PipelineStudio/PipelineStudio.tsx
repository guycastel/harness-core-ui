/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { PageSpinner } from '@harness/uicore'
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
import { PipelineProvider } from '@pipeline/components/PipelineStudio/PipelineContext/PipelineContext'
import { PipelineStudioInternal } from '@pipeline/components/PipelineStudio/PipelineStudioInternal/PipelineStudioInternal'
import { TrialType } from '@pipeline/components/TrialModalTemplate/trialModalUtils'
import type { PipelineInfoConfig } from 'services/pipeline-ng'
import { useQueryParams } from '@common/hooks'
import { useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import type { ModuleLicenseType } from '@common/constants/SubscriptionTypes'
import { ModuleName } from 'framework/types/ModuleName'
import useNavModuleInfo from '@common/hooks/useNavModuleInfo'
import { LICENSE_STATE_VALUES } from 'framework/LicenseStore/licenseStoreUtil'
import {
  PipelineLoaderProvider,
  usePipelineLoaderContext
} from '@pipeline/common/components/PipelineStudio/PipelineLoaderContext/PipelineLoaderContext'
import { IDBProvider } from '@modules/10-common/components/IDBContext/IDBContext'
import { PipelineProviderY1 } from '@pipeline/y1/components/PipelineContext/PipelineContextY1'
import { PipelineStudioInternalY1 } from '@pipeline/y1/components/PipelineStudioInternal/PipelineStudioInternalY1'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { getCDTrialDialog } from './CDTrial/useCDTrialModal'
import { getCITrialDialog } from './CITrial/useCITrialModal'
import { getPipelineStages } from './PipelineStagesUtils'
import { YamlVersionSwitch } from './YamlVersionSwitch'
import css from './PipelineStudio.module.scss'

function PipelineStudioInner(): React.ReactElement {
  const { accountId, projectIdentifier, orgIdentifier, pipelineIdentifier, module } =
    useParams<PipelineType<PipelinePathProps & AccountPathProps>>()
  const { isNewNavEnabled } = useAppStore()
  const routes = isNewNavEnabled ? routesv2 : routesv1

  const { branch, repoIdentifier, repoName, connectorRef, storeType } = useQueryParams<GitQueryParams>()
  const history = useHistory()

  const { yamlVersion } = usePipelineLoaderContext()

  const getTrialPipelineCreateForm = (
    onSubmit: (values: PipelineInfoConfig) => void,
    onClose: () => void
  ): React.ReactElement => {
    if (module === 'cd') {
      return getCDTrialDialog({
        actionProps: { onSuccess: onSubmit },
        trialType: TrialType.SET_UP_PIPELINE,
        onCloseModal: onClose
      })
    } else if (module === 'ci') {
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
  const { FF_LICENSE_STATE, licenseInformation } = useLicenseStore()
  const { IACM_ENABLED, IDP_ENABLED, IDP_ENABLE_STAGE } = useFeatureFlags()
  const { getString } = useStrings()
  const { shouldVisible } = useNavModuleInfo(ModuleName.CD)
  return (
    <YamlVersionSwitch
      yamlVersion={yamlVersion}
      loading={
        <React.Fragment>
          <PageSpinner />
          <div /> {/* this empty div is required for rendering layout correctly */}
        </React.Fragment>
      }
      v0={
        <PipelineProvider
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
              isCDEnabled: shouldVisible,
              isCFEnabled: licenseInformation['CF'] && FF_LICENSE_STATE === LICENSE_STATE_VALUES.ACTIVE,
              isSTOEnabled: licenseInformation['STO']?.status === LICENSE_STATE_VALUES.ACTIVE,
              isIACMEnabled: IACM_ENABLED,
              isIDPEnabled: IDP_ENABLED && IDP_ENABLE_STAGE,
              isApprovalStageEnabled: true,
              isPipelineChainingEnabled: true
            })
          }
          stepsFactory={factory}
          runPipeline={handleRunPipeline}
        >
          <PipelineStudioInternal
            className={css.container}
            routePipelineStudio={routes.toPipelineStudio}
            routePipelineProject={routes.toDeployments}
            routePipelineDetail={routes.toPipelineDetail}
            routePipelineList={routes.toPipelines}
            getOtherModal={getOtherModal}
          />
        </PipelineProvider>
      }
      v1={
        <PipelineProviderY1
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
              isCDEnabled: shouldVisible,
              isCFEnabled: licenseInformation['CF'] && FF_LICENSE_STATE === LICENSE_STATE_VALUES.ACTIVE,
              isSTOEnabled: licenseInformation['STO']?.status === LICENSE_STATE_VALUES.ACTIVE,
              isIACMEnabled: IACM_ENABLED,
              isIDPEnabled: IDP_ENABLED && IDP_ENABLE_STAGE,
              isApprovalStageEnabled: true,
              isPipelineChainingEnabled: true
            })
          }
          stepsFactory={factory}
          runPipeline={handleRunPipeline}
        >
          <PipelineStudioInternalY1 className={css.container} />
        </PipelineProviderY1>
      }
    />
  )
}

export default function PipelineStudio(): React.ReactElement {
  const { accountId, projectIdentifier, orgIdentifier, pipelineIdentifier } =
    useParams<PipelineType<PipelinePathProps & AccountPathProps>>()
  const { branch, repoIdentifier, repoName, connectorRef, storeType } = useQueryParams<GitQueryParams>()

  return (
    <IDBProvider storeName="pipeline-cache" dbName="pipeline-db">
      <PipelineLoaderProvider
        pipelineIdentifier={pipelineIdentifier}
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
      >
        <PipelineStudioInner />
      </PipelineLoaderProvider>
    </IDBProvider>
  )
}
