import React, { lazy, useEffect, useState } from 'react'
import { Button, ButtonVariation, Dialog, Layout, Text, ButtonSize } from '@harness/uicore'
// eslint-disable-next-line no-restricted-imports
import { Color, FontVariation } from '@harness/design-system'
import { useParams } from 'react-router-dom'
import ChildComponentMounter from 'microfrontends/ChildComponentMounter'
import { useStrings } from 'framework/strings'
import {
  AgentServiceForServerGetDeployYamlQueryParams,
  V1Agent,
  V1AgentType,
  useAgentServiceForServerCreate,
  useAgentServiceForServerGetDeployHelmChart
} from 'services/gitops'
import type { V1AgentOperator } from 'services/gitops'
import { usePolling } from '@common/hooks/usePolling'
import { useTelemetry } from '@common/hooks/useTelemetry'
import CommandBlock from '@modules/10-common/CommandBlock/CommandBlock'
import { ProjectPathProps } from '@modules/10-common/interfaces/RouteInterfaces'
import { WIZARD_STEP_OPEN } from '../../TrackingConstants'
import { getBranchingProps } from '../../utils'
import { useOnboardingStore } from '../../Store/OnboardingStore'
import css from '../../CDOnboardingWizardWithCLI.module.scss'

// eslint-disable-next-line import/no-unresolved
const CreateGitOpsAgent = lazy(() => import('gitopsui/CreateGitOpsAgent'))
export interface CreateGitopsAgentModalProps {
  toggleVisible: () => void
  toggleVerificationVisible: React.Dispatch<React.SetStateAction<boolean>>
  isVisible: boolean
  isVerificationVisible: boolean
  onAgentCreated: (data: V1Agent) => void
  agentInfo?: V1Agent | null
}

interface GitopsAppProps {
  provider?: V1Agent | null
  setNewAgent?: (data: V1Agent) => void
  onAgentDetails?: boolean
  onClose?: () => void
  isEditMode?: boolean
  agentIdentifer?: string
}
export default function CreateGitopsAgentModal({
  isVisible,
  onAgentCreated,
  toggleVisible,
  toggleVerificationVisible,
  agentInfo,
  isVerificationVisible
}: CreateGitopsAgentModalProps): JSX.Element {
  const { getString } = useStrings()
  const { trackEvent } = useTelemetry()
  const { stepsProgress } = useOnboardingStore()
  const linkRef = React.useRef<HTMLAnchorElement>(null)

  const { mutate: createAgent } = useAgentServiceForServerCreate({})
  const { projectIdentifier, orgIdentifier, accountId } = useParams<ProjectPathProps>()
  const handleCreateOrEdit = async (payload: V1Agent): Promise<any> => {
    const response = await createAgent(payload)
    return {
      status: response
    }
  }
  const agent = {
    accountIdentifier: accountId,
    projectIdentifier: projectIdentifier,
    orgIdentifier: orgIdentifier,
    identifier: 'harnessagent',
    name: 'harness-agent',
    metadata: {
      namespace: 'harness-gitops'
    },
    type: 'MANAGED_ARGO_PROVIDER' as V1AgentType,
    operator: 'ARGO' as V1AgentOperator
  }
  const [isDownloadDisabed, setIsDownloadDisabed] = useState<boolean>(true)
  const [isVerifiedOnce] = useState<boolean>(false)
  useEffect(() => {
    const data: V1Agent = {
      metadata: {
        namespace: 'harness-gitops',
        highAvailability: false,
        existingInstallation: false,
        infraType: 'UNSET'
      },
      name: 'harness-agent',
      operator: 'ARGO',
      identifier: 'harnessagent',
      projectIdentifier: projectIdentifier,
      orgIdentifier: orgIdentifier,
      accountIdentifier: accountId,
      type: 'MANAGED_ARGO_PROVIDER'
    }

    handleCreateOrEdit(data)
      .then(res => {
        refetchHelmChart()
        onAgentCreated(res.status)
        setIsDownloadDisabed(false)
      })
      .catch(() => {
        refetchHelmChart()
        onAgentCreated(agent)
        setIsDownloadDisabed(false)
      })
  }, [])

  const defaultQueryParams: AgentServiceForServerGetDeployYamlQueryParams = {
    projectIdentifier,
    orgIdentifier,
    accountIdentifier: accountId,
    namespace: 'harness-gitops',
    skipCrds: false
  }
  const { refetch: refetchHelmChart, data } = useAgentServiceForServerGetDeployHelmChart({
    queryParams: defaultQueryParams,
    agentIdentifier: 'harnessagent' as string,
    lazy: true
  })

  const handleDownload = (): void => {
    if (linkRef?.current) {
      const base64String = data?.result?.chunk || ''
      const decodedContent = atob(base64String) // Decode base64 string
      const byteArray = new Uint8Array(decodedContent.length)

      for (let i = 0; i < decodedContent.length; i++) {
        byteArray[i] = decodedContent.charCodeAt(i) // Create byte array from decoded content
      }

      const content = new Blob([byteArray], { type: 'application/octet-stream' })

      linkRef.current.href = window.URL.createObjectURL(content)
      linkRef.current.download = 'gitops-agent.tgz'
      linkRef.current.click()
    }
  }

  const toggleModal = (): void => {
    toggleVerificationVisible(true)
    !isVisible && trackEvent(WIZARD_STEP_OPEN.CREATE_AGENT_FLYOUT_OPENED, getBranchingProps(stepsProgress, getString))
  }
  return isVisible ? (
    <Dialog
      onClose={toggleVisible}
      isOpen={isVisible}
      style={{
        minWidth: 1175,
        minHeight: 690,
        borderLeft: 0,
        padding: 0,
        position: 'relative'
      }}
      enforceFocus={false}
      usePortal
      canOutsideClickClose={false}
    >
      <ChildComponentMounter<GitopsAppProps & { customHooks: { usePolling: typeof usePolling } }>
        ChildComponent={CreateGitOpsAgent}
        provider={agentInfo}
        customHooks={{
          usePolling
        }}
        onClose={toggleModal}
        setNewAgent={onAgentCreated}
      />
    </Dialog>
  ) : (
    <>
      <Text color={Color.BLACK} className={css.bold} margin={{ bottom: 'large' }}>
        {getString('cd.getStartedWithCD.createGitopsAgent')}
      </Text>
      <Layout.Vertical margin={{ bottom: 'xlarge' }}>
        <Text color={Color.BLACK} margin={{ bottom: 'large' }}>
          {getString('cd.getStartedWithCD.downloadHelmChart')}
        </Text>
        <Button
          disabled={isDownloadDisabed}
          text={getString('cd.getStartedWithCD.downloadHelmChartButton')}
          className={css.downloadButton}
          variation={ButtonVariation.SECONDARY}
          size={ButtonSize.SMALL}
          onClick={() => {
            handleDownload()
          }}
          margin={{ bottom: 'large' }}
        />
      </Layout.Vertical>
      <a className={css.hide} ref={linkRef} target={'_blank'} />
      <Layout.Vertical margin={{ bottom: 'xlarge' }}>
        <Text font={{ variation: FontVariation.H6 }} className={css.subHeading}>
          {getString('cd.getStartedWithCD.runToDownload')}
        </Text>
        <CommandBlock
          allowCopy
          ignoreWhiteSpaces={false}
          commandSnippet={getString(
            'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.pipelineSetupStep.commands.downloadedFileApplycmd'
          )}
          copyButtonText={getString('common.copy')}
        />
      </Layout.Vertical>

      {!isVerificationVisible ? (
        <Button
          onClick={toggleModal}
          variation={ButtonVariation.PRIMARY}
          text={getString('verify')}
          width={isVerifiedOnce ? 200 : 120}
        />
      ) : null}
    </>
  )
}
