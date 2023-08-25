import React, { useEffect, useState } from 'react'
import { Button, ButtonVariation, Label, Layout, Text, TextInput } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { String, useStrings } from 'framework/strings'
import { downloadJSONAsFile } from '@common/utils/JSONUtils'
import { CDOnboardingSteps, PipelineSetupState } from '../../../types'
import { useOnboardingStore } from '../../../Store/OnboardingStore'

export default function ConfigureServerless({
  onUpdate
}: {
  onUpdate: (data: PipelineSetupState) => void
}): JSX.Element {
  const { stepsProgress } = useOnboardingStore()
  const { getString } = useStrings()
  const pipelineState = React.useMemo((): PipelineSetupState => {
    return stepsProgress[CDOnboardingSteps.DEPLOYMENT_STEPS].stepData as PipelineSetupState
  }, [stepsProgress])
  const [funcJSON, setFuncJSON] = useState<Record<string, string>>({
    functionName: 'helloworld',
    runtime: 'python3.10',
    handler: 'handler.hello',
    role: ''
  })
  const [state, setState] = useState<PipelineSetupState['infraInfo']>(() => {
    const prevState = pipelineState?.infraInfo
    return prevState
  })
  const updateState = (key: string, value: string): void => {
    setState(prevState => ({ ...prevState, [key]: value }))
  }
  useEffect(() => {
    onUpdate({ ...pipelineState, infraInfo: state })
    if (funcJSON.role !== state?.awsArn) {
      setFuncJSON((prevFuncState: Record<string, string>) => ({ ...prevFuncState, role: state?.awsArn || '' }))
    }
  }, [state])
  const downloadFunctionJSON = (): void => {
    downloadJSONAsFile(funcJSON, 'function.json')
  }
  return (
    <Layout.Vertical margin={{ top: 'large', bottom: 'xlarge' }}>
      <Text color={Color.BLACK} margin={{ bottom: 'large' }} font={{ variation: FontVariation.FORM_TITLE }}>
        <String
          useRichText
          color={Color.BLACK}
          stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.headsteps.configureAws"
        />
      </Text>

      <Text color={Color.BLACK} margin={{ bottom: 'xlarge' }}>
        <String
          useRichText
          color={Color.BLACK}
          stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.getPermissions"
        />
      </Text>
      <Text color={Color.BLACK} margin={{ bottom: 'xlarge' }}>
        <String
          useRichText
          color={Color.BLACK}
          stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.createBucket"
        />
      </Text>
      <Text color={Color.BLACK} margin={{ bottom: 'xlarge' }}>
        <String
          useRichText
          color={Color.BLACK}
          stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.downloadArtifact"
        />
      </Text>
      <Button
        margin={{ bottom: 'xlarge', left: 'xlarge' }}
        variation={ButtonVariation.PRIMARY}
        width={180}
        icon="arrow-down"
        text={getString('cd.getStartedWithCD.downloadZipFile')}
      />
      <Text color={Color.BLACK} margin={{ bottom: 'xlarge' }}>
        <String
          useRichText
          color={Color.BLACK}
          stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.inputAWSInfo"
        />
      </Text>
      <Layout.Vertical width={400} margin={{ left: 'xlarge' }}>
        <Label>{getString('platform.connectors.aws.awsAccessKey')}</Label>
        <TextInput
          id="awsAccessKey"
          name="awsAccessKey"
          defaultValue={state?.accessKey || ''}
          placeholder={getString(
            'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureGCPStep.placholders.accessKeyPlaceholderAws'
          )}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value
            updateState('accessKey', value)
          }}
        />
      </Layout.Vertical>
      <Layout.Vertical width={400} margin={{ left: 'xlarge' }}>
        <Label>
          {getString('cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.awsSVCKey')}
        </Label>
        <TextInput
          id="awsSvcKey"
          name="awsSvcKey"
          defaultValue={state?.svcKeyOrSecretKey || ''}
          placeholder={getString(
            'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureGCPStep.placholders.svckeyPlaceholderAws'
          )}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value
            updateState('svcKeyOrSecretKey', value)
          }}
        />
      </Layout.Vertical>
      <Layout.Vertical width={400} margin={{ left: 'xlarge' }}>
        <Label>{getString('cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.awsARN')}</Label>
        <TextInput
          id="awsArn"
          name="awsArn"
          defaultValue={state?.awsArn || ''}
          placeholder={getString('cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.awsARN')}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value
            updateState('awsArn', value)
          }}
        />
      </Layout.Vertical>
      <Layout.Vertical width={400} margin={{ left: 'xlarge' }}>
        <Label>
          {getString('cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.awsRegion')}
        </Label>
        <TextInput
          id="region"
          name="region"
          defaultValue={state?.region || ''}
          placeholder={getString(
            'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.awsRegion'
          )}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value
            updateState('region', value)
          }}
        />
      </Layout.Vertical>

      <Layout.Vertical width={400} margin={{ left: 'xlarge' }}>
        <Label>
          {getString('cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.awsBucketName')}
        </Label>
        <TextInput
          id="bucketName"
          name="bucketName"
          defaultValue={state?.bucketName || ''}
          placeholder={getString(
            'cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.awsBucketName'
          )}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value
            updateState('bucketName', value)
          }}
        />
      </Layout.Vertical>
      <Layout.Vertical margin={{ left: 'xlarge' }}>
        <Button
          variation={ButtonVariation.PRIMARY}
          icon="arrow-down"
          margin={{ bottom: 'medium' }}
          width={280}
          onClick={downloadFunctionJSON}
          text={getString('cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.awsdownload')}
        />
        <String stringID="cd.getStartedWithCD.flowByQuestions.deploymentSteps.steps.configureAWSStep.commitFunction" />
      </Layout.Vertical>
    </Layout.Vertical>
  )
}