/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import { AllowedTypes, ButtonVariation, Container, FormInput, Layout, SelectOption, Text } from '@harness/uicore'
import cx from 'classnames'

import type { FormikProps } from 'formik'
import { useParams } from 'react-router-dom'
import { isEmpty } from 'lodash-es'
import { useStrings } from 'framework/strings'
import Card from '@cv/components/Card/Card'
import { useTemplateSelector } from 'framework/Templates/TemplateSelectorContext/useTemplateSelector'
import { TemplateSummaryResponse, useGetTemplateInputSetYaml } from 'services/template-ng'
import type {
  ContinousVerificationData,
  TemplateInputs
} from '@cv/components/PipelineSteps/ContinousVerification/types'
import RbacButton from '@rbac/components/Button/Button'
import { FeatureIdentifier } from 'framework/featureStore/FeatureIdentifier'
import { TemplateUsage } from '@templates-library/utils/templatesUtils'
import type { PipelineType, ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import { ContainerSpinner } from '@common/components/ContainerSpinner/ContainerSpinner'
import { TemplateBar } from '@pipeline/components/PipelineStudio/TemplateBar/TemplateBar'
import { getScopeBasedProjectPathParams } from '@common/components/EntityReference/EntityReference'
import type { Scope } from '@common/interfaces/SecretsInterface'
import { MONITORED_SERVICE_TYPE, monitoredServiceTypes } from './SelectMonitoredServiceType.constants'
import VerifyStepMonitoredServiceInputTemplates from './components/VerifyStepMonitoredServiceInputTemplates/VerifyStepMonitoredServiceInputTemplates'
import {
  getInitialHealthSources,
  getInitialHealthSourceVariables,
  getInitialServiceAndEnv,
  getInitialTemplatesData,
  getUpdatedSpecs
} from './SelectMonitoredServiceType.utils'
import type { ServiceAndEnv } from './SelectMonitoredServiceType.types'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'
import css from './SelectMonitoredServiceType.module.scss'

export interface SelectMonitoredServiceTypeProps {
  formik: FormikProps<ContinousVerificationData>
  allowableTypes: AllowedTypes
  readonly?: boolean
}

export default function SelectMonitoredServiceType(props: SelectMonitoredServiceTypeProps): React.ReactElement {
  const {
    formik,
    formik: { values: formValues, setFieldValue },
    allowableTypes,
    readonly
  } = props
  const { getString } = useStrings()
  const { getTemplate } = useTemplateSelector()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<PipelineType<ProjectPathProps>>()
  const {
    type,
    spec: { versionLabel = '', monitoredServiceTemplateRef = '' }
  } = formik?.values?.spec?.monitoredService || {}

  const [showTemplateButton, setShowTemplateButton] = useState<boolean>(type === MONITORED_SERVICE_TYPE.TEMPLATE)
  const [healthSources, setHealthSources] = useState<TemplateInputs['sources']['healthSources']>(
    getInitialHealthSources(formValues)
  )
  const [healthSourcesVariables, setHealthSourcesVariables] = useState<TemplateInputs['variables']>(
    getInitialHealthSourceVariables(formValues)
  )
  const [serviceAndEnv, setServiceAndEnv] = useState<ServiceAndEnv>(getInitialServiceAndEnv(formValues))
  const [templateData, setTemplate] = useState<TemplateSummaryResponse | null>(() =>
    getInitialTemplatesData(formValues)
  )

  const queryParams = {
    accountIdentifier: accountId,
    orgIdentifier: orgIdentifier,
    projectIdentifier: projectIdentifier,
    versionLabel: '',
    getDefaultFromOtherRepo: true
  }

  const {
    data: templateInputYaml,
    loading: loadingTemplateYaml,
    refetch: fetchTemplateInputSet
  } = useGetTemplateInputSetYaml({
    templateIdentifier: '',
    queryParams,
    requestOptions: { headers: { 'Load-From-Cache': 'true' } },
    lazy: true
  })

  const onUseTemplate = async (): Promise<void> => {
    const { template } = await getTemplate({ templateType: 'MonitoredService', allowedUsages: [TemplateUsage.USE] })
    const { versionLabel: latestVersionLabel = '', identifier = '', templateScope } = template || {}
    if (latestVersionLabel && identifier) {
      await fetchTemplateInputSet({
        queryParams: {
          ...queryParams,
          ...getScopeBasedProjectPathParams(
            {
              accountId: queryParams.accountIdentifier,
              projectIdentifier: queryParams.projectIdentifier,
              orgIdentifier: queryParams.orgIdentifier
            },
            templateScope as Scope
          ),
          versionLabel: latestVersionLabel
        },
        pathParams: { templateIdentifier: identifier }
      })
    }
    setTemplate(template)
  }

  useEffect(() => {
    if (templateInputYaml && templateData) {
      const newSpecs = getUpdatedSpecs(formValues, templateInputYaml, templateData)

      const {
        serviceRef: newServiceRef = '',
        environmentRef: newEnvRef = '',
        variables = []
      } = newSpecs?.monitoredService?.spec?.templateInputs || {}

      setFieldValue('spec', newSpecs)
      setServiceAndEnv({
        serviceRef: newServiceRef,
        environmentRef: newEnvRef
      })
      setHealthSources(newSpecs?.monitoredService?.spec?.templateInputs?.sources?.healthSources || [])
      setHealthSourcesVariables(variables)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateData, templateInputYaml])

  const handleOnChangeMonitoredServiceType = (item: SelectOption): void => {
    if (item?.value === MONITORED_SERVICE_TYPE.TEMPLATE) {
      setShowTemplateButton(true)
    }
  }

  const renderMonitoredServiceTemplateInputs = (): JSX.Element => {
    if (loadingTemplateYaml) {
      return <ContainerSpinner />
    } else if (
      !isEmpty(formValues?.spec?.monitoredService?.spec?.templateInputs) &&
      type === MONITORED_SERVICE_TYPE.TEMPLATE
    ) {
      return (
        <VerifyStepMonitoredServiceInputTemplates
          versionLabel={versionLabel}
          monitoredServiceTemplateRef={monitoredServiceTemplateRef}
          allowableTypes={allowableTypes}
          healthSources={healthSources}
          healthSourcesVariables={healthSourcesVariables}
          serviceAndEnv={serviceAndEnv}
        />
      )
    } else {
      return <></>
    }
  }

  return (
    <Card>
      <>
        <div className={cx(stepCss.formGroup)}>
          <Layout.Vertical spacing={'medium'}>
            <Text>{getString('cv.monitoredServices.heading')}</Text>
            <Text>{getString('platform.connectors.cdng.monitoredService.monitoredServiceDef')}</Text>
            <Container flex>
              <FormInput.Select
                className={css.dropdown}
                name="spec.monitoredService.type"
                label={getString('platform.connectors.cdng.monitoredServiceType')}
                items={monitoredServiceTypes as SelectOption[]}
                onChange={handleOnChangeMonitoredServiceType}
                disabled={readonly}
              />
              {showTemplateButton && type === MONITORED_SERVICE_TYPE.TEMPLATE ? (
                <RbacButton
                  text={getString('common.useTemplate')}
                  variation={ButtonVariation.SECONDARY}
                  icon="template-library"
                  onClick={onUseTemplate}
                  disabled={readonly}
                  featuresProps={{
                    featuresRequest: {
                      featureNames: [FeatureIdentifier.TEMPLATE_SERVICE]
                    }
                  }}
                />
              ) : null}
            </Container>
            {showTemplateButton &&
            type === MONITORED_SERVICE_TYPE.TEMPLATE &&
            monitoredServiceTemplateRef &&
            versionLabel ? (
              <TemplateBar
                templateLinkConfig={{
                  templateRef: monitoredServiceTemplateRef as string,
                  versionLabel
                }}
                onOpenTemplateSelector={onUseTemplate}
              />
            ) : null}
          </Layout.Vertical>
        </div>
        {renderMonitoredServiceTemplateInputs()}
      </>
    </Card>
  )
}
