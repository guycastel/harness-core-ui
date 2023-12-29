import React, { useEffect } from 'react'
import {
  AllowedTypes,
  Container,
  getMultiTypeFromValue,
  MultiTypeInputType,
  RUNTIME_INPUT_VALUE,
  SelectOption,
  Text
} from '@harness/uicore'
import { getPrimaryManifestsRef } from '@harnessio/react-ng-manager-client'
import { defaultTo, get, set } from 'lodash-es'

import type { FormikContextType } from 'formik'
import produce from 'immer'
import { KubernetesServiceSpec, ManifestConfigWrapper } from 'services/cd-ng'

import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { useStrings } from 'framework/strings'
// import { clearRuntimeInput } from '@pipeline/utils/runPipelineUtils'

import type { PipelineStageElementConfig, StageElementWrapper } from '@pipeline/utils/pipelineTypes'
import { useGetServicesData } from '@cd/components/PipelineSteps/DeployServiceEntityStep/useGetServicesData'

import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { isValueRuntimeInput } from '@common/utils/utils'
import { ChildPipelineMetadataType } from '@pipeline/components/PipelineInputSetForm/ChainedPipelineInputSetUtils'
import { useGetChildPipelineMetadata } from '@pipeline/hooks/useGetChildPipelineMetadata'
import ExperimentalInput from '../K8sServiceSpecForms/ExperimentalInput'
import type { K8SDirectServiceStep } from '../K8sServiceSpecInterface'

interface PrimaryManifestRefProps {
  template: KubernetesServiceSpec
  initialValues: K8SDirectServiceStep
  readonly: boolean
  allowableTypes: AllowedTypes
  serviceIdentifier?: string
  stepViewType?: StepViewType
  primaryManifest?: string
  formik?: FormikContextType<unknown>
  path?: string
  childPipelineMetadata?: ChildPipelineMetadataType
}

function PrimaryManifestRef(props: PrimaryManifestRefProps): React.ReactElement | null {
  const {
    template,
    path,
    allowableTypes,
    readonly,
    formik,
    serviceIdentifier = '',
    stepViewType,
    childPipelineMetadata
  } = props
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const { orgIdentifier, projectIdentifier } = useGetChildPipelineMetadata(childPipelineMetadata)
  const [manifestSources, setManifestSources] = React.useState<SelectOption[]>([])
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [manifests, setManifests] = React.useState([])
  const formValues = get(formik, 'values')
  const serviceType = get(formValues, 'template.templateInputs.spec.service.serviceInputs.serviceDefinition.type')

  const { servicesData } = useGetServicesData({
    gitOpsEnabled: false,
    serviceIdentifiers: [serviceIdentifier as string],
    deploymentType: serviceType
  })

  useEffect(() => {
    const service = defaultTo(servicesData, []).find(
      serviceItem => serviceItem.service.identifier === serviceIdentifier
    )
    const manifestList = defaultTo(get(service, 'serviceInputs.serviceDefinition.spec.manifests'), []).map(
      (manifest: ManifestConfigWrapper) => manifest
    )
    if (manifestList.length) {
      setManifests(manifestList)
    }
  }, [servicesData])

  useEffect(() => {
    setIsLoading(true)
    getPrimaryManifestsRef({
      pathParams: {
        project: projectIdentifier,
        org: orgIdentifier,
        service: serviceIdentifier
      }
    })
      .then(res => {
        setIsLoading(false)
        setManifestSources(
          defaultTo(
            res?.content?.identifiers?.map(source => ({ label: source, value: source })),
            []
          )
        )
      })
      .catch(() => {
        setManifestSources([])
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [serviceIdentifier])

  const onPrimaryManifestRefChange = (value: SelectOption): void => {
    if (getMultiTypeFromValue(value) !== MultiTypeInputType.FIXED) {
      const isRuntime = isValueRuntimeInput(value) && stepViewType === StepViewType.TemplateUsage

      formik?.setValues(
        produce(formValues, (draft: StageElementWrapper<PipelineStageElementConfig>) => {
          set(draft, `${path}.manifestConfigurations.primaryManifestRef`, isRuntime ? RUNTIME_INPUT_VALUE : value)
          set(draft, `${path}.manifests`, manifests)
        })
      )
    } else {
      formik?.setValues(
        produce(formValues, (draft: StageElementWrapper<PipelineStageElementConfig>) => {
          set(draft, `${path}.manifests`, manifests)
          set(draft, `${path}.manifestConfigurations.primaryManifestRef`, value?.value)
        })
      )
    }
  }

  return (
    <Container width={400}>
      {getMultiTypeFromValue(get(template, 'manifestConfigurations.primaryManifestRef') as string) ===
        MultiTypeInputType.RUNTIME && (
        <ExperimentalInput
          tooltipProps={{ dataTooltipId: 'primaryManifestRef' }}
          label={getString('cd.pipelineSteps.serviceTab.manifest.primaryManifest')}
          placeholder={getString('cd.pipelineSteps.serviceTab.manifest.primaryManifest')}
          name={`${path}.manifestConfigurations.primaryManifestRef`}
          selectItems={manifestSources}
          useValue
          multiTypeInputProps={{
            expressions,
            allowableTypes,
            selectProps: {
              addClearBtn: !readonly,
              items: manifestSources,
              noResults: (
                <Text padding={'small'}>
                  {isLoading ? getString('loading') : getString('noSearchResultsFoundPeriod')}
                </Text>
              )
            },
            onChange: onPrimaryManifestRefChange
          }}
          disabled={readonly}
          formik={formik}
        />
      )}
    </Container>
  )
}

export default PrimaryManifestRef
