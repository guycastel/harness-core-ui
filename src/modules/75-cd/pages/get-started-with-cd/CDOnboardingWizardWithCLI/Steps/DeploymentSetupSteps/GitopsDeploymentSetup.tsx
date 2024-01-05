/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */
import React from 'react'
import { Layout, Text } from '@harness/uicore'
import { useParams } from 'react-router-dom'
import { Color } from '@harness/design-system'
import CommandBlock from '@modules/10-common/CommandBlock/CommandBlock'
import { AccountPathProps } from '@modules/10-common/interfaces/RouteInterfaces'
import { String, useStrings } from 'framework/strings'
import { KubernetesType } from '@modules/27-platform/delegates/constants'
import { DEPLOYMENT_TYPE_TO_DIR_MAP } from '../../Constants'
import { InstallCLIInfo } from './CLISetupStep'
import ApiKeySetup from './ApiKeySetup'
import { CDOnboardingSteps, PipelineSetupState, WhereAndHowToDeployType } from '../../types'
import VerifyGitopsEntities from '../VerificationComponents/VerifyGitopsEntities'
import { useOnboardingStore } from '../../Store/OnboardingStore'
import { getCommandStrWithNewline } from '../../utils'
import css from '../../CDOnboardingWizardWithCLI.module.scss'

interface GitopsDeploymentSetupProps {
  state: PipelineSetupState
  onKeyGenerate: (data: PipelineSetupState) => void
  saveProgress: (stepId: string, data: unknown) => void
}
export default function GitopsDeploymentSetup({
  onKeyGenerate,
  state,
  saveProgress
}: GitopsDeploymentSetupProps): JSX.Element {
  const { getString } = useStrings()
  const { accountId } = useParams<AccountPathProps>()

  const { stepsProgress } = useOnboardingStore()
  const deploymentData = stepsProgress?.[CDOnboardingSteps.WHAT_TO_DEPLOY]?.stepData
  const agentInfo = stepsProgress?.[CDOnboardingSteps.HOW_N_WHERE_TO_DEPLOY]?.stepData as WhereAndHowToDeployType
  const isKubernetesManifest = deploymentData?.artifactType?.id === KubernetesType.KUBERNETES_MANIFEST ? true : false
  const dirPath = deploymentData?.artifactSubType?.id
    ? DEPLOYMENT_TYPE_TO_DIR_MAP[deploymentData?.artifactSubType?.id]
    : isKubernetesManifest
    ? 'podinfo'
    : DEPLOYMENT_TYPE_TO_DIR_MAP[deploymentData?.artifactType?.id as string]

  return (
    <Layout.Vertical spacing="xlarge">
      <Text color={Color.BLACK}>
        <String
          stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.setupStep.gitopsTitle"
          useRichText
        />
      </Text>
      <Layout.Vertical spacing={'large'}>
        <Text color={Color.BLACK} className={css.bold}>
          <String
            stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.setupStep.title"
            vars={{ titleIndex: '1. ' }}
          />
        </Text>
        <InstallCLIInfo />

        <Text className={css.bold} color={Color.BLACK}>
          <String
            stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.setupStep.setupEntites"
            vars={{ titleIndex: '2. ' }}
          />
        </Text>
        <Layout.Vertical margin={{ left: 'large' }}>
          <ApiKeySetup
            onKeyGenerate={onKeyGenerate}
            state={state}
            title={getString('cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.prepareStep.gitopsTitle')}
          />
        </Layout.Vertical>
        <Layout.Vertical spacing="large" margin={{ left: 'large' }}>
          <Text color={Color.BLACK} margin={{ bottom: 'small' }}>
            <String stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.prepareStep.gitopsLogin" />
          </Text>
          <CommandBlock
            allowCopy
            ignoreWhiteSpaces={false}
            commandSnippet={getString(
              'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.pipelineSetupStep.commands.logincmd',
              {
                accId: accountId,
                apiKey: state?.apiKey
              }
            )}
            downloadFileProps={{ downloadFileName: 'harness-cli-install-steps', downloadFileExtension: 'xdf' }}
            copyButtonText={getString('common.copy')}
          />

          <Text color={Color.BLACK} margin={{ bottom: 'small' }}>
            <String
              useRichText
              stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.prepareStep.gitopsClone"
            />
          </Text>
          <CommandBlock
            allowCopy
            ignoreWhiteSpaces={false}
            commandSnippet={getCommandStrWithNewline([
              `${getString(
                'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.pipelineSetupStep.commands.clonecmd',
                { gitUser: 'harness-community' }
              )} && ${getString(
                'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.pipelineSetupStep.commands.cddir'
              )}`
            ])}
            downloadFileProps={{ downloadFileName: 'harness-cli-install-steps', downloadFileExtension: 'xdf' }}
            copyButtonText={getString('common.copy')}
          />

          <Text color={Color.BLACK} margin={{ bottom: 'small' }}>
            <String
              useRichText
              stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.pipelineSetupStep.commands.comments.createGitopsCluster"
            />
          </Text>
          <CommandBlock
            allowCopy
            ignoreWhiteSpaces={false}
            commandSnippet={getString(
              'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.pipelineSetupStep.commands.gitops.createCluster',
              {
                accId: accountId,
                apiKey: state?.apiKey,
                dirPath,
                agentId: agentInfo?.agentInfo?.identifier
              }
            )}
            downloadFileProps={{ downloadFileName: 'harness-cli-install-steps', downloadFileExtension: 'xdf' }}
            copyButtonText={getString('common.copy')}
          />

          <Text color={Color.BLACK} margin={{ bottom: 'small' }}>
            <String
              useRichText
              stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.pipelineSetupStep.commands.comments.createGitopsRepo"
            />
          </Text>
          <CommandBlock
            allowCopy
            ignoreWhiteSpaces={false}
            commandSnippet={getString(
              'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.pipelineSetupStep.commands.gitops.createRepo',
              {
                accId: accountId,
                apiKey: state?.apiKey,
                dirPath,
                agentId: agentInfo?.agentInfo?.identifier
              }
            )}
            downloadFileProps={{ downloadFileName: 'harness-cli-install-steps', downloadFileExtension: 'xdf' }}
            copyButtonText={getString('common.copy')}
          />

          <Text color={Color.BLACK} margin={{ bottom: 'small' }}>
            <String
              useRichText
              stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.pipelineSetupStep.commands.comments.createGitopsApp"
            />
          </Text>
          <CommandBlock
            allowCopy
            ignoreWhiteSpaces={false}
            commandSnippet={getString(
              'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.pipelineSetupStep.commands.gitops.createApplication',
              {
                accId: accountId,
                apiKey: state?.apiKey,
                dirPath,
                agentId: agentInfo?.agentInfo?.identifier
              }
            )}
            downloadFileProps={{ downloadFileName: 'harness-cli-install-steps', downloadFileExtension: 'xdf' }}
            copyButtonText={getString('common.copy')}
          />
        </Layout.Vertical>

        <VerifyGitopsEntities saveProgress={saveProgress} />
      </Layout.Vertical>
    </Layout.Vertical>
  )
}
