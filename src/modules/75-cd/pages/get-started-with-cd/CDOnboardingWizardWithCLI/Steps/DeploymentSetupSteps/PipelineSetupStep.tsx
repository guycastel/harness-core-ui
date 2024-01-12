/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { FunctionComponent } from 'react'
import { useParams } from 'react-router-dom'
import { isEmpty } from 'lodash-es'
import { Layout, Text, TextInput, Label, Button, ButtonVariation, ButtonSize } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import type { UseStringsReturn } from 'framework/strings'
import { String, useStrings } from 'framework/strings'
import { V1Agent } from 'services/gitops'
import type { AccountPathProps, PipelineType, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import CommandBlock from '@common/CommandBlock/CommandBlock'
import { getCommandsByDeploymentType, isGitopsFlow } from '../../utils'
import {
  CDOnboardingSteps,
  CLOUD_FUNCTION_TYPES,
  PipelineSetupState,
  WhatToDeployType,
  WhereAndHowToDeployType
} from '../../types'
import { useOnboardingStore } from '../../Store/OnboardingStore'
import ConfigureGCP from './GCP/ConfigureGCP'
import ConfigureAWS from './AWS/ConfigureAWS'
import { DEPLOYMENT_TYPE_TO_DIR_MAP, SERVICE_TYPES } from '../../Constants'
import ConfigureServerless from './AWS/ConfigureServerless'
import ConfigureSSH from './TraditionalApps/ConfigureSSH'
import ConfigureWinRM from './TraditionalApps/ConfigureWinRM'
import css from '../../CDOnboardingWizardWithCLI.module.scss'

const INFRATYPE_TO_COMPONENT_MAP: {
  [key: string]: FunctionComponent<{ onUpdate: (data: PipelineSetupState) => void }>
} = {
  [CLOUD_FUNCTION_TYPES.GCPGen1]: ConfigureGCP,
  [CLOUD_FUNCTION_TYPES.GCPGen2]: ConfigureGCP,
  [CLOUD_FUNCTION_TYPES.ServerLessLambda]: ConfigureServerless,
  [CLOUD_FUNCTION_TYPES.NativeAWSLambda]: ConfigureAWS,
  SSH: ConfigureSSH,
  WINRM: ConfigureWinRM,
  SSH_AWS: ConfigureSSH,
  WINRM_AWS: ConfigureWinRM
}

export default function PipelineSetupStep({
  onUpdate,
  state
}: {
  state: PipelineSetupState
  onUpdate: (data: PipelineSetupState) => void
}): JSX.Element {
  const { getString } = useStrings()
  const { stepsProgress } = useOnboardingStore()
  const deploymentData = React.useMemo((): WhatToDeployType => {
    return stepsProgress?.[CDOnboardingSteps.WHAT_TO_DEPLOY]?.stepData
  }, [stepsProgress])

  const showGitPatInput =
    !isGitopsFlow(stepsProgress) && deploymentData?.svcType?.id !== SERVICE_TYPES?.TraditionalApp?.id

  return (
    <Layout.Vertical className={css.deploymentSteps}>
      <Layout.Vertical margin={{ top: 'xxlarge', bottom: 'xlarge' }}>
        <Text color={Color.BLACK} margin={{ bottom: 'large' }}>
          <String
            useRichText
            color={Color.BLACK}
            className={css.marginBottomLarge}
            stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.gitStep.title"
            vars={{
              num: '4.'
            }}
          />
        </Text>
        <Text color={Color.BLACK} margin={{ bottom: 'large' }}>
          <String
            useRichText
            color={Color.BLACK}
            className={css.marginBottomLarge}
            stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.gitStep.whyGitDetails"
          />
        </Text>
        <Layout.Vertical margin={{ top: 'medium', left: 'xlarge' }}>
          <Layout.Vertical width={400}>
            <Label>
              {getString('cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.gitStep.githubusername')}
            </Label>
            <TextInput
              id="githubusername"
              name="githubusername"
              defaultValue={state.githubUsername}
              placeholder={getString(
                'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.gitStep.githubusername'
              )}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value
                onUpdate({ ...state, githubUsername: value })
              }}
            />
          </Layout.Vertical>
          {showGitPatInput && (
            <Layout.Vertical width={400}>
              <Layout.Horizontal flex={{ justifyContent: 'space-between' }}>
                <Label>
                  {getString('cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.gitStep.githubpat')}
                </Label>
                <Button
                  target="_blank"
                  className={css.alignTitle}
                  variation={ButtonVariation.LINK}
                  size={ButtonSize.SMALL}
                  href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
                >
                  {getString('cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.gitStep.whereToFindGitPat')}
                </Button>
              </Layout.Horizontal>

              <TextInput
                defaultValue={state.githubPat}
                id="githubpat"
                name="githubpat"
                placeholder={getString('cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.gitStep.githubpat')}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value
                  onUpdate({ ...state, githubPat: value })
                }}
              />
            </Layout.Vertical>
          )}
        </Layout.Vertical>
      </Layout.Vertical>
      <InfraDetailsComponent
        infraType={
          deploymentData?.artifactSubType?.id
            ? deploymentData?.artifactSubType?.id
            : (deploymentData?.artifactType?.id as string)
        }
        onUpdate={onUpdate}
      />
      <Text color={Color.BLACK} font={{ variation: FontVariation.FORM_TITLE }} margin={{ bottom: 'large' }}>
        <String
          color={Color.BLACK}
          stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.headsteps.createEntities"
          vars={{
            num:
              (stepsProgress[CDOnboardingSteps.WHAT_TO_DEPLOY].stepData as WhatToDeployType)?.svcType?.id ===
              'KubernetesService'
                ? 2
                : 3
          }}
        />
      </Text>
      <CLISteps
        getString={getString}
        state={state}
        artifactType={deploymentData?.artifactType?.id as string}
        artifactSubtype={deploymentData?.artifactSubType?.id as string}
        serviceType={deploymentData.svcType?.id as string}
        delegateName={
          (stepsProgress[CDOnboardingSteps.HOW_N_WHERE_TO_DEPLOY].stepData as WhereAndHowToDeployType)?.delegateName
        }
        agentInfo={
          (stepsProgress[CDOnboardingSteps.HOW_N_WHERE_TO_DEPLOY].stepData as WhereAndHowToDeployType)?.agentInfo
        }
      />
    </Layout.Vertical>
  )
}

function CLISteps({
  getString,
  state,
  delegateName,
  artifactType,
  artifactSubtype,
  serviceType,
  agentInfo
}: {
  getString: UseStringsReturn['getString']
  state: PipelineSetupState
  artifactType: string
  artifactSubtype?: string
  delegateName?: string
  serviceType: string
  agentInfo?: V1Agent
}): JSX.Element {
  const { accountId } = useParams<AccountPathProps>()
  const { orgIdentifier, projectIdentifier } = useParams<PipelineType<ProjectPathProps>>()
  const commandSnippet = React.useMemo((): string => {
    const dirPath = artifactSubtype
      ? DEPLOYMENT_TYPE_TO_DIR_MAP[artifactSubtype]
      : DEPLOYMENT_TYPE_TO_DIR_MAP[artifactType]

    return getCommandsByDeploymentType({
      getString,
      dirPath,
      delegateName,
      state,
      accountId,
      artifactSubtype,
      artifactType,
      serviceType,
      isGitops: !isEmpty(agentInfo?.identifier),
      agentId: agentInfo?.identifier,
      projectIdentifier,
      orgIdentifier
    })
  }, [state])

  return (
    <Layout.Vertical margin={{ bottom: 'xlarge' }}>
      <Text color={Color.BLACK} padding={{ bottom: 'large' }}>
        <String
          useRichText
          color={Color.BLACK}
          className={css.marginBottomLarge}
          stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.createEntitytitle"
        />
      </Text>
      <CommandBlock
        allowCopy={true}
        commandSnippet={commandSnippet}
        ignoreWhiteSpaces={false}
        downloadFileProps={{ downloadFileName: 'harness-cli-setup', downloadFileExtension: 'xdf' }}
        copyButtonText={getString('common.copy')}
        commentPrefix="#"
      />
    </Layout.Vertical>
  )
}

export function InfraDetailsComponent({
  infraType = '',
  onUpdate
}: {
  infraType: string
  onUpdate: (data: PipelineSetupState) => void
}): JSX.Element | null {
  const InfraTypeComponent = INFRATYPE_TO_COMPONENT_MAP[infraType] ?? null
  return InfraTypeComponent ? <InfraTypeComponent onUpdate={onUpdate} /> : null
}
